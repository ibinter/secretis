<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Enrichissement de la table projects ──────────────────────────────
        if (!Schema::hasTable('projects')) {
            Schema::create('projects', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('status')->default('active'); // active/paused/completed/cancelled
                $table->timestamps();
            });
        }

        Schema::table('projects', function (Blueprint $table) {
            if (!Schema::hasColumn('projects', 'budget_planned')) {
                $table->decimal('budget_planned', 15, 2)->default(0)->after('description');
            }
            if (!Schema::hasColumn('projects', 'budget_spent')) {
                $table->decimal('budget_spent', 15, 2)->default(0)->after('budget_planned');
            }
            if (!Schema::hasColumn('projects', 'budget_currency')) {
                $table->string('budget_currency', 3)->default('XOF')->after('budget_spent');
            }
            if (!Schema::hasColumn('projects', 'start_date')) {
                $table->date('start_date')->nullable()->after('budget_currency');
            }
            if (!Schema::hasColumn('projects', 'end_date')) {
                $table->date('end_date')->nullable()->after('start_date');
            }
            if (!Schema::hasColumn('projects', 'health')) {
                $table->enum('health', ['on_track', 'at_risk', 'off_track'])->default('on_track')->after('end_date');
            }
            if (!Schema::hasColumn('projects', 'completion_percent')) {
                $table->unsignedTinyInteger('completion_percent')->default(0)->after('health');
            }
            if (!Schema::hasColumn('projects', 'client_id')) {
                $table->unsignedBigInteger('client_id')->nullable()->after('completion_percent');
                $table->foreign('client_id')->references('id')->on('accounting_clients')->nullOnDelete();
            }
            if (!Schema::hasColumn('projects', 'visibility')) {
                $table->enum('visibility', ['private', 'team', 'public'])->default('team')->after('client_id');
            }
            if (!Schema::hasColumn('projects', 'manager_id')) {
                $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete()->after('visibility');
            }
            if (!Schema::hasColumn('projects', 'color')) {
                $table->string('color', 7)->default('#3B82F6')->after('manager_id');
            }
        });

        // ── project_milestones ───────────────────────────────────────────────
        Schema::create('project_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('due_date');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'missed'])->default('pending');
            $table->unsignedTinyInteger('completion_percent')->default(0);
            $table->string('color', 7)->default('#8B5CF6');
            $table->unsignedInteger('tasks_count')->default(0);
            $table->unsignedInteger('completed_tasks_count')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'due_date']);
            $table->index(['organization_id', 'status']);
        });

        // ── task_dependencies ────────────────────────────────────────────────
        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('depends_on_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->enum('dependency_type', [
                'finish_to_start',
                'start_to_start',
                'finish_to_finish',
            ])->default('finish_to_start');
            $table->integer('lag_days')->default(0);
            $table->timestamps();

            $table->unique(['task_id', 'depends_on_task_id']);
            $table->index('depends_on_task_id');
        });

        // ── project_members ──────────────────────────────────────────────────
        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['manager', 'member', 'observer'])->default('member');
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });

        // ── project_timesheets ───────────────────────────────────────────────
        Schema::create('project_timesheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->decimal('hours', 5, 2);
            $table->text('description')->nullable();
            $table->boolean('is_billable')->default(true);
            $table->decimal('hourly_rate', 10, 2)->default(0);
            $table->timestamps();

            $table->index(['project_id', 'date']);
            $table->index(['user_id', 'date']);
            $table->index(['organization_id', 'date']);
        });

        // ── project_risks ────────────────────────────────────────────────────
        Schema::create('project_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('probability', ['low', 'medium', 'high'])->default('low');
            $table->enum('impact', ['low', 'medium', 'high'])->default('low');
            $table->text('mitigation')->nullable();
            $table->enum('status', ['open', 'mitigated', 'closed'])->default('open');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index(['probability', 'impact']);
        });

        // Ajout milestone_id sur tasks si la table existe
        if (Schema::hasTable('tasks') && !Schema::hasColumn('tasks', 'milestone_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('milestone_id')->nullable()->constrained('project_milestones')->nullOnDelete()->after('project_id');
                $table->date('start_date')->nullable()->after('milestone_id');
                $table->unsignedTinyInteger('progress')->default(0)->after('start_date');
                $table->decimal('estimated_hours', 7, 2)->default(0)->after('progress');
                $table->decimal('logged_hours', 7, 2)->default(0)->after('estimated_hours');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_risks');
        Schema::dropIfExists('project_timesheets');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('project_milestones');
    }
};
