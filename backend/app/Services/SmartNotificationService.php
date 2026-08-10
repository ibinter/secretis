<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * SmartNotificationService — Système de notifications intelligentes IBIG SECRETIS
 *
 * Ce service implémente un moteur de décision qui détermine :
 *  - SI une notification doit être envoyée (scoring de pertinence 0-100)
 *  - PAR QUEL canal l'envoyer (Push, WhatsApp, Email, Reverb)
 *  - COMMENT regrouper les notifications similaires
 *  - QUAND envoyer le digest quotidien
 *
 * Apprentissage continu : chaque interaction utilisateur (ouverture, rejet, snooze)
 * ajuste les scores de pertinence pour les prochaines notifications du même type.
 */
class SmartNotificationService
{
    // ─── Seuil minimum de pertinence pour envoyer ──────────────────────────────
    private const RELEVANCE_THRESHOLD = 60;

    // ─── Fenêtre de regroupement (minutes) ────────────────────────────────────
    private const BUNDLE_WINDOW_MINUTES = 5;

    // ─── Délai minimum entre deux notifications du même type (minutes) ─────────
    private const COOLDOWN_MINUTES = 10;

    // ─── Pondérations du score de pertinence ──────────────────────────────────
    private const WEIGHTS = [
        'base_priority'   => 30,   // Priorité intrinsèque du type
        'user_activity'   => 20,   // Utilisateur actif récemment
        'channel_pref'    => 20,   // Canal préféré disponible
        'time_context'    => 15,   // Heure appropriée
        'learned_pref'    => 15,   // Préférences apprises via interactions
    ];

    // ─── Priorité de base par type de notification ─────────────────────────────
    private const TYPE_BASE_PRIORITY = [
        'visitor_arrived'   => 95,
        'mail_urgent'       => 90,
        'task_overdue'      => 85,
        'meeting_reminder'  => 80,
        'task_assigned'     => 65,
        'message'           => 60,
        'circular'          => 50,
        'event_created'     => 45,
        'stock_alert'       => 70,
        'birthday'          => 40,
        'digest'            => 30,
        'system'            => 35,
    ];

    // ─── Constructeur ─────────────────────────────────────────────────────────

    public function __construct(
        private NotificationService $notificationService,
    ) {}

    // =========================================================================
    // shouldNotify() — Décision d'envoi
    // =========================================================================

    /**
     * Détermine si une notification doit être envoyée à cet utilisateur.
     *
     * Calcule un score de pertinence (0-100) basé sur :
     *  - La priorité intrinsèque du type
     *  - L'activité récente de l'utilisateur
     *  - Le contexte temporel (heure de silence, heure de travail)
     *  - Les préférences apprises
     *
     * @param  User   $user             Destinataire
     * @param  string $notificationType Type (task_assigned, visitor_arrived, etc.)
     * @param  array  $context          Données contextuelles supplémentaires
     * @return bool   true si la notification doit être envoyée
     */
    public function shouldNotify(User $user, string $notificationType, array $context = []): bool
    {
        // 1. Vérification préliminaire : mode Ne Pas Déranger
        if ($this->isDoNotDisturb($user)) {
            // Seules les urgences absolues passent en NDD
            $basePriority = self::TYPE_BASE_PRIORITY[$notificationType] ?? 50;
            if ($basePriority < 90) {
                Log::channel('notifications')->debug('SmartNotif: Bloqué (NDD)', [
                    'user_id' => $user->id,
                    'type'    => $notificationType,
                ]);
                return false;
            }
        }

        // 2. Vérifier si l'utilisateur est dans une heure de silence
        if ($this->isInSilentHours($user)) {
            $basePriority = self::TYPE_BASE_PRIORITY[$notificationType] ?? 50;
            if ($basePriority < 85) {
                Log::channel('notifications')->debug('SmartNotif: Bloqué (heure de silence)', [
                    'user_id' => $user->id,
                    'type'    => $notificationType,
                    'hour'    => now()->hour,
                ]);
                return false;
            }
        }

        // 3. Vérifier le cooldown (éviter le spam)
        if ($this->isInCooldown($user, $notificationType)) {
            Log::channel('notifications')->debug('SmartNotif: Bloqué (cooldown)', [
                'user_id' => $user->id,
                'type'    => $notificationType,
            ]);
            return false;
        }

        // 4. Vérifier l'inactivité utilisateur (>24h → pas de notifications non-urgentes)
        if ($this->isUserInactive($user)) {
            $basePriority = self::TYPE_BASE_PRIORITY[$notificationType] ?? 50;
            if ($basePriority < 70) {
                Log::channel('notifications')->debug('SmartNotif: Bloqué (utilisateur inactif)', [
                    'user_id' => $user->id,
                    'type'    => $notificationType,
                ]);
                return false;
            }
        }

        // 5. Calculer le score de pertinence
        $score = $this->calculateRelevanceScore($user, $notificationType, $context);

        Log::channel('notifications')->info('SmartNotif: Score calculé', [
            'user_id' => $user->id,
            'type'    => $notificationType,
            'score'   => $score,
            'send'    => $score >= self::RELEVANCE_THRESHOLD,
        ]);

        if ($score >= self::RELEVANCE_THRESHOLD) {
            // Enregistrer l'envoi pour le cooldown
            $this->recordSent($user, $notificationType);
            return true;
        }

        return false;
    }

    // =========================================================================
    // getOptimalChannel() — Choix du canal d'envoi
    // =========================================================================

    /**
     * Choisit le canal de notification optimal selon le contexte.
     *
     * Logique de sélection :
     *  - urgent  → WhatsApp + Push simultanément
     *  - normal  → Push si app ouverte, sinon Push standard
     *  - low     → Email uniquement
     *
     * @param  User   $user     Destinataire
     * @param  string $priority urgent | normal | low
     * @return string Canal sélectionné : 'whatsapp_push' | 'push' | 'reverb' | 'email'
     */
    public function getOptimalChannel(User $user, string $priority): string
    {
        $hour          = now()->hour;
        $isWorkHour    = $hour >= 8 && $hour < 18;
        $isAppOpen     = $this->isAppOpen($user);
        $hasWhatsApp   = !empty($user->phone) && config('secretis.whatsapp.token');
        $hasPush       = $user->getPreference('push_token') !== null;

        // Urgent : tous les canaux disponibles
        if ($priority === 'urgent') {
            if ($hasWhatsApp && $hasPush) {
                return 'whatsapp_push';
            }
            if ($hasPush) {
                return 'push';
            }
            if ($hasWhatsApp) {
                return 'whatsapp';
            }
            return 'email';
        }

        // Normal : Push si app ouverte ou token disponible
        if ($priority === 'normal') {
            if ($isAppOpen) {
                return 'reverb'; // WebSocket temps réel
            }
            if ($hasPush && $isWorkHour) {
                return 'push';
            }
            return 'email';
        }

        // Low priority : email uniquement
        return 'email';
    }

    // =========================================================================
    // bundleNotifications() — Regroupement de notifications similaires
    // =========================================================================

    /**
     * Regroupe les notifications similaires en attente pour un utilisateur.
     *
     * Au lieu d'envoyer "5 tâches assignées" → "5 nouvelles tâches assignées".
     * Fenêtre de regroupement : BUNDLE_WINDOW_MINUTES (5 min par défaut).
     *
     * @param  User  $user Utilisateur cible
     * @return array Tableau de bundles [{type, count, items, title, body}]
     */
    public function bundleNotifications(User $user): array
    {
        $windowStart = now()->subMinutes(self::BUNDLE_WINDOW_MINUTES);

        // Récupérer les notifications non lues récentes
        $pending = AppNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->where('created_at', '>=', $windowStart)
            ->orderBy('created_at', 'desc')
            ->get();

        if ($pending->isEmpty()) {
            return [];
        }

        // Grouper par type
        $grouped = $pending->groupBy('type');
        $bundles = [];

        foreach ($grouped as $type => $notifications) {
            $count = $notifications->count();

            if ($count === 1) {
                // Pas de regroupement nécessaire
                $bundles[] = [
                    'type'    => $type,
                    'count'   => 1,
                    'bundled' => false,
                    'items'   => $notifications->toArray(),
                    'title'   => $notifications->first()->title,
                    'body'    => $notifications->first()->body,
                ];
            } else {
                // Créer un bundle
                $bundles[] = [
                    'type'    => $type,
                    'count'   => $count,
                    'bundled' => true,
                    'items'   => $notifications->toArray(),
                    'title'   => $this->getBundleTitle($type, $count),
                    'body'    => $this->getBundleBody($type, $notifications->pluck('title')->toArray()),
                ];
            }
        }

        return $bundles;
    }

    // =========================================================================
    // learnFromInteraction() — Apprentissage des préférences
    // =========================================================================

    /**
     * Ajuste les scores de pertinence en fonction des interactions utilisateur.
     *
     * Actions reconnues :
     *  - 'opened'    : L'utilisateur a ouvert la notification → +5 au score
     *  - 'dismissed' : L'utilisateur a rejeté la notification → -10 au score
     *  - 'snoozed'   : L'utilisateur a snooze → -3 au score (pertinence ok mais moment pas idéal)
     *  - 'liked'     : Feedback positif → +10
     *  - 'disliked'  : Feedback négatif → -15
     *
     * @param  User   $user           Utilisateur
     * @param  string $notificationId ID de la notification
     * @param  string $action         opened | dismissed | snoozed | liked | disliked
     */
    public function learnFromInteraction(User $user, string $notificationId, string $action): void
    {
        $notification = AppNotification::where('id', $notificationId)
            ->where('user_id', $user->id)
            ->first();

        if (!$notification) {
            return;
        }

        $type = $notification->type;

        // Delta d'ajustement selon l'action
        $delta = match ($action) {
            'opened'    =>  5,
            'snoozed'   => -3,
            'dismissed' => -10,
            'liked'     =>  10,
            'disliked'  => -15,
            default     =>  0,
        };

        if ($delta === 0) {
            return;
        }

        // Récupérer le score appris actuel pour ce type
        $prefKey   = "notifications.learned.{$type}.score";
        $current   = (int) ($user->getPreference($prefKey, 0));
        $newScore  = max(-50, min(50, $current + $delta)); // Borner entre -50 et +50

        // Persister dans les préférences utilisateur
        $preferences = $user->preferences ?? [];
        data_set($preferences, str_replace('.', '.', $prefKey), $newScore);
        $user->update(['preferences' => $preferences]);

        // Enregistrer l'interaction pour audit
        Log::channel('notifications')->info('SmartNotif: Interaction apprise', [
            'user_id'         => $user->id,
            'notification_id' => $notificationId,
            'type'            => $type,
            'action'          => $action,
            'delta'           => $delta,
            'new_score'       => $newScore,
        ]);
    }

    // =========================================================================
    // getNotificationDigest() — Digest quotidien
    // =========================================================================

    /**
     * Génère le digest quotidien personnalisé pour un utilisateur.
     *
     * Contient :
     *  - Résumé de la veille (tâches complétées, courriers reçus, réunions passées)
     *  - Agenda du jour (événements à venir)
     *  - Tâches urgentes dues aujourd'hui
     *  - Alertes critiques (stocks épuisés, congés approuvés, etc.)
     *
     * @param  User  $user Utilisateur cible
     * @return array Digest structuré
     */
    public function getNotificationDigest(User $user): array
    {
        $today     = Carbon::today();
        $yesterday = Carbon::yesterday();
        $todayEnd  = Carbon::today()->endOfDay();

        // ── Résumé de la veille ──────────────────────────────────────────────
        $yesterdayNotifications = AppNotification::where('user_id', $user->id)
            ->whereBetween('created_at', [$yesterday->startOfDay(), $yesterday->endOfDay()])
            ->get();

        $summary = [
            'total'     => $yesterdayNotifications->count(),
            'by_type'   => $yesterdayNotifications->groupBy('type')
                ->map(fn($g) => $g->count())
                ->toArray(),
            'important' => $yesterdayNotifications
                ->filter(fn($n) => in_array($n->type, ['mail_urgent', 'task_overdue', 'visitor_arrived']))
                ->values()
                ->toArray(),
        ];

        // ── Agenda du jour ───────────────────────────────────────────────────
        $todayEvents = \App\Models\Event::where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('participants', fn($q2) => $q2->where('user_id', $user->id));
            })
            ->whereDate('start_at', $today)
            ->orderBy('start_at')
            ->get(['id', 'title', 'start_at', 'end_at', 'location', 'type'])
            ->toArray();

        // ── Tâches urgentes du jour ──────────────────────────────────────────
        $urgentTasks = \App\Models\Task::where('assigned_to', $user->id)
            ->whereIn('status', ['todo', 'in_progress'])
            ->where(function ($q) use ($todayEnd) {
                $q->whereDate('due_date', '<=', Carbon::today())
                  ->orWhere('priority', 'urgent');
            })
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END")
            ->limit(5)
            ->get(['id', 'title', 'due_date', 'priority', 'status'])
            ->toArray();

        // ── Courriers urgents non traités ────────────────────────────────────
        $urgentMails = \App\Models\MailRegistry::where('organization_id', $user->organization_id)
            ->where('priority', 'urgent')
            ->whereNull('processed_at')
            ->orderBy('received_at', 'desc')
            ->limit(3)
            ->get(['id', 'reference', 'subject', 'received_at', 'priority'])
            ->toArray();

        return [
            'generated_at'  => now()->toIso8601String(),
            'user_id'       => $user->id,
            'yesterday'     => $summary,
            'today_events'  => $todayEvents,
            'urgent_tasks'  => $urgentTasks,
            'urgent_mails'  => $urgentMails,
            'greeting'      => $this->getGreeting($user),
            'day_summary'   => sprintf(
                "%d événement(s) aujourd'hui · %d tâche(s) urgente(s) · %d courrier(s) en attente",
                count($todayEvents),
                count($urgentTasks),
                count($urgentMails)
            ),
        ];
    }

    // =========================================================================
    // Méthodes publiques utilitaires
    // =========================================================================

    /**
     * Vérifie si l'utilisateur est en mode "Ne Pas Déranger".
     */
    public function isDoNotDisturb(User $user): bool
    {
        return (bool) $user->getPreference('notifications.do_not_disturb', false);
    }

    /**
     * Vérifie si l'heure actuelle est dans les heures de silence de l'utilisateur.
     * Par défaut : pas de silence configuré → retourne false.
     */
    public function isInSilentHours(User $user): bool
    {
        $silentHours = $user->getPreference('notifications.silent_hours', []);
        if (empty($silentHours)) {
            return false;
        }

        $now        = now();
        $dayOfWeek  = strtolower($now->format('l')); // monday, tuesday, etc.
        $currentMin = $now->hour * 60 + $now->minute;

        // Vérifier les heures de silence pour ce jour de la semaine
        foreach ($silentHours as $rule) {
            $days = $rule['days'] ?? ['all'];
            if (!in_array('all', $days) && !in_array($dayOfWeek, $days)) {
                continue;
            }

            $startMin = $this->timeToMinutes($rule['start'] ?? '22:00');
            $endMin   = $this->timeToMinutes($rule['end'] ?? '07:00');

            // Gérer le cas qui traverse minuit (ex: 22h → 7h)
            if ($startMin > $endMin) {
                if ($currentMin >= $startMin || $currentMin < $endMin) {
                    return true;
                }
            } else {
                if ($currentMin >= $startMin && $currentMin < $endMin) {
                    return true;
                }
            }
        }

        return false;
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    /**
     * Calcule le score de pertinence global (0-100).
     */
    private function calculateRelevanceScore(User $user, string $type, array $context): int
    {
        $scores = [];

        // 1. Priorité de base du type
        $basePriority = self::TYPE_BASE_PRIORITY[$type] ?? 50;
        $scores['base_priority'] = ($basePriority / 100) * self::WEIGHTS['base_priority'];

        // 2. Activité récente de l'utilisateur
        $lastActivity  = $user->last_login_at ? Carbon::parse($user->last_login_at) : null;
        $minutesAgo    = $lastActivity ? now()->diffInMinutes($lastActivity) : 1440;
        $activityScore = $minutesAgo < 30 ? 100 : ($minutesAgo < 120 ? 70 : ($minutesAgo < 480 ? 40 : 10));
        $scores['user_activity'] = ($activityScore / 100) * self::WEIGHTS['user_activity'];

        // 3. Disponibilité du canal préféré
        $prefKey      = "notifications.channels.{$type}";
        $prefChannels = $user->getPreference($prefKey, ['push', 'email']);
        $channelScore = is_array($prefChannels) && !empty($prefChannels) ? 100 : 30;
        $scores['channel_pref'] = ($channelScore / 100) * self::WEIGHTS['channel_pref'];

        // 4. Contexte temporel (heures de travail = score plus élevé)
        $hour          = now()->hour;
        $isWorkHour    = $hour >= 8 && $hour < 18;
        $isPeakHour    = ($hour >= 9 && $hour < 12) || ($hour >= 14 && $hour < 17);
        $timeScore     = $isPeakHour ? 100 : ($isWorkHour ? 70 : 30);
        $scores['time_context'] = ($timeScore / 100) * self::WEIGHTS['time_context'];

        // 5. Préférences apprises via interactions
        $learnedScore = (int) $user->getPreference("notifications.learned.{$type}.score", 0);
        $normalizedLearned = 50 + $learnedScore; // Centrer autour de 50
        $normalizedLearned = max(0, min(100, $normalizedLearned));
        $scores['learned_pref'] = ($normalizedLearned / 100) * self::WEIGHTS['learned_pref'];

        $total = (int) array_sum($scores);

        // Bonus contextuels
        if (isset($context['is_urgent']) && $context['is_urgent']) {
            $total = min(100, $total + 20);
        }
        if (isset($context['mentions_user']) && $context['mentions_user']) {
            $total = min(100, $total + 10);
        }

        return max(0, min(100, $total));
    }

    /**
     * Vérifie si l'utilisateur est inactif depuis plus de 24h.
     */
    private function isUserInactive(User $user): bool
    {
        if (!$user->last_login_at) {
            return true;
        }
        return Carbon::parse($user->last_login_at)->diffInHours(now()) > 24;
    }

    /**
     * Vérifie si une notification du même type a été envoyée récemment (cooldown).
     */
    private function isInCooldown(User $user, string $type): bool
    {
        $cacheKey = "notif_cooldown:{$user->id}:{$type}";
        return Cache::has($cacheKey);
    }

    /**
     * Enregistre l'envoi d'une notification pour le cooldown.
     */
    private function recordSent(User $user, string $type): void
    {
        $cacheKey = "notif_cooldown:{$user->id}:{$type}";
        // Les types urgents ont un cooldown plus court
        $minutes = in_array($type, ['visitor_arrived', 'mail_urgent']) ? 2 : self::COOLDOWN_MINUTES;
        Cache::put($cacheKey, true, now()->addMinutes($minutes));
    }

    /**
     * Vérifie si l'application est actuellement ouverte par l'utilisateur.
     * Basé sur la session active (présence dans le cache de sessions).
     */
    private function isAppOpen(User $user): bool
    {
        $cacheKey = "user_app_active:{$user->id}";
        return Cache::has($cacheKey);
    }

    /**
     * Génère le titre d'un bundle de notifications.
     */
    private function getBundleTitle(string $type, int $count): string
    {
        return match ($type) {
            'task_assigned'  => "{$count} nouvelles tâches vous ont été assignées",
            'message'        => "{$count} nouveaux messages",
            'mail_urgent'    => "{$count} courriers urgents en attente",
            'event_created'  => "{$count} nouveaux événements sur votre agenda",
            'circular'       => "{$count} nouvelles circulaires",
            'visitor'        => "{$count} visiteurs enregistrés",
            default          => "{$count} nouvelles notifications",
        };
    }

    /**
     * Génère le corps d'un bundle de notifications.
     */
    private function getBundleBody(string $type, array $titles): string
    {
        $preview = array_slice($titles, 0, 3);
        $rest    = count($titles) - count($preview);

        $body = implode(', ', $preview);
        if ($rest > 0) {
            $body .= " et {$rest} autre(s)";
        }

        return $body;
    }

    /**
     * Convertit une heure "HH:MM" en minutes depuis minuit.
     */
    private function timeToMinutes(string $time): int
    {
        [$h, $m] = array_map('intval', explode(':', $time));
        return $h * 60 + $m;
    }

    /**
     * Génère un message de salutation personnalisé.
     */
    private function getGreeting(User $user): string
    {
        $hour     = now()->hour;
        $firstName = explode(' ', $user->name)[0];

        $greeting = match (true) {
            $hour < 12 => "Bonjour",
            $hour < 18 => "Bon après-midi",
            default    => "Bonsoir",
        };

        return "{$greeting}, {$firstName} !";
    }
}
