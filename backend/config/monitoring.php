<?php

/**
 * Configuration du monitoring SECRETIS ERP
 *
 * Variables d'environnement :
 *   MONITORING_ADMIN_EMAIL       — email de l'admin technique pour les alertes
 *   MONITORING_METRICS_IP_WHITELIST — IPs autorisées à scraper /metrics (CSV)
 *   MONITORING_SLACK_WEBHOOK     — webhook Slack pour les alertes
 *   MONITORING_ENABLED           — activer/désactiver le monitoring (default: true)
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Activation
    |--------------------------------------------------------------------------
    */
    'enabled' => env('MONITORING_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Email administrateur technique
    |--------------------------------------------------------------------------
    */
    'admin_email' => env('MONITORING_ADMIN_EMAIL', env('MAIL_FROM_ADDRESS', 'admin@secretis.app')),

    /*
    |--------------------------------------------------------------------------
    | IPs autorisées à scraper /metrics (format Prometheus)
    | Séparées par des virgules : 127.0.0.1,10.0.0.5,::1
    |--------------------------------------------------------------------------
    */
    'metrics_ip_whitelist' => env('MONITORING_METRICS_IP_WHITELIST', '127.0.0.1,::1'),

    /*
    |--------------------------------------------------------------------------
    | Seuils d'alerte
    |--------------------------------------------------------------------------
    */
    'thresholds' => [
        'error_rate_pct'    => env('MONITORING_ERROR_RATE_THRESHOLD', 5),       // % d'erreurs 5xx
        'slow_query_ms'     => env('MONITORING_SLOW_QUERY_MS', 300),             // ms
        'disk_free_pct_min' => env('MONITORING_DISK_FREE_MIN', 10),              // % espace libre minimum
        'queue_pending_max' => env('MONITORING_QUEUE_PENDING_MAX', 1000),        // jobs en attente
        'queue_failed_max'  => env('MONITORING_QUEUE_FAILED_MAX', 100),          // jobs échoués
    ],

    /*
    |--------------------------------------------------------------------------
    | Anti-spam alertes (minutes de silence entre deux alertes du même type)
    |--------------------------------------------------------------------------
    */
    'alert_cooldown_minutes' => env('MONITORING_ALERT_COOLDOWN', 60),

    /*
    |--------------------------------------------------------------------------
    | Rétention des métriques Redis (secondes)
    |--------------------------------------------------------------------------
    */
    'redis_retention' => [
        'request_counters' => 172800,  // 48 heures
        'minute_totals'    => 7200,    // 2 heures
        'error_counters'   => 600,     // 10 minutes
        'db_duration'      => 86400,   // 24 heures
        'cache_counters'   => 86400,   // 24 heures
    ],

];
