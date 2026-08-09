<?php

/*
 * AJOUTS DE COLONNES RENDUS IDEMPOTENTS.
 *
 * Cette migration a echoue A MI-PARCOURS en production, puis a ete marquee
 * comme jouee : une partie de ses colonnes existe, une autre non. La rejouer
 * pour completer ce qui manque exige que chaque ajout sache ne rien faire
 * quand la colonne est deja la.
 *
 * Les `->change()`, index, cles etrangeres et suppressions ne sont PAS
 * touches : ce ne sont pas des ajouts, et les garder tels quels evite de
 * modifier un comportement en corrigeant une idempotence.
 */

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Module Parc Auto Avancé (IBIG SECRETIS)
 *
 * Ajoute les tables de géolocalisation, maintenance prédictive,
 * carburant, trajets, affectations et géofences.
 */
return new class extends Migration
{
    // -------------------------------------------------------------------------
    // UP
    // -------------------------------------------------------------------------

    public function up(): void
    {
        // -----------------------------------------------------------------
        // 1. Colonnes GPS sur la table vehicles existante
        // -----------------------------------------------------------------
        Schema::table('vehicles', function (Blueprint $table) {
            if (! Schema::hasColumn('vehicles', 'gps_device_id')) {
                $table->string('gps_device_id')->nullable()->after('fuel_type');
            }
            if (! Schema::hasColumn('vehicles', 'gps_provider')) {
                $table->string('gps_provider')->nullable()->comment('traccar|wialon|custom')->after('gps_device_id');
            }
            if (! Schema::hasColumn('vehicles', 'current_lat')) {
                $table->decimal('current_lat', 10, 7)->nullable()->after('gps_provider');
            }
            if (! Schema::hasColumn('vehicles', 'current_lng')) {
                $table->decimal('current_lng', 10, 7)->nullable()->after('current_lat');
            }
            if (! Schema::hasColumn('vehicles', 'current_speed')) {
                $table->unsignedSmallInteger('current_speed')->default(0)->after('current_lng');
            }
            if (! Schema::hasColumn('vehicles', 'engine_on')) {
                $table->boolean('engine_on')->default(false)->after('current_speed');
            }
            if (! Schema::hasColumn('vehicles', 'fuel_level_percent')) {
                $table->unsignedTinyInteger('fuel_level_percent')->nullable()->after('engine_on');
            }
            if (! Schema::hasColumn('vehicles', 'odometer_km')) {
                $table->unsignedInteger('odometer_km')->nullable()->after('fuel_level_percent');
            }
            if (! Schema::hasColumn('vehicles', 'last_gps_update')) {
                $table->timestamp('last_gps_update')->nullable()->after('odometer_km');
            }
        });

        // -----------------------------------------------------------------
        // 2. vehicle_gps_logs — Historique des positions GPS
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_gps_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_gps_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->unsignedSmallInteger('speed_kmh')->default(0);
                $table->unsignedSmallInteger('heading')->default(0)->comment('0-360 degrés');
                $table->smallInteger('altitude')->default(0)->comment('Altitude en mètres');
                $table->unsignedTinyInteger('accuracy')->default(0)->comment('Précision GPS en mètres');
                $table->boolean('engine_on')->default(false);
                $table->unsignedTinyInteger('fuel_level_percent')->nullable();
                $table->unsignedInteger('odometer_km')->nullable();
                $table->timestamp('recorded_at');
                $table->enum('source', ['gps_device', 'manual', 'mobile_app'])->default('gps_device');
                $table->timestamps();

                // Index pour les requêtes fréquentes
                $table->index(['vehicle_id', 'recorded_at']);
                $table->index(['organization_id', 'recorded_at']);
            });
        }

        // -----------------------------------------------------------------
        // 3. vehicle_trips — Trajets / Carnet de bord
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_trips')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_trips', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('driver_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('start_at');
                $table->timestamp('end_at')->nullable();
                $table->string('start_location')->nullable();
                $table->string('end_location')->nullable();
                $table->decimal('start_lat', 10, 7)->nullable();
                $table->decimal('start_lng', 10, 7)->nullable();
                $table->decimal('end_lat', 10, 7)->nullable();
                $table->decimal('end_lng', 10, 7)->nullable();
                $table->decimal('distance_km', 8, 2)->nullable();
                $table->unsignedSmallInteger('duration_minutes')->nullable();
                $table->decimal('avg_speed', 6, 2)->nullable();
                $table->unsignedSmallInteger('max_speed')->nullable();
                $table->decimal('fuel_consumed_liters', 6, 2)->nullable();
                $table->enum('purpose', ['professionnel', 'personnel', 'mixte'])->default('professionnel');
                $table->text('notes')->nullable();
                $table->text('polyline')->nullable()->comment('Encoded Google Polyline');
                $table->enum('status', ['in_progress', 'completed', 'cancelled'])->default('in_progress');
                $table->timestamps();

                $table->index(['vehicle_id', 'start_at']);
                $table->index(['organization_id', 'start_at']);
                $table->index(['driver_user_id', 'start_at']);
            });
        }

        // -----------------------------------------------------------------
        // 4. vehicle_maintenance_schedules — Planning maintenance prédictive
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_maintenance_schedules')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_maintenance_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->enum('maintenance_type', [
                    'vidange', 'pneus', 'freins', 'courroie',
                    'revision', 'ct', 'assurance', 'vignette',
                ]);
                $table->unsignedInteger('interval_km')->nullable()->comment('Intervalle en km');
                $table->unsignedSmallInteger('interval_days')->nullable()->comment('Intervalle en jours');
                $table->unsignedInteger('last_done_km')->nullable();
                $table->date('last_done_date')->nullable();
                $table->unsignedInteger('next_due_km')->nullable()->comment('Calculé : last_done_km + interval_km');
                $table->date('next_due_date')->nullable()->comment('Calculé : last_done_date + interval_days');
                $table->decimal('cost_last', 10, 2)->nullable();
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['vehicle_id', 'maintenance_type'], 'uniq_vehicle_maint_type');
                $table->index(['organization_id', 'next_due_date']);
            });
        }

        // -----------------------------------------------------------------
        // 5. vehicle_maintenance_logs — Historique des maintenances effectuées
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_maintenance_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_maintenance_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->enum('maintenance_type', [
                    'vidange', 'pneus', 'freins', 'courroie',
                    'revision', 'ct', 'assurance', 'vignette',
                ]);
                $table->date('done_date');
                $table->unsignedInteger('done_km')->nullable();
                $table->decimal('cost', 10, 2)->nullable();
                $table->string('garage_name')->nullable();
                $table->string('invoice_path')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['vehicle_id', 'done_date']);
            });
        }

        // -----------------------------------------------------------------
        // 6. vehicle_fuel_logs — Journal des pleins de carburant
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_fuel_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_fuel_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('driver_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->date('fuel_date');
                $table->enum('fuel_type', ['essence', 'diesel', 'hybride', 'electrique'])->default('diesel');
                $table->decimal('quantity_liters', 8, 2);
                $table->decimal('unit_price', 8, 2);
                // `virtualAs` est de la syntaxe MySQL. PostgreSQL ne connait que les
                // colonnes generees STOCKEES : Laravel produisait un SQL invalide
                // (« syntax error at or near "," ») et la migration echouait a
                // mi-parcours — en production aussi, ou `vehicle_fuel_logs` existe
                // mais pas `vehicle_maintenance_logs`, creee juste apres.
                $table->decimal('total_cost', 10, 2)->storedAs('quantity_liters * unit_price');
                $table->unsignedInteger('odometer_km');
                $table->string('station_name')->nullable();
                $table->string('receipt_path')->nullable();
                $table->boolean('full_tank')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['vehicle_id', 'fuel_date']);
                $table->index(['organization_id', 'fuel_date']);
            });
        }

        // -----------------------------------------------------------------
        // 7. vehicle_assignments — Affectations de véhicules
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_assignments')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->enum('assignment_type', ['permanent', 'mission', 'journalier'])->default('mission');
                $table->date('start_date');
                $table->date('end_date')->nullable();
                $table->string('purpose')->nullable();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->enum('status', ['pending', 'active', 'returned'])->default('pending');
                $table->enum('return_condition', ['excellent', 'bon', 'moyen', 'mauvais'])->nullable();
                $table->text('return_notes')->nullable();
                $table->timestamps();

                $table->index(['vehicle_id', 'status']);
                $table->index(['user_id', 'status']);
            });
        }

        // -----------------------------------------------------------------
        // 8. vehicle_geofences — Zones géographiques de surveillance
        // -----------------------------------------------------------------
        if (! Schema::hasTable('vehicle_geofences')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vehicle_geofences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('name');
                $table->enum('type', ['circle', 'polygon'])->default('circle');
                $table->decimal('center_lat', 10, 7)->nullable();
                $table->decimal('center_lng', 10, 7)->nullable();
                $table->unsignedInteger('radius_meters')->nullable()->comment('Pour les zones circulaires');
                $table->json('polygon_coords')->nullable()->comment('Array de {lat, lng} pour les polygones');
                $table->boolean('alert_on_enter')->default(true);
                $table->boolean('alert_on_exit')->default(true);
                $table->boolean('is_active')->default(true);
                $table->json('notify_user_ids')->nullable()->comment('Array des IDs utilisateurs à notifier');
                $table->timestamps();

                $table->index(['organization_id', 'is_active']);
            });
        }
    }

    // -------------------------------------------------------------------------
    // DOWN
    // -------------------------------------------------------------------------

    public function down(): void
    {
        Schema::dropIfExists('vehicle_geofences');
        Schema::dropIfExists('vehicle_assignments');
        Schema::dropIfExists('vehicle_fuel_logs');
        Schema::dropIfExists('vehicle_maintenance_logs');
        Schema::dropIfExists('vehicle_maintenance_schedules');
        Schema::dropIfExists('vehicle_trips');
        Schema::dropIfExists('vehicle_gps_logs');

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'gps_device_id', 'gps_provider', 'current_lat', 'current_lng',
                'current_speed', 'engine_on', 'fuel_level_percent', 'odometer_km', 'last_gps_update',
            ]);
        });
    }
};
