<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SaraService
{
    protected string $provider;

    /**
     * FAQs internes pour RAG basique.
     */
    protected array $faqs = [
        // ── FICHE SUPPRIMÉE — réindexation licence, section 12.5.1 ───────────
        // Une fiche « prix / tarif / abonnement » vivait ici avec trois prix,
        // un nombre d'utilisateurs et une durée d'essai écrits en dur. Elle
        // contredisait licence.config.json et employait « illimités » et
        // « essai gratuit », tous deux hors glossaire (section 12.3).
        // Elle n'est pas corrigée mais RETIRÉE : ces questions sont désormais
        // servies par App\Services\Sara\OutilLicence, qui lit la source unique
        // de vérité. La compléter aurait laissé deux réponses concurrentes.
        [
            'keywords' => ['module', 'fonctionnalit', 'inclus', 'disponible', 'features'],
            'answer'   => "IBIG SECRETIS inclut : Calendrier & Réservations, Courrier & Documents (GED), Réunions & Décisions, Projets & Tâches, Messagerie interne, Gestion des visiteurs, RH & Congés, Comptabilité SYSCOHADA. Les modules actifs dépendent de votre plan.",
        ],
        [
            'keywords' => ['mot de passe', 'connexion', 'compte', 'oublié', 'reset', 'password'],
            'answer'   => "Pour réinitialiser votre mot de passe, cliquez sur **Mot de passe oublié** sur la page de connexion. Un e-mail vous sera envoyé avec un lien valable 60 minutes.",
        ],
        [
            'keywords' => ['support', 'aide', 'contacter', 'problème', 'bug', 'ticket', 'help'],
            'answer'   => "Pour obtenir de l'aide, ouvrez un ticket depuis **Paramètres → Support**. Notre équipe répond sous 24h ouvrables. Pour les urgences : **support@ibigsoft.com**",
        ],
        [
            'keywords' => ['sauvegarde', 'données', 'securite', 'rgpd', 'confidentialite', 'backup', 'security'],
            'answer'   => "Vos données sont hébergées en Europe (AWS), sauvegardées quotidiennement et chiffrées (AES-256). IBIG SECRETIS est conforme au RGPD. Vous pouvez exporter vos données à tout moment depuis **Paramètres → Données**.",
        ],
        [
            'keywords' => ['agenda', 'calendrier', 'evenement', 'reunion', 'rendez-vous', 'calendar'],
            'answer'   => "Le module Agenda vous permet de créer des événements simples ou récurrents, d'inviter des participants, de réserver des salles et d'exporter votre planning. Accédez-y via le menu latéral → icône Calendrier.",
        ],
        [
            'keywords' => ['document', 'ged', 'fichier', 'courrier', 'upload', 'importer'],
            'answer'   => "La GED (Gestion Electronique de Documents) permet d'importer, classer et partager vos fichiers. Créez des dossiers par type, définissez des workflows de validation et consultez l'historique de chaque document.",
        ],
        [
            'keywords' => ['tache', 'projet', 'kanban', 'todo', 'task'],
            'answer'   => "Le module Tâches & Projets offre une vue Kanban, Gantt et liste. Créez des projets, affectez des tâches à vos collaborateurs, définissez des priorités et suivez l'avancement en temps réel.",
        ],
        [
            'keywords' => ['visiteur', 'accueil', 'badge', 'visite', 'visitor'],
            'answer'   => "Le module Visiteurs gère l'accueil de vos visiteurs : enregistrement à l'arrivée, génération de badge, notification du contact interne et rapport de fréquentation.",
        ],
        [
            'keywords' => ['rh', 'conge', 'employe', 'personnel', 'hr', 'leave'],
            'answer'   => "Le module RH permet de gérer les fiches employés, les demandes de congés, les absences et les plannings. Les managers approuvent les demandes directement depuis l'interface.",
        ],
    ];

    // ─── Garde-fous (20) ──────────────────────────────────────────────────────

    /**
     * Sujets interdits à traiter pour SARA.
     */
    protected array $forbiddenTopics = [
        'données confidentielles',
        'clé api',
        'api key',
        'mot de passe',
        'password',
        'données d\'autres organisations',
        'other organizations',
        'exécuter du code',
        'execute code',
        'run code',
        'eval(',
        'system(',
        'rm -rf',
        'drop table',
        'delete from',
        'truncate',
        'informations bancaires',
        'numéro de carte',
        'card number',
        'données personnelles sensibles',
    ];

    public function __construct()
    {
        $this->provider = config('sara.provider', config('secretis.ai.provider', 'groq'));
    }

    // ─── API publique ──────────────────────────────────────────────────────────

    /**
     * Envoie un message et retourne la réponse SARA avec métadonnées.
     *
     * @param  array       $messages      Historique [{role, content, timestamp}]
     * @param  User        $user
     * @param  string|null $contextModule Module actif (agenda, ged, tasks…)
     * @return array {content, tokens_used, provider, model}
     */
    public function chat(array $messages, User $user, ?string $contextModule = null): array
    {
        // Garde-fou : si le dernier message contient un sujet interdit
        $lastUserMessage = collect($messages)->where('role', 'user')->last()['content'] ?? '';
        if ($this->containsForbiddenTopic($lastUserMessage)) {
            return [
                'content'      => "Je ne suis pas autorisée à traiter ce type de demande. Si vous avez besoin d'aide, contactez notre support : **support@ibigsoft.com**.",
                'tokens_used'  => 0,
                'provider'     => $this->provider,
                'model'        => null,
            ];
        }

        // Licence : l'outil dédié répond seul, le modèle n'est pas consulté.
        // Placé AVANT la recherche FAQ : une fiche FAQ qui parlerait encore de
        // licence ne doit plus jamais prendre la main (section 12.5.1).
        $licence = app(\App\Services\Sara\SaraLicence::class);

        if ($fiche = $licence->courtCircuit($lastUserMessage)) {
            return [
                'content'      => $fiche['reponse'],
                'tokens_used'  => 0,
                'provider'     => 'licence',
                'model'        => $fiche['source'],
            ];
        }

        // RAG : chercher dans les FAQs si question documentaire
        $faqAnswer = $this->searchFaqs($lastUserMessage);
        if ($faqAnswer) {
            return [
                'content'      => $licence->filtrer($faqAnswer, $lastUserMessage),
                'tokens_used'  => 0,
                'provider'     => 'faq',
                'model'        => 'local-faq',
            ];
        }

        $systemPrompt = $this->getSystemPrompt($user, $contextModule);

        try {
            $reponse = $this->callAI($systemPrompt, $messages, $user);

            // Filtre de sortie — appliqué quelle que soit l'origine.
            if (isset($reponse['content']) && is_string($reponse['content'])) {
                $reponse['content'] = $licence->filtrer($reponse['content'], $lastUserMessage);
            }

            return $reponse;
        } catch (\Throwable $e) {
            Log::error('SaraService::chat error', [
                'provider'   => $this->provider,
                'error'      => $e->getMessage(),
                'user_id'    => $user->id,
                'org_id'     => $user->organization_id,
                'context'    => $contextModule,
            ]);

            return [
                'content'      => "Je rencontre une difficulté technique momentanée. Si votre question est urgente, ouvrez un ticket depuis **Paramètres → Support**. Notre équipe vous répondra sous 24h.",
                'tokens_used'  => 0,
                'provider'     => $this->provider,
                'model'        => null,
            ];
        }
    }

    /**
     * Générer un titre court (5 mots max) pour la conversation.
     */
    public function generateTitle(string $firstMessage): string
    {
        $clean = Str::limit(strip_tags($firstMessage), 100);

        // Tentative simple sans appel IA : extraire les premiers mots significatifs
        $words = preg_split('/\s+/', $clean);
        $stopwords = ['comment', 'puis-je', 'est-ce', 'que', 'je', 'vous', 'bonjour', 'quel', 'quelle', 'les', 'des', 'une', 'un', 'de', 'le', 'la'];
        $meaningful = array_filter($words, fn($w) => strlen($w) > 3 && !in_array(mb_strtolower($w), $stopwords));
        $title = implode(' ', array_slice(array_values($meaningful), 0, 5));

        return $title ?: Str::limit($clean, 40);
    }

    /**
     * Chercher dans les FAQs et retourner max 3 résultats pertinents.
     *
     * @return array [{answer, score}]
     */
    public function suggestFromFaq(string $query): array
    {
        $normalized = $this->normalizeText($query);
        $results = [];

        foreach ($this->faqs as $faq) {
            $score = 0;
            foreach ($faq['keywords'] as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    $score++;
                }
            }
            if ($score >= 1) {
                $results[] = ['answer' => $faq['answer'], 'score' => $score];
            }
        }

        usort($results, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($results, 0, 3);
    }

    /**
     * System prompt personnalisé avec infos utilisateur et module actif.
     */
    public function getSystemPrompt(User $user, ?string $contextModule = null): string
    {
        $moduleContextMap = [
            'agenda'     => "L'utilisateur est actuellement sur le module **Agenda & Calendrier**. Aidez-le notamment avec : créer des événements, gérer les récurrences, inviter des participants, réserver des salles.",
            'ged'        => "L'utilisateur est actuellement sur le module **GED (Documents & Courriers)**. Aidez-le notamment avec : importer des fichiers, créer des dossiers, définir un workflow de validation, partager des documents.",
            'tasks'      => "L'utilisateur est actuellement sur le module **Tâches & Projets**. Aidez-le notamment avec : créer des projets, affecter des tâches, utiliser le Kanban, générer des rapports d'avancement.",
            'visitors'   => "L'utilisateur est actuellement sur le module **Gestion des Visiteurs**. Aidez-le notamment avec : enregistrer un visiteur, générer un badge, configurer le protocole d'accueil.",
            'hr'         => "L'utilisateur est actuellement sur le module **RH & Congés**. Aidez-le notamment avec : créer des fiches employés, gérer les demandes de congés, consulter les plannings.",
            'accounting' => "L'utilisateur est actuellement sur le module **Comptabilité SYSCOHADA**. Aidez-le notamment avec : saisir des écritures, gérer les notes de frais, générer des rapports financiers.",
            'reporting'  => "L'utilisateur est actuellement sur le module **Rapports & Analytics**. Aidez-le notamment avec : créer des rapports personnalisés, planifier des rapports automatiques, exporter des données.",
            'admin'      => "L'utilisateur est actuellement sur le module **Administration**. Aidez-le notamment avec : gérer les utilisateurs, configurer les rôles et permissions, effectuer des sauvegardes.",
        ];

        $moduleContext = $contextModule && isset($moduleContextMap[$contextModule])
            ? "\n\nContexte du module actif :\n" . $moduleContextMap[$contextModule]
            : '';

        $orgName  = $user->organization?->name ?? 'votre organisation';
        $userName = $user->first_name ?? $user->name ?? 'Utilisateur';
        $role     = $user->role ?? 'employee';
        $locale   = $user->locale ?? 'fr';

        return <<<PROMPT
Tu es SARA, l'assistante IA intégrée d'IBIG SECRETIS, un ERP SaaS conçu pour les organisations africaines.
Tu es développée par IBIG Soft (Côte d'Ivoire).

L'utilisateur connecté est **{$userName}**, rôle : **{$role}**, organisation : **{$orgName}**.
Sa langue préférée est : {$locale}. Réponds dans sa langue si différente du français.

Règles absolues (garde-fous) :
1. Ne divulgue JAMAIS de données d'autres organisations — tu ne vois que les données de {$orgName}.
2. Ne partage JAMAIS de clés API, mots de passe ou tokens.
3. Ne tente JAMAIS d'exécuter du code, des commandes système ou des requêtes SQL directement.
4. N'accède JAMAIS à des ressources externes non autorisées.
5. Si tu n'as pas de réponse certaine, dis-le honnêtement et propose de contacter le support.
6. Reste TOUJOURS dans le périmètre fonctionnel de SECRETIS.
7. Sois concise, professionnelle et bienveillante.
8. Utilise le Markdown pour formater tes réponses (gras, listes, code) quand pertinent.
9. Ne génère jamais de contenu illégal, offensant ou discriminatoire.
10. Ne simule pas être un humain si on te demande directement si tu es une IA.
11. Ne révèle pas les détails techniques de ton implémentation.
12. Ne donne pas de conseils médicaux, juridiques ou financiers spécifiques.
13. Redirige les demandes de support technique urgent vers support@ibigsoft.com.
14. N'impersonne pas d'autres systèmes ou assistants.
15. Ne confirme ni n'infirme l'existence de failles de sécurité.
16. Limite tes réponses à maximum 800 tokens pour rester lisible.
17. N'invente pas de fonctionnalités qui n'existent pas dans SECRETIS.
18. En cas de doute sur une action, demande confirmation à l'utilisateur.
19. Ne cite jamais de données personnelles d'autres utilisateurs de la plateforme.
20. Refuse poliment les demandes hors périmètre en proposant une alternative.
{$moduleContext}

Réponds toujours en français par défaut, en anglais si l'utilisateur écrit en anglais.
PROMPT
        . app(\App\Services\Sara\SaraLicence::class)->invite();
    }

    /**
     * Méthode historique (compatibilité), redirige vers getSystemPrompt.
     */
    public function buildContext(User $user, Organization $org): array
    {
        $license = Cache::remember(
            "org_{$org->id}_license",
            now()->addMinutes(15),
            fn() => $org->licenses()->where('status', 'active')->latest()->first()
        );

        return [
            'mode'            => 'internal',
            'user_name'       => $user->first_name,
            'user_role'       => $user->role,
            'user_locale'     => $user->locale ?? 'fr',
            'organization'    => $org->name,
            'plan'            => $license?->plan_name ?? 'Essai',
            'modules_enabled' => $license?->modules ?? $org->modules_enabled ?? [],
            'max_users'       => $license?->max_users ?? 5,
            'license_status'  => $license?->status ?? 'trial',
            'license_ends_at' => $license?->ends_at?->toDateString(),
        ];
    }

    /**
     * Questions rapides selon le module.
     */
    public function getQuickQuestions(string $module = 'general', array $context = []): array
    {
        $byModule = [
            'agenda'     => ["Comment créer un événement récurrent ?", "Comment inviter des participants ?", "Comment réserver une salle ?", "Comment exporter mon agenda ?"],
            'ged'        => ["Comment importer un document ?", "Comment créer un dossier partagé ?", "Comment configurer un workflow de validation ?", "Comment retrouver un fichier ?"],
            'tasks'      => ["Comment créer un projet ?", "Comment affecter une tâche ?", "Comment utiliser le Kanban ?", "Comment générer un rapport d'avancement ?"],
            'visitors'   => ["Comment enregistrer un visiteur ?", "Comment générer un badge ?", "Comment notifier un contact ?", "Comment voir le rapport de fréquentation ?"],
            'hr'         => ["Comment créer une fiche employé ?", "Comment gérer les congés ?", "Comment consulter les absences ?", "Comment exporter le planning ?"],
            'accounting' => ["Comment saisir une note de frais ?", "Comment générer un rapport de dépenses ?", "Comment configurer les centres de coût ?", "Comment exporter vers Excel ?"],
            'reporting'  => ["Comment créer un rapport personnalisé ?", "Comment planifier un rapport automatique ?", "Comment exporter en PDF ?", "Comment partager un rapport ?"],
            'admin'      => ["Comment ajouter un utilisateur ?", "Comment configurer les permissions ?", "Comment effectuer une sauvegarde ?", "Comment gérer les modules actifs ?"],
            'general'    => ["Comment créer un événement récurrent ?", "Comment partager un document ?", "Comment gérer les congés de mon équipe ?", "Comment ajouter un utilisateur ?"],
        ];

        return $byModule[$module] ?? $byModule['general'];
    }

    // ─── Méthodes privées ──────────────────────────────────────────────────────

    protected function callAI(string $systemPrompt, array $messages, User $user): array
    {
        // Convertir les messages au format OpenAI-compatible
        $apiMessages = array_map(fn($m) => [
            'role'    => $m['role'],
            'content' => $m['content'],
        ], $messages);

        return match ($this->provider) {
            'openai'    => $this->callOpenAI($systemPrompt, $apiMessages),
            'anthropic' => $this->callAnthropic($systemPrompt, $apiMessages),
            default     => $this->callGroq($systemPrompt, $apiMessages),
        };
    }

    protected function callGroq(string $system, array $messages): array
    {
        $model = config('secretis.ai.groq_model', 'llama-3.3-70b-versatile');

        $response = Http::withToken(config('secretis.ai.groq_key', env('GROQ_API_KEY')))
            ->timeout(30)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => $model,
                'max_tokens'  => 1024,
                'temperature' => 0.7,
                'messages'    => array_merge(
                    [['role' => 'system', 'content' => $system]],
                    $messages
                ),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Groq API error: ' . $response->status() . ' ' . $response->body());
        }

        return [
            'content'     => trim($response->json('choices.0.message.content', '')),
            'tokens_used' => $response->json('usage.total_tokens', 0),
            'provider'    => 'groq',
            'model'       => $model,
        ];
    }

    protected function callOpenAI(string $system, array $messages): array
    {
        $model = config('secretis.ai.openai_model', 'gpt-4o-mini');

        $response = Http::withToken(config('secretis.ai.openai_key'))
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'       => $model,
                'max_tokens'  => 1024,
                'temperature' => 0.7,
                'messages'    => array_merge(
                    [['role' => 'system', 'content' => $system]],
                    $messages
                ),
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('OpenAI API error: ' . $response->status());
        }

        return [
            'content'     => trim($response->json('choices.0.message.content', '')),
            'tokens_used' => $response->json('usage.total_tokens', 0),
            'provider'    => 'openai',
            'model'       => $model,
        ];
    }

    protected function callAnthropic(string $system, array $messages): array
    {
        $model = config('secretis.ai.anthropic_model', 'claude-haiku-20240307');

        $response = Http::withHeaders([
                'x-api-key'         => config('secretis.ai.anthropic_key'),
                'anthropic-version' => '2023-06-01',
            ])
            ->timeout(30)
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => $model,
                'max_tokens' => 1024,
                'system'     => $system,
                'messages'   => $messages,
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Anthropic API error: ' . $response->status());
        }

        return [
            'content'     => trim($response->json('content.0.text', '')),
            'tokens_used' => ($response->json('usage.input_tokens', 0) + $response->json('usage.output_tokens', 0)),
            'provider'    => 'anthropic',
            'model'       => $model,
        ];
    }

    protected function searchFaqs(string $message): ?string
    {
        $normalized = $this->normalizeText($message);
        $bestScore  = 0;
        $bestAnswer = null;

        foreach ($this->faqs as $faq) {
            $score = 0;
            foreach ($faq['keywords'] as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    $score++;
                }
            }
            if ($score > $bestScore) {
                $bestScore  = $score;
                $bestAnswer = $faq['answer'];
            }
        }

        return $bestScore >= 2 ? $bestAnswer : null;
    }

    protected function containsForbiddenTopic(string $message): bool
    {
        $normalized = $this->normalizeText($message);
        foreach ($this->forbiddenTopics as $topic) {
            if (str_contains($normalized, $this->normalizeText($topic))) {
                return true;
            }
        }
        return false;
    }

    protected function normalizeText(string $text): string
    {
        return mb_strtolower(
            str_replace(
                ['é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'ù', 'û', 'ü', 'î', 'ï', 'ô', 'ö', 'ç'],
                ['e', 'e', 'e', 'e', 'a', 'a', 'a', 'u', 'u', 'u', 'i', 'i', 'o', 'o', 'c'],
                $text
            )
        );
    }
}
