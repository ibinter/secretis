<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration : Tables pour les Automatisations Intelligentes SECRETIS.
 *
 *  automation_rules — Règles d'automatisation (trigger → conditions → actions)
 *  automation_logs  — Historique d'exécution des règles
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────────────────────────────────
        // TABLE : automation_rules
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('automation_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')
                  ->constrained('organizations')
                  ->cascadeOnDelete();

            // Informations de base
            $table->string('name');
            $table->text('description')->nullable();

            // Déclencheur
            // Valeurs : courrier.received | task.overdue | event.starting_soon |
            //           leave.approved | visitor.arrived | invoice.overdue | document.uploaded
            $table->string('trigger_type', 100);

            // Configuration du déclencheur (filtre additionnel)
            // Ex: { "minutes_before": 30 } pour event.starting_soon
            $table->jsonb('trigger_config')->default('{}');

            // Conditions (évaluées avant d'exécuter les actions)
            // Ex: [{ "field": "sender", "operator": "contains", "value": "DGI" }]
            $table->jsonb('conditions')->default('[]');

            // Actions à exécuter si les conditions sont remplies
            // Ex: [{ "type": "assign_user", "params": { "user_id": "..." } }]
            $table->jsonb('actions')->default('[]');

            // État et statistiques
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('run_count')->default(0);
            $table->timestamp('last_run_at')->nullable();

            // Audit
            $table->foreignUuid('created_by')
                  ->constrained('users')
                  ->restrictOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index(['organization_id', 'is_active']);
            $table->index(['trigger_type', 'is_active']);
            $table->index('organization_id');
        });

        // ─────────────────────────────────────────────────────────────────────
        // TABLE : automation_logs
        // ─────────────────────────────────────────────────────────────────────
        Schema::create('automation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('rule_id')
                  ->constrained('automation_rules')
                  ->cascadeOnDelete();

            // Données qui ont déclenché la règle
            $table->jsonb('trigger_data')->default('{}');

            // Résultat de l'évaluation des conditions
            $table->boolean('conditions_matched')->default(true);

            // Statut de l'exécution
            $table->enum('status', ['success', 'failed', 'skipped'])
                  ->default('success');

            // Résultat des actions exécutées
            // Ex: [{ "action": "assign_user", "success": true, "message": "..." }]
            $table->jsonb('result')->default('[]');

            // Durée d'exécution (millisecondes)
            $table->unsignedInteger('duration_ms')->nullable();

            // Message d'erreur si echec
            $table->text('error_message')->nullable();

            $table->timestamp('created_at')->useCurrent();

            // Index pour les requêtes fréquentes
            $table->index(['rule_id', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_logs');
        Schema::dropIfExists('automation_rules');
    }
};
