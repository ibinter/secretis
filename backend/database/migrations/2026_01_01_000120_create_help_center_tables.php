<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SECRETIS ERP — Migration : Centre d'aide
 *
 * Crée les tables :
 *   - help_articles          : articles de base de connaissances
 *   - help_faqs              : questions fréquentes (100 FAQ)
 *   - support_ticket_templates : modèles de tickets support
 *   - support_tickets        : tickets support utilisateurs
 *   - support_ticket_messages: messages d'un ticket (fil de discussion)
 *   - support_ticket_attachments: pièces jointes aux tickets
 *   - help_article_feedback  : retours utilisateurs (utile/pas utile)
 *   - guided_tour_progress   : avancement de la visite guidée par utilisateur
 *   - onboarding_progress    : avancement de l'onboarding par organisation
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ─── Articles de la base de connaissances ────────────────────────────
        if (! Schema::hasTable('help_articles')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('help_articles')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('help_articles', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('organization_id')
                          ->nullable()
                          ->constrained()
                          ->nullOnDelete(); // null = article global IBIG Soft

                    $table->string('slug')->unique();

                    // Contenu multilingue stocké en JSON
                    $table->json('title');   // {"fr": "...", "en": "..."}
                    $table->json('content'); // {"fr": "<html>...</html>", "en": "..."}

                    // Catégorie principale
                    $table->string('category'); // getting_started | agenda | ged | reunions |
                                                // taches | ressources | parametres | comptabilite |
                                                // securite | depannage | sara

                    $table->json('tags')->nullable();    // ["pdf","export","rapport"]
                    $table->string('module')->nullable(); // nom du module SECRETIS concerné

                    // Visibilité et ciblage
                    $table->json('roles')->nullable();   // ["all"] ou ["admin","manager"]
                    $table->boolean('is_public')->default(true);   // visible sans connexion
                    $table->boolean('is_featured')->default(false); // mis en avant sur l'accueil aide

                    // Métriques d'utilisation
                    $table->unsignedInteger('views')->default(0);
                    $table->unsignedInteger('helpful_yes')->default(0);
                    $table->unsignedInteger('helpful_no')->default(0);

                    // Méta
                    $table->string('author')->nullable();         // "Équipe IBIG Soft"
                    $table->string('version')->nullable();        // "1.0" — version SECRETIS concernée
                    $table->timestamp('published_at')->nullable(); // null = brouillon

                    $table->timestamps();
                    $table->softDeletes();

                    // Index
                    $table->index('category');
                    $table->index('module');
                    $table->index('is_featured');
                    $table->index('published_at');
                });
            }
        }

        // ─── FAQ ─────────────────────────────────────────────────────────────
        if (! Schema::hasTable('help_faqs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('help_faqs', function (Blueprint $table) {
                $table->id();

                // Catégorie de la FAQ
                $table->string('category'); // general | connexion_securite | utilisateurs_permissions |
                                            // parametres | modules_metier | imports_exports |
                                            // documents_impressions | abonnements_licences |
                                            // sauvegardes_restauration | assistant_sara

                // Contenu multilingue
                $table->json('question'); // {"fr": "...", "en": "..."}
                $table->json('answer');   // {"fr": "...", "en": "..."}

                $table->json('keywords')->nullable(); // pour la recherche full-text
                $table->string('module')->nullable(); // module SECRETIS concerné
                $table->json('roles')->nullable();    // ["all"] ou rôles spécifiques

                $table->unsignedSmallInteger('order')->default(0); // ordre d'affichage dans la catégorie
                $table->boolean('is_active')->default(true);

                // Métriques
                $table->unsignedInteger('views')->default(0);
                $table->unsignedInteger('helpful_yes')->default(0);
                $table->unsignedInteger('helpful_no')->default(0);

                $table->timestamps();

                $table->index('category');
                $table->index('is_active');
                $table->index(['category', 'order']);
            });
        }

        // ─── Modèles de tickets support ──────────────────────────────────────
        if (! Schema::hasTable('support_ticket_templates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('support_ticket_templates', function (Blueprint $table) {
                $table->id();

                $table->string('category'); // technical | billing | question | feature_request

                $table->json('name');        // {"fr": "Problème technique", "en": "Technical Issue"}
                $table->json('description'); // {"fr": "Pour tout bug ou dysfonctionnement", "en": "..."}

                // Champs supplémentaires dynamiques
                $table->json('fields')->nullable();
                // [
                //   {"name": "module", "type": "select", "required": true,
                //    "options": ["Agenda","GED","Réunions","Tâches","RH","Ressources"]},
                //   {"name": "steps_to_reproduce", "type": "textarea", "required": false}
                // ]

                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('order')->default(0);

                $table->timestamps();
            });
        }

        // ─── Tickets support ─────────────────────────────────────────────────
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

                    // Numéro de ticket lisible (ex : TKT-2026-00042)
                    $table->string('ticket_number')->unique();

                    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                    $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // créateur

                    // Assigné à un agent support (null = non assigné)
                    $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

                    $table->foreignId('template_id')
                          ->nullable()
                          ->constrained('support_ticket_templates')
                          ->nullOnDelete();

                    $table->string('category'); // technical | billing | question | feature_request
                    $table->string('subject');
                    $table->text('description'); // premier message du ticket

                    $table->string('module')->nullable(); // module SECRETIS concerné
                    $table->string('priority')->default('normal'); // low | normal | high | urgent
                    $table->string('status')->default('open');
                    // open | waiting_customer | waiting_support | in_progress | resolved | closed

                    // Satisfaction après résolution
                    $table->unsignedTinyInteger('satisfaction_rating')->nullable(); // 1-5
                    $table->text('satisfaction_comment')->nullable();

                    // Informations techniques collectées automatiquement
                    $table->json('technical_info')->nullable();
                    // {"browser": "Chrome 124", "os": "Windows 10", "resolution": "1920x1080",
                    //  "secretis_version": "1.0.0", "url": "...", "user_agent": "..."}

                    $table->timestamp('first_response_at')->nullable();
                    $table->timestamp('resolved_at')->nullable();
                    $table->timestamp('closed_at')->nullable();

                    $table->timestamps();
                    $table->softDeletes();

                    $table->index('organization_id');
                    $table->index('user_id');
                    $table->index('status');
                    $table->index('priority');
                    $table->index('assigned_to');
                    $table->index('created_at');
                });
            }
        }

        // ─── Messages d'un ticket (fil de discussion) ────────────────────────
        if (! Schema::hasTable('support_ticket_messages')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('support_ticket_messages', function (Blueprint $table) {
                $table->id();

                $table->foreignId('ticket_id')
                      ->constrained('support_tickets')
                      ->cascadeOnDelete();

                $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // auteur
                $table->boolean('is_support_reply')->default(false); // true = réponse de l'agent support

                $table->text('content'); // Corps HTML du message

                $table->boolean('is_internal')->default(false); // note interne visible uniquement par le support

                $table->timestamps();

                $table->index('ticket_id');
                $table->index('created_at');
            });
        }

        // ─── Pièces jointes aux tickets ──────────────────────────────────────
        if (! Schema::hasTable('support_ticket_attachments')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('support_ticket_attachments', function (Blueprint $table) {
                $table->id();

                $table->foreignId('ticket_id')
                      ->constrained('support_tickets')
                      ->cascadeOnDelete();

                $table->foreignId('message_id')
                      ->nullable()
                      ->constrained('support_ticket_messages')
                      ->cascadeOnDelete();

                $table->string('filename');          // nom original du fichier
                $table->string('stored_path');        // chemin de stockage interne
                $table->string('mime_type');
                $table->unsignedBigInteger('size');   // en octets
                $table->string('disk')->default('local'); // local | s3 | gcs

                $table->timestamps();

                $table->index('ticket_id');
            });
        }

        // ─── Retours sur les articles d'aide ─────────────────────────────────
        if (! Schema::hasTable('help_article_feedback')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('help_article_feedback', function (Blueprint $table) {
                $table->id();

                $table->foreignId('article_id')
                      ->constrained('help_articles')
                      ->cascadeOnDelete();

                $table->foreignId('user_id')
                      ->nullable()
                      ->constrained()
                      ->nullOnDelete();

                $table->boolean('is_helpful'); // true = oui, false = non
                $table->text('comment')->nullable(); // commentaire optionnel

                $table->string('ip_address', 45)->nullable();
                $table->timestamps();

                // Un utilisateur ne peut laisser qu'un retour par article
                $table->unique(['article_id', 'user_id']);
                $table->index('article_id');
            });
        }

        // ─── Avancement visite guidée par utilisateur ────────────────────────
        if (! Schema::hasTable('guided_tour_progress')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('guided_tour_progress', function (Blueprint $table) {
                $table->id();

                $table->foreignId('user_id')->constrained()->cascadeOnDelete();

                $table->string('tour_name')->default('main'); // 'main' ou noms de tours spécifiques
                $table->boolean('is_completed')->default(false);
                $table->unsignedSmallInteger('current_step')->default(0);
                $table->json('completed_steps')->nullable(); // [1, 2, 3, ...]

                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();

                $table->timestamps();

                $table->unique(['user_id', 'tour_name']);
            });
        }

        // ─── Avancement onboarding par organisation ──────────────────────────
        if (! Schema::hasTable('onboarding_progress')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('onboarding_progress', function (Blueprint $table) {
                $table->id();

                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // Admin ayant initialisé

                // Étapes complétées (true/false par étape)
                $table->boolean('organization_profile')->default(false);
                $table->boolean('configure_services')->default(false);
                $table->boolean('set_prefix')->default(false);
                $table->boolean('invite_users')->default(false);
                $table->boolean('create_first_event')->default(false);
                $table->boolean('upload_first_document')->default(false);
                $table->boolean('configure_notifications')->default(false);
                $table->boolean('discover_sara')->default(false);

                // Étape choisie dans le wizard "Votre premier module"
                $table->string('primary_module_choice')->nullable();

                $table->boolean('wizard_completed')->default(false);
                $table->timestamp('wizard_completed_at')->nullable();

                // Checklist widget
                $table->boolean('checklist_dismissed')->default(false);

                $table->timestamps();

                $table->unique('organization_id');
                $table->index('user_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('onboarding_progress');
        Schema::dropIfExists('guided_tour_progress');
        Schema::dropIfExists('help_article_feedback');
        Schema::dropIfExists('support_ticket_attachments');
        Schema::dropIfExists('support_ticket_messages');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('support_ticket_templates');
        Schema::dropIfExists('help_faqs');
        Schema::dropIfExists('help_articles');
    }
};
