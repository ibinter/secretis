<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('  > CurrencySeeder : 16 devises...');

        /*
         * taux_vs_xof : combien de FCFA (XOF) pour 1 unité de la devise.
         * Taux indicatifs — mettre à jour via un service de taux en production.
         *
         * decimal_separator  : séparateur décimal utilisé dans le pays
         * thousands_separator: séparateur de milliers
         */
        $currencies = [
            // ─── Zones CFA / Afrique subsaharienne ───────────────────────────
            [
                'code'                => 'XOF',
                'name'                => 'Franc CFA (UEMOA)',
                'symbol'              => 'FCFA',
                'taux_vs_xof'         => 1.000000,
                'decimal_places'      => 0,
                'decimal_separator'   => ',',
                'thousands_separator' => ' ',
                'is_default'          => true,
                'is_active'           => true,
            ],
            [
                'code'                => 'XAF',
                'name'                => 'Franc CFA (CEMAC)',
                'symbol'              => 'FCFA',
                'taux_vs_xof'         => 1.000000,
                'decimal_places'      => 0,
                'decimal_separator'   => ',',
                'thousands_separator' => ' ',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'GHS',
                'name'                => 'Cedi ghanéen',
                'symbol'              => 'GH₵',
                'taux_vs_xof'         => 63.50,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => ',',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'NGN',
                'name'                => 'Naira nigérian',
                'symbol'              => '₦',
                'taux_vs_xof'         => 0.65,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => ',',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'KES',
                'name'                => 'Shilling kényan',
                'symbol'              => 'KSh',
                'taux_vs_xof'         => 7.80,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => ',',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'ZAR',
                'name'                => 'Rand sud-africain',
                'symbol'              => 'R',
                'taux_vs_xof'         => 54.20,
                'decimal_places'      => 2,
                'decimal_separator'   => ',',
                'thousands_separator' => ' ',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'EGP',
                'name'                => 'Livre égyptienne',
                'symbol'              => 'E£',
                'taux_vs_xof'         => 20.50,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => ',',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'MAD',
                'name'                => 'Dirham marocain',
                'symbol'              => 'MAD',
                'taux_vs_xof'         => 101.80,
                'decimal_places'      => 2,
                'decimal_separator'   => ',',
                'thousands_separator' => '.',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'TND',
                'name'                => 'Dinar tunisien',
                'symbol'              => 'DT',
                'taux_vs_xof'         => 315.00,
                'decimal_places'      => 3,
                'decimal_separator'   => ',',
                'thousands_separator' => '.',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'MZN',
                'name'                => 'Metical mozambicain',
                'symbol'              => 'MT',
                'taux_vs_xof'         => 16.00,
                'decimal_places'      => 2,
                'decimal_separator'   => ',',
                'thousands_separator' => '.',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'STN',
                'name'                => 'Dobra de São Tomé-et-Príncipe',
                'symbol'              => 'Db',
                'taux_vs_xof'         => 43.50,
                'decimal_places'      => 2,
                'decimal_separator'   => ',',
                'thousands_separator' => '.',
                'is_default'          => false,
                'is_active'           => true,
            ],
            // ─── Devises internationales majeures ─────────────────────────────
            [
                'code'                => 'EUR',
                'name'                => 'Euro',
                'symbol'              => '€',
                'taux_vs_xof'         => 655.957,
                'decimal_places'      => 2,
                'decimal_separator'   => ',',
                'thousands_separator' => ' ',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'USD',
                'name'                => 'Dollar américain',
                'symbol'              => '$',
                'taux_vs_xof'         => 606.50,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => ',',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'GBP',
                'name'                => 'Livre sterling',
                'symbol'              => '£',
                'taux_vs_xof'         => 770.20,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => ',',
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'CHF',
                'name'                => 'Franc suisse',
                'symbol'              => 'CHF',
                'taux_vs_xof'         => 680.00,
                'decimal_places'      => 2,
                'decimal_separator'   => '.',
                'thousands_separator' => "'",
                'is_default'          => false,
                'is_active'           => true,
            ],
            [
                'code'                => 'BRL',
                'name'                => 'Real brésilien',
                'symbol'              => 'R$',
                'taux_vs_xof'         => 115.00,
                'decimal_places'      => 2,
                'decimal_separator'   => ',',
                'thousands_separator' => '.',
                'is_default'          => false,
                'is_active'           => true,
            ],
        ];

        foreach ($currencies as $currency) {
            DB::table('currencies')->updateOrInsert(
                ['code' => $currency['code']],
                array_merge($currency, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : ' . count($currencies) . ' devises inserees (XOF par defaut).');
    }
}
