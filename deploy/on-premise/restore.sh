#!/usr/bin/env bash
# =============================================================================
# SECRETIS ERP — Script de restauration On-Premise
# Usage : ./restore.sh [--backup=FICHIER] [--list]
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
log()    { echo -e "$(date '+%H:%M:%S') ${GREEN}[✓]${NC} $*"; }
warn()   { echo -e "$(date '+%H:%M:%S') ${YELLOW}[!]${NC} $*"; }
error()  { echo -e "$(date '+%H:%M:%S') ${RED}[✗]${NC} $*" >&2; }
confirm(){ read -rp "$(echo -e "${YELLOW}$* [y/N] :${NC} ")" ans; [[ "${ans:-N}" =~ ^[Yy]$ ]]; }

INSTALL_DIR="${INSTALL_DIR:-/opt/secretis}"
BACKUP_FILE=""
LIST_MODE=false
WORK_DIR="/tmp/secretis_restore_$$"

source "$INSTALL_DIR/.env" 2>/dev/null || true
BACKUP_DIR="${BACKUP_LOCAL_PATH:-/backups/secretis}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

parse_args() {
    for arg in "$@"; do
        case $arg in
            --backup=*)      BACKUP_FILE="${arg#*=}" ;;
            --install-dir=*) INSTALL_DIR="${arg#*=}" ;;
            --list)          LIST_MODE=true ;;
        esac
    done
}

# -----------------------------------------------------------------------------
list_backups() {
    echo -e "\n${BOLD}Sauvegardes disponibles :${NC}\n"

    local count=0
    printf "%-5s %-45s %-10s %-20s\n" "N°" "Fichier" "Taille" "Date"
    printf "%s\n" "$(printf '%.0s─' {1..85})"

    for dir in daily weekly monthly; do
        local dir_path="$BACKUP_DIR/$dir"
        if [[ -d "$dir_path" ]]; then
            echo -e "\n  ${BOLD}[$dir]${NC}"
            while IFS= read -r file; do
                [[ "$file" == *.sha256 ]] && continue
                ((count++))
                local size=$(du -sh "$file" 2>/dev/null | cut -f1 || echo "?")
                local date=$(stat -c %y "$file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1 || echo "?")
                printf "  %-3s %-45s %-10s %-20s\n" "$count" "$(basename "$file")" "$size" "$date"
                BACKUP_LIST[$count]="$file"
            done < <(ls -t "$dir_path"/secretis_backup_* 2>/dev/null || true)
        fi
    done

    echo ""
    if [[ $count -eq 0 ]]; then
        warn "Aucune sauvegarde trouvée dans $BACKUP_DIR"
    fi
}

select_backup_interactive() {
    declare -gA BACKUP_LIST=()
    list_backups

    if [[ ${#BACKUP_LIST[@]} -eq 0 ]]; then
        error "Aucune sauvegarde disponible."
        exit 1
    fi

    read -rp "Entrez le numéro de la sauvegarde à restaurer : " choice
    BACKUP_FILE="${BACKUP_LIST[$choice]:-}"

    if [[ -z "$BACKUP_FILE" ]]; then
        error "Numéro invalide : $choice"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
verify_backup() {
    log "Vérification de l'intégrité de la sauvegarde..."

    if [[ ! -f "$BACKUP_FILE" ]]; then
        error "Fichier de sauvegarde introuvable : $BACKUP_FILE"
        exit 1
    fi

    local sha256_file="${BACKUP_FILE}.sha256"
    if [[ -f "$sha256_file" ]]; then
        if sha256sum -c "$sha256_file" --status; then
            log "Intégrité SHA-256 vérifiée ✓"
        else
            error "Intégrité compromise ! La sauvegarde est corrompue."
            exit 1
        fi
    else
        warn "Fichier SHA-256 absent. Vérification ignorée."
    fi
}

# -----------------------------------------------------------------------------
decrypt_backup() {
    log "Déchiffrement de la sauvegarde..."

    mkdir -p "$WORK_DIR"

    if [[ "$BACKUP_FILE" == *.enc ]]; then
        if [[ -z "$ENCRYPTION_KEY" ]]; then
            read -rsp "Clé de chiffrement : " ENCRYPTION_KEY
            echo ""
        fi
        local decrypted="$WORK_DIR/backup.tar.gz"
        openssl enc -aes-256-cbc -d \
            -pbkdf2 -iter 100000 \
            -pass "pass:$ENCRYPTION_KEY" \
            -in "$BACKUP_FILE" \
            -out "$decrypted"
        ARCHIVE_FILE="$decrypted"
        log "Archive déchiffrée"
    else
        ARCHIVE_FILE="$BACKUP_FILE"
    fi
}

# -----------------------------------------------------------------------------
extract_backup() {
    log "Extraction de l'archive..."
    tar -xzf "$ARCHIVE_FILE" -C "$WORK_DIR"
    log "Archive extraite dans $WORK_DIR"

    ls "$WORK_DIR"/
}

# -----------------------------------------------------------------------------
restore_database() {
    log "Restauration de la base de données..."

    local dump_file="$WORK_DIR/database.sql.gz"
    if [[ ! -f "$dump_file" ]]; then
        error "Dump de base de données non trouvé dans l'archive"
        exit 1
    fi

    cd "$INSTALL_DIR"

    # Arrêter les services qui utilisent la DB
    docker compose stop app queue-worker scheduler reverb 2>/dev/null || true
    sleep 5

    # Supprimer et recréer la base
    log "Suppression et recréation de la base de données..."
    docker compose exec -T postgres psql \
        -U "${DB_USERNAME:-secretis}" \
        -c "DROP DATABASE IF EXISTS ${DB_DATABASE:-secretis};" postgres
    docker compose exec -T postgres psql \
        -U "${DB_USERNAME:-secretis}" \
        -c "CREATE DATABASE ${DB_DATABASE:-secretis};" postgres

    # Restauration
    log "Import des données..."
    zcat "$dump_file" | docker compose exec -T postgres pg_restore \
        -U "${DB_USERNAME:-secretis}" \
        -d "${DB_DATABASE:-secretis}" \
        --no-password \
        --verbose \
        -F custom 2>&1 | tail -20

    log "Base de données restaurée ✓"

    # Redémarrer les services
    docker compose start app queue-worker scheduler reverb 2>/dev/null || \
    docker compose up -d
}

# -----------------------------------------------------------------------------
restore_files() {
    log "Restauration des fichiers MinIO..."

    local files_dir="$WORK_DIR/files"
    if [[ ! -d "$files_dir" ]]; then
        warn "Répertoire files/ absent de l'archive. Restauration fichiers ignorée."
        return
    fi

    cd "$INSTALL_DIR"

    # Attendre MinIO
    local retries=0
    until docker compose exec -T minio mc ready local &>/dev/null 2>&1; do
        ((retries++))
        if [[ $retries -ge 20 ]]; then
            warn "MinIO non disponible. Restauration fichiers ignorée."
            return
        fi
        sleep 3
    done

    # Upload des fichiers vers MinIO
    if [[ -d "$files_dir/documents" ]]; then
        docker run --rm \
            --network "${COMPOSE_PROJECT_NAME:-on-premise}_backend" \
            -v "$files_dir:/restore:ro" \
            minio/mc:latest \
            sh -c "
                mc alias set dst http://minio:9000 '${MINIO_ROOT_USER:-secretis-admin}' '${MINIO_ROOT_PASSWORD}' &&
                mc mirror --preserve /restore/documents dst/secretis-documents
            "
        log "Fichiers documents restaurés ✓"
    fi

    if [[ -d "$files_dir/backups" ]]; then
        docker run --rm \
            --network "${COMPOSE_PROJECT_NAME:-on-premise}_backend" \
            -v "$files_dir:/restore:ro" \
            minio/mc:latest \
            sh -c "
                mc alias set dst http://minio:9000 '${MINIO_ROOT_USER:-secretis-admin}' '${MINIO_ROOT_PASSWORD}' &&
                mc mirror --preserve /restore/backups dst/secretis-backups
            "
        log "Fichiers backups restaurés ✓"
    fi
}

# -----------------------------------------------------------------------------
post_restore_tasks() {
    log "Tâches post-restauration..."

    cd "$INSTALL_DIR"

    docker compose exec -T app php artisan migrate --force --no-interaction
    docker compose exec -T app php artisan config:cache
    docker compose exec -T app php artisan route:cache
    docker compose exec -T app php artisan view:cache
    docker compose exec -T app php artisan cache:clear
    docker compose exec -T app php artisan queue:restart

    log "Cache régénéré et queues redémarrées"
}

# -----------------------------------------------------------------------------
verify_restoration() {
    log "Vérification de la restauration..."

    source "$INSTALL_DIR/.env"
    local url="${APP_URL:-https://localhost}/health"

    local retries=0
    until curl -sf --max-time 10 "$url" &>/dev/null; do
        ((retries++))
        if [[ $retries -ge 20 ]]; then
            error "L'application ne répond pas après la restauration"
            return 1
        fi
        sleep 5
    done

    # Vérifier le nombre d'enregistrements en DB
    local user_count=$(docker compose -f "$INSTALL_DIR/docker-compose.yml" exec -T postgres \
        psql -U "${DB_USERNAME:-secretis}" -d "${DB_DATABASE:-secretis}" \
        -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "?")

    log "Application opérationnelle ✓"
    log "Utilisateurs en base : $user_count"
}

# -----------------------------------------------------------------------------
cleanup() {
    rm -rf "$WORK_DIR"
}

# =============================================================================
main() {
    parse_args "$@"

    if [[ $LIST_MODE == true ]]; then
        list_backups
        exit 0
    fi

    echo -e "\n${BOLD}=== RESTAURATION SECRETIS ERP ===${NC}\n"
    warn "La restauration va ÉCRASER les données actuelles !"

    if [[ -z "$BACKUP_FILE" ]]; then
        select_backup_interactive
    fi

    echo -e "\nSauvegarde sélectionnée : ${BOLD}$(basename "$BACKUP_FILE")${NC}"
    echo -e "Date : $(stat -c %y "$BACKUP_FILE" 2>/dev/null | cut -d'.' -f1 || echo '?')"
    echo ""

    if ! confirm "Confirmer la restauration ? Toutes les données actuelles seront remplacées."; then
        log "Restauration annulée."
        exit 0
    fi

    verify_backup
    decrypt_backup
    extract_backup
    restore_database
    restore_files
    post_restore_tasks
    verify_restoration
    cleanup

    echo ""
    log "=============================="
    log "Restauration terminée avec succès !"
    log "=============================="
}

main "$@"
