#!/usr/bin/env bash

# =============================================================================
# IBIG SECRETIS ERP — Script d'Installation Initiale (Ubuntu 22.04 LTS)
# =============================================================================
# Fichier  : deploy/scripts/first-install.sh
# Version  : 1.0.0
# Auteur   : IBIG SOFT
#
# Ce script installe et configure SECRETIS ERP sur un serveur Ubuntu 22.04
# vierge. À exécuter UNE SEULE FOIS en tant que root.
#
# Prérequis matériels :
#   - Ubuntu 22.04 LTS (Jammy Jellyfish)
#   - 8 vCPU / 16 GB RAM minimum
#   - 100 GB SSD (recommandé : 200 GB)
#   - Accès root SSH
#   - Domaine DNS configuré pointant vers ce serveur
#
# Composants installés :
#   - PHP 8.2 + extensions (pgsql, redis, imagick, zip, etc.)
#   - Nginx 1.24+
#   - PostgreSQL 16
#   - Redis 7
#   - Node.js 20 LTS
#   - Composer 2
#   - Supervisor
#   - Certbot (Let's Encrypt)
#   - UFW (Firewall)
#
# Usage :
#   curl -fsSL https://install.secretis.ibigsoft.com | sudo bash
#   # OU
#   sudo bash first-install.sh \
#       --domain=app.secretis.ibigsoft.com \
#       --email=admin@ibigsoft.com \
#       --db-password=VotreMotDePasseSecurisé
# =============================================================================

set -euo pipefail

# =============================================================================
# CONFIGURATION PAR DÉFAUT
# =============================================================================

APP_DOMAIN="app.secretis.ibigsoft.com"
REVERB_DOMAIN="reverb.secretis.ibigsoft.com"
ADMIN_EMAIL="admin@ibigsoft.com"
DB_NAME="secretis_production"
DB_USER="secretis_db"
DB_PASSWORD=""
APP_USER="secretis"
APP_DIR="/var/www/secretis"
GIT_REPO="git@github.com:ibigsoft/secretis-erp.git"
PHP_VERSION="8.2"
NODE_VERSION="20"
POSTGRES_VERSION="16"
SECRETIS_VERSION="1.0.0"

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*" >&2; exit 1; }

# Parser les arguments
for arg in "$@"; do
    case $arg in
        --domain=*)       APP_DOMAIN="${arg#*=}" ;;
        --email=*)        ADMIN_EMAIL="${arg#*=}" ;;
        --db-password=*)  DB_PASSWORD="${arg#*=}" ;;
        --git-repo=*)     GIT_REPO="${arg#*=}" ;;
    esac
done

# Générer un mot de passe DB si non fourni
if [[ -z "$DB_PASSWORD" ]]; then
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9!@#$%^&*' | head -c 32)
    warn "Mot de passe DB généré automatiquement : ${DB_PASSWORD}"
    warn "Notez-le, il ne sera plus affiché !"
fi

# =============================================================================
# BANNIÈRE
# =============================================================================
echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║       IBIG SECRETIS ERP — Installation v${SECRETIS_VERSION}        ║"
echo "  ║       Ubuntu 22.04 LTS — Configuration complète      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""
echo "  Domaine       : ${APP_DOMAIN}"
echo "  Email admin   : ${ADMIN_EMAIL}"
echo "  Base de données : ${DB_NAME}"
echo ""
read -p "  Continuer l'installation ? [y/N] " -n 1 -r
echo ""
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# =============================================================================
# ÉTAPE 1 : MISE À JOUR SYSTÈME
# =============================================================================

log "[1/14] Mise à jour du système..."
apt-get update -y -q
apt-get upgrade -y -q
apt-get install -y -q \
    curl wget git unzip zip gnupg2 software-properties-common \
    apt-transport-https ca-certificates lsb-release \
    build-essential ffmpeg ghostscript \
    ufw fail2ban htop nload ncdu \
    supervisor cron logrotate
success "Système mis à jour"

# =============================================================================
# ÉTAPE 2 : PHP 8.2 + EXTENSIONS
# =============================================================================

log "[2/14] Installation de PHP ${PHP_VERSION}..."
add-apt-repository -y ppa:ondrej/php >/dev/null 2>&1
apt-get update -q

PHP_EXTENSIONS=(
    "php${PHP_VERSION}"
    "php${PHP_VERSION}-fpm"
    "php${PHP_VERSION}-cli"
    "php${PHP_VERSION}-common"
    "php${PHP_VERSION}-pgsql"
    "php${PHP_VERSION}-redis"
    "php${PHP_VERSION}-mbstring"
    "php${PHP_VERSION}-xml"
    "php${PHP_VERSION}-curl"
    "php${PHP_VERSION}-zip"
    "php${PHP_VERSION}-bcmath"
    "php${PHP_VERSION}-intl"
    "php${PHP_VERSION}-gd"
    "php${PHP_VERSION}-imagick"
    "php${PHP_VERSION}-swoole"
    "php${PHP_VERSION}-imap"
    "php${PHP_VERSION}-ldap"
    "php${PHP_VERSION}-soap"
    "php${PHP_VERSION}-pcov"
)
apt-get install -y -q "${PHP_EXTENSIONS[@]}"

# Configuration PHP pour la production
cat > "/etc/php/${PHP_VERSION}/fpm/conf.d/99-secretis.ini" << 'EOF'
; SECRETIS ERP — Configuration PHP Production
memory_limit = 512M
max_execution_time = 120
max_input_time = 120
upload_max_filesize = 50M
post_max_size = 55M
max_file_uploads = 20
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 20000
opcache.revalidate_freq = 0
opcache.validate_timestamps = 0
opcache.fast_shutdown = 1
realpath_cache_size = 4096K
realpath_cache_ttl = 600
date.timezone = Africa/Abidjan
expose_php = Off
EOF

# Pool PHP-FPM dédié SECRETIS
cat > "/etc/php/${PHP_VERSION}/fpm/pool.d/secretis.conf" << EOF
[secretis]
user = ${APP_USER}
group = ${APP_USER}
listen = /run/php/php${PHP_VERSION}-fpm-secretis.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.process_idle_timeout = 10s
pm.max_requests = 500
chdir = /
request_terminate_timeout = 120
slowlog = /var/log/php-fpm/secretis-slow.log
request_slowlog_timeout = 10s
access.log = /var/log/php-fpm/secretis-access.log
EOF

mkdir -p /var/log/php-fpm
systemctl restart "php${PHP_VERSION}-fpm"
success "PHP ${PHP_VERSION} installé et configuré"

# =============================================================================
# ÉTAPE 3 : NGINX
# =============================================================================

log "[3/14] Installation et configuration de Nginx..."
apt-get install -y -q nginx

cat > "/etc/nginx/sites-available/secretis" << EOF
# SECRETIS ERP — Nginx Configuration Production

# Limite de connexions par IP
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;
limit_req_zone \$binary_remote_addr zone=login:10m rate=5r/m;

upstream php_fpm {
    server unix:/run/php/php${PHP_VERSION}-fpm-secretis.sock;
}

server {
    listen 80;
    server_name ${APP_DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${APP_DOMAIN};

    root ${APP_DIR}/current/frontend/dist;
    index index.php index.html;

    # SSL (Let's Encrypt — configuré par certbot)
    ssl_certificate /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Logs
    access_log /var/log/nginx/secretis-access.log combined buffer=32k;
    error_log /var/log/nginx/secretis-error.log warn;

    # Taille max des requêtes (uploads)
    client_max_body_size 55M;

    # API Laravel
    location /api {
        limit_req zone=api burst=50 nodelay;
        try_files \$uri \$uri/ /backend/public/index.php?\$query_string;

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass php_fpm;
            fastcgi_param SCRIPT_FILENAME ${APP_DIR}/current/backend/public/index.php;
            fastcgi_read_timeout 120;
        }
    }

    # Login (rate limité)
    location /login {
        limit_req zone=login burst=3 nodelay;
        try_files \$uri \$uri/ /index.html;
    }

    # Vue.js SPA — toutes les routes vers index.html
    location / {
        try_files \$uri \$uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Assets statiques (long cache)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Laravel backend PHP
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass php_fpm;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        fastcgi_read_timeout 120;
    }

    # Interdire l'accès aux fichiers sensibles
    location ~ /\.(env|git|htaccess) {
        deny all;
        return 404;
    }

    location ~ /(vendor|node_modules|storage/logs) {
        deny all;
        return 404;
    }
}

# WebSocket Reverb
server {
    listen 443 ssl http2;
    server_name ${REVERB_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${APP_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${APP_DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/secretis /etc/nginx/sites-enabled/secretis
nginx -t
success "Nginx configuré"

# =============================================================================
# ÉTAPE 4 : POSTGRESQL 16
# =============================================================================

log "[4/14] Installation de PostgreSQL ${POSTGRES_VERSION}..."
curl -fsSL "https://www.postgresql.org/media/keys/ACCC4CF8.asc" | \
    gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] \
    https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list

apt-get update -q
apt-get install -y -q "postgresql-${POSTGRES_VERSION}" "postgresql-client-${POSTGRES_VERSION}"

# Configuration PostgreSQL pour SECRETIS
cat >> "/etc/postgresql/${POSTGRES_VERSION}/main/postgresql.conf" << 'EOF'

# SECRETIS ERP — Optimisations Production
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
EOF

systemctl restart postgresql

# Créer la base de données et l'utilisateur
sudo -u postgres psql << EOF
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER} ENCODING 'UTF8' LC_COLLATE 'fr_FR.UTF-8' LC_CTYPE 'fr_FR.UTF-8';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER USER ${DB_USER} CREATEDB;
\c ${DB_NAME}
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
EOF

success "PostgreSQL ${POSTGRES_VERSION} installé et configuré"

# =============================================================================
# ÉTAPE 5 : REDIS 7
# =============================================================================

log "[5/14] Installation de Redis..."
add-apt-repository -y ppa:redislabs/redis >/dev/null 2>&1
apt-get update -q
apt-get install -y -q redis-server

cat > /etc/redis/redis.conf << 'EOF'
# SECRETIS ERP — Redis Configuration Production
bind 127.0.0.1
port 6379
requirepass REDIS_PASSWORD_PLACEHOLDER
maxmemory 4gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
databases 16
timeout 300
tcp-keepalive 300
loglevel notice
logfile /var/log/redis/redis-server.log
EOF

REDIS_PASSWORD=$(openssl rand -base64 32)
sed -i "s/REDIS_PASSWORD_PLACEHOLDER/${REDIS_PASSWORD}/" /etc/redis/redis.conf

systemctl restart redis-server
systemctl enable redis-server
success "Redis installé et configuré (password généré)"

# =============================================================================
# ÉTAPE 6 : NODE.JS & NPM
# =============================================================================

log "[6/14] Installation de Node.js ${NODE_VERSION}..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - >/dev/null 2>&1
apt-get install -y -q nodejs
npm install -g npm@latest >/dev/null 2>&1
success "Node.js $(node --version) installé"

# =============================================================================
# ÉTAPE 7 : COMPOSER
# =============================================================================

log "[7/14] Installation de Composer..."
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer >/dev/null 2>&1
success "Composer $(composer --version --no-ansi | head -1) installé"

# =============================================================================
# ÉTAPE 8 : UTILISATEUR APPLICATIF & RÉPERTOIRES
# =============================================================================

log "[8/14] Création de l'utilisateur applicatif..."
useradd -m -d "$APP_DIR" -s /bin/bash "$APP_USER" 2>/dev/null || true
usermod -aG www-data "$APP_USER"

mkdir -p "${APP_DIR}/{releases,blue,green,shared}"
mkdir -p "${APP_DIR}/shared/{storage,logs}"
mkdir -p "${APP_DIR}/shared/storage/{app,framework,logs}"
mkdir -p "${APP_DIR}/shared/storage/framework/{cache,sessions,views}"

chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"
success "Utilisateur et répertoires créés"

# =============================================================================
# ÉTAPE 9 : CLONE DE SECRETIS
# =============================================================================

log "[9/14] Clone du dépôt SECRETIS..."
sudo -u "$APP_USER" bash -c "
    cd '${APP_DIR}'
    git clone '${GIT_REPO}' releases/initial --quiet

    # Créer le lien symbolique initial
    ln -sfn '${APP_DIR}/releases/initial' current

    # Lier les fichiers partagés
    ln -sfn '${APP_DIR}/shared/storage' current/backend/storage
"
success "Dépôt cloné"

# =============================================================================
# ÉTAPE 10 : CONFIGURATION .ENV
# =============================================================================

log "[10/14] Génération de la configuration..."

APP_KEY=$(sudo -u "$APP_USER" bash -c "
    cd '${APP_DIR}/current/backend'
    composer install --no-dev -q
    php artisan key:generate --show
")

# Clés VAPID pour PWA
VAPID_KEYS=$(node -e "
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log(keys.publicKey + '|' + keys.privateKey);
" 2>/dev/null || echo "|")
VAPID_PUBLIC=$(echo "$VAPID_KEYS" | cut -d'|' -f1)
VAPID_PRIVATE=$(echo "$VAPID_KEYS" | cut -d'|' -f2)

cat > "${APP_DIR}/shared/.env" << EOF
APP_NAME="IBIG SECRETIS"
APP_ENV=production
APP_KEY=${APP_KEY}
APP_DEBUG=false
APP_URL=https://${APP_DOMAIN}
APP_TIMEZONE=Africa/Abidjan
APP_LOCALE=fr
SECRETIS_VERSION=${SECRETIS_VERSION}

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_PORT=6379

CACHE_DRIVER=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=480
SESSION_SECURE_COOKIE=true

QUEUE_CONNECTION=redis
BROADCAST_DRIVER=reverb
REVERB_APP_ID=$(openssl rand -hex 8)
REVERB_APP_KEY=$(openssl rand -hex 16)
REVERB_APP_SECRET=$(openssl rand -hex 32)
REVERB_HOST=${REVERB_DOMAIN}
REVERB_PORT=443
REVERB_SCHEME=https

VAPID_PUBLIC_KEY=${VAPID_PUBLIC}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE}
VAPID_SUBJECT=mailto:noreply@secretis.ibigsoft.com

LOG_CHANNEL=daily
LOG_LEVEL=error
EOF

chown "${APP_USER}:${APP_USER}" "${APP_DIR}/shared/.env"
chmod 600 "${APP_DIR}/shared/.env"
success ".env généré"

# =============================================================================
# ÉTAPE 11 : MIGRATIONS & SEEDS
# =============================================================================

log "[11/14] Migrations et données initiales..."
sudo -u "$APP_USER" bash -c "
    cd '${APP_DIR}/current/backend'
    ln -sfn '${APP_DIR}/shared/.env' .env
    php artisan migrate --force --no-interaction
    php artisan db:seed --class=ProductionSeeder --force --no-interaction
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
"
success "Base de données initialisée"

# =============================================================================
# ÉTAPE 12 : SUPERVISOR (Queue Workers)
# =============================================================================

log "[12/14] Configuration de Supervisor..."

cat > "/etc/supervisor/conf.d/secretis-worker.conf" << EOF
[program:secretis-worker]
process_name=%(program_name)s_%(process_num)02d
command=php ${APP_DIR}/current/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --queue=high,default,notifications,reports,low
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=${APP_USER}
numprocs=4
redirect_stderr=true
stdout_logfile=${APP_DIR}/shared/logs/worker.log
stopwaitsecs=3600
startsecs=5

[program:secretis-reverb]
process_name=%(program_name)s
command=php ${APP_DIR}/current/backend/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=${APP_USER}
redirect_stderr=true
stdout_logfile=${APP_DIR}/shared/logs/reverb.log
startsecs=5
EOF

supervisorctl reread
supervisorctl update
supervisorctl start "secretis-worker:*"
supervisorctl start "secretis-reverb"
success "Supervisor configuré"

# =============================================================================
# ÉTAPE 13 : CRON
# =============================================================================

log "[13/14] Configuration du planificateur de tâches..."

CRON_JOB="* * * * * ${APP_USER} php ${APP_DIR}/current/backend/artisan schedule:run >> ${APP_DIR}/shared/logs/scheduler.log 2>&1"
echo "$CRON_JOB" > /etc/cron.d/secretis
chmod 644 /etc/cron.d/secretis

# Rotation des logs
cat > /etc/logrotate.d/secretis << EOF
${APP_DIR}/shared/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 ${APP_USER} ${APP_USER}
    sharedscripts
    postrotate
        supervisorctl signal HUP secretis-worker:* >/dev/null 2>&1 || true
    endscript
}
EOF

success "CRON configuré"

# =============================================================================
# ÉTAPE 14 : SSL LET'S ENCRYPT
# =============================================================================

log "[14/14] Configuration SSL Let's Encrypt..."
apt-get install -y -q certbot python3-certbot-nginx

# Démarrer Nginx temporairement en HTTP pour la vérification
nginx -s stop 2>/dev/null || true
sleep 1
nginx

certbot certonly \
    --nginx \
    --non-interactive \
    --agree-tos \
    --email "$ADMIN_EMAIL" \
    -d "$APP_DOMAIN" \
    -d "$REVERB_DOMAIN" \
    2>/dev/null || warn "SSL non configuré — à faire manuellement"

# Renouvellement automatique
echo "0 3 * * * root certbot renew --quiet --deploy-hook 'nginx -s reload'" \
    > /etc/cron.d/certbot-secretis

# Démarrer Nginx avec SSL
nginx -s reload 2>/dev/null || nginx
success "SSL configuré"

# =============================================================================
# FIREWALL
# =============================================================================

log "Configuration du firewall UFW..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
success "Firewall configuré"

# =============================================================================
# TESTS DE SANTÉ FINAUX
# =============================================================================

log "Tests de santé post-installation..."
HEALTH_ERRORS=0

# Test Nginx
if nginx -t 2>/dev/null; then
    success "Nginx : OK"
else
    warn "Nginx : Erreur de configuration"
    HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
fi

# Test PostgreSQL
if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
    success "PostgreSQL : OK"
else
    warn "PostgreSQL : Non accessible"
    HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
fi

# Test Redis
if redis-cli ping 2>/dev/null | grep -q PONG; then
    success "Redis : OK"
else
    warn "Redis : Non accessible"
    HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
fi

# Test PHP
if php -r "echo 'OK';" 2>/dev/null | grep -q OK; then
    success "PHP ${PHP_VERSION} : OK"
fi

# Test Queue Worker
if supervisorctl status "secretis-worker:*" 2>/dev/null | grep -q RUNNING; then
    success "Queue Workers : ACTIFS"
else
    warn "Queue Workers : Vérifier Supervisor"
    HEALTH_ERRORS=$((HEALTH_ERRORS + 1))
fi

# =============================================================================
# RÉSUMÉ FINAL
# =============================================================================

echo ""
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║          SECRETIS ERP — Installation Terminée           ║"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  URL Application : https://${APP_DOMAIN}"
echo "  ║  Base de données : ${DB_NAME}"
echo "  ║  Utilisateur DB  : ${DB_USER}"
echo "  ║  Mot de passe DB : ${DB_PASSWORD}"
echo "  ║  Redis Password  : ${REDIS_PASSWORD}"
echo "  ║  .env            : ${APP_DIR}/shared/.env"
echo "  ║  Logs            : ${APP_DIR}/shared/logs/"
echo "  ╠══════════════════════════════════════════════════════════╣"
echo "  ║  ACTIONS REQUISES APRÈS INSTALLATION :"
echo "  ║  1. Renseigner les variables dans ${APP_DIR}/shared/.env"
echo "  ║     (SMTP, S3, Paiements, IA, WhatsApp, etc.)"
echo "  ║  2. Importer le certificat de signature électronique"
echo "  ║  3. Configurer les alertes monitoring (Slack/Email)"
echo "  ║  4. Effectuer le premier backup manuel"
echo "  ║  5. Créer le compte super-administrateur"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo ""

if [[ $HEALTH_ERRORS -gt 0 ]]; then
    warn "${HEALTH_ERRORS} erreur(s) détectée(s) — vérifier les logs ci-dessus"
else
    success "Installation complète sans erreur !"
fi
