<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `notifications.id` est un uuid NOT NULL SANS valeur par défaut.
 * Les notifications créées par `NotificationService` (insert direct, pas via le
 * modèle Notification de Laravel) échouaient donc systématiquement :
 * « null value in column "id" violates not-null constraint ».
 * Résultat : AUCUNE notification métier n'était enregistrée.
 *
 * On donne un défaut PostgreSQL à la colonne : les deux chemins (Eloquent qui
 * fournit l'uuid, et l'insert direct qui ne le fournit pas) fonctionnent alors.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications') || ! Schema::hasColumn('notifications', 'id')) {
            return;
        }

        // gen_random_uuid() est natif à partir de PostgreSQL 13 ; pgcrypto sert de repli.
        try {
            DB::statement('ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        } catch (\Throwable $e) {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');
            DB::statement('ALTER TABLE notifications ALTER COLUMN id SET DEFAULT gen_random_uuid()');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('notifications') && Schema::hasColumn('notifications', 'id')) {
            DB::statement('ALTER TABLE notifications ALTER COLUMN id DROP DEFAULT');
        }
    }
};
