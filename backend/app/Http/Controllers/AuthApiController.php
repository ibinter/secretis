<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthApiController extends Controller
{
    public function me(Request $r): JsonResponse
    {
        return response()->json(['data' => $r->user()]);
    }
    public function logout(Request $r): JsonResponse
    {
        Auth::logout();
        return response()->json(['success' => true]);
    }
    public function refresh(Request $r): JsonResponse
    {
        return response()->json(['token' => null, 'message' => 'not_implemented']);
    }
    public function permissions(Request $r): JsonResponse
    {
        return response()->json(['data' => []]);
    }
}
