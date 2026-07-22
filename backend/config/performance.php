<?php

/**
 * Configuration des performances — SECRETIS ERP
 *
 * Ce fichier centralise tous les paramètres liés aux performances :
 * TTLs de cache, seuils d'alerte, limites de pagination, timeouts.
 *
 * Toutes les valeurs peuvent être surchargées via les variables d'environnement
 * pour adapter le comportement à chaque environnement (dev/staging/prod).
 */

return [

    // =========================================================================
    // TTLs de cache (en secondes)
    // =========================================================================
    'cache' => [

        // Données de référence (changent rarement)
        'reference' => [
            'countries'   => env('CACHE_TTL_COUNTRIES', 86400),   // 24h
            'timezones'   => env('CACHE_TTL_TIMEZONES', 86400),   // 24h
            'roles'       => env('CACHE_TTL_ROLES', 3600),         // 1h
            'plans'       => env('CACHE_TTL_PLANS', 3600),         // 1h
        ],

        // Données d'organisation (changent peu)
        'organization' => [
            'settings'    => env('CACHE_TTL_ORG_SETTINGS', 3600),  // 1h
            'departments' => env('CACHE_TTL_DEPARTMENTS', 1800),    // 30min
            'users_list'  => env('CACHE_TTL_USERS_LIST', 900),      // 15min
            'modules'     => env('CACHE_TTL_MODULES', 3600),        // 1h
        ],

        // Utilisateur (sensible aux changements de permissions)
        'user' => [
            'permissions' => env('CACHE_TTL_PERMISSIONS', 300),     // 5min — court intentionnellement
            'preferences' => env('CACHE_TTL_PREFERENCES', 1800),    // 30min
            'profile'     => env('CACHE_TTL_PROFILE', 600),         // 10min
        ],

        // KPIs et métriques
        'dashboard' => [
            'kpis'        => env('CACHE_TTL_KPIS', 300),            // 5min
            'activity'    => env('CACHE_TTL_ACTIVITY', 120),        // 2min
            'charts'      => env('CACHE_TTL_CHARTS', 600),          // 10min
        ],

        // Agenda / Calendrier
        'calendar' => [
            'events'      => env('CACHE_TTL_EVENTS', 60),           // 1min — très interactif
            'recurring'   => env('CACHE_TTL_RECURRING', 300),       // 5min — récurrences précalculées
        ],

        // Tâches et projets
        'tasks' => [
            'list'        => env('CACHE_TTL_TASKS_LIST', 120),      // 2min
            'kanban'      => env('CACHE_TTL_KANBAN', 60),           // 1min
        ],

        // Courrier
        'mail' => [
            'list'        => env('CACHE_TTL_MAIL_LIST', 180),       // 3min
            'stats'       => env('CACHE_TTL_MAIL_STATS', 300),      // 5min
        ],

        // GED
        'documents' => [
            'list'        => env('CACHE_TTL_DOCS_LIST', 300),       // 5min
            'folder'      => env('CACHE_TTL_FOLDER', 600),          // 10min
        ],
    ],

    // =========================================================================
    // Seuils d'alerte et monitoring
    // =========================================================================
    'thresholds' => [

        // Base de données
        'db' => [
            // Nombre maximum de requêtes SQL par request HTTP avant alerte
            'max_queries_per_request' => env('PERF_MAX_QUERIES', 20),

            // Durée maximale d'une requête SQL (ms) avant log de slow query
            'slow_query_ms' => env('PERF_SLOW_QUERY_MS', 200),

            // Durée maximale d'une transaction (ms)
            'slow_transaction_ms' => env('PERF_SLOW_TRANSACTION_MS', 500),
        ],

        // API
        'api' => [
            // Temps de réponse API cible (ms) — alerte si dépassé
            'target_response_ms' => env('PERF_API_TARGET_MS', 200),

            // Temps de réponse maximum avant considéré comme timeout
            'timeout_ms' => env('PERF_API_TIMEOUT_MS', 5000),
        ],

        // Mémoire
        'memory' => [
            // Limite mémoire PHP par request (Mo) avant alerte
            'alert_mb' => env('PERF_MEMORY_ALERT_MB', 128),
        ],
    ],

    // =========================================================================
    // Pagination
    // =========================================================================
    'pagination' => [
        // Nombre d'éléments par page par défaut pour chaque entité
        'defaults' => [
            'tasks'       => env('PAGINATE_TASKS', 25),
            'events'      => env('PAGINATE_EVENTS', 50),     // FullCalendar charge en lot
            'mail'        => env('PAGINATE_MAIL', 20),
            'documents'   => env('PAGINATE_DOCUMENTS', 30),
            'meetings'    => env('PAGINATE_MEETINGS', 15),
            'users'       => env('PAGINATE_USERS', 20),
            'visitors'    => env('PAGINATE_VISITORS', 25),
            'audit_logs'  => env('PAGINATE_AUDIT', 50),
            'default'     => env('PAGINATE_DEFAULT', 20),
        ],

        // Limite maximale autorisée par page (protection contre les requêtes abusives)
        'max_per_page' => env('PAGINATE_MAX', 100),
    ],

    // =========================================================================
    // Upload de fichiers
    // =========================================================================
    'uploads' => [
        // Taille maximale d'un fichier uploadé (en Mo)
        'max_file_mb' => env('UPLOAD_MAX_FILE_MB', 25),

        // Taille maximale d'un batch de fichiers (en Mo)
        'max_batch_mb' => env('UPLOAD_MAX_BATCH_MB', 100),

        // Types MIME autorisés par défaut pour la GED
        'allowed_mime_types' => [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'text/csv',
        ],
    ],

    // =========================================================================
    // Timeouts des services externes
    // =========================================================================
    'timeouts' => [
        // HTTP client (Guzzle) vers services tiers
        'http_connect_s'  => env('TIMEOUT_HTTP_CONNECT', 5),
        'http_request_s'  => env('TIMEOUT_HTTP_REQUEST', 15),

        // Jobs de queue
        'job_default_s'   => env('TIMEOUT_JOB_DEFAULT', 60),
        'job_pdf_s'       => env('TIMEOUT_JOB_PDF', 120),    // Génération PDF longue
        'job_import_s'    => env('TIMEOUT_JOB_IMPORT', 300), // Import CSV/Excel

        // Redis
        'redis_connect_s' => env('TIMEOUT_REDIS_CONNECT', 2),
    ],

    // =========================================================================
    // Optimisation des réponses HTTP
    // =========================================================================
    'http' => [
        // Activer la compression gzip des réponses JSON
        'gzip_enabled'    => env('HTTP_GZIP_ENABLED', true),

        // Taille minimale (octets) pour compresser
        'gzip_min_size'   => env('HTTP_GZIP_MIN_SIZE', 1024),

        // Niveau de compression gzip (1=rapide, 9=max compression)
        'gzip_level'      => env('HTTP_GZIP_LEVEL', 6),

        // Activer les ETags pour les réponses GET cachables
        'etags_enabled'   => env('HTTP_ETAGS_ENABLED', true),
    ],

    // =========================================================================
    // Logging des performances
    // =========================================================================
    'logging' => [
        // Canal de log pour les requêtes lentes (défini dans config/logging.php)
        'slow_query_channel' => env('LOG_SLOW_QUERY_CHANNEL', 'daily'),

        // Canal pour les alertes de performance
        'alert_channel'      => env('LOG_PERF_ALERT_CHANNEL', 'slack'),

        // Activer le résumé de performance en fin de request (dev uniquement)
        'request_summary'    => env('LOG_REQUEST_SUMMARY', false),
    ],

];
