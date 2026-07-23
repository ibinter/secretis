<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * SECRETIS ERP — HelpCenterSeeder
 *
 * Peuple :
 *   - 100 FAQ depuis docs/faq-fr.json
 *   - Catégories d'articles de base de connaissances
 *   - 4 templates de tickets support
 */
class HelpCenterSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedFaqs();
        $this->seedArticleCategories();
        $this->seedTicketTemplates();

        $this->command->info('✓ HelpCenterSeeder terminé avec succès.');
    }

    // ─── 1. Peuplement des 100 FAQ ────────────────────────────────────────────
    protected function seedFaqs(): void
    {
        // Chercher le fichier JSON des FAQ
        $jsonPath = base_path('docs/faq-fr.json');

        if (! File::exists($jsonPath)) {
            $this->command->warn("Fichier FAQ introuvable : {$jsonPath} — FAQ ignorées.");
            return;
        }

        $data = json_decode(File::get($jsonPath), true);
        $faqs = $data['faqs'] ?? [];

        if (empty($faqs)) {
            $this->command->warn('Aucune FAQ trouvée dans le fichier JSON.');
            return;
        }

        // Vider la table avant re-seed (safe en dev)
        DB::table('help_faqs')->truncate();

        $order = [];

        foreach ($faqs as $faq) {
            $cat = $faq['category'] ?? 'general';

            if (! isset($order[$cat])) {
                $order[$cat] = 0;
            }

            DB::table('help_faqs')->insert([
                'category' => $cat,
                'question' => json_encode([
                    'fr' => $faq['question'] ?? '',
                    'en' => '',        // à compléter lors de la traduction EN
                ], JSON_UNESCAPED_UNICODE),
                'answer' => json_encode([
                    'fr' => $faq['answer'] ?? '',
                    'en' => '',
                ], JSON_UNESCAPED_UNICODE),
                'keywords'   => isset($faq['keywords'])
                    ? json_encode($faq['keywords'], JSON_UNESCAPED_UNICODE)
                    : null,
                'module'     => $faq['module'] ?? null,
                'roles'      => isset($faq['roles'])
                    ? json_encode($faq['roles'], JSON_UNESCAPED_UNICODE)
                    : json_encode(['all']),
                'order'      => ++$order[$cat],
                'is_active'  => true,
                'views'      => 0,
                'helpful_yes' => 0,
                'helpful_no'  => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->command->info("  → {$count} FAQ insérées.", $count = count($faqs));
    }

    // ─── 2. Articles de base de connaissances (catégories + articles exemples) ─
    protected function seedArticleCategories(): void
    {
        // Si la table est déjà peuplée, ne pas re-seeder
        if (DB::table('help_articles')->count() > 0) {
            $this->command->info('  → Articles déjà présents — skip.');
            return;
        }

        $articles = [
            // ── Démarrage ──────────────────────────────────────────────────────
            [
                'slug'         => 'premiere-connexion',
                'category'     => 'getting_started',
                'title'        => ['fr' => 'Première connexion et sécurisation du compte', 'en' => 'First login and account security'],
                'content'      => ['fr' => '<h2>Première connexion</h2><p>Ouvrez l\'email d\'invitation reçu et cliquez sur "Accepter l\'invitation"...</p>', 'en' => ''],
                'tags'         => ['connexion', 'mot de passe', 'mfa', 'sécurité'],
                'module'       => null,
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            [
                'slug'         => 'configuration-organisation',
                'category'     => 'getting_started',
                'title'        => ['fr' => 'Configuration initiale de votre organisation', 'en' => 'Initial organization setup'],
                'content'      => ['fr' => '<h2>Configuration de l\'organisation</h2><p>Accédez à Paramètres → Organisation...</p>', 'en' => ''],
                'tags'         => ['organisation', 'configuration', 'logo', 'devise'],
                'module'       => null,
                'roles'        => ['admin', 'super_admin'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            [
                'slug'         => 'inviter-utilisateurs',
                'category'     => 'getting_started',
                'title'        => ['fr' => 'Inviter des utilisateurs et attribuer des rôles', 'en' => 'Invite users and assign roles'],
                'content'      => ['fr' => '<h2>Inviter des utilisateurs</h2><p>Accédez à Paramètres → Utilisateurs → Inviter...</p>', 'en' => ''],
                'tags'         => ['utilisateurs', 'rôles', 'invitation', 'permissions'],
                'module'       => null,
                'roles'        => ['admin', 'super_admin'],
                'is_public'    => true,
                'is_featured'  => false,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            // ── Agenda ─────────────────────────────────────────────────────────
            [
                'slug'         => 'creer-evenement-agenda',
                'category'     => 'agenda',
                'title'        => ['fr' => 'Créer et gérer un événement dans l\'agenda', 'en' => 'Create and manage a calendar event'],
                'content'      => ['fr' => '<h2>Créer un événement</h2><p>Cliquez sur Agenda → + Nouvel événement...</p>', 'en' => ''],
                'tags'         => ['agenda', 'événement', 'calendrier', 'réunion'],
                'module'       => 'agenda',
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            [
                'slug'         => 'synchronisation-google-calendar',
                'category'     => 'agenda',
                'title'        => ['fr' => 'Synchronisation avec Google Calendar', 'en' => 'Google Calendar synchronization'],
                'content'      => ['fr' => '<h2>Synchronisation Google Calendar</h2><p>Accédez à Paramètres → Intégrations → Google Calendar...</p>', 'en' => ''],
                'tags'         => ['google calendar', 'synchronisation', 'agenda', 'intégration'],
                'module'       => 'agenda',
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => false,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            // ── GED ────────────────────────────────────────────────────────────
            [
                'slug'         => 'importer-document-ged',
                'category'     => 'ged',
                'title'        => ['fr' => 'Importer un document dans la GED', 'en' => 'Import a document into DMS'],
                'content'      => ['fr' => '<h2>Importer un document</h2><p>Accédez à GED → Documents → + Importer...</p>', 'en' => ''],
                'tags'         => ['ged', 'import', 'document', 'fichier'],
                'module'       => 'ged',
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            [
                'slug'         => 'signature-electronique',
                'category'     => 'ged',
                'title'        => ['fr' => 'Signer électroniquement un document', 'en' => 'Electronically sign a document'],
                'content'      => ['fr' => '<h2>Signature électronique</h2><p>Ouvrez le document PDF dans la GED, cliquez sur "Signer électroniquement"...</p>', 'en' => ''],
                'tags'         => ['signature', 'électronique', 'pdf', 'document'],
                'module'       => 'ged',
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => false,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            // ── Réunions ────────────────────────────────────────────────────────
            [
                'slug'         => 'generer-compte-rendu-ia',
                'category'     => 'reunions',
                'title'        => ['fr' => 'Générer un compte-rendu avec l\'IA (SARA)', 'en' => 'Generate meeting minutes with AI'],
                'content'      => ['fr' => '<h2>Générer le compte-rendu</h2><p>En fin de réunion, cliquez sur "Générer le compte-rendu"...</p>', 'en' => ''],
                'tags'         => ['compte-rendu', 'ia', 'sara', 'réunion'],
                'module'       => 'reunions',
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            // ── Tâches ─────────────────────────────────────────────────────────
            [
                'slug'         => 'vue-kanban-taches',
                'category'     => 'taches',
                'title'        => ['fr' => 'Utiliser la vue Kanban pour gérer ses tâches', 'en' => 'Using the Kanban board to manage tasks'],
                'content'      => ['fr' => '<h2>Vue Kanban</h2><p>Dans Tâches, cliquez sur l\'icône Kanban...</p>', 'en' => ''],
                'tags'         => ['kanban', 'tâches', 'tableau', 'statuts'],
                'module'       => 'taches',
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
            // ── Paramètres ─────────────────────────────────────────────────────
            [
                'slug'         => 'activer-mfa',
                'category'     => 'parametres',
                'title'        => ['fr' => 'Activer l\'authentification à deux facteurs (MFA)', 'en' => 'Enable two-factor authentication (MFA)'],
                'content'      => ['fr' => '<h2>Activer le MFA</h2><p>Accédez à Profil → Sécurité → Authentification à deux facteurs...</p>', 'en' => ''],
                'tags'         => ['mfa', 'sécurité', '2fa', 'authentification'],
                'module'       => null,
                'roles'        => ['all'],
                'is_public'    => true,
                'is_featured'  => true,
                'author'       => 'Équipe IBIG Soft',
                'version'      => '1.0',
            ],
        ];

        foreach ($articles as $data) {
            DB::table('help_articles')->insert([
                'organization_id' => null,
                'slug'            => $data['slug'],
                'title'           => json_encode($data['title'],   JSON_UNESCAPED_UNICODE),
                'content'         => json_encode($data['content'], JSON_UNESCAPED_UNICODE),
                'category'        => $data['category'],
                'tags'            => json_encode($data['tags'],    JSON_UNESCAPED_UNICODE),
                'module'          => $data['module'],
                'roles'           => json_encode($data['roles'],   JSON_UNESCAPED_UNICODE),
                'is_public'       => $data['is_public'],
                'is_featured'     => $data['is_featured'],
                'views'           => 0,
                'helpful_yes'     => 0,
                'helpful_no'      => 0,
                'author'          => $data['author'],
                'version'         => $data['version'],
                'published_at'    => now(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        $this->command->info('  → ' . count($articles) . ' articles de base insérés.');
    }

    // ─── 3. Templates de tickets ───────────────────────────────────────────────
    protected function seedTicketTemplates(): void
    {
        if (DB::table('support_ticket_templates')->count() > 0) {
            $this->command->info('  → Templates de tickets déjà présents — skip.');
            return;
        }

        $templates = [
            [
                'category'    => 'technical',
                'name'        => ['fr' => 'Problème technique', 'en' => 'Technical Issue'],
                'description' => ['fr' => 'Pour signaler un bug, un dysfonctionnement ou une erreur d\'affichage.', 'en' => 'Report a bug, malfunction, or display error.'],
                'fields'      => [
                    [
                        'name'     => 'module',
                        'label'    => ['fr' => 'Module concerné', 'en' => 'Affected module'],
                        'type'     => 'select',
                        'required' => true,
                        'options'  => ['Agenda', 'GED', 'Courrier', 'Réunions', 'Tâches', 'Projets', 'Communication', 'Réception', 'Ressources', 'RH', 'Comptabilité', 'Paramètres', 'SARA', 'Autre'],
                    ],
                    [
                        'name'     => 'steps_to_reproduce',
                        'label'    => ['fr' => 'Étapes pour reproduire le problème', 'en' => 'Steps to reproduce'],
                        'type'     => 'textarea',
                        'required' => false,
                        'placeholder' => ['fr' => "1. Ouvrez le module...\n2. Cliquez sur...\n3. Le problème survient...", 'en' => ''],
                    ],
                    [
                        'name'     => 'expected_behavior',
                        'label'    => ['fr' => 'Comportement attendu', 'en' => 'Expected behavior'],
                        'type'     => 'textarea',
                        'required' => false,
                    ],
                ],
                'is_active' => true,
                'order'     => 1,
            ],
            [
                'category'    => 'billing',
                'name'        => ['fr' => 'Facturation & Abonnement', 'en' => 'Billing & Subscription'],
                'description' => ['fr' => 'Pour toute question relative à votre abonnement, factures ou paiements.', 'en' => 'Questions about subscription, invoices, or payments.'],
                'fields'      => [
                    [
                        'name'     => 'billing_subject',
                        'label'    => ['fr' => 'Nature de la demande', 'en' => 'Request type'],
                        'type'     => 'select',
                        'required' => true,
                        'options'  => ['Facture manquante', 'Erreur de facturation', 'Changement de plan', 'Renouvellement', 'Remboursement', 'Autre'],
                    ],
                    [
                        'name'     => 'invoice_number',
                        'label'    => ['fr' => 'Numéro de facture (si applicable)', 'en' => 'Invoice number'],
                        'type'     => 'text',
                        'required' => false,
                    ],
                ],
                'is_active' => true,
                'order'     => 2,
            ],
            [
                'category'    => 'question',
                'name'        => ['fr' => 'Question / Demande d\'aide', 'en' => 'Question / Help request'],
                'description' => ['fr' => 'Pour toute question sur l\'utilisation de SECRETIS ou une procédure.', 'en' => 'Questions about using SECRETIS or a procedure.'],
                'fields'      => [
                    [
                        'name'     => 'module',
                        'label'    => ['fr' => 'Module concerné', 'en' => 'Relevant module'],
                        'type'     => 'select',
                        'required' => false,
                        'options'  => ['Général', 'Agenda', 'GED', 'Courrier', 'Réunions', 'Tâches', 'Projets', 'Communication', 'Réception', 'Ressources', 'RH', 'Comptabilité', 'Paramètres', 'SARA', 'Autre'],
                    ],
                ],
                'is_active' => true,
                'order'     => 3,
            ],
            [
                'category'    => 'feature_request',
                'name'        => ['fr' => 'Suggestion de fonctionnalité', 'en' => 'Feature request'],
                'description' => ['fr' => 'Proposez une nouvelle fonctionnalité ou une amélioration d\'une existante.', 'en' => 'Suggest a new feature or improvement.'],
                'fields'      => [
                    [
                        'name'     => 'module',
                        'label'    => ['fr' => 'Module concerné', 'en' => 'Related module'],
                        'type'     => 'select',
                        'required' => false,
                        'options'  => ['Général', 'Agenda', 'GED', 'Courrier', 'Réunions', 'Tâches', 'Projets', 'Communication', 'Réception', 'Ressources', 'RH', 'Comptabilité', 'Paramètres', 'SARA', 'Autre'],
                    ],
                    [
                        'name'        => 'use_case',
                        'label'       => ['fr' => 'Cas d\'usage', 'en' => 'Use case'],
                        'type'        => 'textarea',
                        'required'    => false,
                        'placeholder' => ['fr' => 'Décrivez le problème que cette fonctionnalité résoudrait...', 'en' => ''],
                    ],
                    [
                        'name'     => 'business_impact',
                        'label'    => ['fr' => 'Impact business estimé', 'en' => 'Estimated business impact'],
                        'type'     => 'select',
                        'required' => false,
                        'options'  => ['Faible', 'Moyen', 'Élevé', 'Critique'],
                    ],
                ],
                'is_active' => true,
                'order'     => 4,
            ],
        ];

        foreach ($templates as $template) {
            DB::table('support_ticket_templates')->insert([
                'category'    => $template['category'],
                'name'        => json_encode($template['name'],        JSON_UNESCAPED_UNICODE),
                'description' => json_encode($template['description'], JSON_UNESCAPED_UNICODE),
                'fields'      => json_encode($template['fields'],      JSON_UNESCAPED_UNICODE),
                'is_active'   => $template['is_active'],
                'order'       => $template['order'],
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        $this->command->info('  → 4 templates de tickets insérés.');
    }
}
