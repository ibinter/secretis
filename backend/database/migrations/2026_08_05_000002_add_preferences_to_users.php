<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // La colonne `locale` existe déjà dans la migration initiale des users
            // (2026_01_01_000003) mais on la garde ici par sécurité pour les schémas
            // qui ne l'auraient pas.
            if (! Schema::hasColumn('users', 'locale')) {
                $table->string('locale', 10)->nullable()->default('fr');
            }

            // Préférences UI (thème, couleur d'accent, taille de police, densité, etc.)
            if (! Schema::hasColumn('users', 'preferences')) {
                $table->json('preferences')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'preferences')) {
                $table->dropColumn('preferences');
            }
            // On ne supprime pas `locale` : elle appartient à la migration initiale.
        });
    }
};
