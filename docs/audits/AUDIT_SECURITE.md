# Audit Sécurité — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0  
**Référentiel :** OWASP Top 10 (2021), ISO 27001:2022, RGPD

---

## 1. OWASP Top 10 — Statut

| # | Vulnérabilité OWASP | Statut | Contrôles en place |
|---|---------------------|--------|-------------------|
| A01 | Contrôle d'accès défaillant | ✅ Couvert | Spatie Permissions, Policies, Gates, middleware `permission:` |
| A02 | Défaillances cryptographiques | ✅ Couvert | AES-256-CBC pour données sensibles, TLS 1.3 obligatoire, bcrypt pour mots de passe |
| A03 | Injection | ✅ Couvert | Eloquent ORM (requêtes préparées), validation stricte, sanitisation entrées |
| A04 | Conception non sécurisée | ✅ Couvert | Architecture multi-tenant isolée, revue de conception documentée |
| A05 | Mauvaise configuration sécurité | ✅ Couvert | Headers sécurité (CSP, HSTS, X-Frame), `.env` hors web root, debug=false prod |
| A06 | Composants vulnérables | 🟡 Suivi continu | `composer audit` + `npm audit` dans CI/CD, Dependabot activé |
| A07 | Échecs d'identification/authentification | ✅ Couvert | Sanctum, 2FA TOTP, rate-limiting, invalidation session à déconnexion |
| A08 | Défaillances intégrité logiciels | ✅ Couvert | Hashes SHA-256 sur documents, migrations versionnées, artefacts signés |
| A09 | Lacunes journalisation/surveillance | ✅ Couvert | AuditService, Laravel Telescope, alertes Slack, SIEM-ready |
| A10 | SSRF (Server-Side Request Forgery) | ✅ Couvert | Validation URL stricte, liste blanche domaines autorisés, pas de curl libre |

---

## 2. Contrôles serveur

### 2.1 Headers HTTP de sécurité

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{CSP_NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss://secretis.ibigsoft.com; frame-ancestors 'none';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 2.2 Middleware de sécurité

| Middleware | Route cible | Rôle |
|-----------|------------|------|
| `auth:sanctum` | Toutes routes /dashboard | Authentification requise |
| `verified` | Routes critiques | Email vérifié obligatoire |
| `throttle:60,1` | Routes publiques | Rate-limiting |
| `throttle:5,1` | Login, register, reset | Limite anti-brute-force |
| `signed` | Verify email, invitations | URLs signées temporaires |
| `permission:{perm}` | Routes par fonctionnalité | Contrôle granulaire |
| `EnsureOrganizationAccess` | Toutes routes métier | Isolation multi-tenant |
| `ForceJsonResponse` | Routes API | Pas de réponse HTML sur API |

### 2.3 Policies Laravel

Toutes les ressources sensibles disposent d'une Policy dédiée :
`DocumentPolicy`, `EmployeePolicy`, `PayrollPolicy`, `AccountingPolicy`, `ProjectPolicy`, `LicensePolicy`, `OrganizationPolicy`.

---

## 3. Anti-fuite de licences (checklist section 18.5)

| Contrôle | État | Mécanisme |
|---------|------|-----------|
| Aucune clé de licence dans le JS client | ✅ Vérifié | Toutes les vérifications côté serveur uniquement |
| Aucun booléen modifiable côté navigateur | ✅ Vérifié | Feature flags stockés côté serveur (Redis), jamais dans localStorage |
| Contrôle serveur sur toutes les routes premium | ✅ Vérifié | Middleware `CheckLicense` sur routes pro/enterprise |
| Vérification de date côté serveur uniquement | ✅ Vérifié | `now()` serveur, jamais `Date.now()` client |
| Activation idempotente | ✅ Vérifié | `firstOrCreate` + verrou optimiste |
| Journal de toutes les modifications manuelles | ✅ Vérifié | `license_activity_log` — chaque changement tracé |
| Test isolation organisation A/B | ✅ Vérifié | 0 accès cross-org détecté (test Pest multitenancy) |
| Désactivation licence → coupure immédiate | ✅ Vérifié | Cache invalidé à la désactivation, middleware vérifie à chaque requête |
| Clés API chiffrées en base | ✅ Vérifié | `encrypted` cast sur `api_keys.secret` |
| Aucune clé dans les logs | ✅ Vérifié | `$hidden` sur modèles + filtre log `cleansed_fields` |

---

## 4. Séparation des données (multi-tenancy)

| Test | Résultat |
|------|---------|
| Organisation A ne peut pas lire les données de l'organisation B | ✅ 0 fuite |
| Scope Eloquent `organization_id` actif sur tous les modèles | ✅ Vérifié |
| API tokens scoppés à une organisation | ✅ Vérifié |
| Export de l'organisation A n'inclut pas de données B | ✅ Vérifié |
| WebSocket : channels privés scoppés par organisation | ✅ Vérifié |

---

## 5. Gestion des sessions

| Paramètre | Valeur configurée |
|-----------|------------------|
| Session lifetime | 120 minutes (configurable par org) |
| Session driver | Redis (chiffré) |
| Renouvellement d'ID | À chaque login (`regenerate()`) |
| Invalidation | À la déconnexion + changement de mot de passe |
| Cookie flags | `HttpOnly`, `Secure`, `SameSite=Strict` |
| Sessions concurrentes | Max 5 par utilisateur (configurable) |

---

## 6. Tests de pénétration — 9 suites Pest

| Suite | Scénarios | Résultat |
|-------|-----------|---------|
| `AuthSecurityTest` | Brute-force, session fixation, CSRF | ✅ 0 faille |
| `MultitenancyTest` | Cross-org data access, IDOR | ✅ 0 faille |
| `LicenseSecurityTest` | Bypass licence, manipulation côté client | ✅ 0 faille |
| `XssTest` | XSS persistant, réfléchi, DOM-based | ✅ 0 faille |
| `SqlInjectionTest` | Injection via champs formulaire, API | ✅ 0 faille |
| `FileUploadTest` | Upload malveillant, traversal | ✅ 0 faille |
| `ApiSecurityTest` | Auth bypass, mass assignment, rate-limit | ✅ 0 faille |
| `WebsocketSecurityTest` | Channel hijacking, broadcast non autorisé | ✅ 0 faille |
| `WebhookSecurityTest` | Signature HMAC, replay attack | ✅ 0 faille |

**Total : 0 faille critique, 0 faille haute, 2 observations mineures (corrigées)**

---

## 7. Couverture ISO 27001:2022

| Domaine | Contrôles applicables | Contrôles couverts | % |
|---------|----------------------|-------------------|---|
| Politiques de sécurité | 2 | 2 | 100 % |
| Organisation de la sécurité | 7 | 6 | 86 % |
| Sécurité des ressources humaines | 6 | 5 | 83 % |
| Gestion des actifs | 10 | 9 | 90 % |
| Contrôle d'accès | 14 | 14 | 100 % |
| Cryptographie | 4 | 4 | 100 % |
| Sécurité physique | 3 | 2 | 67 % |
| Sécurité des opérations | 14 | 13 | 93 % |
| Sécurité des communications | 7 | 7 | 100 % |
| Acquisition/développement systèmes | 13 | 11 | 85 % |
| Relations fournisseurs | 5 | 4 | 80 % |
| Gestion des incidents | 7 | 6 | 86 % |
| Continuité d'activité | 4 | 3 | 75 % |
| Conformité | 8 | 7 | 88 % |
| **TOTAL** | **104** | **93** | **89 %** |

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Sécurité*
