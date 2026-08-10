# Guide de migration SaaS → On-Premise SECRETIS

Ce guide décrit la procédure de migration depuis l'offre SaaS hébergée par IBIG Soft vers votre instance On-Premise.

## Avant de commencer

### Prérequis

- Instance On-Premise installée et fonctionnelle (voir `on-premise-installation.md`)
- Accès SuperAdmin au SaaS SECRETIS
- Clé de licence On-Premise valide
- Fenêtre de maintenance planifiée (migration = arrêt temporaire du service)

### Données migrées

| Données                    | Migré | Notes                              |
|----------------------------|-------|------------------------------------|
| Utilisateurs et rôles      | Oui   | Mots de passe hachés inclus        |
| Clients / Fournisseurs     | Oui   |                                    |
| Devis et factures          | Oui   | Avec historique complet            |
| Documents attachés         | Oui   | Téléchargés depuis le SaaS         |
| Configuration organisation | Oui   |                                    |
| Journaux d'audit           | Oui   |                                    |
| Intégrations tierces       | Non   | À reconfigurer manuellement        |
| Clés API                   | Non   | À régénérer après la migration     |

---

## Étape 1 — Export des données depuis le SaaS

### Via l'interface web

1. Connectez-vous au SaaS en tant que SuperAdmin
2. Accédez à **Paramètres → Administration → Export de données**
3. Cliquez sur **Exporter tout** (format : archive `.tar.gz` chiffrée)
4. Patientez — l'export peut prendre plusieurs minutes selon le volume
5. Téléchargez l'archive une fois l'email de confirmation reçu

### Via l'API

```bash
# Authentification
TOKEN=$(curl -sf -X POST https://app.secretis.ibigsoft.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@votreentreprise.com","password":"votre_mot_de_passe"}' \
  | jq -r '.token')

# Lancer l'export
EXPORT_ID=$(curl -sf -X POST https://app.secretis.ibigsoft.com/api/admin/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scope":"full","format":"sql","encrypt":true}' \
  | jq -r '.export_id')

echo "Export lancé : $EXPORT_ID"

# Vérifier l'état
curl -sf "https://app.secretis.ibigsoft.com/api/admin/export/$EXPORT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Télécharger quand status=completed
curl -fO "https://app.secretis.ibigsoft.com/api/admin/export/$EXPORT_ID/download" \
  -H "Authorization: Bearer $TOKEN"
```

L'archive exportée contient :

```
secretis_export_YYYYMMDD.tar.gz
├── database.sql.gz          # Dump PostgreSQL
├── files/                   # Documents et pièces jointes
│   ├── documents/
│   └── avatars/
├── metadata.json            # Version, checksum, date d'export
└── export.sha256            # Somme de contrôle
```

---

## Étape 2 — Préparation de l'instance On-Premise

```bash
# Vérifier que l'instance On-Premise est opérationnelle
curl -sf https://secretis.monentreprise.com/health

# Vérifier la version (doit correspondre au SaaS ou être plus récente)
docker compose -f /opt/secretis/docker-compose.yml exec app php artisan --version

# Créer un répertoire pour l'import
sudo mkdir -p /tmp/secretis-migration
sudo chmod 777 /tmp/secretis-migration
```

---

## Étape 3 — Vérification de l'intégrité de l'export

```bash
cd /tmp/secretis-migration

# Copier l'archive exportée
scp admin@votre-machine:/chemin/vers/secretis_export_*.tar.gz .

# Vérifier la somme de contrôle
sha256sum -c secretis_export_*.tar.gz.sha256
# Attendu : secretis_export_*.tar.gz: OK

# Extraire l'archive
tar -xzf secretis_export_*.tar.gz
ls -la
```

---

## Étape 4 — Import dans l'instance On-Premise

### Utiliser le script d'import fourni

```bash
sudo /opt/secretis/migrate-import.sh \
  --source=/tmp/secretis-migration \
  --confirm
```

### Import manuel (étape par étape)

#### 4a. Import de la base de données

```bash
cd /opt/secretis

# Arrêter les services applicatifs (garder postgres et redis)
docker compose stop app queue-worker scheduler reverb

# Sauvegarder la base actuelle (précaution)
docker compose exec -T postgres pg_dump \
  -U secretis -d secretis --format=custom \
  > /tmp/secretis-migration/backup_before_import.dump

# Vider la base de destination
docker compose exec -T postgres psql \
  -U secretis -c "DROP DATABASE IF EXISTS secretis;" postgres
docker compose exec -T postgres psql \
  -U secretis -c "CREATE DATABASE secretis;" postgres

# Importer le dump SaaS
zcat /tmp/secretis-migration/database.sql.gz | \
  docker compose exec -T postgres pg_restore \
    -U secretis -d secretis \
    --no-password --verbose \
    -F custom 2>&1 | tail -30

echo "Import DB terminé"
```

#### 4b. Import des fichiers

```bash
# Copier les fichiers vers MinIO
docker run --rm \
  --network secretis_backend \
  -v /tmp/secretis-migration/files:/migration:ro \
  minio/mc:latest sh -c "
    mc alias set dst http://minio:9000 \
      \$(cat /opt/secretis/.env | grep MINIO_ROOT_USER | cut -d= -f2) \
      \$(cat /opt/secretis/.env | grep MINIO_ROOT_PASSWORD | cut -d= -f2) &&
    mc mirror --preserve /migration/documents dst/secretis-documents &&
    echo 'Fichiers importés'
  "
```

#### 4c. Ajustements post-import

```bash
# Redémarrer l'application
docker compose up -d

# Attendre la disponibilité
sleep 15

# Mettre à jour les URLs dans la base de données
# (les URLs SaaS → URLs On-Premise)
SAAS_URL="https://app.secretis.ibigsoft.com"
ONPREMISE_URL="https://secretis.monentreprise.com"

docker compose exec -T app php artisan secretis:migrate-urls \
  --from="$SAAS_URL" \
  --to="$ONPREMISE_URL"

# Régénérer les caches
docker compose exec -T app php artisan migrate --force
docker compose exec -T app php artisan config:cache
docker compose exec -T app php artisan route:cache
docker compose exec -T app php artisan view:cache
docker compose exec -T app php artisan storage:link
docker compose exec -T app php artisan cache:clear
```

---

## Étape 5 — Vérification post-migration

### Tests fonctionnels

```bash
# Point de santé
curl -sf https://secretis.monentreprise.com/health | jq .

# Vérifier le nombre d'enregistrements
docker compose -f /opt/secretis/docker-compose.yml exec -T postgres \
  psql -U secretis -d secretis -c "
    SELECT
      (SELECT COUNT(*) FROM users)          AS users,
      (SELECT COUNT(*) FROM clients)        AS clients,
      (SELECT COUNT(*) FROM invoices)       AS invoices,
      (SELECT COUNT(*) FROM documents)      AS documents;
  "
```

Comparez ces chiffres avec ceux de l'export SaaS (présents dans `metadata.json`).

### Checklist de validation

- [ ] Connexion avec les identifiants existants fonctionne
- [ ] Tableau de bord affiche les données correctes
- [ ] Documents attachés sont accessibles
- [ ] Emails de test envoyés correctement
- [ ] Notifications WebSocket fonctionnelles
- [ ] Module IA opérationnel (si configuré)
- [ ] Sauvegardes automatiques planifiées
- [ ] Certificat SSL valide

---

## Étape 6 — Reconfiguration des intégrations

Les intégrations tierces doivent être reconfigurées manuellement sur l'instance On-Premise :

```
Paramètres → Intégrations
```

Intégrations courantes à reconfigurer :

| Intégration   | Action requise                                          |
|---------------|---------------------------------------------------------|
| Email         | Reconfigurer SMTP dans `.env` (MAIL_HOST, MAIL_PORT...) |
| Comptabilité  | Régénérer les tokens OAuth                              |
| Signature     | Reconfigurer l'URL du callback webhook                  |
| Paiement      | Mettre à jour les webhooks vers la nouvelle URL         |
| SSO/SAML      | Mettre à jour l'Entity ID et les URLs ACS               |

---

## Étape 7 — Coupure DNS

Une fois la migration vérifiée et validée :

### Option A — Coupure progressive

1. Réduire le TTL du DNS à 60 secondes (24h avant)
2. Mettre l'instance SaaS en mode lecture seule
3. Effectuer un dernier export différentiel
4. Importer les données différentielles sur l'On-Premise
5. Basculer le DNS vers le serveur On-Premise
6. Vérifier le bon fonctionnement
7. Désactiver l'instance SaaS

### Option B — Coupure directe (maintenance)

```bash
# 1. Planifier la maintenance
# Annoncer la fenêtre de maintenance aux utilisateurs

# 2. Mettre l'instance SaaS en maintenance
# (via le panel IBIG Soft ou en modifiant le DNS)

# 3. Effectuer un export final
# ... (voir Étape 1)

# 4. Importer sur l'On-Premise
# ... (voir Étape 4)

# 5. Basculer le DNS
# Modifier l'enregistrement A :
#   secretis.monentreprise.com → IP_SERVEUR_ONPREMISE

# 6. Vérifier la propagation DNS
watch -n 5 "dig +short secretis.monentreprise.com"

# 7. Tester l'accès
curl -sf https://secretis.monentreprise.com/health
```

---

## Rollback

En cas de problème critique pendant la migration :

```bash
# Restaurer la base de données avant import
docker compose -f /opt/secretis/docker-compose.yml exec -T postgres pg_restore \
  -U secretis -d secretis \
  --clean --no-password \
  -F custom /tmp/secretis-migration/backup_before_import.dump

# Rediriger le DNS vers le SaaS IBIG Soft
# (modifier l'enregistrement A vers l'IP du SaaS)

# Contacter le support IBIG Soft
# support@ibigsoft.com | Tél : +XX X XX XX XX XX
```

---

## Support

Pour toute assistance lors de la migration :

- **Email** : migration@ibigsoft.com
- **Documentation** : https://docs.ibigsoft.com/secretis/migration
- **Support On-Premise** : https://ibigsoft.com/support
