<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ventilation du courrier par service.
 *
 * Le formulaire d'enregistrement propose depuis toujours un champ « Service
 * destinataire », l'écran du registre un filtre « Service », et le contrôleur
 * charge la liste des services — mais la colonne n'existait pas : la valeur
 * saisie était silencieusement jetée (« department_id not in DB v1 ») et le
 * filtre ne filtrait rien. Un secrétariat ne pouvait donc pas ventiler son
 * courrier entre directions, ce qui est pourtant sa fonction première.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mail_registry')
            || ! Schema::hasTable('departments')
            || Schema::hasColumn('mail_registry', 'department_id')) {
            return;
        }

        Schema::table('mail_registry', function (Blueprint $table) {
            // `nullOnDelete` : dissoudre un service ne doit pas faire disparaître
            // le courrier qu'il a traité — le registre est une pièce d'archive.
            $table->foreignId('department_id')
                  ->nullable()
                  ->after('assigned_to')
                  ->constrained('departments')
                  ->nullOnDelete();

            $table->index(['organization_id', 'department_id']);
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('mail_registry') && Schema::hasColumn('mail_registry', 'department_id')) {
            Schema::table('mail_registry', function (Blueprint $table) {
                $table->dropIndex(['organization_id', 'department_id']);
                $table->dropConstrainedForeignId('department_id');
            });
        }
    }
};
