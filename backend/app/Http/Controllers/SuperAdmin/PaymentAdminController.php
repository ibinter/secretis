<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentMethodConfig;
use App\Models\PaymentProof;
use App\Models\PaymentWebhookLog;
use App\Models\Voucher;
use App\Services\AuditService;
use App\Services\Payment\ManualPaymentService;
use App\Services\Payment\PaymentService;
use App\Services\Payment\VoucherService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * PaymentAdminController — Administration des paiements (SuperAdmin IBIG Soft)
 *
 * SÉCURITÉ :
 * - Toutes les routes nécessitent le rôle superadmin_ibig (ibig.admin middleware)
 * - Chaque action administrative est journalisée dans audit_logs
 * - forceActivate() nécessite une double confirmation (motif obligatoire)
 * - Les clés de config sont chiffrées via encrypt() avant stockage
 * - Jamais de clés secrètes exposées dans les réponses JSON
 */
class PaymentAdminController extends Controller
{
    public function __construct(
        private ManualPaymentService $manualPaymentService,
        private PaymentService       $paymentService,
        private VoucherService       $voucherService,
        private AuditService         $auditService,
    ) {}

    // =========================================================================
    // Dashboard KPIs
    // =========================================================================

    /**
     * GET /api/admin/payments/kpis
     * Données du dashboard paiements SuperAdmin.
     */
    public function kpis(): JsonResponse
    {
        $now   = Carbon::now();
        $month = $now->copy()->startOfMonth();

        return response()->json([
            'revenue_this_month'    => Order::where('status', 'paid')
                                           ->where('paid_at', '>=', $month)
                                           ->sum('amount'),
            'orders_pending'        => Order::whereIn('status', ['pending', 'awaiting_proof'])->count(),
            'proofs_pending'        => PaymentProof::where('status', 'pending')->count(),
            'webhooks_with_errors'  => PaymentWebhookLog::whereNotNull('error_message')
                                                        ->where('created_at', '>=', $now->copy()->subDays(7))
                                                        ->count(),
            'vouchers_active'       => Voucher::valid()->count(),
            'revenue_currency'      => 'XOF',
        ]);
    }

    // =========================================================================
    // Commandes
    // =========================================================================

    /**
     * GET /api/admin/payments/orders
     */
    public function orders(Request $request): JsonResponse
    {
        $query = Order::with(['organization:id,name,email,country', 'user:id,name,email'])
                      ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('plan_code')) {
            $query->where('plan_code', $request->plan_code);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('reference', 'like', '%' . $request->search . '%')
                  ->orWhereHas('organization', fn ($q2) => $q2->where('name', 'like', '%' . $request->search . '%'));
            });
        }

        $orders = $query->paginate(25);

        return response()->json([
            'data' => $orders->map(fn (Order $o) => [
                'id'              => $o->id,
                'reference'       => $o->reference,
                'organization'    => $o->organization?->only(['id', 'name', 'email', 'country']),
                'plan_code'       => $o->plan_code,
                'period'          => $o->period,
                'amount'          => $o->amount,
                'currency'        => $o->currency,
                'status'          => $o->status,
                'payment_type'    => $o->payment_method_type,
                'payment_provider' => $o->payment_method_provider,
                'created_at'      => $o->created_at->toIso8601String(),
                'paid_at'         => $o->paid_at?->toIso8601String(),
                'expires_at'      => $o->expires_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'total'        => $orders->total(),
            ],
        ]);
    }

    // =========================================================================
    // Preuves de paiement
    // =========================================================================

    /**
     * GET /api/admin/payments/proofs
     * Liste des preuves en attente de validation.
     */
    public function proofs(Request $request): JsonResponse
    {
        $status = $request->get('status', 'pending');
        $proofs = PaymentProof::where('status', $status)
                              ->with([
                                  'order:id,reference,plan_code,amount,currency,organization_id',
                                  'order.organization:id,name,email',
                                  'user:id,name,email',
                              ])
                              ->latest()
                              ->paginate(20);

        return response()->json([
            'data' => $proofs->map(fn (PaymentProof $p) => [
                'id'                    => $p->id,
                'order_reference'       => $p->order->reference,
                'plan_code'             => $p->order->plan_code,
                'amount'                => $p->order->amount,
                'currency'              => $p->order->currency,
                'organization_name'     => $p->order->organization->name,
                'organization_email'    => $p->order->organization->email,
                'submitted_by'          => $p->user->name,
                'transaction_reference' => $p->transaction_reference,
                'notes'                 => $p->notes,
                'mime_type'             => $p->mime_type,
                'file_size'             => $p->getHumanFileSize(),
                'status'                => $p->status,
                'rejection_reason'      => $p->rejection_reason,
                'created_at'            => $p->created_at->toIso8601String(),
                // URL de téléchargement sécurisée (jamais le path direct)
                'download_url'          => route('admin.proofs.download', $p->id),
            ]),
            'meta' => [
                'current_page' => $proofs->currentPage(),
                'last_page'    => $proofs->lastPage(),
                'total'        => $proofs->total(),
            ],
        ]);
    }

    /**
     * POST /api/admin/payments/proofs/{id}/approve
     */
    public function approveProof(Request $request, int $id): JsonResponse
    {
        $proof = PaymentProof::findOrFail($id);

        $this->manualPaymentService->approveProof($proof, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Preuve #{$id} approuvée. Licence activée pour {$proof->order->organization->name}.",
        ]);
    }

    /**
     * POST /api/admin/payments/proofs/{id}/reject
     * Body : { reason: "..." }
     */
    public function rejectProof(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $proof = PaymentProof::findOrFail($id);

        $this->manualPaymentService->rejectProof($proof, $request->user(), $request->reason);

        return response()->json([
            'success' => true,
            'message' => "Preuve #{$id} rejetée. Le client a été notifié.",
        ]);
    }

    /**
     * GET /api/admin/payments/proofs/{id}/download
     * Stream sécurisé de la preuve de paiement (admin uniquement).
     */
    public function downloadProof(int $id): StreamedResponse|JsonResponse
    {
        $proof = PaymentProof::findOrFail($id);

        if (! Storage::disk('private')->exists($proof->file_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return Storage::disk('private')->download(
            $proof->file_path,
            "proof_{$proof->id}_{$proof->original_filename}",
            ['Content-Type' => $proof->mime_type]
        );
    }

    // =========================================================================
    // Configuration des moyens de paiement
    // =========================================================================

    /**
     * GET /api/admin/payments/config
     * SÉCURITÉ : les clés secrètes sont masquées (remplacées par "***")
     */
    public function config(): JsonResponse
    {
        $methods = PaymentMethodConfig::orderBy('order')->get()->map(fn ($m) => [
            'id'           => $m->id,
            'type'         => $m->type,
            'provider'     => $m->provider,
            'display_name' => $m->display_name,
            'description'  => $m->description,
            'is_active'    => $m->is_active,
            'is_test_mode' => $m->is_test_mode,
            'countries'    => $m->countries,
            'plans'        => $m->plans,
            'currencies'   => $m->currencies,
            'order'        => $m->order,
            'icon'         => $m->icon,
            // Config avec clés secrètes masquées pour l'affichage
            'config'       => $this->maskSecretKeys($m->config ?? []),
        ]);

        return response()->json(['methods' => $methods]);
    }

    /**
     * PUT /api/admin/payments/config/{id}
     * SÉCURITÉ : les clés sont chiffrées avant stockage (via encrypt())
     */
    public function updateConfig(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'is_active'    => ['sometimes', 'boolean'],
            'is_test_mode' => ['sometimes', 'boolean'],
            'countries'    => ['sometimes', 'nullable', 'array'],
            'plans'        => ['sometimes', 'nullable', 'array'],
            'currencies'   => ['sometimes', 'nullable', 'array'],
            'order'        => ['sometimes', 'integer'],
            'config'       => ['sometimes', 'nullable', 'array'],
        ]);

        $method = PaymentMethodConfig::findOrFail($id);

        // Ne pas écraser les clés existantes si elles sont masquées ("***")
        if (isset($validated['config'])) {
            $existingConfig = $method->config ?? [];
            $newConfig      = [];

            foreach ($validated['config'] as $key => $value) {
                $newConfig[$key] = ($value === '***')
                    ? ($existingConfig[$key] ?? null) // garder l'ancienne valeur
                    : $value;
            }
            $validated['config'] = $newConfig;
        }

        $method->update($validated);

        $this->auditService->log(
            action:       'payment_method_config_updated',
            module:       'billing',
            resourceType: 'payment_method_config',
            resourceId:   $id,
            newValues:    array_diff_key($validated, ['config' => null]), // ne pas logger les clés
            userId:       $request->user()->id,
        );

        return response()->json(['success' => true, 'message' => 'Configuration mise à jour.']);
    }

    // =========================================================================
    // Vouchers
    // =========================================================================

    /**
     * GET /api/admin/payments/vouchers
     */
    public function vouchers(Request $request): JsonResponse
    {
        $query = Voucher::with('creator:id,name')
                        ->latest();

        if ($request->filled('batch_name')) {
            $query->where('batch_name', $request->batch_name);
        }
        if ($request->filled('is_used')) {
            $query->where('is_used', (bool) $request->is_used);
        }

        $vouchers = $query->paginate(50);

        return response()->json([
            'data' => $vouchers->map(fn (Voucher $v) => [
                'id'          => $v->id,
                'code'        => $v->code,
                'value'       => $v->value,
                'currency'    => $v->currency,
                'batch_name'  => $v->batch_name,
                'is_used'     => $v->is_used,
                'used_at'     => $v->used_at?->toIso8601String(),
                'expires_at'  => $v->expires_at?->toIso8601String(),
                'created_by'  => $v->creator?->name,
                'created_at'  => $v->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $vouchers->currentPage(),
                'last_page'    => $vouchers->lastPage(),
                'total'        => $vouchers->total(),
            ],
        ]);
    }

    /**
     * POST /api/admin/payments/vouchers/generate
     */
    public function generateVouchers(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'batch_name' => ['required', 'string', 'max:64'],
            'quantity'   => ['required', 'integer', 'min:1', 'max:10000'],
            'value'      => ['required', 'numeric', 'min:1'],
            'currency'   => ['required', 'in:XOF,EUR,USD'],
            'expires_at' => ['sometimes', 'nullable', 'date', 'after:today'],
        ]);

        $vouchers = $this->voucherService->generateBatch(
            batchName: $validated['batch_name'],
            quantity:  $validated['quantity'],
            value:     (float) $validated['value'],
            currency:  $validated['currency'],
            expiresAt: isset($validated['expires_at']) ? Carbon::parse($validated['expires_at']) : null,
            creator:   $request->user(),
        );

        return response()->json([
            'success'  => true,
            'message'  => "{$vouchers->count()} vouchers générés dans le lot \"{$validated['batch_name']}\".",
            'count'    => $vouchers->count(),
            'batch'    => $validated['batch_name'],
        ], 201);
    }

    /**
     * GET /api/admin/payments/vouchers/export/{batch}
     * Export CSV du lot.
     */
    public function exportVouchers(string $batch): StreamedResponse
    {
        return $this->voucherService->exportBatchCsv($batch);
    }

    // =========================================================================
    // Journal webhooks
    // =========================================================================

    /**
     * GET /api/admin/payments/webhook-logs
     */
    public function webhookLogs(Request $request): JsonResponse
    {
        $query = PaymentWebhookLog::latest();

        if ($request->filled('provider')) {
            $query->where('provider', $request->provider);
        }
        if ($request->filled('has_error')) {
            $query->whereNotNull('error_message');
        }

        $logs = $query->paginate(50);

        return response()->json([
            'data' => $logs->map(fn (PaymentWebhookLog $l) => [
                'id'              => $l->id,
                'provider'        => $l->provider,
                'event_id'        => $l->event_id,
                'event_type'      => $l->event_type,
                'order_reference' => $l->order_reference,
                'amount_received' => $l->amount_received,
                'currency'        => $l->currency_received,
                'signature_valid' => $l->signature_valid,
                'amount_matches'  => $l->amount_matches,
                'processed'       => $l->processed,
                'error_message'   => $l->error_message,
                'processed_at'    => $l->processed_at?->toIso8601String(),
                'created_at'      => $l->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    // =========================================================================
    // Activation forcée (urgence, journalisée)
    // =========================================================================

    /**
     * POST /api/admin/payments/orders/{id}/force-activate
     * Activation manuelle forcée d'une commande — journalisée impérativement.
     *
     * Body : { reason: "Motif obligatoire..." }
     */
    public function forceActivate(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:20', 'max:2000'],
        ]);

        $order = Order::findOrFail($id);

        if ($order->status === 'paid') {
            return response()->json(['message' => 'Cette commande est déjà payée.'], 409);
        }

        $order->update(['status' => 'processing']);

        $license = $this->paymentService->activateLicense($order);

        // Log d'audit impératif (activation forcée = événement sensible)
        $this->auditService->log(
            action:         'license_force_activated',
            module:         'billing',
            resourceType:   'order',
            resourceId:     $order->id,
            newValues:      [
                'forced_by'   => $request->user()->id,
                'admin_name'  => $request->user()->name,
                'reason'      => $request->reason,
                'license_id'  => $license?->id,
                'forced_at'   => Carbon::now()->toIso8601String(),
            ],
            userId:         $request->user()->id,
            organizationId: $order->organization_id,
        );

        return response()->json([
            'success' => true,
            'message' => "Licence activée manuellement pour la commande {$order->reference}.",
        ]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Masque les clés secrètes dans la config (pour l'affichage).
     * Les champs contenant "key", "secret", "token", "password" sont remplacés par "***".
     */
    private function maskSecretKeys(array $config): array
    {
        $masked    = [];
        $secretWords = ['key', 'secret', 'token', 'password', 'hash', 'api_key', 'webhook_secret'];

        foreach ($config as $k => $v) {
            $isSecret = collect($secretWords)->contains(fn ($word) => str_contains(strtolower($k), $word));
            $masked[$k] = $isSecret ? '***' : $v;
        }

        return $masked;
    }
}
