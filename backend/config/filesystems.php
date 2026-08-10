<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        /*
        |----------------------------------------------------------------------
        | Sauvegardes froides
        |----------------------------------------------------------------------
        | `BackupDatabase` et `licence:purger` utilisent le disque `s3_backup`,
        | qui N'ETAIT DEFINI NULLE PART : la sauvegarde echouait a l'envoi, et
        | la purge — qui refuse de tourner sans sauvegarde verifiee — ne
        | pouvait donc jamais s'executer. C'etait le bon comportement pour une
        | mauvaise raison.
        |
        | Le disque bascule sur le stockage LOCAL tant qu'aucun bucket n'est
        | configure. Une sauvegarde sur le meme serveur ne protege pas d'une
        | perte de machine, mais elle protege de ce contre quoi la purge doit
        | proteger : une suppression qu'on regrette. Renseigner
        | AWS_BACKUP_BUCKET fait passer au distant sans toucher au code.
        */
        's3_backup' => env('AWS_BACKUP_BUCKET') ? [
            'driver'   => 's3',
            'key'      => env('AWS_ACCESS_KEY_ID'),
            'secret'   => env('AWS_SECRET_ACCESS_KEY'),
            'region'   => env('AWS_DEFAULT_REGION', 'eu-west-3'),
            'bucket'   => env('AWS_BACKUP_BUCKET'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw'    => true,
        ] : [
            'driver' => 'local',
            'root'   => env('BACKUP_LOCAL_ROOT', '/var/backups/secretis'),
            // `throw` a true : une sauvegarde qui echoue en silence est pire
            // que pas de sauvegarde du tout, puisqu'elle autorise la purge.
            'throw'  => true,
        ],

        'private' => [
            'driver' => 'local',
            'root'   => storage_path('app/private'),
            'serve'  => false,
            'throw'  => false,
        ],

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
