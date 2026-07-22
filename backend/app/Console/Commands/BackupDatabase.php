<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * SECRETIS ERP - Commande de sauvegarde de la base de données
 *
 * Usage :
 *   php artisan secretis:backup              # Sauvegarde quotidienne standard
 *   php artisan secretis:backup --type=full  # Sauvegarde complète (BDD + fichiers)
 *   php artisan secretis:backup --dry-run    # Simulation sans upload
 *
 * @author  IBIG SOFT
 * @version 1.0.0
 */
class BackupDatabase extends Command
{
    protected $signature = 'secretis:backup
                            {--type=db : Type de sauvegarde (db|files|full)}
                            {--dry-run : Simuler sans upload réel}
                            {--no-encrypt : Désactiver le chiffrement (non recommandé)}';

    protected $description = 'Sauvegarde chiffrée de la BDD PostgreSQL avec upload S3 et rotation automatique';

    // ─── Constantes de rétention ──────────────────────────────────────────────
    private const DAILY_RETENTION  = 30;   // 30 jours quotidiens
    private const MONTHLY_RETENTION = 12;  // 12 mois mensuels
    private const YEARLY_RETENTION  = 3;   // 3 ans annuels

    // Préfixes S3 pour l'organisation des backups
    private const S3_PREFIX_DAILY   = 'backups/daily/';
    private const S3_PREFIX_MONTHLY = 'backups/monthly/';
    private const S3_PREFIX_YEARLY  = 'backups/yearly/';

    // ─── État interne ─────────────────────────────────────────────────────────
    private string $timestamp;
    private string $backupId;
    private string $tempDir;
    private bool   $dryRun;

    public function handle(): int
    {
        $this->timestamp = now()->format('Y-m-d_H-i-s');
        $this->backupId  = 'secretis_backup_' . $this->timestamp;
        $this->tempDir   = sys_get_temp_dir() . '/' . $this->backupId;
        $this->dryRun    = (bool) $this->option('dry-run');
        $type            = $this->option('type');

        $this->info("═══════════════════════════════════════");
        $this->info("  SECRETIS ERP - Sauvegarde " . strtoupper($type));
        $this->info("  ID     : {$this->backupId}");
        $this->info("  Mode   : " . ($this->dryRun ? 'DRY-RUN' : 'PRODUCTION'));
        $this->info("═══════════════════════════════════════");

        try {
            mkdir($this->tempDir, 0700, true);

            $files = [];

            // ── Sauvegarde BDD ────────────────────────────────────────────────
            if (in_array($type, ['db', 'full'])) {
                $dbFile = $this->backupDatabase();
                $files[] = $dbFile;
                $this->info("✓ Dump PostgreSQL créé : " . basename($dbFile));
            }

            // ── Sauvegarde fichiers (storage) ─────────────────────────────────
            if (in_array($type, ['files', 'full'])) {
                $filesArchive = $this->backupFiles();
                $files[] = $filesArchive;
                $this->info("✓ Archive fichiers créée : " . basename($filesArchive));
            }

            // ── Upload vers S3 ────────────────────────────────────────────────
            $uploadedFiles = [];
            foreach ($files as $file) {
                // Chiffrement AES-256
                if (! $this->option('no-encrypt')) {
                    $file = $this->encryptFile($file);
                    $this->info("✓ Fichier chiffré (AES-256)");
                }

                // Vérification d'intégrité SHA-256
                $checksum = $this->computeChecksum($file);
                $this->info("✓ SHA-256 : {$checksum}");

                // Upload
                $s3Key = $this->uploadToS3($file, $checksum);
                if ($s3Key) {
                    $uploadedFiles[] = $s3Key;
                    $this->info("✓ Uploadé : {$s3Key}");
                }
            }

            // ── Rotation des sauvegardes ──────────────────────────────────────
            $this->rotateBackups();

            // ── Nettoyage ─────────────────────────────────────────────────────
            $this->cleanup();

            // ── Notification succès ───────────────────────────────────────────
            $this->notifySuccess($type, $uploadedFiles);

            $this->info("");
            $this->info("✅ Sauvegarde terminée avec succès !");

            Log::info('Sauvegarde SECRETIS réussie', [
                'backup_id'  => $this->backupId,
                'type'       => $type,
                'files'      => $uploadedFiles,
                'timestamp'  => $this->timestamp,
            ]);

            return Command::SUCCESS;

        } catch (\Throwable $e) {
            $this->error("❌ ÉCHEC DE LA SAUVEGARDE : " . $e->getMessage());

            Log::critical('Sauvegarde SECRETIS échouée', [
                'backup_id' => $this->backupId,
                'error'     => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);

            $this->notifyFailure($e->getMessage());
            $this->cleanup();

            return Command::FAILURE;
        }
    }

    /**
     * Effectue le dump PostgreSQL compressé.
     */
    private function backupDatabase(): string
    {
        $dbConfig = config('database.connections.pgsql');
        $dumpFile = $this->tempDir . "/{$this->backupId}_db.sql.gz";

        $host     = $dbConfig['host'];
        $port     = $dbConfig['port'] ?? 5432;
        $dbname   = $dbConfig['database'];
        $username = $dbConfig['username'];
        $password = $dbConfig['password'];

        // Construire la commande pg_dump
        $command = sprintf(
            'PGPASSWORD=%s pg_dump --host=%s --port=%d --username=%s --dbname=%s '
            . '--format=plain --no-owner --no-privileges --verbose '
            . '--schema=public 2>> %s/pg_dump.log | gzip -9 > %s',
            escapeshellarg($password),
            escapeshellarg($host),
            (int) $port,
            escapeshellarg($username),
            escapeshellarg($dbname),
            escapeshellarg($this->tempDir),
            escapeshellarg($dumpFile)
        );

        if ($this->dryRun) {
            $this->line("[DRY-RUN] pg_dump vers : {$dumpFile}");
            // Créer un fichier factice pour la suite
            file_put_contents($dumpFile, 'dry-run-dummy-backup');
            return $dumpFile;
        }

        $this->line("Exécution de pg_dump...");
        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new \RuntimeException(
                "pg_dump a échoué avec le code : {$exitCode}. "
                . "Voir : {$this->tempDir}/pg_dump.log"
            );
        }

        if (! file_exists($dumpFile) || filesize($dumpFile) < 100) {
            throw new \RuntimeException("Le fichier dump est vide ou n'existe pas : {$dumpFile}");
        }

        $sizeHuman = $this->humanFilesize(filesize($dumpFile));
        $this->line("  Taille du dump : {$sizeHuman}");

        return $dumpFile;
    }

    /**
     * Archive le répertoire storage de l'application.
     */
    private function backupFiles(): string
    {
        $archiveFile = $this->tempDir . "/{$this->backupId}_files.tar.gz";
        $storagePath = storage_path('app');

        $command = sprintf(
            'tar -czf %s --exclude=%s/debugbar --exclude=%s/logs %s',
            escapeshellarg($archiveFile),
            escapeshellarg($storagePath),
            escapeshellarg($storagePath),
            escapeshellarg($storagePath)
        );

        if ($this->dryRun) {
            $this->line("[DRY-RUN] Archive vers : {$archiveFile}");
            file_put_contents($archiveFile, 'dry-run-files-archive');
            return $archiveFile;
        }

        exec($command, $output, $exitCode);

        if ($exitCode !== 0) {
            throw new \RuntimeException("Archivage des fichiers échoué (code : {$exitCode})");
        }

        return $archiveFile;
    }

    /**
     * Chiffre un fichier avec AES-256-CBC.
     * La clé de chiffrement est stockée dans BACKUP_ENCRYPTION_KEY.
     */
    private function encryptFile(string $filePath): string
    {
        $encryptedPath = $filePath . '.enc';
        $key = config('backup.encryption_key', env('BACKUP_ENCRYPTION_KEY'));

        if (empty($key)) {
            throw new \RuntimeException(
                'BACKUP_ENCRYPTION_KEY non définie. Ajoutez-la à votre .env'
            );
        }

        // Générer un IV aléatoire de 16 octets
        $iv = random_bytes(16);
        $ivHex = bin2hex($iv);

        $command = sprintf(
            'openssl enc -aes-256-cbc -in %s -out %s -pass pass:%s -iv %s -pbkdf2 -iter 100000',
            escapeshellarg($filePath),
            escapeshellarg($encryptedPath),
            escapeshellarg($key),
            escapeshellarg($ivHex)
        );

        if ($this->dryRun) {
            $this->line("[DRY-RUN] Chiffrement simulé");
            copy($filePath, $encryptedPath);
            unlink($filePath);
            return $encryptedPath;
        }

        exec($command, $output, $exitCode);

        if ($exitCode !== 0 || ! file_exists($encryptedPath)) {
            throw new \RuntimeException("Chiffrement AES-256 échoué pour : {$filePath}");
        }

        // Stocker l'IV à côté pour le déchiffrement futur
        file_put_contents($encryptedPath . '.iv', $ivHex);

        // Supprimer le fichier non chiffré
        unlink($filePath);

        return $encryptedPath;
    }

    /**
     * Calcule le checksum SHA-256 du fichier.
     */
    private function computeChecksum(string $filePath): string
    {
        $hash = hash_file('sha256', $filePath);

        if ($hash === false) {
            throw new \RuntimeException("Impossible de calculer le SHA-256 de : {$filePath}");
        }

        // Écrire le checksum dans un fichier .sha256
        file_put_contents($filePath . '.sha256', $hash . '  ' . basename($filePath) . PHP_EOL);

        return $hash;
    }

    /**
     * Upload le fichier vers S3 compatible (AWS S3 ou Cloudflare R2).
     * Détermine le préfixe selon qu'on est le 1er du mois (mensuel),
     * le 1er janvier (annuel), ou un jour normal (quotidien).
     */
    private function uploadToS3(string $filePath, string $checksum): ?string
    {
        $filename = basename($filePath);
        $now = now();

        // Déterminer le type de rétention
        if ($now->day === 1 && $now->month === 1) {
            $prefix = self::S3_PREFIX_YEARLY;
        } elseif ($now->day === 1) {
            $prefix = self::S3_PREFIX_MONTHLY;
        } else {
            $prefix = self::S3_PREFIX_DAILY;
        }

        $s3Key = $prefix . $now->format('Y/m/') . $filename;

        if ($this->dryRun) {
            $this->line("[DRY-RUN] Upload simulé vers : s3://{$s3Key}");
            return $s3Key;
        }

        // Upload via le disk S3 de Laravel (configuré dans filesystems.php)
        $disk = Storage::disk('s3_backup');
        $handle = fopen($filePath, 'r');

        if ($handle === false) {
            throw new \RuntimeException("Impossible d'ouvrir le fichier : {$filePath}");
        }

        $uploaded = $disk->put($s3Key, $handle, [
            'visibility'          => 'private',
            'Metadata'            => [
                'backup-id'       => $this->backupId,
                'sha256-checksum' => $checksum,
                'app-version'     => config('app.version', '1.0.0'),
                'environment'     => config('app.env'),
            ],
        ]);

        fclose($handle);

        if (! $uploaded) {
            throw new \RuntimeException("Upload S3 échoué pour : {$s3Key}");
        }

        // Vérifier l'intégrité après upload
        $this->verifyUploadIntegrity($disk, $s3Key, $filePath, $checksum);

        return $s3Key;
    }

    /**
     * Vérifie l'intégrité du fichier uploadé en comparant les checksums.
     */
    private function verifyUploadIntegrity($disk, string $s3Key, string $localPath, string $expectedChecksum): void
    {
        // Télécharger temporairement pour vérification
        $tempVerifyPath = $this->tempDir . '/verify_' . Str::random(8);
        $remoteContent  = $disk->get($s3Key);
        file_put_contents($tempVerifyPath, $remoteContent);

        $actualChecksum = hash_file('sha256', $tempVerifyPath);
        unlink($tempVerifyPath);

        if ($actualChecksum !== $expectedChecksum) {
            throw new \RuntimeException(
                "Vérification d'intégrité échouée pour {$s3Key} !\n"
                . "Attendu  : {$expectedChecksum}\n"
                . "Obtenu   : {$actualChecksum}"
            );
        }

        $this->line("  ✓ Intégrité S3 vérifiée");
    }

    /**
     * Rotation automatique des sauvegardes S3.
     * Conserve uniquement les N dernières sauvegardes par type.
     */
    private function rotateBackups(): void
    {
        $disk = Storage::disk('s3_backup');

        $rotationMap = [
            self::S3_PREFIX_DAILY   => self::DAILY_RETENTION,
            self::S3_PREFIX_MONTHLY => self::MONTHLY_RETENTION,
            self::S3_PREFIX_YEARLY  => self::YEARLY_RETENTION,
        ];

        foreach ($rotationMap as $prefix => $maxCount) {
            $files = $disk->allFiles($prefix);

            // Exclure les fichiers .sha256 et .iv du comptage principal
            $mainFiles = array_filter($files, fn($f) => ! Str::endsWith($f, ['.sha256', '.iv']));
            $mainFiles = array_values($mainFiles);

            // Trier par date (du plus ancien au plus récent)
            usort($mainFiles, fn($a, $b) => $disk->lastModified($a) <=> $disk->lastModified($b));

            // Supprimer les plus anciens si on dépasse la limite
            $toDelete = max(0, count($mainFiles) - $maxCount);

            if ($toDelete > 0) {
                $this->line("  Rotation {$prefix} : suppression de {$toDelete} backup(s) ancien(s)");

                for ($i = 0; $i < $toDelete; $i++) {
                    if ($this->dryRun) {
                        $this->line("  [DRY-RUN] Suppression : {$mainFiles[$i]}");
                        continue;
                    }

                    $disk->delete($mainFiles[$i]);
                    $disk->delete($mainFiles[$i] . '.sha256');
                    $disk->delete($mainFiles[$i] . '.iv');
                }
            }
        }
    }

    /**
     * Nettoie les fichiers temporaires.
     */
    private function cleanup(): void
    {
        if (is_dir($this->tempDir)) {
            exec('rm -rf ' . escapeshellarg($this->tempDir));
        }
    }

    /**
     * Envoie une notification de succès par email.
     */
    private function notifySuccess(string $type, array $uploadedFiles): void
    {
        $adminEmail = config('secretis.superadmin_email', env('SUPERADMIN_EMAIL'));

        if (empty($adminEmail)) {
            return;
        }

        try {
            Mail::raw(
                "✅ Sauvegarde SECRETIS ERP réussie\n\n"
                . "ID       : {$this->backupId}\n"
                . "Type     : {$type}\n"
                . "Date     : {$this->timestamp}\n"
                . "Fichiers : " . implode("\n           ", $uploadedFiles) . "\n\n"
                . "Rétention : " . self::DAILY_RETENTION . " jours | "
                . self::MONTHLY_RETENTION . " mois | "
                . self::YEARLY_RETENTION . " ans",
                function ($message) use ($adminEmail) {
                    $message->to($adminEmail)
                            ->subject("[SECRETIS] ✅ Sauvegarde réussie - {$this->timestamp}");
                }
            );
        } catch (\Throwable $e) {
            $this->warn("Impossible d'envoyer l'email de succès : " . $e->getMessage());
        }
    }

    /**
     * Envoie une notification d'échec par email.
     */
    private function notifyFailure(string $errorMessage): void
    {
        $adminEmail = config('secretis.superadmin_email', env('SUPERADMIN_EMAIL'));

        if (empty($adminEmail)) {
            return;
        }

        try {
            Mail::raw(
                "❌ ÉCHEC DE SAUVEGARDE SECRETIS ERP\n\n"
                . "ID      : {$this->backupId}\n"
                . "Date    : {$this->timestamp}\n"
                . "Erreur  : {$errorMessage}\n\n"
                . "ACTION REQUISE : Vérifiez les logs et relancez la sauvegarde manuellement.\n"
                . "Commande : php artisan secretis:backup",
                function ($message) use ($adminEmail) {
                    $message->to($adminEmail)
                            ->subject("[SECRETIS] ❌ ÉCHEC SAUVEGARDE - {$this->timestamp}");
                }
            );
        } catch (\Throwable $e) {
            Log::error("Impossible d'envoyer l'email d'échec de backup", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Formatte une taille en octets en format lisible.
     */
    private function humanFilesize(int $bytes): string
    {
        $units = ['o', 'Ko', 'Mo', 'Go', 'To'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
