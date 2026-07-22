#!/bin/sh
# =============================================================================
# SECRETIS ERP — MinIO Initialization Script
# Crée les buckets, configure les politiques et l'utilisateur applicatif
# =============================================================================
set -e

MINIO_ALIAS="secretis-minio"
MINIO_URL="http://minio:9000"

echo "[MinIO Init] Attente de disponibilité de MinIO..."
until mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null; do
    echo "[MinIO Init] MinIO pas encore prêt, retry dans 3s..."
    sleep 3
done
echo "[MinIO Init] Connecté à MinIO."

# -----------------------------------------------------------------------------
# Création des buckets
# -----------------------------------------------------------------------------
echo "[MinIO Init] Création des buckets..."

for BUCKET in secretis-documents secretis-backups secretis-tmp; do
    if mc ls "${MINIO_ALIAS}/${BUCKET}" >/dev/null 2>&1; then
        echo "[MinIO Init] Bucket '${BUCKET}' déjà existant."
    else
        mc mb --ignore-existing "${MINIO_ALIAS}/${BUCKET}"
        echo "[MinIO Init] Bucket '${BUCKET}' créé."
    fi
done

# -----------------------------------------------------------------------------
# Politique d'accès : privé par défaut pour tous les buckets
# -----------------------------------------------------------------------------
echo "[MinIO Init] Configuration des politiques d'accès..."

mc anonymous set none "${MINIO_ALIAS}/secretis-documents"
mc anonymous set none "${MINIO_ALIAS}/secretis-backups"
mc anonymous set none "${MINIO_ALIAS}/secretis-tmp"
echo "[MinIO Init] Tous les buckets sont en accès privé."

# -----------------------------------------------------------------------------
# Politique fine pour l'utilisateur applicatif
# -----------------------------------------------------------------------------
cat > /tmp/secretis-app-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:ListBucketMultipartUploads",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": [
                "arn:aws:s3:::secretis-documents",
                "arn:aws:s3:::secretis-documents/*",
                "arn:aws:s3:::secretis-tmp",
                "arn:aws:s3:::secretis-tmp/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::secretis-backups",
                "arn:aws:s3:::secretis-backups/*"
            ]
        }
    ]
}
EOF

mc admin policy create "$MINIO_ALIAS" secretis-app-policy /tmp/secretis-app-policy.json
echo "[MinIO Init] Politique 'secretis-app-policy' créée."

# -----------------------------------------------------------------------------
# Création de l'utilisateur applicatif
# -----------------------------------------------------------------------------
echo "[MinIO Init] Création de l'utilisateur applicatif..."

if mc admin user info "$MINIO_ALIAS" "$MINIO_APP_USER" >/dev/null 2>&1; then
    echo "[MinIO Init] Utilisateur '${MINIO_APP_USER}' déjà existant."
    mc admin user enable "$MINIO_ALIAS" "$MINIO_APP_USER"
else
    mc admin user add "$MINIO_ALIAS" "$MINIO_APP_USER" "$MINIO_APP_PASSWORD"
    echo "[MinIO Init] Utilisateur '${MINIO_APP_USER}' créé."
fi

mc admin policy attach "$MINIO_ALIAS" secretis-app-policy --user "$MINIO_APP_USER"
echo "[MinIO Init] Politique attachée à l'utilisateur '${MINIO_APP_USER}'."

# -----------------------------------------------------------------------------
# Règles de cycle de vie (nettoyage fichiers temporaires)
# -----------------------------------------------------------------------------
echo "[MinIO Init] Configuration du cycle de vie du bucket tmp..."
cat > /tmp/lifecycle-tmp.json <<EOF
{
    "Rules": [
        {
            "ID": "delete-tmp-after-24h",
            "Status": "Enabled",
            "Filter": {
                "Prefix": ""
            },
            "Expiration": {
                "Days": 1
            }
        }
    ]
}
EOF
mc ilm import "${MINIO_ALIAS}/secretis-tmp" < /tmp/lifecycle-tmp.json || true

# Versionning sur le bucket documents
mc version enable "${MINIO_ALIAS}/secretis-documents" || true
echo "[MinIO Init] Versionning activé sur 'secretis-documents'."

# Nettoyage
rm -f /tmp/secretis-app-policy.json /tmp/lifecycle-tmp.json

echo "[MinIO Init] ✓ Initialisation MinIO terminée avec succès."
