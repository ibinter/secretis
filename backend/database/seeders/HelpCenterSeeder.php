<?php

namespace Database\Seeders;

use App\Models\HelpArticle;
use App\Models\HelpArticleTag;
use App\Models\HelpCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * HelpCenterSeeder — Peuplement du centre d'aide SECRETIS ERP
 * 8 categories, 35+ articles avec contenu realiste.
 */
class HelpCenterSeeder extends Seeder
{
    public function run(): void
    {
        $author = User::role('super-admin')->first() ?? User::first();
        if (! $author) { $this->command->warn('No user found.'); return; }
        foreach ($this->getCategories() as $catData) {
            $articles = $catData['articles']; unset($catData['articles']);
            $category = HelpCategory::updateOrCreate(['slug' => $catData['slug']], $catData);
            foreach ($articles as $ad) {
                $tags = $ad['tags'] ?? []; unset($ad['tags']);
                $ad['help_category_id'] = $category->id;
                $ad['author_id'] = $author->id;
                $ad['status'] = 'published';
                $ad['published_at'] = now()->subDays(rand(1, 60));
                $art = HelpArticle::updateOrCreate(['slug' => $ad['slug']], $ad);
                HelpArticleTag::where('article_id', $art->id)->delete();
                foreach ($tags as $tag) {
                    HelpArticleTag::create(['article_id' => $art->id, 'tag' => $tag]);
                }
            }
        }
        $this->command->info('Help center: 8 categories and 35+ articles seeded.');
    }

    private function makeCat(string $slug, string $icon, string $color, int $order, array $fr, array $en, array $articles): array
    {
        return ['slug'=>$slug,'icon'=>$icon,'color'=>$color,'order'=>$order,'is_active'=>true,
            'translations'=>['fr'=>$fr,'en'=>$en],'articles'=>$articles];
    }

    private function makeArt(string $slug, bool $feat, int $views, array $tags, array $fr, array $en): array
    {
        return ['slug'=>$slug,'is_featured'=>$feat,'view_count'=>$views,'tags'=>$tags,
            'translations'=>['fr'=>$fr,'en'=>$en]];
    }

    private function getCategories(): array
    {
        return [
            $this->makeCat('demarrage-rapide',"\xF0\x9F\x9A\x80",'#2E86C1',1,
                ['name'=>'Demarrage rapide','description'=>'Prenez en main SECRETIS ERP en quelques etapes simples.'],
                ['name'=>'Quick Start','description'=>'Get started with SECRETIS ERP in a few simple steps.'],
                [
                    $this->makeArt('premiere-connexion-secretis',true,1523,['connexion','demarrage'],
                        ['title'=>'Votre premiere connexion a SECRETIS ERP','excerpt'=>'Decouvrez comment vous connecter pour la premiere fois et configurer votre profil.',
                         'meta_title'=>'Premiere connexion SECRETIS ERP','meta_description'=>'Guide de premiere connexion.',
                         'content'=>'<h2>Bienvenue dans SECRETIS ERP</h2><p>Cliquez sur le lien d\'invitation recu par email. Choisissez un mot de passe securise d\'au moins 8 caracteres avec majuscule, chiffre et caractere special. Completez votre profil dans Parametres > Mon profil (photo, telephone, langue preferee). Explorez le menu lateral pour decouvrir les modules disponibles selon votre role.</p>'],
                        ['title'=>'Your first login to SECRETIS ERP','excerpt'=>'Learn how to log in and set up your user profile.',
                         'meta_title'=>'First login SECRETIS ERP','meta_description'=>'First login guide for SECRETIS ERP.',
                         'content'=>'<h2>Welcome to SECRETIS ERP</h2><p>Click the invitation link received by email. Choose a secure password with at least 8 characters including uppercase, number and special character. Complete your profile in Settings > My Profile (photo, phone, preferred language). Explore the side menu to discover modules available for your role.</p>']),
                    $this->makeArt('tableau-de-bord-vue-ensemble',true,987,['dashboard','navigation'],
                        ['title'=>'Comprendre le tableau de bord SECRETIS','excerpt'=>'Le tableau de bord centralise toutes vos informations essentielles.',
                         'meta_title'=>'Tableau de bord SECRETIS ERP','meta_description'=>'Guide du tableau de bord.',
                         'content'=>'<h2>Vue d\'ensemble</h2><p>Le tableau de bord affiche en temps reel l\'agenda du jour, les taches urgentes, le courrier entrant non traite et les indicateurs RH. Cliquez sur la roue dentee pour personnaliser les widgets par glisser-deposer. Choisissez entre le theme clair et sombre selon vos preferences.</p>'],
                        ['title'=>'Understanding the SECRETIS dashboard','excerpt'=>'The dashboard centralizes all your essential information.',
                         'meta_title'=>'SECRETIS ERP dashboard','meta_description'=>'Dashboard guide for SECRETIS ERP.',
                         'content'=>'<h2>Overview</h2><p>The dashboard shows your daily calendar, urgent tasks, incoming mail and HR indicators in real-time. Click the gear icon to customize widgets by drag-and-drop. Choose between light and dark theme.</p>']),
                    $this->makeArt('configurer-organisation-initial',false,645,['configuration','admin'],
                        ['title'=>'Configuration initiale de votre organisation','excerpt'=>'Parametrez votre organisation : logo, informations legales, devise et preferences regionales.',
                         'meta_title'=>'Configuration organisation SECRETIS','meta_description'=>'Guide configuration initiale.',
                         'content'=>'<h2>Parametres de l\'organisation</h2><p>Parametres > Organisation : nom, logo (PNG transparent max 1 Mo), adresse complete, RCCM/NINEA, devise (FCFA, EUR, USD), fuseau horaire africain, format de date. Personnalisez la numerotation automatique des documents dans Parametres > Numerotation.</p>'],
                        ['title'=>'Initial organization configuration','excerpt'=>'Configure: logo, legal information, currency and regional preferences.',
                         'meta_title'=>'Organization setup SECRETIS ERP','meta_description'=>'Initial configuration guide.',
                         'content'=>'<h2>Organization settings</h2><p>Settings > Organization: name, logo (transparent PNG max 1MB), full address, legal ID (RCCM/NINEA), currency (FCFA, EUR, USD), African timezone, date format. Customize document auto-numbering in Settings > Numbering.</p>']),
                    $this->makeArt('inviter-premiers-utilisateurs',false,534,['invitation','utilisateurs'],
                        ['title'=>'Inviter les premiers membres de votre equipe','excerpt'=>'Invitez vos collaborateurs et definissez leurs roles et permissions.',
                         'meta_title'=>'Inviter utilisateurs SECRETIS','meta_description'=>'Comment inviter votre equipe.',
                         'content'=>'<h2>Inviter un utilisateur</h2><p>Parametres > Utilisateurs > + Inviter un utilisateur. Saisissez l\'email, choisissez le role : Administrateur (acces complet), Gestionnaire (acces operationnel), Secretaire (modules quotidiens), Employe (acces limite), Consultant (lecture seule). Lien valable 48h. Modifiez ou suspendez un compte sans le supprimer definitivement.</p>'],
                        ['title'=>'Inviting your first team members','excerpt'=>'Invite colleagues and define their roles and permissions.',
                         'meta_title'=>'Invite users SECRETIS ERP','meta_description'=>'How to invite your team.',
                         'content'=>'<h2>Invite a user</h2><p>Settings > Users > + Invite a user. Enter email, choose role: Admin (full access), Manager (operational), Secretary (daily modules), Employee (limited), Consultant (read-only). Invitation link valid 48h. Modify or suspend accounts without permanent deletion.</p>']),
                ]),
            $this->makeCat('gestion-utilisateurs',"\xF0\x9F\x91\xA5",'#8E44AD',2,
                ['name'=>'Gestion des utilisateurs','description'=>'Roles, permissions, SSO et securite des comptes utilisateurs.'],
                ['name'=>'User Management','description'=>'Roles, permissions, SSO and user account security.'],
                [
                    $this->makeArt('comprendre-roles-permissions',true,891,['roles','permissions'],
                        ['title'=>'Comprendre les roles et permissions SECRETIS','excerpt'=>'Systeme de roles granulaires pour controler les acces.',
                         'meta_title'=>'Roles permissions SECRETIS','meta_description'=>'Guide roles et permissions.',
                         'content'=>'<h2>Systeme de roles</h2><ul><li><b>Super Admin IBIG</b> : acces technique global</li><li><b>Admin Organisation</b> : controle total</li><li><b>Gestionnaire</b> : acces operationnel complet</li><li><b>Secretaire</b> : modules quotidiens</li><li><b>Employe</b> : acces a ses propres donnees</li><li><b>Consultant</b> : lecture seule</li></ul><p>Principe du moindre privilege. Revisez les droits trimestriellement. Desactivez immediatement les comptes lors des departs.</p>'],
                        ['title'=>'Understanding roles and permissions in SECRETIS','excerpt'=>'Granular role system to precisely control user access.',
                         'meta_title'=>'SECRETIS roles permissions','meta_description'=>'Roles and permissions guide.',
                         'content'=>'<h2>Role system</h2><ul><li><b>IBIG Super Admin</b>: global technical access</li><li><b>Organization Admin</b>: full control</li><li><b>Manager</b>: full operational access</li><li><b>Secretary</b>: daily modules</li><li><b>Employee</b>: own data only</li><li><b>Consultant</b>: read-only</li></ul><p>Apply least privilege principle. Review quarterly. Deactivate accounts immediately on departure.</p>']),
                    $this->makeArt('double-authentification-2fa',false,432,['2FA','securite'],
                        ['title'=>'Activer la double authentification (2FA)','excerpt'=>'Protegez votre compte avec la double authentification.',
                         'meta_title'=>'2FA SECRETIS ERP','meta_description'=>'Activer 2FA dans SECRETIS ERP.',
                         'content'=>'<h2>Double authentification</h2><p>Mon profil > Securite > Activer la double authentification. Scannez le QR code avec Google Authenticator, Microsoft Authenticator ou Authy. Saisissez le code 6 chiffres pour confirmer. Conservez les 10 codes de recuperation a usage unique dans un endroit sur - ils permettent d\'acceder au compte si vous perdez votre telephone.</p>'],
                        ['title'=>'Enable Two-Factor Authentication (2FA)','excerpt'=>'Protect your account with two-factor authentication.',
                         'meta_title'=>'SECRETIS ERP 2FA','meta_description'=>'Enable 2FA in SECRETIS ERP.',
                         'content'=>'<h2>Two-factor authentication</h2><p>My Profile > Security > Enable two-factor authentication. Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy. Enter the 6-digit code to confirm. Save the 10 one-time recovery codes in a safe place - they allow account access if you lose your phone.</p>']),
                    $this->makeArt('sso-connexion-microsoft-google',false,267,['SSO','Microsoft','Google'],
                        ['title'=>'Connexion SSO via Microsoft 365 ou Google','excerpt'=>'Connectez-vous avec vos identifiants d\'entreprise existants.',
                         'meta_title'=>'SSO SECRETIS ERP','meta_description'=>'Configurer SSO Microsoft Google.',
                         'content'=>'<h2>Single Sign-On</h2><p>Le SSO permet de se connecter a SECRETIS avec les identifiants d\'entreprise existants. L\'admin configure dans Parametres > Integrations > SSO. Microsoft 365 : creez une application Azure AD, copiez l\'ID client et le secret. Avec SCIM, les comptes sont crees et desactives automatiquement selon l\'annuaire d\'entreprise.</p>'],
                        ['title'=>'SSO login with Microsoft 365 or Google','excerpt'=>'Log in with your existing corporate credentials.',
                         'meta_title'=>'SECRETIS ERP SSO','meta_description'=>'Configure SSO Microsoft Google.',
                         'content'=>'<h2>Single Sign-On</h2><p>SSO allows logging into SECRETIS with existing corporate credentials. Admin configures in Settings > Integrations > SSO. Microsoft 365: create an Azure AD app, copy client ID and secret. With SCIM, accounts are auto-created and disabled per your corporate directory.</p>']),
                    $this->makeArt('gerer-equipes-departements',false,389,['equipes','departements'],
                        ['title'=>'Organiser vos equipes et departements','excerpt'=>'Structurez votre organisation en creant des departements.',
                         'meta_title'=>'Equipes departements SECRETIS','meta_description'=>'Organiser equipes departements.',
                         'content'=>'<h2>Departements</h2><p>RH > Organigramme > Nouveau departement : nommez-le (Direction, Comptabilite, RH, Informatique), choisissez le responsable et affectez les employes. La structure permet de filtrer les taches, courriers et conges par departement et de generer des rapports consolides. Un utilisateur peut appartenir a plusieurs equipes.</p>'],
                        ['title'=>'Organizing teams and departments','excerpt'=>'Structure your organization by creating departments.',
                         'meta_title'=>'Teams departments SECRETIS','meta_description'=>'Organize teams and departments.',
                         'content'=>'<h2>Departments</h2><p>HR > Org Chart > New Department: name it (Management, Accounting, HR, IT), choose manager and assign employees. This allows filtering tasks, mail and leave by department and generating consolidated reports. A user can belong to multiple teams.</p>']),
                ]),
            $this->makeCat('agenda-taches',"\xF0\x9F\x93\x85",'#1E8449',3,
                ['name'=>'Agenda & Taches','description'=>'Gerez votre calendrier, planifiez des reunions et suivez vos taches.'],
                ['name'=>'Calendar & Tasks','description'=>'Manage your calendar, schedule meetings and track your tasks.'],
                [
                    $this->makeArt('creer-evenement-agenda',true,1204,['agenda','calendrier','reunion'],
                        ['title'=>'Creer et gerer des evenements dans l\'agenda','excerpt'=>'Ajoutez rendez-vous, reunions et evenements recurrents dans votre agenda partage.',
                         'meta_title'=>'Creer evenements agenda SECRETIS','meta_description'=>'Guide creation evenements agenda.',
                         'content'=>'<h2>Creer un evenement</h2><p>Cliquez sur une plage horaire ou + Nouvel evenement. Renseignez titre, date, heure, participants et salle si necessaire. Cochez Recurrent pour planifier automatiquement (quotidien, hebdomadaire, mensuel). Les participants recoivent une notification in-app et email pour accepter, refuser ou proposer un autre creneau. Vues disponibles : jour, semaine, mois, liste et disponibilites equipe.</p>'],
                        ['title'=>'Creating and managing calendar events','excerpt'=>'Add appointments, meetings and recurring events to your shared calendar.',
                         'meta_title'=>'Create calendar events SECRETIS','meta_description'=>'Calendar events guide.',
                         'content'=>'<h2>Create an event</h2><p>Click a time slot or + New Event. Fill in title, date, time, participants and room if needed. Check Recurring for auto-scheduling (daily, weekly, monthly). Participants receive in-app and email notifications to accept, decline or propose another time. Views: day, week, month, list and team availability.</p>']),
                    $this->makeArt('gestion-taches-kanban',false,876,['taches','kanban','projet'],
                        ['title'=>'Gerer vos taches avec le tableau Kanban','excerpt'=>'Visualisez et organisez vos taches avec le Kanban SECRETIS.',
                         'meta_title'=>'Kanban SECRETIS ERP','meta_description'=>'Guide Kanban SECRETIS ERP.',
                         'content'=>'<h2>Kanban SECRETIS</h2><p>4 colonnes : A faire, En cours, En revision, Termine. Cliquez + pour creer une tache : titre, assignataires, priorite (faible/normale/haute/critique), date d\'echeance. Les sous-taches decomposent les grandes taches avec suivi de progression en pourcentage. Filtrez par assignataire, priorite, date ou projet.</p>'],
                        ['title'=>'Managing tasks with the Kanban board','excerpt'=>'Visualize and organize your tasks with SECRETIS Kanban.',
                         'meta_title'=>'SECRETIS ERP Kanban','meta_description'=>'Kanban board guide.',
                         'content'=>'<h2>SECRETIS Kanban</h2><p>4 columns: To do, In progress, In review, Done. Click + to create a task: title, assignees, priority (low/normal/high/critical), due date. Subtasks break down large tasks with percentage completion tracking. Filter by assignee, priority, date or project.</p>']),
                    $this->makeArt('synchroniser-google-outlook',false,523,['synchronisation','Google','Outlook'],
                        ['title'=>'Synchroniser avec Google Agenda et Outlook','excerpt'=>'Synchronisation bidirectionnelle avec Google et Outlook.',
                         'meta_title'=>'Sync Google Outlook SECRETIS','meta_description'=>'Synchronisation calendrier SECRETIS.',
                         'content'=>'<h2>Synchronisation</h2><p>Google Agenda : Parametres > Integrations > Google Agenda > Autoriser, choisissez le calendrier. Microsoft Outlook : Parametres > Integrations > Microsoft 365. Les evenements SECRETIS apparaissent dans l\'agenda externe et vice versa. En cas de conflit, SECRETIS notifie pour choisir quelle version conserver.</p>'],
                        ['title'=>'Syncing with Google Calendar and Outlook','excerpt'=>'Bidirectional synchronization with Google Calendar and Outlook.',
                         'meta_title'=>'Sync Google Outlook SECRETIS','meta_description'=>'Calendar sync guide.',
                         'content'=>'<h2>Synchronization</h2><p>Google Calendar: Settings > Integrations > Google Calendar > Authorize, select calendar. Outlook: Settings > Integrations > Microsoft 365. SECRETIS events appear in external calendar and vice versa. Conflicts trigger a notification to choose which version to keep.</p>']),
                    $this->makeArt('planifier-reunion-salle',false,411,['reunion','salle','reservation'],
                        ['title'=>'Planifier une reunion et reserver une salle','excerpt'=>'Organisez vos reunions et reservez une salle disponible.',
                         'meta_title'=>'Reunions salles SECRETIS','meta_description'=>'Planifier reunions reserver salles.',
                         'content'=>'<h2>Planifier une reunion</h2><p>Agenda > Nouvelle reunion > ajoutez participants (internes et externes). Le planificateur intelligent trouve le creneau libre pour tous. Selectionnez une salle par capacite et equipements (projecteur, visioconference, tableau blanc). SECRETIS genere automatiquement un modele de compte rendu pre-rempli apres la reunion.</p>'],
                        ['title'=>'Scheduling a meeting and booking a room','excerpt'=>'Organize meetings and automatically book an available room.',
                         'meta_title'=>'Meetings rooms SECRETIS','meta_description'=>'Schedule meetings and book rooms.',
                         'content'=>'<h2>Schedule a meeting</h2><p>Calendar > New Meeting > add internal and external participants. Smart scheduler finds a free slot for everyone. Select a room by capacity and equipment (projector, video conferencing, whiteboard). SECRETIS auto-generates a pre-filled minutes template after the meeting.</p>']),
                ]),
            $this->makeCat('documents-ged',"\xF0\x9F\x93\x84",'#F39C12',4,
                ['name'=>'Documents & GED','description'=>'Gestion electronique des documents, workflows de validation et archivage.'],
                ['name'=>'Documents & DMS','description'=>'Electronic document management, approval workflows and archiving.'],
                [
                    $this->makeArt('deposer-document-ged',true,743,['GED','document','archivage'],
                        ['title'=>'Deposer et organiser vos documents dans la GED','excerpt'=>'La GED SECRETIS centralise vos documents dans une arborescence securisee.',
                         'meta_title'=>'GED SECRETIS ERP','meta_description'=>'Guide GED SECRETIS ERP.',
                         'content'=>'<h2>La GED SECRETIS</h2><p>Cliquez + Nouveau document ou glissez-deposez. Selectionnez dossier, type (Contrat, Facture, Rapport, Courrier) et ajoutez mots-cles. SECRETIS indexe automatiquement les PDF et documents Office pour une recherche instantanee. Formats : PDF, DOCX, XLSX, PPTX, PNG, JPG, TIFF. Arborescence : Actes administratifs, Contrats, Rapports, Factures, RH.</p>'],
                        ['title'=>'Uploading and organizing documents in the DMS','excerpt'=>'SECRETIS DMS centralizes your documents in a secure tree structure.',
                         'meta_title'=>'SECRETIS DMS','meta_description'=>'DMS guide for SECRETIS ERP.',
                         'content'=>'<h2>SECRETIS DMS</h2><p>Click + New Document or drag-and-drop. Select folder, type (Contract, Invoice, Report, Letter) and add keywords. SECRETIS auto-indexes PDFs and Office documents for instant search. Formats: PDF, DOCX, XLSX, PPTX, PNG, JPG, TIFF. Default structure: Administrative acts, Contracts, Reports, Invoices, HR.</p>']),
                    $this->makeArt('workflow-validation-document',false,412,['workflow','validation','approbation'],
                        ['title'=>'Configurer un circuit de validation de documents','excerpt'=>'Automatisez l\'approbation avec des workflows configurables.',
                         'meta_title'=>'Workflow validation SECRETIS','meta_description'=>'Circuit validation documents.',
                         'content'=>'<h2>Workflows de validation</h2><p>GED > Workflows > Nouveau workflow : nommez-le, ajoutez les etapes dans l\'ordre, designez l\'approbateur (personne ou role) et les delais de relance. Depuis la fiche d\'un document : Soumettre a validation > choisissez le workflow. L\'approbateur recoit une notification et peut approuver, refuser ou commenter. Suivi en temps reel dans le tableau de bord.</p>'],
                        ['title'=>'Setting up a document approval workflow','excerpt'=>'Automate approval with configurable multi-level workflows.',
                         'meta_title'=>'Document approval workflow SECRETIS','meta_description'=>'Approval workflow guide.',
                         'content'=>'<h2>Approval workflows</h2><p>DMS > Workflows > New workflow: name it, add steps in order, designate approver (person or role) and reminder delays. From a document: Submit for Approval > choose workflow. Approver gets notified and can approve, reject or comment. Real-time tracking in the dashboard.</p>']),
                    $this->makeArt('signature-electronique-documents',false,329,['signature','electronique','contrat'],
                        ['title'=>'Signer electroniquement un document','excerpt'=>'Obtenez des signatures electroniques legales directement dans SECRETIS.',
                         'meta_title'=>'Signature electronique SECRETIS','meta_description'=>'Signature electronique documents.',
                         'content'=>'<h2>Signature electronique</h2><p>GED > ouvrir document > Demander une signature > ajoutez signataires (internes ou externes par email) > positionnez zones > envoyez. Chaque signataire recoit un lien securise sans creation de compte. SECRETIS genere un certificat d\'horodatage et un journal d\'audit complet (qui, quand, quelle IP, methode d\'authentification).</p>'],
                        ['title'=>'Electronically signing a document','excerpt'=>'Get legal electronic signatures directly in SECRETIS ERP.',
                         'meta_title'=>'Electronic signature SECRETIS','meta_description'=>'E-signature guide.',
                         'content'=>'<h2>Electronic signature</h2><p>DMS > open document > Request Signature > add signers (internal or external by email) > position zones > send. Each signer receives a secure link usable without an account. SECRETIS generates a timestamp certificate and complete audit trail (who, when, which IP, authentication method).</p>']),
                ]),
            $this->makeCat('paiements-abonnements',"\xF0\x9F\x92\xB3",'#C0392B',5,
                ['name'=>'Paiements & Abonnements','description'=>'Plans tarifaires, facturation et moyens de paiement africains.'],
                ['name'=>'Payments & Subscriptions','description'=>'Pricing plans, billing and African payment methods.'],
                [
                    $this->makeArt('plans-tarifs-secretis',true,1087,['abonnement','plan','tarif'],
                        ['title'=>'Comprendre les plans tarifaires SECRETIS ERP','excerpt'=>'Plans Starter, Pro et Enterprise pour toutes les structures.',
                         'meta_title'=>'Plans SECRETIS ERP','meta_description'=>'Comparatif plans tarifaires.',
                         'content'=>$this->contenuFormules('fr')],
                        ['title'=>'Understanding SECRETIS ERP pricing plans','excerpt'=>'Starter, Pro and Enterprise plans for all organizations.',
                         'meta_title'=>'SECRETIS ERP pricing plans','meta_description'=>'Pricing plans comparison.',
                         'content'=>$this->contenuFormules('en')]),
                    $this->makeArt('payer-mobile-money-afrique',true,934,['Mobile Money','Orange','MTN','Wave'],
                        ['title'=>'Payer avec Mobile Money (Orange, MTN, Wave)','excerpt'=>'Principaux moyens de paiement mobile africains acceptes par SECRETIS ERP.',
                         'meta_title'=>'Mobile Money SECRETIS ERP','meta_description'=>'Payer avec Mobile Money africain.',
                         'content'=>'<h2>Moyens de paiement</h2><ul><li>Orange Money (CI, SN, BF, ML, CM)</li><li>MTN Mobile Money (CI, GH, CM, NG)</li><li>Wave (SN, CI, BF, ML)</li><li>CinetPay (multi-pays)</li><li>Flutterwave (Afrique anglophone)</li><li>Carte Visa/Mastercard</li></ul><p>Comment payer : Mon abonnement > Renouveler > choisissez l\'operateur > saisissez le numero > confirmez sur telephone. Facture PDF generee et envoyee automatiquement. Paiement refuse : verifiez solde et numero aupres de l\'operateur.</p>'],
                        ['title'=>'Paying with Mobile Money (Orange, MTN, Wave)','excerpt'=>'Main African mobile payment methods accepted by SECRETIS ERP.',
                         'meta_title'=>'SECRETIS ERP Mobile Money','meta_description'=>'Pay with African Mobile Money.',
                         'content'=>'<h2>Payment methods</h2><ul><li>Orange Money (CI, SN, BF, ML, CM)</li><li>MTN Mobile Money (CI, GH, CM, NG)</li><li>Wave (SN, CI, BF, ML)</li><li>CinetPay (multi-country)</li><li>Flutterwave</li><li>Visa/Mastercard</li></ul><p>How to pay: My Subscription > Renew > choose operator > enter number > confirm on phone. PDF invoice auto-generated and emailed. Payment declined: check balance and number registered with operator.</p>']),
                    $this->makeArt('telecharger-factures-abonnement',false,445,['facture','recu','comptabilite'],
                        ['title'=>'Telecharger vos factures d\'abonnement','excerpt'=>'Retrouvez et telechargez toutes vos factures depuis votre espace client.',
                         'meta_title'=>'Factures SECRETIS ERP','meta_description'=>'Telecharger factures abonnement.',
                         'content'=>'<h2>Acces aux factures</h2><p>Mon abonnement > Historique de paiement. Chaque facture inclut : numero sequentiel, informations organisation (nom, adresse, RCCM), detail services et periode, montant HT et TTC, mode paiement, signature electronique IBIG Soft. Cliquez l\'icone PDF pour telecharger. Activez la reception automatique dans vos preferences.</p>'],
                        ['title'=>'Downloading your subscription invoices','excerpt'=>'Find and download all your invoices from your client area.',
                         'meta_title'=>'SECRETIS ERP invoices','meta_description'=>'Download subscription invoices.',
                         'content'=>'<h2>Accessing invoices</h2><p>My Subscription > Payment History. Each invoice includes: sequential number, organization info (name, address, registration), service details and period, amounts ex-VAT and inc-VAT, payment method, IBIG Soft e-signature. Click the PDF icon to download. Enable auto-receive in preferences.</p>']),
                ]),
            $this->makeCat('securite-acces',"\xF0\x9F\x94\x92",'#566573',6,
                ['name'=>'Securite & Acces','description'=>'Authentification, chiffrement, journaux d\'acces et conformite RGPD.'],
                ['name'=>'Security & Access','description'=>'Authentication, encryption, access logs and GDPR compliance.'],
                [
                    $this->makeArt('securite-donnees-chiffrement',false,387,['securite','chiffrement','RGPD'],
                        ['title'=>'Comment SECRETIS protege vos donnees','excerpt'=>'Chiffrement, sauvegardes et conformite RGPD expliques.',
                         'meta_title'=>'Securite donnees SECRETIS','meta_description'=>'Protection donnees SECRETIS ERP.',
                         'content'=>'<h2>Architecture securisee</h2><p>Transit : TLS 1.3. Repos : AES-256 pour donnees sensibles et fichiers. Sauvegardes incrementales chaque heure, completes chaque jour, retention 30 jours, replication sur 2 datacenters geographiques. Conforme RGPD et lois de protection des donnees en Afrique de l\'Ouest. Journal d\'audit complet pour chaque action importante.</p>'],
                        ['title'=>'How SECRETIS protects your data','excerpt'=>'Encryption, backups and GDPR compliance explained.',
                         'meta_title'=>'SECRETIS data security','meta_description'=>'Data protection in SECRETIS ERP.',
                         'content'=>'<h2>Secure architecture</h2><p>Transit: TLS 1.3. At rest: AES-256 for sensitive data and files. Hourly incremental backups, daily full backups, 30-day retention, geographic replication across 2 datacenters. GDPR compliant and West African data protection laws. Complete audit trail for every important action.</p>']),
                    $this->makeArt('journal-audit-actions',false,234,['audit','journal','tracabilite'],
                        ['title'=>'Consulter le journal d\'audit et les actions utilisateurs','excerpt'=>'Tracez toutes les actions effectuees dans SECRETIS ERP.',
                         'meta_title'=>'Journal audit SECRETIS','meta_description'=>'Journal audit actions utilisateurs.',
                         'content'=>'<h2>Journal d\'audit</h2><p>Parametres > Securite > Journal d\'audit (admins uniquement). Enregistre : qui (utilisateur, IP, navigateur), quelle action (creation, modification, suppression, export), sur quel element, quand (horodatage precis), donnees avant/apres modification. Filtrez par utilisateur, type, module ou periode. Exportez en CSV ou PDF pour audits internes ou externes.</p>'],
                        ['title'=>'Consulting the audit log','excerpt'=>'Trace all actions performed in SECRETIS ERP.',
                         'meta_title'=>'SECRETIS audit log','meta_description'=>'Audit log guide.',
                         'content'=>'<h2>Audit log</h2><p>Settings > Security > Audit Log (admins only). Records: who (user, IP, browser), what action (create, update, delete, export), which element, when (precise timestamp), data before/after modification. Filter by user, type, module or period. Export as CSV or PDF for internal or external audits.</p>']),
                    $this->makeArt('reinitialiser-mot-de-passe',false,567,['mot de passe','reinitialisation'],
                        ['title'=>'Reinitialiser un mot de passe oublie','excerpt'=>'Recuperez l\'acces a votre compte SECRETIS en cas de mot de passe oublie.',
                         'meta_title'=>'Reinitialiser mot de passe SECRETIS','meta_description'=>'Guide reinitialisation mot de passe.',
                         'content'=>'<h2>Reinitialisation</h2><p>Page connexion > Mot de passe oublie ? > saisissez email > Envoyer. Ouvrez l\'email (verifiez spams), cliquez le lien valable 60 minutes, choisissez un nouveau mot de passe. Email non recu : verifiez l\'adresse, attendez 5 min, ou contactez votre administrateur pour reinitialisation manuelle.</p>'],
                        ['title'=>'Resetting a forgotten password','excerpt'=>'Recover access to your SECRETIS account if you forgot your password.',
                         'meta_title'=>'Reset SECRETIS password','meta_description'=>'Password reset guide.',
                         'content'=>'<h2>Reset</h2><p>Login page > Forgot password? > enter email > Send. Open the email (check spam), click the link valid 60 minutes, choose a new password. Email not received: verify the address, wait 5 min, or contact your admin for manual reset.</p>']),
                    $this->makeArt('gerer-appareils-connectes',false,178,['appareils','sessions'],
                        ['title'=>'Gerer vos appareils et sessions actives','excerpt'=>'Consultez et revoquez les sessions actives depuis votre profil.',
                         'meta_title'=>'Appareils connectes SECRETIS','meta_description'=>'Gerer sessions et appareils.',
                         'content'=>'<h2>Sessions actives</h2><p>Mon profil > Securite > Appareils connectes. Chaque entree : type appareil, navigateur, IP, localisation, derniere activite. Session suspecte : cliquez Deconnecter immediatement et changez le mot de passe. Bouton Deconnecter tous les appareils invalide toutes les sessions simultanement, y compris la session actuelle.</p>'],
                        ['title'=>'Managing connected devices and active sessions','excerpt'=>'View and revoke active sessions from your profile.',
                         'meta_title'=>'Connected devices SECRETIS','meta_description'=>'Manage sessions and devices.',
                         'content'=>'<h2>Active sessions</h2><p>My Profile > Security > Connected Devices. Each entry: device type, browser, IP, location, last activity. Suspicious session: click Disconnect immediately and change password. Disconnect All Devices button invalidates all sessions simultaneously, including current one.</p>']),
                ]),
            $this->makeCat('integrations-api',"\xE2\x9A\x99\xEF\xB8\x8F",'#4A235A',7,
                ['name'=>'Integrations & API','description'=>'Connectez SECRETIS a vos outils via l\'API REST ou les webhooks.'],
                ['name'=>'Integrations & API','description'=>'Connect SECRETIS to your tools via REST API or webhooks.'],
                [
                    $this->makeArt('api-rest-introduction',false,312,['API','REST','developpeur'],
                        ['title'=>'Introduction a l\'API REST SECRETIS ERP','excerpt'=>'Integrez l\'ERP a vos systemes et automatisez via l\'API REST.',
                         'meta_title'=>'API REST SECRETIS ERP','meta_description'=>'Documentation API REST.',
                         'content'=>'<h2>API SECRETIS ERP</h2><p>Authentification Laravel Sanctum via tokens. Creez un token dans Parametres > API > Tokens d\'acces en definissant les permissions. Requetes avec Authorization: Bearer {token}. Documentation Swagger interactive sur /docs/api. Limite : 1000 requetes par heure par token (limite elevee sur plan Enterprise).</p>'],
                        ['title'=>'Introduction to SECRETIS ERP REST API','excerpt'=>'Integrate the ERP with your systems via the REST API.',
                         'meta_title'=>'SECRETIS ERP REST API','meta_description'=>'REST API documentation.',
                         'content'=>'<h2>SECRETIS ERP API</h2><p>Laravel Sanctum authentication via tokens. Create a token in Settings > API > Access Tokens with defined permissions. Requests use Authorization: Bearer {token}. Interactive Swagger docs at /docs/api. Rate limit: 1000 requests/hour per token (higher on Enterprise plan).</p>']),
                    $this->makeArt('configurer-webhooks',false,198,['webhook','automation'],
                        ['title'=>'Configurer des webhooks pour automatiser vos flux','excerpt'=>'Les webhooks envoient des notifications en temps reel vers vos systemes.',
                         'meta_title'=>'Webhooks SECRETIS ERP','meta_description'=>'Configurer webhooks SECRETIS.',
                         'content'=>'<h2>Webhooks SECRETIS</h2><p>Parametres > Integrations > Webhooks > + Nouveau webhook : saisissez URL HTTPS, selectionnez evenements : task.created/updated/completed, document.uploaded/approved, payment.received, invoice.created, user.invited/deactivated. Chaque requete inclut X-SECRETIS-Signature pour la verification d\'authenticite. Historique des livraisons avec relance automatique.</p>'],
                        ['title'=>'Configuring webhooks to automate workflows','excerpt'=>'Webhooks send real-time notifications to your systems when events occur.',
                         'meta_title'=>'SECRETIS ERP webhooks','meta_description'=>'Webhook configuration guide.',
                         'content'=>'<h2>SECRETIS Webhooks</h2><p>Settings > Integrations > Webhooks > + New webhook: enter HTTPS URL, select events: task.created/updated/completed, document.uploaded/approved, payment.received, invoice.created, user.invited/deactivated. Each request includes X-SECRETIS-Signature for authenticity verification. Delivery history with automatic retry.</p>']),
                    $this->makeArt('integration-microsoft-365',false,289,['Microsoft 365','Teams','OneDrive'],
                        ['title'=>'Connecter SECRETIS a Microsoft 365','excerpt'=>'Integrez Teams, OneDrive, Outlook et SharePoint avec SECRETIS ERP.',
                         'meta_title'=>'Microsoft 365 SECRETIS','meta_description'=>'Connecter Microsoft 365 SECRETIS.',
                         'content'=>'<h2>Microsoft 365</h2><p>Fonctionnalites : synchronisation Outlook bidirectionnelle, liens Teams automatiques dans les reunions, documents OneDrive/SharePoint dans la GED, SSO Azure AD avec provisionnement SCIM automatique. Configuration : Parametres > Integrations > Microsoft 365 > connectez votre compte admin > accordez les permissions pour chaque service.</p>'],
                        ['title'=>'Connecting SECRETIS to Microsoft 365','excerpt'=>'Integrate Teams, OneDrive, Outlook and SharePoint with SECRETIS ERP.',
                         'meta_title'=>'Microsoft 365 SECRETIS','meta_description'=>'Connect Microsoft 365 to SECRETIS.',
                         'content'=>'<h2>Microsoft 365</h2><p>Features: bidirectional Outlook sync, automatic Teams links in meetings, OneDrive/SharePoint documents in DMS, Azure AD SSO with automatic SCIM provisioning. Settings > Integrations > Microsoft 365 > connect admin account > grant permissions per service.</p>']),
                ]),
            $this->makeCat('faq-depannage',"\xE2\x9D\x93",'#D4AC0D',8,
                ['name'=>'FAQ & Depannage','description'=>'Reponses aux questions frequentes et solutions aux problemes courants.'],
                ['name'=>'FAQ & Troubleshooting','description'=>'Answers to FAQs and solutions to common problems.'],
                [
                    $this->makeArt('problemes-connexion-frequents',false,678,['connexion','probleme','erreur'],
                        ['title'=>'Problemes de connexion frequents et solutions','excerpt'=>'Resolvez les problemes de connexion les plus courants a SECRETIS ERP.',
                         'meta_title'=>'Problemes connexion SECRETIS','meta_description'=>'Solutions problemes connexion.',
                         'content'=>'<h2>Diagnostic</h2><p><b>Compte bloque</b> : 5 tentatives incorrectes = verrouillage 15 min. <b>Email non reconnu</b> : verifiez l\'email d\'invitation, l\'activation du compte, l\'URL de l\'organisation. <b>Page ne charge pas</b> : videz cache (Ctrl+Shift+Del), navigation privee, autre navigateur. <b>Session expiree</b> : 8h inactivite (30 jours avec Se souvenir de moi). <b>Email non recu</b> : verifiez spams, attendez 5 min, contactez votre DSI.</p>'],
                        ['title'=>'Frequent login issues and solutions','excerpt'=>'Resolve the most common SECRETIS ERP login issues.',
                         'meta_title'=>'SECRETIS login issues','meta_description'=>'Solutions to login problems.',
                         'content'=>'<h2>Diagnosis</h2><p><b>Account locked</b>: 5 incorrect attempts = 15-min lockout. <b>Email not recognized</b>: verify invitation email, account status, organization URL. <b>Page not loading</b>: clear cache (Ctrl+Shift+Del), private mode, different browser. <b>Session expired</b>: 8h inactivity (30 days with Remember me). <b>Reset email not received</b>: check spam, wait 5 min, contact IT.</p>']),
                    $this->makeArt('performance-lenteur-application',false,342,['performance','lenteur','navigateur'],
                        ['title'=>'L\'application est lente ou ne repond plus','excerpt'=>'Solutions pour les problemes de performance et de lenteur.',
                         'meta_title'=>'Performance SECRETIS ERP','meta_description'=>'Resoudre lenteur performance.',
                         'content'=>'<h2>Diagnostic rapide</h2><p>SECRETIS necessite minimum 5 Mbps. Solutions : rechargez (F5), videz cache (Ctrl+Shift+Del), fermez onglets inutiles, redemarrez navigateur. Navigateurs recommandes : Chrome, Firefox, Edge (v100+). Internet Explorer non supporte. Sur mobile, preferez WiFi a la data mobile. Probleme persistant : ouvrez un ticket avec navigateur, OS et description precise.</p>'],
                        ['title'=>'Application is slow or unresponsive','excerpt'=>'Solutions to resolve performance and slowness issues.',
                         'meta_title'=>'SECRETIS ERP performance','meta_description'=>'Resolve performance issues.',
                         'content'=>'<h2>Quick diagnosis</h2><p>SECRETIS requires minimum 5 Mbps. Solutions: reload (F5), clear cache (Ctrl+Shift+Del), close unnecessary tabs, restart browser. Recommended: Chrome, Firefox, Edge (v100+). IE not supported. On mobile, prefer WiFi over mobile data. Persistent issue: open a ticket with browser, OS and precise description.</p>']),
                    $this->makeArt('import-export-donnees',false,289,['import','export','CSV','migration'],
                        ['title'=>'Importer et exporter vos donnees','excerpt'=>'Migrez vos donnees vers SECRETIS et exportez-les a tout moment.',
                         'meta_title'=>'Import export SECRETIS ERP','meta_description'=>'Import et export donnees.',
                         'content'=>'<h2>Import</h2><p>CSV/Excel supporte pour : employes, contacts/clients, inventaire materiel. Procedure : Module > Import > Telecharger le modele > remplissez > uploadez > verifiez apercu > confirmez. Export : bouton Exporter dans tout tableau (Excel ou CSV). Export RGPD complet : Parametres > RGPD > Exporter mes donnees (livraison sous 24h).</p>'],
                        ['title'=>'Importing and exporting your data','excerpt'=>'Migrate data to SECRETIS and export it at any time.',
                         'meta_title'=>'SECRETIS ERP import export','meta_description'=>'Import and export guide.',
                         'content'=>'<h2>Import</h2><p>CSV/Excel supported for: employees, clients, equipment. Process: Module > Import > Download template > fill > upload > verify preview > confirm. Export: click Export in any table (Excel or CSV). Full GDPR export: Settings > GDPR > Export my data (delivery within 24h).</p>']),
                    $this->makeArt('notifications-emails-non-recus',false,421,['notifications','email','alerte'],
                        ['title'=>'Je ne recois pas les notifications et emails SECRETIS','excerpt'=>'Resolvez les problemes de notifications manquantes dans SECRETIS ERP.',
                         'meta_title'=>'Notifications SECRETIS ERP','meta_description'=>'Notifications emails manquants.',
                         'content'=>'<h2>Emails non recus</h2><p>1. Verifiez le dossier spam et ajoutez noreply@secretis.app a vos contacts. 2. Mon profil > Notifications : verifiez que chaque type est active (email, push, in-app). 3. Demandez a votre DSI d\'ajouter secretis.app a la liste blanche du filtre anti-spam. Si le probleme persiste, ouvrez un ticket support avec votre email et les types de notifications manquantes.</p>'],
                        ['title'=>'Not receiving SECRETIS notifications and emails','excerpt'=>'Resolve missing notifications issues in SECRETIS ERP.',
                         'meta_title'=>'SECRETIS ERP notifications','meta_description'=>'Missing notifications guide.',
                         'content'=>'<h2>Emails not received</h2><p>1. Check spam folder and add noreply@secretis.app to your contacts. 2. My Profile > Notifications: verify each type is enabled (email, push, in-app). 3. Ask IT to whitelist the secretis.app domain in enterprise spam filter. If issue persists, open a support ticket with your email and the missing notification types.</p>']),
                ]),
        ];
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
