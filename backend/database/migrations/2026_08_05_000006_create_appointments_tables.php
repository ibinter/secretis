<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Portail visiteur — RDV en ligne.
 * Crée appointment_slots + appointments (conformes aux modèles AppointmentSlot/Appointment)
 * et ajoute users.accepts_appointments. Non-destructif (guardé).
 * NB : distinct de la table héritée visitor_appointments.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('appointment_slots')) {
            Schema::create('appointment_slots', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('host_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->date('date');
                $table->time('start_time');
                $table->time('end_time');
                $table->string('location')->nullable();
                $table->boolean('is_available')->default(true);
                $table->timestamp('booked_at')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'host_id', 'date']);
                $table->index(['organization_id', 'is_available']);
                $table->index(['host_id', 'date']);
            });
        }

        if (! Schema::hasTable('appointments')) {
            Schema::create('appointments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('slot_id')->nullable()->constrained('appointment_slots')->nullOnDelete();
                $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('visitor_id')->nullable()->constrained('visitors')->nullOnDelete();
                $table->string('first_name', 150);
                $table->string('last_name', 150);
                $table->string('email');
                $table->string('phone', 30);
                $table->string('company')->nullable();
                $table->string('service')->nullable();
                $table->string('purpose', 500)->default('Rendez-vous');
                $table->string('status', 20)->default('pending'); // pending|confirmed|cancelled|completed|no_show
                $table->string('source', 20)->default('portal');  // portal|manual
                $table->string('confirm_token', 64)->unique();
                $table->timestamp('scheduled_at');
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->text('cancellation_reason')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'status']);
                $table->index(['host_id', 'scheduled_at']);
                $table->index('scheduled_at');
            });
        }

        if (! Schema::hasColumn('users', 'accepts_appointments')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('accepts_appointments')->default(false);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('appointment_slots');
        if (Schema::hasColumn('users', 'accepts_appointments')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('accepts_appointments');
            });
        }
    }
};
