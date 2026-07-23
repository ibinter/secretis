#!/bin/bash
# ============================================================
# IBIG SECRETIS — Publication OTA (Over-The-Air Update)
# Publie une mise à jour JS sans re-soumission aux stores.
# Usage : ./publish-update.sh [channel] [message]
#   channel : production | preview | development  (défaut : production)
#   message : description de la mise à jour (défaut : "Améliorations et corrections")
# ============================================================

set -euo pipefail

CHANNEL="${1:-production}"
MESSAGE="${2:-Améliorations et corrections}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     IBIG SECRETIS — Publication OTA Update      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Channel : $CHANNEL"
log_info "Message : $MESSAGE"
echo ""

# ────────────────────────────────────────────────────────────
# Vérifications
# ────────────────────────────────────────────────────────────

log_info "Vérification EAS CLI..."
if ! command -v eas &>/dev/null; then
    log_error "EAS CLI non trouvé. Installez-le : npm install -g eas-cli"
fi
log_success "EAS CLI : $(eas --version 2>/dev/null | head -1)"

if [ -z "${EXPO_TOKEN:-}" ]; then
    log_error "EXPO_TOKEN non défini. Exportez votre token : export EXPO_TOKEN='xxx'"
fi
log_success "EXPO_TOKEN défini"

# Vérification du channel
VALID_CHANNELS=("production" "preview" "development")
VALID=false
for c in "${VALID_CHANNELS[@]}"; do
    [ "$CHANNEL" = "$c" ] && VALID=true && break
done
if [ "$VALID" = false ]; then
    log_error "Channel invalide : '$CHANNEL'. Valeurs acceptées : production | preview | development"
fi

# Avertissement pour production
if [ "$CHANNEL" = "production" ]; then
    log_warning "Vous publiez sur le channel PRODUCTION."
    log_warning "Cette mise à jour sera reçue par TOUS les utilisateurs au prochain démarrage."
    echo ""
    read -r -p "Confirmez-vous la publication OTA en production ? [y/N] : " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
        log_info "Publication annulée."
        exit 0
    fi
fi

# ────────────────────────────────────────────────────────────
# Vérification runtimeVersion
# ────────────────────────────────────────────────────────────

log_info "Vérification de la compatibilité runtimeVersion..."
if command -v jq &>/dev/null; then
    APP_VERSION=$(jq -r '.expo.version' "$MOBILE_DIR/app.json" 2>/dev/null || echo "inconnue")
    RUNTIME_POLICY=$(jq -r '.expo.runtimeVersion.policy // "sdkVersion"' "$MOBILE_DIR/app.json" 2>/dev/null || echo "inconnue")
    log_info "Version app : $APP_VERSION | Politique runtimeVersion : $RUNTIME_POLICY"

    if [ "$RUNTIME_POLICY" = "appVersion" ]; then
        log_info "La mise à jour OTA est compatible avec les builds de version $APP_VERSION uniquement."
    fi
fi

# ────────────────────────────────────────────────────────────
# Publication
# ────────────────────────────────────────────────────────────

cd "$MOBILE_DIR"

log_info "Démarrage de la publication OTA..."
echo ""

eas update \
    --channel "$CHANNEL" \
    --message "$MESSAGE" \
    --non-interactive 2>&1

echo ""
log_success "Mise à jour OTA publiée sur le channel '$CHANNEL' !"
echo ""
log_info "Comportement côté utilisateurs :"
log_info "  - Au prochain démarrage de l'app, la mise à jour est téléchargée en arrière-plan"
log_info "  - Au second démarrage, la nouvelle version est active"
log_info "  - Délai moyen de propagation : < 5 minutes pour les utilisateurs connectés"
echo ""
log_info "Surveillance :"
log_info "  - Dashboard EAS : https://expo.dev/accounts/ibigsoft/projects/ibig-secretis/updates"
log_info "  - Taux d'adoption visible dans EAS Insights après 30 minutes"
echo ""
