<?php

namespace App\Http\Middleware;

use App\Services\OhadaService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Symfony\Component\HttpFoundation\Response;

class LocalizeForRegion
{
    public function __construct(private readonly OhadaService $ohadaService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $org  = $user?->organization;

        if (! $org) {
            return $next($request);
        }

        $country = $org->country ?? 'CI';
        $config  = $this->ohadaService->getCountry($country);

        if ($config) {
            // Fuseau horaire
            $timezone = $config['timezone'] ?? 'Africa/Abidjan';
            Config::set('app.timezone', $timezone);
            date_default_timezone_set($timezone);

            // Locale
            $locale = $config['langue_officielle'] ?? 'fr';
            $regionLocale = $locale . '-' . $country; // ex: fr-CI, fr-SN, fr-CM

            if ($this->localeExists($regionLocale)) {
                App::setLocale($regionLocale);
            } elseif ($this->localeExists($locale)) {
                App::setLocale($locale);
            }

            // Devise par défaut
            Config::set('app.default_currency', $config['currency'] ?? 'XOF');

            // Format de date
            Config::set('app.date_format', $config['date_format'] ?? 'd/m/Y');

            // Premier jour de la semaine
            Config::set('app.first_day_of_week', $config['first_day_of_week'] ?? 1);

            // TVA par défaut
            Config::set('app.default_vat_rate', $config['vat_rate'] ?? 18.0);
            Config::set('app.vat_name', $config['vat_name'] ?? 'TVA');

            // Plan comptable
            Config::set('app.plan_comptable', $config['plan_comptable'] ?? 'SYSCOHADA');

            // Ajoute les infos dans les headers de réponse (utile pour le front)
            $request->headers->set('X-App-Country', $country);
            $request->headers->set('X-App-Currency', $config['currency'] ?? 'XOF');
            $request->headers->set('X-App-Timezone', $timezone);
            $request->headers->set('X-App-Locale', App::getLocale());
        }

        $response = $next($request);

        // Expose les infos de localisation au frontend
        if ($config) {
            $response->headers->set('X-App-Country', $country);
            $response->headers->set('X-App-Currency', $config['currency'] ?? 'XOF');
            $response->headers->set('X-App-Timezone', $config['timezone'] ?? 'Africa/Abidjan');
            $response->headers->set('X-App-Locale', App::getLocale());
            $response->headers->set('X-App-VAT-Rate', (string) ($config['vat_rate'] ?? 18.0));
            $response->headers->set('X-App-Date-Format', $config['date_format'] ?? 'd/m/Y');
        }

        return $response;
    }

    private function localeExists(string $locale): bool
    {
        return is_dir(lang_path($locale)) || is_file(lang_path($locale . '.php'));
    }
}
