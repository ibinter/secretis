<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;

/**
 * CreatesApplication — Bootstrap de l'application pour les tests
 *
 * Ce trait est utilisé par le TestCase de base pour créer l'instance
 * de l'application Laravel lors de chaque suite de tests.
 */
trait CreatesApplication
{
    /**
     * Crée l'application Laravel pour les tests.
     */
    public function createApplication(): Application
    {
        $app = require __DIR__ . '/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }
}
