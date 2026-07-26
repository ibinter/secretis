<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crée les tables du Report Builder drag-and-drop.
     *
     * custom_reports       — rapports personnalisés (colonnes, filtres, tri, planification)
     * custom_report_runs   — historique d'exécution + fichiers générés
     */
    public function up(): void
    {
        Schema::create('custom_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();

            $table->string('name');
            $table->text('description')->nullable();

            // Module source : events | tasks | documents | visitors | hr | accounting | fleet | quality
            $table->string('module', 50);

            // Configuration du rapport (JSON)
            $table->json('columns');   // [{"field":"title","label":"Titre","width":200,"visible":true}]
            $table->json('filters');   // [{"field":"status","operator":"=","value":"pending"}]
            $table->json('sort');      // [{"field":"created_at","direction":"desc"}]
            $table->json('group_by')->nullable(); // {"field":"status","aggregate":"count"}
            $table->json('schedule')->nullable();  // {"frequency":"weekly","day":1,"time":"08:00","recipients":[...]}

            // Visibilité & usage
            $table->boolean('is_shared')->default(false)->comment('Visible à toute l\'organisation');
            $table->boolean('is_template')->default(false)->comment('Template réutilisable');
            $table->integer('run_count')->default(0);
            $table->timestamp('last_run_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'module']);
            $table->index(['organization_id', 'is_shared']);
            $table->index(['organization_id', 'is_template']);
            $table->index('created_by');
        });

        Schema::create('custom_report_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('custom_reports')->cascadeOnDelete();
            $table->foreignId('run_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('format', ['pdf', 'excel', 'csv', 'json'])->default('pdf');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');

            $table->string('file_path')->nullable()->comment('Chemin stockage privé');
            $table->integer('row_count')->nullable();
            $table->integer('duration_ms')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('expires_at')->nullable()->comment('Fichier supprimé après 24h');

            $table->timestamps();

            $table->index(['report_id', 'status']);
            $table->index('run_by');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_report_runs');
        Schema::dropIfExists('custom_reports');
    }
};
