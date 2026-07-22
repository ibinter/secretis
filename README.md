```
██╗██████╗ ██╗ ██████╗     ███████╗███████╗ ██████╗██████╗ ███████╗████████╗██╗███████╗
██║██╔══██╗██║██╔════╝     ██╔════╝██╔════╝██╔════╝██╔══██╗██╔════╝╚══██╔══╝██║██╔════╝
██║██████╔╝██║██║  ███╗    ███████╗█████╗  ██║     ██████╔╝█████╗     ██║   ██║███████╗
██║██╔══██╗██║██║   ██║    ╚════██║██╔══╝  ██║     ██╔══██╗██╔══╝     ██║   ██║╚════██║
██║██████╔╝██║╚██████╔╝    ███████║███████╗╚██████╗██║  ██║███████╗   ██║   ██║███████║
╚═╝╚═════╝ ╚═╝ ╚═════╝     ╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝╚══════╝
```

<div align="center">

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://ci.ibigsoft.com/secretis)
[![Tests](https://img.shields.io/badge/tests-1247%20passed-brightgreen?style=flat-square)](https://ci.ibigsoft.com/secretis/tests)
[![Coverage](https://img.shields.io/badge/coverage-89%25-green?style=flat-square)](https://ci.ibigsoft.com/secretis/coverage)
[![License](https://img.shields.io/badge/license-Proprietary-red?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)](docs/release-notes-v1.0.md)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B-purple?style=flat-square)](https://php.net)
[![Node](https://img.shields.io/badge/Node-20%2B-green?style=flat-square)](https://nodejs.org)

**ERP SaaS de secrétariat et de bureautique pour l'Afrique et le monde**

[Demo Live](https://demo.ibig-secretis.com) · [Documentation](https://docs.ibig-secretis.com) · [API](https://api.ibig-secretis.com/docs) · [Statut](https://status.ibig-secretis.com) · [Support](mailto:support@ibigsoft.com)

</div>

---

## Table des matières

- [Description](#description)
- [Stack technique](#stack-technique)
- [Modules inclus](#modules-inclus)
- [Architecture](#architecture)
- [Installation rapide](#installation-rapide)
- [Installation détaillée](#installation-détaillée)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes artisan](#commandes-artisan-secretis)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [API](#api)
- [Contributions](#contributions)
- [Licence](#licence)

---

## Description

**IBIG SECRETIS** est un progiciel de gestion intégré (ERP) SaaS conçu spécifiquement pour les besoins de secrétariat, de bureautique et d'administration des organisations africaines et mondiales.

Développé par **IBIG Soft**, SECRETIS couvre l'ensemble du cycle de vie documentaire et administratif d'une organisation : courrier, agenda, réunions, ressources humaines, patrimoine, finances, qualité et formation — le tout dans une interface moderne, multilingue et accessible depuis n'importe quel appareil.

**Pourquoi SECRETIS ?**

- Conçu pour les réalités africaines : OHADA, SYSCOHADA, connexions intermittentes, multi-devises CFA/USD/EUR
- Multilingue dès le départ : Français, Anglais, Arabe (RTL), Portugais, Espagnol
- Disponible en SaaS (cloud mutualisé), SaaS dédié, ou On-Premise (auto-hébergé)
- Conforme RGPD, ISO 27001:2022 et réglementations locales
- Architecture multi-tenant robuste avec isolation des données garantie

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Backend | PHP / Laravel | 8.2+ / 11.x |
| Frontend Web | React + Inertia.js | 18.x / 1.3.x |
| Base de données | PostgreSQL | 15+ |
| Cache | Redis | 7.x |
| WebSocket | Laravel Reverb | 1.x |
| File d'attente | Laravel Horizon | 5.x |
| Recherche | Meilisearch | 1.x |
| Stockage | S3 / MinIO | Compatible |
| Mobile | React Native / Expo | SDK 51 |
| Intelligence Artificielle | Groq (Llama 3.1) | API |
| Tests Backend | Pest PHP | 3.x |
| Tests E2E | Playwright | 1.x |
| Tests de charge | k6 | Grafana |
| Conteneurs | Docker / Compose | 25+ |
| CI/CD | GitHub Actions | — |
| Monitoring | Sentry + Telescope | — |

---

## Modules inclus

### Modules CDC (10 modules coeur)

| # | Module | Description | Plan minimum |
|---|---|---|---|
| 1 | **Agenda & Calendrier** | RDV, réunions, sync Google/Outlook, rappels | Starter |
| 2 | **Courrier / GED** | Courrier entrant/sortant, GED, workflows de validation | Starter |
| 3 | **Réunions & PV** | Planification, ordre du jour, PV automatiques, suivi décisions | Starter |
| 4 | **Personnel (RH)** | Dossiers agents, contrats, congés, évaluations, organigramme | Pro |
| 5 | **Notes de service** | Rédaction, circuit de validation, diffusion, accusé de réception | Starter |
| 6 | **Patrimoine & Inventaire** | Biens mobiliers/immobiliers, affectations, amortissements | Pro |
| 7 | **Missions & Déplacements** | Ordres de mission, états de frais, rapports, suivi budgétaire | Pro |
| 8 | **Bibliothèque / Médiathèque** | Fonds documentaire, prêts, réservations, suggestions | Pro |
| 9 | **Protocole & Événementiel** | Cérémonies, listes officielles, gestion VIP, accréditations | Enterprise |
| 10 | **Tableaux de bord BI** | KPIs, rapports dynamiques, exports PDF/Excel, alertes | Pro |

### Modules avancés (Enterprise)

| Module | Description |
|---|---|
| Comptabilité SYSCOHADA | Plan comptable OHADA 2017, journaux, bilan, compte de résultat |
| Gestion Budgétaire | Budgets, écarts, VA/EBE/REX, contrôle de gestion |
| Portail Fournisseurs & Achats | Appels d'offres, commandes, réception, facturation fournisseurs |
| Parc Auto GPS | Flotte, entretiens, carburant, géolocalisation Traccar/Wialon |
| Module Qualité ISO 9001 | Processus, indicateurs, non-conformités, audits, PDCA |
| e-Learning SCORM | Formations en ligne, SCORM 1.2/2004/xAPI, quiz, certifications |
| SSO SAML/LDAP/OIDC | Authentification unifiée, Active Directory, Azure AD |
| Marketplace (17 connecteurs) | WhatsApp, Slack, Teams, Zoom, DGI, CNPS, Mobile Money... |
| Intelligence Documentaire IA | OCR, classification IA, extraction de données, résumés automatiques |
| RGPD / Conformité | Registre traitements, droits RGPD, DPO, audits conformité |
| On-Premise Docker | Déploiement auto-hébergé, licences offline, mises à jour gérées |

---

## Architecture

```
                          ┌─────────────────────────────────────┐
                          │           IBIG SECRETIS v1.0        │
                          └─────────────────────────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
    ┌─────────▼────────┐      ┌───────────▼──────────┐    ┌───────────▼──────────┐
    │   Web (Inertia)  │      │   API REST (Sanctum)  │    │  Mobile (Expo SDK51) │
    │  React 18 + Vite │      │  Laravel 11 / PHP 8.2 │    │   React Native       │
    └─────────┬────────┘      └───────────┬──────────┘    └───────────┬──────────┘
              │                            │                            │
              └────────────────────────────┼────────────────────────────┘
                                           │
                          ┌────────────────▼────────────────┐
                          │      Laravel Application Core    │
                          │  ┌──────────┐  ┌─────────────┐  │
                          │  │ Modules  │  │  SARA (IA)  │  │
                          │  │ Métier   │  │  Groq LLM   │  │
                          │  │ (DDD)    │  │             │  │
                          │  └──────────┘  └─────────────┘  │
                          │  ┌──────────┐  ┌─────────────┐  │
                          │  │ Horizon  │  │   Reverb    │  │
                          │  │ (Queue)  │  │  (WebSocket)│  │
                          │  └──────────┘  └─────────────┘  │
                          └────────────────┬────────────────┘
                                           │
              ┌────────────────────────────┼──────────────────────────┐
              │                            │                          │
    ┌─────────▼────────┐      ┌───────────▼──────────┐   ┌──────────▼──────────┐
    │   PostgreSQL 15  │      │      Redis 7           │   │    Meilisearch 1.x  │
    │  (Multi-tenant)  │      │  (Cache / Sessions /  │   │    (Recherche FTS)  │
    │                  │      │   Rate Limiting)       │   │                     │
    └──────────────────┘      └──────────────────────┘   └─────────────────────┘
```

**Multi-tenancy** : isolation par colonne `tenant_id` sur toutes les tables, avec middleware automatique garantissant qu'aucun tenant ne peut accéder aux données d'un autre.

---

## Installation rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/ibigsoft/secretis-erp.git && cd secretis-erp

# 2. Installer les dépendances
composer install && npm install

# 3. Configurer l'environnement
cp .env.example .env && php artisan key:generate

# 4. Initialiser la base de données
php artisan migrate --seed

# 5. Lancer le serveur de développement
php artisan serve & npm run dev
```

Accédez à `http://localhost:8000` — compte demo : `admin@demo.com` / `secretis2026`

---

## Installation détaillée

### SaaS Cloud (Ubuntu 22.04 LTS)

Consultez le [Guide d'installation complet](docs/installation-guide.md).

```bash
# Prérequis système
sudo apt update && sudo apt install -y \
  php8.2 php8.2-{fpm,cli,mbstring,xml,bcmath,curl,zip,pgsql,redis,gd,intl,pcntl,soap} \
  postgresql-15 redis-server nginx supervisor nodejs npm

# Installation application
cd /var/www && git clone https://github.com/ibigsoft/secretis-erp.git secretis
cd secretis && composer install --no-dev --optimize-autoloader
npm ci && npm run build

# Configuration
cp .env.example .env
php artisan key:generate
php artisan secretis:install --tenant=votre-organisation --plan=enterprise

# Migrations et seeds
php artisan migrate --force
php artisan db:seed --class=ProductionSeeder

# Optimisations
php artisan optimize
php artisan secretis:cache:warm
```

### On-Premise Docker

```bash
# Télécharger le package On-Premise
curl -O https://releases.ibig-secretis.com/v1.0.0/secretis-onpremise.tar.gz
tar -xzf secretis-onpremise.tar.gz && cd secretis-onpremise

# Configuration
cp .env.onpremise .env && nano .env

# Démarrage
docker compose up -d

# Activation de la licence
docker exec secretis-app php artisan secretis:license:activate --key=VOTRE-CLE-LICENCE
```

---

## Variables d'environnement

```env
# Application
APP_NAME="IBIG SECRETIS"
APP_ENV=production
APP_KEY=                          # Généré automatiquement
APP_URL=https://votre-domaine.com
APP_TIMEZONE=Africa/Abidjan

# Base de données
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=secretis_production
DB_USERNAME=secretis
DB_PASSWORD=                      # Mot de passe fort requis

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Stockage fichiers
FILESYSTEM_DISK=s3
AWS_BUCKET=secretis-files
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-3

# E-mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.votre-fournisseur.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=noreply@votre-domaine.com

# Intelligence artificielle (SARA)
GROQ_API_KEY=                     # Clé Groq (LLM)
GROQ_MODEL=llama-3.1-70b-versatile

# WebSocket
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=localhost
REVERB_PORT=8080

# Multi-tenancy
SECRETIS_SAAS_DOMAIN=ibig-secretis.com
SECRETIS_DEFAULT_PLAN=starter

# Sécurité
SESSION_LIFETIME=120
SANCTUM_STATEFUL_DOMAINS=votre-domaine.com
MFA_ENABLED=true

# Monitoring
SENTRY_LARAVEL_DSN=
LOG_CHANNEL=stack
LOG_LEVEL=warning
```

---

## Commandes artisan SECRETIS

```bash
# Installation et configuration
php artisan secretis:install           # Assistant d'installation interactif
php artisan secretis:tenant:create     # Créer un nouveau tenant (organisation)
php artisan secretis:tenant:list       # Lister tous les tenants actifs
php artisan secretis:license:activate  # Activer une licence (On-Premise)
php artisan secretis:license:status    # Vérifier le statut de la licence

# Maintenance
php artisan secretis:cache:warm        # Préchauffer tous les caches
php artisan secretis:health:check      # Vérifier la santé du système
php artisan secretis:backup:run        # Déclencher une sauvegarde manuelle
php artisan secretis:cleanup:temp      # Nettoyer les fichiers temporaires

# Données
php artisan secretis:import:organigramme   # Importer un organigramme CSV/Excel
php artisan secretis:export:annual-report  # Générer le rapport annuel

# SARA (Intelligence Artificielle)
php artisan secretis:sara:train        # Réentraîner les modèles IA sur données tenant
php artisan secretis:sara:status       # Statut du service SARA

# Développement
php artisan secretis:make:module       # Scaffolding d'un nouveau module métier
php artisan secretis:seed:demo         # Injecter les données de démonstration
```

---

## Tests

```bash
# Tests unitaires et d'intégration (Pest)
php artisan test
php artisan test --coverage --min=80

# Tests par module
php artisan test --filter=AgendaTest
php artisan test --filter=CourrierTest
php artisan test --filter=ComptabiliteTest

# Tests End-to-End (Playwright)
npx playwright test
npx playwright test --project=chromium
npx playwright test tests/e2e/auth.spec.ts

# Tests de charge (k6)
k6 run load-tests/api-load.js
k6 run load-tests/dashboard-load.js --vus=100 --duration=5m

# Suite complète
composer test:all
```

**Objectifs de couverture :**

| Type | Objectif | Actuel |
|---|---|---|
| Tests unitaires | > 80% | 89% |
| Tests d'intégration | > 75% | 83% |
| Tests E2E | Parcours critiques | 47 scénarios |
| Tests de sécurité | OWASP Top 10 | 9/10 |

---

## Déploiement

### SaaS Cloud (recommandé)

```bash
# Via GitHub Actions (automatique sur push main)
git push origin main

# Déploiement manuel
php artisan down --secret="maintenance-token"
git pull origin main
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize
php artisan up
```

### On-Premise Docker

```bash
# Mise à jour
docker compose pull
docker compose up -d --no-deps --build app
docker exec secretis-app php artisan migrate --force
docker exec secretis-app php artisan optimize

# Rollback
docker compose stop app
docker image tag secretis-app:previous secretis-app:current
docker compose up -d app
```

---

## API

SECRETIS expose une API REST complète documentée avec OpenAPI 3.1.

- **URL de base** : `https://votre-domaine.com/api/v1`
- **Authentification** : Bearer Token (Laravel Sanctum)
- **Format** : JSON
- **Rate limiting** : 1000 req/h (standard), 100 req/h (IA)
- **Documentation interactive** : `/api/docs` (Swagger UI)

```bash
# Exemple d'authentification
curl -X POST https://votre-domaine.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemple.com","password":"votre-mot-de-passe"}'

# Exemple d'appel authentifié
curl https://votre-domaine.com/api/v1/agenda/events \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

Voir la [Référence API complète](docs/api-reference.md).

---

## Contributions

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour :

- Le guide de style de code (PSR-12 + ESLint)
- La convention de commits (Conventional Commits)
- Le processus de Pull Request
- Comment contribuer aux traductions

**Contact contribution** : contribution@ibigsoft.com

---

## Licence

Copyright (c) 2025-2026 **IBIG SARL**. Tous droits réservés.

IBIG SECRETIS est un logiciel propriétaire. Son utilisation est soumise à l'acquisition d'une licence commerciale auprès d'IBIG Soft.

Voir [LICENSE](LICENSE) pour les détails complets.

**Contact** : legal@ibigsoft.com | [www.ibigsoft.com](https://www.ibigsoft.com)

---

<div align="center">

Développé avec passion par **IBIG Soft** pour l'Afrique et le monde.

*Simplifier l'administration pour libérer le potentiel humain.*

</div>
