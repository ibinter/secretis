<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Services\PayrollRuleService;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Paie — côté RH de l'organisation.
 *
 * Le référentiel des taux (`SuperAdmin\PayrollRuleController`) relève d'IBIG :
 * c'est de la matière légale, commune à toutes les organisations d'un pays.
 * Ici, la RH exploite ce référentiel pour son propre effectif.
 *
 * Un principe traverse tout l'écran : **une période clôturée ne bouge plus**.
 * Les bulletins ont été remis aux salariés et déclarés aux caisses ; les
 * recalculer après coup produirait deux vérités pour le même mois.
 */
class PayrollController extends Controller
{
    public function __construct(
        private PayrollService     $paie,
        private PayrollRuleService $referentiel,
    ) {}

    /**
     * GET /rh/paie — liste des périodes.
     */
    public function index(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $periodes = DB::table('payroll_periods')
            ->where('organization_id', $orgId)
            ->orderByDesc('year')->orderByDesc('month')
            ->limit(36)
            ->get()
            ->map(fn ($p) => [
                'id'          => $p->id,
                'label'       => $p->label,
                'year'        => $p->year,
                'month'       => $p->month,
                'status'      => $p->status,
                'currency'    => $p->currency,
                'country'     => $p->country_code,
                'total_gross' => (float) $p->total_gross,
                'total_net'   => (float) $p->total_net,
                'total_employer' => (float) $p->total_employer_contributions,
                'payslips'    => DB::table('payslips')->where('payroll_period_id', $p->id)->count(),
                'closed_at'   => $p->closed_at,
            ]);

        return Inertia::render('RH/Paie/Index', [
            'periodes'  => $periodes,
            'effectif'  => Employee::where('organization_id', $orgId)->where('status', 'active')->count(),
            'sansSalaire' => Employee::where('organization_id', $orgId)->where('status', 'active')
                ->where(fn ($q) => $q->whereNull('base_salary')->orWhere('base_salary', '<=', 0))
                ->count(),
            'referentiel' => $this->etatReferentiel($request),
            'rubriques' => DB::table('payroll_components')
                ->where('organization_id', $orgId)
                ->orderBy('display_order')
                ->get(),
        ]);
    }

    /**
     * POST /rh/paie/periodes — ouvrir un mois.
     */
    public function ouvrirPeriode(Request $request): RedirectResponse
    {
        $valide = $request->validate([
            'year'  => ['required', 'integer', 'min:2020', 'max:2100'],
            'month' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        try {
            $periode = $this->paie->ouvrirPeriode(
                $request->user()->organization,
                $valide['year'],
                $valide['month']
            );
        } catch (\Throwable $e) {
            return back()->withErrors(['periode' => $e->getMessage()]);
        }

        return redirect()
            ->route('rh.paie.periode', $periode->id)
            ->with('success', "Période « {$periode->label} » ouverte.");
    }

    /**
     * GET /rh/paie/periodes/{id} — bulletins d'une période.
     */
    public function periode(Request $request, int $id): Response
    {
        $periode = $this->trouverPeriode($request, $id);

        $bulletins = DB::table('payslips')
            ->where('payroll_period_id', $periode->id)
            ->orderBy('employee_name')
            ->get();

        return Inertia::render('RH/Paie/Periode', [
            'periode'   => $periode,
            'bulletins' => $bulletins,
            // Les salariés actifs sans bulletin : la RH doit voir qui manque.
            'manquants' => Employee::where('organization_id', $periode->organization_id)
                ->where('status', 'active')
                ->whereNotIn('id', DB::table('payslips')->where('payroll_period_id', $periode->id)->pluck('employee_id'))
                ->orderBy('last_name')
                ->get(['id', 'first_name', 'last_name', 'job_title', 'base_salary'])
                ->map(fn ($e) => [
                    'id'   => $e->id,
                    'nom'  => trim($e->first_name . ' ' . $e->last_name),
                    'poste'=> $e->job_title,
                    'motif'=> ($e->base_salary > 0) ? null : 'aucun salaire de base renseigné',
                ]),
        ]);
    }

    /**
     * POST /rh/paie/periodes/{id}/calculer — calculer toute la période.
     */
    public function calculer(Request $request, int $id): RedirectResponse
    {
        $periode = $this->trouverPeriode($request, $id);

        $resultat = $this->paie->calculerPeriodeEntiere($periode);

        // Un employé mal renseigné ne bloque pas la paie des autres : on
        // remonte la liste précise de ce qui reste à traiter.
        if (! empty($resultat['erreurs'])) {
            return back()
                ->with('success', "{$resultat['ok']} bulletin(s) calculé(s).")
                ->withErrors(['calcul' => $resultat['erreurs']]);
        }

        return back()->with('success', "{$resultat['ok']} bulletin(s) calculé(s).");
    }

    /**
     * POST /rh/paie/periodes/{id}/cloturer
     */
    public function cloturer(Request $request, int $id): RedirectResponse
    {
        $periode = $this->trouverPeriode($request, $id);

        try {
            $this->paie->cloturerPeriode($periode, $request->user()->id);
        } catch (\Throwable $e) {
            return back()->withErrors(['cloture' => $e->getMessage()]);
        }

        return back()->with('success', "Période « {$periode->label} » clôturée. Les bulletins sont définitifs.");
    }

    /**
     * GET /rh/paie/bulletins/{id} — détail d'un bulletin.
     */
    public function bulletin(Request $request, int $id): Response
    {
        [$bulletin, $lignes] = $this->chargerBulletin($request, $id);

        return Inertia::render('RH/Paie/Bulletin', [
            'bulletin' => $bulletin,
            'lignes'   => $lignes,
            'periode'  => DB::table('payroll_periods')->find($bulletin->payroll_period_id),
        ]);
    }

    /**
     * GET /rh/paie/bulletins/{id}/pdf — le document remis au salarié.
     */
    public function bulletinPdf(Request $request, int $id)
    {
        [$bulletin, $lignes] = $this->chargerBulletin($request, $id);

        $periode = DB::table('payroll_periods')->find($bulletin->payroll_period_id);
        $org     = $request->user()->organization;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('payroll.payslip-pdf', [
            'bulletin'     => $bulletin,
            'lignes'       => $lignes,
            'periode'      => $periode,
            'organization' => $org,
            'profil'       => $this->referentiel->profil($bulletin->country_code),
        ])->setPaper('a4');

        return $pdf->download('bulletin-' . $bulletin->reference . '.pdf');
    }

    // ─── Rubriques (primes, indemnités, retenues) ───────────────────────────

    public function storeRubrique(Request $request): RedirectResponse
    {
        $valide = $request->validate([
            'code'   => ['required', 'string', 'max:30'],
            'label'  => ['required', 'string', 'max:255'],
            'type'   => ['required', 'in:earning,deduction'],
            'default_amount'      => ['nullable', 'numeric', 'min:0'],
            'percentage_of_base'  => ['nullable', 'numeric', 'min:0', 'max:100'],
            'subject_to_contributions' => ['boolean'],
            'subject_to_income_tax'    => ['boolean'],
        ]);

        // Une rubrique doit dire COMMENT elle se calcule : un montant fixe ou
        // un pourcentage du salaire de base, jamais les deux ni aucun.
        $aMontant = ($valide['default_amount'] ?? null) !== null;
        $aTaux    = ($valide['percentage_of_base'] ?? null) !== null;

        if ($aMontant === $aTaux) {
            return back()->withErrors([
                'rubrique' => 'Indiquez SOIT un montant fixe, SOIT un pourcentage du salaire de base.',
            ]);
        }

        $orgId = $request->user()->organization_id;

        if (DB::table('payroll_components')->where('organization_id', $orgId)->where('code', $valide['code'])->exists()) {
            return back()->withErrors(['rubrique' => "Le code « {$valide['code']} » existe déjà."]);
        }

        DB::table('payroll_components')->insert([
            'organization_id' => $orgId,
            'code'   => strtoupper($valide['code']),
            'label'  => $valide['label'],
            'type'   => $valide['type'],
            'default_amount'     => $valide['default_amount'] ?? null,
            'percentage_of_base' => $valide['percentage_of_base'] ?? null,
            'subject_to_contributions' => $request->boolean('subject_to_contributions', true),
            'subject_to_income_tax'    => $request->boolean('subject_to_income_tax', true),
            'is_active'     => true,
            'display_order' => (int) DB::table('payroll_components')->where('organization_id', $orgId)->max('display_order') + 1,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);

        return back()->with('success', 'Rubrique enregistrée.');
    }

    public function destroyRubrique(Request $request, int $id): RedirectResponse
    {
        DB::table('payroll_components')
            ->where('organization_id', $request->user()->organization_id)
            ->where('id', $id)
            ->delete();

        return back()->with('success', 'Rubrique supprimée.');
    }

    /**
     * POST /rh/paie/taux-employeur — taux propre à l'entreprise.
     *
     * Le taux accidents du travail est notifié entreprise par entreprise selon
     * le risque de l'activité : il ne peut pas venir du référentiel pays.
     */
    public function storeTauxEmployeur(Request $request): RedirectResponse
    {
        $valide = $request->validate([
            'scheme_code'  => ['required', 'string', 'max:20'],
            'branch_code'  => ['required', 'string', 'max:40'],
            'employer_rate'=> ['required', 'numeric', 'min:0', 'max:100'],
            'effective_from' => ['required', 'date'],
            'source'       => ['nullable', 'string', 'max:255'],
        ]);

        $org  = $request->user()->organization;
        $pays = $this->referentiel->paysDe($org);

        // Refuser un taux hors de la fourchette légale du pays.
        $regle = $this->referentiel->contributionRules($pays)
            ->firstWhere(fn ($r) => $r->scheme_code === $valide['scheme_code']
                && $r->branch_code === $valide['branch_code']);

        if ($regle && $regle->min_rate !== null && $regle->max_rate !== null) {
            $t = (float) $valide['employer_rate'];
            if ($t < (float) $regle->min_rate || $t > (float) $regle->max_rate) {
                return back()->withErrors([
                    'taux' => "Le taux doit être compris entre {$regle->min_rate} % et {$regle->max_rate} % "
                            . "pour cette branche dans ce pays.",
                ]);
            }
        }

        DB::table('payroll_employer_rates')->updateOrInsert(
            [
                'organization_id' => $org->id,
                'scheme_code'     => $valide['scheme_code'],
                'branch_code'     => $valide['branch_code'],
                'effective_from'  => $valide['effective_from'],
            ],
            [
                'country_code'  => $pays,
                'employer_rate' => $valide['employer_rate'],
                'source'        => $valide['source'] ?? null,
                'updated_at'    => now(),
                'created_at'    => now(),
            ]
        );

        \Illuminate\Support\Facades\Cache::flush();

        return back()->with('success', 'Taux propre à votre entreprise enregistré.');
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function trouverPeriode(Request $request, int $id): object
    {
        $periode = DB::table('payroll_periods')
            ->where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->first();

        abort_if(! $periode, 404, 'Période introuvable.');

        return $periode;
    }

    private function chargerBulletin(Request $request, int $id): array
    {
        $bulletin = DB::table('payslips')
            ->where('id', $id)
            ->where('organization_id', $request->user()->organization_id)
            ->first();

        abort_if(! $bulletin, 404, 'Bulletin introuvable.');

        $lignes = DB::table('payslip_lines')
            ->where('payslip_id', $bulletin->id)
            ->orderBy('display_order')
            ->get();

        return [$bulletin, $lignes];
    }

    /**
     * L'état du référentiel pour le pays de l'organisation : la RH doit savoir
     * si les taux qu'elle applique ont été confirmés sur texte officiel.
     */
    private function etatReferentiel(Request $request): array
    {
        try {
            $pays   = $this->referentiel->paysDe($request->user()->organization);
            $profil = $this->referentiel->profil($pays);
            $regles = $this->referentiel->contributionRules($pays);

            return [
                'pays'        => $pays,
                'nom'         => $profil->country_name ?? $pays,
                'caisse'      => $profil->social_scheme_name ?? null,
                'branches'    => $regles->count(),
                'toutes_confirmees' => $regles->isNotEmpty() && $regles->every(fn ($r) => (bool) $r->is_verified),
                'bareme_impot'=> $this->referentiel->taxBrackets($pays)->count(),
                'utilisable'  => $regles->isNotEmpty()
                                 && $regles->sum(fn ($r) => (float) $r->employer_rate + (float) $r->employee_rate) > 0,
            ];
        } catch (\Throwable $e) {
            return ['erreur' => $e->getMessage(), 'utilisable' => false];
        }
    }
}
