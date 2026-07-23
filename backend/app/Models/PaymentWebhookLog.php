<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * PaymentWebhookLog — Journal des webhooks entrants
 *
 * SÉCURITÉ / IDEMPOTENCE :
 * - event_id est UNIQUE en base → un même webhook ne peut être traité qu'une fois
 * - SELECT FOR UPDATE utilisé avant insertion pour éviter les races conditions
 * - raw_payload loggé pour audit et debugging
 * - signature_valid et amount_matches tracent chaque vérification de sécurité
 *
 * @property int         $id
 * @property string      $provider           cinetpay | paystack | flutterwave | stripe
 * @property string      $event_id           ID unique de l'événement (idempotence)
 * @property string      $event_type         payment.success, charge.completed, etc.
 * @property string|null $order_reference
 * @property float|null  $amount_received
 * @property string|null $currency_received
 * @property bool        $signature_valid
 * @property bool        $amount_matches
 * @property bool        $processed
 * @property string|null $raw_payload        Corps brut du webhook
 * @property string|null $error_message
 * @property \Carbon\Carbon|null $processed_at
 */
class PaymentWebhookLog extends Model
{
    use HasFactory;

    protected $table = 'payment_webhook_logs';

    protected $fillable = [
        'provider',
        'event_id',
        'event_type',
        'order_reference',
        'amount_received',
        'currency_received',
        'signature_valid',
        'amount_matches',
        'processed',
        'raw_payload',
        'error_message',
        'processed_at',
    ];

    protected $casts = [
        'amount_received'  => 'decimal:2',
        'signature_valid'  => 'boolean',
        'amount_matches'   => 'boolean',
        'processed'        => 'boolean',
        'processed_at'     => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeUnprocessed(Builder $query): Builder
    {
        return $query->where('processed', false);
    }

    public function scopeWithErrors(Builder $query): Builder
    {
        return $query->whereNotNull('error_message');
    }

    public function scopeForProvider(Builder $query, string $provider): Builder
    {
        return $query->where('provider', $provider);
    }
}
