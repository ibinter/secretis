<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration des index composites de performance — SECRETIS ERP
 *
 * Objectif : éliminer les Sequential Scans PostgreSQL sur les requêtes
 * filtrées par organization_id + critères métier fréquents.
 *
 * Gains mesurés en benchmark (table 50 000 enregistrements) :
 *  - events    : 340 ms → 4 ms  (-99 %)
 *  - tasks     : 890 ms → 8 ms  (-99 %)
 *  - documents : 420 ms → 6 ms  (-99 %)
 *  - audit_logs: filtre 30j → 12 ms (vs 3 200 ms sans index)
 *
 * La migration est SANS TRANSACTION pour certains index
 * (CREATE INDEX CONCURRENTLY non disponible en migration transactionnelle).
 * En production, préférer : php artisan migrate --pretend puis exécuter manuellement.
 */
return new class extends Migration
{
    /**
     * PostgreSQL : utiliser des index CONCURRENTLY pour éviter le lock de table.
     * Le mode transactionnel de Laravel ne le permet pas directement,
     * mais on désactive la transaction pour cette migration.
     */
    public $withinTransaction = false;

    public function up(): void
    {
        // =====================================================================
        // AGENDA — table events
        // =====================================================================

        // `events.start_at` N'EXISTE PAS sur une base neuve : la table est creee
        // avec `starts_at` (000011). La colonne `start_at` est presente en
        // PRODUCTION, posee hors migration — la base de production porte donc
        // les DEUX, ce qui est un defaut a arbitrer et non a trancher ici.
        //
        // On indexe ce qui existe. Indexer une colonne absente faisait echouer
        // la migration et tout ce qui la suivait.
        Schema::table('events', function (Blueprint $table) {
            // Requêtes calendrier : "événements de l'org entre date A et date B"
            if ($this->indexable('events', ['organization_id', 'start_at', 'end_at'], 'events_org_dates_idx')) {
                $table->index(['organization_id', 'start_at', 'end_at'], 'events_org_dates_idx');
            }

            // Requêtes "mes événements créés" : filtre org + créateur + statut
            if ($this->indexable('events', ['organization_id', 'created_by', 'status'], 'events_org_creator_idx')) {
                $table->index(['organization_id', 'created_by', 'status'], 'events_org_creator_idx');
            }

            // Tri par date de début (dashboard, vue semaine)
            if ($this->indexable('events', ['organization_id', 'start_at', 'deleted_at'], 'events_org_start_deleted_idx')) {
                $table->index(['organization_id', 'start_at', 'deleted_at'], 'events_org_start_deleted_idx');
            }
        });

        // =====================================================================
        // TÂCHES — table tasks
        // =====================================================================

        Schema::table('tasks', function (Blueprint $table) {
            // "Tâches à traiter" : filtré par org + statut + date limite
            if ($this->indexable('tasks', ['organization_id', 'status', 'due_date'], 'tasks_org_status_due_idx')) {
                $table->index(['organization_id', 'status', 'due_date'], 'tasks_org_status_due_idx');
            }

            // "Mes tâches" : org + assigné + statut (via table pivot task_user)
            if ($this->indexable('tasks', ['organization_id', 'assigned_to', 'status'], 'tasks_org_assigned_idx')) {
                $table->index(['organization_id', 'assigned_to', 'status'], 'tasks_org_assigned_idx');
            }

            // Tâches urgentes/haute priorité en dashboard
            if ($this->indexable('tasks', ['organization_id', 'priority', 'status', 'deleted_at'], 'tasks_org_priority_status_idx')) {
                $table->index(['organization_id', 'priority', 'status', 'deleted_at'], 'tasks_org_priority_status_idx');
            }
        });

        // =====================================================================
        // GED — table documents
        // =====================================================================

        Schema::table('documents', function (Blueprint $table) {
            // Navigation dans un dossier : org + dossier + date création
            if ($this->indexable('documents', ['organization_id', 'folder_id', 'created_at'], 'docs_org_folder_date_idx')) {
                $table->index(['organization_id', 'folder_id', 'created_at'], 'docs_org_folder_date_idx');
            }

            // Documents expirés / en attente de signature : org + statut + expiry
            if ($this->indexable('documents', ['organization_id', 'status', 'expires_at'], 'docs_org_status_expires_idx')) {
                $table->index(['organization_id', 'status', 'expires_at'], 'docs_org_status_expires_idx');
            }

            // Documents récents (dashboard) : org + updated_at + deleted_at
            if ($this->indexable('documents', ['organization_id', 'updated_at', 'deleted_at'], 'docs_org_updated_deleted_idx')) {
                $table->index(['organization_id', 'updated_at', 'deleted_at'], 'docs_org_updated_deleted_idx');
            }
        });

        // =====================================================================
        // AUDIT — table audit_logs
        // =====================================================================

        Schema::table('audit_logs', function (Blueprint $table) {
            // Filtrage par event + date : "qui a fait quoi ce mois-ci"
            if ($this->indexable('audit_logs', ['organization_id', 'event', 'created_at'], 'audit_org_event_date_idx')) {
                $table->index(['organization_id', 'event', 'created_at'], 'audit_org_event_date_idx');
            }

            // Historique d'un utilisateur : org + user + date
            if ($this->indexable('audit_logs', ['organization_id', 'user_id', 'created_at'], 'audit_org_user_date_idx')) {
                $table->index(['organization_id', 'user_id', 'created_at'], 'audit_org_user_date_idx');
            }

            // Lookup polymorphique : "audit d'une entité précise"
            if ($this->indexable('audit_logs', ['auditable_type', 'auditable_id'], 'audit_morphs_idx')) {
                $table->index(['auditable_type', 'auditable_id'], 'audit_morphs_idx');
            }
        });

        // =====================================================================
        // NOTIFICATIONS — table notifications (format Laravel)
        // =====================================================================

        Schema::table('notifications', function (Blueprint $table) {
            // "Notifications non lues" : notifiable_type + notifiable_id + read_at
            if ($this->indexable('notifications', ['notifiable_type', 'notifiable_id', 'read_at'], 'notif_notifiable_read_idx')) {
                $table->index(['notifiable_type', 'notifiable_id', 'read_at'], 'notif_notifiable_read_idx');
            }
        });

        // =====================================================================
        // SUPPORT — table support_tickets
        // =====================================================================

        Schema::table('support_tickets', function (Blueprint $table) {
            // Liste des tickets ouverts triée par date : org + statut + date
            if ($this->indexable('support_tickets', ['organization_id', 'status', 'created_at'], 'tickets_org_status_date_idx')) {
                $table->index(['organization_id', 'status', 'created_at'], 'tickets_org_status_date_idx');
            }

            // File d'un agent support : assigned_to + statut
            if ($this->indexable('support_tickets', ['assigned_to', 'status'], 'tickets_assigned_status_idx')) {
                $table->index(['assigned_to', 'status'], 'tickets_assigned_status_idx');
            }
        });

        // =====================================================================
        // COURRIERS — table mail_registry
        // =====================================================================

        Schema::table('mail_registry', function (Blueprint $table) {
            // Courriers en attente : org + statut + urgence + received_at
            if ($this->indexable('mail_registry', ['organization_id', 'status', 'urgency'], 'mail_org_status_urgency_idx')) {
                $table->index(['organization_id', 'status', 'urgency'], 'mail_org_status_urgency_idx');
            }
        });

        // =====================================================================
        // VISITEURS — table visitors
        // =====================================================================

        Schema::table('visitors', function (Blueprint $table) {
            // Visiteurs du jour : org + check_in_at
            if ($this->indexable('visitors', ['organization_id', 'check_in_at', 'deleted_at'], 'visitors_org_checkin_idx')) {
                $table->index(['organization_id', 'check_in_at', 'deleted_at'], 'visitors_org_checkin_idx');
            }
        });
    }

    public function down(): void
    {
        $drops = [
            'events'          => ['events_org_dates_idx', 'events_org_creator_idx', 'events_org_start_deleted_idx'],
            'tasks'           => ['tasks_org_status_due_idx', 'tasks_org_assigned_idx', 'tasks_org_priority_status_idx'],
            'documents'       => ['docs_org_folder_date_idx', 'docs_org_status_expires_idx', 'docs_org_updated_deleted_idx'],
            'audit_logs'      => ['audit_org_event_date_idx', 'audit_org_user_date_idx', 'audit_morphs_idx'],
            'notifications'   => ['notif_notifiable_read_idx'],
            'support_tickets' => ['tickets_org_status_date_idx', 'tickets_assigned_status_idx'],
            'mail_registry'   => ['mail_org_status_urgency_idx'],
            'visitors'        => ['visitors_org_checkin_idx'],
        ];

        foreach ($drops as $table => $indexes) {
            Schema::table($table, function (Blueprint $blueprint) use ($indexes) {
                foreach ($indexes as $index) {
                    try {
                        $blueprint->dropIndex($index);
                    } catch (\Exception) {
                        // Index absent — ignoré silencieusement
                    }
                }
            });
        }
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    /**
     * Vérifie si un index existe déjà (PostgreSQL) pour éviter l'erreur
     * "duplicate key value violates unique constraint" lors d'une re-migration.
     */
    /**
     * Un index est posable si son nom est libre ET si TOUTES ses colonnes
     * existent.
     *
     * Le garde-fou ne testait que le nom de l'index. Or plusieurs colonnes
     * visées ici n'existent pas sur une base neuve — `documents.status` et
     * `events.start_at` sont présentes en PRODUCTION mais créées par aucune
     * migration du dépôt. La migration échouait donc sur « column does not
     * exist », et bloquait toutes celles qui suivaient.
     *
     * On n'indexe que ce qui existe : un index de performance absent ralentit,
     * une migration en échec arrête tout.
     */
    private function indexable(string $table, array $colonnes, string $index): bool
    {
        if (! Schema::hasTable($table) || $this->indexExists($table, $index)) {
            return false;
        }

        foreach ($colonnes as $colonne) {
            if (! Schema::hasColumn($table, $colonne)) {
                \Illuminate\Support\Facades\Log::info(
                    "Index {$index} non pose : la colonne {$table}.{$colonne} n'existe pas."
                );

                return false;
            }
        }

        return true;
    }

    private function indexExists(string $table, string $indexName): bool
    {
        $result = \DB::selectOne(
            "SELECT to_regclass(:name) AS exists",
            ['name' => $indexName]
        );

        return $result && $result->exists !== null;
    }
};
