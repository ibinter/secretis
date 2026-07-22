# Guide de démarrage rapide — API IBIG SECRETIS

**Base URL** : `https://{votre-slug}.secretis.ibigsoft.com/api/v1`

---

## 1. Obtenir un token

### Via cURL

```bash
curl -X POST https://acme-ci.secretis.ibigsoft.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "admin@acme-ci.com",
    "password": "MonMotDePasse@2026"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "message": "Connexion réussie.",
  "data": {
    "token": "1|LkZt8Mhq3rPxQwYvNjDcAbUiOs7Ef2Gy",
    "token_type": "Bearer",
    "user": {
      "id": 42,
      "name": "Konan Amani",
      "email": "admin@acme-ci.com",
      "roles": ["admin_org"]
    },
    "organization": {
      "id": "01j8vz...",
      "name": "Société ACME CI",
      "slug": "acme-ci",
      "status": "active"
    },
    "license_status": "active",
    "permissions": ["events.view", "tasks.create", "invoices.manage"]
  },
  "meta": {
    "api_version": "1.0",
    "timestamp": "2026-07-21T10:00:00Z",
    "request_id": "uuid-v4"
  }
}
```

Conservez le `token` — il est valide jusqu'à déconnexion.

---

## 2. Premier appel API

Incluez le token dans chaque requête avec l'en-tête `Authorization: Bearer <token>`.

### cURL — Lister les événements du mois

```bash
export TOKEN="1|LkZt8Mhq3rPxQwYvNjDcAbUiOs7Ef2Gy"
export BASE="https://acme-ci.secretis.ibigsoft.com/api/v1"

curl "$BASE/events?start=2026-07-01&end=2026-07-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

### JavaScript (Fetch)

```javascript
const BASE = 'https://acme-ci.secretis.ibigsoft.com/api/v1';
const TOKEN = '1|LkZt8Mhq3rPxQwYvNjDcAbUiOs7Ef2Gy';

async function getEvents() {
  const res = await fetch(`${BASE}/events?start=2026-07-01&end=2026-07-31`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/json',
    },
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data; // EventCalendarFormat[]
}

const events = await getEvents();
console.log(events.length, 'événements');
```

### SDK JavaScript (recommandé)

```typescript
import { SecretisClient } from '@ibigsoft/secretis-js';

const client = new SecretisClient({
  baseUrl: 'https://acme-ci.secretis.ibigsoft.com',
  apiKey: '1|LkZt8Mhq3rPxQwYvNjDcAbUiOs7Ef2Gy',
});

const events = await client.agenda.list({ start: '2026-07-01', end: '2026-07-31' });
```

### Python (requests)

```python
import requests

BASE  = "https://acme-ci.secretis.ibigsoft.com/api/v1"
TOKEN = "1|LkZt8Mhq3rPxQwYvNjDcAbUiOs7Ef2Gy"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
}

# Lister les tâches en cours
resp = requests.get(f"{BASE}/tasks", params={"status": "in_progress"}, headers=headers)
resp.raise_for_status()
data = resp.json()

for task in data["data"]:
    print(f"[{task['priority'].upper()}] {task['title']} — {task['status']}")
```

---

## 3. Exemples par module

### Créer une tâche et l'assigner

```bash
curl -X POST $BASE/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Préparer présentation CA",
    "priority": "high",
    "due_date": "2026-07-30",
    "assignee_ids": [5, 8]
  }'
```

### Enregistrer un courrier entrant

```bash
curl -X POST $BASE/mail-registry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "incoming",
    "subject": "Demande de partenariat stratégique",
    "sender_name": "Touré Ibrahim",
    "sender_org": "Groupe TI",
    "urgency": "high",
    "received_at": "2026-07-21T08:30:00Z"
  }'
```

### Uploader un document (multipart)

```bash
curl -X POST $BASE/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/chemin/vers/rapport.pdf" \
  -F "folder_id=uuid-dossier"
```

### Créer une facture

```bash
curl -X POST $BASE/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "ACME SARL",
    "client_email": "compta@acme.ci",
    "currency": "XOF",
    "tax_rate": 18,
    "items": [
      {"description": "Prestation conseil", "quantity": 1, "unit_price": 500000},
      {"description": "Rapport audit",      "quantity": 2, "unit_price": 75000}
    ]
  }'
```

### Enregistrer l'arrivée d'un visiteur

```bash
curl -X POST $BASE/visitors/checkin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Kouamé Jean-Baptiste",
    "company": "SCI Abidjan",
    "phone": "+225 07 00 00 00",
    "purpose": "Réunion commerciale",
    "host_id": 12
  }'
```

---

## 4. Webhooks de paiement

Les webhooks sont reçus sans authentification mais avec vérification de signature HMAC.

### CinetPay

```bash
# Exemple de payload CinetPay reçu sur POST /api/v1/webhooks/cinetpay
{
  "cpm_site_id": "123456",
  "cpm_trans_id": "TXN-2026-001",
  "cpm_amount": "650000",
  "cpm_currency": "XOF",
  "signature": "sha256-hmac-signature",
  "cpm_result": "00",
  "cpm_custom": "invoice_uuid_42"
}
```

### Paystack

```bash
# Payload Paystack — vérifier l'en-tête X-Paystack-Signature
{
  "event": "charge.success",
  "data": {
    "reference": "PAY-REF-001",
    "amount": 65000000,
    "currency": "NGN",
    "metadata": { "invoice_id": "uuid" }
  }
}
```

### Configurer les URLs webhook dans votre tableau de bord

| Gateway | URL à configurer |
|---------|-----------------|
| CinetPay | `https://monorg.secretis.ibigsoft.com/api/v1/webhooks/cinetpay` |
| Paystack | `https://monorg.secretis.ibigsoft.com/api/v1/webhooks/paystack` |
| Flutterwave | `https://monorg.secretis.ibigsoft.com/api/v1/webhooks/flutterwave` |

---

## 5. Rate Limiting

| Endpoint | Limite | Window |
|----------|--------|--------|
| Tous les endpoints authentifiés | **1 000 requêtes** | Par heure |
| `POST /auth/login` | **5 tentatives** | Par minute par email+IP |
| Webhooks | **100 requêtes** | Par minute |

En cas de dépassement :
```json
HTTP 429 Too Many Requests

{
  "success": false,
  "message": "Trop de tentatives. Réessayez dans 60 secondes.",
  "error_code": "SEC-040",
  "meta": {
    "retry_after": 60
  }
}
```

En-têtes de rate limit (présents sur chaque réponse) :
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1753091400
```

---

## 6. Format des réponses

### Succès
```json
{
  "success": true,
  "data": { "..." },
  "message": "Opération réussie.",
  "meta": {
    "api_version": "1.0",
    "timestamp": "2026-07-21T10:00:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Réponse paginée
```json
{
  "success": true,
  "data": [ "..." ],
  "message": "Données récupérées.",
  "meta": {
    "current_page": 1,
    "last_page": 6,
    "per_page": 25,
    "total": 142,
    "from": 1,
    "to": 25,
    "api_version": "1.0",
    "timestamp": "2026-07-21T10:00:00Z",
    "request_id": "uuid"
  }
}
```

### Erreur
```json
{
  "success": false,
  "data": null,
  "message": "Les données fournies sont invalides.",
  "error_code": "SEC-030",
  "errors": {
    "email": ["Le champ email est obligatoire."],
    "title": ["Le titre ne peut pas dépasser 255 caractères."]
  },
  "meta": {
    "api_version": "1.0",
    "timestamp": "2026-07-21T10:00:00Z"
  }
}
```

---

## 7. Codes d'erreur

| HTTP | Code SECRETIS | Signification | Action recommandée |
|------|--------------|---------------|-------------------|
| 400 | — | Requête malformée | Vérifier le JSON envoyé |
| 401 | — | Token absent ou invalide | Se reconnecter via `/auth/login` |
| 402 | SEC-001 | Licence expirée | Renouveler sur `/parametres/billing` |
| 403 | SEC-010 | Permission insuffisante | Vérifier le rôle de l'utilisateur |
| 404 | SEC-020 | Ressource introuvable | Vérifier l'UUID |
| 422 | SEC-030 | Erreur de validation | Corriger les champs `errors` |
| 423 | SEC-041 | Compte verrouillé | Contacter l'admin |
| 429 | SEC-040 | Trop de requêtes | Attendre `retry_after` secondes |
| 500 | — | Erreur serveur | Contacter support@ibigsoft.com |

---

## 8. Pagination

Toutes les listes supportent les paramètres :

| Paramètre | Défaut | Maximum |
|-----------|--------|---------|
| `page` | `1` | — |
| `per_page` | `25` | `100` |

```bash
# Récupérer la page 3, 50 éléments par page
curl "$BASE/tasks?page=3&per_page=50" -H "Authorization: Bearer $TOKEN"
```

---

## 9. Déconnexion

```bash
curl -X POST $BASE/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

Le token est immédiatement révoqué côté serveur.

---

## Ressources

- **Documentation interactive** : `docs/api-portal/index.html`
- **SDK JavaScript** : `npm install @ibigsoft/secretis-js`
- **Spec OpenAPI** : `backend/openapi.yaml`
- **Support** : support@ibigsoft.com
- **Status** : https://status.ibigsoft.com
