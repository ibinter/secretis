<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Registre des activités de traitement (Article 30 RGPD)
        Schema::create('data_processing_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('purpose');
            $table->string('legal_basis'); // consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
            $table->json('data_categories'); // ex: ["identité", "contact", "financier", "santé"]
            $table->json('data_subjects');   // ex: ["salariés", "clients", "prospects"]
            $table->unsignedInteger('retention_period_days');
            $table->json('third_parties')->nullable(); // sous-traitants, destinataires
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'is_active']);
            $table->index('legal_basis');
        });

        // Registre des consentements
        Schema::create('consent_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('visitor_id')->nullable(); // pour les visiteurs non-authentifiés
            $table->string('consent_type'); // cookies_analytics, cookies_marketing, newsletter, data_processing
            $table->timestamp('granted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('proof_text')->nullable(); // texte exact du consentement
            $table->string('version')->default('1.0'); // version de la politique
            $table->timestamps();

            $table->index(['organization_id', 'user_id']);
            $table->index(['visitor_id', 'consent_type']);
            $table->index('consent_type');
        });

        // Demandes des personnes concernées (Articles 15–22 RGPD)
        Schema::create('data_subject_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['access', 'rectification', 'erasure', 'portability', 'objection']);
            $table->string('subject_email');
            $table->string('subject_name');
            $table->enum('status', ['pending', 'processing', 'completed', 'rejected'])->default('pending');
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->jsonb('response_data')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable();
            $table->string('download_token')->nullable(); // token signé pour téléchargement
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['subject_email', 'organization_id']);
            $table->index('requested_at');
            $table->index('download_token');
        });

        // Politiques de rétention des données
        Schema::create('data_retention_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('data_type'); // ex: audit_logs, messages, documents, events
            $table->string('description')->nullable();
            $table->unsignedInteger('retention_days');
            $table->boolean('auto_delete')->default(false);
            $table->timestamp('last_run_at')->nullable();
            $table->unsignedInteger('last_deleted_count')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'data_type']);
            $table->index('auto_delete');
        });

        // Incidents de sécurité / violations de données (Article 33 RGPD)
        Schema::create('privacy_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->unsignedInteger('affected_users_count')->default(0);
            $table->timestamp('discovered_at');
            $table->timestamp('reported_at')->nullable(); // signalement CNIL (72h)
            $table->enum('status', ['open', 'investigating', 'contained', 'resolved'])->default('open');
            $table->boolean('notified_authority')->default(false); // CNIL/DPA notifiée
            $table->boolean('notified_users')->default(false);
            $table->text('containment_measures')->nullable();
            $table->foreignId('reported_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'severity']);
            $table->index('discovered_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('privacy_incidents');
        Schema::dropIfExists('data_retention_policies');
        Schema::dropIfExists('data_subject_requests');
        Schema::dropIfExists('consent_records');
        Schema::dropIfExists('data_processing_records');
    }
};
