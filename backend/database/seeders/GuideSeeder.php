<?php

namespace Database\Seeders;

use App\Models\GuideArticle;
use App\Models\GuideSection;
use App\Services\LicenceService;
use App\Support\LicenceDocuments;
use Illuminate\Database\Seeder;

class GuideSeeder extends Seeder
{
    public function run(): void
    {
        GuideArticle::query()->delete();
        GuideSection::query()->delete();

        $sections = [

            // ═══════════════════════════════════════════════════════════════
            // SECTION 1 : Premiers pas
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'premiers-pas',
                'icon'        => 'RocketLaunch',
                'color'       => '#1A3A5C',
                'order'       => 1,
                'role_target' => 'all',
                'translations' => [
                    'fr' => ['title' => 'Premiers pas', 'description' => 'Tout ce qu\'il faut savoir pour démarrer avec IBIG SECRETIS.'],
                    'en' => ['title' => 'Getting Started', 'description' => 'Everything you need to know to get started with IBIG SECRETIS.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'creer-votre-compte-et-configurer-votre-organisation',
                        'order'             => 1,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Créer votre compte et configurer votre organisation',
                                'summary' => 'Apprenez à créer votre compte SECRETIS et à effectuer la configuration initiale de votre organisation.',
                                'content' => '<h2>Création de votre compte</h2><p>Pour commencer avec IBIG SECRETIS, rendez-vous sur <strong>app.ibig-secretis.com</strong> et cliquez sur le bouton « Démarrer gratuitement ». Vous disposez d\'un essai de \' . app(LicenceService::class)->essaiJours() . \' jours, sans engagement et sans carte bancaire. À l\'échéance, votre espace bascule automatiquement au palier gratuit : aucune donnée n\'est perdue.</p><h3>Informations requises</h3><ul><li>Votre prénom et nom</li><li>Une adresse e-mail professionnelle valide</li><li>Un mot de passe d\'au moins 8 caractères (lettres, chiffres, symboles recommandés)</li><li>Le nom de votre organisation</li><li>Le pays de votre organisation</li></ul><p>Un e-mail de confirmation est envoyé immédiatement. Cliquez sur le lien dans cet e-mail pour activer votre compte. Le lien est valide 24 heures.</p><h2>Configuration initiale de l\'organisation</h2><p>Après activation, l\'assistant d\'onboarding vous guide en 5 étapes rapides :</p><ol><li><strong>Profil de l\'organisation</strong> : nom officiel, logo, secteur d\'activité, pays, devise</li><li><strong>Paramètres régionaux</strong> : fuseau horaire, langue par défaut, format de date</li><li><strong>Modules actifs</strong> : sélectionnez les modules que vous souhaitez utiliser (Agenda, GED, Tâches, Visiteurs…)</li><li><strong>Charte graphique</strong> : couleurs primaire et secondaire de votre organisation</li><li><strong>Inviter l\'équipe</strong> : ajoutez les premiers membres par e-mail</li></ol><blockquote><strong>Note :</strong> Vous pouvez revenir sur ces paramètres à tout moment depuis Administration &gt; Organisation &gt; Paramètres généraux.</blockquote><h2>Informations légales (OHADA)</h2><p>Pour que vos documents générés par SECRETIS soient conformes aux exigences OHADA, renseignez dans Administration &gt; Organisation &gt; Informations légales :</p><ul><li>Numéro RCCM (Registre du Commerce et du Crédit Mobilier)</li><li>Numéro contribuable / NIF</li><li>Adresse du siège social</li><li>Représentant légal</li><li>Capital social</li></ul><p>Ces informations apparaissent automatiquement sur toutes les factures, contrats et documents officiels générés.</p>',
                            ],
                            'en' => [
                                'title'   => 'Create your account and configure your organisation',
                                'summary' => 'Learn how to create your SECRETIS account and perform the initial setup of your organisation.',
                                'content' => '<h2>Creating your account</h2><p>To get started with IBIG SECRETIS, go to <strong>app.ibig-secretis.com</strong> and click "Start for free". You have a \' . app(LicenceService::class)->essaiJours() . \'-day trial, with no commitment and no credit card. At the end of it your workspace switches automatically to the free tier: no data is lost.</p><h3>Required information</h3><ul><li>Your first and last name</li><li>A valid professional email address</li><li>A password of at least 8 characters (letters, numbers, symbols recommended)</li><li>Your organisation name</li><li>Your organisation\'s country</li></ul><p>A confirmation email is sent immediately. Click the link in this email to activate your account. The link is valid for 24 hours.</p><h2>Initial organisation setup</h2><p>After activation, the onboarding assistant guides you through 5 quick steps:</p><ol><li><strong>Organisation profile</strong>: official name, logo, industry, country, currency</li><li><strong>Regional settings</strong>: time zone, default language, date format</li><li><strong>Active modules</strong>: select modules you want to use (Calendar, DMS, Tasks, Visitors…)</li><li><strong>Brand identity</strong>: primary and secondary colours for your organisation</li><li><strong>Invite your team</strong>: add first members by email</li></ol><blockquote><strong>Note:</strong> You can return to these settings at any time from Administration &gt; Organisation &gt; General settings.</blockquote>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'comprendre-le-tableau-de-bord',
                        'order'             => 2,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Comprendre le tableau de bord',
                                'summary' => 'Découvrez les différentes zones du tableau de bord et comment les personnaliser.',
                                'content' => '<h2>Vue d\'ensemble du tableau de bord</h2><p>Le tableau de bord de SECRETIS est votre centre de pilotage quotidien. Il s\'affiche automatiquement à chaque connexion et présente les informations les plus importantes pour votre journée.</p><h3>Zones du tableau de bord</h3><ul><li><strong>Barre de navigation gauche</strong> : accès rapide à tous les modules (Agenda, GED, Tâches, etc.)</li><li><strong>Zone principale</strong> : widgets personnalisables (KPI, agenda du jour, tâches prioritaires)</li><li><strong>Panneau SARA</strong> : bouton de chat avec l\'assistante IA (en bas à droite)</li><li><strong>Notifications</strong> : icône cloche en haut à droite pour voir toutes les alertes</li></ul><h2>Widgets disponibles</h2><p>Cliquez sur « Personnaliser le tableau de bord » pour ajouter, supprimer ou réorganiser les widgets :</p><ul><li>Agenda du jour et de la semaine</li><li>Tâches en retard et urgentes</li><li>Documents récemment modifiés</li><li>Visiteurs présents</li><li>Messages non lus</li><li>Indicateurs clés personnalisés</li></ul><h2>Mode compact vs mode étendu</h2><p>Utilisez le bouton de bascule en haut de la zone principale pour alterner entre la vue compacte (KPI et chiffres) et la vue étendue (graphiques et détails). La préférence est sauvegardée pour chaque utilisateur.</p><blockquote><strong>Astuce :</strong> Utilisez le raccourci <kbd>Ctrl+K</kbd> (ou <kbd>Cmd+K</kbd> sur Mac) depuis n\'importe quelle page pour ouvrir la recherche globale.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Understanding the dashboard',
                                'summary' => 'Discover the different areas of the dashboard and how to customise them.',
                                'content' => '<h2>Dashboard overview</h2><p>The SECRETIS dashboard is your daily control centre. It displays automatically at each login and presents the most important information for your day.</p><h3>Dashboard areas</h3><ul><li><strong>Left navigation bar</strong>: quick access to all modules (Calendar, DMS, Tasks, etc.)</li><li><strong>Main area</strong>: customisable widgets (KPIs, today\'s agenda, priority tasks)</li><li><strong>SARA panel</strong>: AI assistant chat button (bottom right)</li><li><strong>Notifications</strong>: bell icon at top right for all alerts</li></ul><h2>Available widgets</h2><p>Click "Customise dashboard" to add, remove or rearrange widgets.</p><blockquote><strong>Tip:</strong> Use the shortcut <kbd>Ctrl+K</kbd> (or <kbd>Cmd+K</kbd> on Mac) from any page to open the global search.</blockquote>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'configurer-votre-profil-et-vos-preferences',
                        'order'             => 3,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Configurer votre profil et vos préférences',
                                'summary' => 'Personnalisez votre profil utilisateur, vos notifications et vos préférences d\'affichage.',
                                'content' => '<h2>Accéder à votre profil</h2><p>Cliquez sur votre avatar ou vos initiales en haut à droite de l\'interface, puis sélectionnez « Mon profil ». La page de profil est divisée en plusieurs onglets.</p><h3>Onglet Informations personnelles</h3><ul><li>Photo de profil (JPG, PNG, max 5 Mo, ratio 1:1 recommandé)</li><li>Prénom et nom d\'affichage</li><li>Titre de poste et département</li><li>Numéro de téléphone professionnel</li><li>Courte biographie</li></ul><h3>Onglet Préférences</h3><ul><li><strong>Langue</strong> : Français ou English (effet immédiat)</li><li><strong>Fuseau horaire</strong> : liste complète des fuseaux mondiaux</li><li><strong>Format de date</strong> : JJ/MM/AAAA ou MM/DD/YYYY</li><li><strong>Thème</strong> : Clair, Sombre, ou Automatique (suit le système)</li><li><strong>Densité d\'affichage</strong> : Confortable ou Compact</li></ul><h3>Onglet Notifications</h3><p>Configurez précisément quelles notifications vous souhaitez recevoir, par quel canal (e-mail, push, SMS) et à quelle fréquence (immédiatement, résumé quotidien, résumé hebdomadaire).</p><blockquote><strong>Conseil :</strong> Activez le résumé quotidien par e-mail pour recevoir chaque matin un récapitulatif de vos tâches et événements du jour.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Configure your profile and preferences',
                                'summary' => 'Personalise your user profile, notifications and display preferences.',
                                'content' => '<h2>Accessing your profile</h2><p>Click your avatar or initials at the top right of the interface, then select "My profile". The profile page is divided into several tabs.</p><h3>Personal information tab</h3><ul><li>Profile photo (JPG, PNG, max 5 MB, 1:1 ratio recommended)</li><li>Display first and last name</li><li>Job title and department</li><li>Professional phone number</li><li>Short biography</li></ul><h3>Preferences tab</h3><ul><li><strong>Language</strong>: French or English (immediate effect)</li><li><strong>Time zone</strong>: complete list of world time zones</li><li><strong>Date format</strong>: DD/MM/YYYY or MM/DD/YYYY</li><li><strong>Theme</strong>: Light, Dark or Automatic (follows system)</li></ul><blockquote><strong>Tip:</strong> Enable the daily email digest to receive a summary of your tasks and events each morning.</blockquote>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'inviter-votre-equipe',
                        'order'             => 4,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Inviter votre équipe',
                                'summary' => 'Ajoutez vos collègues à SECRETIS et gérez leurs rôles et accès.',
                                'content' => '<h2>Inviter des utilisateurs</h2><p>Seuls les administrateurs peuvent inviter de nouveaux utilisateurs. Accédez à Administration &gt; Utilisateurs &gt; Inviter un utilisateur.</p><h3>Méthodes d\'invitation</h3><ul><li><strong>Invitation individuelle</strong> : saisissez l\'e-mail, choisissez le rôle et cliquez sur Inviter</li><li><strong>Invitation en lot</strong> : importez un fichier CSV (voir guide Import CSV)</li><li><strong>Lien d\'invitation</strong> : générez un lien partageable valable 7 jours (tous les utilisateurs qui l\'utilisent rejoignent avec le rôle défini)</li></ul><h3>Choisir le bon rôle</h3><p>Attribuez le rôle qui correspond aux responsabilités de chaque membre :</p><ul><li><strong>Admin</strong> : accès complet à l\'administration</li><li><strong>Dirigeant</strong> : consultation globale + validations</li><li><strong>Secrétaire</strong> : agenda, courrier, visiteurs, GED</li><li><strong>RH</strong> : module ressources humaines</li><li><strong>Comptable</strong> : module financier et facturation</li></ul><h2>Suivi des invitations</h2><p>Les invitations en attente sont visibles dans Administration &gt; Utilisateurs &gt; Invitations. Vous pouvez renvoyer un e-mail d\'invitation ou annuler une invitation non acceptée. Après 7 jours sans réponse, l\'invitation expire automatiquement.</p><blockquote><strong>Conseil :</strong> Informez vos collaborateurs par téléphone qu\'une invitation leur a été envoyée, pour éviter que l\'e-mail ne soit filtré en spam.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Invite your team',
                                'summary' => 'Add your colleagues to SECRETIS and manage their roles and access.',
                                'content' => '<h2>Inviting users</h2><p>Only administrators can invite new users. Go to Administration &gt; Users &gt; Invite a user.</p><h3>Invitation methods</h3><ul><li><strong>Individual invitation</strong>: enter the email, choose the role and click Invite</li><li><strong>Bulk invitation</strong>: import a CSV file</li><li><strong>Invitation link</strong>: generate a shareable link valid for 7 days</li></ul><h2>Tracking invitations</h2><p>Pending invitations are visible in Administration &gt; Users &gt; Invitations. You can resend an invitation email or cancel an unaccepted invitation.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'activer-l-authentification-double-facteur-2fa',
                        'order'             => 5,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Activer l\'authentification double facteur (2FA)',
                                'summary' => 'Sécurisez votre compte avec la double authentification pour une protection maximale.',
                                'content' => '<h2>Pourquoi activer le 2FA ?</h2><p>L\'authentification à deux facteurs (2FA) ajoute une couche de sécurité supplémentaire à votre compte. Même si quelqu\'un obtient votre mot de passe, il ne peut pas accéder à votre compte sans le code temporaire généré par votre téléphone.</p><h2>Activer le 2FA</h2><ol><li>Allez dans Paramètres &gt; Sécurité &gt; Authentification à deux facteurs</li><li>Cliquez sur « Activer »</li><li>Installez une application d\'authentification sur votre smartphone : <ul><li>Google Authenticator (Android/iOS)</li><li>Authy (Android/iOS, avec sauvegarde cloud)</li><li>Microsoft Authenticator</li></ul></li><li>Scannez le QR code affiché avec l\'application</li><li>Saisissez le code à 6 chiffres généré pour confirmer</li><li>Sauvegardez les codes de secours affichés dans un endroit sûr</li></ol><blockquote><strong>Important :</strong> Les codes de secours vous permettent de vous connecter si vous perdez votre téléphone. Conservez-les précieusement hors ligne.</blockquote><h2>Connexion avec le 2FA activé</h2><p>À chaque connexion, après avoir saisi votre e-mail et mot de passe, SECRETIS vous demande le code à 6 chiffres actuel de votre application d\'authentification. Ce code se renouvelle toutes les 30 secondes.</p><h2>Désactiver le 2FA</h2><p>Si vous souhaitez désactiver le 2FA, allez dans Paramètres &gt; Sécurité et cliquez sur « Désactiver ». Vous devrez saisir votre mot de passe pour confirmer. Les administrateurs peuvent imposer le 2FA obligatoire pour tous les utilisateurs depuis Administration &gt; Sécurité &gt; Politique 2FA.</p>',
                            ],
                            'en' => [
                                'title'   => 'Enable two-factor authentication (2FA)',
                                'summary' => 'Secure your account with two-factor authentication for maximum protection.',
                                'content' => '<h2>Why enable 2FA?</h2><p>Two-factor authentication (2FA) adds an extra security layer to your account. Even if someone obtains your password, they cannot access your account without the temporary code generated by your phone.</p><h2>Enabling 2FA</h2><ol><li>Go to Settings &gt; Security &gt; Two-factor authentication</li><li>Click "Enable"</li><li>Install an authenticator app on your smartphone (Google Authenticator, Authy, Microsoft Authenticator)</li><li>Scan the displayed QR code with the app</li><li>Enter the 6-digit code generated to confirm</li><li>Save the displayed backup codes in a safe place</li></ol><blockquote><strong>Important:</strong> Backup codes allow you to log in if you lose your phone. Keep them safely offline.</blockquote>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 2 : Agenda & Planification
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'agenda-planification',
                'icon'        => 'CalendarDays',
                'color'       => '#2E86C1',
                'order'       => 2,
                'role_target' => 'all',
                'translations' => [
                    'fr' => ['title' => 'Agenda & Planification', 'description' => 'Gérez vos événements, réunions et ressources avec l\'agenda SECRETIS.'],
                    'en' => ['title' => 'Calendar & Planning', 'description' => 'Manage your events, meetings and resources with SECRETIS calendar.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'creer-et-gerer-vos-evenements',
                        'order'             => 1,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Créer et gérer vos événements',
                                'summary' => 'Guide complet pour créer, modifier, supprimer et organiser vos événements dans l\'agenda.',
                                'content' => '<h2>Créer un événement</h2><p>Dans le module Agenda, cliquez sur le bouton bleu « + Nouvel événement » ou directement sur un créneau dans la vue calendrier. Le formulaire de création s\'ouvre.</p><h3>Champs obligatoires</h3><ul><li><strong>Titre</strong> : nom de l\'événement</li><li><strong>Date et heure de début</strong></li><li><strong>Date et heure de fin</strong> (ou activer « Journée entière »)</li></ul><h3>Champs optionnels</h3><ul><li>Description (texte riche)</li><li>Lieu (adresse textuelle ou lien de visioconférence)</li><li>Couleur de catégorie</li><li>Participants internes et externes</li><li>Salle de réunion</li><li>Rappels</li><li>Récurrence</li><li>Pièces jointes</li></ul><h2>Vues disponibles</h2><p>L\'agenda propose 5 vues adaptées à vos besoins :</p><ul><li><strong>Jour</strong> : détail heure par heure d\'une journée</li><li><strong>Semaine</strong> : vue standard 7 jours</li><li><strong>Mois</strong> : vue mensuelle avec densité d\'événements</li><li><strong>Planning</strong> : liste chronologique des prochains événements</li><li><strong>Ressources</strong> : vue par salle ou équipement</li></ul><h2>Modifier un événement</h2><p>Cliquez sur l\'événement pour ouvrir la fiche de détail, puis sur le bouton Modifier (crayon). Pour les événements récurrents, choisissez de modifier cette occurrence seulement, cette occurrence et les suivantes, ou toute la série.</p><blockquote><strong>Astuce :</strong> Glissez-déposez un événement dans la vue semaine ou jour pour le déplacer rapidement. Un redimensionnement par le bord inférieur permet de changer la durée.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Create and manage your events',
                                'summary' => 'Complete guide to creating, editing, deleting and organising events in the calendar.',
                                'content' => '<h2>Creating an event</h2><p>In the Calendar module, click the blue "+ New event" button or directly on a time slot in the calendar view.</p><h3>Required fields</h3><ul><li><strong>Title</strong>: event name</li><li><strong>Start date and time</strong></li><li><strong>End date and time</strong> (or enable "All day")</li></ul><h2>Available views</h2><p>The calendar offers 5 views: Day, Week, Month, Schedule and Resources.</p><blockquote><strong>Tip:</strong> Drag and drop an event in the week or day view to move it quickly.</blockquote>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'planifier-reunions-avec-participants',
                        'order'             => 2,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Planifier des réunions avec des participants',
                                'summary' => 'Invitez des participants, vérifiez les disponibilités et gérez les confirmations de présence.',
                                'content' => '<h2>Inviter des participants</h2><p>Dans le formulaire de réunion, le champ « Participants » accepte deux types d\'invités :</p><ul><li><strong>Internes</strong> : tapez le nom ou l\'e-mail d\'un membre de votre organisation. SECRETIS affiche les suggestions en temps réel.</li><li><strong>Externes</strong> : saisissez directement l\'adresse e-mail complète. Un e-mail d\'invitation standard est envoyé.</li></ul><h2>Vérifier les disponibilités</h2><p>Avant de finaliser l\'heure, cliquez sur « Voir les disponibilités ». Une grille horizontale affiche les créneaux de chaque participant :</p><ul><li>Vert : disponible</li><li>Rouge/Gris : occupé (événement existant)</li><li>Jaune : heure de travail non standard</li></ul><p>Cliquez sur « Suggérer un créneau » pour que SECRETIS trouve automatiquement le premier créneau commun disponible selon vos critères (durée, dans les X prochains jours).</p><h2>Suivi des confirmations</h2><p>Après envoi, ouvrez l\'événement &gt; onglet Participants pour voir le statut de réponse de chacun :</p><ul><li>✅ Accepté</li><li>❌ Refusé (avec motif optionnel)</li><li>⏳ En attente</li><li>❓ Peut-être</li></ul><p>Vous pouvez envoyer un rappel d\'invitation aux personnes n\'ayant pas encore répondu via le bouton « Relancer ».</p><blockquote><strong>Note :</strong> Les participants externes reçoivent un e-mail avec les boutons Accepter / Refuser / Peut-être. Leur réponse met à jour automatiquement le statut dans SECRETIS.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Schedule meetings with participants',
                                'summary' => 'Invite participants, check availability and manage attendance confirmations.',
                                'content' => '<h2>Inviting participants</h2><p>In the meeting form, the "Participants" field accepts internal members (type name or email) and external guests (enter email directly).</p><h2>Checking availability</h2><p>Click "View availability" to see a grid of each participant\'s schedule. Click "Suggest a slot" for SECRETIS to automatically find the first common available slot.</p><h2>Tracking confirmations</h2><p>After sending, open the event &gt; Participants tab to see each person\'s response: Accepted, Declined, Pending or Maybe.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'gerer-salles-et-ressources',
                        'order'             => 3,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Gérer les salles et ressources',
                                'summary' => 'Configurez et réservez les salles de réunion et autres ressources partagées.',
                                'content' => '<h2>Configurer les salles de réunion</h2><p>Les administrateurs configurent les salles dans Administration &gt; Ressources &gt; Salles. Pour chaque salle, renseignez :</p><ul><li>Nom et numéro de salle</li><li>Capacité maximale (personnes)</li><li>Équipements disponibles (projecteur, visioconférence, tableau blanc…)</li><li>Photo de la salle (optionnel)</li><li>Horaires de disponibilité</li><li>Règles de réservation (minimum/maximum de durée, préavis requis)</li></ul><h2>Réserver une salle</h2><p>Lors de la création d\'un événement, la section « Salle de réunion » affiche uniquement les salles disponibles au créneau sélectionné. Filtrez par capacité ou équipement. La réservation est confirmée dès que vous sauvegardez l\'événement.</p><h2>Autres ressources</h2><p>Outre les salles, vous pouvez gérer d\'autres ressources partagées : véhicules de service, matériel audiovisuel, espaces de coworking. Configurez-les dans Administration &gt; Ressources &gt; Autres ressources.</p><blockquote><strong>Note :</strong> Si une salle est supprimée ou devenue indisponible, tous les événements futurs associés reçoivent une notification automatique pour signaler le conflit.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Manage rooms and resources',
                                'summary' => 'Configure and book meeting rooms and other shared resources.',
                                'content' => '<h2>Configuring meeting rooms</h2><p>Administrators configure rooms in Administration &gt; Resources &gt; Rooms. For each room, enter: name, capacity, available equipment, availability hours and booking rules.</p><h2>Booking a room</h2><p>When creating an event, the "Meeting room" section shows only rooms available at the selected time slot. Filter by capacity or equipment.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'configurer-rappels-automatiques',
                        'order'             => 4,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Configurer les rappels automatiques',
                                'summary' => 'Mettez en place des rappels personnalisés pour ne jamais manquer un événement important.',
                                'content' => '<h2>Rappels par événement</h2><p>Dans le formulaire de chaque événement, la section « Rappels » vous permet d\'ajouter un ou plusieurs rappels avec des délais configurables :</p><ul><li>5, 10, 15, 30 minutes avant</li><li>1, 2, 4, 12, 24 heures avant</li><li>1, 2, 7 jours avant</li><li>Délai personnalisé (saisissez n\'importe quelle valeur)</li></ul><h2>Canaux de notification</h2><p>Pour chaque rappel, choisissez le canal :</p><ul><li><strong>Notification in-app</strong> : alerte dans l\'interface SECRETIS</li><li><strong>E-mail</strong> : message dans votre boîte e-mail</li><li><strong>SMS</strong> : si le module SMS est activé (nécessite crédit SMS)</li></ul><h2>Rappels par défaut</h2><p>Évitez de configurer manuellement les rappels sur chaque événement en définissant vos rappels par défaut : allez dans Paramètres &gt; Agenda &gt; Rappels par défaut et configurez votre séquence habituelle. Ces rappels s\'appliquent automatiquement à tous les nouveaux événements.</p>',
                            ],
                            'en' => [
                                'title'   => 'Configure automatic reminders',
                                'summary' => 'Set up personalised reminders to never miss an important event.',
                                'content' => '<h2>Per-event reminders</h2><p>In each event form, the "Reminders" section lets you add one or more reminders with configurable delays (5 min, 15 min, 1 hour, 1 day before, etc.).</p><h2>Notification channels</h2><p>For each reminder, choose the channel: in-app notification, email, or SMS (if the SMS module is enabled).</p><h2>Default reminders</h2><p>Set your default reminders in Settings &gt; Calendar &gt; Default reminders so they apply automatically to all new events.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'synchroniser-calendrier-externe',
                        'order'             => 5,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Synchroniser avec votre calendrier externe',
                                'summary' => 'Connectez SECRETIS à Google Calendar, Outlook ou tout calendrier compatible iCal.',
                                'content' => '<h2>Intégrations disponibles</h2><p>SECRETIS peut synchroniser votre agenda avec :</p><ul><li><strong>Google Calendar</strong> : synchronisation OAuth bidirectionnelle</li><li><strong>Microsoft Outlook / Office 365</strong> : via Microsoft Graph API</li><li><strong>Apple Calendar</strong> : via abonnement iCal (lecture seule)</li><li><strong>Tout calendrier compatible CalDAV/iCal</strong></li></ul><h2>Configurer Google Calendar</h2><ol><li>Allez dans Paramètres &gt; Intégrations &gt; Google Calendar</li><li>Cliquez sur « Connecter avec Google »</li><li>Autorisez l\'accès SECRETIS à votre compte Google</li><li>Sélectionnez les agendas Google à synchroniser (vous pouvez en sélectionner plusieurs)</li><li>Choisissez la direction de synchronisation : bidirectionnelle, SECRETIS vers Google, ou Google vers SECRETIS</li></ol><h2>Fréquence de synchronisation</h2><p>La synchronisation s\'effectue automatiquement toutes les 5 minutes. Vous pouvez forcer une synchronisation immédiate depuis le bouton « Synchroniser maintenant » dans les paramètres de l\'intégration.</p><blockquote><strong>Note :</strong> Les événements créés dans Google Calendar mais marqués comme « Privé » ne sont pas importés dans SECRETIS pour protéger votre vie privée.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Sync with your external calendar',
                                'summary' => 'Connect SECRETIS to Google Calendar, Outlook or any iCal-compatible calendar.',
                                'content' => '<h2>Available integrations</h2><p>SECRETIS can sync with Google Calendar, Microsoft Outlook/Office 365, Apple Calendar (read-only via iCal) and any CalDAV/iCal compatible calendar.</p><h2>Setting up Google Calendar</h2><ol><li>Go to Settings &gt; Integrations &gt; Google Calendar</li><li>Click "Connect with Google"</li><li>Authorise SECRETIS access to your Google account</li><li>Select Google calendars to sync</li></ol><p>Sync runs automatically every 5 minutes or you can force an immediate sync.</p>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 3 : Gestion documentaire
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'gestion-documentaire',
                'icon'        => 'FolderOpen',
                'color'       => '#F39C12',
                'order'       => 3,
                'role_target' => 'all',
                'translations' => [
                    'fr' => ['title' => 'Gestion documentaire', 'description' => 'Organisez, partagez et gérez tous vos documents en toute sécurité.'],
                    'en' => ['title' => 'Document Management', 'description' => 'Organise, share and manage all your documents securely.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'organiser-vos-documents-en-dossiers',
                        'order'             => 1,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Organiser vos documents en dossiers',
                                'summary' => 'Créez une arborescence efficace pour classer et retrouver facilement tous vos documents.',
                                'content' => '<h2>Structure de la GED</h2><p>La Gestion Électronique de Documents (GED) de SECRETIS fonctionne comme un explorateur de fichiers avancé. La racine de votre espace documentaire est divisée en espaces :</p><ul><li><strong>Mes documents</strong> : documents personnels (visibles uniquement par vous)</li><li><strong>Documents d\'organisation</strong> : espace partagé de toute l\'organisation</li><li><strong>Projets</strong> : documents liés à des projets spécifiques</li><li><strong>Archives</strong> : documents archivés</li></ul><h2>Créer des dossiers</h2><p>Dans n\'importe quel espace, cliquez sur « + Nouveau dossier » (ou clic droit &gt; Nouveau dossier). Donnez un nom explicite et choisissez éventuellement une couleur d\'identification. Les dossiers peuvent être imbriqués à n\'importe quelle profondeur.</p><h2>Bonnes pratiques d\'organisation</h2><p>Nous recommandons une structure basée sur vos processus métier :</p><ul><li><code>Administration/</code><ul><li><code>Courrier entrant/</code></li><li><code>Courrier sortant/</code></li><li><code>Comptes-rendus/</code></li></ul></li><li><code>RH/</code><ul><li><code>Contrats/</code></li><li><code>Formation/</code></li></ul></li><li><code>Finance/</code><ul><li><code>Factures/2025/</code></li><li><code>Contrats fournisseurs/</code></li></ul></li></ul><h2>Déplacer et renommer</h2><p>Glissez-déposez les documents et dossiers pour les réorganiser. Clic droit &gt; Renommer pour changer le nom. Le déplacement d\'un dossier déplace automatiquement tout son contenu.</p>',
                            ],
                            'en' => [
                                'title'   => 'Organise your documents into folders',
                                'summary' => 'Create an efficient hierarchy to classify and easily find all your documents.',
                                'content' => '<h2>DMS structure</h2><p>The SECRETIS Document Management System works like an advanced file explorer with spaces: My documents, Organisation documents, Projects and Archives.</p><h2>Creating folders</h2><p>In any space, click "+ New folder" (or right-click &gt; New folder). Folders can be nested to any depth.</p><h2>Moving and renaming</h2><p>Drag and drop documents and folders to reorganise. Right-click &gt; Rename to change the name.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'partager-et-controler-acces-aux-documents',
                        'order'             => 2,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Partager et contrôler l\'accès aux documents',
                                'summary' => 'Maîtrisez qui peut voir, modifier ou télécharger chaque document de votre organisation.',
                                'content' => '<h2>Niveaux d\'accès</h2><p>SECRETIS propose 4 niveaux de droits sur les documents et dossiers :</p><ul><li><strong>Aucun accès</strong> : document invisible</li><li><strong>Lecture</strong> : consultation et téléchargement</li><li><strong>Commentaire</strong> : lecture + ajout de commentaires et annotations</li><li><strong>Modification</strong> : tout + édition, upload de nouvelles versions</li><li><strong>Propriétaire</strong> : tout + partage et suppression</li></ul><h2>Partager avec des internes</h2><p>Clic droit sur le document ou dossier &gt; Partager. Dans le champ Utilisateurs, cherchez par nom. Choisissez le niveau d\'accès et cliquez sur Inviter. Le destinataire reçoit une notification in-app et par e-mail.</p><h2>Partager avec des externes</h2><p>Pour partager avec quelqu\'un qui n\'a pas de compte SECRETIS :</p><ol><li>Clic droit &gt; Partager &gt; Lien de partage externe</li><li>Définissez la date d\'expiration du lien (1 jour à 30 jours)</li><li>Optionnellement, protégez le lien par un mot de passe</li><li>Choisissez le niveau d\'accès (lecture ou commentaire uniquement pour les externes)</li><li>Copiez le lien et envoyez-le</li></ol><blockquote><strong>Sécurité :</strong> Les liens de partage externe peuvent être révoqués à tout moment depuis la liste des partages actifs du document.</blockquote><h2>Permissions héritées</h2><p>Les droits appliqués à un dossier s\'héritent automatiquement par tous les sous-dossiers et documents qu\'il contient, sauf si des droits spécifiques sont définis à un niveau inférieur.</p>',
                            ],
                            'en' => [
                                'title'   => 'Share and control access to documents',
                                'summary' => 'Control who can view, edit or download each document in your organisation.',
                                'content' => '<h2>Access levels</h2><p>SECRETIS offers 4 rights levels: None, Read, Comment, Edit and Owner.</p><h2>Sharing with internals</h2><p>Right-click on a document or folder &gt; Share. Search by name, choose the access level and click Invite.</p><h2>Sharing with externals</h2><p>For sharing with someone without a SECRETIS account, use Share &gt; External share link with an expiry date and optional password protection.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'utiliser-les-modeles-de-documents',
                        'order'             => 3,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Utiliser les modèles de documents',
                                'summary' => 'Accélérez la création de vos documents récurrents grâce aux modèles personnalisables.',
                                'content' => '<h2>Bibliothèque de modèles</h2><p>SECRETIS inclut une bibliothèque de modèles préconçus adaptés au contexte africain et aux normes OHADA :</p><ul><li>Lettre administrative</li><li>Compte-rendu de réunion</li><li>Contrat de travail (CDI, CDD)</li><li>Bon de commande</li><li>Facture pro forma</li><li>Note de service</li><li>Rapport d\'activité</li><li>Procès-verbal d\'assemblée</li></ul><h2>Créer un document depuis un modèle</h2><ol><li>Allez dans GED &gt; Modèles ou cliquez sur « + Nouveau » &gt; Depuis un modèle</li><li>Sélectionnez le modèle souhaité</li><li>Remplissez le formulaire de variables (nom, date, objet, destinataire…)</li><li>Prévisualisez le document généré</li><li>Cliquez sur « Créer » pour sauvegarder le document dans la GED</li></ol><h2>Créer vos propres modèles</h2><p>Dans GED &gt; Modèles &gt; Nouveau modèle, uploadez votre document Word (.docx) contenant des variables entre doubles accolades : <code>{{nom_client}}</code>, <code>{{date}}</code>, <code>{{montant}}</code>. SECRETIS détecte automatiquement toutes les variables et crée le formulaire correspondant.</p><blockquote><strong>Conseil :</strong> Créez des modèles pour tous vos documents récurrents et gagnez 80% de temps sur leur production.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Use document templates',
                                'summary' => 'Speed up creation of recurring documents with customisable templates.',
                                'content' => '<h2>Template library</h2><p>SECRETIS includes pre-built templates adapted to the African context and OHADA standards: administrative letters, meeting minutes, employment contracts, purchase orders, pro forma invoices, etc.</p><h2>Creating from a template</h2><ol><li>Go to DMS &gt; Templates or click "+ New" &gt; From a template</li><li>Select the desired template</li><li>Fill in the variables form</li><li>Preview and click "Create"</li></ol><h2>Creating your own templates</h2><p>Upload a Word document (.docx) with variables in double braces: <code>{{client_name}}</code>, <code>{{date}}</code>. SECRETIS automatically detects all variables.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'archiver-et-retrouver-vos-documents',
                        'order'             => 4,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Archiver et retrouver vos documents',
                                'summary' => 'Archivez les documents obsolètes sans les perdre, et retrouvez n\'importe quel document en quelques secondes.',
                                'content' => '<h2>Archiver un document</h2><p>L\'archivage permet de retirer un document de l\'espace actif sans le supprimer. Idéal pour les documents de référence anciens que vous souhaitez garder accessibles.</p><p>Pour archiver : clic droit &gt; Archiver (ou sélectionnez plusieurs documents puis Actions &gt; Archiver). Le document est déplacé dans la zone Archives et n\'apparaît plus dans les recherches par défaut.</p><h2>Politique d\'archivage automatique</h2><p>Les administrateurs peuvent configurer des règles d\'archivage automatique dans Administration &gt; GED &gt; Politique d\'archivage :</p><ul><li>Archiver les documents non modifiés depuis X mois</li><li>Archiver les documents d\'un certain type après une date</li><li>Archiver quand un projet est marqué « Terminé »</li></ul><h2>Recherche avancée</h2><p>La barre de recherche (Ctrl+K) offre des filtres avancés :</p><ul><li><strong>Type</strong> : PDF, Word, Excel, Image…</li><li><strong>Statut</strong> : Actif, Archivé, Tous</li><li><strong>Propriétaire</strong> : par utilisateur</li><li><strong>Date de création/modification</strong> : plages personnalisées</li><li><strong>Tags</strong> : recherche par mots-clés</li><li><strong>Contenu</strong> : recherche en plein texte dans les PDF</li></ul>',
                            ],
                            'en' => [
                                'title'   => 'Archive and retrieve your documents',
                                'summary' => 'Archive obsolete documents without losing them, and find any document in seconds.',
                                'content' => '<h2>Archiving a document</h2><p>Right-click &gt; Archive (or select multiple documents then Actions &gt; Archive). The document moves to the Archives area and no longer appears in default searches.</p><h2>Advanced search</h2><p>The search bar (Ctrl+K) offers advanced filters: type, status (active/archived/all), owner, date range, tags and full-text content search in PDFs.</p>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 4 : Tâches & Projets
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'taches-projets',
                'icon'        => 'CheckSquare',
                'color'       => '#1E8449',
                'order'       => 4,
                'role_target' => 'all',
                'translations' => [
                    'fr' => ['title' => 'Tâches & Projets', 'description' => 'Planifiez, suivez et complétez vos tâches individuelles et projets d\'équipe.'],
                    'en' => ['title' => 'Tasks & Projects', 'description' => 'Plan, track and complete your individual tasks and team projects.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'creer-et-affecter-des-taches',
                        'order'             => 1,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Créer et affecter des tâches',
                                'summary' => 'Créez des tâches détaillées, assignez-les à vos collègues et suivez leur avancement.',
                                'content' => '<h2>Créer une tâche</h2><p>Dans le module Tâches, cliquez sur « + Nouvelle tâche » ou utilisez le raccourci <kbd>T</kbd> depuis n\'importe quelle page.</p><h3>Informations d\'une tâche</h3><ul><li><strong>Titre</strong> : description courte et actionnable</li><li><strong>Description</strong> : détails, contexte, instructions (éditeur riche)</li><li><strong>Assigné à</strong> : un ou plusieurs membres de l\'organisation</li><li><strong>Priorité</strong> : Basse, Normale, Haute, Urgente</li><li><strong>Date d\'échéance</strong> : date et heure limite</li><li><strong>Estimation de durée</strong> : en heures (pour la planification)</li><li><strong>Étiquettes/Tags</strong> : classification libre</li><li><strong>Projet parent</strong> : rattache la tâche à un projet</li><li><strong>Sous-tâches</strong> : décomposez en étapes</li><li><strong>Pièces jointes</strong> : fichiers ou liens GED</li></ul><h2>Affecter une tâche</h2><p>Le champ « Assigné à » accepte un ou plusieurs utilisateurs. Chaque assigné reçoit une notification immédiate et voit la tâche dans son tableau de bord personnel. Si aucun utilisateur n\'est assigné, la tâche reste dans votre liste personnelle.</p><h2>Statuts de tâche</h2><ul><li>📋 <strong>À faire</strong> : tâche créée, non commencée</li><li>🔄 <strong>En cours</strong> : travail en progression</li><li>⏸️ <strong>En attente</strong> : bloquée par une dépendance externe</li><li>✅ <strong>Terminée</strong> : complétée</li><li>❌ <strong>Annulée</strong> : abandonnée</li></ul><blockquote><strong>Astuce :</strong> Créez une tâche directement depuis SARA en lui disant « Crée une tâche : [description] pour [personne] avant [date] ».</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Create and assign tasks',
                                'summary' => 'Create detailed tasks, assign them to colleagues and track their progress.',
                                'content' => '<h2>Creating a task</h2><p>In the Tasks module, click "+ New task" or use the shortcut <kbd>T</kbd> from any page.</p><h2>Task information</h2><p>Fill in: title, description, assignee(s), priority (Low/Normal/High/Urgent), due date, time estimate, tags, parent project, sub-tasks and attachments.</p><h2>Task statuses</h2><ul><li>To do, In progress, On hold, Done, Cancelled.</li></ul>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'utiliser-la-vue-kanban',
                        'order'             => 2,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Utiliser la vue Kanban',
                                'summary' => 'Visualisez et gérez votre flux de travail avec la vue Kanban intuitive de SECRETIS.',
                                'content' => '<h2>Activer la vue Kanban</h2><p>Dans le module Tâches, cliquez sur l\'icône Kanban (quatre colonnes) dans la barre de vues en haut à droite. La vue bascule entre Liste, Kanban, Calendrier et Gantt.</p><h2>Colonnes par défaut</h2><p>La vue Kanban affiche par défaut les colonnes correspondant aux statuts :</p><ul><li><strong>À faire</strong> (bleu)</li><li><strong>En cours</strong> (orange)</li><li><strong>En attente</strong> (jaune)</li><li><strong>Terminé</strong> (vert)</li></ul><h2>Personnaliser les colonnes</h2><p>Les administrateurs et chefs de projet peuvent ajouter des colonnes personnalisées (ex : « En révision », « En validation », « Déployé »). Allez dans les paramètres du projet &gt; Colonnes Kanban &gt; + Ajouter une colonne.</p><h2>Utiliser le Kanban</h2><ul><li><strong>Déplacer une tâche</strong> : glissez-déposez entre les colonnes. Le statut est mis à jour automatiquement.</li><li><strong>Voir les détails</strong> : cliquez sur une carte tâche pour ouvrir le panneau latéral.</li><li><strong>Créer rapidement</strong> : cliquez sur « + » au bas d\'une colonne pour créer une tâche directement dans ce statut.</li><li><strong>Filtrer</strong> : filtrez le Kanban par assigné, priorité, tags ou date pour vous concentrer.</li></ul><blockquote><strong>Conseil :</strong> En fin de journée, passez 5 minutes à mettre à jour votre Kanban. Vos managers voient l\'avancement en temps réel sans avoir à vous demander de rapports.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Using the Kanban view',
                                'summary' => 'Visualise and manage your workflow with SECRETIS\'s intuitive Kanban view.',
                                'content' => '<h2>Enabling Kanban view</h2><p>In the Tasks module, click the Kanban icon in the top-right view bar. Default columns match statuses: To do, In progress, On hold, Done.</p><h2>Customising columns</h2><p>Administrators and project managers can add custom columns (e.g. "In review", "Deployed") from project settings &gt; Kanban columns.</p><h2>Using Kanban</h2><p>Drag and drop tasks between columns (status updates automatically), click cards to see details, click "+" at the bottom of a column to create a task in that status.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'suivre-l-avancement-des-projets',
                        'order'             => 3,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Suivre l\'avancement des projets',
                                'summary' => 'Utilisez les outils de suivi de SECRETIS pour piloter vos projets et respecter vos délais.',
                                'content' => '<h2>Vue d\'ensemble du projet</h2><p>Ouvrez un projet pour accéder au tableau de bord du projet. Il affiche :</p><ul><li>Pourcentage de complétion global (calculé automatiquement)</li><li>Tâches en retard / à venir / terminées</li><li>Diagramme de Gantt interactif</li><li>Charge de travail par membre</li><li>Risques signalés</li></ul><h2>Diagramme de Gantt</h2><p>La vue Gantt (onglet Gantt dans un projet) affiche toutes les tâches sur une ligne de temps. Chaque barre représente une tâche avec sa durée et ses dépendances. Vous pouvez :</p><ul><li>Glisser les barres pour modifier les dates</li><li>Créer des dépendances entre tâches (fin-début, début-début)</li><li>Identifier le chemin critique (tâches sans marge)</li></ul><h2>Jalons</h2><p>Créez des jalons (tâches de type « Milestone ») pour marquer les dates clés du projet. Les jalons apparaissent comme des diamants sur le Gantt et sont listés séparément dans le tableau de bord.</p><h2>Signaler un risque ou un blocage</h2><p>Sur n\'importe quelle tâche ou dans le tableau de bord du projet, cliquez sur « Signaler un risque ». Décrivez le problème, son impact et les actions proposées. Une notification est envoyée au chef de projet et aux parties prenantes concernées.</p>',
                            ],
                            'en' => [
                                'title'   => 'Track project progress',
                                'summary' => 'Use SECRETIS tracking tools to steer your projects and meet your deadlines.',
                                'content' => '<h2>Project overview</h2><p>The project dashboard displays: overall completion percentage, overdue/upcoming/completed tasks, interactive Gantt chart and workload per member.</p><h2>Gantt chart</h2><p>The Gantt view shows all tasks on a timeline. Drag bars to change dates, create dependencies between tasks and identify the critical path.</p><h2>Milestones</h2><p>Create milestone tasks to mark key project dates. They appear as diamonds on the Gantt and are listed separately.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'generer-rapports-d-activite',
                        'order'             => 4,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Générer des rapports d\'activité',
                                'summary' => 'Produisez des rapports clairs sur l\'activité de votre équipe et l\'avancement de vos projets.',
                                'content' => '<h2>Rapports disponibles</h2><p>Dans Tâches &gt; Rapports, vous avez accès à plusieurs rapports prêts à l\'emploi :</p><ul><li><strong>Rapport d\'activité par utilisateur</strong> : tâches créées, complétées, en retard par personne et par période</li><li><strong>Rapport d\'avancement de projet</strong> : progression globale, jalons atteints, risques</li><li><strong>Rapport de charge de travail</strong> : distribution des tâches et heures estimées par membre</li><li><strong>Rapport de performance d\'équipe</strong> : taux de complétion dans les délais, temps moyen de résolution</li></ul><h2>Générer un rapport</h2><ol><li>Sélectionnez le type de rapport</li><li>Définissez la période (semaine, mois, trimestre, personnalisé)</li><li>Filtrez par projet, équipe ou utilisateur si nécessaire</li><li>Cliquez sur « Générer »</li><li>Exportez en PDF, Excel ou partagez par lien</li></ol><h2>Planifier des rapports automatiques</h2><p>Cliquez sur « Planifier ce rapport » pour l\'envoyer automatiquement par e-mail chaque semaine ou chaque mois à votre direction ou aux parties prenantes.</p>',
                            ],
                            'en' => [
                                'title'   => 'Generate activity reports',
                                'summary' => 'Produce clear reports on your team\'s activity and project progress.',
                                'content' => '<h2>Available reports</h2><p>In Tasks &gt; Reports: activity report per user, project progress report, workload report and team performance report.</p><h2>Generating a report</h2><ol><li>Select the report type</li><li>Define the period</li><li>Filter by project, team or user</li><li>Click "Generate" and export as PDF, Excel or share by link</li></ol>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 5 : Gestion des visiteurs
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'gestion-des-visiteurs',
                'icon'        => 'UserGroup',
                'color'       => '#8E44AD',
                'order'       => 5,
                'role_target' => 'secretaire',
                'translations' => [
                    'fr' => ['title' => 'Gestion des visiteurs', 'description' => 'Gérez l\'accueil et le suivi des visiteurs de votre organisation.'],
                    'en' => ['title' => 'Visitor Management', 'description' => 'Manage the reception and tracking of your organisation\'s visitors.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'enregistrer-un-visiteur-a-l-arrivee',
                        'order'             => 1,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Enregistrer un visiteur à l\'arrivée',
                                'summary' => 'Guide pas à pas pour enregistrer rapidement un visiteur dès son arrivée à l\'accueil.',
                                'content' => '<h2>Enregistrement depuis l\'interface principale</h2><p>Dans le module Visiteurs, cliquez sur le grand bouton vert « Enregistrer un visiteur ». Le formulaire d\'arrivée s\'ouvre.</p><h3>Informations à saisir</h3><ul><li><strong>Nom et prénom</strong> du visiteur (obligatoire)</li><li><strong>Entreprise / Organisation</strong> (optionnel)</li><li><strong>Personne visitée</strong> : sélectionnez le membre interne (obligatoire)</li><li><strong>Objet de la visite</strong> : description courte</li><li><strong>Pièce d\'identité</strong> : numéro (optionnel, selon votre politique)</li><li><strong>Photo</strong> : prise via webcam ou upload</li><li><strong>Signature électronique</strong> : pour le registre des visiteurs</li></ul><h2>Enregistrement en mode kiosque</h2><p>Si une tablette est configurée en mode kiosque (voir guide dédié), le visiteur saisit lui-même ses informations. L\'interface kiosque est simplifiée avec de gros boutons tactiles, disponible en français et en anglais.</p><h2>Badge visiteur</h2><p>Après enregistrement, SECRETIS génère automatiquement un badge PDF contenant :</p><ul><li>Nom et photo du visiteur</li><li>Nom de l\'hôte</li><li>Date et heure d\'arrivée</li><li>Zones d\'accès autorisées</li><li>QR code unique pour le départ</li></ul><blockquote><strong>Note :</strong> Si votre imprimante d\'étiquettes est configurée, le badge est imprimé automatiquement. Sinon, imprimez-le sur papier standard A4 plié.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Register a visitor upon arrival',
                                'summary' => 'Step-by-step guide to quickly register a visitor upon arrival at reception.',
                                'content' => '<h2>Registration from main interface</h2><p>In Visitors module, click "Register a visitor". Fill in: name, company, person visited, purpose, optional ID number, photo and electronic signature.</p><h2>Kiosk mode registration</h2><p>If a tablet is in kiosk mode, the visitor enters their own information on a simplified touch-friendly interface available in French and English.</p><h2>Visitor badge</h2><p>After registration, SECRETIS automatically generates a PDF badge with name, photo, host name, arrival time, authorised zones and a unique QR code for departure.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'configurer-notifications-accueil',
                        'order'             => 2,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Configurer les notifications d\'accueil',
                                'summary' => 'Paramétrez les alertes envoyées aux hôtes lors de l\'arrivée de leurs visiteurs.',
                                'content' => '<h2>Notifications aux hôtes</h2><p>Quand un visiteur arrive et que la personne visitée est sélectionnée, SECRETIS envoie une notification automatique à l\'hôte. Configurez les canaux dans Administration &gt; Visiteurs &gt; Notifications :</p><ul><li><strong>Notification in-app</strong> : alerte rouge avec son (activée par défaut)</li><li><strong>E-mail</strong> : e-mail formaté avec photo et infos du visiteur</li><li><strong>SMS</strong> : message court (nécessite crédit SMS)</li></ul><h2>Message de notification personnalisé</h2><p>Personnalisez le message envoyé à l\'hôte dans Administration &gt; Visiteurs &gt; Message de notification. Utilisez des variables dynamiques : <code>{{visiteur_nom}}</code>, <code>{{visiteur_entreprise}}</code>, <code>{{heure_arrivee}}</code>.</p><h2>Notifications au service de sécurité</h2><p>En plus de l\'hôte, vous pouvez configurer une copie de toutes les notifications à une adresse e-mail fixe (ex: securite@votre-organisation.com) ou à un groupe d\'utilisateurs SECRETIS. Utile pour les organisations avec un service de sécurité dédié.</p>',
                            ],
                            'en' => [
                                'title'   => 'Configure reception notifications',
                                'summary' => 'Configure alerts sent to hosts when their visitors arrive.',
                                'content' => '<h2>Host notifications</h2><p>When a visitor arrives, SECRETIS automatically notifies the host via in-app alert, email and/or SMS. Configure channels in Administration &gt; Visitors &gt; Notifications.</p><h2>Custom notification message</h2><p>Customise the message using dynamic variables: <code>{{visitor_name}}</code>, <code>{{visitor_company}}</code>, <code>{{arrival_time}}</code>.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'consulter-historique-des-visites',
                        'order'             => 3,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Consulter l\'historique des visites',
                                'summary' => 'Accédez au registre complet des visites passées et générez des rapports de sécurité.',
                                'content' => '<h2>Registre des visites</h2><p>Allez dans Visiteurs &gt; Historique. Le registre affiche chronologiquement toutes les visites avec :</p><ul><li>Nom du visiteur et entreprise</li><li>Hôte interne</li><li>Date et heure d\'arrivée</li><li>Heure de départ (si enregistrée)</li><li>Durée de la visite</li><li>Objet de la visite</li><li>Photo du visiteur</li></ul><h2>Filtres de recherche</h2><p>Utilisez les filtres pour trouver rapidement :</p><ul><li>Par nom de visiteur ou entreprise</li><li>Par hôte interne</li><li>Par plage de dates</li><li>Par statut (en cours / terminé)</li></ul><h2>Export du registre</h2><p>Cliquez sur « Exporter » pour obtenir le registre au format Excel (avec toutes les colonnes) ou PDF (format signé pour audit). Ce document peut être requis lors de contrôles de sécurité ou d\'audits réglementaires.</p><blockquote><strong>Conformité :</strong> Le registre des visiteurs est conservé automatiquement selon la durée configurée (par défaut 1 an). Les administrateurs peuvent ajuster cette durée dans Administration &gt; Visiteurs &gt; Rétention des données.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'View visit history',
                                'summary' => 'Access the complete record of past visits and generate security reports.',
                                'content' => '<h2>Visit register</h2><p>Go to Visitors &gt; History. The register shows all visits with visitor name, host, arrival/departure time, duration and purpose.</p><h2>Search filters</h2><p>Filter by visitor name, host, date range or status (ongoing/completed).</p><h2>Export</h2><p>Export as Excel (all columns) or PDF (signed format for audit). The register is automatically retained for the configured duration (default 1 year).</p>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 6 : Paiements & Facturation
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'paiements-facturation',
                'icon'        => 'CreditCard',
                'color'       => '#E74C3C',
                'order'       => 6,
                'role_target' => 'admin',
                'translations' => [
                    'fr' => ['title' => 'Paiements & Facturation', 'description' => 'Gérez votre abonnement, vos factures et vos moyens de paiement.'],
                    'en' => ['title' => 'Payments & Billing', 'description' => 'Manage your subscription, invoices and payment methods.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'consulter-vos-factures',
                        'order'             => 1,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Consulter vos factures',
                                'summary' => 'Accédez à toutes vos factures SECRETIS et téléchargez-les en PDF.',
                                'content' => '<h2>Historique de facturation</h2><p>Allez dans Administration &gt; Abonnement &gt; Factures. La liste de toutes vos factures apparaît avec :</p><ul><li>Numéro de facture unique</li><li>Date d\'émission et période couverte</li><li>Montant HT, TVA et TTC</li><li>Statut (Payée, En attente, En retard)</li><li>Mode de paiement utilisé</li></ul><h2>Télécharger une facture</h2><p>Cliquez sur l\'icône de téléchargement (↓) à droite de chaque facture pour obtenir le PDF. Les factures SECRETIS incluent :</p><ul><li>Coordonnées complètes d\'IBIG Soft</li><li>Vos coordonnées et numéro RCCM</li><li>Détail des services facturés</li><li>Mention de conformité OHADA</li><li>Cachet et signature électronique</li></ul><h2>Paramétrer l\'adresse de facturation</h2><p>Pour que vos factures soient adressées au bon service (comptabilité, DAF…), configurez l\'adresse de facturation dans Administration &gt; Abonnement &gt; Informations de facturation. Vous pouvez aussi ajouter une adresse e-mail de copie pour la comptabilité.</p><blockquote><strong>Conseil :</strong> Activez l\'envoi automatique de factures par e-mail à votre comptabilité dans les paramètres. Elles seront envoyées dès le paiement automatique effectué.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'View your invoices',
                                'summary' => 'Access all your SECRETIS invoices and download them as PDF.',
                                'content' => '<h2>Billing history</h2><p>Go to Administration &gt; Subscription &gt; Invoices. All invoices are listed with invoice number, date, period, amount (excl/incl tax), status and payment method.</p><h2>Downloading an invoice</h2><p>Click the download icon next to each invoice for the PDF, which includes IBIG Soft details, your details with RCCM number and OHADA compliance note.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'changer-formule-d-abonnement',
                        'order'             => 2,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Changer de formule d\'abonnement',
                                'summary' => 'Montez ou descendez en gamme selon l\'évolution des besoins de votre organisation.',
                                'content' => $this->contenuFormules('fr'),
                            ],
                            'en' => [
                                'title'   => 'Change your subscription plan',
                                'summary' => 'Upgrade or downgrade according to your organisation\'s evolving needs.',
                                'content' => $this->contenuFormules('en'),
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'configurer-moyens-de-paiement',
                        'order'             => 3,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Configurer les moyens de paiement',
                                'summary' => 'Ajoutez, modifiez et sécurisez vos moyens de paiement pour les renouvellements automatiques.',
                                'content' => '<h2>Moyens de paiement acceptés</h2><p>SECRETIS accepte les moyens de paiement suivants :</p><ul><li><strong>Carte bancaire</strong> : Visa, Mastercard (paiement sécurisé PCI-DSS)</li><li><strong>Mobile Money</strong> : Orange Money, MTN MoMo, Wave, Flooz</li><li><strong>Virement bancaire</strong> : coordonnées fournies sur la facture (délai 3-5 jours)</li><li><strong>Chèque</strong> : uniquement pour les contrats Enterprise annuels</li></ul><h2>Ajouter un moyen de paiement</h2><ol><li>Administration &gt; Abonnement &gt; Moyens de paiement</li><li>Cliquez sur « + Ajouter »</li><li>Sélectionnez le type</li><li>Suivez les instructions sécurisées du prestataire de paiement</li><li>SECRETIS ne stocke jamais vos numéros de carte en clair</li></ol><h2>Moyens de paiement multiples</h2><p>Vous pouvez enregistrer plusieurs moyens de paiement et définir l\'un d\'eux comme « par défaut ». En cas d\'échec du moyen principal, SECRETIS tente automatiquement le suivant enregistré.</p><blockquote><strong>Sécurité :</strong> Toutes les transactions sont sécurisées par TLS 1.3 et notre partenaire de paiement est certifié PCI-DSS niveau 1, le standard le plus élevé de l\'industrie.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Configure payment methods',
                                'summary' => 'Add, update and secure your payment methods for automatic renewals.',
                                'content' => '<h2>Accepted payment methods</h2><p>SECRETIS accepts: Visa/Mastercard bank cards (PCI-DSS secured), Mobile Money (Orange Money, MTN MoMo, Wave), bank transfer and cheques (Enterprise annual only).</p><h2>Adding a payment method</h2><p>Go to Administration &gt; Subscription &gt; Payment methods &gt; + Add. SECRETIS never stores card numbers in plain text.</p><h2>Multiple payment methods</h2><p>Register multiple methods and set one as default. If the primary fails, SECRETIS automatically tries the next one.</p>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 7 : Administration
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'administration',
                'icon'        => 'Cog6Tooth',
                'color'       => '#7F8C8D',
                'order'       => 7,
                'role_target' => 'admin',
                'translations' => [
                    'fr' => ['title' => 'Administration', 'description' => 'Gérez les utilisateurs, les paramètres et la sécurité de votre organisation.'],
                    'en' => ['title' => 'Administration', 'description' => 'Manage users, settings and security of your organisation.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'gerer-utilisateurs-et-roles',
                        'order'             => 1,
                        'read_time_minutes' => 6,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Gérer les utilisateurs et les rôles',
                                'summary' => 'Maîtrisez la gestion des comptes utilisateurs, des rôles et des permissions dans SECRETIS.',
                                'content' => '<h2>Tableau de bord utilisateurs</h2><p>Dans Administration &gt; Utilisateurs, vous avez une vue complète de tous les membres de votre organisation :</p><ul><li>Nom, e-mail, rôle(s), département</li><li>Statut (Actif, Inactif, Invité en attente)</li><li>Date de dernière connexion</li><li>Nombre de sessions actives</li></ul><h2>Inviter un utilisateur</h2><p>Cliquez sur « + Inviter » et renseignez :</p><ul><li>Adresse e-mail</li><li>Rôle initial (peut être changé après)</li><li>Département (optionnel)</li><li>Message personnalisé dans l\'e-mail d\'invitation (optionnel)</li></ul><h2>Gestion des rôles</h2><p>Allez dans Administration &gt; Rôles et permissions. SECRETIS propose des rôles prédéfinis :</p><ul><li><strong>Admin</strong> : accès total sauf super-admin</li><li><strong>Dirigeant</strong> : lecture globale + validation workflow</li><li><strong>Secrétaire</strong> : agenda, courrier, visiteurs, GED</li><li><strong>RH</strong> : module RH complet</li><li><strong>Comptable</strong> : module financier</li><li><strong>Utilisateur standard</strong> : accès de base</li></ul><h2>Créer un rôle personnalisé</h2><ol><li>Cliquez sur « + Nouveau rôle »</li><li>Nommez le rôle (ex : « Responsable Achat »)</li><li>Cochez les permissions une par une ou utilisez « Copier depuis un rôle existant »</li><li>Sauvegardez et assignez à vos utilisateurs</li></ol><h2>Désactiver un utilisateur</h2><p>Dans la fiche de l\'utilisateur, cliquez sur « Désactiver ». L\'utilisateur ne peut plus se connecter mais toutes ses données (tâches, documents, événements) sont conservées et restent visibles. La réactivation est instantanée.</p>',
                            ],
                            'en' => [
                                'title'   => 'Manage users and roles',
                                'summary' => 'Master user account management, roles and permissions in SECRETIS.',
                                'content' => '<h2>Users dashboard</h2><p>In Administration &gt; Users: view all members with name, email, role(s), department, status and last login.</p><h2>Inviting a user</h2><p>Click "+ Invite", enter email, initial role, department and optional personalised message.</p><h2>Custom roles</h2><p>In Administration &gt; Roles and permissions &gt; + New role: name the role, select permissions individually or copy from an existing role.</p><h2>Deactivating a user</h2><p>Click "Deactivate" on the user profile. The user can no longer log in but all their data is preserved. Reactivation is instant.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'configurer-parametres-organisation',
                        'order'             => 2,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Configurer les paramètres de l\'organisation',
                                'summary' => 'Personnalisez SECRETIS aux couleurs et aux besoins spécifiques de votre organisation.',
                                'content' => '<h2>Paramètres généraux</h2><p>Dans Administration &gt; Organisation &gt; Paramètres généraux, configurez :</p><ul><li><strong>Identité visuelle</strong> : logo, couleurs primaire/secondaire, favicon</li><li><strong>Coordonnées</strong> : adresse, téléphone, site web</li><li><strong>Informations légales</strong> : RCCM, NIF, capital social, représentant légal</li><li><strong>Langue par défaut</strong> de l\'organisation</li><li><strong>Fuseau horaire</strong> par défaut</li><li><strong>Devise</strong> principale (XOF, XAF, USD, EUR…)</li></ul><h2>Configuration des modules</h2><p>Dans Administration &gt; Modules, activez ou désactivez chaque module selon vos besoins. Un module désactivé disparaît de la navigation pour tous les utilisateurs. Cela permet de simplifier l\'interface si certaines fonctionnalités ne sont pas utilisées.</p><h2>Personnalisation du domaine</h2><p>Sur le plan Enterprise, vous pouvez utiliser votre propre domaine (ex : secretis.votre-organisation.com) au lieu de l\'URL SECRETIS standard. Contactez notre équipe technique pour la configuration DNS.</p><h2>Personnalisation des e-mails</h2><p>Dans Administration &gt; E-mails, personnalisez l\'en-tête et le pied de page de tous les e-mails envoyés par SECRETIS en votre nom (invitations, notifications, rapports). Ajoutez votre logo et votre signature institutionnelle.</p>',
                            ],
                            'en' => [
                                'title'   => 'Configure organisation settings',
                                'summary' => 'Customise SECRETIS to match your organisation\'s branding and specific needs.',
                                'content' => '<h2>General settings</h2><p>In Administration &gt; Organisation &gt; General settings: visual identity (logo, colours), contact details, legal information, default language, time zone and currency.</p><h2>Module configuration</h2><p>In Administration &gt; Modules, enable or disable each module. Disabled modules disappear from navigation for all users.</p><h2>Custom domain</h2><p>On Enterprise plan, use your own domain (e.g. secretis.your-organisation.com). Contact our technical team for DNS configuration.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'surveiller-activite-journal-audit',
                        'order'             => 3,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Surveiller l\'activité via le journal d\'audit',
                                'summary' => 'Utilisez le journal d\'audit pour surveiller toutes les actions effectuées dans SECRETIS.',
                                'content' => '<h2>Accéder au journal d\'audit</h2><p>Le journal d\'audit est accessible depuis Administration &gt; Journal d\'audit. Il est réservé aux utilisateurs avec le rôle Admin ou Dirigeant.</p><h2>Contenu d\'une entrée d\'audit</h2><p>Chaque action dans SECRETIS génère une entrée contenant :</p><ul><li><strong>Qui</strong> : utilisateur ayant effectué l\'action (nom + e-mail)</li><li><strong>Quoi</strong> : type d\'action (Connexion, Création, Modification, Suppression, Téléchargement, Partage…)</li><li><strong>Quand</strong> : horodatage précis (jour, heure, seconde)</li><li><strong>Où</strong> : adresse IP et navigateur/appareil</li><li><strong>Sur quoi</strong> : objet concerné (nom du document, tâche, utilisateur…)</li><li><strong>Avant/Après</strong> : pour les modifications, les valeurs avant et après le changement</li></ul><h2>Filtrer le journal</h2><ul><li>Par utilisateur</li><li>Par type d\'action</li><li>Par module (GED, Agenda, Utilisateurs…)</li><li>Par plage de dates</li><li>Par adresse IP</li></ul><h2>Alertes automatiques</h2><p>Configurez des alertes dans Administration &gt; Audit &gt; Alertes pour être notifié automatiquement lors d\'actions sensibles : connexion depuis une nouvelle IP, suppression massive de documents, modification des droits d\'un administrateur.</p>',
                            ],
                            'en' => [
                                'title'   => 'Monitor activity via the audit log',
                                'summary' => 'Use the audit log to monitor all actions performed in SECRETIS.',
                                'content' => '<h2>Accessing the audit log</h2><p>Go to Administration &gt; Audit log (Admin or Executive role required).</p><h2>Audit entry contents</h2><p>Each action generates an entry with: who (user), what (action type), when (precise timestamp), where (IP + browser/device), on what (object name) and before/after values for modifications.</p><h2>Automatic alerts</h2><p>Configure alerts in Administration &gt; Audit &gt; Alerts to be notified of sensitive actions: login from new IP, bulk document deletion, admin rights modification.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'gerer-les-sauvegardes',
                        'order'             => 4,
                        'read_time_minutes' => 4,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Gérer les sauvegardes',
                                'summary' => 'Comprenez comment fonctionne la sauvegarde automatique et comment restaurer vos données.',
                                'content' => '<h2>Sauvegarde automatique</h2><p>SECRETIS effectue des sauvegardes automatiques et complètes de toutes vos données :</p><ul><li><strong>Fréquence</strong> : quotidienne (plans Starter et Professional), toutes les 6 heures (Enterprise)</li><li><strong>Rétention</strong> : 30 dernières sauvegardes conservées</li><li><strong>Contenu</strong> : base de données complète + tous les fichiers de la GED</li><li><strong>Chiffrement</strong> : AES-256 au repos, TLS 1.3 en transit</li><li><strong>Géolocalisation</strong> : datacenter principal + réplica géographique distinct</li></ul><h2>Exporter vos données manuellement</h2><p>Si vous souhaitez une sauvegarde locale de vos données, allez dans Administration &gt; Sauvegardes &gt; Exporter mes données. Sélectionnez les modules à inclure et lancez l\'export. Vous recevez un lien de téléchargement par e-mail dans les 30 minutes.</p><h2>Demander une restauration</h2><p>En cas de besoin de restauration (suppression accidentelle, corruption), contactez le support SECRETIS via Administration &gt; Support &gt; Demande de restauration. Précisez :</p><ul><li>La date et heure cible de restauration</li><li>Ce que vous souhaitez restaurer (tout / un module spécifique / un fichier précis)</li><li>La raison de la restauration</li></ul><blockquote><strong>Important :</strong> La restauration est une opération irréversible qui peut écraser des données plus récentes. Elle est effectuée par notre équipe technique après validation de votre demande.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Manage backups',
                                'summary' => 'Understand how automatic backup works and how to restore your data.',
                                'content' => '<h2>Automatic backup</h2><p>SECRETIS performs full automatic backups: daily (Starter/Professional), every 6 hours (Enterprise). 30 backups retained, AES-256 encrypted, replicated to a geographically separate datacenter.</p><h2>Manual data export</h2><p>Go to Administration &gt; Backups &gt; Export my data. Select modules and launch. A download link is emailed within 30 minutes.</p><h2>Requesting a restoration</h2><p>Contact support via Administration &gt; Support &gt; Restoration request with target date/time, what to restore and the reason.</p>',
                            ],
                        ],
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // SECTION 8 : Intégrations & API
            // ═══════════════════════════════════════════════════════════════
            [
                'slug'        => 'integrations-api',
                'icon'        => 'Puzzle',
                'color'       => '#16A085',
                'order'       => 8,
                'role_target' => 'admin',
                'translations' => [
                    'fr' => ['title' => 'Intégrations & API', 'description' => 'Connectez SECRETIS à vos outils existants via l\'API REST et les webhooks.'],
                    'en' => ['title' => 'Integrations & API', 'description' => 'Connect SECRETIS to your existing tools via the REST API and webhooks.'],
                ],
                'articles' => [
                    [
                        'slug'              => 'connecter-vos-outils-via-l-api',
                        'order'             => 1,
                        'read_time_minutes' => 6,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Connecter vos outils via l\'API',
                                'summary' => 'Utilisez l\'API REST de SECRETIS pour intégrer la plateforme à vos systèmes existants.',
                                'content' => '<h2>API REST SECRETIS</h2><p>SECRETIS expose une API REST complète permettant d\'intégrer la plateforme à n\'importe quel système externe. L\'API est disponible pour tous les plans Professional et Enterprise.</p><h3>Base URL</h3><p><code>https://api.ibig-secretis.com/v1</code></p><h2>Authentification</h2><p>L\'API utilise l\'authentification Bearer Token (Laravel Sanctum). Pour chaque requête, ajoutez l\'en-tête :</p><p><code>Authorization: Bearer {votre_token}</code></p><h2>Endpoints principaux</h2><ul><li><code>GET /events</code> : liste des événements</li><li><code>POST /events</code> : créer un événement</li><li><code>GET /tasks</code> : liste des tâches</li><li><code>POST /tasks</code> : créer une tâche</li><li><code>GET /documents</code> : liste des documents</li><li><code>POST /documents</code> : uploader un document</li><li><code>GET /visitors</code> : liste des visites</li><li><code>GET /faqs</code> : liste des FAQ (public)</li></ul><h2>Documentation complète</h2><p>La documentation interactive Swagger est disponible à <code>https://api.ibig-secretis.com/docs</code>. Elle liste tous les endpoints, les paramètres acceptés, les formats de réponse et inclut un outil de test en ligne.</p><h2>Limites de débit</h2><ul><li>Professional : 1 000 requêtes/heure par clé API</li><li>Enterprise : 10 000 requêtes/heure + possibilité d\'augmentation sur demande</li></ul><blockquote><strong>Conseil :</strong> Utilisez la pagination (paramètres <code>page</code> et <code>per_page</code>) pour les requêtes de liste avec de grands volumes de données.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Connect your tools via the API',
                                'summary' => 'Use the SECRETIS REST API to integrate the platform with your existing systems.',
                                'content' => '<h2>SECRETIS REST API</h2><p>SECRETIS exposes a full REST API available for Professional and Enterprise plans.</p><p>Base URL: <code>https://api.ibig-secretis.com/v1</code></p><h2>Authentication</h2><p>Bearer Token (Laravel Sanctum): <code>Authorization: Bearer {your_token}</code></p><h2>Main endpoints</h2><p>GET/POST /events, /tasks, /documents, /visitors and public GET /faqs.</p><h2>Full documentation</h2><p>Interactive Swagger docs at <code>https://api.ibig-secretis.com/docs</code>. Rate limits: 1,000 req/hour (Professional), 10,000 req/hour (Enterprise).</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'configurer-les-webhooks',
                        'order'             => 2,
                        'read_time_minutes' => 5,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Configurer les webhooks',
                                'summary' => 'Recevez des notifications en temps réel dans vos applications via les webhooks SECRETIS.',
                                'content' => '<h2>Qu\'est-ce qu\'un webhook ?</h2><p>Un webhook est une URL de votre application externe vers laquelle SECRETIS envoie une requête HTTP POST automatiquement lorsqu\'un événement se produit. C\'est le moyen le plus simple d\'intégrer SECRETIS à vos outils sans polling.</p><h2>Créer un webhook</h2><ol><li>Allez dans Administration &gt; API &amp; Webhooks &gt; Webhooks &gt; + Nouveau webhook</li><li>Saisissez l\'URL de votre endpoint (doit retourner HTTP 200 dans les 5 secondes)</li><li>Sélectionnez les événements qui déclenchent le webhook</li><li>Optionnellement, définissez un secret pour vérifier l\'authenticité des requêtes</li></ol><h2>Événements disponibles</h2><ul><li><code>event.created</code> / <code>event.updated</code> / <code>event.deleted</code></li><li><code>task.created</code> / <code>task.completed</code> / <code>task.overdue</code></li><li><code>document.uploaded</code> / <code>document.shared</code></li><li><code>visitor.registered</code> / <code>visitor.departed</code></li><li><code>user.invited</code> / <code>user.activated</code></li><li><code>invoice.paid</code> / <code>invoice.overdue</code></li></ul><h2>Sécuriser vos webhooks</h2><p>SECRETIS signe chaque requête webhook avec un HMAC-SHA256. Vérifiez la signature dans votre application en comparant le header <code>X-Secretis-Signature</code> avec votre secret. Ce mécanisme garantit que les requêtes proviennent bien de SECRETIS.</p>',
                            ],
                            'en' => [
                                'title'   => 'Configure webhooks',
                                'summary' => 'Receive real-time notifications in your applications via SECRETIS webhooks.',
                                'content' => '<h2>What is a webhook?</h2><p>A webhook is a URL in your external application where SECRETIS sends an automatic HTTP POST when an event occurs.</p><h2>Creating a webhook</h2><ol><li>Administration &gt; API &amp; Webhooks &gt; Webhooks &gt; + New webhook</li><li>Enter your endpoint URL (must return HTTP 200 within 5 seconds)</li><li>Select triggering events</li><li>Optionally set a secret for authenticity verification</li></ol><h2>Available events</h2><p>event.created/updated/deleted, task.created/completed/overdue, document.uploaded/shared, visitor.registered/departed, user.invited/activated, invoice.paid/overdue.</p>',
                            ],
                        ],
                    ],
                    [
                        'slug'              => 'gerer-les-cles-api',
                        'order'             => 3,
                        'read_time_minutes' => 3,
                        'translations' => [
                            'fr' => [
                                'title'   => 'Gérer les clés API',
                                'summary' => 'Créez et gérez les clés d\'accès API pour sécuriser vos intégrations.',
                                'content' => '<h2>Créer une clé API</h2><p>Allez dans Administration &gt; API &amp; Webhooks &gt; Clés API &gt; + Nouvelle clé. Renseignez :</p><ul><li><strong>Nom</strong> : identifiant descriptif (ex : « Intégration ERP Sage »)</li><li><strong>Permissions</strong> : lectures seules, lecture+écriture, ou personnalisé par module</li><li><strong>Date d\'expiration</strong> : optionnel mais recommandé pour la sécurité</li><li><strong>Restriction IP</strong> : limitez l\'accès à des adresses IP spécifiques</li></ul><p>La clé complète n\'est affichée qu\'une seule fois à la création. Copiez-la immédiatement dans un gestionnaire de secrets sécurisé.</p><h2>Bonnes pratiques</h2><ul><li>Créez une clé distincte par application ou intégration</li><li>Attribuez le minimum de permissions nécessaires (principe de moindre privilège)</li><li>Définissez une date d\'expiration et renouvelez régulièrement</li><li>Révoquez immédiatement toute clé compromise</li><li>Ne stockez jamais une clé API dans le code source</li></ul><h2>Révoquer une clé</h2><p>Dans la liste des clés API, cliquez sur « Révoquer » à côté de la clé à désactiver. La révocation est immédiate et irréversible. Les intégrations utilisant cette clé cesseront de fonctionner instantanément.</p><blockquote><strong>Sécurité :</strong> Auditez vos clés API régulièrement dans Administration &gt; Audit &gt; Accès API pour voir quand et depuis où chaque clé a été utilisée.</blockquote>',
                            ],
                            'en' => [
                                'title'   => 'Manage API keys',
                                'summary' => 'Create and manage API access keys to secure your integrations.',
                                'content' => '<h2>Creating an API key</h2><p>Go to Administration &gt; API &amp; Webhooks &gt; API Keys &gt; + New key. Enter name, permissions (read-only, read+write or custom per module), optional expiry date and optional IP restriction.</p><p>The full key is only shown once at creation. Copy it immediately to a secure secrets manager.</p><h2>Best practices</h2><ul><li>Create a separate key per application</li><li>Grant minimum required permissions</li><li>Set an expiry date and rotate regularly</li><li>Revoke any compromised key immediately</li><li>Never store API keys in source code</li></ul>',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        // Chapitres imposés par la section 12.7 du cahier IBIG SOFT v1.1.
        // Ils sont engendrés, pas écrits : voir la méthode ci-dessous.
        $sections[] = $this->sectionFormuleEtEspace();

        foreach ($sections as $sectionData) {
            $articles = $sectionData['articles'];
            unset($sectionData['articles']);

            $section = GuideSection::create($sectionData);

            foreach ($articles as $articleData) {
                $section->articles()->create($articleData);
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION LICENCE — les sept chapitres de la section 12.7
    //
    // POURQUOI CETTE SECTION EST ENGENDRÉE ET NON ÉCRITE
    // --------------------------------------------------
    // Le reste de ce fichier est du texte figé, ce qui convient à un guide sur
    // les webhooks. Ici, chaque phrase porte une durée, un plafond ou un état.
    // Un guide qui annonce une durée d'essai différente de celle appliquée par
    // le serveur ne se contente pas d'être faux : il donne au lecteur la
    // certitude que l'éditeur ne connaît pas son propre produit (§12, règle
    // fondatrice). Les chiffres viennent donc du moteur, à chaque exécution.
    //
    // VERSION ET DATE — exigées par la section 12.7. La version suit la
    // rédaction ; la date suit la dernière modification de la source de vérité.
    // ═════════════════════════════════════════════════════════════════════════

    private const GUIDE_LICENCE_VERSION = '1.0';

    private function sectionFormuleEtEspace(): array
    {
        $L    = app(LicenceService::class);
        $docs = app(LicenceDocuments::class);
        $c    = $L->config();

        $solution  = $L->nomSolution();
        $gratuit   = $c['gratuit']['nom'];
        $resume    = $L->resumePlafond();
        $essai     = $L->essaiJours();
        $grace     = $L->graceJours();
        $retention = $L->retentionJours();
        $prolJ     = (int) ($c['prolongation_jours'] ?? 0);
        $filigrane = $L->filigrane();
        $utils     = (int) ($c['gratuit']['utilisateurs'] ?? 1);
        $stockage  = (int) ($c['gratuit']['stockage_mo'] ?? 0);
        $etats     = $docs->tableauEtats();
        $plafonds  = $docs->listePlafonds();
        $inclus    = $this->puces($c['gratuit']['inclus'] ?? []);
        $exclus    = $this->puces($c['gratuit']['exclus'] ?? []);
        $demoActif = ! empty($c['demo']['actif']);

        $v      = self::GUIDE_LICENCE_VERSION;
        $date   = $docs->dateMaj();
        $entete = "<p><em>Guide version {$v} — mis à jour le {$date}. Les durées et les "
                . "plafonds affichés ci-dessous sont ceux appliqués par le serveur aujourd'hui.</em></p>";

        $demoTexte = $demoActif
            ? "La <strong>démonstration publique</strong> est ouverte : c'est le vrai logiciel, "
              . "rempli de données fictives, accessible sans inscription et remis à zéro chaque "
              . "nuit. Rien de ce que vous y saisissez n'est conservé."
            : "La <strong>démonstration publique</strong> n'est pas encore ouverte. Lorsqu'elle le "
              . "sera, ce sera le vrai logiciel, rempli de données fictives, accessible sans "
              . "inscription et remis à zéro chaque nuit.";

        return [
            'slug'        => 'formule-et-espace',
            'icon'        => 'Key',
            'color'       => '#7C3AED',
            'order'       => 9,
            'role_target' => 'all',
            'translations' => [
                'fr' => [
                    'title'       => 'Votre formule et votre espace',
                    'description' => "Choisir sa formule, comprendre l'état de son espace, "
                                   . "retirer le filigrane et récupérer ses données.",
                ],
                'en' => [
                    'title'       => 'Your plan and your workspace',
                    'description' => 'Choosing a plan, understanding your workspace state, '
                                   . 'removing the watermark and exporting your data.',
                ],
            ],
            'articles' => [

                // ── 12.7 §1 ────────────────────────────────────────────────
                [
                    'slug'              => 'choisir-sa-formule',
                    'order'             => 1,
                    'read_time_minutes' => 4,
                    'translations' => [
                        'fr' => [
                            'title'   => 'Choisir sa formule',
                            'summary' => "Démonstration publique, palier {$gratuit}, essai, formules payantes : quatre portes d'entrée, et comment choisir la bonne.",
                            'content' => <<<HTML
{$entete}
<h2>Quatre portes d'entrée</h2>
<p>Il existe quatre façons d'accéder à {$solution}. Elles ne s'opposent pas : on passe
naturellement de l'une à l'autre.</p>

<h3>1. La démonstration publique — pour regarder</h3>
<p>{$demoTexte} Elle sert à voir à quoi ressemble le logiciel avant de créer quoi que ce soit.
N'y saisissez aucune donnée réelle : elle est publique.</p>

<h3>2. Le palier {$gratuit} — pour commencer, sans limite de temps</h3>
<p>Gratuit, <strong>sans date de fin</strong>, sans carte bancaire. Votre espace vous appartient
et vous pouvez y rester aussi longtemps que vous le souhaitez. En contrepartie, un plafond
s'applique : {$resume}. C'est le bon choix pour une petite structure, ou pour démarrer sans
engagement.</p>

<h3>3. L'essai — pour tout tester, pendant {$essai} jours</h3>
<p>L'essai ouvre pendant <strong>{$essai} jours</strong> toutes les fonctions d'une formule
payante : export, multi-utilisateur, interface de programmation, assistant IA, relances WhatsApp
et SMS. Sans carte bancaire. <strong>Sans reconduction automatique</strong> : à l'échéance, rien
n'est prélevé, votre espace bascule simplement au palier {$gratuit}.</p>

<h3>4. Les formules payantes — pour travailler à plusieurs et exporter</h3>
<p>Elles lèvent le plafond, ouvrent les fonctions avancées et retirent le filigrane des documents.
La grille tarifaire à jour est publiée sur la page des formules.</p>

<h2>Comment choisir ?</h2>
<ul>
  <li>Vous voulez <strong>juste regarder</strong> → la démonstration publique.</li>
  <li>Votre volume tient dans {$resume} et vous travaillez seul → le palier {$gratuit} suffit,
      durablement.</li>
  <li>Vous voulez <strong>essayer les fonctions avancées</strong> avant de payer → l'essai.</li>
  <li>Vous devez <strong>exporter</strong>, travailler <strong>à plusieurs</strong> ou dépasser le
      plafond → une formule payante.</li>
</ul>
<blockquote><strong>À retenir :</strong> aucun de ces choix n'est définitif, et aucun ne fait
perdre de données. On peut passer d'un palier à l'autre dans les deux sens.</blockquote>
HTML,
                        ],
                        'en' => [
                            'title'   => 'Choosing your plan',
                            'summary' => "Public demo, {$gratuit} tier, trial and paid plans: four ways in, and how to pick the right one.",
                            'content' => <<<HTML
{$entete}
<h2>Four ways in</h2>
<ul>
  <li><strong>Public demo</strong> — the real software with fictional data, no sign-up, reset every night.</li>
  <li><strong>{$gratuit} tier</strong> — free, <strong>with no end date</strong>, capped at {$resume}.</li>
  <li><strong>Trial</strong> — <strong>{$essai} days</strong> of a paid plan, no credit card, <strong>no automatic renewal</strong>.</li>
  <li><strong>Paid plans</strong> — no cap, advanced features, no watermark.</li>
</ul>
<p>None of these choices is final, and none of them causes data loss.</p>
HTML,
                        ],
                    ],
                ],

                // ── 12.7 §2 ────────────────────────────────────────────────
                [
                    'slug'              => 'ce-que-contient-le-palier-gratuit',
                    'order'             => 2,
                    'read_time_minutes' => 4,
                    'translations' => [
                        'fr' => [
                            'title'   => "Ce que contient le palier {$gratuit}",
                            'summary' => "Le plafond exact, ce qui est inclus, ce qui ne l'est pas, et ce qui se passe quand le plafond est atteint.",
                            'content' => <<<HTML
{$entete}
<h2>Le plafond exact</h2>
<p>Le palier {$gratuit} est gratuit et n'a pas de date de fin. Il est plafonné :</p>
{$plafonds}
<p>Soit, dit simplement : <strong>{$resume}</strong>. Il admet <strong>{$utils}</strong>
utilisateur et <strong>{$stockage} Mo</strong> de stockage.</p>

<h2>Ce qui est inclus</h2>
{$inclus}

<h2>Ce qui n'est pas inclus</h2>
{$exclus}
<p>Ces fonctions ouvrent avec une formule payante, et pendant toute la durée d'un essai.</p>

<h2>Quand le plafond est atteint</h2>
<p>Vous verrez un message vous indiquant que la limite est atteinte, avec un lien vers les
formules. Ce qui se passe alors — et ce qui ne se passe pas :</p>
<ul>
  <li>la <strong>création</strong> d'un nouvel enregistrement est refusée ;</li>
  <li><strong>rien n'est supprimé</strong> ;</li>
  <li><strong>rien n'est masqué</strong> : tout ce que vous avez déjà reste visible ;</li>
  <li>vos enregistrements existants restent <strong>modifiables</strong> ;</li>
  <li>vous pouvez continuer à travailler normalement sur tout le reste.</li>
</ul>

<h2>Quand le compteur repart à zéro</h2>
<p>Les compteurs mensuels sont remis à zéro le <strong>premier jour de chaque mois</strong>, dans
le fuseau horaire de votre organisation. Un compteur mensuel ne reporte rien d'un mois sur
l'autre, ni en votre faveur ni en votre défaveur.</p>

<h2>Le palier {$gratuit} expire-t-il ?</h2>
<p><strong>Non.</strong> Il n'a pas de date de fin. Un espace peut y demeurer indéfiniment.</p>
HTML,
                        ],
                        'en' => [
                            'title'   => "What the {$gratuit} tier includes",
                            'summary' => 'The exact cap, what is included, what is not, and what happens when the cap is reached.',
                            'content' => <<<HTML
{$entete}
<h2>The exact cap</h2>
{$plafonds}
<p>In short: <strong>{$resume}</strong>, with <strong>{$utils}</strong> user and
<strong>{$stockage} MB</strong> of storage. The tier is free and has no end date.</p>
<h2>When the cap is reached</h2>
<p>Creating a new record is refused. <strong>Nothing is deleted, nothing is hidden</strong>, and
existing records stay editable. Monthly counters reset on the first day of each month.</p>
HTML,
                        ],
                    ],
                ],

                // ── 12.7 §3 ────────────────────────────────────────────────
                [
                    'slug'              => 'votre-essai',
                    'order'             => 3,
                    'read_time_minutes' => 4,
                    'translations' => [
                        'fr' => [
                            'title'   => 'Votre essai',
                            'summary' => "Durée, ce qui est ouvert, ce qui se passe à la fin, et dans quels cas une prolongation est possible.",
                            'content' => <<<HTML
{$entete}
<h2>Combien de temps ?</h2>
<p><strong>{$essai} jours</strong>, à compter de l'ouverture de l'essai. Cette durée est la même
pour tout le monde et pour toutes les formules.</p>

<h2>Faut-il une carte bancaire ?</h2>
<p><strong>Non.</strong> Aucune carte, aucun moyen de paiement, aucune empreinte bancaire. Aucun
prélèvement n'est techniquement possible : rien n'est enregistré.</p>

<h2>Qu'est-ce qui est ouvert pendant l'essai ?</h2>
<ul>
  <li>l'export de vos données (CSV, Excel, PDF) ;</li>
  <li>le multi-utilisateur et les rôles ;</li>
  <li>l'interface de programmation et les intégrations ;</li>
  <li>l'assistant IA ;</li>
  <li>les relances automatiques WhatsApp et SMS ;</li>
  <li>aucun plafond, et <strong>aucun filigrane</strong> sur les documents produits.</li>
</ul>

<h2>Que se passe-t-il à la fin ?</h2>
<p>À l'échéance, votre espace <strong>bascule automatiquement au palier {$gratuit}</strong>.
C'est tout. En particulier :</p>
<ul>
  <li><strong>aucune donnée n'est supprimée</strong> ;</li>
  <li><strong>rien n'est prélevé</strong> : l'essai ne se reconduit pas ;</li>
  <li>votre espace reste ouvert et modifiable dans la limite du plafond : {$resume} ;</li>
  <li>ce qui dépasse le plafond reste <strong>visible et consultable</strong>, en
      <strong>lecture seule</strong> — ce n'est ni masqué, ni archivé, ni détruit ;</li>
  <li>les fonctions avancées se ferment, et rouvrent intégralement dès qu'une formule est
      activée.</li>
</ul>
<p>Vous recevez des messages avant l'échéance, puis un message le jour de la bascule qui décrit
exactement l'état de votre espace.</p>

<h2>Peut-on prolonger l'essai ?</h2>
<p>Une prolongation de <strong>{$prolJ} jours</strong> peut être accordée, sous conditions
strictes :</p>
<ul>
  <li>elle est accordée <strong>manuellement</strong> par notre équipe, jamais automatiquement ;</li>
  <li><strong>une seule fois</strong> par espace ;</li>
  <li>seulement pendant que l'essai est <strong>en cours</strong> ;</li>
  <li>avec un <strong>motif</strong>, que nous consignons.</li>
</ul>
<p>Écrivez au support en expliquant votre situation. Une seconde prolongation n'est pas prévue.</p>
HTML,
                        ],
                        'en' => [
                            'title'   => 'Your trial',
                            'summary' => 'Duration, what is unlocked, what happens at the end, and when an extension is possible.',
                            'content' => <<<HTML
{$entete}
<h2>How long?</h2>
<p><strong>{$essai} days</strong>, no credit card, <strong>no automatic renewal</strong>.</p>
<h2>What happens at the end?</h2>
<p>Your workspace switches automatically to the <strong>{$gratuit}</strong> tier.
<strong>No data is deleted</strong> and nothing is charged. Records beyond the cap of
{$resume} stay <strong>visible and read-only</strong> — never hidden, never destroyed.</p>
<h2>Extension</h2>
<p>An extension of <strong>{$prolJ} days</strong> may be granted manually, once per workspace,
while the trial is still running, and with a stated reason.</p>
HTML,
                        ],
                    ],
                ],

                // ── 12.7 §4 ────────────────────────────────────────────────
                [
                    'slug'              => 'comprendre-l-etat-de-votre-espace',
                    'order'             => 4,
                    'read_time_minutes' => 5,
                    'translations' => [
                        'fr' => [
                            'title'   => "Comprendre l'état de votre espace",
                            'summary' => 'Les six états possibles, expliqués simplement, et ce que chacun ouvre ou ferme.',
                            'content' => <<<HTML
{$entete}
<h2>Votre espace est toujours dans un seul état</h2>
<p>À tout instant, votre espace se trouve dans exactement un des six états ci-dessous. Le bandeau
en haut de l'écran vous indique lequel, et ce qu'il implique. Cet état est
<strong>calculé par nos serveurs</strong> : il ne dépend ni de votre navigateur, ni de l'horloge
de votre ordinateur.</p>

{$etats}

<h2>Deux règles qui ne changent jamais</h2>
<ul>
  <li><strong>Aucun état ne supprime de données.</strong> Ni la fin d'un essai, ni la fin d'un
      abonnement, ni le dépassement d'un plafond.</li>
  <li><strong>Aucun état ne ferme la lecture.</strong> Même lorsque l'écriture est fermée, vos
      données restent consultables et exportables sur demande.</li>
</ul>

<h2>Où voir l'état de votre espace</h2>
<p>Dans le bandeau en haut de l'écran, et dans la page <em>Abonnement</em> de votre espace, qui
indique en outre le nombre de jours restants, la date de fin et l'usage de vos compteurs.</p>
HTML,
                        ],
                        'en' => [
                            'title'   => 'Understanding your workspace state',
                            'summary' => 'The six possible states, in plain language, and what each one opens or closes.',
                            'content' => <<<HTML
{$entete}
<p>Your workspace is always in exactly one of six states, calculated by our servers.</p>
{$etats}
<p><strong>No state deletes data, and no state closes read access.</strong></p>
HTML,
                        ],
                    ],
                ],

                // ── 12.7 §5 ────────────────────────────────────────────────
                [
                    'slug'              => 'si-vous-ne-renouvelez-pas',
                    'order'             => 5,
                    'read_time_minutes' => 5,
                    'translations' => [
                        'fr' => [
                            'title'   => 'Si vous ne renouvelez pas',
                            'summary' => "Période de grâce, lecture seule, conservation {$retention} jours : la chronologie exacte, étape par étape.",
                            'content' => <<<HTML
{$entete}
<h2>La chronologie, étape par étape</h2>
<p>Si un abonnement arrive à échéance sans être renouvelé, voici ce qui se passe — et rien
d'autre.</p>
<ol>
  <li><strong>Jour de l'échéance — période de grâce de {$grace} jours.</strong> Votre accès reste
      <strong>complet</strong> : écriture, export, multi-utilisateur, tout fonctionne comme avant.
      Aucune fonction n'est fermée, aucun filigrane n'apparaît. Un paiement pendant cette période
      rétablit l'abonnement sans aucune démarche.</li>
  <li><strong>Fin de la période de grâce — lecture seule.</strong> L'écriture se ferme : vous ne
      pouvez plus créer ni modifier. Mais <strong>tout reste visible</strong>, et vous pouvez
      demander un export à tout moment. <strong>Rien n'est supprimé.</strong></li>
  <li><strong>Conservation pendant {$retention} jours.</strong> À compter du passage en lecture
      seule, vos données sont conservées <strong>{$retention} jours</strong>. La date exacte est
      affichée dans votre espace.</li>
  <li><strong>Deux avertissements.</strong> Avant toute suppression, nous vous envoyons
      <strong>deux messages distincts</strong> à l'adresse de l'administrateur de l'espace, qui
      indiquent la <strong>date exacte</strong> de suppression et comment l'éviter. Ces
      avertissements s'affichent aussi dans l'espace lui-même.</li>
  <li><strong>Suppression.</strong> À l'expiration du délai de conservation, et seulement alors,
      les données sont supprimées de façon sécurisée.</li>
</ol>

<h2>Comment reprendre la main, à n'importe quel moment</h2>
<ul>
  <li><strong>Payer une formule</strong> : tout est rétabli immédiatement — l'écriture, les
      fonctions avancées, et <strong>l'intégralité</strong> de vos données et de votre historique.
      Rien n'est perdu du fait de l'interruption.</li>
  <li><strong>Revenir au palier {$gratuit}</strong> : vous retrouvez le droit d'écrire dans la
      limite du plafond ({$resume}), et la suppression est abandonnée.</li>
  <li><strong>Demander un export</strong> : possible pendant toute cette période, y compris en
      lecture seule. Voir le chapitre « Récupérer ou exporter vos données ».</li>
</ul>

<blockquote><strong>Ce que nous ne faisons jamais :</strong> supprimer des données sans
avertissement préalable, fermer à la fois la lecture et l'écriture, ou prolonger automatiquement
un abonnement que vous n'avez pas renouvelé.</blockquote>
HTML,
                        ],
                        'en' => [
                            'title'   => 'If you do not renew',
                            'summary' => "Grace period, read-only, {$retention}-day retention: the exact timeline.",
                            'content' => <<<HTML
{$entete}
<ol>
  <li><strong>Grace period of {$grace} days</strong> — full access is maintained.</li>
  <li><strong>Read-only</strong> — writing closes, everything stays visible, nothing is deleted.</li>
  <li><strong>Retention for {$retention} days</strong> from the read-only switch.</li>
  <li><strong>Two warnings</strong> before any deletion, stating the exact date.</li>
  <li><strong>Secure deletion</strong> at the end of the retention period, and not before.</li>
</ol>
<p>Paying at any point restores everything, in full.</p>
HTML,
                        ],
                    ],
                ],

                // ── 12.7 §6 ────────────────────────────────────────────────
                [
                    'slug'              => 'retirer-le-filigrane',
                    'order'             => 6,
                    'read_time_minutes' => 3,
                    'translations' => [
                        'fr' => [
                            'title'   => 'Retirer le filigrane des documents',
                            'summary' => "Pourquoi le filigrane apparaît, sur quels documents, et comment il disparaît.",
                            'content' => <<<HTML
{$entete}
<h2>Ce qu'est le filigrane</h2>
<p>C'est la mention discrète apposée en pied des documents produits depuis un espace au palier
{$gratuit}, depuis la démonstration publique, ou depuis un espace en lecture seule :</p>
<blockquote>{$filigrane}</blockquote>

<h2>Sur quels documents apparaît-il ?</h2>
<p>Sur les documents produits par {$solution} : courriers, exports imprimables, documents PDF et
pièces jointes engendrées par l'application. Il n'apparaît pas sur les fichiers que vous
importez vous-même : ceux-là ne sont pas produits par le logiciel.</p>

<h2>Comment le retirer</h2>
<p><strong>Activez une formule payante.</strong> Le filigrane disparaît
<strong>automatiquement dès le premier paiement</strong>, sans aucune démarche de votre part et
sans réglage à modifier. Il est également absent pendant toute la durée d'un essai.</p>

<h2>Les documents déjà produits</h2>
<p>Un document produit avant le paiement conserve le filigrane qu'il portait au moment où il a été
créé : le fichier existe déjà, nous ne le réécrivons pas. <strong>Il suffit de le régénérer depuis
l'application</strong> après l'activation de la formule pour en obtenir une version sans
filigrane.</p>

<h2>Ce qu'il ne faut pas faire</h2>
<p>Le filigrane ne doit pas être supprimé, masqué ou altéré par un moyen détourné : c'est
interdit par les conditions générales d'utilisation. Et c'est inutile — une formule payante le
retire proprement, sur tous les documents à venir.</p>
HTML,
                        ],
                        'en' => [
                            'title'   => 'Removing the watermark',
                            'summary' => 'Why the watermark appears, on which documents, and how it goes away.',
                            'content' => <<<HTML
{$entete}
<p>Documents produced from a {$gratuit} tier workspace, from the public demo or from a read-only
workspace carry this line:</p>
<blockquote>{$filigrane}</blockquote>
<h2>How to remove it</h2>
<p><strong>Activate a paid plan.</strong> The watermark disappears <strong>automatically from the
first payment</strong>, with no action on your side. It is also absent throughout a trial.
Documents produced earlier keep the watermark they were created with — simply regenerate them.</p>
HTML,
                        ],
                    ],
                ],

                // ── 12.7 §7 ────────────────────────────────────────────────
                [
                    'slug'              => 'recuperer-ou-exporter-vos-donnees',
                    'order'             => 7,
                    'read_time_minutes' => 4,
                    'translations' => [
                        'fr' => [
                            'title'   => 'Récupérer ou exporter vos données',
                            'summary' => "Comment demander vos données, dans quels états c'est possible, et dans quel format.",
                            'content' => <<<HTML
{$entete}
<h2>Vos données vous appartiennent</h2>
<p>Nous n'acquérons aucun droit de propriété sur ce que vous saisissez. Vous pouvez en demander la
restitution à tout moment.</p>

<h2>Deux voies</h2>
<h3>1. L'export depuis l'application</h3>
<p>Disponible pendant un essai et avec une formule payante, depuis chaque module (CSV, Excel,
PDF). C'est la voie la plus rapide. <strong>Elle est fermée au palier {$gratuit}</strong> : c'est
l'une des fonctions que la formule payante ouvre.</p>

<h3>2. La demande d'export à l'éditeur</h3>
<p>Ouverte <strong>dans tous les états</strong>, y compris au palier {$gratuit}, pendant la période
de grâce, en lecture seule et pendant tout le délai de conservation de {$retention} jours.
<strong>La fermeture de l'écriture ne ferme jamais le droit à restitution.</strong></p>
<ul>
  <li><strong>Qui</strong> : l'administrateur de l'organisation.</li>
  <li><strong>Comment</strong> : depuis votre espace, ou par écrit au support.</li>
  <li><strong>Format</strong> : un format structuré et réexploitable, avec les pièces jointes et
      les documents produits.</li>
  <li><strong>Délai</strong> : l'archive est mise à disposition par un lien de téléchargement à
      durée limitée.</li>
  <li><strong>Coût</strong> : l'export de vos données à la fin du contrat n'est pas facturé.</li>
</ul>

<h2>Le filigrane sur les documents exportés</h2>
<p>Les documents exportés depuis un espace au palier {$gratuit} ou en lecture seule portent le
filigrane. Voir le chapitre « Retirer le filigrane des documents ».</p>

<h2>Avant une suppression</h2>
<p>Nous ne supprimons jamais de données sans vous avoir adressé <strong>deux avertissements</strong>
indiquant la date exacte. Si vous recevez l'un de ces messages et souhaitez conserver vos données,
demandez un export ou réactivez une formule : les deux fonctionnent jusqu'au dernier jour.</p>
HTML,
                        ],
                        'en' => [
                            'title'   => 'Retrieving or exporting your data',
                            'summary' => 'How to request your data, in which states it is possible, and in what format.',
                            'content' => <<<HTML
{$entete}
<h2>Two routes</h2>
<p><strong>In-app export</strong> (CSV, Excel, PDF) during a trial and on paid plans; it is closed
on the {$gratuit} tier.</p>
<p><strong>Export on request</strong> — available in <strong>every state</strong>, including the
{$gratuit} tier, the grace period, read-only and the whole {$retention}-day retention window.
Closing writes never closes your right to your data. Structured, reusable format, not charged at
the end of the contract.</p>
HTML,
                        ],
                    ],
                ],
            ],
        ];
    }

    /** Liste à puces échappée — les libellés viennent de la configuration. */
    private function puces(array $lignes): string
    {
        if ($lignes === []) {
            return '';
        }

        $items = '';

        foreach ($lignes as $ligne) {
            $items .= '<li>' . e($ligne) . '</li>';
        }

        return "<ul>{$items}</ul>";
    }

    /**
     * Description des formules, LUE dans la base et dans le moteur de licence.
     *
     * Les contenus d'origine decrivaient des formules « Starter / Professional
     * / Enterprise » avec des limites d'utilisateurs et de stockage inventees.
     * Aucune n'existe : la table `plans` porte Demarrage, Essentiel, Pro et
     * Entreprise. Un prospect qui lisait le centre d'aide y trouvait une offre
     * sans rapport avec celle de la page tarifs.
     *
     * On ne reecrit pas cette fiction avec une autre : le texte est produit a
     * partir des formules reellement enregistrees et des reglages de
     * licence.config.json. Il suit donc l'offre sans intervention.
     */
    private function contenuFormules(string $langue = 'fr'): string
    {
        $licence = app(\App\Services\LicenceService::class);
        $formules = \Illuminate\Support\Facades\DB::table('plans')
            ->where('is_active', true)->orderBy('price_xof')->get();

        $gratuit = $licence->config()['gratuit'];

        if ($langue === 'en') {
            $html = '<h2>Plans</h2><p>The <b>' . e($gratuit['nom']) . '</b> plan is free for ever, capped at '
                  . e($gratuit['resume']) . '.</p><ul>';
            foreach ($formules as $f) {
                $html .= '<li><b>' . e($f->name) . '</b> — ' . number_format((float) $f->price_xof, 0, '.', ' ') . ' XOF/month</li>';
            }

            return $html . '</ul><p>A ' . $licence->essaiJours() . '-day trial is available on the Pro plan, no card required.</p>';
        }

        $html = '<h2>Nos formules</h2><p>Le palier <b>' . e($gratuit['nom']) . '</b> est gratuit sans limite de duree, '
              . 'plafonne a ' . e($gratuit['resume']) . '.</p><ul>';

        foreach ($formules as $f) {
            $html .= '<li><b>' . e($f->name) . '</b> — ' . number_format((float) $f->price_xof, 0, ',', ' ') . ' FCFA/mois</li>';
        }

        return $html . '</ul><p>Un essai de ' . $licence->essaiJours() . ' jours est disponible sur la formule Pro, '
             . 'sans carte bancaire. A son terme, votre espace bascule dans le palier ' . e($gratuit['nom'])
             . ' : vos donnees sont conservees.</p>';
    }
}
