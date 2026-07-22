# Guide d'installation — IBIG SECRETIS ERP

Version : 1.0 | Environnement : Ubuntu 22.04 / Debian 12 (production recommandé)

---

## Table des matières

1. [Prérequis système](#1-prérequis-système)
2. [Installation étape par étape](#2-installation-étape-par-étape)
3. [Configuration .env](#3-configuration-env)
4. [Premier lancement](#4-premier-lancement)
5. [Checklist de validation](#5-checklist-de-validation)

---

## 1. Prérequis système

### Serveur

| Composant   | Version minimale | Recommandée | Notes                           |
|-------------|-----------------|-------------|----------------------------------|
| PHP         | 8.2             | 8.3         | Extensions requises ci-dessous  |
| Node.js     | 20 LTS          | 20 LTS      | Pour le build frontend           |
| PostgreSQL  | 15              | 15 ou 16    | Extensions uuid-ossp, pgcrypto  |
| Redis       | 7               | 7.2         | Queues, sessions, cache          |
| Nginx       | 1.24            | 1.25        | Reverse proxy + SSL              |
| Composer    | 2.6             | 2.7         | Gestionnaire de dépendances PHP  |
| Git         | 2.40            | 2.43        | Déploiement                      |

### Extensions PHP requises

```bash
# Vérifier les extensions installées
php -m | grep -E 'pgsql|redis|bcmath|gd|intl|mbstring|zip|exif|pcntl'
```

Extensions nécessaires :
- `pgsql` et `pdo_pgsql` — connexion PostgreSQL
- `redis` — cache et queues (extension phpredis)
- `bcmath` — calculs financiers (prix, licences)
- `gd` — génération de PDF avec images
- `intl` — internationalisation (formats monétaires, dates)
- `mbstring` — gestion des caractères UTF-8
- `zip` — export/import de documents
- `exif` — traitement des images uploadées
- `pcntl` — workers de queue (mode fork)

```bash
# Installation sur Ubuntu 22.04
sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-pgsql php8.2-redis \
    php8.2-bcmath php8.2-gd php8.2-intl php8.2-mbstring \
    php8.2-zip php8.2-xml php8.2-curl php8.2-exif
```

### Ressources serveur minimales

- CPU : 2 vCPU
- RAM : 4 Go (8 Go recommandé pour > 50 utilisateurs simultanés)
- Disque : 40 Go SSD (+ stockage documents selon usage)
- Bande passante : 100 Mbps

---

## 2. Installation étape par étape

### 2.1 Cloner le dépôt

```bash
# Se placer dans le répertoire web
cd /var/www

# Cloner le projet
git clone https://github.com/ibig-tech/secretis-erp.git secretis
cd secretis
```

### 2.2 Installer les dépendances PHP

```bash
cd backend

# Production : sans les paquets de dev, avec autoloader optimisé
composer install --no-dev --optimize-autoloader --prefer-dist --no-interaction

# Développement : avec les paquets de test
composer install --prefer-dist --no-interaction
```

### 2.3 Installer les dépendances Node.js

```bash
cd ../frontend

# Installation propre avec le lockfile
npm ci

# Build de production
npm run build

# Ou en développement (avec hot reload)
npm run dev
```

### 2.4 Configurer PostgreSQL

```bash
# Se connecter en tant que postgres
sudo -u postgres psql

-- Créer l'utilisateur et la base de données
CREATE USER secretis_user WITH PASSWORD 'votre_mot_de_passe_fort_ici';
CREATE DATABASE secretis_db OWNER secretis_user ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE secretis_db TO secretis_user;

-- Activer les extensions nécessaires
\c secretis_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\q
```

### 2.5 Configurer Redis

```bash
# Vérifier que Redis tourne
sudo systemctl status redis-server

# Si pas installé
sudo apt install -y redis-server
sudo systemctl enable --now redis-server

# Tester la connexion
redis-cli ping
# Attendu : PONG
```

### 2.6 Copier et configurer le fichier .env

```bash
cd /var/www/secretis/backend

# Copier le template
cp .env.example .env

# Ouvrir pour édition
nano .env
```

Voir la section [3. Configuration .env](#3-configuration-env) pour le détail de chaque variable.

### 2.7 Générer la clé applicative

```bash
php artisan key:generate
```

Cette commande remplit automatiquement `APP_KEY` dans le `.env`.

### 2.8 Configurer Nginx

```nginx
# /etc/nginx/sites-available/secretis.conf

server {
    listen 80;
    server_name votre-domaine.ci;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.ci;

    root /var/www/secretis/backend/public;
    index index.php;

    # SSL (Let's Encrypt recommandé)
    ssl_certificate /etc/letsencrypt/live/votre-domaine.ci/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.ci/privkey.pem;

    # Sécurité HTTP Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self';" always;

    # Upload max (pour les documents et pièces jointes)
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # INTERDIRE l'accès direct aux fichiers privés (pièces jointes, preuves paiement)
    location ^~ /storage/private {
        deny all;
        return 403;
    }
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/secretis.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2.9 Configurer les permissions de fichiers

```bash
# Propriétaire : l'utilisateur PHP-FPM (www-data sur Ubuntu)
sudo chown -R www-data:www-data /var/www/secretis/backend
sudo chmod -R 755 /var/www/secretis/backend
sudo chmod -R 775 /var/www/secretis/backend/storage
sudo chmod -R 775 /var/www/secretis/backend/bootstrap/cache
```

---

## 3. Configuration .env

Fichier complet `/var/www/secretis/backend/.env` avec explication de chaque variable :

```dotenv
# ============================================================
# ENVIRONNEMENT
# ============================================================

APP_NAME="SECRETIS ERP"
APP_ENV=production          # local | testing | staging | production
APP_KEY=                    # Généré par: php artisan key:generate
APP_DEBUG=false             # JAMAIS true en production
APP_URL=https://votre-domaine.ci

# ============================================================
# BASE DE DONNÉES — PostgreSQL
# ============================================================

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=secretis_db
DB_USERNAME=secretis_user
DB_PASSWORD=votre_mot_de_passe_fort   # Min 32 chars, généré aléatoirement

# Options de pool de connexions (important pour charge élevée)
DB_POOL_MIN=2
DB_POOL_MAX=20

# ============================================================
# CACHE & SESSIONS
# ============================================================

CACHE_DRIVER=redis      # file | redis (redis recommandé en production)
SESSION_DRIVER=redis    # file | cookie | database | redis
SESSION_LIFETIME=480    # Durée en minutes (8 heures)
SESSION_SECURE_COOKIE=true   # HTTPS obligatoire

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null     # Configurer un mot de passe Redis en production
REDIS_PORT=6379
REDIS_DB=0              # DB 0 pour le cache/sessions
REDIS_QUEUE_DB=1        # DB 1 séparée pour les queues

# ============================================================
# QUEUES (workers asynchrones)
# ============================================================

QUEUE_CONNECTION=redis  # sync (dev) | redis (prod) | database

# ============================================================
# EMAIL
# ============================================================

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org        # Ou: smtp.sendinblue.com, smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=votre-smtp-username
MAIL_PASSWORD=votre-smtp-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votre-domaine.ci
MAIL_FROM_NAME="SECRETIS ERP"

# ============================================================
# STOCKAGE (fichiers privés — pièces jointes, preuves paiement)
# ============================================================

FILESYSTEM_DISK=local   # local (dev) | s3 (prod recommandé)

# Si S3 / Minio / DigitalOcean Spaces :
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=eu-west-1
AWS_BUCKET=secretis-private-documents
AWS_USE_PATH_STYLE_ENDPOINT=false

# ============================================================
# PAIEMENT — CinetPay (Afrique de l'Ouest)
# ============================================================

CINETPAY_SITE_ID=votre_site_id         # Fourni par CinetPay
CINETPAY_API_KEY=votre_api_key         # Clé API CinetPay
CINETPAY_SECRET_KEY=votre_secret_key   # Clé secrète pour les signatures HMAC
CINETPAY_MODE=PROD                     # TEST | PROD
CINETPAY_NOTIFY_URL=https://votre-domaine.ci/api/webhooks/cinetpay

# ============================================================
# SÉCURITÉ
# ============================================================

# Durée du trial (jours)
SECRETIS_TRIAL_DAYS=14

# Période de grâce après expiration de licence (jours)
SECRETIS_GRACE_PERIOD_DAYS=7

# Rate limiting (tentatives de login avant blocage)
SECRETIS_LOGIN_MAX_ATTEMPTS=5
SECRETIS_LOGIN_DECAY_SECONDS=60

# ============================================================
# MONITORING (optionnel mais recommandé)
# ============================================================

SENTRY_LARAVEL_DSN=https://votre-dsn@sentry.io/xxxxx
LOG_CHANNEL=stack           # stack | daily | single | sentry
LOG_LEVEL=warning           # debug | info | warning | error | critical

# Telescope (désactiver en production)
TELESCOPE_ENABLED=false

# ============================================================
# LOGS D'AUDIT
# ============================================================

AUDIT_LOG_RETENTION_DAYS=365  # Conservation des logs d'audit (1 an)
AUDIT_LOG_CHANNEL=database    # database | file | both
```

---

## 4. Premier lancement

### 4.1 Exécuter les migrations

```bash
cd /var/www/secretis/backend

# Lancer toutes les migrations
php artisan migrate --force

# Vérifier le statut
php artisan migrate:status
```

### 4.2 Alimenter la base avec les données de référence

```bash
# Seeder complet (rôles, permissions, plans tarifaires, pays)
php artisan db:seed --class=DatabaseSeeder

# Seeders individuels si besoin
php artisan db:seed --class=RolesAndPermissionsSeeder
php artisan db:seed --class=PlansSeeder
php artisan db:seed --class=CountriesSeeder
```

### 4.3 Créer le lien symbolique pour le storage public

```bash
# Crée public/storage → storage/app/public
# ATTENTION : les fichiers privés ne doivent JAMAIS aller dans storage/app/public
php artisan storage:link
```

### 4.4 Optimiser pour la production

```bash
# Cache de la configuration (plus de lecture .env à chaque requête)
php artisan config:cache

# Cache des routes (plus de parsing routes à chaque requête)
php artisan route:cache

# Cache des vues Blade
php artisan view:cache

# Optimisation globale (inclut les 3 précédents)
php artisan optimize
```

### 4.5 Démarrer les workers de queue

```bash
# Mode production : utiliser Supervisor pour la résilience

# /etc/supervisor/conf.d/secretis-worker.conf
[program:secretis-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/secretis/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/log/secretis/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start secretis-worker:*
```

### 4.6 Configurer les tâches CRON

```bash
# Ajouter au crontab de l'utilisateur www-data
sudo crontab -u www-data -e

# Ligne à ajouter (toutes les minutes — Laravel gère la granularité interne)
* * * * * cd /var/www/secretis/backend && php artisan schedule:run >> /dev/null 2>&1
```

Tâches planifiées par SECRETIS :
- Toutes les 5 min : rappels d'événements agenda
- Quotidien à 8h : alertes courriers en retard
- Quotidien à 6h : vérification licences expirées
- Hebdomadaire (dimanche 2h) : nettoyage des logs d'audit anciens

---

## 5. Checklist de validation

Vérifiez chaque point après l'installation :

### Connectivité

- [ ] `curl https://votre-domaine.ci/api/health` retourne `{"status":"ok"}`
- [ ] La base de données répond : `php artisan db:show`
- [ ] Redis répond : `redis-cli ping` → `PONG`
- [ ] Les mails fonctionnent : `php artisan tinker` → `Mail::to('test@example.com')->send(...)`

### Sécurité

- [ ] `APP_DEBUG=false` dans `.env`
- [ ] Certificat SSL valide : `curl -I https://votre-domaine.ci | grep "Strict-Transport"`
- [ ] Les fichiers `storage/private/*` ne sont PAS accessibles via HTTP direct
- [ ] `php artisan audit:check` ne retourne pas d'avertissement critique
- [ ] Toutes les clés secrètes ont une longueur ≥ 32 caractères

### Fonctionnel

- [ ] La page de login se charge sans erreur
- [ ] L'inscription d'une organisation fonctionne (mode trial 14j activé)
- [ ] L'email de bienvenue est bien reçu
- [ ] La création d'un événement agenda fonctionne
- [ ] L'upload d'un document fonctionne et le fichier est dans storage privé

### Performance

- [ ] `php artisan config:cache` sans erreur
- [ ] `php artisan route:cache` sans erreur (si routes pas en closure)
- [ ] Les workers Supervisor sont actifs : `sudo supervisorctl status`
- [ ] Le CRON tourne : vérifier `/var/log/cron.log`

### Monitoring

- [ ] Sentry DSN configuré et reçoit les erreurs de test
- [ ] Les logs Laravel sont dans `/var/log/secretis/` ou `storage/logs/`
- [ ] Rotation des logs configurée (logrotate)

---

*Pour toute question : support@ibig.tech — Documentation complète : https://docs.secretis.ibig.ci*
