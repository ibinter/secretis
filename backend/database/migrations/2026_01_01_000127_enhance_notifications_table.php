<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration 127 — Système de notifications multicanal avancé
 *
 * Crée deux tables complémentaires :
 *  - notification_preferences : préférences par utilisateur × type × canal
 *  - notification_center      : centre de notifications in-app enrichi
 *
 * La table notifications existante (migration 090) reste inchangée et
 * continue de fonctionner pour les notifications Laravel natives.
 * notification_center est dédiée au centre de notifications SECRETIS.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────────────────────────────
        // 1. Préférences de notification par utilisateur et par type
        // ─────────────────────────────────────────────────────────────────
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Type de notification : event_reminder, task_assigned, document_validated,
            // visitor_arrived, message_received, system_alert, license_expiring, payment_received
            $table->string('type', 64);

            // Canaux activés / désactivés (par défaut : app+email activés, sms+whatsapp désactivés)
            $table->boolean('app')->default(true);
            $table->boolean('email')->default(true);
            $table->boolean('sms')->default(false);
            $table->boolean('whatsapp')->default(false);

            // Configuration complémentaire libre (ex: {"reminder_minutes": 30, "digest_hour": "08:00"})
            $table->json('config')->nullable();

            $table->timestamps();

            // Un utilisateur ne peut avoir qu'une seule préférence par type
            $table->unique(['user_id', 'type']);

            $table->index('user_id');
        });

        // ─────────────────────────────────────────────────────────────────
        // 2. Centre de notifications in-app enrichi
        // ─────────────────────────────────────────────────────────────────
        Schema::create('notification_center', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Type identifiant la nature de la notification
            $table->string('type', 64);

            // Titre et corps multilingues ({"fr": "...", "en": "..."})
            $table->json('title');
            $table->json('message');

            // URL de navigation au clic (ex: /taches/42, /agenda/event/5)
            $table->string('action_url', 500)->nullable();

            // Icône Lucide (ex: "bell", "calendar", "user-check") et couleur sémantique
            $table->string('icon', 64)->nullable();
            $table->string('color', 32)->nullable(); // blue, green, red, yellow, purple, gray

            // État de lecture
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            // Expiration automatique (ex: reminder d'événement passé)
            $table->timestamp('expires_at')->nullable();

            // Données contextuelles libres (IDs de ressources liées, etc.)
            $table->json('metadata')->nullable();

            $table->timestamps();

            // Index composites pour les requêtes les plus fréquentes
            $table->index(['user_id', 'is_read', 'created_at'], 'nc_user_unread_date');
            $table->index(['user_id', 'type'],                   'nc_user_type');
            $table->index(['user_id', 'expires_at'],             'nc_user_expires');
            $table->index('organization_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_center');
        Schema::dropIfExists('notification_preferences');
    }
};
