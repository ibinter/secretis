<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * WebhookDelivery — Historique des tentatives de livraison de webhook.
 *
 * @property int         $id
 * @property int         $endpoint_id
 * @property string      $event_type       Ex: "event.created"
 * @property array       $payload          Corps JSON envoyé
 * @property int|null    $response_status  Code HTTP de la réponse (null si timeout)
 * @property string|null $response_body    Corps de la réponse (tronqué à 2000 chars)
 * @property int         $attempts         Nombre de tentatives effectuées
 * @property string|null $next_retry_at    Prochaine tentative planifiée
 * @property string|null $delivered_at     Horodatage de la livraison réussie
 * @property string      $delivery_id      UUID unique de cette livraison (X-Secretis-Delivery)
 */
class WebhookDelivery extends Model
{
    protected $fillable = [
        'endpoint_id',
        'event_type',
        'payload',
        'response_status',
        'response_body',
        'attempts',
        'next_retry_at',
        'delivered_at',
        'delivery_id',
    ];

    protected $casts = [
        'payload'        => 'array',
        'attempts'       => 'integer',
        'response_status' => 'integer',
        'next_retry_at'  => 'datetime',
        'delivered_at'   => 'datetime',
    ];

    public function endpoint(): BelongsTo
    {
        return $this->belongsTo(WebhookEndpoint::class, 'endpoint_id');
    }

    /**
     * La livraison a-t-elle réussi ?
     */
    public function isSuccessful(): bool
    {
        return $this->delivered_at !== null
            && $this->response_status >= 200
            && $this->response_status < 300;
    }

    /**
     * La livraison a-t-elle définitivement échoué (max tentatives atteint) ?
     */
    public function hasFailed(): bool
    {
        return $this->attempts >= 5 && ! $this->isSuccessful();
    }
}
