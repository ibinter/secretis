# Guide Opérateur — IBIG SECRETIS

**Destinataires :** Équipe IBIG Soft — Opérateurs et Administrateurs de la plateforme
**Version produit :** 2.1.0
**Date :** 2026-07-23
**Confidentialité :** Interne IBIG Soft — Ne pas diffuser aux clients

Ce guide décrit les opérations courantes et d'urgence que l'équipe IBIG Soft effectue pour gérer la plateforme SECRETIS. Chaque section indique le rôle requis, le chemin d'accès et les actions pas à pas.

---

## 1. Accès à la console SuperAdmin

**Rôle requis :** SuperAdmin IBIG (email `@ibigsoft.com`)

### Connexion
1. Accéder à `https://secretis.ibigsoft.com/superadmin`
2. Saisir vos identifiants SuperAdmin (email + mot de passe)
3. Valider le TOTP (Google Authenticator ou Authy) — code à 6 chiffres renouvelé toutes les 30 secondes
4. Le tableau de bord SuperAdmin s'affiche : métriques temps réel, alertes actives, activité récente

### Sections principales de la console
| Section | URL | Usage |
|---|---|---|
| Dashboard | `/superadmin` | Vue d'ensemble plateforme |
| Organisations | `/superadmin/organizations` | Gestion des clients |
| Utilisateurs | `/superadmin/users` | Recherche et gestion globale |
| Plans et licences | `/superadmin/plans` | Tarification |
| Tickets support | `/superadmin/tickets` | File de support L2/L3 |
| Annonces | `/superadmin/announcements` | Messages in-app clients |
| Paiements | `/superadmin/payments` | Preuves manuelles, historique |
| Métriques SARA | `/superadmin/sara` | Usage IA |
| Horizon | `/horizon` | Files de jobs |
| Logs | `/superadmin/logs` | Journaux sécurité et performance |

### Impersonation d'un utilisateur (débogage)
Uniquement pour diagnostiquer un problème signalé par un client :
1. Dans **Organisations**, trouver l'organisation concernée
2. Cliquer **Voir les utilisateurs**
3. Sur la ligne de l'utilisateur : bouton **Impersonner**
4. L'interface bascule dans le contexte de cet utilisateur — bandeau orange « Mode impersonation » visible en permanence
5. Pour revenir : cliquer **Quitter l'impersonation** dans le bandeau

> **Attention :** Toute impersonation est journalisée dans `audit_logs` avec le motif. Saisir toujours le numéro de ticket support comme motif.

---

## 2. Créer une nouvelle organisation cliente

**Rôle requis :** SuperAdmin IBIG
**Déclencheur :** Signature d'un contrat, validation d'un paiement, demande de démo confirmée

### Procédure
1. Dans la console : **Organisations → Nouvelle organisation**
2. Remplir le formulaire :
   - **Nom** : raison sociale exacte du client
   - **Slug** : identifiant URL unique (ex. `benkadi-consulting`) — vérifier l'absence de doublon
   - **Plan** : Starter / Pro / Enterprise (selon le contrat signé)
   - **Pays** : sélectionner le pays principal (détermine la devise par défaut et les règles OHADA)
   - **Devise** : XOF, XAF, GHS, USD, EUR — confirmée avec le client
   - **Langue par défaut** : FR, EN, AR, PT, SW, HA
   - **Date d'expiration de la licence** : date de fin de l'abonnement ou `null` pour perpétuel
3. Cocher **Envoyer l'email de bienvenue** — l'email `bienvenue.mjml` est envoyé à l'administrateur client avec ses identifiants temporaires
4. Cliquer **Créer l'organisation**
5. L'organisation apparaît dans la liste avec statut `Active`

### Création du premier compte administrateur client
Après la création de l'organisation :
1. Aller dans l'onglet **Utilisateurs** de l'organisation
2. Cliquer **Inviter un administrateur**
3. Saisir l'email de l'administrateur client
4. Sélectionner le rôle **Admin** (peut gérer l'organisation, créer des utilisateurs)
5. L'invitation email est envoyée — l'administrateur reçoit un lien valable 48h pour définir son mot de passe et activer le MFA

### Activer les modules
Dans l'onglet **Modules** de l'organisation :
- Les modules inclus dans le plan sont activés par défaut
- Pour activer un module Enterprise en dehors du plan (add-on facturé) : cocher la case et saisir le tarif mensuel additionnel
- Cliquer **Sauvegarder les modules**

---

## 3. Configurer un plan tarifaire

**Rôle requis :** SuperAdmin IBIG
**Accès :** `/superadmin/plans`

### Créer un nouveau plan
1. Cliquer **Nouveau plan**
2. Remplir :
   - **Nom** : Starter / Pro / Enterprise / Sur-mesure (affiché sur la landing page)
   - **Prix mensuel** et **Prix annuel** (réduction annuelle ≥ 20% recommandée)
   - **Devise** : par défaut XOF — un plan peut avoir des prix dans plusieurs devises
   - **Utilisateurs inclus** : nombre maximum d'utilisateurs actifs
   - **Stockage** : quota en Go par organisation
   - **Modules inclus** : liste des modules activés pour ce plan (cocher/décocher)
   - **Support inclus** : SLA associé (8h/5j, 24h/5j, 24h/7j, dédié)
3. **Statut** : `Brouillon` pendant la configuration, passer à `Actif` pour le rendre visible sur la landing page

### Modifier un plan existant
Les modifications s'appliquent aux **nouvelles** souscriptions uniquement. Les clients existants restent sur les conditions de leur contrat jusqu'au renouvellement.
1. Trouver le plan → cliquer **Modifier**
2. Effectuer les modifications
3. **Option « Migrer les organisations »** : si cochée, une liste des organisations sur ce plan s'affiche avec les nouvelles conditions — migration après confirmation explicite

### Désactiver un plan
Passer le statut à `Archivé` : invisible sur la landing page, les organisations existantes conservent leur accès.

---

## 4. Traiter une preuve de paiement manuelle

**Rôle requis :** Opérateur support ou SuperAdmin IBIG
**Déclencheur :** Client ayant effectué un virement bancaire, paiement chèque ou Mobile Money sans webhook automatique

**Accès :** `/superadmin/payments` → onglet **En attente de validation**

### Procédure de validation
1. Localiser le paiement en attente (filtrer par organisation ou par date)
2. Cliquer **Voir la preuve** — la pièce jointe (PDF, image) s'ouvre dans un panneau latéral
3. Vérifier les éléments obligatoires :
   - Montant correspond au plan et à la période
   - IBAN ou numéro de compte destinataire est bien celui d'IBIG SARL
   - Date de virement dans les 30 derniers jours
   - Nom de l'organisation ou référence facture lisible
4. Si tout est conforme :
   - Cliquer **Valider le paiement**
   - Saisir la **référence interne** (numéro de virement ou de chèque)
   - La licence est prolongée automatiquement, la facture PDF est générée et envoyée par email au client
5. Si la preuve est insuffisante :
   - Cliquer **Demander un complément**
   - Rédiger le message au client (modèle disponible dans l'éditeur)
   - Le ticket de support associé est mis à jour

### Paiement partiel ou en plusieurs fois
1. Valider le premier versement en cochant **Paiement partiel**
2. Saisir le montant réellement reçu et le montant total attendu
3. La licence est prolongée au prorata, et un rappel automatique est planifié à J+30

---

## 5. Répondre à un ticket support

**Rôle requis :** Opérateur support (L1), Tech Lead (L2), Dev (L3)

**Accès :** `/superadmin/tickets`

### Traitement d'un ticket entrant
1. Les tickets sont triés par priorité : **Critique** (rouge), **Haute** (orange), **Normale** (jaune), **Basse** (gris)
2. Cliquer sur un ticket non assigné → bouton **M'assigner**
3. Lire le historique complet du ticket et les informations de l'organisation (plan, modules actifs, dernière connexion)
4. **Outils de diagnostic disponibles** dans le panneau droit du ticket :
   - **Logs récents** de l'organisation (50 dernières lignes)
   - **Jobs Horizon** en cours pour cette organisation
   - **Métriques** : usage CPU et RAM au moment du signalement
5. Rédiger la réponse dans l'éditeur (Markdown supporté, possibilité d'insérer un article du guide via `@article`)
6. Sélectionner le **statut** de mise à jour : `En attente client`, `En cours d'investigation`, `Résolu`
7. Si résolu : cliquer **Marquer comme résolu** — un email de satisfaction est envoyé au client 30 minutes après

### Escalade
- **L1 → L2** : ticket technique complexe ou bug reproductible — cliquer **Escalader** → sélectionner `L2 Technique` → ajouter les étapes de reproduction
- **L2 → L3** : bug bloquant en production — tag `#urgent` obligatoire, notification Slack `#incidents` déclenchée
- **SLA breach** : si le délai de première réponse est dépassé, le ticket passe en rouge et le responsable support reçoit un email d'alerte

### Réponses types (macros)
Accéder aux macros via le bouton **Insérer une macro** dans l'éditeur :
- Macro `reset-mfa` : procédure de réinitialisation MFA pour un utilisateur
- Macro `clear-cache` : commande à exécuter si le client signale des données périmées
- Macro `sara-quota` : explication du quota SARA et comment le consulter
- Macro `export-donnees` : procédure export RGPD complet

---

## 6. Surveiller la santé de la plateforme

**Rôle requis :** DevOps, SuperAdmin IBIG
**Routine recommandée :** vérification quotidienne matin et soir

### Dashboard de santé (`/superadmin`)
Métriques disponibles en temps réel :
| Métrique | Seuil vert | Seuil orange | Seuil rouge |
|---|---|---|---|
| Organisations actives (connexion < 24h) | — | — | Baisse > 20% |
| CPU serveur | < 60% | 60-80% | > 80% |
| RAM serveur | < 70% | 70-85% | > 85% |
| Espace disque | > 30% libre | 20-30% libre | < 20% libre |
| Workers Horizon actifs | 18 | < 18 | 0 |
| Jobs en retard (lag > 5 min) | 0 | 1-10 | > 10 |
| Taux d'erreur HTTP 5xx | < 0.1% | 0.1-1% | > 1% |
| Temps de réponse API médian | < 200ms | 200-800ms | > 800ms |

### Vérification manuelle en cas d'alerte
```bash
# Statut des services systemd
systemctl status nginx php8.2-fpm reverb horizon

# Logs d'erreur récents
tail -100 /var/www/secretis/storage/logs/laravel.log | grep -i error

# File Horizon
php artisan horizon:status

# Redis
redis-cli info stats | grep instantaneous_ops_per_sec

# PostgreSQL connexions actives
psql -U secretis -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"

# Espace disque
df -h /var/www/secretis/storage
```

### Page status publique
La page `status.ibig-secretis.com` est générée statiquement toutes les 5 minutes par un job Horizon.
Si un service est en incident, mettre à jour le statut manuellement via :
`/superadmin/status` → sélectionner le service → choisir le statut → ajouter un message d'incident.

---

## 7. Effectuer une restauration d'urgence

**Rôle requis :** DevOps, Tech Lead
**Déclencheur :** Perte de données, corruption de base, migration ratée

> **Règle d'or :** toujours restaurer sur un environnement de staging en premier pour valider que la sauvegarde est intègre.

### Restauration complète (base de données + fichiers)

```bash
# 1. Mettre l'application en maintenance
php artisan down --secret="ibig-maintenance-2026"

# 2. Identifier la dernière sauvegarde disponible
ls -lh /var/backups/secretis/ | tail -20
# ou via l'interface : /superadmin/backups → liste des archives

# 3. Télécharger et déchiffrer l'archive
gpg --decrypt --passphrase "$BACKUP_ARCHIVE_PASSWORD" \
    backup_2026-07-23_03-00.tar.gz.gpg > backup_2026-07-23.tar.gz

# 4. Vérifier l'intégrité SHA-256
sha256sum backup_2026-07-23.tar.gz
# Comparer avec le hash enregistré dans /superadmin/backups

# 5. Extraire l'archive
tar -xzf backup_2026-07-23.tar.gz -C /tmp/restore/

# 6. Restaurer la base PostgreSQL
psql -U postgres -c "DROP DATABASE secretis_production;"
psql -U postgres -c "CREATE DATABASE secretis_production OWNER secretis;"
pg_restore -U secretis -d secretis_production /tmp/restore/db/secretis.dump

# 7. Restaurer les fichiers stockage
rsync -avz /tmp/restore/storage/ /var/www/secretis/storage/app/

# 8. Vider les caches
php artisan cache:clear
php artisan config:cache
php artisan route:cache

# 9. Vérifier l'intégrité applicative
php artisan secretis:health:check

# 10. Relever la maintenance
php artisan up
```

### Restauration d'une organisation spécifique (perte partielle)
Si un seul client a perdu des données sans affecter les autres :
1. Via `/superadmin/backups` → sélectionner la sauvegarde → **Restauration partielle**
2. Saisir l'`organization_id` de l'organisation concernée
3. Sélectionner les tables à restaurer (courrier, documents, comptabilité…)
4. Lancer la restauration — un job Horizon prend en charge la restauration partielle sans interruption de service

### Après toute restauration
- Envoyer un email aux clients affectés (modèle `incident-restauration` dans les macros)
- Documenter l'incident dans `docs/incidents/INCIDENT_YYYY-MM-DD.md`
- Planifier un post-mortem dans les 48h
- Vérifier et renforcer la procédure de sauvegarde si la cause était une défaillance de backup

---

## 8. Gérer les annonces in-app

**Rôle requis :** Opérateur support, SuperAdmin IBIG
**Accès :** `/superadmin/announcements`

### Types d'annonces disponibles
| Type | Affichage | Usage |
|---|---|---|
| **Info** (bleu) | Bandeau haut de page, fermable | Nouvelles fonctionnalités, conseils |
| **Maintenance** (orange) | Bandeau persistant, non fermable | Maintenance planifiée |
| **Urgent** (rouge) | Modal au chargement + bandeau | Incident en cours, action requise |
| **Promotion** (vert) | Encart latéral, fermable | Offre commerciale |

### Créer une annonce
1. Cliquer **Nouvelle annonce**
2. Remplir :
   - **Titre** : court et précis (max 80 caractères)
   - **Contenu** : Markdown supporté, possibilité d'insérer un lien CTA
   - **Type** : Info / Maintenance / Urgent / Promotion
   - **Ciblage** : Toutes les organisations / Plan spécifique / Organisation individuelle / Rôle utilisateur
   - **Date de début** et **Date de fin** (fin automatique pour les maintenances)
   - **Langues** : FR / EN / AR / PT / SW / HA — si une langue n'est pas fournie, FR est utilisé par défaut
3. Cliquer **Prévisualiser** pour vérifier l'affichage dans les deux thèmes (clair et sombre)
4. Cliquer **Publier** (ou planifier une publication future)

### Annonce de maintenance planifiée (procédure)
Au minimum 48h avant la maintenance :
1. Créer une annonce type `Maintenance` avec les heures exactes (fuseau horaire Abidjan GMT+0)
2. Ciblage : **Toutes les organisations**
3. Envoyer en parallèle un email via le menu **Emails groupés** → modèle `maintenance-planifiee`

---

## 9. Consulter les métriques SARA

**Rôle requis :** Tech Lead, SuperAdmin IBIG
**Accès :** `/superadmin/sara`

### Métriques disponibles

**Usage quotidien**
- Nombre de conversations initiées (total plateforme et par organisation)
- Nombre de messages envoyés à SARA
- Tokens consommés (Groq / Anthropic / OpenAI) — coût estimé en USD
- Provider actif (basculement automatique si Groq indisponible)
- Top 10 des intentions détectées

**Qualité des réponses**
- Taux de satisfaction (pouces haut/bas) par provider et par module
- Taux de réponses hors sujet détectées par les garde-fous
- Temps de réponse moyen (p50, p95, p99) par provider

**Alertes automatiques**
- Quota mensuel Groq atteint à 80% → email `devops@ibigsoft.com`
- Taux de satisfaction < 70% sur 100 messages → ticket interne automatique
- Provider principal indisponible > 2 minutes → basculement automatique + email alerte

### Ajuster les quotas SARA par organisation
Dans `/superadmin/organizations` → organisation concernée → onglet **SARA** :
- **Messages par jour** : quota par défaut selon le plan (Starter: 100, Pro: 500, Enterprise: illimité)
- **Providers autorisés** : cocher/décocher Groq, Anthropic, OpenAI
- **Mode Expert** : activer/désactiver pour l'organisation

---

## 10. Procédure de mise à jour de la plateforme

**Rôle requis :** Tech Lead, DevOps
**Fréquence :** À chaque release officielle (voir CHANGELOG.md)

### Mise à jour en zero-downtime (blue/green)

```bash
# 1. Vérifier que tous les tests passent sur staging
# → CI/CD GitHub Actions doit afficher "All checks passed"

# 2. Créer un snapshot de la base de données
pg_dump secretis_production > /var/backups/pre-update-$(date +%Y%m%d_%H%M).sql

# 3. Préparer le nouveau code sans interruption de service
git fetch origin
git checkout v2.1.0

# 4. Installer les dépendances (sans interruption)
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 5. Passer en maintenance (secret invisible des utilisateurs normaux)
php artisan down --secret="ibig-deploy-token"

# 6. Appliquer les migrations
php artisan migrate --force

# 7. Reconstruire les caches
php artisan optimize
php artisan secretis:cache:warm

# 8. Relancer les workers Horizon (pick up new job classes)
php artisan horizon:terminate
# Supervisor relance Horizon automatiquement

# 9. Lever la maintenance
php artisan up

# 10. Vérifier la santé
php artisan secretis:health:check
curl -s https://secretis.ibigsoft.com/api/health | jq .

# 11. Surveiller les logs pendant 15 minutes
tail -f /var/www/secretis/storage/logs/laravel.log
```

### Rollback si problème détecté dans les 30 minutes
```bash
# Revenir au code précédent
git checkout v2.0.0
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# Restaurer la base (si des migrations ont été appliquées)
php artisan migrate:rollback --step=N  # N = nombre de nouvelles migrations

# Reconstruire les caches
php artisan optimize

# Lever la maintenance
php artisan up
```

### Checklist post-déploiement
- [ ] `php artisan secretis:health:check` retourne tous les services `OK`
- [ ] Lighthouse Performance dashboard > 80
- [ ] Connexion testée avec les rôles Admin et Employee
- [ ] SARA répond correctement (test : « Comment créer un courrier ? »)
- [ ] Horizon Dashboard : tous les workers actifs, file vide
- [ ] Sentry : aucune nouvelle erreur critique dans les 15 minutes post-déploiement
- [ ] Page status.ibig-secretis.com : `All systems operational`
- [ ] Annonce in-app créée pour informer les clients de la nouvelle version (type Info, lien vers le changelog public)

---

*Document interne IBIG Soft — Version 2.1.0 — 2026-07-23*
*Mis à jour à chaque release majeure par l'équipe Engineering*
