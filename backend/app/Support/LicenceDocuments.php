<?php

namespace App\Support;

use App\Services\LicenceService;
use Illuminate\Support\Facades\File;

/**
 * Documents juridiques dérivés du moteur de licence — cahier IBIG SOFT v1.1,
 * section 11 (11.1 à 11.6).
 *
 * POURQUOI CETTE CLASSE EXISTE
 * ----------------------------
 * Les pages juridiques du produit vivaient à deux endroits : la constante
 * `LegalPagesController::PAGES` et la table `legal_pages` (alimentée par
 * `LegalPagesSeeder`). Les deux contenaient des durées et des plafonds ÉCRITS À
 * LA MAIN — « essai gratuit de 14 jours », « 90 jours », « Découverte : 3
 * utilisateurs ». La section 12.1 l'interdit : le jour où `licence.config.json`
 * change, ces textes deviennent faux sans que personne ne s'en aperçoive, et
 * l'utilisateur lit une durée sur la vitrine et une autre dans les CGU.
 *
 * Ici, AUCUN chiffre n'est saisi. Tout provient de `LicenceService`, qui lit
 * `config/licence.config.json`. Une chaîne littérale de durée ou de plafond dans
 * ce fichier serait un défaut, même si la valeur est juste aujourd'hui.
 *
 * DEUX MODES
 * ----------
 *   - `html($slug)`   : remplace INTÉGRALEMENT le document (documents dont
 *                       l'objet même est la licence : essai, CGU, CLUF, CGV,
 *                       sauvegarde, résiliation).
 *   - `supplement($slug)` : bloc AJOUTÉ à la fin d'un document existant qu'il
 *                       serait absurde de réécrire (la politique de
 *                       confidentialité porte l'essentiel de son contenu sur
 *                       l'ARTCI et le RGPD, pas sur la licence).
 *
 * AVERTISSEMENT
 * -------------
 * Ces textes sont exacts quant aux FAITS TECHNIQUES du produit. Ils n'ont pas
 * été relus par un juriste. Une relecture juridique reste nécessaire avant
 * publication.
 */
class LicenceDocuments
{
    /** Documents entièrement engendrés à partir du moteur. */
    public const REMPLACES = [
        'conditions-essai',
        'cgu',
        'cgv',
        'contrat-licence',
        'politique-sauvegarde',
        'politique-resiliation',
    ];

    /** Documents simplement complétés d'un bloc licence. */
    public const COMPLETES = [
        'confidentialite',
        'politique-confidentialite',
        'traitement-donnees',
    ];

    /**
     * Version des documents juridiques engendrés ici.
     *
     * Ce n'est ni une durée ni un plafond : c'est le numéro de révision de la
     * RÉDACTION. Il s'incrémente quand le texte change, pas quand un chiffre
     * change — les chiffres, eux, se mettent à jour tout seuls.
     */
    public const VERSION = '3.0';

    public function __construct(private LicenceService $L)
    {
    }

    public function remplace(string $slug): bool
    {
        return in_array($slug, self::REMPLACES, true);
    }

    public function complete(string $slug): bool
    {
        return in_array($slug, self::COMPLETES, true);
    }

    /** Titre officiel du document engendré, ou null. */
    public function titre(string $slug): ?string
    {
        return match ($slug) {
            'conditions-essai'      => "Conditions du programme d'essai",
            'cgu'                   => "Conditions générales d'utilisation et contrat de licence utilisateur final",
            'cgv'                   => 'Conditions générales de vente',
            'contrat-licence'       => 'Contrat de licence utilisateur final (CLUF)',
            'politique-sauvegarde'  => 'Politique de sauvegarde et de conservation des données',
            'politique-resiliation' => 'Politique de résiliation et de fin de contrat',
            default                 => null,
        };
    }

    /**
     * Date de mise à jour du document.
     *
     * Elle n'est pas écrite à la main : elle suit la dernière modification de la
     * source de vérité ou de la rédaction. Une date figée dans le texte finirait
     * par mentir, comme les durées qu'on vient d'en retirer.
     */
    public function dateMaj(): string
    {
        $horodatages = array_filter([
            @filemtime(config_path('licence.config.json')) ?: null,
            @filemtime(__FILE__) ?: null,
        ]);

        return date('d/m/Y', $horodatages ? max($horodatages) : time());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Documents complets
    // ─────────────────────────────────────────────────────────────────────────

    public function html(string $slug): ?string
    {
        return match ($slug) {
            'conditions-essai'      => $this->conditionsEssai(),
            'cgu'                   => $this->cgu(),
            'cgv'                   => $this->cgv(),
            'contrat-licence'       => $this->cluf(),
            'politique-sauvegarde'  => $this->sauvegarde(),
            'politique-resiliation' => $this->resiliation(),
            default                 => null,
        };
    }

    public function supplement(string $slug): ?string
    {
        if (! $this->complete($slug)) {
            return null;
        }

        return $this->blocProtectionDonnees();
    }

    // ─── 11.1 Conditions d'essai ─────────────────────────────────────────────

    private function conditionsEssai(): string
    {
        $c        = $this->L->config();
        $solution = $this->L->nomSolution();
        $gratuit  = $c['gratuit']['nom'];
        $jours    = $this->L->essaiJours();
        $prolJ    = (int) ($c['prolongation_jours'] ?? 0);
        $prolMax  = (int) ($c['prolongation_max'] ?? 0);
        $resume   = $this->L->resumePlafond();
        $entete   = $this->entete();

        return <<<HTML
{$entete}

<h2>1. Durée de l'essai</h2>
<p>Tout nouvel espace {$solution} peut ouvrir un <strong>essai</strong> d'une durée de
<strong>{$jours} jours calendaires</strong>, décomptés à partir de l'ouverture de l'essai.
Cette durée est unique : elle est la même pour tous les espaces et pour toutes les formules.
Elle n'est ni négociable au cas par cas, ni modifiable après l'ouverture de l'essai.</p>
<p>L'essai donne accès aux fonctions de la formule payante retenue à l'ouverture : export,
multi-utilisateur, API, assistant IA, relances WhatsApp et SMS. Les documents produits pendant
l'essai ne portent pas de filigrane.</p>

<h2>2. Aucune carte bancaire, aucun engagement</h2>
<p>L'ouverture d'un essai <strong>ne requiert aucune carte bancaire</strong>, aucun moyen de
paiement, aucune empreinte bancaire et aucune information financière d'aucune sorte. Aucun
prélèvement ne peut techniquement être opéré : aucun instrument de paiement n'est enregistré.</p>

<h2>3. Aucune reconduction automatique</h2>
<p>L'essai <strong>ne se reconduit pas</strong> et ne se transforme pas automatiquement en
abonnement payant. Aucune facture n'est émise à son terme. Le passage à une formule payante
résulte d'une souscription expresse de votre part, jamais du silence.</p>

<h2>4. Ce qui se passe à l'échéance</h2>
<p>À l'échéance de l'essai, l'espace <strong>bascule automatiquement au palier
{$gratuit}</strong>. Cette bascule est la seule conséquence de l'échéance.</p>
<ul>
  <li><strong>Aucune donnée n'est supprimée</strong>, ni à l'échéance, ni après.</li>
  <li>L'espace reste accessible, et reste modifiable dans la limite du plafond du palier
      {$gratuit} : {$resume}.</li>
  <li>Les enregistrements qui excèdent ce plafond restent <strong>visibles et consultables</strong>,
      en <strong>lecture seule</strong>. Ils ne sont ni masqués, ni archivés, ni détruits.</li>
  <li>Les fonctions avancées (export, multi-utilisateur, API, assistant IA, WhatsApp, SMS) se
      ferment. Elles rouvrent intégralement dès l'activation d'une formule payante.</li>
  <li>Les documents produits à compter de la bascule portent le filigrane décrit à l'article
      « Filigrane » des conditions générales d'utilisation.</li>
</ul>
<p>Le palier {$gratuit} n'a pas de date de fin : un espace peut y demeurer sans limite de durée.</p>

<h2>5. Prolongation de l'essai</h2>
<p>Une prolongation de <strong>{$prolJ} jours</strong> peut être accordée. Elle obéit à des
conditions strictes :</p>
<ul>
  <li>elle est <strong>accordée manuellement</strong> par IBIG SOFT, jamais automatiquement ;</li>
  <li>elle ne peut être accordée qu'à un essai <strong>en cours</strong> ;</li>
  <li>elle ne peut être accordée qu'<strong>une seule fois</strong> par espace
      (au plus {$prolMax} prolongation) ;</li>
  <li>elle suppose un <strong>motif écrit obligatoire</strong>, consigné au journal de l'espace ;</li>
  <li>elle ne constitue pas un droit : une demande de prolongation peut être refusée sans que
      cela ouvre droit à indemnité.</li>
</ul>
<p>Une seconde prolongation n'est pas prévue. Elle appelle une proposition commerciale.</p>

<h2>6. Unicité de l'essai</h2>
<p>L'essai est ouvert <strong>une seule fois par espace</strong>. La création de plusieurs espaces
dans le but d'enchaîner des essais successifs, ou de contourner le plafond du palier {$gratuit},
constitue un manquement aux conditions générales d'utilisation.</p>

<h2>7. Conditions applicables</h2>
<p>L'essai est régi par les <a href="/cgu">conditions générales d'utilisation</a>. IBIG SOFT peut
faire évoluer les conditions du programme d'essai pour les <strong>nouveaux espaces</strong> ;
un essai déjà ouvert se déroule jusqu'à son terme selon les conditions en vigueur au jour de son
ouverture.</p>
HTML;
    }

    // ─── 11.2 + 11.5 CGU / CLUF ──────────────────────────────────────────────

    private function cgu(): string
    {
        $c         = $this->L->config();
        $solution  = $this->L->nomSolution();
        $editeur   = $c['editeur'];
        $gratuit   = $c['gratuit']['nom'];
        $resume    = $this->L->resumePlafond();
        $jours     = $this->L->essaiJours();
        $grace     = $this->L->graceJours();
        $retention = $this->L->retentionJours();
        $filigrane = $this->L->filigrane();
        $entete    = $this->entete();
        $etats     = $this->tableauEtats();
        $plafonds  = $this->listePlafonds();
        $inclus    = $this->listeSimple($c['gratuit']['inclus'] ?? []);
        $exclus    = $this->listeSimple($c['gratuit']['exclus'] ?? []);
        $utils     = (int) ($c['gratuit']['utilisateurs'] ?? 1);
        $stockage  = (int) ($c['gratuit']['stockage_mo'] ?? 0);

        return <<<HTML
{$entete}

<h2>1. Objet</h2>
<p>Les présentes conditions générales d'utilisation régissent l'accès et l'utilisation de
<strong>{$solution}</strong>, édité par <strong>{$editeur}</strong>, quel que soit l'état de
l'espace du client. Elles valent contrat de licence utilisateur final. L'ouverture d'un espace,
la connexion ou l'usage d'une fonction quelconque emporte leur acceptation.</p>
<p>Le terme <strong>espace</strong> désigne le compte d'une organisation cliente, isolé de tous
les autres. Le terme <strong>formule</strong> désigne une offre payante. Le terme
<strong>plafond</strong> désigne la limite d'un compteur métier au palier {$gratuit}.</p>

<h2>2. Les six états d'un espace</h2>
<p>Un espace se trouve toujours dans exactement un des six états suivants. L'état est
<strong>calculé par le serveur</strong> à chaque requête, à partir de la date du serveur ; il
n'est jamais déterminé par le navigateur du client.</p>
{$etats}
<p>Le passage d'un état à l'autre est consigné dans un journal non modifiable, indiquant l'état
antérieur, l'état nouveau, la cause, l'auteur et l'horodatage.</p>
<p><strong>Aucun de ces états n'entraîne la suppression de données.</strong> Aucun ne ferme
simultanément la lecture et l'écriture : un espace dont l'écriture est fermée demeure
consultable.</p>

<h2>3. Le palier {$gratuit}</h2>
<p>Le palier {$gratuit} est gratuit et sans date de fin. Il est plafonné par compteur métier :</p>
{$plafonds}
<p>Soit, en résumé : <strong>{$resume}</strong>. Le palier {$gratuit} admet
<strong>{$utils}</strong> utilisateur et <strong>{$stockage} Mo</strong> de stockage.</p>
<p>Sont inclus :</p>
{$inclus}
<p>Sont exclus, et n'ouvrent qu'avec une formule payante ou pendant l'essai :</p>
{$exclus}
<p>Le plafond s'applique <strong>à l'écriture</strong>. Lorsqu'il est atteint, la création d'un
nouvel enregistrement est refusée et un message l'indique. <strong>Rien n'est supprimé, rien
n'est masqué</strong>, et les enregistrements existants restent modifiables. Les compteurs
mensuels sont remis à zéro le premier jour de chaque mois, dans le fuseau horaire de l'espace.</p>

<h2>4. Évolution des plafonds — absence d'effet rétroactif</h2>
<p>{$editeur} se réserve le droit de faire évoluer les plafonds du palier {$gratuit}, à la hausse
comme à la baisse, ainsi que la liste des fonctions incluses ou exclues.</p>
<p><strong>Une évolution défavorable ne s'applique qu'aux espaces créés postérieurement à son
entrée en vigueur.</strong> Les espaces existants au jour de l'entrée en vigueur conservent les
plafonds dont ils bénéficiaient : la modification est <strong>sans effet rétroactif</strong> à
leur égard. Une évolution favorable, en revanche, bénéficie immédiatement à tous les espaces.</p>

<h2>5. Interdiction de contourner les plafonds</h2>
<p>Il est interdit de contourner, ou de tenter de contourner, le plafond du palier {$gratuit},
notamment :</p>
<ul>
  <li>en créant <strong>plusieurs espaces</strong> pour une même organisation, une même raison
      sociale ou un même numéro de téléphone, afin de cumuler plusieurs plafonds ;</li>
  <li>en ouvrant des essais successifs sous des identités différentes ;</li>
  <li>en appelant directement l'interface de programmation pour éviter les contrôles ;</li>
  <li>en modifiant l'horloge du poste client, l'adresse appelée ou le contenu des requêtes.</li>
</ul>
<p>Un seul espace au palier {$gratuit} est admis par raison sociale et par numéro de téléphone.
Le constat d'un contournement peut entraîner le regroupement ou la fermeture des espaces
concernés, après notification et sans destruction des données.</p>

<h2>6. Essai</h2>
<p>Tout nouvel espace peut ouvrir un essai de <strong>{$jours} jours</strong>, sans carte
bancaire, sans engagement et <strong>sans reconduction automatique</strong>. À l'échéance,
l'espace bascule au palier {$gratuit} sans perte de données. Les modalités complètes figurent
dans les <a href="/conditions-essai">conditions du programme d'essai</a>.</p>

<h2>7. Filigrane des documents produits</h2>
<p>Le client est expressément informé, et accepte, que <strong>les documents produits depuis un
espace au palier {$gratuit}, en démonstration publique ou dont l'abonnement est expiré portent un
filigrane</strong> — courriers, exports imprimables, pièces jointes générées et documents PDF.</p>
<p>Le filigrane est la mention : « <strong>{$filigrane}</strong> ».</p>
<p>Ce filigrane <strong>disparaît automatiquement dès le premier paiement</strong> et pendant
toute la durée d'un essai ou d'un abonnement en cours, sans démarche du client et sans
retraitement des documents déjà produits. Les documents produits avant le paiement conservent le
filigrane qu'ils portaient au moment de leur production.</p>
<p>La suppression, l'altération ou le masquage du filigrane par un moyen quelconque est
interdite.</p>

<h2>8. Fin d'abonnement, lecture seule et conservation</h2>
<p>À l'échéance d'un abonnement, une <strong>période de grâce de {$grace} jours</strong> maintient
l'accès complet. À l'issue de cette période, l'espace passe en <strong>lecture seule</strong> :
les données restent consultables et exportables sur demande, l'écriture est fermée. Les données
sont conservées <strong>{$retention} jours</strong> à compter de ce passage en lecture seule. Les
modalités figurent dans la <a href="/politique-sauvegarde">politique de sauvegarde</a> et la
<a href="/politique-resiliation">politique de résiliation</a>.</p>

<h2>9. Absence de licence perpétuelle</h2>
<p>{$editeur} ne concède <strong>aucune licence perpétuelle</strong>. Toute licence autre que la
démonstration publique et le palier {$gratuit} comporte obligatoirement une date de fin. Aucune
mention commerciale, aucun devis et aucun échange ne peut valablement conférer un droit d'usage
sans terme.</p>

<h2>10. Compte, sécurité et isolement des espaces</h2>
<ul>
  <li>Chaque espace est strictement isolé des autres.</li>
  <li>Les identifiants sont personnels. Le client répond de l'activité conduite depuis son espace.</li>
  <li>Toute tentative d'accès aux données d'un autre espace est interdite.</li>
  <li>{$editeur} ne demande jamais de mot de passe ni de code secret.</li>
</ul>

<h2>11. Obligations du client</h2>
<p>Le client s'interdit notamment : tout usage illicite ; l'introduction de contenus
malveillants ; la revente ou la mise à disposition du service à un tiers sans accord écrit ; la
décompilation et l'ingénierie inverse, sous réserve des exceptions légales impératives ; les
tests de charge ou d'intrusion sans autorisation écrite.</p>

<h2>12. Propriété des données du client</h2>
<p><strong>Les données saisies appartiennent au client.</strong> {$editeur} n'acquiert aucun droit
de propriété sur elles et n'en fait aucun usage étranger à la fourniture du service. Le client
peut en demander l'export à tout moment, y compris lorsque son espace est en lecture seule.</p>

<h2>13. Disponibilité</h2>
<p>{$editeur} met en œuvre des moyens raisonnables pour assurer la disponibilité du service, hors
maintenance planifiée et cas de force majeure. Le service est fourni en l'état ; aucune
disponibilité absolue n'est garantie.</p>

<h2>14. Responsabilité</h2>
<p>La responsabilité totale de {$editeur}, toutes causes confondues, est limitée au montant
effectivement payé par le client au titre des douze derniers mois. Les dommages indirects — perte
d'exploitation, perte de chance, atteinte à l'image — sont exclus.</p>

<h2>15. Évolution des présentes conditions</h2>
<p>Les présentes conditions peuvent être modifiées. La version en vigueur est celle publiée sur
cette page, avec son numéro de version et sa date. Les modifications substantielles sont notifiées
avant leur entrée en vigueur. Les modifications de plafonds obéissent en outre à la règle
d'absence d'effet rétroactif énoncée à l'article 4.</p>

<h2>16. Droit applicable</h2>
<p>Les présentes conditions sont régies par le droit ivoirien et, le cas échéant, par les Actes
uniformes OHADA. À défaut de règlement amiable, compétence est attribuée aux juridictions
d'Abidjan.</p>
HTML;
    }

    // ─── 11.2 CLUF (document distinct) ───────────────────────────────────────

    private function cluf(): string
    {
        $c        = $this->L->config();
        $solution = $this->L->nomSolution();
        $editeur  = $c['editeur'];
        $gratuit  = $c['gratuit']['nom'];
        $grace    = $this->L->graceJours();
        $horsLigne = (int) ($c['tolerance_hors_ligne_jours'] ?? 0);
        $entete   = $this->entete();
        $etats    = $this->tableauEtats();

        return <<<HTML
{$entete}

<h2>1. Parties et objet</h2>
<p>Le présent contrat de licence utilisateur final est conclu entre <strong>{$editeur}</strong>,
concédant, et l'organisation titulaire de l'espace, licenciée. Il définit les conditions du droit
d'usage de <strong>{$solution}</strong>. Il complète les
<a href="/cgu">conditions générales d'utilisation</a>, dont il ne peut être détaché.</p>

<h2>2. Nature de la licence</h2>
<p>La licence concédée est <strong>non exclusive, non transférable, non cessible et à durée
déterminée</strong>. Elle est limitée à l'organisation titulaire de l'espace, aux fonctions
ouvertes par son état et par sa formule, et à un usage professionnel interne.</p>

<h2>3. Absence de licence perpétuelle — règle absolue</h2>
<p>{$editeur} <strong>ne concède aucune licence perpétuelle et aucune licence à durée
indéterminée</strong>. Toute clé de licence, hors démonstration publique et palier {$gratuit},
porte obligatoirement une date de fin. Cette règle est appliquée par une contrainte technique de
la base de données : une licence sans date de fin ne peut pas être enregistrée.</p>
<p>Le palier {$gratuit} n'échappe à cette règle que parce qu'il n'est pas une licence payante :
il est gratuit, plafonné, et ne confère aucun droit d'usage des fonctions avancées.</p>

<h2>4. États de la licence</h2>
{$etats}
<p>L'état est calculé par le serveur. Une valeur d'état transmise par le poste client est ignorée.
Une licence dont la date de fin est dépassée est échue, même si le traitement quotidien de
recalcul n'est pas encore passé.</p>

<h2>5. Durée, renouvellement, échéance</h2>
<ul>
  <li>La licence vaut pour la période payée et se renouvelle par un nouveau paiement.</li>
  <li>Le renouvellement anticipé prolonge la validité <strong>à partir de la date de fin en
      cours</strong>, jamais à partir de la date de paiement : aucun jour payé n'est perdu.</li>
  <li>À l'échéance : période de grâce de <strong>{$grace} jours</strong> à accès complet, puis
      passage en <strong>lecture seule</strong>. Les données sont conservées et intégralement
      restituées lors d'une réactivation.</li>
</ul>

<h2>6. Licence sur site (on-premise) — durée limitée</h2>
<p>Lorsqu'une installation sur l'infrastructure du client est convenue, elle fait l'objet d'une
licence <strong>à durée limitée</strong>, soumise aux règles suivantes :</p>
<ul>
  <li>la clé de licence porte une <strong>date de fin</strong>, sans exception ;</li>
  <li>l'instance vérifie périodiquement la validité de la clé auprès des serveurs de
      {$editeur} ;</li>
  <li>une <strong>tolérance hors ligne de {$horsLigne} jours</strong> permet de fonctionner sans
      connexion ; passé ce délai sans vérification réussie, l'instance passe en
      <strong>lecture seule</strong> — elle ne s'efface pas et ne se ferme pas ;</li>
  <li>à l'expiration de la licence sur site, le client conserve l'accès en lecture à ses données
      et peut les exporter ;</li>
  <li>aucune licence sur site n'est vendue comme définitive, à vie ou sans terme.</li>
</ul>

<h2>7. Restrictions</h2>
<p>Sont interdits : la copie du logiciel ; la décompilation, le désassemblage et l'ingénierie
inverse, sous réserve des exceptions légales impératives ; le partage d'identifiants hors des
utilisateurs déclarés ; la sous-licence, la location et la revente ; le développement d'un produit
concurrent à partir du logiciel ; la suppression ou l'altération des mentions de propriété
intellectuelle et du filigrane.</p>

<h2>8. Vérification de licence</h2>
<p>La validité est contrôlée exclusivement côté serveur, sur la base de la date du serveur. Toute
tentative de contournement — modification d'horloge, manipulation des requêtes, altération du
client web, création de comptes multiples pour cumuler des plafonds — constitue une violation du
présent contrat.</p>

<h2>9. Mises à jour</h2>
<p>La licence inclut les mises à jour correctives et évolutives de la plateforme, déployées par
{$editeur}.</p>

<h2>10. Réversibilité</h2>
<p>Le client peut exporter l'intégralité de ses données dans un format structuré, pendant la vie
du contrat et pendant la durée de conservation qui suit son terme. Les modalités figurent dans la
<a href="/politique-resiliation">politique de résiliation</a>.</p>

<h2>11. Responsabilité et droit applicable</h2>
<p>La responsabilité de {$editeur} est plafonnée dans les conditions prévues par les
<a href="/cgu">conditions générales d'utilisation</a>. Le présent contrat est régi par le droit
ivoirien et les Actes uniformes OHADA ; compétence est attribuée aux juridictions d'Abidjan après
tentative de règlement amiable.</p>
HTML;
    }

    // ─── 11.3 CGV ────────────────────────────────────────────────────────────

    private function cgv(): string
    {
        $c         = $this->L->config();
        $solution  = $this->L->nomSolution();
        $editeur   = $c['editeur'];
        $gratuit   = $c['gratuit']['nom'];
        $grace     = $this->L->graceJours();
        $retention = $this->L->retentionJours();
        $jours     = $this->L->essaiJours();
        $horsLigne = (int) ($c['tolerance_hors_ligne_jours'] ?? 0);
        $entete    = $this->entete();
        $suivante  = $this->formuleSuivante();

        return <<<HTML
{$entete}

<h2>1. Champ d'application</h2>
<p>Les présentes conditions générales de vente régissent les relations commerciales entre
<strong>{$editeur}</strong> et toute organisation souscrivant une formule payante de
<strong>{$solution}</strong>. Elles complètent les <a href="/cgu">conditions générales
d'utilisation</a> et le <a href="/contrat-licence">contrat de licence utilisateur final</a>.</p>

<h2>2. Offres</h2>
<p>Trois voies d'accès coexistent :</p>
<ul>
  <li>la <strong>démonstration publique</strong> : le vrai logiciel avec des données fictives,
      sans inscription, remise à zéro chaque nuit, sans aucune valeur contractuelle ;</li>
  <li>le palier <strong>{$gratuit}</strong> : gratuit, sans date de fin, plafonné, sans
      engagement — il n'est pas une vente et n'ouvre droit à aucune prestation payante ;</li>
  <li>les <strong>formules payantes</strong>, objet des présentes, dont la grille tarifaire en
      vigueur est publiée sur la page des formules.</li>
</ul>
<p>Un <strong>essai de {$jours} jours</strong> sans carte bancaire et sans reconduction
automatique peut précéder toute souscription.{$suivante}</p>

<h2>3. Prix et paiement</h2>
<p>Les prix sont ceux affichés sur la page des formules au jour de la souscription. Le règlement
s'effectue par Mobile Money, virement bancaire ou tout autre moyen proposé sur la page de
paiement. L'activation intervient après confirmation fiable du paiement. Un reçu est délivré pour
chaque paiement. {$editeur} ne demande jamais de code secret ni de mot de passe.</p>
<p>Toute période déjà payée est honorée au tarif souscrit. Une révision tarifaire ne produit
d'effet que sur les souscriptions et renouvellements postérieurs à son entrée en vigueur.</p>

<h2>4. Durée de l'abonnement</h2>
<p>L'abonnement est souscrit pour la période choisie et prend fin à son échéance. Le
renouvellement anticipé prolonge la validité à partir de la date de fin en cours, jamais à partir
de la date de paiement.</p>

<h2>5. Période de grâce de {$grace} jours</h2>
<p>À l'échéance d'un abonnement non renouvelé, l'espace entre en <strong>période de grâce pendant
{$grace} jours</strong>. Pendant cette période :</p>
<ul>
  <li>l'<strong>accès demeure complet</strong> : écriture, export, interface de programmation,
      multi-utilisateur, assistant IA, relances ;</li>
  <li>aucune fonction n'est fermée, aucun filigrane n'est apposé ;</li>
  <li>le renouvellement rétablit l'abonnement sans démarche particulière et sans perte.</li>
</ul>

<h2>6. Passage en lecture seule</h2>
<p>À l'issue de la période de grâce, l'espace passe en <strong>lecture seule</strong> :</p>
<ul>
  <li>les données <strong>restent consultables</strong> et peuvent être exportées sur demande ;</li>
  <li>l'écriture est fermée : aucune création ni modification n'est possible ;</li>
  <li><strong>aucune donnée n'est supprimée</strong> du fait du passage en lecture seule ;</li>
  <li>les données sont conservées <strong>{$retention} jours</strong> à compter de ce passage,
      selon la <a href="/politique-sauvegarde">politique de sauvegarde</a> ;</li>
  <li>un paiement rétablit l'écriture et l'ensemble des fonctions, avec la totalité des données.</li>
</ul>
<p>Le client peut, à tout moment pendant cette période, revenir au palier {$gratuit} et retrouver
un droit d'écriture dans la limite de son plafond.</p>

<h2>7. Absence de licence perpétuelle</h2>
<p>{$editeur} <strong>ne vend aucune licence perpétuelle</strong>, aucune licence à vie et aucune
licence sans terme. Toute formule payante est un abonnement à durée déterminée, assorti d'une date
de fin. Aucun paiement unique ne confère un droit d'usage sans terme. Toute mention contraire,
d'où qu'elle provienne, est dépourvue de valeur.</p>

<h2>8. Licence sur site (on-premise) à durée limitée</h2>
<p>L'installation sur l'infrastructure du client peut être convenue par contrat distinct. Elle
obéit aux règles suivantes :</p>
<ul>
  <li>elle est concédée pour une <strong>durée déterminée</strong>, reconductible par un nouveau
      paiement, et jamais à titre définitif ;</li>
  <li>la clé de licence porte une date de fin ;</li>
  <li>une <strong>tolérance hors ligne de {$horsLigne} jours</strong> est admise ; au-delà,
      l'instance passe en lecture seule sans effacer ni fermer quoi que ce soit ;</li>
  <li>le prix, le périmètre, l'hébergement, la sauvegarde et le support font l'objet d'un devis ;</li>
  <li>à l'expiration, le client conserve l'accès en lecture à ses données et peut les exporter.</li>
</ul>

<h2>9. Résiliation</h2>
<p>Le client peut résilier à tout moment ; la résiliation prend effet à la fin de la période payée
en cours. Les modalités et le sort des données figurent dans la
<a href="/politique-resiliation">politique de résiliation</a>.</p>

<h2>10. Droit applicable</h2>
<p>Les présentes conditions sont régies par le droit ivoirien et les Actes uniformes OHADA. À
défaut de règlement amiable, compétence est attribuée aux juridictions d'Abidjan.</p>
HTML;
    }

    // ─── 11.4 Sauvegarde et conservation ─────────────────────────────────────

    private function sauvegarde(): string
    {
        $c         = $this->L->config();
        $editeur   = $c['editeur'];
        $solution  = $this->L->nomSolution();
        $gratuit   = $c['gratuit']['nom'];
        $grace     = $this->L->graceJours();
        $retention = $this->L->retentionJours();
        $entete    = $this->entete();

        return <<<HTML
{$entete}

<h2>1. Sauvegardes courantes</h2>
<p>{$editeur} réalise des sauvegardes automatiques chiffrées quotidiennes de {$solution}, stockées
sur une infrastructure distincte du serveur de production. Ces sauvegardes servent la reprise
après incident ; elles ne se substituent pas aux exports du client.</p>

<h2>2. Conservation des données après échéance</h2>
<p>Lorsqu'un abonnement n'est pas renouvelé, la chronologie est la suivante, et elle est la seule
applicable :</p>
<ol>
  <li><strong>Échéance</strong> — l'espace entre en période de grâce ; l'accès reste complet
      pendant <strong>{$grace} jours</strong>.</li>
  <li><strong>Fin de la période de grâce</strong> — l'espace passe en <strong>lecture seule</strong>.
      Les données restent intégralement présentes et consultables. Rien n'est supprimé.</li>
  <li><strong>Conservation de {$retention} jours</strong> — à compter du passage en lecture seule,
      les données sont conservées <strong>{$retention} jours</strong>. Pendant tout ce délai,
      l'espace reste consultable et l'export reste possible sur demande.</li>
  <li><strong>Purge</strong> — à l'expiration du délai de conservation, et à cette date seulement,
      les données sont supprimées de manière sécurisée. Une attestation de destruction peut être
      délivrée sur demande écrite.</li>
</ol>
<p>La date de purge est calculée par le serveur, enregistrée sur la licence et affichée dans
l'espace du client. Elle n'est jamais avancée.</p>

<h2>3. Deux avertissements avant toute purge</h2>
<p><strong>Aucune donnée n'est supprimée sans avertissement préalable.</strong> Avant la purge,
{$editeur} adresse au client <strong>deux avertissements distincts</strong> à l'adresse
électronique de l'administrateur de l'espace :</p>
<ul>
  <li>un <strong>premier avertissement</strong>, plusieurs semaines avant la date de purge, qui
      indique la <strong>date exacte</strong> de suppression et rappelle les deux moyens de
      l'éviter : réactiver un abonnement, ou demander un export ;</li>
  <li>un <strong>dernier rappel</strong>, à l'approche immédiate de cette date, au contenu
      identique.</li>
</ul>
<p>Ces avertissements sont également affichés dans l'espace lui-même, de sorte qu'un client qui
n'aurait pas reçu ses messages en soit informé à sa prochaine connexion. Si aucun des deux
avertissements n'a pu être remis, la purge est différée.</p>

<h2>4. Comment éviter la purge</h2>
<ul>
  <li><strong>Réactiver une formule</strong> : le paiement rétablit immédiatement l'écriture et
      l'ensemble des données, sans perte et sans démarche complémentaire.</li>
  <li><strong>Revenir au palier {$gratuit}</strong> : l'espace redevient modifiable dans la limite
      du plafond, et la purge est abandonnée.</li>
  <li><strong>Demander un export</strong> : voir l'article suivant.</li>
</ul>

<h2>5. Export des données à la demande</h2>
<p>Le client peut demander à tout moment un export complet de ses données, <strong>y compris
lorsque son espace est en lecture seule et pendant toute la durée de conservation</strong>. La
fermeture de l'écriture ne ferme jamais le droit à restitution.</p>
<ul>
  <li><strong>Demande</strong> : depuis l'espace, ou par écrit à l'adresse de support, par
      l'administrateur de l'organisation.</li>
  <li><strong>Format</strong> : format structuré et réexploitable, accompagné des pièces jointes
      et documents produits.</li>
  <li><strong>Délai</strong> : l'export est mis à disposition dans un délai raisonnable après la
      demande, et le lien de téléchargement est à durée limitée.</li>
  <li><strong>Coût</strong> : l'export des données du client à la fin du contrat n'est pas
      facturé.</li>
  <li><strong>Filigrane</strong> : les documents exportés depuis un espace au palier {$gratuit} ou
      en lecture seule portent le filigrane annoncé dans les
      <a href="/cgu">conditions générales d'utilisation</a>.</li>
</ul>

<h2>6. Restauration après incident</h2>
<p>En cas de perte imputable à un dysfonctionnement de l'infrastructure de {$editeur}, la
restauration est effectuée à partir de la sauvegarde la plus récente et cohérente. Les
restaurations demandées à la suite d'une suppression volontaire par le client peuvent faire
l'objet d'un devis.</p>

<h2>7. Responsabilités partagées</h2>
<p>{$editeur} assure la sauvegarde de l'infrastructure et des données applicatives. Le client
demeure responsable de l'exactitude des données qu'il saisit et il lui est recommandé de réaliser
des exports réguliers de ses données critiques. La responsabilité de {$editeur} en cas de perte
est encadrée par les <a href="/cgu">conditions générales d'utilisation</a>.</p>
HTML;
    }

    // ─── 11.4 Résiliation ────────────────────────────────────────────────────

    private function resiliation(): string
    {
        $c         = $this->L->config();
        $editeur   = $c['editeur'];
        $gratuit   = $c['gratuit']['nom'];
        $grace     = $this->L->graceJours();
        $retention = $this->L->retentionJours();
        $entete    = $this->entete();

        return <<<HTML
{$entete}

<h2>1. Résiliation à l'initiative du client</h2>
<p>Le client peut résilier son abonnement à tout moment, sans frais ni pénalité, depuis son espace
ou par demande écrite adressée au support par l'administrateur de l'organisation. La résiliation
prend effet à la fin de la période payée en cours ; aucun remboursement au prorata n'est effectué,
sauf disposition légale contraire.</p>
<p>Résilier n'est pas supprimer : la résiliation met fin au paiement, elle ne détruit rien.</p>

<h2>2. Résiliation à l'initiative de {$editeur}</h2>
<p>{$editeur} peut mettre fin au contrat en cas de manquement grave — usage illicite, atteinte à
la sécurité de la plateforme, contournement du système de licence, création de comptes multiples
destinée à cumuler des plafonds — après notification écrite et, sauf urgence caractérisée, mise en
demeure préalable restée sans effet.</p>
<p>Même dans ce cas, la fermeture de l'écriture précède la suppression, le délai de conservation
s'applique, et les deux avertissements prévus par la
<a href="/politique-sauvegarde">politique de sauvegarde</a> sont adressés au client.</p>

<h2>3. Ce qui se passe après la fin du contrat</h2>
<ol>
  <li><strong>Période de grâce de {$grace} jours</strong> : accès complet maintenu ; un paiement
      rétablit l'abonnement sans aucune démarche.</li>
  <li><strong>Lecture seule</strong> : les données restent consultables et exportables ;
      l'écriture est fermée ; rien n'est supprimé.</li>
  <li><strong>Conservation de {$retention} jours</strong> à compter du passage en lecture seule.</li>
  <li><strong>Deux avertissements</strong> avant toute purge, indiquant la date exacte de
      suppression.</li>
  <li><strong>Suppression sécurisée</strong> à l'issue du délai de conservation.</li>
</ol>
<p>Le client peut, à tout moment de cette chronologie, revenir au palier {$gratuit} et conserver
un droit d'écriture dans la limite du plafond, ou réactiver une formule payante et retrouver
l'intégralité de ses droits.</p>

<h2>4. Export des données</h2>
<p>Le droit à l'export est ouvert pendant toute la durée du contrat, pendant la période de grâce,
pendant la lecture seule et pendant tout le délai de conservation. Les modalités, formats et
délais figurent à l'article 5 de la <a href="/politique-sauvegarde">politique de sauvegarde</a>.</p>

<h2>5. Suppression anticipée à la demande du client</h2>
<p>Le client peut demander la suppression anticipée de son espace, avant l'expiration du délai de
conservation. Cette demande, irréversible, est confirmée par écrit et exécutée après un délai de
réflexion, sous réserve des obligations légales de conservation qui s'imposent à {$editeur}
— notamment en matière comptable et fiscale.</p>

<h2>6. Réactivation</h2>
<p>Tant que la purge n'a pas été exécutée, un espace peut être réactivé à tout moment par le
paiement d'une formule. La réactivation restitue <strong>l'intégralité</strong> des données, des
documents et de l'historique, dans l'état où ils se trouvaient. Aucune donnée n'est perdue du fait
de l'interruption.</p>
HTML;
    }

    // ─── 11.6 Bloc protection des données ────────────────────────────────────

    private function blocProtectionDonnees(): string
    {
        $c        = $this->L->config();
        $editeur  = $c['editeur'];
        $solution = $this->L->nomSolution();
        $gratuit  = $c['gratuit']['nom'];
        $retention = $this->L->retentionJours();
        $actif    = ! empty($c['demo']['actif']);
        $etat     = $actif ? 'est accessible' : "n'est pas encore ouverte au public";

        return <<<HTML

<h2>Démonstration publique — aucune collecte de données</h2>
<p>La <strong>démonstration publique</strong> de {$solution} {$etat}. Elle obéit à un régime
particulier qu'il convient d'énoncer explicitement :</p>
<ul>
  <li><strong>Aucune donnée personnelle n'y est collectée.</strong> La démonstration ne demande ni
      inscription, ni nom, ni adresse électronique, ni numéro de téléphone, ni moyen de paiement.
      Aucun formulaire d'identification n'y figure.</li>
  <li><strong>Toutes les données qui y figurent sont fictives.</strong> Les organisations, les
      personnes, les courriers et les documents présentés sont inventés. Ils ne correspondent à
      aucune personne réelle.</li>
  <li><strong>Tout ce qui y est saisi est effacé chaque nuit</strong>, par une remise à zéro
      automatique. Rien de ce qu'un visiteur y saisit n'est conservé, ni analysé, ni rattaché à
      lui.</li>
  <li><strong>Aucun envoi réel n'y est possible</strong> : courrier électronique, WhatsApp, SMS et
      paiement y sont désactivés. Aucun message ne quitte la démonstration.</li>
  <li>Aucun profilage, aucune publicité, aucun traceur commercial n'y est déposé.</li>
</ul>
<p>Il est néanmoins recommandé de ne saisir aucune donnée réelle dans la démonstration : elle est
publique, et un autre visiteur peut voir ce qui y est saisi avant la remise à zéro de la nuit.</p>

<h2>Filigrane et documents produits</h2>
<p>Les documents produits depuis un espace au palier {$gratuit}, depuis la démonstration publique
ou depuis un espace en lecture seule portent un filigrane, annoncé et décrit dans les
<a href="/cgu">conditions générales d'utilisation</a>. Ce filigrane ne contient aucune donnée
personnelle : il mentionne le nom du logiciel et l'adresse de son éditeur, rien d'autre.</p>

<h2>Conservation liée à l'état de l'espace</h2>
<p>Indépendamment des durées légales de conservation énoncées ci-dessus, les données d'un espace
dont l'abonnement a pris fin sont conservées <strong>{$retention} jours</strong> après le passage
en lecture seule, puis supprimées, après <strong>deux avertissements</strong> adressés au client.
Le détail figure dans la <a href="/politique-sauvegarde">politique de sauvegarde</a>. {$editeur}
ne supprime jamais de données sans avertissement préalable.</p>
HTML;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fragments engendrés
    // ─────────────────────────────────────────────────────────────────────────

    /** En-tête commun : version et date, exigées par la section 12.7. */
    private function entete(): string
    {
        $v    = self::VERSION;
        $date = $this->dateMaj();
        $ed   = $this->L->config()['editeur'];

        return "<p><em>Version {$v} — mise à jour le {$date} — {$ed}</em></p>\n"
             . "<p><em>Les durées, plafonds et droits énoncés dans ce document sont ceux appliqués "
             . "par le serveur au jour de sa consultation. Ils ne sont pas recopiés à la main : "
             . "ils proviennent de la configuration de licence du service.</em></p>";
    }

    /**
     * Tableau des six états, en langage simple.
     *
     * Les libellés d'état viennent de la liste officielle du moteur ; les droits
     * viennent de la table `droits_par_etat` de la configuration. Aucun n'est
     * décidé ici : ce tableau ne peut donc pas contredire le comportement réel.
     */
    public function tableauEtats(): string
    {
        $c       = $this->L->config();
        $gratuit = $c['gratuit']['nom'];
        $grace   = $this->L->graceJours();
        $essai   = $this->L->essaiJours();
        $ret     = $this->L->retentionJours();
        $resume  = $this->L->resumePlafond();

        $libelles = [
            'DEMO'    => ['Démonstration publique', "Le vrai logiciel avec des données fictives, sans inscription, remis à zéro chaque nuit."],
            'FREE'    => [$gratuit,                 "Palier gratuit, sans date de fin, plafonné à {$resume}."],
            'TRIAL'   => ['Essai',                  "Évaluation d'une formule payante pendant {$essai} jours, sans carte bancaire."],
            'ACTIVE'  => ['Abonnement en cours',    "Formule payante en cours de validité."],
            'GRACE'   => ['Période de grâce',       "Les {$grace} jours qui suivent l'échéance : l'accès reste complet."],
            'EXPIRED' => ['Lecture seule',          "L'écriture est fermée, les données restent consultables et exportables, et sont conservées {$ret} jours."],
        ];

        $lignes = '';

        foreach (LicenceService::ETATS as $etat) {
            [$nom, $desc] = $libelles[$etat];
            $d            = $this->L->droits($etat);

            $ecriture  = $d['ecriture'] ? 'Ouverte' : 'Fermée (lecture seule)';
            $avancees  = $d['export'] ? 'Ouvertes' : 'Fermées';
            $plafonne  = $d['quotas'] ? 'Oui' : 'Non';
            $filigrane = $d['filigrane'] ? 'Oui' : 'Non';

            $lignes .= "<tr>"
                . "<td style=\"padding:8px;border:1px solid #e9d5ff\"><strong>{$nom}</strong><br><span style=\"font-size:13px\">{$desc}</span></td>"
                . "<td style=\"padding:8px;border:1px solid #e9d5ff\">{$ecriture}</td>"
                . "<td style=\"padding:8px;border:1px solid #e9d5ff\">{$avancees}</td>"
                . "<td style=\"padding:8px;border:1px solid #e9d5ff\">{$plafonne}</td>"
                . "<td style=\"padding:8px;border:1px solid #e9d5ff\">{$filigrane}</td>"
                . "</tr>\n";
        }

        return "<table style=\"width:100%;border-collapse:collapse;font-size:14px\">\n"
            . "<tr style=\"background:#faf5ff\">"
            . "<td style=\"padding:8px;border:1px solid #e9d5ff\"><strong>État de l'espace</strong></td>"
            . "<td style=\"padding:8px;border:1px solid #e9d5ff\"><strong>Écriture</strong></td>"
            . "<td style=\"padding:8px;border:1px solid #e9d5ff\"><strong>Export, interface de programmation, multi-utilisateur, assistant IA</strong></td>"
            . "<td style=\"padding:8px;border:1px solid #e9d5ff\"><strong>Plafonné</strong></td>"
            . "<td style=\"padding:8px;border:1px solid #e9d5ff\"><strong>Filigrane</strong></td>"
            . "</tr>\n{$lignes}</table>";
    }

    /** Liste des plafonds, un par compteur métier. */
    public function listePlafonds(): string
    {
        $items = '';

        foreach ($this->L->plafonds() as $compteur => $plafond) {
            $periode = $this->L->estMensuel($compteur) ? 'par mois' : 'au total';
            $libelle = str_replace('_', ' ', preg_replace('/_mois$/', '', $compteur));

            $items .= "<li><strong>{$plafond}</strong> {$libelle} {$periode}</li>\n";
        }

        return $items === '' ? '<p>Aucun plafond n\'est appliqué.</p>' : "<ul>\n{$items}</ul>";
    }

    private function listeSimple(array $lignes): string
    {
        if ($lignes === []) {
            return '';
        }

        $items = '';

        foreach ($lignes as $ligne) {
            $items .= '<li>' . e($ligne) . "</li>\n";
        }

        return "<ul>\n{$items}</ul>";
    }

    /**
     * Mention de la formule payante immédiatement supérieure.
     *
     * Le prix vient de la table `plans` — la seule vérité tarifaire. S'il est
     * indisponible, la phrase est omise : mieux vaut ne rien dire qu'afficher un
     * prix deviné dans un document contractuel.
     */
    private function formuleSuivante(): string
    {
        try {
            $f = $this->L->formuleSuivante();
        } catch (\Throwable) {
            return '';
        }

        if (empty($f['nom'])) {
            return '';
        }

        $nom  = e($f['nom']);
        $prix = isset($f['prix']) && $f['prix'] !== null
            ? ' à partir de ' . number_format((float) $f['prix'], 0, ',', ' ') . ' FCFA'
            : '';

        return " La première formule payante est <strong>{$nom}</strong>{$prix} ; la grille"
             . ' complète et à jour est publiée sur la page des formules.';
    }
}
