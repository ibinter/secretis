<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SECRETIS ERP — Migration : Journal d'audit enrichi (section 27.2)
 *
 * Crée ou enrichit la table audit_logs avec toutes les colonnes nécessaires
 * pour une traçabilité complète des actions utilisateurs et agents de support.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Supprime l'ancienne table si elle existe en version simplifiée
        // pour repartir proprement avec le schéma enrichi.
        Schema::dropIfExists('audit_logs');

        if (! Schema::hasTable('audit_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();

                // ── Contexte organisationnel ──────────────────────────────────────
                $table->foreignId('organization_id')
                      ->nullable()
                      ->constrained()
                      ->nullOnDelete()
                      ->comment('Organisation concernée (null = superadmin IBIG)');

                // ── Acteur ────────────────────────────────────────────────────────
                $table->foreignId('user_id')
                      ->nullable()
                      ->constrained()
                      ->nullOnDelete()
                      ->comment('Utilisateur auteur de l\'action');

                $table->string('user_name')->nullable()
                      ->comment('Nom dénormalisé (conservé même si user supprimé)');

                $table->string('user_role')->nullable()
                      ->comment('Rôle au moment de l\'action');

                // ── Action ────────────────────────────────────────────────────────
                $table->string('action')
                      ->comment('create | update | delete | validate | export | login | logout | etc.');

                $table->string('module')
                      ->comment('agenda | ged | users | licenses | payments | rh | comptabilite | etc.');

                // ── Ressource ciblée ──────────────────────────────────────────────
                $table->string('resource_type')->nullable()
                      ->comment('Classe Eloquent : Event, Document, User, License, etc.');

                $table->string('resource_id')->nullable()
                      ->comment('Identifiant de la ressource (peut être UUID ou entier)');

                $table->string('resource_label')->nullable()
                      ->comment('Description lisible de la ressource pour affichage humain');

                // ── Diff des valeurs ──────────────────────────────────────────────
                $table->json('old_values')->nullable()
                      ->comment('État de la ressource avant modification');

                $table->json('new_values')->nullable()
                      ->comment('État de la ressource après modification');

                // ── Contexte réseau ───────────────────────────────────────────────
                $table->string('ip_address', 45)->nullable()
                      ->comment('IPv4 ou IPv6 de l\'auteur');

                $table->string('user_agent')->nullable()
                      ->comment('User-Agent HTTP');

                $table->string('country', 2)->nullable()
                      ->comment('Code pays ISO 3166-1 alpha-2 (géolocalisation IP)');

                $table->string('session_id')->nullable()
                      ->comment('Identifiant de session PHP');

                // ── Session de support ────────────────────────────────────────────
                $table->boolean('is_support_session')->default(false)
                      ->comment('Action effectuée dans le cadre d\'une prise en main support IBIG');

                $table->foreignId('support_session_id')
                      ->nullable()
                      ->constrained('support_sessions')
                      ->nullOnDelete()
                      ->comment('Référence à la session de support IBIG active');

                // ── Qualification ─────────────────────────────────────────────────
                $table->enum('severity', ['info', 'warning', 'critical'])->default('info')
                      ->comment('Niveau de criticité de l\'événement');

                $table->boolean('is_sensitive')->default(false)
                      ->comment('L\'action porte sur des données sensibles (RH, financier, légal)');

                $table->string('result')->nullable()
                      ->comment('success | failure | partial');

                $table->text('notes')->nullable()
                      ->comment('Notes libres (raison manuelle, commentaire agent)');

                $table->timestamps();

                // ── Index de performance ──────────────────────────────────────────
                $table->index(['organization_id', 'created_at'],        'audit_org_date_idx');
                $table->index(['user_id', 'action', 'created_at'],      'audit_user_action_idx');
                $table->index(['module', 'action', 'created_at'],       'audit_module_action_idx');
                $table->index(['severity', 'created_at'],               'audit_severity_idx');
                $table->index('is_sensitive',                           'audit_sensitive_idx');
                $table->index(['is_support_session', 'created_at'],     'audit_support_idx');
                $table->index(['resource_type', 'resource_id'],         'audit_resource_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
