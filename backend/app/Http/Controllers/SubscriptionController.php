<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Plan;
use App\Services\LicenseService;
use App\Services\PaymentService;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SubscriptionController — Gestion de l'abonnement de l'organisation
 *
 * SÉCURITÉ :
 * - Toutes les dates sont calculées côté serveur (Carbon::now())
 * - L'annulation requiert une confirmation explicite
 * - La réactivation crée un nouveau paiement (pas d'activation directe)
 */
class SubscriptionController extends Controller
{
    public function __construct(
        private LicenseService  $licenseService,
        private PaymentService  $paymentService,
        private AuditService    $auditService,
    ) {}

    // =========================================================================
    // Plan courant
    // =========================================================================

    /**
     * Retourne le plan actuel, la licence et les jours restants.
     *
     * GET /api/subscription/current
     *
     * SÉCURITÉ : Les dates sont calculées côté serveur (jamais depuis le client).
     */
    public function currentPlan(Request $request): JsonResponse
    {
        $org     = $request->user()->organization()->with('license')->firstOrFail();
        $license = $org->license;

        // Toutes les dates calculées côté SERVEUR
        $now = Carbon::now();

        $daysRemaining = 0;
        $daysTotal     = 0;

        if ($license) {
            $expiresAt     = Carbon::parse($license->ends_at);
            $startsAt      = Carbon::parse($license->starts_at);
            $daysRemaining = max(0, (int) $now->diffInDays($expiresAt, false));
            $daysTotal     = max(1, (int) $startsAt->diffInDays($expiresAt));
        }

        $status = $this->licenseService->checkStatus($org->id);

        return response()->json([
            'organization' => [
                'id'     => $org->id,
                'name'   => $org->name,
                'status' => $org->status,
            ],
            'license' => $license ? [
                'id'             => $license->id,
                'plan_id'        => $license->plan_id,
                'plan_name'      => $license->plan_name,
                'status'         => $license->status,
                'billing_cycle'  => $license->billing_cycle,
                'max_users'      => $license->max_users,
                'features'       => $license->features,
                'modules'        => $license->modules,
                // Dates calculées côté serveur
                'starts_at'      => Carbon::parse($license->starts_at)->toIso8601String(),
                'ends_at'        => Carbon::parse($license->ends_at)->toIso8601String(),
                'grace_until'    => $license->grace_until
                    ? Carbon::parse($license->grace_until)->toIso8601String()
                    : null,
                'days_remaining' => $daysRemaining,
                'days_total'     => $daysTotal,
                'progress_pct'   => $daysTotal > 0 ? round(($daysRemaining / $daysTotal) * 100) : 0,
            ] : null,
            'computed_status' => $status, // Statut calculé côté serveur
            'is_trial'        => $status === LicenseService::STATUS_TRIAL,
            'trial_days_left' => $org->getRemainingTrialDays(),
        ]);
    }

    // =========================================================================
    // Changement de plan
    // =========================================================================

    /**
     * Demande de changement de plan — crée une nouvelle intention de paiement.
     *
     * POST /api/subscription/change-plan
     * Body : { plan_slug, method, currency?, duration_months? }
     *
     * SÉCURITÉ : Le changement de plan ne s'effectue qu'après paiement validé.
     * Cette route crée uniquement l'intention de paiement.
     */
    public function changePlan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_slug'       => ['required', 'string', 'exists:plans,slug'],
            'method'          => ['required', 'in:mobile_money,bank_transfer,card,cash'],
            'currency'        => ['sometimes', 'string', 'in:XOF,EUR,USD'],
            'duration_months' => ['sometimes', 'integer', 'min:1', 'max:24'],
        ]);

        $org  = $request->user()->organization;
        $plan = Plan::where('slug', $validated['plan_slug'])->active()->firstOrFail();

        // Vérifier qu'on ne demande pas le même plan actif
        $currentPlan = $org->license?->plan_id;
        if ($currentPlan === $plan->slug && $org->license?->status === 'active') {
            // Renouvellement autorisé (pas un changement, juste un paiement)
            // On continue : créer l'intention de paiement normalement
        }

        $payment = $this->paymentService->createPaymentIntent(
            org:            $org,
            plan:           $plan,
            method:         $validated['method'],
            currency:       $validated['currency']        ?? 'XOF',
            durationMonths: $validated['duration_months'] ?? 1,
        );

        return response()->json([
            'success'    => true,
            'payment_id' => $payment->id,
            'amount'     => $payment->amount,
            'currency'   => $payment->currency,
            'message'    => 'Intention de paiement créée. Procédez au paiement pour activer le plan.',
        ], 201);
    }

    // =========================================================================
    // Annulation
    // =========================================================================

    /**
     * Annule l'abonnement à la fin de la période en cours.
     *
     * POST /api/subscription/cancel
     * Body : { confirm: true } (confirmation explicite obligatoire)
     *
     * L'annulation ne coupe pas l'accès immédiatement : la licence reste
     * valide jusqu'à la date d'expiration, puis n'est pas renouvelée.
     */
    public function cancelSubscription(Request $request): JsonResponse
    {
        $request->validate([
            'confirm' => ['required', 'boolean', 'accepted'],
        ]);

        $org     = $request->user()->organization;
        $license = $org->license;

        if (! $license || ! in_array($license->status, ['active', 'trial'], true)) {
            return response()->json([
                'message' => 'Aucun abonnement actif à annuler.',
            ], 422);
        }

        $license->update(['status' => 'cancelled']);

        $this->auditService->log(
            action:         'subscription_cancelled',
            module:         'billing',
            resourceType:   'license',
            resourceId:     $license->id,
            newValues:      [
                'cancelled_by' => $request->user()->id,
                'ends_at'      => $license->ends_at,
                'note'         => 'Accès maintenu jusqu\'à la date d\'expiration',
            ],
            organizationId: $org->id,
        );

        return response()->json([
            'success' => true,
            'message' => 'Abonnement annulé. Votre accès reste actif jusqu\'au '
                . Carbon::parse($license->ends_at)->format('d/m/Y') . '.',
            'ends_at' => Carbon::parse($license->ends_at)->toIso8601String(),
        ]);
    }

    // =========================================================================
    // Réactivation
    // =========================================================================

    /**
     * Réactive un abonnement expiré ou annulé.
     *
     * POST /api/subscription/reactivate
     * Body : { plan_slug, method, currency? }
     *
     * SÉCURITÉ : La réactivation passe obligatoirement par un nouveau paiement.
     * On ne peut jamais réactiver directement sans payer.
     */
    public function reactivate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_slug' => ['required', 'string', 'exists:plans,slug'],
            'method'    => ['required', 'in:mobile_money,bank_transfer,card,cash'],
            'currency'  => ['sometimes', 'string', 'in:XOF,EUR,USD'],
        ]);

        $org  = $request->user()->organization;
        $plan = Plan::where('slug', $validated['plan_slug'])->active()->firstOrFail();

        // Vérifier que l'abonnement est bien expiré ou annulé
        $license = $org->license;
        if ($license && $license->status === 'active' && Carbon::parse($license->ends_at)->isFuture()) {
            return response()->json([
                'message' => 'Votre abonnement est déjà actif.',
            ], 422);
        }

        // Créer une intention de paiement pour la réactivation
        $payment = $this->paymentService->createPaymentIntent(
            org:    $org,
            plan:   $plan,
            method: $validated['method'],
            currency: $validated['currency'] ?? 'XOF',
        );

        return response()->json([
            'success'    => true,
            'payment_id' => $payment->id,
            'amount'     => $payment->amount,
            'currency'   => $payment->currency,
            'message'    => 'Procédez au paiement pour réactiver votre abonnement.',
        ], 201);
    }

    // =========================================================================
    // Méthodes de paiement disponibles
    // =========================================================================

    /**
     * Retourne les méthodes de paiement disponibles depuis config + BDD.
     *
     * GET /api/subscription/payment-methods
     *
     * Les méthodes peuvent être activées/désactivées dynamiquement
     * via la configuration de l'organisation ou les paramètres globaux.
     */
    public function getPaymentMethods(Request $request): JsonResponse
    {
        $org     = $request->user()->organization;
        $country = $org->country ?? 'CI';

        // Méthodes de base depuis la config
        $methods = config('secretis.payment_methods.available', []);

        // Filtrer selon le pays de l'organisation
        $availableMethods = collect($methods)->filter(function ($method) use ($country) {
            $countries = $method['countries'] ?? ['*'];
            return in_array('*', $countries, true) || in_array($country, $countries, true);
        })->values();

        return response()->json([
            'methods'  => $availableMethods,
            'currency' => $this->getDefaultCurrencyForCountry($country),
            'country'  => $country,
        ]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function getDefaultCurrencyForCountry(string $countryCode): string
    {
        // Zone BCEAO (FCFA)
        $xofCountries = ['CI', 'SN', 'ML', 'BF', 'BJ', 'TG', 'NE', 'GW'];

        if (in_array($countryCode, $xofCountries, true)) {
            return 'XOF';
        }

        // Zone CEMAC (FCFA XAF)
        $xafCountries = ['CM', 'GA', 'CG', 'CF', 'TD', 'GQ'];
        if (in_array($countryCode, $xafCountries, true)) {
            return 'XAF';
        }

        return 'EUR';
    }
}
