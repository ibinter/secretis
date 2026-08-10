<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('currencies')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('currencies', function (Blueprint $table) {
                $table->id();
                $table->string('code', 3)->unique(); // ISO 4217
                $table->string('name');
                $table->string('name_en')->nullable();
                $table->string('symbol', 10);
                $table->unsignedTinyInteger('decimal_places')->default(2);
                $table->string('decimal_separator', 1)->default(',');
                $table->string('thousands_separator', 1)->default(' ');
                $table->string('symbol_position')->default('after'); // before|after
                $table->boolean('is_active')->default(true);
                $table->boolean('is_default_for_region')->default(false);
                $table->string('region')->nullable(); // OHADA, Europe, International
                $table->json('countries')->nullable(); // pays qui utilisent cette devise
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('exchange_rates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('exchange_rates', function (Blueprint $table) {
                $table->id();
                $table->string('from_currency', 3);
                $table->string('to_currency', 3);
                $table->decimal('rate', 20, 8);
                $table->decimal('inverse_rate', 20, 8)->nullable();
                $table->enum('source', ['ecb', 'manual', 'openexchangerates', 'bceao', 'beac'])->default('manual');
                $table->timestamp('fetched_at');
                $table->timestamp('valid_from')->nullable();
                $table->timestamp('valid_until')->nullable();
                $table->decimal('variation_pct', 8, 4)->nullable()->comment('Variation par rapport au taux précédent en %');
                $table->timestamps();

                $table->index(['from_currency', 'to_currency', 'fetched_at']);
                $table->foreign('from_currency')->references('code')->on('currencies');
                $table->foreign('to_currency')->references('code')->on('currencies');
            });
        }

        if (! Schema::hasTable('organization_currencies')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('organization_currencies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->onDelete('cascade');
                $table->string('primary_currency', 3);
                $table->string('reporting_currency', 3);
                $table->json('accepted_currencies')->nullable();
                $table->timestamps();

                $table->foreign('primary_currency')->references('code')->on('currencies');
                $table->foreign('reporting_currency')->references('code')->on('currencies');
            });
        }

        $this->seedCurrencies();
    }

    private function seedCurrencies(): void
    {
        $now = now();

        // Devises OHADA et Afrique
        DB::table('currencies')->insert([
            [
                'code' => 'XOF',
                'name' => 'Franc CFA Afrique de l\'Ouest',
                'name_en' => 'West African CFA Franc',
                'symbol' => 'FCFA',
                'decimal_places' => 0,
                'decimal_separator' => ',',
                'thousands_separator' => ' ',
                'symbol_position' => 'after',
                'is_active' => true,
                'is_default_for_region' => true,
                'region' => 'OHADA',
                'countries' => json_encode(['CI', 'SN', 'BJ', 'BF', 'GW', 'ML', 'NE', 'TG']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'XAF',
                'name' => 'Franc CFA Afrique Centrale',
                'name_en' => 'Central African CFA Franc',
                'symbol' => 'FCFA',
                'decimal_places' => 0,
                'decimal_separator' => ',',
                'thousands_separator' => ' ',
                'symbol_position' => 'after',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'OHADA',
                'countries' => json_encode(['CM', 'CF', 'TD', 'CG', 'GA', 'GQ']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'GHS',
                'name' => 'Cedi Ghanéen',
                'name_en' => 'Ghanaian Cedi',
                'symbol' => '₵',
                'decimal_places' => 2,
                'decimal_separator' => '.',
                'thousands_separator' => ',',
                'symbol_position' => 'before',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'Afrique',
                'countries' => json_encode(['GH']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'NGN',
                'name' => 'Naira Nigérian',
                'name_en' => 'Nigerian Naira',
                'symbol' => '₦',
                'decimal_places' => 2,
                'decimal_separator' => '.',
                'thousands_separator' => ',',
                'symbol_position' => 'before',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'Afrique',
                'countries' => json_encode(['NG']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'KES',
                'name' => 'Shilling Kényan',
                'name_en' => 'Kenyan Shilling',
                'symbol' => 'KSh',
                'decimal_places' => 2,
                'decimal_separator' => '.',
                'thousands_separator' => ',',
                'symbol_position' => 'before',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'Afrique',
                'countries' => json_encode(['KE']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'MAD',
                'name' => 'Dirham Marocain',
                'name_en' => 'Moroccan Dirham',
                'symbol' => 'DH',
                'decimal_places' => 2,
                'decimal_separator' => ',',
                'thousands_separator' => ' ',
                'symbol_position' => 'after',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'Afrique',
                'countries' => json_encode(['MA']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'ZAR',
                'name' => 'Rand Sud-Africain',
                'name_en' => 'South African Rand',
                'symbol' => 'R',
                'decimal_places' => 2,
                'decimal_separator' => ',',
                'thousands_separator' => ' ',
                'symbol_position' => 'before',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'Afrique',
                'countries' => json_encode(['ZA']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // Devises internationales
            [
                'code' => 'EUR',
                'name' => 'Euro',
                'name_en' => 'Euro',
                'symbol' => '€',
                'decimal_places' => 2,
                'decimal_separator' => ',',
                'thousands_separator' => ' ',
                'symbol_position' => 'after',
                'is_active' => true,
                'is_default_for_region' => true,
                'region' => 'Europe',
                'countries' => json_encode(['FR', 'DE', 'IT', 'ES', 'BE', 'NL', 'PT', 'AT', 'FI', 'IE', 'GR', 'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'USD',
                'name' => 'Dollar Américain',
                'name_en' => 'US Dollar',
                'symbol' => '$',
                'decimal_places' => 2,
                'decimal_separator' => '.',
                'thousands_separator' => ',',
                'symbol_position' => 'before',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'International',
                'countries' => json_encode(['US']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'GBP',
                'name' => 'Livre Sterling',
                'name_en' => 'British Pound Sterling',
                'symbol' => '£',
                'decimal_places' => 2,
                'decimal_separator' => '.',
                'thousands_separator' => ',',
                'symbol_position' => 'before',
                'is_active' => true,
                'is_default_for_region' => false,
                'region' => 'Europe',
                'countries' => json_encode(['GB']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        // Taux de change de référence (XOF comme base OHADA)
        $rates = [
            ['from_currency' => 'XOF', 'to_currency' => 'EUR', 'rate' => 0.001524, 'source' => 'bceao'],
            ['from_currency' => 'EUR', 'to_currency' => 'XOF', 'rate' => 655.957, 'source' => 'bceao'],
            ['from_currency' => 'XOF', 'to_currency' => 'USD', 'rate' => 0.001646, 'source' => 'openexchangerates'],
            ['from_currency' => 'USD', 'to_currency' => 'XOF', 'rate' => 607.45, 'source' => 'openexchangerates'],
            ['from_currency' => 'XAF', 'to_currency' => 'EUR', 'rate' => 0.001524, 'source' => 'beac'],
            ['from_currency' => 'EUR', 'to_currency' => 'XAF', 'rate' => 655.957, 'source' => 'beac'],
            ['from_currency' => 'XOF', 'to_currency' => 'XAF', 'rate' => 1.0, 'source' => 'manual'],
            ['from_currency' => 'XAF', 'to_currency' => 'XOF', 'rate' => 1.0, 'source' => 'manual'],
            ['from_currency' => 'GHS', 'to_currency' => 'USD', 'rate' => 0.0667, 'source' => 'openexchangerates'],
            ['from_currency' => 'NGN', 'to_currency' => 'USD', 'rate' => 0.000625, 'source' => 'openexchangerates'],
            ['from_currency' => 'KES', 'to_currency' => 'USD', 'rate' => 0.00775, 'source' => 'openexchangerates'],
            ['from_currency' => 'MAD', 'to_currency' => 'EUR', 'rate' => 0.0912, 'source' => 'openexchangerates'],
            ['from_currency' => 'ZAR', 'to_currency' => 'USD', 'rate' => 0.0545, 'source' => 'openexchangerates'],
            ['from_currency' => 'GBP', 'to_currency' => 'EUR', 'rate' => 1.165, 'source' => 'ecb'],
            ['from_currency' => 'EUR', 'to_currency' => 'GBP', 'rate' => 0.858, 'source' => 'ecb'],
            ['from_currency' => 'USD', 'to_currency' => 'EUR', 'rate' => 0.925, 'source' => 'ecb'],
            ['from_currency' => 'EUR', 'to_currency' => 'USD', 'rate' => 1.081, 'source' => 'ecb'],
        ];

        foreach ($rates as $rate) {
            DB::table('exchange_rates')->insert(array_merge($rate, [
                'inverse_rate' => $rate['rate'] > 0 ? round(1 / $rate['rate'], 8) : null,
                'fetched_at' => $now,
                'valid_from' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_currencies');
        Schema::dropIfExists('exchange_rates');
        Schema::dropIfExists('currencies');
    }
};
