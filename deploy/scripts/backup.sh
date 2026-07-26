#!/bin/sh
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_BACKUP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"
STORAGE_BACKUP_FILE="${BACKUP_DIR}/storage_${DATE}.tar.gz"

echo "Demarrage sauvegarde ${DATE}..."

# Sauvegarde PostgreSQL
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST}" \
  -U "${DB_USERNAME}" \
  -d "${DB_DATABASE}" \
  --verbose \
  | gzip > "${DB_BACKUP_FILE}"

echo "BDD sauvegardee : ${DB_BACKUP_FILE}"

# Sauvegarde du storage
tar -czf "${STORAGE_BACKUP_FILE}" /app_storage 2>/dev/null || true
echo "Storage sauvegarde : ${STORAGE_BACKUP_FILE}"

# Nettoyer les sauvegardes > BACKUP_RETENTION_DAYS jours
find "${BACKUP_DIR}" -name "*.gz" -mtime "+${BACKUP_RETENTION_DAYS:-30}" -delete
echo "Anciennes sauvegardes nettoyees"

# Upload S3 si configuré
if [ -n "${S3_BUCKET}" ]; then
  aws s3 cp "${DB_BACKUP_FILE}" "s3://${S3_BUCKET}/db/" --sse AES256
  aws s3 cp "${STORAGE_BACKUP_FILE}" "s3://${S3_BUCKET}/storage/" --sse AES256
  echo "Sauvegarde sur S3 : ${S3_BUCKET}"
fi

echo "Sauvegarde terminee : ${DATE}"
