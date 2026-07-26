<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\LocalizationService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * SECRETIS ERP — ContentLanguage Middleware (v2 — Multilangue avancé)
 *
 * Résolution de la locale dans l'ordre de priorité :
 *   1. Préférence utilisateur stockée en BDD (user.locale)
 *   2. Session Laravel existante
 *   3. Sous-domaine (ar.secretis.com → 'ar', ma.secretis.com → 'ar-MA')
 *   4. En-tête Accept-Language du navigateur (avec variantes régionales)
 *   5. Locale de l'application (config)
 *   6. Fallback : 'fr'
 *
 * Locales supportées : fr, en, ar, ar-MA, ar-TN, pt-BR, pt-ST, pt-MZ, sw, ha
 * + variantes francophones : fr-CI, fr-SN, fr-CM
 *
 * Conformité WCAG 2.1 :
 *   - Critère 3.1.1 (Language of Page) — niveau A
 *   - Critère 3.1.2 (Language of Parts) — niveau AA
 */
class ContentLanguage
{
    /**
     * Locales supportées par SECRETIS ERP.
     * Clé = locale ISO, valeur = code HTTP Content-Language
     */
    protected const SUPPORTED_LOCALES = [
        'fr'    => 'fr',
        'en'    => 'en',
        'ar'    => 'ar',
        'ar-MA' => 'ar-MA',
        'ar-TN' => 'ar-TN',
        'pt-BR' => 'pt-BR',
        'pt-ST' => 'pt-ST',
        'pt-MZ' => 'pt-MZ',
        'sw'    => 'sw',
        'ha'    => 'ha',
        // Variantes francophones africaines
        'fr-CI' => 'fr-CI',
        'fr-SN' => 'fr-SN',
        'fr-CM' => 'fr-CM',
    ];

    /**
     * Mapping sous-domaine → locale
     * Exemple : ar.secretis.com → 'ar', ma.secretis.com → 'ar-MA'
     */
    protected const SUBDOMAIN_LOCALE_MAP = [
        'ar'  => 'ar',
        'ma'  => 'ar-MA',
        'tn'  => 'ar-TN',
        'br'  => 'pt-BR',
        'st'  => 'pt-ST',
        'mz'  => 'pt-MZ',
        'sw'  => 'sw',
        'ha'  => 'ha',
        'en'  => 'en',
        'fr'  => 'fr',
    ];

    /** Locale par défaut */
    protected string $defaultLocale = 'fr';

    public function __construct(
        protected LocalizationService $localizationService
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Résoudre la locale
        $locale = $this->resolveLocale($request);

        // Convertir au format Laravel (ar-MA → ar_MA)
        $laravelLocale = str_replace('-', '_', $locale);
        App::setLocale($laravelLocale);

        // Stocker en session
        session([
            'secretis_locale'     => $locale,
            'secretis_direction'  => $this->localizationService->getTextDirection($locale),
        ]);

        // Continuer la requête
        $response = $next($request);

        // Ajouter les en-têtes de réponse
        $response->headers->set('Content-Language', $locale);
        $response->headers->set('X-App-Direction', $this->localizationService->getTextDirection($locale));
        $response->headers->set('X-App-Locale', $locale);

        // Cache HTTP
        $vary = $response->headers->get('Vary', '');
        if ($vary && !str_contains($vary, 'Accept-Language')) {
            $response->headers->set('Vary', $vary . ', Accept-Language');
        } elseif (!$vary) {
            $response->headers->set('Vary', 'Accept-Language');
        }

        return $response;
    }

    /**
     * Résoudre la locale par ordre de priorité.
     */
    protected function resolveLocale(Request $request): string
    {
        // 1. Préférence utilisateur en BDD
        if (Auth::check()) {
            /** @var User $user */
            $user   = Auth::user();
            $locale = $this->localizationService->getUserLocale($user);
            if ($locale && $this->isSupported($locale)) {
                return $locale;
            }
        }

        // 2. Session existante
        if ($sessionLocale = session('secretis_locale')) {
            if ($this->isSupported($sessionLocale)) {
                return $sessionLocale;
            }
        }

        // 3. Sous-domaine
        if ($subdomainLocale = $this->resolveFromSubdomain($request)) {
            return $subdomainLocale;
        }

        // 4. En-tête Accept-Language
        if ($acceptLocale = $this->parseAcceptLanguage($request->header('Accept-Language', ''))) {
            return $acceptLocale;
        }

        // 5. Locale Laravel (définie par un autre middleware, ex: ResolveTenant)
        $appLocale = str_replace('_', '-', App::getLocale());
        if ($this->isSupported($appLocale)) {
            return $appLocale;
        }

        // 6. Fallback
        return $this->defaultLocale;
    }

    /**
     * Résout la locale depuis le sous-domaine.
     */
    protected function resolveFromSubdomain(Request $request): ?string
    {
        $host  = $request->getHost();
        $parts = explode('.', $host);

        if (count($parts) > 2) {
            $subdomain = strtolower($parts[0]);
            if (isset(self::SUBDOMAIN_LOCALE_MAP[$subdomain])) {
                return self::SUBDOMAIN_LOCALE_MAP[$subdomain];
            }
        }

        return null;
    }

    /**
     * Parse Accept-Language avec support des variantes régionales.
     * 'ar-MA,ar;q=0.9,fr;q=0.8' → 'ar-MA'
     */
    protected function parseAcceptLanguage(string $header): ?string
    {
        if (empty($header)) {
            return null;
        }

        $languages = [];
        foreach (explode(',', $header) as $part) {
            $part = trim($part);
            if (str_contains($part, ';q=')) {
                [$lang, $q] = explode(';q=', $part, 2);
                $languages[trim($lang)] = (float) $q;
            } else {
                $languages[$part] = 1.0;
            }
        }

        arsort($languages);

        foreach (array_keys($languages) as $lang) {
            // Normaliser (en-US → en-US, ar_MA → ar-MA)
            $normalized = str_replace('_', '-', $lang);

            // Test exact
            if ($this->isSupported($normalized)) {
                return $normalized;
            }

            // Test préfixe (ar-MA → ar, pt-BR → pt-BR avec fallback pt)
            $prefix = strtolower(explode('-', $normalized)[0]);
            if ($this->isSupported($prefix)) {
                return $prefix;
            }
        }

        return null;
    }

    /**
     * Vérifie si une locale est supportée.
     */
    protected function isSupported(string $locale): bool
    {
        return isset(self::SUPPORTED_LOCALES[$locale]);
    }
}
