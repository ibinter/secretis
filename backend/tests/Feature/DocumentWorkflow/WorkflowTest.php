<?php

/**
 * WorkflowTest — Tests Feature du workflow de validation documentaire (Vague 10)
 *
 * Couvre : démarrage, approbation multi-étapes, rejet, clôture,
 *          escalade et rappel à mi-délai.
 */

use App\Jobs\EscalateWorkflowStep;
use App\Jobs\SendWorkflowReminder;
use App\Models\Document;
use App\Models\Organization;
use App\Models\User;
use App\Models\WorkflowInstance;
use App\Models\WorkflowStep;
use App\Models\WorkflowTemplate;
use App\Models\WorkflowTemplateStep;
use App\Services\DocumentWorkflowService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Queue::fake();
    Notification::fake();

    $this->org    = $this->createOrganization(['slug' => 'wf-' . uniqid()], 'active');
    $this->author = $this->createUserWithRole($this->org, 'agent');
    $this->approver1 = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->approver2 = $this->createUserWithRole($this->org, 'admin_org');
    $this->manager   = $this->createUserWithRole($this->org, 'admin_org');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
    test()->actingAs($this->author);

    // Template workflow 2 étapes
    $this->template = WorkflowTemplate::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'Validation Contrat',
        'steps_count'     => 2,
    ]);

    WorkflowTemplateStep::factory()->create([
        'template_id'      => $this->template->id,
        'step_order'       => 1,
        'approver_user_id' => $this->approver1->id,
        'timeout_hours'    => 48,
        'escalate_to'      => $this->manager->id,
    ]);
    WorkflowTemplateStep::factory()->create([
        'template_id'      => $this->template->id,
        'step_order'       => 2,
        'approver_user_id' => $this->approver2->id,
        'timeout_hours'    => 24,
        'escalate_to'      => $this->manager->id,
    ]);

    $this->document = Document::factory()->create([
        'organization_id' => $this->org->id,
        'created_by'      => $this->author->id,
        'status'          => 'draft',
        'title'           => 'Contrat de partenariat IBIG / Alpha',
    ]);

    $this->service = app(DocumentWorkflowService::class);
});

// =============================================================================
// DÉMARRAGE
// =============================================================================

it('starts workflow and notifies first approver', function () {
    $instance = $this->service->startWorkflow($this->document, $this->template);

    expect($instance)->toBeInstanceOf(WorkflowInstance::class)
        ->and($instance->status)->toBe('in_progress');

    // Première étape active
    $firstStep = $instance->steps()->where('step_order', 1)->first();
    expect($firstStep->status)->toBe('pending');

    // Notification envoyée au premier approbateur
    Notification::assertSentTo($this->approver1, \App\Notifications\WorkflowStepAssigned::class);
});

// =============================================================================
// APPROBATION ÉTAPE
// =============================================================================

it('approves step and moves to next', function () {
    $instance = $this->service->startWorkflow($this->document, $this->template);

    test()->actingAs($this->approver1);
    $step1 = $instance->steps()->where('step_order', 1)->first();

    $this->service->approveStep($step1, $this->approver1, comment: 'Contrat conforme');

    expect($step1->fresh()->status)->toBe('approved');

    // L'étape 2 doit être activée
    $step2 = $instance->steps()->where('step_order', 2)->first();
    expect($step2->fresh()->status)->toBe('pending');

    // Notifier l'approbateur 2
    Notification::assertSentTo($this->approver2, \App\Notifications\WorkflowStepAssigned::class);
});

// =============================================================================
// REJET
// =============================================================================

it('rejects step and cancels workflow', function () {
    $instance = $this->service->startWorkflow($this->document, $this->template);

    test()->actingAs($this->approver1);
    $step1 = $instance->steps()->where('step_order', 1)->first();

    $this->service->rejectStep($step1, $this->approver1, reason: 'Clauses non conformes — revoir article 5');

    expect($step1->fresh()->status)->toBe('rejected')
        ->and($instance->fresh()->status)->toBe('rejected');

    // L'auteur doit être notifié du rejet
    Notification::assertSentTo($this->author, \App\Notifications\WorkflowRejected::class);
});

// =============================================================================
// CLÔTURE WORKFLOW
// =============================================================================

it('completes workflow after all approvals', function () {
    $instance = $this->service->startWorkflow($this->document, $this->template);

    // Étape 1
    test()->actingAs($this->approver1);
    $step1 = $instance->steps()->where('step_order', 1)->first();
    $this->service->approveStep($step1, $this->approver1);

    // Étape 2
    test()->actingAs($this->approver2);
    $step2 = $instance->steps()->where('step_order', 2)->first();
    $this->service->approveStep($step2, $this->approver2);

    expect($instance->fresh()->status)->toBe('completed')
        ->and($this->document->fresh()->status)->toBe('validated');
});

// =============================================================================
// ESCALADE
// =============================================================================

it('escalates overdue step to manager', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22 08:00:00'));

    $instance = $this->service->startWorkflow($this->document, $this->template);
    $step1    = $instance->steps()->where('step_order', 1)->first();

    // Simuler dépassement du délai de 48h
    $step1->update(['assigned_at' => Carbon::parse('2026-07-19 08:00:00')]); // 72h plus tôt

    $this->service->processEscalations();

    Queue::assertPushed(EscalateWorkflowStep::class, function ($job) use ($step1) {
        return $job->stepId === $step1->id;
    });

    expect($step1->fresh()->is_escalated)->toBeTrue()
        ->and($step1->fresh()->escalated_to)->toBe($this->manager->id);
});

// =============================================================================
// RAPPEL À MI-DÉLAI
// =============================================================================

it('sends reminder at half timeout', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22 08:00:00'));

    $instance = $this->service->startWorkflow($this->document, $this->template);
    $step1    = $instance->steps()->where('step_order', 1)->first();

    // timeout_hours = 48h, rappel à 24h → assigné il y a 25h
    $step1->update(['assigned_at' => Carbon::parse('2026-07-21 07:00:00')]);

    $this->service->processReminders();

    Queue::assertPushed(SendWorkflowReminder::class, function ($job) use ($step1) {
        return $job->stepId === $step1->id;
    });
});
