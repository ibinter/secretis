# IBIG SECRETIS ERP — Architecture applicative

## 1. Paradigme architectural : Domain-Driven Design (DDD)

SECRETIS adopte une architecture **Domain-Driven Design** combinée avec le pattern **Action/Service/Repository** pour chaque module métier. Ce choix garantit :

- **Isolation** : chaque domaine est indépendant et testable séparément
- **Extensibilité** : ajout de modules sans impacter l'existant
- **Lisibilité** : le code reflète le vocabulaire métier du secrétariat africain
- **Scalabilité** : migration progressive vers des microservices si nécessaire

---

## 2. Les 10 modules métier

### Module 1 — Agenda
**Responsabilité** : Gestion des rendez-vous, événements, réunions planifiées et synchronisation de calendriers.

```
Domain/Agenda/
├── Models/
│   ├── Event          — Événement calendrier (RDV, réunion, rappel)
│   ├── EventAttendee  — Participants à un événement
│   └── EventReminder  — Rappels configurés
├── Actions/
│   ├── CreateEventAction    — Créer un événement avec validation métier
│   ├── UpdateEventAction    — Modifier, gérer les conflits de plage horaire
│   ├── DeleteEventAction    — Suppression avec notification des participants
│   └── SyncCalendarAction   — Sync bidirectionnelle Google/Outlook Calendar
├── Services/
│   ├── AgendaService        — Orchestration CRUD + gestion des conflits
│   └── ReminderService      — Planification des rappels via Queue
└── Repositories/
    ├── EventRepositoryInterface
    └── EloquentEventRepository
```

**Events broadcast** : `EventCreated`, `EventUpdated`, `EventCancelled`

---

### Module 2 — Courrier / GED
**Responsabilité** : Réception, enregistrement, circulation et archivage du courrier entrant/sortant. Gestion Électronique de Documents (GED).

```
Domain/Courrier/
├── Models/
│   ├── Courrier         — Courrier (entrant/sortant/interne)
│   ├── Document         — Document numérisé attaché
│   ├── DocumentVersion  — Versioning des documents
│   └── CourrierTracking — Historique de circulation
├── Actions/
│   ├── CreateCourrierAction    — Enregistrement avec numéro automatique
│   ├── AssignCourrierAction    — Attribution à un agent/service
│   ├── ArchiveCourrierAction   — Archivage avec indexation
│   └── ClassifyDocumentAction  — Classification par type/thème
├── Services/
│   ├── CourrierService   — Logique métier courrier
│   ├── GEDService        — Indexation, recherche full-text
│   └── OCRService        — Extraction texte via Tesseract/API IA
└── Repositories/
    ├── CourrierRepositoryInterface
    └── EloquentCourrierRepository
```

**Numérotation automatique** : `{ANNÉE}/{MOIS}/{SÉQUENCE}` — ex: `2025/07/00142`

---

### Module 3 — Réunions
**Responsabilité** : Planification, convocation, ordre du jour, procès-verbaux et suivi des décisions.

```
Domain/Reunions/
├── Models/
│   ├── Reunion          — Réunion (type, date, lieu, statut)
│   ├── ReunionParticipant — Liste des convoqués avec statut présence
│   ├── PointODJ         — Point à l'ordre du jour
│   └── ProcesVerbal     — PV généré automatiquement
├── Actions/
│   ├── CreateReunionAction    — Création + envoi des convocations
│   ├── GenerateODJAction      — Génération de l'ordre du jour PDF
│   └── GeneratePVAction       — Génération PV depuis les notes de réunion
├── Services/
│   ├── ReunionService         — Orchestration workflow réunion
│   └── PVGeneratorService     — Génération PDF enrichie (DOMPDF + IA)
```

---

### Module 4 — Tâches
**Responsabilité** : Création, assignation, suivi et priorisation des tâches de bureau. Kanban intégré.

```
Domain/Taches/
├── Models/
│   ├── Tache           — Tâche (titre, priorité, deadline, statut)
│   ├── TacheComment    — Commentaires collaboratifs
│   └── TacheAttachment — Fichiers joints
├── Actions/
│   ├── CreateTacheAction      — Création avec règles de priorité
│   ├── AssignTacheAction      — Attribution + notification temps réel
│   └── UpdateProgressAction   — Mise à jour statut (Kanban)
├── Services/
│   └── TacheService    — Logique de priorisation, délais, escalade
```

**Statuts Kanban** : `todo` → `en_cours` → `revue` → `termine` | `bloque`

---

### Module 5 — Communication
**Responsabilité** : Messagerie interne en temps réel, canaux thématiques, notifications.

```
Domain/Communication/
├── Models/
│   ├── Message       — Message (texte, fichier, mention)
│   ├── Channel       — Canal de communication (équipe, projet, général)
│   ├── ChannelMember — Membres d'un canal avec rôle
│   └── Notification  — Notifications système et utilisateur
├── Actions/
│   ├── SendMessageAction      — Envoi avec broadcast Reverb
│   ├── CreateChannelAction    — Création canal + invitation membres
│   └── SendNotificationAction — Notification push/mail/in-app
├── Services/
│   ├── MessagingService       — WebSocket via Laravel Reverb
│   └── NotificationService    — Stratégie multi-canal (mail, push, SMS)
```

**Channels Reverb** : `tenant.{org_id}.general`, `user.{user_id}.notifications`

---

### Module 6 — Accueil
**Responsabilité** : Gestion des visiteurs, rendez-vous d'accueil, badges temporaires.

```
Domain/Accueil/
├── Models/
│   ├── Visiteur      — Visiteur (identité, motif, hôte)
│   ├── Rendez_vous   — RDV d'accueil
│   └── BadgeVisiteur — Badge numérique temporaire
├── Actions/
│   ├── RegisterVisitorAction  — Enregistrement + alerte à l'hôte
│   └── CheckOutVisitorAction  — Sortie + archivage
├── Services/
│   └── AccueilService         — Workflow accueil + statistiques
```

---

### Module 7 — Ressources
**Responsabilité** : Réservation de salles, véhicules, matériels et équipements.

```
Domain/Ressources/
├── Models/
│   ├── Ressource          — Ressource (salle, véhicule, matériel)
│   ├── Reservation        — Réservation avec plage horaire
│   └── RessourceCategorie — Catégorie de ressource
├── Actions/
│   ├── ReserveResourceAction  — Réservation avec vérification disponibilité
│   └── ReleaseResourceAction  — Libération anticipée
├── Services/
│   └── RessourceService       — Gestion conflits, planning, statistiques
```

---

### Module 8 — Ressources Humaines
**Responsabilité** : Annuaire du personnel, congés, présences, organigramme.

```
Domain/RH/
├── Models/
│   ├── Employee    — Employé (profil complet)
│   ├── Department  — Département/Service
│   ├── Leave       — Congé (type, dates, statut)
│   └── Attendance  — Présence/Pointage
├── Actions/
│   ├── CreateEmployeeAction      — Création fiche employé + compte User
│   ├── RecordLeaveAction         — Demande de congé + workflow validation
│   └── ProcessAttendanceAction   — Enregistrement présence
├── Services/
│   └── RHService   — Calculs, organigramme, statistiques RH
```

---

### Module 9 — Rapports
**Responsabilité** : Tableaux de bord, indicateurs de performance, exports et rapports périodiques.

```
Domain/Rapports/
├── Models/
│   ├── Report         — Rapport sauvegardé
│   └── ReportSchedule — Rapport planifié (quotidien/hebdo/mensuel)
├── Actions/
│   ├── GenerateReportAction  — Génération à la demande
│   └── ExportReportAction    — Export PDF/Excel/CSV
├── Services/
│   ├── ReportService   — Agrégation de données multi-modules
│   └── ExportService   — Formatage et mise en page
```

---

### Module 10 — Paramètres
**Responsabilité** : Configuration de l'organisation, modules activés, utilisateurs, rôles et permissions.

```
Domain/Parametres/
├── Models/
│   ├── OrganizationSetting — Paramètres spécifiques à l'organisation
│   └── SystemSetting       — Paramètres système globaux (superadmin)
├── Actions/
│   └── UpdateSettingsAction  — Mise à jour avec validation et cache
├── Services/
│   └── SettingsService       — Lecture cached, broadcast aux clients
```

---

## 3. Stratégie multi-tenant

### Approche choisie : Single Database avec `organization_id`

Toutes les tables métier portent une colonne `organization_id` (clé étrangère vers `organizations`). Cette approche est la plus adaptée pour SECRETIS car :

- Simple à maintenir et déployer
- Requêtes cross-tenant possibles pour le superadmin
- Pas de complexité de gestion de schémas multiples
- Adapté au volume prévu (centaines d'organisations)

### Trait BelongsToTenant

```php
// app/Support/Traits/BelongsToTenant.php

namespace App\Support\Traits;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

trait BelongsToTenant
{
    use UsesTenantConnection;

    protected static function bootBelongsToTenant(): void
    {
        // Scoping automatique au tenant courant
        static::addGlobalScope('tenant', function (Builder $builder) {
            if ($tenant = app('currentTenant')) {
                $builder->where('organization_id', $tenant->id);
            }
        });

        // Injection automatique de organization_id à la création
        static::creating(function ($model) {
            if (empty($model->organization_id) && $tenant = app('currentTenant')) {
                $model->organization_id = $tenant->id;
            }
        });
    }

    public function organization(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
```

### Modèle Organization (Tenant)

```php
// app/Models/Organization.php

namespace App\Models;

use Spatie\Multitenancy\Models\Tenant;

class Organization extends Tenant
{
    protected $fillable = [
        'name', 'slug', 'domain', 'email', 'phone',
        'country', 'city', 'address',
        'plan_id', 'license_id',
        'trial_ends_at', 'subscription_ends_at',
        'is_active', 'settings', 'logo_path',
        'max_users', 'timezone', 'locale',
    ];

    protected $casts = [
        'settings'             => 'array',
        'trial_ends_at'        => 'datetime',
        'subscription_ends_at' => 'datetime',
        'is_active'            => 'boolean',
    ];

    public function plan(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function license(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscription_ends_at && $this->subscription_ends_at->isFuture();
    }

    public function hasModuleAccess(string $module): bool
    {
        $plan = $this->plan;
        if (!$plan) return false;

        $allowedModules = $plan->modules ?? [];
        return in_array($module, $allowedModules);
    }
}
```

---

## 4. Middleware

### 4.1 CheckLicenseMiddleware
```php
// app/Http/Middleware/CheckLicenseMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckLicenseMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        $organization = app('currentTenant');

        if (!$organization) {
            return response()->json(['error' => 'Tenant non identifié'], 403);
        }

        if (!$organization->is_active) {
            return response()->json([
                'error' => 'Organisation désactivée',
                'reason' => 'account_disabled',
            ], 403);
        }

        if (!$organization->isOnTrial() && !$organization->hasActiveSubscription()) {
            return response()->json([
                'error' => 'Abonnement expiré',
                'reason' => 'subscription_expired',
                'redirect' => route('billing.renew'),
            ], 402);
        }

        return $next($request);
    }
}
```

### 4.2 SetTenantMiddleware
```php
// app/Http/Middleware/SetTenantMiddleware.php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;

class SetTenantMiddleware
{
    public function handle(Request $request, Closure $next): mixed
    {
        // Résolution du tenant via sous-domaine ou header
        $host = $request->getHost();
        $subdomain = explode('.', $host)[0];

        $organization = Organization::where('slug', $subdomain)
            ->orWhere('domain', $host)
            ->firstOrFail();

        $organization->makeCurrent();
        app()->instance('currentTenant', $organization);

        return $next($request);
    }
}
```

### 4.3 CheckRBACMiddleware
```php
// app/Http/Middleware/CheckRBACMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRBACMiddleware
{
    public function handle(Request $request, Closure $next, string $permission): mixed
    {
        $user = $request->user();

        if (!$user || !$user->hasPermissionTo($permission)) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Permission refusée'], 403);
            }
            return redirect()->route('dashboard')
                ->with('error', "Vous n'avez pas la permission : {$permission}");
        }

        return $next($request);
    }
}
```

### 4.4 CheckModuleAccessMiddleware
```php
// app/Http/Middleware/CheckModuleAccessMiddleware.php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckModuleAccessMiddleware
{
    public function handle(Request $request, Closure $next, string $module): mixed
    {
        $organization = app('currentTenant');

        if (!$organization->hasModuleAccess($module)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => "Module '{$module}' non disponible dans votre plan",
                    'upgrade_url' => route('billing.plans'),
                ], 403);
            }
            return redirect()->route('dashboard')
                ->with('warning', "Le module {$module} n'est pas inclus dans votre plan.");
        }

        return $next($request);
    }
}
```

### 4.5 HandleInertiaRequests
```php
// app/Http/Middleware/HandleInertiaRequests.php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $organization = app('currentTenant');

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id'          => $user->id,
                    'name'        => $user->name,
                    'email'       => $user->email,
                    'avatar'      => $user->avatar_url,
                    'roles'       => $user->getRoleNames(),
                    'permissions' => $user->getAllPermissions()->pluck('name'),
                ] : null,
            ],
            'organization' => $organization ? [
                'id'      => $organization->id,
                'name'    => $organization->name,
                'slug'    => $organization->slug,
                'plan'    => $organization->plan?->slug,
                'modules' => $organization->plan?->modules ?? [],
                'locale'  => $organization->locale,
                'logo'    => $organization->logo_url,
            ] : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
            ],
            'ziggy' => fn () => [
                ...(new \Tightenco\Ziggy\Ziggy)->toArray(),
                'location' => $request->url(),
            ],
        ]);
    }
}
```

---

## 5. Service Providers

### 5.1 TenancyServiceProvider
```php
// app/Providers/TenancyServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Spatie\Multitenancy\Models\Tenant;

class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Binding de l'interface tenant
        $this->app->bind('currentTenant', fn () => Tenant::current());
    }

    public function boot(): void
    {
        // Résolution automatique du tenant dans les jobs
        \Illuminate\Queue\Events\JobProcessing::class;
    }
}
```

### 5.2 RepositoryServiceProvider
```php
// app/Providers/RepositoryServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

// Imports interfaces et implémentations
use App\Domain\Agenda\Repositories\EventRepositoryInterface;
use App\Domain\Agenda\Repositories\EloquentEventRepository;
use App\Domain\Courrier\Repositories\CourrierRepositoryInterface;
use App\Domain\Courrier\Repositories\EloquentCourrierRepository;
// ... autres modules

class RepositoryServiceProvider extends ServiceProvider
{
    public array $bindings = [
        EventRepositoryInterface::class    => EloquentEventRepository::class,
        CourrierRepositoryInterface::class => EloquentCourrierRepository::class,
        // ... binding de tous les repositories
    ];
}
```

### 5.3 ModuleServiceProvider
```php
// app/Providers/ModuleServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    protected array $modules = [
        'agenda', 'courrier', 'reunions', 'taches',
        'communication', 'accueil', 'ressources',
        'rh', 'rapports', 'parametres',
    ];

    public function boot(): void
    {
        foreach ($this->modules as $module) {
            $routeFile = base_path("routes/modules/{$module}.php");
            if (file_exists($routeFile)) {
                $this->loadRoutesFrom($routeFile);
            }

            $langPath = resource_path("lang");
            $this->loadTranslationsFrom($langPath, $module);
        }
    }
}
```

---

## 6. Interfaces des repositories principaux

### EventRepositoryInterface
```php
// app/Domain/Agenda/Repositories/EventRepositoryInterface.php

namespace App\Domain\Agenda\Repositories;

use App\Domain\Agenda\Models\Event;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface EventRepositoryInterface
{
    public function findById(int $id): ?Event;
    public function findByUuid(string $uuid): ?Event;
    public function getForOrganization(int $organizationId, array $filters = []): LengthAwarePaginator;
    public function getForUser(int $userId, \DateTimeInterface $from, \DateTimeInterface $to): Collection;
    public function getConflicts(int $userId, \DateTimeInterface $start, \DateTimeInterface $end, ?int $excludeId = null): Collection;
    public function create(array $data): Event;
    public function update(Event $event, array $data): Event;
    public function delete(Event $event): bool;
    public function getUpcomingReminders(\DateTimeInterface $before): Collection;
}
```

### CourrierRepositoryInterface
```php
// app/Domain/Courrier/Repositories/CourrierRepositoryInterface.php

namespace App\Domain\Courrier\Repositories;

use App\Domain\Courrier\Models\Courrier;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface CourrierRepositoryInterface
{
    public function findById(int $id): ?Courrier;
    public function findByReference(string $reference): ?Courrier;
    public function search(string $query, array $filters = []): LengthAwarePaginator;
    public function getByType(string $type, array $filters = []): LengthAwarePaginator;
    public function getAssignedTo(int $userId): Collection;
    public function getPendingProcessing(): Collection;
    public function generateReference(string $type): string;
    public function create(array $data): Courrier;
    public function update(Courrier $courrier, array $data): Courrier;
    public function archive(Courrier $courrier): bool;
}
```

---

## 7. Rôles et permissions RBAC

### Rôles système
| Rôle | Description |
|------|-------------|
| `super_admin` | Accès total à toutes les organisations |
| `org_admin` | Administrateur d'une organisation |
| `manager` | Responsable de département |
| `secretary` | Secrétaire avec accès aux modules principaux |
| `agent` | Agent limité à ses propres tâches |
| `viewer` | Lecture seule |

### Permissions par module (exemple Courrier)
```
courrier.view          — Voir les courriers
courrier.create        — Créer un courrier
courrier.edit          — Modifier un courrier
courrier.delete        — Supprimer un courrier
courrier.assign        — Assigner un courrier
courrier.archive       — Archiver un courrier
courrier.export        — Exporter les courriers
```

---

## 8. Architecture temps réel (Laravel Reverb)

```
Client React
    └── Laravel Echo (pusher-js)
            └── WebSocket ws://reverb:8080
                    └── Laravel Reverb Server
                            └── Canaux privés / de présence
                                ├── private-user.{id}          — Notifications personnelles
                                ├── private-org.{org_id}       — Événements organisation
                                ├── presence-module.{module}   — Qui consulte quoi
                                └── private-chat.{channel_id}  — Messagerie
```

### Exemple d'événement broadcast
```php
// app/Domain/Courrier/Events/CourrierAssigned.php

namespace App\Domain\Courrier\Events;

use App\Domain\Courrier\Models\Courrier;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class CourrierAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly Courrier $courrier,
        public readonly int $assignedToUserId,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->assignedToUserId}"),
            new PrivateChannel("org.{$this->courrier->organization_id}.courrier"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'courrier.assigned';
    }

    public function broadcastWith(): array
    {
        return [
            'courrier_id'  => $this->courrier->id,
            'reference'    => $this->courrier->reference,
            'objet'        => $this->courrier->objet,
            'assigned_by'  => auth()->user()->name,
            'message'      => "Un courrier vous a été assigné : {$this->courrier->reference}",
        ];
    }
}
```

---

## 9. Stratégie de cache

```
Redis DB 0 — Cache applicatif
    ├── secretis:org:{id}:settings     — Paramètres organisation (TTL 1h)
    ├── secretis:org:{id}:plan         — Plan et modules actifs (TTL 30min)
    ├── secretis:user:{id}:permissions — Permissions RBAC (TTL 15min)
    └── secretis:stats:{id}:{date}     — Statistiques dashboard (TTL 5min)

Redis DB 1 — Sessions
Redis DB 2 — File d'attente (jobs)
```

---

## 10. Sécurité

- **Authentification** : Laravel Sanctum (SPA + API tokens)
- **2FA** : TOTP via `laravel/fortify`
- **XSS** : Inertia sanitise automatiquement les props côté React
- **CSRF** : Tokens Laravel + SameSite cookies
- **Injection SQL** : ORM Eloquent uniquement (pas de requêtes brutes)
- **Audit trail** : Spatie ActivityLog sur tous les modèles sensibles
- **Rate limiting** : `throttle:60,1` sur les routes API
- **Chiffrement** : Données sensibles chiffrées avec `encrypt()` Laravel
- **HTTPS** : Forcé en production via `ForceHttps` middleware
