# Guide de Déploiement SECRETIS ERP

**Version :** 1.0.0  
**Auteur :** IBIG SOFT  
**Mise à jour :** 2026-07

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Configuration DNS](#2-configuration-dns)
3. [Déploiement Bare Metal (VPS/Serveur dédié)](#3-déploiement-bare-metal)
4. [Déploiement Docker](#4-déploiement-docker)
5. [Certificat SSL Let's Encrypt](#5-certificat-ssl-lets-encrypt)
6. [Configuration initiale de l'application](#6-configuration-initiale)
7. [Mise à jour en production (zero-downtime)](#7-mise-à-jour-en-production)
8. [Monitoring et diagnostics](#8-monitoring-et-diagnostics)
9. [Rollback en cas de problème](#9-rollback)
10. [FAQ et erreurs courantes](#10-faq)

---

## 1. Prérequis

### Serveur recommandé

| Composant | Minimum | Recommandé (production) |
|-----------|---------|------------------------|
| CPU       | 2 vCPU  | 4 vCPU                 |
| RAM       | 4 Go    | 8 Go                   |
| Stockage  | 40 Go SSD | 100 Go SSD NVMe      |
| OS        | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Réseau    | 100 Mbps | 1 Gbps               |

### Logiciels requis

- PHP 8.2+ avec extensions : pgsql, redis, gd, zip, mbstring, bcmath, xml, curl, intl, pcntl, opcache
- PostgreSQL 15+
- Redis 7+
- Nginx 1.24+
- Node.js 20+ et npm
- Composer 2.7+
- Certbot (Let's Encrypt)
- Supervisor 4+
- Git

### Accès requis

- Accès SSH root ou sudo sur le serveur
- Nom de domaine pointant vers le serveur
- Compte DNS (Cloudflare recommandé pour le wildcard SSL)
- Bucket S3 compatible pour les sauvegardes (AWS S3 ou Cloudflare R2)

---

## 2. Configuration DNS

### Enregistrements DNS à créer

Connectez-vous à votre gestionnaire DNS (Cloudflare, OVH, etc.) et créez :

```
# Domaine principal
secretis.ibigsoft.com       A       <IP_DU_SERVEUR>

# Wildcard pour les sous-domaines organisations
*.secretis.ibigsoft.com     A       <IP_DU_SERVEUR>

# Si vous utilisez Cloudflare : activer le proxy (nuage orange)
# Cela active le CDN et masque votre IP réelle
```

### Vérification DNS

```bash
# Vérifier la propagation
dig +short secretis.ibigsoft.com
dig +short acme.secretis.ibigsoft.com

# Attendre la propagation (5 min à 48h selon le TTL)
watch -n 30 'dig +short secretis.ibigsoft.com'
```

---

## 3. Déploiement Bare Metal

### 3.1 Installation initiale du serveur

```bash
# Se connecter en SSH
ssh root@<IP_DU_SERVEUR>

# Télécharger et exécuter le script d'installation
curl -o /tmp/setup-server.sh https://votre-repo/deploy/scripts/setup-server.sh
chmod +x /tmp/setup-server.sh
sudo bash /tmp/setup-server.sh

# IMPORTANT : Sauvegarder le fichier de credentials généré
cat /root/secretis-credentials-*.txt
# Télécharger localement IMMÉDIATEMENT puis supprimer du serveur
scp root@<IP>:/root/secretis-credentials-*.txt ./
```

### 3.2 Configuration de l'application

```bash
# Se connecter en tant qu'utilisateur secretis
sudo -u secretis bash

# Cloner le repository
git clone git@github.com:ibigsoft/secretis-erp.git /var/www/secretis/backend
cd /var/www/secretis/backend

# Configurer l'environnement
cp .env.example .env
nano .env   # Remplir toutes les valeurs

# Générer la clé d'application
php8.2 artisan key:generate

# Installer les dépendances PHP
composer install --no-dev --optimize-autoloader

# Installer et builder les assets (depuis le répertoire frontend)
cd /var/www/secretis/frontend
npm ci
npm run build
cd /var/www/secretis/backend

# Migrations initiales
php8.2 artisan migrate --force

# Créer le lien symbolic storage
php8.2 artisan storage:link

# Caches Laravel
php8.2 artisan config:cache
php8.2 artisan route:cache
php8.2 artisan view:cache
php8.2 artisan event:cache

# Seeder initial (superadmin, plans, etc.)
php8.2 artisan db:seed --class=ProductionSeeder
```

### 3.3 Configuration Nginx

```bash
# Copier les configurations Nginx
sudo cp /var/www/secretis/backend/deploy/nginx/secretis.conf \
    /etc/nginx/sites-available/secretis.conf

sudo cp /var/www/secretis/backend/deploy/nginx/subdomain-wildcard.conf \
    /etc/nginx/sites-available/subdomain-wildcard.conf

# Activer les sites
sudo ln -s /etc/nginx/sites-available/secretis.conf \
    /etc/nginx/sites-enabled/

sudo ln -s /etc/nginx/sites-available/subdomain-wildcard.conf \
    /etc/nginx/sites-enabled/

# Supprimer la config par défaut
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### 3.4 Configuration Supervisor

```bash
# Copier les configurations Supervisor
sudo cp /var/www/secretis/backend/deploy/supervisor/laravel-worker.conf \
    /etc/supervisor/conf.d/

sudo cp /var/www/secretis/backend/deploy/supervisor/reverb.conf \
    /etc/supervisor/conf.d/

# Créer les répertoires de logs
sudo mkdir -p /var/log/secretis
sudo chown secretis:secretis /var/log/secretis

# Recharger Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all

# Vérifier le statut
sudo supervisorctl status
```

---

## 4. Déploiement Docker

### 4.1 Prérequis Docker

```bash
# Installer Docker
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# Installer Docker Compose v2
sudo apt-get install -y docker-compose-plugin

# Vérifier
docker --version
docker compose version
```

### 4.2 Configuration Docker

```bash
# Cloner le repo
git clone git@github.com:ibigsoft/secretis-erp.git
cd secretis-erp

# Créer .env.docker depuis l'exemple
cp .env.example .env.docker
nano .env.docker   # Adapter les hosts : postgres, redis, reverb (noms des services Docker)

# Variables importantes à changer pour Docker :
# DB_HOST=postgres
# REDIS_HOST=redis
# REVERB_HOST=reverb
```

### 4.3 Lancement des services

```bash
# Builder l'image
docker compose -f deploy/docker/docker-compose.yml \
    --env-file .env.docker \
    build --no-cache

# Démarrer tous les services
docker compose -f deploy/docker/docker-compose.yml \
    --env-file .env.docker \
    up -d

# Avec MeiliSearch (recherche)
docker compose -f deploy/docker/docker-compose.yml \
    --env-file .env.docker \
    --profile search \
    up -d

# Vérifier les services
docker compose -f deploy/docker/docker-compose.yml ps

# Voir les logs
docker compose -f deploy/docker/docker-compose.yml logs -f app
docker compose -f deploy/docker/docker-compose.yml logs -f nginx
```

### 4.4 Opérations Docker courantes

```bash
# Exécuter une commande Artisan
docker compose exec app php artisan migrate
docker compose exec app php artisan queue:restart

# Accéder au shell du container
docker compose exec app bash

# Redémarrer un service
docker compose restart app

# Mettre à jour l'application
docker compose pull
docker compose up -d --build app
```

---

## 5. Certificat SSL Let's Encrypt

### 5.1 Certificat pour le domaine principal

```bash
# Domaine principal uniquement
sudo certbot --nginx \
    -d secretis.ibigsoft.com \
    --non-interactive \
    --agree-tos \
    --email admin@ibigsoft.com

# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

### 5.2 Certificat wildcard (sous-domaines organisations)

Le certificat wildcard nécessite le challenge DNS-01 (pas HTTP-01).

**Avec Cloudflare :**

```bash
# Installer le plugin Cloudflare
sudo apt install python3-certbot-dns-cloudflare

# Créer le fichier de credentials Cloudflare
sudo mkdir -p /etc/letsencrypt/
sudo nano /etc/letsencrypt/cloudflare.ini
```

Contenu de `cloudflare.ini` :
```ini
dns_cloudflare_api_token = <VOTRE_TOKEN_CLOUDFLARE>
```

```bash
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Obtenir le certificat wildcard
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d secretis.ibigsoft.com \
    -d "*.secretis.ibigsoft.com" \
    --non-interactive \
    --agree-tos \
    --email admin@ibigsoft.com

# Recharger Nginx
sudo systemctl reload nginx
```

### 5.3 Renouvellement automatique

```bash
# Vérifier que le timer systemd est actif
sudo systemctl status certbot.timer

# Ou ajouter un cron manuellement
sudo crontab -e
# Ajouter : 0 3 * * * certbot renew --quiet && systemctl reload nginx
```

---

## 6. Configuration initiale

### 6.1 Seeder de production

```bash
# Créer le superadmin IBIG SOFT
php8.2 artisan secretis:setup \
    --email=admin@ibigsoft.com \
    --name="IBIG SOFT" \
    --password=<MOT_DE_PASSE_FORT>

# Ou via le seeder
php8.2 artisan db:seed --class=ProductionSeeder --force
```

### 6.2 Vérifications post-déploiement

```bash
# Santé de l'application
curl -s https://secretis.ibigsoft.com/api/health | python3 -m json.tool

# Vérifier les workers
sudo supervisorctl status

# Vérifier les queues
php8.2 artisan queue:monitor default,emails,broadcasts,exports

# Vérifier Reverb
curl -s http://localhost:8080/health

# Test d'envoi email
php8.2 artisan tinker
>>> Mail::raw('Test', fn($m) => $m->to('admin@ibigsoft.com')->subject('Test'));
```

---

## 7. Mise à jour en production (zero-downtime)

### 7.1 Déploiement standard

```bash
# Déploiement depuis le serveur
cd /var/www/secretis/backend
bash deploy/scripts/deploy.sh

# Ou avec une branche spécifique
bash deploy/scripts/deploy.sh --branch=v2.0.0

# Simulation (dry-run)
bash deploy/scripts/deploy.sh --dry-run

# Sans rebuild des assets (si CSS/JS inchangés)
bash deploy/scripts/deploy.sh --skip-build
```

### 7.2 Étapes du déploiement automatique

Le script `deploy.sh` exécute ces étapes dans l'ordre :

1. **Vérification des prérequis** : PHP, Composer, espace disque, connexion DB
2. **Sauvegarde de la release courante** : snapshot dans `/var/www/secretis/releases/`
3. **Git pull** : mise à jour du code depuis la branche configurée
4. **Composer install** : dépendances PHP production (sans devDependencies)
5. **npm ci + build** : assets frontend (Vite/webpack)
6. **Maintenance ON** : affiche une page de maintenance aux utilisateurs
7. **Migrations** : application des nouvelles migrations DB
8. **Caches** : régénération config, routes, views, events
9. **Queue restart** : redémarrage des workers avec le nouveau code
10. **Reverb restart** : redémarrage du serveur WebSocket
11. **Maintenance OFF** : application disponible
12. **Rapport** : health check + notification Slack/email

En cas d'échec à n'importe quelle étape, le rollback automatique est déclenché.

---

## 8. Monitoring et diagnostics

### 8.1 Logs à surveiller

```bash
# Logs applicatifs Laravel
tail -f /var/www/secretis/backend/storage/logs/laravel.log

# Logs des workers
tail -f /var/log/secretis/worker.log
tail -f /var/log/secretis/worker-error.log
tail -f /var/log/secretis/worker-exports.log

# Logs Reverb WebSocket
tail -f /var/log/secretis/reverb.log

# Logs Nginx
tail -f /var/log/nginx/secretis.access.log
tail -f /var/log/nginx/secretis.error.log

# Logs des déploiements
tail -f /var/log/secretis/deploy.log

# Logs PHP-FPM
tail -f /var/log/php8.2-fpm.log

# Logs PostgreSQL
tail -f /var/log/postgresql/postgresql-15-main.log
```

### 8.2 Commandes de diagnostic

```bash
# Statut des services
sudo systemctl status nginx php8.2-fpm postgresql redis-server supervisor

# Statut des workers Supervisor
sudo supervisorctl status

# Queues en attente
php8.2 artisan queue:monitor
php8.2 artisan queue:size default
php8.2 artisan queue:failed

# Jobs en échec
php8.2 artisan queue:failed
php8.2 artisan queue:retry all  # Relancer tous les jobs en échec

# Connexions actives PostgreSQL
sudo -u postgres psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Mémoire Redis
redis-cli -a $REDIS_PASSWORD info memory

# Cache Laravel
php8.2 artisan cache:clear   # Vider
php8.2 artisan config:show   # Voir la config active

# Performances
php8.2 artisan about         # Résumé de l'application

# Santé de la base de données
php8.2 artisan db:monitor --databases=pgsql

# Taille de la base de données
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('secretis_production'));"
```

### 8.3 Health Check API

L'endpoint `/api/health` retourne :

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-07-21T10:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "queue": "ok",
    "storage": "ok"
  }
}
```

### 8.4 Métriques à surveiller

| Métrique | Seuil alerte | Commande |
|---------|--------------|----------|
| Jobs en file | > 500 | `php artisan queue:monitor` |
| Jobs en échec | > 0 | `php artisan queue:failed` |
| Espace disque | < 10% libre | `df -h` |
| RAM utilisée | > 85% | `free -h` |
| Connexions PG | > 150/200 | `pg_stat_activity` |
| Charge CPU | > 80% pendant 5 min | `htop` |

---

## 9. Rollback

### 9.1 Rollback automatique (script deploy.sh)

Le script de déploiement effectue un rollback automatique si une étape échoue.
La release précédente est restaurée depuis `/var/www/secretis/releases/`.

### 9.2 Rollback manuel

```bash
# Lister les releases disponibles
ls -lt /var/www/secretis/releases/

# Choisir la release de rollback
RELEASE="deploy_2026-07-20_02-30-00"

# Activer le mode maintenance
php8.2 artisan maintenance:on

# Restaurer le code
rsync -a --delete \
    /var/www/secretis/releases/${RELEASE}/ \
    /var/www/secretis/backend/ \
    --exclude=".env" \
    --exclude="storage/"

# Remettre à jour les dépendances si nécessaire
composer install --no-dev --optimize-autoloader

# Restaurer la base de données (si migration de rollback disponible)
php8.2 artisan migrate:rollback --step=1  # Annuler la dernière migration

# Régénérer les caches
php8.2 artisan config:cache
php8.2 artisan route:cache
php8.2 artisan view:cache

# Redémarrer les services
php8.2 artisan queue:restart
sudo supervisorctl restart secretis-reverb
sudo systemctl reload nginx

# Désactiver le mode maintenance
php8.2 artisan maintenance:off

echo "Rollback vers ${RELEASE} effectué"
```

### 9.3 Rollback depuis une sauvegarde S3

En cas de corruption de données :

```bash
# Lister les sauvegardes disponibles
php8.2 artisan secretis:backup:list

# Restaurer une sauvegarde spécifique
php8.2 artisan secretis:backup:restore \
    --file=secretis_backup_2026-07-20_02-00-00_db.sql.gz.enc \
    --confirm

# Ou manuellement depuis S3
aws s3 cp s3://secretis-backups/daily/2026/07/secretis_backup_db.sql.gz.enc .
openssl enc -d -aes-256-cbc -in backup.sql.gz.enc -out backup.sql.gz \
    -pass pass:${BACKUP_ENCRYPTION_KEY} -pbkdf2
gunzip backup.sql.gz

# Restaurer
sudo -u postgres psql secretis_production < backup.sql
```

---

## 10. FAQ

### L'application affiche "503 Service Unavailable"

```bash
# Vérifier PHP-FPM
sudo systemctl status php8.2-fpm
sudo systemctl restart php8.2-fpm

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Vérifier les permissions
ls -la /var/www/secretis/backend/storage/
ls -la /var/run/php/php8.2-fpm.sock
```

### Les queues ne traitent pas les jobs

```bash
# Vérifier les workers
sudo supervisorctl status secretis-worker:*

# Redémarrer les workers
sudo supervisorctl restart secretis-worker:*
php8.2 artisan queue:restart

# Vérifier la connexion Redis
redis-cli -a $REDIS_PASSWORD ping

# Voir les jobs en file
php8.2 artisan tinker
>>> DB::table('jobs')->count();
>>> DB::table('jobs')->get()->first();
```

### Reverb WebSocket ne se connecte pas

```bash
# Vérifier Reverb
sudo supervisorctl status secretis-reverb
curl -s http://localhost:8080/health

# Vérifier la config Nginx pour WebSocket
grep -A10 "location /app/" /etc/nginx/sites-enabled/secretis.conf

# Tester la connexion WebSocket
curl --include \
    --no-buffer \
    --header "Connection: Upgrade" \
    --header "Upgrade: websocket" \
    --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
    --header "Sec-WebSocket-Version: 13" \
    https://secretis.ibigsoft.com/app/
```

### Erreur de migrations en production

```bash
# Voir le statut des migrations
php8.2 artisan migrate:status

# Vérifier les logs PostgreSQL
sudo tail -50 /var/log/postgresql/postgresql-15-main.log

# Exécuter en mode verbose pour voir les erreurs
php8.2 artisan migrate --force -v

# Si une migration bloque, la marquer comme exécutée manuellement
php8.2 artisan migrate --pretend  # Voir le SQL sans l'exécuter
```

### Les emails ne partent pas

```bash
# Tester la connexion SMTP
php8.2 artisan tinker
>>> Mail::raw('Test', fn($m) => $m->to('test@example.com')->subject('Test SMTP'));

# Vérifier les workers emails
sudo supervisorctl status secretis-worker-emails:*

# Voir les jobs emails en attente
php8.2 artisan queue:monitor emails

# Les jobs emails en échec
php8.2 artisan queue:failed | grep Mail
```

### SSL ne se renouvelle pas

```bash
# Test de renouvellement
sudo certbot renew --dry-run --cert-name secretis.ibigsoft.com

# Voir les logs Certbot
sudo journalctl -u certbot -n 50

# Forcer le renouvellement
sudo certbot renew --force-renewal --cert-name secretis.ibigsoft.com
sudo systemctl reload nginx
```

---

*Pour toute assistance technique : devops@ibigsoft.com*  
*Documentation SECRETIS ERP - IBIG SOFT © 2026*
