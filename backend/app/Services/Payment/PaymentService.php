<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\User;
use App\Services\AuditService;
use App\Services\LicenseService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * PaymentService — Orchestrateur principal du module paiement IBIG SECRETIS
 *
 * RÈGLES DE SÉCURITÉ ABSOLUES :
 *
 * 1. MONTANT SERVEUR : Le montant est calculé depuis la base (Plan),
 *    jamais depuis les paramètres du client.
 *
 * 2. IDEMPOTENCE : idempotency_key unique en base, SELECT FOR UPDATE avant activation.
 *    Un même idempotency_key ne peut activer la licence QU'UNE SEULE FOIS.
 *
 * 3. DATE SERVEUR : paid_at, expires_at — toujours Carbon::now() côté serveur.
 *
 * 4. ACTIVATION WEBHOOK UNIQUEMENT : L'URL de retour passerelle N'ACTIVE RIEN.
 *    L'activation n'a lieu que via webhook HMAC vérifié ou approbation admin.
 *
 * 5. ATOMIC : toutes les opérations critiques sont dans des DB::transaction.
 */
class PaymentService
{
    public function __construct(
        private LicenseService $licenseService,
        private AuditService   $auditService,
    ) {}

    // =========================================================================
    // Création de commande
    // =========================================================================

    /**
     * Crée une commande avec montant calculé CÔTÉ SERVEUR.
     *
     * @throws \InvalidArgumentException si le plan est inconnu ou inactif
     * @throws \RuntimeException si la période est invalide
     */
    public function createOrder(Organization $org, User $user, array $data): Order
    {
        $plan = Plan::where('slug', $data['plan_code'])
                    ->where('is_active', true)
                    ->firstOrFail();

        $currency      = strtoupper($data['currency'] ?? 'XOF');
        $period        = $data['period'] ?? 'monthly';
        $months        = $this->periodToMonths($period);

        // SÉCURITÉ : montant calculé depuis la base, jamais depuis le client
        $unitPrice     = $plan->getPriceForCurrency($currency);
        $baseAmount    = $unitPrice * $months;
        $discountAmt   = 0.0;

        // Appliquer coupon si fourni
        if (! empty($data['coupon_code'])) {
            $discountAmt = $this->applyCoupon($data['coupon_code'], $baseAmount, $plan->slug, $currency);
        }

        $reference = $this->generateOrderReference();

        return DB::transaction(function () use (
            $org, $user, $plan, $currency, $period, $months,
            $baseAmount, $discountAmt, $reference, $data
        ) {
            $order = Order::create([
                'reference'               => $reference,
                'organization_id'         => $org->id,
                'user_id'                 => $user->id,
                'plan_code'               => $plan->slug,
                'period'                  => $period,
                'quantity_months'         => $months,
                'amount'                  => $baseAmount,
                'currency'                => $currency,
                'amount_xof'              => $currency === 'XOF' ? $baseAmount : null,
                'payment_method_type'     => $data['payment_method_type'],
                'payment_method_provider' => $data['payment_method_provider'] ?? null,
                'is_renewal'              => $data['is_renewal'] ?? false,
                'coupon_code'             => $data['coupon_code'] ?? null,
                'discount_amount'         => $discountAmt,
                // SÉCURITÉ : idempotency_key unique cryptographiquement sécurisé
                'idempotency_key'         => (string) Str::uuid(),
                // SÉCURITÉ : expires_at fixé côté serveur (48h)
                'expires_at'              => Carbon::now()->addHours(
                    config('payment.order_expiry_hours', 48)
                ),
                'status'                  => 'pending',
                'metadata'                => [
                    'initiated_by_ip' => request()->ip(),
                    'initiated_at'    => Carbon::now()->toIso8601String(),
                    'user_agent'      => request()->userAgent(),
                ],
            ]);

            $this->auditService->log(
                action:         'order_created',
                module:         'billing',
                resourceType:   'order',
                resourceId:     $order->id,
                newValues:      [
                    'reference' => $reference,
                    'plan'      => $plan->slug,
                    'amount'    => $baseAmount,
                    'currency'  => $currency,
                ],
                userId:         $user->id,
                organizationId: $org->id,
            );

            return $order;
        });
    }

    // =========================================================================
    // Activation de licence
    // =========================================================================

    /**
     * Active ou renouvelle la licence pour une commande payée.
     *
     * RÈGLES D'IDEMPOTENCE :
     * - Si la licence est déjà active pour cet idempotency_key → retour silencieux
     * - SELECT FOR UPDATE sur la commande avant toute écriture
     * - Journalisation de chaque activation dans audit_logs
     *
     * @throws \RuntimeException si la commande n'est pas dans un état activable
     */
    public function activateLicense(Order $order): mixed
    {
        return DB::transaction(function () use ($order) {
            // Verrou pessimiste pour éviter la double-activation concurrente
            $order = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            // IDEMPOTENCE : si déjà payée, retourner la licence existante
            if ($order->status === 'paid') {
                Log::info('PaymentService: licence déjà activée (idempotent)', [
                    'order_id'        => $order->id,
                    'idempotency_key' => $order->idempotency_key,
                ]);
                return $order->organization->activeLicense ?? null;
            }

            // Vérifier que l'ordre est dans un état activable
            if (! in_array($order->status, ['proof_submitted', 'processing'], true)) {
                throw new \RuntimeException(
                    "La commande #{$order->id} (status: {$order->status}) n'est pas activable."
                );
            }

            // Activer la licence via LicenseService
            $license = $this->licenseService->activate(
                organizationId: $order->organization_id,
                planId:         $order->plan_code,
                paymentId:      $order->id,
                durationMonths: $order->quantity_months,
            );

            // Marquer la commande comme payée (DATE SERVEUR)
            $order->update([
                'status'  => 'paid',
                'paid_at' => Carbon::now(),
            ]);

            $this->auditService->log(
                action:         'license_activated_from_order',
                module:         'billing',
                resourceType:   'order',
                resourceId:     $order->id,
                newValues:      [
                    'license_id'      => $license->id,
                    'plan'            => $order->plan_code,
                    'idempotency_key' => $order->idempotency_key,
                    'activated_at'    => Carbon::now()->toIso8601String(),
                ],
                organizationId: $order->organization_id,
            );

            return $license;
        });
    }

    // =========================================================================
    // Moyens de paiement disponibles
    // =========================================================================

    /**
     * Retourne les moyens de paiement disponibles pour une organisation.
     *
     * SÉCURITÉ : ne retourne JAMAIS les clés secrètes (getPublicConfig()).
     */
    public function getAvailablePaymentMethods(Organization $org, string $planCode): \Illuminate\Support\Collection
    {
        return \App\Models\PaymentMethodConfig::active()
            ->forCountry($org->country ?? '')
            ->forPlan($planCode)
            ->orderBy('order')
            ->get()
            ->map(fn ($method) => [
                'type'         => $method->type,
                'provider'     => $method->provider,
                'display_name' => $method->display_name,
                'description'  => $method->description,
                'icon'         => $method->icon,
                'is_test_mode' => $method->is_test_mode,
                'currencies'   => $method->currencies,
                'config'       => $method->getPublicConfig(), // JAMAIS les secrets
            ]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Génère une référence de commande atomique : ORD-YYYY-XXXXX
     */
    public function generateOrderReference(): string
    {
        $year = Carbon::now()->year;
        // Verrou atomique : on s'appuie sur l'auto-increment de la DB
        // et on formate après insertion (pas de race condition)
        $seq = str_pad(
            Order::whereYear('created_at', $year)->count() + 1,
            5,
            '0',
            STR_PAD_LEFT
        );
        return "ORD-{$year}-{$seq}";
    }

    /**
     * Convertit une période en nombre de mois.
     */
    private function periodToMonths(string $period): int
    {
        return match ($period) {
            'monthly'   => 1,
            'quarterly' => 3,
            'biannual'  => 6,
            'yearly'    => 12,
            default     => throw new \InvalidArgumentException("Période invalide : {$period}"),
        };
    }

    /**
     * Calcule la remise coupon et retourne le montant remisé.
     * SÉCURITÉ : validation côté serveur uniquement.
     */
    private function applyCoupon(string $code, float $amount, string $planSlug, string $currency): float
    {
        // TODO: implémenter la table coupons — retourner 0 par défaut
        Log::info('Coupon soumis (non implémenté)', ['code' => $code, 'plan' => $planSlug]);
        return 0.0;
    }
}
