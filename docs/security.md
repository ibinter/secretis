# Architecture de sécurité — IBIG SECRETIS ERP

Version : 1.0 | Classification : Interne / Confidentiel

---

## Table des matières

1. [Architecture de sécurité](#1-architecture-de-sécurité)
2. [Flux d'authentification](#2-flux-dauthentification)
3. [Isolation multi-tenant](#3-isolation-multi-tenant)
4. [Gestion des secrets](#4-gestion-des-secrets)
5. [Journal d'audit](#5-journal-daudit)
6. [Procédure en cas de faille suspectée](#6-procédure-en-cas-de-faille-suspectée)

---

## 1. Architecture de sécurité

### Vue d'ensemble (diagramme ASCII)

```
                        INTERNET
                           |
                    ┌──────▼──────┐
                    │   Cloudflare │  DDoS protection, WAF, rate limit réseau
                    │   (CDN/WAF) │
                    └──────┬──────┘
                           │ HTTPS/TLS 1.3
                    ┌──────▼──────┐
                    │    Nginx    │  Reverse proxy, SSL termination,
                    │   (proxy)  │  headers de sécurité HTTP
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
    ┌─────────▼────────┐    ┌──────────▼──────────┐
    │  Laravel Backend  │    │   Frontend React.js  │
    │  (PHP 8.2 + FPM) │    │   (SPA, Vite build)  │
    └──────────┬────────┘    └─────────────────────┘
               │
    ┌──────────▼────────────────────────────────┐
    │              Couches de sécurité           │
    │                                            │
    │  1. Rate Limiting (RateLimiter Facade)     │
    │  2. CSRF Protection (session cookie)       │
    │  3. Sanctum Token Auth (API stateful)      │
    │  4. ResolveTenant Middleware               │
    │  5. EnsureValidLicense Middleware          │
    │  6. CheckPermission Middleware (RBAC)      │
    │  7. Global Scopes (organization_id)        │
    └──────────┬────────────────────────────────┘
               │
    ┌──────────▼────────┐    ┌─────────────┐
    │   PostgreSQL 15   │    │   Redis 7   │
    │   (données chiff) │    │  (sessions, │
    │   Row Level Sec.  │    │   queues)   │
    └───────────────────┘    └─────────────┘
               │
    ┌──────────▼────────┐
    │  Storage Privé    │
    │  (S3 / disque)    │
    │  PAS dans /public │
    └───────────────────┘
               │
    ┌──────────▼────────┐
    │  Journal d'Audit  │
    │  (audit_logs BDD) │
    │  WORM (no update) │
    └───────────────────┘
```

### Headers de sécurité HTTP (Nginx)

| Header                      | Valeur                      | Rôle                              |
|-----------------------------|-----------------------------|------------------------------------|
| `X-Frame-Options`           | `SAMEORIGIN`               | Anti-clickjacking                  |
| `X-XSS-Protection`          | `1; mode=block`            | XSS protection (navigateurs anciens)|
| `X-Content-Type-Options`    | `nosniff`                  | Anti-MIME sniffing                 |
| `Referrer-Policy`           | `strict-origin-when-cross-origin` | Contrôle du referrer        |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS             |
| `Content-Security-Policy`   | Policy restrictive          | XSS, injection de ressources       |
| `Permissions-Policy`        | Désactivation caméra/micro | Accès matériel non autorisé        |

---

## 2. Flux d'authentification

### Login (session-based avec Sanctum)

```
Client                      Laravel                     BDD
  │                            │                          │
  │─── POST /api/auth/login ──►│                          │
  │    { email, password }     │                          │
  │                            │── Rate limit check ──────│
  │                            │   (5 max / email+IP)     │
  │                            │                          │
  │                            │── SELECT user WHERE ─────►│
  │                            │   email = $email          │
  │                            │◄─ User ou null ───────────│
  │                            │                          │
  │                            │── Hash::check() ─────────►│
  │                            │   (timing-safe bcrypt)    │
  │                            │                          │
  │       Si échec             │                          │
  │◄── 422 Unprocessable ──────│                          │
  │    (même message pour      │── recordFailedLogin() ───►│
  │     email inexistant       │   (incrément + lockout)   │
  │     et mauvais pwd)        │                          │
  │                            │                          │
  │       Si succès            │── License check ─────────►│
  │                            │   (LicenseService)        │
  │                            │                          │
  │                            │── Auth::login() ──────────│
  │                            │── session:regenerate() ───│
  │                            │── session:put(org_id) ────│
  │                            │                          │
  │◄── 200 + User + Token ─────│── AuditService::log() ───►│
  │    + license_status         │   (login_success)         │
  │    + redirect               │                          │
```

### Middleware d'authentification et d'autorisation

```
Requête HTTP entrante
        │
   ┌────▼────────────────┐
   │ 1. VerifyCsrfToken  │  Vérifie le token CSRF (requêtes mutantes)
   └────┬────────────────┘
        │
   ┌────▼────────────────┐
   │ 2. Authenticate     │  Vérifie la session Sanctum
   └────┬────────────────┘
        │
   ┌────▼────────────────┐
   │ 3. ResolveTenant    │  Lie l'organisation au conteneur IoC
   │    (toujours depuis │  JAMAIS depuis le body/query de la requête
   │     la session)     │
   └────┬────────────────┘
        │
   ┌────▼────────────────┐
   │ 4. EnsureValidLicense│ Vérifie le statut de licence (serveur)
   │    (horloge SERVEUR) │ Bloque si expired ou suspended
   └────┬────────────────┘
        │
   ┌────▼────────────────┐
   │ 5. CheckPermission  │  RBAC Spatie — vérifie le rôle/permission
   └────┬────────────────┘
        │
   ┌────▼────────────────┐
   │ 6. Global Scopes    │  Filtre automatique par organization_id
   │    (Eloquent)       │  sur TOUS les modèles multi-tenant
   └────┬────────────────┘
        │
   Contrôleur / Logique métier
```

### Vérification de licence (côté serveur uniquement)

La vérification de licence est **exclusivement basée sur l'horloge du serveur** (`Carbon::now()`). Aucune date fournie par le client n'est acceptée.

```
SECURITE CRITIQUE :
  ┌─────────────────────────────────────────────────────┐
  │  Date de vérification = Carbon::now() (SERVEUR)    │
  │                                                     │
  │  JAMAIS :                                           │
  │    - Request::header('X-License-Date')              │
  │    - Request::input('check_date')                   │
  │    - Paramètre URL                                  │
  │    - Cookie client                                  │
  └─────────────────────────────────────────────────────┘
```

---

## 3. Isolation multi-tenant

### Modèle d'isolation

SECRETIS ERP utilise un **modèle multi-tenant à base de données partagée** avec isolation par `organization_id`. Chaque table métier possède une colonne `organization_id` avec contrainte de clé étrangère et index.

### Global Scope automatique

Tous les modèles multi-tenant héritent d'un `OrganizationScope` appliqué automatiquement :

```php
// Appliqué automatiquement sur TOUS les modèles multi-tenant
// L'organization_id est résolu depuis la session (ResolveTenant middleware)
// et JAMAIS depuis le body/query de la requête

protected static function booted(): void
{
    static::addGlobalScope('organization', function (Builder $builder) {
        $orgId = app('current_organization')?->id;
        if ($orgId) {
            $builder->where(static::class . '.organization_id', $orgId);
        }
    });
}
```

### Ce que garantit le scope automatique

| Opération   | Scope appliqué                                           |
|-------------|----------------------------------------------------------|
| SELECT      | `WHERE organization_id = $currentOrgId`                 |
| INSERT      | `organization_id` forcé depuis la session               |
| UPDATE      | `WHERE organization_id = $currentOrgId`                 |
| DELETE      | `WHERE organization_id = $currentOrgId`                 |

### Ce qui est testé en CI (tests critiques)

```
backend/tests/Feature/MultiTenancy/IsolationTest.php
  ✓ CRITIQUE : user org A ne peut pas lire les données de org B
  ✓ CRITIQUE : user org A ne peut pas modifier les données de org B
  ✓ CRITIQUE : user org A ne peut pas supprimer les données de org B
  ✓ Injection organization_id dans le body ignorée
  ✓ Injection organization_id dans la query string ignorée
  ✓ Scope automatique : toutes les requêtes filtrées par organization_id
```

### Super admin IBIG (cross-tenant)

Le rôle `superadmin_ibig` est le seul à pouvoir accéder aux données de toutes les organisations. Ce rôle est **réservé aux employés IBIG** et doit être accordé manuellement par un administrateur système.

**Règles pour le superadmin :**
- Le code source marque clairement chaque vérification `isSuperAdmin()`
- Toutes les actions cross-tenant sont loggées dans audit_logs
- L'accès peut être audité à tout moment via `php artisan audit:superadmin-actions`

---

## 4. Gestion des secrets

### Variables d'environnement

Tous les secrets sont stockés dans le fichier `.env` qui ne doit **jamais être commité** dans Git.

```
# .gitignore obligatoires
.env
.env.production
.env.staging
*.key
storage/private/
```

### Rotation des clés

| Secret            | Fréquence de rotation | Commande                                       |
|-------------------|-----------------------|------------------------------------------------|
| `APP_KEY`         | Annuelle ou si compromise | `php artisan key:generate`                 |
| Mot de passe BDD  | Semestrielle          | `ALTER USER secretis_user PASSWORD 'nouveau'` |
| Mot de passe Redis| Semestrielle          | Modifier `requirepass` dans redis.conf        |
| Clé CinetPay      | Sur demande CinetPay  | Via le tableau de bord CinetPay               |
| Clés SSH deploy   | Annuelle              | Regénérer et mettre à jour GitHub Secrets     |

### Procédure de rotation de APP_KEY (sans interruption)

```bash
# 1. Générer la nouvelle clé
php artisan key:generate --show
# → base64:NOUVELLE_CLE_ICI=

# 2. Ajouter dans .env (avant de remplacer)
# APP_PREVIOUS_KEYS=base64:ANCIENNE_CLE=
# APP_KEY=base64:NOUVELLE_CLE=

# 3. Décrypter et recrypter les données (si nécessaire)
php artisan key:rotate

# 4. Retirer APP_PREVIOUS_KEYS après validation
```

### Stockage des fichiers sensibles

Les fichiers sensibles (pièces jointes de courrier, preuves de paiement) sont stockés dans `storage/app/private/` qui n'est **pas accessible via l'URL publique**.

```
storage/
├── app/
│   ├── public/         ← Accessible via /storage URL (avatars, logos)
│   │   └── ...
│   └── private/        ← NON accessible via HTTP
│       ├── courrier/   ← Pièces jointes courrier
│       ├── payments/   ← Preuves de paiement
│       └── invoices/   ← Factures générées
└── ...
```

### Chiffrement des données sensibles

Laravel chiffre automatiquement les champs sensibles avec `$casts = ['field' => 'encrypted']` :

```php
// Exemples de champs chiffrés en BDD
protected $casts = [
    'api_key'         => 'encrypted',     // Clé API externe
    'webhook_secret'  => 'encrypted',     // Secret webhook
    'bank_account'    => 'encrypted',     // Coordonnées bancaires
];
```

---

## 5. Journal d'audit

### Ce qui est loggué

Toutes les actions métier significatives sont enregistrées dans la table `audit_logs` via le service `AuditService`.

| Module     | Actions loggées                                                              |
|------------|------------------------------------------------------------------------------|
| Auth       | login_success, login_failed, login_rate_limited, logout, password_reset_*   |
| Billing    | license_activated, license_extended, license_expired, organization_suspended  |
| Agenda     | event_created, event_updated, event_deleted                                  |
| Courrier   | mail_created, mail_assigned, mail_status_changed, mail_exported               |
| Documents  | document_created, document_downloaded, document_deleted                       |
| Users      | user_created, user_role_changed, user_deactivated                             |
| Admin      | any superadmin cross-tenant action                                            |

### Structure d'un log d'audit

```sql
SELECT * FROM audit_logs LIMIT 1;
-- id              : uuid
-- organization_id : Tenant (peut être NULL pour les actions globales)
-- user_id         : Qui a fait l'action (NULL = système)
-- action          : Libellé de l'action (ex: license_activated)
-- module          : Module concerné (ex: billing)
-- resource_type   : Type de ressource (ex: license)
-- resource_id     : ID de la ressource concernée
-- old_values      : JSON des valeurs avant modification
-- new_values      : JSON des valeurs après modification
-- ip_address      : Adresse IP du client
-- user_agent      : User-Agent HTTP
-- created_at      : Timestamp horodatage serveur
```

### Politique de rétention

- Les logs d'audit sont conservés **365 jours** minimum (configurable via `AUDIT_LOG_RETENTION_DAYS`).
- Les logs ne peuvent pas être modifiés ou supprimés par les utilisateurs (WORM).
- Seul un superadmin IBIG peut archiver des logs (jamais les supprimer).
- Un job CRON hebdomadaire archive les logs de plus d'1 an vers un stockage froid.

### Consultation des logs d'audit

```bash
# Via l'interface admin (route protégée superadmin)
GET /api/admin/audit-logs?organization_id=123&module=auth&from=2026-01-01

# Via Artisan (environnement développement uniquement)
php artisan audit:show --user=user@example.com --days=30

# Via SQL directement (serveur uniquement)
SELECT * FROM audit_logs
WHERE organization_id = 123
  AND module = 'auth'
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

---

## 6. Procédure en cas de faille suspectée

### Niveaux de sévérité

| Niveau    | Description                                                       | Délai de réponse |
|-----------|-------------------------------------------------------------------|-----------------|
| CRITIQUE  | Accès non autorisé à des données, RCE, injection SQL             | < 1 heure       |
| ÉLEVÉ     | Contournement d'authentification, escalade de privilèges          | < 4 heures      |
| MOYEN     | XSS stocké, CSRF, exposition d'informations sensibles             | < 24 heures     |
| FAIBLE    | Mauvaise configuration non exploitable, informations en logs      | < 72 heures     |

### Procédure de réponse aux incidents

#### Étape 1 — Détection et qualification (0–30 min)

```bash
# 1. Vérifier les logs d'accès Nginx pour des patterns suspects
sudo tail -n 1000 /var/log/nginx/access.log | grep -E '(400|401|403|500)'

# 2. Vérifier les logs Laravel
tail -n 500 /var/www/secretis/backend/storage/logs/laravel.log | grep -i 'error\|exception\|warning'

# 3. Vérifier les logs d'audit pour les accès cross-tenant
SELECT * FROM audit_logs
WHERE action NOT IN ('login_success', 'event_created')
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

#### Étape 2 — Isolation immédiate (si CRITIQUE/ÉLEVÉ)

```bash
# Activer le mode maintenance immédiatement
php artisan down --message="Maintenance urgente en cours" --retry=300

# Si compromission compte : révoquer tous les tokens
php artisan sanctum:prune-expired --hours=0
# Ou révoquer pour un utilisateur spécifique
php artisan tinker
>>> \App\Models\User::find(ID)->tokens()->delete();

# Si compromission BDD : changer le mot de passe immédiatement
sudo -u postgres psql -c "ALTER USER secretis_user PASSWORD 'nouveau_mot_de_passe_fort';"
# Puis mettre à jour .env et redémarrer PHP-FPM
sudo systemctl restart php8.2-fpm
```

#### Étape 3 — Investigation

```bash
# Identifier les IP suspectes
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Chercher des patterns d'injection SQL dans les logs
grep -E "(UNION|SELECT|DROP|INSERT|UPDATE|DELETE|OR 1=1)" /var/log/nginx/access.log

# Vérifier les uploads suspects
find /var/www/secretis/backend/storage -name "*.php" -newer /var/www/secretis/backend/artisan
```

#### Étape 4 — Notification

**Contacts à alerter :**
- Directeur Technique IBIG : cto@ibig.tech
- Responsable Sécurité : security@ibig.tech
- Si données personnelles compromises : ARTCI (autorité ivoirienne, délai 72h légal)

#### Étape 5 — Correction et post-mortem

1. Développer et tester le correctif sur `staging`
2. Déployer en production avec le workflow CI/CD
3. Rédiger un post-mortem dans les 48 heures
4. Mettre à jour ce document avec les leçons apprises

### Signalement de failles (Responsible Disclosure)

Les chercheurs en sécurité peuvent signaler des vulnérabilités via :
- Email : security@ibig.tech (PGP disponible sur demande)
- Bug bounty : https://security.ibig.tech

**Politique :** Nous nous engageons à accuser réception sous 48h et à corriger les failles critiques sous 7 jours.

---

*Document maintenu par l'équipe sécurité IBIG Technologies. Dernière révision : 2026-01-01*
