<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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
    ];

    public function show(string $slug)
    {
        if (Schema::hasTable('legal_pages')) {
            $row = DB::table('legal_pages')->where('slug', $slug)->first();
            if ($row && !empty($row->content)) {
                return view('legal', ['title' => $row->title ?? ucfirst($slug), 'content' => $row->content]);
            }
        }
        $page = self::PAGES[$slug] ?? null;
        abort_unless((bool) $page, 404);
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
}
