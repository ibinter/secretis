<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class VerifyInstallation extends Command
{
    protected $signature   = 'secretis:verify {--fix : Tenter de corriger automatiquement les problèmes}';
    protected $description = 'Vérification complète de l\'installation SECRETIS ERP avant mise en production';

    private array $results  = [];
    private int   $passed   = 0;
    private int   $failed   = 0;
    private int   $warnings = 0;

    public function handle(): int
    {
        $this->renderHeader();

        $this->checkSection('BASE DE DONNÉES', [
            [$this, 'checkDatabaseConnection'],
            [$this, 'checkMigrations'],
            [$this, 'checkPlansSeeded'],
        ]);

        $this->checkSection('REDIS & CACHE', [
            [$this, 'checkRedisConnection'],
            [$this, 'checkCacheDriver'],
            [$this, 'checkQueueDriver'],
        ]);

        $this->checkSection('VARIABLES D\'ENVIRONNEMENT', [
            [$this, 'checkEnvProduction'],
            [$this, 'checkEnvAppKey'],
            [$this, 'checkEnvDatabase'],
            [$this, 'checkEnvMail'],
            [$this, 'checkEnvGroq'],
            [$this, 'checkEnvReverb'],
        ]);

        $this->checkSection('STOCKAGE & PERMISSIONS', [
            [$this, 'checkStorageLink'],
            [$this, 'checkStoragePermissions'],
            [$this, 'checkLogsDirectory'],
        ]);

        $this->checkSection('SERVICES EXTERNES', [
            [$this, 'checkSmtpConnection'],
            [$this, 'checkGroqConnection'],
            [$this, 'checkQueueWorker'],
        ]);

        $this->checkSection('SÉCURITÉ', [
            [$this, 'checkHttpsForced'],
            [$this, 'checkDebugDisabled'],
            [$this, 'checkAppKeyStrength'],
        ]);

        $this->renderSummary();

        return $this->failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    // ── Sections ──────────────────────────────────────────────────────────────

    private function checkSection(string $title, array $checks): void
    {
        $this->line('');
        $this->line("  <fg=cyan;options=bold>── {$title} ──────────────────────────────────────</>");

        foreach ($checks as $check) {
            call_user_func($check);
        }
    }

    // ── BASE DE DONNÉES ───────────────────────────────────────────────────────

    private function checkDatabaseConnection(): void
    {
        try {
            DB::connection()->getPdo();
            $driver = DB::connection()->getDriverName();
            $db     = DB::connection()->getDatabaseName();
            $this->pass("Connexion base de données ({$driver}:{$db})");
        } catch (\Exception $e) {
            $this->fail('Connexion base de données', $e->getMessage());
        }
    }

    private function checkMigrations(): void
    {
        try {
            $pending = $this->getPendingMigrations();
            if (empty($pending)) {
                $this->pass('Toutes les migrations sont exécutées');
            } else {
                $count = count($pending);
                $this->fail("Migrations en attente ({$count})", implode(', ', array_slice($pending, 0, 3)) . '...');
            }
        } catch (\Exception $e) {
            $this->fail('Vérification migrations', $e->getMessage());
        }
    }

    private function checkPlansSeeded(): void
    {
        try {
            $planCount = DB::table('plans')->count();
            if ($planCount >= 3) {
                $this->pass("Plans tarifaires en base ({$planCount} plans)");
            } else {
                $this->warn("Plans tarifaires incomplets ({$planCount}/3)", 'Exécutez : php artisan db:seed --class=DemoPlanSeeder');
            }
        } catch (\Exception $e) {
            $this->fail('Plans tarifaires', $e->getMessage());
        }
    }

    // ── REDIS ─────────────────────────────────────────────────────────────────

    private function checkRedisConnection(): void
    {
        try {
            Redis::ping();
            $this->pass('Connexion Redis');
        } catch (\Exception $e) {
            $this->fail('Connexion Redis', 'Redis inaccessible : ' . $e->getMessage());
        }
    }

    private function checkCacheDriver(): void
    {
        $driver = config('cache.default');
        if (in_array($driver, ['redis', 'memcached'])) {
            $this->pass("Driver cache ({$driver})");
        } else {
            $this->warn("Driver cache ({$driver})", 'En production, utiliser redis ou memcached');
        }
    }

    private function checkQueueDriver(): void
    {
        $driver = config('queue.default');
        if (in_array($driver, ['redis', 'database', 'sqs'])) {
            $this->pass("Driver queue ({$driver})");
        } else {
            $this->warn("Driver queue ({$driver})", 'En production, utiliser redis ou database');
        }
    }

    // ── VARIABLES D\'ENVIRONNEMENT ─────────────────────────────────────────────

    private function checkEnvProduction(): void
    {
        $env = app()->environment();
        if ($env === 'production') {
            $this->pass('Environnement production (APP_ENV=production)');
        } elseif ($env === 'staging') {
            $this->warn("Environnement ({$env})", 'Vérifier que APP_ENV=production en production');
        } else {
            $this->fail("Environnement ({$env})", 'APP_ENV doit être "production"');
        }
    }

    private function checkEnvAppKey(): void
    {
        $key = config('app.key');
        if (! empty($key) && strlen($key) >= 32) {
            $this->pass('APP_KEY défini et de longueur suffisante');
        } else {
            $this->fail('APP_KEY manquant ou trop court', 'Exécutez : php artisan key:generate');
        }
    }

    private function checkEnvDatabase(): void
    {
        $required = ['DB_HOST', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'];
        $missing  = [];
        foreach ($required as $var) {
            if (empty(env($var))) {
                $missing[] = $var;
            }
        }
        if (empty($missing)) {
            $this->pass('Variables base de données configurées');
        } else {
            $this->fail('Variables base de données manquantes', implode(', ', $missing));
        }
    }

    private function checkEnvMail(): void
    {
        $required = ['MAIL_HOST', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'];
        $missing  = [];
        foreach ($required as $var) {
            if (empty(env($var))) {
                $missing[] = $var;
            }
        }
        if (empty($missing)) {
            $this->pass('Variables SMTP configurées');
        } else {
            $this->warn('Variables SMTP incomplètes', 'Manquantes : ' . implode(', ', $missing));
        }
    }

    private function checkEnvGroq(): void
    {
        $key = env('GROQ_API_KEY');
        if (! empty($key) && str_starts_with($key, 'gsk_')) {
            $this->pass('Clé API Groq (SARA) configurée');
        } elseif (! empty($key)) {
            $this->warn('Clé API Groq présente', 'Format inhabituel — vérifier la clé');
        } else {
            $this->warn('Clé API Groq manquante (GROQ_API_KEY)', 'SARA ne fonctionnera pas sans cette clé');
        }
    }

    private function checkEnvReverb(): void
    {
        $host = env('REVERB_APP_ID');
        if (! empty($host)) {
            $this->pass('Laravel Reverb (WebSocket) configuré');
        } else {
            $this->warn('Reverb non configuré (REVERB_APP_ID)', 'Les notifications temps réel seront désactivées');
        }
    }

    // ── STOCKAGE ─────────────────────────────────────────────────────────────

    private function checkStorageLink(): void
    {
        $publicPath = public_path('storage');
        if (is_link($publicPath) || is_dir($publicPath)) {
            $this->pass('Lien symbolique storage (public/storage)');
        } else {
            $this->fail('Lien symbolique storage manquant', 'Exécutez : php artisan storage:link');
        }
    }

    private function checkStoragePermissions(): void
    {
        $dirs = [
            storage_path('app'),
            storage_path('app/public'),
            storage_path('logs'),
            storage_path('framework/cache'),
            storage_path('framework/sessions'),
        ];

        $problematic = [];
        foreach ($dirs as $dir) {
            if (! is_dir($dir)) {
                $problematic[] = basename($dir) . ' (manquant)';
            } elseif (! is_writable($dir)) {
                $problematic[] = basename($dir) . ' (non-inscriptible)';
            }
        }

        if (empty($problematic)) {
            $this->pass('Permissions dossiers storage (lecture/écriture)');
        } else {
            $this->fail('Permissions storage incorrectes', implode(', ', $problematic));
        }
    }

    private function checkLogsDirectory(): void
    {
        $logPath = storage_path('logs/laravel.log');
        if (is_writable(dirname($logPath))) {
            $size = file_exists($logPath) ? round(filesize($logPath) / 1024 / 1024, 2) : 0;
            $msg  = "Logs accessibles ({$size} Mo)";
            if ($size > 100) {
                $this->warn($msg, 'Fichier de log volumineux, envisager une rotation');
            } else {
                $this->pass($msg);
            }
        } else {
            $this->fail('Dossier logs non accessible', 'Vérifier les permissions de storage/logs/');
        }
    }

    // ── SERVICES EXTERNES ─────────────────────────────────────────────────────

    private function checkSmtpConnection(): void
    {
        $host = env('MAIL_HOST');
        $port = env('MAIL_PORT', 587);

        if (empty($host)) {
            $this->warn('SMTP non testé', 'MAIL_HOST non défini');
            return;
        }

        try {
            $connection = @fsockopen($host, $port, $errno, $errstr, 5);
            if ($connection) {
                fclose($connection);
                $this->pass("SMTP accessible ({$host}:{$port})");
            } else {
                $this->fail("SMTP inaccessible ({$host}:{$port})", $errstr);
            }
        } catch (\Exception $e) {
            $this->warn('Test SMTP échoué', $e->getMessage());
        }
    }

    private function checkGroqConnection(): void
    {
        $key = env('GROQ_API_KEY');
        if (empty($key)) {
            $this->warn('Test Groq ignoré', 'GROQ_API_KEY non défini');
            return;
        }

        try {
            $response = Http::timeout(5)->withHeaders([
                'Authorization' => 'Bearer ' . $key,
            ])->get('https://api.groq.com/openai/v1/models');

            if ($response->successful()) {
                $this->pass('Connexion API Groq (SARA) fonctionnelle');
            } else {
                $this->fail('Connexion API Groq échouée', 'Code HTTP : ' . $response->status());
            }
        } catch (\Exception $e) {
            $this->warn('Test Groq échoué', 'Vérifier la connectivité réseau : ' . $e->getMessage());
        }
    }

    private function checkQueueWorker(): void
    {
        try {
            $queueSize = DB::table('jobs')->count();
            $failed    = DB::table('failed_jobs')->count();

            if ($failed > 10) {
                $this->warn("Queue : {$queueSize} jobs en attente, {$failed} jobs en échec", 'Vérifier les jobs échoués : php artisan queue:failed');
            } else {
                $this->pass("Queue fonctionnelle ({$queueSize} jobs, {$failed} échecs)");
            }
        } catch (\Exception $e) {
            // La table jobs peut ne pas exister si queue=sync
            $driver = config('queue.default');
            if ($driver === 'sync') {
                $this->warn('Queue en mode synchrone', 'Configurer redis ou database pour la production');
            } else {
                $this->warn('Impossible de vérifier la queue', $e->getMessage());
            }
        }
    }

    // ── SÉCURITÉ ─────────────────────────────────────────────────────────────

    private function checkHttpsForced(): void
    {
        $forceHttps = env('FORCE_HTTPS', false) || config('app.env') === 'production';
        $appUrl     = config('app.url');

        if (str_starts_with($appUrl, 'https://')) {
            $this->pass('URL applicative en HTTPS');
        } else {
            $this->warn('URL applicative en HTTP', 'Configurer APP_URL avec https:// en production');
        }
    }

    private function checkDebugDisabled(): void
    {
        if (! config('app.debug')) {
            $this->pass('Mode debug désactivé (APP_DEBUG=false)');
        } else {
            $this->fail('Mode debug ACTIVÉ', 'Définir APP_DEBUG=false en production — fuite d\'informations sensibles !');
        }
    }

    private function checkAppKeyStrength(): void
    {
        $key = config('app.key');
        // La clé est stockée sous la forme "base64:..."
        if (str_starts_with($key, 'base64:')) {
            $decoded = base64_decode(substr($key, 7));
            if (strlen($decoded) === 32) {
                $this->pass('APP_KEY de longueur correcte (256 bits)');
            } else {
                $this->fail('APP_KEY longueur incorrecte', 'Exécutez : php artisan key:generate');
            }
        } else {
            $this->warn('APP_KEY non base64', 'Utiliser le format base64 généré par artisan');
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function pass(string $message): void
    {
        $this->line("    <fg=green>✓</> {$message}");
        $this->passed++;
        $this->results[] = ['status' => 'pass', 'message' => $message];
    }

    private function fail(string $message, string $detail = ''): void
    {
        $this->line("    <fg=red>✗</> <fg=red>{$message}</>");
        if ($detail) {
            $this->line("        <fg=gray>→ {$detail}</>");
        }
        $this->failed++;
        $this->results[] = ['status' => 'fail', 'message' => $message, 'detail' => $detail];
    }

    private function warn(string $message, string $detail = ''): void
    {
        $this->line("    <fg=yellow>⚠</> {$message}");
        if ($detail) {
            $this->line("        <fg=gray>→ {$detail}</>");
        }
        $this->warnings++;
        $this->results[] = ['status' => 'warn', 'message' => $message, 'detail' => $detail];
    }

    private function renderHeader(): void
    {
        $version = config('app.version', '1.0.0');
        $env     = app()->environment();

        $this->line('');
        $this->line('  <fg=cyan;options=bold>╔══════════════════════════════════════════════════╗</>');
        $this->line('  <fg=cyan;options=bold>║       SECRETIS ERP — Vérification Installation   ║</>');
        $this->line('  <fg=cyan;options=bold>╚══════════════════════════════════════════════════╝</>');
        $this->line("  Version : <fg=white>{$version}</>   Environnement : <fg=yellow>{$env}</>");
        $this->line("  Date    : <fg=white>" . now()->format('d/m/Y H:i:s') . '</> (Africa/Abidjan)');
    }

    private function renderSummary(): void
    {
        $total  = $this->passed + $this->failed + $this->warnings;
        $score  = $total > 0 ? round(($this->passed / $total) * 100) : 0;

        $this->line('');
        $this->line('  <fg=cyan>── RÉSUMÉ ────────────────────────────────────────────────</>');
        $this->line("  <fg=green>✓ Succès   : {$this->passed}</>");
        $this->line("  <fg=yellow>⚠ Avertiss.: {$this->warnings}</>");
        $this->line("  <fg=red>✗ Échecs   : {$this->failed}</>");
        $this->line('');

        $scoreColor = $score >= 90 ? 'green' : ($score >= 70 ? 'yellow' : 'red');
        $this->line("  Score de préparation : <fg={$scoreColor};options=bold>{$score}%</>");

        $this->line('');
        if ($this->failed === 0 && $this->warnings <= 2) {
            $this->line('  <fg=green;options=bold>🚀 Installation prête pour la production !</>');
        } elseif ($this->failed === 0) {
            $this->line('  <fg=yellow;options=bold>⚠  Quelques avertissements à corriger avant le déploiement.</>' );
        } else {
            $this->line("  <fg=red;options=bold>✗  {$this->failed} problème(s) critique(s) à résoudre avant le déploiement.</>");
            $this->line('');
            $this->line('  Problèmes critiques :');
            foreach ($this->results as $r) {
                if ($r['status'] === 'fail') {
                    $this->line("    • {$r['message']}");
                    if (! empty($r['detail'])) {
                        $this->line("      → {$r['detail']}");
                    }
                }
            }
        }

        $this->line('');
        $this->line('  <fg=gray>Pour obtenir de l\'aide : php artisan secretis:verify --help</>');
        $this->line('  <fg=gray>Documentation : https://docs.secretis.app/installation</>');
        $this->line('');
    }

    private function getPendingMigrations(): array
    {
        $ran     = DB::table('migrations')->pluck('migration')->toArray();
        $allFiles = glob(database_path('migrations/*.php'));
        $pending  = [];

        foreach ($allFiles as $file) {
            $name = pathinfo($file, PATHINFO_FILENAME);
            if (! in_array($name, $ran)) {
                $pending[] = $name;
            }
        }

        return $pending;
    }
}
