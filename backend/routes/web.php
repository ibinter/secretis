<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| SECRETIS ERP — Routes Web (Inertia.js)
| Toutes les 12 vagues — Version définitive
|--------------------------------------------------------------------------
*/

use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AgendaController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\BiController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CircularController;
use App\Http\Controllers\ClientPortalController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CourrierController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentWorkflowController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FleetController;
use App\Http\Controllers\GedController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\HelpCenterController;
use App\Http\Controllers\HelpController;
use App\Http\Controllers\Support\TicketController as SupportTicketController;
use App\Http\Controllers\HrController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LicenseController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\ParametresController;
use App\Http\Controllers\Portal\ClientPortalController as PortalClientPortalController;
use App\Http\Controllers\ProcurementController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\QualityController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\SaraController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\SsoController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SuperAdmin\AnnouncementController as SuperAdminAnnouncementController;
use App\Http\Controllers\SuperAdmin\CrmController as SuperAdminCrmController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\FeatureFlagController;
use App\Http\Controllers\SuperAdmin\LicenseController as SuperAdminLicenseController;
use App\Http\Controllers\SuperAdmin\OrganizationController as SuperAdminOrganizationController;
use App\Http\Controllers\SuperAdmin\CrmProspectsController;
use App\Http\Controllers\SuperAdmin\MetricsController;
use App\Http\Controllers\SuperAdmin\PlansController;
use App\Http\Controllers\SuperAdmin\SaasMetricsController;
use App\Http\Controllers\SuperAdmin\SupportController as SuperAdminSupportController;
use App\Http\Controllers\SupplierPortalController;
use App\Http\Controllers\SyscohadaController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TrainingController;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\Public\VisitorPortalController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ChangelogController;
use App\Http\Controllers\LandingPageController;
use App\Http\Controllers\PaymentReturnController;
use App\Http\Controllers\GuideController;
use App\Http\Controllers\FaqController;
use Illuminate\Support\Facades\Route;

// =============================================================================
// ROUTES PUBLIQUES — Sans authentification
// =============================================================================


// Public health endpoint (JSON)
Route::get('/health', function () {
    return response()->json([
        'status'    => 'ok',
        'version'   => config('app.version', '2.5.0'),
        'platform'  => 'SECRETIS ERP',
        'timestamp' => now()->toIso8601String(),
    ]);
})->name('health.public');

Route::middleware(['throttle:web'])->group(function () {

    // Landing pages
    Route::get('/', [LandingPageController::class, 'index'])->name('home');
    Route::get('/about', [LandingPageController::class, 'about'])->name('about');
    Route::get('/pricing', [LandingPageController::class, 'pricing'])->name('pricing');
    Route::get('/features', [LandingPageController::class, 'features'])->name('features');
    Route::get('/contact', [LandingPageController::class, 'contact'])->name('contact');
    Route::post('/contact', [LandingPageController::class, 'sendContact'])->name('contact.send');

    // Acceptation d'offre commerciale (lien sécurisé par token)
    Route::get('/offers/accept/{token}', [CrmProspectsController::class, 'acceptOffer'])->name('offers.accept');
    Route::get('/offer-accepted', fn () => \Inertia\Inertia::render('Public/OfferAccepted'))->name('offer.accepted');

    // -------------------------------------------------------------------------
    // CENTRE D'AIDE (public — sans auth)
    // -------------------------------------------------------------------------
    Route::prefix('aide')->name('help.')->group(function () {
        Route::get('/', [HelpCenterController::class, 'index'])->name('index');
        Route::get('/search', [HelpCenterController::class, 'search'])->name('search');
        Route::get('/{category:slug}', [HelpCenterController::class, 'category'])->name('category')->where('category', '^(?!tickets$|cas-pratiques$).*$');
        Route::get('/{category:slug}/{article:slug}', [HelpCenterController::class, 'article'])->name('article')->where('category', '^(?!tickets$|cas-pratiques$).*$');
    });

    // Santé & API Docs
    Route::get('/status', [HealthController::class, 'status'])->name('status');
    Route::get('/docs/api', [LandingPageController::class, 'apiDocs'])->name('docs.api');

    // Changelog public
    Route::get('/changelog', [ChangelogController::class, 'index'])->name('changelog');

    // Portail invitation visiteur (lien public envoyé par email)
    Route::get('/visitor-invitation/{code}', [VisitorPortalController::class, 'showInvitation'])
        ->name('visitor.invitation.show');

    // Portail fournisseur (Vague 12)
    Route::prefix('supplier-portal')->name('supplier-portal.')->group(function () {
        Route::get('/', [SupplierPortalController::class, 'login'])->name('login');
        Route::post('/login', [SupplierPortalController::class, 'authenticate'])->name('authenticate');
        Route::middleware(['auth.supplier'])->group(function () {
            Route::get('/dashboard', [SupplierPortalController::class, 'dashboard'])->name('dashboard');
            Route::get('/rfqs', [SupplierPortalController::class, 'rfqs'])->name('rfqs.index');
            Route::post('/rfqs/{id}/respond', [SupplierPortalController::class, 'respond'])->name('rfqs.respond');
            Route::get('/orders', [SupplierPortalController::class, 'orders'])->name('orders.index');
            Route::post('/orders/{id}/acknowledge', [SupplierPortalController::class, 'acknowledgeOrder'])->name('orders.acknowledge');
            Route::post('/orders/{id}/invoice', [SupplierPortalController::class, 'uploadInvoice'])->name('orders.invoice');
        });
    });

    // Signature électronique publique (Vague 7)
    Route::get('/sign/{token}', [SignatureController::class, 'showPublic'])->name('sign.show');
    Route::post('/sign/{token}', [SignatureController::class, 'processPublic'])->name('sign.process');

    // Vérification certificat formation (Vague 7/12)
    Route::get('/certificate/{uuid}', [TrainingController::class, 'verifyCertificate'])->name('certificate.verify');
    Route::get('/training/catalog', [TrainingController::class, 'publicCatalog'])->name('training.public-catalog');

    // Vérification certificat Académie SECRETIS (Section 12.4 — public, sans auth)
    Route::get('/training/verify/{uuid}', [\App\Http\Controllers\AcademyController::class, 'verifyCertificate'])->name('training.verify');

    // Auth pages (Fortify / Breeze style via Inertia)
    Route::middleware(['guest'])->group(function () {
        Route::get('/login', [\App\Http\Controllers\Auth\AuthController::class, 'showLogin'])->name('login');
        Route::get('/register', [\App\Http\Controllers\Auth\AuthController::class, 'showRegister'])->name('register');
        Route::get('/forgot-password', [\App\Http\Controllers\Auth\AuthController::class, 'showForgotPassword'])->name('password.request');
        Route::get('/reset-password/{token}', [\App\Http\Controllers\Auth\AuthController::class, 'showResetPassword'])->name('password.reset');
    });

    // Session login / logout — crée la session Laravel (POST web)
    Route::post('/login', [\App\Http\Controllers\Auth\AuthController::class, 'login'])
        ->middleware(['guest', 'throttle:5,1'])->name('login.store');
    Route::post('/logout', [\App\Http\Controllers\Auth\AuthController::class, 'logout'])
        ->middleware(['auth'])->name('logout');

    // Email verification (page publique affichée après connexion)
    Route::get('/verify-email', [\App\Http\Controllers\Auth\AuthController::class, 'showVerifyEmail'])
        ->middleware(['auth'])
        ->name('verification.notice');
    Route::get('/verify-email/{id}/{hash}', [\App\Http\Controllers\Auth\AuthController::class, 'verifyEmail'])
        ->middleware(['auth', 'signed', 'throttle:6,1'])
        ->name('verification.verify');
});

// =============================================================================
// ROUTES AUTHENTIFIÉES — Inertia SPA
// Middlewares : auth:sanctum, verified, license, tenant
// =============================================================================

Route::middleware([
    'auth:sanctum',
    'verified',
    'license',
    'tenant',
    'throttle:web',
])->group(function () {

    // -------------------------------------------------------------------------
    // Dashboard & Onboarding
    // -------------------------------------------------------------------------
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/onboarding', [OnboardingController::class, 'index'])->name('onboarding');

    // Onboarding gamifié (points, badges, checklist)
    Route::prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('/status', [OnboardingController::class, 'status'])->name('status');
        Route::post('/complete', [OnboardingController::class, 'complete'])->name('complete');
        Route::post('/skip', [OnboardingController::class, 'skip'])->name('skip');
    });

    // -------------------------------------------------------------------------
    // MODULE 1 — Agenda & Planning (Vague 1)
    // -------------------------------------------------------------------------
    Route::prefix('agenda')->name('agenda.')->group(function () {
        Route::get('/', [AgendaController::class, 'index'])->name('index');
        Route::get('/day', [AgendaController::class, 'day'])->name('day');
        Route::get('/week', [AgendaController::class, 'week'])->name('week');
        Route::get('/month', [AgendaController::class, 'month'])->name('month');
        Route::get('/availability', [AgendaController::class, 'availability'])->name('availability');
        Route::get('/smart-scheduler', [AgendaController::class, 'smartScheduler'])->name('smart-scheduler');

        // Événements
        Route::post('/events', [AgendaController::class, 'store'])->name('events.store');
        Route::get('/events/{id}', [AgendaController::class, 'show'])->name('events.show');
        Route::put('/events/{id}', [AgendaController::class, 'update'])->name('events.update');
        Route::delete('/events/{id}', [AgendaController::class, 'destroy'])->name('events.destroy');
        Route::post('/events/{id}/respond', [AgendaController::class, 'respond'])->name('events.respond');

        // Salles de réunion
        Route::get('/rooms', [RoomController::class, 'index'])->name('rooms.index');
        Route::post('/rooms/{id}/reserve', [RoomController::class, 'reserve'])->name('rooms.reserve');
    });

    // -------------------------------------------------------------------------
    // MODULE 2 — Courrier & GED (Vague 2)
    // -------------------------------------------------------------------------
    Route::prefix('courrier')->name('courrier.')->group(function () {
        Route::get('/', [CourrierController::class, 'index'])->name('index');
        Route::post('/', [CourrierController::class, 'store'])->name('store');
        Route::get('/{id}', [CourrierController::class, 'show'])->name('show');
        Route::put('/{id}', [CourrierController::class, 'update'])->name('update');
        Route::delete('/{id}', [CourrierController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/assign', [CourrierController::class, 'assign'])->name('assign');
        Route::post('/{id}/archive', [CourrierController::class, 'archive'])->name('archive');
    });

    Route::prefix('ged')->name('ged.')->group(function () {
        Route::get('/', [DocumentController::class, 'index'])->name('index');
        Route::post('/upload', [DocumentController::class, 'upload'])->name('upload');
        Route::get('/search', [DocumentController::class, 'search'])->name('search');
        Route::get('/archives', [DocumentController::class, 'archives'])->name('archives');
        Route::get('/validation', [DocumentWorkflowController::class, 'myQueue'])->name('validation');
        Route::get('/workflow-templates', [DocumentWorkflowController::class, 'templates'])->name('workflow-templates');

        Route::prefix('documents')->name('documents.')->group(function () {
            Route::get('/{id}', [DocumentController::class, 'show'])->name('show');
            Route::put('/{id}', [DocumentController::class, 'update'])->name('update');
            Route::delete('/{id}', [DocumentController::class, 'destroy'])->name('destroy');
            Route::get('/{id}/download', [DocumentController::class, 'download'])->name('download');
            Route::post('/{id}/share', [DocumentController::class, 'share'])->name('share');
            Route::get('/{id}/versions', [DocumentController::class, 'versions'])->name('versions');
            Route::post('/{id}/workflow/start', [DocumentWorkflowController::class, 'start'])->name('workflow.start');
            Route::post('/{id}/workflow/steps/{stepId}/approve', [DocumentWorkflowController::class, 'approve'])->name('workflow.approve');
            Route::post('/{id}/workflow/steps/{stepId}/reject', [DocumentWorkflowController::class, 'reject'])->name('workflow.reject');
        });
    });

    // -------------------------------------------------------------------------
    // MODULE 3 — Réunions (Vague 3)
    // -------------------------------------------------------------------------
    Route::prefix('reunions')->name('reunions.')->group(function () {
        Route::get('/', [MeetingController::class, 'index'])->name('index');
        Route::post('/', [MeetingController::class, 'store'])->name('store');
        Route::get('/{id}', [MeetingController::class, 'show'])->name('show');
        Route::put('/{id}', [MeetingController::class, 'update'])->name('update');
        Route::delete('/{id}', [MeetingController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/start', [MeetingController::class, 'start'])->name('start');
        Route::post('/{id}/end', [MeetingController::class, 'end'])->name('end');
        Route::get('/{id}/compte-rendu', [MeetingController::class, 'showMinutes'])->name('compte-rendu.show');
        Route::post('/{id}/compte-rendu', [MeetingController::class, 'storeMinutes'])->name('compte-rendu.store');
        Route::post('/{id}/tasks', [TaskController::class, 'createFromMeeting'])->name('tasks.create');
    });

    // -------------------------------------------------------------------------
    // MODULE 4 — Tâches & Projets (Vague 4)
    // -------------------------------------------------------------------------
    Route::prefix('taches')->name('taches.')->group(function () {
        Route::get('/', [TaskController::class, 'index'])->name('index');
        Route::post('/', [TaskController::class, 'store'])->name('store');
        Route::get('/{id}', [TaskController::class, 'show'])->name('show');
        Route::put('/{id}', [TaskController::class, 'update'])->name('update');
        Route::delete('/{id}', [TaskController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/complete', [TaskController::class, 'complete'])->name('complete');
        Route::get('/kanban', [TaskController::class, 'kanban'])->name('kanban');
    });

    Route::prefix('projets')->name('projets.')->group(function () {
        Route::get('/', [ProjectController::class, 'index'])->name('index');
        Route::post('/', [ProjectController::class, 'store'])->name('store');
        Route::get('/{id}', [ProjectController::class, 'show'])->name('show');
        Route::put('/{id}', [ProjectController::class, 'update'])->name('update');
        Route::delete('/{id}', [ProjectController::class, 'destroy'])->name('destroy');
        Route::get('/{id}/gantt', [ProjectController::class, 'gantt'])->name('gantt');
        Route::get('/{id}/risk-matrix', [ProjectController::class, 'riskMatrix'])->name('risk-matrix');
        Route::post('/{id}/timesheets', [ProjectController::class, 'storeTimesheet'])->name('timesheets.store');
    });

    // -------------------------------------------------------------------------
    // MODULE 5 — Communication (Vague 5)
    // -------------------------------------------------------------------------
    Route::prefix('messages')->name('messages.')->group(function () {
        Route::get('/', [MessageController::class, 'index'])->name('index');
        Route::post('/', [MessageController::class, 'store'])->name('store');
        Route::get('/{id}', [MessageController::class, 'show'])->name('show');
    });

    Route::prefix('circulaires')->name('circulaires.')->group(function () {
        Route::get('/', [CircularController::class, 'index'])->name('index');
        Route::post('/', [CircularController::class, 'store'])->name('store');
        Route::get('/{id}', [CircularController::class, 'show'])->name('show');
        Route::put('/{id}', [CircularController::class, 'update'])->name('update');
        Route::delete('/{id}', [CircularController::class, 'destroy'])->name('destroy');
    });

    Route::get('/annuaire', [ContactController::class, 'index'])->name('annuaire');
    Route::redirect('/contacts', '/annuaire', 301);
    Route::redirect('/visiteurs', '/reception', 301);
    Route::get('/tableau-affichage', [AnnouncementController::class, 'board'])->name('tableau-affichage');

    // -------------------------------------------------------------------------
    // MODULE 6 — Réception Visiteurs (Vague 6)
    // -------------------------------------------------------------------------
    Route::prefix('reception')->name('reception.')->group(function () {
        Route::get('/', [VisitorController::class, 'dashboard'])->name('dashboard');
        Route::get('/kiosk', [VisitorController::class, 'kiosk'])->name('kiosk');
        Route::post('/check-in', [VisitorController::class, 'checkIn'])->name('check-in');
        Route::post('/visits/{id}/check-out', [VisitorController::class, 'checkOut'])->name('check-out');
        Route::get('/log', [VisitorController::class, 'log'])->name('log');
        Route::get('/reports', [VisitorController::class, 'reports'])->name('reports');
        Route::get('/blacklist', [VisitorController::class, 'blacklistPage'])->name('blacklist');
        Route::post('/visitors/{id}/blacklist', [VisitorController::class, 'addToBlacklist'])->name('visitors.blacklist');

        Route::prefix('invitations')->name('invitations.')->group(function () {
            Route::get('/', [VisitorController::class, 'invitations'])->name('index');
            Route::post('/', [VisitorController::class, 'createInvitation'])->name('store');
        });
    });

    // -------------------------------------------------------------------------
    // MODULE 7 — Ressources (Vague 3/4)
    // -------------------------------------------------------------------------
    Route::prefix('ressources')->name('ressources.')->group(function () {
        Route::get('/salles', [ResourceController::class, 'salles'])->name('salles');
        Route::get('/materiel', [ResourceController::class, 'materiel'])->name('materiel');
        Route::get('/fournitures', [ResourceController::class, 'fournitures'])->name('fournitures');
        Route::get('/vehicules', [ResourceController::class, 'vehicules'])->name('vehicules');
    });

    // Flotte & GPS (Vague 5/9)
    Route::prefix('fleet')->name('fleet.')->group(function () {
        Route::get('/map', [FleetController::class, 'map'])->name('map');
        Route::get('/vehicles/{id}', [FleetController::class, 'vehicleDetail'])->name('vehicles.show');
        Route::get('/maintenance', [FleetController::class, 'maintenancePlanning'])->name('maintenance');
        Route::get('/carburant', [FleetController::class, 'fuelManagement'])->name('carburant');
        Route::get('/rapport', [FleetController::class, 'report'])->name('rapport');
        Route::get('/geofences', [FleetController::class, 'geofences'])->name('geofences');
        Route::get('/carnet-de-bord', [FleetController::class, 'tripLogger'])->name('carnet-de-bord');
    });

    // -------------------------------------------------------------------------
    // MODULE 8 — Ressources Humaines Légère (Vague 4/8)
    // -------------------------------------------------------------------------
    Route::prefix('rh')->name('rh.')->group(function () {
        Route::get('/personnel', [HrController::class, 'index'])->name('personnel.index');
        Route::get('/personnel/{id}', [EmployeeController::class, 'show'])->name('personnel.show');
        Route::get('/organigramme', [HrController::class, 'orgChart'])->name('organigramme');
        Route::get('/planning', [HrController::class, 'planning'])->name('planning');

        // Congés
        Route::prefix('conges')->name('conges.')->group(function () {
            Route::get('/', [LeaveController::class, 'index'])->name('index');
            Route::post('/', [LeaveController::class, 'store'])->name('store');
            Route::get('/{id}', [LeaveController::class, 'show'])->name('show');
            Route::put('/{id}', [LeaveController::class, 'update'])->name('update');
            Route::post('/{id}/approve', [LeaveController::class, 'approve'])->name('approve');
            Route::post('/{id}/reject', [LeaveController::class, 'reject'])->name('reject');
        });

        // Notes de frais
        Route::prefix('notes-de-frais')->name('notes-de-frais.')->group(function () {
            Route::get('/', [ExpenseController::class, 'index'])->name('index');
            Route::post('/', [ExpenseController::class, 'store'])->name('store');
            Route::get('/{id}', [ExpenseController::class, 'show'])->name('show');
            Route::put('/{id}', [ExpenseController::class, 'update'])->name('update');
            Route::post('/{id}/approve', [ExpenseController::class, 'approve'])->name('approve');
            Route::post('/{id}/reject', [ExpenseController::class, 'reject'])->name('reject');
        });
    });

    // -------------------------------------------------------------------------
    // MODULE 9 — Rapports & Business Intelligence (Vague 5/9)
    // -------------------------------------------------------------------------
    Route::prefix('rapports')->name('rapports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::get('/builder', [ReportController::class, 'builder'])->name('builder');
        Route::post('/generate', [ReportController::class, 'generate'])->name('generate');
        Route::get('/{id}', [ReportController::class, 'show'])->name('show');
        Route::get('/{id}/export', [ReportController::class, 'export'])->name('export');
    });

    // -------------------------------------------------------------------------
    // Report Builder drag-and-drop (Vague 13 — custom reports)
    // -------------------------------------------------------------------------
    Route::prefix('report-builder')->name('report-builder.')->group(function () {
        Route::get('/', [\App\Http\Controllers\ReportBuilderController::class, 'index'])->name('index');
        Route::get('/new', [\App\Http\Controllers\ReportBuilderController::class, 'builder'])->name('new');
        Route::get('/{id}/edit', [\App\Http\Controllers\ReportBuilderController::class, 'builder'])->name('edit');
    });

    // -------------------------------------------------------------------------
    // Import/Export universel (Vague 13 — wizard CSV/XLSX)
    // -------------------------------------------------------------------------
    Route::prefix('import')->name('import.')->group(function () {
        Route::get('/', [\App\Http\Controllers\ImportController::class, 'wizard'])->name('wizard');
        Route::get('/history', [\App\Http\Controllers\ImportController::class, 'history'])->name('history');
    });

    Route::prefix('bi')->name('bi.')->group(function () {
        Route::get('/dashboard', [BiController::class, 'index'])->name('dashboard');
        Route::get('/kpis', [BiController::class, 'kpis'])->name('kpis');
    });

    // -------------------------------------------------------------------------
    // MODULE 10 — Paramètres (Vague 3/10)
    // -------------------------------------------------------------------------
    Route::prefix('parametres')->name('parametres.')->group(function () {
        Route::get('/', [ParametresController::class, 'index'])->name('index');
        Route::put('/organisation', [ParametresController::class, 'updateOrganisation'])->name('organisation.update');

        // Utilisateurs
        Route::get('/utilisateurs', [ParametresController::class, 'utilisateurs'])->name('utilisateurs');
        Route::post('/utilisateurs/invite', [ParametresController::class, 'inviteUtilisateur'])->name('utilisateurs.invite');

        // Rôles & permissions
        Route::get('/roles', [ParametresController::class, 'roles'])->name('roles');
        Route::get('/notifications', [ParametresController::class, 'notifications'])->name('notifications');

        // Langue & région
        Route::get('/langue-region', [ParametresController::class, 'langueRegion'])->name('langue-region');
        Route::put('/langue-region', [ParametresController::class, 'updateLangueRegion'])->name('langue-region.update');

        // Intégrations (Vague 9)
        Route::get('/integrations', [IntegrationController::class, 'marketplace'])->name('integrations');
        Route::post('/integrations/{id}/install', [IntegrationController::class, 'install'])->name('integrations.install');
        Route::delete('/integrations/{id}/uninstall', [IntegrationController::class, 'uninstall'])->name('integrations.uninstall');

        // Webhooks & API
        Route::get('/webhooks', [IntegrationController::class, 'webhooks'])->name('webhooks');
        Route::get('/api-keys', [IntegrationController::class, 'apiKeys'])->name('api-keys');

        // SSO (Vague 10)
        Route::get('/sso', [SsoController::class, 'settings'])->name('sso');
        Route::get('/securite', [ParametresController::class, 'securite'])->name('securite');
    });

    // -------------------------------------------------------------------------
    // MODULE COMPTABILITÉ SYSCOHADA (Vague 6/11)
    // -------------------------------------------------------------------------
    Route::prefix('comptabilite')->name('comptabilite.')->group(function () {
        Route::get('/', [AccountingController::class, 'index'])->name('index');
        Route::get('/generale', [SyscohadaController::class, 'index'])->name('generale');
        Route::get('/journal', [SyscohadaController::class, 'journal'])->name('journal');
        Route::get('/balance', [SyscohadaController::class, 'balance'])->name('balance');
        Route::get('/bilan', [SyscohadaController::class, 'balanceSheet'])->name('bilan');
        Route::get('/compte-resultat', [SyscohadaController::class, 'incomeStatement'])->name('compte-resultat');
        Route::get('/grand-livre', [SyscohadaController::class, 'generalLedger'])->name('grand-livre');
        Route::get('/plan-comptable', [SyscohadaController::class, 'chartOfAccounts'])->name('plan-comptable');
        Route::get('/declarations', [SyscohadaController::class, 'taxDeclarations'])->name('declarations');
    });

    // -------------------------------------------------------------------------
    // MODULE BUDGET (Vague 11)
    // -------------------------------------------------------------------------
    Route::prefix('budget')->name('budget.')->group(function () {
        Route::get('/', [BudgetController::class, 'index'])->name('index');
        Route::get('/dashboard', [BudgetController::class, 'dashboard'])->name('dashboard');
        Route::get('/{id}/ecarts', [BudgetController::class, 'variance'])->name('ecarts');
        Route::get('/{id}/previsions', [BudgetController::class, 'forecast'])->name('previsions');
    });

    // -------------------------------------------------------------------------
    // MODULE ACHATS & PROCUREMENT (Vague 12)
    // -------------------------------------------------------------------------
    Route::prefix('achats')->name('achats.')->group(function () {
        Route::get('/', [ProcurementController::class, 'dashboard'])->name('index');
        Route::get('/demandes', [ProcurementController::class, 'purchaseRequests'])->name('demandes');
        Route::get('/appels-offres', [ProcurementController::class, 'rfqs'])->name('appels-offres');
        Route::get('/commandes', [ProcurementController::class, 'purchaseOrders'])->name('commandes');
        Route::get('/fournisseurs', [ProcurementController::class, 'suppliers'])->name('fournisseurs');
    });

    // -------------------------------------------------------------------------
    // MODULE QUALITÉ (Vague 12)
    // -------------------------------------------------------------------------
    Route::prefix('qualite')->name('qualite.')->group(function () {
        Route::get('/', [QualityController::class, 'dashboard'])->name('index');
        Route::get('/non-conformites', [QualityController::class, 'nonconformities'])->name('non-conformites');
        Route::get('/indicateurs', [QualityController::class, 'indicators'])->name('indicateurs');
        Route::get('/audits', [QualityController::class, 'audits'])->name('audits');
        Route::get('/documents', [QualityController::class, 'documents'])->name('documents');
        Route::get('/reclamations', [QualityController::class, 'complaints'])->name('reclamations');
        Route::get('/cartographie', [QualityController::class, 'processMap'])->name('cartographie');
    });

    // -------------------------------------------------------------------------
    // MODULE FORMATION & E-LEARNING (Vague 7/12)
    // -------------------------------------------------------------------------
    Route::prefix('formation')->name('formation.')->group(function () {
        Route::get('/', [TrainingController::class, 'index'])->name('index');
        Route::get('/catalogue', [TrainingController::class, 'catalog'])->name('catalogue');
        Route::get('/parcours', [TrainingController::class, 'learningPaths'])->name('parcours');
        Route::get('/sessions-live', [TrainingController::class, 'liveSessions'])->name('sessions-live');
        Route::get('/mon-espace', [TrainingController::class, 'mySpace'])->name('mon-espace');
    });

    // -------------------------------------------------------------------------
    // ACADÉMIE IBIG SECRETIS (Section 12.4)
    // -------------------------------------------------------------------------
    Route::prefix('academie')->name('academie.')->group(function () {
        Route::get('/',              [\App\Http\Controllers\AcademyController::class, 'index'])->name('index');
        Route::get('/catalogue',     [\App\Http\Controllers\AcademyController::class, 'catalog'])->name('catalogue');
        Route::get('/mon-espace',    [\App\Http\Controllers\AcademyController::class, 'mySpace'])->name('mon-espace');
        Route::get('/ressources',    [\App\Http\Controllers\AcademyController::class, 'resources'])->name('ressources');
        Route::get('/cours/{slug}',  [\App\Http\Controllers\AcademyController::class, 'course'])->name('cours');
        Route::get('/certificat/{uuid}', [\App\Http\Controllers\AcademyController::class, 'certificate'])->name('certificat');
    });

    // -------------------------------------------------------------------------
    // SIGNATURES ÉLECTRONIQUES (Vague 7)
    // -------------------------------------------------------------------------
    Route::get('/signatures', [SignatureController::class, 'index'])->name('signatures');

    // -------------------------------------------------------------------------
    // AUTOMATISATIONS (Vague 9)
    // -------------------------------------------------------------------------
    Route::get('/automatisations', [AutomationController::class, 'index'])->name('automatisations');

    // -------------------------------------------------------------------------
    // SARA — Assistant IA (Vague 8)
    // -------------------------------------------------------------------------
    Route::get('/sara', [SaraController::class, 'index'])->name('sara');

    // -------------------------------------------------------------------------
    // PORTAIL CLIENT (Vague 7)
    // -------------------------------------------------------------------------
    Route::get('/portail-client', [PortalClientPortalController::class, 'index'])->name('portail-client');

    // -------------------------------------------------------------------------
    // MODULES TRANSVERSAUX
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // RETOUR PAIEMENT EXTERNE (Stripe / CinetPay / Paystack / Mobile Money)
    // -------------------------------------------------------------------------
    Route::get('/payment/success', [PaymentReturnController::class, 'success'])->name('payment.success');
    Route::get('/payment/cancel',  [PaymentReturnController::class, 'cancel'])->name('payment.cancel');

    // -------------------------------------------------------------------------
    // ABONNEMENT (Vague 10/12 — pages Inertia)
    // -------------------------------------------------------------------------
    Route::prefix('abonnement')->name('abonnement.')->group(function () {
        Route::get('/',              [SubscriptionController::class, 'index'])->name('index');
        Route::get('/plans',         [SubscriptionController::class, 'plans'])->name('plans');
        Route::get('/checkout',      [SubscriptionController::class, 'checkout'])->name('checkout');
        Route::get('/commandes/{ref}', [SubscriptionController::class, 'orderStatus'])->name('order-status');
        Route::get('/expiree',       [SubscriptionController::class, 'expired'])->name('expired');
    });

    // -------------------------------------------------------------------------
    // NOTIFICATIONS — Centre + Préférences
    // -------------------------------------------------------------------------
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/',            [NotificationController::class, 'index'])->name('index');
        Route::get('/preferences', [NotificationController::class, 'preferences'])->name('preferences');
    });

    // -------------------------------------------------------------------------
    // JOURNAL D'AUDIT (admin uniquement)
    // -------------------------------------------------------------------------
    Route::get('/audit-log', [AuditLogController::class, 'index'])
        ->name('audit.index')
        ->middleware('can:view.audit_logs');

    Route::get('/profile', [ProfileController::class, 'index'])->name('profile');
    Route::get('/aide', [HelpController::class, 'index'])->name('aide');

    // -------------------------------------------------------------------------
    // GUIDE UTILISATEUR & FAQ
    // -------------------------------------------------------------------------
    Route::prefix('guide')->name('guide.')->group(function () {
        Route::get('/', [GuideController::class, 'index'])->name('index');
        Route::get('/{section:slug}', [GuideController::class, 'section'])->name('section');
        Route::get('/{section:slug}/{article:slug}', [GuideController::class, 'article'])->name('article');
    });
    Route::get('/faq', [FaqController::class, 'index'])->name('faq.index');
    Route::get('/api/faq', [FaqController::class, 'apiIndex'])->name('api.faq.index');

    // -------------------------------------------------------------------------
    // SUPPORT TICKETS (authentifié, scoped par org)
    // -------------------------------------------------------------------------
    Route::prefix('support/tickets')->name('support.tickets.')->group(function () {
        Route::get('/', [SupportTicketController::class, 'index'])->name('index');
        Route::get('/create', [SupportTicketController::class, 'create'])->name('create');
        Route::post('/', [SupportTicketController::class, 'store'])->name('store');
        Route::get('/{ticket}', [SupportTicketController::class, 'show'])->name('show');
        Route::post('/{ticket}/message', [SupportTicketController::class, 'addMessage'])->name('message');
        Route::post('/{ticket}/close', [SupportTicketController::class, 'close'])->name('close');
        Route::post('/{ticket}/rate', [SupportTicketController::class, 'rate'])->name('rate');
    });

    // -------------------------------------------------------------------------
    // SUPERADMIN — Espace administration centrale IBIG Soft
    // -------------------------------------------------------------------------
    Route::prefix('superadmin')->name('superadmin.')->middleware(['role:super_admin'])->group(function () {

        Route::get('/', [SuperAdminDashboardController::class, 'index'])->name('dashboard');

        // Organisations / Tenants
        Route::get('/organisations', [SuperAdminOrganizationController::class, 'index'])->name('organisations');
        Route::get('/organisations/{id}', [SuperAdminOrganizationController::class, 'show'])->name('organisations.show');
        Route::post('/organisations', [SuperAdminOrganizationController::class, 'store'])->name('organisations.store');
        Route::put('/organisations/{id}', [SuperAdminOrganizationController::class, 'update'])->name('organisations.update');
        Route::delete('/organisations/{id}', [SuperAdminOrganizationController::class, 'destroy'])->name('organisations.destroy');
        Route::post('/organisations/{id}/activate', [SuperAdminOrganizationController::class, 'activate'])->name('organisations.activate');
        Route::post('/organisations/{id}/deactivate', [SuperAdminOrganizationController::class, 'deactivate'])->name('organisations.deactivate');
        Route::post('/organisations/{id}/impersonate', [SuperAdminOrganizationController::class, 'impersonate'])->name('organisations.impersonate');
        Route::put('/organisations/{id}/license', [SuperAdminOrganizationController::class, 'updateLicense'])->name('organisations.license.update');
        Route::post('/organisations/{id}/suspend', [SuperAdminOrganizationController::class, 'suspend'])->name('organisations.suspend');
        Route::post('/organisations/{id}/revoke', [SuperAdminOrganizationController::class, 'revoke'])->name('organisations.revoke');
        Route::post('/organisations/{id}/grant-grace', [SuperAdminOrganizationController::class, 'grantGrace'])->name('organisations.grace');
        Route::post('/organisations/{id}/extend', [SuperAdminOrganizationController::class, 'extend'])->name('organisations.extend');
        Route::post('/organisations/{id}/extend-trial', [SuperAdminOrganizationController::class, 'extendTrial'])->name('organisations.extend-trial');
        Route::post('/organisations/{id}/send-message', [SuperAdminOrganizationController::class, 'sendMessage'])->name('organisations.send-message');
        Route::post('/organisations/{id}/reset-mfa', [SuperAdminOrganizationController::class, 'resetMfa'])->name('organisations.reset-mfa');
        Route::get('/organisations/{id}/export-data', [SuperAdminOrganizationController::class, 'exportData'])->name('organisations.export-data');
        Route::post('/organisations/{id}/send-trial-reminder', [SuperAdminOrganizationController::class, 'sendTrialReminder'])->name('organisations.trial-reminder');
        Route::get('/trials', [SuperAdminOrganizationController::class, 'trials'])->name('trials');

        // SaaS Metrics (Vague 10)
        Route::prefix('saas')->name('saas.')->group(function () {
            Route::get('/dashboard', [SaasMetricsController::class, 'dashboard'])->name('dashboard');
            Route::get('/mrr', [SaasMetricsController::class, 'mrr'])->name('mrr');
            Route::get('/cohortes', [SaasMetricsController::class, 'cohorts'])->name('cohortes');
            Route::get('/health', [SaasMetricsController::class, 'health'])->name('health');
        });

        // Métriques SaaS consolidées (Vague 8 finale)
        Route::prefix('metrics')->name('metrics.')->group(function () {
            Route::get('/', [MetricsController::class, 'index'])->name('index');
            Route::get('/export', [MetricsController::class, 'export'])->name('export');
        });

        // Plans tarifaires (Vague 8 finale)
        Route::prefix('plans')->name('plans.')->group(function () {
            Route::get('/', [PlansController::class, 'index'])->name('index');
            Route::get('/{plan}/edit', [PlansController::class, 'edit'])->name('edit');
            Route::put('/{plan}', [PlansController::class, 'update'])->name('update');
            Route::post('/{plan}/toggle', [PlansController::class, 'toggle'])->name('toggle');
        });

        // CRM SuperAdmin (Vague 10 + 12)
        Route::prefix('crm')->name('crm.')->group(function () {
            // Anciens endpoints
            Route::get('/pipeline', [SuperAdminCrmController::class, 'pipeline'])->name('pipeline');
            Route::get('/contacts', [SuperAdminCrmController::class, 'contacts'])->name('contacts');
            Route::get('/analytics', [SuperAdminCrmController::class, 'analytics'])->name('analytics');

            // Prospects
            Route::get('/prospects', [CrmProspectsController::class, 'prospects'])->name('prospects');
            Route::get('/prospects/create', fn () => \Inertia\Inertia::render('SuperAdmin/Crm/Prospects/Create'))->name('prospects.create');
            Route::post('/prospects', [CrmProspectsController::class, 'storeProspect'])->name('prospects.store');
            Route::get('/prospects/{id}', [CrmProspectsController::class, 'showProspect'])->name('prospects.show');
            Route::put('/prospects/{id}', [CrmProspectsController::class, 'updateProspect'])->name('prospects.update');
            Route::post('/prospects/{id}/move-stage', [CrmProspectsController::class, 'moveStage'])->name('prospects.move-stage');
            Route::post('/prospects/{id}/convert-to-trial', [CrmProspectsController::class, 'convertToTrial'])->name('prospects.convert');
            Route::post('/prospects/{id}/interactions', [CrmProspectsController::class, 'logInteraction'])->name('prospects.interactions');

            // Démonstrations
            Route::get('/demonstrations', [CrmProspectsController::class, 'demonstrations'])->name('demonstrations');
            Route::post('/demonstrations', [CrmProspectsController::class, 'scheduleDemo'])->name('demonstrations.store');
            Route::post('/demonstrations/{id}/confirm', [CrmProspectsController::class, 'confirmDemo'])->name('demonstrations.confirm');
            Route::post('/demonstrations/{id}/send-reminder', [CrmProspectsController::class, 'sendDemoReminder'])->name('demonstrations.reminder');
            Route::post('/demonstrations/{id}/notes', [CrmProspectsController::class, 'recordDemoNotes'])->name('demonstrations.notes');

            // Offres
            Route::get('/offers', [CrmProspectsController::class, 'offers'])->name('offers');
            Route::get('/offers/create', fn () => \Inertia\Inertia::render('SuperAdmin/Crm/Offers/Create'))->name('offers.create');
            Route::post('/offers', [CrmProspectsController::class, 'createOffer'])->name('offers.store');
            Route::post('/offers/{id}/send', [CrmProspectsController::class, 'sendOffer'])->name('offers.send');
            Route::get('/offers/{id}/pdf', [CrmProspectsController::class, 'generateOfferPdf'])->name('offers.pdf');
            Route::post('/offers/{id}/duplicate', [CrmProspectsController::class, 'duplicateOffer'])->name('offers.duplicate');

            // Campagnes
            Route::get('/campaigns', [CrmProspectsController::class, 'campaigns'])->name('campaigns');
            Route::post('/campaigns', [CrmProspectsController::class, 'createCampaign'])->name('campaigns.store');
            Route::post('/campaigns/{id}/send', [CrmProspectsController::class, 'sendCampaign'])->name('campaigns.send');
        });

        // Routes plateforme
        Route::prefix('support')->name('support.')->group(function () {
            Route::get('/tickets', [SuperAdminSupportController::class, 'index'])->name('tickets');
            Route::get('/tickets/{ticket}', [SuperAdminSupportController::class, 'showInertia'])->name('tickets.show');
            Route::post('/tickets/{ticket}/reply', [SuperAdminSupportController::class, 'reply'])->name('tickets.reply');
            Route::post('/tickets/{ticket}/message', [SuperAdminSupportController::class, 'message'])->name('tickets.message');
            Route::patch('/tickets/{ticket}/status', [SuperAdminSupportController::class, 'updateStatus'])->name('tickets.status');
            Route::patch('/tickets/{ticket}', [SuperAdminSupportController::class, 'update'])->name('tickets.update');
            Route::post('/tickets/{ticket}/assign', [SuperAdminSupportController::class, 'assign'])->name('tickets.assign');
        });

        Route::get('/announcements', fn () => \Inertia\Inertia::render('SuperAdmin/Platform/Announcements'))->name('announcements');
        Route::post('/announcements', [SuperAdminAnnouncementController::class, 'store'])->name('announcements.store');
        Route::put('/announcements/{id}', [SuperAdminAnnouncementController::class, 'update'])->name('announcements.update');
        Route::patch('/announcements/{id}', [SuperAdminAnnouncementController::class, 'patch'])->name('announcements.patch');
        Route::delete('/announcements/{id}', [SuperAdminAnnouncementController::class, 'destroy'])->name('announcements.destroy');

        Route::get('/feature-flags', fn () => \Inertia\Inertia::render('SuperAdmin/Platform/FeatureFlags'))->name('feature-flags');
        Route::put('/feature-flags/{id}', [FeatureFlagController::class, 'update'])->name('feature-flags.update');

        Route::get('/settings', fn () => \Inertia\Inertia::render('SuperAdmin/Settings/EditorConfig'))->name('settings');
        Route::put('/settings/{section}', [\App\Http\Controllers\SuperAdmin\SystemController::class, 'updateSettings'])->name('settings.update');
        Route::post('/settings/smtp/test', [\App\Http\Controllers\SuperAdmin\SystemController::class, 'testSmtp'])->name('settings.smtp.test');

        // Support & Feature Flags
        Route::get('/support', [SuperAdminSupportController::class, 'index'])->name('support');
        Route::get('/feature-flags', [FeatureFlagController::class, 'index'])->name('feature-flags');
        Route::get('/annonces', [SuperAdminAnnouncementController::class, 'index'])->name('annonces');
        Route::get('/monitoring', [SaasMetricsController::class, 'monitoring'])->name('monitoring');

        // Licences
        Route::get('/licences', [SuperAdminLicenseController::class, 'index'])->name('licences');
        Route::get('/licences/{id}', [SuperAdminLicenseController::class, 'show'])->name('licences.show');
        Route::post('/licences', [SuperAdminLicenseController::class, 'store'])->name('licences.store');
        Route::put('/licences/{id}', [SuperAdminLicenseController::class, 'update'])->name('licences.update');
        Route::delete('/licences/{id}', [SuperAdminLicenseController::class, 'destroy'])->name('licences.destroy');
        Route::post('/licences/{id}/extend', [SuperAdminLicenseController::class, 'extend'])->name('licences.extend');
        Route::post('/licences/{id}/regenerate', [SuperAdminLicenseController::class, 'regenerate'])->name('licences.regenerate');

        // Paiements SuperAdmin — page de gestion des paiements
        Route::get('/paiements', fn () => \Inertia\Inertia::render('SuperAdmin/Payments'))->name('paiements');

        // Licences — clés de licence (alias vers /licences)
        Route::redirect('/licences/cles', '/superadmin/licences', 302)->name('licences.cles');

        // Rapports SuperAdmin — métriques consolidées
        Route::get('/rapports', [\App\Http\Controllers\SuperAdmin\MetricsController::class, 'index'])->name('rapports');

        // Configuration SuperAdmin — alias vers /settings
        Route::redirect('/configuration', '/superadmin/settings', 302)->name('configuration');

        // Utilisateurs SuperAdmin — redirige vers la gestion des organisations
        Route::redirect('/utilisateurs', '/superadmin/organisations', 301)->name('superadmin.utilisateurs');
    });
});

// ─── SARA Chat ────────────────────────────────────────────────────────────────
Route::middleware('auth')->prefix('sara')->name('sara.')->group(function () {
    Route::get('/chat', [\App\Http\Controllers\SaraChatController::class, 'chatPage'])->name('chat');
});

// ─── Cas pratiques ────────────────────────────────────────────────────────────
Route::middleware('auth')->prefix('aide/cas-pratiques')->name('practical-cases.')->group(function () {
    Route::get('/', [\App\Http\Controllers\PracticalCasesController::class, 'index'])->name('index');
    Route::get('/{practicalCase:slug}', [\App\Http\Controllers\PracticalCasesController::class, 'show'])->name('show');
});

// ─── IBIG PARTNERS — Programme partenaires ────────────────────────────────────

// Public — Inscription partenaire (accessible sans compte)
Route::get('/partenaires/rejoindre', [\App\Http\Controllers\PartnerController::class, 'register'])->name('partner.register');
Route::post('/partenaires/candidature', [\App\Http\Controllers\PartnerController::class, 'store'])->name('partner.store');

// Partenaire authentifié — Espace partenaire
Route::middleware('auth')->prefix('partenaire')->name('partner.')->group(function () {
    Route::get('/dashboard', [\App\Http\Controllers\PartnerController::class, 'dashboard'])->name('dashboard');
    Route::get('/clients', [\App\Http\Controllers\PartnerController::class, 'clients'])->name('clients');
    Route::get('/commissions', [\App\Http\Controllers\PartnerController::class, 'commissionsIndex'])->name('commissions');
});

// SuperAdmin — Gestion des partenaires
Route::middleware(['auth', 'role:super-admin'])
    ->prefix('superadmin/partenaires')
    ->name('superadmin.partners.')
    ->group(function () {
        Route::get('/', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'index'])->name('index');
        Route::get('/commissions', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'commissions'])->name('commissions');
        Route::get('/stats', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'stats'])->name('stats');
        Route::get('/{partner}', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'show'])->name('show');
        Route::post('/{partner}/approve', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'approve'])->name('approve');
        Route::post('/{partner}/suspend', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'suspend'])->name('suspend');
        Route::post('/commissions/{commission}/pay', [\App\Http\Controllers\SuperAdmin\PartnersController::class, 'payCommission'])->name('commission.pay');
    });


// Page licence expirée (cible du middleware CheckLicense)
Route::middleware(['auth'])->get('/subscription/expired', function () {
    return \Inertia\Inertia::render('Subscription/Expired');
})->name('subscription.expired');

Route::get('/account/suspended', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'account.suspended']);
})->name('account.suspended');

Route::get('/license/expired', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'license.expired']);
})->name('license.expired');

Route::get('/license/renew', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'license.renew']);
})->name('license.renew');

Route::get('/onboarding/index', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'onboarding.index']);
})->name('onboarding.index');

Route::get('/organization', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'organization']);
})->name('organization');

Route::get('/subscription/upgrade', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'subscription.upgrade']);
})->name('subscription.upgrade');

Route::get('/support/contact', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'support.contact']);
})->name('support.contact');

Route::get('/tenant/not-found', function () {
    return \Inertia\Inertia::render('Errors/Generic', ['code' => 'tenant.not-found']);
})->name('tenant.not-found');


// ── Pages publiques : légales + démonstration (landing) ──
Route::get('/mentions-legales',  [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'mentions-legales');
Route::get('/cgu',               [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'cgu');
Route::get('/confidentialite',   [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'confidentialite');
Route::get('/cookies',           [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'cookies');
Route::get('/contrat-licence',   [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'contrat-licence');
Route::get('/conditions-commerciales',       [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'conditions-commerciales');
Route::get('/politique-sauvegarde',          [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'politique-sauvegarde');
Route::get('/politique-support',             [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'politique-support');
Route::get('/politique-resiliation',         [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'politique-resiliation');
Route::get('/politique-remboursement',       [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'politique-remboursement');
Route::get('/traitement-donnees',            [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'traitement-donnees');
Route::get('/propriete-intellectuelle',      [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'propriete-intellectuelle');
Route::get('/protection-marque',             [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'protection-marque');
Route::get('/conditions-essai',              [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'conditions-essai');
Route::get('/conditions-sara',               [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'conditions-sara');
Route::get('/limitation-responsabilite-ia',  [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'limitation-responsabilite-ia');
Route::get('/gestion-compte',                [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'gestion-compte');
Route::get('/gestion-reclamations',          [\App\Http\Controllers\LegalPagesController::class, 'show'])->defaults('slug', 'gestion-reclamations');
Route::get('/demander-demonstration',  [\App\Http\Controllers\LegalPagesController::class, 'demoForm']);
Route::post('/demander-demonstration', [\App\Http\Controllers\LegalPagesController::class, 'demoSubmit']);
Route::get('/aide/tickets', fn () => redirect('/aide'));


// Inscription publique (essai gratuit 14 jours)
Route::post('/register', [\App\Http\Controllers\Auth\AuthController::class, 'register'])
    ->middleware(['guest', 'throttle:10,1'])->name('register.store');


// ── Flux mot de passe (alias FR + endpoints POST) ──
Route::middleware('guest')->group(function () {
    Route::get('/mot-de-passe-oublie', [\App\Http\Controllers\Auth\AuthController::class, 'showForgotPassword']);
    Route::get('/reinitialiser-mot-de-passe/{token}', [\App\Http\Controllers\Auth\AuthController::class, 'showResetPassword']);
    Route::post('/forgot-password', [\App\Http\Controllers\Auth\AuthController::class, 'forgotPassword'])
        ->middleware('throttle:10,1')->name('password.email');
    Route::post('/reset-password', [\App\Http\Controllers\Auth\AuthController::class, 'resetPassword'])
        ->middleware('throttle:10,1')->name('password.update');
});
