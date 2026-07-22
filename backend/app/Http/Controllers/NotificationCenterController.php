<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Services\SmartNotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * NotificationCenterController — Centre de notifications SECRETIS
 *
 * Endpoints :
 *   GET  /notifications/center        → Page Inertia du centre
 *   GET  /api/notifications/center    → Liste paginée + filtrée
 *   GET  /api/notifications/digest    → Digest du jour
 *   POST /api/notifications/snooze/{id} → Reporter une notification
 *   GET  /api/notifications/preferences → Préférences détaillées
 *   PUT  /api/notifications/preferences → Sauvegarder les préférences
 *   POST /api/notifications/feedback  → Like/dislike (apprentissage)
 *   GET  /api/notifications/stats     → Statistiques personnelles
 */
class NotificationCenterController extends Controller
{
    public function __construct(
        private SmartNotificationService $smartNotifService,
    ) {}

    // =========================================================================
    // center() — Page Inertia du Centre de Notifications
    // =========================================================================

    /**
     * Affiche la page principale du centre de notifications.
     * GET /notifications/center
     */
    public function center(): InertiaResponse
    {
        return Inertia::render('Notifications/Center', [
            'initialNotifications' => $this->getPaginatedNotifications(request(), 20),
            'unreadCount'          => $this->getUnreadCount(),
        ]);
    }

    // =========================================================================
    // list() — API : Liste paginée et filtrée
    // =========================================================================

    /**
     * Retourne les notifications paginées avec filtres.
     * GET /api/notifications/center
     *
     * Filtres disponibles :
     *  - unread_only : boolean
     *  - module      : string (agenda, courrier, taches, messages, etc.)
     *  - priority    : urgent | normal | low
     *  - archived    : boolean
     *  - search      : string
     *  - page        : int
     */
    public function list(Request $request): JsonResponse
    {
        $data = $this->getPaginatedNotifications($request, 25);
        return response()->json($data);
    }

    // =========================================================================
    // digest() — Digest du jour
    // =========================================================================

    /**
     * Retourne le digest personnalisé du jour.
     * GET /api/notifications/digest
     */
    public function digest(Request $request): JsonResponse
    {
        $user   = $request->user();
        $digest = $this->smartNotifService->getNotificationDigest($user);

        return response()->json([
            'digest'      => $digest,
            'generated_at'=> now()->toIso8601String(),
        ]);
    }

    // =========================================================================
    // snooze() — Reporter une notification
    // =========================================================================

    /**
     * Reporte une notification à plus tard.
     * POST /api/notifications/snooze/{id}
     *
     * Body : { delay: "1h" | "1d" | "1w" }
     */
    public function snooze(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'delay' => 'required|in:1h,1d,1w',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Délai invalide. Utilisez : 1h, 1d ou 1w.'], 422);
        }

        $user         = $request->user();
        $notification = AppNotification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        // Calculer la date de snooze
        $snoozedUntil = match ($request->input('delay')) {
            '1h' => now()->addHour(),
            '1d' => now()->addDay()->setHour(9)->setMinute(0), // Lendemain à 9h
            '1w' => now()->addWeek()->setHour(9)->setMinute(0), // Dans 1 semaine à 9h
        };

        $notification->update([
            'snoozed_until' => $snoozedUntil,
            'read_at'       => $notification->read_at ?? now(), // Marquer comme lu lors du snooze
        ]);

        // Apprentissage : snooze = l'utilisateur a vu mais pas maintenant
        $this->smartNotifService->learnFromInteraction($user, $id, 'snoozed');

        return response()->json([
            'success'       => true,
            'snoozed_until' => $snoozedUntil->toIso8601String(),
            'label'         => 'Rappel prévu le ' . $snoozedUntil->format('d/m/Y à H:i'),
        ]);
    }

    // =========================================================================
    // getPreferences() — Lire les préférences
    // =========================================================================

    /**
     * Retourne les préférences de notifications détaillées.
     * GET /api/notifications/preferences
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user = $request->user();

        $preferences = [
            // Préférences globales
            'do_not_disturb'  => $user->getPreference('notifications.do_not_disturb', false),
            'daily_digest'    => $user->getPreference('notifications.daily_digest', true),
            'digest_time'     => $user->getPreference('notifications.digest_time', '07:30'),
            'sound_enabled'   => $user->getPreference('notifications.sound_enabled', true),

            // Heures de silence
            'silent_hours'    => $user->getPreference('notifications.silent_hours', [
                ['days' => ['all'], 'start' => '22:00', 'end' => '07:00'],
            ]),

            // Canaux par type de notification
            'channels'        => $this->getChannelPreferences($user),

            // Préférences apprises (lecture seule)
            'learned_scores'  => $this->getLearnedScores($user),
        ];

        return response()->json($preferences);
    }

    // =========================================================================
    // updatePreferences() — Sauvegarder les préférences
    // =========================================================================

    /**
     * Sauvegarde les préférences de notifications.
     * PUT /api/notifications/preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'do_not_disturb'           => 'sometimes|boolean',
            'daily_digest'             => 'sometimes|boolean',
            'digest_time'              => 'sometimes|date_format:H:i',
            'sound_enabled'            => 'sometimes|boolean',
            'silent_hours'             => 'sometimes|array',
            'silent_hours.*.days'      => 'required_with:silent_hours|array',
            'silent_hours.*.start'     => 'required_with:silent_hours|date_format:H:i',
            'silent_hours.*.end'       => 'required_with:silent_hours|date_format:H:i',
            'channels'                 => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user        = $request->user();
        $preferences = $user->preferences ?? [];

        // Mettre à jour les préférences par clé
        $mappings = [
            'do_not_disturb' => 'notifications.do_not_disturb',
            'daily_digest'   => 'notifications.daily_digest',
            'digest_time'    => 'notifications.digest_time',
            'sound_enabled'  => 'notifications.sound_enabled',
            'silent_hours'   => 'notifications.silent_hours',
        ];

        foreach ($mappings as $inputKey => $prefKey) {
            if ($request->has($inputKey)) {
                data_set($preferences, $prefKey, $request->input($inputKey));
            }
        }

        // Préférences de canaux par type
        if ($request->has('channels')) {
            foreach ($request->input('channels') as $type => $channels) {
                data_set($preferences, "notifications.channels.{$type}", $channels);
            }
        }

        $user->update(['preferences' => $preferences]);

        return response()->json([
            'success' => true,
            'message' => 'Préférences sauvegardées.',
        ]);
    }

    // =========================================================================
    // feedback() — Like/Dislike (apprentissage)
    // =========================================================================

    /**
     * Enregistre un feedback sur une notification (like/dislike).
     * POST /api/notifications/feedback
     *
     * Body : { notification_id: string, action: "liked" | "disliked" }
     */
    public function feedback(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'notification_id' => 'required|string',
            'action'          => 'required|in:liked,disliked,opened,dismissed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $this->smartNotifService->learnFromInteraction(
            $user,
            $request->input('notification_id'),
            $request->input('action')
        );

        return response()->json(['success' => true]);
    }

    // =========================================================================
    // stats() — Statistiques personnelles
    // =========================================================================

    /**
     * Retourne les statistiques de notifications de l'utilisateur.
     * GET /api/notifications/stats
     */
    public function stats(Request $request): JsonResponse
    {
        $user  = $request->user();
        $since = Carbon::now()->subDays(30);

        $notifications = AppNotification::where('user_id', $user->id)
            ->where('created_at', '>=', $since)
            ->get(['type', 'read_at', 'created_at', 'data']);

        $total       = $notifications->count();
        $read        = $notifications->whereNotNull('read_at')->count();
        $readRate    = $total > 0 ? round(($read / $total) * 100) : 0;

        $byType      = $notifications->groupBy('type')
            ->map(fn($g) => ['count' => $g->count(), 'read' => $g->whereNotNull('read_at')->count()])
            ->toArray();

        $byDay       = $notifications
            ->groupBy(fn($n) => Carbon::parse($n->created_at)->toDateString())
            ->map(fn($g) => $g->count())
            ->toArray();

        return response()->json([
            'period'        => '30 derniers jours',
            'total'         => $total,
            'read'          => $read,
            'unread'        => $total - $read,
            'read_rate'     => $readRate,
            'by_type'       => $byType,
            'by_day'        => $byDay,
            'most_frequent' => $notifications->groupBy('type')->sortByDesc(fn($g) => $g->count())->keys()->first(),
        ]);
    }

    // =========================================================================
    // markRead() — Marquer comme lu
    // =========================================================================

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = AppNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notification->update(['read_at' => now()]);

        $this->smartNotifService->learnFromInteraction($request->user(), $id, 'opened');

        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $count = AppNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true, 'marked' => $count]);
    }

    // =========================================================================
    // archive() — Archiver une notification
    // =========================================================================

    public function archive(Request $request, string $id): JsonResponse
    {
        AppNotification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update([
                'archived_at' => now(),
                'read_at'     => now(),
            ]);

        return response()->json(['success' => true]);
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    private function getPaginatedNotifications(Request $request, int $perPage): array
    {
        $user    = $request->user();
        $query   = AppNotification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc');

        // Filtre : non lues seulement
        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        // Filtre : archivées
        if ($request->boolean('archived')) {
            $query->whereNotNull('archived_at');
        } else {
            $query->whereNull('archived_at');
        }

        // Filtre : module/type
        if ($request->filled('module')) {
            $moduleTypes = $this->getModuleTypes($request->input('module'));
            $query->whereIn('type', $moduleTypes);
        }

        // Filtre : recherche textuelle
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('body', 'LIKE', "%{$search}%");
            });
        }

        // Exclure les snoozées qui ne sont pas encore dues
        $query->where(function ($q) {
            $q->whereNull('snoozed_until')
              ->orWhere('snoozed_until', '<=', now());
        });

        $paginated    = $query->paginate($perPage);
        $unreadCount  = AppNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->whereNull('archived_at')
            ->count();

        return [
            'data'         => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'total'        => $paginated->total(),
            'unread_count' => $unreadCount,
        ];
    }

    private function getUnreadCount(): int
    {
        return AppNotification::where('user_id', auth()->id())
            ->whereNull('read_at')
            ->whereNull('archived_at')
            ->count();
    }

    private function getModuleTypes(string $module): array
    {
        return match ($module) {
            'agenda'   => ['meeting_reminder', 'event_created', 'meeting'],
            'courrier' => ['mail_urgent', 'mail_received', 'mail_assigned'],
            'taches'   => ['task_assigned', 'task_overdue', 'task_completed'],
            'messages' => ['message'],
            'rh'       => ['leave_approved', 'leave_rejected', 'birthday'],
            'accueil'  => ['visitor_arrived', 'visitor_appointment'],
            'stock'    => ['stock_alert'],
            'system'   => ['system', 'digest'],
            default    => [$module],
        };
    }

    private function getChannelPreferences(User $user): array
    {
        $types = [
            'task_assigned', 'task_overdue', 'message', 'mail_urgent',
            'meeting_reminder', 'visitor_arrived', 'circular', 'stock_alert',
            'birthday', 'digest', 'system',
        ];

        $channels = [];
        foreach ($types as $type) {
            $channels[$type] = $user->getPreference(
                "notifications.channels.{$type}",
                ['push', 'email'] // Défaut : Push + Email
            );
        }

        return $channels;
    }

    private function getLearnedScores(User $user): array
    {
        $learned = $user->getPreference('notifications.learned', []);
        return is_array($learned) ? $learned : [];
    }
}
