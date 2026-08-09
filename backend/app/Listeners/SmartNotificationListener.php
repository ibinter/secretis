<?php

namespace App\Listeners;

use App\Events\MessageSent;
use App\Events\NotificationCreated;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\SmartNotificationService;
use Illuminate\Events\Dispatcher;
use Illuminate\Support\Facades\Log;

/**
 * SmartNotificationListener — Connecteur entre les événements SECRETIS et le SmartNotificationService
 *
 * Ce listener écoute TOUS les événements métier de l'application et applique
 * le filtre intelligent avant chaque envoi de notification.
 *
 * Inscription dans EventServiceProvider :
 *   protected $listen = [
 *       // Événements système (définis dans app/Events/)
 *       \App\Events\MessageSent::class          => [SmartNotificationListener::class],
 *       \App\Events\TaskAssigned::class         => [SmartNotificationListener::class],
 *       \App\Events\EventCreated::class         => [SmartNotificationListener::class],
 *       \App\Events\CourrierReceived::class     => [SmartNotificationListener::class],
 *       \App\Events\VisitorArrived::class       => [SmartNotificationListener::class],
 *       \App\Events\LeaveStatusChanged::class   => [SmartNotificationListener::class],
 *       \App\Events\StockCritical::class        => [SmartNotificationListener::class],
 *       \App\Events\CircularPublished::class    => [SmartNotificationListener::class],
 *   ];
 *
 * Toutes les décisions d'envoi sont loggées dans le channel 'notifications'.
 */
class SmartNotificationListener
{
    public function __construct(
        private SmartNotificationService $smartNotifService,
        private NotificationService      $notificationService,
    ) {}

    // =========================================================================
    // subscribe() — Inscription à tous les événements en une fois
    // =========================================================================

    /**
     * Inscription à tous les événements SECRETIS.
     * Utilisé avec la méthode $events->subscribe() dans EventServiceProvider.
     */
    public function subscribe(Dispatcher $events): array
    {
        return [
            // Messages internes
            'App\Events\MessageSent'        => 'handleMessageSent',

            // Tâches
            'App\Events\TaskAssigned'       => 'handleTaskAssigned',
            'App\Events\TaskOverdue'        => 'handleTaskOverdue',

            // Agenda
            'App\Events\EventCreated'       => 'handleEventCreated',
            'App\Events\MeetingCreated'     => 'handleMeetingCreated',

            // Courrier
            'App\Events\CourrierReceived'   => 'handleCourrierReceived',

            // Accueil / Visiteurs
            'App\Events\VisitorArrived'     => 'handleVisitorArrived',

            // RH
            'App\Events\LeaveStatusChanged' => 'handleLeaveStatusChanged',

            // Ressources
            'App\Events\StockCritical'      => 'handleStockCritical',

            // Circulaires
            'App\Events\CircularPublished'  => 'handleCircularPublished',
        ];
    }

    // =========================================================================
    // Handlers par type d'événement
    // =========================================================================

    /**
     * Message interne envoyé.
     */
    public function handleMessageSent(MessageSent $event): void
    {
        $message      = $event->message;
        $conversation = $message->conversation;

        if (!$conversation) {
            return;
        }

        // Notifier tous les participants sauf l'expéditeur
        $recipients = $conversation->participants()
            ->where('user_id', '!=', $message->user_id)
            ->with('user')
            ->get();

        foreach ($recipients as $participant) {
            $user = $participant->user;
            if (!$user) continue;

            $this->dispatchWithSmartFilter(
                user:    $user,
                type:    'message',
                title:   "Nouveau message de {$message->user->name}",
                // Colonne réelle : `body` (pas `content`), et elle peut être nulle (message supprimé / pièce jointe seule).
                body:    mb_substr((string) $message->body, 0, 100) . (mb_strlen((string) $message->body) > 100 ? '…' : ''),
                data:    [
                    'action_url'      => "/messages/{$conversation->id}",
                    'conversation_id' => $conversation->id,
                    'sender_name'     => $message->user->name,
                ],
                context: ['mentions_user' => str_contains((string) $message->body, "@{$user->name}")],
            );
        }
    }

    /**
     * Tâche assignée à un utilisateur.
     */
    public function handleTaskAssigned(object $event): void
    {
        $task     = $event->task;
        $assignee = $event->assignee ?? User::find($task->assigned_to);

        if (!$assignee) return;

        $this->dispatchWithSmartFilter(
            user:    $assignee,
            type:    'task_assigned',
            title:   "Nouvelle tâche assignée",
            body:    "« {$task->title} »"
                   . ($task->due_date ? " — Échéance : {$task->due_date->format('d/m/Y')}" : ''),
            data:    [
                'action_url' => "/taches/{$task->id}",
                'task_id'    => $task->id,
                'priority'   => $task->priority,
            ],
            context: ['is_urgent' => $task->priority === 'urgent'],
        );
    }

    /**
     * Tâche en retard détectée.
     */
    public function handleTaskOverdue(object $event): void
    {
        $task     = $event->task;
        $assignee = User::find($task->assigned_to);

        if (!$assignee) return;

        $daysLate = now()->diffInDays($task->due_date);

        $this->dispatchWithSmartFilter(
            user:    $assignee,
            type:    'task_overdue',
            title:   "Tâche en retard",
            body:    "« {$task->title} » est en retard de {$daysLate} jour(s).",
            data:    [
                'action_url' => "/taches/{$task->id}",
                'task_id'    => $task->id,
                'days_late'  => $daysLate,
            ],
            context: ['is_urgent' => true],
        );
    }

    /**
     * Événement d'agenda créé.
     */
    public function handleEventCreated(object $event): void
    {
        $calEvent   = $event->event;
        $creator    = $event->creator ?? $calEvent->creator;
        $participants = $calEvent->participants ?? collect();

        foreach ($participants as $participant) {
            if ($participant->id === $creator?->id) continue;

            $this->dispatchWithSmartFilter(
                user:    $participant,
                type:    'event_created',
                title:   "Nouvel événement : {$calEvent->title}",
                body:    "Le {$calEvent->start_at->format('d/m/Y à H:i')}"
                       . ($calEvent->location ? " — {$calEvent->location}" : ''),
                data:    [
                    'action_url' => "/agenda/events/{$calEvent->id}",
                    'event_id'   => $calEvent->id,
                ],
                context: [],
            );
        }
    }

    /**
     * Réunion planifiée.
     */
    public function handleMeetingCreated(object $event): void
    {
        $meeting      = $event->meeting;
        $participants = $meeting->participants ?? collect();

        foreach ($participants as $participant) {
            $user = $participant->user ?? null;
            if (!$user) continue;

            $this->dispatchWithSmartFilter(
                user:    $user,
                type:    'meeting',
                title:   "Réunion planifiée : {$meeting->title}",
                body:    "Le {$meeting->start_at->format('d/m/Y à H:i')}"
                       . ($meeting->location ? " en {$meeting->location}" : ''),
                data:    [
                    'action_url' => "/reunions/{$meeting->id}",
                    'meeting_id' => $meeting->id,
                ],
                context: [],
            );
        }
    }

    /**
     * Courrier reçu.
     */
    public function handleCourrierReceived(object $event): void
    {
        $mail         = $event->mail;
        $isUrgent     = $mail->priority === 'urgent';
        $organization = $mail->organization;

        // Notifier les utilisateurs responsables du courrier
        $recipients = User::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['secretariat', 'admin', 'direction']))
            ->get();

        foreach ($recipients as $user) {
            $this->dispatchWithSmartFilter(
                user:    $user,
                type:    $isUrgent ? 'mail_urgent' : 'mail_received',
                title:   $isUrgent ? "Courrier urgent reçu" : "Nouveau courrier",
                body:    "Réf. {$mail->reference} — {$mail->subject}",
                data:    [
                    'action_url' => "/courrier/{$mail->id}",
                    'mail_id'    => $mail->id,
                    'priority'   => $mail->priority,
                ],
                context: ['is_urgent' => $isUrgent],
            );
        }
    }

    /**
     * Visiteur arrivé à l'accueil.
     */
    public function handleVisitorArrived(object $event): void
    {
        $visitor = $event->visitor;
        $host    = $event->host ?? User::find($visitor->host_user_id);

        if (!$host) return;

        $this->dispatchWithSmartFilter(
            user:    $host,
            type:    'visitor_arrived',
            title:   "Visiteur en attente à l'accueil",
            body:    "{$visitor->name}" . ($visitor->company ? " ({$visitor->company})" : '') . " vous attend.",
            data:    [
                'action_url'  => "/accueil/visiteurs",
                'visitor_id'  => $visitor->id,
                'visitor_name'=> $visitor->name,
            ],
            context: ['is_urgent' => true],
        );
    }

    /**
     * Statut d'une demande de congé changé.
     */
    public function handleLeaveStatusChanged(object $event): void
    {
        $leave  = $event->leave;
        $user   = User::find($leave->user_id);

        if (!$user) return;

        $statusLabels = [
            'approved' => 'approuvée',
            'rejected' => 'refusée',
            'pending'  => 'en attente de validation',
        ];

        $leaveStatusLabel = $statusLabels[$leave->status] ?? $leave->status;
        $this->dispatchWithSmartFilter(
            user:    $user,
            type:    'leave_status_changed',
            title:   "Demande de congé {$leaveStatusLabel}",
            body:    "Votre demande du {$leave->start_date->format('d/m/Y')} au {$leave->end_date->format('d/m/Y')} a été {$leaveStatusLabel}.",
            data:    [
                'action_url' => '/rh/conges',
                'leave_id'   => $leave->id,
                'status'     => $leave->status,
            ],
            context: [],
        );
    }

    /**
     * Stock critique détecté.
     */
    public function handleStockCritical(object $event): void
    {
        $supply = $event->supply;

        // Notifier les gestionnaires des ressources
        $managers = User::where('organization_id', $supply->organization_id)
            ->where('status', 'active')
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['admin', 'resources_manager']))
            ->get();

        foreach ($managers as $user) {
            $this->dispatchWithSmartFilter(
                user:    $user,
                type:    'stock_alert',
                title:   "Alerte stock : {$supply->name}",
                body:    "Stock actuel : {$supply->current_stock} {$supply->unit} (seuil minimum : {$supply->minimum_stock}).",
                data:    [
                    'action_url' => "/ressources/fournitures/{$supply->id}",
                    'supply_id'  => $supply->id,
                ],
                context: ['is_urgent' => $supply->current_stock <= 0],
            );
        }
    }

    /**
     * Circulaire publiée.
     */
    public function handleCircularPublished(object $event): void
    {
        $circular     = $event->circular;
        $organization = $circular->organization;

        // Notifier tous les utilisateurs actifs de l'organisation
        $users = User::where('organization_id', $organization->id)
            ->where('status', 'active')
            ->chunk(100, function ($chunk) use ($circular) {
                foreach ($chunk as $user) {
                    $this->dispatchWithSmartFilter(
                        user:    $user,
                        type:    'circular',
                        title:   "Nouvelle circulaire",
                        body:    $circular->title,
                        data:    [
                            'action_url'  => "/circulaires/{$circular->id}",
                            'circular_id' => $circular->id,
                        ],
                        context: ['is_urgent' => $circular->priority === 'urgent'],
                    );
                }
            });
    }

    // =========================================================================
    // dispatchWithSmartFilter() — Méthode centrale de filtrage intelligent
    // =========================================================================

    /**
     * Filtre intelligent avant chaque envoi de notification.
     * Appelle shouldNotify() et log la décision.
     */
    private function dispatchWithSmartFilter(
        User   $user,
        string $type,
        string $title,
        string $body,
        array  $data = [],
        array  $context = [],
    ): void {
        $shouldSend = $this->smartNotifService->shouldNotify($user, $type, $context);

        Log::channel('notifications')->info('SmartNotificationListener: Décision', [
            'user_id' => $user->id,
            'type'    => $type,
            'send'    => $shouldSend,
            'reason'  => $shouldSend ? 'Score suffisant' : 'Score insuffisant / filtré',
        ]);

        // Déterminer la priorité et le canal optimal
        $priority = in_array($type, ['visitor_arrived', 'mail_urgent', 'task_overdue']) ? 'urgent' : 'normal';
        $channel  = $this->smartNotifService->getOptimalChannel($user, $priority);

        // La notification in-app est TOUJOURS enregistrée : la cloche est un
        // journal consultable, pas une interruption. Le filtre intelligent ne
        // gouverne que les canaux intrusifs (email, SMS, WhatsApp, push).
        // Sans cette distinction, une tâche assignée le soir ou à un employé
        // qui ne s'est pas connecté depuis 24 h disparaissait sans trace :
        // `task_assigned` (priorité 65) est sous les seuils d'heure de silence
        // (85) et d'inactivité (70).
        $this->notificationService->send(
            user:   $user,
            type:   $type,
            title:  $title,
            body:   $body,
            data:   array_merge($data, ['smart_channel' => $shouldSend ? $channel : 'app']),
            silent: !$shouldSend,
        );

        if (!$shouldSend) {
            return;
        }

        // WhatsApp si canal urgent — et si l'état de licence l'ouvre. L'API
        // WhatsApp Business est un coût variable fermé au palier Découverte
        // (cahier section 3.4) : sans ce garde-fou, chaque espace gratuit
        // devient une charge mensuelle. La notification in-app, elle, a déjà
        // été enregistrée juste au-dessus : rien n'est perdu.
        $licenceOuvreWhatsApp = app(\App\Services\LicenceGarde::class)->autorise('whatsapp', $user);

        if ($licenceOuvreWhatsApp && in_array($channel, ['whatsapp', 'whatsapp_push']) && $user->phone) {
            $this->notificationService->sendWhatsApp(
                phone:   $user->phone,
                message: "{$title}\n{$body}",
            );
        }
    }
}
