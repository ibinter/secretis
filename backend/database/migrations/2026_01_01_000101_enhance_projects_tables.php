<?php

/*
 * AJOUTS DE COLONNES RENDUS IDEMPOTENTS.
 *
 * Cette migration a echoue A MI-PARCOURS en production, puis a ete marquee
 * comme jouee : une partie de ses colonnes existe, une autre non. La rejouer
 * pour completer ce qui manque exige que chaque ajout sache ne rien faire
 * quand la colonne est deja la.
 *
 * Les `->change()`, index, cles etrangeres et suppressions ne sont PAS
 * touches : ce ne sont pas des ajouts, et les garder tels quels evite de
 * modifier un comportement en corrigeant une idempotence.
 */

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
                if (! Schema::hasColumn('projects', 'budget_planned')) {
                    $table->decimal('budget_planned', 15, 2)->default(0)->after('description');
                }
            }
            if (!Schema::hasColumn('projects', 'budget_spent')) {
                if (! Schema::hasColumn('projects', 'budget_spent')) {
                    $table->decimal('budget_spent', 15, 2)->default(0)->after('budget_planned');
                }
            }
            if (!Schema::hasColumn('projects', 'budget_currency')) {
                if (! Schema::hasColumn('projects', 'budget_currency')) {
                    $table->string('budget_currency', 3)->default('XOF')->after('budget_spent');
                }
            }
            if (!Schema::hasColumn('projects', 'start_date')) {
                if (! Schema::hasColumn('projects', 'start_date')) {
                    $table->date('start_date')->nullable()->after('budget_currency');
                }
            }
            if (!Schema::hasColumn('projects', 'end_date')) {
                if (! Schema::hasColumn('projects', 'end_date')) {
                    $table->date('end_date')->nullable()->after('start_date');
                }
            }
            if (!Schema::hasColumn('projects', 'health')) {
                if (! Schema::hasColumn('projects', 'health')) {
                    $table->enum('health', ['on_track', 'at_risk', 'off_track'])->default('on_track')->after('end_date');
                }
            }
            if (!Schema::hasColumn('projects', 'completion_percent')) {
                if (! Schema::hasColumn('projects', 'completion_percent')) {
                    $table->unsignedTinyInteger('completion_percent')->default(0)->after('health');
                }
            }
            if (!Schema::hasColumn('projects', 'client_id')) {
                if (! Schema::hasColumn('projects', 'client_id')) {
                    $table->unsignedBigInteger('client_id')->nullable()->after('completion_percent');
                }
                $table->foreign('client_id')->references('id')->on('accounting_clients')->nullOnDelete();
            }
            if (!Schema::hasColumn('projects', 'visibility')) {
                if (! Schema::hasColumn('projects', 'visibility')) {
                    $table->enum('visibility', ['private', 'team', 'public'])->default('team')->after('client_id');
                }
            }
            if (!Schema::hasColumn('projects', 'manager_id')) {
                if (! Schema::hasColumn('projects', 'manager_id')) {
                    $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete()->after('visibility');
                }
            }
            if (!Schema::hasColumn('projects', 'color')) {
                if (! Schema::hasColumn('projects', 'color')) {
                    $table->string('color', 7)->default('#3B82F6')->after('manager_id');
                }
            }
        });

        // ── project_milestones ───────────────────────────────────────────────
        if (! Schema::hasTable('project_milestones')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('project_milestones')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
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
            }
        }

        // ── task_dependencies ────────────────────────────────────────────────
        if (! Schema::hasTable('task_dependencies')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
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
        }

        // ── project_members ──────────────────────────────────────────────────
        if (! Schema::hasTable('project_members')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('project_members')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
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
            }
        }

        // ── project_timesheets ───────────────────────────────────────────────
        if (! Schema::hasTable('project_timesheets')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('project_timesheets')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
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
            }
        }

        // ── project_risks ────────────────────────────────────────────────────
        if (! Schema::hasTable('project_risks')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('project_risks')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
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
            }
        }

        // Ajout des colonnes de suivi sur `tasks`.
        //
        // Le garde-fou testait UNE colonne (`milestone_id`) puis en ajoutait
        // CINQ. Or `estimated_hours` est déjà créée par la migration
        // 2026_01_01_000041_create_tasks_table. Sur une base neuve, le test
        // passait — `milestone_id` n'existe pas — et l'ajout échouait aussitôt
        // sur la colonne déjà présente. C'est ce qui empêchait le dépôt de
        // reconstruire sa propre base.
        //
        // Chaque colonne est désormais testée pour elle-même : c'est plus
        // verbeux, mais un test qui ne couvre pas ce qu'il protège ne protège
        // rien.
        if (Schema::hasTable('tasks')) {
            Schema::table('tasks', function (Blueprint $table) {
                if (! Schema::hasColumn('tasks', 'milestone_id')) {
                    $table->foreignId('milestone_id')->nullable()
                          ->constrained('project_milestones')->nullOnDelete()->after('project_id');
                }
                if (! Schema::hasColumn('tasks', 'start_date')) {
                    if (! Schema::hasColumn('tasks', 'start_date')) {
                        $table->date('start_date')->nullable();
                    }
                }
                if (! Schema::hasColumn('tasks', 'progress')) {
                    if (! Schema::hasColumn('tasks', 'progress')) {
                        $table->unsignedTinyInteger('progress')->default(0);
                    }
                }
                if (! Schema::hasColumn('tasks', 'estimated_hours')) {
                    if (! Schema::hasColumn('tasks', 'estimated_hours')) {
                        $table->decimal('estimated_hours', 7, 2)->default(0);
                    }
                }
                if (! Schema::hasColumn('tasks', 'logged_hours')) {
                    if (! Schema::hasColumn('tasks', 'logged_hours')) {
                        $table->decimal('logged_hours', 7, 2)->default(0);
                    }
                }
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
