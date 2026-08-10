<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles sociales relevées — Tchad, République centrafricaine, Guinée équatoriale.
 *
 * Trois pays nettement moins documentés que l'UEMOA. Le relevé a conduit à
 * trois traitements différents, assumés :
 *
 *  - **RCA** : le mieux documenté des trois, grâce au texte intégral du Code
 *    général des impôts (édition DGID mise à jour 2023). Cotisations ET barème
 *    encodés, y compris la Contribution de Développement Social — un impôt
 *    patronal de 10 % non plafonné, souvent oublié, qui pèse plus lourd qu'une
 *    branche de cotisation.
 *
 *  - **Tchad** : cotisations encodées (trois sources concordantes), **barème
 *    IRPP VOLONTAIREMENT NON ENCODÉ**. Deux barèmes incompatibles circulent —
 *    six tranches selon PwC, quatre selon la loi de finances 2018 — et le texte
 *    du CGI n'a pas pu être consulté. L'écart porte sur les salaires moyens et
 *    hauts : encoder l'un des deux au hasard produirait des retenues fausses.
 *    Le moteur refusera donc de calculer l'impôt tchadien, et le dira.
 *
 *  - **Guinée équatoriale** : cotisation encodée en **taux GLOBAL** (21,5 %
 *    patronal / 4,5 % salarial, plus le Fonds de protection du travail). La
 *    ventilation par branche n'est publiée nulle part, et le plafond d'assiette
 *    est contredit entre sources — le SSA dit qu'il n'y en a pas, la CIPRES
 *    annonce 120 000 FCFA, montant inférieur au salaire minimum du pays donc
 *    vraisemblablement obsolète. Aucun plafond retenu, à faire trancher.
 *
 * Comme pour l'UEMOA, tout entre avec `is_verified = false`.
 */
class PayrollRulesCemacSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->cotisations() as $ligne) {
            $this->poser('payroll_contribution_rules', [
                'country_code'   => $ligne['country_code'],
                'scheme_code'    => $ligne['scheme_code'],
                'branch_code'    => $ligne['branch_code'],
                'effective_from' => $ligne['effective_from'],
            ], $ligne);
        }

        foreach ($this->baremes() as $ligne) {
            $this->poser('payroll_tax_brackets', [
                'country_code'   => $ligne['country_code'],
                'tax_code'       => $ligne['tax_code'],
                'lower_bound'    => $ligne['lower_bound'],
                'effective_from' => $ligne['effective_from'],
            ], $ligne);
        }

        DB::table('payroll_country_profiles')
            ->whereIn('country_code', ['TD', 'CF', 'GQ'])
            ->update(['configuration_status' => 'draft', 'updated_at' => now()]);
    }

    private function poser(string $table, array $cle, array $valeurs): void
    {
        $existante = DB::table($table)->where($cle)->first();

        if ($existante && $existante->is_verified) {
            return;
        }

        $valeurs['is_verified'] = false;
        $valeurs['updated_at']  = now();

        if ($existante) {
            DB::table($table)->where('id', $existante->id)->update($valeurs);

            return;
        }

        $valeurs['created_at'] = now();
        DB::table($table)->insert($valeurs);
    }

    private function base(array $specifique): array
    {
        return array_merge([
            'monthly_floor'     => null,
            'monthly_ceiling'   => null,
            'employer_specific' => false,
            'min_rate'          => null,
            'max_rate'          => null,
            'flat_amount'       => null,
            'basis'             => 'gross_salary',
            'currency'          => 'XAF',
            'effective_to'      => null,
            'employee_rate'     => 0.00,
        ], $specifique);
    }

    private function cotisations(): array
    {
        $srcTD = 'Décrets n°1634 à 1636/PR/PM/MFPT/09 du 04/12/2009 (via CIPRES) ; PwC Worldwide Tax Summaries — Tchad, revu le 12/08/2024 ; SSA Social Security Programs Throughout the World: Africa 2019';
        $srcCF = 'SSA Social Security Programs Throughout the World: Africa 2019, fiche Centrafrique ; cnsscentrafrique.org — loi n°06.034 du 28/12/2006 (Code de sécurité sociale)';
        $srcGQ = 'PwC Worldwide Tax Summaries — Guinée équatoriale, revu le 21/11/2025 ; SSA Africa 2019 ; CIPRES, fiche INSESO';

        return [
            // ── TCHAD ────────────────────────────────────────────────────────
            $this->base([
                'country_code' => 'TD', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, décès)',
                'employer_rate' => 5.00, 'employee_rate' => 3.50,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2009-12-04', 'source' => $srcTD,
                'notes' => 'Seule branche à part salariale. Total 8,5 %. La part salariale est déductible de la base IRPP. '
                         . 'Plafond issu du décret n°1137/PR/PM/MFPT/SG/DTSS/07 du 28/12/2007, aucune revalorisation confirmée depuis.',
            ]),
            $this->base([
                'country_code' => 'TD', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales et maternité',
                'employer_rate' => 7.50,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2009-12-04', 'source' => $srcTD,
                'notes' => 'Finance aussi les prestations maternité en espèces. Ne pas confondre avec la taxe forfaitaire '
                         . 'sur les salaires de 7,5 %, qui est un impôt d\'État distinct et non plafonné.',
            ]),
            $this->base([
                'country_code' => 'TD', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail et maladies professionnelles',
                'employer_rate' => 4.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2009-12-04', 'source' => $srcTD,
                'notes' => 'Taux unique, non modulé par classe de risque selon les trois sources.',
            ]),
            $this->base([
                'country_code' => 'TD', 'scheme_code' => 'DGI',
                'scheme_name'  => 'Direction Générale des Impôts — taxe forfaitaire sur les salaires',
                'branch_code'  => 'taxe_salaires', 'branch_label' => 'Taxe forfaitaire sur les salaires',
                'employer_rate' => 7.50,
                'effective_from' => '2024-01-01',
                'source' => 'PwC Worldwide Tax Summaries — Tchad, Corporate/Other taxes, revu le 12/08/2024',
                'notes' => 'CONFIANCE MOYENNE. Impôt d\'État distinct des cotisations CNPS, NON plafonné, assis sur les '
                         . 'salaires et avantages en nature des permanents. Base légale (article du CGI) non identifiée.',
            ]),

            // ── RÉPUBLIQUE CENTRAFRICAINE ────────────────────────────────────
            $this->base([
                'country_code' => 'CF', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, survivants)',
                'employer_rate' => 4.00, 'employee_rate' => 3.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 600000,
                'effective_from' => '2019-01-01', 'source' => $srcCF,
                'notes' => 'Seule branche à part salariale. Assiette plancher = SMIG. Plafond sourcé par le SSA (2019), '
                         . 'non reconfirmé par la CNSS.',
            ]),
            $this->base([
                'country_code' => 'CF', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales et maternité',
                'employer_rate' => 12.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 600000,
                'effective_from' => '2019-01-01', 'source' => $srcCF,
                'notes' => 'Finance également les prestations maternité en espèces.',
            ]),
            $this->base([
                'country_code' => 'CF', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Risques professionnels',
                'employer_rate' => 3.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 600000,
                'effective_from' => '2019-01-01', 'source' => $srcCF,
                'notes' => 'Taux unique, non modulé par risque d\'après les deux sources.',
            ]),
            $this->base([
                'country_code' => 'CF', 'scheme_code' => 'CDS',
                'scheme_name'  => 'Contribution de Développement Social (impôt patronal, DGID)',
                'branch_code'  => 'developpement_social', 'branch_label' => 'Contribution de Développement Social',
                'employer_rate' => 10.00,
                'effective_from' => '2023-01-01',
                'source' => 'Code Général des Impôts RCA, édition officielle 2017 mise à jour 2023/DGID, art. 237 à 243 (art. 243 : taux fixé à 10 %)',
                'notes' => 'CONFIANCE HAUTE (texte officiel). NON PLAFONNÉE. Impôt patronal sur la masse salariale, '
                         . 'déclarable avant le 15 de chaque mois. Souvent oubliée alors qu\'elle pèse plus qu\'une '
                         . 'branche de cotisation : 10 % sur la totalité du salaire.',
            ]),

            // ── GUINÉE ÉQUATORIALE ───────────────────────────────────────────
            $this->base([
                'country_code' => 'GQ', 'scheme_code' => 'INSESO',
                'scheme_name'  => 'Instituto de Seguridad Social',
                'branch_code'  => 'global', 'branch_label' => 'Cotisation globale (toutes branches confondues)',
                'employer_rate' => 21.50, 'employee_rate' => 4.50,
                'effective_from' => '2025-01-01', 'source' => $srcGQ,
                'notes' => 'TAUX GLOBAL, non ventilé : la répartition employeur/salarié par branche (maladie 12 %, '
                         . 'familiales 7 %, retraite 5 %, AT 2 %) n\'est publiée par aucune source. Les déclarations '
                         . 'branche par branche sont donc impossibles en l\'état. ⚠️ PLAFOND CONTREDIT : le SSA affirme '
                         . 'qu\'il n\'y en a pas, la CIPRES annonce 120 000 FCFA — montant inférieur au salaire minimum '
                         . 'du pays, donc vraisemblablement obsolète. Aucun plafond retenu : à faire trancher par l\'INSESO.',
            ]),
            $this->base([
                'country_code' => 'GQ', 'scheme_code' => 'FPL',
                'scheme_name'  => 'Fondo de Protección Laboral',
                'branch_code'  => 'protection_travail', 'branch_label' => 'Fonds de protection du travail',
                'employer_rate' => 1.00, 'employee_rate' => 0.50,
                'effective_from' => '2025-01-01',
                'source' => 'PwC Worldwide Tax Summaries — Guinée équatoriale, revu le 21/11/2025',
                'notes' => 'Fonds distinct de l\'INSESO. Charge totale : employeur 22,5 %, salarié 5 %.',
            ]),
        ];
    }

    private function baremes(): array
    {
        $lignes = [];

        // ── RCA — IRPP, barème annuel (texte officiel) ───────────────────────
        $srcCF = 'Code Général des Impôts RCA, édition officielle 2017 mise à jour 2023/DGID, art. 86';
        foreach ([
            [0, 378000, 0.00], [378001, 1680000, 8.00], [1680001, 3360000, 15.00],
            [3360001, 5040000, 28.00], [5040001, null, 40.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'CF', 'tax_code' => 'IRPP',
                'tax_name' => 'Impôt sur le Revenu des Personnes Physiques — traitements et salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XAF', 'period' => 'yearly',
                'effective_from' => '2023-01-01', 'effective_to' => null,
                'source' => $srcCF,
                'notes' => 'Barème ANNUEL. La retenue mensuelle applique explicitement « le barème ramené au mois » '
                         . '(art. 110), soit le barème annuel divisé par 12 — c\'est le seul des trois pays où le '
                         . 'mécanisme est écrit noir sur blanc. Assiette : brut moins abattement forfaitaire de 30 % '
                         . 'pour frais professionnels (art. 38, sans plafond mentionné), moins allocations familiales '
                         . 'et cotisations CNSS (art. 39). Aucun quotient familial sur les salaires. '
                         . '⚠️ Le texte officiel imprime « 0- 378.0000 » (un zéro de trop) à l\'art. 86 : 378 000 retenu '
                         . 'car la tranche suivante commence à 378 001, mais à confirmer auprès de la DGID.',
            ];
        }

        // ── GUINÉE ÉQUATORIALE — IRPF, barème annuel (Ley 1/2024) ───────────
        $srcGQ = 'PwC Worldwide Tax Summaries — Guinée équatoriale, revu le 21/11/2025 (nouveau Código Tributario, Ley n°1/2024, en vigueur au 01/01/2025)';
        foreach ([
            [0, 1400000, 0.00], [1400001, 5000000, 10.00], [5000001, 10000000, 15.00],
            [10000001, 15000000, 20.00], [15000001, null, 25.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'GQ', 'tax_code' => 'IRPF',
                'tax_name' => 'Impuesto sobre Sueldos y Salarios',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XAF', 'period' => 'yearly',
                'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $srcGQ,
                'notes' => 'Réforme 2025. Le seuil exonéré (1 400 000) et le taux plafond (25 %) sont confirmés par la '
                         . 'presse locale ; les TRANCHES INTERMÉDIAIRES reposent sur une source unique (PwC) — le texte '
                         . 'de la Ley n°1/2024 n\'a pas été trouvé en ligne. Déductions de l\'ancien code (cotisations '
                         . 'sociales salariales, abattement de 20 % plafonné à 1 000 000 FCFA/an) : maintien sous le '
                         . 'nouveau code NON VÉRIFIÉ.',
            ];
        }

        // ── TCHAD : AUCUN BARÈME ────────────────────────────────────────────
        // Deux barèmes incompatibles circulent (6 tranches PwC vs 4 tranches
        // LF 2018) et le CGI n'a pas pu être consulté. Encoder l'un des deux
        // produirait des retenues fausses sur les salaires moyens et hauts.
        // Le moteur refusera de calculer l'impôt tchadien tant que le barème
        // n'aura pas été relevé sur le texte — c'est le comportement voulu.

        return $lignes;
    }
}
