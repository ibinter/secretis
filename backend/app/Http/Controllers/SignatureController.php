<?php

namespace App\Http\Controllers;

use App\Models\SignatureRequest;
use App\Models\SignatureRequestSigner;
use App\Services\SignatureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * SignatureController — Gestion des signatures électroniques
 *
 * Routes authentifiées (API JSON) + routes publiques (page de signature sans compte).
 */
class SignatureController extends Controller
{
    public function __construct(private SignatureService $signatureService) {}

    // =========================================================================
    // ROUTES AUTHENTIFIÉES
    // =========================================================================

    /**
     * POST /signatures/requests
     * Créer une nouvelle demande de signature.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'document_id'   => 'required|integer',
            'title'         => 'required|string|max:255',
            'message'       => 'nullable|string|max:2000',
            'signing_order' => 'in:parallel,sequential',
            'expires_at'    => 'nullable|date|after:now',
            'signers'       => 'required|array|min:1',
            'signers.*.name'    => 'required|string|max:100',
            'signers.*.email'   => 'required|email',
            'signers.*.order'   => 'integer|min:1',
            'signers.*.user_id' => 'nullable|integer|exists:users,id',
        ]);

        $signatureRequest = $this->signatureService->createSignatureRequest(
            $validated,
            $request->user()->organization_id
        );

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Demande de signature créée et invitations envoyées.',
                'data'    => $signatureRequest->load('signers'),
            ], 201);
        }

        return redirect()
            ->route('signatures.requests.show', $signatureRequest->id)
            ->with('success', 'Demande de signature créée et invitations envoyées.');
    }

    /**
     * GET /signatures/requests
     * Liste des demandes de l'organisation avec filtres.
     */
    public function index(Request $request): JsonResponse|InertiaResponse
    {
        $orgId  = $request->user()->organization_id;
        $userId = $request->user()->id;
        $filter = $request->query('filter', 'all'); // all | mine | pending_my_signature

        $query = SignatureRequest::where('organization_id', $orgId)
            ->with(['signers', 'document:id,title,file_name', 'creator:id,name'])
            ->orderByDesc('created_at');

        if ($filter === 'mine') {
            $query->where('created_by', $userId);
        } elseif ($filter === 'pending_my_signature') {
            $query->whereHas('signers', function ($q) use ($userId) {
                $q->where('user_id', $userId)->where('status', 'pending');
            });
        }

        $requests = $query->paginate(20)->withQueryString();

        // Le module est consommé par deux clients : l'API JSON (`api/v1/...`)
        // et le front Inertia. Une requête Inertia n'est PAS `expectsJson()`
        // (elle annonce `Accept: text/html`), ce qui rend le test fiable.
        if ($request->expectsJson()) {
            return response()->json($requests);
        }

        return Inertia::render('Signatures/Index', [
            'requests' => $requests,
            'filter'   => $filter,
        ]);
    }

    /**
     * GET /signatures/requests/create
     * Formulaire de nouvelle demande.
     */
    public function create(Request $request): InertiaResponse
    {
        $orgId = $request->user()->organization_id;

        return Inertia::render('Signatures/RequestForm', [
            'documents' => \App\Models\Document::where('organization_id', $orgId)
                ->orderByDesc('created_at')
                ->limit(200)
                ->get(['id', 'title', 'file_name', 'created_at']),
            'users' => \App\Models\User::where('organization_id', $orgId)
                ->where('id', '!=', $request->user()->id)
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
            'preselectedDocumentId' => $request->integer('document_id') ?: null,
        ]);
    }

    /**
     * GET /signatures/requests/{id}
     * Détail d'une demande avec statut des signataires.
     */
    public function show(Request $request, int $id): JsonResponse|InertiaResponse
    {
        $orgId = $request->user()->organization_id;

        $signatureRequest = SignatureRequest::where('organization_id', $orgId)
            ->with(['signers', 'document:id,title,file_name', 'auditTrail', 'creator:id,name'])
            ->findOrFail($id);

        if ($request->expectsJson()) {
            return response()->json(['data' => $signatureRequest]);
        }

        return Inertia::render('Signatures/Show', [
            'request' => $signatureRequest,
        ]);
    }

    /**
     * DELETE /signatures/requests/{id}/cancel
     * Annuler une demande.
     */
    public function cancel(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $orgId = $request->user()->organization_id;

        $signatureRequest = SignatureRequest::where('organization_id', $orgId)
            ->where('created_by', $request->user()->id)
            ->whereIn('status', ['pending', 'partially_signed'])
            ->findOrFail($id);

        $this->signatureService->cancelRequest($signatureRequest);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Demande annulée.']);
        }

        return back()->with('success', 'Demande de signature annulée.');
    }

    /**
     * POST /signatures/requests/{id}/remind
     * Envoyer des rappels aux signataires en attente.
     */
    public function remind(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $orgId = $request->user()->organization_id;

        $signatureRequest = SignatureRequest::where('organization_id', $orgId)
            ->whereIn('status', ['pending', 'partially_signed'])
            ->findOrFail($id);

        $this->signatureService->sendReminder($signatureRequest);

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Rappels envoyés.']);
        }

        return back()->with('success', 'Rappels envoyés aux signataires en attente.');
    }

    /**
     * GET /signatures/{id}/certificate
     * Télécharger le certificat de signature PDF.
     */
    public function downloadCertificate(Request $request, int $id): mixed
    {
        $orgId = $request->user()->organization_id;

        $signatureRequest = SignatureRequest::where('organization_id', $orgId)
            ->where('status', 'completed')
            ->findOrFail($id);

        $path = $this->signatureService->generateCertificate($signatureRequest);

        return Storage::disk('local')->download(
            $path,
            "certificat_signature_{$id}.pdf"
        );
    }

    /**
     * GET /signatures/verify/{hash}
     * Vérifier l'intégrité d'un document par son hash SHA-256.
     */
    public function verify(Request $request, string $hash): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        // Rechercher dans les demandes complétées
        $auditEntry = \App\Models\SignatureAuditTrail::whereHas('request', fn($q) => $q->where('organization_id', $orgId))
            ->where('event_type', 'created')
            ->whereJsonContains('data->document_hash', $hash)
            ->with('request.signers')
            ->first();

        if (!$auditEntry) {
            return response()->json([
                'verified'  => false,
                'message'   => 'Aucun document correspondant à ce hash n\'a été trouvé.',
            ]);
        }

        return response()->json([
            'verified'  => true,
            'request'   => $auditEntry->request->only(['id', 'title', 'status', 'completed_at']),
            'signers'   => $auditEntry->request->signers->map->only(['name', 'email', 'status', 'signed_at']),
            'message'   => 'Document vérifié avec succès.',
        ]);
    }

    // =========================================================================
    // ROUTES PUBLIQUES (sans authentification)
    // =========================================================================

    /**
     * GET /signatures/sign/{token}
     * Page de signature publique (accessible sans compte).
     */
    public function signPage(string $token): InertiaResponse|string
    {
        $signer = SignatureRequestSigner::where('token', $token)
            ->with(['request.document', 'request.signers'])
            ->first();

        if (!$signer) {
            return $this->renderSignError('Lien de signature invalide ou expiré.');
        }

        $request = $signer->request;

        if ($request->status === 'cancelled') {
            return $this->renderSignError('Cette demande de signature a été annulée.');
        }

        if ($request->expires_at && now()->isAfter($request->expires_at)) {
            return $this->renderSignError('Ce lien de signature a expiré.');
        }

        if ($signer->status !== 'pending') {
            return $this->renderSignError(
                $signer->status === 'signed'
                    ? 'Vous avez déjà signé ce document.'
                    : 'Ce lien de signature n\'est plus actif.'
            );
        }

        // Le disque `local` n'implémente pas `temporaryUrl()` : l'appel levait
        // une exception et la page de signature ne s'affichait jamais. Le
        // document est servi par une route dédiée, protégée par le même jeton
        // que la page elle-même.
        $documentUrl = $request->document?->file_path
            ? route('signatures.sign.document', ['token' => $token])
            : null;

        return view('signatures.sign', compact('signer', 'request', 'documentUrl'));
    }

    /**
     * GET /sign/{token}/document
     * Sert le document à signer. L'accès est porté par le jeton du signataire,
     * jamais par une session : le signataire n'a pas de compte.
     */
    public function signDocument(string $token)
    {
        $signer = SignatureRequestSigner::where('token', $token)
            ->with('request.document')
            ->firstOrFail();

        $signatureRequest = $signer->request;

        abort_if($signatureRequest->status === 'cancelled', 410, 'Demande annulée.');
        abort_if(
            $signatureRequest->expires_at && now()->isAfter($signatureRequest->expires_at),
            410,
            'Lien expiré.'
        );

        $path = $signatureRequest->document?->file_path;
        abort_if(! $path || ! Storage::disk('local')->exists($path), 404, 'Document introuvable.');

        return Storage::disk('local')->response(
            $path,
            $signatureRequest->document->file_name ?? 'document.pdf',
            ['Content-Disposition' => 'inline']
        );
    }

    /**
     * POST /signatures/sign/{token}
     * Soumettre une signature.
     */
    public function submitSignature(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'paths'          => 'required|array|min:1',
            'image_base64'   => 'required|string',
            'legal_accepted' => 'required|boolean|accepted',
        ]);

        $this->signatureService->processSignature($token, $validated);

        return response()->json(['message' => 'Signature enregistrée avec succès. Merci !']);
    }

    /**
     * POST /signatures/sign/{token}/decline
     * Refuser de signer.
     */
    public function declineSignature(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $this->signatureService->declineSignature($token, $validated['reason']);

        return response()->json(['message' => 'Vous avez refusé de signer ce document.']);
    }

    // =========================================================================
    // ALIAS API (routes api.php → méthodes réelles)
    // =========================================================================

    /**
     * GET /signatures/{id}/certificate → downloadCertificate
     */
    public function certificate(Request $request, int $id): mixed
    {
        return $this->downloadCertificate($request, $id);
    }

    /**
     * DELETE /signatures/requests/{id}
     * Supprime une demande de signature (org-scopée, réservée au créateur).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $signatureRequest = SignatureRequest::where('organization_id', $orgId)
            ->where('created_by', $request->user()->id)
            ->findOrFail($id);

        $signatureRequest->delete();

        return response()->json(['message' => 'Demande supprimée.']);
    }

    /**
     * POST /signatures/requests/{id}/send
     * Réutilise la logique de rappel (remind → sendReminder) pour (re)notifier
     * les signataires en attente.
     */
    public function send(Request $request, int $id): JsonResponse
    {
        return $this->remind($request, $id);
    }

    /**
     * GET /signatures/requests/{id}/audit-trail
     * Retourne l'historique d'audit d'une demande (org-scopée).
     */
    public function auditTrail(Request $request, int $id): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $signatureRequest = SignatureRequest::where('organization_id', $orgId)
            ->with('auditTrail')
            ->findOrFail($id);

        return response()->json(['data' => $signatureRequest->auditTrail]);
    }

    // =========================================================================
    // UTILITAIRES PRIVÉES
    // =========================================================================

    private function renderSignError(string $message): string
    {
        return view('signatures.error', compact('message'))->render();
    }
}
