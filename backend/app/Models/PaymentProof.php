<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PaymentProof — Preuve de paiement (reçu mobile money, virement, etc.)
 *
 * SÉCURITÉ :
 * - file_path pointe vers storage/app/private (JAMAIS /public)
 * - file_hash SHA-256 unique → détection des doublons (même fichier = rejet)
 * - mime_type validé côté serveur (refus des fichiers exécutables)
 * - L'accès au fichier passe par une route authentifiée (stream sécurisé)
 *
 * @property int         $id
 * @property int         $order_id
 * @property int         $user_id
 * @property string      $file_path             Dans storage/app/private
 * @property string      $file_hash             SHA-256 du fichier
 * @property string      $original_filename
 * @property string      $mime_type
 * @property int         $file_size
 * @property string|null $transaction_reference Numéro de transaction mobile money
 * @property string|null $notes
 * @property string      $status                pending | approved | rejected
 * @property int|null    $reviewed_by
 * @property string|null $rejection_reason
 * @property \Carbon\Carbon|null $reviewed_at
 */
class PaymentProof extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'user_id',
        'file_path',
        'file_hash',
        'original_filename',
        'mime_type',
        'file_size',
        'transaction_reference',
        'notes',
        'status',
        'reviewed_by',
        'rejection_reason',
        'reviewed_at',
    ];

    protected $casts = [
        'file_size'   => 'integer',
        'reviewed_at' => 'datetime',
    ];

    /**
     * SÉCURITÉ : file_path jamais exposé en JSON — accès via route sécurisée uniquement.
     */
    protected $hidden = [
        'file_path',
        'file_hash',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', 'rejected');
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Indique si le fichier est une image.
     */
    public function isImage(): bool
    {
        return in_array($this->mime_type, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], true);
    }

    /**
     * Indique si le fichier est un PDF.
     */
    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }

    /**
     * Taille du fichier en format lisible.
     */
    public function getHumanFileSize(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' Mo';
        }
        return round($bytes / 1024, 1) . ' Ko';
    }
}
