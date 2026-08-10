#!/bin/bash
set -e

echo "Deploiement IBIG SECRETIS..."
echo "Branche : $(git rev-parse --abbrev-ref HEAD)"
echo "Commit : $(git rev-parse --short HEAD)"

# Maintenance mode
docker compose -f deploy/docker/docker-compose.prod.yml exec -T app \
  php artisan down --render="errors/503" --retry=60

# Pull derniers changements
git pull origin main

# Build et restart
docker compose -f deploy/docker/docker-compose.prod.yml up -d --build app queue scheduler reverb

# Migrations
docker compose -f deploy/docker/docker-compose.prod.yml exec -T app \
  php artisan migrate --force

# Caches
docker compose -f deploy/docker/docker-compose.prod.yml exec -T app \
  bash -c "php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache"

# Restart queue
docker compose -f deploy/docker/docker-compose.prod.yml exec -T app \
  php artisan queue:restart

# Sortir du mode maintenance
docker compose -f deploy/docker/docker-compose.prod.yml exec -T app \
  php artisan up

echo "Deploiement termine !"
echo "URL : https://app.secretis.ibigsoft.com"
