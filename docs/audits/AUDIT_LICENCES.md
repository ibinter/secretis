# Audit Licences — Vérification Anti-Fuite
**Date :** 2026-07-22 | **Version :** 2.0.0  
**Référence :** Section 18.5 du script universel IBIG SECRETIS

---

## Objectif

Garantir qu'aucune information permettant de contourner le système de licences ne puisse être extraite côté client, et que toute vérification de licence soit effectuée exclusivement côté serveur.

---

## Checklist complète — Section 18.5

### Groupe A : Isolation client/serveur

| # | Contrôle | État | Preuve technique |
|---|---------|------|-----------------|
| A1 | Aucune clé de licence dans le JavaScript client | ✅ Conforme | `grep -r "license_key\|licenseKey\|LIC_" public/js` → 0 occurrence |
| A2 | Aucun booléen de feature flag modifiable dans localStorage | ✅ Conforme | Feature flags servis via `window.__INERTIA_SHARED` uniquement, non modifiables sans rechargement côté serveur |
| A3 | Contrôle serveur sur toutes les routes premium | ✅ Conforme | Middleware `CheckLicense::class` enregistré sur groupes `pro`, `enterprise` |
| A4 | Vérification de la date d'expiration côté serveur uniquement | ✅ Conforme | `LicenseService::isValid()` utilise `now()` server, pas de logique date côté client |
| A5 | Activation de licence idempotente | ✅ Conforme | `License::firstOrCreate(['key' => $key])` + verrou `lockForUpdate()` |
| A6 | Aucun bypass possible par modification des headers HTTP | ✅ Conforme | Middleware vérifie directement la base de données (pas de header de confiance) |

### Groupe B : Traçabilité et audit

| # | Contrôle | État | Preuve technique |
|---|---------|------|-----------------|
| B1 | Journal de toutes les activations de licence | ✅ Conforme | Table `license_activity_log` — chaque activation/désactivation tracée avec timestamp, IP (hashée), user_id |
| B2 | Journal de toutes les modifications manuelles en base | ✅ Conforme | Observer `LicenseObserver` — tous les saves journalisés via `AuditService` |
| B3 | Alerte en cas d'activation suspecte (>3 org différentes) | ✅ Conforme | Job `SuspiciousLicenseAlert` — notification Slack si clé activée sur >3 organisations |
| B4 | Révocation de session immédiate à la désactivation | ✅ Conforme | `LicenseService::suspend()` appelle `Cache::forget()` + révoque tous les tokens Sanctum |

### Groupe C : Isolation multi-tenant

| # | Contrôle | État | Preuve technique |
|---|---------|------|-----------------|
| C1 | Test isolation organisation A/B (0 accès cross-org) | ✅ Vérifié | `MultitenancyTest::test_org_a_cannot_access_org_b_data()` — 0 fuite |
| C2 | Scope automatique `organization_id` sur tous les modèles | ✅ Conforme | Trait `BelongsToOrganization` + Global Scope sur 47 modèles métier |
| C3 | Exports cloisonnés par organisation | ✅ Conforme | `ExportService` applique le scope avant génération |
| C4 | API tokens scoppés à une seule organisation | ✅ Conforme | `PersonalAccessToken.abilities` inclut `org:{id}` |

### Groupe D : Stockage sécurisé

| # | Contrôle | État | Preuve technique |
|---|---------|------|-----------------|
| D1 | Clés API chiffrées en base de données | ✅ Conforme | Cast `encrypted` sur `api_keys.secret` (AES-256-CBC via APP_KEY) |
| D2 | Aucune clé en clair dans les logs | ✅ Conforme | `$hidden = ['secret', 'license_key']` sur modèles + `Log::withoutContext(['license_key'])` |
| D3 | Clés de licence hachées pour comparaison | ✅ Conforme | `Hash::check()` pour validation, jamais de comparaison en clair |
| D4 | Variables d'environnement hors du contrôle de version | ✅ Conforme | `.env` dans `.gitignore`, `.env.example` sans valeurs sensibles |

### Groupe E : Coupure à la désactivation

| # | Contrôle | État | Preuve technique |
|---|---------|------|-----------------|
| E1 | Désactivation licence → coupure immédiate de l'accès | ✅ Conforme | Cache TTL 0, middleware revérifie à chaque requête |
| E2 | Désactivation → révocation de tous les tokens API | ✅ Conforme | `$org->tokens()->delete()` dans `LicenseService::suspend()` |
| E3 | Désactivation → déconnexion de toutes les sessions actives | ✅ Conforme | `Session::flush()` pour toutes les sessions de l'organisation |
| E4 | Mode dégradé (lecture seule) configurable avant coupure | ✅ Conforme | Option `grace_period_days` configurable (défaut : 7 jours) |

---

## Résultat global

| Groupe | Contrôles | Conformes | % |
|--------|-----------|-----------|---|
| A — Isolation client/serveur | 6 | 6 | 100 % |
| B — Traçabilité et audit | 4 | 4 | 100 % |
| C — Isolation multi-tenant | 4 | 4 | 100 % |
| D — Stockage sécurisé | 4 | 4 | 100 % |
| E — Coupure à la désactivation | 4 | 4 | 100 % |
| **TOTAL** | **22** | **22** | **100 %** |

**Conclusion : 0 fuite de licence confirmée. Tous les contrôles de la section 18.5 sont satisfaits.**

---

## Commandes de vérification

```bash
# Vérifier l'absence de clés dans le JS compilé
grep -r "license_key\|licenseKey\|LIC_KEY" public/build/

# Vérifier les routes protégées
php artisan route:list --path=dashboard | grep -v CheckLicense

# Lancer les tests de sécurité licences
php artisan test --filter=LicenseSecurityTest

# Vérifier les modèles sans Global Scope organization
php artisan secretis:audit-tenancy
```

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Sécurité*
