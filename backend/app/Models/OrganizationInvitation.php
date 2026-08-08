<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * OrganizationInvitation — Invitation d'un collaborateur à rejoindre une organisation.
 *
 * Table réelle : `organization_invitations`
 * (migration 2026_01_01_000102_create_onboarding_tables.php)
 * Colonnes : organization_id, email, role, token, invited_by, accepted_at, expires_at.
 *
 * Utilisé par App\Services\OnboardingService::inviteUser() / ::acceptInvitation()
 * (qui lit la relation `organization`).
 */
class OrganizationInvitation extends Model
{
    protected $table = 'organization_invitations';

    protected $fillable = [
        'organization_id',
        'email',
        'role',
        'token',
        'invited_by',
        'accepted_at',
        'expires_at',
    ];

    protected $casts = [
        'accepted_at' => 'datetime',
        'expires_at'  => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isAccepted(): bool
    {
        return $this->accepted_at !== null;
    }
}
