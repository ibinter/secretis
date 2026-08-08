#!/usr/bin/env bash
# =============================================================================
# SECRETIS ERP - Script d'installation initiale du serveur Ubuntu 22.04 LTS
# Usage   : sudo bash setup-server.sh
# Auteur  : IBIG SOFT
# Version : 1.0.0
#
# AVERTISSEMENT : Exécuter en tant que root sur un serveur vierge Ubuntu 22.04
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ─── Vérifications initiales ──────────────────────────────────────────────────
[[ "$(id -u)" -eq 0 ]] || { echo "Exécutez ce script en tant que root (sudo bash setup-server.sh)"; exit 1; }

# Vérifier Ubuntu 22.04
if ! grep -q "Ubuntu 22.04" /etc/os-release 2>/dev/null; then
    echo "AVERTISSEMENT : Ce script est conçu pour Ubuntu 22.04 LTS"
    read -p "Continuer quand même ? (oui/non) : " CONFIRM
    [[ "${CONFIRM}" == "oui" ]] || exit 0
fi

# ─── Variables de configuration ───────────────────────────────────────────────
APP_USER="secretis"
APP_DIR="/var/www/secretis"
LOG_DIR="/var/log/secretis"
DB_NAME="secretis_production"
DB_USER="secretis_db"
DB_PASS=$(openssl rand -base64 32 | tr -d '=+/')    # Mot de passe aléatoire fort
REDIS_PASS=$(openssl rand -base64 24 | tr -d '=+/')
PHP_VERSION="8.2"
NODE_VERSION="20"
DOMAIN="secretis.ibigsoft.com"
SETUP_LOG="/root/secretis-setup-$(date +%Y%m%d-%H%M%S).log"

# ─── Fonctions ────────────────────────────────────────────────────────────────
log()     { echo "[$(date '+%H:%M:%S')] $*" | tee -a "${SETUP_LOG}"; }
success() { echo -e "\033[0;32m[✓] $*\033[0m" | tee -a "${SETUP_LOG}"; }
step()    { echo -e "\n\033[1;34m══ $* \033[0m" | tee -a "${SETUP_LOG}"; }
warn()    { echo -e "\033[1;33m[⚠] $*\033[0m" | tee -a "${SETUP_LOG}"; }

# ═════════════════════════════════════════════════════════════════════════════
step "1/12 - Mise à jour du système"
# ═════════════════════════════════════════════════════════════════════════════
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget git unzip zip gnupg2 ca-certificates lsb-release \
    software-properties-common apt-transport-https \
    ufw fail2ban htop iotop ncdu rsync \
    openssl acl \
    2>/dev/null
success "Système mis à jour"

# ═════════════════════════════════════════════════════════════════════════════
step "2/12 - Installation de PHP ${PHP_VERSION} + extensions"
# ═════════════════════════════════════════════════════════════════════════════
add-apt-repository -y ppa:ondrej/php
apt-get update -qq
apt-get install -y -qq \
    php${PHP_VERSION}-fpm \
    php${PHP_VERSION}-cli \
    php${PHP_VERSION}-pgsql \
    php${PHP_VERSION}-redis \
    php${PHP_VERSION}-gd \
    php${PHP_VERSION}-zip \
    php${PHP_VERSION}-mbstring \
    php${PHP_VERSION}-bcmath \
    php${PHP_VERSION}-xml \
    php${PHP_VERSION}-curl \
    php${PHP_VERSION}-intl \
    php${PHP_VERSION}-opcache \
    php${PHP_VERSION}-tokenizer \
    php${PHP_VERSION}-fileinfo \
    php${PHP_VERSION}-pcntl \
    php${PHP_VERSION}-soap \
    php${PHP_VERSION}-imagick \
    2>/dev/null

success "PHP ${PHP_VERSION} installé"

# ─── Configuration PHP-FPM optimisée ─────────────────────────────────────────
PHP_FPM_POOL="/etc/php/${PHP_VERSION}/fpm/pool.d/secretis.conf"
cat > "${PHP_FPM_POOL}" << EOF
[secretis]
user = ${APP_USER}
group = ${APP_USER}
listen = /var/run/php/php${PHP_VERSION}-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Mode dynamique optimisé pour un VPS 4 vCPU / 8 Go RAM
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 1000
pm.process_idle_timeout = 10s

; Timeouts
request_terminate_timeout = 300
request_slowlog_timeout = 10s
slowlog = /var/log/php${PHP_VERSION}-fpm-slow.log

; Variables d'environnement
clear_env = no

; Statut PHP-FPM
pm.status_path = /fpm-status
ping.path = /fpm-ping
ping.response = pong
EOF

# ─── Configuration php.ini production ────────────────────────────────────────
PHP_INI="/etc/php/${PHP_VERSION}/fpm/conf.d/99-secretis.ini"
cat > "${PHP_INI}" << EOF
; Configuration SECRETIS ERP - Production
memory_limit = 512M
upload_max_filesize = 50M
post_max_size = 55M
max_execution_time = 300
max_input_time = 300
max_input_vars = 5000
date.timezone = Africa/Abidjan

; OPcache optimisé
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 20000
opcache.revalidate_freq = 0
opcache.validate_timestamps = 0
opcache.save_comments = 1

; Sécurité
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php${PHP_VERSION}-fpm.log
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT

; Sessions
session.cookie_secure = 1
session.cookie_httponly = 1
session.cookie_samesite = Strict
session.use_strict_mode = 1
EOF

systemctl restart php${PHP_VERSION}-fpm
systemctl enable php${PHP_VERSION}-fpm
success "PHP-FPM configuré et optimisé"

# ═════════════════════════════════════════════════════════════════════════════
step "3/12 - Installation de Nginx"
# ═════════════════════════════════════════════════════════════════════════════
apt-get install -y -qq nginx
systemctl enable nginx

# Configuration Nginx globale optimisée
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    client_max_body_size 50M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logs
    access_log /var/log/nginx/access.log combined buffer=16k flush=5s;
    error_log  /var/log/nginx/error.log warn;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript
               image/svg+xml font/ttf font/otf application/wasm;

    # Rate limiting global
    limit_req_zone $binary_remote_addr zone=global:10m rate=100r/s;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

success "Nginx installé et configuré"

# ═════════════════════════════════════════════════════════════════════════════
step "4/12 - Installation de PostgreSQL 15"
# ═════════════════════════════════════════════════════════════════════════════
# Dépôt officiel PostgreSQL
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
    gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
apt-get update -qq
apt-get install -y -qq postgresql-15 postgresql-client-15

systemctl enable postgresql

# Attendre que PostgreSQL démarre
sleep 3

# Créer la base de données et l'utilisateur
sudo -u postgres psql << EOSQL
-- Créer l'utilisateur avec mot de passe fort
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';

-- Créer la base de données
CREATE DATABASE ${DB_NAME}
    OWNER ${DB_USER}
    ENCODING 'UTF8'
    LC_COLLATE 'fr_FR.UTF-8'
    LC_CTYPE 'fr_FR.UTF-8'
    TEMPLATE template0;

-- Accorder tous les privilèges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};

-- Extensions utiles pour Laravel
\c ${DB_NAME}
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

\q
EOSQL

# Optimisation PostgreSQL (pour VPS 8 Go RAM)
PG_CONF="/etc/postgresql/15/main/postgresql.conf"
cat >> "${PG_CONF}" << 'PGEOF'

# ── Optimisations SECRETIS ERP ──
max_connections = 200
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 16MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4
log_timezone = 'Africa/Abidjan'
PGEOF

systemctl restart postgresql
success "PostgreSQL 15 installé et configuré (DB: ${DB_NAME}, User: ${DB_USER})"

# ═════════════════════════════════════════════════════════════════════════════
step "5/12 - Installation et configuration de Redis"
# ═════════════════════════════════════════════════════════════════════════════
apt-get install -y -qq redis-server

# Configuration Redis sécurisée
REDIS_CONF="/etc/redis/redis.conf"
# Sauvegarde config originale
cp "${REDIS_CONF}" "${REDIS_CONF}.bak"

sed -i "s/^# requirepass .*/requirepass ${REDIS_PASS}/" "${REDIS_CONF}"
sed -i "s/^requirepass .*/requirepass ${REDIS_PASS}/" "${REDIS_CONF}"
echo "requirepass ${REDIS_PASS}" >> "${REDIS_CONF}"

# Écoute uniquement localhost
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' "${REDIS_CONF}"

# Persistance
sed -i 's/^appendonly .*/appendonly yes/' "${REDIS_CONF}"
sed -i 's/^appendfsync .*/appendfsync everysec/' "${REDIS_CONF}"

# Mémoire max 2 Go avec politique d'éviction LRU
echo "maxmemory 2gb" >> "${REDIS_CONF}"
echo "maxmemory-policy allkeys-lru" >> "${REDIS_CONF}"

systemctl enable redis-server
systemctl restart redis-server
success "Redis installé et sécurisé"

# ═════════════════════════════════════════════════════════════════════════════
step "6/12 - Installation de Node.js ${NODE_VERSION}"
# ═════════════════════════════════════════════════════════════════════════════
curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
apt-get install -y -qq nodejs
npm install -g npm@latest
success "Node.js $(node --version) installé"

# ═════════════════════════════════════════════════════════════════════════════
step "7/12 - Installation de Composer"
# ═════════════════════════════════════════════════════════════════════════════
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
chmod +x /usr/local/bin/composer
success "Composer $(composer --version --no-ansi | head -1) installé"

# ═════════════════════════════════════════════════════════════════════════════
step "8/12 - Installation de Certbot (Let's Encrypt)"
# ═════════════════════════════════════════════════════════════════════════════
apt-get install -y -qq certbot python3-certbot-nginx python3-certbot-dns-cloudflare
success "Certbot installé"

# ═════════════════════════════════════════════════════════════════════════════
step "9/12 - Installation de Supervisor"
# ═════════════════════════════════════════════════════════════════════════════
apt-get install -y -qq supervisor
systemctl enable supervisor
systemctl start supervisor
success "Supervisor installé"

# ═════════════════════════════════════════════════════════════════════════════
step "10/12 - Création de l'utilisateur système 'secretis'"
# ═════════════════════════════════════════════════════════════════════════════
if ! id "${APP_USER}" &>/dev/null; then
    useradd --system \
            --shell /bin/bash \
            --home-dir "${APP_DIR}" \
            --create-home \
            --groups www-data \
            "${APP_USER}"
    success "Utilisateur ${APP_USER} créé"
else
    warn "Utilisateur ${APP_USER} existe déjà"
fi

# Répertoires de l'application
mkdir -p "${APP_DIR}/backend/storage/logs"
mkdir -p "${APP_DIR}/backend/storage/app/public"
mkdir -p "${APP_DIR}/backend/bootstrap/cache"
mkdir -p "${LOG_DIR}"

chown -R "${APP_USER}:www-data" "${APP_DIR}"
chown -R "${APP_USER}:www-data" "${LOG_DIR}"
chmod -R 755 "${APP_DIR}"
chmod -R 775 "${APP_DIR}/backend/storage"
chmod -R 775 "${APP_DIR}/backend/bootstrap/cache"

# Clé SSH pour déploiement (optionnelle)
SSH_DIR="${APP_DIR}/.ssh"
mkdir -p "${SSH_DIR}"
chmod 700 "${SSH_DIR}"
chown "${APP_USER}:${APP_USER}" "${SSH_DIR}"

success "Utilisateur et répertoires configurés"

# ═════════════════════════════════════════════════════════════════════════════
step "11/12 - Configuration du pare-feu UFW"
# ═════════════════════════════════════════════════════════════════════════════
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (IMPORTANT : ne pas bloquer avant d'avoir configuré les clés SSH)
ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Reverb WebSocket (interne, via Nginx proxy)
# Le port 8080 n'est ouvert que si accès direct nécessaire
# ufw allow 8080/tcp comment 'Reverb WebSocket (interne)'

# Accès PostgreSQL uniquement depuis localhost
# ufw allow from 127.0.0.1 to any port 5432

ufw --force enable
ufw status verbose | tee -a "${SETUP_LOG}"

# Configuration Fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter  = nginx-limit-req
logpath = /var/log/nginx/secretis.error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban
success "UFW et Fail2ban configurés"

# ═════════════════════════════════════════════════════════════════════════════
step "12/12 - Configuration du Crontab (Laravel Scheduler)"
# ═════════════════════════════════════════════════════════════════════════════
CRON_LINE="* * * * * cd ${APP_DIR}/backend && /usr/bin/php${PHP_VERSION} artisan schedule:run >> /dev/null 2>&1"

# Ajouter au crontab de l'utilisateur secretis
(crontab -u "${APP_USER}" -l 2>/dev/null; echo "${CRON_LINE}") | \
    sort -u | crontab -u "${APP_USER}" -

success "Crontab configuré pour l'utilisateur ${APP_USER}"

# Logrotate pour les logs SECRETIS
cat > /etc/logrotate.d/secretis << 'EOF'
/var/log/secretis/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 secretis secretis
    sharedscripts
    postrotate
        supervisorctl restart secretis-worker:* > /dev/null 2>&1 || true
    endscript
}

/var/log/nginx/secretis*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        nginx -s reopen > /dev/null 2>&1 || true
    endscript
}
EOF

# ═════════════════════════════════════════════════════════════════════════════
# Rapport final et sauvegarde des identifiants
# ═════════════════════════════════════════════════════════════════════════════
CREDENTIALS_FILE="/root/secretis-credentials-KEEP-SAFE-$(date +%Y%m%d).txt"
cat > "${CREDENTIALS_FILE}" << EOF
═══════════════════════════════════════════════════════════
  SECRETIS ERP - IDENTIFIANTS D'INSTALLATION
  Généré le : $(date)
  CONSERVEZ CE FICHIER EN LIEU SûR ET SUPPRIMEZ-LE DU SERVEUR
═══════════════════════════════════════════════════════════

PostgreSQL
  Host     : 127.0.0.1
  Port     : 5432
  Database : ${DB_NAME}
  User     : ${DB_USER}
  Password : ${DB_PASS}

Redis
  Host     : 127.0.0.1
  Port     : 6379
  Password : ${REDIS_PASS}

Système
  App User : ${APP_USER}
  App Dir  : ${APP_DIR}
  Log Dir  : ${LOG_DIR}

Prochaines étapes :
  1. Copier votre repo dans ${APP_DIR}/backend
  2. Configurer ${APP_DIR}/backend/.env (utiliser les identifiants ci-dessus)
  3. Configurer nginx : voir deploy/nginx/LISEZ-MOI.md (config non versionnee)
  4. ln -s /etc/nginx/sites-available/secretis.conf /etc/nginx/sites-enabled/
  5. Obtenir le certificat SSL : certbot --nginx -d ${DOMAIN} -d "*.${DOMAIN}"
  6. Copier les configs Supervisor depuis deploy/supervisor/
  7. Lancer : bash deploy/scripts/deploy.sh
EOF

chmod 600 "${CREDENTIALS_FILE}"

echo ""
echo -e "\033[1;32m═══════════════════════════════════════════════════\033[0m"
echo -e "\033[1;32m  Installation terminée avec succès !\033[0m"
echo -e "\033[1;32m═══════════════════════════════════════════════════\033[0m"
echo ""
echo -e "  Identifiants sauvegardés dans : \033[1;33m${CREDENTIALS_FILE}\033[0m"
echo -e "  Log d'installation             : \033[1;33m${SETUP_LOG}\033[0m"
echo ""
echo -e "  \033[1;31mIMPORTANT : Téléchargez et supprimez ${CREDENTIALS_FILE} du serveur !\033[0m"
echo ""
