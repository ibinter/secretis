# SECRETIS ERP — Guide d'installation et premiers pas

> Version 2.0.0 | Dernière mise à jour : janvier 2026 | Support : support@secretis.ci

---

## Sommaire

1. [Prérequis système](#1-prérequis-système)
2. [Installation via Docker](#2-installation-via-docker)
3. [Installation manuelle](#3-installation-manuelle)
4. [Configuration de l'environnement](#4-configuration-de-lenvironnement)
5. [Base de données & migrations](#5-base-de-données--migrations)
6. [Assets frontend](#6-assets-frontend)
7. [Authentification & sécurité](#7-authentification--sécurité)
8. [Première connexion](#8-première-connexion)
9. [Créer votre organisation](#9-créer-votre-organisation)
10. [Inviter votre équipe](#10-inviter-votre-équipe)
11. [Modules clés — démarrage rapide](#11-modules-clés--démarrage-rapide)
12. [SARA — votre assistante IA](#12-sara--votre-assistante-ia)
13. [Gestion des rôles et permissions](#13-gestion-des-rôles-et-permissions)
14. [Notifications et alertes](#14-notifications-et-alertes)
15. [Sauvegarde et restauration](#15-sauvegarde-et-restauration)
16. [Multi-langue](#16-multi-langue)
17. [Mode hors-ligne (PWA)](#17-mode-hors-ligne-pwa)
18. [Support et assistance](#18-support-et-assistance)
19. [Mise à jour](#19-mise-à-jour)
20. [FAQ rapide](#20-faq-rapide)

---

## 1. Prérequis système

| Composant | Version minimale | Recommandé |
|-----------|-----------------|------------|
| PHP | 8.2 | 8.3 |
| Node.js | 20 LTS | 22 LTS |
| PostgreSQL | 15 | 16 |
| Redis | 7.0 | 7.2 |
| Nginx | 1.24 | 1.26 |
| Docker | 24 | 27 (optionnel) |
| RAM | 2 Go | 4 Go+ |
| Stockage | 20 Go | 50 Go+ (selon volume GED) |

---

## 2. Installation via Docker

**Méthode recommandée pour la production.**

```bash
# 1. Cloner le dépôt
git clone https://github.com/ibig/secretis-erp.git && cd secretis-erp

# 2. Copier les fichiers d'environnement
cp deploy/.env.example .env
cp backend/.env.example backend/.env

# 3. Éditer les variables critiques
nano .env   # DB_PASSWORD, APP_KEY, MAIL_*, etc.

# 4. Lancer les conteneurs
cd deploy && docker compose -f docker-compose.prod.yml up -d

# 5. Initialiser la base de données
docker compose exec app php artisan migrate --seed

# 6. Créer le premier admin
docker compose exec app php artisan secretis:create-admin
```

L'application est disponible sur `https://votre-domaine.com`.

---

## 3. Installation manuelle

```bash
# Backend
cd backend
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan storage:link
php artisan config:cache && php artisan route:cache

# Frontend
cd ../frontend
npm ci
npm run build
```

Configurer Nginx pour pointer `/public` du backend comme racine web.

---

## 4. Configuration de l'environnement

Variables obligatoires dans `backend/.env` :

```env
APP_NAME="SECRETIS ERP"
APP_URL=https://votre-domaine.com
APP_KEY=                        # généré par artisan key:generate

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=secretis_prod
DB_USERNAME=secretis
DB_PASSWORD=motdepasse_fort

REDIS_URL=redis://localhost:6379

MAIL_MAILER=smtp
MAIL_HOST=smtp.votre-fournisseur.com
MAIL_PORT=587
MAIL_USERNAME=no-reply@votre-domaine.com
MAIL_PASSWORD=

# IA — SARA
OPENAI_API_KEY=sk-...

# Stockage fichiers (S3 recommandé pour la production)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-3
AWS_BUCKET=secretis-documents-prod

# Paiements
STRIPE_KEY=
STRIPE_SECRET=

# Notifications push
FIREBASE_CREDENTIALS=/etc/secrets/firebase.json
```

---

## 5. Base de données & migrations

```bash
# Créer la base
createdb secretis_prod -U postgres

# Migrations + seeders de base
php artisan migrate --seed

# Seeders spécifiques
php artisan db:seed --class=OnboardingSeeder      # 12 étapes gamifiées
php artisan db:seed --class=HelpCenterSeeder      # articles guide
php artisan db:seed --class=RolesPermissionsSeeder # rôles RBAC
```

Les migrations sont idempotentes — sûres à relancer.

---

## 6. Assets frontend

```bash
cd frontend

# Développement (hot reload)
npm run dev

# Production
npm run build    # génère dans frontend/public/build/

# Vérifier le build
ls -lh public/build/assets/
```

Lier le build au backend :

```bash
cd backend
ln -sf ../frontend/public/build public/build
```

---

## 7. Authentification & sécurité

SECRETIS utilise **Laravel Sanctum** pour les sessions et tokens API.

- Sessions : cookie `secretis_session` (SameSite=Lax, Secure en prod)
- CSRF : token `X-XSRF-TOKEN` obligatoire pour les mutations
- 2FA : TOTP (Google Authenticator) activable par chaque utilisateur
- Rate limiting : 60 req/min authentifié, 10 req/min non-authentifié

Pour activer la 2FA obligatoire pour tous les admins :

```php
// config/secretis.php
'force_2fa_for_admins' => true,
```

---

## 8. Première connexion

1. Naviguer vers `https://votre-domaine.com`
2. Cliquer sur **Se connecter** (ou **Démarrer l'essai gratuit**)
3. Entrer l'email et le mot de passe de l'admin créé à l'étape 2
4. L'assistant d'onboarding se lance automatiquement

**Identifiants par défaut (seed de développement uniquement) :**

```
Email    : admin@secretis.local
Password : SecretisAdmin2025!
```

⚠️ Changer ce mot de passe immédiatement en production.

---

## 9. Créer votre organisation

L'assistant d'onboarding vous guide à travers :

1. **Nom commercial** de l'organisation
2. **Secteur d'activité** (15 secteurs africains disponibles)
3. **Pays** (17 pays zone OHADA + autres)
4. **Taille** de l'équipe
5. **Logo** (formats : PNG, JPG, SVG — max 2 Mo)
6. **Devise** et **fuseau horaire**

Ces paramètres sont modifiables ultérieurement dans **Paramètres → Organisation**.

---

## 10. Inviter votre équipe

**Via l'interface :**

Paramètres → Utilisateurs → Inviter des membres → entrer les emails + rôles.

**Via l'API :**

```bash
curl -X POST https://votre-domaine.com/api/v1/invitations \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"invitations": [{"email": "equipe@org.ci", "role": "manager"}]}'
```

Les rôles disponibles : `admin`, `manager`, `member`, `viewer`.

---

## 11. Modules clés — démarrage rapide

| Module | Accès rapide | Premiers pas |
|--------|-------------|--------------|
| Agenda | `/agenda` | Créer un événement → sélectionner participants → envoyer invitations |
| GED | `/ged` | Créer un dossier → importer des fichiers → définir les droits d'accès |
| Tâches | `/taches` | Créer une tâche → assigner → définir une date d'échéance |
| Réunions | `/reunions` | Planifier → inviter → partager le lien visio |
| Visiteurs | `/reception` | Enregistrer → imprimer badge → notifier l'hôte |
| Budget | `/budget` | Créer un centre de coûts → saisir des dépenses → exporter OHADA |
| RH | `/rh` | Créer des fiches employés → gérer les congés → générer la paie |
| Courrier | `/courrier` | Créer un courrier → suivre → archiver |

---

## 12. SARA — votre assistante IA

SARA est accessible depuis le bouton flottant en bas à droite de chaque page.

**Commandes utiles :**

```
Crée une réunion avec Jean lundi à 10h
Trouve les documents du projet Azurée
Résume les tâches en retard cette semaine
Génère un rapport des dépenses du mois
@sara explique le module de paie
```

SARA conserve le contexte de la conversation pendant 30 minutes.

---

## 13. Gestion des rôles et permissions

SECRETIS utilise un RBAC (Role-Based Access Control) granulaire :

| Rôle | Accès |
|------|-------|
| `super-admin` | Toute la plateforme (SuperAdmin Console) |
| `admin` | Toute l'organisation + paramètres |
| `manager` | Modules assignés + rapports |
| `member` | Accès lecture/écriture aux modules |
| `viewer` | Lecture seule |

Créer un rôle personnalisé :

```
Paramètres → Rôles → Nouveau rôle → sélectionner les permissions
```

---

## 14. Notifications et alertes

SECRETIS envoie des notifications via :

- **Email** : invitations, rappels, alertes SLA
- **In-app** : badge dans la barre de navigation
- **Push (PWA/mobile)** : après accord de l'utilisateur
- **Webhook** : configurable dans Paramètres → Intégrations

Pour désactiver les emails de rappel :

```
Profil → Préférences → Notifications → Décocher les types souhaités
```

---

## 15. Sauvegarde et restauration

**Sauvegarde automatique (recommandé) :**

```bash
# Via l'interface : SuperAdmin → Backups → Planifier
# Via cron (production) :
0 2 * * * docker compose exec app php artisan secretis:backup
```

**Restauration :**

```bash
php artisan secretis:restore --file=backup_2026-01-15_020000.zip
```

Les backups incluent : base de données PostgreSQL, fichiers GED, configuration.

---

## 16. Multi-langue

Langues disponibles : **Français** (défaut), Anglais, Arabe (RTL), Portugais.

Changer la langue :

```
Profil → Langue → sélectionner → Enregistrer
```

Pour ajouter une langue (développeurs) :

```bash
cp backend/lang/fr.json backend/lang/sw.json
# Traduire les valeurs, puis :
php artisan lang:publish
```

---

## 17. Mode hors-ligne (PWA)

SECRETIS est installable comme application sur bureau et mobile.

1. Ouvrir SECRETIS dans Chrome/Edge/Safari
2. Cliquer **Installer l'application** dans la barre d'adresse
3. Les 5 modules les plus utilisés fonctionnent hors-ligne

Les données sont synchronisées automatiquement au retour en ligne.

---

## 18. Support et assistance

| Canal | Disponibilité | SLA |
|-------|--------------|-----|
| Chat in-app (SARA) | 24/7 | Immédiat |
| Ticket support | Lu-Ve 8h-18h WAT | < 8h |
| Email | support@secretis.ci | < 24h |
| Téléphone (Enterprise) | Lu-Ve 8h-17h WAT | Immédiat |
| Documentation | [docs.secretis.ci](https://docs.secretis.ci) | — |

Pour ouvrir un ticket : **Menu ? → Support → Nouveau ticket**.

---

## 19. Mise à jour

```bash
# 1. Sauvegarder avant la mise à jour
php artisan secretis:backup

# 2. Récupérer la nouvelle version
git pull origin main

# 3. Mettre à jour les dépendances
cd backend && composer install --no-dev
cd ../frontend && npm ci && npm run build

# 4. Appliquer les migrations
php artisan migrate --force

# 5. Vider les caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Redémarrer les workers
php artisan queue:restart
```

Avec Docker : `docker compose pull && docker compose up -d --force-recreate`.

---

## 20. FAQ rapide

**Q : J'ai oublié mon mot de passe.**
R : Cliquer "Mot de passe oublié" sur la page de connexion. Un email est envoyé sous 2 minutes.

**Q : Puis-je importer mes données depuis un autre ERP ?**
R : Oui. Paramètres → Importation → choisir le format (CSV, Excel, JSON). Un assistant guide l'import.

**Q : La GED accepte quels formats de fichiers ?**
R : PDF, Word, Excel, PowerPoint, images (PNG/JPG/TIFF), vidéos (MP4). Taille max : 50 Mo par fichier.

**Q : Comment exporter mes données OHADA ?**
R : Budget → Exports → SYSCOHADA → choisir la période → Télécharger.

**Q : SECRETIS est-il conforme au RGPD/loi ivoirienne sur les données ?**
R : Oui. Toutes les données restent sur des serveurs en Afrique/Europe. DPA disponible sur demande.

**Q : Puis-je utiliser SECRETIS sans connexion internet ?**
R : En mode PWA, les 5 modules principaux fonctionnent hors-ligne. La synchronisation se fait au retour en ligne.

---

*Documentation complète disponible sur [docs.secretis.ci](https://docs.secretis.ci)*
*© 2025-2026 IBIG — SECRETIS ERP. Tous droits réservés.*
