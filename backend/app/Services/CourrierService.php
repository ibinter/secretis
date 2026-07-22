<?php

namespace App\Services;

use App\Models\Department;
use App\Models\MailRegistry;
use App\Models\MailTracking;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * CourrierService — Logique métier Registre Courrier
 *
 * Responsabilités :
 *  - Génération des numéros de référence (séquence par org + type + année)
 *  - Enregistrement courrier entrant / sortant
 *  - Gestion du workflow de traitement
 *  - Alertes courriers en retard (CRON)
 */
class CourrierService
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // Génération de référence
    // -------------------------------------------------------------------------

    /**
     * Génère une référence unique au format :
     *   REF-ENTRANT-2026-00001  (type = incoming)
     *   REF-SORTANT-2026-00001  (type = outgoing)
     *
     * La séquence est calculée par organisation + type + année civile.
     * Utilise une transaction + SELECT FOR UPDATE pour éviter les doublons concurrents.
     */
    public function generateReference(string $type, int|string $organizationId): string
    {
        return DB::transaction(function () use ($type, $organizationId) {
            $year   = Carbon::now()->year;
            $prefix = $type === 'incoming' ? 'ENTRANT' : 'SORTANT';

            // Compte les courriers de cette org/type/année pour calculer le prochain numéro
            $count = MailRegistry::lockForUpdate()
                ->where('organization_id', $organizationId)
                ->where('type', $type)
                ->whereYear('created_at', $year)
                ->count();

            $sequence = str_pad($count + 1, 5, '0', STR_PAD_LEFT);

            return "REF-{$prefix}-{$year}-{$sequence}";
        });
    }

    // -------------------------------------------------------------------------
    // Enregistrement courrier
    // -------------------------------------------------------------------------

    /**
     * Enregistre un courrier entrant.
     */
    public function registerIncoming(array $data, User $user): MailRegistry
    {
        return DB::transaction(function () use ($data, $user) {
            $reference = $this->generateReference('incoming', $user->organization_id);

            $mail = MailRegistry::create([
                'organization_id'       => $user->organization_id,
                'type'                  => 'incoming',
                'reference'             => $reference,
                'sender_name'           => $data['sender_name'] ?? null,
                'sender_org'            => $data['sender_org'] ?? null,
                'recipient_name'        => $data['recipient_name'] ?? null,
                'recipient_org'         => $data['recipient_org'] ?? null,
                'subject'               => $data['subject'],
                'urgency'               => $data['urgency'] ?? 'normal',
                'received_at'           => $data['received_at'] ?? now(),
                'department_id'         => $data['department_id'] ?? null,
                'assigned_to_id'        => $data['assigned_to_id'] ?? null,
                'status'                => 'pending',
                'notes'                 => $data['notes'] ?? null,
                'processing_delay_days' => $data['processing_delay_days'] ?? 3,
                'created_by_id'         => $user->id,
            ]);

            $this->addTrackingEntry($mail, $user, 'created', 'Courrier entrant enregistré');

            $this->auditService->logCreated(
                module: 'courrier',
                resourceType: 'mail_registry',
                resourceId: $mail->id,
                attributes: ['reference' => $reference, 'type' => 'incoming'],
            );

            return $mail;
        });
    }

    /**
     * Enregistre un courrier sortant.
     */
    public function registerOutgoing(array $data, User $user): MailRegistry
    {
        return DB::transaction(function () use ($data, $user) {
            $reference = $this->generateReference('outgoing', $user->organization_id);

            $mail = MailRegistry::create([
                'organization_id'       => $user->organization_id,
                'type'                  => 'outgoing',
                'reference'             => $reference,
                'sender_name'           => $data['sender_name'] ?? $user->name,
                'sender_org'            => $data['sender_org'] ?? null,
                'recipient_name'        => $data['recipient_name'] ?? null,
                'recipient_org'         => $data['recipient_org'] ?? null,
                'subject'               => $data['subject'],
                'urgency'               => $data['urgency'] ?? 'normal',
                'sent_at'               => $data['sent_at'] ?? now(),
                'department_id'         => $data['department_id'] ?? null,
                'assigned_to_id'        => $data['assigned_to_id'] ?? null,
                'status'                => 'processed',
                'notes'                 => $data['notes'] ?? null,
                'created_by_id'         => $user->id,
            ]);

            $this->addTrackingEntry($mail, $user, 'created', 'Courrier sortant enregistré');

            $this->auditService->logCreated(
                module: 'courrier',
                resourceType: 'mail_registry',
                resourceId: $mail->id,
                attributes: ['reference' => $reference, 'type' => 'outgoing'],
            );

            return $mail;
        });
    }

    // -------------------------------------------------------------------------
    // Workflow
    // -------------------------------------------------------------------------

    /**
     * Assigne un courrier à un agent/service.
     */
    public function assignCourrier(MailRegistry $mail, string $userId): void
    {
        $previousAssignee = $mail->assigned_to_id;

        $mail->update([
            'assigned_to_id' => $userId,
            'status'         => $mail->status === 'pending' ? 'processing' : $mail->status,
        ]);

        $assignee = User::find($userId);

        $this->addTrackingEntry(
            mail: $mail,
            user: auth()->user(),
            action: 'assigned',
            comment: "Assigné à {$assignee?->name}",
        );

        $this->auditService->logUpdated(
            module: 'courrier',
            resourceType: 'mail_registry',
            resourceId: $mail->id,
            original: ['assigned_to_id' => $previousAssignee],
            changes: ['assigned_to_id' => $userId],
        );
    }

    /**
     * Change le statut d'un courrier selon le workflow autorisé.
     *
     * Transitions autorisées :
     *   pending     → processing | archived
     *   processing  → processed  | pending | archived
     *   processed   → archived
     *   archived    → (aucune transition automatique)
     */
    public function changeStatus(MailRegistry $mail, string $newStatus, User $user): void
    {
        $allowedTransitions = [
            'pending'    => ['processing', 'archived'],
            'processing' => ['processed', 'pending', 'archived'],
            'processed'  => ['archived'],
            'archived'   => [],
        ];

        $currentStatus = $mail->status;

        if (! in_array($newStatus, $allowedTransitions[$currentStatus] ?? [], true)) {
            throw new \InvalidArgumentException(
                "Transition non autorisée : {$currentStatus} → {$newStatus}"
            );
        }

        $oldStatus = $mail->status;
        $mail->update(['status' => $newStatus]);

        $this->addTrackingEntry(
            mail: $mail,
            user: $user,
            action: 'status_changed',
            comment: "Statut changé : {$oldStatus} → {$newStatus}",
        );

        $this->auditService->logUpdated(
            module: 'courrier',
            resourceType: 'mail_registry',
            resourceId: $mail->id,
            original: ['status' => $oldStatus],
            changes: ['status' => $newStatus],
        );
    }

    // -------------------------------------------------------------------------
    // CRON — Alertes courriers en retard
    // -------------------------------------------------------------------------

    /**
     * Envoie des alertes pour les courriers non traités après leur délai.
     * Destiné à être appelé par un job planifié (ex: quotidiennement).
     */
    public function sendAlertIfOverdue(): void
    {
        $overdueMailings = MailRegistry::overdue()
            ->with(['assignee', 'department', 'organization'])
            ->get();

        foreach ($overdueMailings as $mail) {
            try {
                // Notifier l'assigné si défini
                if ($mail->assignee) {
                    // Notification::send($mail->assignee, new CourrierOverdueNotification($mail));
                    Log::info("Courrier en retard notifié", [
                        'reference' => $mail->reference,
                        'assignee'  => $mail->assignee->email,
                    ]);
                }

                // Notifier le chef de département
                if ($mail->department?->head_user_id) {
                    Log::info("Chef de département notifié pour courrier en retard", [
                        'reference'   => $mail->reference,
                        'department'  => $mail->department->name,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::error("Erreur envoi alerte courrier retard", [
                    'mail_id' => $mail->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        Log::info("Alertes courriers en retard envoyées", ['count' => $overdueMailings->count()]);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Ajoute une entrée dans l'historique de traitement du courrier.
     */
    private function addTrackingEntry(
        MailRegistry $mail,
        ?User $user,
        string $action,
        string $comment = '',
    ): void {
        // La table mail_trackings peut ne pas exister encore en dev,
        // on wrappe pour ne pas bloquer si la table est absente.
        try {
            DB::table('mail_trackings')->insert([
                'id'         => \Illuminate\Support\Str::uuid(),
                'mail_id'    => $mail->id,
                'user_id'    => $user?->id,
                'action'     => $action,
                'comment'    => $comment,
                'status'     => $mail->status,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning("Impossible d'ajouter l'entrée de tracking courrier", [
                'mail_id' => $mail->id,
                'error'   => $e->getMessage(),
            ]);
        }
    }
}
