# Checklist de Déploiement SECRETIS ERP v1.0

**Produit :** IBIG SECRETIS ERP  
**Version :** 1.0.0  
**Date de release :** 2026-07-22  
**Équipe :** IBIG SOFT  
**Responsable déploiement :** ___________________________  
**Date de déploiement :** ___________________________  

---

> **Comment utiliser cette checklist**  
> Cocher chaque point uniquement après vérification effective.  
> Les points marqués **[BLOQUANT]** arrêtent le déploiement s'ils ne sont pas satisfaits.  
> Score minimum pour déployer : **45/50 pré-déploiement + 18/20 déploiement**.

---

## PARTIE 1 — PRÉ-DÉPLOIEMENT (50 points)

### 1.1 Infrastructure Serveur (10 points)

| # | Point de contrôle | Statut | Vérifié par |
|---|-------------------|--------|-------------|
| 1 | **[BLOQUANT]** Serveur : 8 vCPU / 16 GB RAM minimum | ☐ | |
| 2 | **[BLOQUANT]** Disque SSD : 100 GB disponibles minimum | ☐ | |
| 3 | **[BLOQUANT]** Ubuntu 22.04 LTS (ou RHEL 9+ équivalent) | ☐ | |
| 4 | DNS configuré : `app.secretis.[domaine]` → IP serveur | ☐ | |
| 5 | DNS configuré : `reverb.secretis.[domaine]` → IP serveur | ☐ | |
| 6 | CDN configuré (Cloudflare ou AWS CloudFront) | ☐ | |
| 7 | **[BLOQUANT]** Certificat SSL Let's Encrypt valide (HTTPS) | ☐ | |
| 8 | Firewall configuré (ports 80, 443, 22 uniquement) | ☐ | |
| 9 | Accès SSH par clé (mot de passe désactivé) | ☐ | |
| 10 | Monitoring serveur activé (CPU, RAM, disque) | ☐ | |

**Score 1.1 : ___/10**

---

### 1.2 Code & Qualité (12 points)

| # | Point de contrôle | Statut | Vérifié par |
|---|-------------------|--------|-------------|
| 11 | **[BLOQUANT]** Tests unitaires : 100% passés (`php artisan test`) | ☐ | |
| 12 | **[BLOQUANT]** Tests feature : 100% passés | ☐ | |
| 13 | Tests E2E Playwright : scénarios critiques passés | ☐ | |
| 14 | Code review effectuée par un second développeur | ☐ | |
| 15 | Aucun `console.log` ou `dd()` dans le code | ☐ | |
| 16 | `APP_DEBUG=false` dans le `.env` production | ☐ | |
| 17 | Aucune clé API ou secret hardcodé dans le code | ☐ | |
| 18 | Version Git taggée : `git tag v1.0.0` | ☐ | |
| 19 | CHANGELOG.md mis à jour | ☐ | |
| 20 | Pas de dépendances npm/composer en conflit de version | ☐ | |
| 21 | Build frontend Vite optimisé (`npm run build`) | ☐ | |
| 22 | Assets statiques minifiés et avec hash (cache busting) | ☐ | |

**Score 1.2 : ___/12**

---

### 1.3 Base de Données (8 points)

| # | Point de contrôle | Statut | Vérifié par |
|---|-------------------|--------|-------------|
| 23 | **[BLOQUANT]** Migrations testées sur copie de la base de production | ☐ | |
| 24 | **[BLOQUANT]** Aucune migration destructive sans sauvegarde préalable | ☐ | |
| 25 | Indexes créés sur les colonnes de filtrage critiques | ☐ | |
| 26 | `database-indexes.sql` appliqué sur la base de production | ☐ | |
| 27 | Seeders de production prêts (plans, rôles par défaut) | ☐ | |
| 28 | Connexion de la base testée depuis le serveur applicatif | ☐ | |
| 29 | Extensions PostgreSQL installées (uuid-ossp, pg_trgm, unaccent) | ☐ | |
| 30 | Accès read-only configuré pour les replicas de lecture | ☐ | |

**Score 1.3 : ___/8**

---

### 1.4 Sécurité (10 points)

| # | Point de contrôle | Statut | Vérifié par |
|---|-------------------|--------|-------------|
| 31 | **[BLOQUANT]** Scan SAST effectué (Snyk ou SonarQube) — 0 vulnérabilité critique | ☐ | |
| 32 | Scan de secrets (GitLeaks) — aucun secret commité dans Git | ☐ | |
| 33 | `composer audit` — aucune vulnérabilité connue | ☐ | |
| 34 | `npm audit` — aucune vulnérabilité critique | ☐ | |
| 35 | En-têtes de sécurité HTTP vérifiés (securityheaders.com) : score A+ | ☐ | |
| 36 | Rate limiting configuré (API : 1000/h, Login : 5/min) | ☐ | |
| 37 | CORS configuré pour le domaine de production uniquement | ☐ | |
| 38 | 2FA activé pour tous les comptes administrateurs | ☐ | |
| 39 | Compte super-admin créé avec IP whitelist | ☐ | |
| 40 | Test de pénétration basique effectué (OWASP Top 10) | ☐ | |

**Score 1.4 : ___/10**

---

### 1.5 Variables d'Environnement (6 points)

| # | Point de contrôle | Statut | Vérifié par |
|---|-------------------|--------|-------------|
| 41 | **[BLOQUANT]** Toutes les variables REQUIRED du `.env.production.example` renseignées | ☐ | |
| 42 | **[BLOQUANT]** Le fichier `.env` n'est PAS commité dans Git (`.gitignore` vérifié) | ☐ | |
| 43 | `APP_KEY` généré (32 caractères, unique à cet environnement) | ☐ | |
| 44 | Clés VAPID générées (`web-push generate-vapid-keys`) | ☐ | |
| 45 | Clé de chiffrement backup générée (`openssl rand -base64 32`) | ☐ | |
| 46 | Webhooks de paiement configurés (CinetPay, Paystack, etc.) | ☐ | |

**Score 1.5 : ___/6**

---

### 1.6 Sauvegardes (4 points)

| # | Point de contrôle | Statut | Vérifié par |
|---|-------------------|--------|-------------|
| 47 | Bucket S3 de backup créé et accessible (`secretis-backups`) | ☐ | |
| 48 | **[BLOQUANT]** Première sauvegarde manuelle effectuée et testée | ☐ | |
| 49 | Restauration testée depuis la sauvegarde | ☐ | |
| 50 | Alertes email configurées en cas d'échec de backup | ☐ | |

**Score 1.6 : ___/4**

---

**SCORE TOTAL PRÉ-DÉPLOIEMENT : ___/50**  
**Seuil minimum pour déployer : 45/50 (avec tous les BLOQUANTS à ✓)**

---

## PARTIE 2 — DÉPLOIEMENT (20 points)

> Exécuter les commandes dans l'ordre. Ne pas passer à l'étape suivante en cas d'erreur.

### 2.1 Mise en Mode Maintenance (4 points)

| # | Action | Commande | Statut |
|---|--------|----------|--------|
| 1 | **[BLOQUANT]** Notifier les utilisateurs (bannière 1h avant) | Dashboard admin → Maintenance | ☐ |
| 2 | **[BLOQUANT]** Activer le mode maintenance | `php artisan down --retry=60 --render="errors.maintenance"` | ☐ |
| 3 | Vérifier que la page de maintenance s'affiche | `curl -I https://app.secretis.[domaine]/` | ☐ |
| 4 | Arrêter les queue workers proprement | `supervisorctl stop secretis-worker:*` | ☐ |

**Score 2.1 : ___/4**

---

### 2.2 Déploiement Code (6 points)

| # | Action | Commande | Statut |
|---|--------|----------|--------|
| 5 | Pull du code (branche `main` taggée `v1.0.0`) | `git pull origin main` | ☐ |
| 6 | Installation dépendances PHP | `composer install --no-dev --optimize-autoloader` | ☐ |
| 7 | Build frontend | `npm ci && npm run build` | ☐ |
| 8 | **[BLOQUANT]** Migrations exécutées sans erreur | `php artisan migrate --force` | ☐ |
| 9 | Seeds de production appliqués | `php artisan db:seed --class=ProductionSeeder --force` | ☐ |
| 10 | Symlink `/var/www/secretis/current` mis à jour | `ln -sfn releases/v1.0.0 current` | ☐ |

**Score 2.2 : ___/6**

---

### 2.3 Cache & Optimisation (5 points)

| # | Action | Commande | Statut |
|---|--------|----------|--------|
| 11 | Effacer tous les caches | `php artisan optimize:clear` | ☐ |
| 12 | Recompiler la configuration | `php artisan config:cache` | ☐ |
| 13 | Recompiler les routes | `php artisan route:cache` | ☐ |
| 14 | Recompiler les vues Blade | `php artisan view:cache` | ☐ |
| 15 | Préchauffage du cache applicatif | `php artisan secretis:cache:warmup` | ☐ |

**Score 2.3 : ___/5**

---

### 2.4 Remise en Ligne (5 points)

| # | Action | Commande | Statut |
|---|--------|----------|--------|
| 16 | Redémarrer PHP-FPM | `sudo systemctl reload php8.2-fpm` | ☐ |
| 17 | Recharger Nginx | `sudo nginx -s reload` | ☐ |
| 18 | **[BLOQUANT]** Désactiver le mode maintenance | `php artisan up` | ☐ |
| 19 | Redémarrer les queue workers | `supervisorctl start secretis-worker:*` | ☐ |
| 20 | Démarrer/redémarrer Reverb (WebSocket) | `supervisorctl restart secretis-reverb` | ☐ |

**Score 2.4 : ___/5**

---

**SCORE TOTAL DÉPLOIEMENT : ___/20**

---

## PARTIE 3 — POST-DÉPLOIEMENT (30 points)

### 3.1 Smoke Tests Fonctionnels (10 points)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 1 | **[BLOQUANT]** Page de connexion accessible | HTTP 200, formulaire visible | ☐ |
| 2 | **[BLOQUANT]** Login avec compte test | Redirection dashboard, pas d'erreur | ☐ |
| 3 | Créer un événement agenda | Événement créé, visible dans le calendrier | ☐ |
| 4 | Uploader un document PDF | Document visible dans la GED | ☐ |
| 5 | Créer un courrier entrant | Courrier visible dans le registre | ☐ |
| 6 | SARA répond à une question basique | Réponse cohérente en < 5s | ☐ |
| 7 | Créer une facture (module comptabilité) | Facture PDF générée correctement | ☐ |
| 8 | Créer une demande de congé | Notification envoyée au responsable | ☐ |
| 9 | API Health endpoint | `GET /up` → HTTP 200 | ☐ |
| 10 | API v1 répond (auth requise) | `GET /api/v1/ping` → HTTP 401 | ☐ |

**Score 3.1 : ___/10**

---

### 3.2 Communications & Notifications (6 points)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 11 | Email de bienvenue envoyé (test sur compte admin) | Email reçu avec mise en page correcte | ☐ |
| 12 | Email de rappel d'événement (forcer via artisan) | Email reçu en < 2 min | ☐ |
| 13 | Notification push PWA reçue (tester sur mobile) | Notification apparaît sur l'écran | ☐ |
| 14 | WebSocket Reverb fonctionnel | Notification temps-réel dans l'interface | ☐ |
| 15 | Alerte Slack de monitoring reçue (test) | Message visible dans le canal Slack | ☐ |
| 16 | WhatsApp Business (si activé) : message test envoyé | Message reçu sur le numéro test | ☐ |

**Score 3.2 : ___/6**

---

### 3.3 Application Mobile (PWA) (4 points)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 17 | PWA installable sur Android (Chrome) | Bouton "Ajouter à l'écran d'accueil" visible | ☐ |
| 18 | PWA installable sur iOS (Safari) | Option "Sur l'écran d'accueil" disponible | ☐ |
| 19 | Application fonctionne hors-ligne (mode offline) | Données en cache consultables sans réseau | ☐ |
| 20 | Score Lighthouse PWA ≥ 90 | Vérifier via Chrome DevTools | ☐ |

**Score 3.3 : ___/4**

---

### 3.4 Monitoring & Observabilité (6 points)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 21 | **[BLOQUANT]** Métriques remontées dans Grafana | Dashboard visible avec données temps-réel | ☐ |
| 22 | Alerte CPU > 80% configurée | Test d'alerte déclenché et reçu | ☐ |
| 23 | Alerte disque > 85% configurée | Alert rule active dans Grafana | ☐ |
| 24 | Sentry configuré et test d'erreur tracé | Erreur test visible dans Sentry | ☐ |
| 25 | Rapport monitoring quotidien (planifié 08h00) | `php artisan secretis:monitoring:daily-report` fonctionne | ☐ |
| 26 | Uptime monitor configuré (UptimeRobot ou équivalent) | Alerte si downtime > 2 min | ☐ |

**Score 3.4 : ___/6**

---

### 3.5 Sauvegardes & CRON (4 points)

| # | Test | Résultat attendu | Statut |
|---|------|-----------------|--------|
| 27 | **[BLOQUANT]** Backup automatique déclenché manuellement | Fichier .dump.gz visible dans S3 | ☐ |
| 28 | Restauration testée depuis ce backup | Base restaurée avec succès | ☐ |
| 29 | **[BLOQUANT]** Scheduler CRON actif | `php artisan schedule:list` liste les tâches | ☐ |
| 30 | Tâche CRON testée (`secretis:health:check`) | `php artisan secretis:health:check` → succès | ☐ |

**Score 3.5 : ___/4**

---

**SCORE TOTAL POST-DÉPLOIEMENT : ___/30**

---

## RÉCAPITULATIF FINAL

| Partie | Score obtenu | Score maximum | Seuil minimum |
|--------|-------------|--------------|---------------|
| 1. Pré-déploiement | _____ | 50 | 45 |
| 2. Déploiement | _____ | 20 | 18 |
| 3. Post-déploiement | _____ | 30 | 25 |
| **TOTAL** | **_____** | **100** | **88** |

**Décision de déploiement :**
- [ ] GO — Score ≥ 88 et tous les BLOQUANTS validés
- [ ] NO-GO — Score < 88 ou au moins un BLOQUANT non validé

**Responsable déploiement :** _________________________ **Date :** _____________

**Signature validation GO :** _________________________ **Date :** _____________

---

## PROCÉDURE DE ROLLBACK D'URGENCE

En cas de problème critique après déploiement :

```bash
# 1. Activer le mode maintenance
php artisan down --retry=60

# 2. Rétablir le symlink vers la version précédente
ln -sfn /var/www/secretis/releases/[VERSION_PRÉCÉDENTE] /var/www/secretis/current

# 3. Recharger PHP-FPM et Nginx
sudo systemctl reload php8.2-fpm && sudo nginx -s reload

# 4. Redémarrer les workers
supervisorctl restart secretis-worker:*

# 5. Remettre en ligne
php artisan up

# 6. Notifier l'équipe
# → Slack #incidents
# → Email admin@ibigsoft.com
```

**Contact urgence :** admin@ibigsoft.com | Slack : #secretis-incidents

---

*Document généré le 2026-07-22 — IBIG SOFT*
