#!/usr/bin/env bash
# =============================================================================
# SECRETIS ERP - Script de déploiement production
# Usage   : ./deploy.sh [--branch main] [--skip-build] [--dry-run]
# Auteur  : IBIG SOFT
# Version : 1.0.0
# =============================================================================

set -euo pipefail
IFS=$'\n\t'

# ─── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/var/www/secretis/backend"
DEPLOY_USER="secretis"
PHP_BIN="/usr/bin/php8.2"
COMPOSER_BIN="/usr/local/bin/composer"
NODE_BIN="/usr/bin/node"
NPM_BIN="/usr/bin/npm"
ARTISAN="${APP_DIR}/artisan"
LOG_DIR="/var/log/secretis"
DEPLOY_LOG="${LOG_DIR}/deploy.log"
BRANCH="${BRANCH:-main}"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
DEPLOY_ID="deploy_${TIMESTAMP}"
ROLLBACK_DIR="/var/www/secretis/releases"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"          # Variable d'env optionnelle
NOTIFY_EMAIL="${DEPLOY_NOTIFY_EMAIL:-}"          # Variable d'env optionnelle
MAX_RELEASES=5                                   # Nombre de releases à conserver
DRY_RUN=false
SKIP_BUILD=false

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ─── Parsing des arguments ───────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)   BRANCH="$2"; shift 2 ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --dry-run)  DRY_RUN=true; shift ;;
        *) echo "Option inconnue : $1"; exit 1 ;;
    esac
done

# ─── Fonctions utilitaires ────────────────────────────────────────────────────
log()     { echo -e "${BLUE}[$(date '+%T')]${NC} $*" | tee -a "${DEPLOY_LOG}"; }
success() { echo -e "${GREEN}[$(date '+%T')] ✓${NC} $*" | tee -a "${DEPLOY_LOG}"; }
warn()    { echo -e "${YELLOW}[$(date '+%T')] ⚠${NC} $*" | tee -a "${DEPLOY_LOG}"; }
error()   { echo -e "${RED}[$(date '+%T')] ✗${NC} $*" | tee -a "${DEPLOY_LOG}" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${CYAN} ÉTAPE : $*${NC}"; \
            echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}"; }

run() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} $*"
    else
        eval "$@"
    fi
}

# ─── Notification Slack ───────────────────────────────────────────────────────
notify_slack() {
    local status="$1"
    local message="$2"
    local color="good"

    [[ "$status" == "failure" ]] && color="danger"
    [[ "$status" == "warning" ]] && color="warning"

    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        curl -s -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"SECRETIS ERP - Déploiement ${status}\",
                    \"text\": \"${message}\",
                    \"fields\": [
                        {\"title\": \"Branche\",    \"value\": \"${BRANCH}\",    \"short\": true},
                        {\"title\": \"Deploy ID\",  \"value\": \"${DEPLOY_ID}\", \"short\": true},
                        {\"title\": \"Timestamp\",  \"value\": \"${TIMESTAMP}\", \"short\": true}
                    ],
                    \"footer\": \"IBIG SOFT - SECRETIS ERP\"
                }]
            }" || warn "Impossible d'envoyer la notification Slack"
    fi
}

# ─── Notification email ───────────────────────────────────────────────────────
notify_email() {
    local status="$1"
    local message="$2"

    if [[ -n "${NOTIFY_EMAIL}" ]] && command -v mail &>/dev/null; then
        echo "${message}" | mail \
            -s "[SECRETIS] Déploiement ${status} - ${TIMESTAMP}" \
            "${NOTIFY_EMAIL}" || warn "Impossible d'envoyer l'email de notification"
    fi
}

# ─── Rollback ─────────────────────────────────────────────────────────────────
rollback() {
    local failed_step="$1"
    error "ÉCHEC à l'étape : ${failed_step}"
    error "Déclenchement du rollback..."

    local latest_release
    latest_release=$(ls -1t "${ROLLBACK_DIR}" 2>/dev/null | grep -v "^${DEPLOY_ID}$" | head -1 || true)

    if [[ -n "${latest_release}" && -d "${ROLLBACK_DIR}/${latest_release}" ]]; then
        log "Rollback vers la release : ${latest_release}"

        # Restaurer les fichiers
        run rsync -a --delete \
            "${ROLLBACK_DIR}/${latest_release}/" \
            "${APP_DIR}/" \
            --exclude=".env" \
            --exclude="storage/" \
            --exclude="public/storage"

        # Remettre en ligne
        run "${PHP_BIN}" "${ARTISAN}" maintenance:off 2>/dev/null || true
        run "${PHP_BIN}" "${ARTISAN}" config:cache
        run "${PHP_BIN}" "${ARTISAN}" route:cache
        run "${PHP_BIN}" "${ARTISAN}" view:cache
        run "${PHP_BIN}" "${ARTISAN}" queue:restart

        success "Rollback effectué vers : ${latest_release}"
        notify_slack "failure" "❌ Déploiement échoué à '${failed_step}'. Rollback vers ${latest_release} effectué."
        notify_email "ÉCHOUÉ" "Déploiement échoué à '${failed_step}'. Rollback vers ${latest_release} effectué."
    else
        error "Aucune release précédente disponible pour le rollback !"
        notify_slack "failure" "❌ Déploiement échoué à '${failed_step}'. AUCUN ROLLBACK possible !"
        notify_email "CRITIQUE" "Déploiement échoué à '${failed_step}' ET aucune release de rollback disponible !"
    fi

    # Désactiver le mode maintenance si encore actif
    run "${PHP_BIN}" "${ARTISAN}" maintenance:off 2>/dev/null || true

    exit 1
}

# ─── Trap pour rollback automatique ──────────────────────────────────────────
CURRENT_STEP="init"
trap 'rollback "${CURRENT_STEP}"' ERR

# ═════════════════════════════════════════════════════════════════════════════
# DÉBUT DU DÉPLOIEMENT
# ═════════════════════════════════════════════════════════════════════════════
mkdir -p "${LOG_DIR}" "${ROLLBACK_DIR}"
echo "" >> "${DEPLOY_LOG}"
echo "════════════════════════════════════════════" >> "${DEPLOY_LOG}"
log "Démarrage du déploiement ${DEPLOY_ID}"
log "Branche : ${BRANCH} | DRY-RUN : ${DRY_RUN} | SKIP-BUILD : ${SKIP_BUILD}"
[[ "${DRY_RUN}" == "true" ]] && warn "Mode DRY-RUN activé - aucune modification ne sera appliquée"

# ─── ÉTAPE 0 : Vérification des prérequis ────────────────────────────────────
step "0 / 11 - Vérification des prérequis"
CURRENT_STEP="prérequis"

# Vérifier les binaires
for bin in "${PHP_BIN}" "${COMPOSER_BIN}" git node npm supervisor; do
    if ! command -v "${bin}" &>/dev/null && [[ ! -x "${bin}" ]]; then
        error "Binaire introuvable : ${bin}"
        exit 1
    fi
done

# Vérifier la version PHP
PHP_VERSION=$(${PHP_BIN} -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
if [[ "${PHP_VERSION}" != "8.2" && "${PHP_VERSION}" != "8.3" ]]; then
    error "PHP 8.2+ requis, version actuelle : ${PHP_VERSION}"
    exit 1
fi

# Vérifier que le répertoire existe
[[ -d "${APP_DIR}" ]] || { error "Répertoire introuvable : ${APP_DIR}"; exit 1; }

# Vérifier l'espace disque (minimum 2 Go libres)
DISK_FREE=$(df -BG "${APP_DIR}" | awk 'NR==2{print $4}' | tr -d 'G')
if (( DISK_FREE < 2 )); then
    error "Espace disque insuffisant : ${DISK_FREE}Go libres (minimum 2Go requis)"
    exit 1
fi

# Vérifier la connexion à la base de données
run "${PHP_BIN}" "${ARTISAN}" db:monitor --databases=pgsql 2>/dev/null || \
    { error "Impossible de se connecter à PostgreSQL"; exit 1; }

success "Prérequis validés (PHP ${PHP_VERSION}, disque : ${DISK_FREE}Go libres)"

# ─── ÉTAPE 1 : Sauvegarde de la release courante ────────────────────────────
step "1 / 11 - Sauvegarde de la release courante"
CURRENT_STEP="sauvegarde release"

if [[ -d "${APP_DIR}" ]]; then
    log "Sauvegarde vers ${ROLLBACK_DIR}/${DEPLOY_ID}"
    run mkdir -p "${ROLLBACK_DIR}/${DEPLOY_ID}"
    run rsync -a \
        --exclude=".git" \
        --exclude="node_modules" \
        --exclude="vendor" \
        --exclude="storage/logs" \
        "${APP_DIR}/" \
        "${ROLLBACK_DIR}/${DEPLOY_ID}/"
    success "Release sauvegardée"

    # Nettoyage des vieilles releases
    RELEASE_COUNT=$(ls -1 "${ROLLBACK_DIR}" | wc -l)
    if (( RELEASE_COUNT > MAX_RELEASES )); then
        log "Nettoyage des releases excédentaires (conservation : ${MAX_RELEASES})"
        ls -1t "${ROLLBACK_DIR}" | tail -n +$((MAX_RELEASES + 1)) | \
            xargs -I{} rm -rf "${ROLLBACK_DIR}/{}"
    fi
fi

# ─── ÉTAPE 2 : Git pull ───────────────────────────────────────────────────────
step "2 / 11 - Mise à jour du code source (git pull)"
CURRENT_STEP="git pull"
cd "${APP_DIR}"

CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log "Commit actuel : ${CURRENT_COMMIT}"

run git fetch origin "${BRANCH}"
run git checkout "${BRANCH}"
run git reset --hard "origin/${BRANCH}"
run git submodule update --init --recursive 2>/dev/null || true

NEW_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
log "Nouveau commit : ${NEW_COMMIT}"
COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null || echo "")
log "Message : ${COMMIT_MSG}"
success "Code mis à jour"

# ─── ÉTAPE 3 : Composer install ───────────────────────────────────────────────
step "3 / 11 - Installation des dépendances PHP (Composer)"
CURRENT_STEP="composer install"
cd "${APP_DIR}"

run "${COMPOSER_BIN}" install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --no-progress \
    --prefer-dist

success "Dépendances PHP installées"

# ─── ÉTAPE 4 : Build assets frontend ─────────────────────────────────────────
step "4 / 11 - Build des assets frontend (npm ci + build)"
CURRENT_STEP="npm build"

if [[ "${SKIP_BUILD}" == "false" ]]; then
    # Le frontend peut être dans un répertoire séparé
    FRONTEND_DIR="${APP_DIR}/../frontend"
    [[ -d "${FRONTEND_DIR}" ]] || FRONTEND_DIR="${APP_DIR}"

    cd "${FRONTEND_DIR}"

    if [[ -f "package.json" ]]; then
        run npm ci --prefer-offline
        run npm run build
        success "Assets frontend buildés"
    else
        warn "Aucun package.json trouvé, skip du build frontend"
    fi
else
    warn "Build frontend ignoré (--skip-build)"
fi

cd "${APP_DIR}"

# ─── ÉTAPE 5 : Mode maintenance ON ───────────────────────────────────────────
step "5 / 11 - Activation du mode maintenance"
CURRENT_STEP="maintenance on"

run "${PHP_BIN}" "${ARTISAN}" maintenance:on \
    --message="Mise à jour en cours, retour dans quelques minutes" \
    --retry=60

success "Mode maintenance activé"

# ─── ÉTAPE 6 : Migrations de base de données ─────────────────────────────────
step "6 / 11 - Migrations de base de données"
CURRENT_STEP="migrations"

# Vérifier s'il y a des migrations en attente
PENDING=$(run "${PHP_BIN}" "${ARTISAN}" migrate:status 2>/dev/null | grep "^| No" | wc -l || echo "0")
log "Migrations en attente : ${PENDING}"

run "${PHP_BIN}" "${ARTISAN}" migrate --force --no-interaction

success "Migrations exécutées"

# ─── ÉTAPE 7 : Cache Laravel ──────────────────────────────────────────────────
step "7 / 11 - Régénération des caches Laravel"
CURRENT_STEP="cache"

run "${PHP_BIN}" "${ARTISAN}" config:clear
run "${PHP_BIN}" "${ARTISAN}" config:cache
run "${PHP_BIN}" "${ARTISAN}" route:clear
run "${PHP_BIN}" "${ARTISAN}" route:cache
run "${PHP_BIN}" "${ARTISAN}" view:clear
run "${PHP_BIN}" "${ARTISAN}" view:cache
run "${PHP_BIN}" "${ARTISAN}" event:cache 2>/dev/null || true
run "${PHP_BIN}" "${ARTISAN}" icons:cache 2>/dev/null || true

success "Caches régénérés"

# ─── ÉTAPE 8 : Redémarrage Queue Workers ──────────────────────────────────────
step "8 / 11 - Redémarrage des Queue Workers"
CURRENT_STEP="queue restart"

run "${PHP_BIN}" "${ARTISAN}" queue:restart
sleep 2   # Laisser les workers s'arrêter proprement

# Redémarrage via Supervisor
if command -v supervisorctl &>/dev/null; then
    run supervisorctl restart secretis-worker:*
    success "Queue workers redémarrés via Supervisor"
else
    warn "supervisorctl non disponible, workers redémarrés via artisan uniquement"
fi

# ─── ÉTAPE 9 : Redémarrage Reverb ────────────────────────────────────────────
step "9 / 11 - Redémarrage de Laravel Reverb (WebSocket)"
CURRENT_STEP="reverb restart"

if command -v supervisorctl &>/dev/null; then
    run supervisorctl restart secretis-reverb 2>/dev/null || \
        warn "Reverb non configuré dans Supervisor, tentative directe..."
else
    warn "supervisorctl non disponible pour Reverb"
fi

success "Reverb redémarré"

# ─── ÉTAPE 10 : Mode maintenance OFF ─────────────────────────────────────────
step "10 / 11 - Désactivation du mode maintenance"
CURRENT_STEP="maintenance off"

run "${PHP_BIN}" "${ARTISAN}" maintenance:off

success "Mode maintenance désactivé - Application en ligne"

# ─── ÉTAPE 11 : Rapport de déploiement ───────────────────────────────────────
step "11 / 11 - Rapport de déploiement"
CURRENT_STEP="rapport"

DEPLOY_END=$(date '+%Y-%m-%d %H:%M:%S')
DEPLOY_DURATION=$(($(date +%s) - $(date -d "${TIMESTAMP//_/ }" +%s 2>/dev/null || date +%s)))

# Vérification de santé finale
HEALTH_STATUS="OK"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    "https://secretis.ibigsoft.com/api/health" 2>/dev/null || echo "000")

if [[ "${HTTP_CODE}" != "200" ]]; then
    warn "Health check retourné : HTTP ${HTTP_CODE}"
    HEALTH_STATUS="ATTENTION (HTTP ${HTTP_CODE})"
fi

REPORT="
═══════════════════════════════════════════════════
  RAPPORT DE DÉPLOIEMENT SECRETIS ERP
═══════════════════════════════════════════════════
  Deploy ID    : ${DEPLOY_ID}
  Branche      : ${BRANCH}
  Commit avant : ${CURRENT_COMMIT}
  Commit après : ${NEW_COMMIT}
  Message      : ${COMMIT_MSG}
  Début        : ${TIMESTAMP//_/ }
  Fin          : ${DEPLOY_END}
  Health check : ${HEALTH_STATUS}
  Statut       : ✓ SUCCÈS
═══════════════════════════════════════════════════
"

echo -e "${GREEN}${REPORT}${NC}" | tee -a "${DEPLOY_LOG}"

# Notifications
notify_slack "success" "✅ Déploiement réussi\nCommit: ${NEW_COMMIT}\nMessage: ${COMMIT_MSG}\nHealth: ${HEALTH_STATUS}"
notify_email "SUCCÈS" "${REPORT}"

# Désactiver le trap (déploiement réussi)
trap - ERR
success "Déploiement ${DEPLOY_ID} terminé avec succès"
