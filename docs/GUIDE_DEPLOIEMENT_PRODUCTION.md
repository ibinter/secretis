# SECRETIS ERP — Guide de déploiement en production

> Version 2.0 | Docker + GitHub Actions | Dernière révision : janvier 2026

---

## Prérequis

- Serveur Ubuntu 22.04 LTS ou Debian 12 (min. 4 vCPU / 8 Go RAM / 100 Go SSD)
- Docker Engine 24+ et Docker Compose V2
- Nom de domaine avec certificat TLS (Let's Encrypt ou certificat wildcard)
- Accès SSH avec sudo
- Accès à un registre Docker (Docker Hub ou GHCR)

---

## Checklist de déploiement

### 1. Infrastructure

- [ ] Serveur provisionné et accessible par SSH
- [ ] Docker et Docker Compose V2 installés
- [ ] Pare-feu configuré (ports 80, 443 ouverts ; 5432, 6379 fermés à l'extérieur)
- [ ] Certificat TLS valide configuré
- [ ] DNS pointant vers l'IP du serveur
- [ ] Swap configuré (min. 4 Go si < 8 Go RAM)

### 2. Environnement

- [ ] Fichier `.env` copié et toutes les variables renseignées (voir section Variables)
- [ ] `APP_ENV=production` défini
- [ ] `APP_DEBUG=false` défini
- [ ] `APP_KEY` généré (`php artisan key:generate`)
- [ ] `DB_PASSWORD` fort (min. 32 caractères, caractères spéciaux)
- [ ] Secrets stockés dans Docker Secrets ou gestionnaire de secrets (pas en clair)

### 3. Base de données

- [ ] PostgreSQL 16 opérationnel
- [ ] Base de données `secretis_prod` créée
- [ ] Utilisateur dédié avec droits minimaux
- [ ] Migrations appliquées (`php artisan migrate --force`)
- [ ] Seeders de production exécutés
- [ ] Connexion depuis l'application testée
- [ ] Sauvegardes automatiques planifiées

### 4. Redis

- [ ] Redis 7 opérationnel
- [ ] Mot de passe Redis configuré
- [ ] `maxmemory-policy allkeys-lru` défini
- [ ] Persistance AOF activée

### 5. Stockage

- [ ] Bucket S3 (ou compatible) créé pour la GED
- [ ] Credentials AWS/S3 configurés
- [ ] Politique de rétention des backups définie (30 jours minimum)
- [ ] `php artisan storage:link` exécuté

### 6. Mail

- [ ] SMTP configuré et testé (`php artisan secretis:test-email admin@org.ci`)
- [ ] Adresse `MAIL_FROM_ADDRESS` vérifiée chez le fournisseur
- [ ] SPF / DKIM / DMARC configurés pour éviter le spam

### 7. Application

- [ ] `composer install --no-dev --optimize-autoloader` exécuté
- [ ] `npm ci && npm run build` exécuté
- [ ] `php artisan config:cache` exécuté
- [ ] `php artisan route:cache` exécuté
- [ ] `php artisan view:cache` exécuté
- [ ] Workers de queue démarrés et supervisés (Supervisor)
- [ ] Scheduler cron configuré

### 8. Sécurité

- [ ] Headers de sécurité Nginx configurés (CSP, HSTS, X-Frame-Options)
- [ ] Rate limiting activé
- [ ] 2FA forcé pour les comptes admin
- [ ] Journal d'audit activé
- [ ] Accès SuperAdmin restreint à des IPs connues (si applicable)

### 9. Monitoring

- [ ] Healthcheck endpoint `/status` répondant 200
- [ ] Alertes configurées (uptime monitoring)
- [ ] Logs centralisés (Syslog / CloudWatch / Loki)
- [ ] Métriques serveur surveillées (CPU, RAM, disque)

### 10. Tests pré-lancement

- [ ] Connexion utilisateur testée
- [ ] Création d'un événement testée
- [ ] Upload de document testé
- [ ] Envoi d'email testé
- [ ] SARA répond correctement
- [ ] Backup manuel déclenché et vérifié
- [ ] Rollback testé en environnement de staging

---

## Variables d'environnement obligatoires

```env
# Application
APP_NAME="SECRETIS ERP"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://erp.votre-domaine.com
APP_KEY=base64:XXXX...    # php artisan key:generate

# Base de données PostgreSQL
DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=secretis_prod
DB_USERNAME=secretis
DB_PASSWORD=XXXX...        # min 32 chars

# Redis
REDIS_URL=redis://:MOT_DE_PASSE@redis:6379
REDIS_CLIENT=predis

# Sessions & Cache
SESSION_DRIVER=redis
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis

# Email
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailprovider.com
MAIL_PORT=587
MAIL_USERNAME=no-reply@votre-domaine.com
MAIL_PASSWORD=XXXX...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@votre-domaine.com
MAIL_FROM_NAME="SECRETIS ERP"

# Stockage S3
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=XXXX
AWS_SECRET_ACCESS_KEY=XXXX
AWS_DEFAULT_REGION=eu-west-3
AWS_BUCKET=secretis-prod-documents
AWS_URL=https://secretis-prod-documents.s3.eu-west-3.amazonaws.com

# IA — SARA (OpenAI)
OPENAI_API_KEY=sk-XXXX
OPENAI_MODEL=gpt-4o

# Sanctum
SANCTUM_STATEFUL_DOMAINS=erp.votre-domaine.com
SESSION_DOMAIN=.votre-domaine.com

# Sécurité
BCRYPT_ROUNDS=12
FORCE_HTTPS=true

# Notifications Push (Firebase Cloud Messaging)
FIREBASE_CREDENTIALS=/run/secrets/firebase_credentials

# Paiements (Stripe — optionnel)
STRIPE_KEY=pk_live_XXXX
STRIPE_SECRET=sk_live_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX
```

---

## docker-compose.prod.yml — structure

```yaml
version: "3.9"

services:
  nginx:
    image: nginx:1.26-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./deploy/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - ./frontend/public/build:/var/www/html/public/build:ro
      - certbot-certs:/etc/letsencrypt:ro
    depends_on: [app]
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s

  app:
    image: ghcr.io/ibig/secretis-erp:${TAG:-latest}
    env_file: .env
    volumes:
      - app-storage:/var/www/html/storage
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "php", "artisan", "health:check"]
      interval: 30s
      timeout: 10s
      retries: 3

  queue:
    image: ghcr.io/ibig/secretis-erp:${TAG:-latest}
    command: php artisan queue:work --sleep=3 --tries=3 --max-time=3600
    env_file: .env
    depends_on: [app]
    deploy:
      replicas: 2

  scheduler:
    image: ghcr.io/ibig/secretis-erp:${TAG:-latest}
    command: sh -c "while true; do php artisan schedule:run --no-interaction; sleep 60; done"
    env_file: .env
    depends_on: [app]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: secretis_prod
      POSTGRES_USER: secretis
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U secretis -d secretis_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru --appendonly yes
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

volumes:
  pgdata:
  redisdata:
  app-storage:
  certbot-certs:

secrets:
  db_password:
    file: ./secrets/db_password.txt
  firebase_credentials:
    file: ./secrets/firebase.json
```

---

## Healthchecks

### Endpoint applicatif

```
GET /status
```

**Réponse 200 (healthy) :**

```json
{
  "status": "ok",
  "version": "2.0.0",
  "environment": "production",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "queue": "ok",
    "storage": "ok"
  },
  "timestamp": "2026-01-15T10:00:00Z"
}
```

**Réponse 503 (unhealthy) :**

```json
{
  "status": "degraded",
  "checks": {
    "database": "ok",
    "redis": "error: Connection refused",
    "queue": "ok",
    "storage": "ok"
  }
}
```

### Commandes de diagnostic

```bash
# Vérifier l'état de l'application
docker compose exec app php artisan health:check

# Vérifier la connexion base de données
docker compose exec app php artisan db:monitor

# Vérifier les workers
docker compose exec app php artisan queue:monitor

# Taille des queues
docker compose exec app php artisan queue:size

# Logs en temps réel
docker compose logs -f app

# Logs des erreurs uniquement
docker compose logs app 2>&1 | grep -i error
```

---

## Déploiement blue/green (zéro downtime)

```bash
# 1. Construire la nouvelle image
TAG=$(git rev-parse --short HEAD)
docker build -t ghcr.io/ibig/secretis-erp:$TAG ./backend

# 2. Pousser l'image
docker push ghcr.io/ibig/secretis-erp:$TAG

# 3. Déployer progressivement
TAG=$TAG docker compose up -d --no-deps --scale app=2 app

# 4. Vérifier le health du nouveau conteneur
sleep 10
docker compose ps app

# 5. Supprimer l'ancienne instance
docker compose up -d --no-deps --scale app=1 app

# 6. Appliquer les migrations (sans interruption)
docker compose exec app php artisan migrate --force

# 7. Vider les caches
docker compose exec app php artisan config:cache
docker compose exec app php artisan route:cache
docker compose exec app php artisan queue:restart
```

---

## Procédure de rollback

En cas de problème après déploiement :

```bash
# 1. Identifier le tag précédent
docker image ls ghcr.io/ibig/secretis-erp --format "{{.Tag}}" | head -5

# 2. Revenir à la version précédente
export PREV_TAG=a1b2c3d  # tag du commit précédent
TAG=$PREV_TAG docker compose up -d --no-deps app queue scheduler

# 3. Si migration nécessaire (rollback DB)
docker compose exec app php artisan migrate:rollback --step=1

# 4. Vider les caches
docker compose exec app php artisan config:cache
docker compose exec app php artisan queue:restart

# 5. Vérifier
curl -f https://votre-domaine.com/status
```

**Note :** Toujours tester le rollback en staging avant un déploiement majeur.

---

## Sauvegardes

### Configuration automatique

```bash
# Crontab sur le serveur (backup quotidien à 2h du matin)
0 2 * * * docker compose -f /opt/secretis/docker-compose.prod.yml exec -T app php artisan secretis:backup >> /var/log/secretis-backup.log 2>&1

# Vérification hebdomadaire de la restauration (test sur staging)
0 3 * * 0 /opt/secretis/scripts/test-restore.sh >> /var/log/secretis-restore-test.log 2>&1
```

### Backup manuel

```bash
# Backup complet (DB + fichiers GED)
docker compose exec app php artisan secretis:backup --full

# Backup DB uniquement
docker compose exec db pg_dump -U secretis secretis_prod | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Lister les backups disponibles
docker compose exec app php artisan secretis:backup --list
```

### Restauration

```bash
# Restaurer depuis le dernier backup
docker compose exec app php artisan secretis:restore --latest

# Restaurer depuis un fichier spécifique
docker compose exec app php artisan secretis:restore --file=backup_2026-01-15_020000.zip

# Restaurer uniquement la base de données
gunzip -c backup_20260115.sql.gz | docker compose exec -T db psql -U secretis secretis_prod
```

---

## Mise à l'échelle horizontale

Pour les organisations avec > 500 utilisateurs simultanés :

```bash
# Augmenter les workers de queue
docker compose up -d --scale queue=4

# Augmenter les instances app (avec load balancer Nginx)
docker compose up -d --scale app=3

# Vérifier la répartition de charge
docker compose ps
```

Configurer Nginx en mode upstream pour distribuer la charge entre les instances `app`.

---

## Contacts support déploiement

| Problème | Contact |
|----------|---------|
| Erreur infrastructure | infra@secretis.ci |
| Bug applicatif | bugs@secretis.ci |
| Urgence production | +225 07 00 00 00 (24/7) |
| Documentation | docs.secretis.ci |

---

*© 2025-2026 IBIG — SECRETIS ERP. Guide réservé aux équipes techniques.*
