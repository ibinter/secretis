<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * vehicle_logs — carnet de bord véhicule (modèle VehicleLog existant, table absente).
 * Sans elle, le tableau de bord Ressources renvoie "relation vehicle_logs does not exist".
 * Colonnes alignées sur le $fillable/$casts du modèle et sur le formulaire
 * Pages/Ressources/Vehicules/Index.jsx.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('vehicle_logs')) {
            return;
        }

        Schema::create('vehicle_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('vehicle_request_id')->nullable()->constrained('vehicle_requests')->nullOnDelete();
            $table->integer('mileage_start')->default(0);
            $table->integer('mileage_end')->nullable();
            $table->decimal('fuel_added', 10, 2)->nullable();
            $table->string('destination')->nullable();
            $table->string('purpose', 300)->nullable();
            $table->timestamp('departed_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamps();

            $table->index(['vehicle_id', 'departed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_logs');
    }
};
