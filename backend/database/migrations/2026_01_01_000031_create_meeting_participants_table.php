<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('meeting_participants')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('meeting_participants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('meeting_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->enum('role', ['organizer', 'participant', 'observer', 'secretary'])->default('participant');
                $table->enum('status', ['invited', 'accepted', 'declined', 'attended', 'absent'])->default('invited');
                $table->boolean('is_present')->default(false);
                $table->timestamp('responded_at')->nullable();
                $table->timestamp('arrived_at')->nullable();
                $table->timestamp('left_at')->nullable();
                $table->timestamps();

                $table->unique(['meeting_id', 'user_id']);
                $table->index('meeting_id');
                $table->index('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_participants');
    }
};
