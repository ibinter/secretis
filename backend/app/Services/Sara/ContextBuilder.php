<?php

declare(strict_types=1);

namespace App\Services\Sara;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ContextBuilder — Construction du contexte enrichi pour SARA v2.
 *
 * Construit un contexte pertinent selon :
 *  - Page courante / module actif
 *  - Rôle et historique de l'utilisateur
 *  - KPIs et données agrégées (non sensibles)
 *  - Date / heure / jour ouvrable
 *
 * Limites de sécurité :
 *  - Jamais de données personnelles détaillées (numéros de téléphone, adresses complètes)
 *  - Jamais de mots de passe, tokens, clés API
 *  - Jamais de données appartenant à d'autres organisations
 *  - Contexte tronqué à ~4000 tokens estimés
 */
class ContextBuilder
{
    private const MAX_CONTEXT_CHARS = 12000; // ~4000 tokens
    private const CACHE_TTL_MINUTES = 5;

    // Champs sensibles à NE JAMAIS injecter dans le contexte LLM
    private const SENSITIVE_FIELDS = [
        'password', 'password_hash', 'api_key', 'secret', 'token',
        'credit_card', 'iban', 'bank_account', 'ssn', 'passport',
    ];

    // =========================================================================
    // METHODE PRINCIPALE
    // =========================================================================

    /**
     * Construit le contexte complet pour SARA.
     *
     * @param User  $user    Utilisateur courant
     * @param array $input   Contexte additionnel fourni par le client (page courante, etc.)
     *
     * @return array Contexte enrichi, sécurisé, tronqué
     */
    public function build(User $user, array $input = []): array
    {
        $cacheKey = "sara_ctx:{$user->id}:" . md5(serialize($input));

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($user, $input) {
            return $this->buildFresh($user, $input);
        });
    }

    // =========================================================================
    // CONSTRUCTION DU CONTEXTE
    // =========================================================================

    private function buildFresh(User $user, array $input): array
    {
        $org  = $user->organization;
        $now  = now();

        // ── Contexte de base ────────────────────────────────────────────────
        $context = [
            'mode'             => $input['mode'] ?? 'internal',
            'user_id'          => $user->id,
            'user_name'        => $user->first_name,
            'user_role'        => $user->role,
            'user_locale'      => $user->locale ?? 'fr',
            'organization'     => $org?->name ?? 'Organisation inconnue',
            'organization_id'  => $user->organization_id,

            // Date/heure courante
            'current_datetime' => $now->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm'),
            'current_date'     => $now->toDateString(),
            'current_time'     => $now->format('H:i'),
            'is_business_hours'=> $this->isBusinessHours($now),
            'day_of_week'      => $now->locale('fr')->isoFormat('dddd'),

            // Page courante (si fournie par le client)
            'current_page'     => $input['current_page'] ?? null,
            'current_module'   => $input['current_module'] ?? null,
        ];

        // ── Licence et modules ──────────────────────────────────────────────
        if ($org) {
            $context = array_merge($context, $this->getLicenseContext($org));
        }

        // ── KPIs pertinents selon le rôle ───────────────────────────────────
        if ($user->organization_id) {
            $context['kpis'] = $this->getRelevantKpis($user, $input['current_module'] ?? null);
        }

        // ── Événements du jour ──────────────────────────────────────────────
        $context['todays_events'] = $this->getTodaysEvents($user);

        // ── Tâches urgentes / en retard ─────────────────────────────────────
        $context['overdue_tasks_count'] = $this->getOverdueTasksCount($user);

        // ── Filtrage des données sensibles ──────────────────────────────────
        $context = $this->filterSensitiveData($context);

        // ── Troncature ──────────────────────────────────────────────────────
        $context = $this->truncateContext($context);

        return $context;
    }

    // =========================================================================
    // SOUS-CONTEXTES
    // =========================================================================

    private function getLicenseContext(object $org): array
    {
        $license = Cache::remember(
            "org_license:{$org->id}",
            now()->addMinutes(15),
            fn() => $org->licenses()->where('status', 'active')->latest()->first()
        );

        return [
            'plan'             => $license?->plan_name ?? 'Essai',
            'modules_enabled'  => $license?->modules ?? $org->modules_enabled ?? [],
            'max_users'        => $license?->max_users ?? 5,
            'license_status'   => $license?->status ?? 'trial',
            'license_ends_at'  => $license?->ends_at?->toDateString(),
        ];
    }

    private function getRelevantKpis(User $user, ?string $module): array
    {
        $kpis = [];
        $orgId = $user->organization_id;

        try {
            // KPIs toujours pertinents
            $kpis['pending_notifications'] = \DB::table('notifications')
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->count();

            // KPIs selon le module actif
            switch ($module) {
                case 'courrier':
                    $kpis['unread_mail'] = \DB::table('mail_registry')
                        ->where('organization_id', $orgId)
                        ->where('status', 'received')
                        ->count();
                    break;

                case 'taches':
                case 'projets':
                    $kpis['my_tasks_todo'] = \DB::table('tasks')
                        ->where('organization_id', $orgId)
                        ->where('status', 'todo')
                        ->whereExists(fn($q) => $q->from('task_assignees')
                            ->whereColumn('task_assignees.task_id', 'tasks.id')
                            ->where('task_assignees.user_id', $user->id))
                        ->count();
                    break;

                case 'agenda':
                    $kpis['events_this_week'] = \DB::table('events')
                        ->where('organization_id', $orgId)
                        ->whereBetween('start_at', [now()->startOfWeek(), now()->endOfWeek()])
                        ->count();
                    break;
            }

        } catch (\Throwable $e) {
            Log::warning('ContextBuilder::getRelevantKpis failed', ['error' => $e->getMessage()]);
        }

        return $kpis;
    }

    private function getTodaysEvents(User $user): array
    {
        try {
            return \DB::table('events')
                ->join('event_participants', 'events.id', '=', 'event_participants.event_id')
                ->where('events.organization_id', $user->organization_id)
                ->where('event_participants.user_id', $user->id)
                ->whereDate('events.start_at', now()->toDateString())
                ->orderBy('events.start_at')
                ->limit(5)
                ->get(['events.title', 'events.start_at', 'events.location'])
                ->map(fn($e) => [
                    'title'    => $e->title,
                    'start_at' => $e->start_at,
                    'location' => $e->location,
                ])
                ->toArray();

        } catch (\Throwable) {
            return [];
        }
    }

    private function getOverdueTasksCount(User $user): int
    {
        try {
            return \DB::table('tasks')
                ->where('organization_id', $user->organization_id)
                ->where('due_date', '<', now()->toDateString())
                ->whereNotIn('status', ['done', 'cancelled'])
                ->whereExists(fn($q) => $q->from('task_assignees')
                    ->whereColumn('task_assignees.task_id', 'tasks.id')
                    ->where('task_assignees.user_id', $user->id))
                ->count();

        } catch (\Throwable) {
            return 0;
        }
    }

    // =========================================================================
    // SECURITE
    // =========================================================================

    /**
     * Supprime récursivement les clés sensibles du contexte.
     */
    private function filterSensitiveData(array $data): array
    {
        foreach ($data as $key => $value) {
            if (in_array(strtolower((string) $key), self::SENSITIVE_FIELDS)) {
                unset($data[$key]);
                continue;
            }
            if (is_array($value)) {
                $data[$key] = $this->filterSensitiveData($value);
            }
        }
        return $data;
    }

    /**
     * Tronque le contexte pour ne pas dépasser la fenêtre de contexte LLM.
     */
    private function truncateContext(array $context): array
    {
        $json = json_encode($context);

        if (strlen($json) <= self::MAX_CONTEXT_CHARS) {
            return $context;
        }

        // Stratégie : supprimer les champs les moins importants
        $fieldsToTruncate = ['kpis', 'todays_events'];

        foreach ($fieldsToTruncate as $field) {
            unset($context[$field]);
            $json = json_encode($context);
            if (strlen($json) <= self::MAX_CONTEXT_CHARS) {
                break;
            }
        }

        return $context;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function isBusinessHours(\Carbon\Carbon $now): bool
    {
        $hour      = (int) $now->format('H');
        $dayOfWeek = (int) $now->format('N'); // 1=lundi, 7=dimanche

        return $dayOfWeek <= 5 && $hour >= 8 && $hour < 18;
    }

    /**
     * Génère le texte de contexte à injecter dans le prompt LLM.
     */
    public function toPromptText(array $context): string
    {
        $lines = [
            "=== CONTEXTE UTILISATEUR ===",
            "Prénom : " . ($context['user_name'] ?? 'Utilisateur'),
            "Rôle : " . ($context['user_role'] ?? 'employee'),
            "Organisation : " . ($context['organization'] ?? 'N/A'),
            "Plan : " . ($context['plan'] ?? 'Essai'),
            "Modules actifs : " . implode(', ', (array)($context['modules_enabled'] ?? [])),
            "Date/heure : " . ($context['current_datetime'] ?? now()->toDateTimeString()),
        ];

        if (! empty($context['todays_events'])) {
            $lines[] = "Événements aujourd'hui :";
            foreach ($context['todays_events'] as $event) {
                $lines[] = "  - {$event['title']} à {$event['start_at']}";
            }
        }

        if (($context['overdue_tasks_count'] ?? 0) > 0) {
            $lines[] = "Tâches en retard : " . $context['overdue_tasks_count'];
        }

        if (! empty($context['kpis'])) {
            $lines[] = "KPIs :";
            foreach ($context['kpis'] as $key => $val) {
                $lines[] = "  {$key}: {$val}";
            }
        }

        return implode("\n", $lines);
    }
}
