<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Visiteurs ────────────────────────────────────────────────────────────
        Schema::create('visitors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('full_name');
            $table->enum('id_type', ['CNI', 'Passeport', 'Permis', 'Autre']);
            $table->string('id_number');
            $table->string('company')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('badge_number')->nullable();
            $table->boolean('is_blacklisted')->default(false);
            $table->text('blacklist_reason')->nullable();
            $table->unsignedInteger('visit_count')->default(0);
            $table->timestamp('last_visit_at')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'id_number']);
            $table->index(['organization_id', 'is_blacklisted']);
            $table->index(['organization_id', 'full_name']);
        });

        // ─── Zones d'accès ────────────────────────────────────────────────────────
        Schema::create('access_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name'); // Hall d'accueil, Salle de réunion, Open space, Direction, Serveur…
            $table->boolean('requires_escort')->default(false);
            $table->enum('access_level', ['public', 'restricted', 'confidential'])->default('public');
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->timestamps();

            $table->index('organization_id');
        });

        // ─── Spots de parking ─────────────────────────────────────────────────────
        Schema::create('parking_spots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('spot_number');
            $table->enum('zone', ['visiteurs', 'employes', 'direction'])->default('visiteurs');
            $table->boolean('is_available')->default(true);
            $table->foreignId('current_visitor_id')->nullable()->constrained('visitors')->nullOnDelete();
            $table->timestamps();

            $table->unique(['organization_id', 'spot_number']);
            $table->index(['organization_id', 'is_available']);
        });

        // ─── Journal des visites ───────────────────────────────────────────────────
        Schema::create('visit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('visitor_id')->constrained('visitors')->cascadeOnDelete();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('purpose', ['réunion', 'livraison', 'maintenance', 'autre'])->default('réunion');
            $table->string('purpose_detail')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('check_in_at')->nullable();
            $table->timestamp('check_out_at')->nullable();
            $table->boolean('badge_issued')->default(false);
            $table->boolean('badge_returned')->default(false);
            $table->string('location')->nullable(); // salle ou bureau
            $table->jsonb('equipment_brought')->nullable(); // liste des équipements amenés
            $table->string('signature_path')->nullable();
            $table->enum('status', ['scheduled', 'checked_in', 'checked_out', 'no_show', 'cancelled'])->default('scheduled');
            $table->string('floor')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete(); // réceptionniste
            $table->foreignId('access_zone_id')->nullable()->constrained('access_zones')->nullOnDelete();
            $table->foreignId('parking_spot_id')->nullable()->constrained('parking_spots')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'check_in_at']);
            $table->index(['visitor_id', 'check_in_at']);
            $table->index(['host_user_id', 'check_in_at']);
        });

        // ─── Invitations visiteurs ────────────────────────────────────────────────
        Schema::create('visitor_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
            $table->string('visitor_email');
            $table->string('visitor_name');
            $table->date('visit_date');
            $table->time('visit_time_start');
            $table->time('visit_time_end');
            $table->string('purpose')->nullable();
            $table->uuid('access_code')->unique();
            $table->boolean('is_used')->default(false);
            $table->timestamp('used_at')->nullable();
            $table->timestamp('expires_at');
            $table->string('location')->nullable();
            $table->foreignId('visit_log_id')->nullable()->constrained('visit_logs')->nullOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'visit_date']);
            $table->index('access_code');
            $table->index(['visitor_email', 'is_used']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitor_invitations');
        Schema::dropIfExists('visit_logs');
        Schema::dropIfExists('parking_spots');
        Schema::dropIfExists('access_zones');
        Schema::dropIfExists('visitors');
    }
};
