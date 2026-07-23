<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckLicense — Middleware de vérification de licence SECRETIS ERP
 *
 * RÈGLES DE SÉCURITÉ ABSOLUES :
 *
 * 1. DATE SERVEUR : La date d'expiration est comparée à Carbon::now() côté serveur.
 *    Jamais de date provenant du client ou de l'URL.
 *
 * 2. AUCUNE LOGIQUE DE LICENCE EN JAVASCRIPT : Ce middleware est le seul
 *    point de vérification. Aucune logique d'accès n'est déléguée au frontend.
 *
 * 3. MODE GRÂCE : Licence expirée → accès en lecture seule pendant 7 jours.
 *    Après 7 jours → 402 Payment Required.
 *
 * 4. MODULES : Certaines routes nécessitent un module actif.
 *    Si le module n'est pas dans le plan → 403.
 *
 * Statuts de licence :
 *   active  → accès normal
 *   grace   → accès en lecture seule (7 jours après expiration)
 *   expired → 402 Payment Required
 *   trial   → accès limité selon le plan trial
 */
class CheckLicense
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Pas d'utilisateur → laisser passer (auth middleware gérera)
        if (! $user) {
            return $next($request);
        }

        $org = $user->organization;

        // Pas d'organisation → laisser passer (onboarding)
        if (! $org) {
            return $next($request);
        }

        // =====================================================================
        // Vérification Trial
        // =====================================================================
        if ($org->trial_ends_at && $org->trial_ends_at->isFuture()) {
            // Trial valide → accès complet
            return $next($request);
        }

        // =====================================================================
        // Vérification Licence (DATE SERVEUR UNIQUEMENT)
        // =====================================================================
        $license = $org->activeLicense ?? $org->latestLicense ?? null;

        if (! $license) {
            // Aucune licence jamais activée
            return $this->respondExpired($request, 'Aucune licence active.');
        }

        // SÉCURITÉ : comparaison avec now() côté serveur — jamais le client
        $now = now();

        if ($license->status === 'active' && $license->expires_at > $now) {
            // Licence valide — vérification des modules si nécessaire
            $requiredModule = $request->route()?->getAction('module');
            if ($requiredModule && ! in_array($requiredModule, $license->active_modules ?? [], true)) {
                return $this->respondModuleNotAvailable($request, $requiredModule);
            }

            return $next($request);
        }

        if ($license->status === 'grace') {
            // Période de grâce : accès limité en lecture seule
            session(['license_grace_mode' => true]);
            Log::info('Accès en mode grâce', [
                'org_id'     => $org->id,
                'expires_at' => $license->expires_at,
            ]);
            return $next($request); // les policies géreront l'accès en lecture seule
        }

        // =====================================================================
        // Licence expirée
        // =====================================================================
        if ($license->expires_at <= $now) {
            $graceDays  = config('payment.grace_period_days', 7);
            $graceUntil = $license->expires_at->copy()->addDays($graceDays);

            if ($now < $graceUntil && $license->status !== 'expired') {
                // Encore dans la période de grâce
                session(['license_grace_mode' => true]);
                return $next($request);
            }
        }

        return $this->respondExpired($request, 'Licence expirée.');
    }

    // =========================================================================
    // Réponses
    // =========================================================================

    private function respondExpired(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error'   => $message,
                'code'    => 'LICENSE_EXPIRED',
                'action'  => 'redirect_to_subscription',
            ], 402);
        }

        return redirect()->route('subscription.expired')
                         ->with('error', $message);
    }

    private function respondModuleNotAvailable(Request $request, string $module): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error'  => "Le module '{$module}' n'est pas inclus dans votre formule.",
                'code'   => 'MODULE_NOT_AVAILABLE',
                'action' => 'redirect_to_upgrade',
            ], 403);
        }

        return redirect()->route('subscription.upgrade')
                         ->with('info', "Ce module nécessite une mise à niveau de votre formule.");
    }
}
