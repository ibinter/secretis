<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * DocumentWorkflowService — Gestion des workflows de validation documentaire
 *
 * Un workflow est instancié depuis un template défini par l'administrateur.
 * Il progresse étape par étape jusqu'à l'approbation finale ou le rejet.
 *
 * Actions disponibles par étape :
 *   - approve   : valide l'étape → passe à la suivante (ou complète si dernière)
 *   - reject    : annule le workflow, notifie l'auteur
 *   - send_back : renvoie à l'étape précédente pour révision
 */
class DocumentWorkflowService
{
    public function __construct(
        private NotificationService $notificationService,
        private AuditService $auditService,
    ) {}

    // -----------------------------------------------------------------------
    // Démarrage
    // -----------------------------------------------------------------------

    /**
     * Démarre un workflow pour un document.
     *
     * @return array Instance de workflow créée
     */
    public function startWorkflow(Document $document, int $templateId, int $startedBy): array
    {
        $template = DB::table('document_workflow_templates')
            ->where('id', $templateId)
            ->where('organization_id', $document->organization_id)
            ->where('is_active', true)
            ->first();

        if (! $template) {
            throw new \InvalidArgumentException("Template de workflow introuvable ou inactif : {$templateId}");
        }

        // Annuler un éventuel workflow en cours
        $existing = DB::table('document_workflow_instances')
            ->where('document_id', $document->id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->first();

        if ($existing) {
            DB::table('document_workflow_instances')
                ->where('id', $existing->id)
                ->update(['status' => 'cancelled', 'completed_at' => now()]);
        }

        $steps = json_decode($template->steps, true) ?? [];

        return DB::transaction(function () use ($document, $template, $steps, $startedBy) {
            // Créer l'instance
            $instanceId = DB::table('document_workflow_instances')->insertGetId([
                'document_id'   => $document->id,
                'template_id'   => $template->id,
                'organization_id' => $document->organization_id,
                'status'        => 'in_progress',
                'current_step'  => 1,
                'started_by'    => $startedBy,
                'started_at'    => now(),
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            // Créer les étapes
            foreach ($steps as $index => $step) {
                $stepOrder   = $index + 1;
                $approverId  = $step['approver_id'] ?? null;

                // Résoudre l'approbateur depuis le rôle si pas d'ID fixe
                if (! $approverId && isset($step['approver_role'])) {
                    $approverId = $this->resolveApproverByRole(
                        $step['approver_role'],
                        $document->organization_id
                    );
                }

                DB::table('document_workflow_steps')->insert([
                    'instance_id'    => $instanceId,
                    'step_name'      => $step['step_name'] ?? "Étape {$stepOrder}",
                    'step_order'     => $stepOrder,
                    'approver_id'    => $approverId,
                    'approver_role'  => $step['approver_role'] ?? null,
                    'status'         => $stepOrder === 1 ? 'in_progress' : 'pending',
                    'is_required'    => $step['is_required'] ?? true,
                    'timeout_hours'  => $step['timeout_hours'] ?? 72,
                    'assigned_at'    => $stepOrder === 1 ? now() : null,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            }

            // Mettre à jour le statut du document
            $document->update(['validation_status' => 'pending_validation']);

            // Notifier le premier approbateur
            $firstStep = DB::table('document_workflow_steps')
                ->where('instance_id', $instanceId)
                ->where('step_order', 1)
                ->first();

            if ($firstStep && $firstStep->approver_id) {
                $this->notifyApprover($firstStep, $document);
            }

            $this->auditService->log(
                action: 'workflow_started',
                module: 'ged',
                resourceType: 'document',
                resourceId: $document->id,
                newValues: ['template_id' => $template->id, 'instance_id' => $instanceId],
            );

            return DB::table('document_workflow_instances')->where('id', $instanceId)->first();
        });
    }

    // -----------------------------------------------------------------------
    // Traitement d'une étape
    // -----------------------------------------------------------------------

    /**
     * Traite une action sur une étape du workflow.
     *
     * @param string $action approve | reject | send_back
     */
    public function processStep(int $stepId, int $approverId, string $action, string $comment = ''): void
    {
        $step = DB::table('document_workflow_steps')->where('id', $stepId)->first();

        if (! $step) {
            throw new \InvalidArgumentException("Étape introuvable : {$stepId}");
        }

        if ($step->status !== 'in_progress') {
            throw new \LogicException("Cette étape n'est pas en cours (statut : {$step->status}).");
        }

        if ($step->approver_id && $step->approver_id !== $approverId) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                "Vous n'êtes pas l'approbateur désigné pour cette étape."
            );
        }

        $instance = DB::table('document_workflow_instances')->where('id', $step->instance_id)->first();
        $document = Document::find($instance->document_id);

        DB::transaction(function () use ($step, $instance, $document, $approverId, $action, $comment) {
            // Mettre à jour l'étape
            DB::table('document_workflow_steps')->where('id', $step->id)->update([
                'status'      => $action === 'approve' ? 'approved'
                    : ($action === 'reject' ? 'rejected' : 'sent_back'),
                'approver_id' => $approverId,
                'action_at'   => now(),
                'comment'     => $comment,
                'updated_at'  => now(),
            ]);

            match ($action) {
                'approve'   => $this->handleApprove($step, $instance, $document),
                'reject'    => $this->handleReject($step, $instance, $document, $comment),
                'send_back' => $this->handleSendBack($step, $instance, $document, $comment),
                default     => throw new \InvalidArgumentException("Action inconnue : {$action}"),
            };
        });

        $this->auditService->log(
            action: "workflow_step_{$action}d",
            module: 'ged',
            resourceType: 'document',
            resourceId: $instance->document_id,
            newValues: ['step_id' => $stepId, 'comment' => $comment],
        );
    }

    // -----------------------------------------------------------------------
    // CRON : rappels et escalades
    // -----------------------------------------------------------------------

    /**
     * Envoie des rappels aux approbateurs dont les étapes sont en attente
     * depuis plus de la moitié du délai imparti.
     * À exécuter toutes les heures.
     */
    public function remindApprovers(): void
    {
        $steps = DB::table('document_workflow_steps as s')
            ->join('document_workflow_instances as i', 'i.id', '=', 's.instance_id')
            ->where('s.status', 'in_progress')
            ->whereIn('i.status', ['in_progress'])
            ->whereNotNull('s.approver_id')
            ->select('s.*', 'i.document_id')
            ->get();

        foreach ($steps as $step) {
            $elapsed     = now()->diffInHours($step->assigned_at);
            $halfTimeout = $step->timeout_hours / 2;

            // Premier rappel : à mi-délai
            if ($elapsed >= $halfTimeout && $step->reminder_count === 0) {
                $document = Document::find($step->document_id);
                $this->notifyApprover($step, $document, isReminder: true);

                DB::table('document_workflow_steps')->where('id', $step->id)->update([
                    'reminded_at'    => now(),
                    'reminder_count' => 1,
                    'updated_at'     => now(),
                ]);
            }

            // Deuxième rappel : à 3/4 du délai
            if ($elapsed >= ($step->timeout_hours * 0.75) && $step->reminder_count === 1) {
                $document = Document::find($step->document_id);
                $this->notifyApprover($step, $document, isReminder: true, isUrgent: true);

                DB::table('document_workflow_steps')->where('id', $step->id)->update([
                    'reminded_at'    => now(),
                    'reminder_count' => 2,
                    'updated_at'     => now(),
                ]);
            }

            // Escalade : délai dépassé
            if ($elapsed >= $step->timeout_hours) {
                $this->escalate($step);
            }
        }
    }

    /**
     * Escalade un step dont le délai est dépassé vers le manager.
     */
    public function escalate(\stdClass $step): void
    {
        Log::warning('DocumentWorkflow: escalade de step dépassé', ['step_id' => $step->id]);

        // Trouver le manager de l'approbateur
        $approver = User::find($step->approver_id);
        if (! $approver) {
            return;
        }

        $manager = User::where('organization_id', $approver->organization_id)
            ->whereHas('roles', fn($q) => $q->where('name', 'manager'))
            ->where('id', '!=', $approver->id)
            ->first();

        $document = Document::find($step->document_id ?? DB::table('document_workflow_instances')
            ->where('id', $step->instance_id)->value('document_id'));

        if ($manager && $document) {
            $this->notificationService->send(
                userId: $manager->id,
                type: 'workflow_escalated',
                title: 'Escalade : validation en retard',
                body: "L'étape \"{$step->step_name}\" du document \"{$document->title}\" "
                    . "a dépassé son délai de {$step->timeout_hours} h. "
                    . "L'approbateur {$approver->name} n'a pas encore répondu.",
                data: [
                    'step_id'     => $step->id,
                    'document_id' => $document->id,
                    'action_url'  => "/ged/documents/{$document->id}?tab=workflow",
                ],
            );
        }

        DB::table('document_workflow_steps')->where('id', $step->id)->update([
            'reminded_at'    => now(),
            'reminder_count' => DB::raw('reminder_count + 1'),
            'updated_at'     => now(),
        ]);
    }

    // -----------------------------------------------------------------------
    // Status
    // -----------------------------------------------------------------------

    /**
     * Retourne l'état complet du workflow d'un document.
     *
     * @return array{instance: object|null, steps: array, progress_pct: int}
     */
    public function getWorkflowStatus(Document $document): array
    {
        $instance = DB::table('document_workflow_instances')
            ->where('document_id', $document->id)
            ->whereIn('status', ['pending', 'in_progress', 'approved', 'rejected'])
            ->orderByDesc('id')
            ->first();

        if (! $instance) {
            return ['instance' => null, 'steps' => [], 'progress_pct' => 0];
        }

        $steps = DB::table('document_workflow_steps')
            ->where('instance_id', $instance->id)
            ->orderBy('step_order')
            ->get()
            ->map(function ($step) {
                $step->approver = $step->approver_id
                    ? User::select(['id', 'name', 'email', 'avatar'])->find($step->approver_id)
                    : null;
                return $step;
            })
            ->toArray();

        $totalSteps    = count($steps);
        $completedSteps = count(array_filter($steps, fn($s) => in_array($s->status, ['approved', 'skipped'])));
        $progressPct   = $totalSteps > 0 ? (int) round(($completedSteps / $totalSteps) * 100) : 0;

        return [
            'instance'     => $instance,
            'steps'        => $steps,
            'progress_pct' => $progressPct,
        ];
    }

    // -----------------------------------------------------------------------
    // Handlers privés
    // -----------------------------------------------------------------------

    private function handleApprove(\stdClass $step, \stdClass $instance, Document $document): void
    {
        $nextStep = DB::table('document_workflow_steps')
            ->where('instance_id', $instance->id)
            ->where('step_order', $step->step_order + 1)
            ->first();

        if ($nextStep) {
            // Passer à l'étape suivante
            DB::table('document_workflow_steps')->where('id', $nextStep->id)->update([
                'status'      => 'in_progress',
                'assigned_at' => now(),
                'updated_at'  => now(),
            ]);

            DB::table('document_workflow_instances')->where('id', $instance->id)->update([
                'current_step' => $nextStep->step_order,
                'updated_at'   => now(),
            ]);

            if ($nextStep->approver_id) {
                $this->notifyApprover($nextStep, $document);
            }
        } else {
            // Dernière étape approuvée → workflow complété
            DB::table('document_workflow_instances')->where('id', $instance->id)->update([
                'status'       => 'approved',
                'completed_at' => now(),
                'updated_at'   => now(),
            ]);

            $document->update([
                'validation_status' => 'validated',
                'validated_at'      => now(),
            ]);

            // Notifier l'auteur du document
            $this->notificationService->send(
                userId: $document->author_id ?? $document->created_by,
                type: 'document_validated',
                title: 'Document validé',
                body: "Votre document \"{$document->title}\" a été approuvé par tous les validateurs.",
                data: [
                    'document_id' => $document->id,
                    'action_url'  => "/ged/documents/{$document->id}",
                ],
            );
        }
    }

    private function handleReject(\stdClass $step, \stdClass $instance, Document $document, string $comment): void
    {
        DB::table('document_workflow_instances')->where('id', $instance->id)->update([
            'status'           => 'rejected',
            'completed_at'     => now(),
            'rejection_reason' => $comment,
            'updated_at'       => now(),
        ]);

        $document->update(['validation_status' => 'rejected']);

        // Notifier l'auteur
        $this->notificationService->send(
            userId: $document->author_id ?? $document->created_by,
            type: 'document_rejected',
            title: 'Document rejeté',
            body: "Votre document \"{$document->title}\" a été rejeté à l'étape \"{$step->step_name}\"."
                . ($comment ? " Motif : {$comment}" : ''),
            data: [
                'document_id' => $document->id,
                'step_name'   => $step->step_name,
                'comment'     => $comment,
                'action_url'  => "/ged/documents/{$document->id}",
            ],
        );
    }

    private function handleSendBack(\stdClass $step, \stdClass $instance, Document $document, string $comment): void
    {
        if ($step->step_order <= 1) {
            // Impossible de renvoyer en arrière depuis la première étape
            $this->handleReject($step, $instance, $document, $comment);
            return;
        }

        $prevStep = DB::table('document_workflow_steps')
            ->where('instance_id', $instance->id)
            ->where('step_order', $step->step_order - 1)
            ->first();

        if ($prevStep) {
            DB::table('document_workflow_steps')->where('id', $prevStep->id)->update([
                'status'         => 'in_progress',
                'assigned_at'    => now(),
                'action_at'      => null,
                'comment'        => null,
                'reminder_count' => 0,
                'updated_at'     => now(),
            ]);

            DB::table('document_workflow_instances')->where('id', $instance->id)->update([
                'current_step' => $prevStep->step_order,
                'updated_at'   => now(),
            ]);

            if ($prevStep->approver_id) {
                $this->notificationService->send(
                    userId: $prevStep->approver_id,
                    type: 'workflow_sent_back',
                    title: 'Document renvoyé pour révision',
                    body: "Le document \"{$document->title}\" a été renvoyé à votre étape "
                        . "pour révision. " . ($comment ? "Commentaire : {$comment}" : ''),
                    data: [
                        'document_id' => $document->id,
                        'step_id'     => $prevStep->id,
                        'comment'     => $comment,
                        'action_url'  => "/ged/validation?doc={$document->id}",
                    ],
                );
            }
        }
    }

    // -----------------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------------

    private function notifyApprover(
        \stdClass $step,
        Document $document,
        bool $isReminder = false,
        bool $isUrgent = false,
    ): void {
        if (! $step->approver_id) {
            return;
        }

        $title = match (true) {
            $isUrgent  => "URGENT : Validation requise maintenant",
            $isReminder => "Rappel : document en attente de votre validation",
            default    => "Document en attente de votre validation",
        };

        $body = $isUrgent
            ? "Le document \"{$document->title}\" expire dans moins de 25 % du délai imparti."
            : "Le document \"{$document->title}\" attend votre approbation pour l'étape \"{$step->step_name}\".";

        $this->notificationService->send(
            userId: $step->approver_id,
            type: $isReminder ? 'workflow_reminder' : 'workflow_approval_needed',
            title: $title,
            body: $body,
            data: [
                'document_id' => $document->id,
                'step_id'     => $step->id,
                'is_urgent'   => $isUrgent,
                'deadline'    => $step->assigned_at
                    ? \Carbon\Carbon::parse($step->assigned_at)->addHours($step->timeout_hours)->toIso8601String()
                    : null,
                'action_url'  => "/ged/validation?doc={$document->id}&step={$step->id}",
            ],
        );
    }

    // -----------------------------------------------------------------------
    // Résolution d'approbateur par rôle
    // -----------------------------------------------------------------------

    private function resolveApproverByRole(string $role, int $organizationId): ?int
    {
        return User::where('organization_id', $organizationId)
            ->where('status', 'active')
            ->whereHas('roles', fn($q) => $q->where('name', $role))
            ->value('id');
    }
}
