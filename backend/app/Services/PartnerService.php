<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Partner;
use App\Models\PartnerCommission;
use App\Models\PartnerReferral;
use App\Models\User;
use App\Notifications\PartnerApproved;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PartnerService
{
    /**
     * Calcule et crée les lignes de commission du mois spécifié
     * pour tous les partenaires actifs ayant des référés actifs.
     *
     * @param string $month  Format 'Y-m' (ex: '2026-07')
     */
    public function calculateMonthlyCommissions(string $month): void
    {
        $periodMonth = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();

        // Tous les référés actifs avec leur partenaire actif
        $referrals = PartnerReferral::with('partner')
            ->where('status', 'active')
            ->whereHas('partner', fn ($q) => $q->where('status', 'active'))
            ->get();

        DB::transaction(function () use ($referrals, $periodMonth) {
            foreach ($referrals as $referral) {
                // Éviter les doublons si le calcul est relancé
                $exists = PartnerCommission::where('partner_referral_id', $referral->id)
                    ->where('period_month', $periodMonth)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $amount = round(
                    $referral->monthly_amount * ($referral->commission_rate / 100),
                    2
                );

                PartnerCommission::create([
                    'partner_id'          => $referral->partner_id,
                    'partner_referral_id' => $referral->id,
                    'period_month'        => $periodMonth,
                    'amount'              => $amount,
                    'status'              => 'pending',
                ]);
            }

            // Mettre à jour les agrégats sur chaque partenaire concerné
            $partnerIds = $referrals->pluck('partner_id')->unique();
            foreach ($partnerIds as $partnerId) {
                $partner = Partner::find($partnerId);
                if ($partner) {
                    $this->refreshPartnerAggregates($partner);
                }
            }
        });

        Log::info("Commissions {$month} calculées — {$referrals->count()} référés traités.");
    }

    /**
     * Approuve un partenaire en attente : passe son statut à 'active',
     * enregistre l'approbateur et envoie la notification.
     */
    public function approvePartner(Partner $partner, User $approvedBy): void
    {
        if ($partner->status !== 'pending') {
            throw new \LogicException("Le partenaire #{$partner->id} n'est pas en attente d'approbation.");
        }

        $partner->update([
            'status'      => 'active',
            'approved_at' => now(),
            'approved_by' => $approvedBy->id,
        ]);

        // Envoyer l'email d'approbation
        $partner->notify(new PartnerApproved($partner));

        Log::info("Partenaire #{$partner->id} ({$partner->company_name}) approuvé par {$approvedBy->email}.");
    }

    /**
     * Enregistre un parrainage lors de la création d'une organisation
     * avec un code de parrainage valide.
     *
     * @return PartnerReferral|null  null si le code n'existe pas ou le partenaire inactif
     */
    public function recordReferral(string $referralCode, Organization $organization): ?PartnerReferral
    {
        $partner = Partner::where('referral_code', strtoupper($referralCode))
            ->where('status', 'active')
            ->first();

        if (!$partner) {
            Log::warning("Code de parrainage invalide ou partenaire inactif : {$referralCode}");
            return null;
        }

        // Récupérer le plan de l'organisation (on utilise les settings ou 'trial' par défaut)
        $planName     = $organization->plan_name ?? 'trial';
        $monthlyAmount = $organization->monthly_amount ?? 0.00;

        $referral = PartnerReferral::create([
            'partner_id'      => $partner->id,
            'organization_id' => $organization->id,
            'referred_at'     => now(),
            'plan_name'       => $planName,
            'monthly_amount'  => $monthlyAmount,
            'commission_rate' => $partner->commission_rate,
            'status'          => 'pending',
        ]);

        // Mettre à jour le code de parrainage sur l'organisation
        $organization->update(['referral_code' => $referralCode]);

        $this->refreshPartnerAggregates($partner);

        Log::info("Parrainage enregistré : partenaire #{$partner->id} → organisation #{$organization->id}.");

        return $referral;
    }

    /**
     * Marque toutes les commissions approuvées d'un partenaire comme payées.
     */
    public function markCommissionsPaid(Partner $partner, string $reference): void
    {
        $updated = PartnerCommission::where('partner_id', $partner->id)
            ->where('status', 'approved')
            ->update([
                'status'            => 'paid',
                'paid_at'           => now(),
                'payment_reference' => $reference,
            ]);

        if ($updated > 0) {
            $this->refreshPartnerAggregates($partner);
        }

        Log::info("Commissions payées pour partenaire #{$partner->id} — réf. {$reference} — {$updated} ligne(s).");
    }

    /**
     * Génère le rapport mensuel d'un partenaire.
     *
     * @param string $month  Format 'Y-m'
     * @return array{
     *   period: string,
     *   partner: array,
     *   referrals_active: int,
     *   commissions_count: int,
     *   commissions_amount: float,
     *   commissions_status: array,
     *   referral_details: array
     * }
     */
    public function generateMonthlyReport(Partner $partner, string $month): array
    {
        $periodMonth = Carbon::createFromFormat('Y-m', $month)->startOfMonth()->toDateString();

        $commissions = PartnerCommission::with('referral.organization')
            ->where('partner_id', $partner->id)
            ->where('period_month', $periodMonth)
            ->get();

        $byStatus = $commissions->groupBy('status')->map->count();

        $referralDetails = $commissions->map(function (PartnerCommission $c) {
            return [
                'organization'    => $c->referral->organization->name ?? 'N/A',
                'plan'            => $c->referral->plan_name,
                'monthly_amount'  => $c->referral->monthly_amount,
                'commission_rate' => $c->referral->commission_rate,
                'commission'      => $c->amount,
                'status'          => $c->status,
                'paid_at'         => $c->paid_at?->toDateString(),
            ];
        })->values()->all();

        return [
            'period'             => $month,
            'partner'            => [
                'id'           => $partner->id,
                'company_name' => $partner->company_name,
                'contact_name' => $partner->contact_name,
                'partner_type' => $partner->partner_type,
                'referral_code'=> $partner->referral_code,
            ],
            'referrals_active'   => $partner->referrals()->where('status', 'active')->count(),
            'commissions_count'  => $commissions->count(),
            'commissions_amount' => (float) $commissions->sum('amount'),
            'commissions_status' => $byStatus->all(),
            'referral_details'   => $referralDetails,
        ];
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Recalcule et met à jour les agrégats dénormalisés d'un partenaire.
     */
    private function refreshPartnerAggregates(Partner $partner): void
    {
        $totalClients = $partner->referrals()->where('status', 'active')->count();

        $totalRevenue = $partner->referrals()
            ->where('status', 'active')
            ->sum('monthly_amount');

        $totalCommissions = $partner->commissions()
            ->where('status', 'paid')
            ->sum('amount');

        $partner->update([
            'total_clients'     => $totalClients,
            'total_revenue'     => (float) $totalRevenue,
            'total_commissions' => (float) $totalCommissions,
        ]);
    }
}
