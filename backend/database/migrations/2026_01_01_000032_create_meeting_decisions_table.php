<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('meeting_decisions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('meeting_decisions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('meeting_id')->constrained()->cascadeOnDelete();
                $table->text('decision');
                $table->text('action_required')->nullable();
                $table->foreignId('responsible_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('deadline')->nullable();
                $table->enum('status', ['pending', 'in_progress', 'done', 'cancelled'])->default('pending');
                $table->integer('position')->default(0);
                $table->timestamps();

                $table->index('meeting_id');
                $table->index('responsible_id');
                $table->index('status');
                $table->index('deadline');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('meeting_decisions');
    }
};
