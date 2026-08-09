<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Convergence : ce que la production possede et que le depot ne decrivait pas.
 *
 * Apres la reconciliation dans l'autre sens — toutes les tables decrites par
 * les migrations existent desormais en production — restait l'ecart inverse :
 * CINQ TABLES et CENT QUARANTE-QUATRE COLONNES presentes en base et creees par
 * aucune migration. Elles avaient ete ajoutees a la main, directement en
 * production ; leur proprietaire PostgreSQL le confirmait (`postgres`, et non
 * le compte applicatif).
 *
 * Tant que cet ecart subsistait, une installation neuve ne ressemblait pas a la
 * production : le code y aurait cherche `documents.status`, `events.start_at`
 * ou la table `modules` sans les trouver, et personne ne l'aurait vu avant la
 * mise en service.
 *
 * Les definitions sont RELEVEES sur le schema reel, pas reecrites. Traduire un
 * type PostgreSQL en appel Blueprint ferait perdre les longueurs, les valeurs
 * par defaut et les precisions numeriques — c'est-a-dire precisement ce qui
 * distingue les deux bases.
 *
 * Aucune colonne n'est ajoutee en NOT NULL : elle rejoint une table qui peut
 * deja contenir des lignes, et toutes n'ont pas de valeur par defaut.
 */
return new class extends Migration
{
    /** Tables relevees en production, absentes des migrations. */
    private function tables(): array
    {
        return [
            'activation_keys' => '"id" bigserial, "used_by" bigint, "duration_months" integer DEFAULT 1, "expires_at" timestamp(0) without time zone, "created_by" bigint, "value_fcfa" integer DEFAULT 0, "organization_id" bigint, "updated_at" timestamp(0) without time zone DEFAULT now(), "plan_id" bigint, "created_at" timestamp(0) without time zone DEFAULT now(), "code" varchar(64) NOT NULL, "status" varchar(20) DEFAULT \'available\'::character varying, "lot_reference" varchar(100), "used_at" timestamp(0) without time zone, PRIMARY KEY ("id")',
            'circular_recipients' => '"user_id" bigint, "read_at" timestamp(0) without time zone, "circular_id" bigint, "updated_at" timestamp(0) without time zone, "id" bigserial, "acknowledged_at" timestamp(0) without time zone, "created_at" timestamp(0) without time zone, PRIMARY KEY ("id")',
            'message_reads' => '"id" bigserial, "created_at" timestamp(0) without time zone, "updated_at" timestamp(0) without time zone, "user_id" bigint, "read_at" timestamp(0) without time zone, "message_id" bigint, PRIMARY KEY ("id")',
            'modules' => '"id" bigserial, "updated_at" timestamp(0) without time zone, "icon" varchar(200), "sort_order" integer DEFAULT 0, "category" varchar(100), "name" varchar(200) NOT NULL, "key" varchar(100) NOT NULL, "created_at" timestamp(0) without time zone, "is_active" boolean DEFAULT true, PRIMARY KEY ("id")',
            'payment_gateways' => '"name" varchar(200) NOT NULL, "created_at" timestamp(0) without time zone, "provider" varchar(100), "key" varchar(100) NOT NULL, "config" jsonb DEFAULT \'[]\'::jsonb, "is_default" boolean DEFAULT false, "type" varchar(50), "max_amount" numeric(15,2) DEFAULT 0, "min_amount" numeric(15,2) DEFAULT 0, "id" bigserial, "is_active" boolean DEFAULT true, "sort_order" integer DEFAULT 0, "country" varchar(10), "logo" varchar(200), "updated_at" timestamp(0) without time zone, PRIMARY KEY ("id")',
        ];
    }

    /** Colonnes relevees en production, absentes des migrations. */
    private function colonnes(): array
    {
        return [
            ['training_path_enrollments', 'enrolled_at', 'timestamp(0) without time zone'],
            ['training_path_enrollments', 'updated_at', 'timestamp(0) without time zone'],
            ['training_path_enrollments', 'learning_path_id', 'bigint'],
            ['training_path_enrollments', 'created_at', 'timestamp(0) without time zone'],
            ['training_path_enrollments', 'progress', 'integer DEFAULT 0'],
            ['visit_logs', 'data', 'jsonb'],
            ['visit_logs', 'name', 'varchar(255)'],
            ['visit_logs', 'deleted_at', 'timestamp(0) without time zone'],
            ['plans', 'support_level', 'varchar(30) DEFAULT \'standard\'::character varying'],
            ['plans', 'max_storage_gb', 'integer'],
            ['plans', 'currency', 'varchar(3) DEFAULT \'XOF\'::character varying'],
            ['plans', 'active', 'boolean DEFAULT true'],
            ['plans', 'storage_gb', 'integer DEFAULT 5'],
            ['plans', 'badge', 'varchar(30)'],
            ['plans', 'is_popular', 'boolean DEFAULT false'],
            ['plans', 'trial_days', 'integer'],
            ['plans', 'price_yearly', 'numeric(12,2)'],
            ['plans', 'price_monthly', 'numeric(12,2)'],
            ['training_live_sessions', 'updated_at', 'timestamp(0) without time zone'],
            ['training_live_sessions', 'ends_at', 'timestamp(0) without time zone'],
            ['training_live_sessions', 'starts_at', 'timestamp(0) without time zone'],
            ['training_live_sessions', 'instructor', 'varchar(255)'],
            ['task_observers', 'id', 'bigint'],
            ['users', 'mfa_secret', 'text'],
            ['users', 'name', 'varchar(255)'],
            ['users', 'last_failed_login_at', 'timestamp(0) without time zone'],
            ['users', 'login_count', 'integer DEFAULT 0'],
            ['users', 'settings', 'jsonb DEFAULT \'{}\'::jsonb'],
            ['users', 'status', 'varchar(50) DEFAULT \'active\'::character varying'],
            ['users', 'photo', 'varchar(255)'],
            ['users', 'locked_until', 'timestamp(0) without time zone'],
            ['users', 'failed_login_attempts', 'integer DEFAULT 0'],
            ['users', 'mfa_enabled', 'boolean DEFAULT false'],
            ['users', 'avatar', 'varchar(255)'],
            ['feature_flags', 'conditions', 'jsonb'],
            ['feature_flags', 'enabled', 'boolean DEFAULT false'],
            ['feature_flags', 'key', 'varchar(100)'],
            ['payments', 'invoice_number', 'varchar(60)'],
            ['payments', 'webhook_event_id', 'varchar(120)'],
            ['payments', 'proof_hash', 'varchar(64)'],
            ['payments', 'plan_slug', 'varchar(60)'],
            ['payments', 'expires_at', 'timestamp(0) without time zone'],
            ['payments', 'phone', 'varchar(40)'],
            ['payments', 'provider', 'varchar(60)'],
            ['payments', 'gateway_ref', 'varchar(120)'],
            ['payments', 'invoice_path', 'varchar(255)'],
            ['payments', 'duration_months', 'integer DEFAULT 1'],
            ['onboarding_steps', 'title', 'varchar(200)'],
            ['onboarding_steps', 'order', 'integer DEFAULT 0'],
            ['onboarding_steps', 'description', 'text'],
            ['onboarding_steps', 'key', 'varchar(100)'],
            ['onboarding_steps', 'route_name', 'varchar(120)'],
            ['onboarding_steps', 'category', 'varchar(100)'],
            ['onboarding_steps', 'action_url', 'varchar(500)'],
            ['onboarding_steps', 'is_required', 'boolean DEFAULT true'],
            ['onboarding_steps', 'points', 'integer DEFAULT 0'],
            ['onboarding_steps', 'sort_order', 'integer DEFAULT 0'],
            ['onboarding_steps', 'icon', 'varchar(200)'],
            ['onboarding_steps', 'action_label', 'varchar(200)'],
            ['onboarding_steps', 'translations', 'jsonb'],
            ['platform_announcements', 'name', 'varchar(255)'],
            ['platform_announcements', 'data', 'jsonb'],
            ['platform_announcements', 'organization_id', 'bigint'],
            ['platform_announcements', 'deleted_at', 'timestamp(0) without time zone'],
            ['platform_announcements', 'status', 'varchar(50)'],
            ['purchase_requests', 'name', 'varchar(255)'],
            ['purchase_requests', 'data', 'jsonb'],
            ['help_articles', 'translations', 'json'],
            ['help_articles', 'view_count', 'integer DEFAULT 0'],
            ['help_articles', 'helpful_count', 'integer DEFAULT 0'],
            ['help_articles', 'help_category_id', 'bigint'],
            ['help_articles', 'author_id', 'bigint'],
            ['help_articles', 'status', 'varchar(20) DEFAULT \'draft\'::character varying'],
            ['help_articles', 'not_helpful_count', 'integer DEFAULT 0'],
            ['licenses', 'payment_id', 'bigint'],
            ['licenses', 'superseded_by', 'bigint'],
            ['licenses', 'superseded_at', 'timestamp(0) without time zone'],
            ['licenses', 'activated_at', 'timestamp(0) without time zone'],
            ['licenses', 'duration_months', 'integer'],
            ['training_learning_paths', 'is_active', 'boolean DEFAULT true'],
            ['training_learning_paths', 'courses', 'jsonb'],
            ['training_learning_paths', 'updated_at', 'timestamp(0) without time zone'],
            ['vehicle_fuel_logs', 'cost', 'numeric(12,2)'],
            ['vehicle_fuel_logs', 'filled_at', 'timestamp(0) without time zone'],
            ['vehicle_fuel_logs', 'liters', 'numeric(8,2)'],
            ['vehicle_fuel_logs', 'mileage', 'integer'],
            ['vehicle_fuel_logs', 'station', 'varchar(255)'],
            ['employees', 'deleted_at', 'timestamp(0) without time zone'],
            ['conversations', 'deleted_at', 'timestamp(0) without time zone'],
            ['visitor_invitations', 'data', 'jsonb'],
            ['visitor_invitations', 'name', 'varchar(255)'],
            ['visitor_invitations', 'deleted_at', 'timestamp(0) without time zone'],
            ['visitor_invitations', 'status', 'varchar(50)'],
            ['messages', 'deleted_at', 'timestamp(0) without time zone'],
            ['purchase_orders', 'total', 'numeric(14,2)'],
            ['purchase_orders', 'ordered_at', 'date'],
            ['purchase_orders', 'received_at', 'date'],
            ['purchase_orders', 'currency', 'varchar(3) DEFAULT \'XOF\'::character varying'],
            ['purchase_orders', 'reference', 'varchar(50)'],
            ['tasks', 'parent_id', 'bigint'],
            ['tasks', 'settings', 'jsonb'],
            ['training_live_attendees', 'updated_at', 'timestamp(0) without time zone'],
            ['training_live_attendees', 'registered_at', 'timestamp(0) without time zone'],
            ['training_live_attendees', 'created_at', 'timestamp(0) without time zone'],
            ['training_live_attendees', 'attended', 'boolean DEFAULT false'],
            ['vehicle_trips', 'driver_id', 'bigint'],
            ['vehicle_trips', 'fuel_cost', 'numeric(12,2)'],
            ['vehicle_trips', 'started_at', 'timestamp(0) without time zone'],
            ['vehicle_trips', 'end_km', 'integer'],
            ['vehicle_trips', 'ended_at', 'timestamp(0) without time zone'],
            ['vehicle_trips', 'start_km', 'integer'],
            ['events', 'start_at', 'timestamp(0) without time zone'],
            ['events', 'deleted_at', 'timestamp(0) without time zone'],
            ['events', 'end_at', 'timestamp(0) without time zone'],
            ['academy_courses', 'is_public', 'boolean DEFAULT true'],
            ['trial_activations', 'trial_ends_at', 'timestamp(0) without time zone'],
            ['trial_activations', 'user_id', 'bigint'],
            ['trial_activations', 'activated_at', 'timestamp(0) without time zone'],
            ['trial_activations', 'status', 'varchar(30) DEFAULT \'active\'::character varying'],
            ['vehicles', 'plate_number', 'varchar(50)'],
            ['vehicles', 'color', 'varchar(30)'],
            ['vehicles', 'purchase_date', 'date'],
            ['vehicles', 'year', 'integer'],
            ['vehicles', 'technical_visit_at', 'date'],
            ['vehicles', 'insurance_expires_at', 'date'],
            ['vehicle_geofences', 'radius_m', 'integer'],
            ['vehicle_geofences', 'coordinates', 'jsonb'],
            ['crm_email_templates', 'deleted_at', 'timestamp(0) without time zone'],
            ['departments', 'deleted_at', 'timestamp(0) without time zone'],
            ['calendars', 'is_active', 'boolean DEFAULT true'],
            ['organizations', 'type', 'varchar(50) DEFAULT \'standard\'::character varying'],
            ['organizations', 'plan_id', 'varchar(60)'],
            ['organizations', 'status', 'varchar(50) DEFAULT \'active\'::character varying'],
            ['project_milestones', 'completed_at', 'date'],
            ['project_milestones', 'position', 'smallint DEFAULT \'0\'::smallint'],
            ['mail_registry', 'deleted_at', 'timestamp(0) without time zone'],
            ['mail_registry', 'processing_delay_days', 'integer DEFAULT 3'],
            ['expense_reports', 'deleted_at', 'timestamp(0) without time zone'],
            ['meetings', 'deleted_at', 'timestamp(0) without time zone'],
            ['support_tickets', 'deleted_at', 'timestamp(0) without time zone'],
            ['task_assignees', 'id', 'bigint'],
            ['documents', 'status', 'varchar(30) DEFAULT \'active\'::character varying'],
            ['leave_requests', 'deleted_at', 'timestamp(0) without time zone'],
            ['campaign_recipients', 'deleted_at', 'timestamp(0) without time zone'],
        ];
    }

    public function up(): void
    {
        foreach ($this->tables() as $table => $definition) {
            if (Schema::hasTable($table)) {
                continue;
            }

            DB::statement('CREATE TABLE "' . $table . '" (' . $definition . ')');
        }

        foreach ($this->colonnes() as [$table, $colonne, $definition]) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, $colonne)) {
                continue;
            }

            DB::statement('ALTER TABLE "' . $table . '" ADD COLUMN "' . $colonne . '" ' . $definition);
        }
    }

    public function down(): void
    {
        // Volontairement sans retour arriere.
        //
        // Ces objets existent en production depuis toujours ; les supprimer
        // parce qu'on annule une migration qui n'a fait que les DECRIRE
        // detruirait des donnees que cette migration n'a jamais creees.
    }
};
