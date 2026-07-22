<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // starter, pro, enterprise
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price_xof', 10, 2)->default(0); // Franc CFA BCEAO
            $table->decimal('price_eur', 10, 2)->default(0); // Euro
            $table->decimal('price_usd', 10, 2)->default(0); // Dollar US
            $table->integer('max_users')->default(5);
            $table->integer('duration_months')->default(1);
            $table->json('features')->nullable();
            $table->json('modules')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('slug');
            $table->index('is_active');
        });

        // Seeder initial des plans
        DB::table('plans')->insert([
            [
                'slug'            => 'starter',
                'name'            => 'Starter',
                'description'     => 'Idéal pour les petites structures',
                'price_xof'       => 25000,
                'price_eur'       => 38,
                'price_usd'       => 41,
                'max_users'       => 5,
                'duration_months' => 1,
                'features'        => json_encode(['Agenda & réunions', 'Courrier simple', 'Gestion documents', '5 utilisateurs']),
                'modules'         => json_encode(['agenda', 'courrier', 'documents']),
                'is_active'       => true,
                'is_public'       => true,
                'sort_order'      => 1,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
            [
                'slug'            => 'pro',
                'name'            => 'Professionnel',
                'description'     => 'Pour les organisations en croissance',
                'price_xof'       => 60000,
                'price_eur'       => 91,
                'price_usd'       => 98,
                'max_users'       => 25,
                'duration_months' => 1,
                'features'        => json_encode(['Tout Starter', 'Projets', 'RH & congés', 'Rapports', '25 utilisateurs']),
                'modules'         => json_encode(['agenda', 'courrier', 'documents', 'projets', 'rh']),
                'is_active'       => true,
                'is_public'       => true,
                'sort_order'      => 2,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
            [
                'slug'            => 'enterprise',
                'name'            => 'Entreprise',
                'description'     => 'Pour les grandes institutions',
                'price_xof'       => 120000,
                'price_eur'       => 183,
                'price_usd'       => 197,
                'max_users'       => 100,
                'duration_months' => 1,
                'features'        => json_encode(['Tout Pro', 'Multi-département', 'API', 'Audit avancé', '100 utilisateurs']),
                'modules'         => json_encode(['agenda', 'courrier', 'documents', 'projets', 'rh', 'audit', 'api']),
                'is_active'       => true,
                'is_public'       => true,
                'sort_order'      => 3,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
