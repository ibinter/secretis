# Audit de Sécurité Final — IBIG SECRETIS ERP
## OWASP Top 10 (2023) — Rapport de conformité

**Date :** 23 juillet 2026  
**Version :** SECRETIS v1.0.0  
**Stack :** Laravel 11 · PHP 8.2+ · React 18 · Inertia.js · PostgreSQL · Sanctum · Spatie Permission  
**Auditeur :** IBIG SOFT — Équipe Sécurité  

---

## Résumé exécutif

| Catégorie OWASP | Statut | Niveau de risque résiduel |
|---|---|---|
| A01 — Broken Access Control | ✅ Couvert | Faible |
| A02 — Cryptographic Failures | ✅ Couvert | Faible |
| A03 — Injection | ✅ Couvert | Très faible |
| A04 — Insecure Design | ✅ Couvert | Faible |
| A05 — Security Misconfiguration | ✅ Couvert | Faible |
| A06 — Vulnerable Components | ⚠️ Processus continu | Moyen (à surveiller) |
| A07 — Identification & Auth Failures | ✅ Couvert | Faible |
| A08 — Software & Data Integrity | ✅ Couvert | Faible |
| A09 — Logging & Monitoring Failures | ✅ Couvert | Faible |
| A10 — Server-Side Request Forgery | ✅ Couvert | Faible |

**Score global : 9/10 catégories couvertes. Risque résiduel : Faible.**

---

## A01 — Broken Access Control

### Mécanismes en place

**Multi-tenant isolation (organization_id)**

Toutes les entités métier portent une colonne `organization_id` avec contrainte de clé étrangère en base. Trois couches de protection superposées garantissent l'isolation :

1. **`ResolveTenant`** — résout l'organisation depuis le domaine, le header `X-Organization` ou le token Sanctum, et l'expose via `app('current_organization')`.
2. **`PreventCrossTenantAccess`** — vérifie que chaque modèle Eloquent résolu via route model binding appartient à l'organisation courante. Bloque et loggue toute violation.
3. **`EnforceOrganizationScope`** — couche applicative complémentaire : détecte l'injection de `organization_id` dans les paramètres de requête (query string, body), bloque avec 403, notifie via `IntrusionDetectionService` au-delà de 3 violations.

Les global scopes Eloquent (`ScopedByOrganization`) sont appliqués sur tous les modèles tenant pour prévenir les oublis au niveau repository/service.

**RBAC avec Spatie Laravel Permission**

10 rôles hiérarchiques (super-admin → visiteur_externe) avec matrice de permissions documentée dans `docs/audits/MATRICE_ROLES_PERMISSIONS.md`. Les contrôleurs utilisent `$this->authorize()` (Policy Laravel) en plus du middleware `permission:`.

**Vérifications croisées :** Les super-admins (`superadmin_ibig`) sont explicitement exemptés du scope organisation pour permettre l'administration multi-tenant. Cette exemption est documentée et vérifiée par les tests.

### Points validés
- ✅ Isolation multi-tenant triple couche
- ✅ RBAC Spatie avec 10 rôles et permissions granulaires
- ✅ Policies Laravel sur toutes les ressources critiques
- ✅ Route model binding scopé à l'organisation
- ✅ Tests de non-régression : `OrganizationScopeTest.php`
- ✅ Violation loggée et alertée (canal `security`)

---

## A02 — Cryptographic Failures

### Mécanismes en place

**Mots de passe**

Hachage bcrypt via `Hash::make()` (Laravel default, coût 12). La règle `StrongPassword` impose 12 caractères minimum, majuscule/minuscule/chiffre/spécial, interdiction des séquences courantes et des répétitions.

**Transport**

HSTS activé en production via `SecurityHeaders` middleware :
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
Redirection HTTP → HTTPS au niveau serveur (nginx).

**Données sensibles en base**

Les colonnes sensibles (clés API tiers, tokens OAuth) utilisent le cast `encrypted` d'Eloquent (AES-256-CBC via la `APP_KEY`). La commande `secretis:security-audit` vérifie l'absence de valeurs en clair.

**Sessions**

Configuration production : `session.secure=true`, `session.http_only=true`, `session.same_site=lax`. Rotation d'identifiant de session à chaque connexion (`Auth::login()` appelle `$request->session()->regenerate()`).

### Points validés
- ✅ bcrypt pour les mots de passe (coût 12)
- ✅ HSTS avec preload en production
- ✅ Chiffrement AES-256 des colonnes sensibles
- ✅ Cookies de session `Secure` + `HttpOnly`
- ✅ `APP_KEY` vérifiée par l'audit command

---

## A03 — Injection

### Mécanismes en place

**SQL Injection**

L'intégralité du code accède à la base via Eloquent ORM avec des liaisons de paramètres préparées. Les quelques requêtes brutes (`DB::select`, `DB::statement`) utilisent systématiquement les bindings nommés.

Une règle de revue de code (`git hooks` + CI) interdit les patterns `whereRaw('...{$var}...')` non bindés et les concaténations directes dans les requêtes.

**XSS**

React échappe par défaut toutes les valeurs interpolées dans le JSX. Les rares usages de `dangerouslySetInnerHTML` sont réservés aux contenus sanitisés par `DOMPurify`. Le CSP empêche l'exécution de scripts inline non noncés.

**Command Injection**

Aucune commande shell construite depuis des entrées utilisateur. Les appels `exec()` / `shell_exec()` sont absents du code applicatif (audit `grep` régulier).

**SSTI (Template Injection)**

Blade escapes HTML par défaut (`{{ }}`). Les données passées à Inertia via `Inertia::render()` sont sérialisées en JSON sans interprétation.

### Points validés
- ✅ Eloquent ORM + paramètres liés pour toutes les requêtes
- ✅ React + DOMPurify pour la prévention XSS frontend
- ✅ CSP avec nonce pour les scripts inline
- ✅ Validation des entrées via Form Requests Laravel
- ✅ Pas de commandes shell depuis les entrées utilisateur

---

## A04 — Insecure Design

### Mécanismes en place

**Architecture défense en profondeur**

Le projet suit une architecture en couches (Middleware → Controller → Service → Repository → Model) avec des responsabilités claires. La sécurité n'est pas reléguée à une seule couche.

**Principe du moindre privilège**

Les rôles Spatie sont définis avec les permissions minimales nécessaires. Les super-admins ont des capacités explicitement définies, non inférées.

**Séparation des préoccupations**

`AuditService` — persistance des événements  
`IntrusionDetectionService` — détection des attaques  
`SecurityComplianceService` — vérifications de conformité  
`SecurityHeaders` middleware — sécurité transport  

**Design sécurisé par défaut**

- Nouveaux modèles : `$guarded = []` interdit (utiliser `$fillable`)
- Nouvelles routes API : authentification Sanctum requise par défaut
- Nouvelles colonnes sensibles : cast `encrypted` obligatoire (convention documentée)

### Points validés
- ✅ Architecture en couches avec isolation des responsabilités
- ✅ Mass assignment protection (`$fillable` explicite)
- ✅ Authentication requise par défaut sur les routes API
- ✅ Services de sécurité dédiés et testés

---

## A05 — Security Misconfiguration

### Mécanismes en place

**En-têtes HTTP**

Le middleware `SecurityHeaders` ajoute sur chaque réponse :

```
Content-Security-Policy: default-src 'none'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; font-src 'self' fonts.googleapis.com fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload (production uniquement)
```

Le nonce CSP est généré par `random_bytes(16)` (cryptographiquement fort) et exposé via `app('csp-nonce')` pour les vues Blade.

**Commande d'audit**

`php artisan secretis:security-audit` vérifie 10 points de configuration à chaque déploiement. Intégrée dans le pipeline CI/CD.

**Configuration CORS stricte**

`config/cors.php` n'autorise que l'origine définie par `FRONTEND_URL`. Aucun `*`. `supports_credentials=true` pour Sanctum.

**Informations serveur masquées**

Les headers `X-Powered-By` et `Server` sont supprimés par `SecurityHeaders`.

### Points validés
- ✅ CSP avec nonce par requête
- ✅ 7 headers de sécurité HTTP sur toutes les réponses
- ✅ CORS restrictif (origine unique explicite)
- ✅ Audit command intégrée au déploiement
- ✅ `APP_DEBUG=false` vérifié en production

---

## A06 — Vulnerable Components

### Mécanismes en place

**Audit des dépendances PHP**

`composer audit` est exécuté dans le pipeline CI/CD à chaque pull request et à chaque déploiement. La commande `secretis:security-audit` l'intègre également.

**Audit des dépendances JavaScript**

`npm audit` est exécuté dans la CI sur le répertoire `frontend/`. Les dépendances avec des CVE de sévérité `high` ou `critical` bloquent le merge.

**Processus de mise à jour**

- Dépendances Laravel : mise à jour mensuelle via `composer update`
- Dépendances NPM : mise à jour mensuelle via `npm update`
- Surveillance des bulletins de sécurité Packagist et NPM

### Points en cours / à surveiller
- ⚠️ Aucune surveillance automatique 24/7 des CVE (Dependabot ou Snyk recommandé)
- ⚠️ Absence de Software Bill of Materials (SBOM) formalisé

### Recommandation
Activer GitHub Dependabot ou Snyk pour des alertes de vulnérabilité en temps réel sur le dépôt.

---

## A07 — Identification and Authentication Failures

### Mécanismes en place

**Sanctum Token-based Auth**

Authentification Stateless (API) via tokens Sanctum avec révocation immédiate au logout (`$request->user()->currentAccessToken()->delete()`). L'accès est refusé dès la révocation.

**Détection de force brute**

`IntrusionDetectionService` bloque après :
- 5 tentatives d'échec depuis la même IP
- 3 tentatives d'échec pour le même email

Les compteurs expirent en 15 minutes (fenêtre glissante Redis). Les IPs et emails bloqués sont journalisés dans le canal `security`.

**Politique de mots de passe renforcée**

La règle `StrongPassword` impose 12 caractères, complexité multi-classe, interdiction des séquences connues, et absence de répétitions. Appliquée à l'inscription et au changement de mot de passe.

**MFA TOTP**

Authentification à deux facteurs via TOTP (compatible Google Authenticator). Les codes de récupération sont chiffrés en base. MFA obligatoire pour les rôles `admin`, `super-admin`, `dirigeant`.

**Rate Limiting par rôle**

`RateLimitByRole` applique des limites différenciées (20 req/min pour `visiteur_externe` à 1000 req/min pour `super-admin`) avec header `Retry-After` sur les 429.

**Sessions sécurisées**

`session.regenerate()` à chaque connexion, invalidation complète au logout, cookies `Secure` + `HttpOnly` + `SameSite=Lax`.

### Points validés
- ✅ Blocage automatique après échecs répétés
- ✅ Politique de mot de passe forte (12 caractères, complexité)
- ✅ MFA TOTP pour les rôles sensibles
- ✅ Rate limiting différencié par rôle
- ✅ Révocation immédiate des tokens au logout
- ✅ Tests de non-régression : `AuthSecurityTest.php`

---

## A08 — Software and Data Integrity Failures

### Mécanismes en place

**Webhooks entrants**

Vérification HMAC-SHA256 de chaque webhook entrant via `WebhookVerifier`. La signature est comparée avec `hash_equals()` pour prévenir les attaques temporelles.

**Paiements idempotents**

Chaque opération de paiement utilise une clé d'idempotence unique (UUID) pour prévenir les doubles débits en cas de retry réseau.

**Intégrité des mises à jour**

Les mises à jour de l'application on-premise sont livrées avec une signature GPG. Le service `OnPremiseLicenseService` vérifie cette signature avant installation.

**Intégrité des assets frontend**

Les assets Vite buildés intègrent un hash de contenu dans leur nom de fichier (`app.a1b2c3d4.js`). Le manifest Vite est versionné.

### Points validés
- ✅ HMAC-SHA256 sur les webhooks entrants
- ✅ Idempotence des paiements
- ✅ Signature GPG des packages on-premise
- ✅ Hashing des assets frontend (Vite)

---

## A09 — Security Logging and Monitoring Failures

### Mécanismes en place

**Canal de log dédié `security`**

Séparé des logs applicatifs (`daily`). Toutes les violations de sécurité, échecs d'authentification, accès refusés et activités suspectes sont écrits dans ce canal. En production, ce canal est également streamé vers un SIEM.

**AuditService**

Chaque action utilisateur significative (création, modification, suppression de ressources sensibles) est persistée dans la table `audit_logs` avec `user_id`, `organization_id`, `action`, `subject_type/id`, `ip_address`, `user_agent`, timestamp.

**Laravel Telescope (développement)**

Disponible en environnement non-production pour l'inspection des requêtes, requêtes DB, jobs, notifications et événements.

**Alertes critiques**

`IntrusionDetectionService` déclenche une notification aux super-admins après 3 activités suspectes en 1 heure pour un même utilisateur. `PreventCrossTenantAccess` déclenche une alerte `critical` au-delà de 3 violations cross-tenant depuis la même IP.

**Monitoring**

`MonitoringService` et `CheckSystemHealth` fournissent des métriques système (mémoire, disque, temps de réponse DB) consultables via `/api/monitoring/health` (accès restreint aux super-admins).

### Points validés
- ✅ Canal `security` séparé des logs applicatifs
- ✅ Table `audit_logs` avec historique complet
- ✅ Alertes temps réel pour les super-admins
- ✅ Telescope en développement
- ✅ Monitoring santé système

---

## A10 — Server-Side Request Forgery (SSRF)

### Mécanismes en place

**Validation des URLs entrées utilisateur**

Toutes les URLs soumises par les utilisateurs (webhooks outgoing, intégrations tierces, imports depuis URL) sont validées avec :
- `filter_var($url, FILTER_VALIDATE_URL)`
- Vérification que le schéma est `https` uniquement
- Blacklist des plages IP privées (RFC 1918 : 10.x, 172.16-31.x, 192.168.x, 127.x) et des métadonnées cloud (169.254.x)

**Requêtes HTTP sortantes**

Toutes les requêtes HTTP sortantes (vers les APIs tierces) passent par un client Guzzle configuré avec :
- Timeout court (10 secondes connection, 30 secondes total)
- Désactivation du suivi de redirections vers des IPs privées
- User-agent identifiant SECRETIS (traçabilité)

**Intégrations tierces**

Le module `IntegrationService` gère les connexions aux services externes (Google, Microsoft, WhatsApp). Chaque intégration utilise OAuth 2.0 avec tokens stockés chiffrés — jamais les credentials directs.

### Points validés
- ✅ Validation et whitelist des URLs entrées utilisateur
- ✅ Blacklist des plages IP privées et métadonnées cloud
- ✅ Client HTTP avec timeouts et restrictions de redirection
- ✅ OAuth 2.0 pour les intégrations tierces (pas de credentials directs)

---

## Points validés — Synthèse complète

| # | Point de sécurité | Statut |
|---|---|---|
| 1 | En-têtes HTTP de sécurité (CSP, HSTS, X-Frame-Options…) | ✅ Validé |
| 2 | CSP avec nonce par requête | ✅ Validé |
| 3 | Isolation multi-tenant triple couche | ✅ Validé |
| 4 | RBAC Spatie 10 rôles + policies | ✅ Validé |
| 5 | Rate limiting différencié par rôle | ✅ Validé |
| 6 | Détection force brute (IP + email) | ✅ Validé |
| 7 | Politique de mots de passe renforcée (12 car., complexité) | ✅ Validé |
| 8 | MFA TOTP pour rôles sensibles | ✅ Validé |
| 9 | Chiffrement AES-256 des colonnes sensibles | ✅ Validé |
| 10 | HSTS avec preload en production | ✅ Validé |
| 11 | CORS restrictif (origine unique, pas de `*`) | ✅ Validé |
| 12 | Révocation immédiate des tokens au logout | ✅ Validé |
| 13 | Canal de log `security` séparé | ✅ Validé |
| 14 | Audit trail complet (table audit_logs) | ✅ Validé |
| 15 | Alertes temps réel super-admin | ✅ Validé |
| 16 | HMAC-SHA256 sur les webhooks | ✅ Validé |
| 17 | Prévention SSRF (validation URLs) | ✅ Validé |
| 18 | Eloquent ORM (pas de SQL injection) | ✅ Validé |
| 19 | Commande d'audit sécurité intégrée CI/CD | ✅ Validé |
| 20 | Tests Pest de sécurité (3 suites) | ✅ Validé |

## Points en cours / à surveiller

| # | Point | Priorité | Recommandation |
|---|---|---|---|
| 1 | Surveillance CVE automatique | Haute | Activer GitHub Dependabot ou Snyk |
| 2 | SBOM (Software Bill of Materials) | Moyenne | Générer avec `composer sbom` lors des releases |
| 3 | Penetration testing externe | Haute | Audit annuel par une société tierce |
| 4 | `unsafe-inline` dans style-src CSP | Moyenne | Migrer vers nonces CSS en v2 (Tailwind JIT) |
| 5 | Rotation automatique des clés de chiffrement | Haute | Planifier une procédure de rotation APP_KEY |
| 6 | WAF (Web Application Firewall) | Haute | Configurer Cloudflare WAF ou AWS WAF en production |

---

*Rapport généré le 23 juillet 2026 — IBIG SECRETIS v1.0.0*
