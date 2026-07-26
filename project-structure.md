# IBIG SECRETIS ERP — Arborescence complète du projet Laravel

## Vue d'ensemble

```
secretis/
├── app/
│   ├── Console/
│   │   └── Commands/
│   │       ├── CreateTenantCommand.php
│   │       ├── SyncLicensesCommand.php
│   │       ├── PurgeExpiredSessionsCommand.php
│   │       └── GenerateMonthlyReportsCommand.php
│   ├── Domain/
│   │   ├── Agenda/
│   │   │   ├── Actions/
│   │   │   │   ├── CreateEventAction.php
│   │   │   │   ├── UpdateEventAction.php
│   │   │   │   ├── DeleteEventAction.php
│   │   │   │   └── SyncCalendarAction.php
│   │   │   ├── DataTransferObjects/
│   │   │   │   └── EventData.php
│   │   │   ├── Events/
│   │   │   │   ├── EventCreated.php
│   │   │   │   └── EventUpdated.php
│   │   │   ├── Models/
│   │   │   │   ├── Event.php
│   │   │   │   ├── EventAttendee.php
│   │   │   │   └── EventReminder.php
│   │   │   ├── Repositories/
│   │   │   │   ├── EventRepositoryInterface.php
│   │   │   │   └── EloquentEventRepository.php
│   │   │   └── Services/
│   │   │       ├── AgendaService.php
│   │   │       └── ReminderService.php
│   │   ├── Courrier/
│   │   │   ├── Actions/
│   │   │   │   ├── CreateCourrierAction.php
│   │   │   │   ├── AssignCourrierAction.php
│   │   │   │   ├── ArchiveCourrierAction.php
│   │   │   │   └── ClassifyDocumentAction.php
│   │   │   ├── DataTransferObjects/
│   │   │   │   ├── CourrierData.php
│   │   │   │   └── DocumentData.php
│   │   │   ├── Events/
│   │   │   │   ├── CourrierReceived.php
│   │   │   │   └── CourrierAssigned.php
│   │   │   ├── Models/
│   │   │   │   ├── Courrier.php
│   │   │   │   ├── Document.php
│   │   │   │   ├── DocumentVersion.php
│   │   │   │   └── CourrierTracking.php
│   │   │   ├── Repositories/
│   │   │   │   ├── CourrierRepositoryInterface.php
│   │   │   │   └── EloquentCourrierRepository.php
│   │   │   └── Services/
│   │   │       ├── CourrierService.php
│   │   │       ├── GEDService.php
│   │   │       └── OCRService.php
│   │   ├── Reunions/
│   │   │   ├── Actions/
│   │   │   │   ├── CreateReunionAction.php
│   │   │   │   ├── GenerateODJAction.php
│   │   │   │   └── GeneratePVAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Reunion.php
│   │   │   │   ├── ReunionParticipant.php
│   │   │   │   ├── PointODJ.php
│   │   │   │   └── ProcesVerbal.php
│   │   │   ├── Repositories/
│   │   │   │   ├── ReunionRepositoryInterface.php
│   │   │   │   └── EloquentReunionRepository.php
│   │   │   └── Services/
│   │   │       ├── ReunionService.php
│   │   │       └── PVGeneratorService.php
│   │   ├── Taches/
│   │   │   ├── Actions/
│   │   │   │   ├── CreateTacheAction.php
│   │   │   │   ├── AssignTacheAction.php
│   │   │   │   └── UpdateProgressAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Tache.php
│   │   │   │   ├── TacheComment.php
│   │   │   │   └── TacheAttachment.php
│   │   │   ├── Repositories/
│   │   │   │   ├── TacheRepositoryInterface.php
│   │   │   │   └── EloquentTacheRepository.php
│   │   │   └── Services/
│   │   │       └── TacheService.php
│   │   ├── Communication/
│   │   │   ├── Actions/
│   │   │   │   ├── SendMessageAction.php
│   │   │   │   ├── CreateChannelAction.php
│   │   │   │   └── SendNotificationAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Message.php
│   │   │   │   ├── Channel.php
│   │   │   │   ├── ChannelMember.php
│   │   │   │   └── Notification.php
│   │   │   ├── Repositories/
│   │   │   │   └── MessageRepositoryInterface.php
│   │   │   └── Services/
│   │   │       ├── MessagingService.php
│   │   │       └── NotificationService.php
│   │   ├── Accueil/
│   │   │   ├── Actions/
│   │   │   │   ├── RegisterVisitorAction.php
│   │   │   │   └── CheckOutVisitorAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Visiteur.php
│   │   │   │   ├── Rendez_vous.php
│   │   │   │   └── BadgeVisiteur.php
│   │   │   ├── Repositories/
│   │   │   │   └── VisiteurRepositoryInterface.php
│   │   │   └── Services/
│   │   │       └── AccueilService.php
│   │   ├── Ressources/
│   │   │   ├── Actions/
│   │   │   │   ├── ReserveResourceAction.php
│   │   │   │   └── ReleaseResourceAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Ressource.php
│   │   │   │   ├── Reservation.php
│   │   │   │   └── RessourceCategorie.php
│   │   │   ├── Repositories/
│   │   │   │   └── RessourceRepositoryInterface.php
│   │   │   └── Services/
│   │   │       └── RessourceService.php
│   │   ├── RH/
│   │   │   ├── Actions/
│   │   │   │   ├── CreateEmployeeAction.php
│   │   │   │   ├── RecordLeaveAction.php
│   │   │   │   └── ProcessAttendanceAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Employee.php
│   │   │   │   ├── Department.php
│   │   │   │   ├── Leave.php
│   │   │   │   └── Attendance.php
│   │   │   ├── Repositories/
│   │   │   │   └── EmployeeRepositoryInterface.php
│   │   │   └── Services/
│   │   │       └── RHService.php
│   │   ├── Rapports/
│   │   │   ├── Actions/
│   │   │   │   ├── GenerateReportAction.php
│   │   │   │   └── ExportReportAction.php
│   │   │   ├── Models/
│   │   │   │   ├── Report.php
│   │   │   │   └── ReportSchedule.php
│   │   │   └── Services/
│   │   │       ├── ReportService.php
│   │   │       └── ExportService.php
│   │   └── Parametres/
│   │       ├── Actions/
│   │       │   └── UpdateSettingsAction.php
│   │       ├── Models/
│   │       │   ├── OrganizationSetting.php
│   │       │   └── SystemSetting.php
│   │       └── Services/
│   │           └── SettingsService.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   ├── AuthenticatedSessionController.php
│   │   │   │   ├── RegisteredUserController.php
│   │   │   │   ├── PasswordResetLinkController.php
│   │   │   │   └── TwoFactorController.php
│   │   │   ├── Api/
│   │   │   │   ├── V1/
│   │   │   │   │   ├── AgendaController.php
│   │   │   │   │   ├── CourrierController.php
│   │   │   │   │   ├── ReunionController.php
│   │   │   │   │   ├── TacheController.php
│   │   │   │   │   ├── CommunicationController.php
│   │   │   │   │   ├── AccueilController.php
│   │   │   │   │   ├── RessourceController.php
│   │   │   │   │   ├── RHController.php
│   │   │   │   │   ├── RapportController.php
│   │   │   │   │   └── ParametreController.php
│   │   │   │   └── Webhooks/
│   │   │   │       └── WebhookController.php
│   │   │   ├── SuperAdmin/
│   │   │   │   ├── DashboardController.php
│   │   │   │   ├── TenantController.php
│   │   │   │   ├── LicenseController.php
│   │   │   │   ├── PlanController.php
│   │   │   │   └── MonitoringController.php
│   │   │   └── Web/
│   │   │       ├── DashboardController.php
│   │   │       ├── AgendaController.php
│   │   │       ├── CourrierController.php
│   │   │       ├── ReunionController.php
│   │   │       ├── TacheController.php
│   │   │       ├── CommunicationController.php
│   │   │       ├── AccueilController.php
│   │   │       ├── RessourceController.php
│   │   │       ├── RHController.php
│   │   │       ├── RapportController.php
│   │   │       └── ParametreController.php
│   │   ├── Middleware/
│   │   │   ├── AuthenticateMiddleware.php
│   │   │   ├── CheckLicenseMiddleware.php
│   │   │   ├── SetTenantMiddleware.php
│   │   │   ├── CheckRBACMiddleware.php
│   │   │   ├── CheckModuleAccessMiddleware.php
│   │   │   ├── HandleInertiaRequests.php
│   │   │   └── LocaleMiddleware.php
│   │   └── Requests/
│   │       ├── Agenda/
│   │       │   ├── StoreEventRequest.php
│   │       │   └── UpdateEventRequest.php
│   │       ├── Courrier/
│   │       │   ├── StoreCourrierRequest.php
│   │       │   └── UpdateCourrierRequest.php
│   │       ├── Auth/
│   │       │   ├── LoginRequest.php
│   │       │   └── RegisterRequest.php
│   │       └── ... (un dossier par module)
│   ├── Models/
│   │   ├── User.php
│   │   ├── Organization.php
│   │   ├── License.php
│   │   ├── Plan.php
│   │   └── AuditLog.php
│   ├── Providers/
│   │   ├── AppServiceProvider.php
│   │   ├── AuthServiceProvider.php
│   │   ├── EventServiceProvider.php
│   │   ├── RouteServiceProvider.php
│   │   ├── TenancyServiceProvider.php
│   │   ├── ModuleServiceProvider.php
│   │   ├── RepositoryServiceProvider.php
│   │   └── BroadcastServiceProvider.php
│   ├── Policies/
│   │   ├── EventPolicy.php
│   │   ├── CourrierPolicy.php
│   │   ├── ReunionPolicy.php
│   │   ├── TachePolicy.php
│   │   └── ... (une policy par modèle sensible)
│   ├── Jobs/
│   │   ├── ProcessOCRJob.php
│   │   ├── SendReminderJob.php
│   │   ├── GenerateReportJob.php
│   │   ├── SyncCalendarJob.php
│   │   └── SendBulkNotificationJob.php
│   ├── Listeners/
│   │   ├── SendEventReminderListener.php
│   │   ├── NotifyCourrierAssignedListener.php
│   │   ├── LogAuditTrailListener.php
│   │   └── UpdateTenantUsageListener.php
│   ├── Notifications/
│   │   ├── EventReminderNotification.php
│   │   ├── CourrierAssignedNotification.php
│   │   ├── TacheDeadlineNotification.php
│   │   └── WelcomeOrganizationNotification.php
│   ├── Rules/
│   │   ├── ValidPhoneAfrica.php
│   │   └── UniquePerTenant.php
│   └── Support/
│       ├── Helpers/
│       │   ├── TenantHelper.php
│       │   └── DateHelper.php
│       └── Traits/
│           ├── BelongsToTenant.php
│           ├── HasAuditLog.php
│           └── HasUuid.php
├── bootstrap/
│   ├── app.php
│   └── providers.php
├── config/
│   ├── app.php
│   ├── auth.php
│   ├── broadcasting.php
│   ├── cache.php
│   ├── database.php
│   ├── filesystems.php
│   ├── mail.php
│   ├── queue.php
│   ├── reverb.php
│   ├── scout.php
│   ├── secretis.php           ← Configuration personnalisée SECRETIS
│   └── tenancy.php
├── database/
│   ├── factories/
│   │   ├── UserFactory.php
│   │   ├── OrganizationFactory.php
│   │   └── ... (une factory par modèle)
│   ├── migrations/
│   │   ├── 2024_01_01_000001_create_plans_table.php
│   │   ├── 2024_01_01_000002_create_organizations_table.php
│   │   ├── 2024_01_01_000003_create_licenses_table.php
│   │   ├── 2024_01_01_000004_create_users_table.php
│   │   ├── 2024_01_01_000005_create_audit_logs_table.php
│   │   ├── Agenda/
│   │   │   ├── 2024_01_02_000001_create_events_table.php
│   │   │   └── 2024_01_02_000002_create_event_attendees_table.php
│   │   ├── Courrier/
│   │   │   ├── 2024_01_03_000001_create_courriers_table.php
│   │   │   └── 2024_01_03_000002_create_documents_table.php
│   │   ├── Reunions/
│   │   │   └── 2024_01_04_000001_create_reunions_table.php
│   │   ├── Taches/
│   │   │   └── 2024_01_05_000001_create_taches_table.php
│   │   ├── Communication/
│   │   │   └── 2024_01_06_000001_create_messages_table.php
│   │   ├── Accueil/
│   │   │   └── 2024_01_07_000001_create_visiteurs_table.php
│   │   ├── Ressources/
│   │   │   └── 2024_01_08_000001_create_ressources_table.php
│   │   ├── RH/
│   │   │   └── 2024_01_09_000001_create_employees_table.php
│   │   └── Rapports/
│   │       └── 2024_01_10_000001_create_reports_table.php
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── PlanSeeder.php
│       ├── PermissionSeeder.php
│       ├── SuperAdminSeeder.php
│       └── DemoOrganizationSeeder.php
├── resources/
│   ├── js/
│   │   ├── app.jsx
│   │   ├── bootstrap.js
│   │   ├── echo.js                     ← Config Laravel Echo / Reverb
│   │   ├── Components/
│   │   │   ├── Common/
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── DataTable.jsx
│   │   │   │   ├── FileUpload.jsx
│   │   │   │   ├── Notification.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── Layout/
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── TopBar.jsx
│   │   │   │   └── SuperAdminLayout.jsx
│   │   │   └── Modules/
│   │   │       ├── Agenda/
│   │   │       ├── Courrier/
│   │   │       ├── Reunions/
│   │   │       ├── Taches/
│   │   │       ├── Communication/
│   │   │       ├── Accueil/
│   │   │       ├── Ressources/
│   │   │       ├── RH/
│   │   │       ├── Rapports/
│   │   │       └── Parametres/
│   │   ├── Pages/
│   │   │   ├── Auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── ForgotPassword.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Agenda/
│   │   │   │   ├── Index.jsx
│   │   │   │   ├── Show.jsx
│   │   │   │   └── Form.jsx
│   │   │   ├── Courrier/
│   │   │   │   ├── Index.jsx
│   │   │   │   ├── Show.jsx
│   │   │   │   └── Form.jsx
│   │   │   ├── Reunions/
│   │   │   ├── Taches/
│   │   │   ├── Communication/
│   │   │   ├── Accueil/
│   │   │   ├── Ressources/
│   │   │   ├── RH/
│   │   │   ├── Rapports/
│   │   │   ├── Parametres/
│   │   │   └── SuperAdmin/
│   │   │       ├── Dashboard.jsx
│   │   │       ├── Tenants/
│   │   │       │   ├── Index.jsx
│   │   │       │   └── Show.jsx
│   │   │       ├── Licenses/
│   │   │       └── Plans/
│   │   ├── Stores/                     ← Zustand / state management
│   │   │   ├── authStore.js
│   │   │   ├── tenantStore.js
│   │   │   └── notificationStore.js
│   │   └── Hooks/
│   │       ├── usePermission.js
│   │       ├── useModule.js
│   │       └── useRealtime.js
│   ├── css/
│   │   └── app.css
│   ├── lang/
│   │   ├── fr/
│   │   │   ├── auth.php
│   │   │   ├── agenda.php
│   │   │   ├── courrier.php
│   │   │   └── validation.php
│   │   └── en/
│   │       ├── auth.php
│   │       ├── agenda.php
│   │       ├── courrier.php
│   │       └── validation.php
│   └── views/
│       ├── app.blade.php               ← Template Inertia principal
│       ├── emails/
│       │   ├── welcome.blade.php
│       │   ├── reminder.blade.php
│       │   └── reset-password.blade.php
│       └── pdf/
│           ├── courrier.blade.php
│           ├── rapport.blade.php
│           └── pv-reunion.blade.php
├── routes/
│   ├── web.php                         ← Routes Inertia / Web
│   ├── api.php                         ← Routes API REST
│   ├── auth.php                        ← Routes authentification
│   ├── channels.php                    ← Canaux broadcast Reverb
│   ├── console.php                     ← Commandes Artisan planifiées
│   └── modules/
│       ├── agenda.php
│       ├── courrier.php
│       ├── reunions.php
│       ├── taches.php
│       ├── communication.php
│       ├── accueil.php
│       ├── ressources.php
│       ├── rh.php
│       ├── rapports.php
│       └── parametres.php
├── storage/
│   ├── app/
│   │   ├── public/
│   │   │   ├── courriers/
│   │   │   ├── documents/
│   │   │   ├── avatars/
│   │   │   └── exports/
│   │   └── private/
│   │       └── tenants/
│   ├── framework/
│   └── logs/
├── tests/
│   ├── Feature/
│   │   ├── Auth/
│   │   │   └── AuthenticationTest.php
│   │   ├── Agenda/
│   │   │   └── AgendaTest.php
│   │   ├── Courrier/
│   │   │   └── CourrierTest.php
│   │   ├── Tenancy/
│   │   │   └── MultiTenancyTest.php
│   │   └── License/
│   │       └── LicenseCheckTest.php
│   └── Unit/
│       ├── Services/
│       │   ├── AgendaServiceTest.php
│       │   └── CourrierServiceTest.php
│       └── Repositories/
│           └── EventRepositoryTest.php
├── .env
├── .env.example
├── .gitignore
├── artisan
├── composer.json
├── package.json
├── vite.config.js
├── tailwind.config.js
├── phpunit.xml
└── README.md
```

## Notes sur l'organisation

### Conventions de nommage
- **Domaines** : PascalCase, un dossier par module métier
- **Actions** : verbe + nom + `Action` (ex: `CreateEventAction`)
- **DTOs** : nom + `Data` (ex: `EventData`)
- **Repositories** : interface + implémentation Eloquent séparées
- **Services** : logique métier orchestrant actions et repositories

### Organisation des migrations
Les migrations sont regroupées par module dans des sous-dossiers. Laravel les découvre automatiquement si `database/migrations` est configuré avec le chemin récursif dans `AppServiceProvider`.

### Stockage multi-tenant
Chaque organisation a son propre répertoire de stockage isolé sous `storage/app/private/tenants/{organization_id}/`.
