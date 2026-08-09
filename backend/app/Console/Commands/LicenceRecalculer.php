<?php

namespace App\Console\Commands;

use App\Services\LicenceService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Recalcul quotidien des états de licence — cahier IBIG SOFT v1.1, section 9.6,
 * tâche de 03:00.
 *
 * TRIAL échu → FREE · ACTIVE échu → GRACE · GRACE échu → EXPIRED.
 *
 * Cette commande ne décide rien : tout le calcul vit dans
 * LicenceService::recalculerEtats(). Dupliquer ici la moindre règle de date
 * créerait une seconde vérité, et c'est exactement ce que la section 12
 * cherche à éliminer. La commande sert à déclencher, à rendre compte et à
 * laisser une trace.
 *
 * À noter : l'état affiché à l'utilisateur est calculé à chaque requête. Cette
 * tâche ne « fait » donc pas expirer un abonnement — elle met la colonne
 * `etat` en accord avec le calcul, pour que le journal des transitions et les
 * requêtes de la console superadmin voient la même chose que l'application.
 */
class LicenceRecalculer extends Command
{
    protected $signature = 'licence:recalculer
                            {--json : Sortie machine, pour la supervision}';

    protected $description = 'Recalcule les états de licence (section 9.6, 03:00) et affiche le bilan des transitions';

    public function handle(LicenceService $licence): int
    {
        $debut = microtime(true);

        try {
            $bilan = $licence->recalculerEtats();
        } catch (\Throwable $e) {
            $this->error('Recalcul interrompu : ' . $e->getMessage());

            Log::critical('[licence:recalculer] échec', [
                'erreur' => $e->getMessage(),
                'trace'  => $e->getTraceAsString(),
            ]);

            return self::FAILURE;
        }

        $duree = round(microtime(true) - $debut, 2);
        $total = array_sum($bilan);

        if ($this->option('json')) {
            $this->line(json_encode(
                ['transitions' => $bilan, 'total' => $total, 'duree_s' => $duree],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ));

            return self::SUCCESS;
        }

        $this->info('Recalcul des états de licence — ' . now()->format('d/m/Y H:i'));

        // Le bilan est affiché intégralement, y compris les lignes à zéro : une
        // transition attendue qui ne se produit jamais est une information, et
        // masquer les zéros la rendrait invisible.
        $this->table(
            ['Transition', 'Espaces'],
            collect($bilan)
                ->map(fn ($n, $cle) => [str_replace('_vers_', ' → ', $cle), $n])
                ->values()
                ->all()
        );

        $this->line($total === 0
            ? 'Aucune transition. Les états stockés étaient déjà en accord avec le calcul.'
            : sprintf('%d espace(s) ont changé d\'état.', $total));

        $this->line("Durée : {$duree}s");

        Log::info('[licence:recalculer] bilan', ['transitions' => $bilan, 'total' => $total, 'duree_s' => $duree]);

        return self::SUCCESS;
    }
}
