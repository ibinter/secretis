<?php

/**
 * =============================================================================
 * IBIG SECRETIS ERP — Configuration Centralisée
 * =============================================================================
 * Fichier : config/secretis.php
 * Version : 1.0.0
 * Auteur  : IBIG SOFT
 *
 * Configuration principale et unique de la plateforme SECRETIS.
 * Toutes les constantes métier, plans, limites et paramètres globaux.
 * =============================================================================
 */

return [

    // =========================================================================
    // IDENTITÉ DE L'APPLICATION
    // =========================================================================
    'version'      => env('SECRETIS_VERSION', '1.0.0'),
    'release_date' => '2026-07-22',
    'codename'     => 'Akwaba',             // Nom de code de la v1.0 (bienvenue en dioula)
    'support_email' => 'support@ibigsoft.com',
    'docs_url'      => 'https://docs.secretis.ibigsoft.com',
    'status_url'    => 'https://status.secretis.ibigsoft.com',

    // =========================================================================
    // PLANS D'ABONNEMENT
    // =========================================================================
    'plans' => [

        'starter' => [
            'id'           => 'starter',
            'name'         => 'Starter',
            'display_name' => 'SECRETIS Starter',
            'description'  => 'Pour les TPE et indépendants qui démarrent',
            'color'        => '#6366F1',
            'icon'         => 'rocket',

            // Tarification
            'pricing' => [
                'monthly'  => ['XOF' => 29000, 'EUR' => 44, 'USD' => 49,  'GHS' => 600,  'NGN' => 30000],
                'annually' => ['XOF' => 24900, 'EUR' => 38, 'USD' => 42,  'GHS' => 516,  'NGN' => 25800],
            ],
            'annual_discount_percent' => 14,
            'trial_days'  => 14,
            'popular'     => false,

            // Limites ressources
            'limits' => [
                'users'              => 5,
                'storage_gb'         => 5,
                'api_calls_per_hour' => 500,
                'documents'          => 500,
                'contacts'           => 1000,
                'events_per_month'   => 200,
                'emails_per_month'   => 1000,
                'ai_requests_month'  => 100,
                'webhooks'           => 3,
                'custom_roles'       => 0,
                'custom_reports'     => 0,
            ],

            // Modules disponibles
            'modules' => [
                'dashboard',
                'agenda',
                'courrier',
                'documents',
                'contacts',
                'notifications',
                'mobile_pwa',
            ],

            // Features activées
            'features' => [
                'sara_basic'            => true,
                'sara_advanced'         => false,
                'sara_proactive'        => false,
                'multi_currency'        => false,
                'electronic_signature'  => false,
                'whatsapp'              => false,
                'sso'                   => false,
                'ldap'                  => false,
                'api_access'            => false,
                'webhooks'              => false,
                'bi_advanced'           => false,
                'custom_workflows'      => false,
                'on_premise'            => false,
                'white_label'           => false,
                'dedicated_support'     => false,
                'sla'                   => false,
                'gdpr_tools'            => false,
                'audit_trail'           => false,
                'backup_export'         => false,
                'ocr'                   => false,
                'multi_company'         => false,
            ],
        ],

        'pro' => [
            'id'           => 'pro',
            'name'         => 'Pro',
            'display_name' => 'SECRETIS Pro',
            'description'  => 'Pour les PME qui veulent piloter tous leurs processus',
            'color'        => '#8B5CF6',
            'icon'         => 'star',

            // Tarification
            'pricing' => [
                'monthly'  => ['XOF' => 89000,  'EUR' => 135, 'USD' => 149, 'GHS' => 1800,  'NGN' => 90000],
                'annually' => ['XOF' => 74900,  'EUR' => 113, 'USD' => 125, 'GHS' => 1512,  'NGN' => 75600],
            ],
            'annual_discount_percent' => 16,
            'trial_days'  => 14,
            'popular'     => true,

            // Limites ressources
            'limits' => [
                'users'              => 25,
                'storage_gb'         => 50,
                'api_calls_per_hour' => 2000,
                'documents'          => -1,    // illimité
                'contacts'           => -1,
                'events_per_month'   => -1,
                'emails_per_month'   => 10000,
                'ai_requests_month'  => 1000,
                'webhooks'           => 10,
                'custom_roles'       => 10,
                'custom_reports'     => 20,
            ],

            // Modules disponibles (tous sauf les modules enterprise)
            'modules' => [
                'dashboard',
                'agenda',
                'courrier',
                'documents',
                'contacts',
                'notifications',
                'mobile_pwa',
                'comptabilite',
                'crm',
                'rh',
                'conges',
                'reunions',
                'projets',
                'formations',
                'flotte_vehicules',
                'inventaire',
                'bi',
            ],

            // Features activées
            'features' => [
                'sara_basic'            => true,
                'sara_advanced'         => true,
                'sara_proactive'        => true,
                'multi_currency'        => true,
                'electronic_signature'  => true,
                'whatsapp'              => true,
                'sso'                   => false,
                'ldap'                  => false,
                'api_access'            => true,
                'webhooks'              => true,
                'bi_advanced'           => true,
                'custom_workflows'      => true,
                'on_premise'            => false,
                'white_label'           => false,
                'dedicated_support'     => false,
                'sla'                   => false,
                'gdpr_tools'            => true,
                'audit_trail'           => true,
                'backup_export'         => true,
                'ocr'                   => true,
                'multi_company'         => false,
            ],
        ],

        'enterprise' => [
            'id'           => 'enterprise',
            'name'         => 'Enterprise',
            'display_name' => 'SECRETIS Enterprise',
            'description'  => 'Pour les grandes entreprises et administrations',
            'color'        => '#F59E0B',
            'icon'         => 'building',

            // Tarification (sur devis, mais grille de base)
            'pricing' => [
                'monthly'  => ['XOF' => 249000, 'EUR' => 379, 'USD' => 399, 'GHS' => 5000,  'NGN' => 250000],
                'annually' => ['XOF' => 199900, 'EUR' => 303, 'USD' => 319, 'GHS' => 4000,  'NGN' => 200000],
            ],
            'annual_discount_percent' => 20,
            'trial_days'  => 30,
            'popular'     => false,
            'contact_sales' => true,

            // Limites ressources (illimitées)
            'limits' => [
                'users'              => -1,    // illimité
                'storage_gb'         => -1,
                'api_calls_per_hour' => -1,
                'documents'          => -1,
                'contacts'           => -1,
                'events_per_month'   => -1,
                'emails_per_month'   => -1,
                'ai_requests_month'  => -1,
                'webhooks'           => -1,
                'custom_roles'       => -1,
                'custom_reports'     => -1,
            ],

            // Tous les modules
            'modules' => [
                'dashboard',
                'agenda',
                'courrier',
                'documents',
                'contacts',
                'notifications',
                'mobile_pwa',
                'comptabilite',
                'crm',
                'rh',
                'conges',
                'reunions',
                'projets',
                'formations',
                'flotte_vehicules',
                'inventaire',
                'bi',
                'visiteurs',
                'salles',
                'api_portal',
            ],

            // Toutes les features activées
            'features' => [
                'sara_basic'            => true,
                'sara_advanced'         => true,
                'sara_proactive'        => true,
                'multi_currency'        => true,
                'electronic_signature'  => true,
                'whatsapp'              => true,
                'sso'                   => true,
                'ldap'                  => true,
                'api_access'            => true,
                'webhooks'              => true,
                'bi_advanced'           => true,
                'custom_workflows'      => true,
                'on_premise'            => true,
                'white_label'           => true,
                'dedicated_support'     => true,
                'sla'                   => true,
                'gdpr_tools'            => true,
                'audit_trail'           => true,
                'backup_export'         => true,
                'ocr'                   => true,
                'multi_company'         => true,
            ],

            // SLA et support dédié
            'sla' => [
                'uptime_guarantee' => 99.9,
                'response_time_critical' => '1h',
                'response_time_high'     => '4h',
                'response_time_normal'   => '24h',
                'dedicated_csm'          => true,
                'onboarding_sessions'    => 3,
            ],
        ],
    ],

    // =========================================================================
    // MODULES MÉTIER DISPONIBLES
    // =========================================================================
    'modules' => [
        'dashboard'        => ['name' => 'Tableau de Bord',        'icon' => 'layout-dashboard', 'category' => 'core'],
        'agenda'           => ['name' => 'Agenda & Calendrier',     'icon' => 'calendar',         'category' => 'core'],
        'courrier'         => ['name' => 'Gestion du Courrier',     'icon' => 'mail',             'category' => 'core'],
        'documents'        => ['name' => 'GED / Documents',         'icon' => 'folder',           'category' => 'core'],
        'contacts'         => ['name' => 'Annuaire & Contacts',     'icon' => 'users',            'category' => 'core'],
        'notifications'    => ['name' => 'Notifications',           'icon' => 'bell',             'category' => 'core'],
        'mobile_pwa'       => ['name' => 'Application Mobile PWA',  'icon' => 'smartphone',       'category' => 'core'],
        'comptabilite'     => ['name' => 'Comptabilité OHADA',      'icon' => 'calculator',       'category' => 'finance'],
        'crm'              => ['name' => 'CRM & Prospection',       'icon' => 'trending-up',      'category' => 'commercial'],
        'rh'               => ['name' => 'Ressources Humaines',     'icon' => 'user-check',       'category' => 'rh'],
        'conges'           => ['name' => 'Congés & Absences',       'icon' => 'calendar-off',     'category' => 'rh'],
        'reunions'         => ['name' => 'Réunions & PV',           'icon' => 'video',            'category' => 'collaboration'],
        'projets'          => ['name' => 'Gestion de Projets',      'icon' => 'kanban',           'category' => 'collaboration'],
        'formations'       => ['name' => 'Formations (LMS)',         'icon' => 'graduation-cap',   'category' => 'rh'],
        'flotte_vehicules' => ['name' => 'Flotte & Véhicules',      'icon' => 'car',              'category' => 'logistique'],
        'inventaire'       => ['name' => 'Stocks & Inventaire',     'icon' => 'package',          'category' => 'logistique'],
        'bi'               => ['name' => 'Business Intelligence',   'icon' => 'bar-chart-2',      'category' => 'analytics'],
        'visiteurs'        => ['name' => 'Gestion des Visiteurs',   'icon' => 'user-plus',        'category' => 'securite'],
        'salles'           => ['name' => 'Réservation de Salles',   'icon' => 'map-pin',          'category' => 'logistique'],
        'api_portal'       => ['name' => 'Portail API Développeur', 'icon' => 'code',             'category' => 'technique'],
    ],

    // =========================================================================
    // PROVIDERS IA DISPONIBLES
    // =========================================================================
    'ai_providers' => [
        'groq' => [
            'name'           => 'Groq',
            'models'         => [
                'llama-3.3-70b-versatile',
                'llama-3.1-8b-instant',
                'mixtral-8x7b-32768',
            ],
            'default_model'  => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
            'max_tokens'     => 4096,
            'speed'          => 'ultra_fast',
            'cost'           => 'low',
            'available'      => !empty(env('GROQ_API_KEY')),
        ],
        'openai' => [
            'name'           => 'OpenAI',
            'models'         => ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
            'default_model'  => env('OPENAI_MODEL', 'gpt-4o-mini'),
            'max_tokens'     => 4096,
            'speed'          => 'fast',
            'cost'           => 'medium',
            'available'      => !empty(env('OPENAI_API_KEY')),
        ],
        'anthropic' => [
            'name'           => 'Anthropic Claude',
            'models'         => ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
            'default_model'  => env('ANTHROPIC_MODEL', 'claude-3-5-haiku-20241022'),
            'max_tokens'     => 4096,
            'speed'          => 'medium',
            'cost'           => 'medium',
            'available'      => !empty(env('ANTHROPIC_API_KEY')),
        ],
    ],

    // =========================================================================
    // DEVISES SUPPORTÉES
    // =========================================================================
    'currencies' => [
        'XOF' => ['name' => 'Franc CFA BCEAO',     'symbol' => 'FCFA', 'flag' => '🌍', 'decimal' => 0],
        'XAF' => ['name' => 'Franc CFA BEAC',      'symbol' => 'FCFA', 'flag' => '🌍', 'decimal' => 0],
        'GHS' => ['name' => 'Cedi Ghanéen',        'symbol' => 'GH₵',  'flag' => '🇬🇭', 'decimal' => 2],
        'NGN' => ['name' => 'Naira Nigérian',      'symbol' => '₦',    'flag' => '🇳🇬', 'decimal' => 2],
        'KES' => ['name' => 'Shilling Kényan',     'symbol' => 'KSh',  'flag' => '🇰🇪', 'decimal' => 2],
        'TZS' => ['name' => 'Shilling Tanzanien',  'symbol' => 'TSh',  'flag' => '🇹🇿', 'decimal' => 0],
        'UGX' => ['name' => 'Shilling Ougandais',  'symbol' => 'USh',  'flag' => '🇺🇬', 'decimal' => 0],
        'RWF' => ['name' => 'Franc Rwandais',      'symbol' => 'FRw',  'flag' => '🇷🇼', 'decimal' => 0],
        'ZAR' => ['name' => 'Rand Sud-Africain',   'symbol' => 'R',    'flag' => '🇿🇦', 'decimal' => 2],
        'MAD' => ['name' => 'Dirham Marocain',     'symbol' => 'DH',   'flag' => '🇲🇦', 'decimal' => 2],
        'TND' => ['name' => 'Dinar Tunisien',      'symbol' => 'DT',   'flag' => '🇹🇳', 'decimal' => 3],
        'DZD' => ['name' => 'Dinar Algérien',      'symbol' => 'DA',   'flag' => '🇩🇿', 'decimal' => 2],
        'EUR' => ['name' => 'Euro',                'symbol' => '€',    'flag' => '🇪🇺', 'decimal' => 2],
        'USD' => ['name' => 'Dollar Américain',    'symbol' => '$',    'flag' => '🇺🇸', 'decimal' => 2],
        'GBP' => ['name' => 'Livre Sterling',      'symbol' => '£',    'flag' => '🇬🇧', 'decimal' => 2],
        'CNY' => ['name' => 'Yuan Chinois',        'symbol' => '¥',    'flag' => '🇨🇳', 'decimal' => 2],
    ],
    'base_currency' => env('BASE_CURRENCY', 'XOF'),

    // =========================================================================
    // PAYS OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires)
    // =========================================================================
    'ohada_countries' => [
        'BJ' => ['name' => 'Bénin',                    'currency' => 'XOF', 'capital' => 'Porto-Novo'],
        'BF' => ['name' => 'Burkina Faso',             'currency' => 'XOF', 'capital' => 'Ouagadougou'],
        'CM' => ['name' => 'Cameroun',                 'currency' => 'XAF', 'capital' => 'Yaoundé'],
        'CF' => ['name' => 'Centrafrique',             'currency' => 'XAF', 'capital' => 'Bangui'],
        'KM' => ['name' => 'Comores',                  'currency' => 'KMF', 'capital' => 'Moroni'],
        'CG' => ['name' => 'Congo',                    'currency' => 'XAF', 'capital' => 'Brazzaville'],
        'CD' => ['name' => 'Congo RDC',                'currency' => 'CDF', 'capital' => 'Kinshasa'],
        'CI' => ['name' => "Côte d'Ivoire",            'currency' => 'XOF', 'capital' => 'Abidjan'],
        'GA' => ['name' => 'Gabon',                    'currency' => 'XAF', 'capital' => 'Libreville'],
        'GN' => ['name' => 'Guinée',                   'currency' => 'GNF', 'capital' => 'Conakry'],
        'GW' => ['name' => 'Guinée-Bissau',            'currency' => 'XOF', 'capital' => 'Bissau'],
        'GQ' => ['name' => 'Guinée Équatoriale',       'currency' => 'XAF', 'capital' => 'Malabo'],
        'ML' => ['name' => 'Mali',                     'currency' => 'XOF', 'capital' => 'Bamako'],
        'MR' => ['name' => 'Mauritanie',               'currency' => 'MRU', 'capital' => 'Nouakchott'],
        'NE' => ['name' => 'Niger',                    'currency' => 'XOF', 'capital' => 'Niamey'],
        'SN' => ['name' => 'Sénégal',                  'currency' => 'XOF', 'capital' => 'Dakar'],
        'TD' => ['name' => 'Tchad',                    'currency' => 'XAF', 'capital' => "N'Djaména"],
        'TG' => ['name' => 'Togo',                     'currency' => 'XOF', 'capital' => 'Lomé'],
    ],

    // =========================================================================
    // CONFIGURATION SARA (IA Assistante)
    // =========================================================================
    'sara' => [
        'name'                => 'SARA',
        'full_name'           => 'Smart Assistant for Resource & Administration',
        'avatar'              => '/images/sara-avatar.svg',
        'voice_enabled'       => true,
        'languages'           => ['fr', 'en', 'dioula', 'wolof', 'mooré'],
        'default_language'    => 'fr',
        'max_context_length'  => 10,          // Nombre de messages de contexte conservés
        'cache_ttl'           => 3600,
        'stream_responses'    => true,
        'proactive_interval'  => 30,          // Minutes entre les analyses proactives
        'suggestions_per_day' => 5,           // Suggestions proactives max/jour
    ],

    // =========================================================================
    // CONSTANTES GLOBALES
    // =========================================================================
    'constants' => [
        // Limites fichiers
        'max_file_size_mb'        => 50,
        'max_bulk_upload_files'   => 10,
        'image_max_dimension'     => 4096,    // px

        // Pagination
        'default_per_page'        => 25,
        'max_per_page'            => 100,

        // Tokens
        'token_expiry_minutes'    => 60,
        'refresh_token_days'      => 30,
        'share_link_days'         => 7,
        'password_reset_minutes'  => 60,

        // Audit
        'audit_retention_days'    => 365,     // 1 an pour conformité RGPD

        // Backups
        'backup_rotation_days'    => 30,

        // Notifications
        'notification_batch_size' => 500,

        // API
        'api_version'             => 'v1',
        'webhook_timeout_seconds' => 30,
        'webhook_max_retries'     => 3,
    ],

    // =========================================================================
    // CONFIGURATION MULTITENANCY
    // =========================================================================
    'tenancy' => [
        'identifier_column'       => 'slug',
        'domain'                  => env('APP_URL'),
        'auto_create_schema'      => false,   // PostgreSQL multi-schema (optionnel)
        'cross_tenant_prevention' => true,    // Validation stricte d'isolation
        'cache_prefix_separator'  => ':',
    ],

    // =========================================================================
    // CONFORMITÉ RGPD
    // =========================================================================
    'gdpr' => [
        'data_retention_years'      => 3,
        'right_to_erasure_days'     => 30,    // Délai de traitement des demandes
        'export_format'             => ['json', 'csv', 'pdf'],
        'consent_required_features' => ['whatsapp', 'analytics', 'ai_processing'],
        'dpa_signed_required'       => true,  // Data Processing Agreement
        'dpa_template_path'         => resource_path('templates/dpa.docx'),
    ],

    // =========================================================================
    // ONBOARDING
    // =========================================================================
    'onboarding' => [
        'steps' => [
            'company_profile',
            'invite_team',
            'configure_modules',
            'first_document',
            'connect_calendar',
            'meet_sara',
        ],
        'completion_reward' => '1_month_free',
        'show_checklist_until_complete' => true,
    ],

];
