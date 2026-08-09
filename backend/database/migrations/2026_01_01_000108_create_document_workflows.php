<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration : Workflows de validation documentaire
 *
 * Tables créées :
 *   - document_workflow_templates : templates réutilisables par catégorie
 *   - document_workflow_instances : instances de workflow par document
 *   - document_workflow_steps     : étapes individuelles d'une instance
 *
 * Aussi : colonnes supplémentaires sur la table documents pour la classification.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ------------------------------------------------------------------
        // Colonnes supplémentaires sur documents (classification + archivage)
        // ------------------------------------------------------------------
        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasColumn('documents', 'category')) {
                $table->string('category', 30)->nullable()->after('tags')->index();
            }
            if (! Schema::hasColumn('documents', 'classification_confidence')) {
                $table->unsignedTinyInteger('classification_confidence')->nullable()->after('category');
            }
            if (! Schema::hasColumn('documents', 'classification_method')) {
                $table->string('classification_method', 20)->nullable()->after('classification_confidence');
            }
            if (! Schema::hasColumn('documents', 'classification_locked')) {
                $table->boolean('classification_locked')->default(false)->after('classification_method');
            }
            if (! Schema::hasColumn('documents', 'classification_suggestions')) {
                $table->json('classification_suggestions')->nullable()->after('classification_locked');
            }
            if (! Schema::hasColumn('documents', 'metadata_extracted')) {
                $table->json('metadata_extracted')->nullable()->after('classification_suggestions');
            }
            if (! Schema::hasColumn('documents', 'text_content')) {
                $table->longText('text_content')->nullable()->after('metadata_extracted');
            }
            if (! Schema::hasColumn('documents', 'sha256_hash')) {
                $table->string('sha256_hash', 64)->nullable()->after('text_content')->index();
            }
            if (! Schema::hasColumn('documents', 'has_duplicates')) {
                $table->boolean('has_duplicates')->default(false)->after('sha256_hash');
            }
            if (! Schema::hasColumn('documents', 'retention_years')) {
                $table->unsignedTinyInteger('retention_years')->nullable()->after('has_duplicates');
            }
            if (! Schema::hasColumn('documents', 'validation_status')) {
                $table->enum('validation_status', [
                    'draft', 'pending_validation', 'validated', 'rejected',
                ])->default('draft')->after('retention_years')->index();
            }
            if (! Schema::hasColumn('documents', 'validated_at')) {
                $table->timestamp('validated_at')->nullable()->after('validation_status');
            }
            if (! Schema::hasColumn('documents', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('validated_at');
            }
            if (! Schema::hasColumn('documents', 'author_id')) {
                $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete()->after('archived_at');
            }
        });

        // ------------------------------------------------------------------
        // Templates de workflow
        // ------------------------------------------------------------------
        if (! Schema::hasTable('document_workflow_templates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('document_workflow_templates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('name', 150);
                $table->text('description')->nullable();
                // Catégorie de document déclenchant ce template (nullable = tous)
                $table->string('category', 30)->nullable()->index();
                // JSON : [{step_name, approver_role, approver_id, is_required, timeout_hours}]
                $table->json('steps');
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index(['organization_id', 'category']);
                $table->index(['organization_id', 'is_active']);
            });
        }

        // ------------------------------------------------------------------
        // Instances de workflow (une par document démarré)
        // ------------------------------------------------------------------
        if (! Schema::hasTable('document_workflow_instances')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('document_workflow_instances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('document_id')->constrained()->cascadeOnDelete();
                $table->foreignId('template_id')->constrained('document_workflow_templates')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->enum('status', [
                    'pending', 'in_progress', 'approved', 'rejected', 'cancelled',
                ])->default('pending')->index();
                $table->unsignedSmallInteger('current_step')->default(1);
                $table->foreignId('started_by')->constrained('users')->cascadeOnDelete();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->timestamps();

                $table->index(['document_id', 'status']);
                $table->index(['organization_id', 'status']);
            });
        }

        // ------------------------------------------------------------------
        // Étapes individuelles d'une instance
        // ------------------------------------------------------------------
        if (! Schema::hasTable('document_workflow_steps')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('document_workflow_steps', function (Blueprint $table) {
                $table->id();
                $table->foreignId('instance_id')
                    ->constrained('document_workflow_instances')
                    ->cascadeOnDelete();
                $table->string('step_name', 150);
                $table->unsignedSmallInteger('step_order');
                $table->foreignId('approver_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('approver_role', 80)->nullable(); // Rôle si pas d'utilisateur fixe
                $table->enum('status', [
                    'pending', 'in_progress', 'approved', 'rejected', 'sent_back', 'skipped',
                ])->default('pending')->index();
                $table->boolean('is_required')->default(true);
                $table->unsignedSmallInteger('timeout_hours')->default(72);
                $table->timestamp('assigned_at')->nullable();
                $table->timestamp('action_at')->nullable();
                $table->text('comment')->nullable();
                $table->timestamp('reminded_at')->nullable();
                $table->unsignedTinyInteger('reminder_count')->default(0);
                $table->timestamps();

                $table->index(['instance_id', 'step_order']);
                $table->index(['approver_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_workflow_steps');
        Schema::dropIfExists('document_workflow_instances');
        Schema::dropIfExists('document_workflow_templates');

        // Supprimer les colonnes ajoutées à documents
        Schema::table('documents', function (Blueprint $table) {
            $columns = [
                'category', 'classification_confidence', 'classification_method',
                'classification_locked', 'classification_suggestions', 'metadata_extracted',
                'text_content', 'sha256_hash', 'has_duplicates', 'retention_years',
                'validation_status', 'validated_at', 'archived_at', 'author_id',
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('documents', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
