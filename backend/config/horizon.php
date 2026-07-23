<?php

use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| SECRETIS ERP — Configuration Laravel Horizon
|--------------------------------------------------------------------------
| Horizon supervise les queues Redis pour tous les jobs asynchrones :
| emails, notifications, imports, exports de rapports, OCR, webhooks…
|
| Architecture des superviseurs :
|  supervisor-1        → jobs généraux (high, default, emails, notifications)
|  supervisor-reports  → génération de rapports BI (mémoire et timeout élevés)
|  supervisor-imports  → imports massifs CSV/Excel (longue durée)
|
| Accès dashboard : /horizon (protégé par HorizonServiceProvider::gate())
*/

return [

    /*
    |--------------------------------------------------------------------------
    | Horizon Domain
    |--------------------------------------------------------------------------
    | Sous-domaine sur lequel Horizon est accessible. null = même domaine.
    */
    'domain' => env('HORIZON_DOMAIN', null),

    /*
    |--------------------------------------------------------------------------
    | Prefix de chemin
    |--------------------------------------------------------------------------
    */
    'path' => env('HORIZON_PATH', 'horizon'),

    /*
    |--------------------------------------------------------------------------
    | Connexion Redis
    |--------------------------------------------------------------------------
    */
    'use' => 'default',

    'prefix' => env(
        'HORIZON_PREFIX',
        Str::slug(env('APP_NAME', 'secretis'), '_') . '_horizon:'
    ),

    /*
    |--------------------------------------------------------------------------
    | Middleware du dashboard Horizon
    |--------------------------------------------------------------------------
    */
    'middleware' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Nombre de minutes avant qu'un job récent soit considéré "terminé"
    |--------------------------------------------------------------------------
    */
    'waits' => [
        'redis:default' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Nombre de jobs récents à conserver en mémoire Horizon
    |--------------------------------------------------------------------------
    */
    'trim' => [
        'recent'        => 60,    // minutes
        'pending'       => 60,
        'completed'     => 120,
        'recent_failed' => 10080, // 7 jours
        'failed'        => 10080,
        'monitored'     => 10080,
    ],

    /*
    |--------------------------------------------------------------------------
    | Métriques Horizon (snapshot toutes les 5 minutes via schedule)
    |--------------------------------------------------------------------------
    */
    'metrics' => [
        'trim_snapshots' => [
            'job'   => 24,  // heures
            'queue' => 24,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Limite de mémoire avant redémarrage automatique du processus (MB)
    |--------------------------------------------------------------------------
    */
    'memory_limit' => 512,

    /*
    |--------------------------------------------------------------------------
    | Queues à surveiller dans le dashboard
    |--------------------------------------------------------------------------
    */
    'defaults' => [
        'supervisor-1' => [
            'connection'          => 'redis',
            'queue'               => ['high', 'default', 'emails', 'notifications'],
            'balance'             => 'auto',
            'autoScalingStrategy' => 'time',
            'minProcesses'        => 1,
            'maxProcesses'        => 10,
            'maxTime'             => 0,
            'maxJobs'             => 0,
            'memory'              => 128,
            'tries'               => 3,
            'timeout'             => 60,
            'nice'                => 0,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Environnements — configuration par environnement
    |--------------------------------------------------------------------------
    */
    'environments' => [

        // =====================================================================
        // PRODUCTION
        // =====================================================================
        'production' => [

            /*
             * Superviseur principal — jobs haute priorité, emails, notifications
             * Balance 'auto' + stratégie 'time' : Horizon ajoute des workers
             * dynamiquement selon la profondeur de la queue et le temps d'attente.
             */
            'supervisor-1' => [
                'connection'          => 'redis',
                'queue'               => ['high', 'default', 'emails', 'notifications'],
                'balance'             => 'auto',
                'autoScalingStrategy' => 'time',
                'maxProcesses'        => 20,
                'minProcesses'        => 2,
                'maxTime'             => 0,        // pas de limite de durée de vie du worker
                'maxJobs'             => 1000,     // redémarrage après N jobs (anti memory-leak)
                'memory'              => 256,      // MB — redémarrage si dépassé
                'tries'               => 3,        // tentatives avant DLQ
                'timeout'             => 60,       // secondes — kill si job dépasse
                'nice'                => 0,
            ],

            /*
             * Superviseur rapports BI — jobs lourds (calculs, exports Excel)
             * Timeout élevé (5 min), mémoire 512 MB, balance simple.
             * Queue dédiée 'reports' pour ne pas bloquer les jobs rapides.
             */
            'supervisor-reports' => [
                'connection'          => 'redis',
                'queue'               => ['reports'],
                'balance'             => 'simple',
                'autoScalingStrategy' => 'size',
                'maxProcesses'        => 5,
                'minProcesses'        => 1,
                'maxTime'             => 0,
                'maxJobs'             => 200,
                'memory'              => 512,
                'tries'               => 2,
                'timeout'             => 300,      // 5 minutes — rapports complexes
                'nice'                => 5,        // priorité CPU réduite
            ],

            /*
             * Superviseur imports — CSV/Excel volumineux, traitement batch
             * Timeout 10 min, peu de workers (opérations I/O intensives).
             * Queue 'imports' séparée pour monitorer les backlogs séparément.
             */
            'supervisor-imports' => [
                'connection'          => 'redis',
                'queue'               => ['imports'],
                'balance'             => 'simple',
                'autoScalingStrategy' => 'size',
                'maxProcesses'        => 3,
                'minProcesses'        => 1,
                'maxTime'             => 0,
                'maxJobs'             => 100,
                'memory'              => 512,
                'tries'               => 2,
                'timeout'             => 600,      // 10 minutes — imports massifs
                'nice'                => 10,
            ],
        ],

        // =====================================================================
        // STAGING / PREPROD
        // =====================================================================
        'staging' => [
            'supervisor-1' => [
                'connection'   => 'redis',
                'queue'        => ['high', 'default', 'reports', 'imports', 'emails', 'notifications'],
                'balance'      => 'auto',
                'maxProcesses' => 5,
                'minProcesses' => 1,
                'maxTime'      => 0,
                'maxJobs'      => 500,
                'memory'       => 256,
                'tries'        => 2,
                'timeout'      => 120,
                'nice'         => 0,
            ],
        ],

        // =====================================================================
        // LOCAL / DÉVELOPPEMENT
        // =====================================================================
        'local' => [
            'supervisor-1' => [
                'connection'   => 'redis',
                'queue'        => ['high', 'default', 'reports', 'imports', 'emails', 'notifications'],
                'balance'      => 'simple',
                'maxProcesses' => 3,
                'minProcesses' => 1,
                'maxTime'      => 0,
                'maxJobs'      => 0,
                'memory'       => 128,
                'tries'        => 1,     // pas de retry en dev
                'timeout'      => 60,
                'nice'         => 0,
            ],
        ],
    ],

];
