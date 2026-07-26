# Guide de Déploiement — Phase 2 IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0  
**Référence :** Ce document complète `docs/installation-guide.md`

---

## 1. Prérequis Phase 2

Avant de déployer la Phase 2, la Phase 1 (v1.0.0) doit être opérationnelle.  
Vérifier avec `php artisan secretis:health-check`.

### Nouvelles dépendances Phase 2

```bash
# PHP
composer require spatie/sitemap
composer require spatie/laravel-backup

# Node.js
npm install shepherd.js date-fns react-i18next i18next
```

---

## 2. Nouvelles variables d'environnement — Phase 2

Ajouter ces variables dans le fichier `.env` de production :

```dotenv
# ——— Mode démonstration ———
DEMO_MODE=false
# Mettre à true uniquement pour l'environnement de démo public

# ——— Analytics landing ———
ANALYTICS_ENABLED=true
ANALYTICS_RATE_LIMIT=100
# Nombre max d'événements par session par heure

# ——— Pages légales ———
LEGAL_VERSION=2.0.0
# Version des CGU/CGV — changement force ré-acceptation des utilisateurs

# ——— SEO ———
APP_URL=https://secretis.ibigsoft.com
SITEMAP_CACHE_TTL=21600
# Durée de cache du sitemap en secondes (défaut : 6 heures)

# ——— Emails ———
MAIL_FROM_NAME="IBIG SECRETIS"
MAIL_FROM_ADDRESS=noreply@ibigsoft.com
DEMO_NOTIFICATION_EMAIL=demo@ibigsoft.com

# ——— Sauvegardes ———
BACKUP_ARCHIVE_PASSWORD=
# Générer avec : openssl rand -base64 32
BACKUP_NOTIFICATION_EMAIL=devops@ibigsoft.com
BACKUP_SLACK_WEBHOOK=https://hooks.slack.com/services/...

# ——— GeoIP (analytics) ———
# Cloudflare détecte automatiquement le pays via CF-IPCountry
# Si pas de Cloudflare, configurer un provider GeoIP alternatif :
GEOIP_DRIVER=cloudflare
# Options : cloudflare | maxmind | ipinfo
```

---

## 3. Commandes de déploiement Phase 2

```bash
#!/bin/bash
# deploy/scripts/deploy-phase2.sh

set -e
echo "=== Déploiement Phase 2 — IBIG SECRETIS v2.0.0 ==="

# 1. Maintenance mode
php artisan down --secret="secretis-deploy-token"

# 2. Récupération du code
git pull origin main

# 3. Dépendances
composer install --no-dev --optimize-autoloader
npm install && npm run build

# 4. Migrations Phase 2 (119-123)
echo "→ Migration 119 : legal_pages"
php artisan migrate --path=database/migrations/2026_01_01_000121_create_legal_pages_table.php --force

echo "→ Migration 120 : support_sessions"
php artisan migrate --path=database/migrations/2026_01_01_000122_create_support_sessions_table.php --force

echo "→ Migration 121 : landing_analytics"
php artisan migrate --path=database/migrations/2026_01_01_000123_create_landing_analytics_table.php --force

echo "→ Migration 122 : saved_reports"
php artisan migrate --path=database/migrations/2026_07_01_000100_create_saved_reports_table.php --force

# 5. Seeders nouveaux (Phase 2)
echo "→ Seeder : pages légales"
php artisan db:seed --class=LegalPageSeeder --force

echo "→ Seeder : FAQ centre d'aide"
php artisan db:seed --class=HelpArticleSeeder --force

echo "→ Seeder : données de démonstration (optionnel)"
# php artisan db:seed --class=DemoDataSeeder --force

# 6. Cache et optimisation
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan icons:cache

# 7. Invalider le cache analytique et SEO
php artisan cache:forget sitemap_xml
php artisan cache:forget robots_txt

# 8. Redémarrer les queues
php artisan queue:restart

# 9. Vérification post-déploiement
php artisan secretis:health-check --phase=2

# 10. Désactivation maintenance
php artisan up

echo "=== Déploiement Phase 2 terminé avec succès ==="
```

---

## 4. Vérifications post-déploiement Phase 2

### Checklist obligatoire

```bash
# 4.1 Sitemap accessible et valide
curl -s https://secretis.ibigsoft.com/sitemap.xml | head -5
# Attendu : <?xml version="1.0" encoding="UTF-8"?>

# 4.2 Robots.txt accessible
curl -s https://secretis.ibigsoft.com/robots.txt
# Attendu : User-agent: * / Allow: / / Sitemap: ...

# 4.3 Landing page accessible
curl -I https://secretis.ibigsoft.com/
# Attendu : HTTP 200

# 4.4 Page légale accessible sans auth
curl -I https://secretis.ibigsoft.com/legal/cgu
# Attendu : HTTP 200

# 4.5 API analytics accessible
curl -X POST https://secretis.ibigsoft.com/api/v1/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"event_type":"page_view","page":"/","cookie_consent":false}'
# Attendu : {"status":"skipped","reason":"no_consent"}

# 4.6 Dashboard analytics SuperAdmin accessible
# Se connecter en super-admin et vérifier /superadmin/analytics/landing

# 4.7 Migrations appliquées
php artisan migrate:status | grep "2026_01_01_000121\|000122\|000123"
# Attendu : ✅ Ran pour les 3 migrations

# 4.8 Queue workers actifs
php artisan queue:monitor
# Attendu : Toutes les queues "running"

# 4.9 Score Lighthouse
npx lighthouse https://secretis.ibigsoft.com --output=json --quiet | jq '.categories.seo.score'
# Attendu : >= 0.95

# 4.10 Emails — Test d'envoi
php artisan secretis:test-email demo@ibigsoft.com
# Attendu : Email reçu dans Mailtrap/boîte configurée
```

### Vérifications base de données

```sql
-- Vérifier les nouvelles tables
SHOW TABLES LIKE 'landing_analytics';
SHOW TABLES LIKE 'legal_pages';
SHOW TABLES LIKE 'support_sessions';

-- Vérifier les index landing_analytics
SHOW INDEX FROM landing_analytics;

-- Vérifier les pages légales seeder
SELECT COUNT(*) FROM legal_pages;
-- Attendu : 18
```

---

## 5. Rollback Phase 2

En cas de problème, revenir à la v1.0.0 :

```bash
# Rollback des 4 migrations Phase 2
php artisan migrate:rollback --step=4

# Restaurer l'ancienne version du code
git checkout v1.0.0

# Réinstaller les dépendances v1
composer install --no-dev --optimize-autoloader
npm install && npm run build

# Vider les caches
php artisan cache:clear
php artisan config:cache
php artisan route:cache

# Redémarrer les services
php artisan queue:restart
php artisan up
```

---

## 6. Référence — Guide d'installation complet

Pour l'installation complète (nouvelle instance) : voir `docs/installation-guide.md`

Sections clés :
- Section 3 : Prérequis serveur (PHP 8.3, MySQL 8, Redis, Node 20)
- Section 5 : Configuration Nginx + SSL
- Section 7 : Supervisor pour les queues
- Section 9 : Variables d'environnement complètes
- Section 12 : Disaster Recovery

---

## 7. Environnements

| Environnement | URL | Branche | Déploiement |
|--------------|-----|---------|------------|
| Production | https://secretis.ibigsoft.com | `main` | Manuel via script |
| Staging | https://staging.secretis.ibigsoft.com | `develop` | Automatique (CI) |
| Démo | https://demo.secretis.ibigsoft.com | `main` + DEMO_MODE=true | Automatique |
| Local | http://localhost | n/a | `php artisan serve` |

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe DevOps*
