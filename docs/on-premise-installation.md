# Guide d'installation SECRETIS ERP On-Premise

## Prérequis

### Serveur recommandé

| Ressource     | Minimum        | Recommandé              |
|---------------|----------------|-------------------------|
| OS            | Ubuntu 22.04   | Ubuntu 22.04 LTS        |
| CPU           | 2 cœurs        | 4 cœurs                 |
| RAM           | 4 GB           | 8 GB                    |
| Disque        | 50 GB SSD      | 100 GB SSD NVMe         |
| Réseau        | 10 Mbps        | 100 Mbps                |

### Logiciels requis

- Docker Engine 24+
- Docker Compose v2+
- Ports 80 et 443 libres
- Nom de domaine pointant vers le serveur

### Clé de licence

Obtenez votre clé de licence On-Premise sur [https://ibigsoft.com/licenses](https://ibigsoft.com/licenses).
Format : `XXXX-XXXX-XXXX-XXXX-XXXX`

---

## Installation Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

Vérifiez l'installation :

```bash
docker --version           # Docker 24.x.x minimum
docker compose version     # Docker Compose v2.x.x minimum
```

---

## Installation SECRETIS (commande unique)

```bash
curl -fsSL https://get.ibigsoft.com/secretis/install.sh | sudo bash -s -- \
  --domain=secretis.monentreprise.com \
  --license=XXXX-XXXX-XXXX-XXXX-XXXX \
  --admin-email=admin@monentreprise.com
```

Ou en téléchargeant le script manuellement :

```bash
# Télécharger les scripts de déploiement
curl -fsSL https://releases.ibigsoft.com/secretis/latest/deploy.tar.gz | tar xz
cd deploy/on-premise

# Lancer l'installation
sudo ./install.sh \
  --domain=secretis.monentreprise.com \
  --license=XXXX-XXXX-XXXX-XXXX-XXXX \
  --admin-email=admin@monentreprise.com
```

L'installation prend environ 5 à 10 minutes selon votre connexion internet.

---

## Configuration DNS

Avant l'installation, configurez votre DNS :

```
Type  Nom              Valeur              TTL
A     secretis         <IP_DU_SERVEUR>     3600
```

Vérification :

```bash
dig +short secretis.monentreprise.com
# Doit retourner l'IP du serveur
```

---

## Configuration SSL/TLS

### Avec Let's Encrypt (recommandé)

Le script `install.sh` configure automatiquement Let's Encrypt si le domaine est accessible depuis internet.

### Avec votre propre certificat

```bash
# Copier vos certificats
sudo cp /chemin/vers/fullchain.pem /opt/secretis/nginx/certs/
sudo cp /chemin/vers/privkey.pem   /opt/secretis/nginx/certs/

# Redémarrer Nginx
docker compose -f /opt/secretis/docker-compose.yml restart nginx
```

### Certificat auto-signé (développement uniquement)

```bash
sudo ./install.sh --domain=localhost --license=VOTRE_CLE --skip-ssl
```

---

## Première connexion

Après l'installation :

1. Accédez à **https://secretis.monentreprise.com**
2. Identifiants par défaut :
   - Email : celui fourni avec `--admin-email`
   - Mot de passe : affiché en fin d'installation (fichier `/opt/secretis/.admin_password`)
3. **Changez immédiatement le mot de passe** à la première connexion
4. Configurez votre organisation dans **Paramètres → Organisation**

---

## Mise à jour

```bash
sudo /opt/secretis/update.sh
```

Pour une version spécifique :

```bash
sudo /opt/secretis/update.sh --version=2.1.0
```

Le script effectue automatiquement une sauvegarde avant la mise à jour et propose un rollback en cas d'échec.

---

## Sauvegarde et restauration

### Sauvegarde manuelle

```bash
sudo /opt/secretis/backup.sh
```

### Sauvegarde automatique (cron)

```bash
# Éditer la crontab
sudo crontab -e

# Ajouter : sauvegarde quotidienne à 2h du matin
0 2 * * * /opt/secretis/backup.sh >> /var/log/secretis/backup.log 2>&1
```

### Restauration

```bash
# Lister les sauvegardes disponibles
sudo /opt/secretis/restore.sh --list

# Restaurer une sauvegarde spécifique
sudo /opt/secretis/restore.sh --backup=/backups/secretis/daily/secretis_backup_20260101_020000.tar.gz.enc
```

---

## Dépannage

### Voir les logs

```bash
# Tous les services
docker compose -f /opt/secretis/docker-compose.yml logs -f

# Un service spécifique
docker compose -f /opt/secretis/docker-compose.yml logs -f app
docker compose -f /opt/secretis/docker-compose.yml logs -f postgres
docker compose -f /opt/secretis/docker-compose.yml logs -f nginx
```

### Statut des services

```bash
docker compose -f /opt/secretis/docker-compose.yml ps
```

### Redémarrer un service

```bash
docker compose -f /opt/secretis/docker-compose.yml restart app
```

### Problème de connexion à la base de données

```bash
# Vérifier que PostgreSQL est opérationnel
docker compose -f /opt/secretis/docker-compose.yml exec postgres \
  pg_isready -U secretis

# Accéder à psql
docker compose -f /opt/secretis/docker-compose.yml exec postgres \
  psql -U secretis -d secretis
```

### Réinitialiser le cache

```bash
docker compose -f /opt/secretis/docker-compose.yml exec app \
  php artisan cache:clear

docker compose -f /opt/secretis/docker-compose.yml exec app \
  php artisan config:cache
```

### Vérifier l'état de la licence

Accédez à **https://secretis.monentreprise.com/admin/license** (SuperAdmin requis).

Ou via CLI :

```bash
docker compose -f /opt/secretis/docker-compose.yml exec app \
  php artisan secretis:license:check
```

### Problèmes de permissions sur les fichiers

```bash
docker compose -f /opt/secretis/docker-compose.yml exec app \
  chown -R www-data:www-data storage bootstrap/cache
```

---

## Monitoring avec Grafana

### Activer le monitoring

Ajoutez dans `/opt/secretis/.env` :

```env
PROMETHEUS_ENABLED=true
```

Lancez les services de monitoring :

```bash
cd /opt/secretis
docker compose --profile monitoring up -d
```

### Accès

- **Grafana** : http://votre-serveur:3000 (admin / admin — à changer)
- **Prometheus** : http://votre-serveur:9090
- **Alertmanager** : http://votre-serveur:9093

### Tableau de bord

Le tableau de bord **SECRETIS ERP — Vue d'ensemble** est importé automatiquement et affiche :

- Statut de tous les services
- Requêtes par seconde et temps de réponse
- Utilisation CPU, RAM, Disque
- Jobs en attente dans la queue
- Connexions et performances PostgreSQL
- Mémoire Redis

---

## Variables d'environnement

Le fichier de configuration complet se trouve dans `/opt/secretis/.env`.
Consultez `.env.on-premise.example` pour la documentation de chaque variable.

Après modification du `.env`, régénérez le cache :

```bash
docker compose -f /opt/secretis/docker-compose.yml exec app php artisan config:cache
```

---

## Sécurité

- Mettez à jour SECRETIS régulièrement avec `update.sh`
- Configurez un firewall (ufw) pour n'exposer que les ports 80 et 443
- Activez la 2FA pour les comptes administrateurs
- Configurez des sauvegardes vers un stockage externe (S3, SFTP)
- Chiffrez les sauvegardes avec `BACKUP_ENCRYPTION_KEY`

```bash
# Exemple de configuration firewall minimale
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirection vers HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```
