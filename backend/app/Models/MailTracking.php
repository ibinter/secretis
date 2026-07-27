<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * MailTracking — Historique des actions sur un courrier
 * Table mail_trackings (créée via migration si besoin)
 */
class MailTracking extends Model
{
    protected $table = "mail_trackings";
    protected $keyType = "string";
    public $incrementing = false;

    protected $fillable = [
        "mail_id",
        "user_id",
        "action",
        "from_status",
        "to_status",
        "comment",
    ];

    public function mail(): BelongsTo
    {
        return $this->belongsTo(MailRegistry::class, "mail_id");
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
