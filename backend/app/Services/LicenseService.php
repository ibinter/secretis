<?php

namespace App\Services;

use App\Models\License;
use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * LicenseService — Gestion du cycle de vie des licences
 *
 * IDEMPOTENCE : Toutes les opérations d'activation vérifient si un paiement
 * a déjà été traité avant d'agir. On ne peut jamais activer deux fois la même
 * licence pour le même paiement (protection contre les doublons webhooks).
 *
 * SECURITE : Toutes les dates sont calculées côté serveur (Carbon::now()).
 * Aucune date fournie par le client n'est acceptée.
 */
class LicenseService
{
    /**
     * Statuts de licence possibles (pseudo-enum pour PHP 8.0 compat).
     */
    public const STATUS_ACTIVE    = 'active';
    public const STATUS_TRIAL     = 'trial';
    public const STATUS_GRACE     = 'grace';
    public const STATUS_EXPIRED   = 'expired';
    public const STATUS_SUSPENDED = 'suspended';

    /**
     * Durée de la période de grâce en jours après expiration.
     */
    private const GRACE_PERIOD_DAYS = 7;

    public function __construct(private AuditService $auditService) {}

    // -------------------------------------------------------------------------
    // Opérations principales
    // -------------------------------------------------------------------------

    /**
     * Active une licence pour une organisation suite à un paiement.
     *
     * IDEMPOTENCE : Si payment_id a déjà été traité, retourne la licence
     * existante sans créer de doublon. Essentiel pour les webhooks Stripe/PayDunya.
     *
     * @param  int    $organizationId
     * @param  int    $planId         ID du plan tarifaire
     * @param  int    $paymentId      ID du paiement (pour idempotence)
     * @param  int    $durationMonths Durée en mois (défaut : 1)
     * @return License
     *
     * @throws \RuntimeException si l'organisation ou le plan est introuvable
     */
    public function activate(int $organizationId, int $planId, int $paymentId, int $durationMonths = 1): License
    {
        return DB::transaction(function () use ($organizationId, $planId, $paymentId, $durationMonths) {
            // IDEMPOTENCE CHECK — Verrou pessimiste pour éviter les race conditions
            $existing = License::where('payment_id', $paymentId)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                Log::info('LicenseService::activate — paiement déjà traité (idempotent)', [
                    'payment_id'      => $paymentId,
                    'existing_license' => $existing->id,
                ]);

                return $existing;
            }

            $organization = Organization::findOrFail($organizationId);

            // Calculer les dates côté serveur uniquement
            $startsAt = Carbon::now();
            $expiresAt = $startsAt->copy()->addMonths($durationMonths)->endOfDay();

            // Désactiver les licences précédentes (soft)
            License::where('organization_id', $organizationId)
                ->where('status', self::STATUS_ACTIVE)
                ->update(['status' => 'superseded', 'superseded_at' => now()]);

            $license = License::create([
                'organization_id' => $organizationId,
                'plan_id'         => $planId,
                'payment_id'      => $paymentId,
                'status'          => self::STATUS_ACTIVE,
                'starts_at'       => $startsAt,
                'expires_at'      => $expiresAt,
                'grace_ends_at'   => $expiresAt->copy()->addDays(self::GRACE_PERIOD_DAYS),
            ]);

            // Mettre à jour le statut de l'organisation
            $organization->update([
                'status'  => 'active',
                'plan_id' => $planId,
            ]);

            $this->auditService->log(
                action: 'license_activated',
                module: 'billing',
                resourceType: 'license',
                resourceId: $license->id,
                oldValues: [],
                newValues: [
                    'plan_id'        => $planId,
                    'expires_at'     => $expiresAt->toIso8601String(),
                    'duration_months' => $durationMonths,
                ],
            );

            return $license;
        });
    }

    /**
     * Vérifie le statut de licence d'une organisation.
     * Toutes les comparaisons de date utilisent Carbon::now() (serveur).
     *
     * @return string STATUS_* constant
     */
    public function checkStatus(int $organizationId): string
    {
        $organization = Organization::with('license')->find($organizationId);

        if (! $organization) {
            return self::STATUS_SUSPENDED;
        }

        // Suspension explicite — priorité maximale
        if ($organization->status === 'suspended') {
            return self::STATUS_SUSPENDED;
        }

        $license = $organization->license;

        // Licence payante active
        if ($license && $license->status === self::STATUS_ACTIVE) {
            $now = Carbon::now(); // SERVEUR

            if ($now->lessThanOrEqualTo($license->expires_at)) {
                return self::STATUS_ACTIVE;
            }

            // Période de grâce
            if ($now->lessThanOrEqualTo($license->grace_ends_at)) {
                return self::STATUS_GRACE;
            }

            // Expirée hors grâce
            $this->expireLicense($license);

            return self::STATUS_EXPIRED;
        }

        // Trial
        if ($organization->status === 'trial' && $organization->trial_ends_at?->isFuture()) {
            return self::STATUS_TRIAL;
        }

        return self::STATUS_EXPIRED;
    }

    /**
     * Prolonge la licence active d'une organisation.
     *
     * @param  int  $organizationId
     * @param  int  $months         Nombre de mois à ajouter
     * @return License              Licence mise à jour
     *
     * @throws \RuntimeException si aucune licence active trouvée
     */
    public function extend(int $organizationId, int $months): License
    {
        return DB::transaction(function () use ($organizationId, $months) {
            $license = License::where('organization_id', $organizationId)
                ->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_GRACE])
                ->lockForUpdate()
                ->latest('expires_at')
                ->firstOrFail();

            $oldExpiry = $license->expires_at;

            // Extension à partir de la date d'expiration actuelle (pas de now())
            // pour ne pas pénaliser les renouvellements anticipés
            $newExpiry     = $oldExpiry->copy()->addMonths($months)->endOfDay();
            $newGraceEnds  = $newExpiry->copy()->addDays(self::GRACE_PERIOD_DAYS);

            $license->update([
                'status'        => self::STATUS_ACTIVE,
                'expires_at'    => $newExpiry,
                'grace_ends_at' => $newGraceEnds,
            ]);

            $this->auditService->log(
                action: 'license_extended',
                module: 'billing',
                resourceType: 'license',
                resourceId: $license->id,
                oldValues: ['expires_at' => $oldExpiry->toIso8601String()],
                newValues: ['expires_at' => $newExpiry->toIso8601String(), 'months_added' => $months],
            );

            return $license->refresh();
        });
    }

    /**
     * Suspend une organisation (bloque immédiatement l'accès).
     *
     * @param  int    $organizationId
     * @param  string $reason         Raison de la suspension (pour audit)
     */
    public function suspend(int $organizationId, string $reason): void
    {
        DB::transaction(function () use ($organizationId, $reason) {
            $organization = Organization::findOrFail($organizationId);

            $oldStatus = $organization->status;

            $organization->update(['status' => 'suspended']);

            // Suspendre aussi les licences actives
            License::where('organization_id', $organizationId)
                ->where('status', self::STATUS_ACTIVE)
                ->update(['status' => 'suspended', 'suspended_at' => now(), 'suspension_reason' => $reason]);

            $this->auditService->log(
                action: 'organization_suspended',
                module: 'billing',
                resourceType: 'organization',
                resourceId: $organizationId,
                oldValues: ['status' => $oldStatus],
                newValues: ['status' => 'suspended', 'reason' => $reason],
            );
        });
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    /**
     * Marque une licence comme expirée (appelé lors du checkStatus).
     */
    private function expireLicense(License $license): void
    {
        if ($license->status !== self::STATUS_EXPIRED) {
            $license->update(['status' => self::STATUS_EXPIRED, 'expired_at' => now()]);
        }
    }
}
