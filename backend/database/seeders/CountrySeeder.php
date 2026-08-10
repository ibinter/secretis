<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('  > CountrySeeder : 18 pays OHADA + additionnels...');

        /*
         * Colonnes :
         *   iso_code        — code ISO 3166-1 alpha-2
         *   name_fr         — nom en français
         *   name_en         — nom en anglais
         *   phone_prefix    — indicatif international (+XX)
         *   currency_code   — devise principale (ref currencies.code)
         *   timezone        — timezone principale (TZ Database)
         *   vat_rate        — taux TVA standard (%)
         *   rccm_format     — format du numéro RCCM local (regex ou exemple)
         *   is_ohada        — membre de l'espace OHADA
         */
        $countries = [
            // ─── 17 États parties de l'OHADA ─────────────────────────────────
            [
                'iso_code'     => 'CI',
                'name_fr'      => "Côte d'Ivoire",
                'name_en'      => "Côte d'Ivoire",
                'phone_prefix' => '+225',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Abidjan',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'CI-ABJ-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'SN',
                'name_fr'      => 'Sénégal',
                'name_en'      => 'Senegal',
                'phone_prefix' => '+221',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Dakar',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'SN-DKR-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'CM',
                'name_fr'      => 'Cameroun',
                'name_en'      => 'Cameroon',
                'phone_prefix' => '+237',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Douala',
                'vat_rate'     => 19.25,
                'rccm_format'  => 'RC/DLA/YYYY/B/NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'ML',
                'name_fr'      => 'Mali',
                'name_en'      => 'Mali',
                'phone_prefix' => '+223',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Bamako',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'ML-BAM-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'BF',
                'name_fr'      => 'Burkina Faso',
                'name_en'      => 'Burkina Faso',
                'phone_prefix' => '+226',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Ouagadougou',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'BF-OUA-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'BJ',
                'name_fr'      => 'Bénin',
                'name_en'      => 'Benin',
                'phone_prefix' => '+229',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Porto-Novo',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'BJ-COT-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'TG',
                'name_fr'      => 'Togo',
                'name_en'      => 'Togo',
                'phone_prefix' => '+228',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Lome',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'TG-LOM-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'NE',
                'name_fr'      => 'Niger',
                'name_en'      => 'Niger',
                'phone_prefix' => '+227',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Niamey',
                'vat_rate'     => 19.00,
                'rccm_format'  => 'NE-NIA-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'GA',
                'name_fr'      => 'Gabon',
                'name_en'      => 'Gabon',
                'phone_prefix' => '+241',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Libreville',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'GA-LBV-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'CG',
                'name_fr'      => 'Congo',
                'name_en'      => 'Republic of the Congo',
                'phone_prefix' => '+242',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Brazzaville',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'CG-BZV-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'CD',
                'name_fr'      => 'République Démocratique du Congo',
                'name_en'      => 'Democratic Republic of the Congo',
                'phone_prefix' => '+243',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Kinshasa',
                'vat_rate'     => 16.00,
                'rccm_format'  => 'CD-KIN-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'CF',
                'name_fr'      => 'République Centrafricaine',
                'name_en'      => 'Central African Republic',
                'phone_prefix' => '+236',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Bangui',
                'vat_rate'     => 19.00,
                'rccm_format'  => 'CF-BGI-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'TD',
                'name_fr'      => 'Tchad',
                'name_en'      => 'Chad',
                'phone_prefix' => '+235',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Ndjamena',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'TD-NDJ-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'GQ',
                'name_fr'      => 'Guinée Équatoriale',
                'name_en'      => 'Equatorial Guinea',
                'phone_prefix' => '+240',
                'currency_code'=> 'XAF',
                'timezone'     => 'Africa/Malabo',
                'vat_rate'     => 15.00,
                'rccm_format'  => 'GQ-MLB-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'GW',
                'name_fr'      => 'Guinée-Bissau',
                'name_en'      => 'Guinea-Bissau',
                'phone_prefix' => '+245',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Bissau',
                'vat_rate'     => 17.00,
                'rccm_format'  => 'GW-BSS-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'KM',
                'name_fr'      => 'Comores',
                'name_en'      => 'Comoros',
                'phone_prefix' => '+269',
                'currency_code'=> 'XOF',
                'timezone'     => 'Indian/Comoro',
                'vat_rate'     => 0.00,  // pas de TVA classique
                'rccm_format'  => 'KM-MOR-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'ST',
                'name_fr'      => 'São Tomé-et-Príncipe',
                'name_en'      => 'São Tomé and Príncipe',
                'phone_prefix' => '+239',
                'currency_code'=> 'STN',
                'timezone'     => 'Africa/Sao_Tome',
                'vat_rate'     => 15.00,
                'rccm_format'  => 'ST-STO-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            [
                'iso_code'     => 'GN',
                'name_fr'      => 'Guinée (Conakry)',
                'name_en'      => 'Guinea',
                'phone_prefix' => '+224',
                'currency_code'=> 'XOF',
                'timezone'     => 'Africa/Conakry',
                'vat_rate'     => 18.00,
                'rccm_format'  => 'GN-CKY-YYYY-B-NNNNN',
                'is_ohada'     => true,
            ],
            // ─── Pays additionnels (hors OHADA — couverture IBIG) ─────────────
            [
                'iso_code'     => 'MA',
                'name_fr'      => 'Maroc',
                'name_en'      => 'Morocco',
                'phone_prefix' => '+212',
                'currency_code'=> 'MAD',
                'timezone'     => 'Africa/Casablanca',
                'vat_rate'     => 20.00,
                'rccm_format'  => 'RC-YYYY-NNNNN',
                'is_ohada'     => false,
            ],
            [
                'iso_code'     => 'TN',
                'name_fr'      => 'Tunisie',
                'name_en'      => 'Tunisia',
                'phone_prefix' => '+216',
                'currency_code'=> 'TND',
                'timezone'     => 'Africa/Tunis',
                'vat_rate'     => 19.00,
                'rccm_format'  => 'B-NNNNNNN-YYYY',
                'is_ohada'     => false,
            ],
            [
                'iso_code'     => 'GH',
                'name_fr'      => 'Ghana',
                'name_en'      => 'Ghana',
                'phone_prefix' => '+233',
                'currency_code'=> 'GHS',
                'timezone'     => 'Africa/Accra',
                'vat_rate'     => 15.00,
                'rccm_format'  => 'GH-NNNNN-YYYY',
                'is_ohada'     => false,
            ],
            [
                'iso_code'     => 'NG',
                'name_fr'      => 'Nigéria',
                'name_en'      => 'Nigeria',
                'phone_prefix' => '+234',
                'currency_code'=> 'NGN',
                'timezone'     => 'Africa/Lagos',
                'vat_rate'     => 7.50,
                'rccm_format'  => 'RC-NNNNNNN',
                'is_ohada'     => false,
            ],
        ];

        foreach ($countries as $country) {
            DB::table('countries')->updateOrInsert(
                ['iso_code' => $country['iso_code']],
                array_merge($country, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $ohada = count(array_filter($countries, fn($c) => $c['is_ohada']));
        $this->command->info("    OK : " . count($countries) . " pays inseres ({$ohada} OHADA).");
    }
}
