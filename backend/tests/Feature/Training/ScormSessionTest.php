<?php

/**
 * ScormSessionTest — Tests Feature du module SCORM / xAPI (Vague 12)
 *
 * Couvre : création de session, persistance cmi.*, reprise, complétion, LRS xAPI.
 */

use App\Models\Organization;
use App\Models\ScormPackage;
use App\Models\ScormSession;
use App\Models\TrainingEnrollment;
use App\Models\User;
use App\Models\XapiStatement;
use App\Services\ScormService;
use Carbon\Carbon;

beforeEach(function () {
    $this->org      = $this->createOrganization(['slug' => 'scorm-' . uniqid()], 'active');
    $this->learner  = $this->createUserWithRole($this->org, 'agent');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
    test()->actingAs($this->learner);

    $this->service = app(ScormService::class);

    $this->package = ScormPackage::factory()->create([
        'organization_id' => $this->org->id,
        'title'           => 'Formation Sécurité Incendie',
        'version'         => 'scorm2004',
        'launch_url'      => 'scorm_packages/test-pkg/index.html',
        'is_active'       => true,
    ]);

    $this->enrollment = TrainingEnrollment::factory()->create([
        'organization_id' => $this->org->id,
        'user_id'         => $this->learner->id,
        'scorm_package_id' => $this->package->id,
        'status'          => 'enrolled',
    ]);
});

// =============================================================================
// CRÉATION DE SESSION
// =============================================================================

it('creates scorm session for enrolled user', function () {
    $session = $this->service->getOrCreateSession(
        enrollment: $this->enrollment,
        user:       $this->learner,
    );

    expect($session)->toBeInstanceOf(ScormSession::class)
        ->and($session->user_id)->toBe($this->learner->id)
        ->and($session->scorm_package_id)->toBe($this->package->id)
        ->and($session->status)->toBe('initialized')
        ->and($session->session_data)->not->toBeNull();
});

// =============================================================================
// PERSISTANCE CMI.*
// =============================================================================

it('saves cmi data via runtime api', function () {
    $session = ScormSession::factory()->create([
        'user_id'          => $this->learner->id,
        'scorm_package_id' => $this->package->id,
        'organization_id'  => $this->org->id,
        'status'           => 'in_progress',
        'session_data'     => [],
    ]);

    $cmiData = [
        'cmi.core.lesson_status'    => 'incomplete',
        'cmi.core.score.raw'        => '75',
        'cmi.suspend_data'          => 'page=3&q1=A&q2=B',
        'cmi.core.session_time'     => '00:05:30',
    ];

    $this->service->saveCmiData($session, $cmiData);

    $updated = $session->fresh();
    $stored  = $updated->session_data;

    expect($stored)->not->toBeEmpty()
        ->and($stored['cmi.core.lesson_status'])->toBe('incomplete')
        ->and($stored['cmi.core.score.raw'])->toBe('75')
        ->and($stored['cmi.suspend_data'])->toBe('page=3&q1=A&q2=B');
});

// =============================================================================
// REPRISE (SUSPEND DATA)
// =============================================================================

it('resumes scorm from suspend data', function () {
    $suspendData = 'page=5&lastQuestion=3&answers[1]=C';

    $session = ScormSession::factory()->create([
        'user_id'          => $this->learner->id,
        'scorm_package_id' => $this->package->id,
        'organization_id'  => $this->org->id,
        'status'           => 'suspended',
        'session_data'     => [
            'cmi.suspend_data'       => $suspendData,
            'cmi.core.lesson_status' => 'incomplete',
        ],
    ]);

    $resumeData = $this->service->getResumeData($session);

    expect($resumeData)->toHaveKey('cmi.suspend_data')
        ->and($resumeData['cmi.suspend_data'])->toBe($suspendData);
});

// =============================================================================
// COMPLÉTION
// =============================================================================

it('marks completion when cmi.completion_status is completed', function () {
    $session = ScormSession::factory()->create([
        'user_id'          => $this->learner->id,
        'scorm_package_id' => $this->package->id,
        'organization_id'  => $this->org->id,
        'status'           => 'in_progress',
        'session_data'     => [],
    ]);

    // SCORM 2004 : cmi.completion_status = "completed"
    $this->service->saveCmiData($session, [
        'cmi.completion_status' => 'completed',
        'cmi.success_status'    => 'passed',
        'cmi.score.scaled'      => '0.85',
    ]);

    $this->service->evaluateCompletion($session->fresh());

    expect($session->fresh()->status)->toBe('completed')
        ->and($this->enrollment->fresh()->status)->toBe('completed');
});

it('marks completion when cmi.core.lesson_status is passed (SCORM 1.2)', function () {
    $session = ScormSession::factory()->create([
        'user_id'          => $this->learner->id,
        'scorm_package_id' => $this->package->id,
        'organization_id'  => $this->org->id,
        'status'           => 'in_progress',
        'session_data'     => [],
    ]);

    $this->service->saveCmiData($session, [
        'cmi.core.lesson_status' => 'passed',
        'cmi.core.score.raw'     => '88',
    ]);

    $this->service->evaluateCompletion($session->fresh());

    expect($session->fresh()->status)->toBe('completed');
});

// =============================================================================
// STATEMENT XAPI
// =============================================================================

it('records xapi statement correctly', function () {
    $statement = [
        'actor'  => [
            'objectType' => 'Agent',
            'name'       => $this->learner->name,
            'mbox'       => 'mailto:' . $this->learner->email,
        ],
        'verb'   => [
            'id'      => 'http://adlnet.gov/expapi/verbs/completed',
            'display' => ['en-US' => 'completed'],
        ],
        'object' => [
            'id'         => 'https://erp.ibig.ci/scorm/' . $this->package->id,
            'definition' => ['name' => ['fr-FR' => $this->package->title]],
        ],
        'result' => [
            'completion' => true,
            'success'    => true,
            'score'      => ['scaled' => 0.85],
        ],
        'timestamp' => Carbon::now()->toIso8601String(),
    ];

    $stored = $this->service->recordXapiStatement(
        userId:      $this->learner->id,
        packageId:   $this->package->id,
        orgId:       $this->org->id,
        statement:   $statement,
    );

    expect($stored)->toBeInstanceOf(XapiStatement::class)
        ->and($stored->user_id)->toBe($this->learner->id)
        ->and($stored->verb)->toBe('http://adlnet.gov/expapi/verbs/completed')
        ->and($stored->result_completion)->toBeTrue()
        ->and($stored->result_score)->toBe(0.85);
});
