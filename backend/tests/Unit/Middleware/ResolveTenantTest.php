<?php

/**
 * ResolveTenantTest — Tests unitaires du middleware ResolveTenant
 *
 * Teste : résolution par sous-domaine, 404 inconnu, injection dans conteneur.
 */

use App\Http\Middleware\ResolveTenant;
use App\Models\Organization;
use Illuminate\Http\Request;

beforeEach(function () {
    $this->org = $this->createOrganization(['slug' => 'acme-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
});

it('resolves tenant from subdomain', function () {
    $middleware = new ResolveTenant();

    // Simuler une requête depuis acme.secretis.app
    $request = Request::create('https://' . $this->org->slug . '.secretis.app/api/events', 'GET');

    config(['app.domain' => 'secretis.app']);

    $resolved = null;
    $middleware->handle($request, function ($req) use (&$resolved) {
        $resolved = app('current_organization');
        return response()->json(['ok' => true]);
    });

    expect($resolved)->not->toBeNull()
        ->and($resolved->slug)->toBe($this->org->slug)
        ->and($resolved->id)->toBe($this->org->id);
});

it('returns 404 for unknown subdomain', function () {
    $middleware = new ResolveTenant();

    // Sous-domaine qui n'existe pas
    $request = Request::create('https://unknown-org-xyz.secretis.app/api/events', 'GET');
    $request->headers->set('Accept', 'application/json');

    config(['app.domain' => 'secretis.app']);

    $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

    expect($response->getStatusCode())->toBe(404);

    $body = json_decode($response->getContent(), true);
    expect($body['error'])->toBe('tenant_not_found');
});

it('sets organization in container', function () {
    $middleware = new ResolveTenant();

    $request = Request::create('https://' . $this->org->slug . '.secretis.app/api/events', 'GET');

    config(['app.domain' => 'secretis.app']);

    // Avant — le conteneur ne doit pas avoir l'organisation
    app()->forgetInstance('current_organization');

    $middleware->handle($request, function ($req) {
        // Après le passage dans le middleware, l'organisation doit être dans le conteneur
        $org = app('current_organization');
        expect($org)->not->toBeNull()
            ->and($org)->toBeInstanceOf(Organization::class);

        return response()->json(['ok' => true]);
    });
});
