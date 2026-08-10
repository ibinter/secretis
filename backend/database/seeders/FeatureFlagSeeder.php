<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FeatureFlagSeeder extends Seeder
{
    /**
     * Feature flags système — valeurs par défaut globales.
     *
     * Ces flags sont écrasés au niveau organisation via la table
     * organization_feature_flags (avec organization_id + flag_key + enabled).
     *
     * is_enabled_default : valeur appliquée à toute nouvelle organisation
     *                      (sauf surcharge par plan ou configuration manuelle)
     * is_enabled_demo    : valeur en mode démo (APP_DEMO_MODE=true)
     * min_plan           : plan minimum requis pour que le flag soit actif
     */
    public function run(): void
    {
        $this->command->info('  > FeatureFlagSeeder : feature flags par defaut...');

        $isDemoMode = filter_var(env('APP_DEMO_MODE', false), FILTER_VALIDATE_BOOLEAN)
            || app()->environment('local');

        $flags = [
            // ─── IA & Automatisation ────────────────────────────────────────────
            [
                'key'                  => 'ai_sara_v2',
                'label'                => 'SARA IA Agentique (v2)',
                'description'          => 'Assistant IA agentique SARA — actions autonomes, mémoire longue, workflows IA.',
                'min_plan'             => 'pro',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'ai',
            ],

            // ─── Documents & Signatures ─────────────────────────────────────────
            [
                'key'                  => 'e_signature',
                'label'                => 'Signature Électronique',
                'description'          => 'Signature électronique légale des documents (conforme eIDAS + droit OHADA).',
                'min_plan'             => 'starter',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'documents',
            ],
            [
                'key'                  => 'ocr_advanced',
                'label'                => 'OCR Avancé (Tesseract)',
                'description'          => 'Reconnaissance automatique de texte dans les PDF et images scannés.',
                'min_plan'             => 'pro',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'documents',
            ],

            // ─── Formation e-learning ────────────────────────────────────────────
            [
                'key'                  => 'scorm_player',
                'label'                => 'Lecteur SCORM',
                'description'          => 'Lecture de contenus e-learning au format SCORM 1.2 / SCORM 2004.',
                'min_plan'             => 'pro',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'training',
            ],
            [
                'key'                  => 'live_training',
                'label'                => 'Sessions Live (Visio-formation)',
                'description'          => 'Sessions de formation en direct intégrées (Jitsi / Zoom / Teams).',
                'min_plan'             => 'enterprise',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'training',
            ],

            // ─── Achats & Fournisseurs ───────────────────────────────────────────
            [
                'key'                  => 'supplier_portal',
                'label'                => 'Portail Fournisseurs',
                'description'          => 'Portail externe pour que les fournisseurs soumettent leurs offres et factures.',
                'min_plan'             => 'enterprise',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => false,
                'group'                => 'procurement',
            ],

            // ─── Qualité ─────────────────────────────────────────────────────────
            [
                'key'                  => 'quality_module',
                'label'                => 'Module Qualité ISO 9001',
                'description'          => 'Gestion des non-conformités, audits internes et indicateurs qualité.',
                'min_plan'             => 'enterprise',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'quality',
            ],

            // ─── Flotte & Patrimoine ─────────────────────────────────────────────
            [
                'key'                  => 'fleet_gps',
                'label'                => 'GPS Flotte Véhicules',
                'description'          => 'Géolocalisation temps réel des véhicules de service.',
                'min_plan'             => 'enterprise',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => false,
                'group'                => 'fleet',
            ],

            // ─── Comptabilité & Finance ──────────────────────────────────────────
            [
                'key'                  => 'syscohada_advanced',
                'label'                => 'Comptabilité SYSCOHADA Avancée',
                'description'          => 'Bilan, compte de résultat, liasses fiscales SYSCOHADA Révisé 2.',
                'min_plan'             => 'pro',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'accounting',
            ],
            [
                'key'                  => 'budget_module',
                'label'                => 'Gestion Budgétaire',
                'description'          => 'Élaboration, suivi et contrôle du budget prévisionnel.',
                'min_plan'             => 'pro',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'accounting',
            ],

            // ─── Sécurité & Identité ─────────────────────────────────────────────
            [
                'key'                  => 'sso_saml',
                'label'                => 'SSO SAML / LDAP / OIDC',
                'description'          => 'Authentification unique via SAML 2.0, LDAP/Active Directory ou OpenID Connect.',
                'min_plan'             => 'enterprise',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => false,
                'group'                => 'security',
            ],

            // ─── Conformité ──────────────────────────────────────────────────────
            [
                'key'                  => 'gdpr_full',
                'label'                => 'Module RGPD Complet',
                'description'          => 'Registre des traitements, droits des personnes, DPIA, violations de données.',
                'min_plan'             => 'pro',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'compliance',
            ],

            // ─── Déploiement ─────────────────────────────────────────────────────
            [
                'key'                  => 'on_premise_license',
                'label'                => 'Licence On-Premise',
                'description'          => 'Activation de SECRETIS en mode hébergement propre (serveurs client).',
                'min_plan'             => 'enterprise',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => false,
                'group'                => 'deployment',
            ],

            // ─── Internationalisation ────────────────────────────────────────────
            [
                'key'                  => 'rtl_arabic',
                'label'                => 'Interface Arabe (RTL)',
                'description'          => 'Support de la langue arabe avec affichage de droite à gauche (RTL).',
                'min_plan'             => 'starter',
                'is_enabled_default'   => false,
                'is_enabled_demo'      => false,
                'group'                => 'i18n',
            ],

            // ─── SuperAdmin IBIG Soft ────────────────────────────────────────────
            [
                'key'                  => 'crm_superadmin',
                'label'                => 'CRM SuperAdmin IBIG',
                'description'          => 'CRM interne IBIG Soft : gestion prospects, clients, deals, pipeline.',
                'min_plan'             => null,  // superadmin uniquement
                'is_enabled_default'   => false,
                'is_enabled_demo'      => true,
                'group'                => 'superadmin',
            ],
        ];

        foreach ($flags as $flag) {
            DB::table('feature_flags')->updateOrInsert(
                ['key' => $flag['key']],
                [
                    'key'                => $flag['key'],
                    'label'              => $flag['label'],
                    'description'        => $flag['description'],
                    'min_plan'           => $flag['min_plan'],
                    'is_enabled_default' => $isDemoMode ? $flag['is_enabled_demo'] : $flag['is_enabled_default'],
                    'group'              => $flag['group'],
                    'created_at'         => now(),
                    'updated_at'         => now(),
                ]
            );
        }

        $mode = $isDemoMode ? 'DEMO (flags actifs)' : 'PRODUCTION (flags desactives)';
        $this->command->info('    OK : ' . count($flags) . " feature flags inseres — mode {$mode}.");
    }
}
