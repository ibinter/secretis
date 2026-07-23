# Checklist Pré-Lancement — IBIG SECRETIS v2.1.0

**Date de référence :** 2026-07-23
**Version produit :** 2.1.0 — Phase Qualité
**Responsable validation :** Équipe DevOps IBIG Soft
**À valider avant tout déploiement en production**

Chaque case doit être cochée par la personne responsable, avec sa signature et l'horodatage. Un item bloquant non coché interdit le lancement.

---

## Section 1 — Infrastructure

**Responsable : DevOps / Administrateur système**

- [ ] **Serveur** : CPU 8 cœurs minimum, RAM 16 Go minimum, SSD 200 Go minimum (NVMe recommandé)
- [ ] **Réseau** : bande passante montante ≥ 100 Mbps, latence vers le stockage objet < 10 ms
- [ ] **PostgreSQL 15+** installé, configuré avec `max_connections=200`, `shared_buffers=4GB`, `work_mem=64MB`
- [ ] **PgBouncer** configuré en mode transaction (connection pooling) : pool_size=50 par utilisateur
- [ ] **Redis 7+** installé, persistence AOF activée (`appendonly yes`), `maxmemory-policy allkeys-lru`
- [ ] **Nginx** configuré avec TLS 1.3 uniquement (TLS 1.0 et 1.1 désactivés), OCSP stapling actif
- [ ] **Certificat SSL** : domaine principal + wildcard `*.ibig-secretis.com`, validité ≥ 90 jours
- [ ] **Docker** : version 25+ installée, Docker Compose v2.24+ disponible
- [ ] **`docker compose config`** exécuté sans erreur sur le fichier `docker-compose.prod.yml`
- [ ] **Ports ouverts** : 80 (HTTP → redirect 443), 443 (HTTPS), 6001 (Reverb WebSocket)
- [ ] **Pare-feu** : ports 5432 (PostgreSQL) et 6379 (Redis) fermés à l'extérieur
- [ ] **Swap** : 8 Go minimum configurés sur le serveur hôte
- [ ] **Monitoring système** : Netdata ou équivalent installé, alertes CPU > 80% et RAM > 85% actives

---

## Section 2 — Variables d'environnement

**Responsable : Tech Lead / DevOps**

- [ ] **`APP_KEY`** généré (`php artisan key:generate`) — 32 caractères base64, jamais versionné en git
- [ ] **`APP_ENV=production`** et **`APP_DEBUG=false`** — vérification double obligatoire
- [ ] **`APP_URL`** correspond exactement au domaine de production avec HTTPS
- [ ] **`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`** testés : `php artisan db:show` retourne les infos sans erreur
- [ ] **`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`** testés : `redis-cli ping` retourne `PONG`
- [ ] **`MAIL_*`** configurés (SMTP, Mailgun, Amazon SES ou Postmark) — test d'envoi vérifié sur boîte réelle
- [ ] **`VAPID_PUBLIC_KEY`** et **`VAPID_PRIVATE_KEY`** générés (`php artisan webpush:vapid`)
- [ ] **`GROQ_API_KEY`** valide — SARA répond en < 3 secondes sur le prompt de test
- [ ] **Clés paiement production** : Orange Money, Wave, MTN MoMo, Moov Money, Stripe — clés live (non sandbox)
- [ ] **`STRIPE_WEBHOOK_SECRET`** configuré, endpoint enregistré dans le dashboard Stripe
- [ ] **`REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`** configurés, port 6001 accessible
- [ ] **`MEILISEARCH_HOST`** et **`MEILISEARCH_KEY`** configurés — index synchronisés
- [ ] **`AWS_BUCKET`** ou **`MINIO_BUCKET`** configuré — test d'upload réussi (`php artisan storage:link`)
- [ ] **`BACKUP_ARCHIVE_PASSWORD`** défini (généré avec `openssl rand -base64 32`), stocké en vault sécurisé
- [ ] **`SENTRY_LARAVEL_DSN`** configuré — test de remontée d'exception vérifié dans le tableau de bord Sentry
- [ ] Fichier `.env` protégé : permissions `640`, propriétaire `www-data:www-data`

---

## Section 3 — Base de données

**Responsable : DBA / Tech Lead**

- [ ] **140 migrations appliquées** : `php artisan migrate:status` — chaque ligne affiche `Ran` (aucun `Pending`)
- [ ] **Seeders production exécutés** : `php artisan db:seed --class=ProductionSeeder` — plans tarifaires, modules, FAQ (100 entrées), Guide (31 articles), Centre d'aide (8 catégories)
- [ ] **Index vérifiés** : requête `SELECT indexname, tablename FROM pg_indexes WHERE schemaname='public' ORDER BY tablename;` — les 12 index composites v2.1.0 sont présents
- [ ] **Contraintes de clé étrangère** : `SELECT count(*) FROM pg_constraint WHERE contype='f';` — valeur cohérente avec le schéma
- [ ] **Point de restauration** créé avant le premier lancement : `pg_dump secretis_production > backup_prelancement_$(date +%Y%m%d_%H%M).sql`
- [ ] **Sauvegarde automatique** configurée : tâche cron `0 2 * * *` → `php artisan backup:run`, rétention 30 jours
- [ ] **Test de restauration** effectué sur un environnement de staging à partir d'une sauvegarde réelle
- [ ] **Rôle PostgreSQL** de l'application n'a PAS les droits `SUPERUSER` ni `CREATEDB`
- [ ] **Extensions PostgreSQL** activées : `uuid-ossp`, `pg_trgm` (recherche full-text), `btree_gin`
- [ ] **`ANALYZE`** exécuté après les seeders : `ANALYZE;` dans psql

---

## Section 4 — Optimisation de l'application

**Responsable : Tech Lead**

- [ ] `composer install --optimize-autoloader --no-dev` — aucune dépendance dev présente en production
- [ ] `npm ci && npm run build` — assets compilés dans `public/build/`, manifest.json présent
- [ ] `php artisan config:cache` — fichier `bootstrap/cache/config.php` généré
- [ ] `php artisan route:cache` — fichier `bootstrap/cache/routes-v7.php` généré
- [ ] `php artisan view:cache` — templates Blade pré-compilés dans `storage/framework/views/`
- [ ] `php artisan event:cache` — listeners Eloquent mappés
- [ ] `php artisan icons:cache` — icônes Blade mis en cache
- [ ] `php artisan storage:link` — lien symbolique `public/storage` → `storage/app/public`
- [ ] **OpCache** activé en production : `opcache.enable=1`, `opcache.memory_consumption=256`, `opcache.preload=/var/www/secretis/config/preload.php`
- [ ] **Preload** : 48 classes critiques listées dans `config/preload.php` — `php -r "opcache_compile_file('...');"` sans erreur
- [ ] Répertoire `storage/` et `bootstrap/cache/` : permissions `775`, propriétaire `www-data`

---

## Section 5 — Files d'attente et tâches planifiées

**Responsable : DevOps**

- [ ] **Laravel Horizon** démarré et supervisé par systemd : `systemctl status horizon` → `active (running)`
- [ ] **3 superviseurs Horizon** configurés dans `config/horizon.php` : `general` (10 workers), `reports` (5 workers), `imports` (3 workers)
- [ ] **Horizon Dashboard** accessible sur `/horizon` — uniquement pour les SuperAdmins IBIG (middleware d'accès configuré)
- [ ] **Scheduler** actif dans la crontab : `* * * * * www-data php /var/www/secretis/artisan schedule:run >> /dev/null 2>&1`
- [ ] **Files vérifiées** : `php artisan queue:monitor high,default,reports,imports,emails,notifications` — 0 job en attente depuis > 5 min
- [ ] **`CacheWarmupCommand`** planifiée à 02h00 : entrée `$schedule->command('secretis:cache:warm')->dailyAt('02:00')` présente dans `app/Console/Kernel.php`
- [ ] **Backup automatique** planifié : `$schedule->command('backup:run')->dailyAt('03:00')` configuré
- [ ] **Nettoyage logs** planifié : `$schedule->command('telescope:prune')->daily()` configuré
- [ ] Test manuel d'un job Horizon : dispatch d'un `GenerateReportJob` → apparaît dans le dashboard, se traite, disparaît

---

## Section 6 — WebSocket (Laravel Reverb)

**Responsable : DevOps / Tech Lead**

- [ ] **Laravel Reverb** démarré sur le port 6001 : `systemctl status reverb` → `active (running)`
- [ ] **Reverse proxy Nginx** configuré pour le WebSocket : `proxy_pass http://127.0.0.1:6001`, headers `Upgrade` et `Connection` transmis
- [ ] **Test de connexion WebSocket** : ouvrir la console développeur du navigateur — `Echo.channel('test').listen(...)` sans erreur `WebSocket connection failed`
- [ ] **Reconnexion automatique** testée : couper et rétablir Reverb — le frontend se reconnecte en < 5 secondes sans rechargement de page
- [ ] **Certificat SSL** couvre le sous-domaine WebSocket (`wss://secretis.ibigsoft.com`)
- [ ] **Supervision** : Reverb inclus dans le même groupe systemd que Horizon pour redémarrage automatique

---

## Section 7 — Sécurité

**Responsable : Tech Lead / RSSI**

- [ ] `php artisan secretis:security-audit` : **0 erreur critique**, résultat `ALL_CLEAR` affiché en vert
- [ ] **Headers HTTP** vérifiés sur [securityheaders.com](https://securityheaders.com) : note minimale **A** — CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy tous présents
- [ ] **CSP testé** : console navigateur sans aucune erreur `Content Security Policy: The page's settings blocked…`
- [ ] **Rate limiting testé** : 25 requêtes d'affilée depuis une IP anonyme → réponse `429 Too Many Requests` à la 21ème
- [ ] **Test anti-IDOR** : utilisateur de l'organisation A ne peut pas accéder aux données de l'organisation B via l'URL (retour 403 ou 404)
- [ ] **MFA testé** : connexion avec un compte MFA activé — TOTP vérifié avec Google Authenticator
- [ ] **Clés API** stockées chiffrées en base (`encrypted:` prefix sur les colonnes sensibles)
- [ ] **`.env`** absent du dépôt git : `git log --all -- .env` ne retourne aucun commit
- [ ] **Force brute** testée : 6 tentatives de connexion échouées → IP bloquée 15 minutes, email d'alerte reçu par le SuperAdmin
- [ ] **Scan OWASP ZAP** ou équivalent effectué — rapport sauvegardé dans `docs/audits/`

---

## Section 8 — Tests fonctionnels

**Responsable : QA / Tech Lead**

- [ ] **Connexion** testée avec les 10 rôles : SuperAdmin, Admin, Manager, Employee, Comptable, RH, Commercial, Support, Invité, API
- [ ] **MFA** : activation et utilisation testées sur au moins 3 rôles différents
- [ ] **SARA** répond en < 3 secondes sur les prompts de test de chaque module
- [ ] **Paiement sandbox** validé : Orange Money CI test → facture générée → PDF reçu par email
- [ ] **Paiement production** : au moins un paiement réel effectué (montant symbolique) avant ouverture au public
- [ ] **Email transactionnel** : chacun des 13 templates reçu et affiché correctement (mobile + desktop)
- [ ] **Push notification** : notification push mobile reçue sur iOS et Android
- [ ] **Import CSV** : fichier de 500 lignes importé sans erreur — résultat vérifié en base
- [ ] **Export PDF** : rapport mensuel paie + balance âgée générés, structure OHADA correcte
- [ ] **Backup** : backup déclenché manuellement, archive téléchargée, intégrité SHA-256 vérifiée
- [ ] **Signature électronique** : document signé, QR code de vérification fonctionnel
- [ ] **Mode hors-ligne mobile** : coupure réseau sur mobile, actions locales, resynchronisation après reconnexion
- [ ] **PWA installation** testée sur Chrome Desktop (Windows + macOS) et Safari Mobile (iOS)

---

## Section 9 — Performance

**Responsable : Tech Lead**

- [ ] **Temps de chargement dashboard** < 2 secondes (réseau 50 Mbps, cache chaud)
- [ ] **Lighthouse Performance** > 80 sur la page de connexion et le dashboard (Chrome DevTools → Lighthouse)
- [ ] **Lighthouse Accessibilité** > 95 sur les 5 pages principales
- [ ] **Lighthouse PWA** > 90 : Service Worker actif, manifest valide, HTTPS
- [ ] **k6 smoke test** passé : 2 VUs / 30 secondes — 0 erreurs, p95 < 500ms
- [ ] **k6 load test** passé : 50 VUs / 10 minutes — taux d'erreur < 1%, p95 < 1000ms
- [ ] **Cache Redis** préchauffé : `php artisan secretis:cache:warm` exécuté — log `[OK] Cache warmed: 847 entries` affiché
- [ ] **OpCache hit rate** > 95% après 5 minutes de trafic : vérifiable via `/telescope` ou `opcache_get_status()`
- [ ] **Horizon** : aucune file en retard (lag > 0) sur le dashboard après 10 minutes de trafic de test

---

## Section 10 — Application mobile

**Responsable : Mobile Lead**

- [ ] **Build EAS** production généré pour iOS (`.ipa`) et Android (`.aab`) — build ID enregistré
- [ ] **App Store Connect** : build soumis, statut `Processing` ou `Ready for Review`
- [ ] **Google Play Console** : build uploadé sur la piste de production interne
- [ ] **Biométrie** testée sur iPhone (Face ID), iPad (Touch ID), Android (empreinte) — déverrouillage fonctionnel
- [ ] **Mode hors-ligne** : 10 actions effectuées sans réseau, synchronisées correctement à la reconnexion
- [ ] **Push notifications** reçues sur iOS (APNs) et Android (FCM) — délai < 5 secondes
- [ ] **Deep links** fonctionnels : URL `secretis://events/[id]` ouvre le bon écran dans l'app
- [ ] **Version minimale** : iOS 16.0 et Android 12 (API 31) confirmés dans la config Expo
- [ ] **Permissions** demandées au bon moment : caméra (scan QR), notifications (premier lancement), biométrie (profil)

---

## Section 11 — Monitoring et observabilité

**Responsable : DevOps**

- [ ] **Logs applicatifs** : `storage/logs/laravel.log` actif — niveau `warning` en production, rotation quotidienne configurée
- [ ] **Canal `security`** dans `config/logging.php` : toutes les alertes de sécurité (force brute, IDOR, rate limit) dirigées vers `logs/security.log` ET email SuperAdmin
- [ ] **Canal `performance`** : requêtes lentes (> 2s) et jobs lents (> 30s) logués dans `logs/performance.log`
- [ ] **Laravel Telescope** : actif uniquement sur `APP_ENV=local` — désactivé en production (`TELESCOPE_ENABLED=false`)
- [ ] **Sentry** : captures des exceptions non gérées — test de déclenchement manuel via `php artisan tinker` → `throw new \Exception('test')` — apparaît dans Sentry < 30 secondes
- [ ] **Alertes email SuperAdmin** : CPU > 80%, RAM > 85%, espace disque < 20%, 0 worker Horizon actif
- [ ] **Page status publique** : `https://status.ibig-secretis.com` accessible — tous les services affichés `Operational`
- [ ] **Uptime monitoring** : service tiers configuré (Better Uptime, UptimeRobot ou Freshping) — check toutes les minutes sur l'URL de santé

---

## Section 12 — Légal et commercial

**Responsable : Direction / Responsable Produit**

- [ ] **CGU, CGV, Politique de confidentialité, Mentions légales** : versions 2.1.0 rédigées et validées par le conseil juridique
- [ ] **Pages légales** : toutes les 18 pages accessibles sur `/legal/{slug}`, dernière mise à jour affichée
- [ ] **Bandeau cookies RGPD** : consentement granulaire fonctionnel, refus possible en un clic
- [ ] **Registre RGPD** tenu à jour : toutes les nouvelles tables de la v2.1.0 documentées dans le registre des traitements
- [ ] **Plans tarifaires** configurés dans l'admin SuperAdmin : Starter, Pro, Enterprise — prix, modules, limites
- [ ] **Premier compte SuperAdmin IBIG** créé avec un email `@ibigsoft.com`, MFA activé, mot de passe fort (20+ caractères)
- [ ] **Comptes de démo** : 3 organisations fictives (AKOMA Trading, BENKADI Consulting, SOFAMEX Industries) avec données réalistes en sandbox
- [ ] **Formation équipe support** planifiée et confirmée : date, formateur, contenu (tickets, SARA, escalade)
- [ ] **Procédure d'escalade** documentée : support L1 (opérateurs) → L2 (tech lead) → L3 (Dev) — délais et canaux définis
- [ ] **Communication de lancement** préparée : email clients existants, post LinkedIn, annonce in-app

---

## Résumé de validation

| Section | Responsable | Date validation | Signature |
|---|---|---|---|
| 1 — Infrastructure | DevOps | | |
| 2 — Variables d'environnement | Tech Lead | | |
| 3 — Base de données | DBA | | |
| 4 — Application | Tech Lead | | |
| 5 — Files et scheduler | DevOps | | |
| 6 — WebSocket | DevOps | | |
| 7 — Sécurité | RSSI | | |
| 8 — Tests fonctionnels | QA | | |
| 9 — Performance | Tech Lead | | |
| 10 — Mobile | Mobile Lead | | |
| 11 — Monitoring | DevOps | | |
| 12 — Légal et commercial | Direction | | |

**GO / NO-GO final :** _______________

**Signataire GO/NO-GO :** _______________  **Date :** _______________

---

*Document vivant — mettre à jour à chaque nouvelle release majeure.*
*Version du document : 2.1.0 — 2026-07-23 — IBIG Soft Engineering*
