<?php

/**
 * =============================================================================
 * IBIG SECRETIS ERP — Configuration CORS
 * =============================================================================
 * Politique Cross-Origin Resource Sharing stricte pour l'API SECRETIS.
 *
 * IMPORTANT :
 *  - En production, FRONTEND_URL doit pointer uniquement vers le domaine
 *    officiel de l'application (ex: https://app.secretis.ibigsoft.com).
 *  - Ne jamais utiliser '*' en production — cela exposerait l'API à tout
 *    domaine et annulerait la protection CSRF de Sanctum.
 *  - supports_credentials=true est requis pour que Sanctum puisse lire
 *    le cookie XSRF-TOKEN envoyé par le frontend.
 *
 * Références :
 *  - https://laravel.com/docs/sanctum#cors-and-cookies
 *  - OWASP CORS Cheat Sheet
 * =============================================================================
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Chemins soumis à la politique CORS
    |--------------------------------------------------------------------------
    |
    | Uniquement les routes API et l'endpoint CSRF de Sanctum.
    | Les routes web (Blade/Inertia) ne nécessitent pas CORS car elles sont
    | servies par le même domaine.
    |
    */
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
    |--------------------------------------------------------------------------
    | Méthodes HTTP autorisées
    |--------------------------------------------------------------------------
    */
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
    |--------------------------------------------------------------------------
    | Origines autorisées
    |--------------------------------------------------------------------------
    |
    | En développement : http://localhost:3000 (Vite dev server)
    | En production    : URL du frontend définie dans FRONTEND_URL
    |
    | Pour autoriser plusieurs origines, ajouter des entrées séparées.
    | Ne JAMAIS mettre '*' — cela désactive la protection CSRF.
    |
    */
    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
        env('FRONTEND_URL_SECONDARY'),  // URL secondaire (staging, mobile app)
    ]),

    /*
    |--------------------------------------------------------------------------
    | Patterns d'origines (regex)
    |--------------------------------------------------------------------------
    |
    | Laisser vide en production. Peut être utilisé en développement pour
    | autoriser plusieurs ports (ex: localhost:3000-3009).
    |
    */
    'allowed_origins_patterns' => array_filter([
        app()->environment('local')
            ? '/^http:\/\/localhost:\d{4,5}$/'  // Dev : n'importe quel port local
            : null,
    ]),

    /*
    |--------------------------------------------------------------------------
    | En-têtes de requête autorisés
    |--------------------------------------------------------------------------
    */
    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'Authorization',
        'X-XSRF-TOKEN',
        'Accept',
        'Accept-Language',
        'X-Organization',      // Header multi-tenant SECRETIS
    ],

    /*
    |--------------------------------------------------------------------------
    | En-têtes exposés dans les réponses
    |--------------------------------------------------------------------------
    |
    | Le frontend peut lire ces headers via JavaScript.
    |
    */
    'exposed_headers' => [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'Retry-After',
        'X-Request-ID',
    ],

    /*
    |--------------------------------------------------------------------------
    | Durée de cache du preflight OPTIONS (secondes)
    |--------------------------------------------------------------------------
    |
    | 1 heure = 3600 secondes. Réduit les requêtes OPTIONS répétées.
    |
    */
    'max_age' => 3600,

    /*
    |--------------------------------------------------------------------------
    | Autorisation des credentials (cookies, sessions)
    |--------------------------------------------------------------------------
    |
    | OBLIGATOIRE pour Sanctum : le cookie XSRF-TOKEN doit être envoyé
    | avec chaque requête d'état modifiant.
    |
    | Quand supports_credentials=true, les origines '*' sont interdites
    | par la spec CORS — c'est pourquoi allowed_origins doit être explicite.
    |
    */
    'supports_credentials' => true,

];
