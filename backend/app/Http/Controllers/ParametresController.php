<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ParametresController extends Controller
{
    public function index(Request $request)
    {
        if ($request->wantsJson() && !$request->hasHeader("X-Inertia")) {
            return response()->json(["data" => [], "success" => true]);
        }
        return Inertia::render("Parametres/Index", [
            "organization" => auth()->user()?->organization,
        ]);
    }

    public function __call($method, $args)
    {
        return response()->json(["data" => [], "success" => true, "stub" => "ParametresController::" . $method]);
    }
}
