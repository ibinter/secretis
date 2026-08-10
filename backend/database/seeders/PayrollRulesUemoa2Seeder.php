<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Règles sociales relevées — Mali, Niger, Togo, Guinée-Bissau.
 *
 * Le relevé a corrigé quatre erreurs de la fiche pays initiale :
 *  - **Guinée-Bissau** : l'impôt n'est PAS l'IRPS mais l'**Imposto Profissional**
 *    (système cédulaire du Decreto 23/83). Le pays n'a pas fait la réforme
 *    IRPS/IRPC, contrairement à l'Angola ou au Cap-Vert.
 *  - **Togo** : l'INAM ne couvre pas le privé. Depuis le 01/01/2024 c'est
 *    l'**AMU**, collectée par la CNSS.
 *  - **Togo** : aucun plafond de cotisation (art. 12 du Code de sécurité sociale).
 *  - **Mali** : le barème ITS est **ANNUEL**, pas mensuel — plusieurs éditeurs
 *    de paie l'étiquettent à tort « mensuel », soit un facteur 12.
 *
 * Aucun de ces quatre pays n'applique de quotient familial.
 *
 * ⚠️ **Le barème bissau-guinéen porte une incohérence dans la loi elle-même** :
 * la « parcela a abater » de la 6ᵉ tranche (37 947) n'a pas été recalculée quand
 * la Lei n°1/2021 a baissé le taux de 18 % à 14 %. Appliquée telle quelle, elle
 * fait CHUTER l'impôt de 16 020 F entre 400 500 et 400 501 F de salaire. Les
 * tranches sont donc encodées SANS `fixed_deduction` : le moteur calcule par
 * tranches successives (art. 28), méthode continue qui reproduit exactement les
 * cinq premières parcelas. À faire arbitrer par la DGCI.
 */
class PayrollRulesUemoa2Seeder extends Seeder
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

        // Corrections de la fiche pays révélées par le relevé.
        DB::table('payroll_country_profiles')->where('country_code', 'GW')->update([
            'income_tax_code' => 'IP',
            'income_tax_name' => 'Imposto Profissional',
            'notes'           => "L'impôt n'est PAS l'IRPS : la Guinée-Bissau conserve le système cédulaire "
                               . "de l'Imposto Profissional (Decreto n°23/83).",
            'updated_at'      => now(),
        ]);

        DB::table('payroll_country_profiles')->where('country_code', 'TG')->update([
            'notes'      => "Santé du secteur privé assurée par l'AMU (collectée par la CNSS) depuis le "
                          . "01/01/2024, et non par l'INAM. Aucun plafond de cotisation.",
            'updated_at' => now(),
        ]);

        DB::table('payroll_country_profiles')
            ->whereIn('country_code', ['ML', 'NE', 'TG', 'GW'])
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
            'currency'          => 'XOF',
            'effective_to'      => null,
            'employee_rate'     => 0.00,
        ], $specifique);
    }

    private function cotisations(): array
    {
        $srcML = 'CLEISS — Les cotisations au Mali, mise à jour du 01/01/2025';
        $srcNE = "CNSS Niger — Guide de l'Employeur (cnss.ne) ; CIPRES ; CLEISS au 01/01/2024";
        $srcTG = 'CNSS Togo (cnss.tg, texte lu) ; CLEISS au 01/01/2026 ; loi n°2011-006 du 21/02/2011';
        $srcGW = 'Decreto-Lei n°5/86 du 29/03/1986, art. 84 (Boletim Oficial publié par l\'INSS) ; ISSA Country Profile au 01/07/2022 ; US SSA Africa 2019';

        return [
            // ── MALI ─────────────────────────────────────────────────────────
            $this->base([
                'country_code' => 'ML', 'scheme_code' => 'INPS',
                'scheme_name'  => 'Institut National de Prévoyance Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Vieillesse, invalidité, survivants',
                'employer_rate' => 5.40, 'employee_rate' => 3.60,
                'effective_from' => '2025-01-01', 'source' => $srcML,
                'notes' => 'AUCUN PLAFOND. La part patronale se décompose en 3,4 % retraite + 2 % invalidité/décès.',
            ]),
            $this->base([
                'country_code' => 'ML', 'scheme_code' => 'INPS',
                'scheme_name'  => 'Institut National de Prévoyance Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales et maternité',
                'employer_rate' => 8.00,
                'effective_from' => '2025-01-01', 'source' => $srcML,
                'notes' => 'Aucun plafond.',
            ]),
            $this->base([
                'country_code' => 'ML', 'scheme_code' => 'INPS',
                'scheme_name'  => 'Institut National de Prévoyance Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail et maladies professionnelles',
                'employer_rate' => 1.00,
                'employer_specific' => true, 'min_rate' => 1.00, 'max_rate' => 4.00,
                'effective_from' => '2025-01-01', 'source' => $srcML,
                'notes' => 'TAUX PROPRE À CHAQUE EMPLOYEUR : 1 à 4 % selon le risque. Aucune grille officielle '
                         . 'de classement des activités retrouvée — à obtenir auprès de l\'INPS.',
            ]),
            $this->base([
                'country_code' => 'ML', 'scheme_code' => 'CANAM',
                'scheme_name'  => 'Caisse Nationale d\'Assurance Maladie — AMO',
                'branch_code'  => 'maladie', 'branch_label' => 'Assurance maladie obligatoire',
                'employer_rate' => 3.50, 'employee_rate' => 3.06,
                'effective_from' => '2025-01-01',
                'source' => $srcML . ' ; CANAM (canam.ml) ; loi n°09-015 du 26/06/2009',
                'notes' => 'Encaissée par l\'INPS. Aucun plafond.',
            ]),
            $this->base([
                'country_code' => 'ML', 'scheme_code' => 'ANPE',
                'scheme_name'  => 'Agence Nationale Pour l\'Emploi',
                'branch_code'  => 'emploi', 'branch_label' => 'Taxe emploi',
                'employer_rate' => 1.00,
                'effective_from' => '2025-01-01', 'source' => $srcML,
                'notes' => 'CONFIANCE MOYENNE : un manuel d\'éditeur indique 2 %. 1 % retenu (CLEISS à jour).',
            ]),
            $this->base([
                'country_code' => 'ML', 'scheme_code' => 'CFE',
                'scheme_name'  => 'Contribution Forfaitaire à la charge des Employeurs',
                'branch_code'  => 'taxe_employeur', 'branch_label' => 'Contribution forfaitaire employeur',
                'employer_rate' => 3.50,
                'effective_from' => '2025-01-01', 'source' => 'DGI Mali — « Les impôts à payer » (dgi.gouv.ml)',
                'notes' => 'CONFIANCE MOYENNE : le CGI 2006 art. 160 fixait 5,5 %, le texte opérant le passage à '
                         . '3,5 % n\'a pas été identifié. Base arrondie au millier de francs inférieur. '
                         . '⚠️ La Taxe Logement (1 %), la TFP (2 %) et la TEJ ne sont PAS encodées : le site de la DGI '
                         . 'les affiche encore, la presse rapporte la suppression des deux dernières par la LF 2019.',
            ]),

            // ── NIGER ────────────────────────────────────────────────────────
            $this->base([
                'country_code' => 'NE', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, survivants)',
                'employer_rate' => 6.25, 'employee_rate' => 5.25,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2024-01-01', 'source' => $srcNE,
                'notes' => 'Part salariale confirmée indépendamment par l\'exemple chiffré de la brochure ITS de la DGI.',
            ]),
            $this->base([
                'country_code' => 'NE', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales et maternité',
                'employer_rate' => 8.40,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2024-01-01', 'source' => $srcNE,
            ]),
            $this->base([
                'country_code' => 'NE', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Accidents du travail et maladies professionnelles',
                'employer_rate' => 1.75,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2024-01-01', 'source' => $srcNE,
                'notes' => 'Taux UNIQUE, non modulé par risque — contrairement au Mali et à la Côte d\'Ivoire.',
            ]),
            $this->base([
                'country_code' => 'NE', 'scheme_code' => 'ANPE',
                'scheme_name'  => 'Agence Nationale pour la Promotion de l\'Emploi',
                'branch_code'  => 'emploi', 'branch_label' => 'Cotisation ANPE',
                'employer_rate' => 0.50,
                'basis' => 'capped_salary', 'monthly_ceiling' => 500000,
                'effective_from' => '2024-01-01', 'source' => $srcNE . ' ; eRegulations Niger',
                'notes' => 'CONFLIT : CLEISS indique 1 %. 0,50 % retenu — source de l\'organisme collecteur lui-même.',
            ]),

            // ── TOGO ─────────────────────────────────────────────────────────
            $this->base([
                'country_code' => 'TG', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale du Togo',
                'branch_code'  => 'retraite', 'branch_label' => 'Pensions (vieillesse, invalidité, survivants)',
                'employer_rate' => 12.50, 'employee_rate' => 4.00,
                'effective_from' => '2026-01-01', 'source' => $srcTG,
                'notes' => 'AUCUN PLAFOND (art. 12 du Code de sécurité sociale) ; plancher = SMIG 52 500 FCFA. '
                         . 'Seule branche à part salariale côté CNSS.',
            ]),
            $this->base([
                'country_code' => 'TG', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale du Togo',
                'branch_code'  => 'prestations_familiales', 'branch_label' => 'Prestations familiales et maternité',
                'employer_rate' => 3.00,
                'effective_from' => '2026-01-01', 'source' => $srcTG,
                'notes' => 'Aucun plafond.',
            ]),
            $this->base([
                'country_code' => 'TG', 'scheme_code' => 'CNSS',
                'scheme_name'  => 'Caisse Nationale de Sécurité Sociale du Togo',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Risques professionnels',
                'employer_rate' => 2.00,
                'employer_specific' => true, 'min_rate' => 2.00, 'max_rate' => 4.00,
                'effective_from' => '2026-01-01', 'source' => $srcTG,
                'notes' => 'Taux unique de 2 %, mais MAJORABLE JUSQU\'AU DOUBLE (4 %) à titre de sanction si '
                         . 'l\'employeur ne respecte pas les prescriptions de prévention (loi n°2011-006, art. 14).',
            ]),
            $this->base([
                'country_code' => 'TG', 'scheme_code' => 'AMU',
                'scheme_name'  => 'Assurance Maladie Universelle (gérée par la CNSS pour le privé)',
                'branch_code'  => 'maladie', 'branch_label' => 'Assurance maladie universelle',
                'employer_rate' => 5.00, 'employee_rate' => 5.00,
                'effective_from' => '2024-01-01',
                'source' => 'Décret n°2023-096/PR du 04/10/2023, art. 12 et 29 (PDF officiel signé, lu) ; loi n°2021-022',
                'notes' => 'Taux global de 10 %, « dont 50 % AU MOINS à la charge de l\'employeur » (art. 12) : '
                         . 'l\'employeur peut en prendre davantage. La répartition 5/5 est celle de l\'art. 29. '
                         . 'Assiette : salaire de base + primes imposables, hors remboursements de frais. '
                         . 'Remplace l\'INAM pour le secteur privé depuis le 01/01/2024.',
            ]),

            // ── GUINÉE-BISSAU ────────────────────────────────────────────────
            $this->base([
                'country_code' => 'GW', 'scheme_code' => 'INSS',
                'scheme_name'  => 'Instituto Nacional de Segurança Social',
                'branch_code'  => 'global', 'branch_label' => 'Régime général (toutes branches)',
                'employer_rate' => 14.00, 'employee_rate' => 8.00,
                'effective_from' => '2022-07-01', 'source' => $srcGW,
                'notes' => 'Taux global 22 %, AUCUN plafond ni plancher. Affectation interne par risque (art. 84 n°2) : '
                         . 'maladie/maternité 5 %, prestations familiales 5 %, invalidité/vieillesse 4 %, survivants 2 %, '
                         . 'administration 6 % — c\'est une affectation PAR RISQUE, elle ne répartit pas entre employeur '
                         . 'et salarié : ne pas en faire des lignes de bulletin. La part patronale de 14 % est '
                         . 'reconstituée (22 − 8) car perdue à l\'OCR du scan, mais confirmée par l\'ISSA et le SSA.',
            ]),
            $this->base([
                'country_code' => 'GW', 'scheme_code' => 'INSS',
                'scheme_name'  => 'Instituto Nacional de Segurança Social',
                'branch_code'  => 'accidents_travail', 'branch_label' => 'Acidentes de trabalho e doenças profissionais',
                'employer_rate' => 2.00,
                'employer_specific' => true, 'min_rate' => 2.00, 'max_rate' => 10.00,
                'effective_from' => '2022-07-01', 'source' => $srcGW,
                'notes' => 'TAUX PROPRE À CHAQUE EMPLOYEUR : 2 à 10 % selon le degré de risque, EN SUS des 22 % '
                         . '(art. 84 n°3 : « acrescerá »). Coût employeur total : 16 % à 24 %. Grille sectorielle '
                         . 'non retrouvée.',
            ]),
        ];
    }

    private function baremes(): array
    {
        $lignes = [];

        // ── MALI — ITS ANNUEL ───────────────────────────────────────────────
        $srcML = 'DGI Mali — brochure officielle « L\'impôt sur les traitements et salaires (ITS) n°2 », édition avril 2020 ; art. 10 du CGI modifié par la loi n°2016-010 du 19/04/2016';
        foreach ([
            [0, 330000, 0.00], [330001, 578400, 5.00], [578401, 1176400, 12.00],
            [1176401, 1789733, 18.00], [1789734, 2384195, 26.00],
            [2384196, 3494130, 31.00], [3494131, null, 37.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'ML', 'tax_code' => 'ITS',
                'tax_name' => 'Impôt sur les Traitements et Salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'yearly',
                'effective_from' => '2016-04-19', 'effective_to' => null,
                'source' => $srcML,
                'notes' => 'Barème ANNUEL — plusieurs éditeurs de paie l\'étiquettent à tort « mensuel », soit un '
                         . 'facteur 12. Confirmé par l\'exemple chiffré officiel de la DGI. ⚠️ Le PDF du CGI encore en '
                         . 'ligne contient la rédaction ORIGINALE de 2006 (obsolète). Assiette : brut − INPS 3,6 % − '
                         . 'AMO 3,06 %, arrondi au 250 F inférieur, × 12. AUCUN abattement pour frais professionnels '
                         . 'au Mali. Réduction pour charges de famille appliquée À L\'IMPÔT (art. 11) : marié 10 %, '
                         . '+2,5 % par enfant jusqu\'au 10ᵉ — non implémentée. Puis réduction de 2 points du taux de '
                         . 'pression fiscale. Dernière attestation officielle : 2020 ; trois textes de 2025 modifient '
                         . 'le CGI sans que leur effet sur l\'ITS ait pu être vérifié.',
            ];
        }

        // ── NIGER — ITS MENSUEL ─────────────────────────────────────────────
        $srcNE = 'DGI Niger — brochure officielle « Barème de l\'ITS » ; CGI art. 66 (édition mise à jour LF 2025)';
        foreach ([
            [1, 25000, 1.00], [25001, 50000, 2.00], [50001, 100000, 6.00],
            [100001, 150000, 13.00], [150001, 300000, 25.00], [300001, 400000, 30.00],
            [400001, 700000, 32.00], [700001, 1000000, 34.00], [1000001, null, 35.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'NE', 'tax_code' => 'ITS',
                'tax_name' => 'Impôt sur les Traitements et Salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'monthly',
                'effective_from' => '2010-01-01', 'effective_to' => null,
                'source' => $srcNE,
                'notes' => 'Barème MENSUEL, en vigueur depuis le 01/01/2010. Le directeur général des impôts a déclaré '
                         . 'publiquement le barème inchangé pour 2026 (nouveau CGI, ordonnance n°2025-22) — non vérifié '
                         . 'sur le texte. Assiette : brut − CNSS salariale − abattement pour frais professionnels, '
                         . 'arrondi au millier inférieur. ⚠️ ABATTEMENT À TRANCHER : 10 % dans la brochure 2010 et le '
                         . 'CGI 2013, 13 % dans l\'édition « MàJ LF 2025 » — c\'est le paramètre qui pèse le plus sur '
                         . 'le net. Particularité : les charges de famille sont un abattement SUR LA BASE (5 % à 30 % '
                         . 'selon 1 à 7 personnes), pas sur l\'impôt — non implémenté.',
            ];
        }

        // ── TOGO — IRPP ANNUEL ──────────────────────────────────────────────
        $srcTG = 'CGI Togo art. 74 — PDF officiel de l\'OTR (mises à jour 2023 et 2025), issu de la loi n°2022-022 du 27/12/2022 ; texte lu directement';
        foreach ([
            [0, 900000, 0.00], [900001, 3000000, 3.00], [3000001, 6000000, 10.00],
            [6000001, 9000000, 15.00], [9000001, 12000000, 20.00],
            [12000001, 15000000, 25.00], [15000001, 20000000, 30.00], [20000001, null, 35.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'TG', 'tax_code' => 'IRPP',
                'tax_name' => 'Impôt sur le Revenu des Personnes Physiques — traitements et salaires',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux, 'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'yearly',
                'effective_from' => '2023-01-01', 'effective_to' => null,
                'source' => $srcTG,
                'notes' => 'CONFIANCE HAUTE — texte officiel. Barème ANNUEL, revenu arrondi au millier inférieur, '
                         . 'impôt arrondi à la dizaine inférieure. ⚠️ AUCUNE TABLE DE MENSUALISATION OFFICIELLE '
                         . 'N\'EXISTE : diviser les bornes par 12 est une pratique de place, pas un texte — à faire '
                         . 'valider par l\'OTR. Abattement forfaitaire de 28 % (art. 26), calculé APRÈS déduction des '
                         . 'cotisations sociales et UNIQUEMENT sur la fraction du revenu n\'excédant pas 10 000 000 F. '
                         . 'Déductibles avant abattement : retraite obligatoire (limite 6 % du brut), cotisations '
                         . 'salariales sociales et AMU. Charges de famille : réduction DU REVENU de 120 000 F/an par '
                         . 'personne, maximum 6 personnes — non implémentée. La TS et la TCS ont été SUPPRIMÉES au '
                         . '01/01/2019 : ne pas les rétablir.',
            ];
        }

        // ── GUINÉE-BISSAU — IMPOSTO PROFISSIONAL, MENSUEL ───────────────────
        $srcGW = 'Código do Imposto Profissional art. 27 n°1, rédaction de l\'art. 10 de la Lei n°1/2021 du 01/02/2021 — texte consolidé officiel de la DGCI';
        foreach ([
            [0, 41667, 1.00], [41668, 83333, 6.00], [83334, 208333, 8.00],
            [208334, 300000, 10.00], [300001, 400500, 12.00], [400501, 750000, 14.00],
            [750001, 1100000, 16.00], [1100001, 1500000, 18.00], [1500001, null, 20.00],
        ] as [$bas, $haut, $taux]) {
            $lignes[] = [
                'country_code' => 'GW', 'tax_code' => 'IP',
                'tax_name' => 'Imposto Profissional',
                'lower_bound' => $bas, 'upper_bound' => $haut, 'rate' => $taux,
                // Volontairement 0 : voir la note. Les « parcelas a abater » du
                // texte sont incohérentes à partir de la 6ᵉ tranche.
                'fixed_deduction' => 0,
                'currency' => 'XOF', 'period' => 'monthly',
                'effective_from' => '2021-02-01', 'effective_to' => null,
                'source' => $srcGW,
                'notes' => 'L\'impôt n\'est PAS l\'IRPS : système cédulaire de l\'Imposto Profissional. Barème MENSUEL '
                         . '(la colonne annuelle du texte contient des incohérences d\'arrondi). Assiette = BRUT : '
                         . 'aucun abattement, aucune charge de famille, et les cotisations INSS ne sont PAS déductibles. '
                         . '⚠️ INCOHÉRENCE DANS LA LOI : l\'art. 27 n°3 impose « taux × revenu − parcela », l\'art. 28 '
                         . 'impose le calcul par tranches successives. Les deux divergent au passage de la 5ᵉ à la 6ᵉ '
                         . 'tranche : avec la parcela publiée (37 947), l\'impôt CHUTE de 16 020 F entre 400 500 et '
                         . '400 501 F de salaire. Origine probable : la Lei n°1/2021 a baissé le taux de 18 % à 14 % '
                         . 'sans recalculer la parcela (21 927 serait la valeur continue). Le moteur applique donc les '
                         . 'tranches successives (art. 28), méthode continue qui reproduit exactement les cinq '
                         . 'premières parcelas. À FAIRE ARBITRER PAR LA DGCI. Reversement sous 10 jours (échéance '
                         . 'différente de l\'INSS, le 15). Aucune liquidation en dessous de 2 000 F. '
                         . 'L\'« Imposto de Democracia » (500 à 20 000 F) est liquidé avec cet impôt : barème introuvable, '
                         . 'non encodé.',
            ];
        }

        return $lignes;
    }
}
