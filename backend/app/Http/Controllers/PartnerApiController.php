<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Document;
use App\Models\Event;
use App\Models\Organization;
use App\Models\PartnerApp;
use App\Models\WebhookEndpoint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * PartnerApiController — API REST pour les applications partenaires.
 *
 * Authentification : OAuth2 Client Credentials (Bearer token)
 * Middleware       : auth:partner_api (vérifie le token + les scopes)
 * Versioning       : /partner/v1/...
 *
 * Scopes disponibles :
 *  - org:read         → GET /partner/v1/organizations
 *  - contacts:read    → GET /partner/v1/contacts
 *  - contacts:write   → POST /partner/v1/contacts
 *  - events:read      → GET /partner/v1/events
 *  - events:write     → POST /partner/v1/events
 *  - documents:read   → GET /partner/v1/documents
 *  - documents:write  → POST /partner/v1/documents
 *  - webhooks:manage  → GET|POST /partner/v1/webhooks
 */
class PartnerApiController extends Controller
{
    // ─── 1. GET /partner/v1/organizations ────────────────────────────────────

    /**
     * Retourne les informations publiques de l'organisation.
     * Scope requis : org:read
     */
    public function getOrganization(Request $request): JsonResponse
    {
        $this->requireScope($request, 'org:read');

        $org = $this->resolveOrganization($request);

        return response()->json([
            'data' => [
                'id'          => $org->id,
                'name'        => $org->name,
                'slug'        => $org->slug,
                'country'     => $org->country,
                'timezone'    => $org->timezone ?? 'Africa/Abidjan',
                'currency'    => $org->currency ?? 'XOF',
                'plan'        => $org->plan,
                'created_at'  => $org->created_at->toISOString(),
            ],
        ]);
    }

    // ─── 2. GET /partner/v1/contacts ─────────────────────────────────────────

    /**
     * Liste les contacts de l'organisation.
     * Scope requis : contacts:read
     * Paramètres : page, per_page (max 100), type (client|fournisseur|prospect), q (recherche)
     */
    public function getContacts(Request $request): JsonResponse
    {
        $this->requireScope($request, 'contacts:read');

        $org     = $this->resolveOrganization($request);
        $perPage = min((int) $request->get('per_page', 50), 100);

        $query = Contact::where('organization_id', $org->id)
            ->when($request->get('type'), fn ($q, $type) => $q->where('type', $type))
            ->when($request->get('q'), fn ($q, $search) => $q->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
            }));

        $contacts = $query->paginate($perPage);

        return response()->json([
            'data' => $contacts->map(fn ($c) => [
                'id'       => $c->id,
                'name'     => $c->name,
                'email'    => $c->email,
                'phone'    => $c->phone,
                'type'     => $c->type,
                'company'  => $c->company,
                'city'     => $c->city,
                'country'  => $c->country,
                'tax_id'   => $c->tax_id,
                'created_at' => $c->created_at->toISOString(),
                'updated_at' => $c->updated_at->toISOString(),
            ]),
            'meta' => [
                'total'        => $contacts->total(),
                'per_page'     => $contacts->perPage(),
                'current_page' => $contacts->currentPage(),
                'last_page'    => $contacts->lastPage(),
            ],
        ]);
    }

    // ─── 3. POST /partner/v1/events ──────────────────────────────────────────

    /**
     * Crée un événement dans l'agenda de l'organisation.
     * Scope requis : events:write
     */
    public function createEvent(Request $request): JsonResponse
    {
        $this->requireScope($request, 'events:write');

        $org = $this->resolveOrganization($request);

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'start_at'    => 'required|date',
            'end_at'      => 'required|date|after:start_at',
            'description' => 'nullable|string|max:5000',
            'location'    => 'nullable|string|max:255',
            'attendees'   => 'nullable|array',
            'attendees.*' => 'email',
            'all_day'     => 'boolean',
        ]);

        $event = Event::create([
            'organization_id' => $org->id,
            'title'           => $validated['title'],
            'start_at'        => $validated['start_at'],
            'end_at'          => $validated['end_at'],
            'description'     => $validated['description'] ?? null,
            'location'        => $validated['location'] ?? null,
            'all_day'         => $validated['all_day'] ?? false,
            'source'          => 'partner_api',
            'source_app_id'   => $request->attributes->get('partner_app_id'),
        ]);

        return response()->json([
            'data'    => ['id' => $event->id, 'title' => $event->title],
            'message' => 'Événement créé.',
        ], 201);
    }

    // ─── 4. POST /partner/v1/documents ───────────────────────────────────────

    /**
     * Upload un document dans la GED de l'organisation.
     * Scope requis : documents:write
     */
    public function uploadDocument(Request $request): JsonResponse
    {
        $this->requireScope($request, 'documents:write');

        $org = $this->resolveOrganization($request);

        $request->validate([
            // Whitelist stricte : empêche le dépôt de html/svg/php (XSS stocké / exécution).
            'file'        => 'required|file|max:51200|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,csv,txt,png,jpg,jpeg,gif,webp,zip', // 50MB
            'title'       => 'required|string|max:255',
            'folder_id'   => 'nullable|integer',
            'description' => 'nullable|string|max:2000',
            'tags'        => 'nullable|array',
        ]);

        $file = $request->file('file');
        // Disque PRIVÉ : les documents ne doivent jamais être servis par une URL publique non authentifiée.
        $path = $file->store("documents/{$org->id}/partner", 'private');

        $document = Document::create([
            'organization_id' => $org->id,
            'title'           => $request->input('title'),
            'description'     => $request->input('description'),
            'file_path'       => $path,
            'file_size'       => $file->getSize(),
            'mime_type'       => $file->getMimeType(),
            'original_name'   => $file->getClientOriginalName(),
            'folder_id'       => $request->input('folder_id'),
            'source'          => 'partner_api',
            'tags'            => $request->input('tags', []),
        ]);

        return response()->json([
            'data'    => [
                'id'       => $document->id,
                'title'    => $document->title,
                // Téléchargement authentifié (plus d'URL publique permanente).
                'url'      => url("/api/ged/documents/{$document->id}/download"),
                'size'     => $document->file_size,
            ],
            'message' => 'Document uploadé.',
        ], 201);
    }

    // ─── 5. GET /partner/v1/webhooks ─────────────────────────────────────────

    /**
     * Liste les webhooks configurés pour l'application partenaire.
     * Scope requis : webhooks:manage
     */
    public function getWebhooks(Request $request): JsonResponse
    {
        $this->requireScope($request, 'webhooks:manage');

        $appId    = $request->attributes->get('partner_app_id');
        $webhooks = WebhookEndpoint::where('partner_app_id', $appId)->get();

        return response()->json([
            'data' => $webhooks->map(fn ($wh) => [
                'id'          => $wh->id,
                'url'         => $wh->url,
                'events'      => $wh->events,
                'is_active'   => $wh->is_active,
                'created_at'  => $wh->created_at->toISOString(),
            ]),
        ]);
    }

    /**
     * Crée ou met à jour un webhook entrant.
     * Scope requis : webhooks:manage
     */
    public function createWebhook(Request $request): JsonResponse
    {
        $this->requireScope($request, 'webhooks:manage');

        $appId = $request->attributes->get('partner_app_id');
        $org   = $this->resolveOrganization($request);

        $validated = $request->validate([
            'url'    => 'required|url|max:500',
            'events' => 'required|array|min:1',
            'events.*' => 'string|in:contact.created,contact.updated,event.created,document.uploaded,task.completed',
        ]);

        $webhook = WebhookEndpoint::create([
            'partner_app_id'  => $appId,
            'organization_id' => $org->id,
            'url'             => $validated['url'],
            'events'          => $validated['events'],
            'secret'          => Str::random(40),
            'is_active'       => true,
        ]);

        return response()->json([
            'data'    => [
                'id'     => $webhook->id,
                'secret' => $webhook->secret, // Affiché UNE SEULE FOIS
                'url'    => $webhook->url,
            ],
            'message' => 'Webhook créé.',
        ], 201);
    }

    // ─── OAuth2 Client Credentials ────────────────────────────────────────────

    /**
     * Génère un access token (OAuth2 Client Credentials).
     * POST /partner/oauth/token
     */
    public function issueToken(Request $request): JsonResponse
    {
        $request->validate([
            'grant_type'    => 'required|in:client_credentials',
            'client_id'     => 'required|string',
            'client_secret' => 'required|string',
        ]);

        $app = PartnerApp::where('client_id', $request->input('client_id'))
            ->where('is_approved', true)
            ->first();

        if (!$app || !Hash::check($request->input('client_secret'), $app->client_secret)) {
            return response()->json(['error' => 'invalid_client'], 401);
        }

        $token = \Laravel\Sanctum\PersonalAccessToken::create([
            'name'      => 'partner_api_' . $app->id,
            'token'     => hash('sha256', $plainToken = Str::random(60)),
            'abilities' => $app->scopes ?? [],
        ]);

        // Stockage associatif token ↔ app
        \Illuminate\Support\Facades\Cache::put(
            "partner_token:{$token->id}",
            ['app_id' => $app->id, 'scopes' => $app->scopes],
            3600
        );

        return response()->json([
            'access_token' => $plainToken,
            'token_type'   => 'Bearer',
            'expires_in'   => 3600,
            'scope'        => implode(' ', $app->scopes ?? []),
        ]);
    }

    // ─── Gestion des apps partenaires (admin) ─────────────────────────────────

    public function listPartnerApps(Request $request): JsonResponse
    {
        $org  = $request->user()->organization;
        $apps = PartnerApp::where('partner_email', 'like', '%@' . ($org->domain ?? 'ibig.ci'))
            ->orWhere('is_approved', true)
            ->get();

        return response()->json(['data' => $apps->map(fn ($a) => [
            'id'          => $a->id,
            'name'        => $a->name,
            'partner_email' => $a->partner_email,
            'scopes'      => $a->scopes,
            'is_approved' => $a->is_approved,
            'callback_url'=> $a->callback_url,
            'created_at'  => $a->created_at->toISOString(),
        ])]);
    }

    public function createPartnerApp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100',
            'partner_email' => 'required|email',
            'callback_url'  => 'required|url',
            'scopes'        => 'required|array',
        ]);

        $secret    = Str::random(60);
        $clientId  = 'secretis_' . Str::uuid()->toString();

        $app = PartnerApp::create([
            'name'           => $validated['name'],
            'partner_email'  => $validated['partner_email'],
            'callback_url'   => $validated['callback_url'],
            'scopes'         => $validated['scopes'],
            'webhook_secret' => Str::random(40),
            'client_id'      => $clientId,
            'client_secret'  => Hash::make($secret),
            'is_approved'    => false,
        ]);

        return response()->json([
            'data'    => [
                'id'            => $app->id,
                'client_id'     => $clientId,
                'client_secret' => $secret, // Affiché UNE SEULE FOIS
                'webhook_secret'=> $app->webhook_secret,
            ],
            'message' => "Application créée. En attente d'approbation IBIG Soft.",
        ], 201);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function requireScope(Request $request, string $scope): void
    {
        $scopes = $request->attributes->get('partner_scopes', []);
        if (!in_array($scope, $scopes)) {
            abort(403, "Scope manquant : {$scope}");
        }
    }

    private function resolveOrganization(Request $request): Organization
    {
        $orgId = $request->attributes->get('partner_organization_id')
              ?? $request->user()?->organization_id;

        return Organization::findOrFail($orgId);
    }

    // ─── Alias API (voir routes/api.php, prefix partner/v1) ────────────────────

    /** Alias route POST /partner/v1/events → createEvent(). */
    public function storeEvent(Request $request): JsonResponse
    {
        return $this->createEvent($request);
    }

    /** Alias route GET /partner/v1/contacts → getContacts(). */
    public function contacts(Request $request): JsonResponse
    {
        return $this->getContacts($request);
    }

    /** Alias route POST /partner/v1/webhook-subscribe → createWebhook(). */
    public function subscribeWebhook(Request $request): JsonResponse
    {
        return $this->createWebhook($request);
    }
}
