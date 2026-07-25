<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrController extends Controller
{
    public function orgchart(): JsonResponse { return response()->json(['data' => []]); }
    public function planning(): JsonResponse { return response()->json(['data' => []]); }
    public function departments(): JsonResponse { return response()->json(['data' => []]); }
    public function storeDepartment(Request $r): JsonResponse { return response()->json(['success' => true]); }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
