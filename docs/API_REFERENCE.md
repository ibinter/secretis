# SECRETIS ERP — Référence API publique

> Version 2.0 | Base URL : `https://votre-domaine.com/api/v1`
> Format : JSON | Auth : Bearer Token (Sanctum)

---

## Authentification

Tous les endpoints (sauf `/auth/login` et `/auth/register`) nécessitent un header :

```
Authorization: Bearer {votre_token}
Content-Type: application/json
Accept: application/json
```

### Obtenir un token

```bash
curl -X POST https://votre-domaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "utilisateur@org.ci",
    "password": "votre_mot_de_passe"
  }'
```

**Réponse 200 :**

```json
{
  "token": "1|abc123...",
  "user": {
    "id": 42,
    "name": "Kouadio N'Goran",
    "email": "k.ngoran@bnci.ci",
    "role": "admin",
    "organization_id": 7
  },
  "expires_at": "2026-02-15T10:00:00Z"
}
```

### Révoquer le token

```bash
curl -X DELETE https://votre-domaine.com/api/v1/auth/logout \
  -H "Authorization: Bearer {token}"
```

---

## Codes de réponse HTTP

| Code | Signification |
|------|-------------|
| 200 | Succès |
| 201 | Ressource créée |
| 204 | Succès sans contenu |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource introuvable |
| 422 | Erreur de validation |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |

**Format d'erreur standard :**

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["L'adresse email est invalide."]
  }
}
```

---

## Module Agenda

### Lister les événements

```bash
GET /api/v1/events?start=2026-01-01&end=2026-01-31&type=meeting
```

**Paramètres :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `start` | date | Date de début (Y-m-d) |
| `end` | date | Date de fin (Y-m-d) |
| `type` | string | `meeting`, `appointment`, `reminder` |
| `user_id` | int | Filtrer par utilisateur |

**Réponse :**

```json
{
  "data": [
    {
      "id": 1234,
      "title": "Réunion comité de direction",
      "type": "meeting",
      "start": "2026-01-15T09:00:00Z",
      "end": "2026-01-15T11:00:00Z",
      "location": "Salle Ivoire",
      "attendees": [{"id": 42, "name": "Kouadio N'Goran"}],
      "created_by": 42
    }
  ],
  "meta": {"total": 14, "page": 1, "per_page": 25}
}
```

### Créer un événement

```bash
curl -X POST https://votre-domaine.com/api/v1/events \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "Réunion trimestrielle",
    "type": "meeting",
    "start": "2026-02-01T10:00:00",
    "end": "2026-02-01T12:00:00",
    "location": "Salle A",
    "attendee_ids": [42, 57, 63],
    "send_invitations": true
  }'
```

### Modifier un événement

```bash
curl -X PATCH https://votre-domaine.com/api/v1/events/{id} \
  -H "Authorization: Bearer {token}" \
  -d '{"location": "Salle B", "start": "2026-02-01T14:00:00"}'
```

### Supprimer un événement

```bash
curl -X DELETE https://votre-domaine.com/api/v1/events/{id} \
  -H "Authorization: Bearer {token}"
```

---

## Module GED (Documents)

### Lister les documents

```bash
GET /api/v1/documents?folder_id=5&search=facture&per_page=20
```

**Réponse :**

```json
{
  "data": [
    {
      "id": 789,
      "name": "Facture_TOTAL_2025-12.pdf",
      "type": "pdf",
      "size_bytes": 245760,
      "folder_id": 5,
      "tags": ["finance", "fournisseur"],
      "created_by": {"id": 42, "name": "Kouadio"},
      "created_at": "2025-12-31T15:30:00Z",
      "url": "https://cdn.secretis.ci/documents/789/view"
    }
  ]
}
```

### Uploader un document

```bash
curl -X POST https://votre-domaine.com/api/v1/documents \
  -H "Authorization: Bearer {token}" \
  -F "file=@/chemin/vers/document.pdf" \
  -F "folder_id=5" \
  -F 'tags=["finance","important"]' \
  -F "description=Facture mensuelle TOTAL"
```

### Télécharger un document

```bash
curl -O -J https://votre-domaine.com/api/v1/documents/{id}/download \
  -H "Authorization: Bearer {token}"
```

---

## Module Tâches

### Lister les tâches

```bash
GET /api/v1/tasks?status=open&assignee_id=42&priority=high
```

**Paramètres :**

| Paramètre | Valeurs |
|-----------|---------|
| `status` | `open`, `in_progress`, `done`, `cancelled` |
| `priority` | `low`, `normal`, `high`, `critical` |
| `due_before` | date (Y-m-d) |
| `assignee_id` | int |

### Créer une tâche

```bash
curl -X POST https://votre-domaine.com/api/v1/tasks \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "Préparer le rapport mensuel",
    "description": "Inclure les KPIs Q1",
    "priority": "high",
    "due_at": "2026-02-28",
    "assignee_ids": [42, 57],
    "project_id": 3
  }'
```

**Réponse 201 :**

```json
{
  "data": {
    "id": 456,
    "title": "Préparer le rapport mensuel",
    "status": "open",
    "priority": "high",
    "due_at": "2026-02-28",
    "assignees": [
      {"id": 42, "name": "Kouadio N'Goran"},
      {"id": 57, "name": "Amenan Diallo"}
    ]
  }
}
```

### Changer le statut

```bash
curl -X PATCH https://votre-domaine.com/api/v1/tasks/{id} \
  -H "Authorization: Bearer {token}" \
  -d '{"status": "done"}'
```

---

## Module Visiteurs

### Enregistrer un visiteur

```bash
curl -X POST https://votre-domaine.com/api/v1/visitors \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Jean-Paul Ettien",
    "company": "Cabinet Audit & Co",
    "phone": "+225 07 00 00 00",
    "host_id": 42,
    "purpose": "Réunion commerciale",
    "expected_at": "2026-01-20T14:00:00"
  }'
```

**Réponse 201 :**

```json
{
  "data": {
    "id": 1101,
    "name": "Jean-Paul Ettien",
    "badge_code": "VIS-1101-2601",
    "checked_in_at": "2026-01-20T13:55:00Z",
    "host": {"id": 42, "name": "Kouadio N'Goran"},
    "badge_url": "https://votre-domaine.com/badges/VIS-1101-2601.pdf"
  }
}
```

### Enregistrer la sortie

```bash
curl -X POST https://votre-domaine.com/api/v1/visitors/{id}/checkout \
  -H "Authorization: Bearer {token}"
```

### Lister les visiteurs du jour

```bash
GET /api/v1/visitors?date=2026-01-20&status=checked_in
```

---

## Module Rapports

### Lister les rapports disponibles

```bash
GET /api/v1/reports
```

### Générer un rapport

```bash
curl -X POST https://votre-domaine.com/api/v1/reports/generate \
  -H "Authorization: Bearer {token}" \
  -d '{
    "type": "budget_summary",
    "period_start": "2025-01-01",
    "period_end": "2025-12-31",
    "format": "pdf",
    "filters": {"department_id": 3}
  }'
```

**Réponse 202 (asynchrone) :**

```json
{
  "job_id": "rpt-2026-abc123",
  "status": "processing",
  "estimated_seconds": 15,
  "poll_url": "/api/v1/reports/jobs/rpt-2026-abc123"
}
```

### Vérifier l'état d'un rapport

```bash
GET /api/v1/reports/jobs/{job_id}
```

```json
{
  "job_id": "rpt-2026-abc123",
  "status": "completed",
  "download_url": "https://cdn.secretis.ci/reports/rpt-2026-abc123.pdf",
  "expires_at": "2026-01-21T10:00:00Z"
}
```

---

## SARA — Assistant IA

### Envoyer un message

```bash
curl -X POST https://votre-domaine.com/api/v1/sara/message \
  -H "Authorization: Bearer {token}" \
  -d '{
    "message": "Crée une réunion avec Jean lundi prochain à 10h",
    "context": {"module": "agenda"},
    "conversation_id": "conv-abc123"
  }'
```

**Réponse :**

```json
{
  "reply": "J'ai créé la réunion pour lundi 27 janvier à 10h. Voulez-vous inviter des participants ?",
  "actions_taken": [
    {"type": "event_created", "event_id": 1567}
  ],
  "conversation_id": "conv-abc123",
  "suggestions": ["Ajouter des participants", "Définir un ordre du jour", "Envoyer les invitations"]
}
```

### Historique des conversations

```bash
GET /api/v1/sara/conversations?limit=10
```

---

## Onboarding gamifié

### Obtenir la progression

```bash
GET /onboarding/status
Authorization: Bearer {token}
```

**Réponse :**

```json
{
  "completed": 5,
  "total": 12,
  "percent": 42,
  "points_earned": 250,
  "level": {"label": "Initié", "color": "#2E86C1", "icon": "⚡"},
  "steps": [
    {
      "key": "profile_complete",
      "title": "Compléter votre profil",
      "icon": "👤",
      "points": 50,
      "completed": true,
      "completed_at": "2026-01-10T08:00:00Z"
    }
  ]
}
```

### Marquer une étape complétée

```bash
curl -X POST /onboarding/complete \
  -H "Authorization: Bearer {token}" \
  -d '{"key": "create_event", "metadata": {"event_id": 1234}}'
```

---

## Rate Limiting

| Type | Limite |
|------|--------|
| API authentifiée | 300 requêtes / 5 min |
| API non authentifiée | 20 requêtes / 5 min |
| Upload de fichiers | 10 uploads / min |
| SARA messages | 30 messages / heure |

En cas de dépassement, réponse `429` avec header `Retry-After: {secondes}`.

---

## Pagination

Tous les endpoints de liste acceptent :

| Paramètre | Défaut | Max |
|-----------|--------|-----|
| `page` | 1 | — |
| `per_page` | 25 | 100 |
| `sort` | `created_at` | — |
| `order` | `desc` | `asc`, `desc` |

---

## Webhooks

Configurer des webhooks dans **Paramètres → Intégrations → Webhooks**.

Événements disponibles :

```
event.created, event.updated, event.cancelled
document.uploaded, document.deleted
task.created, task.completed, task.overdue
visitor.checked_in, visitor.checked_out
user.invited, user.joined
report.completed
```

**Payload type :**

```json
{
  "event": "task.completed",
  "timestamp": "2026-01-15T10:30:00Z",
  "organization_id": 7,
  "data": {
    "task_id": 456,
    "title": "Préparer le rapport mensuel",
    "completed_by": {"id": 42, "name": "Kouadio N'Goran"}
  }
}
```

Les requêtes webhook incluent un header `X-SECRETIS-Signature` (HMAC-SHA256) pour la vérification.

---

*Référence OpenAPI 3.1 complète disponible sur `/docs/api` ou [api.secretis.ci](https://api.secretis.ci)*
