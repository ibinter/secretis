<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * 1) mail_trackings — fiche de circulation du courrier.
 *    `CourrierService::addTrackingEntry()` y insère chaque mouvement, mais la
 *    table n'a JAMAIS été créée : l'insert échoue dans un SAVEPOINT avec un
 *    simple Log::warning → **tout l'historique de circulation était perdu en
 *    silence**. C'est le cœur du métier « secrétariat d'administration ».
 *
 * 2) documents.tsv_content — index de recherche plein texte PostgreSQL.
 *    `OcrService::indexDocumentForSearch()` et `OcrProcessDocument` exécutent
 *    `UPDATE documents SET tsv_content = to_tsvector('french', ...)` sur une
 *    colonne inexistante → exception, et le document finit en `ocr_status = failed`.
 *    Sans elle, impossible de retrouver un courrier par son contenu.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('mail_trackings')) {
            Schema::create('mail_trackings', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignId('mail_id')->constrained('mail_registry')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('action', 60);            // created, status_changed, assigned, transmitted…
                $table->text('comment')->nullable();
                $table->string('status', 30)->nullable(); // statut du courrier au moment du mouvement
                $table->timestamp('created_at')->nullable();

                $table->index(['mail_id', 'created_at']);
            });
        }

        if (Schema::hasTable('documents') && ! Schema::hasColumn('documents', 'tsv_content')) {
            DB::statement('ALTER TABLE documents ADD COLUMN tsv_content tsvector');
            // Index GIN : recherche plein texte instantanée même sur gros volumes.
            DB::statement('CREATE INDEX IF NOT EXISTS documents_tsv_content_idx ON documents USING gin (tsv_content)');

            // Amorce l'index sur le contenu déjà extrait.
            DB::statement("UPDATE documents SET tsv_content = to_tsvector('french', COALESCE(text_content, '') || ' ' || COALESCE(title, ''))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_trackings');

        if (Schema::hasTable('documents') && Schema::hasColumn('documents', 'tsv_content')) {
            DB::statement('DROP INDEX IF EXISTS documents_tsv_content_idx');
            DB::statement('ALTER TABLE documents DROP COLUMN tsv_content');
        }
    }
};
