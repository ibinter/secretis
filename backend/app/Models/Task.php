<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Task — Tâche SECRETIS ERP
 *
 * Workflow statut : todo → in_progress → review → done | cancelled
 * Supporte les sous-tâches (self-referential), les observateurs et les pièces jointes.
 *
 * @property string      $id               UUID
 * @property string      $organization_id
 * @property string|null $project_id
 * @property string|null $meeting_id       Tâche créée depuis une décision de réunion
 * @property string|null $parent_id        Sous-tâche
 * @property string      $title
 * @property string|null $description      HTML (TipTap)
 * @property string      $status           task_status_enum
 * @property string      $priority         priority_enum
 * @property string      $created_by       FK users
 * @property int         $position         Position dans la colonne Kanban
 * @property Carbon|null $due_date
 * @property Carbon|null $completed_at
 * @property array       $attachments      JSONB [{ name, path, size, mime }]
 * @property array       $settings         JSONB
 */
class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'project_id',
        'meeting_id',
        'parent_id',
        'title',
        'description',
        'status',
        'priority',
        'created_by',
        'position',
        'due_date',
        'completed_at',
        'attachments',
        'settings',
    ];

    protected $casts = [
        'due_date'    => 'date',
        'completed_at'=> 'datetime',
        'position'    => 'integer',
        'attachments' => 'array',
        'settings'    => 'array',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /** Tâche parente (si sous-tâche) */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /** Sous-tâches directes */
    public function subtasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id')->orderBy('position');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Utilisateurs assignés (pivot : task_assignees) */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_assignees', 'task_id', 'user_id')
                    ->withPivot(['assigned_at', 'assigned_by'])
                    ->withTimestamps();
    }

    /** Observateurs (pivot : task_observers) */
    public function observers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_observers', 'task_id', 'user_id')
                    ->withTimestamps();
    }

    /** Commentaires sur la tâche */
    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class)->orderBy('created_at');
    }

    /** Historique des changements de statut */
    public function history(): HasMany
    {
        return $this->hasMany(TaskHistory::class)->orderByDesc('created_at');
    }

    // -------------------------------------------------------------------------
    // Scopes multi-tenant
    // -------------------------------------------------------------------------

    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeByProject($query, string $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    /** Tâches assignées à un utilisateur */
    public function scopeAssignedTo($query, string $userId)
    {
        return $query->whereHas('assignees', fn($q) => $q->where('users.id', $userId));
    }

    /** Tâches en retard (due_date passée et non terminées) */
    public function scopeOverdue($query)
    {
        return $query->whereNotNull('due_date')
                     ->where('due_date', '<', now()->toDateString())
                     ->whereNotIn('status', ['done', 'cancelled']);
    }

    /** Tâches dues aujourd'hui */
    public function scopeDueToday($query)
    {
        return $query->where('due_date', now()->toDateString())
                     ->whereNotIn('status', ['done', 'cancelled']);
    }

    /** Uniquement les tâches racine (pas de parent) */
    public function scopeRootTasks($query)
    {
        return $query->whereNull('parent_id');
    }

    /** Filtre par plage de dates d'échéance */
    public function scopeDueBetween($query, string $from, string $to)
    {
        return $query->whereBetween('due_date', [$from, $to]);
    }

    // -------------------------------------------------------------------------
    // Accesseurs
    // -------------------------------------------------------------------------

    /** La tâche est-elle en retard ? */
    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date !== null
            && $this->due_date->isPast()
            && ! in_array($this->status, ['done', 'cancelled']);
    }

    /** Nombre de jours de retard (négatif = jours restants) */
    public function getDaysOverdueAttribute(): int
    {
        if (! $this->due_date) {
            return 0;
        }
        return (int) now()->startOfDay()->diffInDays($this->due_date, false) * -1;
    }

    /** Taux de complétion des sous-tâches (%) */
    public function getSubtasksProgressAttribute(): int
    {
        $total = $this->subtasks()->count();
        if ($total === 0) {
            return 100;
        }
        $done = $this->subtasks()->where('status', 'done')->count();
        return (int) round($done / $total * 100);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Transitions de statut autorisées.
     * Retourne les statuts accessibles depuis l'état actuel.
     */
    public function allowedTransitions(): array
    {
        return match ($this->status) {
            'todo'        => ['in_progress', 'cancelled'],
            'in_progress' => ['review', 'todo', 'cancelled'],
            'review'      => ['done', 'in_progress', 'cancelled'],
            'done'        => ['in_progress'],          // ré-ouverture
            'cancelled'   => ['todo'],                  // réactivation
            default       => [],
        };
    }

    /** Peut-on passer au statut donné ? */
    public function canTransitionTo(string $status): bool
    {
        return in_array($status, $this->allowedTransitions());
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $task) {
            $task->status      = $task->status      ?? 'todo';
            $task->priority    = $task->priority    ?? 'medium';
            $task->position    = $task->position    ?? 0;
            $task->attachments = $task->attachments ?? [];
            $task->settings    = $task->settings    ?? [];
        });

        // Horodater la complétion automatiquement
        static::updating(function (self $task) {
            if ($task->isDirty('status') && $task->status === 'done' && ! $task->completed_at) {
                $task->completed_at = now();
            }
            if ($task->isDirty('status') && $task->status !== 'done') {
                $task->completed_at = null;
            }
        });
    }
}
