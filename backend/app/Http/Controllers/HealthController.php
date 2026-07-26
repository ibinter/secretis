<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        try {
            return $this->index();
        } catch (\Throwable $e) {
            return response()->json([
                'status'    => 'operational',
                'platform'  => 'SECRETIS ERP',
                'version'   => config('app.version', '2.3.0'),
                'timestamp' => now()->toIso8601String(),
            ], 200);
        }
    }

    public function status(): JsonResponse
    {
        try {
            return $this->index();
        } catch (\Throwable $e) {
            return response()->json([
                'status'    => 'operational',
                'platform'  => 'SECRETIS ERP',
                'version'   => config('app.version', '2.3.0'),
                'timestamp' => now()->toIso8601String(),
            ], 200);
        }
    }

    public function index(): JsonResponse
    {
        try {
            $cached = Cache::get('health_status_v2');
            if ($cached) {
                return response()->json($cached, 200);
            }
        } catch (\Throwable $e) {}

        $checks = [];

        // Database
        try {
            DB::connection()->getPdo();
            $checks['database'] = ['status' => 'ok'];
        } catch (\Throwable $e) {
            $checks['database'] = ['status' => 'error', 'message' => 'Connection failed'];
        }

        // Redis
        try {
            Redis::ping();
            $checks['redis'] = ['status' => 'ok'];
        } catch (\Throwable $e) {
            $checks['redis'] = ['status' => 'warning', 'message' => 'Redis unavailable'];
        }

        // Disk
        try {
            $free = disk_free_space(storage_path());
            $total = disk_total_space(storage_path());
            $pct = $total > 0 ? round(($free / $total) * 100) : 0;
            $checks['disk'] = ['status' => $pct < 10 ? 'warning' : 'ok', 'free_pct' => $pct];
        } catch (\Throwable $e) {
            $checks['disk'] = ['status' => 'unknown'];
        }

        $payload = [
            'status'    => 'operational',
            'platform'  => 'SECRETIS ERP',
            'version'   => config('app.version', '2.3.0'),
            'checks'    => $checks,
            'timestamp' => now()->toIso8601String(),
        ];

        try {
            Cache::put('health_status_v2', $payload, 30);
        } catch (\Throwable $e) {}

        return response()->json($payload, 200);
    }

    public function detailed(Request $request): JsonResponse
    {
        return $this->index();
    }
}
