<?php

namespace App\Console\Commands;

use App\Models\License;
use App\Services\LicenceService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Purge des espaces expirés — cahier IBIG SOFT v1.1, section 9.6, tâche de 04:00 :
 * « Purge des tenants EXPIRED ayant dépassé date_purge, APRÈS journalisation et
 * sauvegarde froide conservée 12 mois. »
 *
 * C'est la seule commande du socle licence qui détruit des données. Elle est
 * donc construite à l'envers des autres : tout ce qui peut la faire renoncer la
 * fait renoncer, et le doute se tranche toujours en faveur de la conservation.
 *
 *   1. Elle ne purge que ce que le MOTEUR déclare EXPIRED — pas la colonne
 *      `etat`, qui n'est qu'un cache. Une ligne marquée EXPIRED mais qu'un
 *      paiement vient de réactiver ne doit pas disparaître parce que la tâche
 *      de 03:00 a échoué cette nuit-là.
 *   2. Elle refuse de tourner sans sauvegarde froide vérifiée.
 *   3. Elle journalise AVANT de supprimer, en base ET dans un manifeste sur
 *      disque. Depuis la migration 2026_08_09_000003, `license_transitions` et
 *      `quota_hits` n'ont plus de clé étrangère vers `organizations` : le
 *      journal SURVIT à la purge, et c'est voulu — un journal qui s'efface
 *      avec ce qu'il raconte ne prouve rien. Cette commande ne supprime donc
 *      aucune ligne de journal, et n'a pas besoin de la porte
 *      `secretis.purge_autorisee` ouverte par cette migration.
 *   4. En non interactif elle exige `--force`. Une purge lancée par erreur
 *      depuis un cron mal copié est irréversible.
 *
 * Usage :
 *   php artisan licence:purger --dry-run        # inventaire, ne touche à rien
 *   php artisan licence:purger                  # interactif, demande confirmation
 *   php artisan licence:purger --force          # planifié (04:00)
 *   php artisan licence:purger --sauvegarde=... # réutilise une sauvegarde déjà produite
 */
class LicencePurger extends Command
{
    protected $signature = 'licence:purger
                            {--force : Autorise la purge sans confirmation (obligatoire en non interactif)}
                            {--dry-run : Inventorie et journalise, ne supprime rien}
                            {--limite=0 : Nombre maximal d\'espaces traités (0 = tous)}
                            {--sauvegarde= : Clé d\'une sauvegarde froide déjà produite et vérifiée}';

    protected $description = 'Purge les espaces EXPIRED dont la date de purge est dépassée (section 9.6, 04:00)';

    /** Disque de sauvegarde utilisé par secretis:backup. */
    private const DISQUE = 's3_backup';

    /**
     * Préfixe des sauvegardes de purge.
     *
     * Volontairement HORS des préfixes `backups/daily|monthly|yearly` : la
     * rotation de secretis:backup ne connaît que ces trois-là, donc rien
     * n'expire jamais ici. La spec demande douze mois de conservation ; on en
     * garde davantage, ce qui est le bon sens pour la seule copie restante de
     * données supprimées.
     */
    private const PREFIXE_PURGE = 'backups/purges/';

    public function handle(LicenceService $licence): int
    {
        $sec = $this->option('dry-run') ? '[SIMULATION] ' : '';
        $this->info($sec . 'Purge des espaces expirés — ' . now()->format('d/m/Y H:i'));

        // ── 1. Inventaire ───────────────────────────────────────────────────
        $candidats = $this->candidats($licence);

        if ($candidats->isEmpty()) {
            $this->line('Aucun espace n\'a dépassé sa date de purge. Rien à faire.');

            return self::SUCCESS;
        }

        $this->table(
            ['Licence', 'Espace', 'État calculé', 'Fin', 'Date de purge', 'Dépassement'],
            $candidats->map(fn ($c) => [
                $c['license_id'],
                $c['organization_id'] . ' — ' . $c['organisation'],
                $c['etat_calcule'],
                $c['ends_at'],
                $c['date_purge'],
                $c['jours_depasses'] . ' j',
            ])->all()
        );

        // ── 2. Journalisation — AVANT tout le reste ─────────────────────────
        $manifeste = $this->journaliser($candidats->all(), $licence);
        $this->line('Journal écrit : ' . $manifeste);

        if ($this->option('dry-run')) {
            $this->warn('Simulation : ni sauvegarde, ni suppression. ' . $candidats->count() . ' espace(s) seraient purgés.');

            return self::SUCCESS;
        }

        // ── 3. Autorisation ─────────────────────────────────────────────────
        if (! $this->autorise($candidats->count())) {
            $this->warn('Purge annulée. Rien n\'a été supprimé.');

            return self::FAILURE;
        }

        // ── 4. Sauvegarde froide — sans elle, on ne purge pas ───────────────
        try {
            $sauvegarde = $this->sauvegardeFroide();
        } catch (\Throwable $e) {
            $this->error('Sauvegarde froide indisponible : ' . $e->getMessage());
            $this->error('PURGE ABANDONNÉE. Aucune donnée n\'a été supprimée.');

            Log::critical('[licence:purger] purge refusée faute de sauvegarde froide', [
                'erreur'    => $e->getMessage(),
                'candidats' => $candidats->pluck('organization_id')->all(),
            ]);

            return self::FAILURE;
        }

        $this->info('Sauvegarde froide vérifiée : ' . $sauvegarde);

        // ── 5. Suppression ──────────────────────────────────────────────────
        $purges = 0;
        $echecs = 0;

        foreach ($candidats as $c) {
            try {
                $supprime = $this->purgerEspace($c, $sauvegarde);
                $purges++;

                $this->line(sprintf('  ✓ Espace %d (%s) purgé — %s',
                    $c['organization_id'], $c['organisation'],
                    collect($supprime)->map(fn ($n, $t) => "$t: $n")->implode(', ')));
            } catch (\Throwable $e) {
                $echecs++;
                $this->error(sprintf('  ✗ Espace %d : %s', $c['organization_id'], $e->getMessage()));

                Log::error('[licence:purger] échec de purge', [
                    'organization_id' => $c['organization_id'],
                    'erreur'          => $e->getMessage(),
                ]);
            }
        }

        $this->info(sprintf('%d espace(s) purgé(s), %d échec(s). Sauvegarde : %s', $purges, $echecs, $sauvegarde));

        return $echecs === 0 ? self::SUCCESS : self::FAILURE;
    }

    // ─── Inventaire ─────────────────────────────────────────────────────────

    /**
     * Les espaces réellement purgeables.
     *
     * Deux conditions cumulatives, et la seconde est la plus importante :
     * `date_purge` dépassée ET état CALCULÉ égal à EXPIRED. La colonne `etat`
     * seule ne suffit pas — c'est un cache rafraîchi par la tâche de 03:00, qui
     * peut avoir échoué.
     *
     * @return \Illuminate\Support\Collection<int,array<string,mixed>>
     */
    private function candidats(LicenceService $licence)
    {
        $limite = (int) $this->option('limite');

        $requete = License::query()
            ->whereNull('superseded_at')
            ->whereNotNull('date_purge')
            ->where('date_purge', '<=', now())
            ->where('etat', 'EXPIRED')
            ->orderBy('date_purge');

        if ($limite > 0) {
            $requete->limit($limite);
        }

        return $requete->get()
            ->map(function (License $l) use ($licence) {
                $calcule = $licence->etat((int) $l->organization_id);

                return [
                    'license_id'      => $l->id,
                    'organization_id' => (int) $l->organization_id,
                    'organisation'    => (string) (DB::table('organizations')->where('id', $l->organization_id)->value('name') ?? '—'),
                    'etat_calcule'    => $calcule,
                    'ends_at'         => $l->ends_at ? Carbon::parse($l->ends_at)->toDateString() : null,
                    'date_purge'      => Carbon::parse($l->date_purge)->toDateString(),
                    'jours_depasses'  => (int) Carbon::parse($l->date_purge)->startOfDay()->diffInDays(now()->startOfDay()),
                    'cle_licence'     => $l->cle_licence,
                ];
            })
            // Le désaccord entre la colonne et le calcul n'est pas une erreur à
            // corriger ici : c'est une raison de ne pas supprimer.
            ->filter(function ($c) {
                if ($c['etat_calcule'] !== 'EXPIRED') {
                    $this->warn(sprintf(
                        '  Espace %d écarté : la colonne dit EXPIRED, le moteur dit %s.',
                        $c['organization_id'], $c['etat_calcule']
                    ));

                    return false;
                }

                return true;
            })
            ->values();
    }

    // ─── Journal ────────────────────────────────────────────────────────────

    /**
     * Écrit le manifeste de purge, la transition en base et le journal applicatif.
     *
     * Le manifeste sur disque n'est pas redondant avec `license_transitions` :
     * il porte le détail de ce qui a été retenu (nom de l'espace, dates,
     * dépassement) là où la table porte la transition. Les deux survivent à la
     * purge, l'un parce que c'est un fichier, l'autre parce que la migration
     * 2026_08_09_000003 a détaché le journal de l'organisation.
     */
    private function journaliser(array $candidats, LicenceService $licence): string
    {
        $horodatage = now()->format('Y-m-d_H-i-s');
        $chemin     = 'purges/purge-' . $horodatage . '.json';

        $contenu = [
            'horodatage'  => now()->toIso8601String(),
            'solution'    => $licence->solution(),
            'mode'        => $this->option('dry-run') ? 'simulation' : 'reelle',
            'retention_j' => $licence->retentionJours(),
            'espaces'     => $candidats,
        ];

        Storage::disk('local')->put(
            $chemin,
            json_encode($contenu, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        Log::warning('[licence:purger] espaces retenus pour purge', [
            'mode'     => $contenu['mode'],
            'nombre'   => count($candidats),
            'espaces'  => array_column($candidats, 'organization_id'),
            'manifeste' => $chemin,
        ]);

        if (! $this->option('dry-run')) {
            foreach ($candidats as $c) {
                $l = License::find($c['license_id']);

                if ($l) {
                    $licence->journaliser($l, 'EXPIRED', 'EXPIRED', 'Purge après rétention — manifeste ' . $chemin, 'systeme', null, $c);
                }
            }
        }

        return storage_path('app/' . $chemin);
    }

    // ─── Garde-fous ─────────────────────────────────────────────────────────

    /**
     * Une purge non interactive sans `--force` est presque toujours un
     * accident : un cron recopié, un script de déploiement trop zélé.
     */
    private function autorise(int $nombre): bool
    {
        if ($this->option('force')) {
            return true;
        }

        if (! $this->input->isInteractive()) {
            $this->error('Purge irréversible en mode non interactif : --force est obligatoire.');

            return false;
        }

        $this->warn(sprintf(
            'Cette opération supprime DÉFINITIVEMENT %d espace(s) et toutes leurs données.',
            $nombre
        ));

        return $this->confirm('Confirmer la purge ?', false);
    }

    /**
     * Produit — ou retrouve — la sauvegarde froide, et la met à l'abri de la
     * rotation. Toute anomalie lève : l'appelant abandonne la purge.
     */
    private function sauvegardeFroide(): string
    {
        if (! config('filesystems.disks.' . self::DISQUE)) {
            throw new \RuntimeException(
                'Le disque « ' . self::DISQUE . ' » n\'est pas configuré dans config/filesystems.php. '
                . 'secretis:backup ne peut donc rien déposer, et une purge sans copie froide est interdite.'
            );
        }

        $disque = Storage::disk(self::DISQUE);

        // Réutilisation d'une sauvegarde déjà produite (reprise après incident).
        if ($cle = $this->option('sauvegarde')) {
            if (! $disque->exists($cle)) {
                throw new \RuntimeException("La sauvegarde indiquée est introuvable : {$cle}");
            }

            return $this->mettreAlAbri($disque, $cle);
        }

        $avant = collect($disque->allFiles('backups'))->flip();

        $this->line('Production de la sauvegarde froide (secretis:backup --type=full)...');
        $code = Artisan::call('secretis:backup', ['--type' => 'full']);

        if ($code !== self::SUCCESS) {
            throw new \RuntimeException("secretis:backup a échoué (code {$code}). " . trim(Artisan::output()));
        }

        $nouveaux = collect($disque->allFiles('backups'))
            ->reject(fn ($f) => $avant->has($f))
            // Les fichiers annexes ne sont pas la sauvegarde.
            ->reject(fn ($f) => str_ends_with($f, '.sha256') || str_ends_with($f, '.iv'))
            ->values();

        if ($nouveaux->isEmpty()) {
            throw new \RuntimeException(
                'secretis:backup s\'est terminé sans erreur mais aucun fichier nouveau n\'est arrivé sur le disque de sauvegarde.'
            );
        }

        $recente = $nouveaux->sortByDesc(fn ($f) => $disque->lastModified($f))->first();

        return $this->mettreAlAbri($disque, $recente);
    }

    /** Copie la sauvegarde sous un préfixe que la rotation ne balaie jamais. */
    private function mettreAlAbri($disque, string $cle): string
    {
        $destination = self::PREFIXE_PURGE . now()->format('Y/m/') . basename($cle);

        if (! $disque->exists($destination)) {
            $disque->copy($cle, $destination);

            foreach (['.sha256', '.iv'] as $annexe) {
                if ($disque->exists($cle . $annexe)) {
                    $disque->copy($cle . $annexe, $destination . $annexe);
                }
            }
        }

        if (! $disque->exists($destination) || $disque->size($destination) < 1) {
            throw new \RuntimeException("La copie de sauvegarde est absente ou vide : {$destination}");
        }

        return $destination;
    }

    // ─── Suppression ────────────────────────────────────────────────────────

    /**
     * Supprime un espace et ses dépendances de licence.
     *
     * `organizations` est en suppression douce : un `delete()` ordinaire ne
     * purgerait rien du tout, il poserait juste un `deleted_at`. La purge de la
     * section 9.6 est une destruction, donc une suppression en base par
     * requête, qui ignore la suppression douce — et les clés étrangères en
     * cascade emportent le reste.
     *
     * NE SONT PAS SUPPRIMÉS, volontairement : `license_transitions` et
     * `quota_hits`. Depuis la migration 2026_08_09_000003 ils n'ont plus de
     * clé étrangère vers `organizations` et survivent donc à la cascade. La
     * section 9.6 exige que la purge soit journalisée : effacer le journal en
     * même temps que l'espace viderait l'exigence de sa substance.
     *
     * @return array<string,int> nombre de lignes supprimées par table
     */
    private function purgerEspace(array $candidat, string $sauvegarde): array
    {
        return DB::transaction(function () use ($candidat, $sauvegarde) {
            $orgId = $candidat['organization_id'];

            $compte = [
                'quotas_usage' => DB::table('quotas_usage')->where('organization_id', $orgId)->delete(),
                'licenses'     => DB::table('licenses')->where('organization_id', $orgId)->delete(),
            ];

            $compte['organizations'] = (int) DB::table('organizations')->where('id', $orgId)->delete();

            Log::warning('[licence:purger] espace purgé', [
                'organization_id' => $orgId,
                'organisation'    => $candidat['organisation'],
                'sauvegarde'      => $sauvegarde,
                'supprime'        => $compte,
            ]);

            return $compte;
        });
    }
}
