<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeatureFlagController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function toggle(Request $r, $flag): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function store(Request $r): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function update(Request $r, $id): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function destroy(Request $r, $id): JsonResponse
    {
        return response()->json(['success' => true]);
    }
}
