<?php

namespace App\Services;

use App\Models\IntegrationConnector;
use App\Models\IntegrationLog;
use App\Models\Organization;
use App\Models\OrganizationIntegration;
use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * IntegrationService — Gestion du cycle de vie des intégrations SECRETIS.
 *
 * Responsabilités :
 *  - Catalogue des connecteurs filtrés par plan
 *  - Installation / désinstallation
 *  - Test de connexion (ping tiers)
 *  - Synchronisation bidirectionnelle
 *  - Journalisation des événements
 *  - Statistiques d'utilisation
 */
class IntegrationService
{
    // ─── Plan hierarchy ───────────────────────────────────────────────────────

    private const PLAN_ORDER = ['starter' => 1, 'pro' => 2, 'enterprise' => 3];

    // ─── 1. Catalogue filtré par plan ─────────────────────────────────────────

    /**
     * Retourne la liste des connecteurs disponibles pour un plan donné.
     * Les connecteurs dépréciés sont exclus.
     *
     * @param  string $plan  starter | pro | enterprise
     * @return array<int, array<string, mixed>>
     */
    public function getAvailableConnectors(string $plan): array
    {
        $planLevel = self::PLAN_ORDER[$plan] ?? 1;

        return IntegrationConnector::where('status', '!=', 'deprecated')
            ->get()
            ->filter(function (IntegrationConnector $c) use ($planLevel) {
                return (self::PLAN_ORDER[$c->required_plan] ?? 1) <= $planLevel;
            })
            ->map(fn (IntegrationConnector $c) => [
                'id'               => $c->id,
                'slug'             => $c->slug,
                'name'             => $c->name,
                'category'         => $c->category,
                'description'      => $c->description,
                'icon_url'         => $c->icon_url,
                'is_official'      => $c->is_official,
                'is_premium'       => $c->is_premium,
                'required_plan'    => $c->required_plan,
                'status'           => $c->status,
                'documentation_url'=> $c->documentation_url,
                'config_schema'    => $c->config_schema,
            ])
            ->values()
            ->toArray();
    }

    // ─── 2. Installation ──────────────────────────────────────────────────────

    /**
     * Installe un connecteur pour une organisation avec la configuration fournie.
     * La configuration (clés API) est chiffrée avant stockage.
     *
     * @throws \InvalidArgumentException si le connecteur est introuvable ou déjà installé
     */
    public function installConnector(
        Organization $org,
        int $connectorId,
        array $config
    ): OrganizationIntegration {
        $connector = IntegrationConnector::findOrFail($connectorId);

        // Vérification plan
        $orgPlanLevel  = self::PLAN_ORDER[$org->plan ?? 'starter'] ?? 1;
        $connPlanLevel = self::PLAN_ORDER[$connector->required_plan] ?? 1;
        if ($connPlanLevel > $orgPlanLevel) {
            throw new \InvalidArgumentException(
                "Ce connecteur nécessite le plan {$connector->required_plan}."
            );
        }

        // Chiffrement de la config
        $encryptedConfig = [];
        foreach ($config as $key => $value) {
            $encryptedConfig[$key] = Crypt::encryptString((string) $value);
        }

        $integration = OrganizationIntegration::updateOrCreate(
            ['organization_id' => $org->id, 'connector_id' => $connectorId],
            [
                'status'     => 'pending',
                'config'     => $encryptedConfig,
                'created_by' => auth()->id(),
            ]
        );

        // Test immédiat de la connexion
        try {
            $ok = $this->testConnection($integration);
            $integration->update(['status' => $ok ? 'active' : 'error']);
        } catch (\Throwable $e) {
            $integration->update([
                'status'        => 'error',
                'error_message' => $e->getMessage(),
            ]);
        }

        $this->logEvent(
            $connector->slug,
            'outbound',
            'connector.installed',
            ['connector_id' => $connectorId, 'org_id' => $org->id],
            $integration->status === 'active'
        );

        return $integration->refresh();
    }

    // ─── 3. Test de connexion ─────────────────────────────────────────────────

    /**
     * Effectue un ping sur l'API tierce pour vérifier la connectivité.
     * Chaque connecteur a son propre endpoint de test défini dans config_schema.
     */
    public function testConnection(OrganizationIntegration $integration): bool
    {
        $connector = $integration->connector;
        $config    = $this->decryptConfig($integration->config ?? []);

        $testUrl = $connector->config_schema['test_url'] ?? null;

        if (!$testUrl) {
            // Pas d'URL de test définie → on considère OK si config non vide
            return !empty($config);
        }

        // Résolution des variables {api_key}, {base_url}, etc. dans l'URL
        foreach ($config as $k => $v) {
            $testUrl = str_replace("{{$k}}", $v, $testUrl);
        }

        $headers = [];
        if (!empty($config['api_key'])) {
            $headers['Authorization'] = 'Bearer ' . $config['api_key'];
        }
        if (!empty($config['api_username']) && !empty($config['api_password'])) {
            $headers['Authorization'] = 'Basic ' . base64_encode(
                $config['api_username'] . ':' . $config['api_password']
            );
        }

        $start    = microtime(true);
        $response = Http::withHeaders($headers)->timeout(10)->get($testUrl);
        $duration = (int) ((microtime(true) - $start) * 1000);

        $ok = $response->successful();

        $this->logEvent(
            $connector->slug,
            'outbound',
            'connector.test',
            ['url' => $testUrl, 'status' => $response->status()],
            $ok,
            $duration,
            $response->status()
        );

        if (!$ok) {
            $integration->update([
                'status'        => 'error',
                'error_message' => "HTTP {$response->status()}: {$response->body()}",
            ]);
        }

        return $ok;
    }

    // ─── 4. Désactivation ────────────────────────────────────────────────────

    public function disableConnector(OrganizationIntegration $integration): void
    {
        $integration->update(['status' => 'disabled']);

        $this->logEvent(
            $integration->connector->slug,
            'outbound',
            'connector.disabled',
            ['integration_id' => $integration->id],
            true
        );
    }

    // ─── 5. Synchronisation bidirectionnelle ──────────────────────────────────

    /**
     * Déclenche la synchronisation bidirectionnelle du connecteur.
     * Délègue au service spécialisé selon le slug.
     */
    public function syncConnector(OrganizationIntegration $integration): void
    {
        if ($integration->status !== 'active') {
            throw new \RuntimeException("Le connecteur n'est pas actif.");
        }

        $slug   = $integration->connector->slug;
        $config = $this->decryptConfig($integration->config ?? []);

        $start = microtime(true);
        $error = null;

        try {
            match ($slug) {
                'zoho-crm'    => app(\App\Services\Integrations\ZohoConnector::class)
                                     ->withConfig($config)->syncContacts(),
                'slack'       => null, // Slack est push-only
                'telegram'    => null, // Telegram est push-only
                'sage-100'    => app(\App\Services\Integrations\SageConnector::class)
                                     ->withConfig($config)->syncContactsSage(
                                         $integration->organization
                                     ),
                default       => Log::info("Sync non implémentée pour {$slug}"),
            };

            $integration->update(['last_sync_at' => now(), 'status' => 'active', 'error_message' => null]);
        } catch (\Throwable $e) {
            $error = $e->getMessage();
            $integration->update(['status' => 'error', 'error_message' => $error]);
            Log::error("Sync {$slug} échouée", ['error' => $error]);
        }

        $duration = (int) ((microtime(true) - $start) * 1000);

        $this->logEvent(
            $slug,
            'outbound',
            'connector.sync',
            ['integration_id' => $integration->id],
            $error === null,
            $duration
        );
    }

    // ─── 6. Journalisation ───────────────────────────────────────────────────

    /**
     * Enregistre un événement dans integration_logs.
     *
     * @param  mixed  $payload   Données de l'événement (pour calcul du hash)
     */
    public function logEvent(
        string $connectorSlug,
        string $direction,
        string $event,
        mixed $payload,
        bool $success,
        int $durationMs = 0,
        int $httpStatus  = 0
    ): void {
        $connector = IntegrationConnector::where('slug', $connectorSlug)->first();
        if (!$connector) {
            return;
        }

        $orgId = auth()->user()?->organization_id
              ?? request()->attributes->get('organization_id');

        if (!$orgId) {
            return;
        }

        IntegrationLog::create([
            'organization_id' => $orgId,
            'connector_id'    => $connector->id,
            'direction'       => $direction,
            'event_type'      => $event,
            'payload_hash'    => hash('sha256', json_encode($payload)),
            'status'          => $success ? 'success' : 'error',
            'duration_ms'     => $durationMs ?: null,
            'http_status'     => $httpStatus ?: null,
        ]);
    }

    // ─── 7. Statistiques ─────────────────────────────────────────────────────

    /**
     * Retourne les statistiques d'utilisation d'une intégration.
     *
     * @return array{total_events: int, success_rate: float, avg_latency_ms: float,
     *               events_today: int, last_error: string|null, events_by_day: array}
     */
    public function getIntegrationStats(OrganizationIntegration $integration): array
    {
        $logs = IntegrationLog::where('organization_id', $integration->organization_id)
            ->where('connector_id', $integration->connector_id)
            ->where('created_at', '>=', now()->subDays(30));

        $total   = (clone $logs)->count();
        $success = (clone $logs)->where('status', 'success')->count();
        $today   = (clone $logs)->whereDate('created_at', today())->count();
        $avgMs   = (clone $logs)->whereNotNull('duration_ms')->avg('duration_ms') ?? 0;

        $lastError = IntegrationLog::where('organization_id', $integration->organization_id)
            ->where('connector_id', $integration->connector_id)
            ->where('status', 'error')
            ->latest()
            ->value('error_detail');

        // Événements par jour (30 derniers jours)
        $byDay = IntegrationLog::where('organization_id', $integration->organization_id)
            ->where('connector_id', $integration->connector_id)
            ->where('created_at', '>=', now()->subDays(30))
            ->selectRaw("DATE(created_at) as day, COUNT(*) as total, SUM(status='success') as success_count")
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($r) => [
                'day'     => $r->day,
                'total'   => $r->total,
                'success' => $r->success_count,
            ])
            ->toArray();

        return [
            'total_events'   => $total,
            'success_rate'   => $total > 0 ? round($success / $total * 100, 1) : 100.0,
            'avg_latency_ms' => round($avgMs, 0),
            'events_today'   => $today,
            'last_error'     => $lastError,
            'events_by_day'  => $byDay,
        ];
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Déchiffre la configuration stockée en base.
     */
    public function decryptConfig(array $encryptedConfig): array
    {
        $config = [];
        foreach ($encryptedConfig as $key => $value) {
            try {
                $config[$key] = Crypt::decryptString($value);
            } catch (\Throwable) {
                $config[$key] = $value; // Déjà en clair (migration legacy)
            }
        }
        return $config;
    }
}
