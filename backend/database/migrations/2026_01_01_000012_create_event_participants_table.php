<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['pending', 'accepted', 'declined', 'tentative'])->default('pending');
            $table->enum('role', ['organizer', 'attendee', 'optional'])->default('attendee');
            $table->timestamp('responded_at')->nullable();
            $table->text('response_note')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'user_id']);
            $table->index('event_id');
            $table->index('user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_participants');
    }
};
