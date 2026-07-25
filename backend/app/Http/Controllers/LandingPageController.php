<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;

class LandingPageController extends Controller
{
    private function serve()
    {
        $html = file_get_contents(resource_path('views/landing.html'));
        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    public function index()   { return $this->serve(); }
    public function about()   { return $this->serve(); }
    public function pricing() { return $this->serve(); }
    public function features(){ return $this->serve(); }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
