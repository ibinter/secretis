<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration SaaS Metrics — Super Admin IBIG Soft
 *
 * Crée les tables nécessaires pour le tableau de bord SaaS global :
 * - saas_daily_metrics        : snapshots journaliers des métriques SaaS
 * - organization_health_scores : score de santé par organisation
 * - support_tickets           : tickets support IBIG <-> clients
 * - platform_announcements    : annonces envoyées aux organisations
 * - feature_flags             : drapeaux fonctionnels avec rollout progressif
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── saas_daily_metrics ───────────────────────────────────────────────
        if (! Schema::hasTable('saas_daily_metrics')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('saas_daily_metrics', function (Blueprint $table) {
                $table->id();
                $table->date('metric_date')->unique();

                // Organisations
                $table->unsignedInteger('total_organizations')->default(0);
                $table->unsignedInteger('active_organizations')->default(0);
                $table->unsignedInteger('new_organizations')->default(0);
                $table->unsignedInteger('churned_organizations')->default(0);

                // Utilisateurs
                $table->unsignedInteger('total_users')->default(0);
                $table->unsignedInteger('active_users_mau')->default(0);   // sessions dans les 30 derniers jours
                $table->unsignedInteger('active_users_dau')->default(0);   // sessions aujourd'hui

                // Plans
                $table->unsignedInteger('plan_starter_count')->default(0);
                $table->unsignedInteger('plan_pro_count')->default(0);
                $table->unsignedInteger('plan_enterprise_count')->default(0);
                $table->unsignedInteger('on_premise_count')->default(0);

                // Revenus (XOF)
                $table->decimal('mrr_xof', 15, 2)->default(0);             // Monthly Recurring Revenue
                $table->decimal('arr_xof', 15, 2)->default(0);             // Annual Recurring Revenue (mrr * 12)
                $table->decimal('new_mrr', 15, 2)->default(0);             // MRR provenant de nouvelles souscriptions
                $table->decimal('expansion_mrr', 15, 2)->default(0);       // MRR supplémentaire via upgrades
                $table->decimal('churned_mrr', 15, 2)->default(0);         // MRR perdu (annulations)

                $table->timestamp('created_at')->useCurrent();

                $table->index('metric_date');
            });
        }

        // ─── organization_health_scores ───────────────────────────────────────
        if (! Schema::hasTable('organization_health_scores')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('organization_health_scores', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->date('score_date');

                // Score global 0-100
                $table->unsignedTinyInteger('health_score')->default(50);

                // Composantes du score
                $table->decimal('login_frequency', 5, 2)->default(0);   // sessions/semaine (pondéré 25 pts)
                $table->decimal('feature_adoption', 5, 2)->default(0);  // % modules utilisés (pondéré 30 pts)
                $table->decimal('data_volume_gb', 10, 3)->default(0);   // Go de données (pondéré 15 pts)
                $table->unsignedInteger('support_tickets')->default(0); // nb tickets ouverts (pondéré -10 pts)
                $table->timestamp('last_active_at')->nullable();        // dernière activité (pondéré 20 pts)

                // Risque de churn
                $table->enum('churn_risk', ['low', 'medium', 'high'])->default('low');
                $table->string('churn_reason_predicted')->nullable();   // raison principale prédite
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->unique(['organization_id', 'score_date']);
                $table->index('score_date');
                $table->index('health_score');
                $table->index('churn_risk');
            });
        }

        // ─── support_tickets ──────────────────────────────────────────────────
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

                    // Identifiant lisible (TKT-2026-00001)
                    $table->string('ticket_number', 20)->unique();

                    $table->string('title');
                    $table->enum('category', ['bug', 'feature_request', 'billing', 'how_to', 'other'])->default('other');
                    $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
                    $table->enum('status', ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'])->default('open');

                    // Assignation
                    $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

                    // Métriques de performance
                    $table->timestamp('first_response_at')->nullable();
                    $table->timestamp('resolved_at')->nullable();

                    // Satisfaction client (1-5)
                    $table->unsignedTinyInteger('satisfaction_rating')->nullable();

                    // Contact client
                    $table->string('created_by_email');

                    // Thread de messages JSON
                    // Format : [{ id, author_type (client|agent), author_name, content, attachments[], created_at }]
                    $table->jsonb('messages')->default('[]');

                    $table->timestamps();
                    $table->softDeletes();

                    $table->index('organization_id');
                    $table->index('status');
                    $table->index('priority');
                    $table->index('assigned_to');
                    $table->index('created_at');
                });
            }
        }

        // ─── platform_announcements ───────────────────────────────────────────
        if (! Schema::hasTable('platform_announcements')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('platform_announcements', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('content');
                $table->enum('type', ['info', 'warning', 'maintenance', 'feature'])->default('info');

                // Ciblage
                // Ex: ["all"] ou ["starter", "pro"] ou ["enterprise"]
                $table->jsonb('target_plans')->default('["all"]');

                // Planification
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('expires_at')->nullable();

                $table->boolean('is_published')->default(false);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();

                $table->timestamps();

                $table->index('is_published');
                $table->index('scheduled_at');
                $table->index('expires_at');
            });
        }

        // ─── feature_flags ────────────────────────────────────────────────────
        if (! Schema::hasTable('feature_flags')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('feature_flags', function (Blueprint $table) {
                $table->id();

                // Identifiant technique unique (ex: "ai_assistant", "new_billing_ui")
                $table->string('slug')->unique();
                $table->string('name');
                $table->text('description')->nullable();

                // Activation globale (toutes les organisations)
                $table->boolean('is_global')->default(false);

                // Ciblage par organisations spécifiques (IDs)
                // Ex: [1, 5, 12]
                $table->jsonb('target_org_ids')->default('[]');

                // Ciblage par plan
                // Ex: ["pro", "enterprise"]
                $table->jsonb('target_plans')->default('[]');

                // Rollout progressif : % des organisations concernées (0-100)
                $table->unsignedTinyInteger('enabled_percent')->default(0);

                $table->boolean('is_active')->default(false);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();

                $table->timestamps();

                $table->index('slug');
                $table->index('is_active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('feature_flags');
        Schema::dropIfExists('platform_announcements');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('organization_health_scores');
        Schema::dropIfExists('saas_daily_metrics');
    }
};
