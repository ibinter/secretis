<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Chaînage arrivée → réponse dans le registre du courrier.
 *
 * Le parcours « recevoir → viser → répondre → archiver » s'arrêtait à l'étape 2 :
 * rien ne reliait un courrier départ au courrier arrivée qu'il traite. Un
 * secrétariat ne pouvait donc ni prouver qu'une correspondance avait reçu
 * réponse, ni retrouver la réponse depuis l'original — alors que le statut
 * `replied` existait déjà dans le workflow.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mail_registry') || Schema::hasColumn('mail_registry', 'parent_mail_id')) {
            return;
        }

        Schema::table('mail_registry', function (Blueprint $table) {
            // `nullOnDelete` : supprimer l'original ne doit pas effacer la
            // réponse, qui reste une pièce du registre à part entière.
            $table->foreignId('parent_mail_id')
                  ->nullable()
                  ->after('reference')
                  ->constrained('mail_registry')
                  ->nullOnDelete();

            $table->index('parent_mail_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('mail_registry') && Schema::hasColumn('mail_registry', 'parent_mail_id')) {
            Schema::table('mail_registry', function (Blueprint $table) {
                $table->dropConstrainedForeignId('parent_mail_id');
            });
        }
    }
};
