<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SECRETIS ERP — Migration : Sessions de prise en main support IBIG Soft
 *
 * Permet aux agents IBIG Soft d'accéder à un espace client avec traçabilité complète,
 * autorisation explicite de l'admin client, et expiration automatique après 4 heures.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_sessions', function (Blueprint $table) {
            $table->id();

            // ── Parties prenantes ─────────────────────────────────────────────
            $table->foreignId('organization_id')
                  ->constrained()
                  ->cascadeOnDelete()
                  ->comment('Organisation cliente concernée');

            $table->foreignId('support_user_id')
                  ->constrained('users')
                  ->cascadeOnDelete()
                  ->comment('Agent IBIG Soft (rôle superadmin_ibig)');

            $table->foreignId('authorized_by_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete()
                  ->comment('Admin client qui a approuvé la session');

            // ── Contexte de la demande ────────────────────────────────────────
            $table->string('reason')->comment('Motif obligatoire de la prise en main');
            $table->string('ticket_reference')->nullable()->comment('Référence du ticket support lié');
            $table->enum('status', ['pending', 'active', 'expired', 'ended', 'rejected'])
                  ->default('pending')
                  ->comment('pending: demandée; active: approuvée; ended: terminée manuellement');

            // ── Temporalité ───────────────────────────────────────────────────
            $table->timestamp('requested_at')->useCurrent()->comment('Date de la demande');
            $table->timestamp('approved_at')->nullable()->comment('Date d\'approbation par l\'admin client');
            $table->timestamp('started_at')->nullable()->comment('Date de début effectif de la session');
            $table->timestamp('expires_at')->nullable()->comment('Expiration automatique (max 4 heures)');
            $table->timestamp('ended_at')->nullable()->comment('Fin manuelle par l\'agent ou l\'admin client');

            // ── Statut et traçabilité ─────────────────────────────────────────
            $table->boolean('is_active')->default(false)->comment('Session actuellement en cours');
            $table->boolean('client_notified')->default(false)->comment('Notification envoyée à l\'admin client');
            $table->json('actions_log')->nullable()
                  ->comment('Journal des actions sensibles effectuées pendant la session');
            $table->string('ended_by')->nullable()->comment('Qui a terminé : support, client, system (expiration)');
            $table->text('end_notes')->nullable()->comment('Notes de clôture de la session');

            $table->timestamps();

            // ── Index ─────────────────────────────────────────────────────────
            $table->index(['organization_id', 'is_active']);
            $table->index(['support_user_id', 'is_active']);
            $table->index(['status', 'expires_at']);
            $table->index('requested_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_sessions');
    }
};
