<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Faq;

class FaqSeeder extends Seeder
{
    public function run(): void
    {
        Faq::truncate();

        $faqs = [

            // ═══════════════════════════════════════════════════════════════
            // 1. DÉMARRAGE & COMPTE (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'demarrage',
                'order'       => 1,
                'is_featured' => true,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer mon compte IBIG SECRETIS ?',
                        'answer'   => 'Rendez-vous sur app.ibig-secretis.com et cliquez sur « Démarrer gratuitement ». Renseignez votre nom, adresse e-mail professionnelle et choisissez un mot de passe sécurisé. Un e-mail de confirmation vous est envoyé immédiatement ; cliquez sur le lien pour activer votre compte. Vous serez ensuite guidé par l\'assistant d\'onboarding pour configurer votre organisation.',
                    ],
                    'en' => [
                        'question' => 'How do I create my IBIG SECRETIS account?',
                        'answer'   => 'Go to app.ibig-secretis.com and click "Start for free". Enter your name, professional email address and choose a secure password. A confirmation email is sent immediately; click the link to activate your account. The onboarding assistant will then guide you through setting up your organisation.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'J\'ai oublié mon mot de passe, comment le réinitialiser ?',
                        'answer'   => 'Sur la page de connexion, cliquez sur « Mot de passe oublié ». Saisissez votre adresse e-mail et un lien de réinitialisation vous sera envoyé dans les 2 minutes. Ce lien est valable 60 minutes. Si vous ne recevez rien, vérifiez votre dossier spam ou contactez votre administrateur système.',
                    ],
                    'en' => [
                        'question' => 'I forgot my password, how do I reset it?',
                        'answer'   => 'On the login page, click "Forgot password". Enter your email address and a reset link will be sent within 2 minutes. The link is valid for 60 minutes. If you receive nothing, check your spam folder or contact your system administrator.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment activer la double authentification (2FA) ?',
                        'answer'   => 'Allez dans Paramètres > Sécurité > Authentification à deux facteurs. Cliquez sur « Activer » et scannez le QR code avec une application comme Google Authenticator ou Authy. Entrez le code à 6 chiffres généré pour confirmer. À chaque connexion, un code temporaire vous sera demandé en plus de votre mot de passe.',
                    ],
                    'en' => [
                        'question' => 'How do I enable two-factor authentication (2FA)?',
                        'answer'   => 'Go to Settings > Security > Two-factor authentication. Click "Enable" and scan the QR code with an app like Google Authenticator or Authy. Enter the 6-digit code generated to confirm. At each login, a temporary code will be required in addition to your password.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment modifier les informations de mon profil ?',
                        'answer'   => 'Cliquez sur votre avatar en haut à droite, puis sur « Mon profil ». Vous pouvez y modifier votre nom, votre photo, votre titre de poste et vos coordonnées. Les modifications sont sauvegardées automatiquement. Notez que votre adresse e-mail ne peut être changée que par un administrateur.',
                    ],
                    'en' => [
                        'question' => 'How do I update my profile information?',
                        'answer'   => 'Click your avatar at the top right, then "My profile". You can update your name, photo, job title and contact details. Changes are saved automatically. Note that your email address can only be changed by an administrator.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment changer la langue de l\'interface ?',
                        'answer'   => 'La langue peut être changée depuis Paramètres > Préférences > Langue. IBIG SECRETIS est disponible en français et en anglais. Le choix de langue est personnel et n\'affecte pas les autres utilisateurs de votre organisation. La modification prend effet immédiatement sans rechargement.',
                    ],
                    'en' => [
                        'question' => 'How do I change the interface language?',
                        'answer'   => 'The language can be changed from Settings > Preferences > Language. IBIG SECRETIS is available in French and English. The language choice is personal and does not affect other users in your organisation. The change takes effect immediately without reloading.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment configurer mon fuseau horaire ?',
                        'answer'   => 'Rendez-vous dans Paramètres > Préférences > Fuseau horaire. Sélectionnez votre zone géographique dans la liste déroulante. SECRETIS gère automatiquement les conversions d\'heure pour les réunions multi-fuseaux. Si votre organisation est en Afrique, les fuseaux UTC+0 à UTC+3 sont préconfigurés.',
                    ],
                    'en' => [
                        'question' => 'How do I configure my time zone?',
                        'answer'   => 'Go to Settings > Preferences > Time zone. Select your geographic zone from the dropdown list. SECRETIS automatically handles time conversions for multi-timezone meetings. If your organisation is in Africa, UTC+0 to UTC+3 zones are pre-configured.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Puis-je me connecter depuis plusieurs appareils en même temps ?',
                        'answer'   => 'Oui, IBIG SECRETIS autorise plusieurs sessions simultanées. Vous pouvez être connecté depuis votre ordinateur de bureau, un ordinateur portable et votre smartphone en même temps. Vos données sont synchronisées en temps réel. Vous pouvez visualiser et révoquer les sessions actives dans Paramètres > Sécurité > Sessions actives.',
                    ],
                    'en' => [
                        'question' => 'Can I log in from multiple devices at the same time?',
                        'answer'   => 'Yes, IBIG SECRETIS allows multiple simultaneous sessions. You can be logged in from your desktop, a laptop and your smartphone at the same time. Your data is synchronised in real time. You can view and revoke active sessions in Settings > Security > Active sessions.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment inviter des collègues dans mon organisation ?',
                        'answer'   => 'Les administrateurs peuvent inviter des utilisateurs depuis Administration > Utilisateurs > Inviter. Saisissez l\'adresse e-mail et choisissez le rôle (Secrétaire, Dirigeant, RH, etc.). Un e-mail d\'invitation est envoyé automatiquement. L\'invité dispose de 7 jours pour accepter. Vous pouvez renvoyer l\'invitation depuis la liste des invitations en attente.',
                    ],
                    'en' => [
                        'question' => 'How do I invite colleagues to my organisation?',
                        'answer'   => 'Administrators can invite users from Administration > Users > Invite. Enter the email address and choose a role (Secretary, Executive, HR, etc.). An invitation email is sent automatically. The invitee has 7 days to accept. You can resend the invitation from the pending invitations list.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment configurer le nom et le logo de mon organisation ?',
                        'answer'   => 'Allez dans Administration > Organisation > Paramètres généraux. Vous pouvez y modifier le nom officiel, le logo (PNG/SVG recommandé, max 2 Mo), les couleurs de marque, et les informations légales (numéro RCCM, adresse, etc.). Ces informations apparaissent sur tous les documents générés par SECRETIS.',
                    ],
                    'en' => [
                        'question' => 'How do I configure my organisation name and logo?',
                        'answer'   => 'Go to Administration > Organisation > General settings. You can update the official name, logo (PNG/SVG recommended, max 2 MB), brand colours, and legal information (RCCM number, address, etc.). This information appears on all documents generated by SECRETIS.',
                    ],
                ],
            ],
            [
                'category'    => 'demarrage',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'L\'essai gratuit dure combien de temps ?',
                        // Cette réponse annonçait « mode limité (consultation uniquement) ».
                        // C'était faux : la fin d'un essai ne ferme pas l'écriture, elle
                        // bascule l'espace au palier gratuit, qui reste modifiable dans la
                        // limite de son plafond (décision D6 du cahier).
                        'answer'   => 'L\'essai dure ' . app(\App\Services\LicenceService::class)->essaiJours() . ' jours, avec accès complet aux fonctions avancées. Aucune carte bancaire n\'est requise, et il n\'y a aucune reconduction automatique. À l\'échéance, votre espace bascule automatiquement au palier ' . app(\App\Services\LicenceService::class)->config()['gratuit']['nom'] . ' : aucune donnée n\'est supprimée, votre espace reste modifiable dans la limite de son plafond (' . app(\App\Services\LicenceService::class)->resumePlafond() . '), et ce qui dépasse ce plafond reste visible en lecture seule. Vous pouvez souscrire à tout moment depuis Paramètres > Abonnement.',
                    ],
                    'en' => [
                        'question' => 'How long does the free trial last?',
                        'answer'   => 'The trial lasts ' . app(\App\Services\LicenceService::class)->essaiJours() . ' days with full access to advanced features. No credit card is required, and there is no automatic renewal. At the end of the trial your workspace switches automatically to the free tier: no data is deleted, your workspace stays editable within its cap (' . app(\App\Services\LicenceService::class)->resumePlafond() . '), and anything beyond the cap stays visible in read-only. You can subscribe at any time from Settings > Subscription.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 2. AGENDA & RÉUNIONS (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'agenda',
                'order'       => 1,
                'is_featured' => true,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer un événement dans l\'agenda ?',
                        'answer'   => 'Cliquez sur le bouton « + Nouvel événement » ou directement sur un créneau dans la vue calendrier. Renseignez le titre, la date, l\'heure de début et de fin, le lieu et la description. Vous pouvez ajouter des participants internes (membres de l\'organisation) et des invités externes (par e-mail). Cliquez sur « Enregistrer » pour créer l\'événement et notifier automatiquement les participants.',
                    ],
                    'en' => [
                        'question' => 'How do I create an event in the calendar?',
                        'answer'   => 'Click the "+ New event" button or directly on a time slot in the calendar view. Fill in the title, date, start and end time, location and description. You can add internal participants (organisation members) and external guests (by email). Click "Save" to create the event and automatically notify participants.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer un événement récurrent (réunion hebdomadaire) ?',
                        'answer'   => 'Lors de la création ou de la modification d\'un événement, activez l\'option « Récurrence » dans le formulaire. Choisissez la fréquence (quotidien, hebdomadaire, mensuel), les jours concernés et la date de fin de récurrence. Vous pouvez modifier une occurrence unique sans affecter les autres, ou modifier toute la série en une seule action.',
                    ],
                    'en' => [
                        'question' => 'How do I create a recurring event (weekly meeting)?',
                        'answer'   => 'When creating or editing an event, enable the "Recurrence" option in the form. Choose the frequency (daily, weekly, monthly), the days concerned and the end date of the recurrence. You can modify a single occurrence without affecting others, or modify the entire series in one action.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment envoyer des invitations à des participants extérieurs ?',
                        'answer'   => 'Dans le formulaire de création d\'événement, saisissez l\'adresse e-mail des invités externes dans le champ « Participants ». Ils recevront une invitation par e-mail avec les détails de la réunion et un lien de confirmation. Vous pouvez suivre leur statut de réponse (Accepté / Refusé / En attente) directement depuis l\'événement.',
                    ],
                    'en' => [
                        'question' => 'How do I send invitations to external participants?',
                        'answer'   => 'In the event creation form, enter the email addresses of external guests in the "Participants" field. They will receive an email invitation with meeting details and a confirmation link. You can track their response status (Accepted / Declined / Pending) directly from the event.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment configurer des rappels pour mes événements ?',
                        'answer'   => 'Les rappels se configurent dans le formulaire de l\'événement, section « Rappels ». Vous pouvez ajouter plusieurs rappels à des délais différents (15 min, 1 heure, 1 jour avant…). Les rappels sont envoyés par e-mail et/ou notification dans l\'application selon vos préférences. Vous pouvez définir des rappels par défaut dans Paramètres > Notifications.',
                    ],
                    'en' => [
                        'question' => 'How do I set reminders for my events?',
                        'answer'   => 'Reminders are configured in the event form, "Reminders" section. You can add multiple reminders at different intervals (15 min, 1 hour, 1 day before…). Reminders are sent by email and/or in-app notification according to your preferences. You can set default reminders in Settings > Notifications.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment synchroniser l\'agenda avec Google Calendar ?',
                        'answer'   => 'Allez dans Paramètres > Intégrations > Google Calendar. Cliquez sur « Connecter » et autorisez l\'accès à votre compte Google. La synchronisation est bidirectionnelle : les événements créés dans SECRETIS apparaissent dans Google Calendar et vice versa. La synchronisation se fait toutes les 5 minutes automatiquement.',
                    ],
                    'en' => [
                        'question' => 'How do I sync the calendar with Google Calendar?',
                        'answer'   => 'Go to Settings > Integrations > Google Calendar. Click "Connect" and grant access to your Google account. Synchronisation is bidirectional: events created in SECRETIS appear in Google Calendar and vice versa. Synchronisation runs automatically every 5 minutes.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment réserver une salle de réunion ?',
                        'answer'   => 'Dans le formulaire de création d\'événement, cliquez sur « Ajouter une salle ». La liste des salles disponibles au créneau choisi s\'affiche avec leur capacité. Sélectionnez la salle souhaitée et elle est automatiquement réservée. Un conflit de réservation vous sera signalé si la salle est déjà occupée.',
                    ],
                    'en' => [
                        'question' => 'How do I book a meeting room?',
                        'answer'   => 'In the event creation form, click "Add a room". The list of rooms available for the chosen time slot is displayed with their capacity. Select the desired room and it is automatically booked. A booking conflict will be flagged if the room is already occupied.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Peut-on partager un agenda avec toute l\'équipe ?',
                        'answer'   => 'Oui. Les administrateurs peuvent créer des agendas partagés depuis Agenda > Gérer les agendas > Nouvel agenda partagé. Chaque agenda partagé peut avoir des droits différents : lecture seule pour certains rôles, lecture/écriture pour d\'autres. Les événements des agendas partagés apparaissent dans la vue de chaque membre autorisé.',
                    ],
                    'en' => [
                        'question' => 'Can an agenda be shared with the whole team?',
                        'answer'   => 'Yes. Administrators can create shared calendars from Agenda > Manage calendars > New shared calendar. Each shared calendar can have different rights: read-only for some roles, read/write for others. Events from shared calendars appear in each authorised member\'s view.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment consulter la disponibilité de mes collègues ?',
                        'answer'   => 'Dans le formulaire de réunion, utilisez la vue « Disponibilités » pour voir les créneaux libres de chaque participant. Les plages occupées apparaissent en gris, les disponibilités en vert. SECRETIS peut suggérer automatiquement le premier créneau commun disponible via le bouton « Suggérer un créneau ».',
                    ],
                    'en' => [
                        'question' => 'How do I check my colleagues\' availability?',
                        'answer'   => 'In the meeting form, use the "Availability" view to see free slots for each participant. Busy slots appear in grey, available slots in green. SECRETIS can automatically suggest the first common available slot via the "Suggest a slot" button.',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment exporter mes événements au format iCal ?',
                        'answer'   => 'Cliquez sur l\'événement souhaité puis sur les trois points (⋯) > Exporter. Choisissez le format iCal (.ics). Vous pouvez également exporter tout l\'agenda d\'une période depuis Agenda > Exporter > Période personnalisée. Le fichier .ics est compatible avec tous les clients de messagerie et calendrier (Outlook, Apple Calendar, Thunderbird).',
                    ],
                    'en' => [
                        'question' => 'How do I export my events in iCal format?',
                        'answer'   => 'Click the desired event then the three dots (⋯) > Export. Choose iCal format (.ics). You can also export the entire agenda for a period from Agenda > Export > Custom period. The .ics file is compatible with all email and calendar clients (Outlook, Apple Calendar, Thunderbird).',
                    ],
                ],
            ],
            [
                'category'    => 'agenda',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment annuler ou supprimer un événement avec notification aux participants ?',
                        'answer'   => 'Ouvrez l\'événement, cliquez sur « Annuler l\'événement ». Un message de notification d\'annulation sera automatiquement envoyé à tous les participants par e-mail. Pour les événements récurrents, vous pouvez choisir d\'annuler uniquement l\'occurrence en cours ou toute la série. L\'événement annulé reste visible dans l\'agenda avec un statut « Annulé ».',
                    ],
                    'en' => [
                        'question' => 'How do I cancel or delete an event with participant notification?',
                        'answer'   => 'Open the event, click "Cancel event". A cancellation notification will automatically be sent to all participants by email. For recurring events, you can choose to cancel only the current occurrence or the entire series. The cancelled event remains visible in the agenda with a "Cancelled" status.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 3. GESTION DOCUMENTAIRE (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'documents',
                'order'       => 1,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Quels types de fichiers puis-je uploader dans la GED ?',
                        'answer'   => 'SECRETIS accepte la plupart des formats courants : PDF, Word (docx), Excel (xlsx), PowerPoint (pptx), images (JPG, PNG, GIF, SVG), vidéos (MP4, MOV), archives (ZIP, RAR) et fichiers texte. La taille maximale par fichier dépend de votre formule ; le détail figure sur la page tarifs. Les fichiers exécutables (.exe, .bat, .sh) sont bloqués pour des raisons de sécurité.',
                    ],
                    'en' => [
                        'question' => 'What types of files can I upload to the DMS?',
                        'answer'   => 'SECRETIS accepts most common formats: PDF, Word (docx), Excel (xlsx), PowerPoint (pptx), images (JPG, PNG, GIF, SVG), videos (MP4, MOV), archives (ZIP, RAR) and text files. Maximum file size depends on your plan; see the pricing page for details. Executable files (.exe, .bat, .sh) are blocked for security reasons.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment organiser mes documents en dossiers ?',
                        'answer'   => 'Dans la GED, cliquez sur « Nouveau dossier » pour créer une arborescence personnalisée. Vous pouvez créer des sous-dossiers à l\'infini et déplacer des documents par glisser-déposer ou via le menu contextuel. Les dossiers peuvent avoir des droits d\'accès différents par équipe ou par rôle.',
                    ],
                    'en' => [
                        'question' => 'How do I organise my documents into folders?',
                        'answer'   => 'In the DMS, click "New folder" to create a custom hierarchy. You can create unlimited sub-folders and move documents by drag-and-drop or via the context menu. Folders can have different access rights per team or role.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment partager un document avec un collègue ?',
                        'answer'   => 'Faites un clic droit sur le document et sélectionnez « Partager ». Vous pouvez partager avec des utilisateurs internes (recherche par nom) ou des externes (par e-mail). Choisissez les droits : Lecture, Commentaire ou Modification. Les destinataires internes reçoivent une notification ; les externes reçoivent un lien sécurisé par e-mail valable 30 jours.',
                    ],
                    'en' => [
                        'question' => 'How do I share a document with a colleague?',
                        'answer'   => 'Right-click the document and select "Share". You can share with internal users (search by name) or externals (by email). Choose rights: View, Comment or Edit. Internal recipients receive a notification; externals receive a secure email link valid for 30 days.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment fonctionne la gestion des versions de documents ?',
                        'answer'   => 'Chaque fois qu\'un document est modifié et ré-uploadé, SECRETIS crée automatiquement une nouvelle version. Toutes les versions antérieures sont conservées et accessibles via l\'onglet « Historique des versions » du document. Vous pouvez restaurer n\'importe quelle version précédente en un clic. La version actuelle est toujours affichée en premier.',
                    ],
                    'en' => [
                        'question' => 'How does document version management work?',
                        'answer'   => 'Each time a document is modified and re-uploaded, SECRETIS automatically creates a new version. All previous versions are kept and accessible via the "Version history" tab of the document. You can restore any previous version with one click. The current version is always displayed first.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'La signature électronique est-elle légalement valide ?',
                        'answer'   => 'SECRETIS intègre un module de signature électronique conforme aux normes OHADA et aux réglementations des pays africains membres. La signature génère un certificat d\'horodatage, une empreinte SHA-256 et un journal d\'audit complet (IP, heure, identité du signataire). Ce niveau de signature est reconnu pour les documents commerciaux et administratifs dans les 17 pays membres de l\'OHADA.',
                    ],
                    'en' => [
                        'question' => 'Is the electronic signature legally valid?',
                        'answer'   => 'SECRETIS integrates an electronic signature module compliant with OHADA standards and African member country regulations. The signature generates a timestamping certificate, a SHA-256 fingerprint and a complete audit log (IP, time, signer identity). This level of signature is recognised for commercial and administrative documents in all 17 OHADA member countries.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment archiver un document tout en le gardant consultable ?',
                        'answer'   => 'Faites un clic droit sur le document et sélectionnez « Archiver ». Le document quitte l\'espace de travail actif et est déplacé dans l\'espace « Archives ». Il reste entièrement consultable et téléchargeable mais n\'apparaît plus dans les résultats de recherche par défaut. Pour retrouver un document archivé, filtrez avec l\'option « Afficher les archives ».',
                    ],
                    'en' => [
                        'question' => 'How do I archive a document while keeping it accessible?',
                        'answer'   => 'Right-click the document and select "Archive". The document leaves the active workspace and moves to the "Archives" area. It remains fully viewable and downloadable but no longer appears in default search results. To find an archived document, filter with the "Show archives" option.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment rechercher un document dans toute la GED ?',
                        'answer'   => 'Utilisez la barre de recherche globale (raccourci Ctrl+K / Cmd+K). La recherche porte sur les noms de fichiers, les tags, les descriptions et le contenu textuel des PDF. Vous pouvez affiner avec des filtres : type de fichier, date, dossier, propriétaire. La recherche en plein texte dans les documents est disponible sur les formules payantes.',
                    ],
                    'en' => [
                        'question' => 'How do I search for a document across the entire DMS?',
                        'answer'   => 'Use the global search bar (shortcut Ctrl+K / Cmd+K). The search covers file names, tags, descriptions and textual content of PDFs. You can refine with filters: file type, date, folder, owner. Full-text search within documents is available on paid plans.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment ajouter des tags/métadonnées à un document ?',
                        'answer'   => 'Ouvrez le document et cliquez sur « Modifier les propriétés ». Vous pouvez ajouter des tags libres, une description, une catégorie et des champs personnalisés définis par votre administrateur. Les tags facilitent la classification et la recherche. Vous pouvez appliquer des tags en masse en sélectionnant plusieurs documents.',
                    ],
                    'en' => [
                        'question' => 'How do I add tags/metadata to a document?',
                        'answer'   => 'Open the document and click "Edit properties". You can add free tags, a description, a category and custom fields defined by your administrator. Tags facilitate classification and search. You can apply tags in bulk by selecting multiple documents.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer un document depuis un modèle ?',
                        'answer'   => 'Allez dans GED > Modèles de documents. Sélectionnez le modèle souhaité (contrat, rapport, compte-rendu, lettre administrative…) et cliquez sur « Créer depuis ce modèle ». Un formulaire vous demande de remplir les variables (nom, date, objet…) puis génère le document final en PDF ou Word selon vos préférences.',
                    ],
                    'en' => [
                        'question' => 'How do I create a document from a template?',
                        'answer'   => 'Go to DMS > Document templates. Select the desired template (contract, report, minutes, administrative letter…) and click "Create from this template". A form asks you to fill in variables (name, date, subject…) then generates the final document in PDF or Word according to your preferences.',
                    ],
                ],
            ],
            [
                'category'    => 'documents',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Quelle est la capacité de stockage disponible ?',
                        'answer'   => 'La capacité de stockage dépend de votre formule ; le détail figure sur la page tarifs. Vous pouvez voir votre utilisation actuelle dans Administration > Stockage. En cas de dépassement, un avertissement est envoyé à 80% et 95% de la capacité. Des extensions de stockage à la carte sont disponibles pour tous les plans.',
                    ],
                    'en' => [
                        'question' => 'What storage capacity is available?',
                        'answer'   => 'Storage capacity depends on your plan; see the pricing page for details. You can view your current usage in Administration > Storage. When approaching the limit, a warning is sent at 80% and 95% capacity. On-demand storage extensions are available for all plans.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 4. TÂCHES & PROJETS (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'taches',
                'order'       => 1,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer une tâche et l\'affecter à un collègue ?',
                        'answer'   => 'Dans le module Tâches, cliquez sur « + Nouvelle tâche ». Renseignez le titre, la description, la date d\'échéance et la priorité (Basse / Normale / Haute / Urgente). Dans le champ « Assigné à », sélectionnez le collègue concerné. Il reçoit immédiatement une notification et la tâche apparaît dans son tableau de bord.',
                    ],
                    'en' => [
                        'question' => 'How do I create a task and assign it to a colleague?',
                        'answer'   => 'In the Tasks module, click "+ New task". Fill in the title, description, due date and priority (Low / Normal / High / Urgent). In the "Assigned to" field, select the relevant colleague. They immediately receive a notification and the task appears in their dashboard.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment utiliser la vue Kanban pour gérer mes tâches ?',
                        'answer'   => 'Depuis le module Tâches, cliquez sur l\'icône Kanban (colonnes). Par défaut, vous avez les colonnes « À faire », « En cours » et « Terminé ». Déplacez les tâches par glisser-déposer entre les colonnes. Les administrateurs peuvent créer des colonnes personnalisées pour adapter le flux à leur processus métier.',
                    ],
                    'en' => [
                        'question' => 'How do I use the Kanban view to manage my tasks?',
                        'answer'   => 'From the Tasks module, click the Kanban icon (columns). By default you have "To do", "In progress" and "Done" columns. Move tasks by drag-and-drop between columns. Administrators can create custom columns to adapt the flow to their business process.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Peut-on créer des sous-tâches ?',
                        'answer'   => 'Oui. Ouvrez une tâche et cliquez sur « Ajouter une sous-tâche » dans l\'onglet « Sous-tâches ». Chaque sous-tâche peut être assignée à un utilisateur différent, avoir sa propre date d\'échéance et sa propre priorité. La progression globale de la tâche parent est calculée automatiquement en fonction du nombre de sous-tâches complétées.',
                    ],
                    'en' => [
                        'question' => 'Can sub-tasks be created?',
                        'answer'   => 'Yes. Open a task and click "Add a sub-task" in the "Sub-tasks" tab. Each sub-task can be assigned to a different user, have its own due date and priority. The overall progress of the parent task is automatically calculated based on the number of completed sub-tasks.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment définir et suivre les priorités de tâches ?',
                        'answer'   => 'Chaque tâche a un niveau de priorité : Basse (bleu), Normale (gris), Haute (orange), Urgente (rouge). Vous pouvez filtrer et trier vos tâches par priorité. Le module affiche en premier les tâches urgentes dues dans les 24 heures. SARA peut également vous alerter si des tâches importantes approchent de leur échéance.',
                    ],
                    'en' => [
                        'question' => 'How do I set and track task priorities?',
                        'answer'   => 'Each task has a priority level: Low (blue), Normal (grey), High (orange), Urgent (red). You can filter and sort your tasks by priority. The module displays first urgent tasks due within 24 hours. SARA can also alert you when important tasks are approaching their deadline.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment attacher des fichiers à une tâche ?',
                        'answer'   => 'Ouvrez la tâche et cliquez sur l\'onglet « Pièces jointes ». Faites glisser vos fichiers ou cliquez sur « Parcourir ». Vous pouvez également lier des documents existants depuis la GED via le bouton « Depuis la GED ». Tous les membres assignés à la tâche ont accès aux pièces jointes.',
                    ],
                    'en' => [
                        'question' => 'How do I attach files to a task?',
                        'answer'   => 'Open the task and click the "Attachments" tab. Drag and drop your files or click "Browse". You can also link existing documents from the DMS via the "From DMS" button. All members assigned to the task have access to the attachments.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment recevoir des rappels avant l\'échéance d\'une tâche ?',
                        'answer'   => 'Dans le formulaire de tâche, cliquez sur « Rappels » et choisissez les délais de notification (1 jour avant, 2 jours avant, etc.). Vous pouvez aussi activer les rappels globaux dans Paramètres > Notifications > Tâches. Les rappels sont envoyés par e-mail et par notification push dans l\'application.',
                    ],
                    'en' => [
                        'question' => 'How do I receive reminders before a task deadline?',
                        'answer'   => 'In the task form, click "Reminders" and choose notification delays (1 day before, 2 days before, etc.). You can also enable global reminders in Settings > Notifications > Tasks. Reminders are sent by email and push notification in the application.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer et gérer un projet avec plusieurs tâches liées ?',
                        'answer'   => 'Allez dans Projets > Nouveau projet. Donnez un nom au projet, définissez les dates de début et fin, le chef de projet et les membres. Ensuite créez des tâches à l\'intérieur du projet. Les tâches du projet sont liées et leur avancement contribue au pourcentage de complétion global. Un diagramme de Gantt est disponible depuis la vue Projet.',
                    ],
                    'en' => [
                        'question' => 'How do I create and manage a project with multiple linked tasks?',
                        'answer'   => 'Go to Projects > New project. Give the project a name, define start and end dates, the project manager and members. Then create tasks inside the project. Project tasks are linked and their progress contributes to the overall completion percentage. A Gantt chart is available from the Project view.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment commenter une tâche pour collaborer avec mon équipe ?',
                        'answer'   => 'Ouvrez la tâche et cliquez sur l\'onglet « Commentaires ». Rédigez votre message et appuyez sur Entrée. Vous pouvez mentionner un collègue avec @prénom pour lui envoyer une notification ciblée. Les commentaires supportent le texte formaté, les liens et les pièces jointes. Tous les membres assignés reçoivent une notification pour chaque nouveau commentaire.',
                    ],
                    'en' => [
                        'question' => 'How do I comment on a task to collaborate with my team?',
                        'answer'   => 'Open the task and click the "Comments" tab. Write your message and press Enter. You can mention a colleague with @firstname to send them a targeted notification. Comments support formatted text, links and attachments. All assigned members receive a notification for each new comment.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment savoir si une tâche que j\'ai assignée a été complétée ?',
                        'answer'   => 'Vous recevez une notification automatique lorsqu\'un assigné marque une tâche comme terminée. Vous pouvez aussi suivre l\'avancement depuis Mes tâches > Tâches assignées par moi. Le tableau de bord affiche un récapitulatif des tâches terminées ce jour et cette semaine.',
                    ],
                    'en' => [
                        'question' => 'How do I know if a task I assigned has been completed?',
                        'answer'   => 'You receive an automatic notification when an assignee marks a task as done. You can also track progress from My tasks > Tasks assigned by me. The dashboard displays a summary of tasks completed today and this week.',
                    ],
                ],
            ],
            [
                'category'    => 'taches',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment exporter la liste de mes tâches en Excel ou PDF ?',
                        'answer'   => 'Dans la vue liste des tâches, cliquez sur le bouton « Exporter » en haut à droite. Choisissez le format (Excel ou PDF) et les filtres à appliquer (toutes les tâches, mes tâches, par projet, par période). Le rapport inclut les colonnes : titre, assigné, priorité, statut, date d\'échéance, progression.',
                    ],
                    'en' => [
                        'question' => 'How do I export my task list to Excel or PDF?',
                        'answer'   => 'In the task list view, click the "Export" button at the top right. Choose the format (Excel or PDF) and the filters to apply (all tasks, my tasks, by project, by period). The report includes columns: title, assignee, priority, status, due date, progress.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 5. VISITEURS & RÉCEPTION (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'visiteurs',
                'order'       => 1,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment enregistrer un visiteur à son arrivée ?',
                        'answer'   => 'Depuis le module Visiteurs, cliquez sur « Enregistrer un visiteur » ou utilisez la tablette d\'accueil en mode kiosque. Saisissez le nom du visiteur, son entreprise, la personne visitée et l\'objet de la visite. Une photo peut être prise avec la webcam. Le badge est imprimé automatiquement si une imprimante est connectée. L\'hôte reçoit une notification instantanée.',
                    ],
                    'en' => [
                        'question' => 'How do I register a visitor upon arrival?',
                        'answer'   => 'From the Visitors module, click "Register a visitor" or use the reception tablet in kiosk mode. Enter the visitor\'s name, company, person being visited and purpose of visit. A photo can be taken with the webcam. The badge is printed automatically if a printer is connected. The host receives an instant notification.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment notifier l\'hôte de l\'arrivée de son visiteur ?',
                        'answer'   => 'Lors de l\'enregistrement du visiteur, sélectionnez l\'hôte interne dans le champ « Personne visitée ». Une notification est automatiquement envoyée par e-mail, notification push dans l\'application et SMS (si le module SMS est activé). L\'hôte peut confirmer sa disponibilité directement depuis la notification.',
                    ],
                    'en' => [
                        'question' => 'How do I notify the host of their visitor\'s arrival?',
                        'answer'   => 'When registering the visitor, select the internal host in the "Person visited" field. A notification is automatically sent by email, push notification in the app and SMS (if the SMS module is enabled). The host can confirm their availability directly from the notification.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment générer et imprimer un badge visiteur ?',
                        'answer'   => 'SECRETIS génère automatiquement un badge PDF lors de l\'enregistrement du visiteur. Le badge inclut le nom, la photo, le nom de l\'hôte, la date/heure et un QR code unique. Si une imprimante d\'étiquettes est configurée dans Administration > Matériel, l\'impression est automatique. Sinon, vous pouvez imprimer manuellement depuis n\'importe quelle imprimante standard.',
                    ],
                    'en' => [
                        'question' => 'How do I generate and print a visitor badge?',
                        'answer'   => 'SECRETIS automatically generates a PDF badge when the visitor is registered. The badge includes the name, photo, host name, date/time and a unique QR code. If a label printer is configured in Administration > Hardware, printing is automatic. Otherwise, you can print manually from any standard printer.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment pré-enregistrer un visiteur attendu ?',
                        'answer'   => 'Dans le module Visiteurs > Visites planifiées, cliquez sur « Planifier une visite ». Renseignez les informations du visiteur et la date/heure prévue. Le visiteur reçoit un e-mail avec un code QR à présenter à l\'accueil. Lors de son arrivée, la réceptionniste scanne le code QR et la visite est enregistrée automatiquement en 2 secondes.',
                    ],
                    'en' => [
                        'question' => 'How do I pre-register an expected visitor?',
                        'answer'   => 'In Visitors module > Planned visits, click "Plan a visit". Enter the visitor\'s information and the expected date/time. The visitor receives an email with a QR code to present at reception. Upon arrival, the receptionist scans the QR code and the visit is automatically registered in 2 seconds.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment consulter l\'historique des visites ?',
                        'answer'   => 'Allez dans Visiteurs > Historique. Vous pouvez filtrer par date, par hôte, par entreprise visitrice ou par statut (en cours / terminé). L\'export en Excel ou PDF est disponible pour les rapports de sécurité ou les audits. L\'historique est conservé 5 ans conformément aux recommandations RGPD/OHADA.',
                    ],
                    'en' => [
                        'question' => 'How do I view the visit history?',
                        'answer'   => 'Go to Visitors > History. You can filter by date, host, visiting company or status (in progress / completed). Export to Excel or PDF is available for security reports or audits. The history is kept for 5 years in accordance with GDPR/OHADA recommendations.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment configurer le mode kiosque pour la tablette d\'accueil ?',
                        'answer'   => 'Dans Administration > Visiteurs > Configuration kiosque, activez le mode kiosque et définissez un code PIN d\'accès. Installez l\'application SECRETIS sur votre tablette, connectez-vous et sélectionnez « Mode kiosque ». Le visiteur remplit lui-même ses informations, signe le registre numérique et l\'hôte est notifié automatiquement.',
                    ],
                    'en' => [
                        'question' => 'How do I configure kiosk mode for the reception tablet?',
                        'answer'   => 'In Administration > Visitors > Kiosk configuration, enable kiosk mode and set an access PIN. Install the SECRETIS app on your tablet, log in and select "Kiosk mode". The visitor fills in their own information, signs the digital register and the host is automatically notified.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Peut-on gérer les accès sécurisés par zones pour les visiteurs ?',
                        'answer'   => 'Oui. Dans Administration > Visiteurs > Zones d\'accès, définissez vos zones (Accueil, Salle de réunion, Zone technique, etc.). Lors de l\'enregistrement, précisez les zones autorisées pour le visiteur. Les zones s\'affichent sur le badge. Si votre immeuble dispose d\'un système de contrôle d\'accès connecté, SECRETIS peut l\'intégrer via l\'API.',
                    ],
                    'en' => [
                        'question' => 'Can zone-based access control be managed for visitors?',
                        'answer'   => 'Yes. In Administration > Visitors > Access zones, define your zones (Reception, Meeting room, Technical area, etc.). When registering, specify the authorised zones for the visitor. Zones appear on the badge. If your building has a connected access control system, SECRETIS can integrate it via the API.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment enregistrer le départ d\'un visiteur ?',
                        'answer'   => 'Depuis Visiteurs > Visites en cours, sélectionnez la visite et cliquez sur « Enregistrer le départ ». L\'heure de départ est horodatée automatiquement. Vous pouvez aussi configurer le mode kiosque pour que le visiteur enregistre lui-même son départ en scannant son badge QR. La durée totale de la visite est calculée automatiquement.',
                    ],
                    'en' => [
                        'question' => 'How do I record a visitor\'s departure?',
                        'answer'   => 'From Visitors > Ongoing visits, select the visit and click "Record departure". The departure time is automatically timestamped. You can also configure kiosk mode so the visitor records their own departure by scanning their QR badge. The total visit duration is calculated automatically.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Les données des visiteurs sont-elles protégées conformément au RGPD ?',
                        'answer'   => 'Oui. SECRETIS applique les principes du RGPD : consentement explicite lors de l\'enregistrement, durée de conservation limitée (configurable par l\'administrateur, recommandation : 1 an), droit à l\'effacement sur demande, et accès restreint aux données visiteurs selon les rôles. Un registre de traitement des données est disponible pour votre DPO.',
                    ],
                    'en' => [
                        'question' => 'Is visitor data protected in accordance with GDPR?',
                        'answer'   => 'Yes. SECRETIS applies GDPR principles: explicit consent at registration, limited retention period (configurable by administrator, recommendation: 1 year), right to erasure on request, and restricted access to visitor data based on roles. A data processing register is available for your DPO.',
                    ],
                ],
            ],
            [
                'category'    => 'visiteurs',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment générer un rapport des visites du mois ?',
                        'answer'   => 'Dans Visiteurs > Rapports, sélectionnez « Rapport mensuel » et choisissez le mois. Le rapport inclut : nombre total de visiteurs, répartition par jour, par hôte, par entreprise visitrice, durée moyenne des visites. Exportez en PDF pour le rapport de sécurité ou en Excel pour des analyses personnalisées.',
                    ],
                    'en' => [
                        'question' => 'How do I generate a monthly visit report?',
                        'answer'   => 'In Visitors > Reports, select "Monthly report" and choose the month. The report includes: total number of visitors, breakdown by day, by host, by visiting company, average visit duration. Export to PDF for the security report or Excel for custom analysis.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 6. PAIEMENTS & ABONNEMENT (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'paiements',
                'order'       => 1,
                'is_featured' => true,
                'translations' => [
                    'fr' => [
                        'question' => 'Quels modes de paiement sont acceptés ?',
                        'answer'   => 'SECRETIS accepte les cartes bancaires Visa et Mastercard, le virement bancaire, Mobile Money (Orange Money, MTN MoMo, Wave), et les paiements OHADA via les opérateurs locaux partenaires. Les factures peuvent être réglées en XOF (FCFA), XAF, USD et EUR. Pour les grandes organisations, des arrangements de paiement trimestriel ou annuel sont disponibles.',
                    ],
                    'en' => [
                        'question' => 'What payment methods are accepted?',
                        'answer'   => 'SECRETIS accepts Visa and Mastercard bank cards, bank transfer, Mobile Money (Orange Money, MTN MoMo, Wave), and OHADA payments via partner local operators. Invoices can be settled in XOF (FCFA), XAF, USD and EUR. For large organisations, quarterly or annual payment arrangements are available.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment changer de plan d\'abonnement ?',
                        'answer'   => 'Allez dans Administration > Abonnement > Changer de plan. Sélectionnez le nouveau plan et confirmez. Le changement est effectif immédiatement. Si vous montez en gamme, vous êtes facturé au prorata pour la période restante. Si vous descendez en gamme, la réduction s\'applique au prochain cycle de facturation.',
                    ],
                    'en' => [
                        'question' => 'How do I change my subscription plan?',
                        'answer'   => 'Go to Administration > Subscription > Change plan. Select the new plan and confirm. The change is effective immediately. If you upgrade, you are billed pro-rata for the remaining period. If you downgrade, the reduction applies at the next billing cycle.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment télécharger mes factures ?',
                        'answer'   => 'Allez dans Administration > Abonnement > Historique des factures. Toutes les factures sont listées avec leur date, montant et statut. Cliquez sur l\'icône de téléchargement pour obtenir le PDF officiel de chaque facture. Les factures respectent les normes comptables OHADA et sont directement utilisables pour votre comptabilité.',
                    ],
                    'en' => [
                        'question' => 'How do I download my invoices?',
                        'answer'   => 'Go to Administration > Subscription > Invoice history. All invoices are listed with their date, amount and status. Click the download icon to get the official PDF of each invoice. Invoices comply with OHADA accounting standards and are directly usable for your accounting.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment résilier mon abonnement ?',
                        'answer'   => 'Allez dans Administration > Abonnement > Résilier. Votre accès reste actif jusqu\'à la fin de la période payée. Avant la résiliation, nous vous recommandons d\'exporter toutes vos données (Administration > Exports). Après résiliation, votre espace bascule dans le palier gratuit : vos données restent accessibles, plafond en vigueur. En cas de non-renouvellement, elles sont conservées le temps prévu par la politique de sauvegarde, avec deux avertissements avant toute suppression.',
                    ],
                    'en' => [
                        'question' => 'How do I cancel my subscription?',
                        'answer'   => 'Go to Administration > Subscription > Cancel. Your access remains active until the end of the paid period. Before cancelling, we recommend exporting all your data (Administration > Exports). After cancellation, your data is kept for 30 days then permanently deleted. Cancellation can be reversed during this period.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Une remise est-elle disponible pour les ONG ou les institutions publiques ?',
                        'answer'   => 'Oui. IBIG Soft offre des tarifs préférentiels aux ONG, associations à but non lucratif et institutions publiques africaines. Contactez notre équipe commerciale à sales@ibig-secretis.com avec votre statut juridique pour obtenir un devis personnalisé. Des remises pouvant aller jusqu\'à 40% sont disponibles selon votre profil.',
                    ],
                    'en' => [
                        'question' => 'Is a discount available for NGOs or public institutions?',
                        'answer'   => 'Yes. IBIG Soft offers preferential rates to NGOs, non-profit associations and African public institutions. Contact our sales team at sales@ibig-secretis.com with your legal status to get a custom quote. Discounts of up to 40% are available depending on your profile.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Que se passe-t-il si mon paiement échoue ?',
                        'answer'   => 'En cas d\'échec de paiement, vous recevez un e-mail d\'alerte immédiatement. Une nouvelle tentative automatique est effectuée à J+3 et J+7. Après l\'échéance, l\'accès complet est maintenu pendant la période de grâce. Ensuite votre espace passe en lecture seule : vos données restent consultables et sont conservées. Aucune n\'est supprimée sans avertissement préalable. Contactez support@ibig-secretis.com pour toute assistance.',
                    ],
                    'en' => [
                        'question' => 'What happens if my payment fails?',
                        'answer'   => 'If payment fails, you receive an alert email immediately. An automatic retry is made at D+3 and D+7. If payment remains failed after 7 days, your account switches to degraded mode (read only). You have 30 days to settle before permanent suspension. Contact support@ibig-secretis.com for assistance.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Puis-je payer annuellement pour obtenir un avantage ?',
                        'answer'   => 'Oui. Le paiement annuel offre 2 mois gratuits (soit environ 17% de réduction) par rapport au paiement mensuel. Vous pouvez basculer en facturation annuelle depuis Administration > Abonnement > Fréquence de facturation. La différence est créditée ou facturée au prorata.',
                    ],
                    'en' => [
                        'question' => 'Can I pay annually for a discount?',
                        'answer'   => 'Yes. Annual payment offers 2 free months (approximately 17% discount) compared to monthly payment. You can switch to annual billing from Administration > Subscription > Billing frequency. The difference is credited or billed pro-rata.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Les tarifs incluent-ils la TVA ?',
                        'answer'   => 'Les tarifs affichés sur notre site sont hors taxes. La TVA applicable est calculée selon le pays de votre organisation et ajoutée sur la facture finale. Pour les entreprises de la zone UEMOA, la TVA est de 18%. Pour les autres pays, le taux applicable selon la législation locale est appliqué. Les organisations exonérées peuvent fournir leur certificat d\'exonération.',
                    ],
                    'en' => [
                        'question' => 'Do prices include VAT?',
                        'answer'   => 'Prices displayed on our website are excluding taxes. Applicable VAT is calculated based on your organisation\'s country and added to the final invoice. For WAEMU zone companies, VAT is 18%. For other countries, the applicable rate under local law is applied. Exempt organisations can provide their exemption certificate.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment ajouter ou modifier un moyen de paiement ?',
                        'answer'   => 'Allez dans Administration > Abonnement > Moyens de paiement. Cliquez sur « Ajouter un moyen de paiement » et suivez les instructions. Vous pouvez avoir plusieurs moyens de paiement enregistrés et définir l\'un d\'eux comme moyen par défaut. Les informations de carte sont sécurisées par notre prestataire de paiement certifié PCI-DSS.',
                    ],
                    'en' => [
                        'question' => 'How do I add or change a payment method?',
                        'answer'   => 'Go to Administration > Subscription > Payment methods. Click "Add a payment method" and follow the instructions. You can have multiple payment methods registered and set one as default. Card information is secured by our PCI-DSS certified payment provider.',
                    ],
                ],
            ],
            [
                'category'    => 'paiements',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'La politique de remboursement est-elle applicable ?',
                        'answer'   => 'IBIG Soft offre un remboursement complet si vous résiliez dans les 14 jours suivant votre premier abonnement (hors période d\'essai). Après ce délai, les abonnements mensuels ne sont pas remboursables pour le mois en cours. Les abonnements annuels peuvent être remboursés au prorata des mois restants en cas de circonstances exceptionnelles. Contactez support@ibig-secretis.com.',
                    ],
                    'en' => [
                        'question' => 'Is the refund policy applicable?',
                        'answer'   => 'IBIG Soft offers a full refund if you cancel within 14 days of your first subscription (excluding trial period). After this period, monthly subscriptions are not refundable for the current month. Annual subscriptions can be refunded pro-rata for remaining months in exceptional circumstances. Contact support@ibig-secretis.com.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 7. UTILISATEURS & PERMISSIONS (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'utilisateurs',
                'order'       => 1,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Quels sont les rôles disponibles dans SECRETIS ?',
                        'answer'   => 'SECRETIS propose 6 rôles prédéfinis : Super Admin (gestion globale), Admin (gestion de l\'organisation), Dirigeant (accès complet en lecture + validations), Secrétaire (gestion agenda, courrier, visiteurs), RH (module ressources humaines), et Comptable (module financier). Chaque rôle peut être personnalisé par l\'administrateur via les permissions granulaires.',
                    ],
                    'en' => [
                        'question' => 'What roles are available in SECRETIS?',
                        'answer'   => 'SECRETIS offers 6 predefined roles: Super Admin (global management), Admin (organisation management), Executive (full read access + validations), Secretary (calendar, mail, visitor management), HR (human resources module), and Accountant (financial module). Each role can be customised by the administrator via granular permissions.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment désactiver temporairement un compte utilisateur ?',
                        'answer'   => 'Dans Administration > Utilisateurs, cliquez sur le nom de l\'utilisateur puis sur « Désactiver le compte ». L\'utilisateur ne peut plus se connecter mais ses données et son historique sont conservés intégralement. Vous pouvez réactiver le compte à tout moment. La désactivation est préférable à la suppression pour maintenir la cohérence des données.',
                    ],
                    'en' => [
                        'question' => 'How do I temporarily deactivate a user account?',
                        'answer'   => 'In Administration > Users, click the user\'s name then "Deactivate account". The user can no longer log in but their data and history are fully preserved. You can reactivate the account at any time. Deactivation is preferable to deletion to maintain data integrity.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Un administrateur peut-il réinitialiser le mot de passe d\'un utilisateur ?',
                        'answer'   => 'Oui. Dans Administration > Utilisateurs, sélectionnez l\'utilisateur et cliquez sur « Réinitialiser le mot de passe ». Un e-mail de réinitialisation est envoyé à l\'utilisateur. L\'administrateur ne peut pas voir le nouveau mot de passe (sécurité). Si l\'utilisateur n\'a plus accès à son e-mail, contactez le support IBIG Soft.',
                    ],
                    'en' => [
                        'question' => 'Can an administrator reset a user\'s password?',
                        'answer'   => 'Yes. In Administration > Users, select the user and click "Reset password". A reset email is sent to the user. The administrator cannot see the new password (security). If the user no longer has access to their email, contact IBIG Soft support.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer un rôle personnalisé avec des permissions spécifiques ?',
                        'answer'   => 'Dans Administration > Rôles et permissions > Nouveau rôle, définissez le nom et sélectionnez les permissions granulaires. Les permissions couvrent chaque module et chaque action (créer, lire, modifier, supprimer, exporter, valider). Les rôles personnalisés peuvent être assignés à n\'importe quel utilisateur et modifiés sans interruption de service.',
                    ],
                    'en' => [
                        'question' => 'How do I create a custom role with specific permissions?',
                        'answer'   => 'In Administration > Roles and permissions > New role, define the name and select granular permissions. Permissions cover each module and each action (create, read, update, delete, export, validate). Custom roles can be assigned to any user and modified without service interruption.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment gérer les utilisateurs avec plusieurs rôles ?',
                        'answer'   => 'Un utilisateur peut avoir plusieurs rôles simultanément dans SECRETIS. Les permissions cumulatives s\'appliquent (union des permissions de chaque rôle). Par exemple, un employé peut être à la fois Secrétaire et RH. Assignez les rôles depuis la fiche de l\'utilisateur > onglet Rôles > Ajouter un rôle.',
                    ],
                    'en' => [
                        'question' => 'How do I manage users with multiple roles?',
                        'answer'   => 'A user can have multiple roles simultaneously in SECRETIS. Cumulative permissions apply (union of permissions from each role). For example, an employee can be both Secretary and HR. Assign roles from the user profile > Roles tab > Add a role.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment connecter SECRETIS à notre annuaire Active Directory ou LDAP ?',
                        'answer'   => 'Le SSO Active Directory/LDAP est disponible sur les formules payantes. Dans Administration > Intégrations > SSO/LDAP, renseignez les paramètres de connexion (serveur LDAP, port, base DN, attributs de mapping). Une fois configuré, les utilisateurs se connectent avec leurs identifiants d\'entreprise existants. Contactez notre équipe technique pour l\'assistance à la configuration.',
                    ],
                    'en' => [
                        'question' => 'How do I connect SECRETIS to our Active Directory or LDAP directory?',
                        'answer'   => 'Active Directory/LDAP SSO is available from the Professional plan. In Administration > Integrations > SSO/LDAP, enter the connection parameters (LDAP server, port, base DN, mapping attributes). Once configured, users log in with their existing company credentials. Contact our technical team for configuration assistance.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Combien d\'utilisateurs puis-je avoir sur mon compte ?',
                        'answer'   => 'Le nombre d\'utilisateurs dépend de votre plan : 5 utilisateurs (Starter), 25 utilisateurs (Professional), illimité (Enterprise). Des utilisateurs supplémentaires peuvent être ajoutés à l\'unité sur les formules payantes depuis Administration > Abonnement > Utilisateurs supplémentaires.',
                    ],
                    'en' => [
                        'question' => 'How many users can I have on my account?',
                        'answer'   => 'The number of users depends on your plan; see the pricing page for details. Additional users can be added individually on paid plans from Administration > Subscription > Additional users.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment voir toutes les activités d\'un utilisateur spécifique ?',
                        'answer'   => 'Dans Administration > Journal d\'audit, filtrez par utilisateur pour voir toutes ses actions (connexions, modifications, téléchargements, etc.) avec horodatage et adresse IP. Les administrateurs peuvent générer un rapport d\'activité par utilisateur pour n\'importe quelle période. Cette fonctionnalité est disponible sur les plans Professional et Enterprise.',
                    ],
                    'en' => [
                        'question' => 'How do I view all activities of a specific user?',
                        'answer'   => 'In Administration > Audit log, filter by user to see all their actions (logins, modifications, downloads, etc.) with timestamp and IP address. Administrators can generate an activity report per user for any period. This feature is available on Professional and Enterprise plans.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment importer en masse des utilisateurs depuis un fichier CSV ?',
                        'answer'   => 'Dans Administration > Utilisateurs > Importer, téléchargez le modèle CSV fourni. Remplissez les colonnes : prénom, nom, e-mail, rôle, département. Uploadez le fichier et prévisualisez les données avant de confirmer l\'import. Un e-mail d\'invitation est envoyé automatiquement à chaque nouvel utilisateur. Maximum 500 utilisateurs par import.',
                    ],
                    'en' => [
                        'question' => 'How do I bulk-import users from a CSV file?',
                        'answer'   => 'In Administration > Users > Import, download the provided CSV template. Fill in columns: first name, last name, email, role, department. Upload the file and preview the data before confirming the import. An invitation email is automatically sent to each new user. Maximum 500 users per import.',
                    ],
                ],
            ],
            [
                'category'    => 'utilisateurs',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment définir un utilisateur comme délégué d\'un autre pendant ses congés ?',
                        'answer'   => 'Dans la fiche de l\'utilisateur > onglet Délégation, activez la délégation et sélectionnez le délégué et la période. Pendant cette période, le délégué reçoit les notifications de l\'utilisateur absent et peut agir en son nom selon les permissions définies. La délégation se désactive automatiquement à la date de fin.',
                    ],
                    'en' => [
                        'question' => 'How do I set a user as another\'s delegate during leave?',
                        'answer'   => 'In the user profile > Delegation tab, enable delegation and select the delegate and the period. During this period, the delegate receives the absent user\'s notifications and can act on their behalf according to defined permissions. Delegation automatically deactivates at the end date.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 8. RAPPORTS & EXPORTS (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'rapports',
                'order'       => 1,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Quels rapports sont disponibles dans SECRETIS ?',
                        'answer'   => 'SECRETIS propose des rapports pour chaque module : rapport d\'activité agenda, rapport de tâches par utilisateur/projet, rapport GED (documents uploadés, accès, partages), rapport de visiteurs, rapport RH, rapport financier, rapport de courrier, et rapport d\'utilisation global de la plateforme. Des rapports personnalisés peuvent être créés depuis le module Rapports avancés.',
                    ],
                    'en' => [
                        'question' => 'What reports are available in SECRETIS?',
                        'answer'   => 'SECRETIS offers reports for each module: calendar activity report, task report by user/project, DMS report (uploaded documents, access, shares), visitor report, HR report, financial report, mail report, and global platform usage report. Custom reports can be created from the Advanced Reports module.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Dans quels formats puis-je exporter mes rapports ?',
                        'answer'   => 'Les rapports peuvent être exportés en PDF (mise en page professionnelle avec en-tête de votre organisation), Excel (.xlsx pour analyses personnalisées), CSV (données brutes pour intégration externe) et JSON (pour les développeurs). Certains rapports proposent également l\'export en Word (.docx).',
                    ],
                    'en' => [
                        'question' => 'In what formats can I export my reports?',
                        'answer'   => 'Reports can be exported as PDF (professional layout with your organisation\'s header), Excel (.xlsx for custom analysis), CSV (raw data for external integration) and JSON (for developers). Some reports also offer Word (.docx) export.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment planifier l\'envoi automatique d\'un rapport ?',
                        'answer'   => 'Dans le module Rapports, sélectionnez un rapport puis cliquez sur « Planifier ». Configurez la fréquence (quotidien, hebdomadaire, mensuel), l\'heure d\'envoi et les destinataires (e-mails internes ou externes). Le rapport est généré automatiquement et envoyé par e-mail en pièce jointe au format choisi.',
                    ],
                    'en' => [
                        'question' => 'How do I schedule automatic report delivery?',
                        'answer'   => 'In the Reports module, select a report then click "Schedule". Configure the frequency (daily, weekly, monthly), send time and recipients (internal or external emails). The report is automatically generated and sent by email as an attachment in the chosen format.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment créer un tableau de bord personnalisé ?',
                        'answer'   => 'Dans le module Rapports > Tableaux de bord > Nouveau tableau de bord. Ajoutez des widgets parmi la bibliothèque disponible : graphiques en barres/courbes/camembert, KPI (indicateurs clés), tableaux de données, calendriers heat-map. Chaque widget est configurable (période, filtres, unité). Les tableaux de bord peuvent être partagés avec des équipes.',
                    ],
                    'en' => [
                        'question' => 'How do I create a custom dashboard?',
                        'answer'   => 'In Reports module > Dashboards > New dashboard. Add widgets from the available library: bar/line/pie charts, KPIs (key indicators), data tables, heat-map calendars. Each widget is configurable (period, filters, unit). Dashboards can be shared with teams.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment exporter toutes mes données pour une migration ou une sauvegarde ?',
                        'answer'   => 'Dans Administration > Exports > Export complet, sélectionnez les modules à inclure et lancez l\'export. Selon le volume de données, la génération peut prendre de 5 à 30 minutes. Vous recevez un e-mail avec le lien de téléchargement. L\'archive ZIP contient les données en JSON et les fichiers binaires de la GED. Ce lien est valide 48 heures.',
                    ],
                    'en' => [
                        'question' => 'How do I export all my data for a migration or backup?',
                        'answer'   => 'In Administration > Exports > Full export, select the modules to include and launch the export. Depending on data volume, generation may take 5 to 30 minutes. You receive an email with the download link. The ZIP archive contains data in JSON and binary DMS files. This link is valid for 48 hours.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Les rapports peuvent-ils inclure les données de toute l\'organisation ?',
                        'answer'   => 'Oui, si vous avez le rôle Admin ou Dirigeant. Les rapports organisationnels agrègent les données de tous les utilisateurs. Les managers peuvent voir les rapports de leur équipe. Les utilisateurs simples ne voient que leurs propres données. Les filtres de permission s\'appliquent automatiquement selon votre rôle.',
                    ],
                    'en' => [
                        'question' => 'Can reports include data from the entire organisation?',
                        'answer'   => 'Yes, if you have the Admin or Executive role. Organisational reports aggregate data from all users. Managers can see their team\'s reports. Regular users only see their own data. Permission filters automatically apply based on your role.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment accéder aux indicateurs de performance (KPI) en temps réel ?',
                        'answer'   => 'Le tableau de bord principal affiche les KPI en temps réel : tâches en retard, événements du jour, documents en attente de validation, visiteurs actuellement présents, etc. Pour des KPI métier personnalisés, utilisez le module Rapports > Tableau de bord > Ajouter un widget KPI.',
                    ],
                    'en' => [
                        'question' => 'How do I access real-time performance indicators (KPIs)?',
                        'answer'   => 'The main dashboard displays real-time KPIs: overdue tasks, today\'s events, documents pending validation, currently present visitors, etc. For custom business KPIs, use the Reports module > Dashboard > Add KPI widget.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Y a-t-il une limite au nombre de rapports que je peux créer ?',
                        'answer'   => 'Le nombre de rapports personnalisés dépend de votre formule ; le détail figure sur la page tarifs. (Professional), illimité (Enterprise). Les tableaux de bord personnalisés : 1 (Starter), 10 (Professional), illimité (Enterprise).',
                    ],
                    'en' => [
                        'question' => 'Is there a limit to the number of reports I can create?',
                        'answer'   => 'The number of custom reports depends on your plan; see the pricing page for details. Custom dashboards: 1 (Starter), 10 (Professional), unlimited (Enterprise).',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment faire un rapport de conformité RGPD des données personnelles ?',
                        'answer'   => 'Dans Administration > Conformité > Rapport RGPD, générez le rapport de conformité qui liste tous les traitements de données personnelles, les bases légales, les durées de conservation et les mesures de sécurité appliquées. Ce rapport est exportable en PDF et peut être remis à votre DPO ou à une autorité de contrôle.',
                    ],
                    'en' => [
                        'question' => 'How do I generate a GDPR compliance report of personal data?',
                        'answer'   => 'In Administration > Compliance > GDPR report, generate the compliance report which lists all personal data processing, legal bases, retention periods and security measures applied. This report is exportable as PDF and can be submitted to your DPO or a supervisory authority.',
                    ],
                ],
            ],
            [
                'category'    => 'rapports',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment partager un rapport avec quelqu\'un qui n\'est pas dans SECRETIS ?',
                        'answer'   => 'Générez le rapport et exportez-le en PDF. Vous pouvez également utiliser la fonction « Partager par lien » disponible sur certains rapports : un lien temporaire sécurisé (valable 7 jours) est généré, consultable sans compte SECRETIS. Pour des rapports récurrents, configurez l\'envoi automatique par e-mail à des destinataires externes.',
                    ],
                    'en' => [
                        'question' => 'How do I share a report with someone not in SECRETIS?',
                        'answer'   => 'Generate the report and export it as PDF. You can also use the "Share by link" function available on some reports: a temporary secure link (valid 7 days) is generated, viewable without a SECRETIS account. For recurring reports, configure automatic email delivery to external recipients.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 9. SARA ASSISTANT IA (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'sara',
                'order'       => 1,
                'is_featured' => true,
                'translations' => [
                    'fr' => [
                        'question' => 'Qu\'est-ce que SARA et à quoi sert-elle ?',
                        'answer'   => 'SARA (Secrétaire Assistante de Réunion et d\'Administration) est l\'assistante IA intégrée à IBIG SECRETIS. Elle répond à vos questions sur l\'utilisation de la plateforme, vous aide à rédiger des e-mails et comptes-rendus, résume des documents, crée des tâches et des événements à votre place, et analyse vos données pour proposer des recommandations. SARA est disponible 24h/24 via le bouton de chat en bas à droite.',
                    ],
                    'en' => [
                        'question' => 'What is SARA and what is it for?',
                        'answer'   => 'SARA (Secretary Assistant for Meetings and Administration) is the AI assistant integrated into IBIG SECRETIS. She answers your questions about using the platform, helps you draft emails and minutes, summarises documents, creates tasks and events on your behalf, and analyses your data to offer recommendations. SARA is available 24/7 via the chat button at the bottom right.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SARA peut-elle créer des tâches et des événements automatiquement ?',
                        'answer'   => 'Oui. Dites simplement à SARA ce que vous voulez faire, par exemple : « Crée une réunion avec Marie et Paul vendredi à 14h pour discuter du budget ». SARA analyse votre demande, vérifie les disponibilités et crée l\'événement dans l\'agenda. Elle peut aussi créer des tâches, envoyer des rappels et rédiger des e-mails de convocation.',
                    ],
                    'en' => [
                        'question' => 'Can SARA create tasks and events automatically?',
                        'answer'   => 'Yes. Simply tell SARA what you want to do, for example: "Create a meeting with Marie and Paul on Friday at 2pm to discuss the budget". SARA analyses your request, checks availability and creates the event in the calendar. She can also create tasks, send reminders and draft convocation emails.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Mes conversations avec SARA sont-elles confidentielles ?',
                        'answer'   => 'Oui. Les conversations avec SARA sont chiffrées et stockées uniquement dans votre espace organisationnel. IBIG Soft n\'accède pas au contenu de vos échanges. Les données ne sont pas utilisées pour entraîner des modèles IA tiers. Vous pouvez effacer l\'historique de vos conversations SARA à tout moment depuis Paramètres > SARA > Effacer l\'historique.',
                    ],
                    'en' => [
                        'question' => 'Are my conversations with SARA confidential?',
                        'answer'   => 'Yes. Conversations with SARA are encrypted and stored only within your organisational space. IBIG Soft does not access the content of your exchanges. Data is not used to train third-party AI models. You can clear your SARA conversation history at any time from Settings > SARA > Clear history.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SARA parle-t-elle plusieurs langues ?',
                        'answer'   => 'SARA communique en français et en anglais. Elle détecte automatiquement la langue dans laquelle vous lui écrivez et répond dans cette même langue. Le support d\'autres langues africaines (wolof, bambara, swahili) est en cours de développement et sera disponible dans une prochaine version de SECRETIS.',
                    ],
                    'en' => [
                        'question' => 'Does SARA speak multiple languages?',
                        'answer'   => 'SARA communicates in French and English. She automatically detects the language you write in and responds in that same language. Support for other African languages (Wolof, Bambara, Swahili) is under development and will be available in a future version of SECRETIS.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SARA peut-elle résumer un long document PDF ?',
                        'answer'   => 'Oui. Uploadez votre document dans SARA ou partagez un document de la GED, et demandez-lui « Résume ce document ». SARA extrait les points clés, la structure et les informations importantes. Pour les documents de plus de 50 pages, le résumé se concentre sur les sections principales. Les documents en français et anglais sont supportés.',
                    ],
                    'en' => [
                        'question' => 'Can SARA summarise a long PDF document?',
                        'answer'   => 'Yes. Upload your document to SARA or share a DMS document, and ask her to "Summarise this document". SARA extracts the key points, structure and important information. For documents of more than 50 pages, the summary focuses on the main sections. Documents in French and English are supported.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment désactiver SARA pour mon organisation ?',
                        'answer'   => 'Les administrateurs peuvent désactiver SARA depuis Administration > Paramètres > Modules > SARA. Une fois désactivée, le bouton de chat SARA disparaît pour tous les utilisateurs de l\'organisation. Cette option est disponible si votre organisation a des politiques IA internes restrictives. La réactivation est immédiate et sans perte de données.',
                    ],
                    'en' => [
                        'question' => 'How do I disable SARA for my organisation?',
                        'answer'   => 'Administrators can disable SARA from Administration > Settings > Modules > SARA. Once disabled, the SARA chat button disappears for all users in the organisation. This option is available if your organisation has restrictive internal AI policies. Reactivation is immediate and without data loss.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SARA peut-elle rédiger un compte-rendu de réunion ?',
                        'answer'   => 'Oui. Après une réunion, demandez à SARA « Rédige le compte-rendu de la réunion de ce matin avec [participants] ». Fournissez les points discutés et les décisions prises, SARA les formate en un compte-rendu professionnel avec les sections : présents, ordre du jour, discussions, décisions, actions à suivre. Le document est directement sauvegardé dans la GED.',
                    ],
                    'en' => [
                        'question' => 'Can SARA draft meeting minutes?',
                        'answer'   => 'Yes. After a meeting, ask SARA "Draft the minutes of this morning\'s meeting with [participants]". Provide the points discussed and decisions taken, SARA formats them into professional minutes with sections: attendees, agenda, discussions, decisions, follow-up actions. The document is directly saved in the DMS.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Quelles sont les limites de SARA ?',
                        'answer'   => 'SARA n\'a pas accès à Internet en temps réel et ne peut pas effectuer d\'actions financières (paiements, virements). Elle ne peut pas modifier les paramètres administratifs critiques (suppression d\'utilisateurs, changements de plan). SARA ne mémorise pas les conversations entre sessions distinctes. Pour des questions complexes nécessitant expertise humaine, elle redirige vers le support.',
                    ],
                    'en' => [
                        'question' => 'What are SARA\'s limitations?',
                        'answer'   => 'SARA does not have real-time internet access and cannot perform financial actions (payments, transfers). She cannot modify critical administrative settings (user deletion, plan changes). SARA does not retain conversations between separate sessions. For complex questions requiring human expertise, she redirects to support.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SARA peut-elle analyser mes données et faire des recommandations ?',
                        'answer'   => 'Oui. Demandez à SARA des analyses comme « Quelles tâches sont en retard cette semaine ? », « Quel est le taux de complétion de mes projets ? » ou « Qui sont les visiteurs les plus fréquents ce mois-ci ? ». SARA accède aux données de votre organisation selon vos permissions et propose des insights actionnables.',
                    ],
                    'en' => [
                        'question' => 'Can SARA analyse my data and make recommendations?',
                        'answer'   => 'Yes. Ask SARA for analyses like "Which tasks are overdue this week?", "What is my project completion rate?" or "Who are the most frequent visitors this month?". SARA accesses your organisation\'s data according to your permissions and offers actionable insights.',
                    ],
                ],
            ],
            [
                'category'    => 'sara',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SARA est-elle disponible sur mobile ?',
                        'answer'   => 'Oui. SARA est disponible sur l\'application mobile SECRETIS (iOS et Android) via le bouton de chat flottant. L\'interface mobile de SARA est optimisée pour les échanges rapides. La fonctionnalité de dictée vocale permet de parler directement à SARA sans taper. Toutes les actions disponibles sur desktop sont accessibles sur mobile.',
                    ],
                    'en' => [
                        'question' => 'Is SARA available on mobile?',
                        'answer'   => 'Yes. SARA is available on the SECRETIS mobile app (iOS and Android) via the floating chat button. SARA\'s mobile interface is optimised for quick exchanges. The voice dictation feature allows you to speak directly to SARA without typing. All actions available on desktop are accessible on mobile.',
                    ],
                ],
            ],

            // ═══════════════════════════════════════════════════════════════
            // 10. SÉCURITÉ & CONFORMITÉ (10 FAQ)
            // ═══════════════════════════════════════════════════════════════
            [
                'category'    => 'securite',
                'order'       => 1,
                'is_featured' => true,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment SECRETIS protège-t-il mes données ?',
                        'answer'   => 'IBIG SECRETIS applique plusieurs couches de sécurité : chiffrement des données au repos (AES-256) et en transit (TLS 1.3), isolation des données par organisation (multi-tenant sécurisé), journalisation de toutes les actions (audit trail), authentification forte avec 2FA, et sauvegardes quotidiennes chiffrées. Nos serveurs sont hébergés dans des datacenters certifiés ISO 27001.',
                    ],
                    'en' => [
                        'question' => 'How does SECRETIS protect my data?',
                        'answer'   => 'IBIG SECRETIS applies multiple security layers: encryption of data at rest (AES-256) and in transit (TLS 1.3), data isolation per organisation (secure multi-tenant), logging of all actions (audit trail), strong authentication with 2FA, and daily encrypted backups. Our servers are hosted in ISO 27001 certified datacenters.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 2,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SECRETIS est-il conforme au RGPD ?',
                        'answer'   => 'Oui. SECRETIS est conforme au RGPD (Règlement Général sur la Protection des Données). Nous proposons un DPA (Data Processing Agreement) standard que vous pouvez signer depuis Administration > Conformité > RGPD. Les droits des personnes concernées (accès, rectification, effacement, portabilité) sont gérés depuis l\'interface. Un registre de traitement est disponible pour votre DPO.',
                    ],
                    'en' => [
                        'question' => 'Is SECRETIS GDPR compliant?',
                        'answer'   => 'Yes. SECRETIS is compliant with GDPR (General Data Protection Regulation). We offer a standard DPA (Data Processing Agreement) that you can sign from Administration > Compliance > GDPR. Data subject rights (access, rectification, erasure, portability) are managed from the interface. A processing register is available for your DPO.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 3,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment fonctionne le journal d\'audit ?',
                        'answer'   => 'Le journal d\'audit (Administration > Journal d\'audit) enregistre toutes les actions effectuées dans SECRETIS : connexions, créations/modifications/suppressions, téléchargements, partages, changements de paramètres. Chaque entrée contient : l\'utilisateur, l\'action, l\'objet concerné, l\'horodatage et l\'adresse IP. Le journal est immuable et non modifiable, même par les administrateurs.',
                    ],
                    'en' => [
                        'question' => 'How does the audit log work?',
                        'answer'   => 'The audit log (Administration > Audit log) records all actions performed in SECRETIS: logins, creates/updates/deletes, downloads, shares, settings changes. Each entry contains: the user, action, object concerned, timestamp and IP address. The log is immutable and cannot be modified, even by administrators.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 4,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment sont gérées les sauvegardes de mes données ?',
                        'answer'   => 'SECRETIS effectue des sauvegardes automatiques quotidiennes de toutes les données (base de données + fichiers GED). Les sauvegardes sont conservées selon la politique de sauvegarde publiée et stockées dans un datacenter géographiquement distinct. En cas de besoin de restauration, contactez le support avec votre demande et la date cible. Pour le plan Enterprise, des sauvegardes toutes les 6 heures sont disponibles.',
                    ],
                    'en' => [
                        'question' => 'How are my data backups managed?',
                        'answer'   => 'SECRETIS performs automatic daily backups of all data (database + DMS files). Backups are retained according to the published backup policy and stored in a geographically separate datacenter. If restoration is needed, contact support with your request and target date. For the Enterprise plan, backups every 6 hours are available.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 5,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Quelle est la politique en cas de violation de données ?',
                        'answer'   => 'En cas de violation de données, IBIG Soft s\'engage à vous notifier dans les 72 heures conformément au RGPD. Une analyse d\'impact est immédiatement lancée et des mesures correctives mises en place. Un rapport détaillé de l\'incident, des données potentiellement affectées et des actions entreprises vous est fourni. IBIG Soft dispose d\'une assurance responsabilité cyber.',
                    ],
                    'en' => [
                        'question' => 'What is the policy in case of a data breach?',
                        'answer'   => 'In case of a data breach, IBIG Soft commits to notifying you within 72 hours in accordance with GDPR. An impact assessment is immediately launched and corrective measures implemented. A detailed report of the incident, potentially affected data and actions taken is provided. IBIG Soft holds cyber liability insurance.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 6,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Puis-je configurer des restrictions d\'accès par adresse IP ?',
                        'answer'   => 'Oui, sur les plans Professional et Enterprise. Dans Administration > Sécurité > Restrictions IP, définissez les plages IP autorisées (CIDR). Les connexions depuis des IP hors liste blanche seront bloquées automatiquement. Vous pouvez définir des exceptions par utilisateur (utile pour les dirigeants en déplacement). Un journal des tentatives bloquées est disponible.',
                    ],
                    'en' => [
                        'question' => 'Can I configure access restrictions by IP address?',
                        'answer'   => 'Yes, on Professional and Enterprise plans. In Administration > Security > IP restrictions, define allowed IP ranges (CIDR). Connections from IPs outside the whitelist will be automatically blocked. You can define exceptions per user (useful for executives travelling). A log of blocked attempts is available.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 7,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'SECRETIS est-il conforme aux normes OHADA en matière comptable ?',
                        'answer'   => 'Oui. Le module financier de SECRETIS est développé selon le Plan Comptable OHADA (SYSCOHADA Révisé 2017). Les états financiers générés (bilan, compte de résultat, TAFIRE) respectent les formats imposés par l\'OHADA. Les journaux comptables sont paramétrés pour les pratiques des 17 pays membres. La piste d\'audit comptable est conforme aux exigences légales.',
                    ],
                    'en' => [
                        'question' => 'Is SECRETIS compliant with OHADA accounting standards?',
                        'answer'   => 'Yes. The financial module of SECRETIS is developed according to the OHADA Chart of Accounts (SYSCOHADA Revised 2017). Generated financial statements (balance sheet, income statement, TAFIRE) comply with OHADA-imposed formats. Accounting journals are configured for the practices of the 17 member countries. The accounting audit trail complies with legal requirements.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 8,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment configurer la politique de mot de passe de mon organisation ?',
                        'answer'   => 'Dans Administration > Sécurité > Politique de mot de passe, configurez : longueur minimale, complexité requise (majuscules, chiffres, symboles), durée de validité (expiration automatique), historique (interdire la réutilisation des N derniers mots de passe), et le nombre de tentatives avant verrouillage. Ces règles s\'appliquent à tous les utilisateurs de l\'organisation.',
                    ],
                    'en' => [
                        'question' => 'How do I configure my organisation\'s password policy?',
                        'answer'   => 'In Administration > Security > Password policy, configure: minimum length, required complexity (uppercase, numbers, symbols), validity period (automatic expiration), history (prevent reuse of last N passwords), and number of attempts before lockout. These rules apply to all users in the organisation.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 9,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Où sont hébergées mes données géographiquement ?',
                        'answer'   => 'Par défaut, les données des organisations africaines sont hébergées en Europe (France/Allemagne) dans des datacenters conformes RGPD. Pour les plans Enterprise, l\'hébergement dans un datacenter africain (Côte d\'Ivoire, Sénégal, Maroc, Afrique du Sud) est disponible sur demande. L\'emplacement de vos données est indiqué dans Administration > Paramètres > Localisation des données.',
                    ],
                    'en' => [
                        'question' => 'Where is my data geographically hosted?',
                        'answer'   => 'By default, data for African organisations is hosted in Europe (France/Germany) in GDPR-compliant datacenters. For Enterprise plans, hosting in an African datacenter (Côte d\'Ivoire, Senegal, Morocco, South Africa) is available on request. Your data location is indicated in Administration > Settings > Data location.',
                    ],
                ],
            ],
            [
                'category'    => 'securite',
                'order'       => 10,
                'is_featured' => false,
                'translations' => [
                    'fr' => [
                        'question' => 'Comment signaler une faille de sécurité ou une vulnérabilité ?',
                        'answer'   => 'Envoyez un e-mail à security@ibig-secretis.com avec les détails de la vulnérabilité découverte. Ne divulguez pas la faille publiquement avant que nous ayons eu la possibilité de la corriger (programme de responsible disclosure). Nous nous engageons à accuser réception dans les 24 heures, à corriger dans les 7 jours pour les failles critiques, et à vous reconnaître dans notre Hall of Fame sécurité.',
                    ],
                    'en' => [
                        'question' => 'How do I report a security flaw or vulnerability?',
                        'answer'   => 'Send an email to security@ibig-secretis.com with details of the vulnerability discovered. Do not disclose the flaw publicly before we have had the opportunity to fix it (responsible disclosure programme). We commit to acknowledging within 24 hours, fixing within 7 days for critical flaws, and recognising you in our security Hall of Fame.',
                    ],
                ],
            ],
        ];

        foreach ($faqs as $faq) {
            Faq::create($faq);
        }
    }
}
