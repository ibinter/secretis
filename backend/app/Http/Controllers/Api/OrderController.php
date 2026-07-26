<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Services\Payment\ManualPaymentService;
use App\Services\Payment\PaymentService;
use App\Services\Payment\VoucherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * OrderController — Endpoints API commandes et paiements (espace client authentifié)
 *
 * SÉCURITÉ :
 * - Toutes les routes nécessitent auth:sanctum + tenant middleware
 * - Les montants sont calculés CÔTÉ SERVEUR (jamais depuis le client)
 * - L'activation de licence n'a JAMAIS lieu depuis ces routes
 *   (uniquement via webhook ou approbation admin)
 * - Les preuves sont streamées (jamais d'URL publique directe)
 * - Mention légale obligatoire : "Nous ne vous demanderons jamais votre code secret ou mot de passe"
 */
class OrderController extends Controller
{
    public function __construct(
        private PaymentService       $paymentService,
        private ManualPaymentService $manualPaymentService,
        private VoucherService       $voucherService,
    ) {}

    // =========================================================================
    // Création de commande
    // =========================================================================

    /**
     * POST /api/v1/orders
     *
     * SÉCURITÉ : le montant est calculé depuis la base (Plan),
     * JAMAIS depuis les paramètres fournis par le client.
     */
    public function createOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_code'               => ['required', 'string', 'exists:plans,slug'],
            'period'                  => ['required', 'in:monthly,quarterly,biannual,yearly'],
            'payment_method_type'     => ['required', 'string', 'in:mobile_money,electronic,bank_transfer,international_transfer,money_transfer,cash_agency,check,crypto,voucher,delivery,additional'],
            'payment_method_provider' => ['sometimes', 'nullable', 'string', 'max:64'],
            'currency'                => ['sometimes', 'in:XOF,EUR,USD'],
            'coupon_code'             => ['sometimes', 'nullable', 'string', 'max:32'],
            'is_renewal'              => ['sometimes', 'boolean'],
        ]);

        $org  = $request->user()->organization;
        $user = $request->user();

        $order = $this->paymentService->createOrder($org, $user, $validated);

        // Config publique du moyen de paiement (sans clés secrètes)
        $paymentMethods = $this->paymentService->getAvailablePaymentMethods($org, $validated['plan_code']);
        $selectedMethod = $paymentMethods->firstWhere('provider', $validated['payment_method_provider'] ?? null)
                       ?? $paymentMethods->firstWhere('type', $validated['payment_method_type']);

        return response()->json([
            'success'         => true,
            'order'           => [
                'id'            => $order->id,
                'reference'     => $order->reference,
                'plan_code'     => $order->plan_code,
                'period'        => $order->period,
                'amount'        => $order->amount,
                'discount'      => $order->discount_amount,
                'net_amount'    => $order->getNetAmount(),
                'currency'      => $order->currency,
                'status'        => $order->status,
                'expires_at'    => $order->expires_at?->toIso8601String(),
                'requires_proof' => $order->requiresProof(),
                'is_electronic' => $order->isElectronic(),
            ],
            // Config publique uniquement (pas de clés secrètes)
            'payment_config'  => $selectedMethod ? $selectedMethod['config'] : null,
            // MENTION LÉGALE OBLIGATOIRE (règle 8)
            'security_notice' => 'Nous ne vous demanderons jamais votre code secret ou mot de passe.',
        ], 201);
    }

    // =========================================================================
    // Détail d'une commande
    // =========================================================================

    /**
     * GET /api/v1/orders/{ref}
     */
    public function showOrder(Request $request, string $reference): JsonResponse
    {
        $order = Order::where('reference', $reference)
                      ->where('organization_id', $request->user()->organization_id)
                      ->with(['proofs' => fn ($q) => $q->select(['id', 'order_id', 'status', 'created_at', 'rejection_reason'])])
                      ->firstOrFail();

        return response()->json([
            'order' => [
                'id'            => $order->id,
                'reference'     => $order->reference,
                'plan_code'     => $order->plan_code,
                'period'        => $order->period,
                'quantity_months' => $order->quantity_months,
                'amount'        => $order->amount,
                'discount'      => $order->discount_amount,
                'net_amount'    => $order->getNetAmount(),
                'currency'      => $order->currency,
                'status'        => $order->status,
                'is_renewal'    => $order->is_renewal,
                'expires_at'    => $order->expires_at?->toIso8601String(),
                'paid_at'       => $order->paid_at?->toIso8601String(),
                'proofs'        => $order->proofs->map(fn ($p) => [
                    'id'               => $p->id,
                    'status'           => $p->status,
                    'created_at'       => $p->created_at->toIso8601String(),
                    'rejection_reason' => $p->rejection_reason,
                ]),
            ],
        ]);
    }

    // =========================================================================
    // Moyens de paiement disponibles
    // =========================================================================

    /**
     * GET /api/v1/payment-methods?plan_code=pro
     * SÉCURITÉ : retourne uniquement la config publique (pas de clés secrètes)
     */
    public function getPaymentMethods(Request $request): JsonResponse
    {
        $request->validate([
            'plan_code' => ['required', 'string', 'exists:plans,slug'],
        ]);

        $org     = $request->user()->organization;
        $methods = $this->paymentService->getAvailablePaymentMethods($org, $request->plan_code);

        return response()->json([
            'methods' => $methods,
            // MENTION LÉGALE (règle 8)
            'security_notice' => 'Nous ne vous demanderons jamais votre code secret ou mot de passe.',
        ]);
    }

    // =========================================================================
    // Upload de preuve
    // =========================================================================

    /**
     * POST /api/v1/orders/{ref}/proof
     *
     * SÉCURITÉ :
     * - Validation MIME côté serveur (whitelist stricte)
     * - Stockage dans storage/app/private (jamais /public)
     * - SHA-256 pour détecter les doublons
     * - Refus des fichiers exécutables
     */
    public function submitProof(Request $request, string $reference): JsonResponse
    {
        $request->validate([
            'file'              => ['required', 'file', 'max:5120'], // 5MB max
            'transaction_ref'   => ['sometimes', 'nullable', 'string', 'max:128'],
            'notes'             => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $order = Order::where('reference', $reference)
                      ->where('organization_id', $request->user()->organization_id)
                      ->whereIn('status', ['pending', 'awaiting_proof'])
                      ->firstOrFail();

        $proof = $this->manualPaymentService->submitProof(
            order:          $order,
            user:           $request->user(),
            file:           $request->file('file'),
            transactionRef: $request->input('transaction_ref'),
            notes:          $request->input('notes'),
        );

        return response()->json([
            'success'    => true,
            'proof_id'   => $proof->id,
            'message'    => 'Preuve de paiement soumise. Elle sera vérifiée sous 24h ouvrables.',
            'order_status' => $order->fresh()->status,
        ]);
    }

    // =========================================================================
    // Téléchargement de preuve (client — sa propre preuve uniquement)
    // =========================================================================

    /**
     * GET /api/v1/proofs/{id}/download
     * SÉCURITÉ : stream privé, vérification ownership
     */
    public function downloadProof(Request $request, int $proofId): StreamedResponse|JsonResponse
    {
        $proof = PaymentProof::where('id', $proofId)
                             ->where('user_id', $request->user()->id)
                             ->firstOrFail();

        if (! Storage::disk('private')->exists($proof->file_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return Storage::disk('private')->download(
            $proof->file_path,
            $proof->original_filename,
            ['Content-Type' => $proof->mime_type]
        );
    }

    // =========================================================================
    // Rédemption voucher
    // =========================================================================

    /**
     * POST /api/v1/orders/{ref}/voucher
     * Body : { code: "XXXX-XXXX-XXXX-XXXX" }
     */
    public function redeemVoucher(Request $request, string $reference): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'regex:/^[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}$/'],
        ]);

        $order = Order::where('reference', $reference)
                      ->where('organization_id', $request->user()->organization_id)
                      ->where('payment_method_type', 'voucher')
                      ->whereIn('status', ['pending'])
                      ->firstOrFail();

        $voucher = $this->voucherService->redeem(
            code:  $request->input('code'),
            order: $order,
            user:  $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Voucher valide. Votre licence a été activée.',
            'voucher' => [
                'code'  => $voucher->code,
                'value' => $voucher->value,
            ],
        ]);
    }

    // =========================================================================
    // Annulation de commande
    // =========================================================================

    /**
     * DELETE /api/v1/orders/{ref}
     * Annule une commande non encore payée.
     */
    public function cancelOrder(Request $request, string $reference): JsonResponse
    {
        $order = Order::where('reference', $reference)
                      ->where('organization_id', $request->user()->organization_id)
                      ->whereIn('status', ['pending', 'awaiting_proof'])
                      ->firstOrFail();

        $order->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'message' => 'Commande annulée.',
        ]);
    }
}
