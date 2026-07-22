<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('calendar_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('color', 7)->nullable();
            $table->enum('type', ['meeting', 'task', 'reminder', 'holiday', 'other'])->default('meeting');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->boolean('all_day')->default(false);
            $table->json('recurrence_rule')->nullable();
            $table->foreignId('parent_event_id')->nullable()->constrained('events')->cascadeOnDelete();
            $table->boolean('is_cancelled')->default(false);
            $table->foreignId('room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('calendar_id');
            $table->index('created_by');
            $table->index('starts_at');
            $table->index('ends_at');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
