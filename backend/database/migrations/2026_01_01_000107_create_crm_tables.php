<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CRM Tables — Module SuperAdmin IBIG Soft
     *
     * Ces tables sont globales (sans organization_id) car elles appartiennent
     * à IBIG Soft et gèrent les prospects/clients de l'éditeur lui-même.
     *
     * Tables créées :
     *  - crm_contacts          : prospects, clients, partenaires
     *  - crm_pipeline_stages   : étapes du pipeline de vente
     *  - crm_deals             : opportunités commerciales
     *  - crm_activities        : historique des interactions
     *  - crm_email_templates   : modèles d'emails de vente
     *  - crm_email_sequences   : séquences d'emails automatisées
     *  - crm_email_logs        : historique des envois d'emails
     */
    public function up(): void
    {
        // ── 1. Contacts CRM ───────────────────────────────────────────────────
        if (! Schema::hasTable('crm_contacts')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_contacts', function (Blueprint $table) {
                $table->id();
                $table->enum('type', ['prospect', 'client', 'partner', 'lead'])->default('lead');
                $table->string('company_name');
                $table->string('contact_name');
                $table->string('email')->unique();
                $table->string('phone', 30)->nullable();
                $table->string('country', 2)->nullable(); // ISO 3166-1 alpha-2
                $table->string('city', 100)->nullable();
                $table->string('sector', 100)->nullable(); // Secteur d'activité
                $table->integer('employee_count')->nullable();
                $table->bigInteger('annual_revenue')->nullable(); // XOF
                $table->enum('source', ['web', 'referral', 'partner', 'event', 'cold', 'social', 'inbound'])->default('web');
                $table->enum('status', ['new', 'contacted', 'qualified', 'demo', 'proposal', 'negotiation', 'won', 'lost', 'inactive'])->default('new');
                $table->unsignedBigInteger('assigned_to')->nullable(); // FK vers users (superadmin)
                $table->text('notes')->nullable();
                $table->integer('bant_score')->nullable(); // 0-100
                $table->json('tags')->nullable();
                $table->timestamp('last_contact_at')->nullable();
                $table->timestamps();

                $table->index('type');
                $table->index('status');
                $table->index('assigned_to');
                $table->index('country');
                $table->index('source');
                $table->index('last_contact_at');
                $table->index('created_at');
            });
        }

        // ── 2. Étapes du pipeline ─────────────────────────────────────────────
        if (! Schema::hasTable('crm_pipeline_stages')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_pipeline_stages', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->unsignedInteger('order')->default(0);
                $table->string('color', 20)->default('#6B7280'); // Couleur CSS
                $table->unsignedInteger('probability_percent')->default(0); // 0-100
                $table->boolean('is_closed_won')->default(false);
                $table->boolean('is_closed_lost')->default(false);
                $table->timestamps();

                $table->unique('order');
                $table->index('is_closed_won');
                $table->index('is_closed_lost');
            });
        }

        // ── 3. Deals (opportunités) ───────────────────────────────────────────
        if (! Schema::hasTable('crm_deals')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_deals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
                $table->foreignId('stage_id')->constrained('crm_pipeline_stages');
                $table->string('title');
                $table->bigInteger('value')->default(0); // XOF
                $table->string('currency', 3)->default('XOF');
                $table->enum('plan', ['starter', 'pro', 'enterprise'])->nullable();
                $table->unsignedInteger('users_count')->nullable();
                $table->date('close_date_expected')->nullable();
                $table->date('close_date_actual')->nullable();
                $table->unsignedInteger('probability')->nullable(); // 0-100, override du stage
                $table->string('lost_reason')->nullable();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('assigned_to')->nullable();
                $table->timestamps();

                $table->index('contact_id');
                $table->index('stage_id');
                $table->index('assigned_to');
                $table->index('plan');
                $table->index('close_date_expected');
                $table->index('created_at');
            });
        }

        // ── 4. Activités CRM ──────────────────────────────────────────────────
        if (! Schema::hasTable('crm_activities')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_activities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
                $table->foreignId('deal_id')->nullable()->constrained('crm_deals')->nullOnDelete();
                $table->enum('type', ['call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'note', 'task'])->default('note');
                $table->string('subject');
                $table->text('notes')->nullable();
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->string('outcome')->nullable(); // Résultat de l'activité
                $table->unsignedBigInteger('created_by');
                $table->timestamps();

                $table->index('contact_id');
                $table->index('deal_id');
                $table->index('type');
                $table->index('scheduled_at');
                $table->index('created_by');
                $table->index('created_at');
            });
        }

        // ── 5. Templates d'emails ─────────────────────────────────────────────
        if (! Schema::hasTable('crm_email_templates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_email_templates', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('subject');
                $table->longText('body_html');
                $table->longText('body_text')->nullable();
                $table->enum('category', ['outreach', 'follow_up', 'demo', 'proposal', 'onboarding', 'churn_prevention'])->default('outreach');
                $table->json('variables')->nullable(); // Liste des variables {{contact_name}}, etc.
                $table->unsignedBigInteger('created_by');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('category');
                $table->index('is_active');
            });
        }

        // ── 6. Séquences email ────────────────────────────────────────────────
        if (! Schema::hasTable('crm_email_sequences')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_email_sequences', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->enum('trigger', ['manual', 'deal_stage_change', 'trial_start', 'trial_expiry', 'demo_done', 'proposal_sent'])->default('manual');
                $table->json('steps'); // Array : [{delay_days: 0, template_id: 1}, ...]
                $table->string('trigger_stage_id')->nullable(); // Pour deal_stage_change
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('trigger');
                $table->index('is_active');
            });
        }

        // ── 7. Logs d'emails ──────────────────────────────────────────────────
        if (! Schema::hasTable('crm_email_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('crm_email_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained('crm_contacts')->cascadeOnDelete();
                $table->foreignId('template_id')->nullable()->constrained('crm_email_templates')->nullOnDelete();
                $table->string('subject');
                $table->string('to_email');
                $table->string('message_id')->nullable(); // ID SMTP pour tracking
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('clicked_at')->nullable();
                $table->timestamp('bounced_at')->nullable();
                $table->string('bounce_reason')->nullable();
                $table->timestamps();

                $table->index('contact_id');
                $table->index('template_id');
                $table->index('sent_at');
                $table->index('opened_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_email_logs');
        Schema::dropIfExists('crm_email_sequences');
        Schema::dropIfExists('crm_email_templates');
        Schema::dropIfExists('crm_activities');
        Schema::dropIfExists('crm_deals');
        Schema::dropIfExists('crm_pipeline_stages');
        Schema::dropIfExists('crm_contacts');
    }
};
