<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use App\Models\PartnerCommission;
use App\Services\PartnerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PartnersController extends Controller
{
    public function __construct(private readonly PartnerService $partnerService) {}

    /**
     * Liste de tous les partenaires avec filtres et KPIs.
     */
    public function index(Request $request): Response
    {
        $query = Partner::query()
            ->withCount(['referrals' => fn ($q) => $q->where('status', 'active')])
            ->when($request->get('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->get('type'), fn ($q, $t) => $q->where('partner_type', $t))
            ->when($request->get('country'), fn ($q, $c) => $q->where('country', $c))
            ->when($request->get('search'), function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('company_name', 'ilike', "%{$search}%")
                        ->orWhere('contact_name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%");
                });
            })
            ->latest();

        $partners = $query->paginate(20)->through(fn ($p) => [
            'id'              => $p->id,
            'company_name'    => $p->company_name,
            'contact_name'    => $p->contact_name,
            'email'           => $p->email,
            'country'         => $p->country,
            'partner_type'    => $p->partner_type,
            'partner_type_label' => $p->getPartnerTypeLabel(),
            'status'          => $p->status,
            'commission_rate' => $p->commission_rate,
            'referral_code'   => $p->referral_code,
            'total_clients'   => $p->total_clients,
            'total_revenue'   => $p->total_revenue,
            'total_commissions' => $p->total_commissions,
            'pending_commissions' => $p->getPendingCommissions(),
            'approved_at'     => $p->approved_at?->toDateString(),
            'created_at'      => $p->created_at->toDateString(),
        ]);

        return Inertia::render('SuperAdmin/Partners/Index', [
            'partners' => $partners,
            'filters'  => $request->only(['status', 'type', 'country', 'search']),
            'stats'    => $this->computeStats(),
        ]);
    }

    /**
     * Fiche complète d'un partenaire.
     */
    public function show(Partner $partner): Response
    {
        $partner->load(['user', 'approver', 'referrals.organization', 'commissions']);

        $referralRows = $partner->referrals->map(fn ($r) => [
            'id'             => $r->id,
            'organization'   => $r->organization->name ?? 'N/A',
            'plan'           => $r->plan_name,
            'monthly_amount' => $r->monthly_amount,
            'commission_rate'=> $r->commission_rate,
            'commission_monthly' => $r->monthlyCommissionAmount(),
            'referred_at'    => $r->referred_at->toDateString(),
            'status'         => $r->status,
        ]);

        $commissionRows = $partner->commissions->sortByDesc('period_month')->map(fn ($c) => [
            'id'               => $c->id,
            'period_month'     => $c->period_month->format('Y-m'),
            'amount'           => $c->amount,
            'status'           => $c->status,
            'paid_at'          => $c->paid_at?->toDateString(),
            'payment_reference'=> $c->payment_reference,
        ]);

        return Inertia::render('SuperAdmin/Partners/Show', [
            'partner'    => [
                'id'               => $partner->id,
                'company_name'     => $partner->company_name,
                'contact_name'     => $partner->contact_name,
                'email'            => $partner->email,
                'phone'            => $partner->phone,
                'country'          => $partner->country,
                'partner_type'     => $partner->partner_type,
                'partner_type_label' => $partner->getPartnerTypeLabel(),
                'status'           => $partner->status,
                'commission_rate'  => $partner->commission_rate,
                'referral_code'    => $partner->referral_code,
                'bank_name'        => $partner->bank_name,
                'bank_account_masked' => $partner->bank_account
                    ? '****' . substr($partner->bank_account, -4)
                    : null,
                'bank_iban_masked' => $partner->bank_iban
                    ? substr($partner->bank_iban, 0, 4) . '****' . substr($partner->bank_iban, -4)
                    : null,
                'total_clients'    => $partner->total_clients,
                'total_revenue'    => $partner->total_revenue,
                'total_commissions'=> $partner->total_commissions,
                'pending_commissions' => $partner->getPendingCommissions(),
                'notes'            => $partner->notes,
                'approved_at'      => $partner->approved_at?->toDateString(),
                'approved_by_name' => $partner->approver?->name,
                'created_at'       => $partner->created_at->toDateString(),
                'user_name'        => $partner->user?->name,
            ],
            'referrals'   => $referralRows->values()->all(),
            'commissions' => $commissionRows->values()->all(),
        ]);
    }

    /**
     * Approuver un partenaire en attente.
     */
    public function approve(Partner $partner): RedirectResponse
    {
        $this->partnerService->approvePartner($partner, Auth::user());

        return redirect()->route('superadmin.partners.show', $partner)
            ->with('success', "Le partenaire {$partner->company_name} a été approuvé.");
    }

    /**
     * Suspendre un partenaire actif.
     */
    public function suspend(Partner $partner): RedirectResponse
    {
        if (!in_array($partner->status, ['active', 'pending'])) {
            return back()->with('error', 'Ce partenaire ne peut pas être suspendu dans son état actuel.');
        }

        $partner->update(['status' => 'suspended']);

        return redirect()->route('superadmin.partners.show', $partner)
            ->with('success', "Le partenaire {$partner->company_name} a été suspendu.");
    }

    /**
     * Dashboard des commissions à payer.
     */
    public function commissions(Request $request): Response
    {
        $query = PartnerCommission::with(['partner', 'referral.organization'])
            ->when($request->get('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->get('partner_id'), fn ($q, $pid) => $q->where('partner_id', $pid))
            ->orderBy('period_month', 'desc')
            ->orderBy('partner_id');

        $commissions = $query->paginate(30)->through(fn ($c) => [
            'id'               => $c->id,
            'partner_id'       => $c->partner_id,
            'partner_name'     => $c->partner->company_name,
            'partner_type'     => $c->partner->partner_type,
            'organization'     => $c->referral->organization->name ?? 'N/A',
            'period_month'     => $c->period_month->format('Y-m'),
            'amount'           => $c->amount,
            'status'           => $c->status,
            'paid_at'          => $c->paid_at?->toDateString(),
            'payment_reference'=> $c->payment_reference,
        ]);

        $pendingTotal  = PartnerCommission::where('status', 'pending')->sum('amount');
        $approvedTotal = PartnerCommission::where('status', 'approved')->sum('amount');
        $paidThisMonth = PartnerCommission::where('status', 'paid')
            ->whereMonth('paid_at', now()->month)
            ->whereYear('paid_at', now()->year)
            ->sum('amount');

        return Inertia::render('SuperAdmin/Partners/Commissions', [
            'commissions' => $commissions,
            'filters'     => $request->only(['status', 'partner_id']),
            'summary'     => [
                'pending_total'   => (float) $pendingTotal,
                'approved_total'  => (float) $approvedTotal,
                'paid_this_month' => (float) $paidThisMonth,
            ],
        ]);
    }

    /**
     * Marquer une commission comme payée.
     */
    public function payCommission(Request $request, PartnerCommission $commission): RedirectResponse
    {
        $validated = $request->validate([
            'payment_reference' => ['required', 'string', 'max:255'],
        ]);

        if ($commission->status === 'paid') {
            return back()->with('error', 'Cette commission est déjà marquée comme payée.');
        }

        $commission->update([
            'status'            => 'paid',
            'paid_at'           => now(),
            'payment_reference' => $validated['payment_reference'],
        ]);

        return back()->with('success', 'Commission marquée comme payée.');
    }

    /**
     * Métriques globales du programme partenaires (API JSON).
     */
    public function stats(): JsonResponse
    {
        return response()->json($this->computeStats());
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private function computeStats(): array
    {
        return [
            'total_partners'          => Partner::count(),
            'active_partners'         => Partner::where('status', 'active')->count(),
            'pending_partners'        => Partner::where('status', 'pending')->count(),
            'suspended_partners'      => Partner::where('status', 'suspended')->count(),
            'total_referrals'         => \App\Models\PartnerReferral::count(),
            'active_referrals'        => \App\Models\PartnerReferral::where('status', 'active')->count(),
            'commissions_pending'     => (float) PartnerCommission::whereIn('status', ['pending','approved'])->sum('amount'),
            'commissions_paid_total'  => (float) PartnerCommission::where('status', 'paid')->sum('amount'),
            'commissions_this_month'  => (float) PartnerCommission::where('status', 'paid')
                ->whereMonth('paid_at', now()->month)
                ->whereYear('paid_at', now()->year)
                ->sum('amount'),
            'total_mrr_generated'     => (float) \App\Models\PartnerReferral::where('status', 'active')->sum('monthly_amount'),
        ];
    }
}
