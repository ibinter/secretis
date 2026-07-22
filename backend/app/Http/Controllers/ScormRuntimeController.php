<?php

namespace App\Http\Controllers;

use App\Services\ScormService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ScormRuntimeController — API SCORM Runtime (LMS side)
 *
 * Implémente le protocole SCORM 1.2 et SCORM 2004 côté serveur.
 * Les contenus SCORM communiquent avec ce contrôleur via postMessage ou fetch.
 *
 * Routes :
 *   POST /training/scorm/runtime/{sessionId}/initialize   → Initialize("")
 *   POST /training/scorm/runtime/{sessionId}/terminate    → Terminate("")
 *   GET  /training/scorm/runtime/{sessionId}/value        → GetValue(element)
 *   POST /training/scorm/runtime/{sessionId}/value        → SetValue(element, value)
 *   POST /training/scorm/runtime/{sessionId}/commit       → Commit("")
 *   GET  /training/scorm/runtime/{sessionId}/error        → GetLastError()
 *   GET  /training/scorm/runtime/{sessionId}/error-string → GetErrorString(errorCode)
 */
class ScormRuntimeController extends Controller
{
    private array $lastErrors = [];

    public function __construct(private ScormService $scormService) {}

    // ─── SCORM 1.2 & 2004 Commands ───────────────────────────────────────────

    /**
     * Initialize("") — démarre la communication SCORM
     */
    public function initialize(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->getSession($sessionId);
        if (! $session) {
            return $this->scormResponse('false', 301);
        }

        DB::table('training_scorm_sessions')
            ->where('id', $sessionId)
            ->update(['last_accessed_at' => now()]);

        Log::debug("SCORM Initialize session #{$sessionId}");
        return $this->scormResponse('true');
    }

    /**
     * Terminate("") — termine la session SCORM proprement
     */
    public function terminate(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->getSession($sessionId);
        if (! $session) {
            return $this->scormResponse('false', 301);
        }

        // Sauvegarde automatique à la terminaison
        $data = $request->input('data', []);
        if (! empty($data)) {
            $this->scormService->updateScormData($session, $data);
        }

        Log::debug("SCORM Terminate session #{$sessionId}");
        return $this->scormResponse('true');
    }

    /**
     * GetValue(element) — récupère une valeur cmi.*
     */
    public function getValue(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->getSession($sessionId);
        if (! $session) {
            return $this->scormResponse('', 301);
        }

        $element = $request->query('element', '');
        $data    = $this->scormService->getScormData($session);
        $value   = $data[$element] ?? '';

        // Valeurs dynamiques spéciales
        if ($element === 'cmi.core.student_id') {
            $value = (string) $session->user_id;
        } elseif ($element === 'cmi.core.student_name') {
            $user  = DB::table('users')->find($session->user_id);
            $value = $user ? $user->name : '';
        } elseif ($element === 'cmi.core.lesson_mode') {
            $value = 'normal';
        } elseif ($element === 'cmi.core.credit') {
            $value = 'credit';
        }

        return $this->scormResponse($value);
    }

    /**
     * SetValue(element, value) — sauvegarde une valeur cmi.*
     */
    public function setValue(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->getSession($sessionId);
        if (! $session) {
            return $this->scormResponse('false', 301);
        }

        $element = $request->input('element', '');
        $value   = $request->input('value', '');

        if (empty($element)) {
            return $this->scormResponse('false', 201);
        }

        // Éléments en lecture seule
        $readOnly = [
            'cmi.core.student_id',
            'cmi.core.student_name',
            'cmi.core.lesson_mode',
            'cmi.core.credit',
        ];

        if (in_array($element, $readOnly)) {
            return $this->scormResponse('false', 403);
        }

        $this->scormService->updateScormData($session, [$element => $value]);

        Log::debug("SCORM SetValue [{$element}={$value}] session #{$sessionId}");
        return $this->scormResponse('true');
    }

    /**
     * Batch SetValue — permet de sauvegarder plusieurs cmi.* en une requête
     */
    public function setValueBatch(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->getSession($sessionId);
        if (! $session) {
            return $this->scormResponse('false', 301);
        }

        $data = $request->input('data', []);
        if (! is_array($data) || empty($data)) {
            return $this->scormResponse('false', 201);
        }

        $this->scormService->updateScormData($session, $data);

        return $this->scormResponse('true');
    }

    /**
     * Commit("") — force la persistance des données
     */
    public function commit(Request $request, int $sessionId): JsonResponse
    {
        $session = $this->getSession($sessionId);
        if (! $session) {
            return $this->scormResponse('false', 301);
        }

        // Les données sont déjà persistées par SetValue ; Commit = no-op + confirmation
        DB::table('training_scorm_sessions')
            ->where('id', $sessionId)
            ->update(['last_accessed_at' => now()]);

        Log::debug("SCORM Commit session #{$sessionId}");
        return $this->scormResponse('true');
    }

    /**
     * GetLastError() — retourne le code d'erreur SCORM
     */
    public function getLastError(Request $request, int $sessionId): JsonResponse
    {
        $errorCode = $this->lastErrors[$sessionId] ?? 0;
        return $this->scormResponse((string) $errorCode);
    }

    /**
     * GetErrorString(errorCode) — description de l'erreur SCORM
     */
    public function getErrorString(Request $request, int $sessionId): JsonResponse
    {
        $code = (int) $request->query('code', 0);
        return $this->scormResponse($this->scormErrorString($code));
    }

    /**
     * GetDiagnostic(errorCode)
     */
    public function getDiagnostic(Request $request, int $sessionId): JsonResponse
    {
        $code = (int) $request->query('code', 0);
        return $this->scormResponse("Error {$code}: " . $this->scormErrorString($code));
    }

    // ─── Endpoint de serving SCORM (fichiers statiques) ──────────────────────

    /**
     * Sert les fichiers du paquet SCORM depuis le storage sécurisé.
     * Valide le token signé avant de servir le fichier.
     */
    public function serveContent(Request $request, int $packageId, string $token): mixed
    {
        $cached = cache()->get("scorm_token_{$token}");
        if (! $cached || $cached['package_id'] !== $packageId) {
            abort(403, 'Token SCORM invalide ou expiré.');
        }

        $package = DB::table('training_scorm_packages')->find($packageId);
        if (! $package) {
            abort(404);
        }

        $filePath = $package->package_path . '/' . $package->launch_url;
        $fullPath = storage_path("app/public/{$filePath}");

        if (! file_exists($fullPath)) {
            abort(404, "Fichier SCORM introuvable : {$filePath}");
        }

        $mime = mime_content_type($fullPath) ?: 'text/html';
        return response()->file($fullPath, [
            'Content-Type'                => $mime,
            'X-Frame-Options'             => 'SAMEORIGIN',
            'Content-Security-Policy'     => "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;",
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function getSession(int $sessionId): ?object
    {
        $session = DB::table('training_scorm_sessions')->find($sessionId);

        if (! $session) {
            return null;
        }

        // Vérifier que l'utilisateur authentifié possède cette session
        $user = Auth::user();
        if ($user && $session->user_id !== $user->id) {
            return null;
        }

        return $session;
    }

    private function scormResponse(string $value, int $errorCode = 0): JsonResponse
    {
        return response()->json([
            'value'     => $value,
            'errorCode' => (string) $errorCode,
        ])->withHeaders([
            'Access-Control-Allow-Origin'  => '*',
            'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With',
        ]);
    }

    private function scormErrorString(int $code): string
    {
        return match ($code) {
            0   => 'No error',
            101 => 'General exception',
            201 => 'Invalid argument error',
            202 => 'Element cannot have children',
            203 => 'Element not an array - cannot have count',
            301 => 'Not initialized',
            401 => 'Not implemented error',
            402 => 'Invalid set value, element is a keyword',
            403 => 'Element is read only',
            404 => 'Element is write only',
            405 => 'Incorrect data type',
            default => 'Unknown error',
        };
    }
}
