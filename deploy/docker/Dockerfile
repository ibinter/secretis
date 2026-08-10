# =============================================================================
# SECRETIS ERP - Dockerfile Multi-Stage
# Base : PHP 8.2 FPM Alpine
# Auteur  : IBIG SOFT
# Version : 1.0.0
#
# Stages :
#   1. deps     - Dépendances PHP (Composer)
#   2. frontend - Build assets (Node.js + Vite)
#   3. production - Image finale (PHP-FPM, non-root)
# =============================================================================

# ─── Stage 1 : Dépendances PHP ───────────────────────────────────────────────
FROM composer:2.7 AS composer-deps

WORKDIR /app

# Copier uniquement ce qui est nécessaire pour Composer (cache layer optimal)
COPY backend/composer.json backend/composer.lock ./

# Installer les dépendances de production sans les scripts
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-scripts \
    --no-interaction \
    --no-progress \
    --prefer-dist

# Copier le reste du code et exécuter les scripts post-install
COPY backend/ ./
RUN composer run-script post-autoload-dump 2>/dev/null || true

# ─── Stage 2 : Build des assets frontend ────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Installer les dépendances npm (cache layer)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --prefer-offline

# Copier les sources frontend et builder
COPY frontend/ ./
RUN npm run build

# ─── Stage 3 : Image de production ───────────────────────────────────────────
FROM php:8.2-fpm-alpine AS production

# Métadonnées
LABEL maintainer="IBIG SOFT <contact@ibigsoft.com>"
LABEL description="SECRETIS ERP - PHP-FPM Production"
LABEL version="1.0.0"

# ─── Arguments de build ───────────────────────────────────────────────────────
ARG APP_ENV=production
ARG APP_USER=secretis
ARG APP_UID=1000
ARG APP_GID=1000

# ─── Variables d'environnement de base ────────────────────────────────────────
ENV APP_ENV=${APP_ENV} \
    APP_USER=${APP_USER} \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0 \
    PHP_OPCACHE_MAX_ACCELERATED_FILES=20000 \
    PHP_OPCACHE_MEMORY_CONSUMPTION=256 \
    TZ=Africa/Abidjan

# ─── Installation des dépendances système ─────────────────────────────────────
RUN apk add --no-cache \
    # Dépendances PostgreSQL
    libpq-dev \
    # Dépendances GD (images)
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    # Dépendances ZIP
    libzip-dev \
    # Dépendances XML
    libxml2-dev \
    # Dépendances INTL
    icu-dev \
    # Dépendances Imagick
    imagemagick-dev \
    imagemagick \
    # Outils système
    bash \
    curl \
    git \
    postgresql-client \
    shadow \
    # Timezone
    tzdata \
    # OpenSSL pour chiffrement backup
    openssl

# ─── Installation des extensions PHP ─────────────────────────────────────────
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        mbstring \
        bcmath \
        xml \
        intl \
        opcache \
        pcntl \
        exif \
        sockets

# Extension Redis via PECL
RUN pecl install redis-6.0.2 \
    && docker-php-ext-enable redis

# Extension Imagick via PECL
RUN pecl install imagick-3.7.0 \
    && docker-php-ext-enable imagick

# ─── Configuration PHP production ─────────────────────────────────────────────
COPY deploy/docker/php/php-production.ini /usr/local/etc/php/conf.d/99-secretis.ini
COPY deploy/docker/php/php-fpm.conf /usr/local/etc/php-fpm.d/zz-secretis.conf

# Si les fichiers de config PHP n'existent pas encore, créer des configs par défaut
RUN if [ ! -f /usr/local/etc/php/conf.d/99-secretis.ini ]; then \
    echo "[PHP]" > /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "upload_max_filesize = 50M" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "post_max_size = 55M" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "expose_php = Off" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "opcache.enable = 1" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "opcache.memory_consumption = 256" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "opcache.validate_timestamps = 0" >> /usr/local/etc/php/conf.d/99-secretis.ini && \
    echo "date.timezone = Africa/Abidjan" >> /usr/local/etc/php/conf.d/99-secretis.ini; \
fi

# ─── Création de l'utilisateur non-root ──────────────────────────────────────
RUN addgroup -g ${APP_GID} ${APP_USER} \
    && adduser -u ${APP_UID} -G ${APP_USER} -s /bin/bash -D ${APP_USER} \
    && addgroup ${APP_USER} www-data

# ─── Répertoire de l'application ──────────────────────────────────────────────
WORKDIR /var/www/secretis/backend

# ─── Copie du code et des dépendances depuis les stages précédents ───────────
# Dépendances PHP (vendor/)
COPY --from=composer-deps --chown=${APP_USER}:www-data /app/vendor/ ./vendor/

# Code source Laravel
COPY --chown=${APP_USER}:www-data backend/ ./

# Assets frontend buildés (dist/ → public/)
COPY --from=frontend-builder --chown=${APP_USER}:www-data /app/dist/ ./public/build/

# ─── Permissions ─────────────────────────────────────────────────────────────
RUN mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R ${APP_USER}:www-data \
        storage/ \
        bootstrap/cache/ \
    && chmod -R 775 \
        storage/ \
        bootstrap/cache/

# ─── Entrypoint ───────────────────────────────────────────────────────────────
COPY deploy/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Basculer vers l'utilisateur non-root
USER ${APP_USER}

# Port PHP-FPM
EXPOSE 9000

# Healthcheck PHP-FPM
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD php-fpm -t || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm", "--nodaemonize"]
