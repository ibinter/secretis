<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ClientPortalController — Portail Client Externe
 *
 * Auth séparée des comptes SECRETIS — basée sur portal_clients.
 * Le client accède via portal.secretis.ibigsoft.com
 *
 * Routes (préfixe /portal) :
 *   POST /portal/login
 *   POST /portal/logout
 *   GET  /portal/dashboard
 *   GET  /portal/documents
 *   GET  /portal/documents/{id}/download
 *   GET  /portal/invoices
 *   POST /portal/invoices/{id}/pay
 *   GET  /portal/messages
 *   POST /portal/messages
 */
class ClientPortalController extends Controller
{
    // ─── Page d'accueil / login portail ──────────────────────────────────────

    public function loginPage(): Response
    {
        // Si déjà connecté, rediriger vers dashboard
        if (session('portal_client_id')) {
            return redirect()->route('portail.dashboard');
        }

        return Inertia::render('Portal/ClientLogin');
    }

    // ─── Auth portail ─────────────────────────────────────────────────────────

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $client = DB::table('portal_clients')
            ->where('email', $validated['email'])
            ->where('is_active', true)
            ->first();

        if (! $client || ! Hash::check($validated['password'], $client->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        // Met à jour last_login_at
        DB::table('portal_clients')
            ->where('id', $client->id)
            ->update(['last_login_at' => now(), 'updated_at' => now()]);

        // Génère un token JWT ou session (simplifié avec session)
        $request->session()->put('portal_client_id', $client->id);
        $request->session()->put('portal_org_id', $client->organization_id);

        return response()->json([
            'message' => 'Connexion réussie.',
            'client'  => [
                'id'      => $client->id,
                'name'    => $client->name,
                'email'   => $client->email,
                'company' => $client->company,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->forget(['portal_client_id', 'portal_org_id']);

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    public function dashboard(Request $request): Response|JsonResponse
    {
        $client = $this->currentClient($request);

        $recentDocs = DB::table('portal_shared_documents as psd')
            ->join('documents as d', 'd.id', '=', 'psd.document_id')
            ->where('psd.portal_client_id', $client->id)
            ->where(function ($q) {
                $q->whereNull('psd.expires_at')
                  ->orWhere('psd.expires_at', '>', now());
            })
            ->select('psd.id', 'psd.title', 'psd.can_download', 'psd.view_count', 'psd.created_at', 'd.mime_type')
            ->orderBy('psd.created_at', 'desc')
            ->limit(5)
            ->get();

        $pendingInvoices = DB::table('portal_invoices_access as pia')
            ->where('pia.portal_client_id', $client->id)
            ->where('pia.can_pay_online', true)
            ->count();

        $unreadMessages = DB::table('portal_messages')
            ->where('portal_client_id', $client->id)
            ->where('direction', 'from_org')
            ->where('is_read', false)
            ->count();

        $org = DB::table('organizations')->find($client->organization_id);

        if ($request->wantsJson()) {
            return response()->json([
                'client'          => $client,
                'recent_docs'     => $recentDocs,
                'pending_invoices'=> $pendingInvoices,
                'unread_messages' => $unreadMessages,
                'organization'    => $org,
            ]);
        }

        return Inertia::render('Portal/ClientDashboard', [
            'client'          => $client,
            'recent_docs'     => $recentDocs,
            'pending_invoices'=> $pendingInvoices,
            'unread_messages' => $unreadMessages,
            'organization'    => $org,
        ]);
    }

    // ─── Documents partagés ───────────────────────────────────────────────────

    public function documents(Request $request): Response|JsonResponse
    {
        $client = $this->currentClient($request);

        $documents = DB::table('portal_shared_documents as psd')
            ->join('documents as d', 'd.id', '=', 'psd.document_id')
            ->where('psd.portal_client_id', $client->id)
            ->where(function ($q) {
                $q->whereNull('psd.expires_at')
                  ->orWhere('psd.expires_at', '>', now());
            })
            ->select(
                'psd.id',
                'psd.title',
                'psd.can_download',
                'psd.can_comment',
                'psd.view_count',
                'psd.expires_at',
                'psd.created_at',
                'd.mime_type',
                'd.file_size',
                'd.file_path',
            )
            ->orderBy('psd.created_at', 'desc')
            ->paginate(20);

        if ($request->wantsJson()) {
            return response()->json($documents);
        }

        return Inertia::render('Portal/ClientDocuments', [
            'documents' => $documents,
        ]);
    }

    public function downloadDocument(Request $request, int $sharedDocId): mixed
    {
        $client = $this->currentClient($request);

        $shared = DB::table('portal_shared_documents')
            ->where('id', $sharedDocId)
            ->where('portal_client_id', $client->id)
            ->where('can_download', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->firstOrFail();

        // Incrémente le compteur de vues
        DB::table('portal_shared_documents')
            ->where('id', $sharedDocId)
            ->increment('view_count');

        $doc = DB::table('documents')->find($shared->document_id);

        if (! $doc || ! Storage::disk('private')->exists($doc->file_path)) {
            abort(404, 'Fichier introuvable.');
        }

        return Storage::disk('private')->download(
            $doc->file_path,
            $shared->title . '.' . pathinfo($doc->file_path, PATHINFO_EXTENSION)
        );
    }

    // ─── Factures ─────────────────────────────────────────────────────────────

    public function invoices(Request $request): Response|JsonResponse
    {
        $client = $this->currentClient($request);

        $invoices = DB::table('portal_invoices_access as pia')
            ->where('pia.portal_client_id', $client->id)
            ->orderBy('pia.created_at', 'desc')
            ->get();

        if ($request->wantsJson()) {
            return response()->json($invoices);
        }

        return Inertia::render('Portal/ClientInvoices', ['invoices' => $invoices]);
    }

    public function payInvoice(Request $request, int $invoiceId): JsonResponse
    {
        $client = $this->currentClient($request);

        $access = DB::table('portal_invoices_access')
            ->where('portal_client_id', $client->id)
            ->where('invoice_id', $invoiceId)
            ->where('can_pay_online', true)
            ->firstOrFail();

        $validated = $request->validate([
            'payment_method' => ['required', 'in:cinetpay,orange_money,wave'],
            'phone_number'   => ['nullable', 'string', 'max:20'],
        ]);

        // Intégration paiement (CinetPay / Orange Money / Wave)
        // → Redirection vers la page de paiement du prestataire
        // → Le prestataire notifie via webhook POST /portal/payment/callback
        $paymentUrl = $this->initiatePayment($client, $invoiceId, $validated);

        return response()->json([
            'message'     => 'Redirection vers le paiement.',
            'payment_url' => $paymentUrl,
        ]);
    }

    // ─── Messages ─────────────────────────────────────────────────────────────

    public function messages(Request $request): Response|JsonResponse
    {
        $client = $this->currentClient($request);

        $messages = DB::table('portal_messages')
            ->where('portal_client_id', $client->id)
            ->orderBy('created_at', 'asc')
            ->get();

        // Marque les messages de l'organisation comme lus
        DB::table('portal_messages')
            ->where('portal_client_id', $client->id)
            ->where('direction', 'from_org')
            ->where('is_read', false)
            ->update(['is_read' => true, 'updated_at' => now()]);

        if ($request->wantsJson()) {
            return response()->json($messages);
        }

        return Inertia::render('Portal/ClientMessages', ['messages' => $messages]);
    }

    public function sendMessage(Request $request): JsonResponse
    {
        $client = $this->currentClient($request);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body'    => ['required', 'string', 'max:5000'],
        ]);

        $messageId = DB::table('portal_messages')->insertGetId([
            'organization_id'  => $client->organization_id,
            'portal_client_id' => $client->id,
            'direction'        => 'from_client',
            'subject'          => $validated['subject'],
            'body'             => $validated['body'],
            'is_read'          => false,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        return response()->json([
            'message'        => 'Message envoyé.',
            'portal_message' => DB::table('portal_messages')->find($messageId),
        ], 201);
    }

    // ─── Mot de passe oublié ──────────────────────────────────────────────────

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $client = DB::table('portal_clients')
            ->where('email', $request->email)
            ->where('is_active', true)
            ->first();

        if (! $client) {
            // On ne révèle pas si l'email existe ou non
            return response()->json(['message' => 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.']);
        }

        $token = \Illuminate\Support\Str::random(64);

        DB::table('password_reset_tokens')->upsert([
            'email'      => $client->email,
            'token'      => Hash::make($token),
            'created_at' => now(),
        ], ['email']);

        // TODO: Envoyer l'email avec le token
        // Mail::to($client->email)->send(new PortalPasswordReset($token));

        return response()->json(['message' => 'Si cet email est enregistré, vous recevrez un lien de réinitialisation.']);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function currentClient(Request $request): object
    {
        $clientId = $request->session()->get('portal_client_id');

        if (! $clientId) {
            abort(401, 'Non authentifié sur le portail client.');
        }

        return DB::table('portal_clients')
            ->where('id', $clientId)
            ->where('is_active', true)
            ->firstOrFail();
    }

    private function initiatePayment(object $client, int $invoiceId, array $data): string
    {
        // Placeholder — à implémenter avec CinetPay SDK ou Orange Money API
        // Retourne l'URL de paiement
        return config('app.url') . '/portal/payment/pending/' . $invoiceId;
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
