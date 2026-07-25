<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametresController extends Controller
{
    public function __call($method, $args)
    {
        return response()->json(['data' => [], 'success' => true, 'stub' => 'ParametresController::' . $method]);
    }
}
