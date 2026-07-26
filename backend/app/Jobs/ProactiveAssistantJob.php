<?php

namespace App\Jobs;

use App\Models\AppNotification;
use App\Models\Employee;
use App\Models\Event;
use App\Models\Supply;
use App\Models\Task;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\SmartNotificationService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ProactiveAssistantJob — Assistant proactif IBIG SECRETIS
 *
 * Déclenché par le CRON toutes les 30 minutes.
 * Analyse le contexte de chaque utilisateur actif et génère des suggestions
 * proactives pertinentes (réunions imminentes, stocks épuisés, anniversaires, etc.)
 *
 * Enregistrement dans le Kernel (app/Console/Kernel.php) :
 *   $schedule->job(new ProactiveAssistantJob)->everyThirtyMinutes();
 *
 * Suggestions générées :
 *  - "Votre réunion commence dans 15 min — Ordre du jour disponible"
 *  - "Vous avez 5 tâches en retard — Voulez-vous un rapport ?"
 *  - "Bon anniversaire à Jean Konan (anniversaire entreprise aujourd'hui)"
 *  - "Le stock de papier A4 est épuisé (0 unités)"
 */
class ProactiveAssistantJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 300; // 5 minutes

    public function __construct()
    {
        $this->onQueue('proactive');
    }

    // =========================================================================
    // handle() — Logique principale
    // =========================================================================

    public function handle(
        SmartNotificationService $smartNotifService,
        NotificationService      $notificationService,
    ): void {
        $startTime = now();

        Log::debug('ProactiveAssistantJob: Démarrage', ['time' => $startTime->toIso8601String()]);

        // Traiter uniquement les utilisateurs actifs (connectés dans les dernières 8h)
        $activeUsers = $this->getActiveUsers();

        foreach ($activeUsers as $user) {
            try {
                $this->analyzeUserContext($user, $smartNotifService, $notificationService);
            } catch (\Throwable $e) {
                Log::error('ProactiveAssistantJob: Erreur utilisateur', [
                    'user_id' => $user->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        Log::debug('ProactiveAssistantJob: Terminé', [
            'users_processed' => $activeUsers->count(),
            'duration_ms'     => now()->diffInMilliseconds($startTime),
        ]);
    }

    // =========================================================================
    // analyzeUserContext() — Analyse du contexte utilisateur
    // =========================================================================

    /**
     * Analyse le contexte complet d'un utilisateur et déclenche les suggestions pertinentes.
     */
    private function analyzeUserContext(
        User                     $user,
        SmartNotificationService $smartNotifService,
        NotificationService      $notificationService,
    ): void {
        $suggestions = [];

        // 1. Réunion imminente (dans les 15-30 prochaines minutes)
        $imminent = $this->checkImminentMeeting($user);
        if ($imminent) {
            $suggestions[] = $imminent;
        }

        // 2. Tâches en retard
        $overdueSuggestion = $this->checkOverdueTasks($user);
        if ($overdueSuggestion) {
            $suggestions[] = $overdueSuggestion;
        }

        // 3. Anniversaires d'entreprise
        $birthdaySuggestion = $this->checkBirthdays($user);
        if ($birthdaySuggestion) {
            $suggestions[] = $birthdaySuggestion;
        }

        // 4. Alertes de stock
        $stockAlerts = $this->checkStockAlerts($user);
        foreach ($stockAlerts as $alert) {
            $suggestions[] = $alert;
        }

        // 5. Envoyer les suggestions pertinentes
        foreach ($suggestions as $suggestion) {
            // Vérifier via SmartNotificationService si on doit envoyer
            if ($smartNotifService->shouldNotify($user, $suggestion['type'], $suggestion['context'])) {
                $notificationService->send(
                    user:  $user,
                    type:  $suggestion['type'],
                    title: $suggestion['title'],
                    body:  $suggestion['body'],
                    data:  $suggestion['data'] ?? [],
                );

                Log::info('ProactiveAssistantJob: Suggestion envoyée', [
                    'user_id' => $user->id,
                    'type'    => $suggestion['type'],
                    'title'   => $suggestion['title'],
                ]);
            }
        }
    }

    // =========================================================================
    // Vérifications contextuelles
    // =========================================================================

    /**
     * Vérifie si une réunion/événement commence dans les 15-30 prochaines minutes.
     */
    private function checkImminentMeeting(User $user): ?array
    {
        $now         = now();
        $windowStart = $now->copy()->addMinutes(14);
        $windowEnd   = $now->copy()->addMinutes(31);

        $imminentEvent = Event::where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('participants', fn($q2) => $q2->where('user_id', $user->id));
            })
            ->whereBetween('start_at', [$windowStart, $windowEnd])
            ->with(['participants:id,name'])
            ->first();

        if (!$imminentEvent) {
            return null;
        }

        // Éviter de renvoyer plusieurs fois pour le même événement
        $cacheKey = "proactive_meeting_notif:{$user->id}:{$imminentEvent->id}";
        if (Cache::has($cacheKey)) {
            return null;
        }
        Cache::put($cacheKey, true, now()->addHour());

        $minutesUntil    = (int) $now->diffInMinutes($imminentEvent->start_at);
        $participantNames = $imminentEvent->participants->pluck('name')->join(', ');

        return [
            'type'    => 'meeting_reminder',
            'title'   => "Réunion dans {$minutesUntil} min",
            'body'    => "« {$imminentEvent->title} »"
                       . ($participantNames ? " avec {$participantNames}" : '')
                       . ". Ordre du jour disponible.",
            'context' => ['is_urgent' => $minutesUntil <= 15],
            'data'    => [
                'action_url' => "/agenda/events/{$imminentEvent->id}",
                'event_id'   => $imminentEvent->id,
                'type'       => 'meeting_brief',
            ],
        ];
    }

    /**
     * Vérifie les tâches en retard de l'utilisateur.
     */
    private function checkOverdueTasks(User $user): ?array
    {
        // Ne vérifier qu'une fois par heure par utilisateur
        $cacheKey = "proactive_overdue:{$user->id}";
        if (Cache::has($cacheKey)) {
            return null;
        }

        $overdueCount = Task::where('assigned_to', $user->id)
            ->whereIn('status', ['todo', 'in_progress'])
            ->where('due_date', '<', now()->toDateString())
            ->count();

        if ($overdueCount === 0) {
            return null;
        }

        Cache::put($cacheKey, true, now()->addHour());

        $label = $overdueCount === 1 ? '1 tâche en retard' : "{$overdueCount} tâches en retard";

        return [
            'type'    => 'task_overdue',
            'title'   => "Attention : {$label}",
            'body'    => "Vous avez {$label}. Voulez-vous générer un rapport de suivi ?",
            'context' => ['is_urgent' => $overdueCount > 3],
            'data'    => [
                'action_url'   => '/taches?filter=overdue',
                'overdue_count'=> $overdueCount,
            ],
        ];
    }

    /**
     * Vérifie les anniversaires d'entreprise du jour.
     */
    private function checkBirthdays(User $user): ?array
    {
        // Ne vérifier qu'une fois par jour
        $cacheKey = "proactive_birthday:{$user->id}:" . now()->toDateString();
        if (Cache::has($cacheKey)) {
            return null;
        }

        $today = now();

        // Chercher les employés dont c'est l'anniversaire d'embauche aujourd'hui
        $birthdays = Employee::where('organization_id', $user->organization_id)
            ->whereRaw('MONTH(hire_date) = ? AND DAY(hire_date) = ?', [
                $today->month,
                $today->day,
            ])
            ->where('status', 'active')
            ->get(['id', 'first_name', 'last_name', 'hire_date']);

        if ($birthdays->isEmpty()) {
            return null;
        }

        Cache::put($cacheKey, true, now()->endOfDay());

        $names = $birthdays->map(fn($e) =>
            "{$e->first_name} {$e->last_name} (" . $today->year - Carbon::parse($e->hire_date)->year . " ans)"
        )->join(', ');

        return [
            'type'    => 'birthday',
            'title'   => "Anniversaire d'entreprise aujourd'hui",
            'body'    => "Pensez à féliciter : {$names}",
            'context' => ['is_urgent' => false],
            'data'    => [
                'action_url' => '/rh/employes',
                'employees'  => $birthdays->pluck('id')->toArray(),
            ],
        ];
    }

    /**
     * Vérifie les alertes de stock pour les fournitures.
     */
    private function checkStockAlerts(User $user): array
    {
        // Seulement pour les utilisateurs avec accès aux ressources
        if (!$user->hasPermissionTo('resources.view')) {
            return [];
        }

        // Ne vérifier qu'une fois par 2 heures
        $cacheKey = "proactive_stock:{$user->organization_id}";
        if (Cache::has($cacheKey)) {
            return [];
        }

        $criticalSupplies = Supply::where('organization_id', $user->organization_id)
            ->whereRaw('current_stock <= minimum_stock')
            ->orderBy('current_stock')
            ->limit(5)
            ->get(['id', 'name', 'current_stock', 'unit']);

        if ($criticalSupplies->isEmpty()) {
            return [];
        }

        Cache::put($cacheKey, true, now()->addHours(2));

        $alerts = [];
        foreach ($criticalSupplies as $supply) {
            $isEmpty = $supply->current_stock <= 0;
            $alerts[] = [
                'type'    => 'stock_alert',
                'title'   => $isEmpty ? "Stock épuisé : {$supply->name}" : "Stock critique : {$supply->name}",
                'body'    => $isEmpty
                    ? "Le stock de « {$supply->name} » est épuisé (0 {$supply->unit}). Une commande urgente est nécessaire."
                    : "Le stock de « {$supply->name} » est critique ({$supply->current_stock} {$supply->unit} restant(s)).",
                'context' => ['is_urgent' => $isEmpty],
                'data'    => [
                    'action_url' => "/ressources/fournitures/{$supply->id}",
                    'supply_id'  => $supply->id,
                ],
            ];
        }

        return $alerts;
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    /**
     * Récupère les utilisateurs actifs (connectés dans les dernières 8 heures).
     */
    private function getActiveUsers()
    {
        return User::where('status', 'active')
            ->where(function ($q) {
                $q->where('last_login_at', '>=', now()->subHours(8))
                  ->orWhere('last_login_at', null); // Inclure les non-connectés pour les alertes critiques
            })
            ->limit(500) // Sécurité
            ->get();
    }

    /**
     * Gère l'échec du job.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProactiveAssistantJob: Échec', [
            'error' => $exception->getMessage(),
        ]);
    }
}
