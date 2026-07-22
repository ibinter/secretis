<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FaqSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        $faqs = [
            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Général (10 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Qu\'est-ce qu\'IBIG SECRETIS ?',
                'answer'     => 'IBIG SECRETIS est un ERP SaaS (logiciel de gestion en ligne) conçu pour les organisations africaines souhaitant digitaliser leur fonctionnement administratif. Il centralise la gestion du courrier, des réunions, des tâches, de la GED et des ressources humaines dans une seule plateforme. La solution est hébergée dans le cloud et accessible depuis n\'importe quel navigateur. Elle intègre également SARA, une assistante IA qui accompagne les utilisateurs au quotidien.',
                'category'   => 'Général',
                'keywords'   => json_encode(['ERP', 'SaaS', 'SECRETIS', 'IBIG', 'présentation', 'plateforme']),
                'is_public'  => true,
                'sort_order' => 1,
            ],
            [
                'question'   => 'À qui s\'adresse IBIG SECRETIS ?',
                'answer'     => 'IBIG SECRETIS s\'adresse aux PME, ONG, administrations publiques, collectivités territoriales et grandes entreprises opérant en Afrique. Il est particulièrement adapté aux structures souhaitant moderniser leur gestion administrative sans investissements informatiques lourds. La plateforme convient aussi bien aux équipes de 5 personnes qu\'aux organisations de plusieurs centaines d\'utilisateurs. Chaque abonnement est dimensionné selon la taille et les besoins de l\'organisation.',
                'category'   => 'Général',
                'keywords'   => json_encode(['cible', 'PME', 'ONG', 'administration', 'entreprise', 'Afrique']),
                'is_public'  => true,
                'sort_order' => 2,
            ],
            [
                'question'   => 'Quelle est la différence entre IBIG SECRETIS et un ERP classique ?',
                'answer'     => 'Contrairement aux ERP traditionnels qui nécessitent une installation sur des serveurs internes et des mois de déploiement, IBIG SECRETIS est accessible immédiatement en ligne. Il ne requiert aucune infrastructure informatique locale et les mises à jour sont automatiques. Sa conception est centrée sur les flux administratifs et documentaires propres au contexte africain (courriers officiels, comptes rendus, hiérarchies administratives). Le rapport qualité-prix est nettement plus avantageux pour les structures de taille moyenne.',
                'category'   => 'Général',
                'keywords'   => json_encode(['ERP classique', 'différence', 'cloud', 'déploiement', 'avantages']),
                'is_public'  => true,
                'sort_order' => 3,
            ],
            [
                'question'   => 'IBIG SECRETIS est-il adapté au contexte africain ?',
                'answer'     => 'Oui, IBIG SECRETIS a été conçu spécifiquement pour répondre aux réalités africaines. Il supporte les devises locales (FCFA, GNF, XOF, MAD, etc.), fonctionne avec une connexion internet limitée et s\'adapte aux structures hiérarchiques et protocoles administratifs en vigueur sur le continent. La numérotation des courriers, les modèles de documents et les workflows correspondent aux pratiques des administrations africaines. Le support est assuré dans les fuseaux horaires africains.',
                'category'   => 'Général',
                'keywords'   => json_encode(['Afrique', 'contexte', 'FCFA', 'devises', 'administration africaine']),
                'is_public'  => true,
                'sort_order' => 4,
            ],
            [
                'question'   => 'Combien d\'utilisateurs peut-on avoir sur IBIG SECRETIS ?',
                'answer'     => 'Le nombre d\'utilisateurs dépend du plan d\'abonnement choisi. Le plan Starter permet jusqu\'à 10 utilisateurs, le plan Professionnel jusqu\'à 50, et le plan Entreprise est illimité. Des licences supplémentaires peuvent être ajoutées à tout moment depuis le module Paramètres > Abonnement. Chaque utilisateur dispose d\'un compte individuel avec ses propres droits d\'accès configurables par l\'administrateur.',
                'category'   => 'Général',
                'keywords'   => json_encode(['utilisateurs', 'nombre', 'plan', 'licences', 'abonnement']),
                'is_public'  => true,
                'sort_order' => 5,
            ],
            [
                'question'   => 'IBIG SECRETIS fonctionne-t-il sans connexion internet ?',
                'answer'     => 'IBIG SECRETIS est une application web nécessitant une connexion internet pour fonctionner pleinement. Cependant, certaines fonctionnalités sont disponibles en mode hors ligne limité grâce au cache du navigateur. Les données sont synchronisées automatiquement dès que la connexion est rétablie. Pour les zones à faible débit, l\'interface a été optimisée pour consommer un minimum de bande passante.',
                'category'   => 'Général',
                'keywords'   => json_encode(['hors ligne', 'internet', 'connexion', 'faible débit', 'cache']),
                'is_public'  => true,
                'sort_order' => 6,
            ],
            [
                'question'   => 'Peut-on utiliser IBIG SECRETIS sur mobile ou tablette ?',
                'answer'     => 'Oui, IBIG SECRETIS est entièrement responsive et s\'adapte automatiquement aux smartphones et tablettes. Une Progressive Web App (PWA) est disponible pour une expérience proche d\'une application native sans téléchargement depuis un store. Vous pouvez ainsi consulter votre agenda, valider des documents ou répondre à des tâches directement depuis votre téléphone. Une application mobile dédiée Android et iOS est en cours de développement.',
                'category'   => 'Général',
                'keywords'   => json_encode(['mobile', 'tablette', 'responsive', 'PWA', 'smartphone', 'Android', 'iOS']),
                'is_public'  => true,
                'sort_order' => 7,
            ],
            [
                'question'   => 'IBIG SECRETIS est-il disponible en anglais ?',
                'answer'     => 'Oui, IBIG SECRETIS est disponible en français et en anglais. Chaque utilisateur peut choisir sa langue d\'interface depuis ses paramètres de profil. L\'administrateur peut aussi définir une langue par défaut pour toute l\'organisation. D\'autres langues (arabe, portugais, swahili) sont en cours d\'intégration pour couvrir l\'ensemble du continent africain.',
                'category'   => 'Général',
                'keywords'   => json_encode(['anglais', 'langue', 'multilingue', 'français', 'traduction']),
                'is_public'  => true,
                'sort_order' => 8,
            ],
            [
                'question'   => 'Qui est IBIG Soft ?',
                'answer'     => 'IBIG Soft est l\'entreprise éditrice d\'IBIG SECRETIS, spécialisée dans le développement de solutions digitales pour les organisations africaines. Fondée par des ingénieurs africains, IBIG Soft a pour mission de proposer des outils technologiques adaptés aux spécificités du marché africain. L\'entreprise assure le développement, l\'hébergement, la maintenance et le support de la plateforme. Elle collabore avec des partenaires locaux pour accompagner les organisations dans leur transformation digitale.',
                'category'   => 'Général',
                'keywords'   => json_encode(['IBIG Soft', 'éditeur', 'entreprise', 'équipe', 'Afrique']),
                'is_public'  => true,
                'sort_order' => 9,
            ],
            [
                'question'   => 'Qu\'est-ce que SARA ?',
                'answer'     => 'SARA (Secrétaire Administrative et Relationnelle Augmentée) est l\'assistante IA intégrée à IBIG SECRETIS. Elle aide les utilisateurs à rédiger des courriers, extraire des décisions de comptes rendus, planifier des réunions, rechercher des documents et répondre à des questions sur l\'utilisation de la plateforme. SARA est propulsée par des modèles de langage avancés (Groq, OpenAI ou Anthropic selon votre configuration). Son utilisation est soumise aux conditions d\'abonnement de votre plan.',
                'category'   => 'Général',
                'keywords'   => json_encode(['SARA', 'IA', 'assistante', 'intelligence artificielle', 'chatbot']),
                'is_public'  => true,
                'sort_order' => 10,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Connexion & Sécurité (10 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment me connecter à IBIG SECRETIS ?',
                'answer'     => 'Accédez à l\'URL de votre organisation (ex : votreorganisation.secretis.africa) et saisissez votre adresse email professionnelle et votre mot de passe. Si c\'est votre première connexion, utilisez le lien d\'invitation reçu par email pour définir votre mot de passe. En cas de double authentification activée, un code vous sera envoyé par SMS ou application d\'authentification. Vos identifiants sont personnels et ne doivent pas être partagés.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['connexion', 'login', 'mot de passe', 'email', 'authentification']),
                'is_public'  => true,
                'sort_order' => 11,
            ],
            [
                'question'   => 'J\'ai oublié mon mot de passe, que faire ?',
                'answer'     => 'Sur la page de connexion, cliquez sur "Mot de passe oublié ?" et saisissez votre adresse email. Un lien de réinitialisation vous sera envoyé dans les 5 minutes. Ce lien est valable 60 minutes et à usage unique. Si vous ne recevez pas l\'email, vérifiez vos spams ou contactez votre administrateur qui peut réinitialiser votre mot de passe depuis le module Paramètres > Utilisateurs.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['mot de passe', 'oublié', 'réinitialisation', 'email', 'récupération']),
                'is_public'  => true,
                'sort_order' => 12,
            ],
            [
                'question'   => 'Comment activer la double authentification (2FA) ?',
                'answer'     => 'Rendez-vous dans votre profil (icône en haut à droite) > Sécurité > Double authentification. Vous pouvez choisir entre la réception d\'un code par SMS ou l\'utilisation d\'une application comme Google Authenticator. Scannez le QR code affiché avec votre application et entrez le code à 6 chiffres pour valider l\'activation. La double authentification est fortement recommandée pour les comptes administrateurs.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['2FA', 'double authentification', 'sécurité', 'Google Authenticator', 'SMS']),
                'is_public'  => true,
                'sort_order' => 13,
            ],
            [
                'question'   => 'Mon compte est verrouillé, comment le débloquer ?',
                'answer'     => 'Le compte se verrouille automatiquement après 5 tentatives de connexion échouées pour des raisons de sécurité. Attendez 30 minutes pour un déverrouillage automatique, ou contactez votre administrateur pour un déblocage immédiat depuis Paramètres > Utilisateurs > Action sur le compte. Si vous êtes l\'administrateur, contactez le support IBIG SECRETIS via le portail d\'assistance.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['compte verrouillé', 'déblocage', 'tentatives', 'sécurité']),
                'is_public'  => true,
                'sort_order' => 14,
            ],
            [
                'question'   => 'Comment me déconnecter de tous les appareils simultanément ?',
                'answer'     => 'Dans votre profil > Sécurité > Sessions actives, vous verrez la liste de tous les appareils connectés à votre compte avec leur localisation et date de dernière activité. Cliquez sur "Déconnecter toutes les sessions" pour invalider tous les tokens actifs. Cette action est utile si vous avez perdu un appareil ou suspecté une connexion non autorisée. Vous devrez vous reconnecter sur tous vos appareils après cette opération.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['déconnexion', 'sessions', 'appareils', 'sécurité', 'tokens']),
                'is_public'  => true,
                'sort_order' => 15,
            ],
            [
                'question'   => 'Les données stockées dans SECRETIS sont-elles chiffrées ?',
                'answer'     => 'Oui, toutes les données sont chiffrées en transit via le protocole TLS 1.3 et au repos via AES-256. Les pièces jointes et documents sensibles sont stockés dans un espace cloud sécurisé. Les clés de chiffrement sont gérées séparément des données. Des audits de sécurité réguliers sont effectués par des tiers indépendants pour garantir la conformité aux standards internationaux.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['chiffrement', 'sécurité', 'TLS', 'AES', 'données', 'conformité']),
                'is_public'  => true,
                'sort_order' => 16,
            ],
            [
                'question'   => 'Qui peut voir mes données dans SECRETIS ?',
                'answer'     => 'Vos données sont accessibles uniquement par les utilisateurs de votre organisation selon les permissions qui leur sont attribuées. IBIG Soft n\'accède jamais à vos données opérationnelles sauf demande explicite de votre part pour un support technique, avec traçabilité complète. Les super-administrateurs IBIG ont un accès technique limité à des fins de maintenance. Une politique de confidentialité détaillée est disponible sur notre site.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['confidentialité', 'accès', 'données', 'RGPD', 'vie privée']),
                'is_public'  => true,
                'sort_order' => 17,
            ],
            [
                'question'   => 'Comment changer mon mot de passe ?',
                'answer'     => 'Accédez à votre Profil > Sécurité > Changer le mot de passe. Saisissez votre mot de passe actuel, puis votre nouveau mot de passe deux fois pour confirmation. Le nouveau mot de passe doit contenir au moins 8 caractères dont une majuscule, un chiffre et un caractère spécial. Le changement de mot de passe déconnecte toutes les autres sessions actives par mesure de sécurité.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['mot de passe', 'changement', 'modification', 'sécurité', 'profil']),
                'is_public'  => true,
                'sort_order' => 18,
            ],
            [
                'question'   => 'Peut-on se connecter depuis plusieurs appareils en même temps ?',
                'answer'     => 'Oui, IBIG SECRETIS autorise les connexions simultanées depuis plusieurs appareils (PC, tablette, smartphone). Il n\'y a pas de limite du nombre de sessions parallèles. Cependant, pour des raisons de sécurité, l\'administrateur peut configurer une limite maximale de sessions actives par utilisateur. Vous pouvez visualiser et gérer vos sessions actives depuis votre profil > Sécurité.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['plusieurs appareils', 'sessions', 'connexion simultanée', 'multi-device']),
                'is_public'  => true,
                'sort_order' => 19,
            ],
            [
                'question'   => 'Qu\'est-ce que le journal d\'audit ?',
                'answer'     => 'Le journal d\'audit enregistre toutes les actions importantes effectuées sur la plateforme : connexions, modifications de données, suppressions, changements de paramètres, etc. Chaque entrée contient l\'utilisateur concerné, l\'action réalisée, la date et l\'heure, et l\'adresse IP. Ce journal est accessible aux administrateurs depuis Paramètres > Sécurité > Journal d\'audit. Il est conservé pendant 24 mois et ne peut pas être modifié ni supprimé.',
                'category'   => 'Connexion & Sécurité',
                'keywords'   => json_encode(['journal d\'audit', 'logs', 'traçabilité', 'historique', 'actions']),
                'is_public'  => true,
                'sort_order' => 20,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Gestion des utilisateurs (10 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment inviter un nouveau collaborateur ?',
                'answer'     => 'Depuis Paramètres > Utilisateurs, cliquez sur "Inviter un utilisateur" et renseignez l\'email professionnel, le rôle souhaité et le service de rattachement. Un email d\'invitation est automatiquement envoyé avec un lien valable 72 heures. Le collaborateur doit cliquer sur le lien pour créer son mot de passe et accéder à la plateforme. Les invitations en attente sont visibles dans l\'onglet "Invitations" et peuvent être renvoyées si nécessaire.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['invitation', 'collaborateur', 'nouvel utilisateur', 'email', 'ajout']),
                'is_public'  => true,
                'sort_order' => 21,
            ],
            [
                'question'   => 'Comment attribuer un rôle à un utilisateur ?',
                'answer'     => 'Depuis Paramètres > Utilisateurs, trouvez l\'utilisateur concerné et cliquez sur l\'icône de modification. Dans la liste déroulante "Rôle", sélectionnez le rôle approprié parmi les options disponibles et validez. Le changement de rôle prend effet immédiatement et l\'utilisateur sera informé par notification. L\'attribut de rôle peut aussi être défini lors de l\'invitation initiale.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['rôle', 'attribution', 'permission', 'utilisateur', 'modification']),
                'is_public'  => true,
                'sort_order' => 22,
            ],
            [
                'question'   => 'Comment suspendre temporairement un compte utilisateur ?',
                'answer'     => 'Dans Paramètres > Utilisateurs, cliquez sur les actions (⋮) de l\'utilisateur concerné et sélectionnez "Suspendre le compte". Le compte est immédiatement désactivé et l\'utilisateur ne peut plus se connecter. Toutes ses données et contributions sont conservées intactes. Vous pouvez réactiver le compte à tout moment depuis le même menu. La suspension est différente de la suppression définitive.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['suspension', 'désactiver', 'compte', 'utilisateur', 'bloquer']),
                'is_public'  => true,
                'sort_order' => 23,
            ],
            [
                'question'   => 'Quelle est la différence entre les différents rôles ?',
                'answer'     => 'IBIG SECRETIS propose plusieurs rôles prédéfinis : Super Administrateur (accès complet à tout), Administrateur (gestion de l\'organisation sauf facturation), Manager (gestion de son équipe et module), Employé (accès aux modules attribués en lecture/écriture), et Consultant (accès en lecture seule). Chaque rôle dispose d\'un ensemble de permissions préconfigurées qui peuvent être affinées par module. L\'administrateur peut visualiser la matrice des permissions depuis Paramètres > Rôles.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['rôles', 'permissions', 'administrateur', 'manager', 'différence']),
                'is_public'  => true,
                'sort_order' => 24,
            ],
            [
                'question'   => 'Peut-on créer des rôles personnalisés ?',
                'answer'     => 'Oui, les plans Professionnel et Entreprise permettent de créer des rôles personnalisés depuis Paramètres > Rôles & Permissions. Donnez un nom au rôle et cochez les permissions souhaitées module par module (voir, créer, modifier, supprimer, exporter). Ces rôles personnalisés apparaissent ensuite dans la liste déroulante lors de l\'invitation ou de la modification d\'un utilisateur. Vous pouvez créer jusqu\'à 20 rôles personnalisés.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['rôles personnalisés', 'permissions', 'custom', 'configuration']),
                'is_public'  => true,
                'sort_order' => 25,
            ],
            [
                'question'   => 'Comment consulter l\'historique des connexions d\'un utilisateur ?',
                'answer'     => 'Depuis Paramètres > Utilisateurs, cliquez sur le nom d\'un utilisateur pour ouvrir son profil détaillé. L\'onglet "Historique de connexion" affiche toutes les sessions avec date, heure, adresse IP et appareil utilisé. Les connexions suspectes (pays inhabituel, heure anormale) sont signalées en orange. Ces informations sont également disponibles dans le Journal d\'audit global filtré par utilisateur.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['historique', 'connexions', 'sessions', 'utilisateur', 'logs']),
                'is_public'  => true,
                'sort_order' => 26,
            ],
            [
                'question'   => 'Comment réinitialiser le mot de passe d\'un utilisateur ?',
                'answer'     => 'Dans Paramètres > Utilisateurs, cliquez sur les actions (⋮) de l\'utilisateur et sélectionnez "Réinitialiser le mot de passe". Un email est envoyé à l\'utilisateur avec un lien de réinitialisation valable 60 minutes. Vous pouvez aussi forcer un nouveau mot de passe temporaire que l\'utilisateur devra changer à sa prochaine connexion. Cette action est tracée dans le journal d\'audit.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['réinitialisation', 'mot de passe', 'utilisateur', 'email', 'admin']),
                'is_public'  => true,
                'sort_order' => 27,
            ],
            [
                'question'   => 'Comment désactiver définitivement un compte utilisateur ?',
                'answer'     => 'La désactivation définitive (archivage) est disponible depuis Paramètres > Utilisateurs > Actions > Archiver. Le compte est désactivé et l\'utilisateur libère une licence. Toutes ses données (courriers, tâches, documents) restent accessibles et sont réattribuées à son responsable. Cette action est irréversible depuis l\'interface et nécessite une confirmation. Pour une suppression totale des données, contactez le support.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['suppression', 'archivage', 'désactivation', 'compte', 'licence']),
                'is_public'  => true,
                'sort_order' => 28,
            ],
            [
                'question'   => 'Comment gérer les permissions par module pour un utilisateur ?',
                'answer'     => 'Dans le profil d\'un utilisateur, l\'onglet "Permissions" affiche un tableau modulaire avec des cases à cocher pour chaque action (voir, créer, modifier, supprimer) par module (Courrier, GED, Agenda, Réunions, Tâches, RH). Ces permissions s\'appliquent en plus ou en remplacement des permissions du rôle. Cela permet un contrôle granulaire sans créer de nouveaux rôles. Les permissions héritées du rôle sont affichées en grisé.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['permissions', 'module', 'granulaire', 'accès', 'droits']),
                'is_public'  => true,
                'sort_order' => 29,
            ],
            [
                'question'   => 'Comment organiser les utilisateurs par service ou département ?',
                'answer'     => 'Les services sont configurés depuis Paramètres > Organisation > Structure. Une fois créés, vous pouvez affecter chaque utilisateur à un service lors de l\'invitation ou depuis son profil. L\'arborescence des services permet une hiérarchie à plusieurs niveaux (Direction > Département > Service). Les managers d\'un service ont une visibilité automatique sur les tâches et courriers de leurs membres selon la configuration des permissions.',
                'category'   => 'Gestion des utilisateurs',
                'keywords'   => json_encode(['service', 'département', 'organisation', 'hiérarchie', 'structure']),
                'is_public'  => true,
                'sort_order' => 30,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Paramètres & Configuration (10 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment configurer les informations de mon organisation ?',
                'answer'     => 'Accédez à Paramètres > Organisation et renseignez la raison sociale, l\'adresse complète, les contacts (téléphone, email, site web) et le numéro d\'identification fiscale. Vous pouvez également uploader votre logo officiel qui apparaîtra sur tous les documents générés. Ces informations sont utilisées automatiquement dans les en-têtes de courriers et modèles de documents. Seuls les administrateurs peuvent modifier ces informations.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['organisation', 'configuration', 'raison sociale', 'paramètres', 'informations']),
                'is_public'  => true,
                'sort_order' => 31,
            ],
            [
                'question'   => 'Comment ajouter ou modifier le logo de mon organisation ?',
                'answer'     => 'Dans Paramètres > Organisation, cliquez sur la zone de logo et sélectionnez votre fichier image (PNG, JPG ou SVG, max 2 Mo). Un aperçu s\'affiche immédiatement et vous pouvez recadrer l\'image si nécessaire. Le logo apparaît dans le menu latéral, les emails système et tous les documents générés (courriers, comptes rendus, rapports). Un logo de qualité professionnelle recommandé : fond transparent en PNG, 400x200 px minimum.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['logo', 'image', 'upload', 'organisation', 'branding']),
                'is_public'  => true,
                'sort_order' => 32,
            ],
            [
                'question'   => 'Comment changer la devise principale de mon organisation ?',
                'answer'     => 'Depuis Paramètres > Organisation, dans la section "Localisation", sélectionnez la devise dans la liste déroulante (FCFA, GNF, MAD, EUR, USD, etc.). La devise choisie s\'affiche sur les factures, abonnements et rapports financiers. Le changement de devise n\'affecte pas les données historiques. Pour les organisations multi-devises, vous pouvez définir des devises secondaires depuis le module Comptabilité.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['devise', 'monnaie', 'FCFA', 'localisation', 'paramètres']),
                'is_public'  => true,
                'sort_order' => 33,
            ],
            [
                'question'   => 'Comment configurer les notifications de la plateforme ?',
                'answer'     => 'Accédez à Paramètres > Notifications pour configurer les alertes par événement et par canal (application, email, SMS, WhatsApp). Vous pouvez activer ou désactiver chaque type de notification individuellement. Les préférences personnelles (son, fréquence des digests) sont disponibles dans Profil > Notifications. Les notifications critiques de sécurité ne peuvent pas être désactivées.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['notifications', 'alertes', 'email', 'SMS', 'WhatsApp', 'configuration']),
                'is_public'  => true,
                'sort_order' => 34,
            ],
            [
                'question'   => 'Peut-on gérer plusieurs sites ou agences depuis SECRETIS ?',
                'answer'     => 'Oui, le plan Entreprise permet la gestion multi-sites. Depuis Paramètres > Organisation > Sites, vous pouvez créer autant de sites ou agences que nécessaire, chacun avec son adresse, ses contacts et ses utilisateurs. Les courriers, réunions et documents peuvent être filtrés par site. Les rapports consolidés permettent une vision globale de toute l\'organisation. Chaque site peut avoir son propre sous-domaine.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['multi-sites', 'agences', 'branches', 'organisation', 'entreprise']),
                'is_public'  => true,
                'sort_order' => 35,
            ],
            [
                'question'   => 'Comment configurer le serveur email SMTP pour les envois ?',
                'answer'     => 'Depuis Paramètres > Intégrations > Email SMTP, renseignez l\'hôte SMTP, le port (587 ou 465), l\'email expéditeur, le login et le mot de passe. Cliquez sur "Tester la connexion" pour vérifier la configuration avant de sauvegarder. Si votre organisation utilise Gmail, Outlook ou un serveur Exchange, des guides de configuration dédiés sont disponibles dans notre documentation. Les identifiants SMTP sont stockés de façon chiffrée.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['SMTP', 'email', 'configuration', 'serveur', 'envoi']),
                'is_public'  => true,
                'sort_order' => 36,
            ],
            [
                'question'   => 'Comment changer la langue d\'affichage de la plateforme ?',
                'answer'     => 'La langue par défaut est définie par l\'administrateur dans Paramètres > Organisation > Localisation. Chaque utilisateur peut personnaliser sa propre langue depuis son Profil > Préférences > Langue. Le changement est instantané sans rechargement de page. Actuellement disponibles : français (FR) et anglais (EN). D\'autres langues (arabe, portugais) sont prévues dans les prochaines versions.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['langue', 'traduction', 'localisation', 'français', 'anglais']),
                'is_public'  => true,
                'sort_order' => 37,
            ],
            [
                'question'   => 'Comment configurer les formats de numérotation des références ?',
                'answer'     => 'Depuis Paramètres > Organisation > Numérotation, définissez les formats de référence pour chaque type de document. Le format par défaut est REF-{ANNÉE}-{NUM} mais vous pouvez personnaliser le préfixe (ex : CORR-ENT pour les courriers entrants). Les compteurs peuvent être remis à zéro annuellement ou maintenus en continu. Exemple : CORR-ENT-2025-0001 pour le premier courrier entrant de 2025.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['numérotation', 'référence', 'format', 'préfixe', 'courrier']),
                'is_public'  => true,
                'sort_order' => 38,
            ],
            [
                'question'   => 'Qu\'est-ce qu\'un exercice administratif dans SECRETIS ?',
                'answer'     => 'Un exercice administratif correspond à une période de gestion (généralement une année civile ou fiscale) qui regroupe tous les courriers, réunions et documents de cette période. Il permet de clôturer une période, archiver les données correspondantes et démarrer une nouvelle séquence de numérotation. La clôture d\'un exercice est irréversible. Les données restent consultables en lecture seule après clôture.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['exercice', 'période', 'clôture', 'archivage', 'annuel']),
                'is_public'  => true,
                'sort_order' => 39,
            ],
            [
                'question'   => 'Comment sauvegarder mes paramètres de configuration ?',
                'answer'     => 'Les paramètres sont sauvegardés automatiquement à chaque modification. Vous pouvez aussi exporter l\'intégralité de votre configuration depuis Paramètres > Avancé > Exporter la configuration. Ce fichier JSON peut être utilisé pour restaurer la configuration ou la dupliquer sur une autre instance. Les sauvegardes automatiques des données sont effectuées quotidiennement par IBIG Soft.',
                'category'   => 'Paramètres & Configuration',
                'keywords'   => json_encode(['sauvegarde', 'configuration', 'export', 'backup', 'paramètres']),
                'is_public'  => true,
                'sort_order' => 40,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Agenda (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment créer un événement récurrent dans l\'agenda ?',
                'answer'     => 'Lors de la création d\'un événement, activez l\'option "Récurrence" et choisissez la fréquence (quotidienne, hebdomadaire, mensuelle, annuelle). Vous pouvez définir les jours spécifiques (ex : chaque lundi et mercredi) et une date de fin ou un nombre d\'occurrences. Les événements récurrents affichent un indicateur visuel dans l\'agenda. Modifier un événement récurrent vous propose de modifier "cet événement" ou "tous les événements suivants".',
                'category'   => 'Agenda',
                'keywords'   => json_encode(['récurrence', 'événement', 'agenda', 'hebdomadaire', 'planification']),
                'is_public'  => true,
                'sort_order' => 41,
            ],
            [
                'question'   => 'Comment inviter des participants externes à un événement ?',
                'answer'     => 'Dans le formulaire de création d\'événement, le champ "Participants" accepte les emails internes (liste déroulante des utilisateurs) et externes (saisie libre d\'une adresse email). Les participants externes reçoivent un email d\'invitation avec les détails et un lien de confirmation (accepter/refuser/proposer un autre horaire). Leur statut de réponse est visible depuis l\'événement. Une invitation .ics compatible avec tous les clients email est jointe.',
                'category'   => 'Agenda',
                'keywords'   => json_encode(['invitation', 'participants', 'externe', 'agenda', 'email']),
                'is_public'  => true,
                'sort_order' => 42,
            ],
            [
                'question'   => 'Comment réserver une salle de réunion depuis l\'agenda ?',
                'answer'     => 'Les salles et ressources doivent d\'abord être configurées dans Paramètres > Ressources. Lors de la création d\'un événement, le champ "Ressource / Salle" affiche les salles disponibles pour le créneau choisi en temps réel. La disponibilité est vérifiée automatiquement et les conflits sont signalés. Une fois réservée, la salle est bloquée pour les autres utilisateurs pendant la durée de l\'événement.',
                'category'   => 'Agenda',
                'keywords'   => json_encode(['salle', 'réservation', 'ressource', 'agenda', 'disponibilité']),
                'is_public'  => true,
                'sort_order' => 43,
            ],
            [
                'question'   => 'Comment exporter mon calendrier agenda ?',
                'answer'     => 'Depuis l\'agenda, cliquez sur le bouton "Export" en haut à droite et choisissez la période (semaine, mois, trimestre) et le format (PDF pour impression, ICS pour import dans d\'autres calendriers). L\'export PDF génère une vue imprimable soignée avec votre logo. L\'export ICS est compatible avec Google Calendar, Outlook, Apple Calendar. Les événements confidentiels sont exclus selon vos permissions.',
                'category'   => 'Agenda',
                'keywords'   => json_encode(['export', 'calendrier', 'ICS', 'PDF', 'agenda', 'impression']),
                'is_public'  => true,
                'sort_order' => 44,
            ],
            [
                'question'   => 'Comment synchroniser SECRETIS avec Google Calendar ?',
                'answer'     => 'Depuis Paramètres > Intégrations > Google Calendar, cliquez sur "Connecter avec Google" et autorisez l\'accès. La synchronisation est bidirectionnelle : les événements créés dans SECRETIS apparaissent dans Google Calendar et vice versa. Vous pouvez choisir quels calendriers synchroniser et dans quel sens. La synchronisation se fait en temps réel. Notez que les événements confidentiels de SECRETIS ne sont pas exportés vers Google Calendar.',
                'category'   => 'Agenda',
                'keywords'   => json_encode(['Google Calendar', 'synchronisation', 'intégration', 'calendrier', 'agenda']),
                'is_public'  => true,
                'sort_order' => 45,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Courrier & GED (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment numéroter automatiquement les courriers ?',
                'answer'     => 'La numérotation automatique est activée par défaut et configurée dans Paramètres > Organisation > Numérotation. Lors de l\'enregistrement d\'un courrier entrant ou sortant, un numéro de référence unique est attribué selon le format configuré (ex : CORR-ENT-2025-0001). Le compteur s\'incrémente automatiquement. Vous pouvez saisir un numéro manuel si nécessaire en activant le mode de saisie libre.',
                'category'   => 'Courrier & GED',
                'keywords'   => json_encode(['numérotation', 'courrier', 'référence', 'automatique', 'registre']),
                'is_public'  => true,
                'sort_order' => 46,
            ],
            [
                'question'   => 'Comment rechercher un document ou courrier dans la GED ?',
                'answer'     => 'La barre de recherche universelle (Ctrl+K) permet de chercher dans tous les modules simultanément. Dans la GED spécifiquement, vous disposez d\'une recherche plein texte dans le contenu des documents, ainsi que des filtres par type, date, émetteur, service, et niveau de confidentialité. La recherche dans les pièces jointes (PDF, Word) est possible grâce à l\'indexation OCR automatique des documents téléversés.',
                'category'   => 'Courrier & GED',
                'keywords'   => json_encode(['recherche', 'GED', 'document', 'filtre', 'OCR', 'plein texte']),
                'is_public'  => true,
                'sort_order' => 47,
            ],
            [
                'question'   => 'Comment définir le niveau de confidentialité d\'un document ?',
                'answer'     => 'Lors de la création ou du téléversement d\'un document, un champ "Confidentialité" permet de choisir parmi : Public (tous les utilisateurs), Interne (employés uniquement), Confidentiel (service concerné) ou Secret (personnes désignées). Chaque niveau restreint l\'accès en conséquence. Un document confidentiel affiche un badge de couleur rouge dans la liste. Les tentatives d\'accès non autorisées sont enregistrées dans le journal d\'audit.',
                'category'   => 'Courrier & GED',
                'keywords'   => json_encode(['confidentialité', 'document', 'accès', 'sécurité', 'niveaux']),
                'is_public'  => true,
                'sort_order' => 48,
            ],
            [
                'question'   => 'Comment créer un modèle de document réutilisable ?',
                'answer'     => 'Depuis GED > Modèles > Nouveau modèle, saisissez le titre, le type de document et rédigez le contenu avec l\'éditeur enrichi. Insérez des variables dynamiques via le menu {{variable}} (ex : {{nom_destinataire}}, {{date_du_jour}}, {{logo_organisation}}). Le modèle est disponible pour tous les utilisateurs autorisés. À l\'utilisation, les variables sont remplacées par les valeurs réelles. Vous pouvez créer autant de modèles que nécessaire.',
                'category'   => 'Courrier & GED',
                'keywords'   => json_encode(['modèle', 'document', 'template', 'variables', 'réutilisable']),
                'is_public'  => true,
                'sort_order' => 49,
            ],
            [
                'question'   => 'Comment partager un document de façon sécurisée avec un tiers externe ?',
                'answer'     => 'Depuis la fiche d\'un document, cliquez sur "Partager" et choisissez "Lien sécurisé". Un lien unique avec token est généré, valable pour une durée définie (1h à 30 jours) et optionnellement protégé par un code PIN. Vous pouvez restreindre le partage en lecture seule ou autoriser le téléchargement. Le lien peut être révoqué à tout moment. Chaque accès via ce lien est enregistré avec l\'IP et l\'heure.',
                'category'   => 'Courrier & GED',
                'keywords'   => json_encode(['partage', 'document', 'lien sécurisé', 'externe', 'token']),
                'is_public'  => true,
                'sort_order' => 50,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Réunions (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment générer automatiquement un compte rendu de réunion ?',
                'answer'     => 'Depuis la fiche d\'une réunion terminée, cliquez sur "Générer le compte rendu". SECRETIS produit un document structuré avec l\'en-tête de l\'organisation, la liste des participants, l\'ordre du jour, les points discutés et les décisions prises. Si SARA est activée et que vous avez fourni des notes ou un enregistrement transcrit, elle peut enrichir automatiquement le contenu. Le compte rendu est éditable avant publication.',
                'category'   => 'Réunions',
                'keywords'   => json_encode(['compte rendu', 'réunion', 'génération', 'automatique', 'CR']),
                'is_public'  => true,
                'sort_order' => 51,
            ],
            [
                'question'   => 'Comment utiliser SARA pour extraire les décisions d\'une réunion ?',
                'answer'     => 'Dans la fiche réunion, collez ou importez les notes brutes de la séance dans le champ "Notes de séance", puis cliquez sur "Analyser avec SARA". SARA identifie automatiquement les décisions, les actions à mener, les responsables et les échéances. Les éléments extraits sont présentés pour validation avant insertion dans le compte rendu. Cette fonctionnalité nécessite que l\'intégration IA soit configurée dans Paramètres > Intégrations.',
                'category'   => 'Réunions',
                'keywords'   => json_encode(['SARA', 'IA', 'décisions', 'réunion', 'extraction', 'notes']),
                'is_public'  => true,
                'sort_order' => 52,
            ],
            [
                'question'   => 'Comment faire signer électroniquement un compte rendu ?',
                'answer'     => 'Une fois le compte rendu validé, cliquez sur "Demander les signatures". Sélectionnez les signataires requis (présidents, secrétaires de séance, participants désignés). Chaque signataire reçoit une notification et peut signer depuis son interface avec un clic ou en dessinant sa signature numérique. Le document est verrouillé après la dernière signature et un certificat d\'authenticité est joint. Les signatures sont horodatées et vérifiables.',
                'category'   => 'Réunions',
                'keywords'   => json_encode(['signature électronique', 'compte rendu', 'validation', 'approbation']),
                'is_public'  => true,
                'sort_order' => 53,
            ],
            [
                'question'   => 'Comment envoyer l\'ordre du jour aux participants avant la réunion ?',
                'answer'     => 'Dans la fiche de réunion, onglet "Ordre du jour", rédigez les points à aborder. Cliquez ensuite sur "Envoyer l\'ordre du jour" pour notifier automatiquement tous les participants par email et notification in-app. L\'envoi peut être programmé (ex : 48h avant la réunion). Les participants peuvent commenter les points de l\'ordre du jour avant la réunion. Un rappel automatique est envoyé 30 minutes avant le début.',
                'category'   => 'Réunions',
                'keywords'   => json_encode(['ordre du jour', 'participants', 'notification', 'réunion', 'envoi']),
                'is_public'  => true,
                'sort_order' => 54,
            ],
            [
                'question'   => 'Comment suivre les décisions et actions issues des réunions ?',
                'answer'     => 'Les décisions et actions créées lors d\'une réunion sont automatiquement transformées en tâches dans le module Tâches, avec le responsable et l\'échéance associés. Un tableau de bord "Suivi des décisions" dans le module Réunions affiche l\'état d\'avancement de toutes les actions par réunion. Des rappels automatiques sont envoyés aux responsables à l\'approche des échéances. Les comptes rendus des réunions suivantes incluent un suivi des décisions précédentes.',
                'category'   => 'Réunions',
                'keywords'   => json_encode(['décisions', 'actions', 'suivi', 'tâches', 'réunion']),
                'is_public'  => true,
                'sort_order' => 55,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Tâches (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment utiliser la vue Kanban dans le module Tâches ?',
                'answer'     => 'Dans le module Tâches, cliquez sur l\'icône Kanban en haut à droite pour basculer en vue tableau. Les colonnes représentent les statuts (À faire, En cours, En révision, Terminé) et les cartes représentent les tâches. Glissez-déposez les cartes pour changer leur statut. Vous pouvez personnaliser les colonnes et leurs couleurs depuis les paramètres de vue. La vue Kanban peut être filtrée par projet, responsable ou priorité.',
                'category'   => 'Tâches',
                'keywords'   => json_encode(['Kanban', 'tâches', 'tableau', 'drag and drop', 'statut']),
                'is_public'  => true,
                'sort_order' => 56,
            ],
            [
                'question'   => 'Comment créer des sous-tâches dans SECRETIS ?',
                'answer'     => 'Ouvrez une tâche parente et dans la section "Sous-tâches", cliquez sur "Ajouter une sous-tâche". Chaque sous-tâche a son propre titre, responsable, échéance et statut. La progression de la tâche parente est calculée automatiquement selon le pourcentage de sous-tâches complétées. Les sous-tâches peuvent être converties en tâches indépendantes si nécessaire. La profondeur de l\'arborescence est limitée à 3 niveaux.',
                'category'   => 'Tâches',
                'keywords'   => json_encode(['sous-tâches', 'tâches', 'hiérarchie', 'progression', 'décomposition']),
                'is_public'  => true,
                'sort_order' => 57,
            ],
            [
                'question'   => 'Comment identifier et gérer les tâches en retard ?',
                'answer'     => 'Les tâches dont l\'échéance est dépassée apparaissent en rouge dans toutes les vues. Le tableau de bord principal affiche un widget "Tâches en retard" avec le décompte et les tâches concernées. Des notifications automatiques sont envoyées au responsable et au manager dès qu\'une tâche dépasse son échéance. Le rapport "Performance des tâches" dans le module Rapports analyse les délais moyens et les récurrences.',
                'category'   => 'Tâches',
                'keywords'   => json_encode(['retard', 'tâches', 'échéance', 'notification', 'rapport']),
                'is_public'  => true,
                'sort_order' => 58,
            ],
            [
                'question'   => 'Comment affecter une tâche directement depuis une réunion ?',
                'answer'     => 'Dans le compte rendu d\'une réunion, chaque décision ou action peut être convertie en tâche en un clic. Cliquez sur l\'icône "Créer une tâche" à côté de l\'action, puis renseignez ou confirmez le responsable et l\'échéance (souvent pré-remplis depuis les notes). La tâche est automatiquement liée à la réunion source pour la traçabilité. Elle apparaît immédiatement dans le module Tâches du responsable concerné.',
                'category'   => 'Tâches',
                'keywords'   => json_encode(['tâche', 'réunion', 'affectation', 'action', 'décision']),
                'is_public'  => true,
                'sort_order' => 59,
            ],
            [
                'question'   => 'Comment exporter le diagramme de Gantt de mes projets ?',
                'answer'     => 'Dans la vue Gantt du module Tâches (accessible via l\'icône barre horizontale), cliquez sur "Exporter" et choisissez le format PNG (image haute résolution) ou PDF (document imprimable). Vous pouvez personnaliser la plage de dates, le niveau de détail (projet, tâche, sous-tâche) et les colonnes affichées. L\'export inclut les jalons, les dépendances entre tâches et le chemin critique. La légende de couleurs est personnalisable.',
                'category'   => 'Tâches',
                'keywords'   => json_encode(['Gantt', 'export', 'projet', 'planification', 'diagramme']),
                'is_public'  => true,
                'sort_order' => 60,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Imports & Exports (10 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Quels formats de fichiers sont supportés pour l\'import et l\'export ?',
                'answer'     => 'IBIG SECRETIS supporte l\'import via Excel (.xlsx, .xls) et CSV (.csv). Pour l\'export, les formats disponibles sont PDF, Excel, CSV et JSON selon le module concerné. Les documents de la GED acceptent les formats PDF, Word (.docx), images (JPG, PNG) et archives (.zip). Une liste exhaustive des formats supportés par module est disponible dans la documentation technique.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['formats', 'Excel', 'CSV', 'PDF', 'import', 'export']),
                'is_public'  => true,
                'sort_order' => 61,
            ],
            [
                'question'   => 'Comment importer des contacts depuis un fichier Excel ?',
                'answer'     => 'Dans le module correspondant (RH pour les employés, Contacts pour les tiers), cliquez sur "Importer" et téléchargez d\'abord le modèle Excel vierge. Remplissez ce modèle avec vos données en respectant les colonnes obligatoires. Re-téléversez le fichier complété et visualisez l\'aperçu avant import. Les lignes en erreur sont signalées et peuvent être corrigées sans relancer l\'import entier.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['import', 'contacts', 'Excel', 'fichier', 'masse']),
                'is_public'  => true,
                'sort_order' => 62,
            ],
            [
                'question'   => 'Comment exporter le registre du courrier entrant et sortant ?',
                'answer'     => 'Dans le module Courrier, appliquez les filtres souhaités (période, type, service) puis cliquez sur "Exporter le registre". Choisissez le format Excel pour un tableau complet ou PDF pour un registre officiel imprimable. L\'export PDF respecte la mise en page réglementaire avec en-tête de l\'organisation, numérotation des pages et signature de l\'administrateur. Les pièces jointes ne sont pas incluses dans l\'export registre.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['registre', 'courrier', 'export', 'Excel', 'PDF']),
                'is_public'  => true,
                'sort_order' => 63,
            ],
            [
                'question'   => 'Comment générer un rapport en format PDF ?',
                'answer'     => 'Dans le module Rapports ou dans chaque module (Tâches, Réunions, Courrier), cliquez sur l\'icône d\'export et sélectionnez "PDF". Le rapport est généré côté serveur et téléchargé automatiquement. Vous pouvez personnaliser l\'en-tête, le pied de page, les colonnes incluses et la plage de dates. Les rapports fréquemment utilisés peuvent être sauvegardés comme "favoris" pour un accès rapide.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['PDF', 'rapport', 'génération', 'export', 'impression']),
                'is_public'  => true,
                'sort_order' => 64,
            ],
            [
                'question'   => 'Comment exporter les données pour la comptabilité ?',
                'answer'     => 'Le module Rapports propose des exports comptables compatibles avec les logiciels courants (Sage, QuickBooks, format FEC). Depuis Rapports > Export Comptabilité, sélectionnez la période et le format cible. L\'export inclut les journaux de bord, les factures et les règlements avec les codes comptables mappés selon votre plan comptable. La configuration du mapping se fait depuis Paramètres > Comptabilité.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['comptabilité', 'export', 'Sage', 'FEC', 'journal', 'financier']),
                'is_public'  => true,
                'sort_order' => 65,
            ],
            [
                'question'   => 'Comment importer des employés en masse dans le module RH ?',
                'answer'     => 'Depuis RH > Employés > Importer, téléchargez le modèle Excel des employés. Ce modèle contient toutes les colonnes requises (matricule, nom, prénom, poste, service, date d\'embauche, email). Après avoir rempli le fichier, re-téléversez-le et vérifiez l\'aperçu d\'import. Les doublons sont détectés automatiquement. Une option "envoyer invitation" créera automatiquement les comptes utilisateurs correspondants.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['import', 'employés', 'RH', 'Excel', 'masse', 'ressources humaines']),
                'is_public'  => true,
                'sort_order' => 66,
            ],
            [
                'question'   => 'Y a-t-il une limite de taille pour les fichiers téléversés ?',
                'answer'     => 'La limite par défaut est de 25 Mo par fichier. Cette limite peut être augmentée jusqu\'à 100 Mo sur les plans Professionnel et Entreprise depuis Paramètres > Stockage. Pour les imports Excel, la limite est de 10 000 lignes par fichier. Les fichiers vidéo ne sont pas supportés directement mais peuvent être liés via URL externe. L\'espace de stockage total est indiqué dans Paramètres > Abonnement > Utilisation.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['limite', 'taille', 'fichier', 'stockage', 'upload']),
                'is_public'  => true,
                'sort_order' => 67,
            ],
            [
                'question'   => 'Comment télécharger le modèle de fichier pour un import ?',
                'answer'     => 'Dans chaque module disposant d\'une fonctionnalité d\'import, un bouton "Télécharger le modèle" est accessible avant l\'étape d\'upload. Ce modèle Excel contient les en-têtes exactes attendues, des exemples sur la première ligne de données et des notes de validation dans les cellules. Il est fortement recommandé d\'utiliser ce modèle officiel pour éviter les erreurs d\'import. Des modèles spécifiques par secteur sont disponibles sur demande.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['modèle', 'template', 'import', 'Excel', 'téléchargement']),
                'is_public'  => true,
                'sort_order' => 68,
            ],
            [
                'question'   => 'Comment récupérer toutes mes données si je résilie mon abonnement ?',
                'answer'     => 'IBIG Soft vous garantit la portabilité totale de vos données. Avant la résiliation, vous pouvez exporter l\'intégralité de vos données depuis Paramètres > Avancé > Export total des données. L\'archive ZIP contient tous vos documents, courriers, contacts et configurations au format standard (JSON + fichiers originaux). Cette opération peut prendre plusieurs heures selon le volume. L\'accès reste disponible 30 jours après la résiliation pour vous permettre de récupérer vos données.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['résiliation', 'données', 'export', 'portabilité', 'RGPD']),
                'is_public'  => true,
                'sort_order' => 69,
            ],
            [
                'question'   => 'Que faire si un import échoue ou produit des erreurs ?',
                'answer'     => 'En cas d\'échec, un rapport d\'erreur détaillé est généré avec le numéro de ligne problématique, le champ en erreur et le message explicatif. Téléchargez ce rapport depuis l\'écran d\'import pour corriger votre fichier. Les imports partiels (avec des lignes valides et d\'autres en erreur) peuvent être finalisés en ne réimportant que les lignes corrigées. Le support peut vous aider à diagnostiquer des erreurs complexes.',
                'category'   => 'Imports & Exports',
                'keywords'   => json_encode(['erreur', 'import', 'rapport', 'diagnostic', 'correction']),
                'is_public'  => true,
                'sort_order' => 70,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Documents & Modèles (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment créer un modèle de lettre ou document officiel ?',
                'answer'     => 'Dans GED > Modèles, cliquez sur "Nouveau modèle" et sélectionnez le type (lettre, note, circulaire, rapport, procès-verbal). L\'éditeur de texte enrichi permet de mettre en forme le document avec des polices, tableaux et images. Définissez les marges, l\'orientation et l\'en-tête/pied de page. Sauvegardez le modèle et définissez les services pouvant l\'utiliser. Les modèles peuvent être verrouillés en modification par les non-administrateurs.',
                'category'   => 'Documents & Modèles',
                'keywords'   => json_encode(['modèle', 'lettre', 'document', 'template', 'officiel']),
                'is_public'  => true,
                'sort_order' => 71,
            ],
            [
                'question'   => 'Comment insérer des variables dynamiques dans un modèle ?',
                'answer'     => 'Dans l\'éditeur de modèle, placez le curseur à l\'endroit souhaité et cliquez sur "Insérer une variable". La liste propose des variables système ({{date_du_jour}}, {{nom_organisation}}, {{logo}}) et des variables métier ({{nom_destinataire}}, {{num_reference}}, {{expediteur_fonction}}). À l\'utilisation du modèle, un formulaire de saisie demande les valeurs des variables personnalisées. Des variables personnalisées peuvent être créées pour chaque type de modèle.',
                'category'   => 'Documents & Modèles',
                'keywords'   => json_encode(['variables', 'dynamiques', 'modèle', 'automatisation', 'template']),
                'is_public'  => true,
                'sort_order' => 72,
            ],
            [
                'question'   => 'Comment ajouter mon logo sur les documents générés ?',
                'answer'     => 'Le logo est automatiquement intégré dans l\'en-tête de tous les documents si vous l\'avez configuré dans Paramètres > Organisation. Dans l\'éditeur de modèles, la variable {{logo_organisation}} insère le logo à l\'emplacement choisi. Vous pouvez ajuster la taille en pixels directement dans l\'éditeur. Pour des mises en page complexes, le module gère l\'en-tête et le pied de page via des zones dédiées indépendantes du corps du document.',
                'category'   => 'Documents & Modèles',
                'keywords'   => json_encode(['logo', 'document', 'en-tête', 'modèle', 'branding']),
                'is_public'  => true,
                'sort_order' => 73,
            ],
            [
                'question'   => 'Comment générer un QR code de vérification sur les documents ?',
                'answer'     => 'Activez l\'option "QR code de vérification" lors de la génération d\'un document officiel. Un QR code unique est inséré automatiquement sur le document, lié à une URL de vérification en ligne. Toute personne scannant ce QR code depuis un smartphone peut vérifier l\'authenticité du document, sa date d\'émission et son statut (valide, révoqué, modifié). Cette fonctionnalité est disponible pour les courriers, comptes rendus et attestations.',
                'category'   => 'Documents & Modèles',
                'keywords'   => json_encode(['QR code', 'vérification', 'authenticité', 'document', 'sécurité']),
                'is_public'  => true,
                'sort_order' => 74,
            ],
            [
                'question'   => 'Peut-on avoir plusieurs modèles pour le même type de document ?',
                'answer'     => 'Oui, vous pouvez créer autant de modèles que nécessaire pour chaque type de document. Par exemple, plusieurs modèles de lettres (lettre formelle, lettre simple, lettre de convocation) ou plusieurs modèles de comptes rendus selon le type de réunion. Un modèle peut être défini "par défaut" pour un type donné. L\'utilisateur choisit le modèle souhaité au moment de la création du document.',
                'category'   => 'Documents & Modèles',
                'keywords'   => json_encode(['modèles', 'multiples', 'document', 'choix', 'template']),
                'is_public'  => true,
                'sort_order' => 75,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Abonnements & Paiements (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment payer mon abonnement par Mobile Money ?',
                'answer'     => 'Depuis Paramètres > Abonnement > Payer, sélectionnez "Mobile Money" comme mode de paiement. Choisissez votre opérateur (Orange Money, MTN MoMo, Wave, Moov Money, Airtel Money selon votre pays). Saisissez votre numéro de téléphone et validez. Une demande de paiement est envoyée sur votre téléphone à confirmer. La transaction est sécurisée et votre abonnement est activé dans les 5 minutes après confirmation.',
                'category'   => 'Abonnements & Paiements',
                'keywords'   => json_encode(['Mobile Money', 'paiement', 'Orange Money', 'MTN', 'Wave', 'abonnement']),
                'is_public'  => true,
                'sort_order' => 76,
            ],
            [
                'question'   => 'Comment obtenir une facture pour mon abonnement ?',
                'answer'     => 'Les factures sont générées automatiquement à chaque renouvellement d\'abonnement et accessibles depuis Paramètres > Facturation > Historique. Vous pouvez télécharger chaque facture en PDF avec les informations fiscales complètes. Pour les organisations nécessitant une facture proforma ou un bon de commande avant paiement, contactez notre service commercial via support@ibigsoft.africa. Les factures peuvent être adressées au nom de votre organisation avec votre numéro fiscal.',
                'category'   => 'Abonnements & Paiements',
                'keywords'   => json_encode(['facture', 'abonnement', 'paiement', 'PDF', 'fiscal']),
                'is_public'  => true,
                'sort_order' => 77,
            ],
            [
                'question'   => 'Que se passe-t-il à l\'expiration de mon abonnement ?',
                'answer'     => 'Trois avertissements sont envoyés avant expiration (7 jours, 3 jours, 1 jour). À la date d\'expiration, l\'accès passe en mode lecture seule pendant 15 jours pour vous permettre de renouveler. Passé ce délai, l\'accès est suspendu mais toutes les données sont conservées pendant 60 jours supplémentaires. Aucune donnée n\'est supprimée avant un total de 75 jours après expiration. Un plan de renouvellement urgent peut être activé par le support.',
                'category'   => 'Abonnements & Paiements',
                'keywords'   => json_encode(['expiration', 'abonnement', 'renouvellement', 'suspension', 'données']),
                'is_public'  => true,
                'sort_order' => 78,
            ],
            [
                'question'   => 'Peut-on changer de plan en cours d\'abonnement ?',
                'answer'     => 'Oui, la mise à niveau (upgrade) vers un plan supérieur est possible à tout moment et prend effet immédiatement. La différence de prix est calculée au prorata du temps restant. La rétrogradation vers un plan inférieur est possible à la date de renouvellement suivante. Si votre nombre d\'utilisateurs actifs dépasse la limite du nouveau plan, une alerte vous demande de réduire le nombre d\'utilisateurs avant de valider la rétrogradation.',
                'category'   => 'Abonnements & Paiements',
                'keywords'   => json_encode(['changement plan', 'upgrade', 'abonnement', 'prorata', 'mise à niveau']),
                'is_public'  => true,
                'sort_order' => 79,
            ],
            [
                'question'   => 'Comment contacter le service de facturation ?',
                'answer'     => 'Le service de facturation est joignable par email à facturation@ibigsoft.africa, par WhatsApp au numéro indiqué sur votre facture, ou via le formulaire de contact de la plateforme (support > Nouveau ticket > Catégorie "Facturation"). Les délais de réponse sont de 24h ouvrées. Pour les organisations avec un contrat entreprise, un gestionnaire de compte dédié est disponible.',
                'category'   => 'Abonnements & Paiements',
                'keywords'   => json_encode(['facturation', 'contact', 'support', 'email', 'WhatsApp']),
                'is_public'  => true,
                'sort_order' => 80,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Sauvegardes (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment déclencher une sauvegarde manuelle de mes données ?',
                'answer'     => 'Les administrateurs peuvent déclencher une sauvegarde immédiate depuis Paramètres > Sauvegardes > Déclencher une sauvegarde maintenant. La sauvegarde est créée en arrière-plan et une notification vous prévient lorsqu\'elle est terminée. Cette fonctionnalité est utile avant une opération importante (import massif, changement de configuration). La sauvegarde manuelle s\'ajoute aux sauvegardes automatiques programmées.',
                'category'   => 'Sauvegardes',
                'keywords'   => json_encode(['sauvegarde', 'manuelle', 'backup', 'données', 'déclenchement']),
                'is_public'  => true,
                'sort_order' => 81,
            ],
            [
                'question'   => 'Où sont stockées les sauvegardes de mes données ?',
                'answer'     => 'Les sauvegardes sont répliquées dans plusieurs datacenters géographiquement distants pour garantir la disponibilité en cas de sinistre. Selon votre plan, les sauvegardes sont stockées dans des serveurs en Afrique (datacenter Dakar, Abidjan ou Nairobi) et répliquées dans un datacenter européen. Vous pouvez consulter l\'emplacement précis depuis Paramètres > Sauvegardes > Informations de stockage.',
                'category'   => 'Sauvegardes',
                'keywords'   => json_encode(['stockage', 'sauvegarde', 'datacenter', 'hébergement', 'réplication']),
                'is_public'  => true,
                'sort_order' => 82,
            ],
            [
                'question'   => 'Comment restaurer mes données depuis une sauvegarde ?',
                'answer'     => 'La restauration est une opération sensible réservée au support IBIG Soft pour éviter les pertes accidentelles de données. Depuis Paramètres > Sauvegardes, identifiez la sauvegarde souhaitée et cliquez sur "Demander une restauration". Un ticket est créé automatiquement et le support vous contacte pour valider et planifier la restauration. La restauration complète d\'une organisation prend généralement 2 à 4 heures.',
                'category'   => 'Sauvegardes',
                'keywords'   => json_encode(['restauration', 'sauvegarde', 'récupération', 'données', 'disaster recovery']),
                'is_public'  => true,
                'sort_order' => 83,
            ],
            [
                'question'   => 'À quelle fréquence les sauvegardes automatiques sont-elles effectuées ?',
                'answer'     => 'Les sauvegardes automatiques sont effectuées selon le plan : quotidiennement sur tous les plans (sauvegarde à 2h du matin, heure de votre fuseau horaire), toutes les 6 heures sur le plan Professionnel, et toutes les heures sur le plan Entreprise. Les sauvegardes sont conservées 30 jours pour les plans Starter et Professionnel, et 90 jours pour le plan Entreprise. Les sauvegardes manuelles ne comptent pas dans cette rétention.',
                'category'   => 'Sauvegardes',
                'keywords'   => json_encode(['fréquence', 'sauvegarde', 'automatique', 'quotidienne', 'rétention']),
                'is_public'  => true,
                'sort_order' => 84,
            ],
            [
                'question'   => 'Comment vérifier qu\'une sauvegarde est valide et complète ?',
                'answer'     => 'Chaque sauvegarde affiche un indicateur de santé dans Paramètres > Sauvegardes > Historique. Une coche verte indique une sauvegarde complète et vérifiée. Les sauvegardes sont automatiquement testées par un processus de vérification d\'intégrité après création. Vous pouvez voir la taille, la date de création, la durée de création et le rapport de vérification. En cas de sauvegarde marquée "incomplète", le support est automatiquement alerté.',
                'category'   => 'Sauvegardes',
                'keywords'   => json_encode(['validation', 'sauvegarde', 'intégrité', 'vérification', 'santé']),
                'is_public'  => true,
                'sort_order' => 85,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : SARA l'assistante IA (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment activer SARA dans IBIG SECRETIS ?',
                'answer'     => 'SARA est activée depuis Paramètres > Intégrations > IA SARA. Sélectionnez votre fournisseur IA (Groq, OpenAI ou Anthropic), renseignez votre clé API et choisissez le modèle à utiliser. Cliquez sur "Tester la connexion" pour valider la configuration. Une fois activée, l\'icône SARA apparaît dans le coin inférieur droit de toutes les pages. Les quotas d\'utilisation sont définis par votre plan d\'abonnement SECRETIS.',
                'category'   => 'SARA',
                'keywords'   => json_encode(['SARA', 'IA', 'activation', 'configuration', 'Groq', 'OpenAI', 'Anthropic']),
                'is_public'  => true,
                'sort_order' => 86,
            ],
            [
                'question'   => 'SARA peut-elle modifier ou supprimer des données dans SECRETIS ?',
                'answer'     => 'Non, SARA est en lecture seule et ne peut pas modifier, créer ou supprimer des données directement. Elle peut suggérer des actions, rédiger des brouillons ou extraire des informations, mais toute modification requiert la validation explicite de l\'utilisateur. SARA n\'a accès qu\'aux données auxquelles l\'utilisateur a lui-même accès selon ses permissions. Cette approche garantit que l\'IA ne peut pas contourner les contrôles d\'accès.',
                'category'   => 'SARA',
                'keywords'   => json_encode(['SARA', 'IA', 'modifications', 'sécurité', 'permissions', 'lecture seule']),
                'is_public'  => true,
                'sort_order' => 87,
            ],
            [
                'question'   => 'Dans quelle langue SARA répond-elle ?',
                'answer'     => 'SARA répond dans la langue utilisée pour lui poser la question. Si vous écrivez en français, elle répond en français ; en anglais, elle répond en anglais. SARA comprend et peut répondre dans une vingtaine de langues dont le français, l\'anglais, l\'arabe, le portugais et l\'espagnol. Pour les documents officiels, SARA génère ses réponses dans la langue de l\'organisation définie dans Paramètres. La qualité des réponses est optimale en français et en anglais.',
                'category'   => 'SARA',
                'keywords'   => json_encode(['SARA', 'langue', 'multilingue', 'français', 'anglais', 'réponse']),
                'is_public'  => true,
                'sort_order' => 88,
            ],
            [
                'question'   => 'Comment SARA accède-t-elle aux données de mon organisation ?',
                'answer'     => 'SARA accède uniquement aux données auxquelles l\'utilisateur connecté a droit selon ses permissions SECRETIS. Elle utilise un système de Retrieval-Augmented Generation (RAG) qui récupère les informations pertinentes dans vos données pour contextualiser ses réponses. Vos données ne sont jamais envoyées aux fournisseurs IA tiers pour l\'entraînement. Seule la requête de l\'utilisateur et le contexte minimal nécessaire sont transmis de façon sécurisée et chiffrée.',
                'category'   => 'SARA',
                'keywords'   => json_encode(['SARA', 'données', 'accès', 'RAG', 'confidentialité', 'IA']),
                'is_public'  => true,
                'sort_order' => 89,
            ],
            [
                'question'   => 'Y a-t-il une limite d\'utilisation de SARA ?',
                'answer'     => 'Les quotas d\'utilisation de SARA dépendent de votre plan : 100 requêtes/mois sur Starter, 1000 requêtes/mois sur Professionnel, illimité sur Entreprise (sous réserve de fair use). L\'utilisation est visible depuis Paramètres > Intégrations > IA SARA > Utilisation du mois. Des crédits supplémentaires peuvent être achetés depuis le module Abonnement. SARA utilise votre propre clé API fournisseur, donc les coûts IA sont aussi soumis aux limites de votre compte fournisseur.',
                'category'   => 'SARA',
                'keywords'   => json_encode(['SARA', 'limite', 'quota', 'utilisation', 'crédits', 'abonnement']),
                'is_public'  => true,
                'sort_order' => 90,
            ],

            // ─────────────────────────────────────────────────────────────────
            // CATÉGORIE : Support (5 FAQ)
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment ouvrir un ticket de support technique ?',
                'answer'     => 'Cliquez sur l\'icône "?" en haut à droite de l\'interface puis sur "Contacter le support". Remplissez le formulaire avec la catégorie du problème, une description détaillée et des captures d\'écran si possible. Un numéro de ticket vous est attribué immédiatement et vous recevez une confirmation par email. Vous pouvez suivre l\'avancement de votre ticket depuis le portail support accessible à support.ibigsoft.africa.',
                'category'   => 'Support',
                'keywords'   => json_encode(['support', 'ticket', 'aide', 'problème', 'contact']),
                'is_public'  => true,
                'sort_order' => 91,
            ],
            [
                'question'   => 'Quels sont les délais de réponse du support ?',
                'answer'     => 'Les délais de réponse varient selon la priorité et le plan : incidents bloquants (P1) sous 4h ouvrées, problèmes majeurs (P2) sous 8h ouvrées, questions et demandes (P3) sous 24h ouvrées. Les clients Entreprise bénéficient d\'un SLA renforcé avec 2h pour les P1 et d\'une ligne d\'urgence disponible 24h/24. Le support est disponible du lundi au vendredi, 8h-18h (UTC+0) et le samedi matin pour les urgences.',
                'category'   => 'Support',
                'keywords'   => json_encode(['support', 'délai', 'SLA', 'réponse', 'priorité']),
                'is_public'  => true,
                'sort_order' => 92,
            ],
            [
                'question'   => 'Peut-on contacter le support par WhatsApp ?',
                'answer'     => 'Oui, un canal WhatsApp Business est disponible pour les questions urgentes et le support de premier niveau. Le numéro WhatsApp est affiché dans Aide > Nous contacter. Ce canal est disponible du lundi au samedi de 8h à 20h (heure d\'Abidjan, UTC+0). Pour les problèmes techniques complexes nécessitant un partage d\'écran ou des logs, le ticket email reste le canal recommandé.',
                'category'   => 'Support',
                'keywords'   => json_encode(['WhatsApp', 'support', 'contact', 'urgence', 'assistance']),
                'is_public'  => true,
                'sort_order' => 93,
            ],
            [
                'question'   => 'Comment accéder au guide utilisateur de SECRETIS ?',
                'answer'     => 'Le guide utilisateur complet est accessible depuis Aide > Documentation ou directement à docs.ibigsoft.africa. Il est organisé par module et contient des tutoriels vidéo, des captures d\'écran annotées et des guides pas à pas. Un guide rapide "Prise en main" est disponible pour les nouveaux utilisateurs. Vous pouvez aussi consulter SARA pour des questions spécifiques sur l\'utilisation de la plateforme.',
                'category'   => 'Support',
                'keywords'   => json_encode(['guide', 'documentation', 'aide', 'tutoriel', 'utilisateur']),
                'is_public'  => true,
                'sort_order' => 94,
            ],
            [
                'question'   => 'Comment soumettre une demande de nouvelle fonctionnalité ?',
                'answer'     => 'Vos idées sont précieuses ! Soumettez vos demandes de fonctionnalités via Aide > Demande de fonctionnalité ou directement sur notre portail idées à ideas.ibigsoft.africa. Vous pouvez soumettre vos idées, voter pour celles d\'autres utilisateurs et suivre leur progression dans notre feuille de route publique. Les demandes les plus votées par la communauté sont priorisées dans nos sprints de développement. Les clients Entreprise bénéficient d\'un canal dédié pour les demandes personnalisées.',
                'category'   => 'Support',
                'keywords'   => json_encode(['fonctionnalité', 'demande', 'idée', 'roadmap', 'vote', 'développement']),
                'is_public'  => true,
                'sort_order' => 95,
            ],

            // ─────────────────────────────────────────────────────────────────
            // 5 FAQ bonus pour atteindre 100
            // ─────────────────────────────────────────────────────────────────
            [
                'question'   => 'Comment personaliser le tableau de bord principal ?',
                'answer'     => 'Le tableau de bord est personnalisable via le bouton "Personnaliser" en haut à droite. Ajoutez, supprimez ou réorganisez les widgets (tâches en cours, courriers récents, agenda du jour, statistiques). Chaque utilisateur a son propre tableau de bord. Les administrateurs peuvent définir un tableau de bord par défaut pour les nouveaux utilisateurs depuis Paramètres > Interface. Les modifications sont sauvegardées automatiquement.',
                'category'   => 'Général',
                'keywords'   => json_encode(['tableau de bord', 'dashboard', 'widgets', 'personnalisation', 'interface']),
                'is_public'  => true,
                'sort_order' => 96,
            ],
            [
                'question'   => 'Comment utiliser la recherche universelle dans SECRETIS ?',
                'answer'     => 'La recherche universelle est accessible via le raccourci Ctrl+K (ou Cmd+K sur Mac) ou en cliquant sur la barre de recherche en haut de l\'interface. Elle parcourt simultanément tous les modules : courriers, documents, contacts, tâches, réunions, employés. Les résultats sont catégorisés et cliquables pour accéder directement à l\'élément. La recherche est indexée en temps réel et supporte les recherches approximatives (tolérance aux fautes de frappe).',
                'category'   => 'Général',
                'keywords'   => json_encode(['recherche', 'universelle', 'Ctrl+K', 'recherche globale', 'navigation']),
                'is_public'  => true,
                'sort_order' => 97,
            ],
            [
                'question'   => 'Comment gérer les notifications push sur mobile ?',
                'answer'     => 'Si vous utilisez SECRETIS depuis votre navigateur mobile, autorisez les notifications lors du premier accès. Pour la PWA installée sur votre écran d\'accueil, les notifications push sont activées automatiquement. Gérez les types de notifications souhaités depuis Profil > Notifications > Mobile. Les notifications critiques (tâches urgentes, courriers importants) peuvent être configurées pour ne pas être silencieuses même en mode "Ne pas déranger".',
                'category'   => 'Général',
                'keywords'   => json_encode(['notifications', 'mobile', 'push', 'PWA', 'alerte']),
                'is_public'  => true,
                'sort_order' => 98,
            ],
            [
                'question'   => 'Comment archiver des données anciennes pour alléger la plateforme ?',
                'answer'     => 'L\'archivage manuel est disponible depuis chaque module via le menu "Actions > Archiver". Les archives sont compressées et restent consultables en lecture seule depuis l\'onglet "Archives" du module concerné. La clôture d\'un exercice administratif archive automatiquement tous les éléments de cette période. Les archives n\'affectent pas votre quota de stockage principal et sont conservées conformément à votre politique de rétention.',
                'category'   => 'Général',
                'keywords'   => json_encode(['archivage', 'archives', 'données', 'exercice', 'stockage']),
                'is_public'  => true,
                'sort_order' => 99,
            ],
            [
                'question'   => 'IBIG SECRETIS est-il conforme au RGPD et aux réglementations africaines ?',
                'answer'     => 'Oui, IBIG SECRETIS est conçu dans le respect du RGPD européen et des réglementations africaines de protection des données (UEMOA, CEDEAO, lois nationales). Chaque organisation peut configurer sa politique de rétention des données et gérer les consentements. Un DPO (Délégué à la Protection des Données) peut être désigné dans les paramètres. IBIG Soft publie un registre de traitement des données accessible sur demande et signe des DPA (Data Processing Agreements) avec ses clients Entreprise.',
                'category'   => 'Général',
                'keywords'   => json_encode(['RGPD', 'conformité', 'données personnelles', 'protection', 'UEMOA', 'DPO']),
                'is_public'  => true,
                'sort_order' => 100,
            ],
        ];

        foreach ($faqs as $faq) {
            DB::table('faqs')->insert(array_merge($faq, [
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }
    }
}
