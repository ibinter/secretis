<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Modèles de lettres livrés d'origine.
 *
 * Une fonction « modèles » vide ne sert à rien : personne ne prend le temps
 * d'en rédiger un le jour où il est pressé. Ces six modèles couvrent les
 * courriers qu'un secrétariat produit le plus souvent, et servent surtout
 * d'exemples de syntaxe — chacun montre l'usage des variables.
 *
 * Ils sont posés par organisation, seulement si elle n'en a aucun : une
 * organisation qui a déjà constitué sa bibliothèque n'est jamais écrasée.
 */
class DocumentTemplatesSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Organization::all() as $org) {
            if (DB::table('document_templates')->where('organization_id', $org->id)->exists()) {
                continue;
            }

            $auteur = User::where('organization_id', $org->id)->orderBy('id')->value('id');

            if (! $auteur) {
                continue;
            }

            $maintenant = now();

            DB::table('document_templates')->insert(array_map(fn ($m) => $m + [
                'organization_id' => $org->id,
                'created_by'      => $auteur,
                'access_level'    => 'organization',
                'is_active'       => true,
                'usage_count'     => 0,
                'created_at'      => $maintenant,
                'updated_at'      => $maintenant,
            ], $this->modeles()));
        }
    }

    private function modeles(): array
    {
        return [
            [
                'name'        => 'Courrier de transmission',
                'description' => "Lettre d'accompagnement d'un document envoyé à un tiers.",
                'category'    => 'courrier',
                'content'     => <<<'TXT'
{{ organisation }}
{{ organisation_adresse }}

{{ lieu }}, le {{ date }}

Objet : {{ objet }}
Référence : {{ reference }}

{{ destinataire_civilite }} {{ destinataire }},

Nous avons l'honneur de vous transmettre, ci-joint, {{ document_transmis }}.

Nous restons à votre disposition pour tout complément d'information que vous
jugeriez utile.

Veuillez agréer, {{ destinataire_civilite }}, l'expression de notre considération
distinguée.

{{ signataire }}
{{ signataire_fonction }}
TXT,
            ],
            [
                'name'        => 'Attestation de travail',
                'description' => "Atteste qu'une personne est employée dans l'organisation.",
                'category'    => 'attestation',
                'content'     => <<<'TXT'
{{ organisation }}
{{ organisation_adresse }}

ATTESTATION DE TRAVAIL

Je soussigné(e) {{ signataire }}, {{ signataire_fonction }} de {{ organisation }},
atteste que :

{{ employe_civilite }} {{ employe_nom }}

est employé(e) au sein de notre organisation depuis le {{ date_embauche }},
en qualité de {{ employe_fonction }}.

La présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce
que de droit.

Fait à {{ lieu }}, le {{ date }}

{{ signataire }}
{{ signataire_fonction }}
TXT,
            ],
            [
                'name'        => 'Note de service',
                'description' => "Communication interne à l'ensemble du personnel ou à un service.",
                'category'    => 'note_service',
                'content'     => <<<'TXT'
{{ organisation }}

NOTE DE SERVICE N° {{ numero }}

Destinataires : {{ destinataires }}
Objet : {{ objet }}

{{ corps }}

Cette note prend effet à compter du {{ date_effet }}.

{{ lieu }}, le {{ date }}

{{ signataire }}
{{ signataire_fonction }}
TXT,
            ],
            [
                'name'        => 'Convocation à une réunion',
                'description' => 'Convoque des participants à une réunion, avec ordre du jour.',
                'category'    => 'convocation',
                'content'     => <<<'TXT'
{{ organisation }}

CONVOCATION

{{ destinataire_civilite }} {{ destinataire }},

Vous êtes prié(e) de bien vouloir assister à la réunion qui se tiendra :

    Date  : {{ date_reunion }}
    Heure : {{ heure_reunion }}
    Lieu  : {{ lieu_reunion }}

Ordre du jour :
{{ ordre_du_jour }}

En cas d'empêchement, nous vous remercions de bien vouloir en informer le
secrétariat dans les meilleurs délais.

{{ lieu }}, le {{ date }}

{{ signataire }}
{{ signataire_fonction }}
TXT,
            ],
            [
                'name'        => 'Accusé de réception',
                'description' => "Confirme la réception d'un courrier ou d'un dossier.",
                'category'    => 'courrier',
                'content'     => <<<'TXT'
{{ organisation }}
{{ organisation_adresse }}

{{ lieu }}, le {{ date }}

Objet : Accusé de réception
Votre référence : {{ reference_expediteur }}
Notre référence : {{ reference }}

{{ destinataire_civilite }} {{ destinataire }},

Nous accusons réception de votre courrier du {{ date_courrier }}, relatif à
{{ objet_courrier }}.

Votre demande a été enregistrée sous la référence {{ reference }} et transmise
au service concerné. Une réponse vous parviendra dans un délai de
{{ delai_reponse }}.

Veuillez agréer, {{ destinataire_civilite }}, l'expression de notre
considération distinguée.

{{ signataire }}
{{ signataire_fonction }}
TXT,
            ],
            [
                'name'        => 'Demande de devis',
                'description' => 'Sollicite une proposition commerciale auprès d\'un fournisseur.',
                'category'    => 'courrier',
                'content'     => <<<'TXT'
{{ organisation }}
{{ organisation_adresse }}
{{ organisation_telephone }} — {{ organisation_email }}

{{ lieu }}, le {{ date }}

Objet : Demande de devis — {{ objet }}

{{ destinataire_civilite }} {{ destinataire }},

Dans le cadre de {{ contexte }}, nous souhaitons obtenir une proposition
chiffrée portant sur :

{{ prestations }}

Nous vous remercions de bien vouloir nous faire parvenir votre offre au plus
tard le {{ date_limite }}, en précisant vos délais de livraison et vos
conditions de règlement.

Veuillez agréer, {{ destinataire_civilite }}, l'expression de nos salutations
distinguées.

{{ signataire }}
{{ signataire_fonction }}
TXT,
            ],
        ];
    }
}
