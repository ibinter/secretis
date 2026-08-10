<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * SecurityAuditCommand — Audit de sécurité complet de l'installation SECRETIS.
 *
 * Usage : php artisan secretis:security-audit
 *
 * Vérifie 10 points critiques de sécurité et produit un rapport coloré.
 * Retourne le code de sortie 0 si tout est OK, 1 si des problèmes critiques
 * ont été détectés (utile pour les pipelines CI/CD).
 */
class SecurityAuditCommand extends Command
{
    protected $signature   = 'secretis:security-audit {--json : Sortie en JSON pour intégration CI/CD}';
    protected $description = 'Audit de sécurité complet de l\'installation SECRETIS ERP';

    private array $results  = [];
    private int   $critical = 0;
    private int   $warnings = 0;
    private int   $passed   = 0;

    public function handle(): int
    {
        $this->newLine();
        $this->line('<fg=cyan;options=bold>╔══════════════════════════════════════════════════════╗</>');
        $this->line('<fg=cyan;options=bold>║     IBIG SECRETIS — Audit de Sécurité               ║</>');
        $this->line('<fg=cyan;options=bold>╚══════════════════════════════════════════════════════╝</>');
        $this->newLine();

        $this->checkEnvironmentVariables();
        $this->checkDebugMode();
        $this->checkAppEnvironment();
        $this->checkApiKeyEncryption();
        $this->checkDotEnvExposure();
        $this->checkPendingMigrations();
        $this->checkComposerVulnerabilities();
        $this->checkStoragePermissions();
        $this->checkSessionConfiguration();
        $this->checkCorsConfiguration();

        $this->printSummary();

        if ($this->option('json')) {
            $this->line(json_encode([
                'audit_date' => now()->toIso8601String(),
                'results'    => $this->results,
                'summary'    => [
                    'passed'   => $this->passed,
                    'warnings' => $this->warnings,
                    'critical' => $this->critical,
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }

        return $this->critical > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    // =========================================================================
    // Vérifications
    // =========================================================================

    private function checkEnvironmentVariables(): void
    {
        $this->sectionHeader('1. Variables d\'environnement critiques');

        $required = [
            'APP_KEY'                   => 'Clé d\'application Laravel',
            'DB_PASSWORD'               => 'Mot de passe base de données',
            'SANCTUM_STATEFUL_DOMAINS'  => 'Domaines stateful Sanctum',
            'SESSION_SECURE_COOKIE'     => 'Cookie de session sécurisé',
        ];

        $allOk = true;

        foreach ($required as $key => $label) {
            $value = env($key);

            if (empty($value)) {
                $this->record('critical', "ENV: {$key}", "{$label} non défini", $key);
                $allOk = false;
            } elseif ($key === 'APP_KEY' && ! str_starts_with($value, 'base64:')) {
                $this->record('warning', "ENV: {$key}", 'APP_KEY devrait être au format base64', $key);
                $allOk = false;
            } else {
                $this->record('ok', "ENV: {$key}", $label . ' — défini');
            }
        }
    }

    private function checkDebugMode(): void
    {
        $this->sectionHeader('2. Mode debug');

        $env   = app()->environment();
        $debug = config('app.debug');

        if ($env === 'production' && $debug) {
            $this->record('critical', 'APP_DEBUG', 'APP_DEBUG=true en production — stack traces exposées');
        } elseif ($env !== 'production' && $debug) {
            $this->record('warning', 'APP_DEBUG', 'APP_DEBUG=true (hors production — acceptable)');
        } else {
            $this->record('ok', 'APP_DEBUG', 'Mode debug désactivé');
        }
    }

    private function checkAppEnvironment(): void
    {
        $this->sectionHeader('3. Environnement applicatif');

        $env = app()->environment();

        if ($env === 'production') {
            $this->record('ok', 'APP_ENV', 'APP_ENV=production');
        } else {
            $this->record('warning', 'APP_ENV', "APP_ENV={$env} — pas en production");
        }
    }

    private function checkApiKeyEncryption(): void
    {
        $this->sectionHeader('4. Chiffrement des clés API en base');

        // Vérifier si la table integrations (ou api_keys) existe
        $tablesToCheck = ['integrations', 'api_keys', 'oauth_clients'];

        foreach ($tablesToCheck as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $hasApiKey = Schema::hasColumn($table, 'api_key')
                      || Schema::hasColumn($table, 'secret')
                      || Schema::hasColumn($table, 'access_token');

            if (! $hasApiKey) {
                continue;
            }

            // Chercher des valeurs non chiffrées (patterns évidents)
            $column = Schema::hasColumn($table, 'api_key') ? 'api_key'
                    : (Schema::hasColumn($table, 'secret') ? 'secret' : 'access_token');

            try {
                $plaintext = DB::table($table)
                    ->whereNotNull($column)
                    ->where($column, 'not like', 'eyJ%')  // JWT
                    ->where($column, 'not like', '$2y$%')  // bcrypt
                    ->where(DB::raw("LENGTH({$column})"), '<', 32)  // trop court pour être chiffré
                    ->count();

                if ($plaintext > 0) {
                    $this->record('critical', "Chiffrement:{$table}.{$column}", "{$plaintext} valeur(s) potentiellement en clair");
                } else {
                    $this->record('ok', "Chiffrement:{$table}.{$column}", 'Valeurs chiffrées ou vides');
                }
            } catch (\Exception $e) {
                $this->record('warning', "Chiffrement:{$table}", 'Impossible de vérifier : ' . $e->getMessage());
            }
        }

        if (! Schema::hasTable('integrations') && ! Schema::hasTable('api_keys')) {
            $this->record('ok', 'Chiffrement API Keys', 'Aucune table d\'API keys détectée');
        }
    }

    private function checkDotEnvExposure(): void
    {
        $this->sectionHeader('5. Exposition du fichier .env');

        // Vérifier les configurations web connues
        $publicPath = public_path();
        $envInPublic = file_exists($publicPath . '/.env')
                    || file_exists($publicPath . '/../../.env');

        if ($envInPublic) {
            $this->record('critical', 'Fichier .env', '.env accessible depuis la racine publique');
        } else {
            $this->record('ok', 'Fichier .env', '.env hors du répertoire public');
        }

        // Vérifier nginx/apache via la présence de règles de protection
        $htaccess = public_path('.htaccess');
        if (file_exists($htaccess)) {
            $content = file_get_contents($htaccess);
            if (str_contains($content, '.env') || str_contains($content, 'RewriteRule ^\.env')) {
                $this->record('ok', 'Apache .htaccess', 'Règle de protection .env présente');
            } else {
                $this->record('warning', 'Apache .htaccess', 'Aucune règle explicite de protection du .env');
            }
        } else {
            $this->record('warning', 'Config serveur web', 'Pas de .htaccess détecté — vérifier la config nginx');
        }
    }

    private function checkPendingMigrations(): void
    {
        $this->sectionHeader('6. Migrations en attente');

        try {
            $pending = $this->callSilent('migrate:status') === 0;
            $output  = [];
            $this->callSilent('migrate:status', [], $output);

            // Chercher les lignes "Pending" dans la sortie
            $pendingCount = 0;
            if (Schema::hasTable('migrations')) {
                // Comparer fichiers vs migrations exécutées
                $executed = DB::table('migrations')->pluck('migration')->toArray();
                $files    = glob(database_path('migrations/*.php'));

                foreach ($files as $file) {
                    $name = pathinfo($file, PATHINFO_FILENAME);
                    if (! in_array($name, $executed)) {
                        $pendingCount++;
                    }
                }
            }

            if ($pendingCount > 0) {
                $this->record('warning', 'Migrations', "{$pendingCount} migration(s) en attente");
            } else {
                $this->record('ok', 'Migrations', 'Toutes les migrations sont exécutées');
            }
        } catch (\Exception $e) {
            $this->record('warning', 'Migrations', 'Impossible de vérifier : ' . $e->getMessage());
        }
    }

    private function checkComposerVulnerabilities(): void
    {
        $this->sectionHeader('7. Vulnérabilités des dépendances PHP');

        $composerPath = base_path('composer.json');

        if (! file_exists($composerPath)) {
            $this->record('warning', 'Composer', 'composer.json introuvable');
            return;
        }

        // Exécuter composer audit
        $output   = [];
        $exitCode = 0;
        exec('cd ' . escapeshellarg(base_path()) . ' && composer audit --format=plain 2>&1', $output, $exitCode);
        $outputStr = implode("\n", $output);

        if ($exitCode === 0) {
            $this->record('ok', 'Composer Audit', 'Aucune vulnérabilité connue détectée');
        } elseif (str_contains($outputStr, 'No security vulnerability advisories found')) {
            $this->record('ok', 'Composer Audit', 'Aucune vulnérabilité connue');
        } elseif ($exitCode === 1) {
            // Compter les vulnérabilités
            $count = substr_count($outputStr, 'CVE-') + substr_count($outputStr, 'advisory');
            $this->record('critical', 'Composer Audit', "Vulnérabilités détectées (≈{$count}) — exécuter: composer update");
        } else {
            $this->record('warning', 'Composer Audit', 'Commande `composer audit` indisponible — mettre à jour composer');
        }
    }

    private function checkStoragePermissions(): void
    {
        $this->sectionHeader('8. Permissions des répertoires sensibles');

        $directories = [
            storage_path()                        => 'storage/',
            base_path('bootstrap/cache')          => 'bootstrap/cache/',
        ];

        foreach ($directories as $path => $label) {
            if (! is_dir($path)) {
                $this->record('warning', "Permissions:{$label}", 'Répertoire inexistant');
                continue;
            }

            if (PHP_OS_FAMILY === 'Windows') {
                // Sur Windows, vérifier l'accessibilité
                $this->record('ok', "Permissions:{$label}", 'Vérification manuelle requise (Windows)');
                continue;
            }

            $perms = fileperms($path);
            $octal = decoct($perms & 0777);

            // Acceptable : 755 ou moins (700, 750, 755)
            if ((int) $octal <= 755) {
                $this->record('ok', "Permissions:{$label}", "Permissions {$octal} — OK");
            } elseif ((int) $octal <= 775) {
                $this->record('warning', "Permissions:{$label}", "Permissions {$octal} — trop permissives (recommandé: 755)");
            } else {
                $this->record('critical', "Permissions:{$label}", "Permissions {$octal} — CRITIQUES (777)");
            }
        }
    }

    private function checkSessionConfiguration(): void
    {
        $this->sectionHeader('9. Configuration des sessions');

        $httpOnly = config('session.http_only', false);
        $secure   = config('session.secure', false);
        $env      = app()->environment();

        if ($httpOnly) {
            $this->record('ok', 'Session httponly', 'session.http_only=true');
        } else {
            $this->record('critical', 'Session httponly', 'session.http_only=false — cookies accessibles via JavaScript');
        }

        if ($env === 'production' && ! $secure) {
            $this->record('critical', 'Session secure', 'session.secure=false en production — cookies envoyés en clair');
        } elseif ($secure) {
            $this->record('ok', 'Session secure', 'session.secure=true');
        } else {
            $this->record('warning', 'Session secure', 'session.secure=false (hors production — acceptable)');
        }

        $sameSite = config('session.same_site', 'lax');
        if (in_array(strtolower($sameSite), ['strict', 'lax'])) {
            $this->record('ok', 'Session same_site', "session.same_site={$sameSite}");
        } else {
            $this->record('warning', 'Session same_site', "session.same_site={$sameSite} — recommandé: lax ou strict");
        }
    }

    private function checkCorsConfiguration(): void
    {
        $this->sectionHeader('10. Configuration CORS');

        $origins = config('cors.allowed_origins', []);
        $env     = app()->environment();

        if (in_array('*', $origins)) {
            if ($env === 'production') {
                $this->record('critical', 'CORS origins', 'allowed_origins=[*] en production — toutes origines autorisées');
            } else {
                $this->record('warning', 'CORS origins', 'allowed_origins=[*] (hors production — à restreindre avant déploiement)');
            }
        } else {
            $this->record('ok', 'CORS origins', 'Origines restreintes : ' . implode(', ', $origins));
        }

        $credentials = config('cors.supports_credentials', false);
        if ($credentials) {
            $this->record('ok', 'CORS credentials', 'supports_credentials=true (requis pour Sanctum)');
        } else {
            $this->record('warning', 'CORS credentials', 'supports_credentials=false — vérifier compatibilité Sanctum');
        }
    }

    // =========================================================================
    // Helpers d'affichage
    // =========================================================================

    private function sectionHeader(string $title): void
    {
        $this->newLine();
        $this->line("<fg=yellow;options=bold>▶ {$title}</>");
    }

    private function record(string $level, string $check, string $message, string $key = ''): void
    {
        $this->results[] = [
            'level'   => $level,
            'check'   => $check,
            'message' => $message,
        ];

        match ($level) {
            'ok'       => $this->passed++,
            'warning'  => $this->warnings++,
            'critical' => $this->critical++,
            default    => null,
        };

        $icon  = match ($level) {
            'ok'       => '<fg=green>✅ OK</>',
            'warning'  => '<fg=yellow>⚠️  ATTENTION</>',
            'critical' => '<fg=red;options=bold>❌ CRITIQUE</>',
            default    => '   ',
        };

        $this->line("  {$icon}  <options=bold>{$check}</>: {$message}");
    }

    private function printSummary(): void
    {
        $this->newLine();
        $this->line('<fg=cyan;options=bold>════════════════════════════════════════</>');
        $this->line('<fg=cyan;options=bold>  Résumé de l\'audit</>');
        $this->line('<fg=cyan;options=bold>════════════════════════════════════════</>');
        $this->line("  <fg=green>✅ Validés  : {$this->passed}</>");
        $this->line("  <fg=yellow>⚠️  Attention : {$this->warnings}</>");
        $this->line("  <fg=red>❌ Critiques : {$this->critical}</>");
        $this->newLine();

        if ($this->critical > 0) {
            $this->line('<fg=red;options=bold>  ⚠️  DES PROBLÈMES CRITIQUES ONT ÉTÉ DÉTECTÉS.</> Corriger avant déploiement en production.');
        } elseif ($this->warnings > 0) {
            $this->line('<fg=yellow>  Quelques avertissements à examiner avant la mise en production.</>');
        } else {
            $this->line('<fg=green;options=bold>  Toutes les vérifications sont passées. Installation sécurisée.</>');
        }

        $this->newLine();
    }
}
