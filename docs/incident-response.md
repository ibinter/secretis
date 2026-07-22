# Procédure de Réponse aux Incidents de Sécurité — SECRETIS ERP

**Version :** 1.0  
**Date :** 2026-07-21  
**Propriétaire :** IBIG — Équipe Sécurité  
**Classification :** CONFIDENTIEL — Usage interne uniquement

---

## Table des matières

1. [Détection](#1-détection)
2. [Confinement immédiat](#2-confinement-immédiat)
3. [Analyse et investigation](#3-analyse-et-investigation)
4. [Correction et patch](#4-correction-et-patch)
5. [Communication](#5-communication)
6. [Post-mortem](#6-post-mortem)
7. [Contacts d'urgence](#7-contacts-durgence)
8. [Niveaux de sévérité](#8-niveaux-de-sévérité)

---

## 1. Détection

### 1.1 Sources d'alerte

| Source | Description | Délai de détection cible |
|--------|-------------|--------------------------|
| Logs `security` (Laravel) | Tentatives cross-tenant, rate limit dépassé, CSRF violation | Temps réel (si alerting actif) |
| Logs `billing` | Anomalies paiement, activation licence sans paiement | Temps réel |
| Logs `audit_logs` (DB) | Toutes les actions sensibles avec user_id + IP | Requêtable à tout moment |
| Monitoring serveur | CPU spike, trafic anormal, erreurs 5xx en masse | < 5 minutes |
| Rapport utilisateur | Un client signale un accès non autorisé | Variable |
| Provider paiement | Stripe/PayDunya notifie un litige ou fraude | Variable |

### 1.2 Indicateurs de compromission (IOC)

**Intrusion possible :**
- Nombre anormal de 403 dans les logs (`grep "cross_tenant" storage/logs/security.log`)
- Connexions depuis des IPs jamais vues pour un utilisateur (`audit_logs WHERE action='login_success'`)
- Accès à `audit_logs` par un utilisateur non-superadmin
- Modification de données sans entrée correspondante dans `audit_logs`
- Token de session valide mais IP ayant changé radicalement (géolocalisation)

**Compromission de données :**
- Pic soudain de téléchargements de documents
- Exports CSV massifs hors des heures ouvrées
- Requêtes API avec des IDs séquentiels (scan IDOR)

**Compromission d'infrastructure :**
- Connexion SSH depuis une IP inconnue
- Nouveau processus inconnu sur le serveur
- Modification de fichiers dans `/var/www/secretis` non corrélée à un déploiement

### 1.3 Commandes de détection rapide

```bash
# Tentatives cross-tenant des 24 dernières heures
grep "CROSS-TENANT" storage/logs/security.log | grep "$(date +%Y-%m-%d)" | wc -l

# IPs avec le plus de tentatives échouées
grep "login_failed" storage/logs/security.log | grep -oP '"ip":"\K[^"]+' | sort | uniq -c | sort -rn | head -20

# Connexions depuis des pays inhabituels (si GeoIP activé)
grep "new_location" storage/logs/security.log | tail -50

# Actions critiques dans audit_logs (DB)
psql $DATABASE_URL -c "
  SELECT action, COUNT(*), MAX(created_at)
  FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
  AND action IN ('cross_tenant_access_blocked', 'access_denied', 'payment_exception')
  GROUP BY action
  ORDER BY COUNT(*) DESC;
"

# Erreurs 5xx des dernières heures
grep " 500 " storage/logs/nginx-access.log | tail -100
```

---

## 2. Confinement immédiat

> **Règle d'or :** Agir vite mais sans panique. Un confinement précipité et mal ciblé peut détruire des preuves ou aggraver la situation.

### 2.1 Actions immédiates (< 15 minutes)

**Étape 1 — Évaluer la sévérité avant d'agir**

Consulter la [grille de sévérité](#8-niveaux-de-sévérité) et identifier le niveau S1/S2/S3/S4.

**Étape 2 — Alerter l'équipe**

```
ALERTE SÉCURITÉ — SECRETIS ERP
Niveau : [S1/S2/S3/S4]
Heure de détection : [HH:MM UTC]
Nature : [ex: Accès non autorisé à des données client]
Détecté par : [Nom / Système]
Actions en cours : [ex: Investigation logs]
```

Contacter immédiatement les [contacts d'urgence](#7-contacts-durgence).

**Étape 3 — Révoquer les accès suspects**

```bash
# Révoquer toutes les sessions d'un utilisateur suspect
php artisan secretis:revoke-user-sessions --user-id=XXX

# Ou manuellement via DB
psql $DATABASE_URL -c "DELETE FROM sessions WHERE user_id = XXX;"

# Révoquer tous les tokens API d'un utilisateur
psql $DATABASE_URL -c "DELETE FROM personal_access_tokens WHERE tokenable_id = XXX;"
```

**Étape 4 — Bloquer une IP suspecte**

```bash
# Via fail2ban
fail2ban-client set secretis-security banip 1.2.3.4

# Via iptables (blocage immédiat)
iptables -I INPUT -s 1.2.3.4 -j DROP

# Via nginx (si fail2ban non disponible)
echo "deny 1.2.3.4;" >> /etc/nginx/conf.d/blocked-ips.conf
nginx -s reload
```

**Étape 5 — Mode maintenance si nécessaire**

```bash
# Activer le mode maintenance (bloque toutes les requêtes)
php artisan down --secret="SECRETIS_MAINTENANCE_TOKEN_$(openssl rand -hex 8)"

# Accès admin pendant la maintenance via le secret
# URL : https://app.secretis.app?secret=SECRETIS_MAINTENANCE_TOKEN_XXXXX
```

### 2.2 Preservation des preuves (AVANT toute modification)

```bash
# Snapshot des logs actuels
tar -czf "/tmp/incident-$(date +%Y%m%d-%H%M%S)-logs.tar.gz" storage/logs/

# Export de la table audit_logs pour la période suspecte
psql $DATABASE_URL -c "COPY (
  SELECT * FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '7 days'
) TO '/tmp/audit_logs_incident.csv' CSV HEADER;"

# Snapshot des connexions actives
ss -tunap > /tmp/active_connections_$(date +%Y%m%d-%H%M%S).txt
ps auxf > /tmp/processes_$(date +%Y%m%d-%H%M%S).txt

# Hasher les fichiers pour prouver l'intégrité des preuves
sha256sum /tmp/incident-*.tar.gz > /tmp/evidence_hashes.txt
```

---

## 3. Analyse et investigation

### 3.1 Reconstruction de la timeline

Objectif : établir avec précision **quoi** a été accédé, **par qui**, **depuis quand**.

```bash
# Timeline complète d'un utilisateur suspect dans audit_logs
psql $DATABASE_URL -c "
  SELECT
    created_at AT TIME ZONE 'UTC' AS timestamp,
    action,
    module,
    resource_type,
    resource_id,
    ip_address,
    new_values
  FROM audit_logs
  WHERE user_id = XXX
  AND created_at > '2026-01-01'
  ORDER BY created_at ASC
  LIMIT 500;
"

# Toutes les ressources accédées par organization_id depuis une IP suspecte
psql $DATABASE_URL -c "
  SELECT DISTINCT resource_type, resource_id, organization_id
  FROM audit_logs
  WHERE ip_address = '1.2.3.4'
  ORDER BY resource_type;
"

# Vérifier si des données ont été exfiltrées (downloads massifs)
psql $DATABASE_URL -c "
  SELECT user_id, COUNT(*) as downloads, MAX(created_at)
  FROM audit_logs
  WHERE action = 'document_downloaded'
  AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY user_id
  ORDER BY downloads DESC;
"
```

### 3.2 Analyse des logs serveur

```bash
# Requêtes d'une IP suspecte (nginx)
grep "1.2.3.4" /var/log/nginx/access.log | grep -v "GET /health"

# Requêtes avec des payloads suspects
grep -E "(select|union|drop|insert|update|delete|exec|system|passthru)" \
  /var/log/nginx/access.log | tail -100

# Tentatives de path traversal
grep -E "\.\./|\.\.\\" /var/log/nginx/access.log | tail -50

# Erreurs d'authentification en masse
grep " 401 \| 403 " /var/log/nginx/access.log | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20
```

### 3.3 Vérification de l'intégrité du code source

```bash
# Vérifier si des fichiers PHP ont été modifiés récemment (hors déploiement)
find /var/www/secretis/backend -name "*.php" -newer /var/www/secretis/.last_deploy -ls

# Comparer les checksums avec le dépôt Git
git -C /var/www/secretis status
git -C /var/www/secretis diff

# Chercher des webshells courants
grep -r "system\|exec\|passthru\|shell_exec\|base64_decode\|eval(" \
  /var/www/secretis/backend/public/ 2>/dev/null

# Vérifier les fichiers récemment uploadés
find /var/www/secretis/storage/app/private -name "*.php" 2>/dev/null
```

### 3.4 Vérification de la base de données

```bash
# Utilisateurs créés récemment avec des rôles élevés
psql $DATABASE_URL -c "
  SELECT u.id, u.email, u.created_at, r.name as role, u.organization_id
  FROM users u
  JOIN model_has_roles mhr ON mhr.model_id = u.id
  JOIN roles r ON r.id = mhr.role_id
  WHERE u.created_at > NOW() - INTERVAL '7 days'
  ORDER BY u.created_at DESC;
"

# Vérifier que audit_logs n'a pas été tronqué (attaque pour couvrir les traces)
psql $DATABASE_URL -c "
  SELECT
    DATE(created_at) as date,
    COUNT(*) as entries
  FROM audit_logs
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
  ORDER BY date;
"
# Si une date a 0 entrées alors qu'il y avait de l'activité → ALERTE

# Vérifier les licences activées sans paiement correspondant
psql $DATABASE_URL -c "
  SELECT l.id, l.organization_id, l.status, l.created_at, l.payment_id,
         p.status as payment_status
  FROM licenses l
  LEFT JOIN payments p ON p.id = l.payment_id
  WHERE l.status = 'active'
  AND (p.status IS NULL OR p.status != 'completed');
"
```

---

## 4. Correction et patch

### 4.1 Processus de correction d'urgence

```
1. Identifier la vulnérabilité précise (ligne de code, endpoint, configuration)
2. Développer le correctif sur une branche dédiée : hotfix/security-YYYYMMDD
3. Peer review OBLIGATOIRE par un deuxième développeur (même en urgence)
4. Tests unitaires et test de pénétration minimal du correctif
5. Déploiement avec fenêtre de maintenance annoncée
6. Vérification post-déploiement
7. Fermer la branche et archiver
```

### 4.2 Déploiement d'urgence

```bash
# 1. Activer la maintenance
php artisan down --secret="MAINTENANCE_SECRET"

# 2. Backup de la base avant le patch
pg_dump $DATABASE_URL > /tmp/backup_pre_patch_$(date +%Y%m%d_%H%M%S).sql

# 3. Déployer le hotfix
git pull origin hotfix/security-YYYYMMDD
composer install --no-dev
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 4. Vider les caches (sessions, rate limits, etc.)
php artisan cache:clear
php artisan session:clear 2>/dev/null || true

# 5. Redémarrer les services
php artisan queue:restart
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx

# 6. Désactiver la maintenance
php artisan up

# 7. Vérification rapide
curl -f https://app.secretis.app/health || echo "HEALTH CHECK FAILED"
```

### 4.3 Rotation des secrets (si compromis)

```bash
# Régénérer APP_KEY (invalide toutes les sessions et cookies chiffrés)
php artisan key:generate --force

# Rotation des clés API Stripe/PayDunya
# → Action à effectuer dans le dashboard du provider de paiement

# Invalider tous les tokens de réinitialisation de mot de passe
psql $DATABASE_URL -c "DELETE FROM password_reset_tokens;"

# Forcer la déconnexion de tous les utilisateurs
psql $DATABASE_URL -c "TRUNCATE TABLE sessions;"

# Révoquer tous les tokens API personnels
psql $DATABASE_URL -c "TRUNCATE TABLE personal_access_tokens;"
```

---

## 5. Communication

### 5.1 Communication interne

**Immédiate (< 30 min) :** Alerter le CTO, le DPO (si données personnelles), le support client.

**Mise à jour toutes les heures** pendant la gestion de l'incident, via le canal dédié #incident-securite.

### 5.2 Communication clients (si données exposées)

**Délai légal RGPD :** 72 heures après la découverte de la violation pour notifier la CNIL.

**Modèle de notification client :**

```
Objet : Information importante concernant la sécurité de votre compte SECRETIS

Madame, Monsieur,

Nous vous contactons pour vous informer d'un incident de sécurité 
survenu entre [DATE_DÉBUT] et [DATE_FIN] sur la plateforme SECRETIS ERP.

Nature de l'incident : [Description générale, sans détail technique]

Données potentiellement concernées : [Liste précise des types de données]

Actions que nous avons prises :
- [Action 1]
- [Action 2]

Ce que nous vous recommandons de faire :
- Changer votre mot de passe dès maintenant : https://app.secretis.app/reset-password
- [Autre recommandation]

Nous restons disponibles pour toute question à sécurité@ibig.africa

Sincèrement,
L'équipe IBIG
```

### 5.3 Notification CNIL / autorités

Si des données personnelles de résidents UE sont concernées :

1. **< 72h :** Notifier la CNIL via [notifications.cnil.fr](https://notifications.cnil.fr)
2. Inclure : nature de la violation, catégories de personnes, nombre approximatif, conséquences probables, mesures prises
3. Si risque élevé pour les personnes : notifier les personnes concernées directement

Si des données de résidents ivoiriens/africains sont concernées :
1. Notifier l'ARTCI (Côte d'Ivoire) ou l'autorité compétente du pays

---

## 6. Post-mortem

### 6.1 Réunion post-mortem

**Délai :** Dans les 5 jours ouvrés suivant la résolution de l'incident.

**Participants :** CTO, DPO, Lead Développeur, Responsable Support.

**Agenda (2h max) :**
1. Timeline factuelle (30 min)
2. Analyse des causes racines — pourquoi est-ce arrivé ? (30 min)
3. Ce qui a bien fonctionné dans la réponse (15 min)
4. Ce qui aurait dû mieux fonctionner (15 min)
5. Plan d'action avec responsables et délais (30 min)

### 6.2 Rapport de post-mortem

Le rapport doit être rédigé dans les 10 jours et inclure :

```markdown
# Post-Mortem — Incident Sécurité [REF-YYYYMMDD]

## Résumé exécutif (1 paragraphe)
## Timeline de l'incident
## Impact (utilisateurs affectés, données exposées, durée)
## Cause racine
## Facteurs contributifs
## Ce qui a bien fonctionné
## Ce qui doit être amélioré
## Plan d'action
| Action | Responsable | Délai | Statut |
|--------|-------------|-------|--------|
```

### 6.3 Plan d'action type

Après chaque incident, mettre à jour :
- Les tests de pénétration (`PenetrationTest.php`) pour couvrir le vecteur d'attaque
- Le rapport d'audit de sécurité (`security-audit.md`)
- Les runbooks d'alerte pour détecter plus tôt ce type d'incident
- La formation de l'équipe si l'incident résulte d'une erreur humaine

---

## 7. Contacts d'urgence

| Rôle | Nom | Contact | Disponibilité |
|------|-----|---------|---------------|
| CTO / Responsable Technique | [À compléter] | [Email + Tel] | 24/7 pour S1 |
| DPO (Protection des données) | [À compléter] | [Email + Tel] | Heures ouvrées |
| Lead Sécurité | [À compléter] | [Email + Tel] | 24/7 pour S1-S2 |
| Support hébergeur | [Hébergeur] | [Ticket / Tel urgence] | 24/7 |
| Contact Stripe (fraude) | Stripe Support | dashboard.stripe.com | 24/7 |
| Contact PayDunya | PayDunya Support | [Email] | Heures ouvrées |

---

## 8. Niveaux de sévérité

| Niveau | Description | Exemples | Délai de réponse | Notification |
|--------|-------------|----------|------------------|--------------|
| **S1 — Critique** | Données compromises, accès non autorisé confirmé, système en panne | Fuite de données, webshell actif, DB exposée | < 15 min | CTO + DPO immédiatement |
| **S2 — Élevé** | Vulnérabilité active exploitable, paiements anormaux | IDOR confirmé, injection SQL trouvée, webhook frauduleux | < 1 heure | CTO + Lead Sécurité |
| **S3 — Moyen** | Tentative d'attaque sans succès confirmé, anomalie significative | Scan IDOR détecté, brute force bloqué, pics cross-tenant | < 4 heures | Lead Sécurité |
| **S4 — Faible** | Anomalie mineure, comportement inhabituel | 1-2 erreurs 403 cross-tenant isolées | Prochain jour ouvré | Log interne |

---

*Ce document doit être revu et mis à jour après chaque incident et au minimum tous les 6 mois.*
