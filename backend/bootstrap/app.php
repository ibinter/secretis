<?php

/**
 * =============================================================================
 * IBIG SECRETIS ERP — Bootstrap Application
 * =============================================================================
 * Fichier : bootstrap/app.php
 * Version : 1.0.0
 * Auteur  : IBIG SOFT
 *
 * Point d'entrée de l'application Laravel.
 * Enregistrement complet de tous les middlewares, service providers
 * et exceptions handlers de la plateforme SECRETIS.
 * =============================================================================
 */

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\ContentLanguage;
use App\Http\Middleware\EnforceSsoOnly;
use App\Http\Middleware\EnsureValidLicense;
use App\Http\Middleware\LocalizeForRegion;
use App\Http\Middleware\OptimizeResponse;
use App\Http\Middleware\PreventCrossTenantAccess;
use App\Http\Middleware\RequestMetrics;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\ShowOnboardingIfNeeded;
use App\Http\Middleware\SuperAdminOnly;
use App\Http\Middleware\ValidateTenantIntegrity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // =====================================================================
        // MIDDLEWARES GLOBAUX (appliqués à toutes les requêtes)
        // =====================================================================
        $middleware->use([
            // En-têtes de sécurité HTTP (CSP, HSTS, X-Frame-Options, etc.)
            SecurityHeaders::class,

            // Métriques de performance (temps de réponse, mémoire, logs)
            RequestMetrics::class,

            // Compression & optimisation des réponses (Gzip, ETags, cache headers)
            OptimizeResponse::class,
        ]);

        // =====================================================================
        // GROUPE MIDDLEWARE "WEB" (routes web + sessions)
        // =====================================================================
        $middleware->web(append: [
            // Résolution du tenant (organisation) depuis le domaine ou l'utilisateur
            ResolveTenant::class,

            // Validation de l'intégrité du tenant (actif, non suspendu)
            ValidateTenantIntegrity::class,

            // Prévention des accès cross-tenant (isolation des données)
            PreventCrossTenantAccess::class,

            // Validation de la licence (SaaS ou on-premise)
            EnsureValidLicense::class,

            // Localisation régionale (langue, devise, format de date)
            LocalizeForRegion::class,

            // Langue du contenu des réponses
            ContentLanguage::class,

            // Affichage du wizard d'onboarding si non complété
            ShowOnboardingIfNeeded::class,
        ]);

        // =====================================================================
        // GROUPE MIDDLEWARE "API" (routes API REST)
        // =====================================================================
        $middleware->api(append: [
            // Résolution du tenant depuis le header X-Organization ou le token
            ResolveTenant::class,

            // Validation de l'intégrité du tenant
            ValidateTenantIntegrity::class,

            // Prévention des accès cross-tenant
            PreventCrossTenantAccess::class,

            // Validation de la licence
            EnsureValidLicense::class,

            // Localisation pour les réponses API
            LocalizeForRegion::class,
        ]);

        // =====================================================================
        // ALIAS DE MIDDLEWARES (utilisation dans les routes et contrôleurs)
        // =====================================================================
        $middleware->alias([
            // Vérification de permission RBAC
            // Usage : ->middleware('permission:documents.create')
            'permission' => CheckPermission::class,

            // Application SSO uniquement (désactive le login classique)
            // Usage : ->middleware('sso.only')
            'sso.only' => EnforceSsoOnly::class,

            // Accès réservé aux super-administrateurs IBIG SOFT
            // Usage : ->middleware('superadmin')
            'superadmin' => SuperAdminOnly::class,

            // Résolution manuelle du tenant (pour les contextes sans session)
            'tenant' => ResolveTenant::class,

            // Validation de licence (pour les features on-premise)
            'license' => EnsureValidLicense::class,
        ]);

        // =====================================================================
        // PRIORITÉ DES MIDDLEWARES
        // Les middlewares listés ici sont exécutés en PREMIER, dans cet ordre
        // =====================================================================
        $middleware->priority([
            SecurityHeaders::class,
            RequestMetrics::class,
            ResolveTenant::class,
            ValidateTenantIntegrity::class,
            PreventCrossTenantAccess::class,
            EnsureValidLicense::class,
            EnforceSsoOnly::class,
            CheckPermission::class,
        ]);

    })
    ->withExceptions(function (Exceptions $exceptions) {

        // =====================================================================
        // GESTION DES EXCEPTIONS
        // =====================================================================

        // Cross-tenant access : 403 Forbidden
        $exceptions->render(function (
            \App\Exceptions\CrossTenantAccessException $e,
            Request $request
        ) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'   => 'cross_tenant_access_denied',
                    'message' => __('Accès inter-organisation non autorisé.'),
                ], 403);
            }
            return response()->view('errors.403', ['message' => $e->getMessage()], 403);
        });

        // Licence invalide ou expirée
        $exceptions->render(function (
            \App\Exceptions\InvalidLicenseException $e,
            Request $request
        ) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'   => 'license_invalid',
                    'message' => __('Votre licence SECRETIS est invalide ou expirée.'),
                    'action'  => 'renew',
                    'url'     => config('secretis.docs_url') . '/license',
                ], 402);
            }
            return response()->view('errors.license', [], 402);
        });

        // Permission manquante (RBAC)
        $exceptions->render(function (
            \Spatie\Permission\Exceptions\UnauthorizedException $e,
            Request $request
        ) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'      => 'permission_denied',
                    'message'    => __('Vous n\'avez pas la permission d\'effectuer cette action.'),
                    'required'   => $e->getRequiredPermissions(),
                ], 403);
            }
            return response()->view('errors.403', [], 403);
        });

        // Tenant introuvable ou inactif
        $exceptions->render(function (
            \App\Exceptions\TenantNotFoundException $e,
            Request $request
        ) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'   => 'organization_not_found',
                    'message' => __('Organisation introuvable ou inactive.'),
                ], 404);
            }
            return response()->view('errors.tenant_not_found', [], 404);
        });

        // Rate Limit dépassé
        $exceptions->render(function (
            \Illuminate\Http\Exceptions\ThrottleRequestsException $e,
            Request $request
        ) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error'       => 'rate_limit_exceeded',
                    'message'     => __('Trop de requêtes. Veuillez patienter.'),
                    'retry_after' => $e->getHeaders()['Retry-After'] ?? 60,
                ], 429);
            }
        });

        // Rapport d'erreurs vers Sentry (production uniquement)
        $exceptions->report(function (\Throwable $e) {
            if (app()->environment('production') && class_exists(\Sentry\Laravel\Integration::class)) {
                \Sentry\Laravel\Integration::captureUnhandledException($e);
            }
        });

    })
    ->create();
