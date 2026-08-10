<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\SyslogUdpHandler;
use Monolog\Processor\PsrLogMessageProcessor;

return [

    /*
    |--------------------------------------------------------------------------
    | Default Log Channel
    |--------------------------------------------------------------------------
    |
    | This option defines the default log channel that is utilized to write
    | messages to your logs. The value provided here should match one of
    | the channels present in the list of "channels" configured below.
    |
    */

    'default' => env('LOG_CHANNEL', 'stack'),

    /*
    |--------------------------------------------------------------------------
    | Deprecations Log Channel
    |--------------------------------------------------------------------------
    |
    | This option controls the log channel that should be used to log warnings
    | regarding deprecated PHP and library features. This allows you to get
    | your application ready for upcoming major versions of dependencies.
    |
    */

    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace' => env('LOG_DEPRECATIONS_TRACE', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Log Channels
    |--------------------------------------------------------------------------
    |
    | Here you may configure the log channels for your application. Laravel
    | utilizes the Monolog PHP logging library, which includes a variety
    | of powerful log handlers and formatters that you're free to use.
    |
    | Available drivers: "single", "daily", "slack", "syslog",
    |                    "errorlog", "monolog", "custom", "stack"
    |
    */

    'channels' => [

        'stack' => [
            'driver' => 'stack',
            'channels' => explode(',', env('LOG_STACK', 'single')),
            'ignore_exceptions' => false,
        ],

        'single' => [
            'driver' => 'single',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'daily' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'days' => env('LOG_DAILY_DAYS', 14),
            'replace_placeholders' => true,
        ],

        'slack' => [
            'driver' => 'slack',
            'url' => env('LOG_SLACK_WEBHOOK_URL'),
            'username' => env('LOG_SLACK_USERNAME', 'Laravel Log'),
            'emoji' => env('LOG_SLACK_EMOJI', ':boom:'),
            'level' => env('LOG_LEVEL', 'critical'),
            'replace_placeholders' => true,
        ],

        'papertrail' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => env('LOG_PAPERTRAIL_HANDLER', SyslogUdpHandler::class),
            'handler_with' => [
                'host' => env('PAPERTRAIL_URL'),
                'port' => env('PAPERTRAIL_PORT'),
                'connectionString' => 'tls://'.env('PAPERTRAIL_URL').':'.env('PAPERTRAIL_PORT'),
            ],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'stderr' => [
            'driver' => 'monolog',
            'level' => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'formatter' => env('LOG_STDERR_FORMATTER'),
            'with' => [
                'stream' => 'php://stderr',
            ],
            'processors' => [PsrLogMessageProcessor::class],
        ],

        'syslog' => [
            'driver' => 'syslog',
            'level' => env('LOG_LEVEL', 'debug'),
            'facility' => env('LOG_SYSLOG_FACILITY', LOG_USER),
            'replace_placeholders' => true,
        ],

        'errorlog' => [
            'driver' => 'errorlog',
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

        'null' => [
            'driver' => 'monolog',
            'handler' => NullHandler::class,
        ],

        'emergency' => [
            'path' => storage_path('logs/laravel.log'),
        ],

        'performance' => [
            'driver' => 'daily',
            'path' => storage_path('logs/laravel.log'),
            'level' => 'info',
            'days' => 14,
            'replace_placeholders' => true,
        ],

        // ── Canaux appelés par le code mais jamais déclarés ─────────────────
        // `Log::channel('x')` sur un canal absent lève InvalidArgumentException.
        // Ces sept canaux étaient utilisés dans l'application sans exister :
        // billing, errors, gdpr, notifications, payments, security, support.
        //
        // Le piège tient à l'endroit où ils sont appelés : presque toujours
        // dans un `catch`. La tentative de journaliser une erreur levait donc
        // une SECONDE erreur, qui remplaçait la première — on perdait
        // exactement le diagnostic qu'on cherchait à conserver.
        //
        // Chacun écrit dans son propre fichier : mêler la sécurité et les
        // paiements au journal applicatif rend l'un et l'autre illisibles.
        // Les durées de rétention diffèrent selon l'enjeu : une trace de
        // sécurité ou de paiement se conserve plus longtemps qu'un avis de
        // notification.
        'security' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/security.log'),
            'level'  => 'debug',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        'payments' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/payments.log'),
            'level'  => 'debug',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        'billing' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/billing.log'),
            'level'  => 'debug',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        // Traces de traitement de données personnelles : la durée de
        // conservation relève du registre RGPD, pas du confort d'exploitation.
        'gdpr' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/gdpr.log'),
            'level'  => 'debug',
            'days'   => 365,
            'replace_placeholders' => true,
        ],

        'notifications' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/notifications.log'),
            'level'  => 'debug',
            'days'   => 30,
            'replace_placeholders' => true,
        ],

        'support' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/support.log'),
            'level'  => 'debug',
            'days'   => 90,
            'replace_placeholders' => true,
        ],

        'errors' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/errors.log'),
            'level'  => 'error',
            'days'   => 90,
            'replace_placeholders' => true,
        ],

        'audit_fallback' => [
            'driver' => 'single',
            'path' => storage_path('logs/audit_fallback.log'),
            'level' => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
        ],

    ],

];
