<?php
namespace App\Http\Controllers\SuperAdmin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class LicenseController extends Controller
{
    public function index(Request $r): JsonResponse { return response()->json(['data' => []]); }
    public function show(Request $r, $id): JsonResponse { return response()->json(['data' => null]); }
    public function store(Request $r): JsonResponse { return response()->json(['success' => true]); }
    public function update(Request $r, $id): JsonResponse { return response()->json(['success' => true]); }
    public function destroy(Request $r, $id): JsonResponse { return response()->json(['success' => true]); }
    public function activate(Request $r, $id): JsonResponse { return response()->json(['success' => true]); }
    public function suspend(Request $r, $id): JsonResponse { return response()->json(['success' => true]); }
    public function extend(Request $r, $id): JsonResponse { return response()->json(['success' => true]); }
    public function stats(Request $r): JsonResponse { return response()->json(['data' => []]); }
}
