<?php

namespace App\Services;

use App\Models\DocumentTemplate;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Fusion d'un modèle de lettre avec des données.
 *
 * Les modèles portent des variables au format `{{ nom }}`. Trois familles
 * cohabitent, et l'ordre de priorité compte :
 *
 *   1. **Automatiques** — date du jour, nom de l'organisation, signataire.
 *      Elles évitent de ressaisir ce que le système sait déjà.
 *   2. **Saisies** — ce que l'utilisateur renseigne au moment de la fusion.
 *   3. **Non résolues** — laissées TELLES QUELLES, jamais remplacées par du
 *      vide. Une variable oubliée doit sauter aux yeux sur le document imprimé
 *      plutôt que de produire une phrase amputée qu'on signe sans la voir.
 */
class DocumentTemplateService
{
    /** Motif d'une variable : `{{ nom_de_variable }}`, espaces tolérés. */
    private const MOTIF = '/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/';

    /**
     * Variables alimentées par le système, sans saisie.
     * Documentées à l'écran pour que l'auteur du modèle sache quoi écrire.
     */
    public function variablesAutomatiques(Organization $org, ?User $signataire = null): array
    {
        // `translatedFormat` suit la locale de Carbon, qui n'est pas celle de
        // l'organisation : sans ce réglage la date sortait en anglais
        // (« 8 August 2026 ») sur un courrier français. SECRETIS servant
        // plusieurs zones linguistiques, la locale vient de l'organisation.
        $maintenant = Carbon::now()->locale($org->locale ?: config('app.locale', 'fr'));

        return [
            'date'              => $maintenant->translatedFormat('j F Y'),
            'date_courte'       => $maintenant->format('d/m/Y'),
            'annee'             => (string) $maintenant->year,
            'lieu'              => $org->city ?? '',
            'organisation'      => $org->name ?? '',
            'organisation_adresse' => $org->address ?? '',
            'organisation_telephone' => $org->phone ?? '',
            'organisation_email'=> $org->email ?? '',
            'signataire'        => $signataire?->name ?? '',
            'signataire_fonction' => $signataire?->job_title ?? '',
        ];
    }

    /**
     * Liste les variables présentes dans un contenu, dans l'ordre d'apparition
     * et sans doublon. Sert à construire le formulaire de fusion : l'auteur du
     * modèle n'a rien à déclarer, le service lit ce qu'il a écrit.
     *
     * @return array<int, string>
     */
    public function variablesDe(string $contenu): array
    {
        preg_match_all(self::MOTIF, $contenu, $trouvees);

        return array_values(array_unique($trouvees[1] ?? []));
    }

    /**
     * Fusionne un modèle avec les valeurs fournies.
     *
     * @param  array<string, string> $saisies
     * @return array{contenu:string, manquantes:array<int,string>}
     */
    public function fusionner(
        DocumentTemplate $modele,
        array $saisies,
        Organization $org,
        ?User $signataire = null,
    ): array {
        // Les saisies priment : un utilisateur qui renseigne « lieu » veut son
        // lieu, pas celui de la fiche organisation.
        $valeurs = array_merge(
            $this->variablesAutomatiques($org, $signataire),
            array_filter($saisies, fn ($v) => $v !== null && $v !== ''),
        );

        $manquantes = [];

        $contenu = preg_replace_callback(
            self::MOTIF,
            function ($m) use ($valeurs, &$manquantes) {
                $cle = $m[1];

                if (array_key_exists($cle, $valeurs) && $valeurs[$cle] !== '') {
                    return $valeurs[$cle];
                }

                $manquantes[] = $cle;

                // Volontairement inchangée : une variable non résolue doit
                // rester visible sur le document.
                return $m[0];
            },
            $modele->content ?? ''
        );

        return [
            'contenu'    => $contenu,
            'manquantes' => array_values(array_unique($manquantes)),
        ];
    }

    /**
     * Incrémente le compteur d'usage — il sert à remonter les modèles les plus
     * utilisés en tête de liste, ce qui est l'essentiel du confort au quotidien.
     */
    public function marquerUtilise(DocumentTemplate $modele): void
    {
        DB::table('document_templates')
            ->where('id', $modele->id)
            ->increment('usage_count');
    }
}
