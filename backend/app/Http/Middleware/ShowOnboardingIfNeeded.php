<?php

namespace App\Http\Middleware;

use App\Services\OnboardingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ShowOnboardingIfNeeded
{
    public function __construct(private readonly OnboardingService $onboarding) {}

    public function handle(Request $request, Closure $next): Response
    {
        // ── Routes exemptées ──────────────────────────────────────────────────
        if ($this->isExempt($request)) {
            return $next($request);
        }

        $user = $request->user();
        if (!$user) {
            return $next($request);
        }

        $org = $user->organization;
        if (!$org) {
            return $next($request);
        }

        // Seulement pendant les 7 premiers jours
        if ($org->created_at->diffInDays(now()) > 7) {
            return $next($request);
        }

        // Rediriger si onboarding incomplet
        if (!$this->onboarding->isOnboardingComplete($org)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message'  => 'Veuillez compléter la configuration de votre organisation.',
                    'redirect' => route('onboarding.index'),
                ], 403);
            }

            return redirect()->route('onboarding.index')
                ->with('info', 'Complétez la configuration pour accéder à toutes les fonctionnalités.');
        }

        return $next($request);
    }

    private function isExempt(Request $request): bool
    {
        $exemptPrefixes = [
            'api/',
            'webhook',
            'sanctum',
            '_debugbar',
            'onboarding',
            'invitations',
            'trial',
            'login',
            'register',
            'logout',
            'password',
        ];

        $exemptPatterns = [
            '/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i',
        ];

        $path = ltrim($request->path(), '/');

        foreach ($exemptPrefixes as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        foreach ($exemptPatterns as $pattern) {
            if (preg_match($pattern, $path)) {
                return true;
            }
        }

        return false;
    }
}
