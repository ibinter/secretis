<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\SyslogUdpHandler;
use Monolog\Processor\PsrLogMessageProcessor;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Log Channel — SECRETIS ERP
    |--------------------------------------------------------------------------
    */

    'default' => env('LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Deprecations Log Channel
    |--------------------------------------------------------------------------
    */

    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace'   => env('LOG_DEPRECATIONS_TRACE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Channels
    |--------------------------------------------------------------------------
    */

    'channels' => [

        // ── Stacks ────────────────────────────────────────────────────────────

        /**
         * Stack production : daily + slack (critical/alert uniquement)
         */
        'production' => [
            'driver'   => 'stack',
            'channels' => ['daily', 'slack'],
            'ignore_exceptions' => false,
        ],

        /**
         * Stack development : daily + stderr
         */
        'development' => [
            'driver'   => 'stack',
            'channels' => ['daily', 'stderr'],
            'ignore_exceptions' => false,
        ],

        /**
         * Stack par défaut (alias dynamique selon l'env)
         */
        'stack' => [
            'driver'            => 'stack',
            'channels'          => env('APP_ENV', 'production') === 'production'
                ? ['daily', 'slack']
                : ['daily', 'stderr'],
            'ignore_exceptions' => false,
        ],

        // ── Channels individuels ──────────────────────────────────────────────

        /**
         * Logs quotidiens principaux — rotation 14 jours, WARNING+ en prod
         */
        'daily' => [
            'driver'     => 'daily',
            'path'       => storage_path('logs/secretis.log'),
            'level'      => env('LOG_LEVEL', env('APP_ENV', 'production') === 'production' ? 'warning' : 'debug'),
            'days'       => 14,
            'replace_placeholders' => true,
        ],

        /**
         * Slack — alertes critiques uniquement
         * Configurer SLACK_LOG_WEBHOOK_URL dans .env
         */
        'slack' => [
            'driver'   => 'slack',
            'url'      => env('SLACK_LOG_WEBHOOK_URL', ''),
            'username' => 'SECRETIS Monitor',
            'emoji'    => ':rotating_light:',
            'level'    => env('LOG_SLACK_LEVEL', 'critical'),
            'replace_placeholders' => true,
        ],

        /**
         * Audit — logs d'audit immuables (INSERT ONLY), 365 jours
         * Fichier séparé, jamais rotaté avant 1 an
         */
        'audit' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/audit/audit.log'),
            'level'  => 'debug',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        /**
         * Payment — logs paiements critiques, fichier dédié
         */
        'payment' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/payment/payment.log'),
            'level'  => 'info',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        /**
         * Security — violations de sécurité, tentatives d'intrusion
         */
        'security' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/security/security.log'),
            'level'  => 'info',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        /**
         * Performance — requêtes lentes, N+1, timeouts
         */
        'performance' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/performance/performance.log'),
            'level'  => 'info',
            'days'   => 30,
            'replace_placeholders' => true,
        ],

        /**
         * Stderr — utile en développement pour voir les logs dans la console
         */
        'stderr' => [
            'driver'    => 'monolog',
            'level'     => env('LOG_LEVEL', 'debug'),
            'handler'   => StreamHandler::class,
            'formatter' => env('LOG_STDERR_FORMATTER'),
            'with'      => [
                'stream' => 'php://stderr',
            ],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        /**
         * Syslog — pour intégration avec des outils systèmes (rsyslog, etc.)
         */
        'syslog' => [
            'driver'  => 'syslog',
            'channel' => env('APP_NAME', 'secretis'),
            'facility' => env('LOG_SYSLOG_FACILITY', LOG_USER),
            'level'   => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        /**
         * Null — absorbe tous les logs (tests, etc.)
         */
        'null' => [
            'driver'  => 'monolog',
            'handler' => NullHandler::class,
        ],

        /**
         * Emergency — fichier d'urgence si tous les channels échouent
         */
        'emergency' => [
            'path' => storage_path('logs/emergency.log'),
        ],

    ],

];
