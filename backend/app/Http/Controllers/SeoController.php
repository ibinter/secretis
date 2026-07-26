<?php

namespace App\Http\Controllers;

use App\Services\SeoService;
use App\Services\LandingAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class SeoController extends Controller
{
    public function __construct(
        private readonly SeoService $seoService,
        private readonly LandingAnalyticsService $analyticsService,
    ) {}

    /**
     * Génère le sitemap.xml dynamiquement.
     */
    public function sitemap(): Response
    {
        $xml = Cache::remember('sitemap_xml', now()->addHours(6), function () {
            $pages = [
                ['url' => '/',                 'priority' => '1.0', 'changefreq' => 'weekly'],
                ['url' => '/fonctionnalites',  'priority' => '0.9', 'changefreq' => 'monthly'],
                ['url' => '/modules',          'priority' => '0.8', 'changefreq' => 'monthly'],
                ['url' => '/tarifs',           'priority' => '0.9', 'changefreq' => 'weekly'],
                ['url' => '/demonstration',    'priority' => '0.9', 'changefreq' => 'monthly'],
                ['url' => '/assistance',       'priority' => '0.8', 'changefreq' => 'monthly'],
                ['url' => '/a-propos',         'priority' => '0.7', 'changefreq' => 'monthly'],
            ];

            $legalSlugs = [
                'conditions-generales-utilisation',
                'conditions-generales-vente',
                'politique-confidentialite',
                'politique-cookies',
                'mentions-legales',
                'dpa-traitement-donnees',
                'charte-accessibilite',
                'politique-remboursement',
                'politique-securite',
                'politique-conservation-donnees',
                'politique-sous-traitants',
                'contrat-licence-logiciel',
                'accord-niveau-service',
                'politique-anti-corruption',
                'charte-partenaires',
                'politique-rgpd-collaborateurs',
                'politique-divulgation-responsable',
                'avertissement-legal',
            ];

            foreach ($legalSlugs as $slug) {
                $pages[] = ['url' => "/legal/{$slug}", 'priority' => '0.7', 'changefreq' => 'yearly'];
            }

            $aideSlugs = [
                'faq', 'premiers-pas', 'gestion-utilisateurs', 'facturation',
                'importation-donnees', 'exportation-rapports', 'configuration-modules',
                'securite-acces', 'integrations', 'support-contact',
            ];

            foreach ($aideSlugs as $slug) {
                $pages[] = ['url' => "/aide/{$slug}", 'priority' => '0.6', 'changefreq' => 'monthly'];
            }

            $base    = 'https://secretis.ibigsoft.com';
            $baseEn  = 'https://secretis.ibigsoft.com/en';
            $lastmod = now()->toIso8601String();

            $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL;
            $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' . PHP_EOL;
            $xml .= '        xmlns:xhtml="http://www.w3.org/1999/xhtml">' . PHP_EOL;

            foreach ($pages as $page) {
                $loc = $base . $page['url'];
                $xml .= "  <url>\n";
                $xml .= "    <loc>{$loc}</loc>\n";
                $xml .= "    <lastmod>{$lastmod}</lastmod>\n";
                $xml .= "    <changefreq>{$page['changefreq']}</changefreq>\n";
                $xml .= "    <priority>{$page['priority']}</priority>\n";
                $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"fr\" href=\"{$loc}\"/>\n";
                $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"{$baseEn}{$page['url']}\"/>\n";
                $xml .= "    <xhtml:link rel=\"alternate\" hreflang=\"x-default\" href=\"{$loc}\"/>\n";
                $xml .= "  </url>\n";
            }

            $xml .= '</urlset>';

            return $xml;
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    /**
     * Génère robots.txt dynamiquement depuis la configuration.
     */
    public function robots(): Response
    {
        $content = Cache::remember('robots_txt', now()->addHours(24), function () {
            $disallow = [
                '/api',
                '/admin',
                '/superadmin',
                '/dashboard',
                '/horizon',
                '/telescope',
                '/nova',
                '/sanctum',
                '/_debugbar',
            ];

            $lines   = [];
            $lines[] = 'User-agent: *';
            $lines[] = 'Allow: /';

            foreach ($disallow as $path) {
                $lines[] = "Disallow: {$path}";
            }

            $lines[] = '';
            $lines[] = '# Googlebot spécifique';
            $lines[] = 'User-agent: Googlebot';
            $lines[] = 'Allow: /';
            $lines[] = 'Crawl-delay: 1';
            $lines[] = '';
            $lines[] = 'Sitemap: https://secretis.ibigsoft.com/sitemap.xml';

            return implode(PHP_EOL, $lines);
        });

        return response($content, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /**
     * POST /api/v1/analytics/track
     * Enregistre un événement analytics de la landing page.
     */
    public function trackAnalytics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_type'      => 'required|string|max:64',
            'page'            => 'nullable|string|max:255',
            'element'         => 'nullable|string|max:255',
            'session_id'      => 'nullable|string|max:64',
            'referrer'        => 'nullable|string|max:500',
            'utm_source'      => 'nullable|string|max:100',
            'utm_medium'      => 'nullable|string|max:100',
            'utm_campaign'    => 'nullable|string|max:100',
            'cookie_consent'  => 'nullable|boolean',
        ]);

        // Respecter le consentement cookie
        $cookieConsent = (bool) ($validated['cookie_consent'] ?? false);

        if (! $cookieConsent) {
            return response()->json(['status' => 'skipped', 'reason' => 'no_consent'], 200);
        }

        $this->analyticsService->track(
            eventType: $validated['event_type'],
            data:      $validated,
            request:   $request,
        );

        return response()->json(['status' => 'tracked'], 201);
    }
}
