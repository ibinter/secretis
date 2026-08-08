<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1) employees.manager_id — l'organigramme (EmployeeController::orgChart + buildTree)
 *    construit l'arbre hiérarchique sur cette colonne, qui n'existait pas
 *    → « column employees.manager_id does not exist » sur la fiche employé.
 * 2) project_milestones — ProjectController expose déjà storeMilestone/updateMilestone/
 *    destroyMilestone et charge la relation `milestones`, mais ni la table ni le
 *    modèle n'existaient → 500 à l'ouverture d'un projet.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'manager_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('manager_id')->nullable()->constrained('employees')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('project_milestones')) {
            Schema::create('project_milestones', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
                $table->date('due_date')->nullable();
                $table->date('completed_at')->nullable();
                $table->string('status', 20)->default('pending'); // pending|in_progress|done|cancelled
                $table->unsignedSmallInteger('position')->default(0);
                $table->timestamps();

                $table->index(['project_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_milestones');

        if (Schema::hasTable('employees') && Schema::hasColumn('employees', 'manager_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->dropConstrainedForeignId('manager_id');
            });
        }
    }
};
