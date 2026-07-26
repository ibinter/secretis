<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * WebhookEndpoint — Endpoint de webhook sortant Zapier / intégrations tierces.
 *
 * @property int         $id
 * @property int         $organization_id
 * @property string      $url              URL de destination HTTPS
 * @property string      $secret           Secret HMAC-SHA256 (pour signer les payloads)
 * @property array       $events           Liste des événements souscrits
 * @property bool        $is_active        Actif ou désactivé (auto ou manuel)
 * @property string|null $last_called_at   Dernière tentative de livraison
 * @property int         $failure_count    Compteur d'échecs consécutifs
 * @property string|null $description      Description libre
 */
class WebhookEndpoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'url',
        'secret',
        'events',
        'is_active',
        'last_called_at',
        'failure_count',
        'description',
    ];

    protected $casts = [
        'events'         => 'array',
        'is_active'      => 'boolean',
        'last_called_at' => 'datetime',
        'failure_count'  => 'integer',
    ];

    protected $hidden = ['secret'];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(WebhookDelivery::class, 'endpoint_id');
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * L'endpoint est-il actif et doit-il recevoir des livraisons ?
     */
    public function isActive(): bool
    {
        return $this->is_active && $this->failure_count < 10;
    }

    /**
     * L'endpoint doit-il être retenté après un échec ?
     * Max 5 tentatives, désactivation automatique après 10 échecs consécutifs.
     */
    public function shouldRetry(int $attempts): bool
    {
        return $attempts < 5 && $this->failure_count < 10;
    }

    /**
     * Génère la signature HMAC-SHA256 pour un payload donné.
     * Header envoyé : X-Secretis-Signature: sha256=<hex>
     *
     * @param string $payload JSON sérialisé du payload
     * @return string Format "sha256=<hex>"
     */
    public function generateSignature(string $payload): string
    {
        return 'sha256=' . hash_hmac('sha256', $payload, $this->secret);
    }

    /**
     * L'endpoint est-il souscrit à cet événement ?
     */
    public function subscribesTo(string $event): bool
    {
        $events = $this->events ?? [];

        // '*' = tous les événements
        if (in_array('*', $events, true)) {
            return true;
        }

        // Support wildcard de domaine : "event.*" matche "event.created", "event.updated"
        foreach ($events as $subscribed) {
            if (str_ends_with($subscribed, '.*')) {
                $prefix = rtrim($subscribed, '.*');
                if (str_starts_with($event, $prefix . '.')) {
                    return true;
                }
            }

            if ($subscribed === $event) {
                return true;
            }
        }

        return false;
    }

    /**
     * Incrémente le compteur d'échecs et désactive si seuil atteint.
     */
    public function recordFailure(): void
    {
        $this->increment('failure_count');

        if ($this->failure_count >= 10) {
            $this->update(['is_active' => false]);
            Log::warning('Webhook endpoint désactivé après 10 échecs', [
                'endpoint_id' => $this->id,
                'url'         => $this->url,
            ]);
        }
    }

    /**
     * Réinitialise le compteur d'échecs après une livraison réussie.
     */
    public function recordSuccess(): void
    {
        $this->update([
            'failure_count'  => 0,
            'last_called_at' => now(),
        ]);
    }
}
