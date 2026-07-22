#!/usr/bin/env bash

# =============================================================================
# IBIG SECRETIS ERP — Script de Déploiement Production (Zero-Downtime)
# =============================================================================
# Fichier  : deploy/scripts/deploy-production.sh
# Version  : 1.0.0
# Auteur   : IBIG SOFT
#
# Stratégie : Blue/Green Deployment avec Nginx
#   - Les deux environnements (blue/green) sont maintenus en parallèle
#   - La bascule s'effectue via un symlink Nginx — temps de coupure < 1s
#   - Rollback automatique si les smoke tests échouent
#
# Prérequis :
#   - Nginx installé et configuré
#   - PHP-FPM 8.2 installé
#   - Supervisor pour les queue workers
#   - Variables d'environnement : SLACK_WEBHOOK_URL, DEPLOY_NOTIFY_EMAIL
#
# Usage :
#   ./deploy-production.sh [--branch=main] [--skip-tests] [--force]
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly DEPLOY_USER="secretis"
readonly APP_BASE="/var/www/secretis"
readonly RELEASES_DIR="${APP_BASE}/releases"
readonly CURRENT_LINK="${APP_BASE}/current"
readonly SHARED_DIR="${APP_BASE}/shared"
readonly BLUE_DIR="${APP_BASE}/blue"
readonly GREEN_DIR="${APP_BASE}/green"
readonly NGINX_CONF="/etc/nginx/sites-available/secretis"
readonly PHP_VERSION="8.2"
readonly PHP_FPM_SERVICE="php${PHP_VERSION}-fpm"
readonly GIT_REPO="git@github.com:ibigsoft/secretis-erp.git"
readonly SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
readonly NOTIFY_EMAIL="${DEPLOY_NOTIFY_EMAIL:-admin@ibigsoft.com}"
readonly MAX_RELEASES=5
readonly SMOKE_TEST_TIMEOUT=30

# Couleurs
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Arguments
BRANCH="main"
SKIP_TESTS=false
FORCE=false
DEPLOY_ID="$(date +%Y%m%d_%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${DEPLOY_ID}"

for arg in "$@"; do
    case $arg in
        --branch=*) BRANCH="${arg#*=}" ;;
        --skip-tests) SKIP_TESTS=true ;;
        --force) FORCE=true ;;
    esac
done

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓ $*${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠ $*${NC}"; }
error() { echo -e "${RED}[$(date '+%H:%M:%S')] ✗ $*${NC}" >&2; }

notify_slack() {
    local message="$1"
    local color="${2:-good}"
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"SECRETIS Deploy #${DEPLOY_ID}\",
                    \"text\": \"${message}\",
                    \"footer\": \"IBIG SECRETIS Deployment\",
                    \"ts\": $(date +%s)
                }]
            }" >/dev/null 2>&1 || true
    fi
}

notify_email() {
    local subject="$1"
    local body="$2"
    echo "$body" | mail -s "$subject" "$NOTIFY_EMAIL" 2>/dev/null || true
}

get_current_color() {
    if [[ -L "$CURRENT_LINK" ]]; then
        current=$(readlink "$CURRENT_LINK")
        if [[ "$current" == "$BLUE_DIR"* ]]; then
            echo "blue"
        else
            echo "green"
        fi
    else
        echo "none"
    fi
}

get_next_color() {
    local current
    current=$(get_current_color)
    if [[ "$current" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

rollback() {
    local reason="$1"
    error "ROLLBACK DÉCLENCHÉ : $reason"
    notify_slack ":rotating_light: *ROLLBACK* - ${reason}" "danger"

    # Rétablir le symlink vers l'ancienne release
    local current_color
    current_color=$(get_current_color)
    if [[ "$current_color" == "blue" ]]; then
        ln -sfn "$GREEN_DIR" "$CURRENT_LINK"
    else
        ln -sfn "$BLUE_DIR" "$CURRENT_LINK"
    fi

    # Redémarrer PHP-FPM avec l'ancienne config
    sudo systemctl reload "$PHP_FPM_SERVICE" 2>/dev/null || true
    sudo nginx -s reload 2>/dev/null || true

    # Nettoyer la release échouée
    if [[ -d "$RELEASE_DIR" ]]; then
        rm -rf "$RELEASE_DIR"
    fi

    notify_email "[SECRETIS] Rollback automatique effectué" \
        "Le déploiement ${DEPLOY_ID} a échoué et un rollback automatique a été effectué.\nRaison : ${reason}"

    exit 1
}

# =============================================================================
# ÉTAPE 0 : PRÉ-VALIDATION
# =============================================================================

pre_validate() {
    log "Validation pré-déploiement..."

    # Vérifier qu'on est bien sur le bon serveur
    if [[ ! -d "$APP_BASE" ]]; then
        error "Répertoire de l'application introuvable : ${APP_BASE}"
        exit 1
    fi

    # Vérifier les droits
    if [[ "$(whoami)" != "$DEPLOY_USER" ]] && [[ "$(whoami)" != "root" ]]; then
        error "Ce script doit être exécuté en tant que '${DEPLOY_USER}'"
        exit 1
    fi

    # Vérifier que Nginx est actif
    if ! sudo nginx -t >/dev/null 2>&1; then
        error "Configuration Nginx invalide — déploiement annulé"
        exit 1
    fi

    # Vérifier que PHP-FPM est actif
    if ! sudo systemctl is-active --quiet "$PHP_FPM_SERVICE"; then
        error "PHP-FPM n'est pas actif — déploiement annulé"
        exit 1
    fi

    # Vérifier les migrations sans perte de données
    if [[ "$FORCE" != "true" ]]; then
        log "Vérification des migrations (safety check)..."
        cd "$CURRENT_LINK/backend" 2>/dev/null || true
        # Simuler les migrations pour détecter les problèmes
        if php artisan migrate:status 2>/dev/null | grep -q "Pending"; then
            warn "Des migrations en attente ont été détectées"
        fi
    fi

    # Vérifier l'espace disque (minimum 2 GB)
    local available_kb
    available_kb=$(df "$APP_BASE" | awk 'NR==2 {print $4}')
    if [[ $available_kb -lt 2097152 ]]; then
        error "Espace disque insuffisant (< 2 GB disponibles)"
        exit 1
    fi

    success "Pré-validation réussie"
}

# =============================================================================
# ÉTAPE 1 : CHECKOUT DU CODE
# =============================================================================

checkout_code() {
    log "Clonage de la branche '${BRANCH}'..."
    mkdir -p "$RELEASES_DIR"
    mkdir -p "$RELEASE_DIR"

    git clone \
        --depth=1 \
        --branch="$BRANCH" \
        "$GIT_REPO" \
        "$RELEASE_DIR" \
        --quiet

    # Récupérer le commit hash pour les logs
    local commit_hash
    commit_hash=$(git -C "$RELEASE_DIR" rev-parse --short HEAD)
    echo "$commit_hash" > "${RELEASE_DIR}/.deploy_commit"
    echo "$DEPLOY_ID" > "${RELEASE_DIR}/.deploy_id"

    success "Code cloné — commit ${commit_hash}"
}

# =============================================================================
# ÉTAPE 2 : INSTALLATION DES DÉPENDANCES
# =============================================================================

install_dependencies() {
    log "Installation des dépendances PHP (Composer)..."
    cd "${RELEASE_DIR}/backend"

    # Copier les fichiers partagés (.env, storage)
    ln -sfn "${SHARED_DIR}/.env" .env
    ln -sfn "${SHARED_DIR}/storage" storage

    composer install \
        --no-dev \
        --no-interaction \
        --optimize-autoloader \
        --no-progress \
        --quiet

    log "Installation des dépendances JS (npm)..."
    cd "${RELEASE_DIR}/frontend"
    npm ci --silent --production=false
    npm run build -- --mode production

    success "Dépendances installées"
}

# =============================================================================
# ÉTAPE 3 : TESTS AUTOMATISÉS
# =============================================================================

run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        warn "Tests ignorés (--skip-tests activé)"
        return 0
    fi

    log "Exécution des tests automatisés..."
    cd "${RELEASE_DIR}/backend"

    # Tests unitaires
    php artisan test \
        --parallel \
        --stop-on-failure \
        --configuration=phpunit.xml \
        2>&1 | tail -5

    # Tests de sécurité basiques
    if command -v composer-audit &>/dev/null; then
        composer audit --no-dev 2>/dev/null || warn "Vulnérabilités connues détectées — vérifier manuellement"
    fi

    success "Tests passés"
}

# =============================================================================
# ÉTAPE 4 : ACTIVATION DU MODE MAINTENANCE
# =============================================================================

enable_maintenance() {
    log "Activation du mode maintenance..."
    if [[ -L "$CURRENT_LINK" ]]; then
        cd "${CURRENT_LINK}/backend"
        php artisan down \
            --retry=60 \
            --secret="$(openssl rand -hex 16)" \
            --render="errors.maintenance" \
            2>/dev/null || true
    fi
    success "Mode maintenance activé"
}

disable_maintenance() {
    log "Désactivation du mode maintenance..."
    cd "${RELEASE_DIR}/backend"
    php artisan up
    success "Application en ligne"
}

# =============================================================================
# ÉTAPE 5 : MIGRATIONS BASE DE DONNÉES
# =============================================================================

run_migrations() {
    log "Exécution des migrations..."
    cd "${RELEASE_DIR}/backend"

    # Backup avant migration
    local backup_file="/tmp/secretis_pre_deploy_${DEPLOY_ID}.dump"
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -U "${DB_USERNAME}" \
        -d "${DB_DATABASE}" \
        -Fc \
        -f "$backup_file" \
        2>/dev/null && log "Backup pré-migration : ${backup_file}"

    # Exécuter les migrations
    if ! php artisan migrate --force --no-interaction; then
        error "Échec des migrations"
        rollback "Erreur lors des migrations base de données"
    fi

    success "Migrations exécutées"
}

# =============================================================================
# ÉTAPE 6 : BASCULE BLUE/GREEN
# =============================================================================

switch_environment() {
    local next_color
    next_color=$(get_next_color)
    local next_dir="${APP_BASE}/${next_color}"

    log "Bascule vers l'environnement '${next_color}'..."

    # Copier la release vers le répertoire blue/green
    rsync -a --delete \
        "${RELEASE_DIR}/" \
        "${next_dir}/" \
        --exclude=".git" \
        --quiet

    # Optimiser Laravel pour la production
    cd "${next_dir}/backend"
    php artisan config:cache --quiet
    php artisan route:cache --quiet
    php artisan view:cache --quiet
    php artisan event:cache --quiet
    php artisan icons:cache --quiet 2>/dev/null || true

    # Mettre à jour le symlink atomiquement
    ln -sfn "$next_dir" "${CURRENT_LINK}.new"
    mv -T "${CURRENT_LINK}.new" "$CURRENT_LINK"

    success "Bascule ${next_color} effectuée"
}

# =============================================================================
# ÉTAPE 7 : REDÉMARRAGE DES SERVICES
# =============================================================================

restart_services() {
    log "Redémarrage des services..."

    # Recharger PHP-FPM sans coupure (graceful reload)
    sudo systemctl reload "$PHP_FPM_SERVICE"

    # Recharger Nginx
    sudo nginx -s reload

    # Redémarrer les queue workers via Supervisor
    sudo supervisorctl restart "secretis-worker:*" 2>/dev/null || \
    sudo supervisorctl restart "secretis-*" 2>/dev/null || \
    warn "Supervisor non disponible — redémarrage des workers via artisan"
    cd "${CURRENT_LINK}/backend"
    php artisan queue:restart

    # Redémarrer Reverb (WebSocket)
    sudo supervisorctl restart "secretis-reverb" 2>/dev/null || true

    success "Services redémarrés"
}

# =============================================================================
# ÉTAPE 8 : CACHE WARMUP
# =============================================================================

cache_warmup() {
    log "Préchauffage du cache..."
    cd "${CURRENT_LINK}/backend"

    # Précharger la configuration en cache
    php artisan config:cache --quiet
    php artisan route:cache --quiet
    php artisan view:cache --quiet

    # Préchauffer le cache applicatif (statistiques, permissions, etc.)
    php artisan secretis:cache:warmup --quiet 2>/dev/null || true

    success "Cache préchauffé"
}

# =============================================================================
# ÉTAPE 9 : SMOKE TESTS
# =============================================================================

smoke_tests() {
    log "Exécution des smoke tests..."
    local base_url="${APP_URL:-https://app.secretis.ibigsoft.com}"
    local failed=0

    # Test 1 : Page d'accueil répond en HTTP 200
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "$SMOKE_TEST_TIMEOUT" \
        --location \
        "${base_url}/login")
    if [[ "$status" != "200" ]]; then
        error "Smoke test échoué : /login retourne HTTP ${status} (attendu 200)"
        failed=$((failed + 1))
    else
        success "Smoke test 1/5 : Page de connexion OK (HTTP ${status})"
    fi

    # Test 2 : Health check endpoint
    local health
    health=$(curl -s \
        --max-time "$SMOKE_TEST_TIMEOUT" \
        "${base_url}/up")
    if [[ "$health" != *"200"* ]] && [[ "$health" != "" ]]; then
        error "Smoke test échoué : /up ne répond pas correctement"
        failed=$((failed + 1))
    else
        success "Smoke test 2/5 : Health endpoint OK"
    fi

    # Test 3 : API répond
    local api_status
    api_status=$(curl -s -o /dev/null -w "%{http_code}" \
        --max-time "$SMOKE_TEST_TIMEOUT" \
        "${base_url}/api/v1/ping")
    if [[ "$api_status" != "200" ]] && [[ "$api_status" != "401" ]]; then
        error "Smoke test échoué : /api/v1/ping retourne HTTP ${api_status}"
        failed=$((failed + 1))
    else
        success "Smoke test 3/5 : API endpoint OK (HTTP ${api_status})"
    fi

    # Test 4 : Redis disponible
    cd "${CURRENT_LINK}/backend"
    if ! php artisan redis:check-connection --quiet 2>/dev/null; then
        if ! php -r "
            \$redis = new Redis();
            \$redis->connect(getenv('REDIS_HOST'), 6379);
            exit(0);
        " 2>/dev/null; then
            warn "Smoke test 4/5 : Redis check non disponible (non bloquant)"
        fi
    else
        success "Smoke test 4/5 : Redis OK"
    fi

    # Test 5 : Queue worker actif
    if php artisan queue:monitor default --quiet 2>/dev/null; then
        success "Smoke test 5/5 : Queue worker actif"
    else
        warn "Smoke test 5/5 : Queue worker status incertain (non bloquant)"
    fi

    if [[ $failed -gt 0 ]]; then
        rollback "${failed} smoke test(s) ont échoué"
    fi

    success "Tous les smoke tests réussis"
}

# =============================================================================
# ÉTAPE 10 : NETTOYAGE
# =============================================================================

cleanup() {
    log "Nettoyage des anciennes releases..."

    # Garder seulement les MAX_RELEASES dernières releases
    local releases
    releases=$(ls -t "$RELEASES_DIR" | tail -n +$((MAX_RELEASES + 1)))
    for release in $releases; do
        rm -rf "${RELEASES_DIR}/${release}"
        log "Release supprimée : ${release}"
    done

    success "Nettoyage effectué"
}

# =============================================================================
# NOTIFICATIONS FINALES
# =============================================================================

notify_success() {
    local commit_hash
    commit_hash=$(cat "${RELEASE_DIR}/.deploy_commit" 2>/dev/null || echo "unknown")
    local duration=$((SECONDS))
    local color_used
    color_used=$(get_current_color)

    local message="*Déploiement réussi* — ${BRANCH} (${commit_hash}) en ${duration}s"
    message="${message}\nEnvironnement : ${color_used}"
    message="${message}\nURL : ${APP_URL:-https://app.secretis.ibigsoft.com}"

    notify_slack "$message" "good"
    notify_email "[SECRETIS] Déploiement v${SECRETIS_VERSION:-1.0.0} réussi" "$message"

    success "==================================================="
    success " DÉPLOIEMENT SECRETIS ${DEPLOY_ID} RÉUSSI"
    success " Branche    : ${BRANCH} (${commit_hash})"
    success " Durée      : ${duration} secondes"
    success " Actif sur  : ${color_used}"
    success "==================================================="
}

# =============================================================================
# POINT D'ENTRÉE PRINCIPAL
# =============================================================================

main() {
    log "======================================================="
    log " SECRETIS ERP — Déploiement Production"
    log " ID          : ${DEPLOY_ID}"
    log " Branche     : ${BRANCH}"
    log " Utilisateur : $(whoami)"
    log "======================================================="

    notify_slack ":rocket: Déploiement *${BRANCH}* démarré par $(whoami)" "warning"

    SECONDS=0

    pre_validate
    checkout_code
    install_dependencies
    run_tests
    enable_maintenance
    run_migrations
    switch_environment
    restart_services
    disable_maintenance
    cache_warmup
    smoke_tests
    cleanup
    notify_success
}

# Trap pour rollback en cas d'erreur non gérée
trap 'rollback "Erreur inattendue à la ligne $LINENO"' ERR

main "$@"
