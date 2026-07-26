#!/usr/bin/env bash
# =============================================================================
# scripts/pre-launch-check.sh
# IBIG SECRETIS ERP — Vérification pré-lancement
#
# Ce script vérifie les 10 conditions nécessaires avant une mise en production.
# Exécuter depuis la racine du projet : bash scripts/pre-launch-check.sh
#
# Usage :
#   bash scripts/pre-launch-check.sh              # Vérification complète
#   bash scripts/pre-launch-check.sh --quick      # Sans vérifications SSL/cron
#   bash scripts/pre-launch-check.sh --fix        # Tente de corriger automatiquement
#
# Codes de retour :
#   0 = PRÊT POUR LE LANCEMENT
#   1 = BLOQUANTS détectés
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Couleurs et formatage
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
BLOCKERS=()
WARNINGS=()
QUICK_MODE=false
FIX_MODE=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Parsing des arguments
for arg in "$@"; do
  case $arg in
    --quick) QUICK_MODE=true ;;
    --fix)   FIX_MODE=true ;;
  esac
done

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

pass() {
  local msg="$1"
  PASS_COUNT=$((PASS_COUNT + 1))
  echo -e "  ${GREEN}✅ PASS${NC} — ${msg}"
}

fail() {
  local msg="$1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  BLOCKERS+=("${msg}")
  echo -e "  ${RED}❌ BLOQUANT${NC} — ${msg}"
}

warn() {
  local msg="$1"
  WARN_COUNT=$((WARN_COUNT + 1))
  WARNINGS+=("${msg}")
  echo -e "  ${YELLOW}⚠️  ATTENTION${NC} — ${msg}"
}

info() {
  echo -e "  ${BLUE}ℹ️  INFO${NC} — $1"
}

section() {
  echo ""
  echo -e "${BOLD}━━━ $1 ━━━${NC}"
}

run_artisan() {
  php "${PROJECT_ROOT}/artisan" "$@" 2>&1
}

# Vérifier que PHP et Artisan sont disponibles
if ! command -v php &>/dev/null; then
  echo -e "${RED}ERREUR FATALE${NC} : PHP n'est pas installé ou n'est pas dans le PATH."
  exit 1
fi

if [ ! -f "${PROJECT_ROOT}/artisan" ]; then
  echo -e "${RED}ERREUR FATALE${NC} : Fichier artisan non trouvé dans ${PROJECT_ROOT}"
  exit 1
fi

# -----------------------------------------------------------------------------
# En-tête
# -----------------------------------------------------------------------------
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        IBIG SECRETIS ERP — VÉRIFICATION PRÉ-LANCEMENT           ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "  Répertoire projet : ${PROJECT_ROOT}"
echo -e "  Date              : $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Mode rapide       : ${QUICK_MODE}"
echo -e "  Mode correctif    : ${FIX_MODE}"

# =============================================================================
# 1. MIGRATIONS
# =============================================================================
section "1/10 — Migrations de base de données"

MIGRATE_STATUS=$(run_artisan migrate:status --no-interaction 2>&1 || true)

if echo "${MIGRATE_STATUS}" | grep -qi "pending\|not.*run\|no.*ran"; then
  PENDING_COUNT=$(echo "${MIGRATE_STATUS}" | grep -c "No\|pending" || echo "?")
  fail "Des migrations sont en attente (${PENDING_COUNT} migration(s) non appliquée(s))"
  if [ "${FIX_MODE}" = "true" ]; then
    info "Tentative d'application des migrations..."
    if run_artisan migrate --force --no-interaction 2>&1; then
      info "Migrations appliquées avec succès."
    else
      warn "Échec de l'application automatique des migrations."
    fi
  fi
elif echo "${MIGRATE_STATUS}" | grep -qi "error\|exception\|connection"; then
  fail "Impossible de vérifier les migrations — connexion base de données échouée"
else
  pass "Toutes les migrations sont appliquées"
fi

# =============================================================================
# 2. CACHE (config, routes, vues)
# =============================================================================
section "2/10 — Cache Laravel (config, routes, vues)"

# Vérifier si le cache de configuration existe
CONFIG_CACHED=false
if [ -f "${PROJECT_ROOT}/bootstrap/cache/config.php" ]; then
  CONFIG_CACHED=true
fi

if [ "${CONFIG_CACHED}" = "true" ]; then
  pass "Cache de configuration présent (bootstrap/cache/config.php)"
else
  if [ "${FIX_MODE}" = "true" ]; then
    info "Génération du cache de configuration..."
    if run_artisan config:cache --no-interaction 2>&1; then
      pass "Cache de configuration généré"
    else
      fail "Échec de la génération du cache de configuration"
    fi
  else
    warn "Cache de configuration absent — exécuter : php artisan config:cache"
  fi
fi

# Routes
ROUTE_CACHED=false
if [ -f "${PROJECT_ROOT}/bootstrap/cache/routes-v7.php" ] || \
   [ -f "${PROJECT_ROOT}/bootstrap/cache/routes.php" ]; then
  ROUTE_CACHED=true
fi

if [ "${ROUTE_CACHED}" = "true" ]; then
  pass "Cache des routes présent"
else
  if [ "${FIX_MODE}" = "true" ]; then
    info "Génération du cache des routes..."
    if run_artisan route:cache --no-interaction 2>&1; then
      pass "Cache des routes généré"
    else
      fail "Échec de la génération du cache des routes"
    fi
  else
    warn "Cache des routes absent — exécuter : php artisan route:cache"
  fi
fi

# Vues
VIEW_CACHED=false
if [ -d "${PROJECT_ROOT}/storage/framework/views" ] && \
   [ -n "$(ls -A "${PROJECT_ROOT}/storage/framework/views" 2>/dev/null)" ]; then
  VIEW_CACHED=true
fi

if [ "${VIEW_CACHED}" = "true" ]; then
  pass "Cache des vues présent"
else
  if [ "${FIX_MODE}" = "true" ]; then
    info "Génération du cache des vues..."
    if run_artisan view:cache --no-interaction 2>&1; then
      pass "Cache des vues généré"
    else
      warn "Échec du cache des vues (peut être normal en env sans Blade)"
    fi
  else
    warn "Cache des vues absent — exécuter : php artisan view:cache"
  fi
fi

# =============================================================================
# 3. HORIZON (jobs en queue)
# =============================================================================
section "3/10 — Laravel Horizon (workers de queue)"

HORIZON_STATUS=$(run_artisan horizon:status --no-interaction 2>&1 || true)

if echo "${HORIZON_STATUS}" | grep -qi "running\|active"; then
  pass "Laravel Horizon est actif"
elif echo "${HORIZON_STATUS}" | grep -qi "paused"; then
  fail "Laravel Horizon est en pause — exécuter : php artisan horizon:continue"
elif echo "${HORIZON_STATUS}" | grep -qi "inactive\|stopped\|not running"; then
  fail "Laravel Horizon n'est pas en cours d'exécution — démarrer avec : php artisan horizon"
else
  # Vérifier via le processus système
  if pgrep -f "artisan horizon" > /dev/null 2>&1; then
    pass "Processus Horizon détecté (via pgrep)"
  else
    warn "Statut Horizon indéterminé : ${HORIZON_STATUS}"
    info "Vérifier manuellement : php artisan horizon:status"
  fi
fi

# =============================================================================
# 4. REDIS
# =============================================================================
section "4/10 — Connexion Redis"

REDIS_TEST=$(run_artisan tinker --no-interaction 2>/dev/null <<'PHP' || echo "error"
echo json_encode(['status' => Cache::store('redis')->put('secretis_prelaunch_ping', 'pong', 10) ? 'ok' : 'fail']);
PHP
)

if echo "${REDIS_TEST}" | grep -q '"status":"ok"'; then
  pass "Connexion Redis opérationnelle (cache read/write OK)"
else
  # Tentative via redis-cli
  REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  if command -v redis-cli &>/dev/null && redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" ping 2>/dev/null | grep -q "PONG"; then
    pass "Redis répond (PONG) — vérifier la configuration Laravel si le cache échoue"
  else
    fail "Redis inaccessible — vérifier REDIS_HOST, REDIS_PORT et que le service Redis est démarré"
  fi
fi

# =============================================================================
# 5. BASE DE DONNÉES
# =============================================================================
section "5/10 — Connexion base de données PostgreSQL"

DB_TEST=$(run_artisan tinker --no-interaction 2>/dev/null <<'PHP' || echo "error"
try {
  DB::connection()->getPdo();
  $count = DB::table('users')->count();
  echo json_encode(['status' => 'ok', 'users' => $count]);
} catch (Exception $e) {
  echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
PHP
)

if echo "${DB_TEST}" | grep -q '"status":"ok"'; then
  USER_COUNT=$(echo "${DB_TEST}" | grep -oP '"users":\K[0-9]+' || echo "?")
  pass "Connexion PostgreSQL opérationnelle (${USER_COUNT} utilisateur(s) en base)"
else
  DB_ERROR=$(echo "${DB_TEST}" | grep -oP '"message":"\K[^"]+' || echo "connexion échouée")
  fail "Base de données inaccessible : ${DB_ERROR}"
fi

# =============================================================================
# 6. ESPACE DISQUE
# =============================================================================
section "6/10 — Espace disque disponible"

STORAGE_PATH="${PROJECT_ROOT}/storage"
REQUIRED_MB=1024  # 1 GB minimum

if command -v df &>/dev/null; then
  # Espace disponible en mégaoctets
  AVAILABLE_MB=$(df -m "${STORAGE_PATH}" 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")

  if [ "${AVAILABLE_MB}" -ge "${REQUIRED_MB}" ] 2>/dev/null; then
    AVAILABLE_GB=$(echo "scale=1; ${AVAILABLE_MB}/1024" | bc 2>/dev/null || echo "${AVAILABLE_MB} Mo")
    pass "Espace disque suffisant : ${AVAILABLE_GB} Go disponibles (minimum : 1 Go)"
  else
    fail "Espace disque insuffisant : ${AVAILABLE_MB} Mo disponibles (minimum requis : 1 024 Mo / 1 Go)"
  fi
else
  warn "Commande 'df' non disponible — impossible de vérifier l'espace disque"
fi

# Vérifier aussi le répertoire de logs
LOG_PATH="${PROJECT_ROOT}/storage/logs"
if [ -d "${LOG_PATH}" ] && ! [ -w "${LOG_PATH}" ]; then
  fail "Répertoire de logs non accessible en écriture : ${LOG_PATH}"
fi

# =============================================================================
# 7. CLÉS API CRITIQUES
# =============================================================================
section "7/10 — Variables d'environnement critiques"

ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "${ENV_FILE}" ]; then
  fail "Fichier .env absent : ${ENV_FILE}"
  ENV_FILE=""
fi

check_env_var() {
  local var_name="$1"
  local description="$2"
  local is_critical="${3:-true}"

  local value=""
  if [ -n "${ENV_FILE}" ]; then
    value=$(grep -E "^${var_name}=" "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
  fi
  # Aussi vérifier l'environnement courant
  value="${value:-${!var_name:-}}"

  if [ -z "${value}" ] || [ "${value}" = "null" ] || echo "${value}" | grep -qE "^(your_|CHANGE_ME|xxx|placeholder|sk-xxx)"; then
    if [ "${is_critical}" = "true" ]; then
      fail "Variable ${var_name} non configurée ou invalide (${description})"
    else
      warn "Variable ${var_name} non configurée (${description}) — fonctionnalité optionnelle"
    fi
  else
    # Masquer la valeur pour la sécurité
    local masked="${value:0:4}****${value: -4}"
    pass "${var_name} configurée (${description})"
  fi
}

check_env_var "APP_KEY"                 "Clé de chiffrement Laravel"
check_env_var "APP_ENV"                 "Environnement (doit être 'production')"
check_env_var "APP_URL"                 "URL de l'application"
check_env_var "DB_PASSWORD"             "Mot de passe base de données"
check_env_var "CINETPAY_API_KEY"        "Clé API CinetPay"
check_env_var "CINETPAY_SITE_ID"        "Site ID CinetPay"
check_env_var "CINETPAY_WEBHOOK_SECRET" "Secret HMAC webhooks CinetPay"
check_env_var "GROQ_API_KEY"            "Clé API Groq (SARA IA)"
check_env_var "REVERB_APP_KEY"          "Laravel Reverb WebSocket App Key"
check_env_var "REVERB_APP_SECRET"       "Laravel Reverb WebSocket App Secret"
check_env_var "MAIL_USERNAME"           "Identifiant SMTP (emails transactionnels)"
check_env_var "MAIL_PASSWORD"           "Mot de passe SMTP"
check_env_var "FILESYSTEM_DISK"         "Driver de stockage de fichiers"

# Vérifier APP_ENV = production
APP_ENV_VALUE=$(grep -E "^APP_ENV=" "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || echo "")
if [ "${APP_ENV_VALUE}" != "production" ]; then
  if [ "${APP_ENV_VALUE}" = "staging" ]; then
    warn "APP_ENV=${APP_ENV_VALUE} — confirmer que c'est intentionnel pour cet environnement"
  else
    fail "APP_ENV=${APP_ENV_VALUE} — doit être 'production' en mise en production"
  fi
fi

# Vérifier APP_DEBUG = false
APP_DEBUG_VALUE=$(grep -E "^APP_DEBUG=" "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || echo "")
if [ "${APP_DEBUG_VALUE}" = "true" ]; then
  fail "APP_DEBUG=true — CRITIQUE : ne jamais déployer avec le mode debug activé en production"
fi

# =============================================================================
# 8. CERTIFICAT SSL
# =============================================================================
section "8/10 — Certificat SSL"

if [ "${QUICK_MODE}" = "true" ]; then
  warn "Vérification SSL ignorée (mode rapide)"
else
  APP_URL_VALUE=$(grep -E "^APP_URL=" "${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | tr -d '"' || echo "")
  APP_HOST=$(echo "${APP_URL_VALUE}" | sed -E 's|https?://||' | cut -d'/' -f1 | cut -d':' -f1)

  if [ -z "${APP_HOST}" ]; then
    warn "Impossible de déterminer le domaine depuis APP_URL — vérification SSL ignorée"
  elif echo "${APP_HOST}" | grep -q "localhost\|127\.0\.0\.1"; then
    info "Hôte local détecté (${APP_HOST}) — vérification SSL ignorée"
  elif command -v openssl &>/dev/null; then
    SSL_OUTPUT=$(echo "" | openssl s_client -connect "${APP_HOST}:443" -servername "${APP_HOST}" 2>/dev/null || true)
    SSL_DATES=$(echo "${SSL_OUTPUT}" | openssl x509 -noout -dates 2>/dev/null || true)

    if [ -z "${SSL_DATES}" ]; then
      warn "Impossible de récupérer les dates du certificat SSL pour ${APP_HOST}"
    else
      NOT_AFTER=$(echo "${SSL_DATES}" | grep "notAfter" | cut -d'=' -f2)
      EXPIRY_EPOCH=$(date -d "${NOT_AFTER}" +%s 2>/dev/null || date -j -f "%b %e %T %Y %Z" "${NOT_AFTER}" +%s 2>/dev/null || echo "0")
      NOW_EPOCH=$(date +%s)
      DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

      if [ "${DAYS_LEFT}" -lt 0 ]; then
        fail "Certificat SSL EXPIRÉ (depuis ${DAYS_LEFT#-} jours) pour ${APP_HOST}"
      elif [ "${DAYS_LEFT}" -lt 30 ]; then
        fail "Certificat SSL expire dans ${DAYS_LEFT} jours — renouveler immédiatement (seuil : 30 jours)"
      elif [ "${DAYS_LEFT}" -lt 60 ]; then
        warn "Certificat SSL expire dans ${DAYS_LEFT} jours — prévoir le renouvellement sous 2 semaines"
      else
        pass "Certificat SSL valide pour ${DAYS_LEFT} jours (expire : ${NOT_AFTER})"
      fi
    fi
  else
    warn "OpenSSL non disponible — vérification SSL manuelle requise"
    info "Commande : echo '' | openssl s_client -connect ${APP_HOST}:443 | openssl x509 -noout -dates"
  fi
fi

# =============================================================================
# 9. SAUVEGARDES AUTOMATIQUES (cron)
# =============================================================================
section "9/10 — Sauvegardes automatiques"

if [ "${QUICK_MODE}" = "true" ]; then
  warn "Vérification cron ignorée (mode rapide)"
else
  # Vérifier que le scheduler Laravel est dans crontab
  CRON_CHECK=$(crontab -l 2>/dev/null || true)

  if echo "${CRON_CHECK}" | grep -q "artisan schedule:run"; then
    pass "Scheduler Laravel trouvé dans crontab"
  else
    # Vérifier les fichiers cron.d (Linux)
    CRON_D_CHECK=$(grep -r "artisan schedule:run" /etc/cron.d/ 2>/dev/null || true)
    if [ -n "${CRON_D_CHECK}" ]; then
      pass "Scheduler Laravel trouvé dans /etc/cron.d/"
    else
      fail "Scheduler Laravel (php artisan schedule:run) absent du crontab — les sauvegardes ne s'exécuteront pas automatiquement"
      info "Ajouter dans crontab : * * * * * php ${PROJECT_ROOT}/artisan schedule:run >> /dev/null 2>&1"
    fi
  fi

  # Vérifier la présence d'une sauvegarde récente (dernières 24h)
  BACKUP_PATH="${PROJECT_ROOT}/storage/app/backups"
  if [ -d "${BACKUP_PATH}" ]; then
    RECENT_BACKUP=$(find "${BACKUP_PATH}" -name "*.zip" -newer "${BACKUP_PATH}" -mtime -1 2>/dev/null || true)
    if [ -n "${RECENT_BACKUP}" ]; then
      LATEST_BACKUP=$(ls -t "${BACKUP_PATH}"/*.zip 2>/dev/null | head -1 || echo "")
      BACKUP_DATE=$(stat -c "%y" "${LATEST_BACKUP}" 2>/dev/null | cut -d'.' -f1 || echo "inconnue")
      pass "Sauvegarde récente trouvée (${BACKUP_DATE})"
    else
      warn "Aucune sauvegarde dans les dernières 24h — vérifier la commande backup:run"
      info "Exécuter manuellement : php artisan backup:run"
    fi
  else
    warn "Répertoire de sauvegardes absent : ${BACKUP_PATH}"
  fi
fi

# =============================================================================
# 10. AUDIT DE SÉCURITÉ
# =============================================================================
section "10/10 — Audit de sécurité (php artisan secretis:security-audit)"

SECURITY_AUDIT=$(run_artisan secretis:security-audit --no-interaction 2>&1 || true)

if echo "${SECURITY_AUDIT}" | grep -qi "critical\|critique\|0 erreur critique\|0 critical"; then
  if echo "${SECURITY_AUDIT}" | grep -qi "0 erreur critique\|0 critical error\|no critical"; then
    pass "Audit de sécurité : 0 erreur critique détectée"
  else
    # Compter les erreurs critiques
    CRITICAL_COUNT=$(echo "${SECURITY_AUDIT}" | grep -ci "critical\|critique" || echo "?")
    fail "Audit de sécurité : ${CRITICAL_COUNT} erreur(s) critique(s) détectée(s)"
    echo ""
    echo -e "${RED}  Détail des erreurs critiques :${NC}"
    echo "${SECURITY_AUDIT}" | grep -i "critical\|critique" | head -10 | while IFS= read -r line; do
      echo "    ${line}"
    done
  fi
elif echo "${SECURITY_AUDIT}" | grep -qi "not found\|command not found\|Unknown command"; then
  warn "Commande 'secretis:security-audit' non disponible — vérification manuelle requise"
  info "Vérifier manuellement :"
  info "  - APP_DEBUG=false en production"
  info "  - Clés API non exposées dans les logs"
  info "  - Rate limiting activé sur les endpoints sensibles"
  info "  - CSRF protection active (VerifyCsrfToken middleware)"
else
  # Commande disponible mais sortie imprévue
  CRITICAL_LINES=$(echo "${SECURITY_AUDIT}" | grep -ci "❌\|FAIL\|ERROR\|critical" || echo "0")
  if [ "${CRITICAL_LINES}" -gt 0 ]; then
    fail "Audit de sécurité : ${CRITICAL_LINES} problème(s) détecté(s)"
    echo "${SECURITY_AUDIT}" | head -20
  else
    pass "Audit de sécurité : aucune erreur critique"
  fi
fi

# Vérifications de sécurité additionnelles indépendantes de l'artisan command
# S'assurer que le fichier .env n'est pas accessible publiquement
ENV_PUBLIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL_VALUE:-http://localhost}/.env" 2>/dev/null || echo "000")
if [ "${ENV_PUBLIC_CHECK}" = "200" ]; then
  fail "CRITIQUE SÉCURITÉ : Le fichier .env est accessible publiquement via HTTP ! Bloquer immédiatement."
else
  pass "Fichier .env non accessible publiquement (HTTP ${ENV_PUBLIC_CHECK})"
fi

# =============================================================================
# RÉSUMÉ FINAL
# =============================================================================
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  RÉSUMÉ — VÉRIFICATION PRÉ-LANCEMENT IBIG SECRETIS ERP${NC}"
echo -e "${BOLD}══════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Vérifications passées${NC}    : ${BOLD}${PASS_COUNT}${NC}"
echo -e "  ${YELLOW}Avertissements${NC}           : ${BOLD}${WARN_COUNT}${NC}"
echo -e "  ${RED}BLOQUANTS${NC}                : ${BOLD}${FAIL_COUNT}${NC}"
echo ""

if [ "${FAIL_COUNT}" -gt 0 ]; then
  echo -e "${RED}${BOLD}  ❌ NON PRÊT POUR LE LANCEMENT${NC}"
  echo ""
  echo -e "${RED}  Points bloquants à corriger :${NC}"
  for blocker in "${BLOCKERS[@]}"; do
    echo -e "  ${RED}  ▸${NC} ${blocker}"
  done
  echo ""

  if [ "${WARN_COUNT}" -gt 0 ]; then
    echo -e "${YELLOW}  Avertissements (non bloquants) :${NC}"
    for warning in "${WARNINGS[@]}"; do
      echo -e "  ${YELLOW}  ▸${NC} ${warning}"
    done
    echo ""
  fi

  echo -e "  Corriger les ${FAIL_COUNT} point(s) bloquant(s) et relancer :"
  echo -e "  ${BOLD}bash scripts/pre-launch-check.sh${NC}"
  echo ""
  exit 1
else
  echo -e "${GREEN}${BOLD}  ✅ PRÊT POUR LE LANCEMENT${NC}"
  echo ""

  if [ "${WARN_COUNT}" -gt 0 ]; then
    echo -e "${YELLOW}  Avertissements (non bloquants, à traiter sous 72h) :${NC}"
    for warning in "${WARNINGS[@]}"; do
      echo -e "  ${YELLOW}  ▸${NC} ${warning}"
    done
    echo ""
  fi

  echo -e "  ${GREEN}Toutes les vérifications critiques sont passées.${NC}"
  echo -e "  ${GREEN}Le système IBIG SECRETIS ERP peut être mis en production.${NC}"
  echo ""
  exit 0
fi
