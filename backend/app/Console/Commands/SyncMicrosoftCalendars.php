<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\MicrosoftAuthService;
use App\Services\OutlookCalendarService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * SyncMicrosoftCalendars — Commande CRON de synchronisation Outlook
 *
 * Synchronise automatiquement les calendriers Outlook de tous les utilisateurs
 * qui ont un compte Microsoft connecté.
 *
 * Usage :
 *   php artisan secretis:sync-outlook
 *   php artisan secretis:sync-outlook --user=42        (un seul utilisateur)
 *   php artisan secretis:sync-outlook --org=5          (une seule organisation)
 *   php artisan secretis:sync-outlook --dry-run        (mode simulation)
 *
 * CRON recommandé (toutes les 15 minutes) :
 *   * /15 * * * * php /var/www/secretis/artisan secretis:sync-outlook >> /dev/null 2>&1
 *
 * Ajout dans app/Console/Kernel.php :
 *   $schedule->command('secretis:sync-outlook')->everyFifteenMinutes()->withoutOverlapping();
 */
class SyncMicrosoftCalendars extends Command
{
    /**
     * Signature de la commande Artisan.
     */
    protected $signature = 'secretis:sync-outlook
                            {--user=   : Synchroniser un utilisateur spécifique (ID)}
                            {--org=    : Synchroniser une organisation spécifique (ID)}
                            {--dry-run : Simuler sans modifier la base de données}';

    /**
     * Description de la commande.
     */
    protected $description = 'Synchronise les calendriers Outlook de tous les utilisateurs Microsoft connectés';

    public function __construct(
        private readonly OutlookCalendarService $calendarService,
        private readonly MicrosoftAuthService   $authService
    ) {
        parent::__construct();
    }

    // -------------------------------------------------------------------------
    // Exécution
    // -------------------------------------------------------------------------

    public function handle(): int
    {
        $isDryRun   = $this->option('dry-run');
        $userId     = $this->option('user');
        $orgId      = $this->option('org');

        $this->info('[SECRETIS] Démarrage de la synchronisation Outlook Calendar...');

        if ($isDryRun) {
            $this->warn('[DRY-RUN] Mode simulation activé — aucune modification ne sera effectuée.');
        }

        // Construire la requête des utilisateurs à synchroniser
        $query = User::query()
            ->whereNotNull('microsoft_access_token')
            ->whereNotNull('microsoft_refresh_token')
            ->where('status', 'active')
            ->with('organization');

        if ($userId) {
            $query->where('id', $userId);
        }

        if ($orgId) {
            $query->where('organization_id', $orgId);
        }

        $users = $query->get();

        if ($users->isEmpty()) {
            $this->info('Aucun utilisateur avec Microsoft connecté trouvé.');
            return Command::SUCCESS;
        }

        $this->info("Synchronisation de {$users->count()} utilisateur(s)...");

        $stats = [
            'synced'  => 0,
            'errors'  => 0,
            'skipped' => 0,
            'total'   => 0,
        ];

        $bar = $this->output->createProgressBar($users->count());
        $bar->start();

        foreach ($users as $user) {
            $bar->advance();
            $stats['total']++;

            try {
                // Vérifier que le token n'est pas révoqué avant de synchroniser
                if (! $this->isTokenValid($user)) {
                    $this->newLine();
                    $this->warn("  Utilisateur #{$user->id} ({$user->name}) : token invalide, ignoré.");
                    $stats['skipped']++;
                    continue;
                }

                if (! $isDryRun) {
                    $imported = $this->calendarService->syncFromOutlook($user);
                    $count    = count($imported);
                } else {
                    $count = 0;
                }

                $stats['synced']++;

                Log::info('SyncMicrosoftCalendars: Sync réussie', [
                    'user_id'     => $user->id,
                    'org_id'      => $user->organization_id,
                    'imported'    => $count,
                    'dry_run'     => $isDryRun,
                ]);
            } catch (\RuntimeException $e) {
                $stats['errors']++;

                // Vérifier si c'est une erreur d'authentification (token révoqué)
                if (str_contains($e->getMessage(), 'Token Microsoft expiré') ||
                    str_contains($e->getMessage(), 'Invalid token')) {
                    $this->newLine();
                    $this->warn("  Utilisateur #{$user->id} ({$user->name}) : token révoqué, déconnexion.");

                    if (! $isDryRun) {
                        // Ne pas révoquer les tokens — laisser l'utilisateur se reconnecter manuellement
                        // pour éviter de supprimer des tokens encore valides suite à une erreur réseau
                        Log::warning('SyncMicrosoftCalendars: Token expiré pour un utilisateur', [
                            'user_id' => $user->id,
                            'error'   => $e->getMessage(),
                        ]);
                    }
                } else {
                    Log::error('SyncMicrosoftCalendars: Erreur sync utilisateur', [
                        'user_id' => $user->id,
                        'error'   => $e->getMessage(),
                    ]);
                }
            } catch (\Throwable $e) {
                // Erreur inattendue — on logue et on continue
                $stats['errors']++;

                Log::error('SyncMicrosoftCalendars: Erreur inattendue', [
                    'user_id' => $user->id,
                    'error'   => $e->getMessage(),
                    'file'    => $e->getFile(),
                    'line'    => $e->getLine(),
                ]);
            }
        }

        $bar->finish();
        $this->newLine(2);

        // Résumé
        $this->table(
            ['Statut', 'Nombre'],
            [
                ['Total traités',     $stats['total']],
                ['Synchronisés',      $stats['synced']],
                ['Ignorés (token)',   $stats['skipped']],
                ['Erreurs',           $stats['errors']],
            ]
        );

        if ($stats['errors'] > 0) {
            $this->warn("⚠ {$stats['errors']} erreur(s) détectée(s). Consultez les logs pour le détail.");
        } else {
            $this->info('Synchronisation terminée sans erreur.');
        }

        Log::info('SyncMicrosoftCalendars: Synchronisation complète', $stats);

        return $stats['errors'] > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Vérifie rapidement si le token de l'utilisateur est potentiellement valide
     * (en cache ou non expiré) sans faire d'appel réseau.
     */
    private function isTokenValid(User $user): bool
    {
        // Si le token expire dans moins de 2 jours et qu'il n'y a pas de refresh token,
        // il ne peut pas être renouvelé
        if (! $user->microsoft_refresh_token) {
            $expiresAt = $user->microsoft_token_expires_at;
            return $expiresAt && $expiresAt->isFuture();
        }

        return true; // Peut être renouvelé via refresh token
    }
}
