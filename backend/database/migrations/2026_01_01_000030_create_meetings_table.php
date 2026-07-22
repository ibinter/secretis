<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('agenda')->nullable(); // [{point: '', duration: '', presenter_id: ''}]
            $table->enum('type', ['regular', 'extraordinary', 'board', 'committee', 'other'])->default('regular');
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'])->default('scheduled');
            $table->timestamp('scheduled_at');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->string('location')->nullable();
            $table->string('virtual_link')->nullable();
            $table->boolean('is_virtual')->default(false);
            $table->text('minutes')->nullable();
            $table->foreignId('secretary_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('created_by');
            $table->index('status');
            $table->index('scheduled_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};
