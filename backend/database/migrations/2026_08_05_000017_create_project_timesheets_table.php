<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Feuilles de temps projet. ProjectController expose déjà storeTimesheet() et
 * timesheets() et charge la relation `timesheets`, mais ni la table ni le modèle
 * n'existaient → 500 à l'ouverture d'une fiche projet.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_timesheets')) {
            return;
        }

        Schema::create('project_timesheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->decimal('hours', 5, 2);
            $table->string('description', 500)->nullable();
            $table->boolean('is_billable')->default(false);
            $table->decimal('hourly_rate', 12, 2)->nullable();
            $table->timestamps();

            $table->index(['project_id', 'date']);
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_timesheets');
    }
};
