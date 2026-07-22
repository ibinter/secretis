#!/usr/bin/env bash
# =============================================================================
# SECRETIS ERP — Script de mise à jour On-Premise
# Usage : ./update.sh [--version=X.Y.Z]
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'
log()    { echo -e "${GREEN}[✓]${NC} $*"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*"; }
error()  { echo -e "${RED}[✗]${NC} $*" >&2; }
step()   { echo -e "\n${BOLD}→ $*${NC}"; }
header() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $*${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}\n"; }

INSTALL_DIR="${INSTALL_DIR:-/opt/secretis}"
TARGET_VERSION="latest"
BACKUP_BEFORE_UPDATE=true
ROLLBACK_ON_FAILURE=true

parse_args() {
    for arg in "$@"; do
        case $arg in
            --version=*)          TARGET_VERSION="${arg#*=}" ;;
            --no-backup)          BACKUP_BEFORE_UPDATE=false ;;
            --no-rollback)        ROLLBACK_ON_FAILURE=false ;;
            --install-dir=*)      INSTALL_DIR="${arg#*=}" ;;
        esac
    done
}

cd_install() {
    if [[ ! -f "$INSTALL_DIR/docker-compose.yml" ]]; then
        error "Répertoire d'installation introuvable : $INSTALL_DIR"
        error "Spécifiez-le avec --install-dir=PATH"
        exit 1
    fi
    cd "$INSTALL_DIR"
}

get_current_version() {
    docker compose exec -T app php artisan --version 2>/dev/null | grep -oP '\d+\.\d+\.\d+' || echo "inconnue"
}

pre_update_backup() {
    if [[ $BACKUP_BEFORE_UPDATE == false ]]; then
        warn "Sauvegarde ignorée (--no-backup)"
        return
    fi

    step "Sauvegarde pré-mise à jour..."
    if [[ -x "$INSTALL_DIR/backup.sh" ]]; then
        "$INSTALL_DIR/backup.sh" --tag="pre-update-$(date +%Y%m%d%H%M%S)" || {
            warn "La sauvegarde a échoué. Continuez quand même ? (Ctrl+C pour annuler)"
            sleep 10
        }
    else
        warn "Script backup.sh non trouvé, sauvegarde manuelle recommandée"
    fi
}

save_rollback_state() {
    step "Sauvegarde de l'état actuel pour rollback..."
    ROLLBACK_IMAGE=$(docker inspect ibigsoft/secretis:latest --format '{{.Id}}' 2>/dev/null || echo "")
    ROLLBACK_VERSION=$(get_current_version)
    echo "$ROLLBACK_IMAGE" > /tmp/secretis_rollback_image
    echo "$ROLLBACK_VERSION" > /tmp/secretis_rollback_version
    log "État de rollback sauvegardé (version $ROLLBACK_VERSION)"
}

pull_new_image() {
    step "Téléchargement de la nouvelle image (${TARGET_VERSION})..."
    docker compose pull
    log "Image mise à jour"
}

run_update() {
    step "Redémarrage des services avec la nouvelle version..."
    docker compose up -d --remove-orphans
    sleep 15
    log "Services redémarrés"
}

run_post_update_tasks() {
    step "Tâches post-mise à jour..."

    # Migrations
    docker compose exec -T app php artisan migrate --force --no-interaction
    log "Migrations appliquées"

    # Optimisation du cache
    docker compose exec -T app php artisan config:cache
    docker compose exec -T app php artisan route:cache
    docker compose exec -T app php artisan view:cache
    docker compose exec -T app php artisan event:cache
    log "Cache régénéré"

    # Vider le cache d'application
    docker compose exec -T app php artisan cache:clear
    docker compose exec -T app php artisan queue:restart
    log "Cache applicatif vidé, workers redémarrés"
}

health_check_after_update() {
    step "Vérification de l'état des services..."
    local retries=0

    source "$INSTALL_DIR/.env" 2>/dev/null || true
    local url="${APP_URL:-https://localhost}/health"

    until curl -sf --max-time 10 "$url" &>/dev/null; do
        ((retries++))
        if [[ $retries -ge 15 ]]; then
            error "L'application ne répond pas après la mise à jour"
            return 1
        fi
        echo "  Attente... ($retries/15)"
        sleep 5
    done

    log "Application en bonne santé après la mise à jour ✓"
}

rollback() {
    error "La mise à jour a échoué. Rollback en cours..."

    ROLLBACK_IMAGE=$(cat /tmp/secretis_rollback_image 2>/dev/null || echo "")
    ROLLBACK_VERSION=$(cat /tmp/secretis_rollback_version 2>/dev/null || echo "inconnue")

    if [[ -z "$ROLLBACK_IMAGE" ]]; then
        error "Impossible de rollback : image précédente inconnue"
        return 1
    fi

    warn "Restauration de la version $ROLLBACK_VERSION..."

    # Retag l'ancienne image
    docker tag "$ROLLBACK_IMAGE" ibigsoft/secretis:latest

    # Redémarrer avec l'ancienne image
    docker compose up -d --remove-orphans

    sleep 10

    if curl -sf --max-time 10 "${APP_URL:-https://localhost}/health" &>/dev/null; then
        log "Rollback réussi vers la version $ROLLBACK_VERSION"
    else
        error "Rollback échoué ! Intervention manuelle requise."
        error "Dernière image connue : $ROLLBACK_IMAGE"
    fi
}

notify_admin() {
    local status="$1"
    local message="$2"

    source "$INSTALL_DIR/.env" 2>/dev/null || true
    local admin_email="${ADMIN_EMAIL:-}"

    if [[ -z "$admin_email" ]]; then return; fi

    # Envoyer une notification via Laravel
    docker compose exec -T app php artisan secretis:notify-admin \
        --subject="[SECRETIS] Mise à jour : $status" \
        --message="$message" \
        --email="$admin_email" 2>/dev/null || \
    # Fallback : mail Unix
    echo "$message" | mail -s "[SECRETIS] Mise à jour : $status" "$admin_email" 2>/dev/null || true
}

cleanup() {
    step "Nettoyage des anciennes images..."
    docker image prune -f --filter "label=org.opencontainers.image.title=SECRETIS" 2>/dev/null || true
    rm -f /tmp/secretis_rollback_image /tmp/secretis_rollback_version
}

# =============================================================================
main() {
    header "Mise à jour SECRETIS ERP"
    parse_args "$@"

    NEW_VERSION="$TARGET_VERSION"
    CURRENT_VERSION=$(get_current_version)

    log "Version actuelle : $CURRENT_VERSION"
    log "Cible            : $NEW_VERSION"

    cd_install
    pre_update_backup
    save_rollback_state
    pull_new_image

    run_update
    run_post_update_tasks

    if health_check_after_update; then
        NEW_ACTUAL=$(get_current_version)
        cleanup
        notify_admin "SUCCÈS" "SECRETIS mis à jour de $CURRENT_VERSION vers $NEW_ACTUAL avec succès."

        header "Mise à jour réussie !"
        log "Ancienne version : $CURRENT_VERSION"
        log "Nouvelle version : $NEW_ACTUAL"
    else
        if [[ $ROLLBACK_ON_FAILURE == true ]]; then
            rollback
            notify_admin "ÉCHEC + ROLLBACK" "La mise à jour vers $NEW_VERSION a échoué. Rollback vers $CURRENT_VERSION effectué."
        else
            error "La mise à jour a échoué. Rollback désactivé."
            notify_admin "ÉCHEC" "La mise à jour vers $NEW_VERSION a échoué. Vérifiez les logs sur le serveur."
            exit 1
        fi
    fi
}

main "$@"
