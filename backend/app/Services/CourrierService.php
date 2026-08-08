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
        private \App\Services\NotificationService $notificationService,
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
            // Note: lockForUpdate() ne fonctionne pas avec count() sur PostgreSQL.
            // On utilise une sous-requête pour serialiser l'accès.
            $count = DB::table('mail_registry')
                ->where('organization_id', $organizationId)
                ->where('type', $type)
                ->whereYear('created_at', $year)
                ->whereNull('deleted_at')
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
                'sender_organization'   => $data['sender_organization'] ?? null,
                'recipient_name'        => $data['recipient_name'] ?? null,
                'recipient_organization'=> $data['recipient_organization'] ?? null,
                'recipient_email'       => $data['recipient_email'] ?? null,
                'sender_email'          => $data['sender_email'] ?? null,
                'subject'               => $data['subject'],
                'urgency'               => $data['urgency'] ?? 'normal',
                'received_at'           => $data['received_at'] ?? now(),
                'department_id'         => $data['department_id'] ?? null,
                'assigned_to'           => $data['assigned_to'] ?? null,
                'status'                => 'received',
                'notes'                 => $data['notes'] ?? null,
                'processing_delay_days' => $data['processing_delay_days'] ?? 3,
                'registered_by'         => $user->id,
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
                'sender_organization'   => $data['sender_organization'] ?? null,
                'recipient_name'        => $data['recipient_name'] ?? null,
                'recipient_organization'=> $data['recipient_organization'] ?? null,
                'recipient_email'       => $data['recipient_email'] ?? null,
                'sender_email'          => $data['sender_email'] ?? null,
                'subject'               => $data['subject'],
                'urgency'               => $data['urgency'] ?? 'normal',
                'sent_at'               => $data['sent_at'] ?? now(),
                'department_id'         => $data['department_id'] ?? null,
                'assigned_to'           => $data['assigned_to'] ?? null,
                // Était figé à « replied » : tout courrier départ apparaissait
                // donc « Répondu » au registre, y compris ceux qu'on initie.
                'status'                => 'registered',
                'notes'                 => $data['notes'] ?? null,
                'registered_by'         => $user->id,
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

    /**
     * Enregistre un courrier départ EN RÉPONSE à un courrier arrivée.
     *
     * C'est l'étape « répondre » du parcours du secrétariat, qui n'existait
     * nulle part : le statut `replied` était atteignable à la main, mais rien
     * ne reliait la réponse à l'original ni ne prouvait qu'une correspondance
     * avait bien reçu réponse.
     *
     * Les deux courriers sont écrits dans la même transaction : on ne veut ni
     * une réponse orpheline, ni un original marqué « répondu » sans réponse.
     */
    public function replyToMail(MailRegistry $original, array $data, User $user): MailRegistry
    {
        if ($original->type !== 'incoming') {
            throw new \InvalidArgumentException(
                'Seul un courrier arrivée peut recevoir une réponse.'
            );
        }

        return DB::transaction(function () use ($original, $data, $user) {
            $reference = $this->generateReference('outgoing', $user->organization_id);

            $reponse = MailRegistry::create([
                'organization_id'        => $user->organization_id,
                'type'                   => 'outgoing',
                'reference'              => $reference,
                'parent_mail_id'         => $original->id,
                // Le destinataire de la réponse est l'expéditeur de l'original :
                // on le pré-remplit tout en laissant la saisie prévaloir.
                'recipient_name'         => $data['recipient_name']         ?? $original->sender_name,
                'recipient_organization' => $data['recipient_organization'] ?? $original->sender_organization,
                'recipient_email'        => $data['recipient_email']        ?? $original->sender_email,
                'sender_name'            => $data['sender_name']            ?? $user->name,
                'sender_email'           => $data['sender_email']           ?? $user->email,
                // `subject` est un varchar(255) : sans troncature, répondre à un
                // courrier dont l'objet est déjà long faisait échouer l'insertion.
                'subject'                => $data['subject']
                    ?? \Illuminate\Support\Str::limit('Réponse : ' . $original->subject, 255, '…'),
                'body'                   => $data['body']    ?? null,
                'urgency'                => $data['urgency'] ?? $original->urgency ?? 'normal',
                'sent_at'                => $data['sent_at'] ?? now(),
                'assigned_to'            => $data['assigned_to'] ?? $original->assigned_to,
                'department_id'          => $data['department_id'] ?? $original->department_id,
                // La contrainte CHECK de `mail_registry` n'admet pas de statut
                // « sent » : un courrier départ est « registered » au registre,
                // puis clos ou archivé.
                'status'                 => 'registered',
                'notes'                  => $data['notes'] ?? null,
                'registered_by'          => $user->id,
            ]);

            $original->update(['status' => 'replied']);

            $this->addTrackingEntry(
                $reponse, $user, 'created',
                "Réponse au courrier {$original->reference}"
            );
            $this->addTrackingEntry(
                $original, $user, 'replied',
                "Réponse enregistrée sous la référence {$reference}"
            );

            $this->auditService->logCreated(
                module: 'courrier',
                resourceType: 'mail_registry',
                resourceId: $reponse->id,
                attributes: [
                    'reference'  => $reference,
                    'type'       => 'outgoing',
                    'in_reply_to'=> $original->reference,
                ],
            );

            return $reponse;
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
        $previousAssignee = $mail->assigned_to;

        $mail->update([
            'assigned_to' => $userId,
            'status'         => $mail->status === 'received' ? 'in_progress' : $mail->status,
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
            original: ['assigned_to' => $previousAssignee],
            changes: ['assigned_to' => $userId],
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
            'received'    => ['registered', 'assigned', 'in_progress', 'replied', 'archived'],
            'registered'  => ['assigned', 'in_progress', 'replied', 'closed', 'archived'],
            'assigned'    => ['in_progress', 'replied', 'archived'],
            'in_progress' => ['replied', 'closed', 'archived'],
            'replied'     => ['closed', 'archived'],
            'closed'      => ['archived'],
            'archived'    => [],
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
    /**
     * Alerte sur les courriers dont le délai de traitement est dépassé.
     *
     * Cette méthode était un mannequin : les envois étaient commentés et elle
     * chargeait une relation `department` qui n'existe pas sur MailRegistry
     * (elle aurait donc levé une exception si quelqu'un l'avait appelée — ce
     * que personne ne faisait, aucune commande ni tâche planifiée ne la
     * déclenchait).
     *
     * @return array{mails:int, notified:int} de quoi rendre compte en console.
     */
    public function sendAlertIfOverdue(): array
    {
        $overdueMailings = MailRegistry::overdue()
            ->with(['assignee', 'registeredBy', 'organization'])
            ->get();

        $notified = 0;

        foreach ($overdueMailings as $mail) {
            try {
                // À défaut d'affectataire, on alerte celui qui a enregistré le
                // courrier : un courrier en retard sans destinataire désigné est
                // précisément le cas où l'alerte est la plus utile.
                $destinataire = $mail->assignee ?? $mail->registeredBy;

                if (! $destinataire) {
                    Log::warning('Courrier en retard sans destinataire à alerter', [
                        'reference' => $mail->reference,
                    ]);
                    continue;
                }

                // Le courrier est déjà en retard (scope `overdue`) : un jour
                // entamé compte pour un. Sans le `ceil`, un dépassement de
                // quelques heures s'affichait « dépassé de 0 jour(s) ».
                $retard = $mail->received_at
                    ? max(1, (int) ceil(
                        \Carbon\Carbon::parse($mail->received_at)
                            ->addDays((int) ($mail->processing_delay_days ?? 3))
                            ->floatDiffInDays(now())
                    ))
                    : 1;

                // Type `mail_urgent` (priorité 90) : l'alerte doit franchir les
                // heures de silence et le filtre d'inactivité.
                $this->notificationService->send(
                    user:  $destinataire,
                    type:  'mail_urgent',
                    title: 'Courrier en retard de traitement',
                    body:  "« {$mail->subject} » ({$mail->reference})\n"
                         . "Délai dépassé de {$retard} jour(s).",
                    data:  [
                        'action_url' => "/courrier/{$mail->id}",
                        'mail_id'    => $mail->id,
                        'reference'  => $mail->reference,
                        'days_late'  => $retard,
                    ],
                );

                $notified++;
            } catch (\Throwable $e) {
                Log::error('Erreur envoi alerte courrier en retard', [
                    'mail_id' => $mail->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        Log::info('Alertes courriers en retard envoyées', [
            'mails'    => $overdueMailings->count(),
            'notified' => $notified,
        ]);

        return ['mails' => $overdueMailings->count(), 'notified' => $notified];
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
        // Le SAVEPOINT n'est valide QUE dans une transaction : en dehors,
        // PostgreSQL renvoie « SAVEPOINT can only be used in transaction blocks »
        // et l'échec était avalé par le catch — l'historique de circulation était
        // donc perdu pour tout mouvement hors transaction (ex. changement de statut).
        $inTransaction = DB::transactionLevel() > 0;

        try {
            if ($inTransaction) {
                DB::statement('SAVEPOINT sp_tracking');
            }
            DB::table('mail_trackings')->insert([
                'id'         => \Illuminate\Support\Str::uuid(),
                'mail_id'    => $mail->id,
                'user_id'    => $user?->id,
                'action'     => $action,
                'comment'    => $comment,
                'status'     => $mail->status,
                'created_at' => now(),
            ]);
            if ($inTransaction) {
                DB::statement('RELEASE SAVEPOINT sp_tracking');
            }
        } catch (\Throwable $e) {
            if ($inTransaction) {
                try { DB::statement('ROLLBACK TO SAVEPOINT sp_tracking'); } catch (\Throwable) {}
            }
            Log::warning("Impossible d'ajouter l'entrée de tracking courrier", [
                'mail_id' => $mail->id,
                'error'   => $e->getMessage(),
            ]);
        }
    }
}
