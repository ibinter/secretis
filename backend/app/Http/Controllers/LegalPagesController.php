<?php

namespace App\Http\Controllers;

use App\Support\LicenceDocuments;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class LegalPagesController extends Controller
{
    private const PAGES = [
        'mentions-legales' => ['title' => 'Mentions légales', 'content' => <<<'HTML'
<h2>1. Éditeur du site et du service</h2>
<p>Le site <strong>secretis.ibigsoft.com</strong> et le service <strong>SECRETIS ERP</strong> sont édités par :</p>
<p><strong>IBIG Soft</strong><br>
Éditeur de solutions logicielles métiers<br>
Abidjan — République de Côte d'Ivoire<br>
RCCM : N°CI-ABJ-03-2023-B13-05718<br>
NCC (Numéro de Compte Contribuable) : 2302502 V<br>
Email : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a><br>
Site : <a href="https://www.ibigsoft.com">www.ibigsoft.com</a></p>

<h2>2. Directeur de la publication</h2>
<p>Le directeur de la publication est le représentant légal d'IBIG Soft.</p>

<h2>3. Hébergement</h2>
<p>Le service est hébergé sur une infrastructure de serveurs privés virtuels administrée par IBIG Soft, située dans un centre de données professionnel de l'Union européenne, avec chiffrement TLS de bout en bout et sauvegardes chiffrées quotidiennes.</p>

<h2>4. Propriété intellectuelle</h2>
<p>L'ensemble des éléments composant le site et le service SECRETIS ERP — architecture logicielle, code source, textes, graphismes, logos, monogramme « SE », charte violette, icônes, base de données, documentation — est protégé par le droit d'auteur, le droit des marques et le droit des bases de données, conformément aux dispositions de l'Accord de Bangui (OAPI) et du droit ivoirien de la propriété intellectuelle.</p>
<p>Toute reproduction, représentation, modification, adaptation, extraction ou exploitation, totale ou partielle, sans l'autorisation écrite préalable d'IBIG Soft est strictement interdite et constitue une contrefaçon susceptible d'engager la responsabilité civile et pénale de son auteur.</p>

<h2>5. Marques</h2>
<p>« SECRETIS », « SECRETIS ERP », « IBIG Soft », « SARA » ainsi que les logos associés sont des marques et signes distinctifs d'IBIG Soft. Toute utilisation non autorisée est interdite.</p>

<h2>6. Liens hypertextes</h2>
<p>Le site peut contenir des liens vers des sites tiers. IBIG Soft n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu. La création d'un lien vers secretis.ibigsoft.com est libre sous réserve de ne pas porter atteinte à l'image d'IBIG Soft.</p>

<h2>7. Droit applicable</h2>
<p>Le présent site est soumis au droit ivoirien. Tout litige relatif à son utilisation relève, à défaut de résolution amiable, de la compétence des juridictions d'Abidjan.</p>

<h2>8. Nous contacter</h2>
<p>Pour toute question relative au site, au service ou aux présentes mentions : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>. Notre support est disponible 7j/7 de 8h à 22h (GMT).</p>
HTML],

        'cgu' => ['title' => 'Conditions générales d\'utilisation', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — Version 2.0</em></p>

<h2>1. Objet et acceptation</h2>
<p>Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation du service <strong>SECRETIS ERP</strong>, solution de gestion du secrétariat, du courrier et de l'administration d'entreprise, éditée par IBIG Soft et fournie en mode SaaS (logiciel en tant que service).</p>
<p>La création d'un compte, la connexion au service ou l'utilisation de toute fonctionnalité emporte acceptation pleine et entière des présentes CGU. Si vous utilisez le service pour le compte d'une organisation, vous garantissez disposer du pouvoir d'engager celle-ci.</p>

<h2>2. Description du service</h2>
<p>SECRETIS ERP permet notamment : la gestion du courrier entrant et sortant, la gestion électronique de documents (GED), la gestion des visiteurs et de l'accueil, l'agenda et les réunions, les tâches et workflows, les notes de frais, la gestion RH de base, la facturation, les circulaires internes, l'annuaire de contacts, ainsi qu'une assistante IA (« SARA »). Le périmètre exact des fonctionnalités dépend de la formule souscrite.</p>

<h2>3. Compte et sécurité</h2>
<ul>
<li>Chaque organisation dispose d'un espace strictement isolé des autres clients (architecture multi-entreprises).</li>
<li>Les identifiants sont personnels et confidentiels. Vous êtes responsable de toute activité réalisée depuis votre compte.</li>
<li>Vous vous engagez à utiliser un mot de passe robuste et à nous signaler sans délai toute utilisation non autorisée à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>.</li>
<li>IBIG Soft se réserve le droit de suspendre un compte en cas d'atteinte à la sécurité du service.</li>
</ul>

<h2>4. Essai gratuit et abonnement</h2>
<ul>
<li>Toute nouvelle organisation bénéficie d'un <strong>essai gratuit de 14 jours</strong>, sans carte bancaire et sans engagement, limité à un essai par organisation.</li>
<li>À l'issue de l'essai, l'accès complet nécessite la souscription d'une formule payante (mensuelle ou annuelle) parmi celles affichées sur la page Tarifs.</li>
<li>À l'expiration d'une licence, une <strong>période de grâce de 7 jours</strong> est accordée pour permettre le renouvellement ; les données sont intégralement conservées pendant cette période, puis l'accès est suspendu — sans destruction des données.</li>
<li>Les prix sont exprimés en francs CFA (XOF) hors taxes éventuelles ; ils peuvent être révisés avec un préavis d'au moins 30 jours, sans effet rétroactif sur les périodes déjà payées.</li>
</ul>

<h2>5. Paiement</h2>
<p>Le règlement s'effectue par Mobile Money (Orange Money, MTN MoMo, Wave, Moov Money), virement bancaire ou tout autre moyen proposé sur la page de paiement. L'activation de la licence intervient après confirmation fiable du paiement (validation automatique par la passerelle ou validation manuelle de la preuve par nos équipes, sous 24 h ouvrées). Un reçu est délivré pour chaque paiement. <strong>Nous ne vous demanderons jamais votre code secret ou mot de passe.</strong></p>

<h2>6. Obligations de l'utilisateur</h2>
<p>Vous vous interdisez notamment : d'utiliser le service à des fins illicites ; de tenter d'accéder aux données d'une autre organisation ; de contourner les limitations de votre formule ou le système de licence ; d'introduire des contenus malveillants ; de revendre le service sans accord écrit ; de procéder à de l'ingénierie inverse du logiciel.</p>

<h2>7. Données du client</h2>
<p><strong>Vos données vous appartiennent.</strong> IBIG Soft n'acquiert aucun droit de propriété sur les contenus que vous saisissez. Vous pouvez à tout moment demander l'export de vos données dans un format structuré, ou leur suppression définitive à la clôture du compte, sous réserve des obligations légales de conservation. Voir notre <a href="/confidentialite">Politique de confidentialité</a>.</p>

<h2>8. Disponibilité et maintenance</h2>
<p>IBIG Soft met en œuvre des moyens raisonnables pour assurer une disponibilité du service 24h/24 et 7j/7, hors fenêtres de maintenance planifiées (notifiées lorsque possible) et cas de force majeure. Le service est fourni « en l'état » ; aucune disponibilité absolue ne peut être garantie.</p>

<h2>9. Responsabilité</h2>
<p>La responsabilité totale d'IBIG Soft, toutes causes confondues, est limitée au montant effectivement payé par le client au titre des douze (12) derniers mois d'abonnement. IBIG Soft ne saurait être tenue responsable des dommages indirects (perte d'exploitation, perte de chance, atteinte à l'image) ni des dommages résultant d'une mauvaise utilisation du service ou d'un manquement du client à ses obligations de sécurité.</p>

<h2>10. Suspension et résiliation</h2>
<ul>
<li>Le client peut résilier à tout moment ; la résiliation prend effet à la fin de la période payée en cours, sans remboursement prorata sauf disposition légale contraire.</li>
<li>IBIG Soft peut suspendre l'accès en cas de non-paiement (après la période de grâce), de violation grave des CGU ou de risque pour la sécurité de la plateforme.</li>
<li>Après clôture, les données sont conservées 90 jours pour permettre une réactivation ou un export, puis supprimées définitivement.</li>
</ul>

<h2>11. Évolution du service et des CGU</h2>
<p>IBIG Soft améliore continuellement le service. Les CGU peuvent être mises à jour ; la version en vigueur est celle publiée sur cette page, la poursuite de l'utilisation après notification valant acceptation.</p>

<h2>12. Droit applicable et litiges</h2>
<p>Les présentes CGU sont régies par le droit ivoirien et, le cas échéant, par les Actes uniformes OHADA. En cas de litige, les parties rechercheront d'abord une solution amiable ; à défaut, compétence est attribuée aux juridictions d'Abidjan.</p>
HTML],

        'confidentialite' => ['title' => 'Politique de confidentialité', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026</em></p>
<p>IBIG Soft accorde la plus haute importance à la protection de vos données personnelles. La présente politique décrit quelles données nous collectons via SECRETIS ERP, pourquoi, comment nous les protégeons et quels sont vos droits, conformément à la <strong>loi ivoirienne n°2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel (sous le contrôle de l'ARTCI) et, lorsque applicable, au <strong>RGPD</strong> pour nos utilisateurs situés dans l'Union européenne.</p>

<h2>1. Responsable du traitement</h2>
<p>IBIG Soft, Abidjan, Côte d'Ivoire — <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>. Pour les données métiers saisies par votre organisation dans son espace, votre organisation est responsable du traitement et IBIG Soft agit en qualité de sous-traitant.</p>

<h2>2. Données collectées</h2>
<ul>
<li><strong>Données de compte</strong> : nom, email professionnel, téléphone, fonction, organisation, mot de passe (haché, jamais stocké en clair).</li>
<li><strong>Données métiers</strong> : contenus saisis par votre organisation (courriers, documents, contacts, visiteurs, événements…). Ces données restent sous le contrôle exclusif de votre organisation.</li>
<li><strong>Données de facturation</strong> : formule, historique des paiements, références de transaction. <em>Nous ne stockons jamais vos codes secrets Mobile Money ni vos numéros de carte complets.</em></li>
<li><strong>Données techniques</strong> : adresse IP, type de navigateur, journaux de connexion et d'activité (à des fins de sécurité et d'audit).</li>
<li><strong>Échanges avec SARA</strong> : les conversations avec l'assistante IA sont traitées pour fournir la réponse ; elles ne sont jamais utilisées à des fins publicitaires.</li>
</ul>

<h2>3. Finalités et bases légales</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr style="background:#faf5ff"><td style="padding:10px;border:1px solid #e9d5ff"><strong>Finalité</strong></td><td style="padding:10px;border:1px solid #e9d5ff"><strong>Base légale</strong></td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">Fourniture du service, authentification, support</td><td style="padding:10px;border:1px solid #e9d5ff">Exécution du contrat</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">Facturation, reçus, comptabilité</td><td style="padding:10px;border:1px solid #e9d5ff">Obligation légale</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">Sécurité, prévention de la fraude, journaux d'audit</td><td style="padding:10px;border:1px solid #e9d5ff">Intérêt légitime</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">Emails de cycle de vie (bienvenue, échéance, reçus)</td><td style="padding:10px;border:1px solid #e9d5ff">Exécution du contrat</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">Communications commerciales</td><td style="padding:10px;border:1px solid #e9d5ff">Consentement (retirable à tout moment)</td></tr>
</table>

<h2>4. Destinataires et sous-traitants</h2>
<p>Vos données ne sont <strong>jamais vendues</strong>. Elles ne sont accessibles qu'aux personnels habilités d'IBIG Soft (support, exploitation) et à des sous-traitants techniques strictement nécessaires : hébergement des serveurs, acheminement des emails (LWS), et fournisseur d'inférence IA pour SARA (Groq) — ce dernier ne reçoit que le contenu du message à traiter, jamais votre base documentaire.</p>

<h2>5. Durées de conservation</h2>
<ul>
<li>Données de compte et métiers : pendant toute la durée de l'abonnement, puis <strong>90 jours</strong> après clôture (période de restitution), puis suppression définitive.</li>
<li>Données de facturation : 10 ans (obligation comptable OHADA).</li>
<li>Journaux de connexion et d'audit : 12 mois.</li>
</ul>

<h2>6. Sécurité</h2>
<ul>
<li>Chiffrement TLS de toutes les communications ; chiffrement AES-256 des données sensibles au repos.</li>
<li>Isolation stricte de chaque organisation (cloisonnement multi-tenant vérifié par des contrôles serveur systématiques).</li>
<li>Mots de passe hachés (bcrypt), verrouillage après tentatives échouées, alerte en cas de connexion inhabituelle.</li>
<li>Sauvegardes chiffrées quotidiennes avec rotation, plan de reprise d'activité.</li>
<li>Journalisation des accès administrateurs ; le personnel IBIG Soft n'accède à un espace client que pour le support, sur session tracée.</li>
</ul>

<h2>7. Vos droits</h2>
<p>Conformément à la loi n°2013-450 et au RGPD le cas échéant, vous disposez des droits d'<strong>accès</strong>, de <strong>rectification</strong>, d'<strong>effacement</strong>, de <strong>limitation</strong>, d'<strong>opposition</strong> et de <strong>portabilité</strong> de vos données, ainsi que du droit de définir des directives post-mortem. Pour les exercer : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a> (réponse sous 30 jours au plus). Vous pouvez également saisir l'autorité de contrôle compétente (ARTCI en Côte d'Ivoire).</p>

<h2>8. Transferts internationaux</h2>
<p>Lorsque des données transitent hors de votre pays (hébergement UE, services d'inférence IA), IBIG Soft s'assure d'un niveau de protection adéquat par des garanties contractuelles appropriées.</p>

<h2>9. Mineurs</h2>
<p>SECRETIS ERP est un service professionnel destiné aux organisations ; il n'est pas conçu pour les mineurs de moins de 16 ans.</p>

<h2>10. Modifications</h2>
<p>Toute évolution substantielle de cette politique sera notifiée dans l'application ou par email avant son entrée en vigueur.</p>
HTML],

        'cookies' => ['title' => 'Politique cookies', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026</em></p>

<h2>1. Qu'est-ce qu'un cookie ?</h2>
<p>Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site. Il permet notamment de maintenir votre session ouverte et de mémoriser vos préférences.</p>

<h2>2. Les cookies que nous utilisons</h2>
<p>SECRETIS ERP applique une politique de sobriété : <strong>uniquement des cookies techniques strictement nécessaires</strong>, exemptés de consentement.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr style="background:#faf5ff"><td style="padding:10px;border:1px solid #e9d5ff"><strong>Cookie</strong></td><td style="padding:10px;border:1px solid #e9d5ff"><strong>Finalité</strong></td><td style="padding:10px;border:1px solid #e9d5ff"><strong>Durée</strong></td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">secretis_erp_session</td><td style="padding:10px;border:1px solid #e9d5ff">Maintien de la session authentifiée</td><td style="padding:10px;border:1px solid #e9d5ff">Session (2 h d'inactivité)</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">XSRF-TOKEN</td><td style="padding:10px;border:1px solid #e9d5ff">Protection contre les attaques CSRF</td><td style="padding:10px;border:1px solid #e9d5ff">Session</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">remember_web_*</td><td style="padding:10px;border:1px solid #e9d5ff">« Se souvenir de moi » (si activé par vous)</td><td style="padding:10px;border:1px solid #e9d5ff">1 an</td></tr>
<tr><td style="padding:10px;border:1px solid #e9d5ff">cookie-consent</td><td style="padding:10px;border:1px solid #e9d5ff">Mémorisation de votre choix sur le bandeau</td><td style="padding:10px;border:1px solid #e9d5ff">6 mois</td></tr>
</table>

<h2>3. Ce que nous n'utilisons pas</h2>
<ul>
<li>❌ Aucun cookie publicitaire</li>
<li>❌ Aucun traceur de réseaux sociaux</li>
<li>❌ Aucune revente de données de navigation</li>
<li>❌ Aucun profilage à des fins marketing</li>
</ul>

<h2>4. Gérer les cookies</h2>
<p>Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies (menu Paramètres → Confidentialité de Chrome, Firefox, Safari, Edge ou Brave). Attention : le blocage des cookies techniques empêchera la connexion à votre espace SECRETIS, ceux-ci étant indispensables à l'authentification sécurisée.</p>

<h2>5. Contact</h2>
<p>Pour toute question relative à cette politique : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>.</p>
HTML],

        'contrat-licence' => ['title' => 'Contrat de licence', 'content' => <<<'HTML'
<p><em>Contrat de licence d'utilisation SECRETIS ERP — Version 2.0, juillet 2026</em></p>

<h2>1. Parties et objet</h2>
<p>Le présent contrat est conclu entre <strong>IBIG Soft</strong> (« l'Éditeur ») et toute organisation souscriptrice (« le Client »). Il définit les conditions dans lesquelles l'Éditeur concède au Client un droit d'utilisation du logiciel SECRETIS ERP en mode SaaS.</p>

<h2>2. Nature de la licence</h2>
<p>La licence concédée est <strong>non exclusive, non transférable et non cessible</strong>. Elle est strictement limitée :</p>
<ul>
<li>à l'organisation souscriptrice (et ses seuls établissements déclarés) ;</li>
<li>au nombre maximal d'utilisateurs de la formule choisie (Découverte : 3, Essentiel : 10, Pro : 25, Entreprise : illimité) ;</li>
<li>aux modules et au volume de stockage inclus dans la formule ;</li>
<li>à un usage professionnel interne, à l'exclusion de toute revente, sous-licence ou mise à disposition de tiers.</li>
</ul>

<h2>3. Types d'offres</h2>
<p>Sont proposés : l'essai gratuit (14 jours, unique par organisation), les abonnements mensuels et annuels, la licence entreprise ou institution sur devis, la licence multisite et les offres promotionnelles ou partenaires. Une licence provisoire peut être accordée par l'Éditeur dans l'attente d'un paiement, pour une durée maximale de 14 jours.</p>

<h2>4. Durée, renouvellement, expiration</h2>
<ul>
<li>La licence est valable pour la période payée et se renouvelle par nouveau paiement. <strong>Le renouvellement anticipé étend la validité à partir de la date de fin en cours</strong> — jamais à partir de la date de paiement : aucun jour payé n'est perdu.</li>
<li>À l'expiration : période de grâce de 7 jours (accès maintenu), puis suspension de l'accès. Les données du Client sont conservées et restituées intégralement lors de la réactivation ou sur demande d'export.</li>
<li>Le cycle de vie complet est : essai → en attente de paiement → provisoire → active → grâce → expirée → suspendue/révoquée.</li>
</ul>

<h2>5. Vérification de licence</h2>
<p>La validité de la licence est contrôlée exclusivement côté serveur, sur la base de la date serveur. Toute tentative de contournement (modification d'horloge, manipulation d'URL ou de requêtes, altération du client web) constitue une violation du présent contrat pouvant entraîner la révocation immédiate sans remboursement, sans préjudice de poursuites.</p>

<h2>6. Restrictions</h2>
<p>Sont expressément interdits : la décompilation, le désassemblage et l'ingénierie inverse (sauf exceptions légales impératives) ; la copie du logiciel ; le partage d'identifiants en dehors des utilisateurs déclarés ; l'utilisation du service pour développer un produit concurrent ; les tests de charge ou d'intrusion sans autorisation écrite.</p>

<h2>7. Mises à jour et support</h2>
<p>La licence inclut les mises à jour correctives et évolutives de la plateforme, déployées automatiquement, ainsi que le support selon le niveau de la formule (email pour Découverte, standard pour Essentiel, prioritaire pour Pro, accompagnement dédié pour Entreprise). Support : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>, 7j/7 de 8h à 22h GMT.</p>

<h2>8. Réversibilité</h2>
<p>À la fin du contrat, le Client peut exporter l'intégralité de ses données dans un format structuré et réexploitable depuis son espace ou sur simple demande. Passé le délai de restitution de 90 jours après clôture, les données sont détruites de manière sécurisée, attestation sur demande.</p>

<h2>9. Garanties et responsabilité</h2>
<p>L'Éditeur garantit détenir l'ensemble des droits sur le logiciel. La responsabilité de l'Éditeur est plafonnée conformément à l'article 9 des <a href="/cgu">CGU</a>. Le Client demeure seul responsable de la licéité des contenus qu'il traite dans le service.</p>

<h2>10. Résiliation pour manquement</h2>
<p>En cas de manquement grave non réparé dans un délai de 15 jours après mise en demeure, chaque partie peut résilier de plein droit. La révocation pour fraude ou violation du système de licence est immédiate.</p>

<h2>11. Droit applicable</h2>
<p>Le présent contrat est régi par le droit ivoirien et les Actes uniformes OHADA applicables. Compétence : juridictions d'Abidjan, après tentative de règlement amiable.</p>
HTML],

        'conditions-commerciales' => ['title' => 'Conditions commerciales et tarifaires', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718, NCC : 2302502 V</em></p>

<h2>1. Présentation des formules</h2>
<p>SECRETIS ERP est commercialisé en mode SaaS selon quatre formules distinctes : <strong>Découverte</strong> (3 utilisateurs, modules essentiels), <strong>Essentiel</strong> (10 utilisateurs, modules standard), <strong>Pro</strong> (25 utilisateurs, modules avancés + SARA IA), et <strong>Entreprise</strong> (utilisateurs illimités, tous modules, support dédié). Les prix en vigueur sont publiés sur la page Tarifs de secretis.ibigsoft.com et exprimés en francs CFA XOF hors taxes. Une tarification spéciale peut être convenue par devis pour les collectivités, institutions publiques, établissements d'enseignement et associations à but non lucratif reconnus.</p>

<h2>2. Modalités de paiement et activation</h2>
<p>Le règlement s'effectue par Mobile Money (Orange Money CI, MTN MoMo CI, Wave, Moov Money) ou par virement bancaire. L'activation de la licence est conditionnée à la réception et à la validation du paiement : validation automatique pour les passerelles Mobile Money, ou validation manuelle de la preuve de paiement sous 24 heures ouvrées pour les virements. Un reçu numéroté est émis pour chaque transaction. IBIG Soft ne demande jamais de code secret, PIN ou mot de passe à ses clients.</p>

<h2>3. Révision des tarifs et droits acquis</h2>
<p>IBIG Soft se réserve le droit de modifier ses tarifs avec un préavis minimum de 30 jours, communiqué par email et dans l'application. Toute période déjà payée est honorée au tarif souscrit : la révision n'est applicable qu'aux nouvelles souscriptions ou renouvellements postérieurs à son entrée en vigueur. Le présent article est soumis au droit ivoirien et aux dispositions pertinentes de l'Acte uniforme OHADA sur le droit commercial général.</p>
HTML],

        'politique-sauvegarde' => ['title' => 'Politique de sauvegarde des données', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718, NCC : 2302502 V</em></p>

<h2>1. Engagement de sauvegarde</h2>
<p>IBIG Soft met en oeuvre une politique de sauvegarde rigoureuse pour protéger les données de ses clients hébergées dans SECRETIS ERP. Des sauvegardes automatiques chiffrées (AES-256) sont réalisées quotidiennement, avec rétention glissante sur 30 jours. Les sauvegardes sont stockées sur une infrastructure distincte du serveur de production, dans un datacenter de niveau professionnel situé dans l'Union européenne, afin de garantir leur disponibilité même en cas d'incident majeur affectant le site primaire.</p>

<h2>2. Procédure de restauration</h2>
<p>En cas de perte ou d'altération de données imputable à un dysfonctionnement de l'infrastructure IBIG Soft, la restauration est effectuée à partir de la sauvegarde la plus récente et cohérente, dans un délai cible de 4 heures ouvrées après ouverture d'un ticket de support. Les restaurations demandées pour des suppressions volontaires réalisées par le client peuvent faire l'objet d'une prestation de service complémentaire selon devis.</p>

<h2>3. Responsabilités partagées</h2>
<p>IBIG Soft assure la sauvegarde de l'infrastructure et des données applicatives. Le client est responsable de la qualité et de l'exactitude des données qu'il saisit, et est encouragé à effectuer des exports réguliers de ses données critiques via la fonctionnalité d'export disponible dans son espace. La présente politique ne constitue pas une garantie absolue contre toute perte de données ; la responsabilité d'IBIG Soft en cas de perte de données est encadrée par l'article 9 des Conditions Générales d'Utilisation et le droit ivoirien applicable.</p>
HTML],

        'politique-support' => ['title' => 'Politique de support et assistance', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718</em></p>

<h2>1. Niveaux de support selon la formule</h2>
<p>Le support SECRETIS ERP est fourni selon le niveau inclus dans la formule souscrite. La formule <strong>Découverte</strong> inclut un support par email avec temps de réponse cible de 48 heures ouvrées. La formule <strong>Essentiel</strong> bénéficie d'un support email et chat avec réponse cible sous 24 heures ouvrées. La formule <strong>Pro</strong> dispose d'un support prioritaire multicanal (email, chat, WhatsApp) avec réponse cible sous 8 heures ouvrées. La formule <strong>Entreprise</strong> bénéficie d'un accompagnement dédié et d'un numéro de support prioritaire avec réponse cible sous 2 heures ouvrées.</p>

<h2>2. Canaux de contact et horaires</h2>
<p>Le support est joignable à l'adresse <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>, via le module de ticketing intégré à l'application, du lundi au samedi de 8h à 22h (GMT). Les demandes reçues en dehors de ces horaires ou les jours fériés officiels en Côte d'Ivoire sont traitées dès la reprise. IBIG Soft s'engage à accuser réception de tout ticket dans un délai de 2 heures ouvrées.</p>

<h2>3. Périmètre et exclusions</h2>
<p>Le support inclut : l'assistance à l'utilisation des fonctionnalités, la résolution d'incidents liés à l'infrastructure ou au logiciel, le paramétrage initial, et la réponse aux questions de facturation. Il ne couvre pas : les développements spécifiques hors catalogue, la formation approfondie des équipes (prestation distincte sur devis), ni la résolution d'incidents résultant d'une mauvaise utilisation documentée. IBIG Soft publie une base de connaissances et des tutoriels vidéo accessibles gratuitement à tous les abonnés actifs.</p>
HTML],

        'politique-resiliation' => ['title' => 'Politique de résiliation et fin de contrat', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718, NCC : 2302502 V</em></p>

<h2>1. Résiliation à l'initiative du client</h2>
<p>Le client peut résilier son abonnement SECRETIS ERP à tout moment, sans frais ni pénalité, depuis son espace de gestion de compte ou en adressant une demande écrite à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>. La résiliation prend effet à la fin de la période d'abonnement en cours déjà payée ; aucun remboursement prorata n'est effectué pour la période restante, sauf disposition légale contraire ou accord express d'IBIG Soft. Après la date effective de résiliation, un délai de grâce de 7 jours est accordé pour permettre l'export des données.</p>

<h2>2. Résiliation à l'initiative d'IBIG Soft</h2>
<p>IBIG Soft peut suspendre ou résilier l'accès au service en cas de : non-paiement persistant au-delà de la période de grâce de 7 jours ; violation grave ou répétée des Conditions Générales d'Utilisation ou du Contrat de Licence ; activité frauduleuse, tentative de contournement du système de licence, ou usage portant atteinte à la sécurité de la plateforme ou aux droits des tiers. En cas de violation grave, la suspension peut être immédiate, avec notification simultanée.</p>

<h2>3. Sort des données en fin de contrat</h2>
<p>À compter de la date effective de fin de contrat, les données du client sont conservées intégralement pendant une période de restitution de <strong>90 jours</strong>. Durant cette période, le client peut demander l'export complet de ses données dans un format structuré et réexploitable (JSON, CSV, PDF). À l'expiration du délai de 90 jours, les données sont supprimées de manière sécurisée et définitive de tous les supports, et une attestation de destruction peut être délivrée sur demande écrite. Cette disposition est conforme aux obligations du sous-traitant de données au sens de la loi ivoirienne n°2013-450 du 19 juin 2013.</p>
HTML],

        'politique-remboursement' => ['title' => 'Politique de remboursement', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718, NCC : 2302502 V</em></p>

<h2>1. Principe général</h2>
<p>Les abonnements SECRETIS ERP sont conclus pour une durée définie (mensuelle ou annuelle) et sont, en règle générale, non remboursables une fois la période d'abonnement démarrée, conformément aux pratiques standards des services SaaS et au droit commercial ivoirien applicable. L'essai gratuit de 14 jours permet à chaque client de valider l'adéquation du service à ses besoins avant tout engagement financier.</p>

<h2>2. Cas de remboursement</h2>
<p>Un remboursement total ou partiel peut être accordé dans les situations suivantes, sur demande motivée adressée à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a> : (a) double facturation ou erreur technique de facturation imputable à IBIG Soft, constatée et reconnue par nos équipes ; (b) indisponibilité prolongée du service dépassant 72 heures consécutives sur une période mensuelle, hors maintenance planifiée notifiée et cas de force majeure, pour la portion de période affectée ; (c) décision commerciale discrétionnaire d'IBIG Soft dans des situations exceptionnelles dûment documentées. Les demandes doivent être formulées dans les 30 jours suivant le fait générateur.</p>

<h2>3. Procédure et délai</h2>
<p>Les remboursements accordés sont traités dans un délai de 10 jours ouvrés à compter de la décision, par le même moyen de paiement que le paiement initial lorsque cela est techniquement possible. IBIG Soft peut proposer, en alternative au remboursement monétaire et avec l'accord du client, un crédit équivalent applicable sur la prochaine période d'abonnement. La présente politique de remboursement ne restreint pas les droits légaux des consommateurs reconnus par le droit ivoirien.</p>
HTML],

        'traitement-donnees' => ['title' => 'Politique de traitement des données personnelles', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — Conformément à la loi ivoirienne n°2013-450 du 19 juin 2013 (ARTCI). IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718, NCC : 2302502 V.</em></p>

<h2>1. Rôles des parties et double qualité</h2>
<p>Dans le cadre de SECRETIS ERP, IBIG Soft agit en qualité de <strong>responsable de traitement</strong> pour les données de compte et de facturation collectées lors de la souscription et de l'administration du service. Pour les données métiers saisies par l'organisation cliente dans son espace, IBIG Soft agit en qualité de <strong>sous-traitant au sens de la loi n°2013-450</strong>, et l'organisation cliente en qualité de responsable de traitement. Un accord de sous-traitance conforme à la réglementation est réputé conclu par l'acceptation des présentes conditions.</p>

<h2>2. Engagements du sous-traitant (IBIG Soft)</h2>
<p>En qualité de sous-traitant, IBIG Soft s'engage à : traiter les données uniquement sur instruction documentée du client ; garantir la confidentialité stricte des données par des mesures techniques et organisationnelles appropriées (chiffrement AES-256, TLS, contrôle d'accès par rôle, journalisation) ; n'avoir recours à aucun sous-traitant ultérieur sans information préalable du client ; assister le client dans l'exercice des droits des personnes concernées dans des délais compatibles avec les obligations légales (30 jours) ; notifier tout incident de sécurité susceptible d'affecter les données du client dans les meilleurs délais et au plus tard 72 heures après sa détection.</p>

<h2>3. Obligations du client (responsable de traitement)</h2>
<p>En qualité de responsable de traitement des données métiers, le client est seul responsable de la licéité des traitements qu'il réalise via SECRETIS ERP, notamment : de la légalité de la collecte des données de ses propres clients, employés ou partenaires ; du respect des droits d'information, d'accès et d'opposition des personnes concernées ; de la conservation des données dans des délais conformes à la réglementation applicable à son activité ; et de la déclaration de ses traitements à l'ARTCI si requise par la réglementation ivoirienne.</p>
HTML],

        'propriete-intellectuelle' => ['title' => 'Propriété intellectuelle et protection de la marque', 'content' => <<<'HTML'
<p><em>IBIG Soft — RCCM N°CI-ABJ-03-2023-B13-05718 — NCC : 2302502 V</em></p>

<h2>1. Titularité des droits</h2>
<p>L'intégralité des éléments constitutifs du service SECRETIS ERP — code source, architecture logicielle, interfaces graphiques, charte violette distinctive, monogramme « SE », logos, typographies, icônes, bases de données, documentation technique et utilisateur, algorithmes, workflows, et tout développement réalisé par IBIG Soft — est et demeure la propriété exclusive d'IBIG Soft, protégée par le droit d'auteur, le droit des bases de données et le droit des marques, conformément à l'<strong>Accord de Bangui révisé de l'OAPI</strong> et au droit ivoirien de la propriété intellectuelle.</p>

<h2>2. Droits concédés au client</h2>
<p>La souscription à SECRETIS ERP confère au client un droit d'utilisation du service, limité, non exclusif, non transférable et non cessible, défini par le Contrat de Licence. Ce droit ne comprend en aucun cas : le droit de copier, reproduire, modifier ou adapter le logiciel ; le droit de procéder à de la décompilation, du désassemblage ou de l'ingénierie inverse ; le droit d'extraire substantiellement le contenu de la base de données applicative ; ou le droit d'utiliser les marques et signes distinctifs d'IBIG Soft sans autorisation écrite expresse.</p>

<h2>3. Contenu créé par le client</h2>
<p>Les données, documents, textes et fichiers que le client saisit ou importe dans son espace SECRETIS ERP restent sa propriété exclusive. IBIG Soft n'acquiert aucun droit sur ces contenus. La licence concédée par le client à IBIG Soft sur ces contenus est strictement limitée à ce qui est nécessaire à la fourniture du service (stockage, traitement, affichage, sauvegarde). Toute atteinte aux droits de propriété intellectuelle d'IBIG Soft est susceptible d'engager la responsabilité civile et pénale de son auteur devant les juridictions ivoiriennes compétentes.</p>
HTML],

        'protection-marque' => ['title' => 'Protection de la marque IBIG Soft', 'content' => <<<'HTML'
<p><em>IBIG Soft — RCCM N°CI-ABJ-03-2023-B13-05718 — NCC : 2302502 V — Protection par l'OAPI (Accord de Bangui)</em></p>

<h2>1. Marques protégées</h2>
<p>Les dénominations <strong>« IBIG Soft »</strong>, <strong>« SECRETIS »</strong>, <strong>« SECRETIS ERP »</strong>, <strong>« SARA »</strong>, ainsi que les logos, monogrammes, chartes graphiques et signes distinctifs associés, sont des marques commerciales d'IBIG Soft, protégées en tant que telles sur le territoire de la Côte d'Ivoire et dans les États membres de l'Organisation Africaine de la Propriété Intellectuelle (OAPI) en vertu de l'Accord de Bangui révisé. Toute utilisation non expressément autorisée par écrit est strictement interdite.</p>

<h2>2. Usages non autorisés</h2>
<p>Sont notamment interdits sans autorisation écrite préalable d'IBIG Soft : l'utilisation des marques dans une dénomination commerciale, un nom de domaine ou une URL ; l'utilisation des marques dans des supports publicitaires d'une manière qui pourrait créer une confusion sur l'origine ; la création d'un produit ou service susceptible d'être confondu avec SECRETIS ERP ; et tout acte de nature à porter atteinte à la réputation ou à la distinctivité des marques d'IBIG Soft. Les partenaires revendeurs autorisés peuvent utiliser les marques dans le cadre strict défini par leur accord de partenariat.</p>

<h2>3. Signalement et recours</h2>
<p>Toute utilisation contrefaisante ou susceptible de porter atteinte aux droits d'IBIG Soft sur ses marques peut être signalée à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>. IBIG Soft se réserve le droit d'engager toute procédure civile et/ou pénale appropriée devant les juridictions ivoiriennes compétentes, et de saisir l'OAPI pour tout acte de contrefaçon relevant de son ressort. Les décisions de l'OAPI en matière de marques produisent leurs effets dans l'ensemble des États membres conformément à l'Accord de Bangui.</p>
HTML],

        'conditions-essai' => ['title' => "Conditions du programme d'essai gratuit", 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718</em></p>

<h2>1. Caractéristiques de l'essai</h2>
<p>IBIG Soft propose à toute nouvelle organisation un accès à SECRETIS ERP en mode essai gratuit d'une durée de <strong>14 jours calendaires</strong> à compter de la date de création du compte. L'essai est sans engagement financier et ne requiert aucune information de paiement. Il est strictement limité à <strong>une seule période d'essai par organisation</strong> (identifiée par son nom et son email administrateur) ; toute tentative de créer plusieurs comptes d'essai pour la même organisation peut entraîner la suspension de l'ensemble des comptes concernés. Pendant l'essai, les fonctionnalités accessibles correspondent à la formule Pro.</p>

<h2>2. Données pendant et après l'essai</h2>
<p>Les données saisies pendant la période d'essai sont intégralement conservées si l'organisation souscrit un abonnement payant avant l'expiration. À l'expiration de l'essai sans souscription, l'accès est suspendu et les données sont conservées pendant une période supplémentaire de <strong>30 jours</strong> pour permettre une souscription tardive avec récupération des données. Passé ce délai, les données de l'essai sont supprimées définitivement. L'organisation peut demander la suppression anticipée de ses données à tout moment en écrivant à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>.</p>

<h2>3. Conditions d'utilisation et limites</h2>
<p>L'essai est soumis aux Conditions Générales d'Utilisation de SECRETIS ERP. Il est destiné exclusivement à évaluer le service en conditions réelles d'utilisation professionnelle. L'utilisation de l'essai à des fins de contournement du système de licence payante, de test de charge non autorisé, ou de toute activité contraire aux CGU peut entraîner la résiliation immédiate de l'accès. IBIG Soft se réserve le droit de modifier les conditions ou la durée du programme d'essai à tout moment pour les nouvelles inscriptions.</p>
HTML],

        'conditions-sara' => ['title' => "Conditions d'utilisation de SARA (IA)", 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718</em></p>

<h2>1. Description du service SARA</h2>
<p><strong>SARA</strong> (Secrétaire Assistante à Réponse Automatisée) est l'assistante à intelligence artificielle intégrée à SECRETIS ERP. Disponible dans les formules Pro et Entreprise, SARA permet notamment : la génération et la rédaction de courriers professionnels, la synthèse de documents, la formulation de réponses types, et la réponse à des questions relatives aux fonctionnalités du logiciel. SARA s'appuie sur un modèle de langage de grande taille (LLM) fourni par un prestataire tiers spécialisé.</p>

<h2>2. Nature du service et limites</h2>
<p>SARA est un outil d'assistance et d'aide à la rédaction. Les réponses et textes générés par SARA sont des <strong>suggestions que l'utilisateur est seul responsable de valider, vérifier et adapter</strong> avant tout usage. SARA peut produire des contenus inexacts, incomplets ou inadaptés au contexte spécifique du client ; elle ne remplace en aucun cas un conseil juridique, fiscal, comptable, médical ou professionnel qualifié. IBIG Soft ne garantit pas l'exactitude, l'exhaustivité ou la pertinence des réponses de SARA.</p>

<h2>3. Traitement des données et confidentialité</h2>
<p>Les échanges avec SARA sont transmis au prestataire d'inférence uniquement aux fins de traitement et de génération de la réponse. Ces données ne sont pas utilisées pour entraîner des modèles d'IA tiers sans consentement explicite. Les conversations avec SARA peuvent être journalisées côté SECRETIS pour des finalités de sécurité et d'audit interne, conformément à la Politique de confidentialité. L'utilisateur s'engage à ne pas soumettre à SARA de données personnelles sensibles (données de santé, numéros d'identification nationaux, codes d'accès) ou de secrets d'affaires dont la divulgation serait susceptible de causer un préjudice.</p>
HTML],

        'limitation-responsabilite-ia' => ['title' => "Limitation de responsabilité de l'IA", 'content' => <<<'HTML'
<p><em>IBIG Soft — RCCM N°CI-ABJ-03-2023-B13-05718 — NCC : 2302502 V</em></p>

<h2>1. Caractère probabiliste des systèmes d'IA</h2>
<p>Les fonctionnalités d'intelligence artificielle intégrées à SECRETIS ERP, dont l'assistante SARA, reposent sur des modèles de langage probabilistes. Par nature, ces systèmes peuvent produire des résultats inexacts, obsolètes, incohérents ou hallucinés (informations plausibles mais factuellement incorrectes). L'IA ne dispose pas d'une connaissance exhaustive et à jour des réglementations, des pratiques sectorielles, ni du contexte spécifique de chaque organisation. IBIG Soft n'assure aucune garantie quant à l'exactitude, la complétude, la pertinence ou la licéité des contenus générés par les fonctions d'IA du service.</p>

<h2>2. Responsabilité exclusive de l'utilisateur</h2>
<p>L'utilisateur est seul responsable de l'usage qu'il fait des résultats fournis par les fonctions d'IA. Avant tout usage opérationnel — envoi d'un courrier généré, prise de décision basée sur une synthèse automatique, utilisation d'un texte à caractère juridique ou contractuel — il incombe à l'utilisateur ou à un professionnel qualifié de vérifier, valider et si nécessaire adapter le contenu produit. IBIG Soft ne saurait être tenu responsable de tout préjudice direct ou indirect résultant de l'utilisation sans vérification préalable des sorties générées par les fonctions d'IA.</p>

<h2>3. Cadre légal et évolution réglementaire</h2>
<p>L'utilisation des systèmes d'IA dans le cadre de SECRETIS ERP est conforme aux réglementations en vigueur en Côte d'Ivoire au moment de la publication. L'encadrement légal des systèmes d'IA est en évolution rapide au niveau mondial et régional ; IBIG Soft s'engage à adapter ses pratiques en conséquence et à informer ses clients de tout changement substantiel affectant leur utilisation du service. La responsabilité totale d'IBIG Soft au titre des fonctions d'IA est limitée dans les mêmes conditions que celle définie à l'article 9 des Conditions Générales d'Utilisation.</p>
HTML],

        'gestion-compte' => ['title' => 'Gestion et suppression du compte utilisateur', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — Conformément à la loi ivoirienne n°2013-450 du 19 juin 2013 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718</em></p>

<h2>1. Gestion des utilisateurs par l'administrateur</h2>
<p>L'administrateur de compte d'une organisation souscriptrice dispose d'un accès complet au panneau de gestion des utilisateurs, accessible depuis l'espace Paramètres de SECRETIS ERP. Il peut à tout moment : créer et supprimer des comptes utilisateurs dans la limite du quota de sa formule ; modifier les rôles et permissions de chaque utilisateur (Administrateur, Responsable, Agent, Lecture seule) ; réinitialiser les mots de passe ; suspendre temporairement un accès ; et consulter l'historique des connexions de chaque utilisateur à des fins de supervision et d'audit interne.</p>

<h2>2. Droit à l'effacement et suppression de compte</h2>
<p>Conformément à l'article 20 de la loi n°2013-450 et, le cas échéant, à l'article 17 du RGPD, tout utilisateur dispose du droit de demander la suppression de son compte et de ses données personnelles. Cette demande peut être adressée à l'administrateur de son organisation (pour un compte utilisateur ordinaire) ou directement à IBIG Soft à l'adresse <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a> (pour le compte administrateur principal). La suppression est effectuée dans un délai de 30 jours suivant la demande, sous réserve des obligations légales de conservation (données de facturation : 10 ans conformément au droit OHADA). Une confirmation de suppression est envoyée par email.</p>

<h2>3. Sécurité du compte et bonnes pratiques</h2>
<p>Il est fortement recommandé de : utiliser un mot de passe d'au moins 12 caractères combinant majuscules, minuscules, chiffres et caractères spéciaux ; ne jamais partager ses identifiants, y compris avec le support IBIG Soft (nos agents ne vous demanderont jamais votre mot de passe) ; activer la déconnexion automatique sur les appareils partagés ; et signaler immédiatement toute connexion suspecte à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>. IBIG Soft envoie une alerte par email en cas de connexion depuis un appareil ou une localisation inhabituels.</p>
HTML],

        'gestion-reclamations' => ['title' => 'Gestion des réclamations', 'content' => <<<'HTML'
<p><em>Dernière mise à jour : juillet 2026 — IBIG Soft, RCCM N°CI-ABJ-03-2023-B13-05718, NCC : 2302502 V</em></p>

<h2>1. Voies de réclamation</h2>
<p>Tout client ou utilisateur de SECRETIS ERP insatisfait d'une prestation, d'une facturation, d'une décision relative à son compte, ou de toute autre situation liée au service peut adresser une réclamation formelle à IBIG Soft selon les modalités suivantes : (a) par email à <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a> avec l'objet « RÉCLAMATION — [Objet succinct] » ; (b) via le module de ticketing intégré à l'application, en sélectionnant la catégorie « Réclamation » ; (c) par courrier écrit adressé au siège social d'IBIG Soft à Abidjan. Pour être traitée dans les meilleurs délais, la réclamation doit préciser : l'identité du réclamant, le numéro de compte ou d'organisation concerné, la description précise des faits, et les pièces justificatives éventuelles.</p>

<h2>2. Procédure de traitement</h2>
<p>IBIG Soft s'engage à accuser réception de toute réclamation dans un délai de <strong>48 heures ouvrées</strong> et à apporter une réponse de fond dans un délai de <strong>15 jours ouvrés</strong> à compter de la réception du dossier complet. En cas de complexité particulière nécessitant des investigations approfondies, ce délai peut être prolongé jusqu'à 30 jours ouvrés, avec information du réclamant de l'avancement de l'instruction. Chaque réclamation fait l'objet d'un numéro de suivi communiqué au réclamant.</p>

<h2>3. Voies de recours externes</h2>
<p>En l'absence de résolution satisfaisante dans les délais définis, le client peut saisir les voies de recours externes suivantes : (a) l'<strong>ARTCI</strong> (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire) pour toute réclamation relative à la protection des données personnelles ou aux services numériques ; (b) les juridictions compétentes d'Abidjan, après tentative préalable de règlement amiable. IBIG Soft s'engage à coopérer de bonne foi à toute procédure de médiation ou de conciliation proposée par le client, conformément aux principes du droit commercial ivoirien et de l'Acte uniforme OHADA sur la médiation.</p>
HTML],
    ];

    // =========================================================================
    // Documents engendrés par le moteur de licence (cahier §11)
    //
    // POURQUOI ILS PASSENT DEVANT LA BASE ET DEVANT LA CONSTANTE
    // ----------------------------------------------------------
    // Six documents — conditions d'essai, CGU, CGV, CLUF, sauvegarde,
    // résiliation — parlent essentiellement de durées, de plafonds et d'états.
    // Tant qu'ils vivent en HTML figé, chaque modification de
    // `licence.config.json` les rend faux en silence : la vitrine annonce une
    // durée, les CGU en annoncent une autre, et le client conclut que l'éditeur
    // ne maîtrise pas son propre produit (§12, règle fondatrice).
    //
    // Ces six documents sont donc engendrés à la lecture, à partir du moteur.
    // Une ligne restée en base pour l'un d'eux est ignorée : c'est délibéré,
    // c'est la seule façon de garantir qu'aucun chiffre périmé ne survive dans
    // un texte contractuel.
    // =========================================================================

    private function docsLicence(): LicenceDocuments
    {
        return app(LicenceDocuments::class);
    }

    /**
     * Applique le régime licence à un contenu : remplacement complet, ajout d'un
     * bloc, ou passe-plat pour les documents qui ne parlent pas de licence.
     */
    private function contenuLicence(string $slug, ?string $html): ?string
    {
        $docs = $this->docsLicence();

        if ($docs->remplace($slug)) {
            return $docs->html($slug);
        }

        if ($docs->complete($slug) && $html !== null) {
            return $html . $docs->supplement($slug);
        }

        return $html;
    }

    public function show(string $slug)
    {
        $docs = $this->docsLicence();

        if ($docs->remplace($slug)) {
            return view('legal', [
                'title'   => $docs->titre($slug),
                'content' => $docs->html($slug),
            ]);
        }

        if (Schema::hasTable('legal_pages')) {
            $row = DB::table('legal_pages')->where('slug', $slug)->first();
            if ($row && !empty($row->content)) {
                return view('legal', [
                    'title'   => $row->title ?? ucfirst($slug),
                    'content' => $this->contenuLicence($slug, $row->content),
                ]);
            }
        }
        $page = self::PAGES[$slug] ?? null;
        abort_unless((bool) $page, 404);
        $page['content'] = $this->contenuLicence($slug, $page['content']);
        return view('legal', $page);
    }

    public function demoForm()
    {
        $content = '
<p>Vous souhaitez découvrir SECRETIS ERP avec un membre de l\'équipe IBIG Soft ? Remplissez ce formulaire, nous vous recontactons sous 24 h ouvrées.</p>
<form method="POST" action="/demander-demonstration" style="display:grid;gap:14px;margin-top:18px">
<input type="hidden" name="_token" value="' . csrf_token() . '">
<input required name="name" placeholder="Votre nom complet" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<input required type="email" name="email" placeholder="Email professionnel" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<input name="phone" placeholder="Téléphone / WhatsApp" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<input name="company" placeholder="Société / Organisation" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px">
<textarea name="message" rows="4" placeholder="Vos besoins (facultatif)" style="padding:12px;border:1px solid #d8b4fe;border-radius:8px"></textarea>
<button type="submit" style="background:#9333EA;color:#fff;border:none;padding:14px;border-radius:8px;font-weight:bold;font-size:15px;cursor:pointer">Demander ma démonstration</button>
</form>';
        return view('legal', ['title' => 'Demander une démonstration', 'content' => $content]);
    }

    public function demoSubmit(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'phone'   => 'nullable|string|max:50',
            'company' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:2000',
        ]);

        try {
            Mail::raw(
                "Nouvelle demande de démonstration SECRETIS ERP :\n\n"
                . "Nom : {$data['name']}\nEmail : {$data['email']}\n"
                . "Téléphone : " . ($data['phone'] ?? '-') . "\nSociété : " . ($data['company'] ?? '-') . "\n\n"
                . "Message :\n" . ($data['message'] ?? '-'),
                fn ($m) => $m->to('secretis@ibigsoft.com')->replyTo($data['email'])->subject('[SECRETIS] Demande de démonstration — ' . $data['name'])
            );
        } catch (\Throwable $e) {
            report($e);
        }

        $content = '<p style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px">
✅ <strong>Merci ' . e($data['name']) . ' !</strong> Votre demande a bien été envoyée.
Un membre de l\'équipe IBIG Soft vous contactera sous 24 h ouvrées à <strong>' . e($data['email']) . '</strong>.</p>
<p><a href="/">Retour à l\'accueil</a></p>';
        return view('legal', ['title' => 'Demande envoyée', 'content' => $content]);
    }

    // =========================================================================
    // API JSON — consommée par le SPA React (frontend/Pages/Legal/Show.jsx)
    //   GET  /api/v1/legal            → liste des pages publiques
    //   GET  /api/v1/legal/{slug}     → une page
    //   GET  /api/v1/legal/{slug}/pdf → export PDF
    //   POST /api/v1/legal/accept     → enregistre l'acceptation (auth)
    // =========================================================================

    /** Catégorie par défaut pour les entrées du fallback PAGES (constante). */
    private const CATEGORY_MAP = [
        'mentions-legales'            => 'general',
        'cgu'                         => 'usage',
        'confidentialite'            => 'privacy',
        'cookies'                     => 'privacy',
        'contrat-licence'             => 'usage',
        'conditions-commerciales'     => 'commercial',
        'politique-sauvegarde'        => 'support',
        'politique-support'           => 'support',
        'politique-resiliation'       => 'commercial',
        'politique-remboursement'     => 'commercial',
        'traitement-donnees'          => 'privacy',
        'propriete-intellectuelle'    => 'general',
        'protection-marque'           => 'general',
        'conditions-essai'            => 'commercial',
        'conditions-sara'             => 'usage',
        'limitation-responsabilite-ia'=> 'usage',
        'gestion-compte'              => 'privacy',
        'gestion-reclamations'        => 'support',
        'cgv'                         => 'commercial',
    ];

    private const REQUIRES_ACCEPTANCE = ['cgu', 'confidentialite', 'contrat-licence', 'cgv'];

    /**
     * GET /api/v1/legal — Liste des pages légales publiques (métadonnées + contenu).
     */
    public function apiIndex(Request $request)
    {
        // Source prioritaire : table legal_pages (contenu bilingue json)
        if (Schema::hasTable('legal_pages')) {
            $rows = DB::table('legal_pages')
                ->where('is_active', true)
                ->orderBy('display_order')
                ->get();

            if ($rows->isNotEmpty()) {
                $data = $rows->map(fn ($row) => $this->normalizeDbRow($row, $request))->values();
                return response()->json(['data' => $data]);
            }
        }

        // Fallback : constante PAGES, complétée des documents engendrés par le
        // moteur qui n'y figurent pas (les CGV n'ont jamais eu d'entrée dans la
        // constante ; sans cet ajout, elles seraient absentes de la liste alors
        // que la page existe).
        $pages = self::PAGES;

        foreach (LicenceDocuments::REMPLACES as $slug) {
            if (! isset($pages[$slug])) {
                $pages[$slug] = ['title' => $this->docsLicence()->titre($slug), 'content' => ''];
            }
        }

        $data = collect($pages)->map(
            fn ($page, $slug) => $this->normalizeConstPage($slug, $page, $request)
        )->values();

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/v1/legal/{slug} — Détail d'une page légale.
     */
    public function apiShow(Request $request, string $slug)
    {
        if (Schema::hasTable('legal_pages')) {
            $row = DB::table('legal_pages')->where('slug', $slug)->first();
            if ($row) {
                return response()->json(['data' => $this->normalizeDbRow($row, $request)]);
            }
        }

        $page = self::PAGES[$slug]
            ?? ($this->docsLicence()->remplace($slug)
                ? ['title' => $this->docsLicence()->titre($slug), 'content' => '']
                : null);
        abort_unless((bool) $page, 404);

        return response()->json(['data' => $this->normalizeConstPage($slug, $page, $request)]);
    }

    /**
     * GET /api/v1/legal/{slug}/pdf — Export PDF (DomPDF) d'une page légale.
     */
    public function apiPdf(string $slug)
    {
        $title   = null;
        $content = null;
        $version = '1.0';

        if (Schema::hasTable('legal_pages')) {
            $row = DB::table('legal_pages')->where('slug', $slug)->first();
            if ($row) {
                $t       = $this->decodeJson($row->title);
                $c       = $this->decodeJson($row->content);
                $title   = is_array($t) ? ($t['fr'] ?? reset($t)) : $t;
                $content = is_array($c) ? ($c['fr'] ?? reset($c)) : $c;
                $version = $row->version ?? '1.0';
            }
        }

        if ($content === null && ! $this->docsLicence()->remplace($slug)) {
            $page = self::PAGES[$slug] ?? null;
            abort_unless((bool) $page, 404);
            $title   = $page['title'];
            $content = $page['content'];
        }

        // Le PDF est la surface la plus dangereuse : il est téléchargé, archivé
        // et ressorti des mois plus tard. Un chiffre périmé y survit à toutes
        // les corrections faites en ligne. Il est donc engendré comme le reste.
        if ($this->docsLicence()->remplace($slug)) {
            $title   = $this->docsLicence()->titre($slug);
            $version = LicenceDocuments::VERSION;
        }

        $content = $this->contenuLicence($slug, $content);

        // CGU, CGV, politique de confidentialité : documents de l'ÉDITEUR, pas
        // du locataire. Y apposer « Généré avec Secretis ERP » reviendrait à
        // faire signer à l'utilisateur un contrat estampillé comme une sortie
        // d'application. La page est d'ailleurs servie sans authentification.
        $pdf = app('dompdf.wrapper')
            ->sansFiligrane('document contractuel de l\'éditeur, hors périmètre du §3.5')
            ->loadView('pdf.legal', compact('title', 'content', 'version'));
        $pdf->setPaper('A4', 'portrait');
        $pdf->setOption('defaultFont', 'DejaVu Sans');
        $pdf->setOption('isHtml5ParserEnabled', true);

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"SECRETIS-{$slug}.pdf\"",
        ]);
    }

    /**
     * POST /api/v1/legal/accept — Enregistre l'acceptation d'un document (auth requise).
     */
    public function accept(Request $request)
    {
        $data = $request->validate([
            'slug'    => 'required|string|max:100',
            'version' => 'required|string|max:20',
        ]);

        $user = Auth::user();
        abort_unless((bool) $user, 401);

        if (Schema::hasTable('legal_page_acceptances')) {
            DB::table('legal_page_acceptances')->updateOrInsert(
                [
                    'user_id'   => $user->id,
                    'page_slug' => $data['slug'],
                    'version'   => $data['version'],
                ],
                [
                    'ip_address'  => $request->ip(),
                    'user_agent'  => substr((string) $request->userAgent(), 0, 255),
                    'accepted_at' => now(),
                    'updated_at'  => now(),
                    'created_at'  => now(),
                ]
            );
        }

        return response()->json(['message' => 'Acceptation enregistrée.', 'accepted' => true]);
    }

    // ── Helpers de normalisation ──────────────────────────────────────────────

    private function decodeJson($value)
    {
        if (is_array($value)) {
            return $value;
        }
        $decoded = json_decode((string) $value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    /** Normalise une ligne de la table legal_pages vers le format attendu par le SPA. */
    private function normalizeDbRow($row, Request $request): array
    {
        $title   = $this->decodeJson($row->title);
        $content = $this->decodeJson($row->content);

        // Garantir la forme {fr, en}
        if (! is_array($title))   { $title   = ['fr' => (string) $title,   'en' => (string) $title]; }
        if (! is_array($content)) { $content = ['fr' => (string) $content, 'en' => (string) $content]; }

        $docs    = $this->docsLicence();
        $version = $row->version ?? '1.0';

        if ($docs->remplace($row->slug) || $docs->complete($row->slug)) {
            foreach (array_keys($content) as $langue) {
                $content[$langue] = $this->contenuLicence($row->slug, (string) $content[$langue]);
            }

            if ($docs->remplace($row->slug)) {
                $titreOfficiel = $docs->titre($row->slug);
                $title['fr']   = $titreOfficiel;
                $version       = LicenceDocuments::VERSION;
            }
        }

        return [
            'slug'                => $row->slug,
            'title'               => $title,
            'content'             => $content,
            'icon'                => $row->icon ?? null,
            'category'            => $row->category ?? 'general',
            'version'             => $version,
            'requires_acceptance' => (bool) ($row->requires_acceptance ?? false),
            'is_public'           => (bool) ($row->is_public ?? true),
            'effective_date'      => $row->effective_date ?? null,
            'updated_at'          => $row->updated_at ?? null,
            'user_accepted'       => $this->userAccepted($row->slug, $version),
        ];
    }

    /** Normalise une entrée de la constante PAGES vers le format attendu par le SPA. */
    private function normalizeConstPage(string $slug, array $page, Request $request): array
    {
        $docs    = $this->docsLicence();
        $version = $docs->remplace($slug) ? LicenceDocuments::VERSION : '1.0';
        $titre   = $docs->remplace($slug) ? $docs->titre($slug) : $page['title'];
        $contenu = $this->contenuLicence($slug, (string) $page['content']);

        return [
            'slug'                => $slug,
            'title'               => ['fr' => $titre, 'en' => $page['title']],
            'content'             => ['fr' => $contenu, 'en' => $contenu],
            'icon'                => null,
            'category'            => self::CATEGORY_MAP[$slug] ?? 'general',
            'version'             => $version,
            'requires_acceptance' => in_array($slug, self::REQUIRES_ACCEPTANCE, true),
            'is_public'           => true,
            'effective_date'      => null,
            'updated_at'          => null,
            'user_accepted'       => $this->userAccepted($slug, $version),
        ];
    }

    /** Indique si l'utilisateur courant a accepté cette version du document. */
    private function userAccepted(string $slug, string $version): bool
    {
        $user = Auth::user();
        if (! $user || ! Schema::hasTable('legal_page_acceptances')) {
            return false;
        }

        return DB::table('legal_page_acceptances')
            ->where('user_id', $user->id)
            ->where('page_slug', $slug)
            ->where('version', $version)
            ->exists();
    }
}
