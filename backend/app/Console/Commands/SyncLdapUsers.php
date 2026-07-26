<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\SsoProvider;
use App\Services\LdapService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * SyncLdapUsers — Synchronisation LDAP planifiée
 *
 * Usage :
 *   php artisan secretis:sync-ldap
 *   php artisan secretis:sync-ldap --org=acme       # un seul tenant
 *   php artisan secretis:sync-ldap --dry-run        # simulation sans écriture
 *
 * Planification (AppServiceProvider ou routes/console.php) :
 *   Schedule::command('secretis:sync-ldap')->dailyAt('01:00');
 *
 * Exit codes :
 *   0 = succès total
 *   1 = erreurs partielles (certains tenants ont échoué)
 *   2 = aucun tenant LDAP actif trouvé
 */
class SyncLdapUsers extends Command
{
    protected $signature = 'secretis:sync-ldap
                            {--org= : Slug de l\'organisation à synchroniser (optionnel)}
                            {--dry-run : Simuler sans effectuer de modifications}';

    protected $description = 'Synchronise les utilisateurs LDAP/Active Directory pour tous les tenants actifs';

    public function __construct(private LdapService $ldapService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $orgSlug = $this->option('org');
        $dryRun  = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('[DRY-RUN] Aucune modification ne sera effectuée.');
        }

        $this->info('=== SECRETIS LDAP Sync — ' . now()->toDateTimeString() . ' ===');

        // Récupérer les organisations avec LDAP actif
        $query = SsoProvider::query()
            ->where('type', 'ldap')
            ->where('is_active', true)
            ->with('organization');

        if ($orgSlug) {
            $query->whereHas('organization', fn ($q) => $q->where('slug', $orgSlug));
        }

        $providers = $query->get();

        if ($providers->isEmpty()) {
            $this->warn('Aucun provider LDAP actif trouvé.');
            return self::SUCCESS;
        }

        $this->info("Providers LDAP à synchroniser : {$providers->count()}");
        $this->newLine();

        $globalStats = ['created' => 0, 'updated' => 0, 'disabled' => 0, 'errors' => 0];
        $hasErrors   = false;

        foreach ($providers as $provider) {
            $org = $provider->organization;

            if (! $org || $org->status !== 'active') {
                $this->line("  ↳ {$provider->name} — Organisation inactive ou supprimée, ignorée.");
                continue;
            }

            $this->line("  Synchronisation de <info>{$org->name}</info> ({$org->slug}) via <comment>{$provider->name}</comment>...");

            if ($dryRun) {
                $this->line("    [DRY-RUN] Simulation ignorée.");
                continue;
            }

            try {
                $stats = $this->ldapService->syncUsers($org);

                $this->line(sprintf(
                    "    ✓ Créés: <info>%d</info>  Mis à jour: <info>%d</info>  Désactivés: <comment>%d</comment>  Erreurs: <error>%d</error>",
                    $stats['created'],
                    $stats['updated'],
                    $stats['disabled'],
                    count($stats['errors'] ?? []),
                ));

                if (! empty($stats['errors'])) {
                    foreach ($stats['errors'] as $err) {
                        $this->warn("    ⚠ {$err}");
                    }
                    $hasErrors = true;
                }

                $globalStats['created']  += $stats['created'];
                $globalStats['updated']  += $stats['updated'];
                $globalStats['disabled'] += $stats['disabled'];
                $globalStats['errors']   += count($stats['errors'] ?? []);

            } catch (Throwable $e) {
                $hasErrors = true;
                $this->error("    ✗ Échec synchronisation {$org->slug}: {$e->getMessage()}");

                Log::error('SyncLdapUsers : erreur tenant', [
                    'org'         => $org->slug,
                    'provider_id' => $provider->id,
                    'error'       => $e->getMessage(),
                    'trace'       => $e->getTraceAsString(),
                ]);
            }
        }

        $this->newLine();
        $this->info('=== Résumé global ===');
        $this->table(
            ['Créés', 'Mis à jour', 'Désactivés', 'Erreurs'],
            [[$globalStats['created'], $globalStats['updated'], $globalStats['disabled'], $globalStats['errors']]]
        );

        Log::info('SyncLdapUsers terminé', $globalStats);

        return $hasErrors ? self::FAILURE : self::SUCCESS;
    }
}
