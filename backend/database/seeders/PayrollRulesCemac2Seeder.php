<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles sociales relevées — Cameroun, Gabon, Congo-Brazzaville.
 *
 * Deux décisions de prudence, du même ordre que celle prise pour le Tchad :
 *
 *  - **Le barème gabonais n'est PAS encodé.** L'IRPP du Gabon ne se calcule pas
 *    par tranches marginales cumulées mais par la formule `impôt = taux × Q −
 *    constante`, où Q est le quotient familial (revenu abattu ÷ nombre de
 *    parts, jusqu'à 6). Le moteur applique des tranches marginales : il
 *    produirait un montant faux. Encoder les bornes reviendrait à donner une
 *    apparence de justesse à un calcul erroné. À traiter le jour où le moteur
 *    saura appliquer un quotient familial.
 *
 *  - **Le Congo est le mieux sourcé des trois** : le barème vient du texte
 *    lui-même (loi n°42-2025 du 31/12/2025, art. 116 G-1, lu dans le PDF
 *    officiel du ministère des finances). Il porte le même quotient familial —
 *    et c'est important : **la presse a écrit que la réforme 2026 supprimait
 *    les parts, le texte de loi dit le contraire** (art. 116 A à 116 C). Les
 *    tranches sont encodées, mais le quotient reste à implémenter.
 *
 * Tout entre avec `is_verified = false`.
 */
class PayrollRulesCemac2Seeder extends Seeder
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
            ->whereIn('country_code', ['CM', 'GA', 'CG'])
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
        $srcCM = 'Décret n°2016/072 du 15/02/2016 ; CNPS Cameroun (cnps.cm) ; CLEISS au 01/01/2024 ; PwC Worldwide Tax Summaries — Cameroun, revu le 31/12/2025';
        $srcGA = 'Décret n°0487/PR/MASI du 18/12/2025 (loi n°037/2023) ; CLEISS — taux au 01/01/2026';
        $srcCG = 'CLEISS — Les cotisations au Congo (taux au 01/01/2023) ; PwC Worldwide Tax Summaries — Congo, revu le 07/08/2026';

        return [
            // ── CAMEROUN ─────────────────────────────────────────────────────
            $this->base([
                'country_code' => 'CM', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pension de vieillesse, invalidité, décès (PVID)',
                'employer_rate' => 4.20, 'employee_rate' => 4.20,
                'basis' => 'capped_salary', 'monthly_ceiling' => 750000,
                'effective_from' => '2016-02-15', 'source' => $srcCM,
                'notes' => 'Total 8,4 %. Plafond 750 000 FCFA/mois (9 000 000/an). Part salariale déductible de la base IRPP.',
            ]),
            $this->base([
                'country_code' => 'CM', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales — régime général',
                'employer_rate' => 7.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 750000,
                'effective_from' => '2016-02-15', 'source' => $srcCM,
                'notes' => 'Régime général. Autres régimes : agricole 5,65 %, enseignement privé 3,70 % — à créer en '
                         . 'branches distinctes si l\'organisation en relève.',
            ]),
            $this->base([
                'country_code' => 'CM', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail (groupe de risque)',
                'employer_rate' => 1.75,
                'employer_specific' => true, 'min_rate' => 1.75, 'max_rate' => 5.00,
                'effective_from' => '2016-02-15', 'source' => $srcCM . ' ; décret n°78/283 du 10/07/1978',
                'notes' => 'TAUX PROPRE À CHAQUE EMPLOYEUR selon le groupe de risque : A 1,75 %, B 2,5 %, C 5 %. '
                         . 'La nomenclature officielle des activités par groupe n\'a pas été retrouvée. '
                         . '⚠️ PLAFOND À TRANCHER : CLEISS et les guides employeurs indiquent une assiette NON plafonnée '
                         . 'pour cette branche, une source de presse dit l\'inverse. Laissé sans plafond.',
            ]),
            $this->base([
                'country_code' => 'CM', 'scheme_code' => 'CFC',
                'scheme_name'  => 'Crédit Foncier du Cameroun',
                'branch_code'  => 'logement', 'branch_label' => 'Contribution au Crédit Foncier (fonds logement)',
                'employer_rate' => 1.50, 'employee_rate' => 1.00,
                'effective_from' => '2025-12-31',
                'source' => 'PwC Worldwide Tax Summaries — Cameroun, revu le 31/12/2025',
                'notes' => 'Assis sur le salaire taxable, non plafonné.',
            ]),
            $this->base([
                'country_code' => 'CM', 'scheme_code' => 'FNE',
                'scheme_name'  => 'Fonds National de l\'Emploi',
                'branch_code'  => 'emploi', 'branch_label' => 'Contribution au Fonds National de l\'Emploi',
                'employer_rate' => 1.00,
                'effective_from' => '2025-12-31',
                'source' => 'PwC Worldwide Tax Summaries — Cameroun, revu le 31/12/2025',
                'notes' => 'Assis sur le salaire taxable, non plafonné.',
            ]),

            // ── GABON ────────────────────────────────────────────────────────
            $this->base([
                'country_code' => 'GA', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, décès)',
                'employer_rate' => 11.00, 'employee_rate' => 5.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 1500000,
                'effective_from' => '2026-01-01', 'source' => $srcGA,
                'notes' => 'NOUVEAUX TAUX au 01/01/2026 (décret de décembre 2025). ⚠️ DATE D\'EFFET RÉELLE À VÉRIFIER : '
                         . 'la CNSS aurait annoncé la première cotisation aux nouveaux taux pour le 30/04/2026 — '
                         . 'savoir si les paies de janvier à mars doivent être régularisées.',
            ]),
            $this->base([
                'country_code' => 'GA', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales et maternité',
                'employer_rate' => 5.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 1500000,
                'effective_from' => '2026-01-01', 'source' => $srcGA,
                'notes' => 'Intégralement patronale.',
            ]),
            $this->base([
                'country_code' => 'GA', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail et maladies professionnelles',
                'employer_rate' => 2.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 1500000,
                'effective_from' => '2026-01-01', 'source' => $srcGA,
                'notes' => 'Taux unique — pas de catégories de risque au Gabon.',
            ]),
            $this->base([
                'country_code' => 'GA', 'scheme_code' => 'CNAMGS',
                'scheme_name'  => 'Caisse Nationale d\'Assurance Maladie et de Garantie Sociale',
                'branch_code'  => 'maladie', 'branch_label' => 'Assurance maladie obligatoire',
                'employer_rate' => 4.10, 'employee_rate' => 2.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 2500000,
                'effective_from' => '2026-01-01',
                'source' => 'CLEISS — Les cotisations au Gabon, taux au 01/01/2026',
                'notes' => '⚠️ TAUX SALARIAL À TRANCHER EN PRIORITÉ : CLEISS 2026 indique 2 %, une source de 2015 '
                         . 'indiquait 1 % pour le privé. C\'est une ligne de bulletin — à confirmer avant production.',
            ]),

            // ── CONGO-BRAZZAVILLE ────────────────────────────────────────────
            $this->base([
                'country_code' => 'CG', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, décès)',
                'employer_rate' => 8.00, 'employee_rate' => 4.00,
                'basis' => 'capped_salary', 'monthly_ceiling' => 1200000,
                'effective_from' => '2023-01-01', 'source' => $srcCG,
                'notes' => 'Plafond confirmé par l\'art. 116 du CGI tel que modifié en 2026. Part salariale déductible '
                         . 'de la base ITS.',
            ]),
            $this->base([
                'country_code' => 'CG', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Allocations familiales',
                'employer_rate' => 10.03,
                'basis' => 'capped_salary', 'monthly_ceiling' => 600000,
                'effective_from' => '2023-01-01', 'source' => $srcCG,
                'notes' => 'CONFIANCE MOYENNE : source datée du 01/01/2023, le site de la CNSS ne publie pas de barème. '
                         . 'À confirmer auprès de la caisse.',
            ]),
            $this->base([
                'country_code' => 'CG', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail et maladies professionnelles',
                'employer_rate' => 2.25,
                'basis' => 'capped_salary', 'monthly_ceiling' => 600000,
                'effective_from' => '2023-01-01', 'source' => $srcCG,
                'notes' => 'CONFIANCE MOYENNE, même réserve que les allocations familiales. Taux unique.',
            ]),
            $this->base([
                'country_code' => 'CG', 'scheme_code' => 'CAMU',
                'scheme_name'  => 'Caisse d\'Assurance Maladie Universelle',
                'branch_code'  => 'solidarite_maladie', 'branch_label' => 'Contribution de solidarité (assurance maladie)',
                'employer_rate' => 0.00, 'employee_rate' => 0.50,
                'basis' => 'capped_salary', 'monthly_floor' => 500000,
                'effective_from' => '2023-01-01',
                'source' => 'CAMU Congo (camu-congo.fr) ; ministère de la Santé (sante.gouv.cg)',
                'notes' => 'Prélevée UNIQUEMENT sur la fraction de rémunération dépassant 500 000 FCFA — d\'où le '
                         . 'plancher d\'assiette. Non déductible de la base ITS. '
                         . '⚠️ Le RAMU (4,55 % / 2,27 %) figure chez CLEISS mais AUCUNE source praticienne récente ne le '
                         . 'voit sur les bulletins : NON encodé, à confirmer localement avant de l\'ajouter.',
            ]),
            $this->base([
                'country_code' => 'CG', 'scheme_code' => 'TUS',
                'scheme_name'  => 'Taxe Unique sur les Salaires (impôt patronal)',
                'branch_code'  => 'taxe_salaires', 'branch_label' => 'Taxe unique sur les salaires',
                'employer_rate' => 7.50,
                'effective_from' => '2026-01-01',
                'source' => 'PwC Worldwide Tax Summaries — Congo, revu le 07/08/2026',
                'notes' => 'Assise sur le salaire brut total, non plafonnée. Remplace la taxe forfaitaire. '
                         . '⚠️ Vérifier qu\'elle absorbe bien le Fonds national de l\'habitat (2 %) et le fonds '
                         . 'd\'apprentissage (0,5 %) que CLEISS liste séparément — sinon double comptage.',
            ]),
        ];
    }

    private function baremes(): array
    {
        $lignes = [];

        // ── CAMEROUN — IRPP annuel ──────────────────────────────────────────
        $srcCM = 'CGI Cameroun, barème IRPP traitements et salaires ; recoupé par PwC Worldwide Tax Summaries — Cameroun, revu le 31/12/2025';
        foreach ([
            [0, 2000000, 10.00], [2000001, 3000000, 15.00],
            [3000001, 5000000, 25.00], [5000001, null, 35.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'CM', 'tax_code' => 'IRPP',
                'tax_name' => 'Impôt sur le Revenu des Personnes Physiques — traitements et salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XAF', 'period' => 'yearly',
                'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $srcCM,
                'notes' => 'Barème ANNUEL, retenue mensuelle en divisant les bornes par 12. PAS de quotient familial au '
                         . 'Cameroun. Assiette : brut taxable − CNPS salariale (4,2 % plafonnée) − abattement de 30 % '
                         . 'pour frais professionnels − abattement annuel de 500 000 FCFA. Base arrondie au millier '
                         . 'inférieur. TAXES ADDITIONNELLES NON ENCODÉES : centimes additionnels communaux (CAC) = 10 % '
                         . 'de l\'IRPP dû ; TDL (taxe de développement local) et RAV (redevance audiovisuelle), toutes '
                         . 'deux forfaitaires par tranche de salaire — le moteur ne sait pas encore appliquer un '
                         . 'forfait par tranche.',
            ];
        }

        // ── CONGO — ITS annuel (texte de loi lu) ────────────────────────────
        $srcCG = 'Loi n°42-2025 du 31/12/2025 (loi de finances 2026), art. 116 G-1 du CGI — PDF officiel finances.gouv.cg, texte lu directement';
        foreach ([
            [0, 615000, 0.00], [615001, 1500000, 10.00], [1500001, 3500000, 15.00],
            [3500001, 5000000, 20.00], [5000001, null, 30.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'CG', 'tax_code' => 'ITS',
                'tax_name' => 'Impôt sur les Traitements et Salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XAF', 'period' => 'yearly',
                'effective_from' => '2026-01-01', 'effective_to' => null,
                'source' => $srcCG,
                'notes' => 'CONFIANCE HAUTE — barème lu dans le texte de loi. Remplace la catégorie « traitements et '
                         . 'salaires » de l\'IRPP au 01/01/2026. Barème ANNUEL PAR PART. Assiette (art. 116) : brut − '
                         . 'CNSS retraite salariale (4 %, plafonnée) − abattement de 20 %. '
                         . '⚠️ LE QUOTIENT FAMILIAL EST MAINTENU (art. 116 A à C) : la presse a écrit le contraire, le '
                         . 'texte de loi conserve le tableau des parts (1 à 6,5). Le moteur ne l\'applique pas encore : '
                         . 'l\'impôt calculé est donc celui d\'UNE part. Minimum d\'impôt de 1 200 FCFA/an si le brut '
                         . 'est inférieur au SMIG. Contribution CAMU de 0,5 % non déductible de cette base.',
            ];
        }

        // ── GABON : AUCUN BARÈME ────────────────────────────────────────────
        // L'IRPP gabonais se calcule `taux × quotient − constante`, pas par
        // tranches marginales cumulées. Le moteur produirait un montant faux :
        // mieux vaut un refus explicite qu'un chiffre plausible et erroné.

        return $lignes;
    }
}
