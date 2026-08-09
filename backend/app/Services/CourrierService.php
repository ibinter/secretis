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
    /**
     * Compteur métier de SECRETIS (cahier section 6). Le PLAFOND, lui, n'est
     * écrit nulle part ici : il est lu dans licence.config.json par le moteur.
     */
    public const COMPTEUR = 'courriers_mois';

    public function __construct(
        private AuditService $auditService,
        private \App\Services\NotificationService $notificationService,
    ) {}

    // -------------------------------------------------------------------------
    // Plafond du palier Découverte (cahier sections 3.7 et 9.5)
    // -------------------------------------------------------------------------

    /**
     * Contrôle AVANT l'écriture.
     *
     * Le refus n'est pas silencieux : il est journalisé (section 9.8). Un
     * espace qui bute cinq fois sur le plafond est le prospect le plus chaud
     * du portefeuille — c'est la contrepartie commerciale du plafond.
     *
     * @throws \App\Exceptions\PlafondAtteintException
     */
    private function exigerQuota(User $user): void
    {
        $licence = app(\App\Services\LicenceService::class);
        $orgId   = (int) $user->organization_id;

        if ($licence->peutCreer($orgId, self::COMPTEUR)) {
            return;
        }

        $licence->journaliserDepassement($orgId, self::COMPTEUR, $user->id);

        throw new \App\Exceptions\PlafondAtteintException(self::COMPTEUR);
    }

    /**
     * Comptabilise APRÈS que l'écriture a réussi.
     *
     * Volontairement séparé du contrôle : compter avant l'insertion ferait
     * consommer un quota par une saisie qu'une contrainte ou une validation
     * finit par refuser. Placé dans la même transaction que le courrier, le
     * compteur et l'enregistrement vivent et meurent ensemble.
     */
    private function compterCourrier(User $user): void
    {
        app(\App\Services\LicenceService::class)
            ->incrementer((int) $user->organization_id, self::COMPTEUR);
    }

    /**
     * Restitue une unité de compteur à la suppression d'un courrier.
     *
     * `courriers_mois` est un FLUX, pas un stock : la période comptée est celle
     * du mois en cours. Archiver en septembre un courrier de juillet ne doit
     * donc PAS libérer une place de septembre — sinon il suffirait de supprimer
     * de vieux courriers pour se rouvrir le mois courant indéfiniment.
     */
    public function decompterCourrier(MailRegistry $mail): void
    {
        $licence = app(\App\Services\LicenceService::class);
        $orgId   = (int) $mail->organization_id;

        if ($licence->estMensuel(self::COMPTEUR)) {
            $enregistreLe = $mail->created_at ?? now();
            $moisCourrier = Carbon::parse($enregistreLe)
                ->timezone(config('app.timezone'))
                ->format('Y-m');

            // `periode()` est appelée sans organisation, exactement comme le
            // fait `incrementer()` : décrémenter sur une autre période que
            // celle qui a été incrémentée créerait un décalage permanent.
            if ($moisCourrier !== trim($licence->periode(self::COMPTEUR))) {
                return;
            }
        }

        $licence->decrementer($orgId, self::COMPTEUR);
    }

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
    /**
     * Référence du registre : REF-{ENTRANT|SORTANT}-{année}-{numéro}.
     *
     * Le numéro était obtenu par un `count()` des courriers de l'organisation,
     * ce qui posait trois problèmes à la fois :
     *
     *   — il IGNORAIT LES SUPPRIMÉS (`whereNull('deleted_at')`), donc archiver
     *     une pièce faisait retomber le compte et le courrier suivant
     *     réutilisait un numéro déjà pris : violation d'unicité, erreur 500 ;
     *   — il était SUJET À COURSE, ce que le code reconnaissait lui-même dans
     *     un commentaire sans y remédier — deux enregistrements simultanés
     *     recevaient le même numéro ;
     *   — et l'unicité en base portait sur la référence SEULE, alors que la
     *     numérotation repart à 1 par organisation : la première pièce de tout
     *     nouvel espace entrait en collision avec celle de l'organisation 4.
     *
     * Le numéro vient désormais d'un compteur dédié, incrémenté par
     * `ON CONFLICT … RETURNING` : une seule requête, atomique, sans lecture
     * préalable ni verrou explicite. Un numéro attribué ne revient jamais —
     * c'est ce qu'on attend d'un registre.
     */
    public function generateReference(string $type, int|string $organizationId): string
    {
        $annee  = Carbon::now()->year;
        $prefix = $type === 'incoming' ? 'ENTRANT' : 'SORTANT';

        // Volontairement HORS transaction applicative : le compteur doit
        // avancer même si l'enregistrement du courrier échoue ensuite. Un trou
        // dans la numérotation est sans conséquence ; un numéro réattribué en
        // a une.
        $numero = DB::selectOne('
            INSERT INTO mail_registry_counters (organization_id, type, year, last_number, created_at, updated_at)
            VALUES (?, ?, ?, 1, NOW(), NOW())
            ON CONFLICT (organization_id, type, year)
            DO UPDATE SET last_number = mail_registry_counters.last_number + 1, updated_at = NOW()
            RETURNING last_number
        ', [$organizationId, $type, $annee])->last_number;

        return sprintf('REF-%s-%d-%05d', $prefix, $annee, $numero);
    }

    // -------------------------------------------------------------------------
    // Enregistrement courrier
    // -------------------------------------------------------------------------

    /**
     * Enregistre un courrier entrant.
     */
    public function registerIncoming(array $data, User $user): MailRegistry
    {
        $this->exigerQuota($user);

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

            $this->compterCourrier($user);

            return $mail;
        });
    }

    /**
     * Enregistre un courrier sortant.
     */
    public function registerOutgoing(array $data, User $user): MailRegistry
    {
        $this->exigerQuota($user);

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

            $this->compterCourrier($user);

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

        // Une réponse est un courrier départ enregistré au registre : elle
        // consomme le compteur comme n'importe quel autre courrier. L'exclure
        // ouvrirait un contournement trivial du plafond.
        $this->exigerQuota($user);

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

            $this->compterCourrier($user);

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
