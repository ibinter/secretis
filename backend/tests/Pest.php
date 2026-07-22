<?php

/**
 * Pest.php — Configuration globale de la suite de tests SECRETIS ERP
 *
 * Ce fichier configure :
 * - Les datasets globaux
 * - Les helpers accessibles dans tous les tests
 * - Les hooks globaux (beforeEach, afterEach)
 * - Les expectations personnalisées
 * - Les datasets réutilisables : allRoles(), allModules(), invalidMimes()
 */

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// =============================================================================
// Bases de test par défaut
// =============================================================================

uses(TestCase::class)->in('Feature', 'Unit');
uses(RefreshDatabase::class)->in('Feature', 'Unit');

// =============================================================================
// Helpers globaux (disponibles dans tous les tests sans import)
// =============================================================================

/**
 * Crée un utilisateur administrateur et l'authentifie dans son organisation.
 * Raccourci pour les tests qui ont juste besoin d'un admin connecté.
 */
function actingAsAdmin(string $orgSlug = 'test-org'): array
{
    /** @var TestCase $test */
    $test = test();
    $org  = $test->createOrganization(['slug' => $orgSlug . '-' . uniqid()], 'trial');
    $user = $test->createUserWithRole($org, 'admin_org');
    $test->actingAsUserInOrganization($user);

    return compact('org', 'user');
}

/**
 * Crée un agent standard authentifié.
 */
function actingAsAgent(string $orgSlug = 'test-org'): array
{
    /** @var TestCase $test */
    $test = test();
    $org  = $test->createOrganization(['slug' => $orgSlug . '-' . uniqid()], 'trial');
    $user = $test->createUserWithRole($org, 'agent');
    $test->actingAsUserInOrganization($user);

    return compact('org', 'user');
}

/**
 * Crée une organisation avec une licence active et authentifie l'utilisateur dedans.
 * Injecte aussi current_organization dans le conteneur.
 *
 * Usage :
 *   $ctx = actingAsOrg('admin_org');
 *   $ctx['org']  // Organization
 *   $ctx['user'] // User
 */
function actingAsOrg(string $role = 'admin_org', string $orgStatus = 'active'): array
{
    /** @var TestCase $test */
    $test = test();
    $org  = $test->createOrganization(['slug' => 'org-' . uniqid()], $orgStatus);
    $test->createActiveLicense($org);
    $user = $test->createUserWithRole($org, $role);

    app()->instance('current_organization', $org);
    test()->actingAs($user);

    return compact('org', 'user');
}

/**
 * Attache une licence active à l'organisation courante et retourne le contexte.
 * À appeler après actingAs() quand on a déjà un utilisateur.
 */
function withValidLicense(Organization $org): Organization
{
    /** @var TestCase $test */
    $test = test();
    $test->createActiveLicense($org);
    $org->refresh();
    return $org;
}

/**
 * Crée un utilisateur avec un rôle précis et l'authentifie.
 * Alias concis pour createUserWithRole + actingAs.
 *
 * Usage :
 *   [$org, $user] = asRole('gestionnaire');
 */
function asRole(string $role, ?Organization $org = null): array
{
    /** @var TestCase $test */
    $test = test();

    if ($org === null) {
        $org = $test->createOrganization(['slug' => 'role-test-' . uniqid()], 'active');
        $test->createActiveLicense($org);
        app()->instance('current_organization', $org);
    }

    $user = $test->createUserWithRole($org, $role);
    test()->actingAs($user);

    return [$org, $user];
}

// =============================================================================
// Expectations personnalisées SECRETIS
// =============================================================================

expect()->extend('toBeValidReference', function () {
    return $this->toMatch('/^REF-(ENTRANT|SORTANT)-\d{4}-\d{5}$/');
});

expect()->extend('toBeValidIso8601', function () {
    return $this->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/');
});

expect()->extend('toBeActiveStatus', function () {
    return $this->toBeIn(['active', 'trial', 'grace']);
});

expect()->extend('toBeInactiveStatus', function () {
    return $this->toBeIn(['expired', 'suspended']);
});

expect()->extend('toBeValidUuid', function () {
    return $this->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i');
});

expect()->extend('toBeValidInvoiceNumber', function () {
    return $this->toMatch('/^FACT-\d+-\d{4}-\d{4}$/');
});

expect()->extend('toBeHashedPassword', function () {
    return $this->toStartWith('$2y$');
});

// =============================================================================
// Datasets partagés
// =============================================================================

dataset('valid_license_statuses', ['active', 'trial', 'grace']);
dataset('blocked_license_statuses', ['expired', 'suspended']);

dataset('valid_courrier_types', ['incoming', 'outgoing']);

dataset('valid_workflow_transitions', [
    'pending to processing'   => ['from' => 'pending',    'to' => 'processing'],
    'pending to archived'     => ['from' => 'pending',    'to' => 'archived'],
    'processing to processed' => ['from' => 'processing', 'to' => 'processed'],
    'processing to pending'   => ['from' => 'processing', 'to' => 'pending'],
    'processed to archived'   => ['from' => 'processed',  'to' => 'archived'],
]);

dataset('invalid_workflow_transitions', [
    'archived to processing'  => ['from' => 'archived',   'to' => 'processing'],
    'archived to pending'     => ['from' => 'archived',   'to' => 'pending'],
    'processed to pending'    => ['from' => 'processed',  'to' => 'pending'],
    'processed to processing' => ['from' => 'processed',  'to' => 'processing'],
]);

dataset('recurrence_frequencies', [
    'daily'   => 'FREQ=DAILY',
    'weekly'  => 'FREQ=WEEKLY',
    'monthly' => 'FREQ=MONTHLY',
    'yearly'  => 'FREQ=YEARLY',
]);

/**
 * Dataset : tous les rôles RBAC de l'application.
 * Utilisable pour des tests paramétriques couvrant chaque rôle.
 */
dataset('allRoles', [
    'superadmin_ibig' => 'superadmin_ibig',
    'admin_org'       => 'admin_org',
    'gestionnaire'    => 'gestionnaire',
    'agent'           => 'agent',
    'viewer'          => 'viewer',
    'rh_manager'      => 'rh_manager',
    'comptable'       => 'comptable',
    'archiviste'      => 'archiviste',
]);

/**
 * Dataset : tous les modules de l'application.
 * Utilisable pour tester la matrice de permissions par module.
 */
dataset('allModules', [
    'agenda'     => 'agenda',
    'courrier'   => 'courrier',
    'taches'     => 'taches',
    'contacts'   => 'contacts',
    'reunions'   => 'reunions',
    'documents'  => 'documents',
    'rh'         => 'rh',
    'comptable'  => 'comptable',
    'formation'  => 'formation',
    'signature'  => 'signature',
    'sara'       => 'sara',
    'reporting'  => 'reporting',
]);

/**
 * Dataset : types MIME non autorisés pour l'upload de documents.
 * Utilisable pour les tests de validation MIME.
 */
dataset('invalidMimes', [
    'PHP executable'   => ['application/x-php',       'php'],
    'Shell script'     => ['application/x-sh',        'sh'],
    'Bash script'      => ['text/x-shellscript',      'bash'],
    'Windows exe'      => ['application/x-msdownload', 'exe'],
    'JavaScript'       => ['application/javascript',  'js'],
    'Python script'    => ['text/x-python',            'py'],
    'Ruby script'      => ['text/x-ruby',              'rb'],
    'Perl script'      => ['text/x-perl',              'pl'],
    'SQL file'         => ['application/sql',           'sql'],
    'XML external'     => ['application/xml',           'xml'],
    'SVG (XSS risk)'   => ['image/svg+xml',             'svg'],
    'HTML (XSS risk)'  => ['text/html',                 'html'],
]);

// =============================================================================
// Datasets Vagues 9–12
// =============================================================================

/**
 * Sévérités des non-conformités qualité ISO 9001.
 */
dataset('qualityNcSeverities', ['mineure', 'majeure', 'critique']);

/**
 * Types de maintenance véhicule.
 */
dataset('fleetMaintenanceTypes', [
    'vidange'   => 'vidange',
    'pneus'     => 'pneus',
    'freins'    => 'freins',
    'courroie'  => 'courroie',
    'ct'        => 'ct',
    'assurance' => 'assurance',
]);

/**
 * Statuts possibles d'une demande d'achat.
 */
dataset('procurementStatuses', [
    'brouillon' => 'brouillon',
    'soumis'    => 'soumis',
    'approuve'  => 'approuve',
    'refuse'    => 'refuse',
]);

// =============================================================================
// Helpers Vagues 9–12
// =============================================================================

/**
 * Crée un responsable de flotte et l'authentifie dans son organisation.
 *
 * Usage :
 *   $ctx = actingAsFleetManager();
 *   $ctx['org']  // Organization
 *   $ctx['user'] // User avec rôle fleet_manager
 */
function actingAsFleetManager(string $orgStatus = 'active'): array
{
    /** @var TestCase $test */
    $test = test();
    $org  = $test->createOrganization(['slug' => 'fleet-mgr-' . uniqid()], $orgStatus);
    $test->createActiveLicense($org);
    $user = $test->createUserWithRole($org, 'fleet_manager');

    app()->instance('current_organization', $org);
    test()->actingAs($user);

    return compact('org', 'user');
}

/**
 * Crée un responsable qualité et l'authentifie dans son organisation.
 *
 * Usage :
 *   $ctx = actingAsQualityManager();
 *   $ctx['org']  // Organization
 *   $ctx['user'] // User avec rôle quality_manager
 */
function actingAsQualityManager(string $orgStatus = 'active'): array
{
    /** @var TestCase $test */
    $test = test();
    $org  = $test->createOrganization(['slug' => 'quality-mgr-' . uniqid()], $orgStatus);
    $test->createActiveLicense($org);
    $user = $test->createUserWithRole($org, 'quality_manager');

    app()->instance('current_organization', $org);
    test()->actingAs($user);

    return compact('org', 'user');
}

/**
 * Crée un acheteur/responsable achats et l'authentifie dans son organisation.
 *
 * Usage :
 *   $ctx = actingAsProcurementOfficer();
 *   $ctx['org']  // Organization
 *   $ctx['user'] // User avec rôle procurement_officer
 */
function actingAsProcurementOfficer(string $orgStatus = 'active'): array
{
    /** @var TestCase $test */
    $test = test();
    $org  = $test->createOrganization(['slug' => 'procurement-' . uniqid()], $orgStatus);
    $test->createActiveLicense($org);
    $user = $test->createUserWithRole($org, 'procurement_officer');

    app()->instance('current_organization', $org);
    test()->actingAs($user);

    return compact('org', 'user');
}

// =============================================================================
// Expectations personnalisées Vagues 9–12
// =============================================================================

expect()->extend('toBeValidNcReference', function () {
    return $this->toMatch('/^NC-\d{4}-\d{4}$/');
});

expect()->extend('toBeValidBudgetReference', function () {
    return $this->toMatch('/^BDGT-\d{4}-\d{5}$/');
});

expect()->extend('toBeValidDaReference', function () {
    return $this->toMatch('/^DA-\d{4}-\d{5}$/');
});

expect()->extend('toBeValidScorePercent', function () {
    return $this->toBeFloat()
        ->toBeGreaterThanOrEqual(0.0)
        ->toBeLessThanOrEqual(100.0);
});

// =============================================================================
// Hooks globaux
// =============================================================================

beforeEach(function () {
    // S'assurer que le tenant est propre avant chaque test
    app()->forgetInstance('current_organization');

    // Reset Carbon si modifié
    \Carbon\Carbon::setTestNow();
});

afterEach(function () {
    // Nettoyage post-test
    app()->forgetInstance('current_organization');
    \Carbon\Carbon::setTestNow();
    Mockery::close();
});
