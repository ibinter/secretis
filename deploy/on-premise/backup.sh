#!/usr/bin/env bash
# =============================================================================
# SECRETIS ERP — Script de sauvegarde On-Premise
# Usage : ./backup.sh [--destination=local|s3|sftp|ftp] [--tag=LABEL]
# Planifier : 0 2 * * * /opt/secretis/backup.sh >> /var/log/secretis/backup.log 2>&1
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'
log()   { echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${YELLOW}[!]${NC} $*"; }
error() { echo -e "$(date '+%Y-%m-%d %H:%M:%S') ${RED}[✗]${NC} $*" >&2; }

INSTALL_DIR="${INSTALL_DIR:-/opt/secretis}"
BACKUP_TAG=""
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Charger la configuration
if [[ -f "$INSTALL_DIR/.env" ]]; then
    source "$INSTALL_DIR/.env"
fi

BACKUP_DIR="${BACKUP_LOCAL_PATH:-/backups/secretis}"
BACKUP_DESTINATION="${BACKUP_DESTINATION:-local}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
KEEP_DAILY="${BACKUP_KEEP_DAILY:-7}"
KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${BACKUP_KEEP_MONTHLY:-3}"

parse_args() {
    for arg in "$@"; do
        case $arg in
            --destination=*)   BACKUP_DESTINATION="${arg#*=}" ;;
            --tag=*)           BACKUP_TAG="-${arg#*=}" ;;
            --install-dir=*)   INSTALL_DIR="${arg#*=}" ;;
        esac
    done
}

BACKUP_NAME="secretis_backup_${TIMESTAMP}${BACKUP_TAG}"
WORK_DIR="/tmp/secretis_backup_$$"
LOG_FILE="${BACKUP_DIR}/logs/backup_${TIMESTAMP}.log"

setup() {
    mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly,logs}
    mkdir -p "$WORK_DIR"
    cd "$INSTALL_DIR"

    # Rediriger les logs vers le fichier
    exec > >(tee -a "$LOG_FILE") 2>&1

    log "=============================="
    log "Sauvegarde SECRETIS ERP"
    log "Timestamp : $TIMESTAMP"
    log "Destination : $BACKUP_DESTINATION"
    log "=============================="
}

# -----------------------------------------------------------------------------
backup_database() {
    log "Sauvegarde de la base de données PostgreSQL..."

    local dump_file="$WORK_DIR/database.sql.gz"

    docker compose exec -T postgres pg_dump \
        -U "${DB_USERNAME:-secretis}" \
        -d "${DB_DATABASE:-secretis}" \
        --no-password \
        --format=custom \
        --compress=9 \
        --verbose \
    | gzip -9 > "$dump_file"

    local size=$(du -sh "$dump_file" | cut -f1)
    log "Base de données sauvegardée ($size) : $dump_file"

    # Vérification intégrité
    if ! gzip -t "$dump_file" &>/dev/null; then
        error "Intégrité du dump DB compromise !"
        exit 1
    fi
    log "Intégrité du dump DB vérifiée ✓"
}

# -----------------------------------------------------------------------------
backup_minio() {
    log "Sauvegarde des fichiers MinIO..."

    local minio_dir="$WORK_DIR/files"
    mkdir -p "$minio_dir"

    # Synchronisation via mc (MinIO Client)
    docker run --rm \
        --network "${COMPOSE_PROJECT_NAME:-on-premise}_backend" \
        -v "$minio_dir:/backup" \
        minio/mc:latest \
        sh -c "
            mc alias set src http://minio:9000 '${MINIO_ROOT_USER:-secretis-admin}' '${MINIO_ROOT_PASSWORD}' &&
            mc mirror --preserve src/secretis-documents /backup/documents &&
            mc mirror --preserve src/secretis-backups   /backup/backups
        " 2>&1 || {
        warn "mc mirror échoué, tentative via rclone..."
        # Fallback : rclone si disponible
        if command -v rclone &>/dev/null; then
            rclone sync "minio:secretis-documents" "$minio_dir/documents" \
                --config /dev/null \
                --s3-provider=Minio \
                --s3-endpoint="http://localhost:9000" \
                --s3-access-key-id="${MINIO_USERNAME}" \
                --s3-secret-access-key="${MINIO_PASSWORD}" \
                --progress 2>&1 || warn "rclone également échoué"
        fi
    }

    local size=$(du -sh "$minio_dir" 2>/dev/null | cut -f1 || echo "?")
    log "Fichiers MinIO sauvegardés ($size)"
}

# -----------------------------------------------------------------------------
backup_env() {
    log "Sauvegarde de la configuration..."
    cp "$INSTALL_DIR/.env" "$WORK_DIR/env.conf"
    log "Configuration sauvegardée"
}

# -----------------------------------------------------------------------------
create_archive() {
    log "Création de l'archive compressée..."

    local archive_plain="$WORK_DIR/${BACKUP_NAME}.tar.gz"
    tar -czf "$archive_plain" -C "$WORK_DIR" \
        database.sql.gz \
        files/ \
        env.conf \
        --ignore-failed-read 2>/dev/null || true

    local size=$(du -sh "$archive_plain" | cut -f1)
    log "Archive créée ($size)"

    # Chiffrement AES-256
    if [[ -n "$ENCRYPTION_KEY" ]]; then
        log "Chiffrement AES-256 de l'archive..."
        local archive_enc="${archive_plain}.enc"
        openssl enc -aes-256-cbc \
            -pbkdf2 -iter 100000 \
            -pass "pass:$ENCRYPTION_KEY" \
            -in "$archive_plain" \
            -out "$archive_enc"
        rm -f "$archive_plain"
        FINAL_ARCHIVE="$archive_enc"
        log "Archive chiffrée : $archive_enc"
    else
        warn "Chiffrement désactivé (BACKUP_ENCRYPTION_KEY non défini)"
        FINAL_ARCHIVE="$archive_plain"
    fi

    # Empreinte SHA-256
    sha256sum "$FINAL_ARCHIVE" > "${FINAL_ARCHIVE}.sha256"
    log "SHA-256 : $(cat "${FINAL_ARCHIVE}.sha256" | cut -d' ' -f1)"
}

# -----------------------------------------------------------------------------
store_local() {
    log "Stockage local dans $BACKUP_DIR/daily/..."

    cp "$FINAL_ARCHIVE"         "$BACKUP_DIR/daily/${BACKUP_NAME}${FINAL_ARCHIVE##*$BACKUP_NAME}"
    cp "${FINAL_ARCHIVE}.sha256" "$BACKUP_DIR/daily/${BACKUP_NAME}.sha256"

    # Copies hebdomadaires (chaque lundi)
    if [[ $(date +%u) == 1 ]]; then
        cp "$BACKUP_DIR/daily/${BACKUP_NAME}${FINAL_ARCHIVE##*$BACKUP_NAME}" "$BACKUP_DIR/weekly/"
        cp "$BACKUP_DIR/daily/${BACKUP_NAME}.sha256" "$BACKUP_DIR/weekly/"
        log "Copie hebdomadaire créée"
    fi

    # Copies mensuelles (le 1er du mois)
    if [[ $(date +%d) == "01" ]]; then
        cp "$BACKUP_DIR/daily/${BACKUP_NAME}${FINAL_ARCHIVE##*$BACKUP_NAME}" "$BACKUP_DIR/monthly/"
        cp "$BACKUP_DIR/daily/${BACKUP_NAME}.sha256" "$BACKUP_DIR/monthly/"
        log "Copie mensuelle créée"
    fi

    log "Stockage local terminé"
}

# -----------------------------------------------------------------------------
store_s3() {
    log "Envoi vers S3 ($BACKUP_S3_BUCKET)..."

    if ! command -v aws &>/dev/null && ! command -v rclone &>/dev/null; then
        warn "aws-cli ni rclone disponible. Stockage S3 ignoré."
        return
    fi

    local s3_path="s3://${BACKUP_S3_BUCKET}/secretis/${BACKUP_NAME}${FINAL_ARCHIVE##*$BACKUP_NAME}"

    if command -v aws &>/dev/null; then
        AWS_ACCESS_KEY_ID="$BACKUP_S3_KEY" \
        AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET" \
        AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-eu-west-3}" \
        aws s3 cp "$FINAL_ARCHIVE" "$s3_path" --no-progress
        log "Envoyé vers $s3_path"
    fi
}

# -----------------------------------------------------------------------------
store_sftp() {
    log "Envoi vers SFTP (${BACKUP_SFTP_HOST})..."

    local remote_path="${BACKUP_SFTP_PATH:-/backups/secretis}/${BACKUP_NAME}${FINAL_ARCHIVE##*$BACKUP_NAME}"

    sshpass -p "$BACKUP_SFTP_PASSWORD" sftp \
        -o StrictHostKeyChecking=no \
        -o BatchMode=no \
        "${BACKUP_SFTP_USER}@${BACKUP_SFTP_HOST}" <<EOF
put $FINAL_ARCHIVE $remote_path
put ${FINAL_ARCHIVE}.sha256 ${remote_path}.sha256
bye
EOF
    log "Envoyé vers $BACKUP_SFTP_HOST:$remote_path"
}

# -----------------------------------------------------------------------------
rotate_backups() {
    log "Rotation des sauvegardes locales..."

    # Supprimer les anciennes sauvegardes journalières
    local deleted=0
    while IFS= read -r file; do
        rm -f "$file" "${file%.enc}.sha256" "${file}.sha256"
        ((deleted++)) || true
    done < <(ls -t "$BACKUP_DIR/daily/secretis_backup_"* 2>/dev/null | tail -n +$((KEEP_DAILY + 1)))
    [[ $deleted -gt 0 ]] && log "Supprimées : $deleted sauvegarde(s) journalière(s) anciennes"

    # Rotation hebdomadaire
    deleted=0
    while IFS= read -r file; do
        rm -f "$file" "${file}.sha256"
        ((deleted++)) || true
    done < <(ls -t "$BACKUP_DIR/weekly/secretis_backup_"* 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)))
    [[ $deleted -gt 0 ]] && log "Supprimées : $deleted sauvegarde(s) hebdomadaire(s) anciennes"

    # Rotation mensuelle
    deleted=0
    while IFS= read -r file; do
        rm -f "$file" "${file}.sha256"
        ((deleted++)) || true
    done < <(ls -t "$BACKUP_DIR/monthly/secretis_backup_"* 2>/dev/null | tail -n +$((KEEP_MONTHLY + 1)))
    [[ $deleted -gt 0 ]] && log "Supprimées : $deleted sauvegarde(s) mensuelle(s) anciennes"
}

# -----------------------------------------------------------------------------
notify() {
    local status="$1"
    local message="$2"

    log "Notification admin : $status"

    # Notification via Laravel
    if [[ -n "${ADMIN_EMAIL:-}" ]]; then
        docker compose exec -T app php artisan secretis:notify-admin \
            --subject="[SECRETIS Backup] $status" \
            --message="$message" \
            --email="$ADMIN_EMAIL" 2>/dev/null || \
        echo "$message" | mail -s "[SECRETIS Backup] $status" "$ADMIN_EMAIL" 2>/dev/null || true
    fi
}

# -----------------------------------------------------------------------------
cleanup() {
    log "Nettoyage des fichiers temporaires..."
    rm -rf "$WORK_DIR"
}

# =============================================================================
main() {
    parse_args "$@"
    setup

    local start_time=$SECONDS
    local success=true

    backup_database || { error "Échec sauvegarde DB"; success=false; }
    backup_minio    || { warn "Sauvegarde MinIO partielle"; }
    backup_env      || { warn "Sauvegarde config partielle"; }

    if [[ $success == true ]]; then
        create_archive
        store_local

        case "$BACKUP_DESTINATION" in
            s3)    store_s3 ;;
            sftp)  store_sftp ;;
            both)  store_s3; store_sftp ;;
            local) ;;
        esac

        rotate_backups
        cleanup

        local duration=$((SECONDS - start_time))
        local archive_size=$(du -sh "$BACKUP_DIR/daily/" 2>/dev/null | cut -f1 || echo "?")

        log "=============================="
        log "Sauvegarde terminée avec succès en ${duration}s"
        log "Stockage total : $archive_size"
        log "=============================="

        notify "SUCCÈS" "Sauvegarde SECRETIS du $(date '+%d/%m/%Y %H:%M') réussie en ${duration}s."
    else
        cleanup
        error "Sauvegarde ÉCHOUÉE"
        notify "ÉCHEC" "La sauvegarde SECRETIS du $(date '+%d/%m/%Y %H:%M') a échoué. Vérifiez les logs : $LOG_FILE"
        exit 1
    fi
}

main "$@"
