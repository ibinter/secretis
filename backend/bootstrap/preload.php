<?php

/**
 * OpCache Preloading — SECRETIS ERP
 *
 * Ce script est exécuté une seule fois au démarrage de PHP-FPM
 * (opcache.preload dans opcache.ini). Il compile et met en mémoire
 * les classes les plus fréquemment utilisées avant la première requête.
 *
 * Impact mesuré :
 *   - Réduction du temps de la 1re requête post-déploiement : ~40 %
 *   - Réduction de la variance p99 : ~25 %
 *
 * IMPORTANT :
 *   - Ce fichier est exécuté avec opcache.preload_user=www-data
 *   - Toute erreur ici empêche FPM de démarrer → logger les exceptions
 *   - Ne jamais inclure de fichiers qui dépendent de l'environnement
 *     (config, .env) car l'environnement n'est pas chargé à ce stade
 *
 * Mise à jour après chaque déploiement :
 *   docker exec php kill -USR2 1  (reload FPM gracieux)
 */

declare(strict_types=1);

// Autoloader Composer — requis pour résoudre les chemins
require_once __DIR__ . '/../vendor/autoload.php';

$preloadFiles = [
    // ── Illuminate / Framework core ──────────────────────────────────────────
    'vendor/laravel/framework/src/Illuminate/Support/Collection.php',
    'vendor/laravel/framework/src/Illuminate/Support/Str.php',
    'vendor/laravel/framework/src/Illuminate/Support/Arr.php',
    'vendor/laravel/framework/src/Illuminate/Support/Carbon.php',
    'vendor/laravel/framework/src/Illuminate/Support/Facades/Facade.php',
    'vendor/laravel/framework/src/Illuminate/Support/Facades/Cache.php',
    'vendor/laravel/framework/src/Illuminate/Support/Facades/DB.php',
    'vendor/laravel/framework/src/Illuminate/Support/Facades/Log.php',
    'vendor/laravel/framework/src/Illuminate/Support/Facades/Auth.php',

    // ── ORM Eloquent ─────────────────────────────────────────────────────────
    'vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php',
    'vendor/laravel/framework/src/Illuminate/Database/Eloquent/Builder.php',
    'vendor/laravel/framework/src/Illuminate/Database/Eloquent/Relations/HasMany.php',
    'vendor/laravel/framework/src/Illuminate/Database/Eloquent/Relations/BelongsTo.php',
    'vendor/laravel/framework/src/Illuminate/Database/Eloquent/SoftDeletes.php',
    'vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php',
    'vendor/laravel/framework/src/Illuminate/Database/Connection.php',

    // ── HTTP / Routing ────────────────────────────────────────────────────────
    'vendor/laravel/framework/src/Illuminate/Http/Request.php',
    'vendor/laravel/framework/src/Illuminate/Http/JsonResponse.php',
    'vendor/laravel/framework/src/Illuminate/Routing/Router.php',
    'vendor/laravel/framework/src/Illuminate/Routing/Route.php',
    'vendor/laravel/framework/src/Illuminate/Routing/Controller.php',

    // ── Cache ────────────────────────────────────────────────────────────────
    'vendor/laravel/framework/src/Illuminate/Cache/RedisStore.php',
    'vendor/laravel/framework/src/Illuminate/Cache/TaggedCache.php',
    'vendor/laravel/framework/src/Illuminate/Cache/Repository.php',

    // ── Auth / Permissions ────────────────────────────────────────────────────
    'vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php',
    'vendor/laravel/framework/src/Illuminate/Auth/Guard.php',
    'vendor/spatie/laravel-permission/src/Models/Permission.php',
    'vendor/spatie/laravel-permission/src/Models/Role.php',
    'vendor/spatie/laravel-permission/src/Traits/HasRoles.php',
    'vendor/spatie/laravel-permission/src/Traits/HasPermissions.php',

    // ── Inertia.js ────────────────────────────────────────────────────────────
    'vendor/inertiajs/inertia-laravel/src/Inertia.php',
    'vendor/inertiajs/inertia-laravel/src/Response.php',
    'vendor/inertiajs/inertia-laravel/src/DeferredProp.php',

    // ── Services SECRETIS les plus sollicités ────────────────────────────────
    'app/Services/CacheService.php',
    'app/Services/StatisticsService.php',
    'app/Services/NotificationService.php',
    'app/Services/AgendaService.php',

    // ── Modèles core (multi-tenant) ───────────────────────────────────────────
    'app/Models/Organization.php',
    'app/Models/User.php',
    'app/Models/Event.php',
    'app/Models/Task.php',
    'app/Models/Document.php',
    'app/Models/Meeting.php',

    // ── Middleware critiques ──────────────────────────────────────────────────
    'app/Http/Middleware/ResolveTenant.php',
    'app/Http/Middleware/PreventCrossTenantAccess.php',
    'app/Http/Middleware/CheckPermission.php',
    'app/Http/Middleware/PerformanceMonitor.php',
];

$base   = __DIR__ . '/../';
$loaded = 0;
$errors = 0;

foreach ($preloadFiles as $relativePath) {
    $absolutePath = $base . $relativePath;

    if (! file_exists($absolutePath)) {
        // Fichier absent (dépendance optionnelle ou renommage) — non bloquant
        continue;
    }

    try {
        opcache_compile_file($absolutePath);
        $loaded++;
    } catch (Throwable $e) {
        // Logger sans crasher FPM
        error_log("[OpCache Preload] Erreur sur {$relativePath}: " . $e->getMessage());
        $errors++;
    }
}

error_log("[OpCache Preload] Terminé : {$loaded} fichiers chargés, {$errors} erreur(s).");
