<?php

namespace App\Http\Controllers;

use App\Models\IntegrationConnector;
use App\Models\IntegrationLog;
use App\Models\OrganizationIntegration;
use App\Services\IntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * IntegrationController — API + Inertia pour la Marketplace d'intégrations.
 *
 * Routes :
 *  GET    /integrations                    → marketplace (tous les connecteurs)
 *  GET    /integrations/installed          → connecteurs installés de l'org
 *  POST   /integrations/{connectorId}/install → installer un connecteur
 *  DELETE /integrations/{id}               → désinstaller
 *  POST   /integrations/{id}/test          → tester la connexion
 *  POST   /integrations/{id}/sync          → déclencher une sync manuelle
 *  GET    /integrations/{id}/logs          → historique des événements
 *  GET    /integrations/{id}/stats         → statistiques d'utilisation
 */
class IntegrationController extends Controller
{
    public function __construct(private readonly IntegrationService $service) {}

    // ─── GET /integrations ────────────────────────────────────────────────────

    /**
     * Affiche la marketplace avec tous les connecteurs disponibles pour le plan de l'org.
     */
    public function index(Request $request): Response
    {
        $org  = $request->user()->organization;
        $plan = $org->plan ?? 'starter';

        $connectors = $this->service->getAvailableConnectors($plan);

        // Connecteurs installés par l'organisation
        $installed = OrganizationIntegration::where('organization_id', $org->id)
            ->with('connector')
            ->get()
            ->keyBy('connector_id');

        // Enrichissement des connecteurs avec le statut d'installation
        $connectors = array_map(function ($connector) use ($installed) {
            $integration = $installed[$connector['id']] ?? null;
            return array_merge($connector, [
                'installed'    => $integration !== null,
                'install_status' => $integration?->status,
                'integration_id' => $integration?->id,
                'last_sync_at'  => $integration?->last_sync_at?->toISOString(),
            ]);
        }, $connectors);

        // Groupement par catégorie
        $byCategory = collect($connectors)->groupBy('category')->toArray();

        return Inertia::render('Integrations/Marketplace', [
            'connectors'  => $connectors,
            'byCategory'  => $byCategory,
            'plan'        => $plan,
            'activeCount' => $installed->where('status', 'active')->count(),
        ]);
    }

    // ─── GET /integrations/installed ─────────────────────────────────────────

    public function installed(Request $request): JsonResponse
    {
        $org = $request->user()->organization;

        $integrations = OrganizationIntegration::where('organization_id', $org->id)
            ->with('connector')
            ->get()
            ->map(fn ($i) => [
                'id'           => $i->id,
                'connector_id' => $i->connector_id,
                'slug'         => $i->connector->slug,
                'name'         => $i->connector->name,
                'icon_url'     => $i->connector->icon_url,
                'category'     => $i->connector->category,
                'status'       => $i->status,
                'last_sync_at' => $i->last_sync_at?->toISOString(),
                'error_message'=> $i->error_message,
            ]);

        return response()->json(['data' => $integrations]);
    }

    // ─── GET /integrations/{connectorId} ─────────────────────────────────────

    public function show(Request $request, int $connectorId): Response
    {
        $org       = $request->user()->organization;
        $connector = IntegrationConnector::findOrFail($connectorId);

        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->where('connector_id', $connectorId)
            ->first();

        $stats = $integration ? $this->service->getIntegrationStats($integration) : null;

        return Inertia::render('Integrations/ConnectorDetail', [
            'connector'   => $connector,
            'integration' => $integration ? [
                'id'            => $integration->id,
                'status'        => $integration->status,
                'last_sync_at'  => $integration->last_sync_at?->toISOString(),
                'error_message' => $integration->error_message,
            ] : null,
            'stats'       => $stats,
        ]);
    }

    // ─── POST /integrations/{connectorId}/install ─────────────────────────────

    public function install(Request $request, int $connectorId): JsonResponse
    {
        $org = $request->user()->organization;

        // Validation dynamique basée sur config_schema
        $connector = IntegrationConnector::findOrFail($connectorId);
        $fields    = $connector->config_schema['fields'] ?? [];

        $rules = [];
        foreach ($fields as $field) {
            if ($field['required'] ?? false) {
                $rules[$field['key']] = 'required|string';
            }
        }

        $validated = $rules ? $request->validate($rules) : $request->all();

        try {
            $integration = $this->service->installConnector($org, $connectorId, $validated);

            return response()->json([
                'message'     => 'Connecteur installé avec succès.',
                'integration' => [
                    'id'     => $integration->id,
                    'status' => $integration->status,
                ],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['message' => "Erreur lors de l'installation : " . $e->getMessage()], 500);
        }
    }

    // ─── DELETE /integrations/{id} ────────────────────────────────────────────

    public function uninstall(Request $request, int $id): JsonResponse
    {
        $org         = $request->user()->organization;
        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->findOrFail($id);

        $this->service->disableConnector($integration);
        $integration->delete();

        return response()->json(['message' => 'Connecteur désinstallé.']);
    }

    // ─── POST /integrations/{id}/test ─────────────────────────────────────────

    public function test(Request $request, int $id): JsonResponse
    {
        $org         = $request->user()->organization;
        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->with('connector')
            ->findOrFail($id);

        try {
            $ok      = $this->service->testConnection($integration);
            $latency = $integration->fresh()->error_message ? null : 'OK';

            return response()->json([
                'success' => $ok,
                'message' => $ok ? 'Connexion réussie !' : 'La connexion a échoué.',
                'status'  => $integration->fresh()->status,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // ─── POST /integrations/{id}/sync ─────────────────────────────────────────

    public function sync(Request $request, int $id): JsonResponse
    {
        $org         = $request->user()->organization;
        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->with('connector')
            ->findOrFail($id);

        try {
            // Dispatch en queue pour les syncs longues
            \App\Jobs\SyncConnectorJob::dispatch($integration)->onQueue('integrations');

            return response()->json([
                'message' => 'Synchronisation démarrée en arrière-plan.',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ─── GET /integrations/{id}/logs ──────────────────────────────────────────

    public function logs(Request $request, int $id): JsonResponse
    {
        $org         = $request->user()->organization;
        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->findOrFail($id);

        $logs = IntegrationLog::where('organization_id', $org->id)
            ->where('connector_id', $integration->connector_id)
            ->latest()
            ->paginate(50);

        return response()->json([
            'data' => $logs->map(fn ($log) => [
                'id'           => $log->id,
                'direction'    => $log->direction,
                'event_type'   => $log->event_type,
                'status'       => $log->status,
                'duration_ms'  => $log->duration_ms,
                'http_status'  => $log->http_status,
                'error_detail' => $log->error_detail,
                'created_at'   => $log->created_at->toISOString(),
            ]),
            'meta' => [
                'total'    => $logs->total(),
                'per_page' => $logs->perPage(),
                'page'     => $logs->currentPage(),
            ],
        ]);
    }

    // ─── GET /integrations/{id}/stats ─────────────────────────────────────────

    public function stats(Request $request, int $id): JsonResponse
    {
        $org         = $request->user()->organization;
        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->findOrFail($id);

        return response()->json($this->service->getIntegrationStats($integration));
    }

    // ─── GET /parametres/webhooks ─────────────────────────────────────────────

    public function webhooks(Request $request): Response
    {
        $org = $request->user()->organization;

        $endpoints = \App\Models\WebhookEndpoint::where('organization_id', $org->id)
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Integrations/WebhooksIn', [
            'endpoints' => $endpoints,
        ]);
    }

    public function storeWebhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url'         => ['required', 'url', 'max:500'],
            'description' => ['nullable', 'string', 'max:255'],
            'events'      => ['required', 'array', 'min:1'],
            'events.*'    => ['string'],
        ]);

        $endpoint = \App\Models\WebhookEndpoint::create([
            'organization_id' => $request->user()->organization_id,
            'url'             => $validated['url'],
            'description'     => $validated['description'] ?? null,
            'events'          => $validated['events'],
            'secret'          => \Illuminate\Support\Str::random(32),
            'is_active'       => true,
        ]);

        return response()->json(['message' => 'Endpoint créé.', 'endpoint' => $endpoint], 201);
    }

    public function destroyWebhook(Request $request, int $id): JsonResponse
    {
        $endpoint = \App\Models\WebhookEndpoint::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);
        $endpoint->delete();

        return response()->json(['message' => 'Endpoint supprimé.']);
    }

    // ─── GET /parametres/api-keys ─────────────────────────────────────────────

    public function apiKeys(Request $request): Response
    {
        return Inertia::render('Integrations/ApiKeys', [
            'organization' => $request->user()->organization?->only(['id', 'name', 'slug']),
        ]);
    }

    // ─── Alias API (voir routes/api.php) ──────────────────────────────────────

    /**
     * Alias route POST /integrations/{slug}/connect → install().
     * Résout le slug du connecteur en ID avant de déléguer.
     */
    public function connect(Request $request, string $slug): JsonResponse
    {
        $connector = IntegrationConnector::where('slug', $slug)->firstOrFail();

        return $this->install($request, $connector->id);
    }

    /**
     * Alias route DELETE /integrations/{slug}/disconnect → uninstall().
     * Résout le slug en intégration installée de l'organisation avant de déléguer.
     */
    public function disconnect(Request $request, string $slug): JsonResponse
    {
        $org         = $request->user()->organization;
        $connector   = IntegrationConnector::where('slug', $slug)->firstOrFail();
        $integration = OrganizationIntegration::where('organization_id', $org->id)
            ->where('connector_id', $connector->id)
            ->firstOrFail();

        return $this->uninstall($request, $integration->id);
    }

    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
