#!/bin/bash
# ============================================================
# IBIG SECRETIS — Build & Submit EAS
# Usage : ./build-and-submit.sh [platform] [profile]
#   platform : all | ios | android  (défaut : all)
#   profile  : development | preview | production  (défaut : production)
# ============================================================

set -euo pipefail

PLATFORM="${1:-all}"
PROFILE="${2:-production}"
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
echo -e "${BLUE}║       IBIG SECRETIS — Build & Submit EAS        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Platform : $PLATFORM"
log_info "Profile  : $PROFILE"
log_info "Répertoire mobile : $MOBILE_DIR"
echo ""

# ────────────────────────────────────────────────────────────
# Vérifications préalables
# ────────────────────────────────────────────────────────────

check_eas_cli() {
    log_info "Vérification EAS CLI..."
    if ! command -v eas &>/dev/null; then
        log_error "EAS CLI non trouvé. Installez-le : npm install -g eas-cli"
    fi
    EAS_VERSION=$(eas --version 2>/dev/null | head -1)
    log_success "EAS CLI trouvé : $EAS_VERSION"

    REQUIRED_MAJOR=10
    ACTUAL_MAJOR=$(echo "$EAS_VERSION" | grep -oE '[0-9]+' | head -1)
    if [ "$ACTUAL_MAJOR" -lt "$REQUIRED_MAJOR" ]; then
        log_error "EAS CLI v$REQUIRED_MAJOR+ requis. Mise à jour : npm install -g eas-cli"
    fi
}

check_node() {
    log_info "Vérification Node.js..."
    if ! command -v node &>/dev/null; then
        log_error "Node.js non trouvé. Installez Node.js 20+."
    fi
    NODE_VERSION=$(node --version)
    log_success "Node.js : $NODE_VERSION"
}

check_env_vars() {
    log_info "Vérification variables d'environnement..."
    local missing=()

    [ -z "${EXPO_TOKEN:-}" ]        && missing+=("EXPO_TOKEN")
    [ -z "${EAS_TOKEN:-${EXPO_TOKEN:-}}" ] || true  # EAS_TOKEN est un alias

    if [ "${#missing[@]}" -gt 0 ]; then
        log_error "Variables manquantes : ${missing[*]}
  Définissez EXPO_TOKEN dans votre environnement CI ou votre fichier .env.ci
  Exemple : export EXPO_TOKEN='xxx'"
    fi
    log_success "Variables d'environnement OK"
}

validate_version() {
    log_info "Validation de la version dans app.json..."
    if ! command -v jq &>/dev/null; then
        log_warning "jq non trouvé — validation de version ignorée"
        return 0
    fi

    APP_JSON="$MOBILE_DIR/app.json"
    if [ ! -f "$APP_JSON" ]; then
        log_error "app.json introuvable : $APP_JSON"
    fi

    VERSION=$(jq -r '.expo.version' "$APP_JSON")
    BUILD_NUMBER=$(jq -r '.expo.ios.buildNumber // "1"' "$APP_JSON")
    VERSION_CODE=$(jq -r '.expo.android.versionCode // 1' "$APP_JSON")

    log_success "Version app.json : $VERSION (iOS buildNumber: $BUILD_NUMBER | Android versionCode: $VERSION_CODE)"
}

check_google_services_key() {
    if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
        if [ "$PROFILE" = "production" ]; then
            KEY_FILE="$MOBILE_DIR/google-services-key.json"
            if [ ! -f "$KEY_FILE" ]; then
                log_warning "google-services-key.json introuvable — requis pour la soumission Android"
                log_warning "Chemin attendu : $KEY_FILE"
                log_warning "Obtenez ce fichier depuis Google Play Console > Setup > API access"
            else
                log_success "google-services-key.json trouvé"
            fi
        fi
    fi
}

check_prereqs() {
    check_node
    check_eas_cli
    check_env_vars
    validate_version
    check_google_services_key
    echo ""
    log_success "Tous les prérequis sont satisfaits"
    echo ""
}

# ────────────────────────────────────────────────────────────
# Build
# ────────────────────────────────────────────────────────────

build_ios() {
    log_info "Démarrage du build iOS (profile: $PROFILE)..."
    cd "$MOBILE_DIR"

    if [ "$PROFILE" = "development" ]; then
        eas build \
            --platform ios \
            --profile "$PROFILE" \
            --non-interactive \
            --local 2>&1 | tee /tmp/eas-build-ios.log
    else
        eas build \
            --platform ios \
            --profile "$PROFILE" \
            --non-interactive 2>&1 | tee /tmp/eas-build-ios.log
    fi

    log_success "Build iOS terminé"
}

build_android() {
    log_info "Démarrage du build Android (profile: $PROFILE)..."
    cd "$MOBILE_DIR"

    eas build \
        --platform android \
        --profile "$PROFILE" \
        --non-interactive 2>&1 | tee /tmp/eas-build-android.log

    log_success "Build Android terminé"
}

# ────────────────────────────────────────────────────────────
# Submit
# ────────────────────────────────────────────────────────────

submit_ios() {
    if [ "$PROFILE" != "production" ]; then
        log_warning "Soumission iOS ignorée pour le profil '$PROFILE' (production uniquement)"
        return 0
    fi

    log_info "Soumission du build iOS vers l'App Store Connect..."
    cd "$MOBILE_DIR"

    eas submit \
        --platform ios \
        --profile production \
        --latest \
        --non-interactive 2>&1 | tee /tmp/eas-submit-ios.log

    log_success "Soumission iOS terminée — vérifiez App Store Connect"
}

submit_android() {
    if [ "$PROFILE" != "production" ]; then
        log_warning "Soumission Android ignorée pour le profil '$PROFILE' (production uniquement)"
        return 0
    fi

    log_info "Soumission du build Android vers le Google Play Store..."
    cd "$MOBILE_DIR"

    eas submit \
        --platform android \
        --profile production \
        --latest \
        --non-interactive 2>&1 | tee /tmp/eas-submit-android.log

    log_success "Soumission Android terminée — vérifiez la Google Play Console"
}

# ────────────────────────────────────────────────────────────
# Exécution
# ────────────────────────────────────────────────────────────

check_prereqs

case "$PLATFORM" in
    "ios")
        build_ios
        submit_ios
        ;;
    "android")
        build_android
        submit_android
        ;;
    "all")
        # Build iOS et Android en parallèle
        log_info "Démarrage des builds iOS et Android en parallèle..."
        build_ios &
        IOS_PID=$!
        build_android &
        ANDROID_PID=$!

        # Attendre les deux builds
        wait $IOS_PID
        IOS_EXIT=$?
        wait $ANDROID_PID
        ANDROID_EXIT=$?

        if [ $IOS_EXIT -ne 0 ]; then
            log_error "Le build iOS a échoué (code $IOS_EXIT). Consultez /tmp/eas-build-ios.log"
        fi
        if [ $ANDROID_EXIT -ne 0 ]; then
            log_error "Le build Android a échoué (code $ANDROID_EXIT). Consultez /tmp/eas-build-android.log"
        fi

        log_success "Les deux builds sont terminés"
        echo ""

        # Soumissions séquentielles
        submit_ios
        submit_android
        ;;
    *)
        log_error "Plateforme invalide : '$PLATFORM'. Valeurs acceptées : ios | android | all"
        ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Build & Submit terminé avec succès !        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
log_info "Prochaines étapes :"
if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
    echo "  - iOS : Vérifiez App Store Connect → TestFlight pour activer le build"
    echo "  - iOS : Remplissez les métadonnées store et soumettez à la révision Apple"
fi
if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
    echo "  - Android : Vérifiez Google Play Console → Internal testing"
    echo "  - Android : Promouvez vers Production avec rollout 10% → 50% → 100%"
fi
echo ""
