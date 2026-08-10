<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * OBSOLÈTE — remplacée par `licence:recalculer`.
 *
 * Cette commande était un SECOND MOTEUR d'états, concurrent de LicenceService,
 * et il se trompait sur trois points :
 *
 *  1. UN ESSAI ÉCHU PASSAIT EN PÉRIODE DE GRÂCE (`status = 'suspended'`), donc
 *     vers l'expiration. La décision D6 veut l'inverse : un essai qui s'achève
 *     bascule en palier Découverte, sans rien couper ni supprimer. Le client
 *     se serait retrouvé en compte échu au lieu du palier gratuit.
 *
 *  2. LA DURÉE DE GRÂCE ÉTAIT ÉCRITE EN DUR (`now()->addDays(7)`), troisième
 *     source de vérité après licence.config.json et config('payment').
 *
 *  3. ELLE ÉCRIVAIT `status` SANS TOUCHER À `etat`. Depuis la migration du
 *     modèle à six états, un déclencheur réaligne `status` sur `etat` à chaque
 *     écriture : ses mises à jour étaient donc silencieusement annulées. Elle
 *     ne faisait plus rien — sauf envoyer les e-mails, dont ceux annonçant un
 *     « compte suspendu », terme banni par le glossaire.
 *
 * On ne la supprime pas : une commande qui disparaît laisse une planification
 * ou un script d'exploitation en erreur. Elle redirige, et le dit.
 */
class ProcessExpiredLicenses extends Command
{
    protected $signature = 'secretis:process-expired-licenses';

    protected $description = '[Obsolète] Utilisez licence:recalculer.';

    public function handle(): int
    {
        $this->warn('Cette commande est obsolète et ne traite plus les licences elle-même.');
        $this->line('');
        $this->line("  Elle appliquait une logique d'états concurrente du moteur :");
        $this->line('    — un essai échu y passait en période de grâce au lieu du palier Découverte ;');
        $this->line('    — la durée de grâce y était écrite en dur ;');
        $this->line("    — ses écritures étaient annulées par l'alignement de `status` sur `etat`.");
        $this->line('');
        $this->info('  Le traitement des états passe désormais par : php artisan licence:recalculer');

        // On enchaîne plutôt que de renvoyer une erreur : un script
        // d'exploitation qui appelait l'ancienne commande continue de produire
        // le bon effet, au lieu de tomber en échec sans que personne ne le voie.
        return $this->call('licence:recalculer');
    }
}
