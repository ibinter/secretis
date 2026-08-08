<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tables pivot pour l'assignation multiple de tâches.
 *
 * Le modèle App\Models\Task définit deux relations belongsToMany dont les
 * tables pivot n'existaient pas, ce qui cassait l'assignation multiple :
 *
 *   assignees()  -> belongsToMany(User, 'task_assignees', 'task_id', 'user_id')
 *                   ->withPivot(['assigned_at', 'assigned_by'])->withTimestamps()
 *   observers()  -> belongsToMany(User, 'task_observers', 'task_id', 'user_id')
 *                   ->withTimestamps()
 *
 * tasks.id et users.id sont des bigint (clés numériques).
 * Migration non destructive : crée uniquement de nouvelles tables (idempotent).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Utilisateurs assignés à une tâche (pivot : task_assignees)
        if (! Schema::hasTable('task_assignees')) {
            Schema::create('task_assignees', function (Blueprint $table) {
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('assigned_at')->nullable();
                $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->primary(['task_id', 'user_id']);
            });
        }

        // Observateurs d'une tâche (pivot : task_observers)
        if (! Schema::hasTable('task_observers')) {
            Schema::create('task_observers', function (Blueprint $table) {
                $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->primary(['task_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_observers');
        Schema::dropIfExists('task_assignees');
    }
};
