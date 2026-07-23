<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Jobs\RestoreDatabaseJob;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * BackupController — Gestion des sauvegardes SECRETIS ERP (SuperAdmin).
 *
 * Routes (à enregistrer dans routes/web.php et routes/api.php) :
 *
 *   GET    /superadmin/backups                          → index()
 *   POST   /superadmin/backups/trigger                  → trigger()
 *   GET    /api/v1/superadmin/backups                   → list()
 *   GET    /api/v1/superadmin/backups/{filename}/download → download()
 *   POST   /api/v1/superadmin/backups/restore           → restore()
 *   DELETE /api/v1/superadmin/backups/{filename}        → delete()
 *   GET    /api/v1/superadmin/backups/logs              → logs()
 *
 * ACCÈS RESTREINT : middleware 'role:superadmin_ibig'
 */
class BackupController extends Controller
{
    /** Dossier racine des sauvegardes (absolu). */
    private string $backupDir;

    /** Fichier de log des sauvegardes. */
    private string $logFile;

    public function __construct(private readonly AuditService $audit)
    {
        $this->middleware(['auth', 'role:superadmin_ibig']);

        $this->backupDir = config('secretis.backups.dir', storage_path('app/backups'));
        $this->logFile   = config('secretis.backups.log_file', storage_path('logs/backups.log'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/backups — Page Inertia
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Affiche l'interface de gestion des sauvegardes.
     * Passe les données initiales à la page React.
     */
    public function index(): InertiaResponse
    {
        $backups = $this->listBackupFiles();

        return Inertia::render('SuperAdmin/Backups/Index', [
            'lastBackup' => $backups[0] ?? null,
            'backups'    => $backups,
            'schedule'   => $this->getScheduleConfig(),
            'logs'       => $this->readLogs(20),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/backups/trigger — Déclenchement manuel
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Déclenche une sauvegarde manuelle en arrière-plan via le script backup.sh.
     * Retourne immédiatement sans attendre la fin du script.
     */
    public function trigger(Request $request): JsonResponse
    {
        $script = config('secretis.backups.script', base_path('deploy/backup.sh'));

        if (!File::exists($script)) {
            Log::error('BackupController: script de sauvegarde introuvable', ['script' => $script]);
            return response()->json([
                'message' => 'Script de sauvegarde introuvable. Contactez l\'administrateur système.',
            ], 500);
        }

        // Lancer le script en arrière-plan (non bloquant)
        $jobId = Str::uuid()->toString();
        $logFile = escapeshellarg($this->logFile);
        $cmd  = "bash " . escapeshellarg($script) . " manual >> {$logFile} 2>&1 &";

        // Exécution en arrière-plan (Linux/macOS)
        if (PHP_OS_FAMILY !== 'Windows') {
            exec($cmd);
        } else {
            // Windows : utilisation de start /B
            exec('start /B cmd /c ' . escapeshellarg("bash {$script} manual >> {$this->logFile} 2>&1"));
        }

        $this->audit->log('backup_triggered', 'backups', 'backup', null, [
            'type'       => 'manual',
            'job_id'     => $jobId,
            'triggered_by' => $request->user()?->name,
        ]);

        Log::info('Sauvegarde manuelle déclenchée', [
            'job_id'    => $jobId,
            'triggered_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Sauvegarde manuelle démarrée. Elle apparaîtra dans la liste dans quelques minutes.',
            'job_id'  => $jobId,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/superadmin/backups — Liste JSON
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne la liste des sauvegardes disponibles avec leurs méta-données.
     */
    public function list(): JsonResponse
    {
        return response()->json([
            'backups' => $this->listBackupFiles(),
            'logs'    => $this->readLogs(50),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/superadmin/backups/{filename}/download
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Télécharge une sauvegarde en streaming.
     * Protection contre le path traversal : seul le basename est utilisé.
     */
    public function download(string $filename): StreamedResponse
    {
        $safeFilename = $this->safeFilename($filename);
        $path = $this->backupDir . DIRECTORY_SEPARATOR . $safeFilename;

        abort_unless(File::exists($path), 404, 'Sauvegarde introuvable.');

        $this->audit->log('backup_downloaded', 'backups', 'backup', null, [
            'filename' => $safeFilename,
        ]);

        return response()->streamDownload(function () use ($path) {
            $handle = fopen($path, 'rb');
            while (!feof($handle)) {
                echo fread($handle, 1_048_576); // 1 MB par chunk
                flush();
            }
            fclose($handle);
        }, $safeFilename, [
            'Content-Type'        => 'application/zip',
            'Content-Length'      => File::size($path),
            'Content-Disposition' => 'attachment; filename="' . $safeFilename . '"',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/superadmin/backups/restore
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lance la restauration d'une sauvegarde via un job en arrière-plan.
     * L'application passe en mode maintenance pendant la restauration.
     *
     * Body JSON :
     *   { "filename": "backup_2026-07-23_02-00.zip", "confirmation": "RESTAURER" }
     */
    public function restore(Request $request): JsonResponse
    {
        $request->validate([
            'filename'     => 'required|string|max:200',
            'confirmation' => 'required|string|in:RESTAURER',
        ]);

        $safeFilename = $this->safeFilename($request->input('filename'));
        $path = $this->backupDir . DIRECTORY_SEPARATOR . $safeFilename;

        abort_unless(File::exists($path), 404, 'Sauvegarde introuvable.');

        $this->audit->log('backup_restore_initiated', 'backups', 'backup', null, [
            'filename'       => $safeFilename,
            'initiated_by'   => $request->user()?->name,
        ]);

        // Dispatcher le job de restauration (ShouldQueue, tries=1)
        dispatch(new RestoreDatabaseJob($safeFilename, $path, $request->user()));

        Log::warning('Restauration initiée', [
            'filename'     => $safeFilename,
            'initiated_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Restauration démarrée. L\'application va passer en mode maintenance. '
                       . 'Un email de confirmation vous sera envoyé à la fin.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/v1/superadmin/backups/{filename}
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Supprime définitivement une sauvegarde du disque.
     * Protection contre le path traversal intégrée.
     */
    public function delete(string $filename): JsonResponse
    {
        $safeFilename = $this->safeFilename($filename);
        $path = $this->backupDir . DIRECTORY_SEPARATOR . $safeFilename;

        abort_unless(File::exists($path), 404, 'Sauvegarde introuvable.');

        File::delete($path);

        $this->audit->log('backup_deleted', 'backups', 'backup', null, [
            'filename' => $safeFilename,
        ]);

        return response()->json(['message' => 'Sauvegarde supprimée.']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/superadmin/backups/logs
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne les dernières 50 lignes du fichier de log des sauvegardes.
     */
    public function logs(): JsonResponse
    {
        return response()->json([
            'logs' => $this->readLogs(50),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers privés
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Liste les fichiers de sauvegarde dans le dossier configuré
     * et retourne leurs méta-données triées du plus récent au plus ancien.
     *
     * @return array<int, array{
     *   filename: string,
     *   created_at: string,
     *   type: string,
     *   status: string,
     *   db_size: int|null,
     *   files_size: int|null,
     *   duration_seconds: int|null,
     *   destinations: string[],
     * }>
     */
    private function listBackupFiles(): array
    {
        if (!File::isDirectory($this->backupDir)) {
            return [];
        }

        $files = File::files($this->backupDir);

        // Filtrer uniquement les archives ZIP
        $files = array_filter($files, fn ($f) => $f->getExtension() === 'zip');

        // Trier du plus récent au plus ancien
        usort($files, fn ($a, $b) => $b->getMTime() - $a->getMTime());

        return array_map(function ($file) {
            $name = $file->getFilename();

            // Convention de nommage : secretis_backup_YYYY-MM-DD_HH-mm_TYPE.zip
            // TYPE = 'auto' | 'manual'
            preg_match('/_(auto|manual)\.zip$/i', $name, $typeMatch);
            $type = $typeMatch[1] ?? 'auto';

            // Lire le fichier .meta.json éponyme s'il existe
            $metaPath = $this->backupDir . DIRECTORY_SEPARATOR . str_replace('.zip', '.meta.json', $name);
            $meta = File::exists($metaPath)
                ? json_decode(File::get($metaPath), true) ?? []
                : [];

            return [
                'filename'         => $name,
                'created_at'       => date('c', $file->getMTime()),
                'type'             => $type,
                'status'           => $meta['status'] ?? 'success',
                'db_size'          => $meta['db_size'] ?? null,
                'files_size'       => $meta['files_size'] ?? null,
                'duration_seconds' => $meta['duration_seconds'] ?? null,
                'destinations'     => $meta['destinations'] ?? ['local'],
                'completed_at'     => $meta['completed_at'] ?? date('c', $file->getMTime()),
            ];
        }, array_values($files));
    }

    /**
     * Lit les N dernières lignes du fichier de log des sauvegardes.
     *
     * @return string[]
     */
    private function readLogs(int $lines = 20): array
    {
        if (!File::exists($this->logFile)) {
            return ['[INFO] Aucun log disponible.'];
        }

        // Lire le fichier en limitant à 5 MB pour éviter les débordements
        $content = File::get($this->logFile);
        $allLines = array_filter(explode("\n", $content));
        $tail = array_slice(array_values($allLines), -$lines);

        return array_map('trim', $tail);
    }

    /**
     * Retourne la configuration du planning de sauvegarde.
     */
    private function getScheduleConfig(): array
    {
        return [
            'daily_enabled'   => config('secretis.backups.daily_enabled', true),
            'daily_time'      => config('secretis.backups.daily_time', '02:00'),
            'retention_days'  => config('secretis.backups.retention_days', 30),
            's3_enabled'      => config('secretis.backups.s3_enabled', false),
        ];
    }

    /**
     * Nettoie un nom de fichier pour prévenir le path traversal.
     * Ne conserve que le basename sans les traversées de répertoire.
     */
    private function safeFilename(string $filename): string
    {
        // Extraire uniquement le basename
        $base = basename($filename);

        // Rejeter tout nom contenant des séquences suspectes
        abort_if(
            Str::contains($base, ['..', '/', '\\', "\0"]),
            400,
            'Nom de fichier invalide.'
        );

        // Vérifier l'extension (uniquement .zip autorisé)
        abort_unless(
            Str::endsWith($base, '.zip'),
            400,
            'Seules les archives .zip sont acceptées.'
        );

        return $base;
    }
}
