# Référence API — IBIG SECRETIS ERP

**Version :** v1
**URL de base :** `https://votre-domaine.com/api/v1`
**Format :** JSON (application/json)
**Spécification :** OpenAPI 3.1 disponible sur `/api/docs`

---

## Table des matières

1. [Authentification](#1-authentification)
2. [Rate Limiting](#2-rate-limiting)
3. [Format des réponses](#3-format-des-réponses)
4. [Pagination](#4-pagination)
5. [Filtres et tri](#5-filtres-et-tri)
6. [Endpoints par module](#6-endpoints-par-module)
7. [Codes d'erreur](#7-codes-derreur)
8. [Webhooks](#8-webhooks)
9. [Exemples curl](#9-exemples-curl)

---

## 1. Authentification

SECRETIS utilise **Laravel Sanctum** pour l'authentification API via des Bearer Tokens.

### Obtenir un token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "utilisateur@organisation.com",
  "password": "votre-mot-de-passe",
  "device_name": "Mon application"
}
```

**Réponse :**

```json
{
  "success": true,
  "data": {
    "token": "1|abc123xyz...",
    "token_type": "Bearer",
    "expires_at": "2026-08-21T10:00:00Z",
    "user": {
      "id": "uuid",
      "name": "Marie Dupont",
      "email": "marie@organisation.com",
      "role": "secretaire_general",
      "tenant_id": "tenant-uuid",
      "mfa_enabled": true
    }
  }
}
```

### Utiliser le token

```http
GET /api/v1/agenda/events
Authorization: Bearer 1|abc123xyz...
Accept: application/json
X-Tenant-ID: tenant-uuid
```

### Révoquer un token

```http
POST /api/v1/auth/logout
Authorization: Bearer 1|abc123xyz...
```

### Renouveler un token

```http
POST /api/v1/auth/refresh
Authorization: Bearer 1|abc123xyz...
```

---

## 2. Rate Limiting

| Plan | Endpoints standard | Endpoints IA (SARA) | Webhooks |
|---|---|---|---|
| Starter | 500 req/h | 20 req/h | — |
| Pro | 1 000 req/h | 50 req/h | 100/jour |
| Enterprise | 5 000 req/h | 100 req/h | Illimité |
| On-Premise | Configurable | Configurable | Configurable |

**En-têtes de rate limiting dans les réponses :**

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1753097600
Retry-After: 3600
```

En cas de dépassement : `HTTP 429 Too Many Requests`

---

## 3. Format des réponses

### Succès

```json
{
  "success": true,
  "data": { },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-07-22T10:00:00Z",
    "version": "v1"
  }
}
```

### Succès avec pagination

```json
{
  "success": true,
  "data": [ ],
  "pagination": {
    "cursor": "eyJpZCI6MTAwfQ",
    "next_cursor": "eyJpZCI6MTUwfQ",
    "prev_cursor": null,
    "per_page": 50,
    "has_more": true
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-07-22T10:00:00Z"
  }
}
```

### Erreur

```json
{
  "success": false,
  "error": {
    "code": "SEC-004",
    "message": "Ressource non trouvée",
    "details": "L'événement avec l'identifiant abc123 n'existe pas.",
    "documentation": "https://docs.ibig-secretis.com/errors/SEC-004"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-07-22T10:00:00Z"
  }
}
```

### Erreur de validation

```json
{
  "success": false,
  "error": {
    "code": "SEC-002",
    "message": "Données invalides",
    "fields": {
      "title": ["Le titre est obligatoire."],
      "start_at": ["Le format de la date est invalide. Format attendu : ISO 8601."],
      "attendees": ["Maximum 50 participants autorisés."]
    }
  }
}
```

---

## 4. Pagination

SECRETIS utilise une pagination **cursor-based** pour toutes les listes. Ce mécanisme est plus performant que la pagination par offset sur de grands volumes de données.

**Paramètres de requête :**

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `cursor` | string | null | Curseur pour la page suivante |
| `per_page` | integer | 25 | Nombre de résultats (max : 100) |
| `direction` | string | `next` | `next` ou `prev` |

**Exemple :**

```http
GET /api/v1/courrier/letters?per_page=50&cursor=eyJpZCI6MTAwfQ
```

---

## 5. Filtres et tri

**Filtres :** `filter[champ]=valeur` ou opérateurs : `gt`, `gte`, `lt`, `lte`, `like`, `in`

```http
GET /api/v1/courrier/letters?filter[type]=entrant&filter[created_at][gte]=2026-01-01
GET /api/v1/personnel/employees?filter[department_id][in]=uuid1,uuid2
GET /api/v1/agenda/events?filter[title][like]=réunion
```

**Tri :** `sort=champ` (ASC) ou `sort=-champ` (DESC)

```http
GET /api/v1/courrier/letters?sort=-created_at
GET /api/v1/personnel/employees?sort=last_name&sort=first_name
```

**Inclure des relations :** `include=relation1,relation2`

```http
GET /api/v1/agenda/events/uuid?include=attendees,reminders,room
```

**Champs sélectifs :** `fields[resource]=champ1,champ2`

```http
GET /api/v1/personnel/employees?fields[employees]=id,full_name,email,department
```

---

## 6. Endpoints par module

### Module Authentification & Compte

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| POST | `/auth/login` | Connexion et obtention du token | Non | Tous |
| POST | `/auth/logout` | Révocation du token courant | Oui | Tous |
| POST | `/auth/refresh` | Renouveler le token | Oui | Tous |
| GET | `/auth/me` | Profil de l'utilisateur connecté | Oui | Tous |
| PUT | `/auth/me` | Mettre à jour son profil | Oui | Tous |
| POST | `/auth/mfa/enable` | Activer le MFA (TOTP) | Oui | Tous |
| POST | `/auth/mfa/verify` | Valider le code MFA | Oui | Tous |
| POST | `/auth/password/forgot` | Demander reset mot de passe | Non | Tous |
| POST | `/auth/password/reset` | Réinitialiser mot de passe | Non | Tous |

### Module Agenda & Calendrier

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/agenda/events` | Lister les événements (filtrable) | Oui | Starter |
| POST | `/agenda/events` | Créer un événement | Oui | Starter |
| GET | `/agenda/events/{id}` | Détail d'un événement | Oui | Starter |
| PUT | `/agenda/events/{id}` | Modifier un événement | Oui | Starter |
| DELETE | `/agenda/events/{id}` | Supprimer un événement | Oui | Starter |
| GET | `/agenda/rooms` | Lister les salles disponibles | Oui | Starter |
| POST | `/agenda/rooms/{id}/availability` | Vérifier disponibilité d'une salle | Oui | Starter |
| GET | `/agenda/events/{id}/attendees` | Participants d'un événement | Oui | Starter |
| POST | `/agenda/events/{id}/attendees` | Ajouter des participants | Oui | Starter |
| DELETE | `/agenda/events/{id}/attendees/{uid}` | Retirer un participant | Oui | Starter |
| POST | `/agenda/sync/google` | Synchroniser Google Calendar | Oui | Pro |
| POST | `/agenda/sync/outlook` | Synchroniser Microsoft Outlook | Oui | Pro |

### Module Courrier & GED

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/courrier/letters` | Lister le courrier | Oui | Starter |
| POST | `/courrier/letters` | Enregistrer un nouveau courrier | Oui | Starter |
| GET | `/courrier/letters/{id}` | Détail d'un courrier | Oui | Starter |
| PUT | `/courrier/letters/{id}` | Modifier un courrier | Oui | Starter |
| DELETE | `/courrier/letters/{id}` | Archiver un courrier | Oui | Starter |
| POST | `/courrier/letters/{id}/transmit` | Transmettre à un destinataire | Oui | Starter |
| GET | `/courrier/letters/{id}/history` | Historique de circulation | Oui | Starter |
| POST | `/courrier/letters/{id}/sign` | Apposer une signature électronique | Oui | Pro |
| GET | `/ged/documents` | Lister les documents GED | Oui | Starter |
| POST | `/ged/documents` | Déposer un document | Oui | Starter |
| GET | `/ged/documents/{id}` | Télécharger un document | Oui | Starter |
| POST | `/ged/documents/{id}/ocr` | Déclencher l'OCR | Oui | Pro |
| GET | `/ged/search` | Recherche plein texte dans GED | Oui | Starter |

### Module Réunions & PV

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/meetings` | Lister les réunions | Oui | Starter |
| POST | `/meetings` | Planifier une réunion | Oui | Starter |
| GET | `/meetings/{id}` | Détail d'une réunion | Oui | Starter |
| PUT | `/meetings/{id}` | Modifier une réunion | Oui | Starter |
| POST | `/meetings/{id}/minutes` | Créer le PV de réunion | Oui | Starter |
| GET | `/meetings/{id}/minutes` | Lire le PV | Oui | Starter |
| PUT | `/meetings/{id}/minutes` | Modifier le PV | Oui | Starter |
| POST | `/meetings/{id}/minutes/approve` | Approuver et verrouiller le PV | Oui | Starter |
| GET | `/meetings/{id}/actions` | Points d'action issus de la réunion | Oui | Starter |
| PUT | `/meetings/{id}/actions/{aid}` | Mettre à jour un point d'action | Oui | Starter |

### Module Personnel (RH)

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/hr/employees` | Lister les agents | Oui | Pro |
| POST | `/hr/employees` | Créer un dossier agent | Oui | Pro |
| GET | `/hr/employees/{id}` | Dossier complet d'un agent | Oui | Pro |
| PUT | `/hr/employees/{id}` | Modifier le dossier | Oui | Pro |
| GET | `/hr/departments` | Lister les services/directions | Oui | Pro |
| POST | `/hr/departments` | Créer un service | Oui | Pro |
| GET | `/hr/leaves` | Lister les demandes de congés | Oui | Pro |
| POST | `/hr/leaves` | Soumettre une demande de congé | Oui | Pro |
| PUT | `/hr/leaves/{id}/approve` | Approuver une demande | Oui | Pro |
| PUT | `/hr/leaves/{id}/reject` | Rejeter une demande | Oui | Pro |
| GET | `/hr/orgchart` | Organigramme de l'organisation | Oui | Pro |
| GET | `/hr/employees/{id}/evaluations` | Evaluations annuelles | Oui | Pro |

### Module Patrimoine & Inventaire

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/assets` | Lister les biens | Oui | Pro |
| POST | `/assets` | Enregistrer un bien | Oui | Pro |
| GET | `/assets/{id}` | Fiche d'un bien | Oui | Pro |
| PUT | `/assets/{id}` | Modifier la fiche | Oui | Pro |
| POST | `/assets/{id}/assign` | Affecter à un agent/service | Oui | Pro |
| GET | `/assets/{id}/history` | Historique des affectations | Oui | Pro |
| POST | `/assets/{id}/depreciation` | Calculer l'amortissement | Oui | Pro |
| GET | `/assets/report/inventory` | Rapport d'inventaire global | Oui | Pro |

### Module Missions & Déplacements

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/missions` | Lister les ordres de mission | Oui | Pro |
| POST | `/missions` | Créer un ordre de mission | Oui | Pro |
| GET | `/missions/{id}` | Détail d'une mission | Oui | Pro |
| PUT | `/missions/{id}/approve` | Approuver l'ordre de mission | Oui | Pro |
| POST | `/missions/{id}/expenses` | Soumettre une note de frais | Oui | Pro |
| GET | `/missions/{id}/expenses` | Lister les frais d'une mission | Oui | Pro |
| PUT | `/missions/{id}/expenses/{eid}/approve` | Approuver les frais | Oui | Pro |
| GET | `/missions/report` | Rapport des missions (période) | Oui | Pro |

### Module Notes de Service

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/notes` | Lister les notes de service | Oui | Starter |
| POST | `/notes` | Rédiger une note | Oui | Starter |
| GET | `/notes/{id}` | Consulter une note | Oui | Starter |
| PUT | `/notes/{id}` | Modifier (avant visa) | Oui | Starter |
| POST | `/notes/{id}/submit` | Soumettre au circuit de validation | Oui | Starter |
| POST | `/notes/{id}/approve` | Viser/signer une note | Oui | Starter |
| POST | `/notes/{id}/publish` | Publier et diffuser | Oui | Starter |
| GET | `/notes/{id}/acknowledgements` | Accusés de réception | Oui | Starter |

### Module Bibliothèque & Médiathèque

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/library/items` | Catalogue (livres, périodiques) | Oui | Pro |
| POST | `/library/items` | Ajouter un document au fonds | Oui | Pro |
| GET | `/library/items/{id}` | Fiche d'un document | Oui | Pro |
| GET | `/library/loans` | Lister les prêts en cours | Oui | Pro |
| POST | `/library/loans` | Effectuer un prêt | Oui | Pro |
| PUT | `/library/loans/{id}/return` | Retourner un document | Oui | Pro |
| POST | `/library/reservations` | Réserver un document | Oui | Pro |
| GET | `/library/search` | Recherche dans le catalogue | Oui | Pro |

### Module Protocole & Evenementiel

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/protocol/events` | Lister les événements protocolaires | Oui | Enterprise |
| POST | `/protocol/events` | Créer un événement officiel | Oui | Enterprise |
| GET | `/protocol/events/{id}/guests` | Liste des invités | Oui | Enterprise |
| POST | `/protocol/events/{id}/guests` | Ajouter des invités | Oui | Enterprise |
| POST | `/protocol/events/{id}/accreditations` | Générer des badges | Oui | Enterprise |
| GET | `/protocol/vip-lists` | Listes de préséance | Oui | Enterprise |

### Module Tableaux de bord BI

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/dashboard` | Tableau de bord principal | Oui | Pro |
| GET | `/dashboard/kpis` | Tous les KPIs disponibles | Oui | Pro |
| GET | `/dashboard/kpis/{slug}` | Valeur d'un KPI spécifique | Oui | Pro |
| POST | `/reports` | Générer un rapport (asynchrone) | Oui | Pro |
| GET | `/reports/{id}` | Statut/téléchargement d'un rapport | Oui | Pro |
| GET | `/reports/templates` | Modèles de rapports disponibles | Oui | Pro |

### Module Comptabilité SYSCOHADA

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/accounting/accounts` | Plan comptable SYSCOHADA | Oui | Enterprise |
| GET | `/accounting/journals` | Journaux comptables | Oui | Enterprise |
| POST | `/accounting/entries` | Saisir une écriture | Oui | Enterprise |
| GET | `/accounting/ledger` | Grand-livre | Oui | Enterprise |
| GET | `/accounting/balance` | Balance générale | Oui | Enterprise |
| GET | `/accounting/financial-statements/balance-sheet` | Bilan SYSCOHADA | Oui | Enterprise |
| GET | `/accounting/financial-statements/income-statement` | Compte de résultat | Oui | Enterprise |
| GET | `/accounting/financial-statements/cash-flow` | TAFIRE | Oui | Enterprise |

### Module SARA (Intelligence Artificielle)

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| POST | `/sara/chat` | Conversation avec SARA | Oui | Pro |
| POST | `/sara/summarize` | Résumer un document | Oui | Pro |
| POST | `/sara/classify` | Classifier un document | Oui | Pro |
| POST | `/sara/extract` | Extraire des données structurées | Oui | Enterprise |
| POST | `/sara/ocr` | OCR multilingue sur image/PDF | Oui | Pro |
| GET | `/sara/suggestions` | Suggestions SARA du jour | Oui | Pro |

### SuperAdmin (gestion multi-tenant)

| Méthode | Route | Description | Auth | Plan min. |
|---|---|---|---|---|
| GET | `/admin/tenants` | Lister tous les tenants | SuperAdmin | — |
| POST | `/admin/tenants` | Créer un nouveau tenant | SuperAdmin | — |
| GET | `/admin/tenants/{id}` | Détail d'un tenant | SuperAdmin | — |
| PUT | `/admin/tenants/{id}/plan` | Changer le plan d'un tenant | SuperAdmin | — |
| POST | `/admin/tenants/{id}/suspend` | Suspendre un tenant | SuperAdmin | — |
| GET | `/admin/stats` | Statistiques globales SaaS | SuperAdmin | — |

---

## 7. Codes d'erreur

| Code | HTTP | Description | Action recommandée |
|---|---|---|---|
| SEC-001 | 401 | Token d'authentification manquant | Inclure le header Authorization |
| SEC-002 | 422 | Données de la requête invalides | Corriger les champs indiqués dans error.fields |
| SEC-003 | 401 | Token expiré ou révoqué | Se reconnecter via /auth/login |
| SEC-004 | 404 | Ressource non trouvée | Vérifier l'identifiant de la ressource |
| SEC-005 | 403 | Permission insuffisante | Contacter l'administrateur du tenant |
| SEC-006 | 403 | Accès cross-tenant détecté | Requête bloquée pour sécurité |
| SEC-007 | 429 | Rate limit dépassé | Attendre Retry-After secondes |
| SEC-008 | 402 | Fonctionnalité non incluse dans votre plan | Mettre à niveau votre abonnement |
| SEC-009 | 503 | Service temporairement indisponible | Réessayer après quelques minutes |
| SEC-010 | 409 | Conflit : ressource déjà existante | Vérifier les doublons |
| SEC-011 | 400 | Tenant inactif ou suspendu | Contacter support@ibigsoft.com |
| SEC-012 | 423 | Ressource verrouillée par un autre utilisateur | Attendre ou forcer le déverrouillage |
| SEC-020 | 400 | Format de fichier non supporté | Formats acceptés : PDF, DOCX, XLSX, PNG, JPG |
| SEC-021 | 413 | Fichier trop volumineux | Taille maximum : 50 MB |
| SEC-022 | 400 | OCR impossible sur ce document | Document illisible ou corrompu |
| SEC-030 | 400 | Conflit de plage horaire pour la salle | Choisir un autre créneau ou salle |
| SEC-031 | 400 | Participant déjà invité à cet événement | Vérifier la liste des participants |
| SEC-040 | 400 | Solde de congés insuffisant | Vérifier le solde disponible |
| SEC-041 | 409 | Période de congé déjà couverte | Modifier les dates demandées |
| SEC-050 | 400 | Ecriture comptable déjà validée | Les écritures validées sont immuables |
| SEC-051 | 400 | Exercice comptable clôturé | Créer une écriture d'extourne |
| SEC-060 | 400 | Licence On-Premise invalide | Contacter licenses@ibigsoft.com |
| SEC-061 | 402 | Licence On-Premise expirée | Renouveler sur le portail IBIG Soft |
| SEC-062 | 403 | Module non inclus dans la licence | Mettre à niveau la licence |
| SEC-070 | 500 | Erreur SARA / LLM indisponible | Le service IA est temporairement indisponible |
| SEC-071 | 400 | Contenu SARA refusé (politique) | Reformuler la demande |
| SEC-075 | 400 | Webhook HMAC invalide | Vérifier la clé secrète du webhook |
| SEC-076 | 400 | Webhook Idempotency Key déjà utilisée | Ce webhook a déjà été traité |

---

## 8. Webhooks

### Webhooks sortants (SECRETIS vers votre application)

SECRETIS peut notifier votre application lors d'événements importants.

**Configuration :** Administration > Intégrations > Webhooks

**Signature des webhooks :**

Chaque requête inclut l'en-tête `X-Secretis-Signature` :
```
X-Secretis-Signature: sha256=abc123...
```

Vérification (PHP) :
```php
$expected = 'sha256=' . hash_hmac('sha256', $payload, $webhookSecret);
if (!hash_equals($expected, $request->header('X-Secretis-Signature'))) {
    abort(403, 'Signature invalide');
}
```

**Evénements disponibles :**

| Evénement | Déclencheur |
|---|---|
| `courrier.received` | Nouveau courrier entrant enregistré |
| `courrier.transmitted` | Courrier transmis à un destinataire |
| `agenda.event.created` | Nouvel événement agenda créé |
| `agenda.event.reminder` | Rappel d'événement (30 min avant) |
| `meeting.minutes.approved` | PV de réunion approuvé et verrouillé |
| `hr.leave.approved` | Demande de congé approuvée |
| `hr.leave.rejected` | Demande de congé rejetée |
| `mission.approved` | Ordre de mission approuvé |
| `note.published` | Note de service publiée |
| `payment.completed` | Paiement abonnement confirmé |
| `tenant.plan.upgraded` | Plan d'abonnement mis à niveau |

**Format du payload :**

```json
{
  "event": "courrier.received",
  "timestamp": "2026-07-22T10:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "id": "uuid",
    "reference": "CI-2026-0742",
    "type": "entrant",
    "subject": "Invitation Conférence Africaine ERP",
    "sender": "conf@africaerp.org",
    "received_at": "2026-07-22T10:00:00Z"
  }
}
```

### Webhooks entrants (votre application vers SECRETIS)

Certains modules acceptent des événements entrants depuis vos systèmes.

| Méthode | Route | Description |
|---|---|---|
| POST | `/webhooks/payment/{gateway}` | Notification paiement (Orange Money, Stripe...) |
| POST | `/webhooks/email/inbound` | Courrier entrant depuis un serveur mail |
| POST | `/webhooks/calendar/sync` | Sync calendrier externe (push) |

---

## 9. Exemples curl

### Authentification

```bash
curl -X POST https://votre-domaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@organisation.com",
    "password": "VotreMotDePasse123!",
    "device_name": "API Client"
  }'
```

### Lister les événements agenda de la semaine

```bash
curl "https://votre-domaine.com/api/v1/agenda/events?\
filter[start_at][gte]=2026-07-21&\
filter[start_at][lte]=2026-07-27&\
sort=start_at&\
per_page=50" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Accept: application/json"
```

### Créer un événement agenda

```bash
curl -X POST https://votre-domaine.com/api/v1/agenda/events \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Réunion du Comité de Direction",
    "description": "Revue du bilan mensuel et plan Q3",
    "start_at": "2026-07-28T09:00:00+00:00",
    "end_at": "2026-07-28T11:00:00+00:00",
    "room_id": "uuid-salle-conference",
    "attendees": ["uuid-dg", "uuid-daf", "uuid-drh"],
    "reminders": [
      {"minutes_before": 60, "channel": "email"},
      {"minutes_before": 15, "channel": "notification"}
    ]
  }'
```

### Enregistrer un courrier entrant

```bash
curl -X POST https://votre-domaine.com/api/v1/courrier/letters \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "entrant",
    "reference_sender": "REF-2026-1234",
    "subject": "Demande de partenariat",
    "sender_name": "Orange Côte d'\''Ivoire SA",
    "sender_email": "partnership@orange.ci",
    "received_at": "2026-07-22",
    "priority": "normal",
    "recipient_id": "uuid-destinataire"
  }'
```

### Recherche dans la GED

```bash
curl "https://votre-domaine.com/api/v1/ged/search?q=contrat+prestation+2026&\
filter[type]=contrat&\
per_page=10" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### Demander un résumé IA (SARA)

```bash
curl -X POST https://votre-domaine.com/api/v1/sara/summarize \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "uuid-document-ged",
    "length": "short",
    "language": "fr"
  }'
```

### Lister les agents RH avec filtre

```bash
curl "https://votre-domaine.com/api/v1/hr/employees?\
filter[department_id]=uuid-direction&\
filter[contract_type]=CDI&\
sort=last_name&\
include=department,position&\
per_page=100" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### Soumettre une demande de congé

```bash
curl -X POST https://votre-domaine.com/api/v1/hr/leaves \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "uuid-agent",
    "type": "conge_annuel",
    "start_date": "2026-08-01",
    "end_date": "2026-08-15",
    "reason": "Congés annuels — été 2026",
    "substitute_id": "uuid-suppleant"
  }'
```

### Générer un rapport PDF

```bash
# Déclencher la génération (asynchrone)
curl -X POST https://votre-domaine.com/api/v1/reports \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "courrier-mensuel",
    "format": "pdf",
    "filters": {
      "year": 2026,
      "month": 7
    }
  }'

# Réponse : {"data": {"job_id": "uuid-job", "status": "processing"}}

# Vérifier le statut et télécharger
curl "https://votre-domaine.com/api/v1/reports/uuid-job" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

*API IBIG SECRETIS v1 — Copyright (c) 2025-2026 IBIG SARL. Tous droits réservés.*
*Documentation complète (Swagger UI) : https://votre-domaine.com/api/docs*
