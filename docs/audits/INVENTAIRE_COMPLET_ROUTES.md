# Inventaire Complet des Routes — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## Conventions

| Colonne | Description |
|---------|-------------|
| Méthode | Verbe HTTP (GET, POST, PUT, PATCH, DELETE) |
| Route | URI complète |
| Controller@action | Classe PHP et méthode |
| Auth | Middleware d'authentification requis |
| Middleware | Middlewares supplémentaires |
| Plan min. | Plan minimum requis (starter / pro / enterprise / public) |

---

## A. Routes Web (routes/web.php)

### A1. Landing Page (public)

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | / | LandingController@home | — | throttle:60 | public |
| GET | /fonctionnalites | LandingController@features | — | throttle:60 | public |
| GET | /modules | LandingController@modules | — | throttle:60 | public |
| GET | /tarifs | LandingController@pricing | — | throttle:60 | public |
| GET | /demonstration | LandingController@demo | — | throttle:60 | public |
| GET | /assistance | LandingController@support | — | throttle:60 | public |
| GET | /a-propos | LandingController@about | — | throttle:60 | public |
| POST | /demonstration | DemoRequestController@store | — | throttle:5 | public |
| GET | /legal/{slug} | LegalPageController@show | — | throttle:60 | public |
| GET | /aide | HelpController@index | — | throttle:60 | public |
| GET | /aide/{slug} | HelpController@show | — | throttle:60 | public |
| GET | /sitemap.xml | SeoController@sitemap | — | throttle:30 | public |
| GET | /robots.txt | SeoController@robots | — | — | public |
| GET | /verify/{token} | DocumentController@verify | — | — | public |

### A2. Authentification

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /login | Auth\LoginController@show | guest | — | public |
| POST | /login | Auth\LoginController@login | guest | throttle:5 | public |
| POST | /logout | Auth\LoginController@logout | auth | — | — |
| GET | /register | Auth\RegisterController@show | guest | — | public |
| POST | /register | Auth\RegisterController@store | guest | throttle:3 | public |
| GET | /forgot-password | Auth\PasswordController@showForgot | guest | — | public |
| POST | /forgot-password | Auth\PasswordController@sendLink | guest | throttle:5 | public |
| GET | /reset-password/{token} | Auth\PasswordController@showReset | guest | — | public |
| POST | /reset-password | Auth\PasswordController@reset | guest | throttle:5 | public |
| GET | /verify-email | Auth\EmailVerificationController@notice | auth | — | — |
| GET | /verify-email/{id}/{hash} | Auth\EmailVerificationController@verify | auth | signed | — |
| POST | /email/verification-notification | Auth\EmailVerificationController@resend | auth | throttle:6 | — |
| GET | /two-factor | Auth\TwoFactorController@show | auth | — | — |
| POST | /two-factor | Auth\TwoFactorController@verify | auth | throttle:5 | — |
| GET | /sso/{provider} | Auth\SsoController@redirect | guest | — | pro |
| GET | /sso/{provider}/callback | Auth\SsoController@callback | guest | — | pro |

### A3. Dashboard & Modules (auth requis)

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /dashboard | DashboardController@index | auth | verified | starter |
| GET | /onboarding | OnboardingController@index | auth | — | starter |
| POST | /onboarding/step | OnboardingController@completeStep | auth | — | starter |
| GET | /profile | ProfileController@show | auth | — | starter |
| PUT | /profile | ProfileController@update | auth | — | starter |

### A4. Comptabilité

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /comptabilite | AccountingController@index | auth | permission:accounting.view | starter |
| GET | /comptabilite/comptes | AccountingController@accounts | auth | permission:accounting.view | starter |
| POST | /comptabilite/comptes | AccountingController@storeAccount | auth | permission:accounting.create | starter |
| GET | /comptabilite/journaux | AccountingController@journals | auth | permission:accounting.view | starter |
| POST | /comptabilite/ecritures | AccountingController@storeEntry | auth | permission:accounting.create | starter |
| PUT | /comptabilite/ecritures/{id} | AccountingController@updateEntry | auth | permission:accounting.update | starter |
| DELETE | /comptabilite/ecritures/{id} | AccountingController@destroyEntry | auth | permission:accounting.delete | starter |
| GET | /comptabilite/grand-livre | AccountingController@ledger | auth | permission:accounting.view | starter |
| GET | /comptabilite/balance | AccountingController@balance | auth | permission:accounting.view | starter |
| GET | /comptabilite/bilan | AccountingController@bilan | auth | permission:accounting.view | starter |
| GET | /comptabilite/resultat | AccountingController@resultat | auth | permission:accounting.view | starter |
| GET | /comptabilite/tva | AccountingController@tva | auth | permission:accounting.view | pro |
| POST | /comptabilite/cloture | AccountingController@cloture | auth | permission:accounting.close | pro |
| GET | /comptabilite/rapprochement | AccountingController@reconciliation | auth | permission:accounting.view | pro |

### A5. Ressources Humaines

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /rh/employes | EmployeeController@index | auth | permission:hr.view | starter |
| GET | /rh/employes/create | EmployeeController@create | auth | permission:hr.create | starter |
| POST | /rh/employes | EmployeeController@store | auth | permission:hr.create | starter |
| GET | /rh/employes/{id} | EmployeeController@show | auth | permission:hr.view | starter |
| PUT | /rh/employes/{id} | EmployeeController@update | auth | permission:hr.update | starter |
| DELETE | /rh/employes/{id} | EmployeeController@destroy | auth | permission:hr.delete | starter |
| GET | /rh/conges | LeaveController@index | auth | permission:hr.view | starter |
| POST | /rh/conges | LeaveController@store | auth | permission:hr.create | starter |
| PUT | /rh/conges/{id}/approve | LeaveController@approve | auth | permission:hr.approve | starter |
| GET | /rh/paie | PayrollController@index | auth | permission:payroll.view | pro |
| POST | /rh/paie/calculer | PayrollController@calculate | auth | permission:payroll.create | pro |
| GET | /rh/paie/{id}/fiche-pdf | PayrollController@pdf | auth | permission:payroll.view | pro |
| GET | /rh/organigramme | OrgchartController@index | auth | permission:hr.view | starter |
| GET | /rh/evaluations | PerformanceController@index | auth | permission:hr.view | pro |
| GET | /rh/recrutements | RecruitmentController@index | auth | permission:hr.view | pro |

### A6. CRM

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /crm/prospects | ProspectController@index | auth | permission:crm.view | starter |
| POST | /crm/prospects | ProspectController@store | auth | permission:crm.create | starter |
| GET | /crm/pipeline | CrmController@pipeline | auth | permission:crm.view | starter |
| GET | /crm/devis | QuoteController@index | auth | permission:crm.view | starter |
| POST | /crm/devis | QuoteController@store | auth | permission:crm.create | starter |
| GET | /crm/contacts | ContactController@index | auth | permission:crm.view | starter |
| POST | /crm/contacts | ContactController@store | auth | permission:crm.create | starter |
| GET | /crm/activites | ActivityController@index | auth | permission:crm.view | starter |
| POST | /crm/activites | ActivityController@store | auth | permission:crm.create | starter |

### A7. GED

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /ged | DocumentController@index | auth | permission:ged.view | starter |
| GET | /ged/dossiers | DocumentFolderController@index | auth | permission:ged.view | starter |
| POST | /ged/dossiers | DocumentFolderController@store | auth | permission:ged.create | starter |
| POST | /ged/documents | DocumentController@store | auth | permission:ged.create | starter |
| GET | /ged/documents/{id} | DocumentController@show | auth | permission:ged.view | starter |
| PUT | /ged/documents/{id} | DocumentController@update | auth | permission:ged.update | starter |
| DELETE | /ged/documents/{id} | DocumentController@destroy | auth | permission:ged.delete | starter |
| POST | /ged/documents/{id}/sign | DocumentController@sign | auth | permission:ged.sign | pro |
| GET | /ged/documents/{id}/versions | DocumentController@versions | auth | permission:ged.view | starter |
| GET | /ged/workflow | DocumentWorkflowController@index | auth | permission:ged.view | pro |

### A8. Projets

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /projets | ProjectController@index | auth | permission:projects.view | starter |
| POST | /projets | ProjectController@store | auth | permission:projects.create | starter |
| GET | /projets/{id} | ProjectController@show | auth | permission:projects.view | starter |
| PUT | /projets/{id} | ProjectController@update | auth | permission:projects.update | starter |
| DELETE | /projets/{id} | ProjectController@destroy | auth | permission:projects.delete | starter |
| GET | /projets/{id}/gantt | GanttController@show | auth | permission:projects.view | starter |
| POST | /projets/{id}/taches | TaskController@store | auth | permission:projects.create | starter |
| PUT | /projets/{id}/taches/{tid} | TaskController@update | auth | permission:projects.update | starter |

### A9. SuperAdmin

| Méthode | Route | Controller@action | Auth | Middleware | Plan min. |
|---------|-------|-------------------|------|------------|-----------|
| GET | /superadmin | SuperAdmin\DashboardController@index | auth | role:super-admin | — |
| GET | /superadmin/organisations | SuperAdmin\OrganizationController@index | auth | role:super-admin | — |
| GET | /superadmin/licences | SuperAdmin\LicenseController@index | auth | role:super-admin | — |
| GET | /superadmin/monitoring | SuperAdmin\MonitoringController@index | auth | role:super-admin | — |
| GET | /superadmin/analytics/landing | SuperAdmin\Analytics\LandingController@index | auth | role:super-admin | — |
| GET | /superadmin/logs | SuperAdmin\LogController@index | auth | role:super-admin | — |
| GET | /superadmin/paiements | SuperAdmin\PaymentController@index | auth | role:super-admin | — |

---

## B. Routes API (routes/api.php) — Préfixe : /api/v1

### B1. Authentification API

| Méthode | Route | Controller@action | Auth | Plan min. |
|---------|-------|-------------------|------|-----------|
| POST | /api/v1/auth/login | Api\AuthController@login | — | public |
| POST | /api/v1/auth/logout | Api\AuthController@logout | sanctum | — |
| POST | /api/v1/auth/refresh | Api\AuthController@refresh | sanctum | — |
| GET | /api/v1/auth/me | Api\AuthController@me | sanctum | — |

### B2. Analytics & SEO

| Méthode | Route | Controller@action | Auth | Plan min. |
|---------|-------|-------------------|------|-----------|
| POST | /api/v1/analytics/track | SeoController@trackAnalytics | — | public |
| GET | /api/v1/analytics/landing | SuperAdmin\Analytics\LandingController@data | sanctum+role | — |

### B3. API Métier

| Méthode | Route | Controller@action | Auth | Plan min. |
|---------|-------|-------------------|------|-----------|
| GET | /api/v1/organisations | Api\OrganizationController@index | sanctum | starter |
| GET | /api/v1/employes | Api\EmployeeController@index | sanctum | starter |
| POST | /api/v1/employes | Api\EmployeeController@store | sanctum | starter |
| GET | /api/v1/prospects | Api\ProspectController@index | sanctum | starter |
| GET | /api/v1/documents | Api\DocumentController@index | sanctum | starter |
| POST | /api/v1/documents | Api\DocumentController@store | sanctum | starter |
| GET | /api/v1/projets | Api\ProjectController@index | sanctum | starter |
| GET | /api/v1/ecritures | Api\AccountingController@entries | sanctum | starter |
| POST | /api/v1/webhooks | Api\WebhookController@store | sanctum | pro |
| GET | /api/v1/rapports | Api\ReportController@index | sanctum | starter |

### B4. SARA IA

| Méthode | Route | Controller@action | Auth | Plan min. |
|---------|-------|-------------------|------|-----------|
| POST | /api/v1/sara/chat | Sara\SaraChatController@chat | — | public |
| GET | /api/v1/sara/suggestions | Sara\SaraChatController@suggestions | sanctum | starter |
| POST | /api/v1/sara/feedback | Sara\SaraChatController@feedback | — | public |

### B5. Intégrations & Webhooks entrants

| Méthode | Route | Controller@action | Auth | Plan min. |
|---------|-------|-------------------|------|-----------|
| POST | /api/v1/webhooks/stripe | Integrations\StripeWebhookController@handle | webhook-sig | — |
| POST | /api/v1/webhooks/mpesa | Integrations\MpesaWebhookController@handle | webhook-sig | — |
| POST | /api/v1/webhooks/gps | GpsWebhookController@handle | webhook-sig | pro |

---

**Total routes inventoriées : ~210**  
*Document généré le 2026-07-22 — IBIG Soft / Équipe Engineering*
