<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProspectNote — Note de suivi commercial associée à un prospect
 *
 * @property int    $id
 * @property int    $prospect_id
 * @property string $content     Contenu de la note
 * @property string $type        call|email|meeting|other
 * @property int    $created_by  ID SuperAdmin auteur
 */
class ProspectNote extends Model
{
    protected $fillable = ['prospect_id', 'content', 'type', 'created_by'];

    public function prospect(): BelongsTo
    {
        return $this->belongsTo(Prospect::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
