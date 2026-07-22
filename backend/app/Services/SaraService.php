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
    /**
     * FAQs de base pour RAG simple.
     * En production, ces données viendraient d'une table `faqs`.
     */
    protected array $faqs = [
        [
            'keywords' => ['prix', 'tarif', 'cout', 'plan', 'abonnement', 'payer'],
            'answer'   => "IBIG SECRETIS propose 3 plans : **Starter** (25 000 XOF/mois, 5 utilisateurs), **Pro** (75 000 XOF/mois, 50 utilisateurs) et **Enterprise** (150 000 XOF/mois, utilisateurs illimités). Un essai gratuit de 14 jours est disponible sans carte bancaire.",
        ],
        [
            'keywords' => ['module', 'fonctionnalit', 'inclus', 'disponible'],
            'answer'   => "IBIG SECRETIS inclut : Calendrier & Réservations, Courrier & Documents, Réunions & Décisions, Projets & Tâches, Messagerie interne, Gestion des visiteurs, RH & Congés. Les modules actifs dépendent de votre plan.",
        ],
        [
            'keywords' => ['mot de passe', 'connexion', 'compte', 'oublié', 'reset'],
            'answer'   => "Pour réinitialiser votre mot de passe, cliquez sur « Mot de passe oublié » sur la page de connexion. Un email vous sera envoyé avec un lien valable 60 minutes.",
        ],
        [
            'keywords' => ['support', 'aide', 'contacter', 'problème', 'bug', 'ticket'],
            'answer'   => "Pour obtenir de l'aide, ouvrez un ticket depuis **Paramètres → Support** dans votre espace. Notre équipe répond sous 24h ouvrables. Pour les urgences : support@ibigsoft.com",
        ],
        [
            'keywords' => ['sauvegarde', 'données', 'securite', 'rgpd', 'confidentialité'],
            'answer'   => "Vos données sont hébergées en Europe (AWS), sauvegardées quotidiennement et chiffrées (AES-256). IBIG SECRETIS est conforme au RGPD. Vous pouvez exporter vos données à tout moment.",
        ],
    ];

    /**
     * Sélectionner le fournisseur IA configuré (groq, openai, anthropic).
     */
    protected string $provider;

    public function __construct()
    {
        $this->provider = config('secretis.ai.provider', 'groq');
    }

    /**
     * Point d'entrée principal : répondre à un message.
     */
    public function chat(string $message, array $context, User $user): string
    {
        // 1. Chercher dans les FAQs avant d'appeler l'IA (RAG basique)
        $faqAnswer = $this->searchFaqs($message);
        if ($faqAnswer) {
            $this->logConversation($user, $message, $faqAnswer);
            return $faqAnswer;
        }

        // 2. Construire le prompt complet
        $mode = $context['mode'] ?? 'internal';
        $systemPrompt = $this->getSystemPrompt($mode);

        // 3. Appeler l'IA
        try {
            $response = $this->callAI($systemPrompt, $message, $context, $user);
            $this->logConversation($user, $message, $response);
            return $response;
        } catch (\Throwable $e) {
            Log::error('SaraService::chat error', [
                'provider' => $this->provider,
                'error'    => $e->getMessage(),
                'user_id'  => $user->id,
            ]);
            $fallback = $this->getFallbackResponse($message, $mode);
            $this->logConversation($user, $message, $fallback);
            return $fallback;
        }
    }

    /**
     * Prompt système selon le mode (public landing vs espace authentifié).
     */
    public function getSystemPrompt(string $mode): string
    {
        $base = <<<PROMPT
Tu es SARA, l'assistante intelligente d'IBIG SECRETIS, un ERP SaaS conçu pour les organisations africaines.
Tu es développée par IBIG Soft (Côte d'Ivoire).

Règles absolues :
- Ne divulgue JAMAIS de données appartenant à d'autres organisations.
- Ne partage JAMAIS de clés API, mots de passe ou informations confidentielles système.
- Si tu n'as pas de réponse certaine, dis-le honnêtement et propose de contacter le support.
- Réponds TOUJOURS dans la langue utilisée par l'utilisateur (français, anglais, etc.).
- Sois concise, professionnelle et bienveillante.
- Utilise le Markdown pour formater tes réponses (gras, listes) quand pertinent.
PROMPT;

        if ($mode === 'public') {
            return $base . <<<PROMPT

Contexte : Tu parles à un visiteur du site public IBIG SECRETIS.
Ton objectif : expliquer les fonctionnalités, les plans tarifaires, et inciter à démarrer un essai gratuit.
Ne demande pas d'informations personnelles sensibles.
Redirige les demandes techniques vers : support@ibigsoft.com
PROMPT;
        }

        // Mode interne (utilisateur authentifié)
        return $base . <<<PROMPT

Contexte : Tu parles à un utilisateur authentifié dans son espace IBIG SECRETIS.
Tu peux répondre à des questions sur l'utilisation des modules, les fonctionnalités disponibles selon leur plan,
et les bonnes pratiques. Tu ne peux PAS accéder aux données d'autres organisations.
PROMPT;
    }

    /**
     * Construire le contexte enrichi pour l'IA.
     */
    public function buildContext(User $user, Organization $org): array
    {
        // Récupérer la licence active depuis le cache ou la DB
        $license = Cache::remember(
            "org_{$org->id}_license",
            now()->addMinutes(15),
            fn() => $org->licenses()->where('status', 'active')->latest()->first()
        );

        return [
            'mode'             => 'internal',
            'user_name'        => $user->first_name,
            'user_role'        => $user->role,
            'user_locale'      => $user->locale ?? 'fr',
            'organization'     => $org->name,
            'plan'             => $license?->plan_name ?? 'Essai',
            'modules_enabled'  => $license?->modules ?? $org->modules_enabled ?? [],
            'max_users'        => $license?->max_users ?? 5,
            'license_status'   => $license?->status ?? 'trial',
            'license_ends_at'  => $license?->ends_at?->toDateString(),
        ];
    }

    /**
     * Questions suggérées selon le contexte.
     */
    public function getQuickQuestions(string $mode, array $context = []): array
    {
        if ($mode === 'public') {
            return [
                'Quels sont vos tarifs ?',
                'Quels modules sont inclus ?',
                'Comment démarrer l\'essai gratuit ?',
                'Puis-je importer mes données ?',
                'IBIG SECRETIS est-il conforme RGPD ?',
            ];
        }

        $role = $context['user_role'] ?? 'employee';
        $questions = [
            'Comment créer un événement récurrent ?',
            'Comment réserver une salle de réunion ?',
            'Comment partager un document ?',
        ];

        if (in_array($role, ['admin', 'manager'])) {
            $questions[] = 'Comment gérer les congés de mon équipe ?';
            $questions[] = 'Comment consulter les rapports d\'activité ?';
        }
        if ($role === 'admin') {
            $questions[] = 'Comment ajouter un nouvel utilisateur ?';
            $questions[] = 'Comment configurer les modules actifs ?';
        }

        return $questions;
    }

    /**
     * Enregistrer la conversation en base.
     */
    public function logConversation(User $user, string $message, string $response): void
    {
        try {
            // Stocker dans la table conversations/messages si nécessaire
            // Pour l'instant, on log dans un audit simple
            \DB::table('audit_logs')->insert([
                'organization_id' => $user->organization_id,
                'user_id'         => $user->id,
                'event'           => 'sara_conversation',
                'auditable_type'  => 'sara',
                'new_values'      => json_encode([
                    'message'   => Str::limit($message, 500),
                    'response'  => Str::limit($response, 1000),
                    'provider'  => $this->provider,
                ]),
                'ip_address' => request()->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('SaraService::logConversation failed', ['error' => $e->getMessage()]);
        }
    }

    // ─── Méthodes privées ──────────────────────────────────────────────────────

    /**
     * Recherche sémantique simple dans les FAQs.
     */
    protected function searchFaqs(string $message): ?string
    {
        $normalized = mb_strtolower(
            str_replace(['é', 'è', 'ê', 'à', 'â', 'ù', 'û', 'î', 'ô', 'ç'],
                        ['e', 'e', 'e', 'a', 'a', 'u', 'u', 'i', 'o', 'c'],
                        $message)
        );

        $bestMatch = null;
        $bestScore = 0;

        foreach ($this->faqs as $faq) {
            $score = 0;
            foreach ($faq['keywords'] as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    $score++;
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMatch = $faq['answer'];
            }
        }

        // Seuil : au moins 2 mots-clés correspondants pour retourner la FAQ
        return $bestScore >= 2 ? $bestMatch : null;
    }

    /**
     * Appel à l'API IA selon le fournisseur configuré.
     */
    protected function callAI(string $systemPrompt, string $message, array $context, User $user): string
    {
        $contextText = $this->buildContextText($context);
        $fullSystem  = $systemPrompt . "\n\n" . $contextText;

        return match ($this->provider) {
            'openai'    => $this->callOpenAI($fullSystem, $message),
            'anthropic' => $this->callAnthropic($fullSystem, $message),
            default     => $this->callGroq($fullSystem, $message),
        };
    }

    protected function buildContextText(array $context): string
    {
        if (empty($context) || ($context['mode'] ?? '') === 'public') {
            return '';
        }
        return sprintf(
            "Informations sur l'utilisateur connecté :\n- Prénom : %s\n- Rôle : %s\n- Organisation : %s\n- Plan : %s\n- Modules actifs : %s",
            $context['user_name'] ?? 'Utilisateur',
            $context['user_role'] ?? 'employee',
            $context['organization'] ?? 'Non spécifiée',
            $context['plan'] ?? 'Essai',
            implode(', ', (array) ($context['modules_enabled'] ?? []))
        );
    }

    /**
     * Groq (modèle par défaut : llama-3.3-70b-versatile).
     */
    protected function callGroq(string $system, string $message): string
    {
        $response = Http::withToken(config('secretis.ai.groq_key'))
            ->timeout(30)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => config('secretis.ai.groq_model', 'llama-3.3-70b-versatile'),
                'max_tokens'  => 1024,
                'temperature' => 0.7,
                'messages'    => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user',   'content' => $message],
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Groq API error: ' . $response->status());
        }

        return trim($response->json('choices.0.message.content', ''));
    }

    /**
     * OpenAI (modèle : gpt-4o-mini).
     */
    protected function callOpenAI(string $system, string $message): string
    {
        $response = Http::withToken(config('secretis.ai.openai_key'))
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'       => config('secretis.ai.openai_model', 'gpt-4o-mini'),
                'max_tokens'  => 1024,
                'temperature' => 0.7,
                'messages'    => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user',   'content' => $message],
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('OpenAI API error: ' . $response->status());
        }

        return trim($response->json('choices.0.message.content', ''));
    }

    /**
     * Anthropic Claude.
     */
    protected function callAnthropic(string $system, string $message): string
    {
        $response = Http::withHeaders([
                'x-api-key'         => config('secretis.ai.anthropic_key'),
                'anthropic-version' => '2023-06-01',
            ])
            ->timeout(30)
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => config('secretis.ai.anthropic_model', 'claude-haiku-20240307'),
                'max_tokens' => 1024,
                'system'     => $system,
                'messages'   => [
                    ['role' => 'user', 'content' => $message],
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Anthropic API error: ' . $response->status());
        }

        return trim($response->json('content.0.text', ''));
    }

    /**
     * Réponse de secours si l'IA est indisponible.
     */
    protected function getFallbackResponse(string $message, string $mode): string
    {
        if ($mode === 'public') {
            return "Je suis temporairement indisponible. Pour toute question sur IBIG SECRETIS, contactez-nous à **contact@ibigsoft.com** ou consultez notre documentation en ligne.";
        }
        return "Je rencontre une difficulté technique momentanée. Si votre question est urgente, ouvrez un ticket depuis **Paramètres → Support**. Notre équipe vous répondra sous 24h.";
    }
}
