<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Prospect — Entité CRM SECRETIS ERP
 *
 * Un prospect représente un contact commercial potentiel avant conversion
 * en organisation cliente. Il passe par un pipeline Kanban :
 *   new → contacted → demo_scheduled → offer_sent → won | lost
 *
 * @property int         $id
 * @property string      $name
 * @property string      $email
 * @property string|null $phone
 * @property string|null $company
 * @property string|null $country
 * @property string      $source          website|referral|cold_outreach|linkedin|event|other
 * @property string      $status          new|contacted|demo_scheduled|offer_sent|won|lost
 * @property string|null $plan_interest   Starter|Pro|Enterprise
 * @property int|null    $organization_id Renseigné après conversion
 * @property int|null    $created_by      ID SuperAdmin ayant créé le prospect
 * @property \Carbon\Carbon|null $converted_at
 * @property \Carbon\Carbon      $created_at
 * @property \Carbon\Carbon      $updated_at
 * @property \Carbon\Carbon|null $deleted_at
 */
class Prospect extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'company',
        'country',
        'source',
        'status',
        'plan_interest',
        'organization_id',
        'created_by',
        'converted_at',
    ];

    protected $casts = [
        'converted_at' => 'datetime',
    ];

    // =========================================================================
    // Relations
    // =========================================================================

    /**
     * Notes de suivi commercial du prospect
     */
    public function notes(): HasMany
    {
        return $this->hasMany(ProspectNote::class)->orderByDesc('created_at');
    }

    /**
     * Démonstrations planifiées pour ce prospect
     */
    public function demos(): HasMany
    {
        return $this->hasMany(ProspectDemo::class)->orderByDesc('scheduled_at');
    }

    /**
     * Organisation client créée après conversion
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * SuperAdmin ayant créé / assigné ce prospect
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // =========================================================================
    // Scopes
    // =========================================================================

    /**
     * Prospects actifs dans le pipeline (non perdus, non convertis)
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['won', 'lost']);
    }

    /**
     * Prospects convertis en clients
     */
    public function scopeConverted(Builder $query): Builder
    {
        return $query->where('status', 'won')->whereNotNull('organization_id');
    }

    /**
     * Filtrer par source d'acquisition
     */
    public function scopeBySource(Builder $query, string $source): Builder
    {
        return $query->where('source', $source);
    }

    /**
     * Prospects en attente de démo
     */
    public function scopeDemoScheduled(Builder $query): Builder
    {
        return $query->where('status', 'demo_scheduled');
    }

    /**
     * Prospects ayant reçu une offre
     */
    public function scopeOfferSent(Builder $query): Builder
    {
        return $query->where('status', 'offer_sent');
    }

    // =========================================================================
    // Accesseurs
    // =========================================================================

    /**
     * Label traduit du statut pour l'affichage
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'new'            => 'Nouveau',
            'contacted'      => 'Contacté',
            'demo_scheduled' => 'Démo planifiée',
            'offer_sent'     => 'Offre envoyée',
            'won'            => 'Client',
            'lost'           => 'Perdu',
            default          => ucfirst($this->status),
        };
    }

    /**
     * Label traduit de la source
     */
    public function getSourceLabelAttribute(): string
    {
        return match ($this->source) {
            'website'       => 'Site web',
            'referral'      => 'Parrainage',
            'cold_outreach' => 'Prospection',
            'linkedin'      => 'LinkedIn',
            'event'         => 'Événement',
            'other'         => 'Autre',
            default         => $this->source,
        };
    }

    /**
     * Couleur Tailwind du statut pour l'UI Kanban
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'new'            => 'blue',
            'contacted'      => 'yellow',
            'demo_scheduled' => 'purple',
            'offer_sent'     => 'orange',
            'won'            => 'green',
            'lost'           => 'red',
            default          => 'gray',
        };
    }
}
