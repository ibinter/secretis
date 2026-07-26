<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmPipelineStage extends Model
{
    protected $table = 'crm_pipeline_stages';

    protected $fillable = [
        'name', 'order', 'color', 'probability_percent',
        'is_closed_won', 'is_closed_lost',
    ];

    protected $casts = [
        'is_closed_won'       => 'boolean',
        'is_closed_lost'      => 'boolean',
        'probability_percent' => 'integer',
        'order'               => 'integer',
    ];

    public function deals(): HasMany
    {
        return $this->hasMany(CrmDeal::class, 'stage_id');
    }
}
