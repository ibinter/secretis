<?php

namespace App\Providers;

/**
 * =============================================================================
 * IBIG SECRETIS ERP — Application Service Provider
 * =============================================================================
 * Fichier : app/Providers/AppServiceProvider.php
 * Version : 1.0.0
 * Auteur  : IBIG SOFT
 *
 * Provider principal de l'application. Enregistre :
 *   - Bindings de l'IoC Container (repositories, services)
 *   - Observers de modèles (cache invalidation, audit)
 *   - Event listeners
 *   - Macros Eloquent et Collection
 *   - Validations personnalisées
 *   - Configuration globale
 * =============================================================================
 */

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

// Modèles
use App\Models\AccountingClient;
use App\Models\AccountingExpense;
use App\Models\Calendar;
use App\Models\DocumentSignature;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\Event as CalendarEvent;
use App\Models\ExpenseReport;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\MailRegistry;
use App\Models\Meeting;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Prospect;
use App\Models\Quote;
use App\Models\Room;
use App\Models\RoomReservation;
use App\Models\SignatureRequest;
use App\Models\Supply;
use App\Models\Task;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\WebhookEndpoint;

// Observer
use App\Observers\CacheInvalidationObserver;

// Services
use App\Services\AccountingService;
use App\Services\AgendaService;
use App\Services\AuditService;
use App\Services\BiService;
use App\Services\CacheService;
use App\Services\CourrierService;
use App\Services\CurrencyService;
use App\Services\DocumentService;
use App\Services\GdprService;
use App\Services\GoogleCalendarService;
use App\Services\LdapService;
use App\Services\LeaveService;
use App\Services\LicenseService;
use App\Services\MeetingService;
use App\Services\MicrosoftAuthService;
use App\Services\MonitoringService;
use App\Services\NotificationService;
use App\Services\OcrService;
use App\Services\OhadaService;
use App\Services\ProjectService;
use App\Services\PushNotificationService;
use App\Services\ReportService;
use App\Services\ResourceService;
use App\Services\SaraService;
use App\Services\SecurityService;
use App\Services\SignatureService;
use App\Services\SmartAgendaService;
use App\Services\SmartNotificationService;
use App\Services\StatisticsService;
use App\Services\TaskService;
use App\Services\TrainingService;
use App\Services\TrialService;
use App\Services\VisitorService;
use App\Services\WebhookVerifier;
use App\Services\WhatsAppService;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Enregistrement des services dans le container IoC.
     * Appelé AVANT boot() — pas d'accès aux services d'autres providers.
     */
    public function register(): void
    {
        $this->registerServices();
        $this->registerRepositories();
        $this->registerSingletons();
    }

    /**
     * Bootstrap des services après l'enregistrement complet.
     * Appelé APRÈS tous les providers — accès à tous les services disponible.
     */
    public function boot(): void
    {
        $this->configureModels();
        $this->registerObservers();
        $this->registerEventListeners();
        $this->registerValidators();
        $this->registerMacros();
        $this->configureUrls();
        $this->configureGates();
        $this->registerLoggingHooks();
    }

    // =========================================================================
    // ENREGISTREMENT DES SERVICES
    // =========================================================================

    /**
     * Lie les interfaces de services aux implémentations concrètes.
     * Utilise bind() pour que chaque requête reçoive une nouvelle instance.
     */
    private function registerServices(): void
    {
        // Services métier (une instance par requête)
        $services = [
            AccountingService::class,
            AgendaService::class,
            AuditService::class,
            BiService::class,
            CacheService::class,
            CourrierService::class,
            CurrencyService::class,
            DocumentService::class,
            GdprService::class,
            GoogleCalendarService::class,
            LdapService::class,
            LeaveService::class,
            LicenseService::class,
            MeetingService::class,
            MicrosoftAuthService::class,
            MonitoringService::class,
            NotificationService::class,
            OcrService::class,
            OhadaService::class,
            ProjectService::class,
            PushNotificationService::class,
            ReportService::class,
            ResourceService::class,
            SaraService::class,
            SecurityService::class,
            SignatureService::class,
            SmartAgendaService::class,
            SmartNotificationService::class,
            StatisticsService::class,
            TaskService::class,
            TrainingService::class,
            TrialService::class,
            VisitorService::class,
            WebhookVerifier::class,
            WhatsAppService::class,
        ];

        foreach ($services as $service) {
            $this->app->bind($service, fn($app) => new $service());
        }
    }

    /**
     * Repositories — pattern Repository pour l'accès aux données.
     * Permet de découpler la logique métier de la persistance.
     */
    private function registerRepositories(): void
    {
        // À étendre avec les interfaces/implémentations si le pattern
        // Repository est adopté. Actuellement, services directs sur Eloquent.
    }

    /**
     * Singletons — une instance unique pour tout le cycle de vie de la requête.
     */
    private function registerSingletons(): void
    {
        // AuditService partagé (un seul buffer de logs par requête)
        $this->app->singleton(AuditService::class, fn($app) => new AuditService());

        // CacheService partagé (une seule connexion Redis par requête)
        $this->app->singleton(CacheService::class, fn($app) => new CacheService());

        // MonitoringService partagé (collecte métriques de toute la requête)
        $this->app->singleton(MonitoringService::class, fn($app) => new MonitoringService());

        // LicenseService partagé (cache de licence chargé une seule fois)
        $this->app->singleton(LicenseService::class, fn($app) => new LicenseService());
    }

    // =========================================================================
    // CONFIGURATION DES MODÈLES ELOQUENT
    // =========================================================================

    private function configureModels(): void
    {
        // En production : désactive les propriétés non déclarées dans $fillable/$guarded
        // pour détecter les bugs de masse assignment silencieux
        Model::preventSilentlyDiscardingAttributes(
            $this->app->isLocal()
        );

        // Désactive le lazy loading en développement pour détecter les N+1
        Model::preventLazyLoading(
            $this->app->isLocal() || $this->app->runningUnitTests()
        );

        // Désactive le wrapping JSON des Resources (API plus propre)
        JsonResource::withoutWrapping();
    }

    // =========================================================================
    // OBSERVATEURS DE MODÈLES
    // =========================================================================

    /**
     * CacheInvalidationObserver est appliqué à TOUS les modèles métier.
     * Il écoute created/updated/deleted et invalide les clés de cache pertinentes.
     *
     * Chaque modèle peut surcharger les clés via la méthode cacheKeys().
     */
    private function registerObservers(): void
    {
        $modelsWithCacheInvalidation = [
            // Core
            Organization::class,
            User::class,

            // Agenda & Événements
            Calendar::class,
            CalendarEvent::class,
            Meeting::class,
            Room::class,
            RoomReservation::class,

            // Documents & Courriers
            MailRegistry::class,
            SignatureRequest::class,
            DocumentSignature::class,

            // RH & Congés
            Employee::class,
            LeaveRequest::class,

            // Comptabilité & Finances
            Invoice::class,
            Payment::class,
            AccountingClient::class,
            AccountingExpense::class,
            Quote::class,
            ExpenseReport::class,

            // CRM & Prospection
            Prospect::class,

            // Projets & Tâches
            Task::class,

            // Logistique
            Vehicle::class,
            Equipment::class,
            Supply::class,

            // Intégrations
            WebhookEndpoint::class,
        ];

        foreach ($modelsWithCacheInvalidation as $model) {
            $model::observe(CacheInvalidationObserver::class);
        }
    }

    // =========================================================================
    // ÉCOUTEURS D'ÉVÉNEMENTS
    // =========================================================================

    private function registerEventListeners(): void
    {
        // Authentification
        Event::listen(
            \Illuminate\Auth\Events\Login::class,
            \App\Listeners\LogSuccessfulLogin::class,
        );

        Event::listen(
            \Illuminate\Auth\Events\Failed::class,
            \App\Listeners\LogFailedLogin::class,
        );

        Event::listen(
            \Illuminate\Auth\Events\Logout::class,
            \App\Listeners\LogSuccessfulLogout::class,
        );

        // Organisations
        Event::listen(
            \App\Events\OrganizationCreated::class,
            [
                \App\Listeners\SendWelcomeEmail::class,
                \App\Listeners\StartTrialPeriod::class,
                \App\Listeners\CreateDefaultRoles::class,
                \App\Listeners\SetupDefaultModules::class,
            ]
        );

        Event::listen(
            \App\Events\OrganizationSuspended::class,
            \App\Listeners\NotifyOrganizationSuspended::class,
        );

        // Paiements & Abonnements
        Event::listen(
            \App\Events\SubscriptionRenewed::class,
            \App\Listeners\SendSubscriptionConfirmation::class,
        );

        Event::listen(
            \App\Events\SubscriptionExpired::class,
            \App\Listeners\HandleSubscriptionExpiry::class,
        );

        // Signature électronique
        Event::listen(
            \App\Events\DocumentSigned::class,
            [
                \App\Listeners\NotifySignatureComplete::class,
                \App\Listeners\UpdateAuditTrail::class,
            ]
        );

        // GDPR / Conformité
        Event::listen(
            \App\Events\GdprRequestCreated::class,
            \App\Listeners\NotifyGdprRequest::class,
        );

        // Webhooks sortants
        Event::listen(
            \App\Events\WebhookTriggered::class,
            \App\Listeners\DispatchWebhookDelivery::class,
        );
    }

    // =========================================================================
    // VALIDATEURS PERSONNALISÉS
    // =========================================================================

    private function registerValidators(): void
    {
        // Validation de numéro de téléphone africain (UEMOA/CEDEAO)
        Validator::extend('african_phone', function ($attribute, $value, $parameters, $validator) {
            return preg_match('/^\+?[1-9]\d{7,14}$/', preg_replace('/[\s\-\(\)]/', '', $value));
        }, 'Le numéro de téléphone n\'est pas valide.');

        // Validation SIRET/RCCM (numéro d'entreprise Afrique de l'Ouest)
        Validator::extend('rccm', function ($attribute, $value, $parameters, $validator) {
            return preg_match('/^[A-Z]{2}-[A-Z]{3}-\d{4}-[A-Z]\d{2}-\d{4,6}$/i', $value);
        }, 'Le numéro RCCM n\'est pas valide (format : CI-ABJ-2024-B12-00001).');

        // Validation de devise OHADA
        Validator::extend('ohada_currency', function ($attribute, $value, $parameters, $validator) {
            return in_array($value, array_keys(config('secretis.currencies', [])));
        }, 'La devise n\'est pas supportée par SECRETIS.');

        // Validation de slug d'organisation (URL-safe)
        Validator::extend('org_slug', function ($attribute, $value, $parameters, $validator) {
            return preg_match('/^[a-z0-9][a-z0-9\-]{2,62}[a-z0-9]$/', $value);
        }, 'L\'identifiant d\'organisation doit contenir 4-64 caractères alphanumériques minuscules et tirets.');

        // Fichier non exécutable (sécurité uploads)
        Validator::extend('not_executable', function ($attribute, $value, $parameters, $validator) {
            if (!($value instanceof \Illuminate\Http\UploadedFile)) {
                return true;
            }
            $dangerousExtensions = ['php', 'phtml', 'php3', 'php4', 'php5', 'phps',
                                    'exe', 'sh', 'bat', 'cmd', 'ps1', 'jar', 'py',
                                    'rb', 'pl', 'asp', 'aspx', 'js', 'vbs', 'wsf'];
            $extension = strtolower($value->getClientOriginalExtension());
            return !in_array($extension, $dangerousExtensions);
        }, 'Ce type de fichier n\'est pas autorisé pour des raisons de sécurité.');
    }

    // =========================================================================
    // MACROS
    // =========================================================================

    private function registerMacros(): void
    {
        // Collection::toCsv() — export CSV direct depuis une collection Eloquent
        \Illuminate\Support\Collection::macro('toCsv', function (array $headers = []) {
            $rows = $this->toArray();
            if (empty($rows)) {
                return '';
            }
            $columns = $headers ?: array_keys((array) $rows[0]);
            $csv = implode(',', array_map(fn($h) => '"' . $h . '"', $columns)) . "\n";
            foreach ($rows as $row) {
                $row = (array) $row;
                $csv .= implode(',', array_map(
                    fn($v) => '"' . str_replace('"', '""', $v ?? '') . '"',
                    array_intersect_key($row, array_flip($columns))
                )) . "\n";
            }
            return $csv;
        });

        // Str::slugOrganization() — génère un slug unique pour une organisation
        Str::macro('slugOrganization', function (string $name): string {
            $base = Str::slug($name, '-');
            $base = Str::limit($base, 50, '');
            $exists = Organization::where('slug', $base)->exists();
            if (!$exists) {
                return $base;
            }
            $suffix = 2;
            while (Organization::where('slug', $base . '-' . $suffix)->exists()) {
                $suffix++;
            }
            return $base . '-' . $suffix;
        });

        // Request::organizationId() — raccourci pour obtenir l'ID du tenant courant
        \Illuminate\Http\Request::macro('organizationId', function (): ?int {
            return $this->get('_organization_id') ?? optional(auth()->user())->organization_id;
        });
    }

    // =========================================================================
    // CONFIGURATION DES URLS
    // =========================================================================

    private function configureUrls(): void
    {
        // Forcer HTTPS en production
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }

    // =========================================================================
    // GATES (POLITIQUES D'ACCÈS GLOBALES)
    // =========================================================================

    private function configureGates(): void
    {
        // Super-admin : accès total (bypass toutes les policies)
        Gate::before(function (User $user, string $ability): ?bool {
            if ($user->hasRole('super-admin')) {
                return true;
            }
            return null; // Continuer l'évaluation normale
        });
    }

    // =========================================================================
    // HOOKS DE LOGGING
    // =========================================================================

    private function registerLoggingHooks(): void
    {
        // Log les requêtes SQL lentes en développement (> 100ms)
        if ($this->app->isLocal()) {
            DB::listen(function ($query) {
                if ($query->time > 100) {
                    Log::channel('query')->warning('Requête SQL lente détectée', [
                        'sql'      => $query->sql,
                        'bindings' => $query->bindings,
                        'time_ms'  => $query->time,
                    ]);
                }
            });
        }
    }
}
