# Guide d'installation — IBIG SECRETIS ERP

**Version :** 1.0.0
**Dernière mise à jour :** 22 juillet 2026
**Edité par :** IBIG Soft — Equipe Infrastructure

---

## Table des matières

1. [SaaS Cloud — Ubuntu 22.04 LTS](#1-saas-cloud--ubuntu-2204-lts)
2. [On-Premise Docker](#2-on-premise-docker)
3. [Développement local](#3-développement-local)

---

## 1. SaaS Cloud — Ubuntu 22.04 LTS

### 1.1 Prérequis serveur

**Système d'exploitation :** Ubuntu 22.04 LTS (Jammy Jellyfish) — recommandé
Ubuntu 20.04 LTS est supporté, mais Ubuntu 22.04 est conseillé.

**Configuration matérielle minimum :**

| Ressource | Minimum | Recommandé (production) |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Stockage | 50 GB SSD | 200 GB NVMe |
| Bande passante | 100 Mbps | 1 Gbps |

**Ports à ouvrir (firewall) :**

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8080/tcp  # WebSocket (Reverb) — optionnel si derrière Nginx
sudo ufw enable
```

### 1.2 Installation des dépendances système

```bash
#!/bin/bash
# Script d'installation des dépendances — Ubuntu 22.04
# Exécuter en tant que root ou avec sudo

set -e

echo "=== Mise à jour du système ==="
apt update && apt upgrade -y

echo "=== Installation de PHP 8.2 ==="
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y \
  php8.2 php8.2-fpm php8.2-cli \
  php8.2-mbstring php8.2-xml php8.2-bcmath \
  php8.2-curl php8.2-zip php8.2-pgsql \
  php8.2-redis php8.2-gd php8.2-intl \
  php8.2-pcntl php8.2-soap php8.2-tokenizer \
  php8.2-xmlreader php8.2-fileinfo \
  php8.2-opcache

echo "=== Installation de PostgreSQL 15 ==="
apt install -y gnupg2
echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor \
  -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt update
apt install -y postgresql-15 postgresql-client-15

echo "=== Installation de Redis 7 ==="
apt install -y redis-server
systemctl enable redis-server

echo "=== Installation de Nginx ==="
apt install -y nginx
systemctl enable nginx

echo "=== Installation de Supervisor ==="
apt install -y supervisor
systemctl enable supervisor

echo "=== Installation de Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "=== Installation de Composer ==="
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

echo "=== Installation de Meilisearch ==="
curl -L https://install.meilisearch.com | sh
mv ./meilisearch /usr/local/bin/

echo "=== Toutes les dépendances sont installées. ==="
```

### 1.3 Configuration de PostgreSQL

```bash
# Connexion à PostgreSQL
sudo -u postgres psql

-- Dans psql :
CREATE USER secretis WITH PASSWORD 'MOT_DE_PASSE_FORT';
CREATE DATABASE secretis_production OWNER secretis;
GRANT ALL PRIVILEGES ON DATABASE secretis_production TO secretis;

-- Activer Row Level Security (recommandé)
\c secretis_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q
```

### 1.4 Installation de l'application SECRETIS

```bash
# Créer le répertoire et cloner
mkdir -p /var/www
cd /var/www
git clone https://github.com/ibigsoft/secretis-erp.git secretis
cd secretis

# Définir les permissions
chown -R www-data:www-data /var/www/secretis
chmod -R 775 /var/www/secretis/storage
chmod -R 775 /var/www/secretis/bootstrap/cache

# Installer les dépendances PHP (production)
sudo -u www-data composer install --no-dev --optimize-autoloader

# Installer les dépendances Node.js et builder
npm ci
npm run build

# Configurer l'environnement
cp .env.example .env

# Editer .env avec vos valeurs
nano .env

# Générer la clé d'application
php artisan key:generate

# Lancer l'installateur interactif SECRETIS
php artisan secretis:install
```

### 1.5 Migrations et données initiales

```bash
# Migrations de la base de données
php artisan migrate --force

# Données de production (plans, rôles, permissions)
php artisan db:seed --class=ProductionSeeder

# Créer le premier tenant (votre organisation)
php artisan secretis:tenant:create \
  --name="Nom de votre organisation" \
  --domain="votre-domaine.com" \
  --plan=enterprise \
  --admin-email=admin@votre-domaine.com \
  --admin-password=MotDePasseAdmin123!

# Préchauffer les caches
php artisan optimize
php artisan secretis:cache:warm
```

### 1.6 Configuration DNS et SSL

```bash
# Installer Certbot (Let's Encrypt)
apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com \
  --email admin@votre-domaine.com --agree-tos --non-interactive

# Renouvellement automatique
systemctl enable certbot.timer
```

### 1.7 Configuration Nginx

Créer `/etc/nginx/sites-available/secretis` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/secretis/public;
    index index.php;

    # En-têtes de sécurité
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Limite upload
    client_max_body_size 50M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 120;
    }

    # WebSocket Reverb
    location /app {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_pass http://127.0.0.1:8080;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/secretis /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 1.8 Configuration Supervisor

Créer `/etc/supervisor/conf.d/secretis.conf` :

```ini
; Workers de queue Laravel Horizon
[program:secretis-horizon]
process_name=%(program_name)s
command=php /var/www/secretis/artisan horizon
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/secretis/horizon.log
stopwaitsecs=3600

; Serveur WebSocket Laravel Reverb
[program:secretis-reverb]
process_name=%(program_name)s
command=php /var/www/secretis/artisan reverb:start --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/secretis/reverb.log
```

```bash
mkdir -p /var/log/secretis
chown www-data:www-data /var/log/secretis
supervisorctl reread
supervisorctl update
supervisorctl start all
```

### 1.9 Configuration des CRON

Ajouter au crontab de www-data (`crontab -u www-data -e`) :

```cron
* * * * * cd /var/www/secretis && php artisan schedule:run >> /dev/null 2>&1
```

### 1.10 Tests post-installation

```bash
# Vérification complète de la santé du système
php artisan secretis:health:check

# Test de connectivité base de données
php artisan db:monitor

# Test de connectivité Redis
php artisan redis:check

# Test d'envoi d'email
php artisan secretis:test:email --to=admin@votre-domaine.com

# Test WebSocket
php artisan reverb:status

# Vérification des permissions fichiers
php artisan secretis:check:permissions

# Rapport de sécurité
php artisan secretis:security:audit
```

Résultat attendu : toutes les vérifications en vert (PASS).

---

## 2. On-Premise Docker

### 2.1 Prérequis

- Ubuntu 22.04 LTS (ou Windows Server 2019+ avec WSL2)
- Docker Engine 25+ et Docker Compose Plugin 2.x
- Minimum 8 GB RAM, 4 CPU, 100 GB disque
- Accès internet pour la première installation (images Docker)
- Licence On-Premise IBIG Soft valide

```bash
# Installation Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version  # Docker version 25.x.x
```

### 2.2 Téléchargement du package On-Premise

```bash
# Package fourni par IBIG Soft avec votre licence
curl -O https://releases.ibig-secretis.com/v1.0.0/secretis-onpremise-v1.0.0.tar.gz

# Vérification de l'intégrité
curl -O https://releases.ibig-secretis.com/v1.0.0/secretis-onpremise-v1.0.0.tar.gz.sha256
sha256sum -c secretis-onpremise-v1.0.0.tar.gz.sha256

# Extraction
tar -xzf secretis-onpremise-v1.0.0.tar.gz
cd secretis-onpremise
```

### 2.3 Configuration

```bash
# Copier et éditer le fichier d'environnement
cp .env.onpremise .env

# Editer les variables critiques
nano .env
```

Variables On-Premise critiques :

```env
# Domaine interne ou IP de votre serveur
APP_URL=https://secretis.votre-organisation.local
APP_KEY=                    # Sera généré automatiquement

# Base de données (gérée par Docker)
DB_PASSWORD=CHANGER_CE_MOT_DE_PASSE_FORT
REDIS_PASSWORD=CHANGER_CE_MOT_DE_PASSE_REDIS

# E-mail (serveur SMTP interne ou Exchange)
MAIL_HOST=smtp.votre-organisation.local
MAIL_PORT=25
MAIL_FROM_ADDRESS=secretis@votre-organisation.local

# Licence On-Premise (fournie par IBIG Soft)
SECRETIS_LICENSE_KEY=eyJhbGc...VOTRE_CLE_JWT

# Stockage (MinIO interne)
FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://minio:9000
MINIO_KEY=CHANGER_ACCESS_KEY
MINIO_SECRET=CHANGER_SECRET_KEY
MINIO_BUCKET=secretis-files
```

### 2.4 Docker Compose — 8 services

Le fichier `docker-compose.yml` inclus dans le package déploie 8 services :

```yaml
services:
  # 1. Proxy inverse et SSL
  nginx:
    image: nginx:1.24-alpine
    ports: ["80:80", "443:443"]
    depends_on: [app]

  # 2. Application PHP Laravel
  app:
    image: ibigsoft/secretis:1.0.0
    depends_on: [postgres, redis, meilisearch]

  # 3. Workers de queue (4 processus parallèles)
  worker:
    image: ibigsoft/secretis:1.0.0
    command: ["php", "artisan", "horizon"]
    deploy:
      replicas: 1

  # 4. Serveur WebSocket
  reverb:
    image: ibigsoft/secretis:1.0.0
    command: ["php", "artisan", "reverb:start", "--port=8080"]
    ports: ["8080:8080"]

  # 5. Planificateur de tâches (cron)
  scheduler:
    image: ibigsoft/secretis:1.0.0
    command: ["php", "artisan", "schedule:work"]

  # 6. Base de données PostgreSQL
  postgres:
    image: postgres:15-alpine
    volumes: [secretis_postgres_data:/var/lib/postgresql/data]

  # 7. Cache Redis
  redis:
    image: redis:7-alpine
    volumes: [secretis_redis_data:/data]

  # 8. Moteur de recherche Meilisearch
  meilisearch:
    image: getmeili/meilisearch:v1.7
    volumes: [secretis_meili_data:/meili_data]
```

### 2.5 Démarrage et initialisation

```bash
# Démarrage des services
docker compose up -d

# Attendre que PostgreSQL soit prêt (~30 secondes)
docker compose exec app php artisan db:wait

# Générer la clé d'application
docker compose exec app php artisan key:generate --force

# Migrations et seeds
docker compose exec app php artisan migrate --force
docker compose exec app php artisan db:seed --class=ProductionSeeder

# Activation de la licence On-Premise
docker compose exec app php artisan secretis:license:activate \
  --key="$SECRETIS_LICENSE_KEY"

# Créer le premier administrateur
docker compose exec app php artisan secretis:tenant:create \
  --name="Votre Organisation" \
  --domain="secretis.votre-organisation.local" \
  --plan=enterprise \
  --admin-email=admin@votre-organisation.local \
  --admin-password=MotDePasseAdmin123!

# Optimisation
docker compose exec app php artisan optimize
docker compose exec app php artisan secretis:cache:warm

# Vérification
docker compose exec app php artisan secretis:health:check
```

### 2.6 Configuration SSL avec Let's Encrypt (si accessible d'internet)

```bash
# Installation Certbot
apt install -y certbot

# Génération du certificat
certbot certonly --webroot \
  -w /path/to/secretis-onpremise/nginx/webroot \
  -d secretis.votre-domaine.com \
  --email admin@votre-domaine.com \
  --agree-tos --non-interactive

# Copier les certificats dans le volume Nginx
cp /etc/letsencrypt/live/secretis.votre-domaine.com/fullchain.pem \
   ./nginx/ssl/cert.pem
cp /etc/letsencrypt/live/secretis.votre-domaine.com/privkey.pem \
   ./nginx/ssl/key.pem

# Rechargement Nginx
docker compose exec nginx nginx -s reload
```

### 2.7 Mise à jour

```bash
# Télécharger la nouvelle version
curl -O https://releases.ibig-secretis.com/v1.0.1/secretis-onpremise-v1.0.1.tar.gz

# Sauvegarde préventive
./scripts/backup.sh

# Mode maintenance
docker compose exec app php artisan down --secret="maintenance-abc123"

# Mise à jour des images
docker compose pull

# Redémarrage avec nouvelles images
docker compose up -d --no-deps app worker reverb scheduler

# Migrations
docker compose exec app php artisan migrate --force

# Sortie du mode maintenance
docker compose exec app php artisan up

# Optimisation
docker compose exec app php artisan optimize
```

### 2.8 Rollback en cas de problème

```bash
# Arrêter les services applicatifs
docker compose stop app worker reverb scheduler

# Restaurer la base de données depuis la sauvegarde
./scripts/restore.sh /path/to/backup/secretis_db_2026-07-22.dump

# Revenir à la version précédente
docker compose up -d --no-deps app worker reverb scheduler \
  --build --scale app=0
docker image tag ibigsoft/secretis:1.0.0 ibigsoft/secretis:current
docker compose up -d app worker reverb scheduler
```

### 2.9 Sauvegarde et restauration

```bash
# Sauvegarde manuelle complète
./scripts/backup.sh

# Ce script :
# 1. Dump PostgreSQL chiffré (AES-256)
# 2. Archive du volume MinIO (fichiers)
# 3. Export configuration Redis
# 4. Envoi optionnel vers S3/FTP distant

# Sauvegarde automatique quotidienne (crontab)
0 2 * * * /path/to/secretis-onpremise/scripts/backup.sh >> /var/log/secretis-backup.log 2>&1

# Restauration depuis une sauvegarde
./scripts/restore.sh /path/to/backup/secretis_full_2026-07-22.tar.gz
```

---

## 3. Développement local

### 3.1 Prérequis

- PHP 8.2+ avec toutes les extensions requises
- Node.js 20+
- PostgreSQL 15+ ou Docker Desktop
- Composer 2.x
- Git

### 3.2 Windows — Laravel Herd (recommandé)

```powershell
# Installer Laravel Herd depuis https://herd.laravel.com/windows
# Herd installe automatiquement PHP 8.2+, Nginx, et SQLite/PostgreSQL

# Cloner dans le dossier Herd (~\Herd\)
cd ~\Herd
git clone https://github.com/ibigsoft/secretis-erp.git secretis
cd secretis

# L'application sera accessible sur http://secretis.test
```

### 3.3 macOS — Laravel Herd

```bash
# Installer Laravel Herd depuis https://herd.laravel.com
# Placer le projet dans ~/Herd/

cd ~/Herd
git clone https://github.com/ibigsoft/secretis-erp.git secretis
cd secretis
```

### 3.4 Linux — Installation directe

```bash
# Cloner le projet
git clone https://github.com/ibigsoft/secretis-erp.git secretis
cd secretis

# Installer les dépendances
composer install
npm install

# Démarrer PostgreSQL et Redis (via Docker si nécessaire)
docker run -d --name secretis-postgres \
  -e POSTGRES_DB=secretis_dev \
  -e POSTGRES_USER=secretis \
  -e POSTGRES_PASSWORD=secretis_dev \
  -p 5432:5432 postgres:15-alpine

docker run -d --name secretis-redis \
  -p 6379:6379 redis:7-alpine
```

### 3.5 Configuration de l'environnement de développement

```bash
# Copier le fichier d'exemple
cp .env.example .env.local
cp .env.local .env

# Editer .env pour le développement
nano .env
```

Variables pour le développement local :

```env
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=secretis_dev
DB_USERNAME=secretis
DB_PASSWORD=secretis_dev

REDIS_HOST=127.0.0.1

# Utiliser le driver array pour les queues (pas besoin de Horizon)
QUEUE_CONNECTION=sync

# Stockage local
FILESYSTEM_DISK=local

# Email en développement (Mailpit)
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025

# IA — optionnel en développement
GROQ_API_KEY=votre-cle-groq

# WebSocket (optionnel en développement)
BROADCAST_CONNECTION=log
```

### 3.6 Initialisation et seeds de démonstration

```bash
# Génération de la clé
php artisan key:generate

# Migrations
php artisan migrate

# Seeds de démonstration (données réalistes de test)
php artisan secretis:seed:demo

# Comptes de test disponibles après le seed :
# SuperAdmin : superadmin@demo.com / demo2026
# Admin Tenant : admin@ministere-demo.ci / demo2026
# Secrétaire : secretaire@ministere-demo.ci / demo2026
# Agent RH : rh@ministere-demo.ci / demo2026
```

### 3.7 Lancer les serveurs de développement

```bash
# Terminal 1 : Serveur PHP
php artisan serve

# Terminal 2 : Build assets avec HMR (Hot Module Replacement)
npm run dev

# Terminal 3 : WebSocket (optionnel)
php artisan reverb:start

# Terminal 4 : Queue worker (optionnel, sinon QUEUE_CONNECTION=sync)
php artisan queue:work

# Terminal 5 : Vérification des emails (Mailpit)
# Installer Mailpit : https://mailpit.axllent.org
mailpit
# Interface web sur http://localhost:8025
```

Accéder à l'application : `http://localhost:8000`

### 3.8 Outils de développement

```bash
# Laravel Telescope (debug, requêtes, jobs, events)
# Accessible sur : http://localhost:8000/telescope

# Debugbar (barre d'outils de débogage dans le navigateur)
# Installé automatiquement en mode local

# Tinker (REPL interactif)
php artisan tinker

# Artisan pour lister les commandes disponibles
php artisan list | grep secretis

# Générer un nouveau module métier (scaffolding)
php artisan secretis:make:module NomModule
```

---

## Annexe : Vérification post-installation

Quelle que soit la méthode d'installation, exécuter les vérifications suivantes :

```bash
# Santé globale du système
php artisan secretis:health:check

# Résultat attendu :
# [PASS] Base de données PostgreSQL : connexion OK
# [PASS] Redis : connexion OK, mémoire disponible
# [PASS] Meilisearch : connexion OK, index créés
# [PASS] Stockage fichiers : accessible en lecture/écriture
# [PASS] File de jobs : workers actifs
# [PASS] WebSocket Reverb : serveur en cours d'exécution
# [PASS] Licence : valide jusqu'au 2027-07-22
# [PASS] Emails : configuration SMTP vérifiée
# [PASS] SARA / IA : service disponible
# [PASS] Certificat SSL : valide, expiration dans 87 jours
```

---

*Guide d'installation IBIG SECRETIS v1.0.0 — Copyright (c) 2025-2026 IBIG SARL*
*Support technique : support@ibigsoft.com | +225 XX XX XX XX*
