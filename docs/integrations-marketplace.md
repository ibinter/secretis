# Marketplace d'IntÃ©grations â€” IBIG SECRETIS

> Version : 1.0 â€” Juillet 2026  
> Stack : Laravel 11 Â· React.js Â· Inertia.js Â· TailwindCSS

---

## Table des matiÃ¨res

1. [Vue d'ensemble](#1-vue-densemble)
2. [Catalogue des connecteurs](#2-catalogue-des-connecteurs)
3. [Installation d'une intÃ©gration](#3-installation-dune-intÃ©gration)
4. [Guide SMS multi-provider](#4-guide-sms-multi-provider)
5. [Connecteur Sage](#5-connecteur-sage)
6. [Connecteur Zoho CRM](#6-connecteur-zoho-crm)
7. [Connecteur Slack](#7-connecteur-slack)
8. [Bot Telegram](#8-bot-telegram)
9. [DÃ©clarations fiscales OHADA (eTax)](#9-dÃ©clarations-fiscales-ohada-etax)
10. [CrÃ©er un connecteur custom](#10-crÃ©er-un-connecteur-custom)
11. [API Partenaire](#11-api-partenaire)
12. [Webhooks entrants](#12-webhooks-entrants)
13. [ClÃ©s API SECRETIS](#13-clÃ©s-api-secretis)
14. [SÃ©curitÃ©](#14-sÃ©curitÃ©)
15. [DÃ©pannage](#15-dÃ©pannage)

---

## 1. Vue d'ensemble

La Marketplace SECRETIS permet de connecter votre ERP Ã  des centaines d'applications tierces via des connecteurs officiels (dÃ©veloppÃ©s par IBIG Soft) ou communautaires.

### Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  IBIG SECRETIS ERP                                              â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚ Marketplace  â”‚  â”‚ IntegrationSvc â”‚  â”‚  CRON (15 min)      â”‚  â”‚
â”‚  â”‚  (React UI)  â”‚â—„â”€â”¤  (Laravel)     â”‚â—„â”€â”¤  SyncIntegrations   â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â”‚         â”‚                  â”‚                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚           Connecteurs (Services PHP)                       â”‚   â”‚
â”‚  â”‚  SmsService  â”‚  SageConnector  â”‚  ZohoConnector           â”‚   â”‚
â”‚  â”‚  SlackConn.  â”‚  TelegramConn.  â”‚  EtaxConnector           â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â”‚                â”‚              â”‚
      Africa's         Orange SMS      Zoho CRM
      Talking          API             API v3
```

### Plans et accÃ¨s

| Connecteur                     | Starter | Pro | Enterprise |
|--------------------------------|:-------:|:---:|:----------:|
| SMS (Africa's Talking, Orange) | âœ…      | âœ…  | âœ…         |
| Slack / Telegram               | âœ…      | âœ…  | âœ…         |
| Google Calendar                | âœ…      | âœ…  | âœ…         |
| Zoho CRM                       | âŒ      | âœ…  | âœ…         |
| Sage 100 / X3                  | âŒ      | âœ…  | âœ…         |
| eTax OHADA                     | âŒ      | âœ…  | âœ…         |
| API Partenaire                 | âŒ      | âŒ  | âœ…         |

---

## 2. Catalogue des connecteurs

### Communication
| Slug               | Nom                  | Description                                    |
|--------------------|----------------------|------------------------------------------------|
| `africas-talking`  | Africa's Talking     | SMS Kenya, Uganda, Tanzania, Nigeria, Ghana    |
| `orange-sms`       | Orange SMS           | SMS CÃ´te d'Ivoire, Cameroun, SÃ©nÃ©gal           |
| `mtn-sms`          | MTN SMS              | SMS MTN Cameroun, CÃ´te d'Ivoire, Ghana         |
| `twilio`           | Twilio               | SMS international (fallback)                   |
| `vonage`           | Vonage / Nexmo       | SMS Europe + international                     |
| `slack`            | Slack                | Notifications + slash command /secretis         |
| `telegram`         | Telegram Bot         | Notifications + commandes /agenda /taches       |
| `whatsapp`         | WhatsApp Business    | Notifications WhatsApp (via Meta API)          |

### ERP / ComptabilitÃ©
| Slug        | Nom        | Description                              |
|-------------|------------|------------------------------------------|
| `sage-100`  | Sage 100   | Export/Import FEC, sync contacts         |
| `sage-x3`   | Sage X3    | IntÃ©gration via API Sage X3              |
| `etax-ci`   | eTax CI    | DGI CÃ´te d'Ivoire â€” TVA, IS             |
| `etax-sn`   | eTax SN    | DGID SÃ©nÃ©gal â€” TVA, IS                  |
| `etax-cm`   | eTax CM    | DGT Cameroun â€” TVA, IS                  |

### CRM
| Slug       | Nom      | Description                      |
|------------|----------|----------------------------------|
| `zoho-crm` | Zoho CRM | Contacts, Deals, ActivitÃ©s       |
| `hubspot`  | HubSpot  | CRM bidirectionnel (bÃªta)        |

### Paiements
| Slug          | Nom           | Description                        |
|---------------|---------------|------------------------------------|
| `cinetpay`    | CinetPay      | Paiement mobile Afrique de l'Ouest |
| `wave`        | Wave          | Paiement mobile SÃ©nÃ©gal, CI        |
| `orange-money`| Orange Money  | Paiement CI, SN, CM                |
| `mtn-momo`    | MTN MoMo      | Paiement MTN Mobile Money          |

### ProductivitÃ©
| Slug               | Nom              | Description                     |
|--------------------|------------------|---------------------------------|
| `google-calendar`  | Google Calendar  | Sync bidirectionnelle (existant)|
| `outlook-calendar` | Outlook Calendar | Sync bidirectionnelle (existant)|
| `onedrive`         | OneDrive         | Stockage documents (existant)   |
| `google-drive`     | Google Drive     | Stockage documents              |

---

## 3. Installation d'une intÃ©gration

### Via l'interface

1. AccÃ©dez Ã  **ParamÃ¨tres â†’ Marketplace d'intÃ©grations**.
2. Trouvez le connecteur souhaitÃ© (filtrez par catÃ©gorie ou recherchez).
3. Cliquez sur **Installer**.
4. Renseignez les champs de configuration (clÃ©s API, etc.).
5. Cliquez sur **Installer le connecteur** â€” un test de connexion automatique est effectuÃ©.
6. Le statut passe Ã  **ConnectÃ©** (vert) si tout est OK.

### Via l'API (pour l'automatisation)

```bash
# 1. Lister les connecteurs disponibles
GET /integrations

# 2. Installer un connecteur
POST /integrations/{connectorId}/install
Content-Type: application/json
Authorization: Bearer {token}

{
  "api_key": "AT-xxx",
  "username": "mon_compte"
}

# 3. Tester la connexion
POST /integrations/{integrationId}/test

# 4. DÃ©clencher une sync manuelle
POST /integrations/{integrationId}/sync
```

---

## 4. Guide SMS multi-provider

### Configuration par pays

AccÃ©dez Ã  **IntÃ©grations â†’ Configuration SMS avancÃ©e**.

#### CÃ´te d'Ivoire (+225) â€” Orange SMS

```
client_id     : Votre Client ID Orange Developer
client_secret : Votre Client Secret
sender_number : +2250000000000 (votre numÃ©ro Orange)
```

1. CrÃ©ez un compte sur [developer.orange.com](https://developer.orange.com)
2. CrÃ©ez une application "Orange SMS"
3. Copiez le Client ID et Client Secret dans SECRETIS

#### Kenya/Afrique de l'Est â€” Africa's Talking

```
api_key  : ClÃ© API depuis le dashboard Africa's Talking
username : Votre nom d'utilisateur (ou "sandbox" en dev)
```

1. CrÃ©ez un compte sur [africastalking.com](https://africastalking.com)
2. Allez dans **Settings â†’ API Key**
3. Copiez la clÃ© dans SECRETIS

#### International â€” Twilio

```
account_sid : ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
auth_token  : votre_auth_token
from        : +1xxxxxxxxxx (votre numÃ©ro Twilio)
```

### Routage automatique

SECRETIS choisit automatiquement le provider selon l'indicatif :

| Indicatif | Pays                | Provider          |
|-----------|---------------------|-------------------|
| +225      | CÃ´te d'Ivoire       | Orange SMS        |
| +237      | Cameroun            | Orange SMS        |
| +221      | SÃ©nÃ©gal             | Orange SMS        |
| +254      | Kenya               | Africa's Talking  |
| +234      | Nigeria             | Africa's Talking  |
| +233      | Ghana               | Africa's Talking  |
| +44, +33â€¦ | Europe              | Vonage            |
| Autres    | International       | Twilio (fallback) |

### OTP via SMS

```php
// Envoyer un OTP
$smsService = new SmsService($config);
$otp = $smsService->sendOtp('+2250700123456');
// â†’ OTP stockÃ© Redis 5 minutes, SMS envoyÃ©

// VÃ©rifier l'OTP
$valid = $smsService->verifyOtp('+2250700123456', '123456');
// â†’ true si correct et non expirÃ© (max 3 tentatives)
```

### Templates disponibles

| ClÃ©               | Usage                    | Variables              |
|-------------------|--------------------------|------------------------|
| `rdv_reminder`    | Rappel rendez-vous       | {date}, {heure}        |
| `delivery_alert`  | Alerte livraison         | {numero}, {lien}       |
| `otp`             | Code de vÃ©rification     | {otp}                  |
| `task_assigned`   | TÃ¢che assignÃ©e           | {tache}, {date}        |
| `invoice_due`     | Rappel paiement facture  | {numero}, {montant}, {date} |

---

## 5. Connecteur Sage

### Formats supportÃ©s

- **FEC** (Fichier des Ã‰critures Comptables) â€” norme DGFiP/OHADA
- **CSV Sage 100 Compta** (sÃ©parateur point-virgule)

### Export vers Sage

```php
$sage = new SageConnector(['sage_sync_folder' => '/var/shared/sage']);
$path = $sage->exportInvoicesToSage($organization, Carbon::now()->subMonth());
// â†’ storage/integrations/sage/sage_export_1_2026_01_20260115120000.csv
```

Le fichier FEC gÃ©nÃ©rÃ© contient les colonnes :
`JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;CompAuxLib;PieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLet;DateLet;ValidDate;Montantdevise;Idevise`

### Import depuis Sage

```php
$result = $sage->importFromSage('/path/to/export_sage.csv');
// â†’ ['imported' => 150, 'skipped' => 5, 'errors' => [...]]
```

### Mapping de comptes (Sage â†’ SYSCOHADA)

| Compte Sage | Compte SYSCOHADA | LibellÃ©              |
|-------------|------------------|----------------------|
| 401         | 401              | Fournisseurs         |
| 411         | 411              | Clients              |
| 445         | 443              | TVA                  |
| 512         | 521              | Banque principale    |
| 530         | 571              | Caisse               |
| 601         | 601              | Achats marchandises  |
| 613         | 622              | Loyers               |
| 641         | 661              | Salaires             |
| 701         | 701              | Ventes marchandises  |
| 706         | 706              | Prestations services |

---

## 6. Connecteur Zoho CRM

### PrÃ©requis

- Compte Zoho CRM (Professional ou Enterprise)
- Application OAuth2 crÃ©Ã©e dans [Zoho API Console](https://api-console.zoho.com)

### OAuth2 Setup

1. Dans Zoho API Console, crÃ©ez une application "Server-based Applications"
2. Redirect URI : `https://votre-secretis.com/integrations/zoho/callback`
3. Scopes requis : `ZohoCRM.modules.contacts.ALL,ZohoCRM.modules.deals.ALL,ZohoCRM.modules.activities.ALL`
4. Copiez Client ID et Client Secret dans SECRETIS
5. Cliquez sur "Autoriser" pour initier le flux OAuth2

### Synchronisation

| Module   | Direction  | FrÃ©quence    |
|----------|-----------|--------------|
| Contacts | â†” Bidirectionnel | CRON 15 min |
| Deals    | â† Depuis Zoho | CRON 15 min |
| Tasks    | â† Depuis Zoho | CRON 15 min |

### RÃ¨gle de conflit

En cas de modification simultanÃ©e, **Zoho est prioritaire** (source de vÃ©ritÃ© externe).

---

## 7. Connecteur Slack

### Installation

1. CrÃ©ez une application Slack sur [api.slack.com/apps](https://api.slack.com/apps)
2. Activez **Incoming Webhooks** et crÃ©ez une URL pour votre workspace
3. Optionnel : crÃ©ez un **Bot Token** (xoxb-...) pour les fonctionnalitÃ©s avancÃ©es
4. Configurez le **Slash Command** `/secretis` pointant vers `https://votre-secretis.com/webhooks/slack/slash`

### Channels de notification

| Event                | Channel par dÃ©faut       | Configurable |
|----------------------|--------------------------|:------------:|
| Nouveau courrier     | `#secretis-courriers`    | âœ…           |
| TÃ¢che assignÃ©e       | DM Ã  l'utilisateur       | âœ…           |
| Alerte critique      | `#secretis-alertes`      | âœ…           |

### Slash Command `/secretis`

Depuis n'importe quel channel Slack :

```
/secretis recherche rapport annuel       â†’ Recherche dans SECRETIS
/secretis taches                          â†’ Mes tÃ¢ches en cours
/secretis agenda                          â†’ Mon agenda du jour
/secretis courriers                       â†’ Derniers courriers
/secretis aide                            â†’ Aide
```

---

## 8. Bot Telegram

### CrÃ©ation du bot

1. Ouvrez Telegram, cherchez `@BotFather`
2. Envoyez `/newbot`, suivez les instructions
3. RÃ©cupÃ©rez le **Bot Token** (ex: `1234567890:AAFxxxxxx`)
4. Collez-le dans SECRETIS â†’ IntÃ©grations â†’ Telegram

### Enregistrement du webhook

SECRETIS enregistre automatiquement le webhook Telegram lors de l'installation :
```
URL : https://votre-secretis.com/webhooks/telegram/{bot_token}
```

### Liaison du compte

Un utilisateur SECRETIS lie son compte Telegram :
1. DÃ©marre une conversation avec le bot (`/start`)
2. Clique sur le lien de liaison envoyÃ© par le bot
3. Autorise la connexion dans SECRETIS

### Commandes disponibles

| Commande     | Description                        |
|--------------|------------------------------------|
| `/start`     | Lier le compte Telegram Ã  SECRETIS |
| `/agenda`    | Ã‰vÃ©nements du jour                 |
| `/taches`    | TÃ¢ches en cours (non terminÃ©es)    |
| `/courriers` | 5 derniers courriers non traitÃ©s   |
| `/stat`      | Statistiques rapides               |
| `/aide`      | Liste des commandes                |

---

## 9. DÃ©clarations fiscales OHADA (eTax)

### Pays supportÃ©s

| Pays            | Type                 | Format     | Portail                    |
|-----------------|----------------------|------------|----------------------------|
| CÃ´te d'Ivoire   | TVA, IS, IUTS       | XML DGI CI | e-ImpÃ´ts (DGI)             |
| SÃ©nÃ©gal         | TVA, IS              | CSV         | TÃ©lÃ©taxe (DGID)            |
| Cameroun        | TVA, IS              | XML        | DGI Cam (DGT)              |
| Burkina Faso    | TVA                  | CSV        | DGI-BF                     |
| Mali            | TVA, IS              | XML        | DGI Mali                   |
| BÃ©nin           | TVA                  | CSV        | DGE BÃ©nin                  |

### GÃ©nÃ©rer une dÃ©claration

```php
$etax = new EtaxConnector();
$path = $etax->generateTaxFile(
    $organization,
    'tva',         // tva | is | iuts | acompte_is
    'CI',          // CI | SN | CM | BF | ML | BJ
    Carbon::now()->subMonth()
);
// â†’ storage/etax/1/CI_tva_2026_01_1.xml
```

### Taux TVA par pays

| Pays | Taux TVA |
|------|----------|
| CÃ´te d'Ivoire | 18% |
| SÃ©nÃ©gal | 18% |
| Cameroun | 19,25% |
| Burkina Faso | 18% |
| Mali | 18% |
| BÃ©nin | 18% |
| Niger | 19% |

---

## 10. CrÃ©er un connecteur custom

### Structure minimale

CrÃ©ez un service dans `app/Services/Integrations/MonConnecteur.php` :

```php
<?php
namespace App\Services\Integrations;

class MonConnecteur
{
    private array $config = [];

    public function withConfig(array $config): static
    {
        $this->config = $config;
        return $this;
    }

    public function sync(): void
    {
        // Votre logique de synchronisation
    }
}
```

### Enregistrement en base

InsÃ©rez votre connecteur dans `integration_connectors` :

```sql
INSERT INTO integration_connectors (slug, name, category, description, config_schema, status)
VALUES (
  'mon-app',
  'Mon Application',
  'custom',
  'Description de mon intÃ©gration',
  '{
    "fields": [
      {"key": "api_key", "label": "ClÃ© API", "type": "password", "required": true},
      {"key": "base_url", "label": "URL de base", "type": "text", "required": true, "placeholder": "https://api.monapp.com"}
    ],
    "test_url": "{base_url}/health",
    "instructions": [
      "CrÃ©ez un compte sur monapp.com",
      "Allez dans ParamÃ¨tres â†’ API",
      "Copiez votre clÃ© API ci-dessous"
    ]
  }',
  'active'
);
```

### Ajout dans SyncIntegrations

Ajoutez votre slug dans `AUTO_SYNC_CONNECTORS` :

```php
private const AUTO_SYNC_CONNECTORS = [
    'zoho-crm',
    'google-calendar',
    'mon-app',  // â† ajoutez ici
];
```

Et ajoutez le cas dans `IntegrationService::syncConnector()` :

```php
'mon-app' => app(\App\Services\Integrations\MonConnecteur::class)
                 ->withConfig($config)->sync(),
```

---

## 11. API Partenaire

L'API Partenaire permet aux applications tierces d'accÃ©der Ã  SECRETIS via OAuth2.

### Authentification

```bash
# Obtenir un token (OAuth2 Client Credentials)
curl -X POST https://votre-secretis.com/partner/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "secretis_xxx",
    "client_secret": "votre_secret"
  }'

# RÃ©ponse
{
  "access_token": "abc123...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "contacts:read events:write"
}
```

### Endpoints disponibles

#### GET /partner/v1/organizations
Scope : `org:read`

```json
{
  "data": {
    "id": 1,
    "name": "ACME SARL",
    "country": "CI",
    "timezone": "Africa/Abidjan",
    "currency": "XOF",
    "plan": "pro"
  }
}
```

#### GET /partner/v1/contacts
Scope : `contacts:read`  
ParamÃ¨tres : `page`, `per_page` (max 100), `type`, `q`

```json
{
  "data": [
    {
      "id": 42,
      "name": "Kouassi Jean",
      "email": "jean@example.ci",
      "phone": "+2250700123456",
      "type": "client",
      "company": "ACME CI",
      "city": "Abidjan",
      "country": "CI"
    }
  ],
  "meta": { "total": 150, "per_page": 50, "current_page": 1, "last_page": 3 }
}
```

#### POST /partner/v1/events
Scope : `events:write`

```json
{
  "title": "RÃ©union client",
  "start_at": "2026-07-25T10:00:00Z",
  "end_at":   "2026-07-25T11:00:00Z",
  "location": "Abidjan, Plateau",
  "attendees": ["jean@example.ci"]
}
```

#### POST /partner/v1/documents
Scope : `documents:write`  
Content-Type : `multipart/form-data`

```bash
curl -X POST https://votre-secretis.com/partner/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@rapport.pdf" \
  -F "title=Rapport mensuel juillet 2026" \
  -F "tags[]=finance" \
  -F "tags[]=rapport"
```

#### GET/POST /partner/v1/webhooks
Scope : `webhooks:manage`

Ã‰vÃ©nements disponibles : `contact.created`, `contact.updated`, `event.created`, `document.uploaded`, `task.completed`

---

## 12. Webhooks entrants

### Format des payloads

```json
POST https://votre-app.com/webhook

Headers:
  X-SECRETIS-Signature: sha256=abc123...
  X-SECRETIS-Event: contact.created
  X-SECRETIS-Timestamp: 1722000000
  Content-Type: application/json

Body:
{
  "event": "contact.created",
  "timestamp": "2026-07-22T10:30:00Z",
  "organization_id": 1,
  "data": {
    "id": 42,
    "name": "Kouassi Jean",
    "email": "jean@example.ci"
  }
}
```

### VÃ©rification de la signature (HMAC-SHA256)

```php
// PHP
$payload   = file_get_contents('php://input');
$secret    = 'votre_webhook_secret';
$signature = $_SERVER['HTTP_X_SECRETIS_SIGNATURE'];

$computed  = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($computed, $signature)) {
    http_response_code(401);
    die('Signature invalide');
}
```

```javascript
// Node.js
const crypto = require('crypto');

const signature = req.headers['x-secretis-signature'];
const computed  = 'sha256=' + crypto
    .createHmac('sha256', webhookSecret)
    .update(req.rawBody)
    .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
    return res.status(401).send('Signature invalide');
}
```

### Retry automatique

Si votre endpoint retourne un code HTTP â‰  2xx, SECRETIS retentera avec un backoff exponentiel :
- Retry 1 : +5 min
- Retry 2 : +15 min
- Retry 3 : +30 min
- Retry 4 : +1h
- Retry 5 : +2h
- Retry 6 : +4h (dernier essai)

---

## 13. ClÃ©s API SECRETIS

### GÃ©nÃ©ration

1. Allez dans **IntÃ©grations â†’ ClÃ©s API**
2. Cliquez sur **Nouvelle clÃ©**
3. Donnez un nom descriptif et sÃ©lectionnez les scopes
4. **Copiez immÃ©diatement le token** â€” il ne sera plus affichÃ©

### Format

```
sk_live_YOUR_STRIPE_SECRET_KEY
```

### Utilisation

```bash
curl -H "Authorization: Bearer sk_live_YOUR_STRIPE_SECRET_KEY..." \
     https://votre-secretis.com/partner/v1/contacts
```

### Bonnes pratiques

- Une clÃ© par application / environnement
- Rotation tous les 90 jours
- Stocker dans des variables d'environnement (jamais dans le code)
- RÃ©voquer immÃ©diatement en cas de compromission

---

## 14. SÃ©curitÃ©

### Chiffrement des configurations

Toutes les clÃ©s API tierces sont chiffrÃ©es en base de donnÃ©es avec `Crypt::encryptString()` (Laravel AES-256-CBC). La clÃ© `APP_KEY` doit Ãªtre conservÃ©e en sÃ©curitÃ©.

### HMAC des webhooks

Chaque webhook sortant est signÃ© avec HMAC-SHA256. VÃ©rifiez toujours la signature avant de traiter le payload.

### OTP

- Codes Ã  6 chiffres gÃ©nÃ©rÃ©s avec `random_int()` (cryptographiquement sÃ©curisÃ©)
- ValiditÃ© : 5 minutes (Redis TTL)
- Limite : 3 tentatives puis invalidation automatique

### Scopes

Appliquez le principe du moindre privilÃ¨ge : accordez uniquement les scopes nÃ©cessaires Ã  chaque application.

---

## 15. DÃ©pannage

### Le connecteur passe en statut "Erreur"

1. VÃ©rifiez les logs : **IntÃ©grations â†’ [Connecteur] â†’ Logs**
2. VÃ©rifiez que les clÃ©s API sont correctes et non expirÃ©es
3. Testez la connexion avec le bouton **Tester**
4. VÃ©rifiez que l'API tierce est accessible depuis votre serveur

### La sync ne se dÃ©clenche pas

```bash
# VÃ©rifiez le CRON Laravel
php artisan schedule:list

# Lancez manuellement
php artisan integrations:sync --connector=zoho-crm

# Mode dry-run (simulation)
php artisan integrations:sync --dry-run
```

### OTP non reÃ§u

1. VÃ©rifiez le provider SMS configurÃ© pour le pays du numÃ©ro
2. Consultez les logs SMS : **IntÃ©grations â†’ SMS â†’ Logs**
3. VÃ©rifiez le crÃ©dit SMS disponible chez le provider
4. Testez avec un autre numÃ©ro depuis **IntÃ©grations â†’ SMS â†’ Test d'envoi**

### Webhook non reÃ§u

1. VÃ©rifiez que l'URL est accessible depuis Internet (pas localhost)
2. Consultez les logs : **IntÃ©grations â†’ Webhooks â†’ Logs entrants**
3. VÃ©rifiez la signature HMAC dans votre code
4. Utilisez [webhook.site](https://webhook.site) pour dÃ©boguer

---

*Documentation gÃ©nÃ©rÃ©e le 2026-07-22 â€” IBIG Soft Â· support@ibig.ci*

