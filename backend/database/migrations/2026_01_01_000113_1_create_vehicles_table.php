<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table `vehicles` — MIGRATION MANQUANTE, reconstituée depuis la production.
 *
 * La table existe en production, plusieurs migrations la modifient
 * (`2026_01_01_000114_enhance_vehicles_advanced` y ajoute le suivi GPS,
 * `2026_08_05_000008_create_resources_tables` en dépend pour les demandes de
 * véhicule et le carnet de bord), le modèle `Vehicle` et le module Flotte s'en
 * servent — mais AUCUNE MIGRATION DU DÉPÔT NE LA CRÉAIT. Elle avait été posée
 * hors migration, directement en base.
 *
 * Conséquence : le dépôt ne pouvait pas reconstruire sa propre base. Trois
 * migrations échouaient en cascade sur « relation "vehicles" does not exist »,
 * et donc aussi tout ce qui suivait — dont le module Ressources en entier.
 *
 * Le schéma ci-dessous est relevé sur la base de production, en ne retenant que
 * les colonnes ANTÉRIEURES aux migrations qui les ajoutent ensuite : le suivi
 * GPS reste à 000114, l'immatriculation `plate_number` et les dates
 * d'assurance restent à 2026_08_05_000008. Recopier ici l'état final aurait
 * fait échouer ces deux migrations sur des colonnes déjà présentes — le défaut
 * même qu'on corrige.
 *
 * Le numéro `000113_1` place la création avant 000114 sans renuméroter les
 * migrations déjà jouées en production.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vehicles')) {
            return;   // production : la table est déjà là
        }

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();

            // Nullable comme en production : la colonne n'y porte pas de
            // contrainte NOT NULL, et la poser ici ferait diverger une base
            // neuve de l'existante.
            $table->unsignedBigInteger('organization_id')->nullable();

            // `registration` est la colonne historique. Le code applicatif
            // utilise `plate_number`, ajoutée plus tard par le module
            // Ressources — les deux coexistent en production.
            $table->string('registration', 50)->nullable();

            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('type', 50)->nullable();
            $table->string('status', 30)->nullable()->default('active');
            $table->integer('mileage')->nullable();
            $table->string('fuel_type', 30)->nullable();

            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
