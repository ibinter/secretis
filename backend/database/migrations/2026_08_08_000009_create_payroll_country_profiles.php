<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fiche de paie légale par pays de la zone franc CFA (UEMOA + CEMAC, 14 pays).
 *
 * Cette table dit QUOI paramétrer dans chaque pays — quelle caisse, quelles
 * branches, quel impôt sur les salaires — sans porter aucun taux. Les taux
 * vivent dans `payroll_contribution_rules` / `payroll_tax_brackets`, et n'y
 * entrent qu'une fois relevés sur un texte officiel.
 *
 * La distinction est délibérée : le NOM d'une caisse est un fait stable et
 * vérifiable (le Sénégal cotise à l'IPRES et à la CSS, le Cameroun à la CNPS) ;
 * son TAUX change chaque année et diffère à chaque frontière. Mélanger les deux
 * conduirait à réintroduire dans le code ce qu'on vient d'en sortir.
 *
 * `configuration_status` sert de tableau de bord au déploiement :
 *   pending  — rien de saisi, le calcul refuse ;
 *   draft    — taux saisis mais non confirmés, le calcul avertit ;
 *   verified — taux confirmés sur texte officiel, le calcul est silencieux.
 */
return new class extends Migration
{
    /**
     * Structure institutionnelle des 14 pays de la zone franc.
     * `branches` = ce qu'il faut renseigner, PAS les valeurs.
     */
    private const PAYS = [
        // ── UEMOA — Franc CFA ouest-africain (XOF) ────────────────────────────
        ['CI', 'Côte d\'Ivoire',        'XOF', 'UEMOA', 'CNPS',  'Caisse Nationale de Prévoyance Sociale',              'ITS',  'Impôt sur les Traitements et Salaires'],
        ['SN', 'Sénégal',               'XOF', 'UEMOA', 'IPRES', 'Institution de Prévoyance Retraite du Sénégal + CSS', 'IR',   'Impôt sur le Revenu (retenue à la source)'],
        ['BJ', 'Bénin',                 'XOF', 'UEMOA', 'CNSS',  'Caisse Nationale de Sécurité Sociale',                'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['BF', 'Burkina Faso',          'XOF', 'UEMOA', 'CNSS',  'Caisse Nationale de Sécurité Sociale',                'IUTS', 'Impôt Unique sur les Traitements et Salaires'],
        ['ML', 'Mali',                  'XOF', 'UEMOA', 'INPS',  'Institut National de Prévoyance Sociale',             'ITS',  'Impôt sur les Traitements et Salaires'],
        ['NE', 'Niger',                 'XOF', 'UEMOA', 'CNSS',  'Caisse Nationale de Sécurité Sociale',                'IUTS', 'Impôt Unique sur les Traitements et Salaires'],
        ['TG', 'Togo',                  'XOF', 'UEMOA', 'CNSS',  'Caisse Nationale de Sécurité Sociale',                'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['GW', 'Guinée-Bissau',         'XOF', 'UEMOA', 'INSS',  'Instituto Nacional de Segurança Social',              'IRPS', 'Imposto sobre o Rendimento'],

        // ── CEMAC — Franc CFA d'Afrique centrale (XAF) ────────────────────────
        ['CM', 'Cameroun',              'XAF', 'CEMAC', 'CNPS',  'Caisse Nationale de Prévoyance Sociale',              'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['GA', 'Gabon',                 'XAF', 'CEMAC', 'CNSS',  'Caisse Nationale de Sécurité Sociale + CNAMGS',       'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['CG', 'Congo',                 'XAF', 'CEMAC', 'CNSS',  'Caisse Nationale de Sécurité Sociale',                'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['TD', 'Tchad',                 'XAF', 'CEMAC', 'CNPS',  'Caisse Nationale de Prévoyance Sociale',              'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['CF', 'Centrafrique',          'XAF', 'CEMAC', 'CNSS',  'Caisse Nationale de Sécurité Sociale',                'IRPP', 'Impôt sur le Revenu des Personnes Physiques'],
        ['GQ', 'Guinée équatoriale',    'XAF', 'CEMAC', 'INSESO','Instituto de Seguridad Social',                       'IRPF', 'Impuesto sobre la Renta'],
    ];

    /** Branches à renseigner. Universelles en zone franc, à ajuster par pays. */
    private const BRANCHES = [
        'retraite'               => 'Retraite / pensions',
        'prestations_familiales' => 'Prestations familiales',
        'accidents_travail'      => 'Accidents du travail et maladies professionnelles',
        'maladie'                => 'Assurance maladie (si le pays en prévoit une)',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('payroll_country_profiles')) {
            Schema::create('payroll_country_profiles', function (Blueprint $table) {
                $table->id();
                $table->string('country_code', 2)->unique();
                $table->string('country_name');
                $table->string('currency', 3);
                // UEMOA | CEMAC — utile pour les traitements par zone.
                $table->string('economic_zone', 10);

                $table->string('social_scheme_code', 20);
                $table->string('social_scheme_name');
                $table->string('income_tax_code', 20)->nullable();
                $table->string('income_tax_name')->nullable();

                // Branches attendues : la liste de ce qu'il reste à saisir.
                $table->json('expected_branches')->nullable();

                $table->string('configuration_status', 20)->default('pending');
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->index('economic_zone');
                $table->index('configuration_status');
            });
        }

        $maintenant = now();
        $branches = self::BRANCHES;

        foreach (self::PAYS as [$code, $nom, $devise, $zone, $caisse, $caisseNom, $impot, $impotNom]) {
            DB::table('payroll_country_profiles')->updateOrInsert(
                ['country_code' => $code],
                [
                    'country_name'        => $nom,
                    'currency'            => $devise,
                    'economic_zone'       => $zone,
                    'social_scheme_code'  => $caisse,
                    'social_scheme_name'  => $caisseNom,
                    'income_tax_code'     => $impot,
                    'income_tax_name'     => $impotNom,
                    'expected_branches'   => json_encode($branches, JSON_UNESCAPED_UNICODE),
                    'notes'               => 'Taux et barèmes à relever sur texte officiel avant toute déclaration.',
                    'updated_at'          => $maintenant,
                    'created_at'          => $maintenant,
                ]
            );
        }

        // La Côte d'Ivoire porte déjà des taux repris de l'ancien code, non
        // confirmés : elle est donc en « draft », pas en « pending ».
        if (Schema::hasTable('payroll_contribution_rules')) {
            $avecTaux = DB::table('payroll_contribution_rules')
                ->select('country_code')
                ->groupBy('country_code')
                ->havingRaw('SUM(employer_rate + employee_rate) > 0')
                ->pluck('country_code');

            if ($avecTaux->isNotEmpty()) {
                DB::table('payroll_country_profiles')
                    ->whereIn('country_code', $avecTaux)
                    ->update(['configuration_status' => 'draft', 'updated_at' => $maintenant]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_country_profiles');
    }
};
