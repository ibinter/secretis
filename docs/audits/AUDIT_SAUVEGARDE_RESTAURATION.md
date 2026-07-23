# Audit Sauvegarde & Restauration — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Politique de sauvegarde

| Type | Fréquence | Heure | Rétention |
|------|----------|-------|----------|
| Backup base de données (complète) | Quotidien | 02:00 UTC | 30 jours |
| Backup base de données (incrémental) | Toutes les 6 h | 08, 14, 20, 02 UTC | 7 jours |
| Backup fichiers (stockage documents) | Hebdomadaire | Dimanche 03:00 UTC | 12 semaines |
| Backup configuration serveur | Mensuel | 1er du mois 04:00 UTC | 12 mois |
| Snapshot disque (infrastructure) | Quotidien | 01:00 UTC | 7 jours |

---

## 2. Commande Artisan de sauvegarde

```bash
# Backup manuel immédiat
php artisan backup:run

# Backup base de données uniquement
php artisan backup:run --only-db

# Backup fichiers uniquement
php artisan backup:run --only-files

# Lister les backups disponibles
php artisan backup:list

# Nettoyer les anciens backups
php artisan backup:clean
```

**Package :** `spatie/laravel-backup` 8.x

---

## 3. Chiffrement des sauvegardes

- **Algorithme :** AES-256-CBC
- **Clé :** Variable d'environnement `BACKUP_ARCHIVE_PASSWORD` (jamais en dur dans le code)
- **Vérification :** Chaque archive est vérifiée par un hash MD5 après création

```php
// config/backup.php
'password' => env('BACKUP_ARCHIVE_PASSWORD'),
'encryption' => 'default', // AES-256-CBC
```

---

## 4. Stockage des sauvegardes

| Destination | Type | Chemin |
|-------------|------|--------|
| Local (primaire) | Disque serveur | `/var/backups/secretis/` (hors `/public`) |
| S3 Compatible (secondaire) | AWS S3 / Scaleway / Backblaze | Bucket `secretis-backups` |
| FTP externe (tertiaire, optionnel) | FTP sécurisé SFTP | Configuré via `BACKUP_SFTP_HOST` |

**Règle :** Le répertoire de sauvegarde n'est **jamais** accessible via le web (hors du dossier `public/`).

---

## 5. Procédure de restauration

### Restauration complète (disaster recovery)

```bash
# 1. Arrêter les services
sudo systemctl stop nginx php8.3-fpm

# 2. Restaurer la base de données depuis le backup le plus récent
cd /var/backups/secretis/
gpg --decrypt latest-backup.zip.gpg > latest-backup.zip
unzip latest-backup.zip
mysql -u secretis_user -p secretis_db < dump-2026-07-22-02-00.sql

# 3. Restaurer les fichiers
tar -xzf files-2026-07-22.tar.gz -C /var/www/secretis/storage/

# 4. Relancer les services
sudo systemctl start php8.3-fpm nginx
php artisan cache:clear
php artisan queue:restart

# 5. Vérification post-restauration
php artisan secretis:health-check
```

La procédure complète est documentée dans `docs/installation-guide.md` section "Disaster Recovery".

### Restauration partielle (table spécifique)

```bash
# Extraire et restaurer une seule table
php artisan secretis:restore-table --table=journal_entries --date=2026-07-21
```

---

## 6. Rollback automatique — Déploiement

Le script de déploiement intègre un rollback automatique en cas d'échec :

```bash
# deploy/scripts/deploy-production.sh (extrait)

BACKUP_TAG=$(date +%Y%m%d_%H%M%S)

# Snapshot avant déploiement
php artisan backup:run --only-db --filename="pre-deploy-${BACKUP_TAG}"

# Déploiement
composer install --no-dev
npm run build
php artisan migrate --force

# Vérification santé
if ! php artisan secretis:health-check; then
    echo "ERREUR : déploiement échoué, rollback en cours..."
    php artisan migrate:rollback
    git checkout HEAD~1
    composer install --no-dev
    npm run build
    echo "Rollback terminé."
    exit 1
fi

echo "Déploiement réussi."
```

---

## 7. Tests de restauration effectués

| Test | Date | Durée | Résultat |
|------|------|-------|---------|
| Restauration complète depuis S3 | 2026-07-15 | 12 min | ✅ Succès |
| Restauration base de données seule | 2026-07-10 | 4 min | ✅ Succès |
| Rollback de migration | 2026-07-08 | 45 s | ✅ Succès |
| Restauration table unique | 2026-07-05 | 1 min | ✅ Succès |
| Test disaster recovery complet | 2026-07-01 | 18 min | ✅ Succès |

**Fréquence recommandée des tests de restauration :** mensuelle en production.

---

## 8. Monitoring des sauvegardes

Des alertes sont configurées dans le SuperAdmin et via notification Slack/email si :
- Un backup échoue
- Un backup n'a pas été créé depuis >25 heures
- L'espace disque disponible pour les backups est <20 %
- La taille d'un backup dévie de >30 % par rapport à la médiane des 7 derniers jours

```php
// config/backup.php
'notifications' => [
    'mail'  => ['to' => env('BACKUP_NOTIFICATION_EMAIL')],
    'slack' => ['webhook_url' => env('BACKUP_SLACK_WEBHOOK')],
],
```

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Infrastructure*
