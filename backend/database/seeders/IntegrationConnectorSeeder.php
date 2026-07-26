<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IntegrationConnectorSeeder extends Seeder
{
    /**
     * Catalogue des connecteurs de la marketplace SECRETIS (Vague 11).
     * Ces entrées sont des modèles système — elles ne sont pas liées à une organisation.
     */
    public function run(): void
    {
        $this->command->info('  > IntegrationConnectorSeeder : catalogue marketplace...');

        /*
         * type        : calendar | messaging | sms | payment | crm | erp | tax | automation | email
         * tier        : official | community
         * pricing     : free | premium
         * min_plan    : starter | pro | enterprise (plan minimum requis)
         */
        $connectors = [

            // ── Agenda & Calendriers ──────────────────────────────────────────
            [
                'slug'          => 'google-calendar',
                'name'          => 'Google Calendar',
                'category'      => 'calendar',
                'description'   => 'Synchronisation bidirectionnelle des événements avec Google Calendar.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/google-calendar.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'client_id',     'label' => 'Client ID Google',     'type' => 'text',     'required' => true],
                    ['key' => 'client_secret', 'label' => 'Client Secret Google', 'type' => 'password', 'required' => true],
                    ['key' => 'calendar_id',   'label' => 'ID du calendrier',     'type' => 'text',     'required' => false, 'default' => 'primary'],
                ]),
            ],
            [
                'slug'          => 'microsoft-365-outlook',
                'name'          => 'Microsoft 365 — Outlook',
                'category'      => 'calendar',
                'description'   => 'Synchronisation des événements et tâches avec Microsoft Outlook / Exchange.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/outlook.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'pro',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'tenant_id',     'label' => 'Tenant ID (Azure AD)',  'type' => 'text',     'required' => true],
                    ['key' => 'client_id',     'label' => 'Application (client) ID','type' => 'text',    'required' => true],
                    ['key' => 'client_secret', 'label' => 'Client Secret',          'type' => 'password','required' => true],
                ]),
            ],

            // ── Messagerie & Collaboration ────────────────────────────────────
            [
                'slug'          => 'microsoft-teams',
                'name'          => 'Microsoft Teams',
                'category'      => 'messaging',
                'description'   => 'Notifications et réunions Teams depuis SECRETIS.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/teams.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'pro',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'webhook_url', 'label' => 'URL du webhook Teams', 'type' => 'url', 'required' => true],
                    ['key' => 'channel',     'label' => 'Canal cible',          'type' => 'text','required' => false],
                ]),
            ],
            [
                'slug'          => 'whatsapp-business',
                'name'          => 'WhatsApp Business',
                'category'      => 'messaging',
                'description'   => "Envoi de notifications et d'alertes via l'API WhatsApp Business.",
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/whatsapp.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'access_token',     'label' => 'Access Token (Meta)',    'type' => 'password','required' => true],
                    ['key' => 'phone_number_id',  'label' => 'Phone Number ID',        'type' => 'text',   'required' => true],
                    ['key' => 'verify_token',     'label' => 'Webhook Verify Token',   'type' => 'text',   'required' => true],
                ]),
            ],
            [
                'slug'          => 'slack',
                'name'          => 'Slack',
                'category'      => 'messaging',
                'description'   => 'Envoi de notifications SECRETIS dans vos canaux Slack.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/slack.svg',
                'tier'          => 'official',
                'pricing'       => 'premium',
                'min_plan'      => 'pro',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'bot_token',   'label' => 'Bot Token (xoxb-...)',  'type' => 'password','required' => true],
                    ['key' => 'channel',     'label' => 'Canal par défaut (#xx)','type' => 'text',   'required' => true],
                ]),
            ],
            [
                'slug'          => 'telegram-bot',
                'name'          => 'Telegram Bot',
                'category'      => 'messaging',
                'description'   => 'Notifications via un bot Telegram personnalisé.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/telegram.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'pro',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'bot_token', 'label' => 'Token BotFather',  'type' => 'password','required' => true],
                    ['key' => 'chat_id',   'label' => 'Chat ID cible',    'type' => 'text',   'required' => true],
                ]),
            ],

            // ── SMS Afrique ───────────────────────────────────────────────────
            [
                'slug'          => 'africas-talking-sms',
                'name'          => "Africa's Talking SMS",
                'category'      => 'sms',
                'description'   => 'Envoi de SMS en masse via Africa\'s Talking (couverture 40+ pays africains).',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/africas-talking.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'api_key',    'label' => "Clé API Africa's Talking", 'type' => 'password','required' => true],
                    ['key' => 'username',   'label' => "Nom d'utilisateur",         'type' => 'text',   'required' => true],
                    ['key' => 'sender_id',  'label' => 'Sender ID (optionnel)',     'type' => 'text',   'required' => false],
                ]),
            ],
            [
                'slug'          => 'orange-sms',
                'name'          => 'Orange SMS (Orange Developer)',
                'category'      => 'sms',
                'description'   => 'SMS via les APIs Orange Developer (Côte d\'Ivoire, Sénégal, Cameroun...).',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/orange.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'client_id',     'label' => 'Client ID Orange',     'type' => 'text',    'required' => true],
                    ['key' => 'client_secret', 'label' => 'Client Secret Orange', 'type' => 'password','required' => true],
                    ['key' => 'sender_name',   'label' => "Nom de l'expéditeur",  'type' => 'text',    'required' => true],
                    ['key' => 'country',       'label' => 'Pays (CI, SN, CM...)', 'type' => 'select',  'required' => true,
                        'options' => ['CI', 'SN', 'CM', 'BF', 'ML', 'NE', 'GN']],
                ]),
            ],

            // ── Paiement Mobile Money & Cartes ────────────────────────────────
            [
                'slug'          => 'mtn-momo',
                'name'          => 'MTN Mobile Money',
                'category'      => 'payment',
                'description'   => 'Collecte et paiement MTN MoMo (CI, CM, GH, UG, ZM...).',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/mtn-momo.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'subscription_key',  'label' => 'Subscription Key (Ocp-Apim)', 'type' => 'password','required' => true],
                    ['key' => 'api_user',          'label' => 'API User (UUID)',              'type' => 'text',   'required' => true],
                    ['key' => 'api_key',           'label' => 'API Key',                     'type' => 'password','required' => true],
                    ['key' => 'environment',       'label' => 'Environnement',               'type' => 'select', 'required' => true,
                        'options' => ['sandbox', 'production']],
                ]),
            ],
            [
                'slug'          => 'cinetpay',
                'name'          => 'CinetPay',
                'category'      => 'payment',
                'description'   => 'Paiements en ligne (Mobile Money + cartes) pour l\'Afrique francophone.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/cinetpay.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'api_key',    'label' => 'API Key CinetPay',  'type' => 'password','required' => true],
                    ['key' => 'site_id',    'label' => 'Site ID',           'type' => 'text',   'required' => true],
                    ['key' => 'notify_url', 'label' => 'URL de notification','type' => 'url',   'required' => false],
                ]),
            ],
            [
                'slug'          => 'paystack',
                'name'          => 'Paystack',
                'category'      => 'payment',
                'description'   => 'Paiements cartes et mobile money — Nigeria, Ghana, Kenya, Afrique du Sud.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/paystack.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'secret_key',  'label' => 'Secret Key Paystack',  'type' => 'password','required' => true],
                    ['key' => 'public_key',  'label' => 'Public Key Paystack',  'type' => 'text',   'required' => true],
                ]),
            ],
            [
                'slug'          => 'flutterwave',
                'name'          => 'Flutterwave',
                'category'      => 'payment',
                'description'   => 'Solution de paiement panafricaine (30+ pays, 150+ devises).',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/flutterwave.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'secret_key',    'label' => 'Secret Key Flutterwave',   'type' => 'password','required' => true],
                    ['key' => 'public_key',    'label' => 'Public Key Flutterwave',   'type' => 'text',   'required' => true],
                    ['key' => 'encryption_key','label' => 'Encryption Key',           'type' => 'password','required' => true],
                ]),
            ],

            // ── Automation ────────────────────────────────────────────────────
            [
                'slug'          => 'zapier-webhooks',
                'name'          => 'Zapier Webhooks',
                'category'      => 'automation',
                'description'   => 'Déclenchez des Zaps depuis SECRETIS et recevez des webhooks Zapier.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/zapier.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'pro',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'webhook_url',  'label' => 'URL Webhook Zapier (catch hook)', 'type' => 'url',    'required' => true],
                    ['key' => 'secret_token', 'label' => 'Token secret (optionnel)',        'type' => 'password','required' => false],
                ]),
            ],

            // ── ERP / Comptabilité ─────────────────────────────────────────────
            [
                'slug'          => 'sage-100',
                'name'          => 'Sage 100 (Sage i7)',
                'category'      => 'erp',
                'description'   => 'Synchronisation comptable et RH avec Sage 100 via API REST ou ODBC.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/sage.svg',
                'tier'          => 'official',
                'pricing'       => 'premium',
                'min_plan'      => 'enterprise',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'host',     'label' => 'Hôte serveur Sage',       'type' => 'text',    'required' => true],
                    ['key' => 'port',     'label' => 'Port',                    'type' => 'number',  'required' => true, 'default' => 8009],
                    ['key' => 'username', 'label' => "Nom d'utilisateur Sage",  'type' => 'text',    'required' => true],
                    ['key' => 'password', 'label' => 'Mot de passe Sage',       'type' => 'password','required' => true],
                    ['key' => 'dossier',  'label' => 'Code dossier comptable',  'type' => 'text',    'required' => true],
                ]),
            ],
            [
                'slug'          => 'zoho-crm',
                'name'          => 'Zoho CRM',
                'category'      => 'crm',
                'description'   => 'Synchronisation des contacts et opportunités avec Zoho CRM.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/zoho.svg',
                'tier'          => 'official',
                'pricing'       => 'premium',
                'min_plan'      => 'pro',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'client_id',     'label' => 'Client ID Zoho',      'type' => 'text',   'required' => true],
                    ['key' => 'client_secret', 'label' => 'Client Secret Zoho',  'type' => 'password','required' => true],
                    ['key' => 'refresh_token', 'label' => 'Refresh Token OAuth', 'type' => 'password','required' => true],
                    ['key' => 'region',        'label' => 'Région (.com / .eu)', 'type' => 'select', 'required' => true,
                        'options' => ['com', 'eu', 'in', 'com.cn', 'com.au']],
                ]),
            ],

            // ── Télédéclaration fiscale ──────────────────────────────────────
            [
                'slug'          => 'etax-ci',
                'name'          => 'eTax CI — DGI Côte d\'Ivoire',
                'category'      => 'tax',
                'description'   => 'Télédéclaration TVA et IS via le portail eTax de la DGI Côte d\'Ivoire.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/etax-ci.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'nif',      'label' => 'NIF (Numéro d\'identification fiscale)', 'type' => 'text',    'required' => true],
                    ['key' => 'password', 'label' => 'Mot de passe eTax CI',                  'type' => 'password','required' => true],
                ]),
            ],
            [
                'slug'          => 'etax-sn',
                'name'          => 'eTax SN — DGID Sénégal',
                'category'      => 'tax',
                'description'   => 'Télédéclaration TVA via la DGID du Sénégal.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/etax-sn.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'ninea',    'label' => 'NINEA',                       'type' => 'text',    'required' => true],
                    ['key' => 'password', 'label' => 'Mot de passe portail DGID',  'type' => 'password','required' => true],
                ]),
            ],
            [
                'slug'          => 'etax-cm',
                'name'          => 'eTax CM — DGI Cameroun',
                'category'      => 'tax',
                'description'   => 'Télédéclaration via SIGTAS / e-TAXES Cameroun.',
                'icon_url'      => 'https://cdn.ibigsoft.com/connectors/etax-cm.svg',
                'tier'          => 'official',
                'pricing'       => 'free',
                'min_plan'      => 'starter',
                'is_active'     => true,
                'config_schema' => json_encode([
                    ['key' => 'niu',      'label' => 'NIU (Numéro Identifiant Unique)', 'type' => 'text',    'required' => true],
                    ['key' => 'password', 'label' => 'Mot de passe e-TAXES',           'type' => 'password','required' => true],
                ]),
            ],
        ];

        foreach ($connectors as $connector) {
            DB::table('integration_connectors')->updateOrInsert(
                ['slug' => $connector['slug']],
                array_merge($connector, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : ' . count($connectors) . ' connecteurs inseres dans la marketplace.');
    }
}
