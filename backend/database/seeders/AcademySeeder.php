<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * AcademySeeder — Contenu initial de l'Académie IBIG SECRETIS
 *
 * Insère :
 *   - 10 catégories de formation
 *   - ~30 cours répartis dans ces catégories
 *   - ~120 leçons (articles, avec placeholder vidéo)
 *   - ~90 questions de quiz (3 par cours)
 *   - 5 ressources téléchargeables
 *
 * Usage :
 *   php artisan db:seed --class=AcademySeeder
 */
class AcademySeeder extends Seeder
{
    public function run(): void
    {
        DB::table('academy_categories')->delete();
        DB::table('academy_courses')->delete();
        DB::table('academy_lessons')->delete();
        DB::table('academy_quizzes')->delete();
        DB::table('academy_resources')->delete();

        $this->seedCategories();
        $this->seedResources();
    }

    // ─── Catégories & cours ───────────────────────────────────────────────────

    private function seedCategories(): void
    {
        $categories = [
            [
                'slug'  => 'demarrage',
                'name'  => ['fr' => 'Démarrage', 'en' => 'Getting Started'],
                'desc'  => ['fr' => 'Tout ce qu\'il faut savoir pour bien commencer avec SECRETIS.', 'en' => 'Everything you need to get started with SECRETIS.'],
                'icon'  => 'Rocket',
                'color' => '#1E8449',
                'order' => 1,
                'courses' => [
                    [
                        'slug'  => 'premiers-pas-secretis',
                        'title' => ['fr' => 'Premiers pas avec SECRETIS', 'en' => 'First Steps with SECRETIS'],
                        'desc'  => ['fr' => 'Découvrez SECRETIS de A à Z : connexion, tableau de bord, paramétrage initial et visite guidée des modules.', 'en' => 'Discover SECRETIS from A to Z.'],
                        'obj'   => ['fr' => ['Naviguer dans l\'interface SECRETIS', 'Configurer votre profil utilisateur', 'Explorer les modules disponibles', 'Paramétrer votre organisation', 'Inviter votre premier utilisateur']],
                        'level' => 'debutant',
                        'dur'   => 45,
                        'feat'  => true,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'presentation-secretis', 'title' => ['fr' => 'Présentation de SECRETIS ERP'], 'type' => 'article', 'order' => 1, 'preview' => true],
                            ['slug' => 'connexion-et-profil',   'title' => ['fr' => 'Connexion et paramétrage du profil'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'tableau-de-bord',       'title' => ['fr' => 'Comprendre le tableau de bord'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'parametrage-organisation', 'title' => ['fr' => 'Paramétrer votre organisation'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'premier-utilisateur',   'title' => ['fr' => 'Créer votre premier utilisateur'], 'type' => 'article', 'order' => 5],
                            ['slug' => 'visite-des-modules',    'title' => ['fr' => 'Visite guidée des modules'], 'type' => 'article', 'order' => 6],
                        ],
                        'quiz' => [
                            ['q' => 'Quelle est la première étape après la connexion à SECRETIS ?', 'opts' => [['text' => 'Paramétrer l\'organisation', 'ok' => true], ['text' => 'Créer une facture', 'ok' => false], ['text' => 'Installer une application', 'ok' => false]], 'expl' => 'La configuration de l\'organisation est la première étape indispensable.'],
                            ['q' => 'Où trouve-t-on le tableau de bord principal ?', 'opts' => [['text' => 'Dans le menu Accueil', 'ok' => true], ['text' => 'Dans les Paramètres', 'ok' => false], ['text' => 'Dans le module Finance', 'ok' => false]], 'expl' => 'Le tableau de bord est accessible depuis le menu Accueil.'],
                            ['q' => 'Comment inviter un utilisateur dans SECRETIS ?', 'opts' => [['text' => 'Paramètres > Utilisateurs > Inviter', 'ok' => true], ['text' => 'Via un e-mail direct', 'ok' => false], ['text' => 'En contactant le support', 'ok' => false]], 'expl' => 'L\'invitation se fait depuis la section Utilisateurs dans les Paramètres.'],
                        ],
                    ],
                    [
                        'slug'  => 'configurer-organisation',
                        'title' => ['fr' => 'Configurer votre organisation', 'en' => 'Configure Your Organization'],
                        'desc'  => ['fr' => 'Identité visuelle, informations légales, exercice comptable et paramètres avancés de votre espace SECRETIS.'],
                        'obj'   => ['fr' => ['Renseigner les informations de l\'entreprise', 'Configurer le logo et les couleurs', 'Définir l\'exercice comptable', 'Activer les modules souhaités']],
                        'level' => 'debutant',
                        'dur'   => 30,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'infos-legales',         'title' => ['fr' => 'Informations légales et siège social'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'identite-visuelle',     'title' => ['fr' => 'Logo, couleurs et identité visuelle'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'exercice-comptable',    'title' => ['fr' => 'Définir l\'exercice comptable'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'modules-activer',       'title' => ['fr' => 'Activer et désactiver des modules'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Où configurer le logo de votre organisation ?', 'opts' => [['text' => 'Paramètres > Organisation > Identité visuelle', 'ok' => true], ['text' => 'Profil utilisateur', 'ok' => false], ['text' => 'Module GED', 'ok' => false]], 'expl' => 'La section Identité visuelle permet d\'importer le logo.'],
                            ['q' => 'L\'exercice comptable dans SECRETIS correspond à :', 'opts' => [['text' => 'La période fiscale de l\'organisation', 'ok' => true], ['text' => 'La durée d\'un abonnement', 'ok' => false], ['text' => 'Un rapport mensuel', 'ok' => false]], 'expl' => 'L\'exercice comptable définit la période sur laquelle les comptes sont arrêtés.'],
                            ['q' => 'Peut-on désactiver un module sans perdre les données ?', 'opts' => [['text' => 'Oui, les données sont conservées', 'ok' => true], ['text' => 'Non, la désactivation supprime les données', 'ok' => false], ['text' => 'Cela dépend du module', 'ok' => false]], 'expl' => 'La désactivation d\'un module ne supprime pas les données existantes.'],
                        ],
                    ],
                    [
                        'slug'  => 'gerer-utilisateurs-droits',
                        'title' => ['fr' => 'Gérer les utilisateurs et les droits', 'en' => 'Manage Users and Permissions'],
                        'desc'  => ['fr' => 'Créer des comptes, attribuer des rôles, gérer les invitations et surveiller les accès.'],
                        'obj'   => ['fr' => ['Créer et désactiver des comptes', 'Attribuer des rôles prédéfinis', 'Comprendre la matrice des droits', 'Gérer les invitations en attente']],
                        'level' => 'debutant',
                        'dur'   => 40,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'creer-compte-utilisateur', 'title' => ['fr' => 'Créer un compte utilisateur'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'attribuer-roles',          'title' => ['fr' => 'Attribuer des rôles et permissions'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'matrice-des-droits',       'title' => ['fr' => 'Comprendre la matrice des droits'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'invitations-en-attente',   'title' => ['fr' => 'Gérer les invitations en attente'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'desactiver-compte',        'title' => ['fr' => 'Désactiver ou supprimer un compte'], 'type' => 'article', 'order' => 5],
                        ],
                        'quiz' => [
                            ['q' => 'Quel rôle donne accès à tous les paramètres de l\'organisation ?', 'opts' => [['text' => 'Administrateur', 'ok' => true], ['text' => 'Gestionnaire', 'ok' => false], ['text' => 'Utilisateur standard', 'ok' => false]], 'expl' => 'Le rôle Administrateur dispose de tous les droits.'],
                            ['q' => 'Une invitation expirée peut-elle être renvoyée ?', 'opts' => [['text' => 'Oui, depuis la liste des invitations', 'ok' => true], ['text' => 'Non, il faut recréer le compte', 'ok' => false], ['text' => 'Uniquement par le support', 'ok' => false]], 'expl' => 'On peut renvoyer une invitation depuis la section Invitations en attente.'],
                            ['q' => 'Désactiver un compte utilisateur empêche-t-il la connexion ?', 'opts' => [['text' => 'Oui, immédiatement', 'ok' => true], ['text' => 'Non, l\'utilisateur peut se connecter 24h encore', 'ok' => false], ['text' => 'Cela envoie un e-mail à l\'utilisateur', 'ok' => false]], 'expl' => 'La désactivation révoque l\'accès immédiatement.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'modules-metier',
                'name'  => ['fr' => 'Modules Métier', 'en' => 'Business Modules'],
                'desc'  => ['fr' => 'Maîtrisez les modules cœur de SECRETIS : agenda, GED, réunions, tâches et accueil.'],
                'icon'  => 'Briefcase',
                'color' => '#2E86C1',
                'order' => 2,
                'courses' => [
                    [
                        'slug'  => 'agenda-secretis',
                        'title' => ['fr' => 'Maîtriser l\'Agenda SECRETIS', 'en' => 'Master SECRETIS Agenda'],
                        'desc'  => ['fr' => 'Créez des événements, invitez des participants, gérez les salles et synchronisez Google Calendar.'],
                        'obj'   => ['fr' => ['Créer et modifier des événements', 'Inviter des participants internes et externes', 'Réserver des salles de réunion', 'Synchroniser avec Google Calendar', 'Configurer des rappels automatiques']],
                        'level' => 'debutant',
                        'dur'   => 50,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'creer-evenement',         'title' => ['fr' => 'Créer et modifier un événement'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'inviter-participants',     'title' => ['fr' => 'Inviter des participants'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'gestion-salles',          'title' => ['fr' => 'Réserver des salles de réunion'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'synchronisation-google',  'title' => ['fr' => 'Synchroniser avec Google Calendar'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'rappels-automatiques',    'title' => ['fr' => 'Configurer les rappels automatiques'], 'type' => 'article', 'order' => 5],
                        ],
                        'quiz' => [
                            ['q' => 'Comment réserver une salle depuis l\'agenda ?', 'opts' => [['text' => 'En ajoutant une ressource salle lors de la création d\'événement', 'ok' => true], ['text' => 'Via le module Réception uniquement', 'ok' => false], ['text' => 'En envoyant un e-mail au secrétariat', 'ok' => false]], 'expl' => 'La réservation de salle s\'effectue directement dans le formulaire de création d\'événement.'],
                            ['q' => 'La synchronisation Google Calendar est :', 'opts' => [['text' => 'Bidirectionnelle', 'ok' => true], ['text' => 'Unidirectionnelle (SECRETIS → Google)', 'ok' => false], ['text' => 'Manuelle uniquement', 'ok' => false]], 'expl' => 'SECRETIS synchronise dans les deux sens avec Google Calendar.'],
                            ['q' => 'Peut-on inviter une personne externe (hors organisation) ?', 'opts' => [['text' => 'Oui, par e-mail', 'ok' => true], ['text' => 'Non, invitations internes uniquement', 'ok' => false], ['text' => 'Uniquement si elle a un compte SECRETIS', 'ok' => false]], 'expl' => 'Les participants externes reçoivent une invitation par e-mail.'],
                        ],
                    ],
                    [
                        'slug'  => 'ged-courriers-documents',
                        'title' => ['fr' => 'Gérer vos courriers et documents (GED)', 'en' => 'Document Management (DMS)'],
                        'desc'  => ['fr' => 'Classez, recherchez et partagez vos documents avec le module GED de SECRETIS.'],
                        'obj'   => ['fr' => ['Importer et classer des documents', 'Utiliser les dossiers intelligents', 'Recherche full-text dans les documents', 'Partager des documents en interne', 'Gérer les versions de documents', 'Configurer les workflows de validation', 'Archiver et supprimer des documents']],
                        'level' => 'intermediaire',
                        'dur'   => 70,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'importer-classer',         'title' => ['fr' => 'Importer et classer des documents'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'dossiers-intelligents',    'title' => ['fr' => 'Dossiers intelligents et étiquettes'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'recherche-full-text',      'title' => ['fr' => 'Recherche full-text dans les documents'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'partage-interne',          'title' => ['fr' => 'Partager des documents en interne'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'gestion-versions',         'title' => ['fr' => 'Gestion des versions de documents'], 'type' => 'article', 'order' => 5],
                            ['slug' => 'workflows-validation',     'title' => ['fr' => 'Workflows de validation documentaire'], 'type' => 'article', 'order' => 6],
                            ['slug' => 'archivage-suppression',    'title' => ['fr' => 'Archiver et supprimer des documents'], 'type' => 'article', 'order' => 7],
                        ],
                        'quiz' => [
                            ['q' => 'Qu\'est-ce qu\'un dossier intelligent dans la GED ?', 'opts' => [['text' => 'Un dossier qui regroupe automatiquement des documents selon des règles', 'ok' => true], ['text' => 'Un dossier partagé avec Google Drive', 'ok' => false], ['text' => 'Un dossier créé par l\'IA', 'ok' => false]], 'expl' => 'Les dossiers intelligents filtrent dynamiquement les documents selon des critères définis.'],
                            ['q' => 'La recherche full-text dans SECRETIS permet de :', 'opts' => [['text' => 'Rechercher dans le contenu des fichiers PDF et Word', 'ok' => true], ['text' => 'Rechercher uniquement par nom de fichier', 'ok' => false], ['text' => 'Rechercher dans les e-mails', 'ok' => false]], 'expl' => 'L\'OCR et l\'indexation permettent la recherche dans le contenu des documents.'],
                            ['q' => 'Combien de versions d\'un document SECRETIS peut-il conserver ?', 'opts' => [['text' => 'Illimité (selon le plan)', 'ok' => true], ['text' => '5 versions maximum', 'ok' => false], ['text' => 'Une seule version', 'ok' => false]], 'expl' => 'SECRETIS conserve l\'historique complet des versions selon le plan d\'abonnement.'],
                        ],
                    ],
                    [
                        'slug'  => 'organiser-reunions',
                        'title' => ['fr' => 'Organiser vos réunions', 'en' => 'Organize Your Meetings'],
                        'desc'  => ['fr' => 'Planifiez, animez et suivez vos réunions avec les outils dédiés de SECRETIS.'],
                        'obj'   => ['fr' => ['Planifier une réunion avec ordre du jour', 'Rédiger et partager un compte-rendu', 'Assigner des actions de suivi', 'Accéder à l\'historique des réunions']],
                        'level' => 'debutant',
                        'dur'   => 35,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'planifier-reunion',        'title' => ['fr' => 'Planifier une réunion avec ordre du jour'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'compte-rendu',             'title' => ['fr' => 'Rédiger et partager un compte-rendu'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'actions-de-suivi',        'title' => ['fr' => 'Assigner des actions de suivi'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'historique-reunions',     'title' => ['fr' => 'Accéder à l\'historique des réunions'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'L\'ordre du jour dans SECRETIS est :', 'opts' => [['text' => 'Visible par tous les participants avant la réunion', 'ok' => true], ['text' => 'Accessible uniquement à l\'organisateur', 'ok' => false], ['text' => 'Généré automatiquement par l\'IA', 'ok' => false]], 'expl' => 'L\'ordre du jour est partagé avec tous les participants dès la création.'],
                            ['q' => 'Les actions de suivi peuvent être assignées à :', 'opts' => [['text' => 'N\'importe quel utilisateur de l\'organisation', 'ok' => true], ['text' => 'Uniquement aux participants de la réunion', 'ok' => false], ['text' => 'Uniquement à l\'organisateur', 'ok' => false]], 'expl' => 'On peut assigner une action à tout utilisateur de l\'organisation.'],
                            ['q' => 'Le compte-rendu peut être exporté en :', 'opts' => [['text' => 'PDF et Word', 'ok' => true], ['text' => 'PDF uniquement', 'ok' => false], ['text' => 'Excel uniquement', 'ok' => false]], 'expl' => 'SECRETIS permet l\'export du compte-rendu en PDF et en Word.'],
                        ],
                    ],
                    [
                        'slug'  => 'taches-projets-kanban-gantt',
                        'title' => ['fr' => 'Tâches et projets : Kanban et Gantt', 'en' => 'Tasks & Projects: Kanban and Gantt'],
                        'desc'  => ['fr' => 'Gérez vos projets en mode Kanban et visualisez la planification avec le diagramme de Gantt intégré.'],
                        'obj'   => ['fr' => ['Créer un projet et ses tâches', 'Utiliser le tableau Kanban', 'Lire et modifier un Gantt', 'Gérer les dépendances de tâches', 'Suivre la charge des ressources']],
                        'level' => 'intermediaire',
                        'dur'   => 55,
                        'order' => 4,
                        'lessons' => [
                            ['slug' => 'creer-projet-taches',     'title' => ['fr' => 'Créer un projet et ses tâches'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'tableau-kanban',          'title' => ['fr' => 'Utiliser le tableau Kanban'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'diagramme-gantt',        'title' => ['fr' => 'Lire et modifier le diagramme de Gantt'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'dependances-taches',     'title' => ['fr' => 'Gérer les dépendances de tâches'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'charge-ressources',      'title' => ['fr' => 'Suivi de la charge des ressources'], 'type' => 'article', 'order' => 5],
                        ],
                        'quiz' => [
                            ['q' => 'Le tableau Kanban affiche les tâches organisées par :', 'opts' => [['text' => 'Colonnes de statut (À faire, En cours, Terminé)', 'ok' => true], ['text' => 'Date d\'échéance', 'ok' => false], ['text' => 'Priorité uniquement', 'ok' => false]], 'expl' => 'Le Kanban organise les tâches en colonnes selon leur statut.'],
                            ['q' => 'Une dépendance de tâche signifie que :', 'opts' => [['text' => 'La tâche B ne peut commencer qu\'après la tâche A', 'ok' => true], ['text' => 'Les tâches ont le même responsable', 'ok' => false], ['text' => 'Les tâches sont dans le même projet', 'ok' => false]], 'expl' => 'Une dépendance établit une relation de précédence entre deux tâches.'],
                            ['q' => 'Le Gantt dans SECRETIS est-il interactif ?', 'opts' => [['text' => 'Oui, on peut glisser-déposer les barres', 'ok' => true], ['text' => 'Non, c\'est une vue en lecture seule', 'ok' => false], ['text' => 'Il faut exporter vers Excel pour modifier', 'ok' => false]], 'expl' => 'Le Gantt est interactif : glisser une barre modifie les dates de la tâche.'],
                        ],
                    ],
                    [
                        'slug'  => 'accueil-visiteurs',
                        'title' => ['fr' => 'Accueil et gestion des visiteurs', 'en' => 'Visitor Reception Management'],
                        'desc'  => ['fr' => 'Enregistrez les visiteurs, gérez les badges et suivez les présences avec le module Réception.'],
                        'obj'   => ['fr' => ['Enregistrer un visiteur à l\'accueil', 'Générer un badge temporaire', 'Suivre les visiteurs présents']],
                        'level' => 'debutant',
                        'dur'   => 25,
                        'order' => 5,
                        'lessons' => [
                            ['slug' => 'enregistrer-visiteur',   'title' => ['fr' => 'Enregistrer un visiteur'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'badge-temporaire',       'title' => ['fr' => 'Générer un badge temporaire'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'suivi-presences',        'title' => ['fr' => 'Suivi des visiteurs présents'], 'type' => 'article', 'order' => 3],
                        ],
                        'quiz' => [
                            ['q' => 'Le badge visiteur dans SECRETIS contient :', 'opts' => [['text' => 'Nom, photo, QR code et heure d\'arrivée', 'ok' => true], ['text' => 'Uniquement le nom et le service visité', 'ok' => false], ['text' => 'Un code PIN confidentiel', 'ok' => false]], 'expl' => 'Le badge inclut les informations du visiteur et un QR code de traçabilité.'],
                            ['q' => 'Un visiteur peut-il être pré-enregistré avant son arrivée ?', 'opts' => [['text' => 'Oui, depuis l\'agenda ou le module Réception', 'ok' => true], ['text' => 'Non, l\'enregistrement est uniquement à l\'arrivée', 'ok' => false], ['text' => 'Oui, mais uniquement par l\'administrateur', 'ok' => false]], 'expl' => 'Le pré-enregistrement accélère l\'accueil lors de l\'arrivée.'],
                            ['q' => 'Comment notifier l\'hôte de l\'arrivée d\'un visiteur ?', 'opts' => [['text' => 'SECRETIS envoie automatiquement une notification', 'ok' => true], ['text' => 'Manuellement par téléphone', 'ok' => false], ['text' => 'Par e-mail uniquement si configuré', 'ok' => false]], 'expl' => 'L\'hôte est notifié automatiquement dès l\'enregistrement du visiteur.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'administration',
                'name'  => ['fr' => 'Administration', 'en' => 'Administration'],
                'desc'  => ['fr' => 'Rôles avancés, paramètres système et intégrations pour les administrateurs SECRETIS.'],
                'icon'  => 'Shield',
                'color' => '#1A3A5C',
                'order' => 3,
                'courses' => [
                    [
                        'slug'  => 'roles-permissions-avances',
                        'title' => ['fr' => 'Rôles et permissions avancés', 'en' => 'Advanced Roles and Permissions'],
                        'desc'  => ['fr' => 'Créez des rôles personnalisés et affinez la matrice des droits par module.'],
                        'obj'   => ['fr' => ['Créer un rôle personnalisé', 'Configurer les droits par module', 'Comprendre la hiérarchie des rôles', 'Auditer les accès utilisateurs']],
                        'level' => 'avance',
                        'dur'   => 40,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'creer-role-personnalise', 'title' => ['fr' => 'Créer un rôle personnalisé'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'droits-par-module',       'title' => ['fr' => 'Configurer les droits par module'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'hierarchie-roles',        'title' => ['fr' => 'Comprendre la hiérarchie des rôles'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'audit-acces',             'title' => ['fr' => 'Auditer les accès utilisateurs'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Un rôle personnalisé peut hériter des droits d\'un rôle existant ?', 'opts' => [['text' => 'Oui, en choisissant un rôle parent', 'ok' => true], ['text' => 'Non, il faut configurer chaque droit manuellement', 'ok' => false], ['text' => 'Uniquement les rôles système', 'ok' => false]], 'expl' => 'L\'héritage simplifie la création de rôles dérivés.'],
                            ['q' => 'Quel rapport permet de voir qui a accès à quoi ?', 'opts' => [['text' => 'Le rapport Matrice des droits', 'ok' => true], ['text' => 'Le journal d\'audit', 'ok' => false], ['text' => 'Le tableau de bord utilisateurs', 'ok' => false]], 'expl' => 'La matrice des droits offre une vue transversale des accès.'],
                            ['q' => 'Un droit refusé au niveau rôle peut-il être accordé individuellement ?', 'opts' => [['text' => 'Oui, via les droits spécifiques utilisateur', 'ok' => true], ['text' => 'Non, le rôle prime toujours', 'ok' => false], ['text' => 'Uniquement par le Super Admin', 'ok' => false]], 'expl' => 'Des droits individuels peuvent compléter ou restreindre ceux du rôle.'],
                        ],
                    ],
                    [
                        'slug'  => 'parametres-avances-organisation',
                        'title' => ['fr' => 'Paramètres avancés de l\'organisation', 'en' => 'Advanced Organization Settings'],
                        'desc'  => ['fr' => 'Politiques de mot de passe, SSO, LDAP, personnalisation de l\'interface et des notifications.'],
                        'obj'   => ['fr' => ['Configurer la politique de mot de passe', 'Activer l\'authentification SSO', 'Personnaliser l\'interface', 'Gérer les notifications globales', 'Configurer les e-mails transactionnels']],
                        'level' => 'avance',
                        'dur'   => 50,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'politique-mot-de-passe', 'title' => ['fr' => 'Configurer la politique de mot de passe'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'sso-ldap',               'title' => ['fr' => 'Authentification SSO et LDAP'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'personnalisation-ui',    'title' => ['fr' => 'Personnaliser l\'interface utilisateur'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'notifications-globales', 'title' => ['fr' => 'Gérer les notifications globales'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'emails-transactionnels', 'title' => ['fr' => 'Configurer les e-mails transactionnels'], 'type' => 'article', 'order' => 5],
                        ],
                        'quiz' => [
                            ['q' => 'Le SSO dans SECRETIS supporte quel protocole ?', 'opts' => [['text' => 'SAML 2.0 et OpenID Connect (OIDC)', 'ok' => true], ['text' => 'OAuth 1.0 uniquement', 'ok' => false], ['text' => 'LDAP uniquement', 'ok' => false]], 'expl' => 'SECRETIS supporte SAML 2.0 et OIDC pour le Single Sign-On.'],
                            ['q' => 'La politique de mot de passe s\'applique :', 'opts' => [['text' => 'À tous les utilisateurs de l\'organisation', 'ok' => true], ['text' => 'Uniquement aux nouveaux comptes', 'ok' => false], ['text' => 'Uniquement aux administrateurs', 'ok' => false]], 'expl' => 'La politique de mot de passe s\'applique à l\'ensemble des utilisateurs.'],
                            ['q' => 'Peut-on utiliser un domaine personnalisé pour les e-mails SECRETIS ?', 'opts' => [['text' => 'Oui, en configurant le SMTP sortant', 'ok' => true], ['text' => 'Non, uniquement secretis.app', 'ok' => false], ['text' => 'Oui, mais uniquement pour les notifications', 'ok' => false]], 'expl' => 'La configuration SMTP permet d\'envoyer depuis votre propre domaine.'],
                        ],
                    ],
                    [
                        'slug'  => 'integrations-connecteurs',
                        'title' => ['fr' => 'Intégrations et connecteurs', 'en' => 'Integrations and Connectors'],
                        'desc'  => ['fr' => 'Connectez SECRETIS à vos outils : Google Workspace, Microsoft 365, WhatsApp et API REST.'],
                        'obj'   => ['fr' => ['Connecter Google Workspace', 'Connecter Microsoft 365', 'Activer les notifications WhatsApp', 'Utiliser l\'API REST SECRETIS']],
                        'level' => 'avance',
                        'dur'   => 45,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'google-workspace',       'title' => ['fr' => 'Intégration Google Workspace'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'microsoft-365',          'title' => ['fr' => 'Intégration Microsoft 365'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'whatsapp-notifications', 'title' => ['fr' => 'Notifications WhatsApp Business'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'api-rest-secretis',     'title' => ['fr' => 'Utiliser l\'API REST SECRETIS'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'L\'intégration Google Workspace permet de synchroniser :', 'opts' => [['text' => 'Agenda, contacts et Drive', 'ok' => true], ['text' => 'Uniquement l\'agenda', 'ok' => false], ['text' => 'Uniquement les e-mails', 'ok' => false]], 'expl' => 'L\'intégration couvre l\'agenda, les contacts et Google Drive.'],
                            ['q' => 'L\'API REST SECRETIS utilise quel format d\'authentification ?', 'opts' => [['text' => 'OAuth 2.0 (Bearer Token)', 'ok' => true], ['text' => 'Clé API en clair dans l\'URL', 'ok' => false], ['text' => 'Authentification basique (login/mot de passe)', 'ok' => false]], 'expl' => 'L\'API utilise OAuth 2.0 avec des Bearer Tokens.'],
                            ['q' => 'Les webhooks sortants dans SECRETIS permettent de :', 'opts' => [['text' => 'Notifier des systèmes tiers lors d\'événements', 'ok' => true], ['text' => 'Recevoir des données depuis des tiers', 'ok' => false], ['text' => 'Exporter des données en CSV automatiquement', 'ok' => false]], 'expl' => 'Les webhooks envoient des notifications HTTP lors d\'événements SECRETIS.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'finance',
                'name'  => ['fr' => 'Finance & Comptabilité', 'en' => 'Finance & Accounting'],
                'desc'  => ['fr' => 'Comptabilité SYSCOHADA, budgets, achats et fournisseurs dans SECRETIS.'],
                'icon'  => 'TrendingUp',
                'color' => '#F39C12',
                'order' => 4,
                'courses' => [
                    [
                        'slug'  => 'comptabilite-syscohada',
                        'title' => ['fr' => 'Introduction à la comptabilité SYSCOHADA dans SECRETIS', 'en' => 'SYSCOHADA Accounting in SECRETIS'],
                        'desc'  => ['fr' => 'Découvrez le plan comptable SYSCOHADA, saisissez vos premières écritures et générez vos états financiers.'],
                        'obj'   => ['fr' => ['Comprendre le plan comptable SYSCOHADA', 'Saisir des écritures comptables', 'Gérer la trésorerie', 'Rapprocher les relevés bancaires', 'Générer le bilan et le compte de résultat', 'Clôturer un exercice']],
                        'level' => 'intermediaire',
                        'dur'   => 90,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'plan-comptable-syscohada', 'title' => ['fr' => 'Le plan comptable SYSCOHADA dans SECRETIS'], 'type' => 'article', 'order' => 1, 'preview' => true],
                            ['slug' => 'saisie-ecritures',         'title' => ['fr' => 'Saisir des écritures comptables'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'gestion-tresorerie',       'title' => ['fr' => 'Gérer la trésorerie'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'rapprochement-bancaire',   'title' => ['fr' => 'Rapprochement bancaire'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'etats-financiers',         'title' => ['fr' => 'Générer le bilan et le compte de résultat'], 'type' => 'article', 'order' => 5],
                            ['slug' => 'cloture-exercice',         'title' => ['fr' => 'Clôturer un exercice comptable'], 'type' => 'article', 'order' => 6],
                        ],
                        'quiz' => [
                            ['q' => 'Dans le plan SYSCOHADA, la classe 4 regroupe :', 'opts' => [['text' => 'Les comptes de tiers (clients, fournisseurs)', 'ok' => true], ['text' => 'Les comptes de capitaux', 'ok' => false], ['text' => 'Les comptes de charges', 'ok' => false]], 'expl' => 'La classe 4 du SYSCOHADA regroupe les comptes de tiers.'],
                            ['q' => 'Le rapprochement bancaire consiste à :', 'opts' => [['text' => 'Comparer le relevé bancaire avec les écritures comptables', 'ok' => true], ['text' => 'Virer des fonds entre comptes', 'ok' => false], ['text' => 'Valider les factures fournisseurs', 'ok' => false]], 'expl' => 'Le rapprochement bancaire détecte les écarts entre la banque et la comptabilité.'],
                            ['q' => 'La clôture d\'exercice dans SECRETIS est :', 'opts' => [['text' => 'Irréversible après validation définitive', 'ok' => true], ['text' => 'Toujours réversible', 'ok' => false], ['text' => 'Optionnelle dans SYSCOHADA', 'ok' => false]], 'expl' => 'La clôture définitive fige les écritures de l\'exercice.'],
                        ],
                    ],
                    [
                        'slug'  => 'gestion-budgetaire',
                        'title' => ['fr' => 'Gestion budgétaire', 'en' => 'Budget Management'],
                        'desc'  => ['fr' => 'Créez vos budgets, suivez les engagements et analysez les écarts budgétaires.'],
                        'obj'   => ['fr' => ['Créer un budget annuel', 'Suivre les engagements de dépenses', 'Analyser les écarts budgétaires', 'Générer un rapport budgétaire']],
                        'level' => 'intermediaire',
                        'dur'   => 45,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'creer-budget',            'title' => ['fr' => 'Créer un budget annuel'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'suivi-engagements',       'title' => ['fr' => 'Suivre les engagements de dépenses'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'analyse-ecarts',          'title' => ['fr' => 'Analyser les écarts budgétaires'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'rapport-budgetaire',      'title' => ['fr' => 'Générer un rapport budgétaire'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Un engagement budgétaire est créé lors de :', 'opts' => [['text' => 'La validation d\'un bon de commande', 'ok' => true], ['text' => 'La réception de la facture', 'ok' => false], ['text' => 'Le paiement au fournisseur', 'ok' => false]], 'expl' => 'L\'engagement est constaté dès la validation du bon de commande.'],
                            ['q' => 'Un écart budgétaire négatif signifie :', 'opts' => [['text' => 'Les dépenses dépassent le budget alloué', 'ok' => true], ['text' => 'Des économies ont été réalisées', 'ok' => false], ['text' => 'Le budget n\'a pas été consommé', 'ok' => false]], 'expl' => 'Un écart négatif indique un dépassement du budget.'],
                            ['q' => 'Le budget peut être ventilé par :', 'opts' => [['text' => 'Service, projet ou axe analytique', 'ok' => true], ['text' => 'Utilisateur uniquement', 'ok' => false], ['text' => 'Mois uniquement', 'ok' => false]], 'expl' => 'SECRETIS permet une ventilation multidimensionnelle du budget.'],
                        ],
                    ],
                    [
                        'slug'  => 'achats-fournisseurs',
                        'title' => ['fr' => 'Module Achats et fournisseurs', 'en' => 'Procurement and Suppliers'],
                        'desc'  => ['fr' => 'Gérez le cycle complet des achats : demande, devis, commande, réception et paiement.'],
                        'obj'   => ['fr' => ['Créer une demande d\'achat', 'Générer un bon de commande', 'Gérer la réception des marchandises', 'Traiter les factures fournisseurs', 'Gérer les fournisseurs et les contrats']],
                        'level' => 'intermediaire',
                        'dur'   => 60,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'demande-achat',           'title' => ['fr' => 'Créer une demande d\'achat'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'bon-de-commande',         'title' => ['fr' => 'Générer un bon de commande'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'reception-marchandises',  'title' => ['fr' => 'Gérer la réception des marchandises'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'factures-fournisseurs',   'title' => ['fr' => 'Traiter les factures fournisseurs'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'gestion-fournisseurs',    'title' => ['fr' => 'Gérer les fournisseurs et contrats'], 'type' => 'article', 'order' => 5],
                        ],
                        'quiz' => [
                            ['q' => 'Le cycle achat dans SECRETIS commence par :', 'opts' => [['text' => 'La demande d\'achat', 'ok' => true], ['text' => 'Le bon de commande', 'ok' => false], ['text' => 'La facture fournisseur', 'ok' => false]], 'expl' => 'La demande d\'achat initie le processus de procurement.'],
                            ['q' => 'Un bon de commande peut être généré automatiquement depuis :', 'opts' => [['text' => 'Une demande d\'achat approuvée', 'ok' => true], ['text' => 'Uniquement manuellement', 'ok' => false], ['text' => 'Une facture fournisseur', 'ok' => false]], 'expl' => 'SECRETIS peut convertir automatiquement une demande approuvée en bon de commande.'],
                            ['q' => 'Le rapprochement à 3 voies vérifie :', 'opts' => [['text' => 'Commande, réception et facture', 'ok' => true], ['text' => 'Devis, commande et paiement', 'ok' => false], ['text' => 'Demande, approbation et paiement', 'ok' => false]], 'expl' => 'Le rapprochement 3 voies est la bonne pratique comptable achats.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'rapports-bi',
                'name'  => ['fr' => 'Rapports & BI', 'en' => 'Reports & BI'],
                'desc'  => ['fr' => 'Tableaux de bord, KPIs, Report Builder et exports pour piloter votre activité.'],
                'icon'  => 'BarChart2',
                'color' => '#8E44AD',
                'order' => 5,
                'courses' => [
                    [
                        'slug'  => 'tableaux-de-bord-kpis',
                        'title' => ['fr' => 'Tableaux de bord et KPIs', 'en' => 'Dashboards and KPIs'],
                        'desc'  => ['fr' => 'Configurez vos tableaux de bord personnalisés et suivez les indicateurs clés de performance.'],
                        'obj'   => ['fr' => ['Créer un tableau de bord personnalisé', 'Ajouter et configurer des widgets', 'Définir des KPIs pertinents', 'Partager un tableau de bord']],
                        'level' => 'intermediaire',
                        'dur'   => 40,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'creer-tableau-de-bord',  'title' => ['fr' => 'Créer un tableau de bord personnalisé'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'widgets-kpis',           'title' => ['fr' => 'Ajouter et configurer des widgets KPI'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'definir-kpis',           'title' => ['fr' => 'Définir des indicateurs pertinents'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'partager-tableau',       'title' => ['fr' => 'Partager et diffuser un tableau de bord'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Un widget KPI peut afficher :', 'opts' => [['text' => 'Un indicateur unique avec évolution et seuils', 'ok' => true], ['text' => 'Uniquement des graphiques', 'ok' => false], ['text' => 'Des données de plusieurs organisations', 'ok' => false]], 'expl' => 'Un widget KPI affiche la valeur, la tendance et les seuils d\'alerte.'],
                            ['q' => 'Les tableaux de bord dans SECRETIS se rafraîchissent :', 'opts' => [['text' => 'En temps réel ou selon une fréquence configurée', 'ok' => true], ['text' => 'Uniquement manuellement', 'ok' => false], ['text' => 'Une fois par jour', 'ok' => false]], 'expl' => 'La fréquence de rafraîchissement est configurable.'],
                            ['q' => 'Peut-on embarquer un tableau de bord dans un e-mail ?', 'opts' => [['text' => 'Oui, sous forme de capture ou de lien', 'ok' => true], ['text' => 'Non', 'ok' => false], ['text' => 'Uniquement en PDF', 'ok' => false]], 'expl' => 'SECRETIS permet l\'export et le partage par lien ou capture.'],
                        ],
                    ],
                    [
                        'slug'  => 'report-builder',
                        'title' => ['fr' => 'Report Builder : créer vos rapports personnalisés', 'en' => 'Report Builder'],
                        'desc'  => ['fr' => 'Utilisez le Report Builder pour créer des rapports sur-mesure sans écrire de code.'],
                        'obj'   => ['fr' => ['Choisir les sources de données', 'Définir les colonnes et filtres', 'Appliquer des regroupements et totaux', 'Planifier l\'envoi automatique', 'Sauvegarder un modèle de rapport']],
                        'level' => 'intermediaire',
                        'dur'   => 55,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'sources-de-donnees',     'title' => ['fr' => 'Choisir les sources de données'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'colonnes-et-filtres',    'title' => ['fr' => 'Définir les colonnes et appliquer des filtres'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'regroupements-totaux',   'title' => ['fr' => 'Regroupements, sous-totaux et calculs'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'planifier-rapport',      'title' => ['fr' => 'Planifier l\'envoi automatique'], 'type' => 'article', 'order' => 4],
                            ['slug' => 'modeles-rapport',        'title' => ['fr' => 'Sauvegarder un modèle de rapport'], 'type' => 'article', 'order' => 5],
                        ],
                        'quiz' => [
                            ['q' => 'Le Report Builder permet de croiser des données de :', 'opts' => [['text' => 'Plusieurs modules SECRETIS simultanément', 'ok' => true], ['text' => 'Un seul module à la fois', 'ok' => false], ['text' => 'Uniquement des sources externes', 'ok' => false]], 'expl' => 'Le Report Builder peut joindre des données de plusieurs modules.'],
                            ['q' => 'Un modèle de rapport peut être partagé avec :', 'opts' => [['text' => 'D\'autres utilisateurs de l\'organisation', 'ok' => true], ['text' => 'Personne, il est strictement personnel', 'ok' => false], ['text' => 'D\'autres organisations SECRETIS', 'ok' => false]], 'expl' => 'Les modèles peuvent être partagés en interne.'],
                            ['q' => 'La planification automatique d\'un rapport envoie :', 'opts' => [['text' => 'Le rapport par e-mail aux destinataires configurés', 'ok' => true], ['text' => 'Un SMS aux utilisateurs', 'ok' => false], ['text' => 'Une notification push uniquement', 'ok' => false]], 'expl' => 'Les rapports planifiés sont envoyés par e-mail aux destinataires.'],
                        ],
                    ],
                    [
                        'slug'  => 'exports-pdf-excel-csv',
                        'title' => ['fr' => 'Exports PDF, Excel et CSV', 'en' => 'PDF, Excel and CSV Exports'],
                        'desc'  => ['fr' => 'Maîtrisez toutes les options d\'export de SECRETIS pour partager vos données.'],
                        'obj'   => ['fr' => ['Exporter en PDF avec mise en page personnalisée', 'Exporter en Excel avec formules', 'Générer des CSV pour les imports externes']],
                        'level' => 'debutant',
                        'dur'   => 25,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'export-pdf',              'title' => ['fr' => 'Exporter en PDF : options et mise en page'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'export-excel',            'title' => ['fr' => 'Exporter en Excel avec formules'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'export-csv',              'title' => ['fr' => 'Générer des CSV pour les intégrations'], 'type' => 'article', 'order' => 3],
                        ],
                        'quiz' => [
                            ['q' => 'L\'export PDF de SECRETIS inclut :', 'opts' => [['text' => 'Le logo de l\'organisation et les en-têtes personnalisés', 'ok' => true], ['text' => 'Uniquement les données brutes', 'ok' => false], ['text' => 'Un filigrane imposé par SECRETIS', 'ok' => false]], 'expl' => 'Les exports PDF intègrent l\'identité visuelle de l\'organisation.'],
                            ['q' => 'L\'export Excel conserve-t-il les formules de calcul ?', 'opts' => [['text' => 'Oui, pour les colonnes calculées', 'ok' => true], ['text' => 'Non, uniquement les valeurs', 'ok' => false], ['text' => 'Cela dépend du module', 'ok' => false]], 'expl' => 'Les colonnes calculées sont exportées avec leurs formules Excel.'],
                            ['q' => 'Les fichiers CSV exportés de SECRETIS utilisent quel séparateur ?', 'opts' => [['text' => 'Virgule (,) ou point-virgule (;) configurable', 'ok' => true], ['text' => 'Tabulation uniquement', 'ok' => false], ['text' => 'Pipe (|) uniquement', 'ok' => false]], 'expl' => 'Le séparateur CSV est configurable selon les besoins du système cible.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'securite',
                'name'  => ['fr' => 'Sécurité', 'en' => 'Security'],
                'desc'  => ['fr' => 'MFA, sessions, journaux d\'audit et conformité RGPD pour sécuriser votre SECRETIS.'],
                'icon'  => 'Lock',
                'color' => '#C0392B',
                'order' => 6,
                'courses' => [
                    [
                        'slug'  => 'securiser-compte-mfa',
                        'title' => ['fr' => 'Sécuriser votre compte (MFA, sessions)', 'en' => 'Secure Your Account (MFA, Sessions)'],
                        'desc'  => ['fr' => 'Activez l\'authentification à deux facteurs et gérez vos sessions actives pour protéger votre compte.'],
                        'obj'   => ['fr' => ['Activer le MFA (TOTP, SMS)', 'Gérer les sessions actives', 'Configurer les alertes de connexion', 'Créer des mots de passe d\'application']],
                        'level' => 'debutant',
                        'dur'   => 30,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'activer-mfa',             'title' => ['fr' => 'Activer l\'authentification à deux facteurs (MFA)'], 'type' => 'article', 'order' => 1, 'preview' => true],
                            ['slug' => 'gerer-sessions',          'title' => ['fr' => 'Gérer vos sessions actives'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'alertes-connexion',       'title' => ['fr' => 'Configurer les alertes de connexion suspecte'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'mots-de-passe-app',       'title' => ['fr' => 'Mots de passe d\'application'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Le MFA dans SECRETIS peut utiliser :', 'opts' => [['text' => 'Une application TOTP (Google Authenticator) ou SMS', 'ok' => true], ['text' => 'Uniquement les SMS', 'ok' => false], ['text' => 'Uniquement les clés matérielles', 'ok' => false]], 'expl' => 'SECRETIS supporte TOTP et SMS pour le MFA.'],
                            ['q' => 'Que faire si on détecte une session suspecte ?', 'opts' => [['text' => 'La révoquer immédiatement depuis les paramètres', 'ok' => true], ['text' => 'Attendre qu\'elle expire naturellement', 'ok' => false], ['text' => 'Contacter le support uniquement', 'ok' => false]], 'expl' => 'On peut révoquer toute session active depuis l\'interface sécurité.'],
                            ['q' => 'Un mot de passe d\'application est utile pour :', 'opts' => [['text' => 'Connecter des intégrations tierces sans partager son mot de passe', 'ok' => true], ['text' => 'Remplacer le mot de passe principal', 'ok' => false], ['text' => 'Accéder en mode hors ligne', 'ok' => false]], 'expl' => 'Les mots de passe d\'application permettent des accès délimités sans compromettre le compte.'],
                        ],
                    ],
                    [
                        'slug'  => 'journaux-audit-tracabilite',
                        'title' => ['fr' => 'Journaux d\'audit et traçabilité', 'en' => 'Audit Logs and Traceability'],
                        'desc'  => ['fr' => 'Consultez les journaux d\'audit, configurez les alertes et exportez les traces pour vos audits.'],
                        'obj'   => ['fr' => ['Consulter le journal d\'audit', 'Filtrer et rechercher des événements', 'Exporter les journaux pour audit externe']],
                        'level' => 'intermediaire',
                        'dur'   => 25,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'consulter-journal-audit', 'title' => ['fr' => 'Consulter le journal d\'audit'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'filtrer-evenements',      'title' => ['fr' => 'Filtrer et rechercher des événements'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'exporter-journaux',       'title' => ['fr' => 'Exporter les journaux pour audit externe'], 'type' => 'article', 'order' => 3],
                        ],
                        'quiz' => [
                            ['q' => 'Le journal d\'audit enregistre :', 'opts' => [['text' => 'Toutes les actions sur les données sensibles', 'ok' => true], ['text' => 'Uniquement les connexions réussies', 'ok' => false], ['text' => 'Uniquement les erreurs système', 'ok' => false]], 'expl' => 'Le journal trace toutes les actions sur les données sensibles.'],
                            ['q' => 'Les journaux d\'audit sont conservés pendant :', 'opts' => [['text' => 'La durée définie dans la politique de rétention', 'ok' => true], ['text' => '30 jours uniquement', 'ok' => false], ['text' => 'Indéfiniment', 'ok' => false]], 'expl' => 'La durée de rétention est configurable selon vos obligations légales.'],
                            ['q' => 'Peut-on filtrer les journaux par utilisateur ?', 'opts' => [['text' => 'Oui', 'ok' => true], ['text' => 'Non, uniquement par date', 'ok' => false], ['text' => 'Uniquement par administrateur', 'ok' => false]], 'expl' => 'Le journal supporte de nombreux filtres : utilisateur, action, module, date.'],
                        ],
                    ],
                    [
                        'slug'  => 'rgpd-donnees-personnelles',
                        'title' => ['fr' => 'RGPD et gestion des données personnelles', 'en' => 'GDPR and Personal Data Management'],
                        'desc'  => ['fr' => 'Gérez les droits RGPD, les consentements et les demandes de suppression de données.'],
                        'obj'   => ['fr' => ['Comprendre les obligations RGPD dans SECRETIS', 'Gérer les demandes de droits (accès, suppression)', 'Configurer les durées de rétention', 'Gérer les consentements']],
                        'level' => 'intermediaire',
                        'dur'   => 40,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'obligations-rgpd',        'title' => ['fr' => 'Obligations RGPD et rôle de SECRETIS'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'gerer-droits-acces',      'title' => ['fr' => 'Gérer les demandes de droits (accès, suppression)'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'retention-donnees',       'title' => ['fr' => 'Configurer les durées de rétention'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'gestion-consentements',   'title' => ['fr' => 'Gérer les consentements utilisateurs'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Le droit à l\'effacement RGPD doit être traité sous :', 'opts' => [['text' => '1 mois (30 jours)', 'ok' => true], ['text' => '24 heures', 'ok' => false], ['text' => '6 mois', 'ok' => false]], 'expl' => 'Le RGPD impose un délai de réponse d\'un mois pour le droit à l\'effacement.'],
                            ['q' => 'SECRETIS agit en tant que :', 'opts' => [['text' => 'Sous-traitant au sens du RGPD', 'ok' => true], ['text' => 'Responsable de traitement', 'ok' => false], ['text' => 'Autorité de contrôle', 'ok' => false]], 'expl' => 'IBIG Soft agit comme sous-traitant ; votre organisation est responsable de traitement.'],
                            ['q' => 'La pseudonymisation des données dans SECRETIS est :', 'opts' => [['text' => 'Disponible pour les données les plus sensibles', 'ok' => true], ['text' => 'Automatique pour toutes les données', 'ok' => false], ['text' => 'Non disponible', 'ok' => false]], 'expl' => 'La pseudonymisation est applicable aux données à risque élevé.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'mobile-pwa',
                'name'  => ['fr' => 'Mobile & PWA', 'en' => 'Mobile & PWA'],
                'desc'  => ['fr' => 'Accédez à SECRETIS depuis votre smartphone et installez la PWA.'],
                'icon'  => 'Smartphone',
                'color' => '#16A085',
                'order' => 7,
                'courses' => [
                    [
                        'slug'  => 'secretis-sur-smartphone',
                        'title' => ['fr' => 'Utiliser SECRETIS sur smartphone', 'en' => 'Using SECRETIS on Mobile'],
                        'desc'  => ['fr' => 'Découvrez l\'interface mobile de SECRETIS et ses fonctionnalités optimisées pour smartphone.'],
                        'obj'   => ['fr' => ['Naviguer dans SECRETIS sur mobile', 'Gérer ses tâches depuis le mobile', 'Approuver des documents en déplacement', 'Consulter ses notifications mobiles']],
                        'level' => 'debutant',
                        'dur'   => 30,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'interface-mobile',        'title' => ['fr' => 'Découvrir l\'interface mobile'], 'type' => 'article', 'order' => 1, 'preview' => true],
                            ['slug' => 'taches-mobile',           'title' => ['fr' => 'Gérer ses tâches depuis le mobile'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'approbations-mobile',     'title' => ['fr' => 'Approuver des documents en déplacement'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'notifications-mobile',    'title' => ['fr' => 'Gérer les notifications mobiles'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'L\'interface mobile de SECRETIS est :', 'opts' => [['text' => 'Responsive et optimisée tactile', 'ok' => true], ['text' => 'Une application native à télécharger', 'ok' => false], ['text' => 'Identique au bureau', 'ok' => false]], 'expl' => 'SECRETIS propose une interface responsive adaptée aux petits écrans tactiles.'],
                            ['q' => 'Peut-on approuver une facture depuis le mobile ?', 'opts' => [['text' => 'Oui', 'ok' => true], ['text' => 'Non, réservé au bureau', 'ok' => false], ['text' => 'Uniquement si la PWA est installée', 'ok' => false]], 'expl' => 'Toutes les approbations sont accessibles depuis le mobile.'],
                            ['q' => 'Les notifications push mobiles nécessitent :', 'opts' => [['text' => 'D\'avoir installé la PWA ou autorisé les notifications navigateur', 'ok' => true], ['text' => 'Une application native', 'ok' => false], ['text' => 'Un abonnement Premium', 'ok' => false]], 'expl' => 'Les push notifications fonctionnent via la PWA ou le navigateur mobile.'],
                        ],
                    ],
                    [
                        'slug'  => 'installer-pwa',
                        'title' => ['fr' => 'Installer et utiliser la PWA SECRETIS', 'en' => 'Install and Use SECRETIS PWA'],
                        'desc'  => ['fr' => 'Installez SECRETIS comme une application sur votre écran d\'accueil via la PWA.'],
                        'obj'   => ['fr' => ['Installer la PWA sur iOS et Android', 'Lancer SECRETIS depuis l\'écran d\'accueil', 'Mettre à jour la PWA']],
                        'level' => 'debutant',
                        'dur'   => 20,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'installer-pwa-android',  'title' => ['fr' => 'Installer la PWA sur Android'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'installer-pwa-ios',      'title' => ['fr' => 'Installer la PWA sur iPhone/iPad'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'mise-a-jour-pwa',        'title' => ['fr' => 'Mettre à jour la PWA'], 'type' => 'article', 'order' => 3],
                        ],
                        'quiz' => [
                            ['q' => 'Sur iOS, la PWA s\'installe via :', 'opts' => [['text' => '"Ajouter à l\'écran d\'accueil" dans Safari', 'ok' => true], ['text' => 'L\'App Store', 'ok' => false], ['text' => 'Un fichier .ipa', 'ok' => false]], 'expl' => 'Sur iOS, l\'installation PWA passe par le menu partage de Safari.'],
                            ['q' => 'La PWA SECRETIS se met à jour :', 'opts' => [['text' => 'Automatiquement en arrière-plan', 'ok' => true], ['text' => 'Manuellement depuis les paramètres', 'ok' => false], ['text' => 'Via l\'App Store uniquement', 'ok' => false]], 'expl' => 'Les PWA se mettent à jour automatiquement sans intervention de l\'utilisateur.'],
                            ['q' => 'La PWA offre quelle expérience par rapport au site mobile ?', 'opts' => [['text' => 'Plein écran, icône sur l\'accueil, notifications push', 'ok' => true], ['text' => 'Aucune différence', 'ok' => false], ['text' => 'Fonctionnalités réduites', 'ok' => false]], 'expl' => 'La PWA améliore l\'expérience avec le plein écran, l\'icône et les notifications.'],
                        ],
                    ],
                    [
                        'slug'  => 'travailler-hors-ligne',
                        'title' => ['fr' => 'Travailler hors ligne avec SECRETIS', 'en' => 'Working Offline with SECRETIS'],
                        'desc'  => ['fr' => 'Découvrez comment SECRETIS synchronise vos données et permet un travail partiel hors ligne.'],
                        'obj'   => ['fr' => ['Comprendre le mode hors ligne de SECRETIS', 'Synchroniser ses données à la reconnexion', 'Identifier les fonctionnalités disponibles hors ligne']],
                        'level' => 'intermediaire',
                        'dur'   => 20,
                        'order' => 3,
                        'lessons' => [
                            ['slug' => 'mode-hors-ligne',         'title' => ['fr' => 'Comprendre le mode hors ligne'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'synchronisation',         'title' => ['fr' => 'Synchronisation à la reconnexion'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'fonctionnalites-offline', 'title' => ['fr' => 'Fonctionnalités disponibles hors ligne'], 'type' => 'article', 'order' => 3],
                        ],
                        'quiz' => [
                            ['q' => 'En mode hors ligne, SECRETIS peut :', 'opts' => [['text' => 'Afficher les données mises en cache récemment', 'ok' => true], ['text' => 'Accéder à toutes les données en temps réel', 'ok' => false], ['text' => 'Aucune fonctionnalité n\'est disponible', 'ok' => false]], 'expl' => 'Le cache local permet d\'afficher les données récentes même sans connexion.'],
                            ['q' => 'La synchronisation hors ligne se déclenche :', 'opts' => [['text' => 'Automatiquement dès la reconnexion', 'ok' => true], ['text' => 'Manuellement uniquement', 'ok' => false], ['text' => 'À la prochaine ouverture de l\'application', 'ok' => false]], 'expl' => 'SECRETIS synchronise automatiquement les données en attente à la reconnexion.'],
                            ['q' => 'Les conflits de synchronisation sont résolus par :', 'opts' => [['text' => 'La règle "dernier enregistrement gagne" ou un arbitrage manuel', 'ok' => true], ['text' => 'Toujours le serveur', 'ok' => false], ['text' => 'Toujours la version locale', 'ok' => false]], 'expl' => 'SECRETIS propose des stratégies de résolution configurables.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'sauvegardes',
                'name'  => ['fr' => 'Sauvegardes', 'en' => 'Backups'],
                'desc'  => ['fr' => 'Protégez vos données avec les sauvegardes automatiques et manuelles de SECRETIS.'],
                'icon'  => 'HardDrive',
                'color' => '#D35400',
                'order' => 8,
                'courses' => [
                    [
                        'slug'  => 'sauvegardes-auto-manuelles',
                        'title' => ['fr' => 'Sauvegardes automatiques et manuelles', 'en' => 'Automatic and Manual Backups'],
                        'desc'  => ['fr' => 'Configurez les sauvegardes automatiques et déclenchez des sauvegardes manuelles à la demande.'],
                        'obj'   => ['fr' => ['Comprendre la politique de sauvegarde', 'Configurer les sauvegardes automatiques', 'Déclencher une sauvegarde manuelle', 'Télécharger une sauvegarde']],
                        'level' => 'intermediaire',
                        'dur'   => 35,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'politique-sauvegarde',   'title' => ['fr' => 'Comprendre la politique de sauvegarde SECRETIS'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'sauvegardes-auto',       'title' => ['fr' => 'Configurer les sauvegardes automatiques'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'sauvegarde-manuelle',    'title' => ['fr' => 'Déclencher une sauvegarde manuelle'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'telecharger-sauvegarde', 'title' => ['fr' => 'Télécharger et vérifier une sauvegarde'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'Les sauvegardes automatiques SECRETIS se font :', 'opts' => [['text' => 'Quotidiennement (et avant chaque mise à jour)', 'ok' => true], ['text' => 'Uniquement manuellement', 'ok' => false], ['text' => 'Une fois par semaine', 'ok' => false]], 'expl' => 'Les sauvegardes automatiques sont quotidiennes et avant chaque déploiement.'],
                            ['q' => 'Les sauvegardes sont stockées :', 'opts' => [['text' => 'Sur des serveurs distincts de la production', 'ok' => true], ['text' => 'Sur le même serveur que la production', 'ok' => false], ['text' => 'Uniquement en local chez le client', 'ok' => false]], 'expl' => 'L\'isolation géographique des sauvegardes est une bonne pratique de sécurité.'],
                            ['q' => 'Peut-on chiffrer les sauvegardes téléchargeables ?', 'opts' => [['text' => 'Oui, les exports sont chiffrés', 'ok' => true], ['text' => 'Non', 'ok' => false], ['text' => 'Uniquement sur demande au support', 'ok' => false]], 'expl' => 'Les sauvegardes téléchargées sont chiffrées pour protéger les données.'],
                        ],
                    ],
                    [
                        'slug'  => 'restauration-donnees',
                        'title' => ['fr' => 'Restauration des données', 'en' => 'Data Restoration'],
                        'desc'  => ['fr' => 'Procédure de restauration d\'une sauvegarde : point de retour, restauration partielle et tests.'],
                        'obj'   => ['fr' => ['Demander une restauration au support', 'Restaurer des données spécifiques', 'Tester la cohérence après restauration']],
                        'level' => 'avance',
                        'dur'   => 30,
                        'order' => 2,
                        'lessons' => [
                            ['slug' => 'demander-restauration',  'title' => ['fr' => 'Demander une restauration au support'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'restauration-partielle', 'title' => ['fr' => 'Restauration partielle de données'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'test-coherence',         'title' => ['fr' => 'Tester la cohérence après restauration'], 'type' => 'article', 'order' => 3],
                        ],
                        'quiz' => [
                            ['q' => 'La restauration complète de SECRETIS est effectuée par :', 'opts' => [['text' => 'L\'équipe technique IBIG Soft après votre demande', 'ok' => true], ['text' => 'L\'administrateur de l\'organisation', 'ok' => false], ['text' => 'Automatiquement par SECRETIS', 'ok' => false]], 'expl' => 'La restauration complète nécessite l\'intervention de l\'équipe IBIG Soft.'],
                            ['q' => 'Lors d\'une restauration partielle, on peut cibler :', 'opts' => [['text' => 'Un module, une période ou une liste d\'enregistrements', 'ok' => true], ['text' => 'Uniquement l\'intégralité de la base', 'ok' => false], ['text' => 'Uniquement les 7 derniers jours', 'ok' => false]], 'expl' => 'La restauration partielle permet de cibler des données précises.'],
                            ['q' => 'Après une restauration, il est recommandé de :', 'opts' => [['text' => 'Vérifier la cohérence des données critiques', 'ok' => true], ['text' => 'Relancer une sauvegarde immédiatement', 'ok' => false], ['text' => 'Informer tous les utilisateurs par SMS', 'ok' => false]], 'expl' => 'Un test de cohérence valide que la restauration s\'est bien passée.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'utilisateurs',
                'name'  => ['fr' => 'Utilisateurs & RH', 'en' => 'Users & HR'],
                'desc'  => ['fr' => 'Gestion des collaborateurs, congés et ressources humaines dans SECRETIS.'],
                'icon'  => 'Users',
                'color' => '#117A65',
                'order' => 9,
                'courses' => [
                    [
                        'slug'  => 'gestion-rh-collaborateurs',
                        'title' => ['fr' => 'Gestion des collaborateurs', 'en' => 'Employee Management'],
                        'desc'  => ['fr' => 'Créez les fiches collaborateurs, gérez les contrats et suivez les congés avec le module RH.'],
                        'obj'   => ['fr' => ['Créer une fiche collaborateur', 'Gérer les contrats de travail', 'Soumettre et approuver des congés', 'Consulter le tableau de bord RH']],
                        'level' => 'intermediaire',
                        'dur'   => 45,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'fiche-collaborateur',    'title' => ['fr' => 'Créer une fiche collaborateur'], 'type' => 'article', 'order' => 1],
                            ['slug' => 'gestion-contrats',       'title' => ['fr' => 'Gérer les contrats de travail'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'conges-absences',        'title' => ['fr' => 'Gérer les congés et absences'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'tableau-bord-rh',        'title' => ['fr' => 'Tableau de bord RH'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'La fiche collaborateur dans SECRETIS contient :', 'opts' => [['text' => 'Informations personnelles, contrat, compétences et historique', 'ok' => true], ['text' => 'Uniquement le nom et l\'e-mail', 'ok' => false], ['text' => 'Uniquement les informations contractuelles', 'ok' => false]], 'expl' => 'La fiche collaborateur est complète et multidimensionnelle.'],
                            ['q' => 'Une demande de congé doit être :', 'opts' => [['text' => 'Approuvée par le manager avant d\'être validée', 'ok' => true], ['text' => 'Automatiquement accordée', 'ok' => false], ['text' => 'Approuvée uniquement par l\'administrateur', 'ok' => false]], 'expl' => 'Le workflow de congé passe par le manager direct.'],
                            ['q' => 'Le solde de congés dans SECRETIS est mis à jour :', 'opts' => [['text' => 'En temps réel après chaque approbation', 'ok' => true], ['text' => 'En fin de mois', 'ok' => false], ['text' => 'Manuellement par l\'administrateur', 'ok' => false]], 'expl' => 'Le solde se met à jour automatiquement après chaque approbation.'],
                        ],
                    ],
                ],
            ],
            [
                'slug'  => 'nouveautes',
                'name'  => ['fr' => 'Nouveautés', 'en' => "What's New"],
                'desc'  => ['fr' => 'Découvrez les dernières fonctionnalités et mises à jour de SECRETIS.'],
                'icon'  => 'Sparkles',
                'color' => '#2980B9',
                'order' => 10,
                'courses' => [
                    [
                        'slug'  => 'nouveautes-v2',
                        'title' => ['fr' => 'Nouveautés SECRETIS v2.0', 'en' => "What's New in SECRETIS v2.0"],
                        'desc'  => ['fr' => 'Tour complet des nouvelles fonctionnalités de la version 2.0 : IA, modules améliorés et nouvelles intégrations.'],
                        'obj'   => ['fr' => ['Découvrir les améliorations IA de SARA v2', 'Explorer le nouveau module Finance', 'Utiliser le Report Builder amélioré', 'Découvrir les nouvelles intégrations']],
                        'level' => 'debutant',
                        'dur'   => 30,
                        'feat'  => true,
                        'order' => 1,
                        'lessons' => [
                            ['slug' => 'sara-v2',                 'title' => ['fr' => 'SARA v2 : les nouvelles capacités IA'], 'type' => 'article', 'order' => 1, 'preview' => true],
                            ['slug' => 'nouveau-module-finance',  'title' => ['fr' => 'Le module Finance repensé'], 'type' => 'article', 'order' => 2],
                            ['slug' => 'report-builder-v2',       'title' => ['fr' => 'Report Builder v2 : nouvelles fonctionnalités'], 'type' => 'article', 'order' => 3],
                            ['slug' => 'nouvelles-integrations',  'title' => ['fr' => 'Nouvelles intégrations : WhatsApp, LinkedIn et Stripe'], 'type' => 'article', 'order' => 4],
                        ],
                        'quiz' => [
                            ['q' => 'SARA v2 dans SECRETIS apporte :', 'opts' => [['text' => 'Des suggestions proactives et un assistant contextuel', 'ok' => true], ['text' => 'Uniquement un chatbot de support', 'ok' => false], ['text' => 'Un générateur de rapports uniquement', 'ok' => false]], 'expl' => 'SARA v2 propose des suggestions intelligentes adaptées au contexte.'],
                            ['q' => 'Le Report Builder v2 permet maintenant :', 'opts' => [['text' => 'Des jointures inter-modules et des formules avancées', 'ok' => true], ['text' => 'Uniquement des tableaux simples', 'ok' => false], ['text' => 'Des rapports uniquement en PDF', 'ok' => false]], 'expl' => 'La v2 apporte des jointures inter-modules et des formules calculées avancées.'],
                            ['q' => 'L\'intégration Stripe dans v2 permet de :', 'opts' => [['text' => 'Payer des factures directement depuis SECRETIS', 'ok' => true], ['text' => 'Gérer les salaires des employés', 'ok' => false], ['text' => 'Envoyer des SMS de rappel', 'ok' => false]], 'expl' => 'L\'intégration Stripe permet le paiement de factures en ligne depuis SECRETIS.'],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($categories as $catData) {
            $catId = DB::table('academy_categories')->insertGetId([
                'slug'        => $catData['slug'],
                'name'        => json_encode($catData['name']),
                'description' => json_encode($catData['desc']),
                'icon'        => $catData['icon'],
                'color'       => $catData['color'],
                'order'       => $catData['order'],
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);

            foreach ($catData['courses'] as $courseData) {
                $courseId = DB::table('academy_courses')->insertGetId([
                    'slug'               => $courseData['slug'],
                    'category_id'        => $catId,
                    'title'              => json_encode($courseData['title']),
                    'description'        => json_encode($courseData['desc']),
                    'objectives'         => json_encode($courseData['obj']['fr'] ?? []),
                    'level'              => $courseData['level'],
                    'duration_minutes'   => $courseData['dur'],
                    'is_active'          => true,
                    'is_featured'        => $courseData['feat'] ?? false,
                    'order'              => $courseData['order'],
                    'version_compatible' => 'v1.0+',
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ]);

                // Leçons
                $lastLessonId = null;
                foreach ($courseData['lessons'] as $lessonData) {
                    $content = $this->generateLessonContent($lessonData['title']['fr'], $courseData['title']['fr']);
                    $lastLessonId = DB::table('academy_lessons')->insertGetId([
                        'course_id'        => $courseId,
                        'slug'             => $lessonData['slug'],
                        'title'            => json_encode($lessonData['title']),
                        'type'             => $lessonData['type'],
                        'content'          => json_encode(['html' => $content, 'video_placeholder' => true]),
                        'video_url'        => null,
                        'duration_minutes' => 8,
                        'is_active'        => true,
                        'is_preview'       => $lessonData['preview'] ?? false,
                        'order'            => $lessonData['order'],
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]);
                }

                // Quiz attaché à la dernière leçon du cours
                if ($lastLessonId && isset($courseData['quiz'])) {
                    foreach ($courseData['quiz'] as $qi => $quizData) {
                        DB::table('academy_quizzes')->insert([
                            'lesson_id'   => $lastLessonId,
                            'question'    => json_encode(['fr' => $quizData['q']]),
                            'options'     => json_encode(array_map(fn($o) => ['text' => $o['text'], 'is_correct' => $o['ok']], $quizData['opts'])),
                            'explanation' => json_encode(['fr' => $quizData['expl']]),
                            'order'       => $qi + 1,
                            'created_at'  => now(),
                            'updated_at'  => now(),
                        ]);
                    }
                }
            }
        }
    }

    // ─── Ressources téléchargeables ───────────────────────────────────────────

    private function seedResources(): void
    {
        $resources = [
            [
                'title' => ['fr' => 'Guide de démarrage rapide SECRETIS', 'en' => 'SECRETIS Quick Start Guide'],
                'desc'  => ['fr' => 'Le guide complet pour bien démarrer avec SECRETIS en moins de 30 minutes.'],
                'type'  => 'pdf',
                'path'  => 'academy/resources/guide-demarrage-rapide-secretis.pdf',
                'module'=> 'Général',
                'order' => 1,
            ],
            [
                'title' => ['fr' => 'Modèle d\'import de contacts', 'en' => 'Contact Import Template'],
                'desc'  => ['fr' => 'Fichier Excel préformaté pour importer vos contacts dans SECRETIS.'],
                'type'  => 'excel',
                'path'  => 'academy/resources/modele-import-contacts.xlsx',
                'module'=> 'Contacts',
                'order' => 2,
            ],
            [
                'title' => ['fr' => 'Modèle d\'import de tâches', 'en' => 'Task Import Template'],
                'desc'  => ['fr' => 'Fichier Excel préformaté pour importer vos tâches et projets en masse.'],
                'type'  => 'excel',
                'path'  => 'academy/resources/modele-import-taches.xlsx',
                'module'=> 'Projets & Tâches',
                'order' => 3,
            ],
            [
                'title' => ['fr' => 'Charte des rôles et permissions', 'en' => 'Roles and Permissions Charter'],
                'desc'  => ['fr' => 'Tableau complet des droits associés à chaque rôle dans SECRETIS.'],
                'type'  => 'pdf',
                'path'  => 'academy/resources/charte-roles-permissions.pdf',
                'module'=> 'Administration',
                'order' => 4,
            ],
            [
                'title' => ['fr' => 'Glossaire comptable SYSCOHADA', 'en' => 'SYSCOHADA Accounting Glossary'],
                'desc'  => ['fr' => 'Définitions des termes comptables SYSCOHADA utilisés dans le module Finance de SECRETIS.'],
                'type'  => 'pdf',
                'path'  => 'academy/resources/glossaire-comptable-syscohada.pdf',
                'module'=> 'Finance & Comptabilité',
                'order' => 5,
            ],
        ];

        foreach ($resources as $res) {
            DB::table('academy_resources')->insert([
                'title'          => json_encode($res['title']),
                'description'    => json_encode($res['desc']),
                'type'           => $res['type'],
                'file_path'      => $res['path'],
                'module'         => $res['module'],
                'is_active'      => true,
                'download_count' => 0,
                'order'          => $res['order'],
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }
    }

    // ─── Générateur de contenu de leçon ──────────────────────────────────────

    private function generateLessonContent(string $lessonTitle, string $courseTitle): string
    {
        return <<<HTML
<div class="lesson-content">
  <h2>{$lessonTitle}</h2>

  <div class="video-placeholder" style="background:#1a1a2e;border-radius:12px;padding:48px 32px;text-align:center;margin:24px 0;">
    <div style="font-size:48px;margin-bottom:16px;">🎬</div>
    <p style="color:#94a3b8;font-size:15px;margin:0;font-style:italic;">
      Vidéo en cours de production — Disponible prochainement
    </p>
  </div>

  <h3>Objectifs de cette leçon</h3>
  <p>
    Dans cette leçon dédiée à <strong>{$lessonTitle}</strong> dans le cadre du cours
    <em>{$courseTitle}</em>, vous allez acquérir les connaissances pratiques nécessaires
    pour maîtriser cette fonctionnalité de SECRETIS ERP.
  </p>

  <h3>Contexte et utilité</h3>
  <p>
    IBIG SECRETIS est conçu pour s'adapter aux réalités des organisations africaines et
    internationales. Chaque fonctionnalité a été pensée pour simplifier votre quotidien
    tout en respectant les normes et réglementations en vigueur (SYSCOHADA, RGPD, etc.).
  </p>
  <p>
    Cette leçon vous guidera pas à pas, avec des captures d'écran annotées et des
    exemples concrets tirés de situations réelles d'utilisation.
  </p>

  <h3>Étapes clés</h3>
  <ol>
    <li>
      <strong>Accéder à la fonctionnalité</strong> : depuis le menu principal,
      naviguez vers la section concernée. SECRETIS utilise une navigation intuitive
      accessible depuis la barre latérale gauche.
    </li>
    <li>
      <strong>Configurer les paramètres</strong> : chaque fonctionnalité dispose
      de paramètres adaptables à votre organisation. Les valeurs par défaut couvrent
      90% des cas d'usage courants.
    </li>
    <li>
      <strong>Valider et enregistrer</strong> : SECRETIS sauvegarde automatiquement
      vos saisies en cours (auto-save) et affiche une confirmation visuelle à chaque
      enregistrement définitif.
    </li>
    <li>
      <strong>Vérifier le résultat</strong> : consultez l'aperçu ou le tableau
      récapitulatif pour confirmer que l'opération s'est bien déroulée.
    </li>
  </ol>

  <h3>Bonnes pratiques</h3>
  <ul>
    <li>Complétez toujours les champs obligatoires (marqués d'un astérisque <strong>*</strong>) avant de valider.</li>
    <li>Utilisez les raccourcis clavier pour accélérer votre travail : <kbd>Ctrl+S</kbd> pour sauvegarder, <kbd>Ctrl+N</kbd> pour créer un nouvel élément.</li>
    <li>En cas de doute, le bouton d'aide contextuel (icône <strong>?</strong>) affiche une explication détaillée de chaque champ.</li>
    <li>Consultez le journal d'audit si vous souhaitez suivre les modifications effectuées par votre équipe.</li>
  </ul>

  <h3>Points à retenir</h3>
  <blockquote style="border-left:4px solid #2E86C1;padding:12px 16px;margin:16px 0;background:rgba(46,134,193,0.08);border-radius:0 8px 8px 0;">
    <strong>Astuce SECRETIS :</strong> toutes les listes dans SECRETIS supportent
    le filtrage avancé, l'export et la recherche en temps réel. Explorez ces
    fonctionnalités pour gagner du temps au quotidien.
  </blockquote>

  <p>
    Si vous rencontrez une difficulté, notre équipe support est disponible via le
    chat intégré (icône bulle en bas à droite) ou par e-mail à
    <strong>support@ibigsoft.com</strong>.
  </p>
</div>
HTML;
    }
}
