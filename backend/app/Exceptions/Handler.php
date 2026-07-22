<?php

namespace App\Exceptions;

use App\Services\AuditService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;
use Illuminate\Support\Facades\Log;

/**
 * Handler — Gestionnaire d'exceptions sécurisé pour SECRETIS ERP
 *
 * PRINCIPES DE SÉCURITÉ :
 *  1. En production, JAMAIS de stack trace dans les réponses API
 *  2. Messages d'erreur génériques (pas d'info système, pas de noms de classe)
 *  3. Log complet des erreurs côté serveur uniquement (fichier + audit_logs)
 *  4. Gestion spéciale des erreurs de paiement (log critique + alerte)
 *  5. Réponse JSON uniforme pour toutes les routes API
 *
 * Format de réponse API uniforme :
 * {
 *   "error":   "snake_case_error_code",
 *   "message": "Message lisible par l'humain (jamais de détails techniques)",
 *   "errors":  { ... } // Uniquement pour ValidationException
 * }
 */
class Handler extends ExceptionHandler
{
    /**
     * Exceptions non reportées (erreurs attendues).
     */
    protected $dontReport = [
        AuthenticationException::class,
        AuthorizationException::class,
        ModelNotFoundException::class,
        ValidationException::class,
        TooManyRequestsHttpException::class,
    ];

    /**
     * Champs sensibles qui ne doivent jamais apparaître dans les logs d'exception.
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
        'token',
        'api_key',
        'secret',
        'card_number',
        'cvv',
    ];

    /**
     * Modules de paiement nécessitant une alerte critique.
     */
    private const PAYMENT_MODULES = [
        'billing',
        'payment',
        'license',
        'webhook',
        'stripe',
        'paydunya',
        'cinetpay',
    ];

    public function register(): void
    {
        // Reporter les exceptions critiques de paiement avec alerte
        $this->reportable(function (Throwable $e, Request $request) {
            if ($this->isPaymentRelated($request)) {
                $this->handlePaymentException($e, $request);
            }
        });
    }

    /**
     * Rendu des exceptions pour les requêtes API.
     * Garantit que JAMAIS de stack trace ou d'info technique n'est exposée en production.
     */
    public function render($request, Throwable $e): \Illuminate\Http\Response|JsonResponse|\Symfony\Component\HttpFoundation\Response
    {
        // Convertir d'abord via le mécanisme Laravel standard
        $e = $this->prepareException($this->mapException($e));

        // Pour les requêtes API : réponse JSON uniforme
        if ($request->expectsJson() || $request->is('api/*')) {
            return $this->renderApiException($request, $e);
        }

        // Pour les requêtes web : rendu HTML standard (pas de modification)
        return parent::render($request, $e);
    }

    /**
     * Génère une réponse API JSON uniforme et sécurisée.
     */
    private function renderApiException(Request $request, Throwable $e): JsonResponse
    {
        // Validation — exposé (pas d'info sensible)
        if ($e instanceof ValidationException) {
            return response()->json([
                'error'   => 'validation_failed',
                'message' => 'Les données soumises sont invalides.',
                'errors'  => $e->errors(),
            ], 422);
        }

        // Authentification
        if ($e instanceof AuthenticationException) {
            return response()->json([
                'error'   => 'unauthenticated',
                'message' => 'Vous devez être connecté pour accéder à cette ressource.',
            ], 401);
        }

        // Autorisation
        if ($e instanceof AuthorizationException) {
            return response()->json([
                'error'   => 'forbidden',
                'message' => 'Vous n\'avez pas la permission d\'effectuer cette action.',
            ], 403);
        }

        // Ressource non trouvée (ModelNotFoundException → 404)
        if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
            return response()->json([
                'error'   => 'not_found',
                'message' => 'La ressource demandée est introuvable.',
            ], 404);
        }

        // Rate limiting
        if ($e instanceof TooManyRequestsHttpException) {
            $retryAfter = $e->getHeaders()['Retry-After'] ?? 60;

            return response()->json([
                'error'   => 'too_many_requests',
                'message' => 'Trop de requêtes. Réessayez dans quelques instants.',
                'retry_after' => (int) $retryAfter,
            ], 429);
        }

        // Erreur HTTP générique (403, 404, 500, etc.)
        if ($e instanceof HttpException) {
            return $this->renderHttpException($e);
        }

        // Erreur non gérée — LOG COMPLET côté serveur, réponse générique côté client
        return $this->renderInternalError($request, $e);
    }

    /**
     * Rend une HttpException avec un code et message appropriés.
     */
    private function renderHttpException(HttpException $e): JsonResponse
    {
        $statusCode = $e->getStatusCode();

        $messages = [
            400 => ['bad_request', 'La requête est mal formée.'],
            401 => ['unauthenticated', 'Authentification requise.'],
            403 => ['forbidden', 'Accès refusé.'],
            404 => ['not_found', 'Ressource introuvable.'],
            405 => ['method_not_allowed', 'Méthode HTTP non autorisée.'],
            408 => ['request_timeout', 'La requête a expiré.'],
            409 => ['conflict', 'Conflit avec l\'état actuel de la ressource.'],
            413 => ['payload_too_large', 'Le fichier ou la requête est trop volumineux.'],
            422 => ['unprocessable_entity', 'Les données soumises sont invalides.'],
            429 => ['too_many_requests', 'Trop de requêtes. Veuillez ralentir.'],
            500 => ['server_error', 'Une erreur interne est survenue.'],
            502 => ['bad_gateway', 'Service temporairement indisponible.'],
            503 => ['service_unavailable', 'Service en maintenance.'],
        ];

        [$errorCode, $message] = $messages[$statusCode] ?? ['http_error', 'Une erreur est survenue.'];

        return response()->json([
            'error'   => $errorCode,
            'message' => $message,
        ], $statusCode);
    }

    /**
     * Gère les erreurs internes non anticipées.
     *
     * RÈGLE ABSOLUE : En production, JAMAIS de stack trace ou de nom de classe
     * dans la réponse. L'ID d'erreur permet de retrouver le détail dans les logs.
     */
    private function renderInternalError(Request $request, Throwable $e): JsonResponse
    {
        // Génère un ID unique pour corréler la réponse client avec le log serveur
        $errorId = strtoupper(substr(md5(uniqid('', true)), 0, 8));

        // Log COMPLET côté serveur uniquement
        Log::channel('errors')->critical('Unhandled exception', [
            'error_id'   => $errorId,
            'exception'  => get_class($e),
            'message'    => $e->getMessage(),
            'code'       => $e->getCode(),
            'file'       => $e->getFile(),
            'line'       => $e->getLine(),
            'trace'      => $e->getTraceAsString(),
            'url'        => $request->fullUrl(),
            'method'     => $request->method(),
            'user_id'    => auth()->id(),
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // En développement : on peut exposer plus de détails
        if (config('app.debug') && config('app.env') !== 'production') {
            return response()->json([
                'error'     => 'server_error',
                'message'   => $e->getMessage(),
                'exception' => get_class($e),
                'file'      => $e->getFile(),
                'line'      => $e->getLine(),
                'trace'     => explode("\n", $e->getTraceAsString()),
                'error_id'  => $errorId,
            ], 500);
        }

        // En production : réponse générique avec error_id pour le support
        return response()->json([
            'error'    => 'server_error',
            'message'  => 'Une erreur interne est survenue. Référence : ' . $errorId,
            'error_id' => $errorId,
        ], 500);
    }

    /**
     * Gestion spéciale des erreurs liées aux paiements.
     * Log critique + notification du support IBIG.
     */
    private function handlePaymentException(Throwable $e, Request $request): void
    {
        $errorId = strtoupper(substr(md5(uniqid('', true)), 0, 8));

        // Log critique dédié au canal billing
        Log::channel('billing')->critical('PAYMENT EXCEPTION — INTERVENTION REQUISE', [
            'error_id'   => $errorId,
            'exception'  => get_class($e),
            'message'    => $e->getMessage(),
            'url'        => $request->fullUrl(),
            'method'     => $request->method(),
            'user_id'    => auth()->id(),
            'ip'         => $request->ip(),
            'timestamp'  => now()->toIso8601String(),
            // Ne pas logguer le body complet — peut contenir des données de paiement
        ]);

        // Log également dans audit_logs si AuditService disponible
        try {
            app(AuditService::class)->log(
                action: 'payment_exception',
                module: 'billing',
                resourceType: 'exception',
                resourceId: $errorId,
                newValues: [
                    'exception_class' => get_class($e),
                    'url'             => $request->fullUrl(),
                ],
            );
        } catch (Throwable) {
            // Ne pas masquer l'exception originale
        }

        // TODO : Déclencher une alerte Slack/PagerDuty pour le support
        // event(new PaymentExceptionOccurred($errorId, $e));
    }

    /**
     * Détermine si la requête concerne un module de paiement.
     */
    private function isPaymentRelated(Request $request): bool
    {
        $path = strtolower($request->path());

        foreach (self::PAYMENT_MODULES as $module) {
            if (str_contains($path, $module)) {
                return true;
            }
        }

        return false;
    }
}
