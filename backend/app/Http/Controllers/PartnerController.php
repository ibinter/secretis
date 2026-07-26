<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\PartnerCommission;
use App\Notifications\PartnerApplicationReceived;
use App\Services\PartnerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PartnerController extends Controller
{
    public function __construct(private readonly PartnerService $partnerService) {}

    // ─── Public — Programme partenaires ───────────────────────────────────────

    /**
     * Page formulaire d'inscription partenaire (Inertia).
     */
    public function register(): Response
    {
        return Inertia::render('Partner/Register', [
            'countries' => $this->ohadaCountries(),
            'partnerTypes' => [
                ['value' => 'reseller',   'label' => 'Revendeur',    'commission' => 20],
                ['value' => 'integrator', 'label' => 'Intégrateur',  'commission' => 25],
                ['value' => 'consultant', 'label' => 'Consultant',   'commission' => 15],
                ['value' => 'trainer',    'label' => 'Formateur',    'commission' => 10],
                ['value' => 'affiliate',  'label' => 'Affilié',      'commission' => 10],
            ],
        ]);
    }

    /**
     * Soumettre la candidature partenaire.
     * Accessible depuis la landing page (POST /api/partners/register) et
     * depuis le formulaire Inertia (POST /partenaires/candidature).
     */
    public function store(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'company_name'      => ['required', 'string', 'max:255'],
            'contact_name'      => ['required', 'string', 'max:255'],
            'email'             => ['required', 'email', 'max:255', 'unique:partners,email'],
            'phone'             => ['nullable', 'string', 'max:30'],
            'country'           => ['required', 'string', Rule::in(array_column($this->ohadaCountries(), 'code'))],
            'partner_type'      => ['required', Rule::in(['reseller', 'integrator', 'consultant', 'trainer', 'affiliate'])],
            'website'           => ['nullable', 'url', 'max:255'],
            'years_experience'  => ['nullable', 'integer', 'min:0', 'max:50'],
            'known_softwares'   => ['nullable', 'string', 'max:1000'],
            'clients_managed'   => ['nullable', 'integer', 'min:0'],
            'motivation'        => ['required', 'string', 'min:50', 'max:3000'],
            'gdpr_consent'      => ['required', 'accepted'],
        ]);

        // Taux de commission par défaut selon le type
        $defaultRates = [
            'reseller'   => 20.00,
            'integrator' => 25.00,
            'consultant' => 15.00,
            'trainer'    => 10.00,
            'affiliate'  => 10.00,
        ];

        $notes = "Site web : " . ($validated['website'] ?? 'N/A') . "\n"
               . "Années d'exp. ERP : " . ($validated['years_experience'] ?? 'N/A') . "\n"
               . "Logiciels connus : " . ($validated['known_softwares'] ?? 'N/A') . "\n"
               . "Clients gérés : " . ($validated['clients_managed'] ?? 'N/A') . "\n"
               . "Motivation : " . $validated['motivation'];

        $partner = Partner::create([
            'company_name'    => $validated['company_name'],
            'contact_name'    => $validated['contact_name'],
            'email'           => strtolower($validated['email']),
            'phone'           => $validated['phone'] ?? null,
            'country'         => strtoupper($validated['country']),
            'partner_type'    => $validated['partner_type'],
            'status'          => 'pending',
            'commission_rate' => $defaultRates[$validated['partner_type']],
            'referral_code'   => Partner::generateReferralCode(),
            'notes'           => $notes,
            'user_id'         => Auth::id(), // null si non connecté
        ]);

        $partner->notify(new PartnerApplicationReceived($partner));

        if ($request->wantsJson() || $request->expectsJson()) {
            return response()->json([
                'message' => 'Votre candidature a été soumise avec succès. Vous recevrez un email de confirmation.',
                'partner_id' => $partner->id,
            ], 201);
        }

        return redirect()->route('partner.register')
            ->with('success', 'Votre candidature a été soumise. Nous vous contacterons sous 2 à 5 jours ouvrables.');
    }

    // ─── Authentifié — Espace partenaire ──────────────────────────────────────

    /**
     * Tableau de bord partenaire.
     */
    public function dashboard(): Response
    {
        $partner = $this->resolveAuthenticatedPartner();

        if (!$partner) {
            abort(403, "Vous n'êtes pas enregistré comme partenaire IBIG PARTNERS.");
        }

        $recentClients = $partner->referrals()
            ->with('organization')
            ->latest('referred_at')
            ->take(5)
            ->get()
            ->map(fn ($r) => [
                'id'           => $r->id,
                'organization' => $r->organization->name,
                'plan'         => $r->plan_name,
                'referred_at'  => $r->referred_at->toDateString(),
                'status'       => $r->status,
                'monthly'      => $r->monthly_amount,
            ]);

        // Commissions sur 12 mois pour le chart
        $monthlyChart = PartnerCommission::selectRaw(
            "TO_CHAR(period_month, 'YYYY-MM') AS month, SUM(amount) AS total"
        )
            ->where('partner_id', $partner->id)
            ->where('period_month', '>=', now()->subMonths(11)->startOfMonth())
            ->groupByRaw("TO_CHAR(period_month, 'YYYY-MM')")
            ->orderByRaw("TO_CHAR(period_month, 'YYYY-MM')")
            ->pluck('total', 'month');

        return Inertia::render('Partner/Dashboard', [
            'partner'          => $partner->only([
                'id', 'company_name', 'contact_name', 'referral_code',
                'partner_type', 'commission_rate', 'total_clients',
                'total_revenue', 'total_commissions', 'status',
            ]),
            'referralLink'     => url('/inscription?ref=' . $partner->referral_code),
            'pendingCommissions' => $partner->getPendingCommissions(),
            'thisMonthCommissions' => (float) $partner->commissions()
                ->whereMonth('period_month', now()->month)
                ->whereYear('period_month', now()->year)
                ->sum('amount'),
            'recentClients'    => $recentClients,
            'monthlyChart'     => $monthlyChart,
        ]);
    }

    /**
     * Liste des clients référés par le partenaire.
     */
    public function clients(): Response
    {
        $partner = $this->resolveAuthenticatedPartner();

        if (!$partner) {
            abort(403);
        }

        $referrals = $partner->referrals()
            ->with('organization')
            ->latest('referred_at')
            ->paginate(20)
            ->through(fn ($r) => [
                'id'             => $r->id,
                'organization'   => $r->organization->name,
                'org_country'    => $r->organization->country,
                'plan'           => $r->plan_name,
                'monthly_amount' => $r->monthly_amount,
                'commission_rate'=> $r->commission_rate,
                'commission_monthly' => $r->monthlyCommissionAmount(),
                'referred_at'    => $r->referred_at->toDateString(),
                'converted_at'   => $r->converted_at?->toDateString(),
                'status'         => $r->status,
            ]);

        return Inertia::render('Partner/Clients', [
            'partner'  => $partner->only(['id', 'company_name', 'referral_code']),
            'referrals' => $referrals,
        ]);
    }

    /**
     * Historique des commissions du partenaire.
     */
    public function commissionsIndex(): Response
    {
        $partner = $this->resolveAuthenticatedPartner();

        if (!$partner) {
            abort(403);
        }

        $commissions = $partner->commissions()
            ->with('referral.organization')
            ->orderBy('period_month', 'desc')
            ->paginate(20)
            ->through(fn ($c) => [
                'id'              => $c->id,
                'period_month'    => $c->period_month->format('Y-m'),
                'organization'    => $c->referral->organization->name ?? 'N/A',
                'plan'            => $c->referral->plan_name,
                'amount'          => $c->amount,
                'status'          => $c->status,
                'paid_at'         => $c->paid_at?->toDateString(),
                'payment_reference' => $c->payment_reference,
            ]);

        return Inertia::render('Partner/Commissions', [
            'partner'     => $partner->only(['id', 'company_name', 'total_commissions']),
            'commissions' => $commissions,
            'summary'     => [
                'pending'  => (float) $partner->commissions()->whereIn('status', ['pending','approved'])->sum('amount'),
                'paid'     => (float) $partner->commissions()->where('status', 'paid')->sum('amount'),
                'total'    => (float) $partner->commissions()->sum('amount'),
            ],
        ]);
    }

    /**
     * Rapport mensuel (API JSON).
     */
    public function monthlyReport(string $month): JsonResponse
    {
        $partner = $this->resolveAuthenticatedPartner();

        if (!$partner) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        // Valider le format du mois
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            return response()->json(['message' => 'Format de mois invalide (attendu: YYYY-MM)'], 422);
        }

        return response()->json(
            $this->partnerService->generateMonthlyReport($partner, $month)
        );
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function resolveAuthenticatedPartner(): ?Partner
    {
        return Partner::where('user_id', Auth::id())->first();
    }

    private function ohadaCountries(): array
    {
        return [
            ['code' => 'BJ', 'name' => 'Bénin'],
            ['code' => 'BF', 'name' => 'Burkina Faso'],
            ['code' => 'CM', 'name' => 'Cameroun'],
            ['code' => 'CF', 'name' => 'République centrafricaine'],
            ['code' => 'KM', 'name' => 'Comores'],
            ['code' => 'CG', 'name' => 'Congo'],
            ['code' => 'CD', 'name' => 'RD Congo'],
            ['code' => 'CI', 'name' => "Côte d'Ivoire"],
            ['code' => 'GA', 'name' => 'Gabon'],
            ['code' => 'GN', 'name' => 'Guinée'],
            ['code' => 'GQ', 'name' => 'Guinée équatoriale'],
            ['code' => 'GW', 'name' => 'Guinée-Bissau'],
            ['code' => 'ML', 'name' => 'Mali'],
            ['code' => 'NE', 'name' => 'Niger'],
            ['code' => 'SN', 'name' => 'Sénégal'],
            ['code' => 'TD', 'name' => 'Tchad'],
            ['code' => 'TG', 'name' => 'Togo'],
            ['code' => 'MG', 'name' => 'Madagascar'],
        ];
    }
}
