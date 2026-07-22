<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Support\Collection;

/**
 * Contrôleur de base pour l'API REST SECRETIS v1.
 *
 * Fournit des méthodes utilitaires pour standardiser toutes les réponses JSON
 * selon le format unifié SECRETIS :
 *
 * ```json
 * {
 *   "success": true|false,
 *   "data": { ... } | [ ... ] | null,
 *   "message": "Description de l'opération",
 *   "meta": {
 *     "api_version": "1.0",
 *     "timestamp": "2026-07-21T10:30:00Z",
 *     "request_id": "uuid-v4"
 *   }
 * }
 * ```
 *
 * Pour les réponses paginées, `meta` est enrichi avec les informations de pagination :
 * ```json
 * {
 *   "meta": {
 *     "current_page": 1,
 *     "last_page": 10,
 *     "per_page": 20,
 *     "total": 198,
 *     "from": 1,
 *     "to": 20,
 *     "api_version": "1.0",
 *     "timestamp": "..."
 *   }
 * }
 * ```
 *
 * @OA\Info(
 *     version="1.0.0",
 *     title="IBIG SECRETIS API",
 *     description="API REST de l'ERP de secrétariat IBIG SECRETIS. Toutes les routes sont préfixées /api/v1/.",
 *     @OA\Contact(email="api@ibigsoft.com"),
 *     @OA\License(name="Propriétaire — IBIG Soft")
 * )
 *
 * @OA\Server(
 *     url="https://secretis.ibigsoft.com/api/v1",
 *     description="Serveur de production"
 * )
 * @OA\Server(
 *     url="http://localhost:8000/api/v1",
 *     description="Serveur de développement local"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="Sanctum token",
 *     description="Token Sanctum obtenu via POST /api/v1/auth/login"
 * )
 *
 * @OA\Tag(name="Auth",          description="Authentification et gestion de session")
 * @OA\Tag(name="Agenda",        description="Calendrier, événements et rappels")
 * @OA\Tag(name="Courrier",      description="Courrier et GED")
 * @OA\Tag(name="Reunions",      description="Réunions, ODJ et procès-verbaux")
 * @OA\Tag(name="Taches",        description="Gestion des tâches et Kanban")
 * @OA\Tag(name="Communication", description="Messagerie et notifications")
 * @OA\Tag(name="Accueil",       description="Accueil visiteurs")
 * @OA\Tag(name="Ressources",    description="Réservation de ressources")
 * @OA\Tag(name="RH",            description="Ressources humaines")
 * @OA\Tag(name="Rapports",      description="Tableaux de bord et exports")
 * @OA\Tag(name="Parametres",    description="Configuration organisation")
 * @OA\Tag(name="SuperAdmin",    description="Administration plateforme IBIG")
 */
abstract class ApiController extends Controller
{
    /**
     * Version de l'API.
     */
    protected const API_VERSION = '1.0';

    // =========================================================================
    // Réponses de succès
    // =========================================================================

    /**
     * Réponse JSON de succès générique.
     *
     * @param  mixed   $data    Données à retourner (array, Collection, JsonResource, null)
     * @param  string  $message Message de confirmation
     * @param  int     $status  Code HTTP (200 par défaut)
     * @param  array   $meta    Métadonnées supplémentaires
     */
    protected function success(
        mixed $data = null,
        string $message = 'Opération réussie.',
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        $payload = [
            'success' => true,
            'data'    => $this->resolveData($data),
            'message' => $message,
            'meta'    => array_merge($this->defaultMeta(), $meta),
        ];

        return response()->json($payload, $status);
    }

    /**
     * Réponse JSON pour une ressource créée (HTTP 201).
     *
     * @param  mixed   $data    La ressource créée
     * @param  string  $message Message de confirmation
     */
    protected function created(
        mixed $data = null,
        string $message = 'Ressource créée avec succès.',
    ): JsonResponse {
        return $this->success($data, $message, 201);
    }

    /**
     * Réponse JSON pour une opération sans contenu (HTTP 204).
     *
     * Utilisé pour les suppressions et les actions sans retour de données.
     */
    protected function noContent(string $message = 'Opération effectuée avec succès.'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => null,
            'message' => $message,
            'meta'    => $this->defaultMeta(),
        ], 200);
    }

    // =========================================================================
    // Réponses paginées
    // =========================================================================

    /**
     * Réponse JSON avec pagination enrichie dans `meta`.
     *
     * Inclut les informations de pagination standard dans la clé `meta` :
     * `current_page`, `last_page`, `per_page`, `total`, `from`, `to`.
     *
     * @param  LengthAwarePaginator  $paginator  Résultat paginé Eloquent
     * @param  string                $message    Message de description
     * @param  array                 $extraMeta  Métadonnées supplémentaires
     */
    protected function paginated(
        LengthAwarePaginator $paginator,
        string $message = 'Données récupérées avec succès.',
        array $extraMeta = [],
    ): JsonResponse {
        $meta = array_merge(
            $this->defaultMeta(),
            [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
            $extraMeta,
        );

        return response()->json([
            'success' => true,
            'data'    => $paginator->items(),
            'message' => $message,
            'meta'    => $meta,
        ]);
    }

    // =========================================================================
    // Réponses d'erreur
    // =========================================================================

    /**
     * Réponse JSON d'erreur standardisée.
     *
     * @param  string      $message   Message d'erreur lisible
     * @param  int         $status    Code HTTP (400, 403, 404, 422, 500...)
     * @param  string|null $code      Code d'erreur SECRETIS (ex: SEC-001)
     * @param  array       $errors    Erreurs détaillées (ex: erreurs de validation par champ)
     * @param  array       $meta      Métadonnées supplémentaires
     */
    protected function error(
        string $message,
        int $status = 400,
        ?string $code = null,
        array $errors = [],
        array $meta = [],
    ): JsonResponse {
        $payload = [
            'success' => false,
            'data'    => null,
            'message' => $message,
            'meta'    => array_merge($this->defaultMeta(), $meta),
        ];

        if ($code !== null) {
            $payload['error_code'] = $code;
        }

        if (!empty($errors)) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    /**
     * Réponse 403 Forbidden standardisée.
     *
     * @param  string  $message   Message de permission refusée
     * @param  string  $code      Code d'erreur SECRETIS
     */
    protected function forbidden(
        string $message = 'Permission refusée.',
        string $code = 'SEC-010',
    ): JsonResponse {
        return $this->error($message, 403, $code);
    }

    /**
     * Réponse 404 Not Found standardisée.
     *
     * @param  string  $resource  Nom de la ressource non trouvée
     */
    protected function notFound(string $resource = 'Ressource'): JsonResponse
    {
        return $this->error(
            message: "{$resource} introuvable.",
            status: 404,
            code: 'SEC-020',
        );
    }

    /**
     * Réponse 422 Unprocessable Entity pour les erreurs de validation.
     *
     * @param  array   $errors   Tableau d'erreurs par champ { "field": ["message"] }
     * @param  string  $message  Message général
     */
    protected function validationError(
        array $errors,
        string $message = 'Les données fournies sont invalides.',
    ): JsonResponse {
        return $this->error($message, 422, 'SEC-030', $errors);
    }

    /**
     * Réponse 402 Payment Required pour les problèmes de licence.
     *
     * @param  string  $code     Code d'erreur SECRETIS licence (SEC-001 à SEC-004)
     * @param  string  $message  Message explicatif
     */
    protected function licenseError(
        string $code = 'SEC-001',
        string $message = 'Votre licence SECRETIS a expiré.',
    ): JsonResponse {
        return $this->error($message, 402, $code, meta: [
            'upgrade_url'  => config('app.url') . '/parametres/billing',
            'support_mail' => 'support@ibigsoft.com',
        ]);
    }

    // =========================================================================
    // Helpers internes
    // =========================================================================

    /**
     * Retourne les métadonnées communes à toutes les réponses.
     */
    private function defaultMeta(): array
    {
        return [
            'api_version' => self::API_VERSION,
            'timestamp'   => now()->toISOString(),
            'request_id'  => request()->header('X-Request-ID', (string) \Illuminate\Support\Str::uuid()),
        ];
    }

    /**
     * Résout les données en format sérialisable selon le type reçu.
     */
    private function resolveData(mixed $data): mixed
    {
        if ($data instanceof JsonResource || $data instanceof ResourceCollection) {
            return $data->resolve();
        }

        if ($data instanceof Collection) {
            return $data->values()->toArray();
        }

        return $data;
    }
}
