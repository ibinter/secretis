<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonitoringApiController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        return response()->json(['status' => 'operational', 'services' => []]);
    }
    public function metrics(Request $r): JsonResponse
    {
        return response()->json(['data' => ['uptime' => 99.9, 'latency_ms' => 0]]);
    }
    public function logs(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function queues(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
}
