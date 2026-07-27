<?php
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->alias([
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
            'ensureLicenseValid' => \App\Http\Middleware\EnsureValidLicense::class,
            'superadmin' => \App\Http\Middleware\SuperAdminOnly::class,
            'api.log' => \App\Http\Middleware\RequestMetrics::class,
            'auth.device' => \App\Http\Middleware\SecurityHeaders::class,
            'auth.partner' => \App\Http\Middleware\SecurityHeaders::class,
            'auth.supplier' => \App\Http\Middleware\SecurityHeaders::class,
            'ip.whitelist' => \App\Http\Middleware\SecurityHeaders::class,
            'license' => \App\Http\Middleware\CheckLicense::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'tenant' => \App\Http\Middleware\ResolveTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
