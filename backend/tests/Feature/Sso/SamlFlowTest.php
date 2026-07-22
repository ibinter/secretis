<?php

/**
 * SamlFlowTest — Tests Feature du flux SSO SAML (Vague 9)
 *
 * Couvre : validation signature RS256, expiration, replay attack,
 *          mapping des attributs, provisioning automatique à la première connexion.
 */

use App\Models\Organization;
use App\Models\SamlConfiguration;
use App\Models\SamlUsedResponse;
use App\Models\User;
use App\Services\SamlService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->org  = $this->createOrganization(['slug' => 'saml-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    // Configuration SAML de test
    $this->samlConfig = SamlConfiguration::factory()->create([
        'organization_id'   => $this->org->id,
        'idp_entity_id'     => 'https://idp.test.example.com',
        'idp_sso_url'       => 'https://idp.test.example.com/sso',
        'idp_certificate'   => file_get_contents(base_path('tests/fixtures/saml/idp_cert.pem')),
        'sp_entity_id'      => 'https://erp.ibig.ci',
        'attribute_map'     => [
            'email'      => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            'first_name' => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
            'last_name'  => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
            'role'       => 'http://schemas.ibig.ci/claims/role',
        ],
        'is_active'         => true,
    ]);

    $this->service = app(SamlService::class);
});

// =============================================================================
// VALIDATION DE SIGNATURE
// =============================================================================

it('validates saml response with valid signature', function () {
    $signedResponse = file_get_contents(base_path('tests/fixtures/saml/valid_response.xml'));

    $result = $this->service->validateResponse(
        samlResponse:   base64_encode($signedResponse),
        samlConfig:     $this->samlConfig,
    );

    expect($result)->toHaveKey('valid')
        ->and($result['valid'])->toBeTrue();
});

it('rejects saml response with invalid signature', function () {
    $tamperedResponse = file_get_contents(base_path('tests/fixtures/saml/tampered_response.xml'));

    $result = $this->service->validateResponse(
        samlResponse: base64_encode($tamperedResponse),
        samlConfig:   $this->samlConfig,
    );

    expect($result['valid'])->toBeFalse()
        ->and($result)->toHaveKey('error');
});

// =============================================================================
// EXPIRATION
// =============================================================================

it('rejects expired saml response', function () {
    // NotOnOrAfter dépassé de 10 minutes
    Carbon::setTestNow(Carbon::parse('2026-07-22 10:00:00'));

    $expiredResponse = file_get_contents(base_path('tests/fixtures/saml/expired_response.xml'));

    $result = $this->service->validateResponse(
        samlResponse: base64_encode($expiredResponse),
        samlConfig:   $this->samlConfig,
    );

    expect($result['valid'])->toBeFalse()
        ->and(strtolower($result['error'] ?? ''))->toContain('expir');
});

// =============================================================================
// PROTECTION ANTI-REPLAY
// =============================================================================

it('prevents replay attack with response id', function () {
    $responseId = '_saml_response_' . uniqid();

    // Marquer l'ID comme déjà utilisé
    SamlUsedResponse::create([
        'organization_id' => $this->org->id,
        'response_id'     => $responseId,
        'used_at'         => now(),
    ]);

    $isReplay = $this->service->isReplayAttack(
        responseId:  $responseId,
        orgId:       $this->org->id,
    );

    expect($isReplay)->toBeTrue();
});

it('allows first use of a saml response id', function () {
    $freshId = '_saml_response_' . uniqid();

    $isReplay = $this->service->isReplayAttack(
        responseId: $freshId,
        orgId:      $this->org->id,
    );

    expect($isReplay)->toBeFalse();
});

// =============================================================================
// MAPPING ATTRIBUTS
// =============================================================================

it('maps saml attributes to user correctly', function () {
    $rawAttributes = [
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress' => ['fatou.diallo@company.ci'],
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'    => ['Fatou'],
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'      => ['Diallo'],
        'http://schemas.ibig.ci/claims/role'                                 => ['gestionnaire'],
    ];

    $mapped = $this->service->mapAttributes($rawAttributes, $this->samlConfig);

    expect($mapped)->toHaveKey('email')
        ->and($mapped)->toHaveKey('first_name')
        ->and($mapped)->toHaveKey('last_name')
        ->and($mapped)->toHaveKey('role');

    expect($mapped['email'])->toBe('fatou.diallo@company.ci')
        ->and($mapped['first_name'])->toBe('Fatou')
        ->and($mapped['last_name'])->toBe('Diallo')
        ->and($mapped['role'])->toBe('gestionnaire');
});

// =============================================================================
// PROVISIONING AUTOMATIQUE
// =============================================================================

it('creates user on first sso login', function () {
    $attributes = [
        'email'      => 'kofi.asante@company.ci',
        'first_name' => 'Kofi',
        'last_name'  => 'Asante',
        'role'       => 'agent',
    ];

    expect(User::where('email', $attributes['email'])->exists())->toBeFalse();

    $user = $this->service->provisionUser($attributes, $this->org);

    expect($user)->toBeInstanceOf(User::class)
        ->and($user->email)->toBe('kofi.asante@company.ci')
        ->and($user->organization_id)->toBe($this->org->id);

    // L'utilisateur doit être persisté en base
    expect(User::where('email', 'kofi.asante@company.ci')->exists())->toBeTrue();
});

it('updates existing user on subsequent sso login', function () {
    $existing = User::factory()->create([
        'email'           => 'kofi.asante@company.ci',
        'organization_id' => $this->org->id,
        'first_name'      => 'Kofi',
        'last_name'       => 'Ancien Nom',
    ]);

    $attributes = [
        'email'      => 'kofi.asante@company.ci',
        'first_name' => 'Kofi',
        'last_name'  => 'Asante',
        'role'       => 'agent',
    ];

    $user = $this->service->provisionUser($attributes, $this->org);

    expect($user->id)->toBe($existing->id)
        ->and($user->last_name)->toBe('Asante');
});
