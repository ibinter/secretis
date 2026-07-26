<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Announcement — Annonce plateforme publiée depuis le SuperAdmin.
 *
 * @property int         $id
 * @property array       $title         {"fr": "...", "en": "..."}
 * @property array       $message       {"fr": "...", "en": "..."}
 * @property string      $type          info|warning|success|maintenance|feature
 * @property string|null $color         Couleur CSS personnalisée
 * @property string      $display       banner|modal|both
 * @property string      $target        all|plan|org
 * @property array|null  $target_ids    IDs de plans ou d'organisations ciblés
 * @property string|null $cta_label
 * @property string|null $cta_url
 * @property bool        $is_dismissible
 * @property bool        $is_active
 * @property \Carbon\Carbon|null $starts_at
 * @property \Carbon\Carbon|null $ends_at
 * @property int         $created_by
 */
class Announcement extends Model
{
    protected $fillable = [
        'title',
        'message',
        'type',
        'color',
        'display',
        'target',
        'target_ids',
        'cta_label',
        'cta_url',
        'is_dismissible',
        'is_active',
        'starts_at',
        'ends_at',
        'created_by',
    ];

    protected $casts = [
        'title'          => 'array',
        'message'        => 'array',
        'target_ids'     => 'array',
        'is_dismissible' => 'boolean',
        'is_active'      => 'boolean',
        'starts_at'      => 'datetime',
        'ends_at'        => 'datetime',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function dismissals(): HasMany
    {
        return $this->hasMany(AnnouncementDismissal::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /**
     * Annonces actuellement dans leur fenêtre de diffusion.
     */
    public function scopeCurrentlyVisible(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now));
    }

    /**
     * Filtre les annonces destinées à un utilisateur donné (selon plan et organisation).
     */
    public function scopeForUser(Builder $query, User $user): Builder
    {
        $planId = $user->organization?->plan_id;
        $orgId  = $user->organization_id;

        return $query->where(function ($q) use ($planId, $orgId) {
            $q->where('target', 'all');

            if ($planId !== null) {
                $q->orWhere(fn ($q2) =>
                    $q2->where('target', 'plan')
                       ->whereJsonContains('target_ids', $planId)
                );
            }

            if ($orgId !== null) {
                $q->orWhere(fn ($q2) =>
                    $q2->where('target', 'org')
                       ->whereJsonContains('target_ids', $orgId)
                );
            }
        });
    }

    // ── Accesseurs ────────────────────────────────────────────────────────────

    /**
     * Titre dans la langue demandée (fallback : fr, puis en, puis premier disponible).
     */
    public function getTitle(string $locale = 'fr'): string
    {
        $titles = $this->title ?? [];
        return $titles[$locale] ?? $titles['fr'] ?? $titles['en'] ?? array_values($titles)[0] ?? '';
    }

    /**
     * Message dans la langue demandée.
     */
    public function getMessage(string $locale = 'fr'): string
    {
        $messages = $this->message ?? [];
        return $messages[$locale] ?? $messages['fr'] ?? $messages['en'] ?? array_values($messages)[0] ?? '';
    }
}
