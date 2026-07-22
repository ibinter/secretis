<?php

namespace App\Console\Commands;

use App\Models\IntegrationLog;
use App\Models\OrganizationIntegration;
use App\Services\IntegrationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * SyncIntegrations — Commande CRON toutes les 15 minutes.
 *
 * Responsabilités :
 *  1. Synchronisation des connecteurs actifs (Zoho, Sage, etc.)
 *  2. Retry des événements en erreur avec backoff exponentiel
 *  3. Alerte si un connecteur est en erreur depuis > 1 heure
 *  4. Nettoyage des logs > 90 jours
 *
 * Planification dans Kernel.php :
 *   $schedule->command('integrations:sync')->everyFifteenMinutes();
 *
 * Usage manuel :
 *   php artisan integrations:sync
 *   php artisan integrations:sync --org=5
 *   php artisan integrations:sync --connector=zoho-crm
 *   php artisan integrations:sync --retry-only
 */
class SyncIntegrations extends Command
{
    protected $signature = 'integrations:sync
                            {--org=           : Synchroniser une seule organisation}
                            {--connector=      : Synchroniser un seul connecteur (slug)}
                            {--retry-only      : Ne faire que les retries}
                            {--dry-run         : Simulation sans modification}';

    protected $description = 'Synchronise tous les connecteurs actifs et retry les erreurs (CRON 15 min)';

    // Connecteurs qui supportent la sync automatique
    private const AUTO_SYNC_CONNECTORS = [
        'zoho-crm',
        'google-calendar',
        'outlook-calendar',
        'sage-100',
    ];

    // Backoff exponentiel pour les retries (en minutes)
    private const RETRY_DELAYS = [5, 15, 30, 60, 120, 240]; // 6 tentatives max

    public function __construct(private readonly IntegrationService $service)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $startTime  = microtime(true);
        $isDryRun   = $this->option('dry-run');
        $isRetryOnly = $this->option('retry-only');
        $orgFilter  = $this->option('org');
        $connFilter = $this->option('connector');

        $this->info("🔄 SECRETIS Integrations Sync" . ($isDryRun ? ' [DRY-RUN]' : '') . " — " . now()->format('Y-m-d H:i:s'));
        $this->line(str_repeat('─', 60));

        $synced  = 0;
        $errors  = 0;
        $retried = 0;
        $alerted = 0;

        // ── 1. Retry des événements en erreur ─────────────────────────────────

        $retried = $this->retryFailedEvents($isDryRun);

        if (!$isRetryOnly) {
            // ── 2. Sync des connecteurs actifs ────────────────────────────────

            $query = OrganizationIntegration::where('status', 'active')
                ->whereIn(
                    'connector_id',
                    \App\Models\IntegrationConnector::whereIn('slug', self::AUTO_SYNC_CONNECTORS)->pluck('id')
                )
                ->with(['connector', 'organization']);

            if ($orgFilter) {
                $query->where('organization_id', $orgFilter);
            }

            if ($connFilter) {
                $query->whereHas('connector', fn ($q) => $q->where('slug', $connFilter));
            }

            $integrations = $query->get();

            $this->info("→ {$integrations->count()} connecteurs à synchroniser");

            foreach ($integrations as $integration) {
                $slug    = $integration->connector->slug;
                $orgName = $integration->organization->name ?? "Org #{$integration->organization_id}";

                $this->line("  [{$slug}] {$orgName}…");

                if ($isDryRun) {
                    $this->line("    <fg=yellow>DRY-RUN : sync ignorée</>");
                    continue;
                }

                try {
                    $this->service->syncConnector($integration);
                    $synced++;
                    $this->line("    <fg=green>✓ OK</>");
                } catch (\Throwable $e) {
                    $errors++;
                    $this->line("    <fg=red>✗ {$e->getMessage()}</>");
                    Log::error("SyncIntegrations [{$slug}]", [
                        'org'   => $integration->organization_id,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Petite pause pour éviter de saturer les APIs tierces
                usleep(200_000); // 200ms
            }
        }

        // ── 3. Alertes pour connecteurs en erreur depuis > 1h ─────────────────

        $alerted = $this->alertStaleErrors($isDryRun);

        // ── 4. Nettoyage des vieux logs ───────────────────────────────────────

        if (!$isDryRun) {
            $deleted = IntegrationLog::where('created_at', '<', now()->subDays(90))->delete();
            if ($deleted > 0) {
                $this->line("  🗑️  {$deleted} logs supprimés (> 90 jours)");
            }
        }

        // ── Résumé ────────────────────────────────────────────────────────────

        $duration = round(microtime(true) - $startTime, 2);
        $this->line(str_repeat('─', 60));
        $this->info("✅ Terminé en {$duration}s — Syncs: {$synced}, Erreurs: {$errors}, Retries: {$retried}, Alertes: {$alerted}");

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }

    // ─── Retry des événements en erreur ───────────────────────────────────────

    private function retryFailedEvents(bool $isDryRun): int
    {
        $retried = 0;

        // Récupère les intégrations en erreur avec des retry disponibles
        $errored = OrganizationIntegration::where('status', 'error')
            ->whereNotNull('error_message')
            ->with(['connector', 'organization'])
            ->get();

        $this->info("→ {$errored->count()} connecteurs en erreur à retenter");

        foreach ($errored as $integration) {
            $retryCount = $this->getRetryCount($integration);

            if ($retryCount >= count(self::RETRY_DELAYS)) {
                $this->line("  [{$integration->connector->slug}] max retries atteint → skip");
                continue;
            }

            $delayMinutes = self::RETRY_DELAYS[$retryCount];
            $lastError    = $integration->updated_at;
            $nextRetry    = $lastError->addMinutes($delayMinutes);

            if ($nextRetry->isFuture()) {
                continue; // Pas encore l'heure du prochain retry
            }

            $this->line("  [{$integration->connector->slug}] Retry #{$retryCount} (backoff {$delayMinutes}min)…");

            if ($isDryRun) {
                continue;
            }

            try {
                $ok = $this->service->testConnection($integration);
                if ($ok) {
                    $integration->update([
                        'status'        => 'active',
                        'error_message' => null,
                    ]);
                    $this->line("    <fg=green>✓ Reconnecté !</>");
                    $retried++;
                } else {
                    $this->incrementRetryCount($integration);
                }
            } catch (\Throwable $e) {
                $this->incrementRetryCount($integration, $e->getMessage());
            }
        }

        return $retried;
    }

    // ─── Alertes connecteurs bloqués ─────────────────────────────────────────

    private function alertStaleErrors(bool $isDryRun): int
    {
        $alerted = 0;

        // Connecteurs en erreur depuis plus de 1 heure
        $stale = OrganizationIntegration::where('status', 'error')
            ->where('updated_at', '<', now()->subHour())
            ->with(['connector', 'organization.users' => fn ($q) => $q->where('role', 'admin')])
            ->get();

        foreach ($stale as $integration) {
            $slug    = $integration->connector->slug;
            $orgName = $integration->organization->name ?? "Org #{$integration->organization_id}";
            $since   = $integration->updated_at->diffForHumans();

            $this->line("  ⚠️  [{$slug}] {$orgName} en erreur depuis {$since}");

            if ($isDryRun) {
                continue;
            }

            // Notification aux admins de l'organisation
            foreach ($integration->organization->users ?? [] as $admin) {
                try {
                    $admin->notify(new \App\Notifications\IntegrationErrorAlert($integration, $since));
                    $alerted++;
                } catch (\Throwable $e) {
                    Log::warning("Alerte intégration non envoyée", [
                        'user'  => $admin->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Notification Slack si configuré
            $slackIntegration = OrganizationIntegration::where('organization_id', $integration->organization_id)
                ->whereHas('connector', fn ($q) => $q->where('slug', 'slack'))
                ->where('status', 'active')
                ->first();

            if ($slackIntegration) {
                try {
                    $config = $this->service->decryptConfig($slackIntegration->config ?? []);
                    app(\App\Services\Integrations\SlackConnector::class)
                        ->withConfig($config)
                        ->notifyAlert(
                            "Connecteur {$slug} en erreur",
                            "L'intégration {$slug} est en erreur depuis {$since}. Vérifiez la configuration dans SECRETIS.",
                            'critical'
                        );
                } catch (\Throwable) {
                    // Ignore les erreurs Slack pour éviter la cascade
                }
            }
        }

        return $alerted;
    }

    // ─── Helpers retry ────────────────────────────────────────────────────────

    private function getRetryCount(OrganizationIntegration $integration): int
    {
        return (int) \Illuminate\Support\Facades\Cache::get(
            "integration_retry:{$integration->id}",
            0
        );
    }

    private function incrementRetryCount(OrganizationIntegration $integration, string $error = ''): void
    {
        $count = $this->getRetryCount($integration) + 1;
        \Illuminate\Support\Facades\Cache::put(
            "integration_retry:{$integration->id}",
            $count,
            now()->addDays(1)
        );

        if ($error) {
            $integration->update(['error_message' => $error]);
        }
    }
}
