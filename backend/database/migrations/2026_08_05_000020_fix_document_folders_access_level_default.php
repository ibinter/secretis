<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `document_folders.access_level` avait pour DÉFAUT « organization », valeur
 * REFUSÉE par sa propre contrainte CHECK (public|internal|confidential|top_secret)
 * → toute création de dossier sans access_level explicite échouait
 * (« violates check constraint document_folders_access_level_check »).
 * On aligne le défaut sur « internal », le niveau standard d'un dossier interne.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('document_folders') || ! Schema::hasColumn('document_folders', 'access_level')) {
            return;
        }

        DB::statement("ALTER TABLE document_folders ALTER COLUMN access_level SET DEFAULT 'internal'");

        // Rattrape les lignes déjà créées avec une valeur hors contrainte.
        DB::table('document_folders')
            ->whereNotIn('access_level', ['public', 'internal', 'confidential', 'top_secret'])
            ->update(['access_level' => 'internal']);
    }

    public function down(): void
    {
        if (Schema::hasTable('document_folders') && Schema::hasColumn('document_folders', 'access_level')) {
            DB::statement("ALTER TABLE document_folders ALTER COLUMN access_level SET DEFAULT 'organization'");
        }
    }
};
