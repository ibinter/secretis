<?php

namespace App\Models;

use App\Services\BiService;
use Carbon\Carbon;
use Cron\CronExpression;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modèle SavedReport — rapports BI sauvegardés
 *
 * @property int         $id
 * @property int         $organization_id
 * @property string      $name
 * @property string|null $description
 * @property array       $config        {module, metrics[], dimensions[], filters{}, period{}, granularity}
 * @property bool        $is_public
 * @property string|null $schedule      Expression cron (ex: "0 8 * * 1" = chaque lundi 8h)
 * @property Carbon|null $last_run_at
 * @property int         $created_by
 */
class SavedReport extends Model
{
    use HasFactory;

    protected $table = 'saved_reports';

    protected $fillable = [
        'organization_id',
        'name',
        'description',
        'config',
        'is_public',
        'schedule',
        'last_run_at',
        'created_by',
    ];

    protected $casts = [
        'config'      => 'array',
        'is_public'   => 'boolean',
        'last_run_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Calcule la prochaine exécution planifiée d'après l'expression cron.
     */
    public function getNextRunAt(): ?Carbon
    {
        if (!$this->schedule) {
            return null;
        }

        try {
            $cron = new CronExpression($this->schedule);
            return Carbon::instance($cron->getNextRunDate());
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Exécute le rapport selon sa configuration et met à jour last_run_at.
     */
    public function run(): array
    {
        /** @var BiService $bi */
        $bi = app(BiService::class);

        $data = $bi->buildCustomReport($this->organization_id, $this->config ?? []);

        $this->update(['last_run_at' => now()]);

        return $data;
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeForOrganization($query, int $orgId)
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    public function scopeScheduled($query)
    {
        return $query->whereNotNull('schedule');
    }
}
