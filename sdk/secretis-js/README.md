# @ibigsoft/secretis-js

SDK JavaScript/TypeScript officiel pour l'API **IBIG SECRETIS ERP**.

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://www.npmjs.com/package/@ibigsoft/secretis-js)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)

---

## Installation

```bash
npm install @ibigsoft/secretis-js
# ou
yarn add @ibigsoft/secretis-js
```

---

## Quickstart

### Avec un token existant

```typescript
import { SecretisClient } from '@ibigsoft/secretis-js';

const client = new SecretisClient({
  baseUrl: 'https://monorg.secretis.ibigsoft.com',
  apiKey: '1|LkZt8Mhq3rPxQwYvNjDcAbUiOs7Ef2Gy',
});

// Récupérer les événements du mois
const events = await client.agenda.list({
  start: '2026-07-01',
  end: '2026-07-31',
});

console.log(events.length, 'événements');
```

### Authentification par credentials

```typescript
const client = await SecretisClient.withCredentials({
  baseUrl: 'https://monorg.secretis.ibigsoft.com',
  email: 'admin@monorg.com',
  password: 'MonMotDePasse@2026',
});

// Le client est prêt avec le token injecté automatiquement
const me = await client.me();
console.log('Connecté :', me.user.name);
```

---

## Gestion des erreurs

Toutes les erreurs API sont encapsulées dans `SecretisError` :

```typescript
import { SecretisClient, SecretisError } from '@ibigsoft/secretis-js';

try {
  const task = await client.tasks.create({ title: '' });
} catch (err) {
  if (err instanceof SecretisError) {
    console.log(err.statusCode);      // 422
    console.log(err.errorCode);       // 'SEC-030'
    console.log(err.message);         // 'Les données fournies sont invalides.'
    console.log(err.errors);          // { title: ['Le champ title est obligatoire.'] }
    console.log(err.isValidationError); // true
    console.log(err.isUnauthorized);    // false
    console.log(err.isRateLimited);     // false
  }
}
```

### Propriétés de SecretisError

| Propriété | Type | Description |
|-----------|------|-------------|
| `statusCode` | `number` | Code HTTP (401, 403, 404, 422, 429...) |
| `errorCode` | `string \| undefined` | Code SECRETIS (SEC-030, SEC-040...) |
| `message` | `string` | Message lisible |
| `errors` | `Record<string, string[]> \| undefined` | Erreurs de validation par champ |
| `isValidationError` | `boolean` | statusCode === 422 |
| `isUnauthorized` | `boolean` | statusCode === 401 |
| `isForbidden` | `boolean` | statusCode === 403 |
| `isNotFound` | `boolean` | statusCode === 404 |
| `isRateLimited` | `boolean` | statusCode === 429 |
| `isLicenseError` | `boolean` | statusCode === 402 |

---

## Pagination

Les méthodes `list()` qui retournent `PaginatedResponse<T>` incluent les métadonnées :

```typescript
const result = await client.tasks.list({ status: 'todo', per_page: 10 });

console.log(result.data);              // Task[]
console.log(result.meta.total);        // 142
console.log(result.meta.current_page); // 1
console.log(result.meta.last_page);    // 15
console.log(result.meta.per_page);     // 10
console.log(result.meta.overdue_count); // 7 (spécifique aux tâches)

// Page suivante
const page2 = await client.tasks.list({ status: 'todo', page: 2, per_page: 10 });
```

---

## Reference — Modules

### `client.agenda` — Agenda & Événements

```typescript
// Lister les événements (format FullCalendar)
const events = await client.agenda.list({ start: '2026-07-01', end: '2026-07-31' });
// events: EventCalendarFormat[]

// Détail d'un événement
const event = await client.agenda.get('uuid-event');

// Créer
const newEvent = await client.agenda.create({
  title: 'Réunion de direction',
  start_at: '2026-07-25T09:00:00Z',
  end_at: '2026-07-25T10:30:00Z',
  type: 'meeting',
  location: 'Salle A',
  participant_ids: [5, 8, 12],
  reminders: [{ minutes: 15, channel: 'email' }],
});

// Modifier
const updated = await client.agenda.update('uuid-event', {
  title: 'Nouveau titre',
  color: '#EF4444',
});

// Supprimer
await client.agenda.delete('uuid-event');
```

#### Paramètres de `list()`
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `start` | `string` | Oui | Date ISO début |
| `end` | `string` | Oui | Date ISO fin |
| `view` | `'month' \| 'week' \| 'day' \| 'list'` | Non | Granularité |
| `calendar_id` | `string` | Non | Filtrer par calendrier |
| `type` | `EventType` | Non | event \| meeting \| task \| reminder |

---

### `client.tasks` — Tâches & Kanban

```typescript
// Lister avec filtres
const { data: tasks, meta } = await client.tasks.list({
  project_id: 'uuid-projet',
  status: 'in_progress',
  assignee_id: 5,
  priority: 'high',
});

// Créer
const task = await client.tasks.create({
  title: 'Préparer rapport Q3',
  description: '<p>Inclure les KPIs commerciaux</p>',
  priority: 'high',
  due_date: '2026-09-30',
  assignee_ids: [5, 8],
});

// Modifier
await client.tasks.update(task.id, { priority: 'urgent' });

// Changer le statut (machine à états)
await client.tasks.updateStatus(task.id, 'in_progress');
await client.tasks.updateStatus(task.id, 'review');
await client.tasks.updateStatus(task.id, 'done');

// Supprimer
await client.tasks.delete(task.id);
```

#### Transitions de statut autorisées
```
todo ──────────────► in_progress ──► review ──► done
  │                      │              │         │
  └──► cancelled ◄────────┘◄─────────────┘         └──► in_progress
```

---

### `client.mail` — Courrier

```typescript
// Lister les courriers entrants en attente
const { data } = await client.mail.list({
  type: 'incoming',
  status: 'pending',
  urgency: 'high',
});

// Enregistrer un courrier entrant
const mail = await client.mail.create({
  type: 'incoming',
  subject: 'Demande de partenariat',
  sender_name: 'Jean Kouamé',
  sender_org: 'SCI Abidjan',
  urgency: 'normal',
  received_at: new Date().toISOString(),
});

// Assigner à un agent
await client.mail.assign(mail.id, 5, {
  department_id: 'uuid-dept',
  notes: 'Traiter avant vendredi',
});

// Mettre à jour le statut
await client.mail.updateStatus(mail.id, 'processing');
await client.mail.updateStatus(mail.id, 'processed', 'Réponse envoyée le 21/07');
```

---

### `client.invoices` — Facturation

```typescript
// Créer une facture
const invoice = await client.invoices.create({
  client_name: 'ACME SARL',
  client_email: 'compta@acme.ci',
  currency: 'XOF',
  tax_rate: 18,
  due_date: '2026-08-20',
  items: [
    { description: 'Prestation conseil', quantity: 1, unit_price: 500_000 },
    { description: "Rapport d'audit",    quantity: 2, unit_price: 75_000  },
  ],
  notes: 'Paiement par virement ou mobile money',
});

// PDF — URL de téléchargement
const pdfUrl = client.invoices.getPdfUrl(invoice.id);
// https://monorg.secretis.ibigsoft.com/api/v1/invoices/uuid/pdf

// Enregistrer un paiement
const paid = await client.invoices.recordPayment(invoice.id, {
  amount: 650_000,
  payment_method: 'cinetpay',
  reference: 'CPY-20260721-042',
  paid_at: new Date().toISOString(),
});
console.log(paid.status);  // 'paid'
console.log(paid.balance); // 0
```

---

### `client.users` — Utilisateurs

```typescript
// Tous les membres
const users = await client.users.list();

// Filtrer par département
const dg = await client.users.list({ department_id: 'uuid-dept-dg' });

// Profil d'un utilisateur
const user = await client.users.get(42);

// Inviter un collaborateur
await client.users.invite('john@example.com', 'collaborateur', {
  name: 'John Doe',
  department_id: 'uuid-dept',
});

// Promouvoir manager
const updated = await client.users.updateRole(42, 'manager');
```

---

### `client.notifications` — Notifications

```typescript
// Toutes les notifications
const { data, meta } = await client.notifications.list();
console.log(`${meta.unread_count} non lue(s)`);

// Non lues seulement
const unread = await client.notifications.list({ unread_only: true });

// Marquer une notification lue
await client.notifications.markRead('uuid-notification');

// Tout marquer lu
const { marked_count } = await client.notifications.markAllRead();
console.log(`${marked_count} notification(s) marquée(s) lues`);
```

---

## Configuration avancée

```typescript
const client = new SecretisClient({
  baseUrl: 'https://monorg.secretis.ibigsoft.com',
  apiKey: 'sk_...',
  timeout: 60_000,   // 60 secondes (défaut: 30s)
  apiVersion: 'v1',  // Version de l'API
});

// Mettre à jour le token (après refresh)
client.setToken('nouveau-token');

// Lire la config
console.log(client.getConfig().baseUrl);
```

---

## Rate Limiting

L'API SECRETIS impose les limites suivantes :

| Endpoint | Limite |
|----------|--------|
| Tous les endpoints authentifiés | **1 000 req/heure** par token |
| Login | **5 tentatives/minute** par email+IP |
| Webhooks | **100 req/minute** |

En cas de dépassement, une `SecretisError` avec `statusCode: 429` et `isRateLimited: true` est levée.

```typescript
try {
  await client.tasks.list();
} catch (err) {
  if (err instanceof SecretisError && err.isRateLimited) {
    // Attendre avant de réessayer
    await new Promise(resolve => setTimeout(resolve, 60_000));
  }
}
```

---

## Codes d'erreur SECRETIS

| Code | Signification |
|------|---------------|
| `SEC-001` | Licence expirée |
| `SEC-010` | Permission refusée |
| `SEC-020` | Ressource introuvable |
| `SEC-030` | Erreur de validation |
| `SEC-040` | Trop de tentatives de connexion |
| `SEC-041` | Compte verrouillé |
| `SEC-042` | Compte désactivé |
| `SEC-043` | Organisation suspendue |
| `SEC-050` | Transition de statut invalide |

---

## Compatibilité

- **Node.js** : >= 16
- **Navigateurs** : Tous les navigateurs modernes (ES2020+)
- **TypeScript** : >= 5.0
- **Bundlers** : Vite, Webpack, Rollup, esbuild

---

## Support

- Documentation : https://secretis.ibigsoft.com/docs/api
- Issues : https://github.com/ibigsoft/secretis-js/issues
- Email : support@ibigsoft.com
