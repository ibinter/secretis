<?php

namespace App\Services;

use App\Models\LandingAnalytic;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class LandingAnalyticsService
{
    private const RATE_LIMIT_KEY    = 'analytics_rate:';
    private const RATE_LIMIT_MAX    = 100;   // événements par session par heure
    private const CACHE_TTL_SECONDS = 3600;

    // ---------------------------------------------------------------------------
    // ENREGISTREMENT
    // ---------------------------------------------------------------------------

    /**
     * Enregistre un événement analytics, en respectant le consentement et le rate-limit.
     */
    public function track(string $eventType, array $data, Request $request): void
    {
        // 1. Consentement obligatoire
        if (! ($data['cookie_consent'] ?? false)) {
            return;
        }

        // 2. Rate-limit par session (100 événements / heure)
        $sessionId = $data['session_id'] ?? null;
        if ($sessionId && ! $this->checkRateLimit($sessionId)) {
            return;
        }

        // 3. Enrichissement (GeoIP, appareil)
        $enriched = $this->enrich($data, $request);

        // 4. Persistance
        LandingAnalytic::create($enriched);
    }

    // ---------------------------------------------------------------------------
    // DASHBOARD
    // ---------------------------------------------------------------------------

    /**
     * Retourne les métriques consolidées pour le tableau de bord SuperAdmin.
     */
    public function getDashboard(array $period): array
    {
        $from = Carbon::parse($period['from'])->startOfDay();
        $to   = Carbon::parse($period['to'])->endOfDay();

        return [
            'page_views'         => $this->pageViews($from, $to),
            'unique_sessions'    => $this->uniqueSessions($from, $to),
            'demo_requests'      => $this->countEvent('demo_request', $from, $to),
            'trial_signups'      => $this->countEvent('trial_signup', $from, $to),
            'sara_conversations' => $this->countEvent('sara_open', $from, $to),
            'pwa_installs'       => $this->countEvent('pwa_install', $from, $to),
            'partner_clicks'     => $this->countEvent('partner_click', $from, $to),
            'whatsapp_clicks'    => $this->countEvent('whatsapp_click', $from, $to),

            'conversion_funnel'  => $this->conversionFunnel($from, $to),
            'top_sources'        => $this->topSources($from, $to),
            'by_device'          => $this->byDevice($from, $to),
            'by_country'         => $this->byCountry($from, $to),
            'by_day'             => $this->byDay($from, $to),
            'top_pages'          => $this->topPages($from, $to),
        ];
    }

    // ---------------------------------------------------------------------------
    // MÉTHODES PRIVÉES — MÉTRIQUES
    // ---------------------------------------------------------------------------

    private function pageViews(Carbon $from, Carbon $to): array
    {
        $total = LandingAnalytic::where('event_type', 'page_view')
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $byPage = LandingAnalytic::where('event_type', 'page_view')
            ->whereBetween('created_at', [$from, $to])
            ->select('page', DB::raw('count(*) as views'))
            ->groupBy('page')
            ->orderByDesc('views')
            ->limit(10)
            ->get()
            ->toArray();

        return ['total' => $total, 'by_page' => $byPage];
    }

    private function uniqueSessions(Carbon $from, Carbon $to): int
    {
        return LandingAnalytic::whereBetween('created_at', [$from, $to])
            ->whereNotNull('session_id')
            ->distinct('session_id')
            ->count('session_id');
    }

    private function countEvent(string $eventType, Carbon $from, Carbon $to): int
    {
        return LandingAnalytic::where('event_type', $eventType)
            ->whereBetween('created_at', [$from, $to])
            ->count();
    }

    private function conversionFunnel(Carbon $from, Carbon $to): array
    {
        $visits = $this->uniqueSessions($from, $to) ?: 1;
        $sara   = $this->countEvent('sara_open', $from, $to);
        $demo   = $this->countEvent('demo_request', $from, $to);
        $signup = $this->countEvent('trial_signup', $from, $to);

        return [
            ['step' => 'Visite',    'count' => $visits,               'rate' => 100.0],
            ['step' => 'SARA',      'count' => $sara,                 'rate' => $this->pct($sara, $visits)],
            ['step' => 'Démo',      'count' => $demo,                 'rate' => $this->pct($demo, $visits)],
            ['step' => 'Inscription','count' => $signup,              'rate' => $this->pct($signup, $visits)],
        ];
    }

    private function topSources(Carbon $from, Carbon $to): array
    {
        return LandingAnalytic::whereBetween('created_at', [$from, $to])
            ->whereNotNull('utm_source')
            ->select('utm_source', DB::raw('count(*) as visits'))
            ->groupBy('utm_source')
            ->orderByDesc('visits')
            ->limit(10)
            ->get()
            ->toArray();
    }

    private function byDevice(Carbon $from, Carbon $to): array
    {
        return LandingAnalytic::whereBetween('created_at', [$from, $to])
            ->whereNotNull('device_type')
            ->select('device_type', DB::raw('count(*) as count'))
            ->groupBy('device_type')
            ->get()
            ->pluck('count', 'device_type')
            ->toArray();
    }

    private function byCountry(Carbon $from, Carbon $to): array
    {
        return LandingAnalytic::whereBetween('created_at', [$from, $to])
            ->whereNotNull('country')
            ->select('country', DB::raw('count(*) as visits'))
            ->groupBy('country')
            ->orderByDesc('visits')
            ->limit(20)
            ->get()
            ->toArray();
    }

    private function byDay(Carbon $from, Carbon $to): array
    {
        return LandingAnalytic::whereBetween('created_at', [$from, $to])
            ->where('event_type', 'page_view')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('count(*) as views'),
                DB::raw('count(distinct session_id) as sessions')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    private function topPages(Carbon $from, Carbon $to): array
    {
        return LandingAnalytic::where('event_type', 'page_view')
            ->whereBetween('created_at', [$from, $to])
            ->select('page', DB::raw('count(*) as views'), DB::raw('count(distinct session_id) as sessions'))
            ->groupBy('page')
            ->orderByDesc('views')
            ->limit(10)
            ->get()
            ->toArray();
    }

    // ---------------------------------------------------------------------------
    // MÉTHODES PRIVÉES — UTILITAIRES
    // ---------------------------------------------------------------------------

    private function enrich(array $data, Request $request): array
    {
        return array_merge($data, [
            'device_type'    => $this->detectDevice($request->userAgent() ?? ''),
            'browser'        => $this->detectBrowser($request->userAgent() ?? ''),
            'country'        => $this->detectCountry($request),
            'is_returning'   => $this->isReturning($data['session_id'] ?? null),
        ]);
    }

    private function detectDevice(string $ua): string
    {
        $ua = strtolower($ua);
        if (str_contains($ua, 'mobile') || str_contains($ua, 'android') || str_contains($ua, 'iphone')) {
            return 'mobile';
        }
        if (str_contains($ua, 'tablet') || str_contains($ua, 'ipad')) {
            return 'tablet';
        }
        return 'desktop';
    }

    private function detectBrowser(string $ua): string
    {
        return match (true) {
            str_contains($ua, 'Edg')     => 'Edge',
            str_contains($ua, 'Chrome')  => 'Chrome',
            str_contains($ua, 'Firefox') => 'Firefox',
            str_contains($ua, 'Safari')  => 'Safari',
            str_contains($ua, 'Opera')   => 'Opera',
            default                      => 'Other',
        };
    }

    private function detectCountry(Request $request): ?string
    {
        // Header standard de la plupart des CDN/proxies (Cloudflare, AWS CloudFront, etc.)
        $country = $request->header('CF-IPCountry')
            ?? $request->header('X-Country-Code')
            ?? $request->header('CloudFront-Viewer-Country');

        return $country ? strtoupper(substr($country, 0, 2)) : null;
    }

    private function isReturning(?string $sessionId): bool
    {
        if (! $sessionId) {
            return false;
        }
        return LandingAnalytic::where('session_id', $sessionId)
            ->where('created_at', '<', now()->subMinutes(30))
            ->exists();
    }

    private function checkRateLimit(string $sessionId): bool
    {
        $key   = self::RATE_LIMIT_KEY . $sessionId;
        $count = (int) Cache::get($key, 0);

        if ($count >= self::RATE_LIMIT_MAX) {
            return false;
        }

        Cache::put($key, $count + 1, self::CACHE_TTL_SECONDS);

        return true;
    }

    private function pct(int $part, int $total): float
    {
        return $total > 0 ? round(($part / $total) * 100, 1) : 0.0;
    }
}
