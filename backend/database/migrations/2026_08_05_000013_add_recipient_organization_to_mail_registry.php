<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Courrier sortant : le formulaire saisit l'organisation du destinataire mais
 * la colonne n'existait pas (seul sender_organization était présent) — la donnée
 * était donc silencieusement perdue à l'enregistrement.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mail_registry')) {
            return;
        }

        Schema::table('mail_registry', function (Blueprint $table) {
            if (! Schema::hasColumn('mail_registry', 'recipient_organization')) {
                $table->string('recipient_organization')->nullable()->after('recipient_name');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('mail_registry', 'recipient_organization')) {
            Schema::table('mail_registry', function (Blueprint $table) {
                $table->dropColumn('recipient_organization');
            });
        }
    }
};
