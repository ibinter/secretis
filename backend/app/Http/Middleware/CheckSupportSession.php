<?php

namespace App\Http\Middleware;

use App\Services\SupportSessionService;
use Carbon\Carbon;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * SECRETIS ERP — Middleware : Détection et contrôle des sessions de prise en main
 *
 * Ce middleware est actif sur toutes les routes authentifiées.
 * Il effectue les opérations suivantes quand un agent IBIG Soft est en prise en main :
 *
 *   1. Détecte la session active via session()
 *   2. Vérifie la validité et l'expiration de la session
 *   3. Injecte les headers X-Support-* dans toutes les réponses
 *   4. Logue les actions sensibles (exports, modifications, données personnelles)
 *   5. Bloque l'accès aux ressources ultra-sensibles (clés API, logs SMTP)
 *
 * Enregistrement : dans Kernel.php > $middlewareGroups > 'api' ET 'web'
 */
class CheckSupportSession
{
    /**
     * Routes bloquées en mode prise en main (ultra-sensibles).
     * L'agent peut voir les données métier mais pas les secrets système.
     */
    private array $blockedRoutes = [
        'api/v1/settings/api-keys',
        'api/v1/settings/smtp',
        'api/v1/settings/webhooks/secrets',
        'api/v1/integrations/*/credentials',
        'api/v1/admin/system/logs/smtp',
        'api/v1/admin/system/env',
    ];

    /**
     * Patterns d'actions considérées comme sensibles → tracées dans le journal.
     */
    private array $sensitiveActions = [
        // Exports de données
        ['method' => 'GET',  'pattern' => '*/export*',           'label' => 'data_export'],
        ['method' => 'GET',  'pattern' => '*/download*',         'label' => 'file_download'],
        // Modifications utilisateurs
        ['method' => 'PUT',  'pattern' => 'api/v1/users/*',      'label' => 'user_modified'],
        ['method' => 'DELETE','pattern' => 'api/v1/users/*',     'label' => 'user_deleted'],
        // Données RH
        ['method' => 'GET',  'pattern' => 'api/v1/employees/*',  'label' => 'employee_data_accessed'],
        // Données comptables
        ['method' => 'GET',  'pattern' => 'api/v1/accounting/*', 'label' => 'accounting_data_accessed'],
        // Paramètres organisation
        ['method' => 'PUT',  'pattern' => 'api/v1/organization*','label' => 'org_settings_modified'],
        ['method' => 'DELETE','pattern' => 'api/v1/*',           'label' => 'delete_operation'],
        // Documents
        ['method' => 'GET',  'pattern' => 'api/v1/documents/*/content', 'label' => 'document_content_accessed'],
    ];

    public function __construct(
        private readonly SupportSessionService $supportSessionService
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // ── Vérifier si une prise en main est active dans la session ──────────
        $sessionId    = session('support_session_id');
        $orgId        = session('impersonating_org_id');
        $expiresAt    = session('impersonation_expires_at');
        $agentName    = session('support_agent_name', 'Agent IBIG Soft');
        $agentEmail   = session('support_agent_email', '');

        // Pas de prise en main active → passe-plat transparent
        if (!$sessionId || !$orgId) {
            return $next($request);
        }

        // ── Vérification de l'expiration ──────────────────────────────────────
        if ($expiresAt && Carbon::now()->timestamp > $expiresAt) {
            // Session expirée : nettoyer et terminer
            $this->supportSessionService->endSession($sessionId, 'system', 'Expirée automatiquement.');

            session()->forget([
                'impersonating_org_id',
                'support_session_id',
                'support_agent_name',
                'support_agent_email',
                'impersonation_expires_at',
            ]);

            // Réponse d'expiration pour les requêtes API
            if ($request->expectsJson()) {
                return response()->json([
                    'error'   => 'support_session_expired',
                    'message' => 'La session de prise en main a expiré.',
                ], 401);
            }

            return $next($request);
        }

        // ── Vérification en base que la session est toujours active ───────────
        $dbSession = DB::table('support_sessions')
            ->where('id', $sessionId)
            ->where('is_active', true)
            ->where('status', 'active')
            ->first();

        if (!$dbSession) {
            // Session révoquée côté base (terminée par l'admin client)
            session()->forget([
                'impersonating_org_id',
                'support_session_id',
                'support_agent_name',
                'support_agent_email',
                'impersonation_expires_at',
            ]);

            return $next($request);
        }

        // ── Bloquer les routes ultra-sensibles ────────────────────────────────
        $currentPath = $request->path();
        foreach ($this->blockedRoutes as $blockedRoute) {
            if (str_is($blockedRoute, $currentPath)) {
                Log::channel('support')->warning("Accès bloqué en prise en main", [
                    'session_id' => $sessionId,
                    'path'       => $currentPath,
                    'agent'      => $agentEmail,
                ]);

                if ($request->expectsJson()) {
                    return response()->json([
                        'error'   => 'access_denied_support_mode',
                        'message' => 'Cette ressource n\'est pas accessible en mode prise en main pour des raisons de sécurité.',
                    ], 403);
                }

                abort(403, 'Accès non autorisé en mode prise en main.');
            }
        }

        // ── Tracer les actions sensibles ──────────────────────────────────────
        $this->traceSensitiveAction($request, $sessionId, $currentPath, $agentEmail);

        // ── Traitement de la requête ──────────────────────────────────────────
        $response = $next($request);

        // ── Injection des headers de prise en main ────────────────────────────
        $minutesLeft = Carbon::now()->diffInMinutes(Carbon::createFromTimestamp($expiresAt), false);

        $response->headers->set('X-Support-Mode', 'true');
        $response->headers->set('X-Support-Agent', $agentName);
        $response->headers->set('X-Support-Session-Id', (string) $sessionId);
        $response->headers->set('X-Support-Expires-In', (string) max(0, $minutesLeft) . 'min');

        return $response;
    }

    /**
     * Détecte et logue les actions sensibles pendant la prise en main.
     */
    private function traceSensitiveAction(
        Request $request,
        int $sessionId,
        string $path,
        string $agentEmail
    ): void {
        foreach ($this->sensitiveActions as $rule) {
            if (
                strtoupper($request->method()) === strtoupper($rule['method'])
                && str_is($rule['pattern'], $path)
            ) {
                $this->supportSessionService->logSensitiveAction($sessionId, $rule['label'], [
                    'path'       => $path,
                    'method'     => $request->method(),
                    'agent'      => $agentEmail,
                    'ip'         => $request->ip(),
                    'query'      => $request->query() ?: null,
                    'timestamp'  => now()->toIso8601String(),
                ]);

                Log::channel('support')->info("Action sensible tracée en prise en main", [
                    'session_id' => $sessionId,
                    'action'     => $rule['label'],
                    'path'       => $path,
                    'agent'      => $agentEmail,
                ]);

                break; // Une seule correspondance suffit
            }
        }
    }
}
