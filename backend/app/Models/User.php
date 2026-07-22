<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * User — Utilisateur SECRETIS ERP
 *
 * Chaque utilisateur appartient à UNE organisation (multi-tenant strict).
 * Les permissions sont gérées par Spatie Permission (rôles + permissions directes).
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int|null    $department_id
 * @property string      $name
 * @property string      $email
 * @property string      $password
 * @property string      $status          active | inactive | locked
 * @property string|null $avatar
 * @property array       $preferences     Préférences UI (langue, thème, notifications)
 * @property int         $failed_login_attempts
 * @property \Carbon\Carbon|null $locked_until
 * @property \Carbon\Carbon|null $last_login_at
 * @property string|null $last_login_ip
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'department_id',
        'name',
        'email',
        'password',
        'status',
        'avatar',
        'preferences',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'last_login_ip',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'last_login_ip',
    ];

    protected $casts = [
        'email_verified_at'      => 'datetime',
        'password'               => 'hashed',
        'preferences'            => 'array',
        'locked_until'           => 'datetime',
        'last_login_at'          => 'datetime',
        'failed_login_attempts'  => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'created_by');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function createdCourriers(): HasMany
    {
        return $this->hasMany(Courrier::class, 'created_by');
    }

    // -------------------------------------------------------------------------
    // RBAC — Méthodes de permission
    // -------------------------------------------------------------------------

    /**
     * Vérifie si l'utilisateur a la permission pour un module et une action donnés.
     *
     * Ex: $user->hasPermissionForModule('agenda', 'create')
     * Construit la permission : "agenda.create"
     */
    public function hasPermissionForModule(string $module, string $action): bool
    {
        // Super admin IBIG : accès total
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Admin d'organisation : accès total à son organisation
        if ($this->isAdmin() && $this->hasRole('admin_org')) {
            // Vérifier que le module est activé pour l'organisation
            return $this->organization?->hasModule($module) ?? false;
        }

        $permission = "{$module}.{$action}";

        return $this->can($permission);
    }

    /**
     * Vérifie si l'utilisateur est admin de son organisation.
     */
    public function isAdmin(): bool
    {
        return $this->hasAnyRole(['admin_org', 'superadmin_ibig']);
    }

    /**
     * Vérifie si l'utilisateur est super-admin IBIG (accès plateforme).
     * SECURITE : Ce rôle ne doit être accordé qu'aux employés IBIG.
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole('superadmin_ibig');
    }

    /**
     * Vérifie si le compte est verrouillé suite à des tentatives de connexion échouées.
     */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /**
     * Vérifie si l'utilisateur est actif (non banni, non suspendu).
     */
    public function isActive(): bool
    {
        return $this->status === 'active' && ! $this->isLocked();
    }

    /**
     * Incrémente les tentatives de connexion échouées et verrouille si seuil atteint.
     * Seuil : 5 tentatives → verrouillage 15 minutes.
     */
    public function recordFailedLogin(): void
    {
        $attempts = $this->failed_login_attempts + 1;

        $this->failed_login_attempts = $attempts;

        if ($attempts >= 5) {
            $this->locked_until = now()->addMinutes(15);
        }

        $this->saveQuietly();
    }

    /**
     * Réinitialise le compteur de tentatives après un login réussi.
     */
    public function recordSuccessfulLogin(string $ip): void
    {
        $this->failed_login_attempts = 0;
        $this->locked_until          = null;
        $this->last_login_at         = now();
        $this->last_login_ip         = $ip;
        $this->saveQuietly();
    }

    /**
     * Retourne une valeur de préférence utilisateur.
     */
    public function getPreference(string $key, mixed $default = null): mixed
    {
        return data_get($this->preferences ?? [], $key, $default);
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        // Normaliser l'email à la sauvegarde
        static::saving(function (self $user) {
            $user->email = strtolower(trim($user->email));
        });
    }
}
