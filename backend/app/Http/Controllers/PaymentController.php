<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Plan;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PaymentController — Endpoints API paiements
 *
 * SÉCURITÉ :
 * - Toutes les routes sont protégées par auth + tenant middleware
 * - L'upload de preuve se fait vers un disk "private" (jamais /public)
 * - Le téléchargement de facture génère une réponse streamée authentifiée
 * - La validation admin est réservée au rôle ibig_admin (vérifié via Gate)
 */
class PaymentController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    // =========================================================================
    // Initiation de paiement
    // =========================================================================

    /**
     * Initie une tentative de paiement pour un plan.
     *
     * POST /api/payments/initiate
     * Body : { plan_slug, method, currency?, duration_months? }
     *
     * ANTI-DOUBLON : Si une intention est déjà en attente dans les 24h,
     * elle est retournée sans en créer une nouvelle.
     */
    public function initiatePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_slug'       => ['required', 'string', 'exists:plans,slug'],
            'method'          => ['required', 'in:mobile_money,bank_transfer,card,cash'],
            'currency'        => ['sometimes', 'string', 'in:XOF,EUR,USD'],
            'duration_months' => ['sometimes', 'integer', 'min:1', 'max:24'],
        ]);

        $org  = $request->user()->organization;
        $plan = Plan::where('slug', $validated['plan_slug'])->active()->firstOrFail();

        $payment = $this->paymentService->createPaymentIntent(
            org:            $org,
            plan:           $plan,
            method:         $validated['method'],
            currency:       $validated['currency']        ?? 'XOF',
            durationMonths: $validated['duration_months'] ?? 1,
        );

        return response()->json([
            'success'         => true,
            'payment_id'      => $payment->id,
            'idempotency_key' => $payment->idempotency_key,
            'amount'          => $payment->amount,
            'currency'        => $payment->currency,
            'method'          => $payment->method,
            'status'          => $payment->status,
            'instructions'    => $this->getPaymentInstructions($payment->method, $payment->currency),
        ], 201);
    }

    // =========================================================================
    // Upload preuve de paiement
    // =========================================================================

    /**
     * Upload la preuve de paiement (reçu Mobile Money / virement).
     *
     * POST /api/payments/{id}/proof
     *
     * SÉCURITÉ :
     * - Fichier stocké dans storage/app/private (jamais /public)
     * - Validation stricte du type MIME (PDF, JPEG, PNG uniquement)
     * - Taille limitée à 5MB
     * - Nom de fichier généré par le système (pas de nom client)
     */
    public function uploadProof(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'proof' => [
                'required',
                'file',
                'mimes:pdf,jpeg,jpg,png',
                'max:5120', // 5MB max
            ],
        ]);

        $payment = Payment::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->where('status', 'pending')
            ->firstOrFail();

        $file = $request->file('proof');

        // SÉCURITÉ : Nom de fichier généré côté serveur — jamais le nom original
        $extension = $file->getClientOriginalExtension();
        $filename  = "proof_{$payment->idempotency_key}.{$extension}";
        $path      = "proofs/{$payment->organization_id}/{$filename}";

        // Stockage dans le disk privé (storage/app/private)
        Storage::disk('private')->put($path, file_get_contents($file->getRealPath()));

        $payment->update(['proof_path' => $path]);

        return response()->json([
            'success' => true,
            'message' => 'Preuve de paiement uploadée. En attente de validation.',
        ]);
    }

    // =========================================================================
    // Statut d'un paiement (polling client)
    // =========================================================================

    /**
     * Retourne le statut courant d'un paiement (pour le polling).
     *
     * GET /api/payments/{id}/status
     */
    public function getStatus(Request $request, int $id): JsonResponse
    {
        $payment = Payment::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->firstOrFail();

        return response()->json([
            'id'             => $payment->id,
            'status'         => $payment->status,
            'paid_at'        => $payment->paid_at?->toIso8601String(),
            'invoice_number' => $payment->invoice_number,
            'has_invoice'    => $payment->hasInvoice(),
            'rejection_reason' => $payment->rejection_reason,
        ]);
    }

    // =========================================================================
    // Validation/Rejet admin
    // =========================================================================

    /**
     * Valide manuellement un paiement (réservé IBIG admin).
     *
     * POST /api/admin/payments/{id}/validate
     */
    public function adminValidate(Request $request, int $id): JsonResponse
    {
        // Vérification du rôle admin IBIG (Gate défini dans AuthServiceProvider)
        Gate::authorize('ibig-admin-action');

        $payment = Payment::findOrFail($id);

        $this->paymentService->validateManualPayment($payment, $request->user());

        return response()->json([
            'success'        => true,
            'message'        => 'Paiement validé. Licence activée.',
            'invoice_number' => $payment->fresh()->invoice_number,
        ]);
    }

    /**
     * Rejette un paiement avec motif (réservé IBIG admin).
     *
     * POST /api/admin/payments/{id}/reject
     * Body : { reason }
     */
    public function adminReject(Request $request, int $id): JsonResponse
    {
        Gate::authorize('ibig-admin-action');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $payment = Payment::findOrFail($id);

        $this->paymentService->rejectManualPayment(
            $payment,
            $request->user(),
            $validated['reason']
        );

        return response()->json([
            'success' => true,
            'message' => 'Paiement rejeté. Notification envoyée au client.',
        ]);
    }

    // =========================================================================
    // Historique
    // =========================================================================

    /**
     * Historique des paiements de l'organisation courante.
     *
     * GET /api/payments/history
     */
    public function history(Request $request): JsonResponse
    {
        $payments = Payment::where('organization_id', $request->user()->organization_id)
            ->with(['validatedBy:id,name'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'data' => $payments->map(fn (Payment $p) => [
                'id'             => $p->id,
                'amount'         => $p->amount,
                'currency'       => $p->currency,
                'method'         => $p->method,
                'status'         => $p->status,
                'plan_slug'      => $p->plan_slug,
                'invoice_number' => $p->invoice_number,
                'has_invoice'    => $p->hasInvoice(),
                'paid_at'        => $p->paid_at?->toIso8601String(),
                'created_at'     => $p->created_at->toIso8601String(),
                'validated_by'   => $p->validatedBy?->name,
            ]),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page'    => $payments->lastPage(),
                'total'        => $payments->total(),
            ],
        ]);
    }

    // =========================================================================
    // Facture PDF
    // =========================================================================

    /**
     * Télécharge la facture PDF d'un paiement.
     *
     * GET /api/payments/{id}/invoice
     *
     * SÉCURITÉ : Réponse streamée avec headers "force-download".
     * Le fichier n'est jamais accessible directement via une URL publique.
     */
    public function generateInvoice(Request $request, int $id): StreamedResponse|JsonResponse
    {
        $payment = Payment::where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->where('status', 'validated')
            ->firstOrFail();

        // Générer la facture si elle n'existe pas encore
        if (! $payment->hasInvoice()) {
            $this->paymentService->generateInvoicePdf($payment);
            $payment->refresh();
        }

        if (! Storage::disk('private')->exists($payment->invoice_path)) {
            return response()->json(['message' => 'Facture non disponible.'], 404);
        }

        // Stream sécurisé avec headers appropriés
        return Storage::disk('private')->download(
            $payment->invoice_path,
            "{$payment->invoice_number}.pdf",
            ['Content-Type' => 'application/pdf']
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Retourne les instructions de paiement selon la méthode et la devise.
     * Ces instructions sont affichées au client après initiation du paiement.
     */
    private function getPaymentInstructions(string $method, string $currency): array
    {
        // §19.2 : configuration 100% en base (payment_methods_config), modifiable
        // depuis la console SuperAdmin sans toucher au code.
        $rows = \Illuminate\Support\Facades\DB::table('payment_methods_config')
            ->where('type', $method === 'card' ? 'gateway' : $method)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        $options = $rows->map(function ($row) {
            $cfg = json_decode($row->config ?? '{}', true) ?: [];
            unset($cfg['secret_key'], $cfg['api_secret']); // jamais de secret côté client
            return [
                'provider'     => $row->provider,
                'display_name' => $row->display_name,
                'description'  => $row->description,
                'config'       => $cfg,
            ];
        })->values()->all();

        $titles = [
            'mobile_money'  => 'Paiement Mobile Money',
            'bank_transfer' => 'Virement bancaire',
            'card'          => 'Paiement par carte',
            'cash'          => 'Paiement en espèces',
        ];

        return [
            'type'     => $method,
            'title'    => $titles[$method] ?? 'Paiement',
            'security' => 'Nous ne vous demanderons jamais votre code secret ou mot de passe.',
            'options'  => $options,
            'steps'    => $options !== [] ? [
                'Choisissez votre opérateur ci-dessous',
                'Envoyez le montant exact au numéro / compte indiqué',
                'Conservez le reçu ou la capture de confirmation',
                'Uploadez la preuve de paiement — validation sous 24 h ouvrées',
            ] : [
                'Contactez notre support (secretis@ibigsoft.com) pour les instructions de paiement.',
            ],
        ];
    }

    // ── Alias de compatibilité avec les noms de routes ──
    public function initiate(\Illuminate\Http\Request $request)
    {
        return $this->initiatePayment($request);
    }

    public function index(\Illuminate\Http\Request $request)
    {
        return $this->history($request);
    }

    public function show(\Illuminate\Http\Request $request, int $id)
    {
        return $this->getStatus($request, $id);
    }

    public function status(\Illuminate\Http\Request $request, int $id)
    {
        return $this->getStatus($request, $id);
    }
}
