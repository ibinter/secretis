<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Organization — Entité tenant principale de SECRETIS ERP
 *
 * @property int         $id
 * @property string      $name
 * @property string      $slug          Identifiant sous-domaine unique
 * @property string      $email
 * @property string|null $phone
 * @property string|null $address
 * @property string      $country       Code ISO 3166-1 alpha-2
 * @property string      $timezone      Timezone PHP valide
 * @property array       $settings      Configuration JSON de l'organisation
 * @property string      $status        active | suspended | pending | deleted
 * @property Carbon|null $trial_ends_at
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property Carbon|null $deleted_at
 */
class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'country',
        'timezone',
        'settings',
        'status',
        'trial_ends_at',
        'plan_id',
    ];

    protected $casts = [
        // IMPORTANT : les settings sont castés en tableau PHP automatiquement.
        // Ne jamais stocker de secrets dans settings (utiliser Vault ou env).
        'settings'     => 'array',
        'trial_ends_at' => 'datetime',
    ];

    protected $hidden = [
        'deleted_at',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }


    public function activeLicense(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(License::class)->where('status', 'active')->latestOfMany();
    }

    public function latestLicense(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(License::class)->latestOfMany("ends_at");
    }

    public function license(): HasOne
    {
        return $this->hasOne(License::class)->latestOfMany("ends_at");
    }

    public function licenses(): HasMany
    {
        return $this->hasMany(License::class)->orderByDesc('created_at');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderByDesc('paid_at');
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'plan_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Filtre par slug (sous-domaine).
     * Usage : Organization::bySlug('acme')->first()
     */
    public function scopeBySlug(Builder $query, string $slug): Builder
    {
        return $query->where('slug', strtolower(trim($slug)));
    }

    /**
     * Filtre les organisations actives (status != suspended/deleted).
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['active', 'trial', 'grace']);
    }

    /**
     * Filtre les organisations dont l'essai est encore valide.
     */
    public function scopeInTrial(Builder $query): Builder
    {
        return $query->where('status', 'trial')
            ->where('trial_ends_at', '>', now());
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si l'organisation dispose d'une licence utilisable.
     * Basé exclusivement sur l'horloge serveur.
     */
    public function hasActiveLicense(): bool
    {
        return in_array($this->getLicenseStatus(), ['active', 'trial', 'grace'], true);
    }

    /**
     * Retourne le statut de licence calculé côté serveur.
     * Ordre de priorité : suspension > licence payante > trial > expiré
     */
    public function getLicenseStatus(): string
    {
        if ($this->status === 'suspended') {
            return 'suspended';
        }

        $license = $this->license;

        // Vérifier la licence payante active
        if ($license && $license->isActive()) {
            return 'active';
        }

        // Vérifier la période de grâce (licence expirée depuis < grace_days)
        if ($license && $license->isInGracePeriod()) {
            return 'grace';
        }

        // Vérifier le trial
        if ($this->status === 'trial' && $this->trial_ends_at?->isFuture()) {
            return 'trial';
        }

        return 'expired';
    }

    /**
     * Nombre de jours restants dans le trial.
     * Retourne 0 si le trial est terminé ou si l'org a une licence.
     */
    public function getRemainingTrialDays(): int
    {
        if ($this->status !== 'trial' || ! $this->trial_ends_at) {
            return 0;
        }

        $remaining = now()->diffInDays($this->trial_ends_at, false);

        return max(0, (int) $remaining);
    }

    /**
     * Retourne le plan courant (trial, starter, professional, enterprise, etc.)
     * basé sur la licence active.
     */
    public function getCurrentPlan(): ?string
    {
        if ($this->status === 'trial') {
            return 'trial';
        }

        return $this->license?->plan?->slug;
    }

    /**
     * Retourne une valeur depuis les settings JSON avec fallback.
     */
    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings ?? [], $key, $default);
    }

    /**
     * Définit une valeur dans les settings JSON.
     */
    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings ?? [];
        data_set($settings, $key, $value);
        $this->settings = $settings;
    }

    /**
     * Vérifie si un module est activé pour cette organisation.
     */
    public function hasModule(string $module): bool
    {
        return in_array($module, $this->getSetting('enabled_modules', []), true);
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        // Normaliser le slug à la création/mise à jour
        static::saving(function (self $org) {
            $org->slug = strtolower(trim($org->slug));
        });
    }
}
