<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;

/**
 * Classe de base des tests.
 *
 * Elle porte UN garde-fou, et il n'est pas décoratif : jusqu'ici, `phpunit.xml`
 * laissait `DB_CONNECTION` en commentaire. Un test Feature s'exécutait donc sur
 * la base indiquée par `.env` — c'est-à-dire `secretis_prod`. Le premier test
 * utilisant `RefreshDatabase` aurait effacé la production.
 *
 * La configuration a été corrigée, mais une configuration se remplace, se
 * copie et se déploie de travers. Le contrôle vit donc ici, à un endroit que
 * tout test traverse, et il ARRÊTE la suite au lieu de la sauter : un test
 * ignoré passe inaperçu dans un rapport vert.
 */
abstract class TestCase extends BaseTestCase
{
    /**
     * Fragments interdits dans le nom de la base de test.
     *
     * On raisonne par exclusion plutôt que par liste blanche : un
     * environnement futur pourra nommer sa base autrement, mais aucun ne devra
     * jamais l'appeler « prod ».
     */
    private const INTERDITS = ['prod', 'production', 'live'];

    protected function setUp(): void
    {
        parent::setUp();

        $this->refuserBaseDeProduction();
    }

    private function refuserBaseDeProduction(): void
    {
        $base = DB::connection()->getDatabaseName();

        foreach (self::INTERDITS as $interdit) {
            if (str_contains(strtolower((string) $base), $interdit)) {
                $this->fail(
                    "REFUS D'EXÉCUTION : les tests visent la base « {$base} », "
                    . "dont le nom désigne un environnement de production.\n"
                    . "Vérifiez `DB_DATABASE` dans phpunit.xml — un test qui rafraîchit "
                    . "la base détruirait les données réelles."
                );
            }
        }

        // Une base de test qui ne se distingue par rien mérite aussi qu'on
        // s'arrête : c'est le signe que la configuration n'a pas été reprise.
        if (! str_contains(strtolower((string) $base), 'test')
            && ! str_contains(strtolower((string) $base), 'recette')
            && $base !== ':memory:') {
            $this->fail(
                "REFUS D'EXÉCUTION : la base « {$base} » ne porte ni « test » ni "
                . "« recette » dans son nom. Déclarez une base dédiée dans phpunit.xml."
            );
        }
    }
}
