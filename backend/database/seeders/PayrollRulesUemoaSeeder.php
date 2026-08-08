<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles sociales et fiscales relevées — Côte d'Ivoire, Sénégal, Bénin, Burkina Faso.
 *
 * TOUTES ces valeurs entrent en base avec `is_verified = false`. Elles ont été
 * relevées sur des sources documentées (indiquées ligne par ligne dans `source`),
 * mais elles n'ont PAS été confirmées par un comptable de chaque pays. Tant
 * qu'elles ne le sont pas, tout bulletin ou déclaration qui s'y appuie porte un
 * avertissement visible — c'est le rôle de l'écran « Référentiel pays ».
 *
 * Le niveau de confiance est reporté dans `notes` pour chaque ligne fragile :
 * une valeur « confiance moyenne » ne doit pas être confirmée sans relecture du
 * texte d'origine.
 *
 * Ce seeder est idempotent : il ne réécrit une ligne que si elle n'a pas déjà
 * été confirmée à la main (`is_verified = true`), pour ne jamais écraser le
 * travail de validation d'un comptable.
 */
class PayrollRulesUemoaSeeder extends Seeder
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

        // Les pays qui portent désormais des taux passent en « à confirmer ».
        DB::table('payroll_country_profiles')
            ->whereIn('country_code', ['CI', 'SN', 'BJ', 'BF'])
            ->update(['configuration_status' => 'draft', 'updated_at' => now()]);
    }

    /** N'écrase jamais une ligne déjà confirmée par un humain. */
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

    // =========================================================================
    // Cotisations sociales
    // =========================================================================

    private function cotisations(): array
    {
        $cleiss = fn (string $pays) => "CLEISS — Les cotisations en {$pays} (https://www.cleiss.fr/docs/cotisations/)";

        return [
            // ── CÔTE D'IVOIRE ────────────────────────────────────────────────
            // ⚠️ Correction de fond : l'ancien code appliquait 15,45 % sur le
            // salaire ENTIER. En réalité, seule la retraite porte sur un plafond
            // élevé (45 × SMIG) ; prestations familiales, maternité et accidents
            // du travail sont plafonnés à 70 000 FCFA/mois. Les montants
            // patronaux baissent donc fortement au-delà de ce seuil.
            [
                'country_code' => 'CI', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Assurance vieillesse / pensions',
                'employer_rate' => 7.70, 'employee_rate' => 6.30,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 3375000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $cleiss("Côte d'Ivoire") . ' — données 2025',
                'notes'  => 'Plafond = 45 × SMIG (SMIG 75 000 FCFA depuis janvier 2023). Assiette minimale = SMIG.',
            ],
            [
                'country_code' => 'CI', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales',
                'employer_rate' => 5.00, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 70000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $cleiss("Côte d'Ivoire") . ' — données 2025',
                'notes'  => 'Intégralement patronale. Plafond d\'assiette 70 000 FCFA/mois.',
            ],
            [
                'country_code' => 'CI', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'maternite', 'branch_label' => 'Assurance maternité',
                'employer_rate' => 0.75, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 70000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $cleiss("Côte d'Ivoire") . ' — données 2025',
                'notes'  => 'Souvent présentée avec les prestations familiales (total 5,75 %).',
            ],
            [
                'country_code' => 'CI', 'scheme_code' => 'CNPS',
                'scheme_name'  => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail et maladies professionnelles',
                'employer_rate' => 2.00, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 70000,
                'employer_specific' => true, 'min_rate' => 2.00, 'max_rate' => 5.00, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $cleiss("Côte d'Ivoire") . ' — données 2025',
                'notes'  => 'TAUX PROPRE À CHAQUE EMPLOYEUR : 2 à 5 % selon le risque de l\'activité, '
                          . 'notifié par la CNPS. La valeur 2 % n\'est qu\'un plancher indicatif — '
                          . 'saisir le taux notifié à l\'entreprise.',
            ],

            // ── SÉNÉGAL ──────────────────────────────────────────────────────
            [
                'country_code' => 'SN', 'scheme_code' => 'IPRES',
                'scheme_name'  => 'Institution de Prévoyance Retraite du Sénégal',
                'branch_code'  => 'retraite_general', 'branch_label' => 'Retraite — régime général',
                'employer_rate' => 8.40, 'employee_rate' => 5.60,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 432000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2026-01-01', 'effective_to' => null,
                'source' => $cleiss('Sénégal') . ' — données 2026',
                'notes'  => 'Total 14 %. Porte sur la tranche 0 → 432 000 FCFA.',
            ],
            [
                'country_code' => 'SN', 'scheme_code' => 'IPRES',
                'scheme_name'  => 'Institution de Prévoyance Retraite du Sénégal',
                'branch_code'  => 'retraite_cadre', 'branch_label' => 'Retraite complémentaire des cadres',
                'employer_rate' => 3.60, 'employee_rate' => 2.40,
                'basis' => 'capped_salary', 'monthly_floor' => 432000, 'monthly_ceiling' => 1296000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2026-01-01', 'effective_to' => null,
                'source' => 'Sources secondaires concordantes (guides de paie Sénégal), en vigueur depuis le 01/04/1994 — NON confirmé sur ipres.sn',
                'notes'  => 'CONFIANCE MOYENNE. Réservé aux salariés CADRES, sur la TRANCHE 432 000 → 1 296 000 FCFA. '
                          . 'La distinction cadre / non-cadre n\'est pas encore portée par la fiche employé : '
                          . 'cette branche s\'applique donc à tous tant que ce champ n\'existe pas.',
            ],
            [
                'country_code' => 'SN', 'scheme_code' => 'CSS',
                'scheme_name'  => 'Caisse de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales',
                'employer_rate' => 7.00, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 63000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2026-01-01', 'effective_to' => null,
                'source' => $cleiss('Sénégal') . ' — données 2026',
                'notes'  => 'À ARBITRER : CLEISS indique 7 %, plusieurs calculateurs en ligne annoncent 5 %.',
            ],
            [
                'country_code' => 'SN', 'scheme_code' => 'CSS',
                'scheme_name'  => 'Caisse de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail / maladies professionnelles',
                'employer_rate' => 1.00, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 63000,
                'employer_specific' => true, 'min_rate' => 1.00, 'max_rate' => 5.00, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2026-01-01', 'effective_to' => null,
                'source' => $cleiss('Sénégal') . ' — données 2026',
                'notes'  => 'TAUX PROPRE À CHAQUE EMPLOYEUR : 1 %, 3 % ou 5 % selon le risque encouru.',
            ],

            // ── BÉNIN ────────────────────────────────────────────────────────
            [
                'country_code' => 'BJ', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, décès)',
                'employer_rate' => 6.40, 'employee_rate' => 3.60,
                'basis' => 'gross_salary', 'monthly_floor' => null, 'monthly_ceiling' => null,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2024-01-01', 'effective_to' => null,
                'source' => 'CNSS Bénin (cnss.bj, procédure de recouvrement) + ' . $cleiss('Bénin') . ' — taux au 01/01/2024',
                'notes'  => 'Total 10 %. PLAFOND NON DÉTERMINÉ : aucune source officielle n\'en mentionne, '
                          . 'des sources secondaires évoquent 1 500 000 FCFA/mois. Laissé sans plafond — à trancher.',
            ],
            [
                'country_code' => 'BJ', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales',
                'employer_rate' => 9.00, 'employee_rate' => 0.00,
                'basis' => 'gross_salary', 'monthly_floor' => null, 'monthly_ceiling' => null,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2024-01-01', 'effective_to' => null,
                'source' => 'CNSS Bénin (cnss.bj) + ' . $cleiss('Bénin') . ' — taux au 01/01/2024',
                'notes'  => 'Intégralement patronale.',
            ],
            [
                'country_code' => 'BJ', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Risques professionnels',
                'employer_rate' => 1.00, 'employee_rate' => 0.00,
                'basis' => 'gross_salary', 'monthly_floor' => null, 'monthly_ceiling' => null,
                'employer_specific' => true, 'min_rate' => 1.00, 'max_rate' => 4.00, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2024-01-01', 'effective_to' => null,
                'source' => 'CNSS Bénin (cnss.bj) + ' . $cleiss('Bénin') . ' — taux au 01/01/2024',
                'notes'  => 'TAUX PROPRE À CHAQUE EMPLOYEUR : 1 à 4 % selon la nature de l\'activité.',
            ],

            // ── BURKINA FASO ─────────────────────────────────────────────────
            [
                'country_code' => 'BF', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Assurance vieillesse',
                'employer_rate' => 8.50, 'employee_rate' => 5.50,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 800000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2023-02-24', 'effective_to' => null,
                'source' => 'CNSS Burkina Faso (cnssbf.org) — décret n°2023-0129 du 24/02/2023 ; plafond : arrêté n°2022-067 du 30/08/2022',
                'notes'  => 'Total 14 %. Répartition modifiée par le décret de 2023 (auparavant 5,5 / 5,5).',
            ],
            [
                'country_code' => 'BF', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales',
                'employer_rate' => 6.00, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 800000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2023-02-24', 'effective_to' => null,
                'source' => 'CNSS Burkina Faso (cnssbf.org) — décret n°2023-0129 du 24/02/2023',
                'notes'  => 'Intégralement patronale (7 % avant le décret de 2023).',
            ],
            [
                'country_code' => 'BF', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Risques professionnels',
                'employer_rate' => 1.50, 'employee_rate' => 0.00,
                'basis' => 'capped_salary', 'monthly_floor' => null, 'monthly_ceiling' => 800000,
                'employer_specific' => false, 'min_rate' => null, 'max_rate' => null, 'flat_amount' => null,
                'currency' => 'XOF', 'effective_from' => '2023-02-24', 'effective_to' => null,
                'source' => 'CNSS Burkina Faso (cnssbf.org) — décret n°2023-0129 du 24/02/2023',
                'notes'  => 'Taux UNIQUE annoncé par la caisse (3,5 % avant 2023) — pas de modulation par risque, '
                          . 'contrairement aux trois autres pays.',
            ],
        ];
    }

    // =========================================================================
    // Barèmes d'impôt sur les salaires
    // =========================================================================

    private function baremes(): array
    {
        $lignes = [];

        // ── CÔTE D'IVOIRE — ITS mensuel ─────────────────────────────────────
        $srcCI = 'CGI Côte d\'Ivoire art. 119 bis (ord. n°2023-719 du 13/09/2023) ; PwC Worldwide Tax Summaries, revu le 11/03/2026';
        foreach ([
            [0, 75000, 0.00], [75001, 240000, 16.00], [240001, 800000, 21.00],
            [800001, 2400000, 24.00], [2400001, 8000000, 28.00], [8000001, null, 32.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'CI', 'tax_code' => 'ITS',
                'tax_name' => 'Impôt sur les traitements, salaires, pensions et rentes viagères',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'monthly',
                'effective_from' => '2024-01-01', 'effective_to' => null,
                'source' => $srcCI,
                'notes'  => 'Réforme du 01/01/2024 : IS-salaires, Contribution Nationale et IGR fusionnés en un ITS unique. '
                          . 'Base = salaire BRUT, sans abattement de 20 % ni division par parts. Les charges de famille '
                          . 'donnent une réduction d\'impôt (RICF, art. 120) de 5 500 FCFA par demi-part au-delà de la '
                          . 'première, plafonnée à 5 parts — NON encore implémentée dans le moteur.',
            ];
        }

        // ── SÉNÉGAL — IR annuel ─────────────────────────────────────────────
        $srcSN = 'CGI Sénégal art. 173 (loi n°2022-19 du 27/05/2022) ; PwC Worldwide Tax Summaries, revu le 07/08/2026';
        foreach ([
            [0, 630000, 0.00], [630001, 1500000, 20.00], [1500001, 4000000, 30.00],
            [4000001, 8000000, 35.00], [8000001, 13500000, 37.00],
            [13500001, 50000000, 40.00], [50000001, null, 43.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'SN', 'tax_code' => 'IR',
                'tax_name' => 'Impôt sur le revenu — traitements et salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'yearly',
                'effective_from' => '2022-05-27', 'effective_to' => null,
                'source' => $srcSN,
                'notes'  => 'BARÈME ANNUEL — la mensualisation officielle de la DGID n\'est pas un simple ÷12 et reste à '
                          . 'confirmer. Abattement art. 168 b : 30 % du brut, couvrant À LA FOIS les cotisations de '
                          . 'retraite ET les frais professionnels, plafonné à 900 000 FCFA/an — l\'IPRES ne se déduit donc '
                          . 'PAS en plus. Réduction pour charges de famille appliquée sur l\'impôt (art. 174), avec '
                          . 'planchers et plafonds par nombre de parts. Impôt plafonné à 43 % du revenu imposable. '
                          . 'TRIMF forfaitaire en sus (art. 282). CFCE patronale de 3 % de la masse salariale.',
            ];
        }

        // ── BÉNIN — ITS mensuel ─────────────────────────────────────────────
        $srcBJ = 'Code général des impôts du Bénin 2025, art. 125-1 — PDF officiel finances.bj (texte lu directement)';
        foreach ([
            [0, 60000, 0.00], [60001, 150000, 10.00], [150001, 250000, 15.00],
            [250001, 500000, 19.00], [500001, null, 30.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'BJ', 'tax_code' => 'ITS',
                'tax_name' => 'Impôt sur les traitements et salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'monthly',
                'effective_from' => '2025-01-01', 'effective_to' => null,
                'source' => $srcBJ,
                'notes'  => 'La 4e tranche est bien à 19 % (et non 20 %, valeur qui circule à tort). Base art. 122 : '
                          . '« montants BRUTS », y compris indemnités de transport et avantages en nature. Aucun '
                          . 'abattement pour frais professionnels ni réduction pour charges de famille (supprimée par la '
                          . 'LF 2020). ⚠️ À TRANCHER : la cotisation salariale CNSS de 3,6 % est-elle déductible de la '
                          . 'base ? Le CGI dit « brut », la pratique de paie déduit — cet arbitrage change chaque net. '
                          . 'Redevance ORTB en sus (mars et juin). VPS patronale de 4 %, même assiette.',
            ];
        }

        // ── BURKINA FASO — IUTS mensuel ─────────────────────────────────────
        $srcBF = 'Barème du 01/10/2013, repris par des sources professionnelles burkinabè jusqu\'en 2024 — NON vérifié dans le CGI (art. 107-114)';
        foreach ([
            [0, 30000, 0.00], [30100, 50000, 12.10], [50100, 80000, 13.90],
            [80100, 120000, 15.70], [120100, 170000, 18.40],
            [170100, 250000, 21.70], [250100, null, 25.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'BF', 'tax_code' => 'IUTS',
                'tax_name' => 'Impôt unique sur les traitements et salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'monthly',
                'effective_from' => '2013-10-01', 'effective_to' => null,
                'source' => $srcBF,
                'notes'  => '⚠️ CONFIANCE LA PLUS FAIBLE DE L\'ENSEMBLE. Le texte du CGI n\'a pas pu être consulté '
                          . '(site DGI inaccessible) ; un calculateur récent suggère une structure à 6 tranches jusqu\'à '
                          . '27,5 %, non confirmée. À RELIRE dans le CGI avant tout usage. Bornes atypiques (30 100, '
                          . '50 100…) supposant un arrondi à la centaine, mécanisme non sourcé. Base : brut diminué des '
                          . 'exonérations d\'indemnités (logement, fonction, transport), des retenues de retraite dans la '
                          . 'limite de 8 % du salaire de base (la CNSS salariale de 5,5 % est donc déductible), et d\'un '
                          . 'abattement de 25 % pour frais professionnels (20 % pour les catégories supérieures). '
                          . 'Réductions pour charges de famille sur l\'impôt : 8 / 10 / 12 / 14 % pour 1 à 4 charges.',
            ];
        }

        return $lignes;
    }
}
