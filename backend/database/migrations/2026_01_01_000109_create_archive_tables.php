<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration : Tables d'archivage légal
 *
 * Tables créées :
 *   - legal_archive_log : empreintes légales immuables des documents archivés
 *
 * Conforme OHADA : durées de conservation 5, 7, 10, 30 ans selon la catégorie.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('legal_archive_log')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('legal_archive_log', function (Blueprint $table) {
                $table->id();
                $table->foreignId('document_id')->constrained()->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

                // Dates d'archivage et d'expiration légale
                $table->timestamp('archive_date');
                $table->timestamp('expiry_date');

                // Empreinte cryptographique pour vérification d'intégrité
                $table->string('sha256_hash', 64);
                // Timestamp horodaté RFC 3161 simplifié (base64 du JSON signé)
                $table->text('timestamp_token')->nullable();

                // Stockage
                $table->string('storage_driver', 30)->default('local'); // local | s3 | glacier
                $table->string('storage_path', 500);

                // Statistiques de récupération
                $table->unsignedSmallInteger('retrieval_count')->default(0);
                $table->timestamp('last_retrieved_at')->nullable();

                // Catégorie et durée de rétention enregistrées au moment de l'archivage
                $table->string('category', 30)->nullable();
                $table->unsignedTinyInteger('retention_years');

                // Archivé par
                $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();

                // Vérification d'intégrité
                $table->boolean('integrity_verified')->default(false);
                $table->timestamp('last_verified_at')->nullable();

                $table->timestamps();

                $table->unique('document_id'); // Un seul log d'archive par document
                $table->index(['organization_id', 'archive_date']);
                $table->index(['organization_id', 'expiry_date']);
                $table->index('sha256_hash');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_archive_log');
    }
};
