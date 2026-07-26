<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PublicController extends Controller
{
    public function landing(): Response
    {
        $path = resource_path('views/landing.html');
        if (file_exists($path)) {
            return response(file_get_contents($path), 200)
                ->header('Content-Type', 'text/html');
        }
        return response('<h1>SECRETIS ERP</h1>', 200)->header('Content-Type', 'text/html');
    }
    public function status(): JsonResponse
    {
        return response()->json(['status' => 'operational', 'platform' => 'SECRETIS ERP', 'version' => config('app.version', '2.3.0')]);
    }
    public function pricing(): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function features(): JsonResponse
    {
        return response()->json(['data' => []]);
    }
}
