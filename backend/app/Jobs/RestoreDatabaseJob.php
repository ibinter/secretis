<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\User;
use App\Notifications\BackupRestoredNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * RestoreDatabaseJob — Restauration d'une sauvegarde SECRETIS ERP.
 *
 * Exécuté en queue, ce job :
 *  1. Passe l'application en mode maintenance
 *  2. Restaure la base de données depuis une archive ZIP
 *  3. Restaure les fichiers applicatifs si présents dans l'archive
 *  4. Remet l'application en ligne
 *  5. Notifie par email tous les SuperAdmins IBIG
 *
 * IMPORTANT :
 *  - tries = 1 : pas de retry (opération irréversible)
 *  - timeout = 3600 : 1 heure maximum
 *  - En cas d'échec, l'application est forcée hors maintenance
 *
 * Structure attendue de l'archive ZIP :
 *   backup.zip
 *     ├── database/
 *     │     └── dump.sql  (ou dump.dump pour pg_restore)
 *     └── files/          (optionnel — storage/app)
 */
class RestoreDatabaseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Pas de retry sur une restauration (opération irréversible).
     */
    public int $tries = 1;

    /**
     * 1 heure maximum pour la restauration complète.
     */
    public int $timeout = 3600;

    // ─────────────────────────────────────────────────────────────────────────

    public function __construct(
        private readonly string  $filename,
        private readonly string  $archivePath,
        private readonly ?User   $initiatedBy = null,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Exécution de la restauration.
     */
    public function handle(): void
    {
        $startTime = microtime(true);

        Log::warning('RestoreDatabaseJob: début de la restauration', [
            'filename'      => $this->filename,
            'initiated_by'  => $this->initiatedBy?->id,
        ]);

        // ── 1. Mode maintenance ────────────────────────────────────────────
        Artisan::call('down', [
            '--render' => 'errors.503',
            '--secret' => config('secretis.maintenance_secret', ''),
        ]);

        Log::info('RestoreDatabaseJob: application en mode maintenance');

        try {
            // ── 2. Extraire l'archive dans un répertoire temporaire ────────
            $tempDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'secretis_restore_' . time();
            mkdir($tempDir, 0755, true);

            $zip = new \ZipArchive();
            $result = $zip->open($this->archivePath);

            if ($result !== true) {
                throw new \RuntimeException("Impossible d'ouvrir l'archive ZIP (code: {$result}).");
            }

            $zip->extractTo($tempDir);
            $zip->close();

            Log::info('RestoreDatabaseJob: archive extraite', ['temp_dir' => $tempDir]);

            // ── 3. Restaurer la base de données ────────────────────────────
            $dbDriver  = config('database.default');
            $dbConfig  = config("database.connections.{$dbDriver}");
            $sqlFile   = $tempDir . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'dump.sql';
            $pgDump    = $tempDir . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'dump.dump';

            if ($dbDriver === 'pgsql') {
                $this->restorePostgres($dbConfig, file_exists($pgDump) ? $pgDump : $sqlFile, file_exists($pgDump));
            } elseif ($dbDriver === 'mysql') {
                $this->restoreMysql($dbConfig, $sqlFile);
            } elseif ($dbDriver === 'sqlite') {
                $this->restoreSqlite($dbConfig, $sqlFile);
            } else {
                throw new \RuntimeException("Driver de base de données non supporté pour la restauration : {$dbDriver}");
            }

            Log::info('RestoreDatabaseJob: base de données restaurée');

            // ── 4. Restaurer les fichiers (optionnel) ──────────────────────
            $filesDir = $tempDir . DIRECTORY_SEPARATOR . 'files';
            if (is_dir($filesDir)) {
                $this->restoreFiles($filesDir);
                Log::info('RestoreDatabaseJob: fichiers restaurés');
            }

            // ── 5. Vider les caches ────────────────────────────────────────
            Artisan::call('cache:clear');
            Artisan::call('config:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');

            // ── 6. Nettoyer le répertoire temporaire ──────────────────────
            $this->deleteDirectory($tempDir);

            $duration = round(microtime(true) - $startTime);

            Log::info('RestoreDatabaseJob: restauration terminée avec succès', [
                'duration_seconds' => $duration,
                'filename'         => $this->filename,
            ]);

        } catch (\Throwable $e) {
            Log::error('RestoreDatabaseJob: ÉCHEC de la restauration', [
                'filename' => $this->filename,
                'error'    => $e->getMessage(),
                'trace'    => $e->getTraceAsString(),
            ]);

            // Sortir quand même de maintenance pour ne pas bloquer l'app
            Artisan::call('up');

            // Notifier les superadmins de l'échec
            $this->notifySuperAdmins(success: false, error: $e->getMessage());

            throw $e;
        }

        // ── 7. Sortir de maintenance ───────────────────────────────────────
        Artisan::call('up');
        Log::info('RestoreDatabaseJob: application remise en ligne');

        // ── 8. Notifier les SuperAdmins du succès ─────────────────────────
        $this->notifySuperAdmins(success: true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Restauration par driver
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Restaure une base PostgreSQL via pg_restore ou psql.
     */
    private function restorePostgres(array $config, string $dumpFile, bool $usePgRestore): void
    {
        $host     = escapeshellarg($config['host'] ?? '127.0.0.1');
        $port     = escapeshellarg((string)($config['port'] ?? 5432));
        $dbname   = escapeshellarg($config['database']);
        $username = escapeshellarg($config['username']);
        $password = $config['password'] ?? '';

        // Passer le mot de passe via variable d'environnement (plus sûr que -p)
        putenv("PGPASSWORD={$password}");

        if ($usePgRestore) {
            // Format binaire pg_dump
            $cmd = "pg_restore --clean --no-acl --no-owner -h {$host} -p {$port} -U {$username} -d {$dbname} " . escapeshellarg($dumpFile);
        } else {
            // Format SQL plain
            $cmd = "psql -h {$host} -p {$port} -U {$username} -d {$dbname} -f " . escapeshellarg($dumpFile);
        }

        exec($cmd . ' 2>&1', $output, $returnCode);
        putenv('PGPASSWORD');

        if ($returnCode !== 0) {
            throw new \RuntimeException(
                "pg_restore/psql a échoué (code {$returnCode}) : " . implode("\n", $output)
            );
        }
    }

    /**
     * Restaure une base MySQL via mysql CLI.
     */
    private function restoreMysql(array $config, string $sqlFile): void
    {
        $host     = escapeshellarg($config['host'] ?? '127.0.0.1');
        $port     = escapeshellarg((string)($config['port'] ?? 3306));
        $dbname   = escapeshellarg($config['database']);
        $username = escapeshellarg($config['username']);
        $password = escapeshellarg($config['password'] ?? '');

        $cmd = "mysql -h {$host} -P {$port} -u {$username} -p{$password} {$dbname} < " . escapeshellarg($sqlFile);
        exec($cmd . ' 2>&1', $output, $returnCode);

        if ($returnCode !== 0) {
            throw new \RuntimeException(
                "mysql a échoué (code {$returnCode}) : " . implode("\n", $output)
            );
        }
    }

    /**
     * Restaure une base SQLite en remplaçant le fichier.
     */
    private function restoreSqlite(array $config, string $sqlFile): void
    {
        $targetDb = $config['database'];
        copy($sqlFile, $targetDb);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Restauration des fichiers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Copie les fichiers restaurés vers storage/app.
     */
    private function restoreFiles(string $sourceDir): void
    {
        $target = storage_path('app');

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            $relative = $iterator->getSubPathname();
            $dest     = $target . DIRECTORY_SEPARATOR . $relative;

            if ($item->isDir()) {
                if (!is_dir($dest)) {
                    mkdir($dest, 0755, true);
                }
            } else {
                copy($item->getRealPath(), $dest);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Notifications
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Envoie un email de notification à tous les SuperAdmins IBIG.
     */
    private function notifySuperAdmins(bool $success, string $error = ''): void
    {
        try {
            $superAdmins = User::where('role', 'superadmin_ibig')
                ->where('is_active', true)
                ->get();

            if ($superAdmins->isNotEmpty()) {
                Notification::send($superAdmins, new BackupRestoredNotification(
                    filename: $this->filename,
                    success: $success,
                    initiatedBy: $this->initiatedBy?->name ?? 'Système',
                    error: $error,
                ));
            }
        } catch (\Throwable $e) {
            Log::error('RestoreDatabaseJob: impossible d\'envoyer la notification', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Supprime récursivement un répertoire temporaire.
     */
    private function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }

        rmdir($dir);
    }
}
