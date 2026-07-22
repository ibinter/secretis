<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitor_appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('host_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('visitor_id')->nullable()->constrained('visitors')->nullOnDelete();
            $table->string('visitor_name');
            $table->string('visitor_email')->nullable();
            $table->string('visitor_phone')->nullable();
            $table->string('visitor_company')->nullable();
            $table->string('purpose');
            $table->text('description')->nullable();
            $table->timestamp('scheduled_at');
            $table->integer('duration_minutes')->default(30);
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])->default('pending');
            $table->string('confirmation_token')->unique();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('host_id');
            $table->index('visitor_id');
            $table->index('scheduled_at');
            $table->index('status');
        });

        // Add FK for visitor_logs.appointment_id now that appointments table exists
        Schema::table('visitor_logs', function (Blueprint $table) {
            $table->foreign('appointment_id')->references('id')->on('visitor_appointments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('visitor_logs', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
        });
        Schema::dropIfExists('visitor_appointments');
    }
};
