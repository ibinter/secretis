<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    protected $model = Task::class;

    public function definition(): array
    {
        $organization = Organization::factory()->create();
        $creator      = User::factory()->forOrganization($organization->id)->create();

        // Projet de l'organisation (créer si nécessaire)
        $project = DB::table('projects')
            ->where('organization_id', $organization->id)
            ->first();

        if (! $project) {
            $projectId = DB::table('projects')->insertGetId([
                'organization_id' => $organization->id,
                'created_by'      => $creator->id,
                'name'            => 'Projet Test',
                'code'            => 'PRJ-TEST-' . $organization->id,
                'status'          => 'active',
                'priority'        => 'medium',
                'progress'        => 0,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        } else {
            $projectId = $project->id;
        }

        $taskTitles = [
            'Analyser les besoins utilisateurs',
            'Rédiger le cahier des charges',
            'Développer le module de connexion',
            'Tester les fonctionnalités',
            'Documenter l\'API',
            'Déployer en pré-production',
            'Former les utilisateurs clés',
            'Corriger les bugs signalés',
            'Optimiser les performances',
            'Valider avec le client',
        ];

        $dueDate  = $this->faker->optional(0.7)->dateTimeBetween('-5 days', '+30 days');

        return [
            'organization_id' => $organization->id,
            'project_id'      => $projectId,
            'created_by'      => $creator->id,
            'assigned_to'     => $this->faker->optional(0.8)->passthrough($creator->id),
            'parent_task_id'  => null,
            'title'           => $this->faker->randomElement($taskTitles),
            'description'     => $this->faker->optional(0.6)->paragraph(),
            'status'          => $this->faker->randomElement(['backlog', 'todo', 'in_progress', 'review', 'done']),
            'priority'        => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'position'        => $this->faker->numberBetween(0, 100),
            'estimated_hours' => $this->faker->optional(0.7)->numberBetween(1, 40),
            'logged_hours'    => 0,
            'starts_at'       => $this->faker->optional(0.5)->dateTimeBetween('-10 days', '+5 days'),
            'due_date'        => $dueDate,
            'completed_at'    => null,
            'labels'          => json_encode($this->faker->randomElements(['bug', 'feature', 'urgent', 'review', 'doc'], rand(0, 2))),
        ];
    }

    /** Tâche en retard */
    public function overdue(): static
    {
        return $this->state(fn (array $attr) => [
            'status'   => $this->faker->randomElement(['todo', 'in_progress']),
            'due_date' => $this->faker->dateTimeBetween('-10 days', '-1 day'),
        ]);
    }

    /** Tâche terminée */
    public function done(): static
    {
        return $this->state(fn (array $attr) => [
            'status'       => 'done',
            'completed_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
        ]);
    }

    /** Tâche urgente */
    public function urgent(): static
    {
        return $this->state(fn (array $attr) => [
            'priority' => 'urgent',
            'status'   => 'in_progress',
        ]);
    }

    /** Tâche en attente de review */
    public function inReview(): static
    {
        return $this->state(fn (array $attr) => [
            'status' => 'review',
        ]);
    }

    /** Sous-tâche d'une tâche parente */
    public function subtask(int $parentTaskId): static
    {
        return $this->state(fn (array $attr) => [
            'parent_task_id' => $parentTaskId,
        ]);
    }
}
