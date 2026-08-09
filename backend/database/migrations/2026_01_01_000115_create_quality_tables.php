<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Module Qualité ISO 9001
 *
 * Tables créées :
 *   quality_processes, nonconformities, corrective_actions,
 *   quality_audits, audit_findings, quality_indicators,
 *   quality_indicator_values, quality_documents, customer_complaints
 */
return new class extends Migration
{
    public function up(): void
    {
        // =====================================================================
        // PROCESSUS QUALITÉ
        // =====================================================================
        if (! Schema::hasTable('quality_processes')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('quality_processes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->string('code', 20);              // P-01, P-02 ...
                $table->string('name');
                $table->enum('category', ['management', 'realization', 'support'])->default('realization');
                $table->text('description')->nullable();
                $table->unsignedBigInteger('owner_user_id')->nullable();
                $table->boolean('is_documented')->default(false);
                $table->string('document_path')->nullable();
                $table->string('version', 20)->default('1.0');
                $table->date('last_review_date')->nullable();
                $table->timestamps();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('owner_user_id')->references('id')->on('users')->nullOnDelete();
                $table->unique(['organization_id', 'code']);
                $table->index(['organization_id', 'category']);
            });
        }

        // =====================================================================
        // NON-CONFORMITÉS
        // =====================================================================
        if (! Schema::hasTable('nonconformities')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('nonconformities', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->string('reference', 30)->unique();  // NC-2026-0001
                $table->string('title');
                $table->text('description');
                $table->enum('source', [
                    'audit',
                    'client_complaint',
                    'internal_detection',
                    'supplier',
                    'regulatory',
                ])->default('internal_detection');
                $table->enum('severity', ['mineure', 'majeure', 'critique'])->default('mineure');
                $table->enum('status', [
                    'ouvert',
                    'analyse',
                    'action_corrective',
                    'verification',
                    'clos',
                ])->default('ouvert');
                $table->unsignedBigInteger('detected_by')->nullable();
                $table->dateTime('detected_at');
                $table->unsignedBigInteger('process_id')->nullable();
                $table->string('product_service')->nullable();
                $table->text('immediate_action')->nullable();
                $table->text('root_cause')->nullable();
                $table->enum('root_cause_method', ['5M', '5pourquoi', 'ishikawa'])->nullable();
                $table->jsonb('root_cause_detail')->nullable();   // analyse structurée
                $table->jsonb('corrective_actions')->nullable();  // résumé embarqué
                $table->date('due_date')->nullable();
                $table->unsignedBigInteger('verified_by')->nullable();
                $table->dateTime('verified_at')->nullable();
                $table->dateTime('closed_at')->nullable();
                $table->unsignedSmallInteger('recurrence_count')->default(0);
                $table->decimal('cost_of_nonconformity', 15, 2)->nullable();
                $table->timestamps();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('detected_by')->references('id')->on('users')->nullOnDelete();
                $table->foreign('process_id')->references('id')->on('quality_processes')->nullOnDelete();
                $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'severity']);
                $table->index(['organization_id', 'source']);
                $table->index('due_date');
            });
        }

        // =====================================================================
        // ACTIONS CORRECTIVES
        // =====================================================================
        if (! Schema::hasTable('corrective_actions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('corrective_actions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('nonconformity_id');
                $table->unsignedBigInteger('organization_id');
                $table->text('description');
                $table->unsignedBigInteger('responsible_user_id')->nullable();
                $table->date('due_date')->nullable();
                $table->enum('status', ['planned', 'in_progress', 'completed', 'cancelled'])->default('planned');
                $table->unsignedTinyInteger('effectiveness_rating')->nullable(); // 1-5
                $table->dateTime('completed_at')->nullable();
                $table->string('evidence_path')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('nonconformity_id')->references('id')->on('nonconformities')->cascadeOnDelete();
                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('responsible_user_id')->references('id')->on('users')->nullOnDelete();
                $table->index(['nonconformity_id', 'status']);
            });
        }

        // =====================================================================
        // AUDITS QUALITÉ
        // =====================================================================
        if (! Schema::hasTable('quality_audits')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('quality_audits', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->string('reference', 30)->unique();  // AQ-2026-001
                $table->string('title');
                $table->enum('audit_type', [
                    'interne',
                    'externe',
                    'certification',
                    'fournisseur',
                    'surveillance',
                ])->default('interne');
                $table->text('scope')->nullable();
                $table->string('auditor_name')->nullable();
                $table->unsignedBigInteger('auditor_user_id')->nullable();
                $table->date('audit_date_start')->nullable();
                $table->date('audit_date_end')->nullable();
                $table->enum('status', [
                    'planifie',
                    'en_cours',
                    'rapport_en_attente',
                    'clos',
                ])->default('planifie');
                $table->unsignedSmallInteger('findings_count_nc')->default(0);
                $table->unsignedSmallInteger('findings_count_obs')->default(0);
                $table->unsignedSmallInteger('findings_count_positive')->default(0);
                $table->string('report_path')->nullable();
                $table->date('next_audit_date')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('auditor_user_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'audit_type']);
            });
        }

        // =====================================================================
        // CONSTATATIONS D'AUDIT
        // =====================================================================
        if (! Schema::hasTable('audit_findings')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('audit_findings', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('audit_id');
                $table->unsignedBigInteger('organization_id');
                $table->enum('finding_type', ['nonconformite', 'observation', 'point_positif'])->default('observation');
                $table->string('clause_iso', 20)->nullable(); // ex: 8.3, 9.1
                $table->unsignedBigInteger('process_id')->nullable();
                $table->text('description');
                $table->text('evidence')->nullable();
                $table->enum('risk_level', ['faible', 'moyen', 'eleve'])->default('moyen');
                $table->enum('status', ['ouvert', 'en_cours', 'clos'])->default('ouvert');
                $table->unsignedBigInteger('nonconformity_id')->nullable(); // si NC créée depuis
                $table->timestamps();

                $table->foreign('audit_id')->references('id')->on('quality_audits')->cascadeOnDelete();
                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('process_id')->references('id')->on('quality_processes')->nullOnDelete();
                $table->foreign('nonconformity_id')->references('id')->on('nonconformities')->nullOnDelete();
                $table->index(['audit_id', 'finding_type']);
            });
        }

        // =====================================================================
        // INDICATEURS QUALITÉ (définition)
        // =====================================================================
        if (! Schema::hasTable('quality_indicators')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('quality_indicators', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->string('name');
                $table->string('code', 20);           // IQ-01, IQ-02 ...
                $table->string('unit', 30)->default('%');  // %, nombre, jours, FCFA
                $table->decimal('target_value', 15, 4)->nullable();
                $table->decimal('alert_threshold', 15, 4)->nullable();
                $table->enum('frequency', ['mensuel', 'trimestriel', 'annuel'])->default('mensuel');
                $table->text('formula_description')->nullable();
                $table->unsignedBigInteger('owner_user_id')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('owner_user_id')->references('id')->on('users')->nullOnDelete();
                $table->unique(['organization_id', 'code']);
            });
        }

        // =====================================================================
        // VALEURS DES INDICATEURS (mesures)
        // =====================================================================
        if (! Schema::hasTable('quality_indicator_values')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('quality_indicator_values', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('indicator_id');
                $table->unsignedBigInteger('organization_id');
                $table->unsignedSmallInteger('period_year');
                $table->unsignedTinyInteger('period_month')->nullable(); // null si trimestriel/annuel
                $table->decimal('value', 15, 4);
                $table->text('comment')->nullable();
                $table->unsignedBigInteger('recorded_by')->nullable();
                $table->dateTime('recorded_at');
                $table->timestamps();

                $table->foreign('indicator_id')->references('id')->on('quality_indicators')->cascadeOnDelete();
                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('recorded_by')->references('id')->on('users')->nullOnDelete();
                $table->unique(['indicator_id', 'period_year', 'period_month']);
                $table->index(['indicator_id', 'period_year']);
            });
        }

        // =====================================================================
        // DOCUMENTS QUALITÉ
        // =====================================================================
        if (! Schema::hasTable('quality_documents')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('quality_documents', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->string('reference', 30)->unique();  // QD-2026-001
                $table->string('title');
                $table->enum('type', [
                    'procedure',
                    'instruction',
                    'formulaire',
                    'enregistrement',
                    'politique',
                ])->default('procedure');
                $table->unsignedBigInteger('process_id')->nullable();
                $table->string('version', 20)->default('1.0');
                $table->enum('status', [
                    'brouillon',
                    'revue',
                    'approuve',
                    'obsolete',
                ])->default('brouillon');
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->dateTime('approved_at')->nullable();
                $table->date('review_date')->nullable();
                $table->string('file_path')->nullable();
                $table->jsonb('change_log')->nullable(); // historique des révisions
                $table->timestamps();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('process_id')->references('id')->on('quality_processes')->nullOnDelete();
                $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'type']);
                $table->index('review_date');
            });
        }

        // =====================================================================
        // RÉCLAMATIONS CLIENTS
        // =====================================================================
        if (! Schema::hasTable('customer_complaints')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('customer_complaints', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->string('reference', 30)->unique();  // RC-2026-001
                $table->string('customer_name');
                $table->string('customer_contact')->nullable();
                $table->dateTime('received_at');
                $table->enum('channel', ['email', 'courrier', 'telephone', 'portail'])->default('email');
                $table->text('description');
                $table->enum('severity', ['mineure', 'majeure', 'critique'])->default('mineure');
                $table->enum('status', [
                    'recu',
                    'en_traitement',
                    'resolu',
                    'clos',
                ])->default('recu');
                $table->unsignedBigInteger('nonconformity_id')->nullable();
                $table->text('resolution')->nullable();
                $table->unsignedTinyInteger('satisfaction_rating')->nullable(); // 1-5
                $table->dateTime('closed_at')->nullable();
                $table->unsignedBigInteger('handled_by')->nullable();
                $table->timestamps();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('nonconformity_id')->references('id')->on('nonconformities')->nullOnDelete();
                $table->foreign('handled_by')->references('id')->on('users')->nullOnDelete();
                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'severity']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_complaints');
        Schema::dropIfExists('quality_documents');
        Schema::dropIfExists('quality_indicator_values');
        Schema::dropIfExists('quality_indicators');
        Schema::dropIfExists('audit_findings');
        Schema::dropIfExists('quality_audits');
        Schema::dropIfExists('corrective_actions');
        Schema::dropIfExists('nonconformities');
        Schema::dropIfExists('quality_processes');
    }
};
