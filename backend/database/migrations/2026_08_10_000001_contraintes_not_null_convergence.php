<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dernier ecart entre la production et le schema decrit par les migrations :
 * la NULLABILITE.
 *
 * Les migrations declaraient NOT NULL des colonnes que la production avait
 * relachees a la main. Une colonne presente des deux cotes mais contrainte d'un
 * seul suffit pourtant a faire diverger les comportements — c'est ainsi que
 * `users.first_name` rendait toute installation neuve incapable de creer un
 * utilisateur, et `licenses.ends_at` incapable d'heberger le palier Decouverte.
 *
 * La question « cette contrainte est-elle justifiee ? » demandait de savoir ce
 * que le code ecrit dans chacune des 139 colonnes concernees. La bonne question
 * est decidable : « peut-on la poser sans casser les donnees existantes ? »
 *
 * ─── CE QUI EST POSE ICI ────────────────────────────────────────────────────
 *
 * PROUVEES (10) — la table contient des lignes et aucune n'est nulle. Le code
 * remplit donc toujours cette colonne : la contrainte ne fait qu'inscrire un
 * fait etabli par les donnees.
 *
 * NON PROUVEES (123) — la table est VIDE. Rien ne s'oppose a la contrainte,
 * mais rien ne la valide non plus. On la pose quand meme, et voici pourquoi :
 * la migration la declare deja, donc une installation neuve la porte. Si un
 * jour un enregistrement omet cette colonne, il echouera de toute facon sur
 * toute base reconstruite. Laisser la production plus permissive ne
 * supprimerait pas ce defaut : elle le rendrait invisible ici et fatal
 * ailleurs, chez un client, le jour de sa mise en service.
 *
 * LIMITE ASSUMEE : ni `pages:health` ni la suite de tests ne couvrent les
 * chemins d'ECRITURE de ces 123 tables vides. Si l'un d'eux omet une colonne,
 * il echouera desormais en production comme il echouait deja sur une base
 * neuve — plus tot, et au meme endroit pour tout le monde.
 *
 * ─── CE QUI N'EST PAS POSE ──────────────────────────────────────────────────
 *
 * SIX colonnes portent des valeurs nulles reelles et restent nullables :
 *
 *     tasks.project_id            3 taches sans projet
 *     help_articles.title         4 articles
 *     help_articles.content       4 articles
 *     help_articles.category      4 articles
 *     onboarding_steps.step_key   12 etapes
 *     onboarding_steps.organization_id  12 etapes
 *
 * `tasks.project_id` merite d'etre relevee : une tache SANS projet est
 * parfaitement legitime, et c'est la migration qui a tort de l'interdire. Les
 * cinq autres appellent une reprise de donnees — decider quoi ecrire dans ces
 * lignes — qui est une decision fonctionnelle, pas une correction de schema.
 */
return new class extends Migration
{
    /** Contraintes attestees par les donnees : la colonne n'est jamais nulle. */
    private function prouvees(): array
    {
        return [
            ['help_articles', 'views'],
            ['help_categories', 'translations'],
            ['help_categories', 'icon'],
            ['onboarding_steps', 'status'],
            ['help_categories', 'color'],
            ['help_categories', 'is_active'],
            ['help_articles', 'helpful_yes'],
            ['help_articles', 'helpful_no'],
            ['help_articles', 'is_public'],
            ['help_categories', 'order'],
        ];
    }

    /** Contraintes posees sur des tables vides : declarees, jamais eprouvees. */
    private function nonProuvees(): array
    {
        return [
            ['visit_logs', 'badge_issued'],
            ['trial_activations', 'trial_start'],
            ['vehicle_geofences', 'alert_on_exit'],
            ['training_learning_paths', 'difficulty'],
            ['trial_activations', 'plan_id'],
            ['feature_flags', 'created_by'],
            ['purchase_requests', 'pr_number'],
            ['visitor_invitations', 'access_code'],
            ['project_milestones', 'color'],
            ['training_live_attendees', 'status'],
            ['training_learning_paths', 'total_hours'],
            ['platform_announcements', 'target_plans'],
            ['suppliers', 'rating'],
            ['purchase_requests', 'title'],
            ['purchase_orders', 'created_by'],
            ['feature_flags', 'enabled_percent'],
            ['project_milestones', 'completed_tasks_count'],
            ['purchase_requests', 'organization_id'],
            ['visitor_invitations', 'visit_time_start'],
            ['training_live_sessions', 'scheduled_at'],
            ['suppliers', 'currency_code'],
            ['purchase_orders', 'currency_code'],
            ['training_learning_paths', 'created_at'],
            ['project_timesheets', 'hourly_rate'],
            ['purchase_orders', 'payment_terms_days'],
            ['platform_announcements', 'created_by'],
            ['training_path_enrollments', 'status'],
            ['training_live_sessions', 'duration_minutes'],
            ['visitor_invitations', 'visit_time_end'],
            ['vehicle_fuel_logs', 'fuel_type'],
            ['feature_flags', 'target_plans'],
            ['trial_activations', 'organization_id'],
            ['visit_logs', 'organization_id'],
            ['onboarding_completions', 'user_id'],
            ['vehicle_fuel_logs', 'fuel_date'],
            ['vehicle_geofences', 'organization_id'],
            ['project_milestones', 'due_date'],
            ['onboarding_completions', 'step_key'],
            ['suppliers', 'payment_terms_days'],
            ['visitor_invitations', 'expires_at'],
            ['training_path_enrollments', 'progress_percent'],
            ['training_live_sessions', 'status'],
            ['feature_flags', 'slug'],
            ['purchase_requests', 'priority'],
            ['trial_activations', 'source'],
            ['vehicle_trips', 'organization_id'],
            ['training_live_sessions', 'organization_id'],
            ['visitor_invitations', 'organization_id'],
            ['training_learning_paths', 'title'],
            ['visitor_invitations', 'invited_by'],
            ['vehicle_trips', 'purpose'],
            ['purchase_requests', 'total_estimated_xof'],
            ['vehicle_trips', 'vehicle_id'],
            ['project_members', 'joined_at'],
            ['training_learning_paths', 'organization_id'],
            ['training_live_sessions', 'created_at'],
            ['vehicle_fuel_logs', 'total_cost'],
            ['visitor_invitations', 'visitor_email'],
            ['training_live_sessions', 'title'],
            ['vehicle_geofences', 'name'],
            ['suppliers', 'country'],
            ['onboarding_completions', 'organization_id'],
            ['visit_logs', 'visitor_id'],
            ['vehicle_geofences', 'type'],
            ['feature_flags', 'name'],
            ['visit_logs', 'host_user_id'],
            ['platform_announcements', 'title'],
            ['visit_logs', 'created_by'],
            ['suppliers', 'status'],
            ['training_live_attendees', 'live_session_id'],
            ['purchase_requests', 'status'],
            ['training_path_enrollments', 'organization_id'],
            ['purchase_orders', 'supplier_id'],
            ['suppliers', 'category'],
            ['suppliers', 'organization_id'],
            ['project_milestones', 'organization_id'],
            ['training_courses', 'is_public'],
            ['vehicle_fuel_logs', 'odometer_km'],
            ['training_path_enrollments', 'user_id'],
            ['purchase_orders', 'po_number'],
            ['visit_logs', 'status'],
            ['rfqs', 'created_by'],
            ['suppliers', 'supplier_number'],
            ['trial_activations', 'trial_end'],
            ['goods_receipts', 'purchase_order_id'],
            ['vehicle_fuel_logs', 'quantity_liters'],
            ['training_path_enrollments', 'path_id'],
            ['purchase_orders', 'organization_id'],
            ['feature_flags', 'target_org_ids'],
            ['suppliers', 'company_name'],
            ['training_live_attendees', 'organization_id'],
            ['vehicle_fuel_logs', 'unit_price'],
            ['training_live_sessions', 'instructor_user_id'],
            ['platform_announcements', 'content'],
            ['visitor_invitations', 'visit_date'],
            ['training_live_attendees', 'user_id'],
            ['vehicle_trips', 'status'],
            ['platform_announcements', 'type'],
            ['suppliers', 'portal_access'],
            ['project_members', 'role'],
            ['vehicle_fuel_logs', 'full_tank'],
            ['purchase_requests', 'requestor_user_id'],
            ['vehicle_geofences', 'is_active'],
            ['purchase_orders', 'status'],
            ['visit_logs', 'badge_returned'],
            ['project_milestones', 'completion_percent'],
            ['visitor_invitations', 'visitor_name'],
            ['visitor_invitations', 'is_used'],
            ['feature_flags', 'is_global'],
            ['training_live_sessions', 'max_participants'],
            ['visit_logs', 'purpose'],
            ['vehicle_fuel_logs', 'vehicle_id'],
            ['training_live_sessions', 'platform'],
            ['project_milestones', 'tasks_count'],
            ['onboarding_completions', 'completed_at'],
            ['vehicle_fuel_logs', 'organization_id'],
            ['platform_announcements', 'is_published'],
            ['purchase_orders', 'total_amount_xof'],
            ['project_timesheets', 'organization_id'],
            ['vehicle_geofences', 'alert_on_enter'],
            ['vehicle_trips', 'start_at'],
            ['saas_daily_metrics', 'created_at'],
            ['feature_flags', 'is_active'],
        ];
    }

    public function up(): void
    {
        foreach ([...$this->prouvees(), ...$this->nonProuvees()] as [$table, $colonne]) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $colonne)) {
                continue;
            }

            // Ceinture et bretelles : la classification a ete etablie a un
            // instant donne, et cette migration peut s'appliquer plus tard, sur
            // une base qui a vecu. On revérifie avant de contraindre.
            $nuls = DB::selectOne(
                'SELECT count(*) AS n FROM "' . $table . '" WHERE "' . $colonne . '" IS NULL'
            )->n;

            if ((int) $nuls > 0) {
                // On n'echoue pas : une contrainte non posee est un ecart
                // connu, une migration en echec bloque tout le reste.
                \Illuminate\Support\Facades\Log::warning(sprintf(
                    'Contrainte NOT NULL non posee sur %s.%s : %d ligne(s) a NULL.',
                    $table, $colonne, $nuls
                ));

                continue;
            }

            DB::statement('ALTER TABLE "' . $table . '" ALTER COLUMN "' . $colonne . '" SET NOT NULL');
        }
    }

    public function down(): void
    {
        foreach ([...$this->prouvees(), ...$this->nonProuvees()] as [$table, $colonne]) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, $colonne)) {
                DB::statement('ALTER TABLE "' . $table . '" ALTER COLUMN "' . $colonne . '" DROP NOT NULL');
            }
        }
    }
};
