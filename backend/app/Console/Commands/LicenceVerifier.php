<?php

namespace App\Console\Commands;

use App\Services\LicenceService;
use App\Support\LicenceAudit;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Chasse aux incohérences — cahier IBIG SOFT v1.1, section 12.8.
 *
 * C'est la commande d'audit. Elle ÉCHOUE (code de sortie non nul) dès qu'elle
 * trouve, dans le dépôt ou en base :
 *
 *   - une durée, un plafond ou un prix écrit en dur hors de licence.config.json ;
 *   - un terme banni du glossaire (liste lue dans licence.config.json) ;
 *   - une licence sans date de fin en dehors de DEMO et FREE ;
 *   - une durée d'essai TRIAL non conforme à la configuration.
 *
 * Elle ne corrige rien, et c'est délibéré : une correction automatique sur un
 * fichier de langue ou un contrat produirait des phrases fausses. Elle donne
 * fichier, ligne et chaîne trouvée, pour que la réparation soit décidée.
 *
 * Le balayage du dépôt vit dans App\Support\LicenceAudit — du PHP nu, sans
 * façade — pour rester exécutable même quand l'application ne démarre pas.
 * La liste des exclusions y est commentée une par une.
 *
 * Usage :
 *   php artisan licence:verifier
 *   php artisan licence:verifier --sans-base      # dépôt seul (poste sans base)
 *   php artisan licence:verifier --regle=TERME_BANNI
 *   php artisan licence:verifier --json --rapport=storage/app/audit-licence.json
 */
class LicenceVerifier extends Command
{
    protected $signature = 'licence:verifier
                            {--sans-base : N\'exécute pas les contrôles en base (poste de développement sans base)}
                            {--sans-depot : N\'exécute pas le balayage du dépôt}
                            {--regle= : Ne montrer qu\'une règle (DUREE_LITTERALE, PLAFOND_LITTERAL, PERPETUITE, TERME_BANNI, PRIX_LITTERAL)}
                            {--max=25 : Nombre de constats affichés par règle (0 = tous)}
                            {--rapport= : Écrit l\'inventaire complet en JSON dans ce fichier}
                            {--json : Sortie machine sur la sortie standard}';

    protected $description = 'Audit de cohérence des licences (section 12.8) — échoue si une incohérence est trouvée';

    public function handle(LicenceService $licence): int
    {
        $constats = [];
        $avertissements = [];

        // ── 1. Le dépôt ─────────────────────────────────────────────────────
        if (! $this->option('sans-depot')) {
            $audit = new LicenceAudit($this->racineDepot(), $licence->config());

            $constats = array_merge($constats, $audit->scanner());

            foreach ($audit->fichiersIgnores() as $ignore) {
                $avertissements[] = "Fichier trop volumineux, non inspecté : {$ignore}";
            }
        }

        // ── 2. La base ──────────────────────────────────────────────────────
        if ($this->option('sans-base')) {
            $avertissements[] = 'Contrôles en base non exécutés (--sans-base) : l\'audit est incomplet.';
        } else {
            try {
                $constats = array_merge($constats, $this->controlesEnBase($licence));
            } catch (\Throwable $e) {
                // Un audit qui saute silencieusement la moitié de ses contrôles
                // ment par omission : la base injoignable est un échec, pas un
                // avertissement.
                $this->error('Contrôles en base impossibles : ' . $e->getMessage());
                $this->error('Relancez avec --sans-base pour n\'auditer que le dépôt, en connaissance de cause.');

                return self::FAILURE;
            }
        }

        if ($regle = $this->option('regle')) {
            $constats = array_values(array_filter($constats, fn ($c) => $c['regle'] === strtoupper($regle)));
        }

        if ($chemin = $this->option('rapport')) {
            file_put_contents($chemin, json_encode($constats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }

        return $this->rendre($constats, $avertissements);
    }

    // ─── Contrôles en base (section 12.8) ────────────────────────────────────

    /** @return list<array<string,mixed>> */
    private function controlesEnBase(LicenceService $licence): array
    {
        $constats = [];

        // Aucune licence sans date de fin hors DEMO et FREE. La contrainte
        // `licences_jamais_perpetuelle` l'interdit déjà ; on vérifie quand même,
        // parce qu'une contrainte peut être posée NOT VALID, désactivée, ou
        // absente d'un environnement recréé à la main.
        $sansFin = DB::table('licenses')
            ->whereNull('ends_at')
            ->where(function ($q) {
                $q->whereNull('etat')->orWhereNotIn('etat', LicenceService::SANS_ECHEANCE);
            })
            ->get(['id', 'organization_id', 'solution', 'etat', 'status']);

        foreach ($sansFin as $l) {
            $constats[] = [
                'regle'   => 'LICENCE_SANS_FIN',
                'fichier' => 'base:licenses',
                'ligne'   => (int) $l->id,
                'motif'   => 'ends_at IS NULL hors DEMO/FREE',
                'extrait' => sprintf('licence #%d — espace %d — état %s (status %s)',
                    $l->id, $l->organization_id, $l->etat ?? 'NULL', $l->status ?? '—'),
            ];
        }

        // Durée d'essai non conforme. La référence est `essai_jours`, plus la
        // prolongation quand elle a été accordée — une seule fois, section 5.5.
        $essai        = $licence->essaiJours();
        $prolongation = (int) ($licence->config()['prolongation_jours'] ?? 0);

        $trials = DB::table('licenses')
            ->where('etat', 'TRIAL')
            ->whereNotNull('starts_at')
            ->whereNotNull('ends_at')
            ->get(['id', 'organization_id', 'starts_at', 'ends_at', 'prolongation_faite']);

        foreach ($trials as $l) {
            $duree = (int) round(Carbon::parse($l->starts_at)->diffInDays(Carbon::parse($l->ends_at), false));

            $attendue = $l->prolongation_faite ? $essai + $prolongation : $essai;

            // Une tolérance d'un jour : `starts_at` porte une heure, `ends_at`
            // aussi, et un décalage de fuseau ne fait pas une licence fautive.
            if (abs($duree - $attendue) <= 1) {
                continue;
            }

            $constats[] = [
                'regle'   => 'ESSAI_NON_CONFORME',
                'fichier' => 'base:licenses',
                'ligne'   => (int) $l->id,
                'motif'   => "durée attendue {$attendue} j",
                'extrait' => sprintf('licence #%d — espace %d — %d jour(s) du %s au %s%s',
                    $l->id, $l->organization_id, $duree,
                    Carbon::parse($l->starts_at)->toDateString(),
                    Carbon::parse($l->ends_at)->toDateString(),
                    $l->prolongation_faite ? ' (prolongé)' : ''),
            ];
        }

        return $constats;
    }

    // ─── Restitution ────────────────────────────────────────────────────────

    /** @param list<array<string,mixed>> $constats */
    private function rendre(array $constats, array $avertissements): int
    {
        if ($this->option('json')) {
            $this->line(json_encode([
                'constats'       => $constats,
                'total'          => count($constats),
                'par_regle'      => array_count_values(array_column($constats, 'regle')),
                'avertissements' => $avertissements,
                'conforme'       => $constats === [],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            return $constats === [] ? self::SUCCESS : self::FAILURE;
        }

        $this->info('Audit de cohérence des licences — section 12.8');

        foreach ($avertissements as $a) {
            $this->warn('  ! ' . $a);
        }

        if ($constats === []) {
            $this->info('Aucune incohérence trouvée.');

            return self::SUCCESS;
        }

        $max = (int) $this->option('max');

        foreach (collect($constats)->groupBy('regle') as $regle => $liste) {
            $this->newLine();
            $this->error(sprintf('%s — %d constat(s)', $regle, $liste->count()));

            foreach ($liste->take($max > 0 ? $max : PHP_INT_MAX) as $c) {
                $this->line(sprintf('  %s:%d  %s', $c['fichier'], $c['ligne'], $c['extrait']));
            }

            if ($max > 0 && $liste->count() > $max) {
                $this->line(sprintf('  … %d autre(s). --max=0 pour tout voir, --rapport=… pour l\'inventaire complet.',
                    $liste->count() - $max));
            }
        }

        $this->newLine();
        $this->error(sprintf('%d incohérence(s). L\'audit échoue.', count($constats)));

        return self::FAILURE;
    }

    /**
     * Racine du dépôt : le dossier qui contient `backend/`.
     *
     * L'audit ne s'arrête pas au code PHP — la section 12.8 demande de chercher
     * « dans TOUT le dépôt, contenus et documentation compris ». Le frontend,
     * la page de vente et les guides sont précisément les surfaces où une durée
     * périmée survit le plus longtemps.
     */
    private function racineDepot(): string
    {
        $parent = dirname(base_path());

        return is_dir($parent . '/docs') || is_dir($parent . '/frontend') ? $parent : base_path();
    }
}
