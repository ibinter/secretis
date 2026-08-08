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
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CourrierController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentWorkflowController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FleetController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\HelpCenterController;
use App\Http\Controllers\Support\TicketController as SupportTicketController;
use App\Http\Controllers\HrController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LicenseController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\GdprController;
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


// ─── QR Code — Page de vérification publique (sans authentification) ─────────
Route::get('/verify/{token}', [\App\Http\Controllers\QrVerifyController::class, 'verify'])
    ->name("qr.verify");

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

    // Accès public à un document via lien de partage (nom requis par DocumentController@share).
    // Ce nom n'était déclaré que dans routes/api/courrier.php, fichier JAMAIS chargé par
    // bootstrap/app.php → route('documents.shared') levait une RouteNotFoundException (500)
    // à chaque clic sur « Partager ».
    Route::get('/ged/shared/{token}', function (string $token) {
        $shareRecord = \Illuminate\Support\Facades\DB::table('document_share_tokens')
            ->where('token', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->first();

        abort_unless($shareRecord, 404, 'Lien invalide ou expiré.');

        $document = \App\Models\Document::findOrFail($shareRecord->document_id);

        // Seuls les documents non « top secret » sont accessibles par lien.
        abort_if($document->access_level === 'top_secret', 403, 'Ce document ne peut pas être partagé via lien.');

        \Illuminate\Support\Facades\Log::info('Document partagé accédé', [
            'document_id' => $document->id,
            'ip'          => request()->ip(),
        ]);

        if (config('filesystems.disks.private.driver') === 's3') {
            return redirect(\Illuminate\Support\Facades\Storage::disk('private')
                ->temporaryUrl($document->file_path, now()->addMinutes(15)));
        }

        return \Illuminate\Support\Facades\Storage::disk('private')->download(
            $document->file_path,
            $document->title . '.' . pathinfo($document->file_path, PATHINFO_EXTENSION),
        );
    })->name('documents.shared');

    // Vérification publique d'un badge visiteur par QR code (poste de garde).
    // Le nom `visits.scan` est exigé par VisitorService::generateBadge().
    Route::get('/visites/scan/{id}', [VisitorController::class, 'scanBadge'])
        ->whereNumber('id')->name('visits.scan');

    // Portail visiteur public — prise de RDV en ligne (pages Inertia)
    Route::get('/rdv/confirmation/{token}', [\App\Http\Controllers\AppointmentController::class, 'confirmationPage'])->name('rdv.confirmation');
    Route::get('/rdv/{slug}', [\App\Http\Controllers\AppointmentController::class, 'portalPage'])->name('rdv.portal');

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
    // `showPublic` / `processPublic` n'ont JAMAIS existé sur le contrôleur : la
    // page publique de signature répondait donc par une erreur. Le nom
    // `signatures.sign` est par ailleurs celui qu'attend `SignatureService`
    // pour composer le lien envoyé au signataire par email.
    Route::get('/sign/{token}', [SignatureController::class, 'signPage'])->name('signatures.sign');
    Route::post('/sign/{token}', [SignatureController::class, 'submitSignature'])->name('signatures.sign.submit');
    Route::post('/sign/{token}/refuser', [SignatureController::class, 'declineSignature'])->name('signatures.sign.decline');
    Route::get('/sign/{token}/document', [SignatureController::class, 'signDocument'])->name('signatures.sign.document');

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
        Route::get('/create', [CourrierController::class, 'create'])->name('create');
        Route::get('/{id}', [CourrierController::class, 'show'])->name('show');
        Route::get('/{id}/edit', [CourrierController::class, 'edit'])->name('edit');
        Route::put('/{id}', [CourrierController::class, 'update'])->name('update');
        Route::delete('/{id}', [CourrierController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/assign', [CourrierController::class, 'assign'])->name('assign');
        Route::post('/{id}/reply', [CourrierController::class, 'reply'])->name('reply');

        // ── Parapheur : le visa, pièce manquante du parcours ────────────────
        // « parapheur » AVANT « {id} », sinon il est capturé comme identifiant.
        Route::get('/parapheur', [CourrierController::class, 'parapheur'])->name('parapheur');
        Route::post('/parapheur/{etape}/decision', [CourrierController::class, 'deciderVisa'])->whereNumber('etape')->name('parapheur.decision');
        Route::post('/{id}/parapheur', [CourrierController::class, 'soumettreAuVisa'])->name('parapheur.soumettre');
        Route::post('/{id}/archive', [CourrierController::class, 'archive'])->name('archive');
        Route::post('/{id}/status', [CourrierController::class, 'changeStatus'])->name('status');
    });

    // QR code API (auth)
    Route::get('/ged/documents/{id}/qr', [\App\Http\Controllers\QrVerifyController::class, 'documentQr'])->name('qr.document');
    Route::get('/courrier/{id}/qr', [\App\Http\Controllers\QrVerifyController::class, 'courrierQr'])->name('qr.courrier');

    Route::prefix('ged')->name('ged.')->group(function () {

        // ── Modèles de lettres ──────────────────────────────────────────────
        // La table `document_templates` était migrée depuis longtemps sans une
        // ligne de code en face : le secrétariat repartait d'une page blanche
        // pour chaque convocation, attestation ou note de service.
        Route::prefix('modeles')->name('modeles.')->group(function () {
            Route::get('/', [\App\Http\Controllers\DocumentTemplateController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\DocumentTemplateController::class, 'store'])->name('store');
            Route::get('/{id}', [\App\Http\Controllers\DocumentTemplateController::class, 'show'])->whereNumber('id')->name('show');
            Route::put('/{id}', [\App\Http\Controllers\DocumentTemplateController::class, 'update'])->whereNumber('id')->name('update');
            Route::delete('/{id}', [\App\Http\Controllers\DocumentTemplateController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/fusionner', [\App\Http\Controllers\DocumentTemplateController::class, 'fusionner'])->whereNumber('id')->name('fusionner');
        });
        Route::get('/', [DocumentController::class, 'index'])->name('index');
        Route::get('/upload', [DocumentController::class, 'index'])->name('upload.form');
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
            // Téléchargement d'une VERSION précise (le bouton renvoyait le fichier courant).
            Route::get('/{id}/versions/{versionId}/download', [DocumentController::class, 'downloadVersion'])
                ->name('versions.download');
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
        Route::get('/create', [MeetingController::class, 'create'])->name('create');
        Route::post('/', [MeetingController::class, 'store'])->name('store');
        Route::get('/{id}', [MeetingController::class, 'show'])->name('show');
        Route::put('/{id}', [MeetingController::class, 'update'])->name('update');
        Route::delete('/{id}', [MeetingController::class, 'destroy'])->name('destroy');

        // Actions de cycle de vie
        Route::post('/{id}/start', [MeetingController::class, 'startMeeting'])->name('start');
        Route::post('/{id}/end', [MeetingController::class, 'endMeeting'])->name('end');

        // Ordre du jour
        Route::post('/{id}/agenda', [MeetingController::class, 'addAgendaItem'])->name('agenda.add');

        // Compte rendu / PV
        Route::get('/{id}/compte-rendu', [MeetingController::class, 'showMinutes'])->name('compte-rendu.show');
        Route::post('/{id}/minutes', [MeetingController::class, 'saveMinutes'])->name('minutes.save');
        Route::post('/{id}/minutes/approve', [MeetingController::class, 'approveMinutes'])->name('minutes.approve');
        Route::get('/{id}/minutes/download', [MeetingController::class, 'downloadMinutes'])->name('minutes.download');

        // Décisions
        Route::post('/{id}/decisions/extract', [MeetingController::class, 'extractDecisions'])->name('decisions.extract');
        Route::post('/{id}/decisions/{decisionId}/to-task', [MeetingController::class, 'decisionToTask'])->name('decisions.to-task');

        // Convocations
        Route::get('/{id}/convocations', [MeetingController::class, 'convocations'])->name('convocations');
        Route::post('/{id}/convocations/send', [MeetingController::class, 'sendConvocations'])->name('convocations.send');

        // Tâches depuis réunion
        Route::post('/{id}/tasks', [TaskController::class, 'createFromMeeting'])->name('tasks.create');
    });

    // -------------------------------------------------------------------------
    // MODULE 4 — Tâches & Projets (Vague 4)
    // -------------------------------------------------------------------------
    Route::prefix('taches')->name('taches.')->group(function () {
        Route::get('/', [TaskController::class, 'index'])->name('index');
        Route::get('/kanban', [TaskController::class, 'kanban'])->name('kanban');
        Route::post('/reorder', [TaskController::class, 'reorder'])->name('reorder');
        Route::post('/', [TaskController::class, 'store'])->name('store');
        Route::get('/{id}', [TaskController::class, 'show'])->name('show');
        Route::put('/{id}', [TaskController::class, 'update'])->name('update');
        Route::delete('/{id}', [TaskController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/status', [TaskController::class, 'changeStatus'])->name('status');
        Route::post('/{id}/complete', [TaskController::class, 'complete'])->name('complete');
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
        Route::get('/', [CircularController::class, 'indexPage'])->name('index');
        Route::post('/', [CircularController::class, 'store'])->name('store');
        Route::get('/{id}', [CircularController::class, 'show'])->name('show');
        Route::put('/{id}', [CircularController::class, 'update'])->name('update');
        Route::delete('/{id}', [CircularController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/acknowledge', [CircularController::class, 'acknowledge'])->name('acknowledge');
    });

    Route::get('/annuaire', [ContactController::class, 'index'])->name('annuaire');
    Route::redirect('/contacts', '/annuaire', 301);
    Route::redirect('/visiteurs', '/reception', 301);
    Route::get('/tableau-affichage', [AnnouncementController::class, 'board'])->name('tableau-affichage');
    Route::post('/tableau-affichage/{id}/dismiss', [AnnouncementController::class, 'dismiss'])->name('tableau-affichage.dismiss');

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
        // Exports et incidents (les boutons existaient sans route côté serveur).
        Route::get('/reports/pdf', [VisitorController::class, 'reportPdf'])->name('reports.pdf');
        Route::get('/log/export', [VisitorController::class, 'exportLog'])->name('log.export');
        Route::post('/visites/{visit}/incident', [VisitorController::class, 'reportIncident'])->name('visites.incident');
        Route::get('/rendez-vous', [\App\Http\Controllers\AppointmentController::class, 'adminPage'])->name('rendez-vous');
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

    // Actions du module Ressources — noms `resources.*` attendus par les pages
    // Pages/Ressources/{Salles,Materiel,Fournitures,Vehicules}/Index.jsx.
    // Sans eux, route('resources.…') lève une exception Ziggy (action morte au clic).
    // URI distinctes de /ressources : deux routes de même URI+méthode s'écrasent.
    Route::prefix('resources')->name('resources.')->group(function () {
        // Salles
        Route::get   ('/salles',                        [ResourceController::class, 'roomsIndex'])->name('salles.index');
        Route::post  ('/salles',                        [ResourceController::class, 'roomsStore'])->name('salles.store');
        Route::get   ('/salles/{room}',                 [ResourceController::class, 'roomsShow'])->name('salles.show');
        Route::put   ('/salles/{room}',                 [ResourceController::class, 'roomsUpdate'])->name('salles.update');
        Route::delete('/salles/{room}',                 [ResourceController::class, 'roomsDestroy'])->name('salles.destroy');
        Route::get   ('/salles/{room}/disponibilite',   [ResourceController::class, 'checkAvailability'])->name('salles.availability');
        Route::get   ('/salles/{room}/planning',        [ResourceController::class, 'getSchedule'])->name('salles.schedule');

        // Matériel
        Route::get   ('/materiel',                      [ResourceController::class, 'equipmentIndex'])->name('materiel.index');
        Route::post  ('/materiel',                      [ResourceController::class, 'equipmentStore'])->name('materiel.store');
        Route::get   ('/materiel/{equipment}',          [ResourceController::class, 'equipmentShow'])->name('materiel.show');
        Route::put   ('/materiel/{equipment}',          [ResourceController::class, 'equipmentUpdate'])->name('materiel.update');
        Route::post  ('/materiel/{equipment}/affecter', [ResourceController::class, 'assignEquipment'])->name('materiel.assign');
        Route::post  ('/materiel/{equipment}/maintenance', [ResourceController::class, 'requestMaintenance'])->name('materiel.maintenance');

        // Fournitures (export AVANT {supply} pour ne pas être capturé)
        Route::get   ('/fournitures',                   [ResourceController::class, 'suppliesIndex'])->name('fournitures.index');
        Route::get   ('/fournitures/export',            [ResourceController::class, 'suppliesExport'])->name('fournitures.export');
        Route::post  ('/fournitures',                   [ResourceController::class, 'suppliesStore'])->name('fournitures.store');
        Route::get   ('/fournitures/{supply}',          [ResourceController::class, 'suppliesShow'])->name('fournitures.show');
        Route::put   ('/fournitures/{supply}',          [ResourceController::class, 'suppliesUpdate'])->name('fournitures.update');
        Route::post  ('/fournitures/{supply}/mouvement',[ResourceController::class, 'addMovement'])->name('fournitures.movement');

        // Véhicules
        Route::get   ('/vehicules',                     [ResourceController::class, 'vehiclesIndex'])->name('vehicules.index');
        Route::post  ('/vehicules',                     [ResourceController::class, 'vehiclesStore'])->name('vehicules.store');
        Route::get   ('/vehicules/{vehicle}',           [ResourceController::class, 'vehiclesShow'])->name('vehicules.show');
        Route::put   ('/vehicules/{vehicle}',           [ResourceController::class, 'vehiclesUpdate'])->name('vehicules.update');
        Route::post  ('/vehicules/demandes',            [ResourceController::class, 'requestVehicle'])->name('vehicules.requests.store');
        Route::post  ('/vehicules/{vehicle}/carnet',    [ResourceController::class, 'storeVehicleLog'])->name('vehicules.requests.log');
    });

    // Flotte & GPS (Vague 5/9)
    Route::prefix('fleet')->name('fleet.')->group(function () {
        Route::get('/', [FleetController::class, 'index'])->name('index');
        Route::get('/map', [FleetController::class, 'mapView'])->name('map');
        Route::get('/vehicles/{id}', [FleetController::class, 'vehicleDetail'])->name('vehicles.show');
        Route::post('/vehicles', [FleetController::class, 'storeVehicle'])->name('vehicles.store');
        Route::put('/vehicles/{id}', [FleetController::class, 'updateVehicle'])->name('vehicles.update');
        Route::delete('/vehicles/{id}', [FleetController::class, 'destroyVehicle'])->name('vehicles.destroy');
        Route::get('/maintenance', [FleetController::class, 'maintenancePlanning'])->name('maintenance');
        Route::get('/carburant', [FleetController::class, 'fuelManagement'])->name('carburant');
        Route::get('/rapport', [FleetController::class, 'fleetReport'])->name('rapport');
        Route::get('/geofences', [FleetController::class, 'geofenceManager'])->name('geofences');
        Route::get('/carnet-de-bord', [FleetController::class, 'tripLogger'])->name('carnet-de-bord');
    });

    // -------------------------------------------------------------------------
    // MODULE 8 — Ressources Humaines Légère (Vague 4/8)
    // -------------------------------------------------------------------------
    Route::prefix('rh')->name('rh.')->group(function () {

        // ── Paie ────────────────────────────────────────────────────────────
        // Le référentiel des TAUX relève d'IBIG (matière légale, commune à un
        // pays) : il vit sous /superadmin/paie. Ici, la RH l'exploite pour son
        // propre effectif.
        Route::prefix('paie')->name('paie.')->group(function () {
            Route::get('/', [\App\Http\Controllers\PayrollController::class, 'index'])->name('index');
            Route::post('/periodes', [\App\Http\Controllers\PayrollController::class, 'ouvrirPeriode'])->name('periodes.store');
            Route::get('/periodes/{id}', [\App\Http\Controllers\PayrollController::class, 'periode'])->whereNumber('id')->name('periode');
            Route::post('/periodes/{id}/calculer', [\App\Http\Controllers\PayrollController::class, 'calculer'])->whereNumber('id')->name('periodes.calculer');
            Route::post('/periodes/{id}/cloturer', [\App\Http\Controllers\PayrollController::class, 'cloturer'])->whereNumber('id')->name('periodes.cloturer');
            Route::get('/bulletins/{id}', [\App\Http\Controllers\PayrollController::class, 'bulletin'])->whereNumber('id')->name('bulletin');
            Route::get('/bulletins/{id}/pdf', [\App\Http\Controllers\PayrollController::class, 'bulletinPdf'])->whereNumber('id')->name('bulletin.pdf');
            Route::post('/rubriques', [\App\Http\Controllers\PayrollController::class, 'storeRubrique'])->name('rubriques.store');
            Route::delete('/rubriques/{id}', [\App\Http\Controllers\PayrollController::class, 'destroyRubrique'])->whereNumber('id')->name('rubriques.destroy');
            Route::post('/taux-employeur', [\App\Http\Controllers\PayrollController::class, 'storeTauxEmployeur'])->name('taux-employeur.store');
        });
        Route::get('/', [HrController::class, 'dashboard'])->name('index');
        Route::get('/personnel', [HrController::class, 'index'])->name('personnel.index');
        Route::get('/personnel/{employee}', [EmployeeController::class, 'show'])->name('personnel.show')->whereNumber('employee');

        // Alias rh.employes.* — noms attendus par le frontend (RH/Employes/*.jsx, Components/RH/OrgChart).
        // Sans eux, route('rh.employes.show') lève une exception Ziggy => page blanche sur /rh/personnel.
        Route::prefix('personnel')->name('employes.')->group(function () {
            Route::get('/',                   [HrController::class, 'index'])->name('index');
            // Écrans de création/édition (les boutons pointaient vers des routes POST en GET).
            // Déclarés AVANT /{employee} pour ne pas être capturés.
            Route::get('/creer',              [EmployeeController::class, 'create'])->name('create');
            Route::get('/{employee}/modifier',[EmployeeController::class, 'edit'])->name('edit')->whereNumber('employee');
            Route::post('/',                  [EmployeeController::class, 'store'])->name('store');
            Route::post('/import-csv',        [EmployeeController::class, 'importCsv'])->name('import-csv');
            Route::get('/{employee}',         [EmployeeController::class, 'show'])->name('show')->whereNumber('employee');
            Route::put('/{employee}',         [EmployeeController::class, 'update'])->name('update')->whereNumber('employee');
            Route::delete('/{employee}',      [EmployeeController::class, 'destroy'])->name('destroy')->whereNumber('employee');
        });

        // Alias rh.frais.* vers les notes de frais (attendus par RH/Employes/Fiche.jsx).
        // URI distinctes de /notes-de-frais : deux routes de même URI+méthode s'écrasent
        // et le nom déclaré en premier serait perdu.
        Route::prefix('frais')->name('frais.')->group(function () {
            Route::get('/',      [ExpenseController::class, 'index'])->name('index');
            Route::post('/',     [ExpenseController::class, 'store'])->name('store');
            Route::get('/{id}',  [ExpenseController::class, 'show'])->name('show');
        });
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
            // La méthode existait sans route : le bouton « Soumettre » échouait.
            Route::post('/{expense}/submit', [ExpenseController::class, 'submit'])->name('submit');
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
    // -------------------------------------------------------------------------
    // MODULE UTILISATEURS
    // -------------------------------------------------------------------------
    Route::prefix('utilisateurs')->name('users.')->group(function () {
        Route::get('/',                [\App\Http\Controllers\UserController::class, 'index'])->name('index');
        Route::get('/creer',           [\App\Http\Controllers\UserController::class, 'create'])->name('create');
        Route::post('/',               [\App\Http\Controllers\UserController::class, 'store'])->name('store');
        Route::get('/{user}',          [\App\Http\Controllers\UserController::class, 'show'])->name('show');
        Route::get('/{user}/modifier', [\App\Http\Controllers\UserController::class, 'edit'])->name('edit');
        Route::put('/{user}',          [\App\Http\Controllers\UserController::class, 'update'])->name('update');
        Route::delete('/{user}',       [\App\Http\Controllers\UserController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('parametres')->name('parametres.')->group(function () {
        Route::get('/', [ParametresController::class, 'index'])->name('index');
        Route::put('/organisation', [ParametresController::class, 'updateOrganisation'])->name('organisation.update');

        // Utilisateurs
        Route::get('/utilisateurs', [ParametresController::class, 'utilisateurs'])->name('utilisateurs');
        Route::post('/utilisateurs/invite', [ParametresController::class, 'inviteUtilisateur'])->name('utilisateurs.invite');
        // Noms attendus par Pages/Parametres/Utilisateurs.jsx (sinon exception Ziggy au clic).
        Route::post  ('/utilisateurs/inviter',           [ParametresController::class, 'inviteUtilisateur'])->name('utilisateurs.inviter');
        Route::patch ('/utilisateurs/{id}/role',         [\App\Http\Controllers\UserController::class, 'updateRole'])->name('utilisateurs.role');
        Route::patch ('/utilisateurs/{id}/toggle',       [\App\Http\Controllers\UserController::class, 'toggleStatus'])->name('utilisateurs.toggle');
        Route::post  ('/utilisateurs/{id}/reset-mdp',    [\App\Http\Controllers\UserController::class, 'resetPassword'])->name('utilisateurs.reset-mdp');
        Route::get   ('/utilisateurs/{id}/historique',   [\App\Http\Controllers\UserController::class, 'history'])->name('utilisateurs.historique');

        // Rôles & permissions
        Route::get('/roles', [ParametresController::class, 'roles'])->name('roles');
        Route::post('/roles/{user}/assign', [ParametresController::class, 'assignRole'])->name('roles.assign');
        Route::get('/notifications', [ParametresController::class, 'notifications'])->name('notifications');

        // Langue & région
        Route::get('/langue-region', [ParametresController::class, 'langueRegion'])->name('langue-region');
        Route::put('/langue-region', [ParametresController::class, 'updateLangueRegion'])->name('langue-region.update');

        // Intégrations (Vague 9)
        Route::get('/integrations', [IntegrationController::class, 'index'])->name('integrations');
        Route::post('/integrations/{id}/install', [IntegrationController::class, 'install'])->name('integrations.install');
        Route::delete('/integrations/{id}/uninstall', [IntegrationController::class, 'uninstall'])->name('integrations.uninstall');
        Route::post('/integrations/{id}/test', [IntegrationController::class, 'test'])->name('integrations.test');
        Route::post('/integrations/{id}/sync', [IntegrationController::class, 'sync'])->name('integrations.sync');
        Route::get('/integrations/{id}/logs', [IntegrationController::class, 'logs'])->name('integrations.logs');

        // Webhooks & API
        Route::get('/webhooks', [IntegrationController::class, 'webhooks'])->name('webhooks');
        Route::post('/webhooks', [IntegrationController::class, 'storeWebhook'])->name('webhooks.store');
        Route::delete('/webhooks/{id}', [IntegrationController::class, 'destroyWebhook'])->name('webhooks.destroy');
        Route::get('/api-keys', [IntegrationController::class, 'apiKeys'])->name('api-keys');

        // SSO (Vague 10)
        Route::get('/sso', [SsoController::class, 'settings'])->name('sso');
        Route::get('/securite', [ParametresController::class, 'securite'])->name('securite');
    });

    // -------------------------------------------------------------------------
    // MODULE COMPTABILITÉ SYSCOHADA (Vague 6/11)
    // -------------------------------------------------------------------------
    Route::prefix('comptabilite')->name('comptabilite.')->group(function () {
        Route::get('/',          [AccountingController::class, 'index'])->name('index');
        Route::get('/dashboard', [AccountingController::class, 'dashboard'])->name('dashboard');
        Route::get('/export',    [AccountingController::class, 'export'])->name('export');

        // Clients
        Route::get('/clients',         [AccountingController::class, 'clientsIndex'])->name('clients.index');
        Route::post('/clients',        [AccountingController::class, 'clientsStore'])->name('clients.store');
        Route::put('/clients/{id}',    [AccountingController::class, 'clientsUpdate'])->name('clients.update');
        Route::delete('/clients/{id}', [AccountingController::class, 'clientsDestroy'])->name('clients.destroy');

        // Factures
        Route::get('/factures',              [AccountingController::class, 'invoicesIndex'])->name('factures.index');
        Route::get('/factures/create',       [AccountingController::class, 'invoicesCreate'])->name('factures.create');
        Route::get('/factures/{id}/edit',    [AccountingController::class, 'invoicesEdit'])->name('factures.edit');
        Route::post('/factures',             [AccountingController::class, 'invoicesStore'])->name('factures.store');
        Route::put('/factures/{id}',         [AccountingController::class, 'invoicesUpdate'])->name('factures.update');
        Route::delete('/factures/{id}',      [AccountingController::class, 'invoicesDestroy'])->name('factures.destroy');
        Route::post('/factures/{id}/send',   [AccountingController::class, 'invoicesSend'])->name('factures.send');
        Route::post('/factures/{id}/remind', [AccountingController::class, 'invoicesRemind'])->name('factures.remind');
        Route::post('/factures/{id}/pay',    [AccountingController::class, 'invoicesPay'])->name('factures.pay');
        Route::get('/factures/{id}/pdf',     [AccountingController::class, 'invoicesPdf'])->name('factures.pdf');

        // Devis
        Route::get('/devis',              [AccountingController::class, 'quotesIndex'])->name('devis.index');
        Route::get('/devis/create',       [AccountingController::class, 'quotesCreate'])->name('devis.create');
        Route::post('/devis',             [AccountingController::class, 'quotesStore'])->name('devis.store');
        Route::get('/devis/{id}/edit',    [AccountingController::class, 'quotesEdit'])->name('devis.edit');
        Route::put('/devis/{id}',         [AccountingController::class, 'quotesUpdate'])->name('devis.update');
        Route::post('/devis/{id}/send',   [AccountingController::class, 'quotesSend'])->name('devis.send');
        Route::get('/devis/{id}/pdf',     [AccountingController::class, 'quotesPdf'])->name('devis.pdf');
        Route::get('/devis/{id}/convert', [AccountingController::class, 'quotesConvert'])->name('devis.convert');

        // Dépenses
        Route::get('/depenses',               [AccountingController::class, 'expensesIndex'])->name('depenses.index');
        Route::post('/depenses',              [AccountingController::class, 'expensesStore'])->name('depenses.store');
        Route::post('/depenses/{id}/approve', [AccountingController::class, 'expensesApprove'])->name('depenses.approve');
        Route::post('/depenses/{id}/reject',  [AccountingController::class, 'expensesReject'])->name('depenses.reject');

        // Journal (SYSCOHADA)
        Route::get('/journal',                [SyscohadaController::class, 'journalIndex'])->name('journal.index');
        Route::post('/journal',               [SyscohadaController::class, 'journalStore'])->name('journal.store');
        Route::get('/journal/{id}',           [SyscohadaController::class, 'journalShow'])->name('journal.show');
        Route::post('/journal/{id}/validate', [SyscohadaController::class, 'journalValidate'])->name('journal.validate');
        Route::delete('/journal/{id}',        [SyscohadaController::class, 'journalDestroy'])->name('journal.destroy');

        // Plan comptable
        Route::get('/plan-comptable',         [SyscohadaController::class, 'chartOfAccounts'])->name('plan-comptable.index');
        Route::post('/plan-comptable',        [SyscohadaController::class, 'chartStore'])->name('plan-comptable.store');
        Route::put('/plan-comptable/{id}',    [SyscohadaController::class, 'chartUpdate'])->name('plan-comptable.update');
        Route::delete('/plan-comptable/{id}', [SyscohadaController::class, 'chartDestroy'])->name('plan-comptable.destroy');

        // États
        Route::get('/balance',                [SyscohadaController::class, 'balance'])->name('balance');
        Route::get('/grand-livre',            [SyscohadaController::class, 'generalLedger'])->name('grand-livre');
        Route::get('/grand-livre/pdf',        [SyscohadaController::class, 'generalLedgerPdf'])->name('grand-livre.pdf');
        Route::get('/bilan',                  [SyscohadaController::class, 'balanceSheet'])->name('bilan');
        Route::get('/bilan/pdf',              [SyscohadaController::class, 'balanceSheetPdf'])->name('bilan.pdf');
        Route::get('/compte-de-resultat',     [SyscohadaController::class, 'incomeStatement'])->name('compte-de-resultat');
        Route::get('/compte-de-resultat/pdf', [SyscohadaController::class, 'incomeStatementPdf'])->name('compte-de-resultat.pdf');

        // Déclarations fiscales
        Route::get('/declarations',             [SyscohadaController::class, 'taxDeclarations'])->name('declarations.index');
        Route::post('/declarations',            [SyscohadaController::class, 'taxStore'])->name('declarations.store');
        Route::put('/declarations/{id}/submit', [SyscohadaController::class, 'taxSubmit'])->name('declarations.submit');

        // Lettrage
        Route::post('/lettrage/{accountNumber}', [SyscohadaController::class, 'reconcile'])->name('lettrage');

        // Exercices fiscaux
        Route::get('/exercices',             [SyscohadaController::class, 'fiscalYearsIndex'])->name('exercices.index');
        Route::post('/exercices',            [SyscohadaController::class, 'fiscalYearsStore'])->name('exercices.store');
        Route::post('/exercices/{id}/close', [SyscohadaController::class, 'fiscalYearsClose'])->name('exercices.close');
    });

    // -------------------------------------------------------------------------
    // MODULE BUDGET (Vague 11)
    // -------------------------------------------------------------------------
    Route::prefix('budget')->name('budget.')->group(function () {
        Route::get('/', [BudgetController::class, 'index'])->name('index');
        Route::get('/dashboard', [BudgetController::class, 'dashboard'])->name('dashboard');
        Route::get('/{id}', [BudgetController::class, 'show'])->name('show');
        Route::get('/{id}/ecarts', [BudgetController::class, 'variancePage'])->name('ecarts');
        Route::get('/{id}/previsions', [BudgetController::class, 'forecastPage'])->name('previsions');
    });

    // -------------------------------------------------------------------------
    // MODULE ACHATS & PROCUREMENT (Vague 12)
    // -------------------------------------------------------------------------
    Route::prefix('achats')->name('achats.')->group(function () {
        Route::get('/', [ProcurementController::class, 'dashboard'])->name('index');

        // Demandes d'achat
        Route::get('/demandes',                 [ProcurementController::class, 'prIndex'])->name('demandes');
        Route::post('/demandes',                [ProcurementController::class, 'prStore'])->name('demandes.store');
        Route::post('/demandes/{pr}/soumettre', [ProcurementController::class, 'prSubmit'])->name('demandes.submit');
        Route::post('/demandes/{pr}/approuver', [ProcurementController::class, 'prApprove'])->name('demandes.approve');
        Route::post('/demandes/{pr}/refuser',   [ProcurementController::class, 'prRefuse'])->name('demandes.refuse');

        // Appels d'offres
        Route::get('/appels-offres',                    [ProcurementController::class, 'rfqIndex'])->name('appels-offres');
        Route::post('/appels-offres',                   [ProcurementController::class, 'rfqStore'])->name('appels-offres.store');
        Route::post('/appels-offres/{rfq}/inviter',     [ProcurementController::class, 'rfqInviteSuppliers'])->name('appels-offres.invite');
        Route::get('/appels-offres/{rfq}/comparer',     [ProcurementController::class, 'rfqCompare'])->name('appels-offres.compare');
        Route::post('/appels-offres/{rfq}/evaluer',     [ProcurementController::class, 'rfqEvaluate'])->name('appels-offres.evaluate');
        Route::post('/appels-offres/{rfq}/selectionner',[ProcurementController::class, 'rfqSelectQuotation'])->name('appels-offres.select');
        Route::post('/appels-offres/{rfq}/cloturer',    [ProcurementController::class, 'rfqClose'])->name('appels-offres.close');

        // Bons de commande
        Route::get('/commandes',                [ProcurementController::class, 'poIndex'])->name('commandes');
        Route::post('/commandes',               [ProcurementController::class, 'poStore'])->name('commandes.store');
        Route::post('/commandes/{po}/approuver', [ProcurementController::class, 'poApprove'])->name('commandes.approve');
        Route::get('/commandes/{po}/pdf', [ProcurementController::class, 'poPdf'])->name('commandes.pdf');
        Route::post('/commandes/{po}/envoyer',  [ProcurementController::class, 'poSend'])->name('commandes.send');
        Route::post('/commandes/{po}/reception', [ProcurementController::class, 'poReceive'])->name('commandes.receive');
        Route::delete('/commandes/{po}',        [ProcurementController::class, 'poDestroy'])->name('commandes.destroy');

        // Fournisseurs
        Route::get('/fournisseurs',                      [ProcurementController::class, 'suppliersIndex'])->name('fournisseurs');
        Route::post('/fournisseurs',                     [ProcurementController::class, 'supplierStore'])->name('fournisseurs.store');
        Route::put('/fournisseurs/{supplier}',           [ProcurementController::class, 'supplierUpdate'])->name('fournisseurs.update');
        Route::delete('/fournisseurs/{supplier}',        [ProcurementController::class, 'supplierDestroy'])->name('fournisseurs.destroy');
        Route::get('/fournisseurs/{supplier}/scorecard', [ProcurementController::class, 'supplierScorecard'])->name('fournisseurs.scorecard');
        Route::post('/fournisseurs/{supplier}/evaluer',  [ProcurementController::class, 'supplierEvaluate'])->name('fournisseurs.evaluate');
        Route::post('/fournisseurs/{supplier}/portail',  [ProcurementController::class, 'supplierTogglePortal'])->name('fournisseurs.portal');
    });

    // -------------------------------------------------------------------------
    // MODULE QUALITÉ (Vague 12)
    // -------------------------------------------------------------------------
    Route::prefix('qualite')->name('qualite.')->group(function () {
        Route::get('/', [QualityController::class, 'dashboard'])->name('index');
        Route::get('/non-conformites', [QualityController::class, 'nonconformities'])->name('non-conformites');
        Route::get('/non-conformites/export', [QualityController::class, 'ncExport'])->name('non-conformites.export');
        Route::get('/non-conformites/create', [QualityController::class, 'ncCreate'])->name('non-conformites.create');
        Route::get('/indicateurs', [QualityController::class, 'indicators'])->name('indicateurs');
        Route::get('/audits', [QualityController::class, 'audits'])->name('audits');
        Route::post('/audits', [QualityController::class, 'auditStore'])->name('audits.store');
        Route::get('/audits/{id}', [QualityController::class, 'auditShow'])->name('audits.show');
        Route::get('/documents', [QualityController::class, 'documents'])->name('documents');
        Route::get('/reclamations', [QualityController::class, 'complaints'])->name('reclamations');
        Route::get('/cartographie', [QualityController::class, 'processMap'])->name('cartographie');

        // --- Actions (Vague 2 câblage) ---
        Route::post  ('/non-conformites',                        [QualityController::class, 'ncStore'])->name('non-conformites.store');
        Route::get   ('/non-conformites/{id}',                   [QualityController::class, 'ncShow'])->name('non-conformites.show');
        Route::put   ('/non-conformites/{id}',                   [QualityController::class, 'ncUpdate'])->name('non-conformites.update');
        Route::delete('/non-conformites/{id}',                   [QualityController::class, 'ncDestroy'])->name('non-conformites.destroy');
        Route::patch ('/non-conformites/{id}/statut',            [QualityController::class, 'ncChangeStatus'])->name('non-conformites.statut');
        Route::post  ('/non-conformites/{id}/cause-racine',      [QualityController::class, 'ncRootCause'])->name('non-conformites.cause-racine');
        Route::post  ('/non-conformites/{id}/action-corrective', [QualityController::class, 'ncCorrectiveAction'])->name('non-conformites.action-corrective');
        Route::post  ('/non-conformites/{id}/verification',      [QualityController::class, 'ncVerify'])->name('non-conformites.verification');

        Route::post ('/indicateurs',                 [QualityController::class, 'indicatorStore'])->name('indicateurs.store');
        Route::put  ('/indicateurs/{id}',            [QualityController::class, 'indicatorUpdate'])->name('indicateurs.update');
        Route::post ('/indicateurs/{id}/valeur',     [QualityController::class, 'indicatorRecordValue'])->name('indicateurs.valeur');
        Route::get  ('/indicateurs/{id}/historique', [QualityController::class, 'indicatorHistory'])->name('indicateurs.historique');

        Route::put  ('/audits/{id}',           [QualityController::class, 'auditUpdate'])->name('audits.update');
        Route::get  ('/audits/{id}/checklist', [QualityController::class, 'auditChecklist'])->name('audits.checklist');
        Route::post ('/audits/{id}/findings',  [QualityController::class, 'auditAddFinding'])->name('audits.findings');
        Route::post ('/audits/{id}/report',    [QualityController::class, 'auditUploadReport'])->name('audits.report');

        Route::post ('/documents',              [QualityController::class, 'documentStore'])->name('documents.store');
        Route::patch('/documents/{id}/approve', [QualityController::class, 'documentApprove'])->name('documents.approve');
        Route::post ('/documents/{id}/file',    [QualityController::class, 'documentUploadFile'])->name('documents.file');

        Route::post ('/reclamations',              [QualityController::class, 'complaintStore'])->name('reclamations.store');
        Route::post ('/reclamations/{id}/cloture', [QualityController::class, 'complaintClose'])->name('reclamations.cloture');

        Route::post ('/cartographie/processus',      [QualityController::class, 'processStore'])->name('cartographie.store');
        Route::put  ('/cartographie/processus/{id}', [QualityController::class, 'processUpdate'])->name('cartographie.update');
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
        Route::get('/mes-cours', [TrainingController::class, 'myCourses'])->name('mes-cours');
        Route::get('/certificats', [TrainingController::class, 'certificates'])->name('certificats');
    });

    // Actions du catalogue de formation — les méthodes existaient, les routes manquaient :
    // tous les boutons (voir un cours, s'inscrire, rejoindre une session) tombaient en 404.
    Route::prefix('training')->name('training.')->group(function () {
        Route::get ('/courses',                    [TrainingController::class, 'catalog'])->name('courses');
        Route::get ('/courses/{id}',               [TrainingController::class, 'show'])->whereNumber('id')->name('courses.show');
        Route::post('/courses/{id}/enroll',        [TrainingController::class, 'enroll'])->whereNumber('id')->name('courses.enroll');
        Route::post('/learning-paths/{id}/enroll', [TrainingController::class, 'enrollLearningPath'])->whereNumber('id')->name('paths.enroll');
        Route::get ('/learning-paths/{id}/progress',[TrainingController::class, 'learningPathProgress'])->whereNumber('id')->name('paths.progress');
        Route::post('/live-sessions/{id}/register',[TrainingController::class, 'registerLiveSession'])->whereNumber('id')->name('live.register');
        Route::get ('/scorm/{id}/launch',          [TrainingController::class, 'scormLaunch'])->whereNumber('id')->name('scorm.launch');
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
    // Le front (`Pages/Signatures/Index.jsx`) navigue en Inertia sur
    // `/signatures/requests*` : ces routes n'existaient que dans
    // `routes/api/signatures.php`, un fichier qui n'est chargé nulle part.
    // Tous les boutons du module étaient donc morts.
    Route::get('/signatures', [SignatureController::class, 'index'])->name('signatures');

    Route::prefix('signatures')->name('signatures.')->group(function () {
        Route::get('/requests', [SignatureController::class, 'index'])->name('requests.index');
        Route::get('/requests/create', [SignatureController::class, 'create'])->name('requests.create');
        Route::post('/requests', [SignatureController::class, 'store'])->name('requests.store');
        // `whereNumber` évite que « create » soit capturé par {id} (le même
        // piège avait cassé /rh/personnel/creer).
        Route::get('/requests/{id}', [SignatureController::class, 'show'])->whereNumber('id')->name('requests.show');
        Route::post('/requests/{id}/remind', [SignatureController::class, 'remind'])->whereNumber('id')->name('requests.remind');
        Route::delete('/requests/{id}/cancel', [SignatureController::class, 'cancel'])->whereNumber('id')->name('requests.cancel');
        Route::get('/{id}/certificate', [SignatureController::class, 'downloadCertificate'])->whereNumber('id')->name('requests.certificate');
        Route::get('/verify/{hash}', [SignatureController::class, 'verify'])->name('requests.verify');
    });

    // -------------------------------------------------------------------------
    // AUTOMATISATIONS (Vague 9)
    // -------------------------------------------------------------------------
    Route::get('/automatisations', [AutomationController::class, 'indexPage'])->name('automatisations');

    // -------------------------------------------------------------------------
    // SARA — Assistant IA (Vague 8)
    // -------------------------------------------------------------------------
    Route::get('/sara', [SaraController::class, 'index'])->name('sara');

    // -------------------------------------------------------------------------
    // PORTAIL CLIENT (Vague 7)
    // -------------------------------------------------------------------------
    Route::prefix('portail-client')->name('portail.')->group(function () {
        Route::get('/', [PortalClientPortalController::class, 'loginPage'])->name('login');
        Route::post('/auth', [PortalClientPortalController::class, 'login'])->name('auth');
        Route::post('/logout', [PortalClientPortalController::class, 'logout'])->name('logout');
        Route::get('/dashboard', [PortalClientPortalController::class, 'dashboard'])->name('dashboard');
        Route::get('/documents', [PortalClientPortalController::class, 'documents'])->name('documents');
        Route::get('/documents/{id}/download', [PortalClientPortalController::class, 'downloadDocument'])->name('documents.download');
        Route::get('/factures', [PortalClientPortalController::class, 'invoices'])->name('invoices');
        Route::post('/factures/{id}/payer', [PortalClientPortalController::class, 'payInvoice'])->name('invoices.pay');
        Route::get('/messages', [PortalClientPortalController::class, 'messages'])->name('messages');
        Route::post('/messages', [PortalClientPortalController::class, 'sendMessage'])->name('messages.send');
    });

    // -------------------------------------------------------------------------
    // DÉLIBÉRATIONS
    // -------------------------------------------------------------------------
    Route::prefix('deliberations')->name('deliberations.')->group(function () {
        Route::get('/', [\App\Http\Controllers\DeliberationController::class, 'index'])->name('index');
        Route::get('/create', [\App\Http\Controllers\DeliberationController::class, 'create'])->name('create');
        Route::post('/', [\App\Http\Controllers\DeliberationController::class, 'store'])->name('store');
        Route::get('/{id}', [\App\Http\Controllers\DeliberationController::class, 'show'])->name('show');
        Route::put('/{id}', [\App\Http\Controllers\DeliberationController::class, 'update'])->name('update');
        Route::delete('/{id}', [\App\Http\Controllers\DeliberationController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/status', [\App\Http\Controllers\DeliberationController::class, 'updateStatus'])->name('status');
        Route::post('/{id}/to-task', [\App\Http\Controllers\DeliberationController::class, 'toTask'])->name('to-task');
    });

    // -------------------------------------------------------------------------
    // DÉLÉGATIONS
    // -------------------------------------------------------------------------
    Route::prefix('delegations')->name('delegations.')->group(function () {
        Route::get('/', [\App\Http\Controllers\DelegationController::class, 'index'])->name('index');
        Route::post('/', [\App\Http\Controllers\DelegationController::class, 'store'])->name('store');
        Route::put('/{id}', [\App\Http\Controllers\DelegationController::class, 'update'])->name('update');
        Route::delete('/{id}', [\App\Http\Controllers\DelegationController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/revoke', [\App\Http\Controllers\DelegationController::class, 'revoke'])->name('revoke');
    });

    // Compatibilité ancienne URL
    // NB : ne PAS redéclarer GET /portail-client ici — le groupe portail. ci-dessus sert déjà
    // cette URI (portail.login). Un doublon d'URI écrase la route et DÉTRUIT son nom
    // (« Route [portail.login] not defined » → 500).

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
    Route::put('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [ProfileController::class, 'updatePassword'])->name('profile.password');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar');

    // -------------------------------------------------------------------------
    // RGPD & CONFIDENTIALITÉ — « Mes données personnelles »
    //
    // La page Inertia Pages/Privacy/MyData.jsx était orpheline : le menu latéral
    // (navConfig.js) pointait déjà vers /rgpd, sans route correspondante (404).
    //
    // Deux surfaces distinctes, volontairement séparées :
    //   • /rgpd            → rendu Inertia (Accept: text/html) — JAMAIS de JSON ;
    //   • /gdpr/*          → points d'entrée JSON appelés en fetch() par la page
    //                        et par Components/Privacy/ConsentBanner.jsx.
    //
    // Aucune collision d'URI ni de nom : les routes jumelles de routes/api.php
    // sont préfixées /api/v1 et nommées api.v1.gdpr.* (jeton Sanctum),
    // celles-ci sont nommées rgpd.* / gdpr.* (session web).
    // -------------------------------------------------------------------------
    Route::get('/rgpd', [GdprController::class, 'myDataPage'])->name('rgpd.index');

    Route::prefix('gdpr')->name('gdpr.')->group(function () {
        // Le segment le plus spécifique d'abord : /my-data/summary ne doit pas
        // être avalé par /my-data (qui déclenche la génération de l'archive ZIP).
        Route::get ('/my-data/summary', [GdprController::class, 'myDataSummary'])->name('my-data.summary');
        Route::get ('/my-data',         [GdprController::class, 'exportMyData'])->name('my-data.export');

        Route::get ('/requests',        [GdprController::class, 'myRequests'])->name('requests.index');
        Route::post('/requests',        [GdprController::class, 'submitRequest'])->name('requests.store');

        Route::get ('/consent',         [GdprController::class, 'myConsents'])->name('consent.index');
        Route::post('/consent',         [GdprController::class, 'saveConsent'])->name('consent.store');
        Route::post('/consent/revoke',  [GdprController::class, 'revokeConsent'])->name('consent.revoke');
    });

    // NB: la route publique /aide (centre d'aide) est déclarée plus haut ;
    // l'ancien doublon authentifié Route::get('/aide', HelpController@index) l'écrasait (dernière URI gagne).

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
            // Pipeline & contacts commerciaux d'IBIG.
            // Seules ces trois lectures existaient : toutes les actions des deux
            // écrans (créer, modifier, supprimer, importer, convertir, consigner
            // un échange, déplacer une affaire) tombaient dans le vide.
            Route::get('/pipeline', [SuperAdminCrmController::class, 'pipeline'])->name('pipeline');
            Route::get('/analytics', [SuperAdminCrmController::class, 'analytics'])->name('analytics');

            Route::get('/contacts', [SuperAdminCrmController::class, 'contacts'])->name('contacts');
            Route::post('/contacts', [SuperAdminCrmController::class, 'storeContact'])->name('contacts.store');
            // « create » et « import » avant `{id}`, sinon ils sont capturés.
            Route::get('/contacts/create', [SuperAdminCrmController::class, 'createContact'])->name('contacts.create');
            Route::post('/contacts/import', [SuperAdminCrmController::class, 'importContacts'])->name('contacts.import');
            Route::get('/contacts/{id}', [SuperAdminCrmController::class, 'showContact'])->whereNumber('id')->name('contacts.show');
            Route::put('/contacts/{id}', [SuperAdminCrmController::class, 'updateContact'])->whereNumber('id')->name('contacts.update');
            Route::delete('/contacts/{id}', [SuperAdminCrmController::class, 'destroyContact'])->whereNumber('id')->name('contacts.destroy');
            Route::post('/contacts/{id}/convert', [SuperAdminCrmController::class, 'convertContact'])->whereNumber('id')->name('contacts.convert');

            Route::post('/activities', [SuperAdminCrmController::class, 'storeActivity'])->name('activities.store');

            // Modèles d'email & envois — appelés par la fiche contact et par
            // l'écran des modèles, sans aucune route jusqu'ici.
            Route::get('/email-templates', [SuperAdminCrmController::class, 'emailTemplates'])->name('email-templates');
            Route::post('/email-templates', [SuperAdminCrmController::class, 'storeEmailTemplate'])->name('email-templates.store');
            Route::put('/email-templates/{id}', [SuperAdminCrmController::class, 'updateEmailTemplate'])->whereNumber('id')->name('email-templates.update');
            Route::post('/emails/send', [SuperAdminCrmController::class, 'sendEmail'])->name('emails.send');
            Route::post('/deals/{id}/stage', [SuperAdminCrmController::class, 'moveDealStage'])->whereNumber('id')->name('deals.stage');

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

        // La page était rendue par une closure sans données ; le contrôleur
        // existait et fournissait la liste.
        Route::get('/announcements', [SuperAdminAnnouncementController::class, 'index'])->name('announcements');
        Route::post('/announcements', [SuperAdminAnnouncementController::class, 'store'])->name('announcements.store');
        Route::put('/announcements/{id}', [SuperAdminAnnouncementController::class, 'update'])->name('announcements.update');
        Route::patch('/announcements/{id}', [SuperAdminAnnouncementController::class, 'patch'])->name('announcements.patch');
        Route::delete('/announcements/{id}', [SuperAdminAnnouncementController::class, 'destroy'])->name('announcements.destroy');
        // Bouton « Publier » de `Announcements.jsx` : la méthode existait, la route non.
        Route::post('/announcements/{id}/publish', [SuperAdminAnnouncementController::class, 'publish'])->name('announcements.publish');

        // Feature flags. `/feature-flags` était déclaré DEUX fois dans ce même
        // groupe (ici en closure, plus bas via le contrôleur) : la seconde
        // déclaration écrasait l'URI ET le nom de la première. Une seule reste,
        // et les quatre actions de la page sont enfin routées.
        Route::get('/feature-flags', [FeatureFlagController::class, 'index'])->name('feature-flags');
        Route::post('/feature-flags', [FeatureFlagController::class, 'store'])->name('feature-flags.store');
        Route::put('/feature-flags/{id}', [FeatureFlagController::class, 'update'])->name('feature-flags.update');
        Route::delete('/feature-flags/{id}', [FeatureFlagController::class, 'destroy'])->name('feature-flags.destroy');
        Route::post('/feature-flags/{id}/toggle', [FeatureFlagController::class, 'toggle'])->name('feature-flags.toggle');
        Route::post('/feature-flags/{id}/rollout', [FeatureFlagController::class, 'rollout'])->name('feature-flags.rollout');

        // Sauvegardes. `BackupController` rend `SuperAdmin/Backups/Index` mais
        // n'était routé NULLE PART : la page — et la sauvegarde manuelle — étaient
        // inatteignables.
        Route::prefix('backups')->name('backups.')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'index'])->name('index');
            Route::get('/list', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'list'])->name('list');
            Route::get('/logs', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'logs'])->name('logs');
            Route::post('/trigger', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'trigger'])->name('trigger');
            Route::get('/{id}/download', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'download'])->name('download');
            Route::post('/{id}/restore', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'restore'])->name('restore');
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\BackupController::class, 'delete'])->name('delete');
        });

        // Prospects. Même situation : `ProspectController` rend `SuperAdmin/Prospects`
        // et expose neuf actions, sans une seule route.
        Route::prefix('prospects')->name('prospects.')->group(function () {
            Route::get('/', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'index'])->name('index');
            Route::post('/', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'store'])->name('store');
            Route::get('/{id}', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'show'])->whereNumber('id')->name('show');
            Route::match(['put', 'patch'], '/{id}', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'update'])->whereNumber('id')->name('update');
            Route::delete('/{id}', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/convert', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'convert'])->whereNumber('id')->name('convert');
            Route::post('/{id}/notes', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'addNote'])->whereNumber('id')->name('notes');
            Route::post('/{id}/demo', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'scheduleDemo'])->whereNumber('id')->name('demo');
            Route::post('/{id}/offer', [\App\Http\Controllers\SuperAdmin\ProspectController::class, 'sendOffer'])->whereNumber('id')->name('offer');
        });

        Route::get('/settings', fn () => \Inertia\Inertia::render('SuperAdmin/Settings/EditorConfig'))->name('settings');
        Route::put('/settings/{section}', [\App\Http\Controllers\SuperAdmin\SystemController::class, 'updateSettings'])->name('settings.update');
        Route::post('/settings/smtp/test', [\App\Http\Controllers\SuperAdmin\SystemController::class, 'testSmtp'])->name('settings.smtp.test');

        // Support & Feature Flags
        Route::get('/support', [SuperAdminSupportController::class, 'index'])->name('support');
        // (`/feature-flags` était re-déclaré ici, écrasant la version d'au-dessus.)
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

        // Paiements SuperAdmin.
        // La page était rendue par une closure SANS prop : `Payments.jsx`
        // retombait sur ses dix règlements fictifs. `PaymentAdminController`
        // existait pourtant déjà — il n'était routé nulle part.
        Route::get('/paiements', [\App\Http\Controllers\SuperAdmin\PaymentAdminController::class, 'index'])->name('paiements');
        // Le front appelle ces trois URL en anglais : on les sert telles quelles
        // plutôt que de réécrire la page.
        Route::get('/payments/export', [\App\Http\Controllers\SuperAdmin\PaymentAdminController::class, 'exportCsv'])->name('payments.export');
        Route::get('/payments/proofs/{id}', [\App\Http\Controllers\SuperAdmin\PaymentAdminController::class, 'downloadProof'])->whereNumber('id')->name('payments.proof');
        Route::post('/payments/{order}/validate', [\App\Http\Controllers\SuperAdmin\PaymentAdminController::class, 'validatePayment'])->whereNumber('order')->name('payments.validate');
        Route::post('/payments/{order}/reject', [\App\Http\Controllers\SuperAdmin\PaymentAdminController::class, 'rejectPayment'])->whereNumber('order')->name('payments.reject');

        // Référentiel social et fiscal par pays (zone franc CFA : UEMOA + CEMAC).
        // Les taux statutaires se saisissent ici, jamais dans le code.
        Route::prefix('paie')->name('paie.')->group(function () {
            Route::get('/referentiel', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'index'])->name('referentiel');
            Route::post('/referentiel/simuler', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'simulate'])->name('referentiel.simuler');

            Route::post('/cotisations', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'storeRule'])->name('cotisations.store');
            Route::put('/cotisations/{id}', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'updateRule'])->whereNumber('id')->name('cotisations.update');
            Route::delete('/cotisations/{id}', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'destroyRule'])->whereNumber('id')->name('cotisations.destroy');
            Route::post('/cotisations/{id}/confirmer', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'verifyRule'])->whereNumber('id')->name('cotisations.verify');

            Route::post('/bareme', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'storeBracket'])->name('bareme.store');
            Route::delete('/bareme/{id}', [\App\Http\Controllers\SuperAdmin\PayrollRuleController::class, 'destroyBracket'])->whereNumber('id')->name('bareme.destroy');
        });

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
