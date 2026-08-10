<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ClearClientCache
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $response->headers->set('Clear-Site-Data', '"cache"');
        return $response;
    }
}
