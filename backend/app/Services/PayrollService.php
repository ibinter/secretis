<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Calcul et production des bulletins de paie.
 *
 * Ce service ne connaît AUCUN taux : il demande à `PayrollRuleService` les
 * règles du pays de l'organisation à la date de la période. C'est ce qui permet
 * à SECRETIS de servir les 14 pays de la zone franc avec un seul moteur.
 *
 * Ordre de calcul, volontairement explicite :
 *   1. brut = salaire de base + rubriques de gain
 *   2. assiette de cotisation = brut, moins les gains exonérés de cotisations
 *   3. cotisations salariales et patronales, branche par branche, plafonds compris
 *   4. assiette imposable = brut − cotisations salariales − gains exonérés d'impôt
 *   5. impôt sur les salaires par tranches
 *   6. net = brut − cotisations salariales − impôt − retenues diverses
 *
 * L'étape 4 retient la convention la plus répandue en zone franc (déduction des
 * cotisations salariales de l'assiette imposable). Elle DOIT être confirmée
 * pays par pays : elle est signalée dans les notes du bulletin tant que les
 * règles du pays ne sont pas validées.
 */
class PayrollService
{
    public function __construct(
        private PayrollRuleService $referentiel,
        private CurrencyService    $devises,
    ) {}

    /**
     * Ouvre une période de paie. Idempotent : rouvrir un mois déjà ouvert
     * renvoie la période existante plutôt que d'en créer une seconde.
     */
    public function ouvrirPeriode(Organization $org, int $annee, int $mois): object
    {
        $existante = DB::table('payroll_periods')
            ->where('organization_id', $org->id)
            ->where('year', $annee)
            ->where('month', $mois)
            ->first();

        if ($existante) {
            return $existante;
        }

        $debut = Carbon::create($annee, $mois, 1)->startOfMonth();

        $id = DB::table('payroll_periods')->insertGetId([
            'organization_id' => $org->id,
            'year'            => $annee,
            'month'           => $mois,
            'label'           => $this->libellePeriode($debut),
            'period_start'    => $debut->toDateString(),
            'period_end'      => $debut->copy()->endOfMonth()->toDateString(),
            'status'          => 'draft',
            'country_code'    => $this->referentiel->paysDe($org),
            'currency'        => $this->devises->getOrganizationCurrency($org),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        return DB::table('payroll_periods')->find($id);
    }

    /**
     * Calcule (ou recalcule) le bulletin d'un employé pour une période.
     *
     * Un bulletin de période clôturée n'est jamais recalculé : c'est un
     * document remis à l'employé et déclaré aux caisses.
     */
    public function calculerBulletin(Employee $employe, object $periode): array
    {
        if ($periode->status !== 'draft') {
            throw new \RuntimeException(
                "La période « {$periode->label} » est clôturée : ses bulletins ne peuvent plus être recalculés."
            );
        }

        $pays   = $periode->country_code;
        $devise = $periode->currency;
        $fin    = Carbon::parse($periode->period_end);

        // Refuse tout de suite si le pays n'est pas paramétré, plutôt que de
        // produire un bulletin à zéro qui passerait pour un résultat.
        $this->referentiel->assertPaysCouvert($pays, $fin);

        $base = (float) ($employe->base_salary ?? 0);

        if ($base <= 0) {
            throw new \RuntimeException(
                "Aucun salaire de base n'est renseigné pour {$employe->first_name} {$employe->last_name}."
            );
        }

        $rubriques = $this->rubriques($employe->organization_id);

        // ── 1. Brut et assiettes ────────────────────────────────────────────
        $lignes = [[
            'category' => 'earning',
            'code'     => 'BASE',
            'label'    => 'Salaire de base',
            'base'     => null,
            'rate'     => null,
            'amount'   => $base,
            'rule_reference'   => null,
            'is_verified_rule' => true,
            'display_order'    => 0,
        ]];

        $brut = $base;
        $exonereCotisations = 0.0;
        $exonereImpot = 0.0;
        $retenues = 0.0;
        $ordre = 1;

        foreach ($rubriques as $r) {
            $montant = $r->default_amount !== null
                ? (float) $r->default_amount
                : round($base * (float) ($r->percentage_of_base ?? 0) / 100, 2);

            if ($montant == 0.0) {
                continue;
            }

            if ($r->type === 'earning') {
                $brut += $montant;

                if (! $r->subject_to_contributions) {
                    $exonereCotisations += $montant;
                }
                if (! $r->subject_to_income_tax) {
                    $exonereImpot += $montant;
                }

                $lignes[] = [
                    'category' => 'earning',
                    'code'     => $r->code,
                    'label'    => $r->label,
                    'base'     => $r->percentage_of_base !== null ? $base : null,
                    'rate'     => $r->percentage_of_base !== null ? (float) $r->percentage_of_base : null,
                    'amount'   => $montant,
                    'rule_reference'   => null,
                    'is_verified_rule' => true,
                    'display_order'    => $ordre++,
                ];
            } else {
                $retenues += $montant;

                $lignes[] = [
                    'category' => 'deduction',
                    'code'     => $r->code,
                    'label'    => $r->label,
                    'base'     => null,
                    'rate'     => null,
                    'amount'   => $montant,
                    'rule_reference'   => null,
                    'is_verified_rule' => true,
                    'display_order'    => 900 + $ordre++,
                ];
            }
        }

        $assietteCotisations = max(0, $brut - $exonereCotisations);

        // ── 2. Cotisations sociales ─────────────────────────────────────────
        $cotisations = $this->referentiel->calculerCotisations(
            $assietteCotisations, $pays, $fin, $employe->organization_id
        );
        $reglesVerifiees = $cotisations['is_verified'];

        foreach ($cotisations['branches'] as $b) {
            if ($b['employee'] > 0) {
                $lignes[] = [
                    'category' => 'contribution',
                    'code'     => $b['scheme'] . '/' . $b['branch_code'],
                    'label'    => $b['branch'] . ' (part salariale)',
                    'base'     => $b['basis'],
                    'rate'     => $b['employee_rate'],
                    'amount'   => $b['employee'],
                    'rule_reference'   => $b['scheme'] . ' — ' . $b['branch'],
                    'is_verified_rule' => $b['verified'],
                    'display_order'    => 100 + count($lignes),
                ];
            }

            if ($b['employer'] > 0) {
                $lignes[] = [
                    'category' => 'employer_contribution',
                    'code'     => $b['scheme'] . '/' . $b['branch_code'],
                    'label'    => $b['branch'] . ' (part patronale)',
                    'base'     => $b['basis'],
                    'rate'     => $b['employer_rate'],
                    'amount'   => $b['employer'],
                    'rule_reference'   => $b['scheme'] . ' — ' . $b['branch'],
                    'is_verified_rule' => $b['verified'],
                    'display_order'    => 500 + count($lignes),
                ];
            }
        }

        // ── 3. Impôt sur les salaires ───────────────────────────────────────
        $assietteImposable = max(0, $brut - $cotisations['employee'] - $exonereImpot);
        $impot = 0.0;
        $baremeManquant = false;

        try {
            $calculImpot = $this->referentiel->calculerImpot($assietteImposable, $pays, null, $fin);
            $impot = $calculImpot['tax'];
            $reglesVerifiees = $reglesVerifiees && $calculImpot['is_verified'];

            if ($impot > 0) {
                $lignes[] = [
                    'category' => 'tax',
                    'code'     => $calculImpot['code'],
                    'label'    => 'Impôt sur les salaires (' . $calculImpot['code'] . ')',
                    'base'     => $assietteImposable,
                    'rate'     => null,
                    'amount'   => $impot,
                    'rule_reference'   => $calculImpot['code'] . ' — barème progressif',
                    'is_verified_rule' => $calculImpot['is_verified'],
                    'display_order'    => 800,
                ];
            }
        } catch (\Throwable) {
            // Barème non renseigné pour ce pays : le bulletin reste produit,
            // sans impôt, et le signale. Inventer un barème serait pire.
            $baremeManquant = true;
            $reglesVerifiees = false;
        }

        // ── 4. Net ──────────────────────────────────────────────────────────
        $net = round($brut - $cotisations['employee'] - $impot - $retenues, 2);

        return [
            'employee'   => $employe,
            'country'    => $pays,
            'currency'   => $devise,
            'base_salary'            => $base,
            'gross_salary'           => round($brut, 2),
            'contribution_base'      => round($assietteCotisations, 2),
            'taxable_base'           => round($assietteImposable, 2),
            'employee_contributions' => $cotisations['employee'],
            'employer_contributions' => $cotisations['employer'],
            'income_tax'             => $impot,
            'other_deductions'       => round($retenues, 2),
            'net_salary'             => $net,
            'rules_verified'         => $reglesVerifiees,
            'tax_scale_missing'      => $baremeManquant,
            'lines'                  => $lignes,
        ];
    }

    /**
     * Calcule et ENREGISTRE le bulletin. Le recalcul remplace les lignes
     * précédentes : un bulletin en brouillon n'a pas d'historique à préserver.
     */
    public function enregistrerBulletin(Employee $employe, object $periode): int
    {
        $calcul = $this->calculerBulletin($employe, $periode);

        return DB::transaction(function () use ($employe, $periode, $calcul) {
            $existant = DB::table('payslips')
                ->where('payroll_period_id', $periode->id)
                ->where('employee_id', $employe->id)
                ->first();

            $donnees = [
                'organization_id'   => $employe->organization_id,
                'payroll_period_id' => $periode->id,
                'employee_id'       => $employe->id,
                'employee_name'     => trim($employe->first_name . ' ' . $employe->last_name),
                // La colonne réelle est `job_title` — `position` n'existe pas.
                'employee_position' => $employe->job_title ?? null,
                'social_security_number' => $employe->social_security_number ?? null,
                'hire_date'         => $employe->hire_date ?? null,
                'country_code'      => $calcul['country'],
                'currency'          => $calcul['currency'],
                'base_salary'       => $calcul['base_salary'],
                'gross_salary'      => $calcul['gross_salary'],
                'contribution_base' => $calcul['contribution_base'],
                'taxable_base'      => $calcul['taxable_base'],
                'employee_contributions' => $calcul['employee_contributions'],
                'employer_contributions' => $calcul['employer_contributions'],
                'income_tax'        => $calcul['income_tax'],
                'other_deductions'  => $calcul['other_deductions'],
                'net_salary'        => $calcul['net_salary'],
                'rules_verified'    => $calcul['rules_verified'],
                'status'            => 'draft',
                'updated_at'        => now(),
            ];

            if ($existant) {
                DB::table('payslips')->where('id', $existant->id)->update($donnees);
                DB::table('payslip_lines')->where('payslip_id', $existant->id)->delete();
                $id = $existant->id;
            } else {
                $donnees['reference']  = $this->genererReference($periode, $employe);
                $donnees['created_at'] = now();
                $id = DB::table('payslips')->insertGetId($donnees);
            }

            $lignes = array_map(fn ($l) => $l + [
                'payslip_id' => $id,
                'created_at' => now(),
                'updated_at' => now(),
            ], $calcul['lines']);

            DB::table('payslip_lines')->insert($lignes);

            $this->recalculerTotauxPeriode($periode->id);

            return $id;
        });
    }

    /**
     * Calcule les bulletins de tous les employés actifs d'une période.
     *
     * @return array{ok:int, erreurs:array<string>}
     */
    public function calculerPeriodeEntiere(object $periode): array
    {
        $employes = Employee::where('organization_id', $periode->organization_id)
            ->where('status', 'active')
            ->orderBy('last_name')
            ->get();

        $ok = 0;
        $erreurs = [];

        foreach ($employes as $e) {
            try {
                $this->enregistrerBulletin($e, $periode);
                $ok++;
            } catch (\Throwable $ex) {
                // Un employé mal renseigné ne doit pas bloquer toute la paie :
                // on continue et on remonte la liste des cas à traiter.
                $erreurs[] = trim($e->first_name . ' ' . $e->last_name) . ' : ' . $ex->getMessage();
            }
        }

        return ['ok' => $ok, 'erreurs' => $erreurs];
    }

    /**
     * Clôture la période : les bulletins deviennent définitifs.
     */
    public function cloturerPeriode(object $periode, int $parUtilisateur): void
    {
        if ($periode->status !== 'draft') {
            throw new \RuntimeException("La période « {$periode->label} » est déjà clôturée.");
        }

        $bulletins = DB::table('payslips')->where('payroll_period_id', $periode->id)->count();

        if ($bulletins === 0) {
            throw new \RuntimeException(
                "Aucun bulletin n'a été calculé pour « {$periode->label} » : il n'y a rien à clôturer."
            );
        }

        // Une période dont les règles ne sont pas confirmées peut être clôturée,
        // mais l'utilisateur doit l'avoir vu : le drapeau reste sur chaque bulletin.
        DB::transaction(function () use ($periode, $parUtilisateur) {
            DB::table('payslips')->where('payroll_period_id', $periode->id)->update([
                'status'     => 'closed',
                'updated_at' => now(),
            ]);

            DB::table('payroll_periods')->where('id', $periode->id)->update([
                'status'     => 'closed',
                'closed_by'  => $parUtilisateur,
                'closed_at'  => now(),
                'updated_at' => now(),
            ]);
        });
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function rubriques(int $orgId)
    {
        return DB::table('payroll_components')
            ->where('organization_id', $orgId)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();
    }

    private function recalculerTotauxPeriode(int $periodeId): void
    {
        $t = DB::table('payslips')
            ->where('payroll_period_id', $periodeId)
            ->selectRaw('
                COALESCE(SUM(gross_salary), 0)           as brut,
                COALESCE(SUM(employee_contributions), 0) as salariales,
                COALESCE(SUM(employer_contributions), 0) as patronales,
                COALESCE(SUM(income_tax), 0)             as impot,
                COALESCE(SUM(net_salary), 0)             as net
            ')
            ->first();

        DB::table('payroll_periods')->where('id', $periodeId)->update([
            'total_gross'                  => $t->brut,
            'total_employee_contributions' => $t->salariales,
            'total_employer_contributions' => $t->patronales,
            'total_income_tax'             => $t->impot,
            'total_net'                    => $t->net,
            'updated_at'                   => now(),
        ]);
    }

    private function genererReference(object $periode, Employee $employe): string
    {
        return sprintf('BUL-%04d%02d-%05d', $periode->year, $periode->month, $employe->id);
    }

    private function libellePeriode(Carbon $date): string
    {
        $mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        return $mois[$date->month - 1] . ' ' . $date->year;
    }
}
