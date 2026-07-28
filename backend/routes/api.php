<?php


declare(strict_types=1);
use App\Http\Controllers\SaraChatController;

/*
|--------------------------------------------------------------------------
| SECRETIS ERP — Routes API REST v1
| Toutes les 12 vagues — Version définitive
|--------------------------------------------------------------------------
|
| Préfixe global : /api/v1  (défini dans bootstrap/app.php ou RouteServiceProvider)
| Throttle par défaut : throttle:api (1000 req/h par IP/token)
|
*/

use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AgendaController;
use App\Http\Controllers\Api\V1\AuthApiController;
use App\Http\Controllers\Api\V1\DeviceController;
use App\Http\Controllers\Api\V1\EventApiController;
use App\Http\Controllers\Api\V1\NotificationApiController;
use App\Http\Controllers\Api\V1\TaskApiController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\BiController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CircularController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\CourrierController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentFolderController;
use App\Http\Controllers\DocumentWorkflowController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FleetController;
use App\Http\Controllers\GdprController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\GpsWebhookController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\HrController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\LicenseController;
use App\Http\Controllers\MeetingController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\GlobalSearchController;
use App\Http\Controllers\NotificationCenterController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OcrController;
use App\Http\Controllers\OutlookController;
use App\Http\Controllers\PartnerApiController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProcurementController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\PushNotificationController;
use App\Http\Controllers\QualityController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\SaraController;
use App\Http\Controllers\ScormRuntimeController;
use App\Http\Controllers\SignatureController;
use App\Http\Controllers\SsoController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SuperAdmin\MonitoringApiController;
use App\Http\Controllers\SuperAdmin\OrganizationController as SuperAdminOrganizationController;
use App\Http\Controllers\SuperAdmin\LicenseController as SuperAdminLicenseController;
use App\Http\Controllers\SuperAdmin\SaasMetricsController;
use App\Http\Controllers\SuperAdmin\SupportController as SuperAdminSupportController;
use App\Http\Controllers\SuperAdmin\FeatureFlagController;
use App\Http\Controllers\SuperAdmin\CrmController as SuperAdminCrmController;
use App\Http\Controllers\SyscohadaController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TrainingController;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\WhatsAppWebhookController;
use Illuminate\Support\Facades\Route;

// =============================================================================
// ROUTES PUBLIQUES — Sans authentification
// =============================================================================

use App\Http\Controllers\HelpCenterController;

// Santé & Métriques
Route::get('/health', [HealthController::class, 'check'])->name('api.health');

// ─── Centre d'aide — Endpoints publics ───────────────────────────────────────
Route::prefix('help')->name('api.help.')->middleware(['throttle:60,1'])->group(function () {
    Route::get('/search', [HelpCenterController::class, 'search'])->name('search');
    Route::post('/articles/{article}/feedback', [HelpCenterController::class, 'feedback'])
        ->middleware('auth:sanctum')
        ->name('articles.feedback');
});
Route::get('/metrics', [MetricsController::class, 'index'])->middleware(['ip.whitelist'])->name('api.metrics');

// =============================================================================
// WEBHOOKS ENTRANTS — Vérification HMAC uniquement (pas de Sanctum)
// =============================================================================

Route::prefix('webhooks')->name('webhooks.')->middleware(['throttle:webhooks'])->group(function () {

    // Paiements Afrique
    Route::post('/cinetpay', [WebhookController::class, 'cinetpay'])->name('cinetpay');
    Route::post('/paystack', [WebhookController::class, 'paystack'])->name('paystack');
    Route::post('/flutterwave', [WebhookController::class, 'flutterwave'])->name('flutterwave');
    Route::post('/orange-money', [WebhookController::class, 'orangeMoney'])->name('orange-money');
    Route::post('/mtn-momo', [WebhookController::class, 'mtnMomo'])->name('mtn-momo');
    Route::post('/wave', [WebhookController::class, 'wave'])->name('wave');

    // Messagerie
    Route::post('/whatsapp', [WhatsAppWebhookController::class, 'handle'])->name('whatsapp');
    Route::get('/whatsapp', [WhatsAppWebhookController::class, 'verify'])->name('whatsapp.verify'); // Meta verification

    // Calendrier & Productivité
    Route::post('/google-calendar', [GoogleCalendarController::class, 'webhook'])->name('google-calendar');
    Route::post('/microsoft365', [OutlookController::class, 'webhook'])->name('microsoft365');

    // Email providers
    Route::post('/sendgrid', [WebhookController::class, 'sendgrid'])->name('sendgrid');
    Route::post('/mailgun', [WebhookController::class, 'mailgun'])->name('mailgun');

    // GPS Fleet (authentification par device token, pas Sanctum)
    Route::post('/gps', [GpsWebhookController::class, 'handle'])
        ->middleware(['auth.device'])
        ->name('gps');
});

// Authentification (publique)
Route::prefix('v1/auth')->name('api.v1.auth.')->middleware(['throttle:auth'])->group(function () {
    Route::post('/login', [AuthApiController::class, 'login'])->name('login');
    Route::post('/register', [AuthApiController::class, 'register'])->name('register');
    Route::post('/forgot-password', [AuthApiController::class, 'forgotPassword'])->name('forgot-password');
    Route::post('/reset-password', [AuthApiController::class, 'resetPassword'])->name('reset-password');
    Route::post('/refresh-token', [AuthApiController::class, 'refreshToken'])->name('refresh-token');
    Route::post('/mfa/verify', [AuthApiController::class, 'verifyMfa'])->name('mfa.verify');

    // SSO (SAML2 / OIDC)
    Route::get('/sso/providers', [SsoController::class, 'providers'])->name('sso.providers');
    Route::post('/sso/saml/callback', [SsoController::class, 'samlCallback'])->name('sso.saml.callback');
    Route::post('/sso/oidc/callback', [SsoController::class, 'oidcCallback'])->name('sso.oidc.callback');
    Route::get('/sso/{provider}/redirect', [SsoController::class, 'redirect'])->name('sso.redirect');
});

// xAPI / LRS (Learning Record Store — Vague 12)
Route::post('/v1/xapi/statements', [ScormRuntimeController::class, 'storeStatement'])
    ->middleware(['auth:sanctum'])
    ->name('xapi.statements');

// =============================================================================
// =============================================================================
// ROUTES GED / COURRIER — alias sans préfixe v1 (attendus par le frontend React)
// Même middlewares que v1 mais sans le préfixe
// =============================================================================

Route::middleware(['auth:sanctum', 'tenant', 'throttle:api'])->group(function () {
    Route::prefix('ged')->name('api.ged.')->group(function () {
        Route::get('/folders', [DocumentFolderController::class, 'index'])->name('folders.index');
        Route::post('/folders', [DocumentFolderController::class, 'store'])->name('folders.store');
        Route::put('/folders/{id}', [DocumentFolderController::class, 'update'])->name('folders.update');
        Route::delete('/folders/{id}', [DocumentFolderController::class, 'destroy'])->name('folders.destroy');
        Route::post('/folders/{id}/move', [DocumentFolderController::class, 'move'])->name('folders.move');
        Route::post('/documents', [DocumentController::class, 'store'])->name('documents.store');
        Route::get('/documents/{id}/preview', [DocumentController::class, 'preview'])->name('documents.preview');
        Route::get('/documents/{id}/download', [DocumentController::class, 'download'])->name('documents.download');
        Route::post('/documents/{id}/share', [DocumentController::class, 'share'])->name('documents.share');
    });
    Route::prefix('courrier')->name('api.courrier.')->group(function () {
        Route::post('/{id}/status', [CourrierController::class, 'changeStatus'])->name('status');
        Route::get('/export/{format}', function (\Illuminate\Http\Request $req, string $format) {
            return $format === 'pdf'
                ? app(\App\Http\Controllers\CourrierController::class)->exportPdf($req)
                : app(\App\Http\Controllers\CourrierController::class)->exportExcel($req);
        })->name('export');
    });
});

// API v1 — Routes protégées (Sanctum + tenant + license)
// =============================================================================

Route::prefix('v1')->name('api.v1.')->middleware([
    'auth:sanctum',
    'tenant',
    'ensureLicenseValid',
    'throttle:api',
    'api.log',
])->group(function () {

    // -------------------------------------------------------------------------
    // AUTH — Endpoints protégés
    // -------------------------------------------------------------------------
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('/logout', [AuthApiController::class, 'logout'])->name('logout');
        Route::post('/refresh', [AuthApiController::class, 'refresh'])->name('refresh');
        Route::get('/me', [AuthApiController::class, 'me'])->name('me');
        Route::put('/password', [AuthApiController::class, 'changePassword'])->name('password');
        Route::post('/mfa/enable', [AuthApiController::class, 'enableMfa'])->name('mfa.enable');
        Route::post('/mfa/disable', [AuthApiController::class, 'disableMfa'])->name('mfa.disable');
        Route::get('/mfa/qr-code', [AuthApiController::class, 'mfaQrCode'])->name('mfa.qr-code');
        Route::post('/mfa/setup', [AuthApiController::class, 'mfaSetup'])->name('mfa.setup');
    });

    // -------------------------------------------------------------------------
    // UTILISATEURS
    // -------------------------------------------------------------------------
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [\App\Http\Controllers\UserController::class, 'index'])->name('index');
        Route::get('/{id}', [\App\Http\Controllers\UserController::class, 'show'])->name('show');
        Route::post('/invite', [\App\Http\Controllers\UserController::class, 'invite'])->name('invite');
        Route::put('/{id}', [\App\Http\Controllers\UserController::class, 'update'])->name('update');
        Route::put('/{id}/role', [\App\Http\Controllers\UserController::class, 'updateRole'])->name('role');
        Route::post('/{id}/activate', [\App\Http\Controllers\UserController::class, 'activate'])->name('activate');
        Route::post('/{id}/deactivate', [\App\Http\Controllers\UserController::class, 'deactivate'])->name('deactivate');
        Route::delete('/{id}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('destroy');
    });

    // -------------------------------------------------------------------------
    // AGENDA (Vague 1)
    // -------------------------------------------------------------------------
    Route::prefix('agenda')->name('agenda.')->group(function () {
        Route::get('/events', [EventApiController::class, 'index'])->name('events.index');
        Route::post('/events', [EventApiController::class, 'store'])->name('events.store');
        Route::get('/events/{id}', [EventApiController::class, 'show'])->name('events.show');
        Route::put('/events/{id}', [EventApiController::class, 'update'])->name('events.update');
        Route::patch('/events/{id}', [EventApiController::class, 'update'])->name('events.patch');
        Route::delete('/events/{id}', [EventApiController::class, 'destroy'])->name('events.destroy');
        Route::post('/events/{id}/respond', [EventApiController::class, 'respond'])->name('events.respond');
        Route::post('/availability', [AgendaController::class, 'checkAvailability'])->name('availability');
        Route::get('/calendar', [AgendaController::class, 'getCalendarEvents'])->name('calendar');
        Route::get('/sync/google', [GoogleCalendarController::class, 'redirectToGoogle'])->name('sync.google');
        Route::get('/sync/google/callback', [GoogleCalendarController::class, 'handleCallback'])->name('sync.google.callback');
        Route::get('/sync/ical', [AgendaController::class, 'exportIcal'])->name('sync.ical');
    });

    Route::prefix('rooms')->name('rooms.')->group(function () {
        Route::get('/', [RoomController::class, 'index'])->name('index');
        Route::post('/', [RoomController::class, 'store'])->name('store');
        Route::get('/{id}', [RoomController::class, 'show'])->name('show');
        Route::put('/{id}', [RoomController::class, 'update'])->name('update');
        Route::delete('/{id}', [RoomController::class, 'destroy'])->name('destroy');
        Route::get('/{id}/availability', [RoomController::class, 'checkAvailability'])->name('availability');
        Route::post('/{id}/reserve', [RoomController::class, 'reserve'])->name('reserve');
    });

    // -------------------------------------------------------------------------
    // COURRIER & GED (Vague 2)
    // -------------------------------------------------------------------------
    Route::prefix('courrier')->name('courrier.')->group(function () {
        Route::get('/', [CourrierController::class, 'index'])->name('index');
        Route::post('/', [CourrierController::class, 'store'])->name('store');
        Route::get('/{id}', [CourrierController::class, 'show'])->name('show');
        Route::put('/{id}', [CourrierController::class, 'update'])->name('update');
        Route::delete('/{id}', [CourrierController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/assign', [CourrierController::class, 'assign'])->name('assign');
        Route::post('/{id}/archive', [CourrierController::class, 'changeStatus'])->name('archive');
        Route::post('/{id}/transmit', [CourrierController::class, 'changeStatus'])->name('transmit');
        Route::post('/{id}/acknowledge', [CourrierController::class, 'changeStatus'])->name('acknowledge');
        Route::get('/{id}/history', [CourrierController::class, 'show'])->name('history');
        Route::get('/{id}/qr-code', [CourrierController::class, 'show'])->name('qr-code');
        Route::get('/stats', [CourrierController::class, 'index'])->name('stats');
        Route::get('/export', [CourrierController::class, 'exportExcel'])->name('export');
        Route::post('/{id}/status', [CourrierController::class, 'changeStatus'])->name('status');
    });

    Route::prefix('documents')->name('documents.')->group(function () {
        Route::get('/', [DocumentController::class, 'index'])->name('index');
        Route::post('/', [DocumentController::class, 'store'])->name('store');
        Route::get('/{id}', [DocumentController::class, 'show'])->name('show');
        Route::put('/{id}', [DocumentController::class, 'update'])->name('update');
        Route::delete('/{id}', [DocumentController::class, 'destroy'])->name('destroy');
        Route::get('/{id}/download', [DocumentController::class, 'apiDownload'])->name('download');
        Route::post('/{id}/share', [DocumentController::class, 'apiShare'])->name('share');
        Route::get('/{id}/versions', [DocumentController::class, 'apiVersions'])->name('versions');
        Route::post('/{id}/ocr', [OcrController::class, 'process'])->name('ocr');
        Route::get('/{id}/summary', [DocumentController::class, 'aiSummary'])->name('ai-summary');
        Route::get('/search', [DocumentController::class, 'search'])->name('search');

        // Workflow validation
        Route::post('/{id}/workflow/start', [DocumentWorkflowController::class, 'start'])->name('workflow.start');
        Route::post('/{id}/workflow/steps/{stepId}/approve', [DocumentWorkflowController::class, 'approve'])->name('workflow.approve');
        Route::post('/{id}/workflow/steps/{stepId}/reject', [DocumentWorkflowController::class, 'reject'])->name('workflow.reject');
    });

    // -------------------------------------------------------------------------
    // RÉUNIONS (Vague 3)
    // -------------------------------------------------------------------------
    Route::prefix('meetings')->name('meetings.')->group(function () {
        Route::get('/', [MeetingController::class, 'index'])->name('index');
        Route::post('/', [MeetingController::class, 'store'])->name('store');
        Route::get('/{id}', [MeetingController::class, 'show'])->name('show');
        Route::put('/{id}', [MeetingController::class, 'update'])->name('update');
        Route::delete('/{id}', [MeetingController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/start', [MeetingController::class, 'apiStart'])->name('start');
        Route::post('/{id}/end', [MeetingController::class, 'apiEnd'])->name('end');
        Route::get('/{id}/minutes', [MeetingController::class, 'apiMinutes'])->name('minutes');
        Route::post('/{id}/minutes', [MeetingController::class, 'storeMinutes'])->name('minutes.store');
        Route::post('/{id}/minutes/generate', [MeetingController::class, 'apiGenerateMinutes'])->name('minutes.generate');
        Route::get('/{id}/minutes/pdf', [MeetingController::class, 'apiMinutesPdf'])->name('minutes.pdf');
        Route::post('/{id}/minutes/send', [MeetingController::class, 'apiSendMinutes'])->name('minutes.send');

        // Participants
        Route::get('/{id}/participants', [MeetingController::class, 'apiParticipants'])->name('participants');
        Route::post('/{id}/participants', [MeetingController::class, 'apiAddParticipants'])->name('participants.add');
        Route::delete('/{id}/participants/{uid}', [MeetingController::class, 'apiRemoveParticipant'])->name('participants.remove');
        Route::put('/{id}/participants/{uid}/rsvp', [MeetingController::class, 'apiRsvp'])->name('participants.rsvp');

        // Ordre du jour
        Route::get('/{id}/odj', [MeetingController::class, 'apiAgenda'])->name('odj');
        Route::post('/{id}/odj', [MeetingController::class, 'storeAgendaItem'])->name('odj.store');
        Route::put('/{id}/odj/{pid}', [MeetingController::class, 'updateAgendaItem'])->name('odj.update');
        Route::delete('/{id}/odj/{pid}', [MeetingController::class, 'destroyAgendaItem'])->name('odj.destroy');
        Route::post('/{id}/odj/reorder', [MeetingController::class, 'apiReorderAgenda'])->name('odj.reorder');
    });

    // -------------------------------------------------------------------------
    // TÂCHES & PROJETS (Vague 4)
    // -------------------------------------------------------------------------
    Route::prefix('tasks')->name('tasks.')->group(function () {
        Route::get('/', [TaskApiController::class, 'index'])->name('index');
        Route::post('/', [TaskApiController::class, 'store'])->name('store');
        Route::get('/{id}', [TaskApiController::class, 'show'])->name('show');
        Route::put('/{id}', [TaskApiController::class, 'update'])->name('update');
        Route::patch('/{id}', [TaskApiController::class, 'update'])->name('patch');
        Route::delete('/{id}', [TaskApiController::class, 'destroy'])->name('destroy');
        Route::put('/{id}/status', [TaskApiController::class, 'updateStatus'])->name('status');
        Route::post('/{id}/complete', [TaskApiController::class, 'complete'])->name('complete');

        // Commentaires
        Route::get('/{id}/comments', [TaskController::class, 'comments'])->name('comments');
        Route::post('/{id}/comments', [TaskController::class, 'storeComment'])->name('comments.store');
        Route::put('/{id}/comments/{cid}', [TaskController::class, 'updateComment'])->name('comments.update');
        Route::delete('/{id}/comments/{cid}', [TaskController::class, 'destroyComment'])->name('comments.destroy');

        // Sous-tâches
        Route::post('/{id}/subtasks', [TaskController::class, 'storeSubtask'])->name('subtasks.store');
        Route::put('/{id}/subtasks/{sid}', [TaskController::class, 'updateSubtask'])->name('subtasks.update');
        Route::delete('/{id}/subtasks/{sid}', [TaskController::class, 'destroySubtask'])->name('subtasks.destroy');
    });

    // ── Devices (push notifications) ─────────────────────────────────────────
    Route::prefix('devices')->name('devices.')->group(function () {
        Route::get('/', [DeviceController::class, 'index'])->name('index');
        Route::post('/', [DeviceController::class, 'register'])->name('register');
        Route::delete('/{device_id}', [DeviceController::class, 'unregister'])->name('unregister');
    });

    Route::prefix('projects')->name('projects.')->group(function () {
        Route::get('/', [ProjectController::class, 'index'])->name('index');
        Route::post('/', [ProjectController::class, 'store'])->name('store');
        Route::get('/{id}', [ProjectController::class, 'show'])->name('show');
        Route::put('/{id}', [ProjectController::class, 'update'])->name('update');
        Route::delete('/{id}', [ProjectController::class, 'destroy'])->name('destroy');
        Route::get('/{id}/gantt', [ProjectController::class, 'gantt'])->name('gantt');
        Route::get('/{id}/risk-matrix', [ProjectController::class, 'riskMatrix'])->name('risk-matrix');
        Route::post('/{id}/timesheets', [ProjectController::class, 'storeTimesheet'])->name('timesheets.store');
        Route::get('/{id}/timesheets', [ProjectController::class, 'timesheets'])->name('timesheets');
    });

    // -------------------------------------------------------------------------
    // COMMUNICATION (Vague 5)
    // -------------------------------------------------------------------------
    Route::prefix('conversations')->name('conversations.')->group(function () {
        Route::get('/', [MessageController::class, 'conversations'])->name('index');
        Route::post('/', [MessageController::class, 'createConversation'])->name('store');
        Route::get('/{id}/messages', [MessageController::class, 'messages'])->name('messages');
        Route::post('/{id}/messages', [MessageController::class, 'sendMessage'])->name('messages.store');
        Route::put('/{id}/messages/{mid}', [MessageController::class, 'updateMessage'])->name('messages.update');
        Route::delete('/{id}/messages/{mid}', [MessageController::class, 'destroyMessage'])->name('messages.destroy');
    });

    Route::prefix('circulaires')->name('circulaires.')->group(function () {
        Route::get('/', [CircularController::class, 'index'])->name('index');
        Route::post('/', [CircularController::class, 'store'])->name('store');
        Route::get('/{id}', [CircularController::class, 'show'])->name('show');
        Route::put('/{id}', [CircularController::class, 'update'])->name('update');
        Route::delete('/{id}', [CircularController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/send', [CircularController::class, 'send'])->name('send');
        Route::get('/{id}/recipients', [CircularController::class, 'recipients'])->name('recipients');
    });

    Route::prefix('contacts')->name('contacts.')->group(function () {
        Route::get('/', [ContactController::class, 'index'])->name('index');
        Route::post('/', [ContactController::class, 'store'])->name('store');
        Route::get('/{id}', [ContactController::class, 'show'])->name('show');
        Route::put('/{id}', [ContactController::class, 'update'])->name('update');
        Route::delete('/{id}', [ContactController::class, 'destroy'])->name('destroy');
    });

    // -------------------------------------------------------------------------
    // VISITEURS / RÉCEPTION (Vague 6)
    // -------------------------------------------------------------------------
    Route::prefix('visitors')->name('visitors.')->group(function () {
        Route::get('/', [VisitorController::class, 'apiIndex'])->name('index');
        Route::post('/', [VisitorController::class, 'store'])->name('store');
        Route::get('/{id}', [VisitorController::class, 'show'])->name('show');
        Route::put('/{id}', [VisitorController::class, 'update'])->name('update');
        Route::delete('/{id}', [VisitorController::class, 'destroy'])->name('destroy');
        Route::post('/check-in', [VisitorController::class, 'apiCheckin'])->name('check-in');
        Route::post('/{id}/check-out', [VisitorController::class, 'apiCheckout'])->name('check-out');
        Route::get('/{id}/badge', [VisitorController::class, 'apiBadge'])->name('badge');
        Route::get('/stats', [VisitorController::class, 'index'])->name('stats');

        // Invitations
        Route::get('/invitations', [VisitorController::class, 'apiInvitations'])->name('invitations');
        Route::post('/invitations', [VisitorController::class, 'apiCreateInvitation'])->name('invitations.store');
        Route::delete('/invitations/{id}', [VisitorController::class, 'destroyInvitation'])->name('invitations.destroy');

        // Blacklist
        Route::get('/blacklist', [VisitorController::class, 'apiBlacklist'])->name('blacklist');
        Route::post('/{id}/blacklist', [VisitorController::class, 'apiAddToBlacklist'])->name('blacklist.add');
        Route::delete('/{id}/blacklist', [VisitorController::class, 'apiRemoveFromBlacklist'])->name('blacklist.remove');
    });

    // -------------------------------------------------------------------------
    // RESSOURCES (Vague 3)
    // -------------------------------------------------------------------------
    Route::prefix('resources')->name('resources.')->group(function () {
        Route::get('/', [ResourceController::class, 'index'])->name('index');
        Route::post('/', [ResourceController::class, 'store'])->name('store');
        Route::get('/{id}', [ResourceController::class, 'show'])->name('show');
        Route::put('/{id}', [ResourceController::class, 'update'])->name('update');
        Route::delete('/{id}', [ResourceController::class, 'destroy'])->name('destroy');
        Route::get('/{id}/availability', [ResourceController::class, 'availability'])->name('availability');

        // Réservations
        Route::get('/reservations', [ResourceController::class, 'reservations'])->name('reservations');
        Route::post('/reservations', [ResourceController::class, 'createReservation'])->name('reservations.store');
        Route::get('/reservations/{id}', [ResourceController::class, 'showReservation'])->name('reservations.show');
        Route::put('/reservations/{id}', [ResourceController::class, 'updateReservation'])->name('reservations.update');
        Route::delete('/reservations/{id}', [ResourceController::class, 'cancelReservation'])->name('reservations.cancel');
        Route::post('/reservations/{id}/approve', [ResourceController::class, 'approveReservation'])->name('reservations.approve');
        Route::post('/reservations/{id}/reject', [ResourceController::class, 'rejectReservation'])->name('reservations.reject');
    });

    // -------------------------------------------------------------------------
    // FLOTTE VÉHICULES (Vague 5/9)
    // -------------------------------------------------------------------------
    Route::prefix('fleet')->name('fleet.')->group(function () {
        Route::get('/vehicles', [FleetController::class, 'vehicles'])->name('vehicles');
        Route::post('/vehicles', [FleetController::class, 'storeVehicle'])->name('vehicles.store');
        Route::get('/vehicles/{id}', [FleetController::class, 'showVehicle'])->name('vehicles.show');
        Route::put('/vehicles/{id}', [FleetController::class, 'updateVehicle'])->name('vehicles.update');
        Route::delete('/vehicles/{id}', [FleetController::class, 'destroyVehicle'])->name('vehicles.destroy');
        Route::get('/vehicles/{id}/position', [FleetController::class, 'vehiclePosition'])->name('vehicles.position');
        Route::get('/vehicles/{id}/trips', [FleetController::class, 'vehicleTrips'])->name('vehicles.trips');
        Route::post('/vehicles/{id}/assign', [FleetController::class, 'assignDriver'])->name('vehicles.assign');
        Route::get('/maintenance', [FleetController::class, 'maintenancePlanning'])->name('maintenance');
        Route::post('/maintenance', [FleetController::class, 'storeMaintenance'])->name('maintenance.store');
        Route::get('/fuel', [FleetController::class, 'fuelLogs'])->name('fuel');
        Route::post('/fuel', [FleetController::class, 'storeFuelLog'])->name('fuel.store');
        Route::get('/geofences', [FleetController::class, 'geofences'])->name('geofences');
        Route::post('/geofences', [FleetController::class, 'storeGeofence'])->name('geofences.store');
        Route::get('/map', [FleetController::class, 'liveMap'])->name('map');
        Route::get('/report', [FleetController::class, 'report'])->name('report');
    });

    // -------------------------------------------------------------------------
    // RH LÉGÈRE (Vague 4/8)
    // -------------------------------------------------------------------------
    Route::prefix('hr')->name('hr.')->group(function () {
        // Employés
        Route::get('/employees', [EmployeeController::class, 'index'])->name('employees');
        Route::post('/employees', [EmployeeController::class, 'store'])->name('employees.store');
        Route::get('/employees/{id}', [EmployeeController::class, 'show'])->name('employees.show');
        Route::put('/employees/{id}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::delete('/employees/{id}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
        Route::get('/orgchart', [HrController::class, 'orgchart'])->name('orgchart');
        Route::get('/planning', [HrController::class, 'planning'])->name('planning');

        // Congés
        Route::get('/leaves', [LeaveController::class, 'index'])->name('leaves');
        Route::post('/leaves', [LeaveController::class, 'store'])->name('leaves.store');
        Route::get('/leaves/{id}', [LeaveController::class, 'show'])->name('leaves.show');
        Route::put('/leaves/{id}', [LeaveController::class, 'update'])->name('leaves.update');
        Route::delete('/leaves/{id}', [LeaveController::class, 'destroy'])->name('leaves.destroy');
        Route::post('/leaves/{id}/approve', [LeaveController::class, 'approve'])->name('leaves.approve');
        Route::post('/leaves/{id}/reject', [LeaveController::class, 'reject'])->name('leaves.reject');
        Route::get('/leaves/calendar', [LeaveController::class, 'calendar'])->name('leaves.calendar');

        // Types de congé
        Route::get('/leave-types', [LeaveController::class, 'types'])->name('leave-types');
        Route::post('/leave-types', [LeaveController::class, 'storeType'])->name('leave-types.store');
        Route::put('/leave-types/{id}', [LeaveController::class, 'updateType'])->name('leave-types.update');
        Route::delete('/leave-types/{id}', [LeaveController::class, 'destroyType'])->name('leave-types.destroy');

        // Notes de frais
        Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses');
        Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
        Route::get('/expenses/{id}', [ExpenseController::class, 'show'])->name('expenses.show');
        Route::put('/expenses/{id}', [ExpenseController::class, 'update'])->name('expenses.update');
        Route::delete('/expenses/{id}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');
        Route::post('/expenses/{id}/approve', [ExpenseController::class, 'approve'])->name('expenses.approve');
        Route::post('/expenses/{id}/reject', [ExpenseController::class, 'reject'])->name('expenses.reject');
        Route::get('/expenses/{id}/export', [ExpenseController::class, 'export'])->name('expenses.export');
    });

    // Départements
    Route::prefix('departments')->name('departments.')->group(function () {
        Route::get('/', [HrController::class, 'departments'])->name('index');
        Route::post('/', [HrController::class, 'storeDepartment'])->name('store');
        Route::get('/{id}', [HrController::class, 'showDepartment'])->name('show');
        Route::put('/{id}', [HrController::class, 'updateDepartment'])->name('update');
        Route::delete('/{id}', [HrController::class, 'destroyDepartment'])->name('destroy');
    });

    // -------------------------------------------------------------------------
    // RAPPORTS & BI (Vague 5/9)
    // -------------------------------------------------------------------------
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/', [ReportController::class, 'index'])->name('index');
        Route::post('/', [ReportController::class, 'store'])->name('store');
        Route::get('/{id}', [ReportController::class, 'show'])->name('show');
        Route::put('/{id}', [ReportController::class, 'update'])->name('update');
        Route::delete('/{id}', [ReportController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/generate', [ReportController::class, 'generate'])->name('generate');
        Route::get('/{id}/export', [ReportController::class, 'export'])->name('export');
        Route::post('/{id}/schedule', [ReportController::class, 'schedule'])->name('schedule');
    });

    // -------------------------------------------------------------------------
    // REPORT BUILDER drag-and-drop (Vague 13)
    // -------------------------------------------------------------------------
    Route::prefix('report-builder')->name('report-builder.')->group(function () {
        Route::get('/modules', [\App\Http\Controllers\ReportBuilderController::class, 'modules'])->name('modules');
        Route::post('/preview', [\App\Http\Controllers\ReportBuilderController::class, 'preview'])->name('preview');

        // CRUD rapports
        Route::post('/reports', [\App\Http\Controllers\ReportBuilderController::class, 'store'])->name('store');
        Route::put('/reports/{id}', [\App\Http\Controllers\ReportBuilderController::class, 'update'])->name('update');
        Route::delete('/reports/{id}', [\App\Http\Controllers\ReportBuilderController::class, 'destroy'])->name('destroy');
        Route::post('/reports/{id}/duplicate', [\App\Http\Controllers\ReportBuilderController::class, 'duplicate'])->name('duplicate');

        // Exécution
        Route::post('/reports/{id}/run', [\App\Http\Controllers\ReportBuilderController::class, 'run'])->name('run');
        Route::get('/runs/{runId}/status', [\App\Http\Controllers\ReportBuilderController::class, 'runStatus'])->name('run.status');
        Route::get('/runs/{runId}/download', [\App\Http\Controllers\ReportBuilderController::class, 'download'])->name('run.download');
    });

    // -------------------------------------------------------------------------
    // IMPORT/EXPORT universel (Vague 13)
    // -------------------------------------------------------------------------
    Route::prefix('import')->name('import.')->group(function () {
        Route::get('/template/{module}', [\App\Http\Controllers\ImportController::class, 'template'])->name('template');
        Route::post('/upload', [\App\Http\Controllers\ImportController::class, 'upload'])->name('upload');
        Route::post('/{jobId}/validate', [\App\Http\Controllers\ImportController::class, 'validateImport'])->name('validate');
        Route::post('/{jobId}/start', [\App\Http\Controllers\ImportController::class, 'start'])->name('start');
        Route::get('/{jobId}/status', [\App\Http\Controllers\ImportController::class, 'status'])->name('status');
        Route::get('/{jobId}/error-report', [\App\Http\Controllers\ImportController::class, 'errorReport'])->name('error-report');
        Route::delete('/{jobId}', [\App\Http\Controllers\ImportController::class, 'destroy'])->name('destroy');
    });

    Route::prefix('bi')->name('bi.')->middleware(['permission:bi.view'])->group(function () {
        Route::get('/kpis', [BiController::class, 'kpis'])->name('kpis');
        Route::get('/correspondence', [BiController::class, 'correspondence'])->name('correspondence');
        Route::get('/tasks', [BiController::class, 'tasks'])->name('tasks');
        Route::get('/meetings', [BiController::class, 'meetings'])->name('meetings');
        Route::get('/hr', [BiController::class, 'hr'])->name('hr');
        Route::get('/visitors', [BiController::class, 'visitors'])->name('visitors');
        Route::get('/accounting', [BiController::class, 'accounting'])->name('accounting');
        Route::post('/custom', [BiController::class, 'custom'])->name('custom')->middleware('permission:bi.reports');
        Route::post('/export', [BiController::class, 'export'])->name('export')->middleware('permission:bi.export');
    });

    // -------------------------------------------------------------------------
    // COMPTABILITÉ SYSCOHADA (Vague 6/11)
    // -------------------------------------------------------------------------
    Route::prefix('accounting')->name('accounting.')->group(function () {
        Route::get('/journal', [SyscohadaController::class, 'journal'])->name('journal');
        Route::post('/journal/entries', [SyscohadaController::class, 'storeEntry'])->name('journal.store');
        Route::put('/journal/entries/{id}', [SyscohadaController::class, 'updateEntry'])->name('journal.update');
        Route::post('/journal/entries/{id}/validate', [SyscohadaController::class, 'validateEntry'])->name('journal.validate');
        Route::get('/balance', [SyscohadaController::class, 'balance'])->name('balance');
        Route::get('/balance-sheet', [SyscohadaController::class, 'balanceSheet'])->name('balance-sheet');
        Route::get('/income-statement', [SyscohadaController::class, 'incomeStatement'])->name('income-statement');
        Route::get('/general-ledger', [SyscohadaController::class, 'generalLedger'])->name('general-ledger');
        Route::get('/chart-of-accounts', [SyscohadaController::class, 'chartOfAccounts'])->name('chart-of-accounts');
        Route::get('/tax-declarations', [SyscohadaController::class, 'taxDeclarations'])->name('tax-declarations');
        Route::post('/tax-declarations/generate', [SyscohadaController::class, 'generateDeclaration'])->name('tax-declarations.generate');
        Route::get('/fiscal-years', [AccountingController::class, 'fiscalYears'])->name('fiscal-years');
        Route::post('/fiscal-years', [AccountingController::class, 'storeFiscalYear'])->name('fiscal-years.store');
        Route::post('/fiscal-years/{id}/close', [AccountingController::class, 'closeFiscalYear'])->name('fiscal-years.close');
    });

    // Paiements / Facturation
    Route::prefix('payments')->name('payments.')->group(function () {
        Route::get('/', [PaymentController::class, 'index'])->name('index');
        Route::post('/initiate', [PaymentController::class, 'initiate'])->name('initiate');
        Route::get('/{id}', [PaymentController::class, 'show'])->name('show');
        Route::get('/{id}/status', [PaymentController::class, 'status'])->name('status');
    });

    // -------------------------------------------------------------------------
    // BUDGET (Vague 11)
    // -------------------------------------------------------------------------
    Route::prefix('budget')->name('budget.')->group(function () {
        Route::get('/', [BudgetController::class, 'index'])->name('index');
        Route::post('/', [BudgetController::class, 'store'])->name('store');
        Route::get('/{id}', [BudgetController::class, 'show'])->name('show');
        Route::put('/{id}', [BudgetController::class, 'update'])->name('update');
        Route::delete('/{id}', [BudgetController::class, 'destroy'])->name('destroy');
        Route::get('/{id}/variance', [BudgetController::class, 'variance'])->name('variance');
        Route::get('/{id}/forecast', [BudgetController::class, 'forecast'])->name('forecast');
        Route::post('/{id}/lines', [BudgetController::class, 'storeLine'])->name('lines.store');
        Route::put('/{id}/lines/{lid}', [BudgetController::class, 'updateLine'])->name('lines.update');
        Route::delete('/{id}/lines/{lid}', [BudgetController::class, 'destroyLine'])->name('lines.destroy');
    });

    // -------------------------------------------------------------------------
    // ACHATS & PROCUREMENT (Vague 12)
    // -------------------------------------------------------------------------
    Route::prefix('procurement')->name('procurement.')->group(function () {
        // Demandes d'achat
        Route::get('/requests', [ProcurementController::class, 'purchaseRequests'])->name('requests');
        Route::post('/requests', [ProcurementController::class, 'storeRequest'])->name('requests.store');
        Route::get('/requests/{id}', [ProcurementController::class, 'showRequest'])->name('requests.show');
        Route::put('/requests/{id}', [ProcurementController::class, 'updateRequest'])->name('requests.update');
        Route::delete('/requests/{id}', [ProcurementController::class, 'destroyRequest'])->name('requests.destroy');
        Route::post('/requests/{id}/approve', [ProcurementController::class, 'approveRequest'])->name('requests.approve');
        Route::post('/requests/{id}/reject', [ProcurementController::class, 'rejectRequest'])->name('requests.reject');

        // Appels d'offres (RFQ)
        Route::get('/rfqs', [ProcurementController::class, 'rfqs'])->name('rfqs');
        Route::post('/rfqs', [ProcurementController::class, 'storeRfq'])->name('rfqs.store');
        Route::get('/rfqs/{id}', [ProcurementController::class, 'showRfq'])->name('rfqs.show');
        Route::put('/rfqs/{id}', [ProcurementController::class, 'updateRfq'])->name('rfqs.update');
        Route::delete('/rfqs/{id}', [ProcurementController::class, 'destroyRfq'])->name('rfqs.destroy');
        Route::post('/rfqs/{id}/send', [ProcurementController::class, 'sendRfq'])->name('rfqs.send');
        Route::post('/rfqs/{id}/close', [ProcurementController::class, 'closeRfq'])->name('rfqs.close');
        Route::post('/rfqs/{id}/select-winner', [ProcurementController::class, 'selectWinner'])->name('rfqs.winner');

        // Bons de commande
        Route::get('/orders', [ProcurementController::class, 'purchaseOrders'])->name('orders');
        Route::post('/orders', [ProcurementController::class, 'storeOrder'])->name('orders.store');
        Route::get('/orders/{id}', [ProcurementController::class, 'showOrder'])->name('orders.show');
        Route::put('/orders/{id}', [ProcurementController::class, 'updateOrder'])->name('orders.update');
        Route::delete('/orders/{id}', [ProcurementController::class, 'destroyOrder'])->name('orders.destroy');
        Route::post('/orders/{id}/approve', [ProcurementController::class, 'approveOrder'])->name('orders.approve');
        Route::post('/orders/{id}/receive', [ProcurementController::class, 'receiveOrder'])->name('orders.receive');

        // Fournisseurs
        Route::get('/suppliers', [ProcurementController::class, 'suppliers'])->name('suppliers');
        Route::post('/suppliers', [ProcurementController::class, 'storeSupplier'])->name('suppliers.store');
        Route::get('/suppliers/{id}', [ProcurementController::class, 'showSupplier'])->name('suppliers.show');
        Route::put('/suppliers/{id}', [ProcurementController::class, 'updateSupplier'])->name('suppliers.update');
        Route::delete('/suppliers/{id}', [ProcurementController::class, 'destroySupplier'])->name('suppliers.destroy');
        Route::get('/suppliers/{id}/performance', [ProcurementController::class, 'supplierPerformance'])->name('suppliers.performance');
    });

    // -------------------------------------------------------------------------
    // QUALITÉ (Vague 12)
    // -------------------------------------------------------------------------
    Route::prefix('quality')->name('quality.')->group(function () {
        Route::get('/non-conformities', [QualityController::class, 'nonconformities'])->name('nc');
        Route::post('/non-conformities', [QualityController::class, 'storeNc'])->name('nc.store');
        Route::get('/non-conformities/{id}', [QualityController::class, 'showNc'])->name('nc.show');
        Route::put('/non-conformities/{id}', [QualityController::class, 'updateNc'])->name('nc.update');
        Route::post('/non-conformities/{id}/close', [QualityController::class, 'closeNc'])->name('nc.close');
        Route::get('/indicators', [QualityController::class, 'indicators'])->name('indicators');
        Route::post('/indicators', [QualityController::class, 'storeIndicator'])->name('indicators.store');
        Route::get('/audits', [QualityController::class, 'audits'])->name('audits');
        Route::post('/audits', [QualityController::class, 'storeAudit'])->name('audits.store');
        Route::get('/audits/{id}', [QualityController::class, 'showAudit'])->name('audits.show');
        Route::put('/audits/{id}', [QualityController::class, 'updateAudit'])->name('audits.update');
        Route::get('/complaints', [QualityController::class, 'complaints'])->name('complaints');
        Route::post('/complaints', [QualityController::class, 'storeComplaint'])->name('complaints.store');
        Route::get('/complaints/{id}', [QualityController::class, 'showComplaint'])->name('complaints.show');
        Route::put('/complaints/{id}', [QualityController::class, 'updateComplaint'])->name('complaints.update');
        Route::post('/complaints/{id}/close', [QualityController::class, 'closeComplaint'])->name('complaints.close');
        Route::get('/process-map', [QualityController::class, 'processMap'])->name('process-map');
    });

    // -------------------------------------------------------------------------
    // FORMATION & E-LEARNING (Vague 7/12)
    // -------------------------------------------------------------------------
    Route::prefix('training')->name('training.')->group(function () {
        Route::get('/catalog', [TrainingController::class, 'catalog'])->name('catalog');
        Route::get('/courses', [TrainingController::class, 'courses'])->name('courses');
        Route::post('/courses', [TrainingController::class, 'storeCourse'])->name('courses.store');
        Route::get('/courses/{id}', [TrainingController::class, 'showCourse'])->name('courses.show');
        Route::put('/courses/{id}', [TrainingController::class, 'updateCourse'])->name('courses.update');
        Route::delete('/courses/{id}', [TrainingController::class, 'destroyCourse'])->name('courses.destroy');
        Route::post('/courses/{id}/enroll', [TrainingController::class, 'enroll'])->name('courses.enroll');
        Route::get('/learning-paths', [TrainingController::class, 'learningPaths'])->name('learning-paths');
        Route::get('/my-trainings', [TrainingController::class, 'myTrainings'])->name('my-trainings');
        Route::get('/certificates', [TrainingController::class, 'certificates'])->name('certificates');
        Route::post('/scorm/progress', [ScormRuntimeController::class, 'saveProgress'])->name('scorm.progress');
        Route::get('/live-sessions', [TrainingController::class, 'liveSessions'])->name('live-sessions');
        Route::post('/live-sessions', [TrainingController::class, 'storeLiveSession'])->name('live-sessions.store');
    });

    // -------------------------------------------------------------------------
    // ACADÉMIE IBIG SECRETIS — API (Section 12.4)
    // -------------------------------------------------------------------------
    Route::prefix('academy')->name('academy.')->group(function () {
        Route::post('/progress', [\App\Http\Controllers\AcademyController::class, 'markLessonComplete'])->name('progress');
        Route::post('/quiz',     [\App\Http\Controllers\AcademyController::class, 'submitQuiz'])->name('quiz');
        Route::get('/resources/{id}/download', [\App\Http\Controllers\AcademyController::class, 'downloadResource'])->name('resources.download');
        Route::get('/certificate/{uuid}/pdf',  [\App\Http\Controllers\AcademyController::class, 'downloadCertificatePdf'])->name('certificate.pdf');
    });

    // -------------------------------------------------------------------------
    // SIGNATURES ÉLECTRONIQUES (Vague 7)
    // -------------------------------------------------------------------------
    Route::prefix('signatures')->name('signatures.')->group(function () {
        Route::get('/', [SignatureController::class, 'index'])->name('index');
        Route::post('/', [SignatureController::class, 'store'])->name('store');
        Route::get('/{id}', [SignatureController::class, 'show'])->name('show');
        Route::delete('/{id}', [SignatureController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/send', [SignatureController::class, 'send'])->name('send');
        Route::get('/{id}/audit-trail', [SignatureController::class, 'auditTrail'])->name('audit-trail');
        Route::get('/{id}/certificate', [SignatureController::class, 'certificate'])->name('certificate');
    });

    // -------------------------------------------------------------------------
    // AUTOMATISATIONS (Vague 9)
    // -------------------------------------------------------------------------
    Route::prefix('automations')->name('automations.')->group(function () {
        Route::get('/', [AutomationController::class, 'index'])->name('index');
        Route::post('/', [AutomationController::class, 'store'])->name('store');
        Route::get('/{id}', [AutomationController::class, 'show'])->name('show');
        Route::put('/{id}', [AutomationController::class, 'update'])->name('update');
        Route::delete('/{id}', [AutomationController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/toggle', [AutomationController::class, 'toggle'])->name('toggle');
        Route::post('/{id}/test', [AutomationController::class, 'test'])->name('test');
        Route::get('/{id}/logs', [AutomationController::class, 'logs'])->name('logs');
    });

    // -------------------------------------------------------------------------
    // SARA — Assistant IA (Vague 8)
    // -------------------------------------------------------------------------
    Route::prefix('sara')->name('sara.')->group(function () {
        Route::post('/chat', [SaraController::class, 'chat'])->name('chat');
        Route::get('/history', [SaraController::class, 'history'])->name('history');
        Route::delete('/history', [SaraController::class, 'clearHistory'])->name('history.clear');
        Route::post('/analyze-document', [SaraController::class, 'analyzeDocument'])->name('analyze-document');
        Route::get('/suggestions', [SaraController::class, 'suggestions'])->name('suggestions');
    });

    // -------------------------------------------------------------------------
    // NOTIFICATIONS (transversal)
    // -------------------------------------------------------------------------
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/',            [NotificationController::class, 'index'])->name('index');
        Route::get('/unread-count',[NotificationController::class, 'unreadCount'])->name('unread-count');
        Route::put('/read-all',    [NotificationController::class, 'markAllRead'])->name('read-all');
        Route::post('/read-all',   [NotificationController::class, 'markAllRead'])->name('read-all.post');
        Route::put('/{id}/read',   [NotificationController::class, 'markRead'])->name('read');
        Route::post('/{id}/read',  [NotificationController::class, 'markRead'])->name('read.post');
        Route::delete('/{id}',     [NotificationController::class, 'destroy'])->name('destroy');
        Route::get('/preferences', [NotificationController::class, 'getPreferences'])->name('preferences');
        Route::put('/preferences', [NotificationController::class, 'updatePreferences'])->name('preferences.update');
    });

    // -------------------------------------------------------------------------
    // JOURNAL D'AUDIT — API
    // -------------------------------------------------------------------------
    Route::get('/audit-log', [AuditLogController::class, 'index'])
        ->name('audit-log.index')
        ->middleware('can:view.audit_logs');
    Route::get('/audit-log/export', [AuditLogController::class, 'export'])
        ->name('audit-log.export')
        ->middleware('can:export.audit_logs');

    // -------------------------------------------------------------------------
    // RECHERCHE GLOBALE
    // -------------------------------------------------------------------------
    Route::get('/search', [GlobalSearchController::class, 'search'])
        ->name('search')
        ->middleware('throttle:60,1');

    // Push Notifications (PWA)
    Route::prefix('push')->name('push.')->group(function () {
        Route::post('/subscribe', [PushNotificationController::class, 'subscribe'])->name('subscribe');
        Route::delete('/unsubscribe', [PushNotificationController::class, 'unsubscribe'])->name('unsubscribe');
    });

    // -------------------------------------------------------------------------
    // PARAMÈTRES (Vague 3/10)
    // -------------------------------------------------------------------------
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/organization', [\App\Http\Controllers\SettingsController::class, 'organization'])->name('organization');
        Route::put('/organization', [\App\Http\Controllers\SettingsController::class, 'updateOrganization'])->name('organization.update');
        Route::post('/organization/logo', [\App\Http\Controllers\SettingsController::class, 'uploadLogo'])->name('organization.logo');
        Route::get('/modules', [\App\Http\Controllers\SettingsController::class, 'modules'])->name('modules');
        Route::put('/modules', [\App\Http\Controllers\SettingsController::class, 'updateModules'])->name('modules.update');
        Route::get('/roles', [\App\Http\Controllers\SettingsController::class, 'roles'])->name('roles');
        Route::post('/roles', [\App\Http\Controllers\SettingsController::class, 'storeRole'])->name('roles.store');
        Route::put('/roles/{id}', [\App\Http\Controllers\SettingsController::class, 'updateRole'])->name('roles.update');
        Route::delete('/roles/{id}', [\App\Http\Controllers\SettingsController::class, 'destroyRole'])->name('roles.destroy');
        Route::put('/roles/{id}/permissions', [\App\Http\Controllers\SettingsController::class, 'updateRolePermissions'])->name('roles.permissions');
    });

    // Intégrations tierces
    Route::prefix('integrations')->name('integrations.')->group(function () {
        Route::get('/', [IntegrationController::class, 'index'])->name('index');
        Route::post('/{slug}/connect', [IntegrationController::class, 'connect'])->name('connect');
        Route::delete('/{slug}/disconnect', [IntegrationController::class, 'disconnect'])->name('disconnect');
        Route::get('/{slug}/test', [IntegrationController::class, 'test'])->name('test');
        Route::get('/webhooks', [IntegrationController::class, 'webhooks'])->name('webhooks');
        Route::post('/webhooks', [IntegrationController::class, 'storeWebhook'])->name('webhooks.store');
        Route::delete('/webhooks/{id}', [IntegrationController::class, 'destroyWebhook'])->name('webhooks.destroy');
        Route::get('/api-keys', [IntegrationController::class, 'apiKeys'])->name('api-keys');
        Route::post('/api-keys', [IntegrationController::class, 'createApiKey'])->name('api-keys.store');
        Route::delete('/api-keys/{id}', [IntegrationController::class, 'revokeApiKey'])->name('api-keys.revoke');
    });

    // SSO (Vague 10)
    Route::prefix('sso')->name('sso.')->group(function () {
        Route::get('/config', [SsoController::class, 'getConfig'])->name('config');
        Route::put('/config', [SsoController::class, 'updateConfig'])->name('config.update');
        Route::post('/test', [SsoController::class, 'testConnection'])->name('test');
    });

    // GDPR
    Route::prefix('gdpr')->name('gdpr.')->group(function () {
        Route::post('/export', [GdprController::class, 'requestExport'])->name('export');
        Route::post('/delete', [GdprController::class, 'requestDeletion'])->name('delete');
        Route::get('/consents', [GdprController::class, 'consents'])->name('consents');
        Route::post('/consents', [GdprController::class, 'updateConsents'])->name('consents.update');
    });

    // Consentements cookies RGPD (CookieConsent in-app)
    Route::prefix('privacy')->name('privacy.')->group(function () {
        Route::get('/consent',  [\App\Http\Controllers\Api\PrivacyController::class, 'getConsent'])->name('consent.get');
        Route::post('/consent', [\App\Http\Controllers\Api\PrivacyController::class, 'saveConsent'])->name('consent.save');
    });

    // Abonnement & Licence
    Route::prefix('subscription')->name('subscription.')->group(function () {
        Route::get('/', [SubscriptionController::class, 'current'])->name('current');
        Route::get('/plans', [SubscriptionController::class, 'plans'])->name('plans');
        Route::post('/upgrade', [SubscriptionController::class, 'upgrade'])->name('upgrade');
        Route::post('/cancel', [SubscriptionController::class, 'cancel'])->name('cancel');
        Route::get('/invoices', [SubscriptionController::class, 'invoices'])->name('invoices');
        Route::get('/invoices/{id}', [SubscriptionController::class, 'downloadInvoice'])->name('invoices.download');
    });

    Route::prefix('license')->name('license.')->group(function () {
        Route::get('/', [LicenseController::class, 'current'])->name('current');
        Route::post('/verify', [LicenseController::class, 'verify'])->name('verify');
        Route::post('/activate', [LicenseController::class, 'activate'])->name('activate');
    });

    // -------------------------------------------------------------------------
    // SUPERADMIN API — middleware superadmin
    // -------------------------------------------------------------------------
    Route::prefix('superadmin')->name('superadmin.')->middleware(['role:super_admin'])->group(function () {

        // Organisations
        Route::apiResource('organizations', SuperAdminOrganizationController::class);
        Route::post('/organizations/{id}/activate', [SuperAdminOrganizationController::class, 'activate'])->name('organizations.activate');
        Route::post('/organizations/{id}/deactivate', [SuperAdminOrganizationController::class, 'deactivate'])->name('organizations.deactivate');
        Route::post('/organizations/{id}/impersonate', [SuperAdminOrganizationController::class, 'impersonate'])->name('organizations.impersonate');
        Route::post('/organizations/{id}/reset-trial', [SuperAdminOrganizationController::class, 'resetTrial'])->name('organizations.reset-trial');
        Route::get('/organizations/{id}/usage', [SuperAdminOrganizationController::class, 'usage'])->name('organizations.usage');
        Route::get('/organizations/{id}/audit-log', [SuperAdminOrganizationController::class, 'auditLog'])->name('organizations.audit-log');

        // Licences
        Route::apiResource('licenses', SuperAdminLicenseController::class);
        Route::post('/licenses/{id}/extend', [SuperAdminLicenseController::class, 'extend'])->name('licenses.extend');
        Route::post('/licenses/{id}/regenerate', [SuperAdminLicenseController::class, 'regenerate'])->name('licenses.regenerate');
        Route::get('/licenses/check/{key}', [SuperAdminLicenseController::class, 'check'])->name('licenses.check');

        // Monitoring
        Route::get('/monitoring/health', [MonitoringApiController::class, 'health'])->name('monitoring.health');
        Route::get('/monitoring/queues', [MonitoringApiController::class, 'queues'])->name('monitoring.queues');
        Route::get('/monitoring/jobs', [MonitoringApiController::class, 'jobs'])->name('monitoring.jobs');
        Route::post('/monitoring/jobs/{id}/retry', [MonitoringApiController::class, 'retryJob'])->name('monitoring.jobs.retry');
        Route::get('/monitoring/logs', [MonitoringApiController::class, 'logs'])->name('monitoring.logs');

        // SaaS Metrics (Vague 10)
        Route::get('/saas/dashboard', [SaasMetricsController::class, 'dashboard'])->name('saas.dashboard');
        Route::get('/saas/mrr', [SaasMetricsController::class, 'mrr'])->name('saas.mrr');
        Route::get('/saas/cohorts', [SaasMetricsController::class, 'cohorts'])->name('saas.cohorts');
        Route::get('/saas/churn', [SaasMetricsController::class, 'churn'])->name('saas.churn');
        Route::get('/saas/health', [SaasMetricsController::class, 'health'])->name('saas.health');

        // Métriques SaaS consolidées — API temps réel (Vague 8 finale)
        Route::get('/metrics', [\App\Http\Controllers\SuperAdmin\MetricsController::class, 'apiMetrics'])->name('metrics.api');

        // CRM SuperAdmin (Vague 10)
        Route::get('/crm/pipeline', [SuperAdminCrmController::class, 'pipeline'])->name('crm.pipeline');
        Route::get('/crm/contacts', [SuperAdminCrmController::class, 'contacts'])->name('crm.contacts');
        Route::post('/crm/contacts', [SuperAdminCrmController::class, 'storeContact'])->name('crm.contacts.store');
        Route::get('/crm/analytics', [SuperAdminCrmController::class, 'analytics'])->name('crm.analytics');

        // Support & Feature Flags
        Route::get('/support/tickets', [SuperAdminSupportController::class, 'index'])->name('support.tickets');
        Route::get('/support/tickets/{id}', [SuperAdminSupportController::class, 'show'])->name('support.tickets.show');
        Route::put('/support/tickets/{id}', [SuperAdminSupportController::class, 'update'])->name('support.tickets.update');
        Route::apiResource('feature-flags', FeatureFlagController::class)->names('feature-flags');
        Route::post('/announcements', [\App\Http\Controllers\SuperAdmin\AnnouncementController::class, 'store'])->name('announcements.store');
        Route::get('/announcements', [\App\Http\Controllers\SuperAdmin\AnnouncementController::class, 'index'])->name('announcements.index');

        // Dashboard & Stats raccourcis (compatibilité frontend)
        Route::get('/dashboard', [\App\Http\Controllers\SuperAdmin\DashboardController::class, 'apiDashboard'])->name('dashboard');
        Route::get('/stats', [\App\Http\Controllers\SuperAdmin\MetricsController::class, 'apiMetrics'])->name('stats');
    });
});

// =============================================================================
// API PUBLIQUE — Pas d'authentification requise
// =============================================================================

use App\Http\Controllers\Public\PublicController;

Route::prefix('public')->name('public.')->middleware(['throttle:public'])->group(function () {
    Route::post('/demo-request', [PublicController::class, 'demoRequest'])->name('demo-request');
    Route::post('/newsletter',   [PublicController::class, 'newsletter'])->name('newsletter');
});

// =============================================================================
// API PARTENAIRES — OAuth2 (scope-based)
// /api/partner/v1
// =============================================================================

Route::prefix('partner/v1')->name('partner.')->middleware([
    'auth.partner',
    'throttle:partner',
    'api.log',
])->group(function () {
    Route::get('/events', [PartnerApiController::class, 'events'])->name('events');
    Route::post('/events', [PartnerApiController::class, 'storeEvent'])->name('events.store');
    Route::get('/tasks', [PartnerApiController::class, 'tasks'])->name('tasks');
    Route::post('/tasks', [PartnerApiController::class, 'storeTask'])->name('tasks.store');
    Route::get('/users', [PartnerApiController::class, 'users'])->name('users');
    Route::get('/documents', [PartnerApiController::class, 'documents'])->name('documents');
    Route::post('/documents', [PartnerApiController::class, 'uploadDocument'])->name('documents.store');
    Route::get('/contacts', [PartnerApiController::class, 'contacts'])->name('contacts');
    Route::post('/webhook-subscribe', [PartnerApiController::class, 'subscribeWebhook'])->name('webhook.subscribe');
    Route::delete('/webhook-subscribe/{id}', [PartnerApiController::class, 'unsubscribeWebhook'])->name('webhook.unsubscribe');
});

// ─── SARA Chat API ────────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('sara')->name('api.sara.')->group(function () {
    Route::post('/chat', [\App\Http\Controllers\SaraChatController::class, 'chat'])
        ->middleware('throttle:20,1')
        ->name('chat');
    Route::get('/conversations', [\App\Http\Controllers\SaraChatController::class, 'conversations'])->name('conversations');
    Route::get('/conversations/{conversation}', [\App\Http\Controllers\SaraChatController::class, 'conversation'])->name('conversation');
    Route::delete('/conversations/{conversation}', [\App\Http\Controllers\SaraChatController::class, 'deleteConversation'])->name('conversation.delete');
    Route::post('/conversations/{conversation}/feedback', [\App\Http\Controllers\SaraChatController::class, 'feedback'])->name('feedback');
});

// ─── Cas pratiques API ────────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->prefix('practical-cases')->name('api.practical-cases.')->group(function () {
    Route::post('/{practicalCase}/complete', [\App\Http\Controllers\PracticalCasesController::class, 'complete'])->name('complete');
    Route::get('/progress', [\App\Http\Controllers\PracticalCasesController::class, 'progress'])->name('progress');
});

// ─── IBIG PARTNERS API ────────────────────────────────────────────────────────

// Public — Inscription depuis la landing page (sans session)
Route::post('/partners/register', [\App\Http\Controllers\PartnerController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('api.partner.store');

// Authentifié — Rapport mensuel partenaire
Route::middleware('auth:sanctum')->prefix('partner')->name('api.partner.')->group(function () {
    Route::get('/report/{month}', [\App\Http\Controllers\PartnerController::class, 'monthlyReport'])->name('report');
});

// SARA — assistante IA publique (landing + app)
Route::post('/sara/chat', [SaraChatController::class, 'chat'])->middleware('throttle:30,1');


// ── §19 : preuve de paiement, validation admin, reçu PDF ──
Route::middleware(['auth:sanctum'])->prefix('v1/payments')->name('api.v1.payments.')->group(function () {
    Route::post('/{id}/proof', [\App\Http\Controllers\PaymentController::class, 'uploadProof'])->name('proof');
    Route::get('/history', [\App\Http\Controllers\PaymentController::class, 'history'])->name('history');
    Route::get('/{id}/invoice', [\App\Http\Controllers\PaymentController::class, 'generateInvoice'])->name('invoice');
    Route::post('/{id}/validate', [\App\Http\Controllers\PaymentController::class, 'adminValidate'])
        ->middleware('role:super_admin')->name('validate');
    Route::post('/{id}/reject', [\App\Http\Controllers\PaymentController::class, 'adminReject'])
        ->middleware('role:super_admin')->name('reject');
});

// Dashboard API routes
Route::middleware(["auth:sanctum"])->prefix("dashboard")->name("api.dashboard.")->group(function () {
    Route::get("/kpis", [App\Http\Controllers\DashboardController::class, "apiKpis"])->name("kpis");
    Route::get("/trends", [App\Http\Controllers\DashboardController::class, "apiTrends"])->name("trends");
    Route::get("/heatmap", [App\Http\Controllers\DashboardController::class, "apiHeatmap"])->name("heatmap");
});
