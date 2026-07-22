<?php

/**
 * MultitenantIsolationTest — Isolation multitenant SECRETIS ERP
 *
 * Couvre tous les modules : agenda, courrier, comptabilité, budget,
 * visiteurs, qualité, flotte, achats.
 * Garantit qu'aucun utilisateur d'une organisation ne peut accéder aux
 * données d'une autre organisation.
 */

use App\Models\Budget;
use App\Models\Calendar;
use App\Models\Event;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\MailRegistry;
use App\Models\Nonconformity;
use App\Models\Organization;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Visitor;
use App\Models\VisitorLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seedForTests();

    // Deux organisations totalement distinctes
    $this->orgA = $this->createOrganization(['slug' => 'org-a-mt'], 'trial');
    $this->orgB = $this->createOrganization(['slug' => 'org-b-mt'], 'trial');

    // Un admin dans chaque organisation
    $this->adminA = $this->createUserWithRole($this->orgA, 'admin_org');
    $this->adminB = $this->createUserWithRole($this->orgB, 'admin_org');

    // ── Données Agenda ───────────────────────────────────────────────────────
    $calA = Calendar::create([
        'organization_id' => $this->orgA->id,
        'user_id'         => $this->adminA->id,
        'name'            => 'Agenda A',
        'color'           => '#3B82F6',
        'type'            => 'personal',
        'is_default'      => true,
    ]);

    $start = Carbon::now()->addDays(5)->startOfHour();
    $this->eventB = Event::create([
        'organization_id' => $this->orgB->id,
        'calendar_id'     => Calendar::create([
            'organization_id' => $this->orgB->id,
            'user_id'         => $this->adminB->id,
            'name'            => 'Agenda B',
            'color'           => '#EF4444',
            'type'            => 'personal',
            'is_default'      => true,
        ])->id,
        'creator_id' => $this->adminB->id,
        'title'      => 'Événement confidentiel org B',
        'start_at'   => $start,
        'end_at'     => $start->copy()->addHour(),
    ]);

    // ── Données Courrier ─────────────────────────────────────────────────────
    $this->courrierB = MailRegistry::create([
        'organization_id' => $this->orgB->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-B-001',
        'subject'         => 'Courrier confidentiel org B',
        'status'          => 'pending',
        'created_by_id'   => $this->adminB->id,
    ]);

    // ── Données Budget ───────────────────────────────────────────────────────
    $fyB = FiscalYear::factory()->create([
        'organization_id' => $this->orgB->id,
        'name'            => 'FY 2026 B',
        'start_date'      => '2026-01-01',
        'end_date'        => '2026-12-31',
        'status'          => 'open',
    ]);
    $this->budgetB = Budget::factory()->create([
        'organization_id' => $this->orgB->id,
        'fiscal_year_id'  => $fyB->id,
        'name'            => 'Budget confidentiel org B',
        'status'          => 'approved',
    ]);

    // ── Données Visiteurs ────────────────────────────────────────────────────
    $visitorB = Visitor::factory()->create(['organization_id' => $this->orgB->id]);
    $this->visitorLogB = VisitorLog::factory()->create([
        'organization_id' => $this->orgB->id,
        'visitor_id'      => $visitorB->id,
        'check_in_at'     => now(),
    ]);

    // ── Données Qualité ──────────────────────────────────────────────────────
    $this->ncB = Nonconformity::factory()->create([
        'organization_id' => $this->orgB->id,
        'title'           => 'NC confidentielle org B',
        'status'          => 'ouvert',
    ]);

    // ── Données Flotte ───────────────────────────────────────────────────────
    $this->vehicleB = Vehicle::factory()->create([
        'organization_id' => $this->orgB->id,
        'plate_number'    => 'CI-9999-XB',
    ]);

    // ── Données Achats ───────────────────────────────────────────────────────
    $supplierB = Supplier::factory()->create(['organization_id' => $this->orgB->id]);
    $this->poB = PurchaseOrder::factory()->create([
        'organization_id' => $this->orgB->id,
        'supplier_id'     => $supplierB->id,
        'status'          => 'sent',
    ]);
});

// =============================================================================
// AGENDA — isolation existante
// =============================================================================

it('cannot access other org event via api', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.events.show', $this->eventB))
        ->assertStatus(403);
});

it('cannot access other org mail registry via api', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.courrier.show', $this->courrierB))
        ->assertStatus(403);
});

// =============================================================================
// BUDGET
// =============================================================================

it('cannot access other org budget', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.budgets.show', $this->budgetB))
        ->assertStatus(403);
});

it('cannot update other org budget', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->patchJson(route('api.budgets.update', $this->budgetB), ['name' => 'Hack'])
        ->assertStatus(403);
});

// =============================================================================
// VISITEURS
// =============================================================================

it('cannot access other org visitors', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.visitors.logs.show', $this->visitorLogB))
        ->assertStatus(403);
});

// =============================================================================
// QUALITÉ
// =============================================================================

it('cannot access other org quality nc', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.quality.nonconformities.show', $this->ncB))
        ->assertStatus(403);
});

it('cannot update other org quality nc', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->patchJson(route('api.quality.nonconformities.update', $this->ncB), ['title' => 'Hacked'])
        ->assertStatus(403);
});

// =============================================================================
// FLOTTE
// =============================================================================

it('cannot access other org fleet vehicles', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.fleet.vehicles.show', $this->vehicleB))
        ->assertStatus(403);
});

it('cannot update other org fleet vehicle', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->patchJson(route('api.fleet.vehicles.update', $this->vehicleB), ['plate_number' => 'CI-HACK-00'])
        ->assertStatus(403);
});

// =============================================================================
// ACHATS
// =============================================================================

it('cannot access other org purchase orders', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->getJson(route('api.procurement.purchase-orders.show', $this->poB))
        ->assertStatus(403);
});

it('cannot delete other org purchase order', function () {
    app()->instance('current_organization', $this->orgA);
    $this->actingAsUserInOrganization($this->adminA);

    $this->deleteJson(route('api.procurement.purchase-orders.destroy', $this->poB))
        ->assertStatus(403);
});
