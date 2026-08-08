<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route as RouteFacade;

/**
 * Vérifie l'état RÉEL de toutes les pages en simulant un utilisateur CONNECTÉ.
 * Indispensable : un curl non authentifié renvoie 302 (login) et ne détecte
 * donc jamais les 500 qui se produisent après connexion.
 *
 * Usage :
 *   php artisan pages:health                 (toutes les pages GET internes)
 *   php artisan pages:health --user=3
 *   php artisan pages:health --filter=ressources
 */
class HealthCheckPages extends Command
{
    protected $signature = 'pages:health {--user= : ID utilisateur à simuler} {--filter= : Ne tester que les URI contenant ce texte} {--all : Inclure aussi les routes à paramètres}';

    protected $description = 'Teste toutes les pages web en tant qu\'utilisateur connecté et liste celles qui échouent';

    public function handle(): int
    {
        $user = $this->option('user')
            ? \App\Models\User::find($this->option('user'))
            : \App\Models\User::whereNotNull('organization_id')->first();

        if (! $user) {
            $this->error('Aucun utilisateur trouvé.');
            return self::FAILURE;
        }

        $this->info("Utilisateur simulé : {$user->name} (org {$user->organization_id})");

        $filter = $this->option('filter');
        $uris   = [];

        foreach (RouteFacade::getRoutes() as $route) {
            if (! in_array('GET', $route->methods(), true)) {
                continue;
            }

            $uri = '/' . ltrim($route->uri(), '/');

            // Exclure les API, les routes à paramètres (sauf --all) et le hors-périmètre.
            if (str_starts_with($uri, '/api') || str_starts_with($uri, '/_')) {
                continue;
            }
            if (! $this->option('all') && str_contains($uri, '{')) {
                continue;
            }
            if ($filter && ! str_contains($uri, $filter)) {
                continue;
            }

            $uris[$uri] = true;
        }

        $uris = array_keys($uris);
        sort($uris);

        $failed = [];
        $ok     = 0;

        foreach ($uris as $uri) {
            try {
                Auth::setUser($user);
                $request = Request::create($uri, 'GET');
                $request->setUserResolver(fn () => $user);

                $response = app()->make(Kernel::class)->handle($request);
                $status   = $response->getStatusCode();

                if ($status >= 500) {
                    $failed[] = [$uri, (string) $status, ''];
                    $this->line("  <fg=red>✗</> {$uri} — {$status}");
                } else {
                    $ok++;
                }
            } catch (\Throwable $e) {
                $failed[] = [$uri, 'EX', substr($e->getMessage(), 0, 80)];
                $this->line("  <fg=red>✗</> {$uri} — " . substr($e->getMessage(), 0, 80));
            }
        }

        $this->newLine();
        $this->info("✅ {$ok} page(s) OK");

        if ($failed) {
            $this->newLine();
            $this->error(count($failed) . ' page(s) en échec :');
            $this->table(['URI', 'Statut', 'Erreur'], $failed);
            return self::FAILURE;
        }

        $this->info('Aucune page en erreur.');
        return self::SUCCESS;
    }
}
