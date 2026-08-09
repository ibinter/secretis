<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('support_tickets')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('support_tickets')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('support_tickets', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                    $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
                    $table->string('reference')->unique();
                    $table->string('subject');
                    $table->longText('description');
                    $table->enum('category', ['technical', 'billing', 'feature_request', 'bug', 'other'])->default('technical');
                    $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
                    $table->enum('status', ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'])->default('open');
                    $table->json('attachments')->nullable();
                    $table->timestamp('first_response_at')->nullable();
                    $table->timestamp('resolved_at')->nullable();
                    $table->timestamp('closed_at')->nullable();
                    $table->integer('satisfaction_rating')->nullable(); // 1-5
                    $table->text('satisfaction_comment')->nullable();
                    $table->timestamps();

                    $table->index('organization_id');
                    $table->index('user_id');
                    $table->index('assigned_to');
                    $table->index('status');
                    $table->index('priority');
                    $table->index('created_at');
                });
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
