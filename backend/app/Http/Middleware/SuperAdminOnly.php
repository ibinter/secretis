<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * SuperAdminOnly — Middleware de sécurité console SuperAdmin IBIG SECRETIS
 *
 * Responsabilités :
 *  1. Vérifier que l'utilisateur est connecté ET possède le rôle superadmin_ibig
 *  2. Journaliser CHAQUE accès dans audit_logs avec IP + User Agent
 *  3. Déconnecter et rediriger si tentative d'accès non autorisé
 *  4. En mode impersonation : vérifier que la session originale était bien superadmin
 *
 * Usage dans les routes :
 *   Route::middleware(['auth', 'superadmin'])->prefix('superadmin')...
 */
class SuperAdminOnly
{
    /**
     * Routes de la console superadmin autorisées sans être IBIG superadmin
     * (ex: route de fin d'impersonation accessible au tenant admin qui revient)
     */
    private const PUBLIC_SUPERADMIN_ROUTES = [
        'superadmin.stop-impersonation',
    ];

    // -------------------------------------------------------------------------

    public function handle(Request $request, Closure $next): Response
    {
        // ── 1. Authentification ────────────────────────────────────────────────
        if (!Auth::check()) {
            $this->logUnauthorizedAccess($request, 'not_authenticated');
            return $this->denyAccess($request, 'Veuillez vous connecter pour accéder à cette zone.');
        }

        $user = Auth::user();

        // ── 2. Cas mode impersonation ──────────────────────────────────────────
        if (session('impersonating')) {
            return $this->handleImpersonationMode($request, $next, $user);
        }

        // ── 3. Vérification rôle superadmin_ibig ──────────────────────────────
        if (!$user->hasRole('superadmin_ibig')) {
            $this->logUnauthorizedAccess($request, 'insufficient_role', [
                'user_id'    => $user->id,
                'user_email' => $user->email,
                'roles'      => $user->getRoleNames()->toArray(),
            ]);

            // Déconnecter l'utilisateur si tentative d'accès non autorisé
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return $this->denyAccess($request, 'Accès non autorisé. Votre session a été fermée.');
        }

        // ── 4. Log de chaque accès autorisé ───────────────────────────────────
        $this->logAuthorizedAccess($request, $user->id);

        return $next($request);
    }

    // -------------------------------------------------------------------------
    // Mode impersonation
    // -------------------------------------------------------------------------

    private function handleImpersonationMode(Request $request, Closure $next, $currentUser): Response
    {
        $routeName          = $request->route()?->getName();
        $impersonatorId     = session('impersonator_id');
        $originalSuperAdmin = \App\Models\User::find($impersonatorId);

        // La route "stop-impersonation" doit toujours être accessible
        if (in_array($routeName, self::PUBLIC_SUPERADMIN_ROUTES)) {
            return $next($request);
        }

        // Vérifier que l'impersonateur original était bien superadmin
        if (!$originalSuperAdmin || !$originalSuperAdmin->hasRole('superadmin_ibig')) {
            Log::critical('Impersonation security breach detected', [
                'current_user_id' => $currentUser->id,
                'impersonator_id' => $impersonatorId,
                'ip'              => $request->ip(),
                'route'           => $request->path(),
            ]);

            // Terminer la session immédiatement
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->with('error', 'Session de sécurité invalide. Reconnectez-vous.');
        }

        // L'impersonation active interdit l'accès à la console superadmin
        // (l'utilisateur "est" actuellement le tenant admin, pas le superadmin)
        // → rediriger vers dashboard tenant
        return redirect()->route('dashboard')
            ->with('info', 'Vous êtes en mode impersonation. Revenez à votre session SuperAdmin pour accéder à la console.');
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    private function denyAccess(Request $request, string $message): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'error'   => 'Unauthorized',
                'message' => $message,
            ], 403);
        }

        return redirect()->route('login')->with('error', $message);
    }

    private function logAuthorizedAccess(Request $request, int $userId): void
    {
        try {
            DB::table('audit_logs')->insert([
                'user_id'         => $userId,
                'organization_id' => null,
                'action'          => 'superadmin.access',
                'context'         => json_encode([
                    'path'   => $request->path(),
                    'method' => $request->method(),
                    'route'  => $request->route()?->getName(),
                ]),
                'ip_address'      => $request->ip(),
                'user_agent'      => $request->userAgent(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        } catch (\Throwable $e) {
            // Ne pas bloquer la requête si le log échoue
            Log::error('SuperAdminOnly audit log failed', ['error' => $e->getMessage()]);
        }
    }

    private function logUnauthorizedAccess(Request $request, string $reason, array $context = []): void
    {
        Log::warning('SuperAdmin unauthorized access attempt', array_merge([
            'reason'     => $reason,
            'ip'         => $request->ip(),
            'path'       => $request->path(),
            'user_agent' => $request->userAgent(),
        ], $context));

        try {
            DB::table('audit_logs')->insert([
                'user_id'         => Auth::id(),
                'organization_id' => null,
                'action'          => 'superadmin.access.denied',
                'context'         => json_encode(array_merge(['reason' => $reason], $context)),
                'ip_address'      => $request->ip(),
                'user_agent'      => $request->userAgent(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('SuperAdminOnly deny audit log failed', ['error' => $e->getMessage()]);
        }
    }
}
