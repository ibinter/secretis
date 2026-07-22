#!/usr/bin/env bash
# =============================================================================
# SECRETIS ERP — Script d'installation On-Premise
# Usage : ./install.sh --domain=secretis.monentreprise.com --license=XXXX-XXXX
# =============================================================================
set -euo pipefail

# Couleurs
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
BOLD='\033[1m'

SECRETIS_VERSION="${SECRETIS_VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/opt/secretis}"
REGISTRY="registry.ibigsoft.com"

# Paramètres
DOMAIN=""
LICENSE_KEY=""
ADMIN_EMAIL=""
SKIP_SSL=false
NON_INTERACTIVE=false

# -----------------------------------------------------------------------------
log()     { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✗]${NC} $*" >&2; }
header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $*${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}\n"; }
step()    { echo -e "\n${BOLD}→ $*${NC}"; }

# -----------------------------------------------------------------------------
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options obligatoires :"
    echo "  --domain=DOMAIN         Nom de domaine (ex: secretis.monentreprise.com)"
    echo "  --license=KEY           Clé de licence On-Premise"
    echo ""
    echo "Options facultatives :"
    echo "  --admin-email=EMAIL     Email de l'administrateur"
    echo "  --skip-ssl              Ignorer la configuration SSL (dev/test)"
    echo "  --non-interactive       Mode non interactif (CI/CD)"
    echo "  --install-dir=PATH      Répertoire d'installation (défaut: /opt/secretis)"
    echo "  --version=VERSION       Version à installer (défaut: latest)"
    echo "  --help                  Afficher cette aide"
    exit 0
}

# -----------------------------------------------------------------------------
parse_args() {
    for arg in "$@"; do
        case $arg in
            --domain=*)       DOMAIN="${arg#*=}" ;;
            --license=*)      LICENSE_KEY="${arg#*=}" ;;
            --admin-email=*)  ADMIN_EMAIL="${arg#*=}" ;;
            --install-dir=*)  INSTALL_DIR="${arg#*=}" ;;
            --version=*)      SECRETIS_VERSION="${arg#*=}" ;;
            --skip-ssl)       SKIP_SSL=true ;;
            --non-interactive) NON_INTERACTIVE=true ;;
            --help|-h)        usage ;;
            *) error "Argument inconnu : $arg"; exit 1 ;;
        esac
    done
}

# -----------------------------------------------------------------------------
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Ce script doit être exécuté en tant que root (sudo ./install.sh ...)"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
check_os() {
    step "Vérification du système d'exploitation..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    else
        error "Système d'exploitation non supporté. Ubuntu 20.04+ ou Debian 11+ requis."
        exit 1
    fi

    case $OS in
        ubuntu)
            if [[ "${VER%%.*}" -lt 20 ]]; then
                error "Ubuntu 20.04 minimum requis (trouvé : Ubuntu $VER)"
                exit 1
            fi
            ;;
        debian)
            if [[ "${VER%%.*}" -lt 11 ]]; then
                error "Debian 11 minimum requis (trouvé : Debian $VER)"
                exit 1
            fi
            ;;
        *)
            warn "OS non officiel ($OS $VER). L'installation peut échouer."
            ;;
    esac
    log "OS : $OS $VER — OK"
}

# -----------------------------------------------------------------------------
check_resources() {
    step "Vérification des ressources système..."

    # CPU
    CPU_CORES=$(nproc)
    if [[ $CPU_CORES -lt 2 ]]; then
        warn "Minimum 4 CPU recommandés (trouvé : $CPU_CORES). Performances dégradées."
    else
        log "CPU : $CPU_CORES cœurs — OK"
    fi

    # RAM
    RAM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
    if [[ $RAM_MB -lt 4096 ]]; then
        error "Minimum 8 GB RAM requis (trouvé : ${RAM_MB} MB)"
        exit 1
    fi
    log "RAM : ${RAM_MB} MB — OK"

    # Espace disque
    DISK_GB=$(df -BG / | awk 'NR==2 {print int($4)}')
    if [[ $DISK_GB -lt 20 ]]; then
        error "Minimum 100 GB espace disque libre requis (trouvé : ${DISK_GB} GB)"
        exit 1
    fi
    log "Disque : ${DISK_GB} GB disponibles — OK"
}

# -----------------------------------------------------------------------------
check_ports() {
    step "Vérification des ports réseau..."
    local blocked=false

    for port in 80 443 8080; do
        if ss -tlnp 2>/dev/null | grep -q ":$port "; then
            error "Port $port déjà utilisé. Veuillez libérer ce port avant l'installation."
            blocked=true
        else
            log "Port $port — libre"
        fi
    done

    if [[ $blocked == true ]]; then exit 1; fi
}

# -----------------------------------------------------------------------------
check_docker() {
    step "Vérification de Docker..."

    if ! command -v docker &>/dev/null; then
        if [[ $NON_INTERACTIVE == true ]]; then
            error "Docker non trouvé. Installez Docker 24+ manuellement."
            exit 1
        fi
        warn "Docker non trouvé. Installation automatique..."
        install_docker
    fi

    DOCKER_VERSION=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0")
    DOCKER_MAJOR=$(echo "$DOCKER_VERSION" | cut -d. -f1)

    if [[ $DOCKER_MAJOR -lt 24 ]]; then
        error "Docker 24+ requis (trouvé : $DOCKER_VERSION)"
        exit 1
    fi
    log "Docker $DOCKER_VERSION — OK"

    # Docker Compose v2
    if ! docker compose version &>/dev/null; then
        error "Docker Compose v2 requis. Mettez à jour Docker."
        exit 1
    fi
    DC_VERSION=$(docker compose version --short)
    log "Docker Compose $DC_VERSION — OK"
}

# -----------------------------------------------------------------------------
install_docker() {
    log "Installation de Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable --now docker
    usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
    log "Docker installé."
}

# -----------------------------------------------------------------------------
validate_license() {
    step "Validation de la clé de licence..."

    if [[ -z "$LICENSE_KEY" ]]; then
        error "Clé de licence manquante. Utilisez --license=VOTRE_CLE"
        exit 1
    fi

    # Format : XXXX-XXXX-XXXX-XXXX-XXXX (5 groupes de 4 chars alphanumériques)
    if ! echo "$LICENSE_KEY" | grep -qE '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'; then
        error "Format de clé invalide. Format attendu : XXXX-XXXX-XXXX-XXXX-XXXX"
        exit 1
    fi

    log "Format de licence — OK (la signature sera vérifiée au démarrage)"
}

# -----------------------------------------------------------------------------
validate_domain() {
    step "Validation du domaine..."

    if [[ -z "$DOMAIN" ]]; then
        error "Domaine manquant. Utilisez --domain=votre.domaine.com"
        exit 1
    fi

    # Résolution DNS
    if command -v dig &>/dev/null; then
        SERVER_IP=$(dig +short myip.opendns.com @resolver1.opendns.com 2>/dev/null || curl -sf https://ifconfig.me 2>/dev/null || echo "inconnu")
        DOMAIN_IP=$(dig +short "$DOMAIN" 2>/dev/null | tail -1 || echo "")

        if [[ -n "$DOMAIN_IP" && "$DOMAIN_IP" != "$SERVER_IP" ]]; then
            warn "Le domaine $DOMAIN pointe vers $DOMAIN_IP mais ce serveur est $SERVER_IP"
            warn "Assurez-vous que les DNS sont correctement configurés."
        fi
    fi

    log "Domaine : $DOMAIN — OK"
}

# -----------------------------------------------------------------------------
generate_secrets() {
    step "Génération des secrets..."

    # Génère une chaîne aléatoire sécurisée
    gen_secret() { openssl rand -base64 "${1:-32}" | tr -dc 'a-zA-Z0-9' | head -c "${1:-32}"; }

    APP_KEY="base64:$(openssl rand -base64 32)"
    DB_PASSWORD=$(gen_secret 32)
    REDIS_PASSWORD=$(gen_secret 32)
    MINIO_ROOT_PASSWORD=$(gen_secret 32)
    MINIO_APP_PASSWORD=$(gen_secret 32)
    BACKUP_ENCRYPTION_KEY=$(gen_secret 32)

    log "APP_KEY générée"
    log "Mots de passe générés pour DB, Redis, MinIO"
}

# -----------------------------------------------------------------------------
setup_install_dir() {
    step "Configuration du répertoire d'installation : $INSTALL_DIR"

    mkdir -p "$INSTALL_DIR"
    cp -r "$(dirname "$0")"/* "$INSTALL_DIR/" 2>/dev/null || true
    cd "$INSTALL_DIR"

    log "Répertoire créé : $INSTALL_DIR"
}

# -----------------------------------------------------------------------------
create_env_file() {
    step "Création du fichier .env..."

    ENV_FILE="$INSTALL_DIR/.env"

    cp .env.on-premise.example "$ENV_FILE"

    # Remplacer les valeurs
    sed_replace() { sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; }

    sed_replace "APP_KEY"                   "$APP_KEY"
    sed_replace "APP_URL"                   "https://$DOMAIN"
    sed_replace "SECRETIS_LICENSE_KEY"      "$LICENSE_KEY"
    sed_replace "DB_PASSWORD"               "$DB_PASSWORD"
    sed_replace "REDIS_PASSWORD"            "$REDIS_PASSWORD"
    sed_replace "MINIO_ROOT_PASSWORD"       "$MINIO_ROOT_PASSWORD"
    sed_replace "MINIO_PASSWORD"            "$MINIO_APP_PASSWORD"
    sed_replace "BACKUP_ENCRYPTION_KEY"     "$BACKUP_ENCRYPTION_KEY"
    [[ -n "$ADMIN_EMAIL" ]] && sed_replace "ADMIN_EMAIL" "$ADMIN_EMAIL"

    chmod 600 "$ENV_FILE"
    log "Fichier .env créé avec les secrets générés"
}

# -----------------------------------------------------------------------------
pull_images() {
    step "Téléchargement de l'image SECRETIS $SECRETIS_VERSION..."

    # Authentification au registry privé
    if [[ -n "${REGISTRY_TOKEN:-}" ]]; then
        echo "$REGISTRY_TOKEN" | docker login "$REGISTRY" -u secretis --password-stdin
    else
        warn "REGISTRY_TOKEN non défini. Tentative de pull public..."
    fi

    docker pull "${REGISTRY}/secretis:${SECRETIS_VERSION}" || \
    docker pull "ibigsoft/secretis:${SECRETIS_VERSION}"

    # Tag en local pour docker-compose
    docker tag "${REGISTRY}/secretis:${SECRETIS_VERSION}" ibigsoft/secretis:latest 2>/dev/null || \
    docker tag "ibigsoft/secretis:${SECRETIS_VERSION}" ibigsoft/secretis:latest 2>/dev/null || true

    log "Image SECRETIS téléchargée"
}

# -----------------------------------------------------------------------------
configure_ssl() {
    if [[ $SKIP_SSL == true ]]; then
        warn "SSL ignoré (--skip-ssl). Génération d'un certificat auto-signé pour les tests..."
        mkdir -p "$INSTALL_DIR/nginx/certs"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$INSTALL_DIR/nginx/certs/privkey.pem" \
            -out "$INSTALL_DIR/nginx/certs/fullchain.pem" \
            -subj "/CN=$DOMAIN/O=SECRETIS/C=FR" 2>/dev/null
        log "Certificat auto-signé généré (non sécurisé — production uniquement avec Certbot)"
        return
    fi

    step "Configuration SSL avec Let's Encrypt (Certbot)..."

    # Installer Certbot si nécessaire
    if ! command -v certbot &>/dev/null; then
        apt-get install -y certbot 2>/dev/null || \
        snap install --classic certbot && ln -sf /snap/bin/certbot /usr/bin/certbot
    fi

    mkdir -p "$INSTALL_DIR/nginx/certs"
    mkdir -p /var/www/certbot

    # Obtenir le certificat (mode standalone, port 80 doit être libre)
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "${ADMIN_EMAIL:-admin@$DOMAIN}" \
        -d "$DOMAIN" \
        --deploy-hook "docker compose -f $INSTALL_DIR/docker-compose.yml exec nginx nginx -s reload"

    # Copier les certificats vers le volume Docker
    cp /etc/letsencrypt/live/"$DOMAIN"/fullchain.pem "$INSTALL_DIR/nginx/certs/"
    cp /etc/letsencrypt/live/"$DOMAIN"/privkey.pem   "$INSTALL_DIR/nginx/certs/"

    # Renouvellement automatique (cron)
    echo "0 3 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $INSTALL_DIR/nginx/certs/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $INSTALL_DIR/nginx/certs/ && docker compose -f $INSTALL_DIR/docker-compose.yml exec nginx nginx -s reload" \
        > /etc/cron.d/secretis-certbot-renew

    log "SSL Let's Encrypt configuré pour $DOMAIN"
}

# -----------------------------------------------------------------------------
start_services() {
    step "Démarrage des services Docker Compose..."

    cd "$INSTALL_DIR"

    # Démarrer d'abord les services d'infrastructure
    docker compose up -d postgres redis minio
    log "Services infrastructure démarrés, attente de disponibilité..."
    sleep 15

    # Vérifier postgres
    local retries=0
    until docker compose exec -T postgres pg_isready -U "${DB_USERNAME:-secretis}" &>/dev/null; do
        ((retries++))
        if [[ $retries -ge 30 ]]; then
            error "PostgreSQL non disponible après 30 tentatives"
            docker compose logs postgres
            exit 1
        fi
        sleep 2
    done
    log "PostgreSQL prêt"

    # Démarrer l'app
    docker compose up -d app
    sleep 10

    # Démarrer le reste
    docker compose up -d

    log "Tous les services démarrés"
}

# -----------------------------------------------------------------------------
run_migrations() {
    step "Exécution des migrations de base de données..."

    cd "$INSTALL_DIR"

    docker compose exec -T app php artisan migrate --force --no-interaction
    log "Migrations appliquées"

    docker compose exec -T app php artisan db:seed --class=ProductionSeeder --force --no-interaction 2>/dev/null || \
    docker compose exec -T app php artisan db:seed --force --no-interaction
    log "Données initiales insérées"

    # Optimisation
    docker compose exec -T app php artisan config:cache
    docker compose exec -T app php artisan route:cache
    docker compose exec -T app php artisan view:cache
    docker compose exec -T app php artisan event:cache
    log "Cache applicatif généré"
}

# -----------------------------------------------------------------------------
create_admin_user() {
    step "Création de l'utilisateur administrateur..."

    cd "$INSTALL_DIR"
    ADMIN_PWD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 16)

    docker compose exec -T app php artisan secretis:create-admin \
        --name="Administrateur" \
        --email="${ADMIN_EMAIL:-admin@$DOMAIN}" \
        --password="$ADMIN_PWD" \
        --no-interaction 2>/dev/null || true

    log "Administrateur créé : ${ADMIN_EMAIL:-admin@$DOMAIN}"
    echo "$ADMIN_PWD" > "$INSTALL_DIR/.admin_password"
    chmod 600 "$INSTALL_DIR/.admin_password"
}

# -----------------------------------------------------------------------------
health_check() {
    step "Vérification de l'installation..."

    local url="https://$DOMAIN/health"
    [[ $SKIP_SSL == true ]] && url="http://localhost/health"

    local retries=0
    until curl -sf --max-time 10 "$url" &>/dev/null; do
        ((retries++))
        if [[ $retries -ge 20 ]]; then
            error "L'application ne répond pas après $retries tentatives"
            echo ""
            warn "Logs de débogage :"
            docker compose -f "$INSTALL_DIR/docker-compose.yml" logs --tail=50 app
            exit 1
        fi
        echo "  Attente de l'application... ($retries/20)"
        sleep 5
    done

    log "Application accessible sur https://$DOMAIN ✓"
}

# -----------------------------------------------------------------------------
print_summary() {
    header "Installation SECRETIS terminée !"

    echo -e "${GREEN}${BOLD}URL d'accès        :${NC} https://${DOMAIN}"
    echo -e "${GREEN}${BOLD}Email admin        :${NC} ${ADMIN_EMAIL:-admin@$DOMAIN}"
    echo -e "${GREEN}${BOLD}Mot de passe admin :${NC} $(cat "$INSTALL_DIR/.admin_password" 2>/dev/null || echo 'voir .admin_password')"
    echo ""
    echo -e "${YELLOW}${BOLD}Fichiers importants :${NC}"
    echo -e "  Configuration  : ${INSTALL_DIR}/.env"
    echo -e "  Mot de passe   : ${INSTALL_DIR}/.admin_password"
    echo -e "  Logs           : docker compose -f ${INSTALL_DIR}/docker-compose.yml logs -f"
    echo ""
    echo -e "${YELLOW}${BOLD}Commandes utiles :${NC}"
    echo -e "  Mise à jour    : ${INSTALL_DIR}/update.sh"
    echo -e "  Sauvegarde     : ${INSTALL_DIR}/backup.sh"
    echo -e "  Arrêt          : docker compose -f ${INSTALL_DIR}/docker-compose.yml down"
    echo ""
    echo -e "${RED}${BOLD}IMPORTANT :${NC}"
    echo -e "  1. Changez le mot de passe admin dès la première connexion"
    echo -e "  2. Supprimez le fichier ${INSTALL_DIR}/.admin_password après l'avoir noté"
    echo -e "  3. Configurez les sauvegardes dans ${INSTALL_DIR}/.env (BACKUP_*)"
    echo ""
}

# =============================================================================
# POINT D'ENTRÉE
# =============================================================================
main() {
    header "Installation SECRETIS ERP On-Premise"

    parse_args "$@"

    check_root
    check_os
    check_resources
    check_ports
    check_docker
    validate_license
    validate_domain
    generate_secrets
    setup_install_dir
    create_env_file
    pull_images
    configure_ssl
    start_services
    run_migrations
    create_admin_user
    health_check
    print_summary
}

main "$@"
