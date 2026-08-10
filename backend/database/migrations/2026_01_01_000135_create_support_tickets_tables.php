<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tickets de support SECRETIS ERP
 *
 * Tables :
 *   - support_tickets   : tickets multi-tenant avec workflow complet
 *   - ticket_messages   : messages/réponses + notes internes
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Tickets ───────────────────────────────────────────────────────────
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

                    // Multi-tenant
                    $table->foreignId('organization_id')
                          ->constrained('organizations')
                          ->cascadeOnDelete();

                    // Demandeur
                    $table->foreignId('user_id')
                          ->constrained('users')
                          ->cascadeOnDelete();

                    // Numéro lisible : TKT-YYYYMMDD-XXXXXX
                    $table->string('ticket_number', 20)->unique();

                    $table->string('subject', 255);

                    // Workflow : open | in_progress | waiting_client | resolved | closed
                    $table->enum('status', [
                        'open',
                        'in_progress',
                        'waiting_client',
                        'resolved',
                        'closed',
                    ])->default('open');

                    // Urgence : low | medium | high | urgent
                    $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');

                    // Catégorie fonctionnelle
                    $table->enum('category', [
                        'technical',
                        'billing',
                        'feature_request',
                        'training',
                        'other',
                    ])->default('other');

                    // Agent assigné (agent de support côté IBIG)
                    $table->foreignId('assigned_to')
                          ->nullable()
                          ->constrained('users')
                          ->nullOnDelete();

                    // Horodatages SLA
                    $table->timestamp('first_response_at')->nullable();
                    $table->timestamp('resolved_at')->nullable();
                    $table->timestamp('closed_at')->nullable();

                    // Satisfaction client (CSAT)
                    $table->unsignedTinyInteger('satisfaction_rating')->nullable(); // 1-5
                    $table->text('satisfaction_comment')->nullable();

                    // Métadonnées libres (navigateur, version ERP, etc.)
                    $table->json('metadata')->nullable();

                    $table->timestamps();
                    $table->softDeletes();

                    // Index
                    $table->index(['organization_id', 'status'], 'idx_tickets_org_status');
                    $table->index('ticket_number', 'idx_tickets_number');
                    $table->index(['assigned_to', 'status'], 'idx_tickets_assigned_status');
                });
            }
        }

        // ── Messages ──────────────────────────────────────────────────────────
        if (! Schema::hasTable('ticket_messages')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('ticket_messages', function (Blueprint $table) {
                $table->id();

                $table->foreignId('ticket_id')
                      ->constrained('support_tickets')
                      ->cascadeOnDelete();

                $table->foreignId('user_id')
                      ->constrained('users')
                      ->cascadeOnDelete();

                $table->text('message');

                // Note interne : invisible côté client
                $table->boolean('is_internal')->default(false);

                // Pièces jointes : [{name, path, size, mime}]
                $table->json('attachments')->nullable();

                // Réponse automatique (bot / template)
                $table->boolean('is_auto_reply')->default(false);

                $table->timestamps();

                $table->index('ticket_id', 'idx_ticket_messages_ticket');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_messages');
        Schema::dropIfExists('support_tickets');
    }
};
