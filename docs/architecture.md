# IBIG SECRETIS — Architecture Technique

> Version 1.0.0 | IBIG Soft | 2025-2026

---

## Table des matières

1. [Architecture globale](#1-architecture-globale)
2. [Stack technique final](#2-stack-technique-final)
3. [Multi-tenancy](#3-multi-tenancy)
4. [Flux d'authentification](#4-flux-dauthentification)
5. [Flux de paiement](#5-flux-de-paiement)
6. [Architecture WebSocket](#6-architecture-websocket)
7. [Architecture mobile](#7-architecture-mobile)
8. [Architecture On-Premise](#8-architecture-on-premise)
9. [Décisions architecturales (ADR)](#9-décisions-architecturales-adr)

---

## 1. Architecture globale

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        IBIG SECRETIS v1.0 — Vue d'ensemble                     ║
╚══════════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐
  │  Navigateur │   │  Mobile App │   │  API Externe│   │  Intégrations       │
  │ Chrome/FF/  │   │  React Natv │   │  Partenaires│   │  WhatsApp/Slack/    │
  │ Safari/Edge │   │  iOS/Android│   │  (Webhooks) │   │  Teams/Zoom/DGI     │
  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────────┬──────────┘
         │                 │                 │                      │
         │          HTTPS / WSS (TLS 1.3)                          │
         │                 │                 │                      │
  ┌──────▼─────────────────▼─────────────────▼──────────────────────▼──────────┐
  │                        Nginx (Reverse Proxy + SSL Termination)              │
  │                     Rate Limiting · Gzip · Headers de sécurité             │
  └──────────────────────────────────┬─────────────────────────────────────────┘
                                     │
  ┌──────────────────────────────────▼─────────────────────────────────────────┐
  │                    Laravel 11 Application (PHP-FPM 8.2)                    │
  │                                                                            │
  │  ┌──────────────────────────────────────────────────────────────────────┐  │
  │  │                      Couches applicatives                            │  │
  │  │                                                                      │  │
  │  │  HTTP Kernel → Middleware Stack → Router → Controller                │  │
  │  │       │              │                         │                     │  │
  │  │  [TenantMiddleware] [AuthMiddleware]     [Inertia / API]             │  │
  │  │  [SanctumMiddleware][RateLimitMiddleware][Resource/Response]         │  │
  │  └──────────────────────────────────────────────────────────────────────┘  │
  │                                                                            │
  │  ┌────────────────────────────────────────────────────────────────────┐    │
  │  │                      Domaines métier (DDD)                         │    │
  │  │                                                                    │    │
  │  │  Domain/Agenda/     Domain/Courrier/    Domain/Reunions/           │    │
  │  │  Domain/Personnel/  Domain/Notes/       Domain/Patrimoine/         │    │
  │  │  Domain/Missions/   Domain/Biblio/      Domain/Protocole/          │    │
  │  │  Domain/Dashboard/  Domain/Compta/      Domain/Budget/             │    │
  │  │  Domain/Achats/     Domain/ParcAuto/    Domain/Qualite/            │    │
  │  │  Domain/eLearning/  Domain/SSO/         Domain/Marketplace/        │    │
  │  │  Domain/IA/         Domain/RGPD/        Domain/Tenant/             │    │
  │  └────────────────────────────────────────────────────────────────────┘    │
  │                                                                            │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
  │  │ SARA (IA)    │  │ Horizon      │  │ Reverb       │  │ Telescope    │   │
  │  │ Groq LLM     │  │ (Queue Mgr)  │  │ (WebSocket)  │  │ (Debug)      │   │
  │  │ OCR/Extract  │  │ Workers x4   │  │ Broadcasting │  │ Sentry       │   │
  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
  └────────────────────────────────────┬───────────────────────────────────────┘
                                       │
       ┌────────────┬──────────────────┼──────────────────┬────────────────┐
       │            │                  │                  │                │
  ┌────▼────┐  ┌────▼────┐       ┌────▼────┐       ┌────▼────┐     ┌────▼────┐
  │  PgSQL  │  │  Redis  │       │  Meili  │       │   S3/   │     │  SMTP/  │
  │   15    │  │    7    │       │ search  │       │  MinIO  │     │ SES/    │
  │(Primary)│  │ Cache+  │       │  FTS    │       │ Fichiers│     │ Mailgun │
  │(Replica)│  │Sessions │       │         │       │         │     │         │
  └─────────┘  └─────────┘       └─────────┘       └─────────┘     └─────────┘
```

---

## 2. Stack technique final

### Backend

| Technologie | Version | Rôle |
|---|---|---|
| PHP | 8.2+ | Langage d'exécution principal |
| Laravel | 11.x | Framework MVC + DI container |
| Laravel Sanctum | 4.x | Authentification API (Bearer token) |
| Spatie Laravel-Permission | 6.x | RBAC — Rôles et permissions |
| Laravel Horizon | 5.x | Gestion et monitoring des queues |
| Laravel Reverb | 1.x | Serveur WebSocket natif |
| Laravel Scout | 10.x | Abstraction de recherche (Meilisearch) |
| Laravel Telescope | 5.x | Debugging et introspection |
| Spatie Media Library | 11.x | Gestion des fichiers et médias |
| Spatie Laravel-Auditing | 13.x | Journalisation des modifications |
| Laravel Excel | 3.x | Import/Export Excel |
| DomPDF | 2.x | Génération de PDF |

### Frontend Web

| Technologie | Version | Rôle |
|---|---|---|
| React | 18.x | Framework UI déclaratif |
| Inertia.js | 1.3.x | SPA sans API séparée (full-stack) |
| Vite | 5.x | Bundler et HMR |
| TypeScript | 5.x | Typage statique |
| Tailwind CSS | 3.x | Utility-first CSS |
| shadcn/ui | — | Composants UI (Radix primitives) |
| Recharts | 2.x | Graphiques et visualisations |
| TanStack Query | 5.x | Gestion du cache et des requêtes |
| Laravel Echo | 2.x | Client WebSocket |
| Pusher JS | 8.x | SDK compatible Reverb |
| Tiptap | 2.x | Editeur de texte riche |
| i18next | — | Internationalisation |

### Mobile

| Technologie | Version | Rôle |
|---|---|---|
| React Native | 0.74 | Développement mobile cross-platform |
| Expo | SDK 51 | Toolchain et services natifs |
| Expo Router | 3.x | Navigation basée sur fichiers |
| React Query | 5.x | Cache et synchronisation API |
| MMKV | — | Stockage local haute performance |
| NetInfo | — | Détection de connectivité |

### Infrastructure

| Technologie | Version | Rôle |
|---|---|---|
| PostgreSQL | 15+ | Base de données principale |
| Redis | 7.x | Cache, sessions, rate limiting, pubsub |
| Meilisearch | 1.x | Moteur de recherche full-text |
| Nginx | 1.24+ | Reverse proxy, SSL, static assets |
| Supervisor | 4.x | Gestion des processus workers |
| Docker | 25+ | Conteneurisation |
| Docker Compose | 2.x | Orchestration locale et On-Premise |

---

## 3. Multi-tenancy

SECRETIS utilise une architecture multi-tenant par **isolation sur colonne** (`tenant_id`), au sein d'une base de données PostgreSQL partagée.

### Schéma d'isolation

```
┌──────────────────────────────────────────────────────────────────┐
│                    PostgreSQL — Base partagée                    │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Tenant A      │  │  Tenant B      │  │  Tenant C      │    │
│  │  (Ministère)   │  │  (Université)  │  │  (Entreprise)  │    │
│  │                │  │                │  │                │    │
│  │  tenant_id='A' │  │  tenant_id='B' │  │  tenant_id='C' │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                  │
│  Toutes les tables portent tenant_id (FK vers tenants)          │
│  Global Scope Eloquent = filtre automatique sur toutes requêtes │
│  RLS PostgreSQL (Row Level Security) activé en couche de défense│
└──────────────────────────────────────────────────────────────────┘
```

### Middleware de résolution du tenant

```
Requête HTTP entrante
        │
        ▼
┌───────────────────────┐
│  TenantResolver       │       Résolution par :
│  Middleware           │  ──►  1. Sous-domaine (acme.ibig-secretis.com)
│                       │       2. En-tête X-Tenant-ID (API)
│                       │       3. JWT claim (mobile)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  app()->singleton(    │
│    'currentTenant',   │       Injecté dans le DI Container
│    $tenant            │       Accessible partout dans l'app
│  )                    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Eloquent Global      │       WHERE tenant_id = $tenant->id
│  Scope (auto-appliqué)│       Sur tous les modèles métier
└───────────────────────┘
```

---

## 4. Flux d'authentification

```
Utilisateur
    │
    ▼ (1) Saisie email + mot de passe
┌───────────────────────────────────────────────────────────────────┐
│                    LoginController                                 │
│                                                                   │
│  (2) Vérification email + bcrypt(password)                        │
│  (3) Vérification statut compte (actif, email vérifié)            │
│  (4) Vérification statut tenant (actif, plan valide)              │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼ (5) MFA requis ?
┌───────────────────────────────────────────────────────────────────┐
│                    MFAController                                   │
│                                                                   │
│  (5a) TOTP (Google Authenticator / Authy)                         │
│  (5b) OTP par SMS (Orange CI / MTN)                               │
│  (5c) Magic Link par email                                        │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼ (6) SSO configuré ?
┌───────────────────────────────────────────────────────────────────┐
│                    SSOController                                   │
│                                                                   │
│  (6a) SAML 2.0 → Okta / Azure AD / ADFS                          │
│  (6b) OIDC → Google Workspace / Microsoft 365                     │
│  (6c) LDAP → Active Directory interne                             │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼ (7) Authentification réussie
┌───────────────────────────────────────────────────────────────────┐
│                    Token Generation (Sanctum)                      │
│                                                                   │
│  - Création Personal Access Token (Bearer)                        │
│  - Durée de vie configurable (1h session, 30j "Remember me")      │
│  - Enregistrement : IP, User-Agent, Device ID                     │
│  - Audit log : connexion réussie                                  │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼ (8) SARA activée ?
┌───────────────────────────────────────────────────────────────────┐
│                    SARA — Welcome Session                          │
│                                                                   │
│  - Chargement du contexte utilisateur (rôle, préférences, tâches) │
│  - Suggestions du jour personnalisées                             │
│  - Alertes critiques en attente de traitement                     │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼
Tableau de bord personnalisé
```

---

## 5. Flux de paiement

```
Utilisateur sélectionne un plan
    │
    ▼
┌───────────────────────────────────────────┐
│         BillingController                 │
│  - Validation du plan sélectionné         │
│  - Génération d'un Idempotency Key (UUID) │
│  - Redirection vers passerelle de paiement│
└───────────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────────────────────────────────┐
│                 Passerelle de paiement                            │
│                                                                   │
│  Afrique :   Orange Money · MTN MoMo · Wave · Moov Money         │
│  Europe :    Stripe (carte Visa/Mastercard, SEPA, Apple/Google Pay│
│  Entreprise: Virement bancaire (activation manuelle)              │
└───────────────────────────────────────────────────────────────────┘
    │
    ▼ Webhook entrant (HMAC-SHA256 vérifié)
┌───────────────────────────────────────────┐
│       WebhookController                   │
│  (1) Vérification signature HMAC          │
│  (2) Vérification Idempotency Key         │
│      (évite les doublons)                 │
│  (3) Dispatch PaymentConfirmedJob         │
└───────────────────────────────────────────┘
    │
    ▼ Job asynchrone (Queue)
┌───────────────────────────────────────────┐
│       PaymentConfirmedJob                 │
│  (1) Activation/renouvellement abonnement │
│  (2) Attribution des modules du plan      │
│  (3) Envoi facture PDF par email          │
│  (4) Notification SuperAdmin              │
│  (5) Mise à jour Audit Log               │
└───────────────────────────────────────────┘
    │
    ▼
Activation immédiate des nouvelles fonctionnalités
```

---

## 6. Architecture WebSocket

```
┌─────────────┐      ┌────────────────────────────────────┐
│  Laravel    │      │           Laravel Reverb            │
│  Application│─────►│     (WebSocket Server natif)        │
│             │Event │  Port 8080 / wss:// en production   │
└─────────────┘      └────────────────────────────────────┘
                                    │
                    Broadcasting via Channels :
                    - Private (auth requise)
                    - Presence (liste des utilisateurs)
                    - Public (notifications globales)
                                    │
                      ┌─────────────▼─────────────┐
                      │       Laravel Echo          │
                      │    (Client WebSocket JS)    │
                      │     Connecté via Pusher-JS  │
                      └─────────────┬─────────────┘
                                    │
             ┌──────────────────────┼───────────────────────┐
             │                      │                       │
    ┌────────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
    │  Notifications  │   │  Courrier Live  │   │  Tableau bord   │
    │  React Component│   │  React Component│   │  React Component│
    │                 │   │  (nouveau       │   │  (KPI en temps  │
    │  useEcho hook   │   │   courrier)     │   │   réel)         │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

**Canaux broadcast :**

| Canal | Type | Utilisation |
|---|---|---|
| `tenant.{id}.notifications` | Private | Notifications globales du tenant |
| `user.{id}` | Private | Notifications personnelles |
| `courrier.{tenant_id}` | Private | Nouveau courrier entrant |
| `agenda.{tenant_id}` | Private | Rappels d'événements |
| `presence.tenant.{id}` | Presence | Utilisateurs connectés en temps réel |
| `dashboard.{tenant_id}` | Private | Mises à jour des KPIs |

---

## 7. Architecture mobile

```
┌────────────────────────────────────────────────────────────────┐
│                React Native App (Expo SDK 51)                  │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Expo Router  │  │ React Query  │  │ Offline Queue        │ │
│  │ Navigation   │  │ Cache API    │  │ (MMKV + NetInfo)     │ │
│  │ basée fichier│  │ Sync auto    │  │ Sync différée        │ │
│  └──────────────┘  └──────┬───────┘  └───────────┬──────────┘ │
│                           │                      │            │
└───────────────────────────┼──────────────────────┼────────────┘
                            │                      │
                   ┌────────▼──────────────────────▼────────┐
                   │         Connectivité réseau             │
                   │  NetInfo.fetch() → En ligne / Hors ligne│
                   └───────────────────┬─────────────────────┘
                                       │
                   ┌───────────────────▼────────────────────┐
                   │        En ligne : API REST              │
                   │   https://api.votre-domaine.com/v1      │
                   │   Bearer token Sanctum                  │
                   └───────────────────┬────────────────────┘
                                       │
                   ┌───────────────────▼────────────────────┐
                   │     Hors ligne : Offline Queue          │
                   │  - Actions stockées dans MMKV           │
                   │  - Rejouer automatiquement à reconnexion│
                   │  - Conflits : Last-write-wins + alertes │
                   └────────────────────────────────────────┘
```

**Fonctionnalités offline supportées :**
- Consultation de l'agenda (données cachées 24h)
- Saisie de notes de frais (synchronisation à la reconnexion)
- Lecture des derniers courriers reçus
- Validation de documents en attente

---

## 8. Architecture On-Premise

```
┌──────────────────────────────────────────────────────────────────┐
│                  Docker Compose — On-Premise                      │
│                         8 services                               │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   nginx     │  │     app     │  │        worker           │  │
│  │  :80/:443   │  │  php-fpm    │  │   php artisan queue:work│  │
│  │  Proxy SSL  │  │  Laravel 11 │  │   4 workers en parallèle│  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   reverb    │  │  scheduler  │  │        postgres         │  │
│  │  WebSocket  │  │  cron:1min  │  │   PostgreSQL 15         │  │
│  │  Port 8080  │  │  artisan    │  │   Volume persistant     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │    redis    │  │            meilisearch                  │   │
│  │  Redis 7    │  │   Moteur de recherche full-text         │   │
│  │  :6379      │  │   Volume persistant                     │   │
│  └─────────────┘  └─────────────────────────────────────────┘   │
│                                                                  │
│  Volumes Docker persistants :                                    │
│    secretis_postgres_data    secretis_redis_data                 │
│    secretis_storage          secretis_meili_data                 │
│                                                                  │
│  Réseau interne : secretis_network (bridge isolé)               │
└──────────────────────────────────────────────────────────────────┘
```

**Licence On-Premise (JWT RS256 offline) :**

```
IBIG Soft génère une licence JWT signée RS256
    │
    ▼
php artisan secretis:license:activate --key=<JWT>
    │
    ▼
LicenseVerifier::verify($jwt)
    - Décode le JWT sans appel réseau (clé publique embarquée)
    - Vérifie : tenant_id, plan, expiry, max_users, modules autorisés
    - Si valide → Feature flags activés
    - Si expiré → Mode dégradé (lecture seule, alerte admin)
    │
    ▼
Cache licence 24h (Redis)
```

---

## 9. Décisions architecturales (ADR)

### ADR-001 : Choix de PostgreSQL comme base de données

**Date :** Septembre 2025
**Statut :** Acceptée

**Contexte :** Choix entre PostgreSQL, MySQL/MariaDB et MongoDB pour le stockage principal.

**Décision :** PostgreSQL 15 avec Row Level Security (RLS) et support JSON natif (JSONB).

**Justification :**
- RLS natif pour renforcer l'isolation multi-tenant au niveau base de données
- JSONB pour les champs de configuration flexibles sans migrations constantes
- Full Text Search intégré (backup si Meilisearch indisponible)
- Support UUID v4 natif comme clé primaire
- Transactions ACID complètes pour l'intégrité comptable (SYSCOHADA)
- Licence open-source permissive

**Alternatives rejetées :**
- MySQL : RLS non disponible, types JSONB moins matures
- MongoDB : Pas de transactions ACID complètes, inadapté à la comptabilité

---

### ADR-002 : Multi-tenancy par colonne vs schéma PostgreSQL

**Date :** Octobre 2025
**Statut :** Acceptée

**Contexte :** Choisir entre isolation par schéma PostgreSQL (un schéma par tenant) ou par colonne `tenant_id`.

**Décision :** Isolation par colonne `tenant_id` sur une base de données partagée, renforcée par RLS.

**Justification :**
- Migrations centralisées : une seule migration pour tous les tenants
- Performance : pas de multiplication des connexions de pool par tenant
- Simplicité opérationnelle : une seule base à sauvegarder et monitorer
- Scalabilité : pas de limite sur le nombre de tenants

**Risque mitigé :** Fuite de données inter-tenant → triple défense : Global Scope Eloquent + RLS PostgreSQL + tests automatisés de cross-tenant

**Alternatives rejetées :**
- Schéma par tenant : migrations O(n_tenants), complexité opérationnelle élevée
- Base de données par tenant : coût infrastructure prohibitif au-delà de 50 tenants

---

### ADR-003 : Inertia.js vs API séparée

**Date :** Septembre 2025
**Statut :** Acceptée

**Contexte :** Architecture SPA avec API REST dédiée (Laravel + React séparés) ou monolithique avec Inertia.js.

**Décision :** Inertia.js pour le frontend web, avec API REST distincte pour mobile et intégrations tierces.

**Justification :**
- Développement plus rapide : pas de doublon API pour le web
- Type safety : props Inertia typées avec TypeScript inférés du backend
- Authentification simplifiée : sessions Laravel standard (pas de JWT pour le web)
- Meilleures performances perçues : Server-Side Rendering possible
- L'API REST reste disponible pour mobile et partenaires

**Alternatives rejetées :**
- Next.js séparé : complexité d'infra, deux équipes, CORS à gérer
- Vue.js : écosystème moins mature pour le marché cible

---

### ADR-004 : Laravel Reverb vs Pusher

**Date :** Novembre 2025
**Statut :** Acceptée

**Contexte :** Serveur WebSocket pour les notifications en temps réel.

**Décision :** Laravel Reverb (auto-hébergé) comme serveur WebSocket principal.

**Justification :**
- Coût zéro vs Pusher (100$/mois pour 500 connexions simultanées)
- Pas de dépendance externe — critique pour les clients On-Premise en Afrique (latence internet)
- API compatible Pusher : zéro changement côté client (Laravel Echo)
- Maintenu officiellement par l'équipe Laravel
- Performance : 10 000 connexions simultanées sur une instance standard

**Alternatives rejetées :**
- Pusher : coût SaaS récurrent, latence depuis l'Afrique vers les serveurs EU/US
- Soketi : moins maintenu, même avantages que Reverb

---

### ADR-005 : Groq comme provider IA par défaut

**Date :** Décembre 2025
**Statut :** Acceptée

**Contexte :** Choix du provider LLM pour SARA (assistant IA de SECRETIS).

**Décision :** Groq API avec le modèle Llama 3.1 70B comme provider IA par défaut.

**Justification :**
- Vitesse d'inférence exceptionnelle (300-500 tokens/seconde) grâce aux LPUs Groq
- Coût : ~10x moins cher que GPT-4 pour une qualité comparable sur les tâches documentaires
- Llama 3.1 : modèle open-weight, possibilité de déploiement local (On-Premise strict)
- Support multilingue Français/Anglais/Arabe de qualité
- Architecture fallback : OpenAI GPT-4o si Groq indisponible

**Alternatives rejetées :**
- OpenAI GPT-4o : excellent mais coût prohibitif pour une utilisation intensive (OCR, résumés)
- Anthropic Claude : pas de support On-Premise local, coût élevé
- Modèle fine-tuné en interne : ressources R&D insuffisantes en v1.0

---

### ADR-006 : JWT RS256 pour les licences On-Premise

**Date :** Janvier 2026
**Statut :** Acceptée

**Contexte :** Mécanisme de vérification des licences pour les clients On-Premise sans connexion internet permanente.

**Décision :** Licences signées JWT RS256 avec clé publique embarquée dans l'application.

**Justification :**
- Fonctionnement 100% offline : vérification sans aucun appel réseau vers IBIG Soft
- Sécurité asymétrique : la clé privée ne quitte jamais les serveurs IBIG Soft
- Contenu riche : tenant_id, plan, modules autorisés, max_users, date d'expiration
- Rotation de clés possible sans redéploiement (liste de clés publiques de confiance)

**Alternatives rejetées :**
- Ping serveur IBIG Soft : clients On-Premise en zones à faible connectivité
- Licence basée sur fichier XML signé : moins standard, bibliothèques moins matures

---

### ADR-007 : SYSCOHADA vs comptabilité générique

**Date :** Février 2026
**Statut :** Acceptée

**Contexte :** Implémenter un module comptable générique (internationalisable) ou spécifique SYSCOHADA.

**Décision :** Implémentation native SYSCOHADA 2017 comme standard, avec extension possible vers d'autres plans comptables.

**Justification :**
- 17 pays OHADA représentent 100% de la clientèle cible en phase 1
- SYSCOHADA impose des états financiers normalisés non compatibles avec un plan générique
- Spécificités africaines : traitement des stocks, actifs biologiques, classes 1-8 OHADA
- Avantage concurrentiel majeur vs solutions européennes mal adaptées

**Alternatives rejetées :**
- Plan comptable générique PCG français : non conforme OHADA, confusion réglementaire
- Adaptation d'un ERP existant : coût et délai supérieurs au développement natif

---

### ADR-008 : Feature flags pour le déploiement progressif

**Date :** Mars 2026
**Statut :** Acceptée

**Contexte :** Mécanisme de déploiement des nouvelles fonctionnalités sans risque.

**Décision :** Feature flags basés sur le plan d'abonnement (Starter/Pro/Enterprise) avec activation par tenant possible.

**Justification :**
- Déploiement sans downtime : nouvelles features en production, invisibles jusqu'à activation
- Tests A/B possibles sur sous-ensemble de tenants
- Gestion des bêta-testeurs : activation feature par feature par tenant
- Rollback immédiat : désactivation du flag sans déploiement
- Couplé au système de licences On-Premise (JWT claims = feature flags)

**Implémentation :**
```php
// Vérification d'une feature
if (Feature::active('module-scorm', $tenant)) {
    // Afficher le module e-Learning
}

// Activation pour un tenant
Feature::activateForScope('module-scorm', $tenant);
```

---

*Architecture IBIG SECRETIS v1.0.0 — Copyright (c) 2025-2026 IBIG SARL*
