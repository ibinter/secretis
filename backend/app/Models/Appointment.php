<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Appointment — Rendez-vous visiteur (portail public ou saisie interne).
 *
 * Flux portail public :
 *   AppointmentController::book() crée le RDV (source = 'portal') lié à un
 *   AppointmentSlot réservé, puis renvoie un confirm_token servant de jeton
 *   public (consultation / annulation / ICS).
 *
 * NB : distinct de la table héritée `visitor_appointments` (voir migration
 * 2026_01_01_000062). Ce modèle cible la NOUVELLE table `appointments`.
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int|null    $slot_id
 * @property int         $host_id
 * @property int|null    $visitor_id
 * @property string      $first_name
 * @property string      $last_name
 * @property string      $email
 * @property string      $phone
 * @property string|null $company
 * @property string|null $service      Libellé du service choisi (portail)
 * @property string      $purpose
 * @property string      $status       pending|confirmed|cancelled|completed|no_show
 * @property string      $source       portal|manual
 * @property string      $confirm_token
 * @property \Illuminate\Support\Carbon      $scheduled_at
 * @property \Illuminate\Support\Carbon|null $confirmed_at
 * @property \Illuminate\Support\Carbon|null $cancelled_at
 * @property \Illuminate\Support\Carbon|null $completed_at
 * @property string|null $cancellation_reason
 */
class Appointment extends Model
{
    protected $table = 'appointments';

    protected $fillable = [
        'organization_id',
        'slot_id',
        'host_id',
        'visitor_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'service',
        'purpose',
        'status',
        'source',
        'confirm_token',
        'scheduled_at',
        'confirmed_at',
        'cancelled_at',
        'completed_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(AppointmentSlot::class, 'slot_id');
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class, 'visitor_id');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Référence courte affichée au visiteur (8 premiers caractères du token).
     */
    public function getReferenceCodeAttribute(): string
    {
        return strtoupper(substr((string) $this->confirm_token, 0, 8));
    }
}
