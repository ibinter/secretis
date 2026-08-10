<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle de lettre — le geste quotidien d'un secrétariat.
 *
 * La table `document_templates` était migrée depuis longtemps mais n'avait
 * AUCUNE ligne de code en face : ni modèle, ni contrôleur, ni écran. Rédiger
 * une convocation, une attestation ou une note de service repartait donc d'une
 * page blanche à chaque fois.
 *
 * Le corps du modèle porte des variables `{{ nom }}` que `DocumentTemplateService`
 * remplace à la fusion.
 */
class DocumentTemplate extends Model
{
    protected $table = 'document_templates';

    protected $fillable = [
        'organization_id', 'created_by', 'name', 'description', 'category',
        'file_path', 'content', 'variables', 'access_level', 'is_active',
    ];

    protected $casts = [
        'variables'   => 'array',
        'is_active'   => 'boolean',
        'usage_count' => 'integer',
    ];

    /** Valeurs admises par la contrainte CHECK de la table. */
    public const NIVEAUX_ACCES = ['public', 'organization', 'department', 'private'];

    /**
     * Catégories usuelles d'un secrétariat. Libre : la colonne accepte tout,
     * cette liste ne sert qu'à proposer un classement cohérent à l'écran.
     */
    public const CATEGORIES = [
        'courrier'      => 'Courrier',
        'attestation'   => 'Attestation',
        'note_service'  => 'Note de service',
        'convocation'   => 'Convocation',
        'contrat'       => 'Contrat',
        'rh'            => 'Ressources humaines',
        'juridique'     => 'Juridique',
        'autre'         => 'Autre',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActifs($query)
    {
        return $query->where('is_active', true);
    }
}
