<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module Ressources — tables manquantes (les modèles existaient déjà, pas les tables).
 * Sans elles, /ressources/materiel, /ressources/fournitures et /ressources/vehicules
 * renvoient une 500 ("relation does not exist").
 * Colonnes alignées sur les $fillable des modèles Equipment, EquipmentMaintenanceLog,
 * Supply, SupplyMovement et VehicleRequest. Non-destructif (guardé par hasTable).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('equipment')) {
            Schema::create('equipment', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name');
                $table->string('serial_number')->nullable();
                $table->string('category', 50)->default('autre');   // informatique|mobilier|audiovisuel|autre
                $table->string('status', 30)->default('available'); // available|assigned|maintenance|retired
                $table->string('brand')->nullable();
                $table->string('model')->nullable();
                $table->date('purchase_date')->nullable();
                $table->date('warranty_end')->nullable();
                $table->decimal('purchase_price', 15, 2)->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'category']);
            });
        }

        if (! Schema::hasTable('equipment_maintenance_logs')) {
            Schema::create('equipment_maintenance_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
                $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('reason');
                $table->string('status', 30)->default('pending'); // pending|in_progress|resolved
                $table->text('resolution_notes')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->index(['equipment_id', 'status']);
            });
        }

        if (! Schema::hasTable('supplies')) {
            Schema::create('supplies', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('name');
                $table->string('unit', 30)->default('unité');
                $table->integer('quantity')->default(0);
                $table->integer('min_quantity')->default(0);
                $table->decimal('unit_price', 15, 2)->nullable();
                $table->string('supplier')->nullable();
                $table->string('reference')->nullable();
                $table->string('location')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'name']);
            });
        }

        if (! Schema::hasTable('supply_movements')) {
            Schema::create('supply_movements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('supply_id')->constrained('supplies')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type', 10);              // in|out
                $table->integer('quantity');
                $table->string('reason')->nullable();
                $table->integer('stock_after')->default(0);
                $table->timestamps();

                $table->index(['supply_id', 'created_at']);
            });
        }

        if (! Schema::hasTable('vehicle_requests')) {
            Schema::create('vehicle_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
                $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('status', 30)->default('pending'); // pending|approved|rejected|completed
                $table->timestamp('start_at');
                $table->timestamp('end_at');
                $table->string('destination', 200);
                $table->string('purpose', 300);
                $table->text('rejection_reason')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'status']);
                $table->index(['vehicle_id', 'start_at']);
            });
        }

        // room_reservations : la table utilise starts_at/ends_at alors que TOUT le code
        // (Room, RoomReservation, RoomController, ResourceController) attend start_at/end_at
        // → /ressources/salles renvoyait "column start_at does not exist". Table vide : renommage sûr.
        if (Schema::hasTable('room_reservations')) {
            if (Schema::hasColumn('room_reservations', 'starts_at') && ! Schema::hasColumn('room_reservations', 'start_at')) {
                Schema::table('room_reservations', fn (Blueprint $t) => $t->renameColumn('starts_at', 'start_at'));
            }
            if (Schema::hasColumn('room_reservations', 'ends_at') && ! Schema::hasColumn('room_reservations', 'end_at')) {
                Schema::table('room_reservations', fn (Blueprint $t) => $t->renameColumn('ends_at', 'end_at'));
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_requests');
        Schema::dropIfExists('supply_movements');
        Schema::dropIfExists('supplies');
        Schema::dropIfExists('equipment_maintenance_logs');
        Schema::dropIfExists('equipment');
    }
};
