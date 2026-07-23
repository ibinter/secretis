# Stage 1: Dependencies
FROM php:8.2-fpm-alpine AS dependencies
RUN apk add --no-cache git curl libpng-dev libxml2-dev zip unzip postgresql-dev redis
RUN docker-php-ext-install pdo pdo_pgsql gd xml bcmath pcntl
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Stage 2: Frontend build
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Stage 3: Production
FROM php:8.2-fpm-alpine AS production
RUN apk add --no-cache libpng libxml2 postgresql-libs
RUN docker-php-ext-install pdo pdo_pgsql gd xml bcmath pcntl opcache

# OPcache configuration optimisée
COPY deploy/docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY deploy/docker/php/php-prod.ini /usr/local/etc/php/conf.d/php-prod.ini

WORKDIR /var/www/html
COPY --chown=www-data:www-data . .
COPY --from=dependencies /var/www/html/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build

RUN composer dump-autoload --optimize --no-dev \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && php artisan event:cache

USER www-data
EXPOSE 9000
CMD ["php-fpm"]
