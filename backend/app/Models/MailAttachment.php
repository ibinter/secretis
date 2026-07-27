<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MailAttachment extends Model
{
    protected $table = "mail_attachments";
    protected $keyType = "string";
    public $incrementing = false;

    protected $fillable = [
        "mail_registry_id",
        "file_name",
        "file_path",
        "mime_type",
        "file_size",
    ];

    public function mail(): BelongsTo
    {
        return $this->belongsTo(MailRegistry::class, "mail_registry_id");
    }
}
