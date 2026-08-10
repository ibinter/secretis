<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jetons de partage de documents (GED).
 * DocumentService::generateShareToken() écrit dans cette table (l'insert était
 * silencieusement avalé par un try/catch → le lien de partage généré ne
 * fonctionnait jamais). Clé primaire UUID côté applicatif, hash SHA-256 du
 * token stocké (jamais le token brut).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('document_share_tokens')) {
            return;
        }

        Schema::create('document_share_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->string('token', 64)->unique();   // hash SHA-256
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->nullable();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_share_tokens');
    }
};
