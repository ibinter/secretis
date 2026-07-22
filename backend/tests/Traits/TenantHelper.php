<?php

namespace Tests\Traits;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * TenantHelper — Résolution automatique du tenant dans les tests
 *
 * Ce trait simule le middleware ResolveTenant en liant l'organisation
 * au conteneur IoC de Laravel, exactement comme le ferait le middleware
 * en production.
 */
trait TenantHelper
{
    /**
     * Résout et lie une organisation comme tenant courant dans les tests.
     * Simule le comportement du middleware ResolveTenant.
     *
     * @param Organization $organization L'organisation à résoudre comme tenant
     */
    protected function actingAsTenant(Organization $organization): static
    {
        app()->instance('current_organization', $organization);

        return $this;
    }

    /**
     * Connecte un utilisateur ET résout automatiquement son organisation comme tenant.
     * Raccourci pour : actingAs($user) + actingAsTenant($user->organization)
     *
     * @param User        $user
     * @param string|null $guard
     */
    protected function actingAsUserInOrganization(User $user, ?string $guard = null): static
    {
        $this->actingAsTenant($user->organization ?? $user->load('organization')->organization);

        if ($guard) {
            $this->actingAs($user, $guard);
        } else {
            $this->actingAs($user);
        }

        return $this;
    }

    /**
     * Simule une requête HTTP dans le contexte d'un tenant.
     * Utile pour tester les middlewares directement.
     *
     * @param Organization $organization
     * @param string       $method       Méthode HTTP (GET, POST, etc.)
     * @param string       $uri          URI de la requête
     * @param array        $data         Données de la requête
     */
    protected function requestAsTenant(Organization $organization, string $method, string $uri, array $data = [])
    {
        $this->actingAsTenant($organization);

        return $this->$method($uri, $data);
    }

    /**
     * Vérifie que le tenant courant est correctement résolu.
     */
    protected function assertCurrentTenant(Organization $expected): void
    {
        $current = app('current_organization');

        $this->assertNotNull($current, 'Aucun tenant résolu dans le conteneur IoC');
        $this->assertEquals(
            $expected->id,
            $current->id,
            "Le tenant résolu ({$current->slug}) ne correspond pas à l'attendu ({$expected->slug})"
        );
    }

    /**
     * Efface le tenant du conteneur IoC (cleanup après test).
     */
    protected function clearTenant(): void
    {
        app()->forgetInstance('current_organization');
    }
}
