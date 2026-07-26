#!/bin/bash
# =============================================================================
# SECRETIS ERP - Docker Entrypoint
# Exécuté au démarrage du container avant PHP-FPM
# =============================================================================

set -e

APP_DIR="/var/www/secretis/backend"
PHP="/usr/local/bin/php"
ARTISAN="${APP_DIR}/artisan"

echo "═══════════════════════════════════════════"
echo "  SECRETIS ERP - Démarrage du container"
echo "  ENV : ${APP_ENV:-production}"
echo "═══════════════════════════════════════════"

# Attendre que PostgreSQL soit prêt
wait_for_postgres() {
    echo "Attente de PostgreSQL..."
    local max_tries=30
    local count=0
    until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-secretis_db}" -q; do
        count=$((count + 1))
        if [ $count -ge $max_tries ]; then
            echo "ERREUR : PostgreSQL non disponible après ${max_tries} tentatives"
            exit 1
        fi
        echo "PostgreSQL non disponible, attente... (${count}/${max_tries})"
        sleep 2
    done
    echo "✓ PostgreSQL prêt"
}

# Attendre que Redis soit prêt
wait_for_redis() {
    echo "Attente de Redis..."
    local max_tries=20
    local count=0
    until redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" -a "${REDIS_PASSWORD:-}" ping 2>/dev/null | grep -q PONG; do
        count=$((count + 1))
        if [ $count -ge $max_tries ]; then
            echo "AVERTISSEMENT : Redis non disponible (continuons quand même)"
            break
        fi
        echo "Redis non disponible, attente... (${count}/${max_tries})"
        sleep 2
    done
    echo "✓ Redis prêt"
}

# Exécuter les migrations
run_migrations() {
    echo "Exécution des migrations..."
    ${PHP} ${ARTISAN} migrate --force --no-interaction
    echo "✓ Migrations OK"
}

# Optimiser Laravel pour la production
optimize_app() {
    echo "Optimisation Laravel..."
    ${PHP} ${ARTISAN} config:cache
    ${PHP} ${ARTISAN} route:cache
    ${PHP} ${ARTISAN} view:cache
    ${PHP} ${ARTISAN} event:cache 2>/dev/null || true
    echo "✓ Optimisation OK"
}

# Créer le lien symbolique storage
link_storage() {
    if [ ! -L "${APP_DIR}/public/storage" ]; then
        ${PHP} ${ARTISAN} storage:link --force 2>/dev/null || true
        echo "✓ Lien storage créé"
    fi
}

# ─── Séquence de démarrage ────────────────────────────────────────────────────
wait_for_postgres
wait_for_redis
run_migrations
optimize_app
link_storage

echo "✓ Container SECRETIS prêt"
echo ""

# Lancer la commande passée en argument (par défaut : php-fpm)
exec "$@"
