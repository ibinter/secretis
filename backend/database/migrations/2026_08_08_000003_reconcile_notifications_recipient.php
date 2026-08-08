<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La table `notifications` porte DEUX représentations du destinataire :
 *   - `notifiable_type` / `notifiable_id` (NOT NULL) — écrites par le canal
 *     `database` de Laravel, utilisé par 19 classes `App\Notifications\*` ;
 *   - `user_id` / `title` / `body` — écrites par `NotificationService` via le
 *     modèle `AppNotification`.
 *
 * Personne ne remplissait les deux, d'où deux pannes symétriques :
 *   1. `NotificationService` échouait à l'insertion (`notifiable_type` NOT NULL) ;
 *   2. les notifications Laravel natives s'inséraient mais restaient invisibles :
 *      TOUTES les lectures (centre de notifications, compteur, cloche) filtrent
 *      sur `user_id`, qu'elles laissaient nul.
 *
 * Plutôt que de corriger chaque appelant, on réconcilie à la source : un trigger
 * BEFORE INSERT complète la représentation manquante. Les contraintes NOT NULL
 * étant évaluées après les triggers BEFORE, les deux chemins d'écriture passent.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('notifications')) {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION notifications_sync_recipient()
            RETURNS trigger AS $$
            BEGIN
                -- Sens 1 : notification Laravel native → renseigner user_id.
                IF NEW.user_id IS NULL
                   AND NEW.notifiable_id IS NOT NULL
                   AND NEW.notifiable_type LIKE '%User' THEN
                    NEW.user_id := NEW.notifiable_id;
                END IF;

                -- Sens 2 : notification applicative → renseigner le polymorphe.
                IF NEW.notifiable_id IS NULL AND NEW.user_id IS NOT NULL THEN
                    NEW.notifiable_id := NEW.user_id;
                END IF;

                IF NEW.notifiable_type IS NULL AND NEW.user_id IS NOT NULL THEN
                    NEW.notifiable_type := 'App\Models\User';
                END IF;

                -- L'organisation se déduit du destinataire (cloisonnement multi-tenant).
                IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
                    SELECT organization_id INTO NEW.organization_id
                    FROM users WHERE id = NEW.user_id;
                END IF;

                -- Titre / corps : le canal `database` de Laravel ne remplit que
                -- `data`. On y récupère les clés usuelles pour que l'affichage
                -- ne soit pas vide.
                IF NEW.title IS NULL AND NEW.data IS NOT NULL AND left(NEW.data, 1) = '{' THEN
                    BEGIN
                        NEW.title := NULLIF(NEW.data::jsonb ->> 'title', '');
                        IF NEW.body IS NULL THEN
                            NEW.body := NULLIF(
                                COALESCE(NEW.data::jsonb ->> 'body', NEW.data::jsonb ->> 'message'),
                                ''
                            );
                        END IF;
                    EXCEPTION WHEN others THEN
                        NULL; -- `data` non parsable : on n'empêche jamais l'insertion.
                    END;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        SQL);

        DB::unprepared('DROP TRIGGER IF EXISTS trg_notifications_sync_recipient ON notifications');
        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_notifications_sync_recipient
            BEFORE INSERT ON notifications
            FOR EACH ROW EXECUTE FUNCTION notifications_sync_recipient();
        SQL);

        // Rattrapage des lignes déjà présentes laissées orphelines de `user_id`.
        DB::statement(<<<'SQL'
            UPDATE notifications
               SET user_id = notifiable_id
             WHERE user_id IS NULL
               AND notifiable_id IS NOT NULL
               AND notifiable_type LIKE '%User'
        SQL);
    }

    public function down(): void
    {
        if (Schema::hasTable('notifications')) {
            DB::unprepared('DROP TRIGGER IF EXISTS trg_notifications_sync_recipient ON notifications');
            DB::unprepared('DROP FUNCTION IF EXISTS notifications_sync_recipient()');
        }
    }
};
