<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crée la table import_jobs — wizard d'import universel CSV/XLSX.
     *
     * Cycle de vie : pending → mapping → validating → importing → completed | failed
     */
    public function up(): void
    {
        if (! Schema::hasTable('import_jobs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('import_jobs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();

                // Module cible : events | tasks | visitors | hr | contacts | accounting
                $table->string('module', 50);

                // Fichier source
                $table->string('file_path')->comment('Chemin de stockage privé');
                $table->string('original_filename');
                $table->string('file_type', 10)->comment('csv | xlsx');

                // Mapping et options
                $table->json('column_mapping')->nullable()->comment('{"Nom":"full_name","Email":"email"}');
                $table->json('import_options')->nullable()->comment('{"skip_header":true,"update_existing":false}');

                // Statut du wizard
                $table->enum('status', [
                    'pending',
                    'mapping',
                    'validating',
                    'importing',
                    'completed',
                    'failed',
                ])->default('pending');

                // Compteurs de résultat
                $table->integer('total_rows')->default(0);
                $table->integer('valid_rows')->default(0);
                $table->integer('imported_rows')->default(0);
                $table->integer('skipped_rows')->default(0);
                $table->integer('error_rows')->default(0);

                // Détail des erreurs (max 100 erreurs stockées)
                $table->json('validation_errors')->nullable()->comment('[{"row":5,"field":"email","message":"..."}]');
                $table->json('import_summary')->nullable();

                $table->timestamps();

                $table->index(['organization_id', 'status']);
                $table->index(['user_id', 'created_at']);
                $table->index('module');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('import_jobs');
    }
};
