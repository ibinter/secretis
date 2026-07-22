<?php

// =============================================================================
// IBIG SECRETIS ERP — Configuration personnalisée
// Fichier : config/secretis.php
// =============================================================================

return [

    /*
    |--------------------------------------------------------------------------
    | Informations de l'application
    |--------------------------------------------------------------------------
    */
    'app' => [
        'name'        => 'IBIG SECRETIS',
        'vendor'      => 'IBIG Soft',
        'version'     => '1.0.0',
        'website'     => 'https://secretis.ibigsoft.com',
        'support_email' => 'support@ibigsoft.com',
        'docs_url'    => 'https://docs.secretis.ibigsoft.com',
    ],

    /*
    |--------------------------------------------------------------------------
    | Essai gratuit
    |--------------------------------------------------------------------------
    */
    'trial' => [
        'duration_days'     => env('TRIAL_DAYS', 14),
        'features_included' => 'all', // Accès à tous les modules pendant l'essai
        'max_users_trial'   => 5,
        'max_storage_mb'    => 500,
        'reminder_days'     => [7, 3, 1], // Jours avant expiration pour envoyer rappels
    ],

    /*
    |--------------------------------------------------------------------------
    | Plans / Offres commerciales
    |--------------------------------------------------------------------------
    | Cibles marché africain : prix en XOF (FCFA) et USD
    */
    'plans' => [

        'starter' => [
            'name'              => 'Starter',
            'slug'              => 'starter',
            'description'       => 'Pour les petites structures (mairies, ONG, TPE)',
            'max_users'         => 10,
            'max_storage_gb'    => 5,
            'price_monthly_usd' => 29,
            'price_yearly_usd'  => 290,
            'price_monthly_xof' => 17500,
            'price_yearly_xof'  => 175000,
            'modules'           => [
                'agenda',
                'courrier',
                'taches',
                'communication',
                'parametres',
            ],
            'features' => [
                'ocr'              => false,
                'ia_assistant'     => false,
                'api_access'       => false,
                'custom_domain'    => false,
                'advanced_reports' => false,
                'sso'              => false,
                'priority_support' => false,
            ],
        ],

        'professional' => [
            'name'              => 'Professional',
            'slug'              => 'professional',
            'description'       => 'Pour les PME, administrations et organisations moyennes',
            'max_users'         => 50,
            'max_storage_gb'    => 50,
            'price_monthly_usd' => 79,
            'price_yearly_usd'  => 790,
            'price_monthly_xof' => 48000,
            'price_yearly_xof'  => 480000,
            'modules'           => [
                'agenda',
                'courrier',
                'reunions',
                'taches',
                'communication',
                'accueil',
                'ressources',
                'rapports',
                'parametres',
            ],
            'features' => [
                'ocr'              => true,
                'ia_assistant'     => true,
                'api_access'       => true,
                'custom_domain'    => false,
                'advanced_reports' => true,
                'sso'              => false,
                'priority_support' => false,
            ],
        ],

        'enterprise' => [
            'name'              => 'Enterprise',
            'slug'              => 'enterprise',
            'description'       => 'Pour les grandes organisations, ministères, groupes',
            'max_users'         => -1, // Illimité
            'max_storage_gb'    => -1, // Illimité
            'price_monthly_usd' => 199,
            'price_yearly_usd'  => 1990,
            'price_monthly_xof' => 120000,
            'price_yearly_xof'  => 1200000,
            'modules'           => [
                'agenda',
                'courrier',
                'reunions',
                'taches',
                'communication',
                'accueil',
                'ressources',
                'rh',
                'rapports',
                'parametres',
            ],
            'features' => [
                'ocr'              => true,
                'ia_assistant'     => true,
                'api_access'       => true,
                'custom_domain'    => true,
                'advanced_reports' => true,
                'sso'              => true,
                'priority_support' => true,
                'dedicated_account_manager' => true,
                'on_premise_option' => true,
            ],
        ],

        'custom' => [
            'name'        => 'Sur mesure',
            'slug'        => 'custom',
            'description' => 'Offre personnalisée — contacter IBIG Soft',
            'modules'     => [], // Défini manuellement par client
            'features'    => [], // Défini manuellement par client
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Modules disponibles
    |--------------------------------------------------------------------------
    | Liste complète des modules avec leurs métadonnées
    */
    'modules' => [

        'agenda' => [
            'name'        => 'Agenda',
            'slug'        => 'agenda',
            'description' => 'Gestion des rendez-vous et calendriers',
            'icon'        => 'calendar',
            'color'       => '#3b82f6',
            'route_prefix' => 'agenda',
            'permissions' => ['view', 'create', 'edit', 'delete', 'export'],
            'enabled'     => true,
        ],

        'courrier' => [
            'name'        => 'Courrier & GED',
            'slug'        => 'courrier',
            'description' => 'Gestion du courrier entrant/sortant et des documents',
            'icon'        => 'mail',
            'color'       => '#f59e0b',
            'route_prefix' => 'courrier',
            'permissions' => ['view', 'create', 'edit', 'delete', 'assign', 'archive', 'export'],
            'enabled'     => true,
        ],

        'reunions' => [
            'name'        => 'Réunions',
            'slug'        => 'reunions',
            'description' => 'Organisation et suivi des réunions, PV',
            'icon'        => 'users',
            'color'       => '#8b5cf6',
            'route_prefix' => 'reunions',
            'permissions' => ['view', 'create', 'edit', 'delete', 'generate_pv', 'export'],
            'enabled'     => true,
        ],

        'taches' => [
            'name'        => 'Tâches',
            'slug'        => 'taches',
            'description' => 'Gestion et suivi des tâches (Kanban)',
            'icon'        => 'check-square',
            'color'       => '#10b981',
            'route_prefix' => 'taches',
            'permissions' => ['view', 'create', 'edit', 'delete', 'assign', 'export'],
            'enabled'     => true,
        ],

        'communication' => [
            'name'        => 'Communication',
            'slug'        => 'communication',
            'description' => 'Messagerie interne et notifications',
            'icon'        => 'message-circle',
            'color'       => '#06b6d4',
            'route_prefix' => 'communication',
            'permissions' => ['view', 'send', 'create_channel', 'manage_channels'],
            'enabled'     => true,
        ],

        'accueil' => [
            'name'        => 'Accueil & Visiteurs',
            'slug'        => 'accueil',
            'description' => 'Gestion des visiteurs et rendez-vous d\'accueil',
            'icon'        => 'user-check',
            'color'       => '#f97316',
            'route_prefix' => 'accueil',
            'permissions' => ['view', 'create', 'edit', 'delete', 'checkout', 'export'],
            'enabled'     => true,
        ],

        'ressources' => [
            'name'        => 'Ressources',
            'slug'        => 'ressources',
            'description' => 'Réservation de salles, véhicules et équipements',
            'icon'        => 'package',
            'color'       => '#ec4899',
            'route_prefix' => 'ressources',
            'permissions' => ['view', 'create', 'edit', 'delete', 'reserve', 'approve', 'export'],
            'enabled'     => true,
        ],

        'rh' => [
            'name'        => 'Ressources Humaines',
            'slug'        => 'rh',
            'description' => 'Annuaire, congés, présences et organigramme',
            'icon'        => 'briefcase',
            'color'       => '#6366f1',
            'route_prefix' => 'rh',
            'permissions' => ['view', 'create', 'edit', 'delete', 'manage_leaves', 'export'],
            'enabled'     => true,
        ],

        'rapports' => [
            'name'        => 'Rapports & Statistiques',
            'slug'        => 'rapports',
            'description' => 'Tableaux de bord, indicateurs et exports',
            'icon'        => 'bar-chart-2',
            'color'       => '#14b8a6',
            'route_prefix' => 'rapports',
            'permissions' => ['view', 'create', 'export', 'schedule'],
            'enabled'     => true,
        ],

        'parametres' => [
            'name'        => 'Paramètres',
            'slug'        => 'parametres',
            'description' => 'Configuration de l\'organisation et des utilisateurs',
            'icon'        => 'settings',
            'color'       => '#6b7280',
            'route_prefix' => 'parametres',
            'permissions' => ['view', 'edit', 'manage_users', 'manage_roles', 'manage_modules'],
            'enabled'     => true,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Fournisseurs d'Intelligence Artificielle
    |--------------------------------------------------------------------------
    */
    'ai' => [

        'default_provider' => env('AI_PROVIDER', 'groq'),

        'providers' => [

            'groq' => [
                'name'        => 'Groq',
                'api_key_env' => 'GROQ_API_KEY',
                'base_url'    => 'https://api.groq.com/openai/v1',
                'models' => [
                    'fast'    => 'llama3-8b-8192',
                    'smart'   => 'llama3-70b-8192',
                    'default' => env('GROQ_DEFAULT_MODEL', 'llama3-8b-8192'),
                ],
                'use_cases' => [
                    'ocr_correction',
                    'courrier_summary',
                    'pv_generation',
                    'smart_search',
                    'auto_classification',
                ],
                'enabled' => true,
            ],

            'openai' => [
                'name'        => 'OpenAI',
                'api_key_env' => 'OPENAI_API_KEY',
                'base_url'    => 'https://api.openai.com/v1',
                'models' => [
                    'fast'    => 'gpt-4o-mini',
                    'smart'   => 'gpt-4o',
                    'default' => 'gpt-4o-mini',
                ],
                'enabled' => false, // Activer si clé disponible
            ],

            'anthropic' => [
                'name'        => 'Anthropic Claude',
                'api_key_env' => 'ANTHROPIC_API_KEY',
                'base_url'    => 'https://api.anthropic.com/v1',
                'models' => [
                    'fast'    => 'claude-haiku-3',
                    'smart'   => 'claude-sonnet-4',
                    'default' => 'claude-haiku-3',
                ],
                'enabled' => false,
            ],

        ],

        'features' => [
            'ocr_correction'     => true,   // Correction des erreurs OCR
            'courrier_summary'   => true,   // Résumé automatique des courriers
            'pv_generation'      => true,   // Génération assistée des PV
            'smart_search'       => true,   // Recherche sémantique
            'auto_classification' => true,  // Classification auto des documents
            'translation'        => false,  // Traduction (FR ↔ EN ↔ langues locales)
            'sentiment_analysis' => false,  // Analyse sentiment (optionnel)
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Devises supportées
    |--------------------------------------------------------------------------
    | Marché cible : Afrique subsaharienne francophone + internationale
    */
    'currencies' => [

        'default' => 'XOF',

        'supported' => [

            'XOF' => [
                'code'     => 'XOF',
                'name'     => 'Franc CFA BCEAO',
                'symbol'   => 'FCFA',
                'decimals' => 0,
                'countries' => [
                    'CI', 'SN', 'BF', 'ML', 'NE', 'GN', 'BJ', 'TG',
                ],
            ],

            'XAF' => [
                'code'     => 'XAF',
                'name'     => 'Franc CFA BEAC',
                'symbol'   => 'FCFA',
                'decimals' => 0,
                'countries' => [
                    'CM', 'CF', 'CG', 'GA', 'GQ', 'TD',
                ],
            ],

            'GHS' => [
                'code'     => 'GHS',
                'name'     => 'Cedi ghanéen',
                'symbol'   => 'GH₵',
                'decimals' => 2,
                'countries' => ['GH'],
            ],

            'NGN' => [
                'code'     => 'NGN',
                'name'     => 'Naira nigérian',
                'symbol'   => '₦',
                'decimals' => 2,
                'countries' => ['NG'],
            ],

            'KES' => [
                'code'     => 'KES',
                'name'     => 'Shilling kényan',
                'symbol'   => 'KSh',
                'decimals' => 2,
                'countries' => ['KE'],
            ],

            'MAD' => [
                'code'     => 'MAD',
                'name'     => 'Dirham marocain',
                'symbol'   => 'DH',
                'decimals' => 2,
                'countries' => ['MA'],
            ],

            'USD' => [
                'code'     => 'USD',
                'name'     => 'Dollar américain',
                'symbol'   => '$',
                'decimals' => 2,
                'countries' => ['*'], // International
            ],

            'EUR' => [
                'code'     => 'EUR',
                'name'     => 'Euro',
                'symbol'   => '€',
                'decimals' => 2,
                'countries' => ['*'], // International
            ],

        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Langues supportées
    |--------------------------------------------------------------------------
    */
    'locales' => [

        'default'   => 'fr',
        'fallback'  => 'en',

        'supported' => [

            'fr' => [
                'code'      => 'fr',
                'name'      => 'Français',
                'native'    => 'Français',
                'flag'      => '🇫🇷',
                'direction' => 'ltr',
                'date_format' => 'd/m/Y',
                'time_format' => 'H:i',
                'enabled'   => true,
            ],

            'en' => [
                'code'      => 'en',
                'name'      => 'English',
                'native'    => 'English',
                'flag'      => '🇬🇧',
                'direction' => 'ltr',
                'date_format' => 'm/d/Y',
                'time_format' => 'g:i A',
                'enabled'   => true,
            ],

            'ar' => [
                'code'      => 'ar',
                'name'      => 'Arabic',
                'native'    => 'العربية',
                'flag'      => '🇸🇦',
                'direction' => 'rtl',
                'date_format' => 'Y/m/d',
                'time_format' => 'H:i',
                'enabled'   => false, // Prévu v2
            ],

            'pt' => [
                'code'      => 'pt',
                'name'      => 'Português',
                'native'    => 'Português',
                'flag'      => '🇧🇷',
                'direction' => 'ltr',
                'date_format' => 'd/m/Y',
                'time_format' => 'H:i',
                'enabled'   => false, // Prévu v2 (Mozambique, Angola, Cap-Vert)
            ],

        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Fuseaux horaires africains par défaut
    |--------------------------------------------------------------------------
    */
    'timezones' => [
        'default' => 'Africa/Abidjan',
        'africa' => [
            'Africa/Abidjan'     => 'Abidjan (GMT+0)',
            'Africa/Dakar'       => 'Dakar (GMT+0)',
            'Africa/Bamako'      => 'Bamako (GMT+0)',
            'Africa/Lagos'       => 'Lagos (GMT+1)',
            'Africa/Douala'      => 'Douala (GMT+1)',
            'Africa/Kinshasa'    => 'Kinshasa (GMT+1)',
            'Africa/Nairobi'     => 'Nairobi (GMT+3)',
            'Africa/Casablanca'  => 'Casablanca (GMT+1)',
            'Africa/Tunis'       => 'Tunis (GMT+1)',
            'Africa/Cairo'       => 'Le Caire (GMT+2)',
            'Africa/Johannesburg' => 'Johannesburg (GMT+2)',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Numérotation des courriers
    |--------------------------------------------------------------------------
    */
    'courrier' => [
        'reference_format'  => '{YEAR}/{MONTH}/{SEQ:5}', // Ex: 2025/07/00142
        'types' => [
            'entrant'  => ['label' => 'Courrier entrant',  'code' => 'CE', 'color' => '#3b82f6'],
            'sortant'  => ['label' => 'Courrier sortant',  'code' => 'CS', 'color' => '#10b981'],
            'interne'  => ['label' => 'Courrier interne',  'code' => 'CI', 'color' => '#f59e0b'],
        ],
        'priorities' => [
            'normale'  => ['label' => 'Normale',  'color' => '#6b7280'],
            'urgent'   => ['label' => 'Urgent',   'color' => '#f59e0b'],
            'confidentiel' => ['label' => 'Confidentiel', 'color' => '#ef4444'],
        ],
        'max_file_size_mb' => 20,
        'allowed_types'    => ['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Stockage fichiers
    |--------------------------------------------------------------------------
    */
    'storage' => [
        'disk'               => env('SECRETIS_STORAGE_DISK', 'local'),
        'max_file_size_mb'   => 50,
        'allowed_mime_types' => [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/tiff',
            'image/webp',
        ],
        'paths' => [
            'courriers'  => 'courriers/{org_id}/{year}/{month}',
            'documents'  => 'documents/{org_id}/{year}',
            'avatars'    => 'avatars/{org_id}',
            'exports'    => 'exports/{org_id}',
            'temp'       => 'temp',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */
    'notifications' => [
        'channels' => [
            'database' => true,   // Notifications in-app
            'mail'     => true,   // Email
            'broadcast' => true,  // Temps réel via Reverb
            'sms'      => false,  // SMS (optionnel, intégration Twilio/Africa'sTalking)
            'push'     => false,  // Push mobile (optionnel)
        ],
        'sms_provider'  => env('SMS_PROVIDER', 'africas_talking'),
        'africas_talking' => [
            'api_key'  => env('AT_API_KEY'),
            'username' => env('AT_USERNAME'),
            'sender'   => env('AT_SENDER', 'SECRETIS'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Audit & Sécurité
    |--------------------------------------------------------------------------
    */
    'audit' => [
        'enabled'            => true,
        'retention_days'     => 365,       // Durée de conservation des logs
        'log_reads'          => false,     // Logger les consultations (verbose)
        'log_exports'        => true,      // Logger tous les exports
        'sensitive_fields'   => [          // Champs à masquer dans les logs
            'password', 'token', 'secret', 'api_key',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Licence
    |--------------------------------------------------------------------------
    */
    'license' => [
        'check_url'          => env('LICENSE_CHECK_URL', 'https://licenses.ibigsoft.com/api/check'),
        'check_interval_hours' => 24,
        'grace_period_days'  => 3,   // Jours de grâce après expiration avant blocage
        'offline_mode_days'  => 7,   // Jours de fonctionnement sans connexion au serveur
    ],

    /*
    |--------------------------------------------------------------------------
    | Paiements multicanal
    |--------------------------------------------------------------------------
    |
    | SÉCURITÉ : Les clés API et secrets des prestataires sont stockées
    | CHIFFRÉES en base de données (encrypt/decrypt Laravel).
    | Elles ne sont JAMAIS dans les variables d'environnement en clair
    | en production. Les entrées .env ci-dessous sont pour le développement.
    |
    */
    'payments' => [

        'invoice_prefix' => 'FACT',

        // Informations société pour les factures PDF
        'company' => [
            'name'    => 'IBIG Soft',
            'email'   => 'contact@ibigsoft.com',
            'phone'   => '+225 0700000000',
            'address' => 'Abidjan, Côte d\'Ivoire',
        ],

        // Mobile Money : configuration des numéros marchands
        'mobile_money' => [
            'merchant_number' => env('MM_MERCHANT_NUMBER', ''),
            'ussd_code'       => env('MM_USSD_CODE', ''),
            'auto_validate'   => env('MM_AUTO_VALIDATE', false),
        ],

        // Virement bancaire : RIB
        'bank_transfer' => [
            'bank_name'      => env('BANK_NAME', 'Ecobank Côte d\'Ivoire'),
            'account_number' => env('BANK_ACCOUNT', ''),
            'iban'           => env('BANK_IBAN', ''),
            'swift'          => env('BANK_SWIFT', 'ECOCCIAB'),
        ],

        // Orange Money
        'orange_money' => [
            'auto_validate' => env('ORANGE_MONEY_AUTO_VALIDATE', false),
        ],

        // MTN MoMo
        'mtn_momo' => [
            'auto_validate'    => env('MTN_MOMO_AUTO_VALIDATE', false),
            'subscription_key' => env('MTN_MOMO_SUBSCRIPTION_KEY', ''),
            'environment'      => env('MTN_MOMO_ENV', 'sandbox'),
        ],

        // Méthodes disponibles dans l'interface client
        'available' => [
            [
                'id'        => 'cinetpay',
                'label'     => 'CinetPay',
                'icon'      => '💳',
                'type'      => 'card',
                'countries' => ['CI', 'SN', 'CM', 'BF', 'ML'],
                'enabled'   => env('CINETPAY_ENABLED', false),
            ],
            [
                'id'        => 'paystack',
                'label'     => 'Paystack',
                'icon'      => '💳',
                'type'      => 'card',
                'countries' => ['*'],
                'enabled'   => env('PAYSTACK_ENABLED', false),
            ],
            [
                'id'        => 'flutterwave',
                'label'     => 'Flutterwave',
                'icon'      => '💳',
                'type'      => 'card',
                'countries' => ['*'],
                'enabled'   => env('FLUTTERWAVE_ENABLED', false),
            ],
            [
                'id'        => 'orange_money',
                'label'     => 'Orange Money',
                'icon'      => '🟠',
                'type'      => 'mobile_money',
                'countries' => ['CI', 'SN', 'ML', 'BF', 'CM'],
                'enabled'   => env('ORANGE_MONEY_ENABLED', true),
            ],
            [
                'id'        => 'mtn_momo',
                'label'     => 'MTN MoMo',
                'icon'      => '🟡',
                'type'      => 'mobile_money',
                'countries' => ['CI', 'CM', 'GH', 'RW', 'UG'],
                'enabled'   => env('MTN_MOMO_ENABLED', true),
            ],
            [
                'id'        => 'wave',
                'label'     => 'Wave',
                'icon'      => '🌊',
                'type'      => 'mobile_money',
                'countries' => ['CI', 'SN'],
                'enabled'   => env('WAVE_ENABLED', false),
            ],
            [
                'id'        => 'bank_transfer',
                'label'     => 'Virement bancaire',
                'icon'      => '🏦',
                'type'      => 'bank_transfer',
                'countries' => ['*'],
                'enabled'   => true,
            ],
            [
                'id'        => 'cash',
                'label'     => 'Espèces (agence IBIG)',
                'icon'      => '💵',
                'type'      => 'cash',
                'countries' => ['CI'],
                'enabled'   => true,
            ],
        ],
    ],

];
