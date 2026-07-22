# Guide des Intégrations SECRETIS ERP

## Table des matières

1. [Google Calendar Sync](#1-google-calendar-sync)
2. [WhatsApp Business API](#2-whatsapp-business-api)
3. [Webhooks Zapier / sortants](#3-webhooks-sortants-zapier--make--n8n)
4. [Notifications Push](#4-notifications-push-navigateur)
5. [Payloads de référence](#5-payloads-de-référence)
6. [Tableau des événements déclencheurs](#6-tableau-des-événements-déclencheurs)

---

## 1. Google Calendar Sync

### Prérequis

- Compte Google Workspace ou Google personnel
- Application OAuth2 créée dans [Google Cloud Console](https://console.cloud.google.com)
- API "Google Calendar API" activée

### Configuration

1. **Créer les identifiants OAuth2** dans Google Cloud Console :
   - Type : Application Web
   - URIs de redirection autorisés : `https://votre-domaine.com/integrations/google/callback`

2. **Ajouter dans `.env`** :
   ```
   GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
   GOOGLE_REDIRECT_URI=https://votre-domaine.com/integrations/google/callback
   ```

3. **Configurer `config/services.php`** :
   ```php
   'google' => [
       'client_id'     => env('GOOGLE_CLIENT_ID'),
       'client_secret' => env('GOOGLE_CLIENT_SECRET'),
       'redirect'      => env('GOOGLE_REDIRECT_URI'),
   ],
   ```

4. **Exécuter la migration** :
   ```bash
   php artisan migrate
   ```

### Flux de connexion

```
Utilisateur clique "Connecter Google Calendar"
  → GET /integrations/google/auth
  → Redirection vers Google OAuth2
  → Utilisateur autorise l'accès
  → GET /integrations/google/callback?code=xxx
  → Tokens stockés chiffrés en base (AES-256 via Laravel Crypt)
  → Synchronisation initiale
```

### Politique de conflit

Quand un événement est modifié simultanément dans SECRETIS et Google :
**Google Calendar est prioritaire.** L'import depuis Google (`syncFromGoogle`) écrase les données locales.

### Synchronisation automatique

Configurer un job planifié dans `app/Console/Kernel.php` :
```php
$schedule->command('secretis:sync-google-calendar')->hourly();
```

### Limites API Google

- 1 000 000 de requêtes/jour par projet
- Quota par utilisateur : 50 000 requêtes/jour
- En cas de quota dépassé : les erreurs 429 sont loguées et la synchro est retentée à la prochaine exécution.

---

## 2. WhatsApp Business API

### Prérequis

- Compte [Meta Business Manager](https://business.facebook.com)
- Application WhatsApp Business Platform créée
- Numéro de téléphone WhatsApp Business vérifié
- Templates de messages approuvés par Meta

### Configuration

1. **Variables d'environnement** (`.env`) :
   ```
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
   WHATSAPP_APP_SECRET=abc123...
   WHATSAPP_VERIFY_TOKEN=mon_token_secret_webhook
   ```

2. **Configurer `config/services.php`** :
   ```php
   'whatsapp' => [
       'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
       'access_token'    => env('WHATSAPP_ACCESS_TOKEN'),
       'app_secret'      => env('WHATSAPP_APP_SECRET'),
       'verify_token'    => env('WHATSAPP_VERIFY_TOKEN'),
   ],
   ```

3. **Configurer le webhook dans Meta** :
   - URL de callback : `https://votre-domaine.com/webhooks/whatsapp`
   - Token de vérification : valeur de `WHATSAPP_VERIFY_TOKEN`
   - Champs à souscrire : `messages`

### Templates requis

Les templates doivent être créés et approuvés dans Meta Business Manager.

| Nom du template    | Variables              | Exemple de message |
|--------------------|------------------------|---------------------------------------------|
| `event_reminder`   | title, minutes, location | "Rappel : Réunion DG dans 30 minutes. Lieu : Salle A" |
| `task_assigned`    | task_title, due_date   | "Nouvelle tâche : Rapport mensuel. Échéance : 31/07/2026" |
| `visitor_arrived`  | visitor_name           | "Votre visiteur Jean Koné est arrivé à la réception" |
| `leave_approved`   | start_date, end_date   | "Votre demande de congé du 01/08 au 15/08 est approuvée" |
| `invoice_sent`     | invoice_number, amount | "Nouvelle facture FA-2026-001 de 450 000 FCFA disponible" |

### Envoi via le service

```php
// Injection du service
use App\Services\WhatsAppService;

// Message texte simple
$whatsApp->sendTextMessage('2250701234567', 'Bonjour depuis SECRETIS !');

// Template prédéfini
$whatsApp->sendEventReminder('2250701234567', 'Réunion DG', 30, 'Salle de conférence A');

// Document
$whatsApp->sendDocumentMessage('2250701234567', 'https://...', 'facture.pdf');
```

### Fallback SMS

Si WhatsApp échoue (numéro non enregistré sur WhatsApp, opt-out…), un SMS peut être envoyé automatiquement. Configurer :
```
SMS_PROVIDER=africas_talking   # ou twilio, none
```

---

## 3. Webhooks Sortants (Zapier / Make / n8n)

### Principe de fonctionnement

```
Événement SECRETIS (ex: facture créée)
  → OutgoingWebhookService::dispatch('invoice.created', $payload, $orgId)
  → Trouve tous les endpoints actifs souscrits à cet événement
  → Dispatch de jobs asynchrones (queue: webhooks)
  → DeliverWebhook Job : HTTP POST vers l'URL configurée
  → Retry exponentiel en cas d'échec
```

### Configuration des routes

Ajouter dans `routes/api.php` ou `routes/web.php` :
```php
Route::middleware(['auth:sanctum'])->prefix('parametres')->group(function () {
    Route::get('/webhooks', [WebhookController::class, 'index'])->name('parametres.webhooks.index');
    Route::post('/webhooks', [WebhookController::class, 'store'])->name('parametres.webhooks.store');
    Route::put('/webhooks/{id}', [WebhookController::class, 'update'])->name('parametres.webhooks.update');
    Route::delete('/webhooks/{id}', [WebhookController::class, 'destroy'])->name('parametres.webhooks.destroy');
    Route::patch('/webhooks/{id}/toggle', [WebhookController::class, 'toggle'])->name('parametres.webhooks.toggle');
    Route::post('/webhooks/{id}/test', [WebhookController::class, 'test'])->name('parametres.webhooks.test');
});
```

### Démarrer le worker de queue

```bash
php artisan queue:work --queue=webhooks,default --tries=1
```

### Vérification de la signature

Côté récepteur, vérifier l'authenticité du webhook :

```python
# Python
import hmac
import hashlib

def verify_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

```javascript
// Node.js
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
    const expected = 'sha256=' + crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
    );
}
```

### Headers envoyés

| Header                    | Valeur                              |
|---------------------------|-------------------------------------|
| `Content-Type`            | `application/json`                  |
| `X-Secretis-Signature`    | `sha256=<hmac_sha256>`              |
| `X-Secretis-Event`        | `invoice.created`                   |
| `X-Secretis-Delivery`     | `550e8400-e29b-41d4-a716-446655440000` (UUID) |
| `User-Agent`              | `SECRETIS-ERP-Webhook/1.0`          |

### Délais de retry

| Tentative | Délai après échec |
|-----------|-------------------|
| 1ère      | Immédiat          |
| 2ème      | 1 minute          |
| 3ème      | 5 minutes         |
| 4ème      | 30 minutes        |
| 5ème      | 2 heures          |

Après 10 échecs consécutifs : désactivation automatique + email admin.

---

## 4. Notifications Push (navigateur)

### Prérequis

- HTTPS obligatoire (les navigateurs refusent les push sur HTTP)
- Service Worker enregistré : `public/sw.js`

### Génération des clés VAPID

```bash
php artisan webpush:vapid
```

Ajouter dans `.env` :
```
VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:admin@mon-organisation.ci
```

### Configurer `config/webpush.php`

```php
return [
    'vapid' => [
        'subject'     => env('VAPID_SUBJECT'),
        'public_key'  => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],
];
```

### Service Worker minimal (`public/sw.js`)

```javascript
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const options = {
        body:    data.body    ?? '',
        icon:    data.icon    ?? '/icons/icon-192x192.png',
        badge:   data.badge   ?? '/icons/badge-72x72.png',
        tag:     data.tag     ?? 'secretis-notif',
        data:    { url: data.url ?? '/' },
        actions: data.actions ?? [],
    };
    event.waitUntil(
        self.registration.showNotification(data.title ?? 'SECRETIS ERP', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data?.url ?? '/';
    event.waitUntil(clients.openWindow(url));
});
```

### Routes API

```php
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/push/vapid-key', [PushNotificationController::class, 'vapidKey']);
    Route::post('/push/subscribe', [PushNotificationController::class, 'subscribe']);
    Route::delete('/push/unsubscribe', [PushNotificationController::class, 'unsubscribe']);
});
```

### Envoyer une push via le service

```php
use App\Services\PushNotificationService;

$push->push($user, 'Nouvelle facture', 'FA-2026-001 de 450 000 FCFA', [
    'url'               => '/comptabilite/factures/42',
    'icon'              => '/icons/invoice.png',
    'tag'               => 'invoice-42',
    'requireInteraction' => true,
    'actions'           => [
        ['action' => 'view',  'title' => 'Voir la facture'],
        ['action' => 'dismiss', 'title' => 'Ignorer'],
    ],
]);
```

---

## 5. Payloads de référence

### event.created

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "event.created",
  "created_at": "2026-07-21T09:00:00+00:00",
  "organization": 42,
  "data": {
    "id": "evt_abc123",
    "title": "Réunion de direction",
    "description": "Revue mensuelle des indicateurs",
    "location": "Salle de conférence A",
    "start_at": "2026-07-25T09:00:00+00:00",
    "end_at": "2026-07-25T11:00:00+00:00",
    "is_all_day": false,
    "type": "meeting",
    "creator": {
      "id": 5,
      "name": "Awa Diallo",
      "email": "awa.diallo@organisation.ci"
    }
  }
}
```

### task.completed

```json
{
  "id": "660e8400-e29b-41d4-a716-446655441111",
  "event": "task.completed",
  "created_at": "2026-07-21T14:30:00+00:00",
  "organization": 42,
  "data": {
    "id": "tsk_xyz789",
    "title": "Préparer le rapport mensuel",
    "completed_at": "2026-07-21T14:30:00+00:00",
    "completed_by": {
      "id": 12,
      "name": "Kouakou Patrice"
    },
    "project": {
      "id": "prj_001",
      "name": "Reporting Q3"
    }
  }
}
```

### invoice.paid

```json
{
  "id": "770e8400-e29b-41d4-a716-446655442222",
  "event": "invoice.paid",
  "created_at": "2026-07-21T16:00:00+00:00",
  "organization": 42,
  "data": {
    "invoice_number": "FA-2026-001",
    "amount": 450000,
    "currency": "XOF",
    "paid_at": "2026-07-21T16:00:00+00:00",
    "client": {
      "name": "IBIG Solutions",
      "email": "facturation@ibig.ci"
    }
  }
}
```

### visitor.arrived

```json
{
  "id": "880e8400-e29b-41d4-a716-446655443333",
  "event": "visitor.arrived",
  "created_at": "2026-07-21T10:15:00+00:00",
  "organization": 42,
  "data": {
    "visitor": {
      "name": "Jean Koné",
      "company": "Tech Abidjan",
      "badge_number": "V-2026-0042"
    },
    "host": {
      "id": 7,
      "name": "Marie Yao"
    },
    "arrived_at": "2026-07-21T10:15:00+00:00",
    "purpose": "Réunion commerciale"
  }
}
```

---

## 6. Tableau des événements déclencheurs

| Événement             | Déclencheur                                    | Payload clés |
|-----------------------|------------------------------------------------|--------------|
| `event.created`       | Création d'un événement agenda                 | id, title, start_at, end_at, creator |
| `event.updated`       | Modification d'un événement agenda             | id, title, changes[] |
| `task.created`        | Création d'une tâche                           | id, title, assigned_to, due_date |
| `task.completed`      | Tâche marquée comme terminée                   | id, title, completed_at, completed_by |
| `courrier.received`   | Nouveau courrier entrant enregistré            | id, reference, sender, subject |
| `courrier.processed`  | Courrier traité / archivé                      | id, reference, processed_by, action |
| `visitor.arrived`     | Visiteur enregistré à la réception             | visitor, host, arrived_at |
| `visitor.departed`    | Visiteur sorti du bâtiment                     | visitor, departed_at, duration_min |
| `invoice.created`     | Nouvelle facture émise                         | invoice_number, amount, currency, client |
| `invoice.paid`        | Facture marquée comme payée                    | invoice_number, amount, paid_at |
| `user.invited`        | Invitation envoyée à un nouvel utilisateur     | email, role, invited_by |
| `leave.approved`      | Demande de congé approuvée                     | employee, start_date, end_date, days |

---

*Documentation SECRETIS ERP — Intégrations avancées*
*Dernière mise à jour : Juillet 2026*
