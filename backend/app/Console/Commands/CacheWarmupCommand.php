<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\HelpCategory;
use App\Models\HelpArticle;
use App\Models\Organization;
use App\Models\User;
use App\Services\CacheService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

/**
 * CacheWarmupCommand — Préchauffage du cache Redis pour SECRETIS ERP
 *
 * Usage :
 *   php artisan secretis:cache:warmup              — toutes les orgs actives
 *   php artisan secretis:cache:warmup --org=42     — une org précise
 *
 * Planifié dans routes/console.php à 02:00 chaque nuit.
 *
 * Données préchauffées par organisation :
 *   1. Permissions Spatie de tous les utilisateurs actifs
 *   2. Événements agenda des 6 derniers mois
 *   3. Stats du dashboard (KPIs)
 *   4. Catégories et articles du centre d'aide (données statiques)
 *   5. FAQ (100 entrées les plus consultées)
 */
class CacheWarmupCommand extends Command
{
    protected $signature   = 'secretis:cache:warmup {--org= : ID d\'une organisation spécifique}';
    protected $description = 'Préchauffe le cache Redis pour toutes les organisations actives';

    public function __construct(private readonly CacheService $cache)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $startedAt = microtime(true);

        $organizations = $this->resolveOrganizations();

        if ($organizations->isEmpty()) {
            $this->warn('Aucune organisation active trouvée.');
            return self::FAILURE;
        }

        $this->info("Préchauffage du cache pour {$organizations->count()} organisation(s)...");
        $this->newLine();

        $bar = $this->output->createProgressBar($organizations->count());
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% — %message%');
        $bar->start();

        foreach ($organizations as $org) {
            $bar->setMessage("Org #{$org->id} — {$org->name}");

            $this->warmPermissions($org);
            $this->warmAgenda($org);
            $this->warmDashboard($org);

            $bar->advance();
        }

        // Données statiques globales (indépendantes de l'organisation)
        $bar->setMessage('Données statiques globales...');
        $this->warmStaticData();
        $this->warmFaq();
        $bar->finish();

        $elapsed = round(microtime(true) - $startedAt, 2);
        $this->newLine(2);
        $this->info("Cache réchauffé pour {$organizations->count()} organisation(s) en {$elapsed}s.");

        return self::SUCCESS;
    }

    // =========================================================================
    // Étapes de préchauffage
    // =========================================================================

    /**
     * 1. Permissions Spatie de tous les utilisateurs actifs de l'org.
     *
     * Utilise le TTL USER_PERMISSIONS_TTL (10 min).
     * Évite que le premier utilisateur de chaque session après 02h00
     * subisse un cold-start sur les vérifications de permissions.
     */
    private function warmPermissions(Organization $org): void
    {
        $users = User::where('organization_id', $org->id)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->select('id')
            ->get();

        foreach ($users as $user) {
            $this->cache->remember(
                orgId:    $org->id,
                module:   'permissions',
                key:      "user.{$user->id}",
                ttl:      CacheService::USER_PERMISSIONS_TTL,
                callback: function () use ($user) {
                    // Forcer le chargement des rôles et permissions Spatie
                    $u = User::with('roles.permissions', 'permissions')->find($user->id);

                    return [
                        'roles'       => $u->getRoleNames()->toArray(),
                        'permissions' => $u->getAllPermissions()->pluck('name')->toArray(),
                    ];
                }
            );
        }
    }

    /**
     * 2. Événements agenda des 6 derniers mois.
     *
     * Pré-charge les événements par mois (clé granulaire) pour couvrir
     * les vues calendrier courantes sans surcharger Redis.
     */
    private function warmAgenda(Organization $org): void
    {
        $start = Carbon::now()->subMonths(6)->startOfMonth();
        $end   = Carbon::now()->endOfMonth();

        $events = DB::table('events')
            ->where('organization_id', $org->id)
            ->whereBetween('start_at', [$start, $end])
            ->whereNull('deleted_at')
            ->select('id', 'title', 'start_at', 'end_at', 'color', 'type', 'location')
            ->orderBy('start_at')
            ->get()
            ->groupBy(fn($e) => Carbon::parse($e->start_at)->format('Y-m'));

        foreach ($events as $month => $monthEvents) {
            $this->cache->remember(
                orgId:    $org->id,
                module:   'agenda',
                key:      "events.{$month}",
                ttl:      CacheService::ANALYTICS_TTL,
                callback: fn() => $monthEvents->toArray()
            );
        }
    }

    /**
     * 3. Stats du dashboard (KPIs).
     *
     * Utilise le TTL DASHBOARD_TTL (5 min).
     * Pré-calculer les compteurs lourds avant l'afflux des utilisateurs matinaux.
     */
    private function warmDashboard(Organization $org): void
    {
        $orgId = $org->id;

        $this->cache->remember(
            orgId:    $orgId,
            module:   'dashboard',
            key:      "stats.{$orgId}",
            ttl:      CacheService::DASHBOARD_TTL,
            callback: function () use ($orgId) {
                $week  = [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()];
                $month = Carbon::now()->startOfMonth();

                return [
                    'events_this_week'      => DB::table('events')
                        ->where('organization_id', $orgId)
                        ->whereBetween('start_at', $week)
                        ->whereNull('deleted_at')
                        ->count(),

                    'pending_tasks'         => DB::table('tasks')
                        ->where('organization_id', $orgId)
                        ->whereNotIn('status', ['done', 'cancelled'])
                        ->whereNull('deleted_at')
                        ->count(),

                    'documents_this_month'  => DB::table('documents')
                        ->where('organization_id', $orgId)
                        ->where('created_at', '>=', $month)
                        ->whereNull('deleted_at')
                        ->count(),

                    'visitors_today'        => DB::table('visitors')
                        ->where('organization_id', $orgId)
                        ->whereDate('check_in_at', Carbon::today())
                        ->whereNull('deleted_at')
                        ->count(),

                    'mail_pending'          => DB::table('mail_registry')
                        ->where('organization_id', $orgId)
                        ->whereIn('status', ['pending', 'processing'])
                        ->whereNull('deleted_at')
                        ->count(),
                ];
            }
        );
    }

    /**
     * 4. Catégories et articles du centre d'aide (données statiques, 24h).
     *
     * Ces données changent rarement (équipe contenu) — TTL 24h.
     * Le centre d'aide est consulté massivement en début de session.
     */
    private function warmStaticData(): void
    {
        Cache::tags(['module:help', 'static'])->remember(
            'help.categories.all',
            CacheService::STATIC_DATA_TTL,
            function () {
                return DB::table('help_categories')
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->get(['id', 'name', 'slug', 'icon', 'articles_count'])
                    ->toArray();
            }
        );

        Cache::tags(['module:help', 'static'])->remember(
            'help.articles.featured',
            CacheService::STATIC_DATA_TTL,
            function () {
                return DB::table('help_articles')
                    ->where('is_published', true)
                    ->where('is_featured', true)
                    ->orderByDesc('views_count')
                    ->limit(20)
                    ->get(['id', 'title', 'slug', 'category_id', 'excerpt', 'views_count'])
                    ->toArray();
            }
        );
    }

    /**
     * 5. FAQ — 100 entrées les plus consultées, rarement modifiées (24h).
     */
    private function warmFaq(): void
    {
        Cache::tags(['module:help', 'module:faq', 'static'])->remember(
            'faq.top100',
            CacheService::STATIC_DATA_TTL,
            function () {
                return DB::table('faqs')
                    ->where('is_published', true)
                    ->orderByDesc('views_count')
                    ->limit(100)
                    ->get(['id', 'question', 'answer', 'category', 'views_count'])
                    ->toArray();
            }
        );
    }

    // =========================================================================
    // Résolution des organisations cibles
    // =========================================================================

    private function resolveOrganizations()
    {
        $orgId = $this->option('org');

        $query = Organization::where('is_active', true)
            ->whereNull('deleted_at')
            ->select('id', 'name');

        if ($orgId) {
            $query->where('id', (int) $orgId);
        }

        return $query->get();
    }
}
