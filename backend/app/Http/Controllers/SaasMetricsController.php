<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SaasMetricsController extends Controller
{
    public function overview(Request $r): JsonResponse
    {
        return response()->json(['data' => ['mrr' => 0, 'arr' => 0, 'churn' => 0, 'users' => 0]]);
    }
    public function revenue(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function growth(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function cohorts(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function usage(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
}
