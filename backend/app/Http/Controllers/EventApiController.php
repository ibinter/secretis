<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventApiController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function store(Request $r): JsonResponse
    {
        return response()->json(['success' => true, 'data' => []]);
    }
    public function show(Request $r, $id): JsonResponse
    {
        return response()->json(['data' => null]);
    }
    public function update(Request $r, $id): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function destroy(Request $r, $id): JsonResponse
    {
        return response()->json(['success' => true]);
    }
    public function calendar(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
    public function upcoming(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
}
