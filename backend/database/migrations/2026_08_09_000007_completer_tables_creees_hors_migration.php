<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Completer les tables creees a la main, dans une forme plus pauvre que celle
 * decrite par le depot.
 *
 * Plusieurs tables existent en production mais y ont ete creees hors migration,
 * avec moins de colonnes que ce que les migrations definissent. Le code, lui,
 * suit le depot : c'est pourquoi CREER UN BON DE COMMANDE ECHOUE aujourd'hui —
 * `ProcurementService::createPurchaseOrder()` ecrit `po_number`, `items` et
 * `rfq_id`, trois colonnes que `purchase_orders` ne possede pas en base. Meme
 * situation pour `purchase_requests`, `suppliers`, `feature_flags`,
 * `help_articles` et une quinzaine d'autres.
 *
 * Les definitions sont relevees sur une base RECONSTRUITE par les migrations :
 * c'est la reference, puisque c'est elle que le code attend.
 *
 * AUCUNE colonne n'est ajoutee en NOT NULL, meme quand la migration d'origine
 * l'exige : elle rejoint une table qui contient deja des lignes, lesquelles
 * n'ont aucune valeur a y mettre. Poser la contrainte demanderait une reprise
 * de donnees, qui est une decision fonctionnelle et non une correction de
 * schema.
 */
return new class extends Migration
{
    /** Colonnes definies par les migrations et absentes de la base. */
    private function colonnes(): array
    {
        return [
            ['project_milestones', 'completion_percent', 'smallint DEFAULT \'0\'::smallint'],
            ['trial_activations', 'converted_plan_id', 'varchar(255)'],
            ['visit_logs', 'purpose', 'varchar(255) DEFAULT \'réunion\'::character varying'],
            ['suppliers', 'portal_access', 'boolean DEFAULT false'],
            ['training_live_attendees', 'duration_minutes', 'smallint'],
            ['vehicle_fuel_logs', 'created_by', 'bigint'],
            ['platform_announcements', 'created_by', 'bigint'],
            ['help_articles', 'author', 'varchar(255)'],
            ['visitor_invitations', 'visit_date', 'date'],
            ['training_live_attendees', 'left_at', 'timestamp(0) without time zone'],
            ['visit_logs', 'badge_returned', 'boolean DEFAULT false'],
            ['project_timesheets', 'organization_id', 'bigint'],
            ['vehicle_trips', 'start_lng', 'numeric(10,7)'],
            ['visit_logs', 'location', 'varchar(255)'],
            ['platform_announcements', 'target_plans', 'jsonb DEFAULT \'["all"]\'::jsonb'],
            ['training_live_sessions', 'duration_minutes', 'smallint DEFAULT \'60\'::smallint'],
            ['training_path_enrollments', 'started_at', 'timestamp(0) without time zone'],
            ['training_live_attendees', 'evaluation_comment', 'text'],
            ['vehicle_geofences', 'type', 'varchar(255) DEFAULT \'circle\'::character varying'],
            ['vehicle_fuel_logs', 'full_tank', 'boolean DEFAULT true'],
            ['visitor_invitations', 'visit_log_id', 'bigint'],
            ['purchase_requests', 'department_id', 'bigint'],
            ['project_milestones', 'tasks_count', 'integer DEFAULT 0'],
            ['vehicle_trips', 'start_location', 'varchar(255)'],
            ['vehicle_trips', 'end_location', 'varchar(255)'],
            ['feature_flags', 'slug', 'varchar(255)'],
            ['help_articles', 'category', 'varchar(255)'],
            ['purchase_requests', 'priority', 'varchar(255) DEFAULT \'normale\'::character varying'],
            ['suppliers', 'address', 'varchar(255)'],
            ['onboarding_steps', 'completed_at', 'timestamp(0) without time zone'],
            ['trial_activations', 'utm_medium', 'varchar(255)'],
            ['training_learning_paths', 'thumbnail_path', 'varchar(255)'],
            ['suppliers', 'tax_number', 'varchar(50)'],
            ['purchase_orders', 'delivery_address', 'text'],
            ['training_learning_paths', 'target_role', 'varchar(255)'],
            ['feature_flags', 'target_plans', 'jsonb DEFAULT \'[]\'::jsonb'],
            ['purchase_requests', 'needed_by_date', 'date'],
            ['visitor_invitations', 'purpose', 'varchar(255)'],
            ['help_articles', 'content', 'json'],
            ['vehicle_trips', 'notes', 'text'],
            ['onboarding_steps', 'data', 'jsonb'],
            ['purchase_orders', 'sent_at', 'timestamp(0) without time zone'],
            ['help_articles', 'views', 'integer DEFAULT 0'],
            ['vehicle_fuel_logs', 'unit_price', 'numeric(8,2)'],
            ['training_path_enrollments', 'path_id', 'bigint'],
            ['users', 'permissions', 'json'],
            ['project_milestones', 'organization_id', 'bigint'],
            ['vehicle_geofences', 'alert_on_exit', 'boolean DEFAULT true'],
            ['purchase_orders', 'approved_at', 'timestamp(0) without time zone'],
            ['platform_announcements', 'scheduled_at', 'timestamp(0) without time zone'],
            ['training_live_attendees', 'organization_id', 'bigint'],
            ['visit_logs', 'created_by', 'bigint'],
            ['feature_flags', 'enabled_percent', 'smallint DEFAULT \'0\'::smallint'],
            ['help_articles', 'deleted_at', 'timestamp(0) without time zone'],
            ['help_articles', 'roles', 'json'],
            ['vehicle_trips', 'max_speed', 'smallint'],
            ['purchase_requests', 'title', 'varchar(255)'],
            ['purchase_requests', 'refusal_reason', 'text'],
            ['suppliers', 'bank_iban', 'varchar(50)'],
            ['purchase_orders', 'notes', 'text'],
            ['purchase_requests', 'approved_by', 'bigint'],
            ['purchase_requests', 'pr_number', 'varchar(25)'],
            ['vehicle_trips', 'duration_minutes', 'smallint'],
            ['training_learning_paths', 'items', 'jsonb'],
            ['vehicle_geofences', 'radius_meters', 'integer'],
            ['visitor_invitations', 'visitor_name', 'varchar(255)'],
            ['purchase_orders', 'po_number', 'varchar(25)'],
            ['suppliers', 'rccm', 'varchar(50)'],
            ['feature_flags', 'created_by', 'bigint'],
            ['onboarding_completions', 'metadata', 'json'],
            ['visitor_invitations', 'is_used', 'boolean DEFAULT false'],
            ['vehicle_geofences', 'polygon_coords', 'json'],
            ['visitor_invitations', 'used_at', 'timestamp(0) without time zone'],
            ['training_live_sessions', 'recording_url', 'varchar(255)'],
            ['training_live_sessions', 'course_id', 'bigint'],
            ['visit_logs', 'purpose_detail', 'varchar(255)'],
            ['vehicle_fuel_logs', 'odometer_km', 'integer'],
            ['feature_flags', 'is_active', 'boolean DEFAULT false'],
            ['purchase_requests', 'approved_at', 'timestamp(0) without time zone'],
            ['vehicle_trips', 'avg_speed', 'numeric(6,2)'],
            ['purchase_orders', 'invoice_path', 'varchar(255)'],
            ['vehicle_geofences', 'center_lat', 'numeric(10,7)'],
            ['platform_announcements', 'type', 'varchar(255) DEFAULT \'info\'::character varying'],
            ['visitor_invitations', 'visit_time_start', 'time without time zone'],
            ['visit_logs', 'equipment_brought', 'jsonb'],
            ['purchase_orders', 'actual_delivery_date', 'date'],
            ['suppliers', 'bank_name', 'varchar(100)'],
            ['training_live_attendees', 'joined_at', 'timestamp(0) without time zone'],
            ['visit_logs', 'parking_spot_id', 'bigint'],
            ['platform_announcements', 'content', 'text'],
            ['training_live_sessions', 'materials_paths', 'jsonb'],
            ['suppliers', 'portal_password_hash', 'varchar(255)'],
            ['help_articles', 'is_public', 'boolean DEFAULT true'],
            ['suppliers', 'portal_email', 'varchar(255)'],
            ['vehicle_geofences', 'notify_user_ids', 'json'],
            ['vehicle_trips', 'fuel_consumed_liters', 'numeric(6,2)'],
            ['visitor_invitations', 'visit_time_end', 'time without time zone'],
            ['visit_logs', 'access_zone_id', 'bigint'],
            ['purchase_orders', 'approved_by', 'bigint'],
            ['suppliers', 'bank_swift', 'varchar(20)'],
            ['visit_logs', 'floor', 'varchar(255)'],
            ['help_articles', 'tags', 'json'],
            ['visit_logs', 'host_user_id', 'bigint'],
            ['visit_logs', 'visitor_id', 'bigint'],
            ['training_learning_paths', 'total_hours', 'smallint DEFAULT \'0\'::smallint'],
            ['vehicle_geofences', 'alert_on_enter', 'boolean DEFAULT true'],
            ['feature_flags', 'is_global', 'boolean DEFAULT false'],
            ['visit_logs', 'signature_path', 'varchar(255)'],
            ['training_path_enrollments', 'progress_percent', 'smallint DEFAULT \'0\'::smallint'],
            ['training_learning_paths', 'difficulty', 'varchar(255) DEFAULT \'debutant\'::character varying'],
            ['visitor_invitations', 'access_code', 'uuid'],
            ['platform_announcements', 'title', 'varchar(255)'],
            ['vehicle_fuel_logs', 'station_name', 'varchar(255)'],
            ['purchase_orders', 'quotation_id', 'bigint'],
            ['purchase_requests', 'requestor_user_id', 'bigint'],
            ['help_articles', 'module', 'varchar(255)'],
            ['vehicle_fuel_logs', 'receipt_path', 'varchar(255)'],
            ['visitor_invitations', 'location', 'varchar(255)'],
            ['project_members', 'joined_at', 'timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP'],
            ['purchase_orders', 'rfq_id', 'bigint'],
            ['suppliers', 'legal_form', 'varchar(50)'],
            ['purchase_requests', 'description', 'text'],
            ['trial_activations', 'utm_source', 'varchar(255)'],
            ['help_articles', 'helpful_yes', 'integer DEFAULT 0'],
            ['platform_announcements', 'expires_at', 'timestamp(0) without time zone'],
            ['visitor_invitations', 'visitor_email', 'varchar(255)'],
            ['training_live_sessions', 'meeting_id', 'varchar(255)'],
            ['help_articles', 'organization_id', 'bigint'],
            ['feature_flags', 'target_org_ids', 'jsonb DEFAULT \'[]\'::jsonb'],
            ['vehicle_trips', 'polyline', 'text'],
            ['training_live_attendees', 'evaluation_rating', 'smallint'],
            ['training_live_sessions', 'description', 'text'],
            ['platform_announcements', 'is_published', 'boolean DEFAULT false'],
            ['vehicle_trips', 'end_lat', 'numeric(10,7)'],
            ['purchase_orders', 'payment_terms_days', 'smallint DEFAULT \'30\'::smallint'],
            ['suppliers', 'website', 'varchar(255)'],
            ['purchase_requests', 'items', 'jsonb'],
            ['vehicle_trips', 'end_lng', 'numeric(10,7)'],
            ['project_milestones', 'color', 'varchar(7) DEFAULT \'#8B5CF6\'::character varying'],
            ['purchase_orders', 'currency_code', 'varchar(3) DEFAULT \'XOF\'::character varying'],
            ['visit_logs', 'badge_issued', 'boolean DEFAULT false'],
            ['vehicle_fuel_logs', 'fuel_type', 'varchar(255) DEFAULT \'diesel\'::character varying'],
            ['purchase_requests', 'justification', 'text'],
            ['help_articles', 'helpful_no', 'integer DEFAULT 0'],
            ['purchase_orders', 'items', 'jsonb'],
            ['project_milestones', 'completed_tasks_count', 'integer DEFAULT 0'],
            ['vehicle_trips', 'start_lat', 'numeric(10,7)'],
            ['help_articles', 'version', 'varchar(255)'],
            ['visitor_invitations', 'expires_at', 'timestamp(0) without time zone'],
            ['visit_logs', 'scheduled_at', 'timestamp(0) without time zone'],
            ['help_articles', 'title', 'json'],
            ['trial_activations', 'utm_campaign', 'varchar(255)'],
            ['vehicle_geofences', 'center_lng', 'numeric(10,7)'],
            ['training_live_sessions', 'platform', 'varchar(255) DEFAULT \'teams\'::character varying'],
        ];
    }

    public function up(): void
    {
        foreach ($this->colonnes() as [$table, $colonne, $definition]) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, $colonne)) {
                continue;
            }

            DB::statement('ALTER TABLE "' . $table . '" ADD COLUMN "' . $colonne . '" ' . $definition);
        }
    }

    public function down(): void
    {
        // Sans retour arriere : supprimer ces colonnes reintroduirait
        // exactement la panne que cette migration corrige.
    }
};
