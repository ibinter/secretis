<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceController extends Controller
{
    public function register(Request $r): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function unregister(Request $r): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function index(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
}
