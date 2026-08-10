<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Colonnes du Centre de Notifications.
 *
 * Ajoute à la table `notifications` (migration 090/127) les colonnes attendues
 * par NotificationCenterController / NotificationService / SmartNotificationService
 * mais absentes du schéma d'origine (qui utilisait le format morph Laravel) :
 *
 *   - user_id        : rattachement direct à l'utilisateur (le centre filtre dessus)
 *   - title / body   : titre + corps du message (le centre les affiche/recherche)
 *   - archived_at    : archivage in-app
 *   - snoozed_until  : report « me le rappeler plus tard »
 *
 * NON-DESTRUCTIF : chaque colonne est nullable et protégée par hasColumn().
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('type');
                $table->index('user_id');
            }
            if (!Schema::hasColumn('notifications', 'title')) {
                $table->string('title')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('notifications', 'body')) {
                $table->text('body')->nullable()->after('title');
            }
            if (!Schema::hasColumn('notifications', 'archived_at')) {
                $table->timestamp('archived_at')->nullable();
            }
            if (!Schema::hasColumn('notifications', 'snoozed_until')) {
                $table->timestamp('snoozed_until')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        Schema::table('notifications', function (Blueprint $table) {
            foreach (['snoozed_until', 'archived_at', 'body', 'title'] as $col) {
                if (Schema::hasColumn('notifications', $col)) {
                    $table->dropColumn($col);
                }
            }
            if (Schema::hasColumn('notifications', 'user_id')) {
                // Drop de l'index avant la colonne (nom par défaut : notifications_user_id_index)
                try {
                    $table->dropIndex(['user_id']);
                } catch (\Throwable $e) {
                    // index déjà absent — ignorer
                }
                $table->dropColumn('user_id');
            }
        });
    }
};
