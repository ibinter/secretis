<?php
namespace App\Providers;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Le contexte d'organisation du filigrane est une pile : il doit
        // survivre à toute la requête, donc une seule instance.
        $this->app->singleton(\App\Services\FiligraneService::class);

        // ── Filigrane sur les documents générés (cahier v1.1, §3.5 et §11.5) ──
        //
        // Un seul endroit, et non un pied de page recopié dans chaque vue :
        // tous les PDF de SECRETIS sont produits par `dompdf.wrapper`, que ce
        // soit par la facade `Pdf::` (qui résout ce même alias à chaque appel)
        // ou par `app('dompdf.wrapper')`. En substituant le décorateur ici,
        // aucun point de génération — présent ou futur — ne peut l'oublier.
        //
        // `extend()` plutôt que `bind()` : l'ordre d'enregistrement des
        // fournisseurs ne joue pas, l'extension s'applique à la résolution.
        $this->app->extend('dompdf.wrapper', function ($pdf, $app) {
            if ($pdf instanceof \App\Support\PdfFiligrane) {
                return $pdf;
            }

            return new \App\Support\PdfFiligrane(
                $pdf->getDomPDF(),
                $app['config'],
                $app['files'],
                $app['view'],
                $app->make(\App\Services\FiligraneService::class),
            );
        });
    }

    public function boot(): void
    {
        \Illuminate\Support\Facades\Route::pattern('id', '[0-9]+');
        // SuperAdmin IBIG : toutes les permissions (console §16)
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['super_admin', 'superadmin', 'superadmin_ibig', 'super-admin']) ? true : null;
        });
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        RateLimiter::for('auth', function (Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(10)->by($request->ip());
        });
        RateLimiter::for('public', function (Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(60)->by($request->ip());
        });
        RateLimiter::for('partner', function (Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
        RateLimiter::for('webhooks', function (Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(120)->by($request->ip());
        });
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('web', function (Request $request) {
            return Limit::perMinute(300)->by($request->ip());
        });
    }
}
