<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sara_conversations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('sara_conversations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('title')->default('Nouvelle conversation');
                $table->string('context_module')->nullable()->comment('Module actif au démarrage : agenda, ged, tasks, visitors, hr, accounting, reporting, admin');
                $table->json('messages')->default('[]')->comment('Array de {role, content, timestamp}');
                $table->unsignedInteger('tokens_used')->default(0);
                $table->string('provider')->default('groq')->comment('groq, openai, anthropic');
                $table->string('model_used')->nullable();
                $table->enum('feedback', ['positive', 'negative'])->nullable();
                $table->text('feedback_comment')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'user_id']);
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sara_conversations');
    }
};
