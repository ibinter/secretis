<?php

namespace App\Services;

use App\Models\StockCount;
use App\Models\Supply;
use App\Models\SupplyMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Mouvements de stock, valorisation et inventaire physique.
 *
 * Remplace `ResourceService::processSupplyMovement`, qui présentait deux
 * défauts de fond :
 *
 *   — LA QUANTITÉ ÉTAIT CALCULÉE EN PHP à partir d'un modèle lu AVANT la
 *     transaction, sans verrou. Deux sorties simultanées lisaient toutes deux
 *     100, écrivaient toutes deux 95, et cinq unités disparaissaient sans
 *     trace. Le contrôle « stock suffisant » se faisait lui aussi hors
 *     transaction, donc sur une valeur déjà périmée.
 *
 *   — AUCUN COÛT n'accompagnait le mouvement. Le stock n'avait donc pas de
 *     valeur, seulement un décompte d'unités.
 *
 * La valorisation retenue est le COÛT MOYEN UNITAIRE PONDÉRÉ (CMUP), recalculé
 * à chaque entrée :
 *
 *     CMUP = (valeur du stock existant + valeur de l'entrée)
 *            ÷ (quantité existante + quantité entrée)
 *
 * C'est la méthode admise par le SYSCOHADA, et la seule tenable sans suivi par
 * lot : elle ne demande qu'un chiffre par article, là où le FIFO exigerait de
 * conserver chaque couche d'approvisionnement.
 */
class StockService
{
    /** Un mouvement d'entrée valorisé recalcule le coût moyen. */
    public const SOURCES = ['manual', 'goods_receipt', 'supplier_invoice', 'stock_count'];

    public function __construct(private NotificationService $notifications) {}

    /**
     * Entrée en stock.
     *
     * @param float|null $coutUnitaire Coût réel de l'entrée. À null, le coût
     *                                 moyen actuel est reconduit : l'entrée ne
     *                                 déforme alors pas la valorisation.
     */
    public function entrer(
        Supply  $supply,
        int     $quantite,
        string  $motif,
        User    $auteur,
        ?float  $coutUnitaire = null,
        string  $source = 'manual',
        ?int    $sourceId = null,
    ): SupplyMovement {
        return $this->mouvement($supply, 'in', $quantite, $motif, $auteur, $coutUnitaire, $source, $sourceId);
    }

    /**
     * Sortie de stock.
     *
     * Une sortie est toujours valorisée au coût moyen du moment : c'est ce qui
     * fait que la valeur du stock reste cohérente avec sa quantité.
     */
    public function sortir(
        Supply  $supply,
        int     $quantite,
        string  $motif,
        User    $auteur,
        string  $source = 'manual',
        ?int    $sourceId = null,
    ): SupplyMovement {
        return $this->mouvement($supply, 'out', $quantite, $motif, $auteur, null, $source, $sourceId);
    }

    /**
     * Cœur du mouvement. Tout passe par ici, verrou compris.
     */
    private function mouvement(
        Supply  $supply,
        string  $type,
        int     $quantite,
        string  $motif,
        User    $auteur,
        ?float  $coutUnitaire,
        string  $source,
        ?int    $sourceId,
    ): SupplyMovement {
        if ($quantite <= 0) {
            throw new \InvalidArgumentException('La quantité doit être strictement positive.');
        }

        $mouvement = DB::transaction(function () use ($supply, $type, $quantite, $motif, $auteur, $coutUnitaire, $source, $sourceId) {
            // Verrou de ligne : la lecture, le contrôle et l'écriture doivent
            // porter sur la même version de la fourniture. C'est précisément ce
            // qui manquait.
            $verrouillee = Supply::whereKey($supply->getKey())->lockForUpdate()->firstOrFail();

            $avant = (int) $verrouillee->quantity;

            if ($type === 'out' && $avant < $quantite) {
                throw new \RuntimeException(sprintf(
                    'Stock insuffisant pour « %s » : %d %s disponible(s), %d demandé(s).',
                    $verrouillee->name,
                    $avant,
                    $verrouillee->unit,
                    $quantite
                ));
            }

            $apres  = $type === 'in' ? $avant + $quantite : $avant - $quantite;
            $moyen  = (float) $verrouillee->average_cost;

            if ($type === 'in') {
                // Coût moyen pondéré. Un stock initialement négatif ou nul ne
                // pondère rien : l'entrée fixe alors seule le coût.
                $cout = $coutUnitaire ?? $moyen;

                $moyen = $avant > 0 && $apres > 0
                    ? (($avant * $moyen) + ($quantite * $cout)) / $apres
                    : $cout;

                $verrouillee->last_cost = $cout;
            } else {
                // La sortie est valorisée au coût moyen : elle ne le modifie
                // pas. C'est ce qui distingue une consommation d'un achat.
                $cout = $moyen;
            }

            $verrouillee->quantity     = $apres;
            $verrouillee->average_cost = round($moyen, 4);
            $verrouillee->save();

            return SupplyMovement::create([
                'organization_id' => $verrouillee->organization_id,
                'supply_id'       => $verrouillee->id,
                'user_id'         => $auteur->id,
                'type'            => $type,
                'quantity'        => $quantite,
                'stock_before'    => $avant,
                'stock_after'     => $apres,
                'unit_cost'       => round($cout, 4),
                'total_cost'      => round($cout * $quantite, 2),
                'reason'          => $motif,
                'source_type'     => in_array($source, self::SOURCES, true) ? $source : 'manual',
                'source_id'       => $sourceId,
            ]);
        });

        // L'alerte est envoyée APRÈS le commit : prévenir d'un seuil franchi
        // dans une transaction qui peut encore échouer produirait de fausses
        // alertes. Et une notification qui échoue ne doit pas annuler un
        // mouvement de stock physiquement constaté.
        if ($type === 'out') {
            $this->alerterSiSeuilFranchi($supply->fresh(), $mouvement->stock_before);
        }

        return $mouvement;
    }

    /**
     * Alerte de réapprovisionnement.
     *
     * L'ancien code écrivait `Log::info("Alerte stock bas : …")` — une alerte
     * que personne ne lit n'est pas une alerte. Et elle n'est émise qu'au
     * FRANCHISSEMENT du seuil, pas à chaque sortie sous le seuil : sinon la
     * même fourniture notifie à chaque crayon sorti et plus personne n'y prête
     * attention.
     */
    private function alerterSiSeuilFranchi(Supply $supply, int $avant): void
    {
        $seuil = (int) $supply->min_quantity;

        if ($seuil <= 0 || $avant <= $seuil || $supply->quantity > $seuil) {
            return;
        }

        // Deux systemes de roles coexistent dans l'application : la colonne
        // `role` ('employee' | 'admin' | 'superadmin') et les roles Spatie
        // ('admin_org', 'superadmin_ibig'). Enumerer les roles administratifs
        // revient a parier sur un vocabulaire qui a deja derive — j'avais
        // ecrit 'super_admin' quand la base contient 'superadmin', et
        // l'alerte ne partait a personne.
        //
        // On exclut donc les employes plutot que d'enumerer les responsables :
        // un role ajoute plus tard recevra l'alerte par defaut. Prevenir un
        // compte de trop coute infiniment moins cher que de ne prevenir
        // personne d'une rupture de stock.
        $destinataires = User::where('organization_id', $supply->organization_id)
            ->where('status', 'active')
            ->whereNotNull('role')
            ->where('role', '!=', 'employee')
            ->get();

        if ($destinataires->isEmpty()) {
            \Illuminate\Support\Facades\Log::warning(
                'Stock bas sans destinataire : aucun compte administratif actif.',
                ['supply_id' => $supply->id, 'organization_id' => $supply->organization_id]
            );

            return;
        }

        foreach ($destinataires as $destinataire) {
            try {
                $this->notifications->send(
                    $destinataire,
                    'stock_low',
                    'Stock bas — ' . $supply->name,
                    sprintf(
                        'Il reste %d %s (seuil : %d). Pensez à réapprovisionner.',
                        $supply->quantity,
                        $supply->unit,
                        $seuil
                    ),
                    ['supply_id' => $supply->id, 'url' => '/resources/fournitures'],
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }

    // ─── Valorisation ───────────────────────────────────────────────────────

    /**
     * Valeur du stock, article par article et au total.
     *
     * @return array{total: float, lignes: \Illuminate\Support\Collection}
     */
    public function valorisation(int $orgId): array
    {
        $lignes = Supply::where('organization_id', $orgId)
            ->orderBy('name')
            ->get()
            ->map(fn (Supply $s) => [
                'id'           => $s->id,
                'name'         => $s->name,
                'unit'         => $s->unit,
                'quantity'     => (int) $s->quantity,
                'min_quantity' => (int) $s->min_quantity,
                'average_cost' => round((float) $s->average_cost, 2),
                'valeur'       => round($s->quantity * (float) $s->average_cost, 2),
                'sous_seuil'   => $s->quantity <= $s->min_quantity,
            ]);

        return [
            'total'  => round($lignes->sum('valeur'), 2),
            'lignes' => $lignes,
        ];
    }

    // ─── Inventaire physique ────────────────────────────────────────────────

    /**
     * Ouvre un comptage.
     *
     * La quantité théorique est FIGÉE ligne par ligne à l'ouverture. La
     * comparer, à la clôture, au stock courant donnerait un écart faussé par
     * tous les mouvements survenus pendant le comptage — et ferait passer une
     * consommation normale pour une perte.
     */
    public function ouvrirInventaire(int $orgId, User $auteur, ?string $lieu = null, ?string $note = null): StockCount
    {
        return DB::transaction(function () use ($orgId, $auteur, $lieu, $note) {
            $ouvert = StockCount::where('organization_id', $orgId)->where('status', 'open')->first();

            if ($ouvert) {
                throw new \RuntimeException(
                    "Un inventaire est déjà en cours ({$ouvert->reference}). "
                    . "Deux comptages simultanés produiraient des régularisations contradictoires."
                );
            }

            $rang = StockCount::where('organization_id', $orgId)
                ->whereYear('created_at', now()->year)
                ->count() + 1;

            $inventaire = StockCount::create([
                'organization_id' => $orgId,
                'reference'       => sprintf('INV-%d-%03d', now()->year, $rang),
                'count_date'      => today(),
                'location'        => $lieu,
                'status'          => 'open',
                'notes'           => $note,
                'created_by'      => $auteur->id,
            ]);

            $fournitures = Supply::where('organization_id', $orgId)
                ->when($lieu, fn ($q) => $q->where('location', $lieu))
                ->lockForUpdate()
                ->get();

            foreach ($fournitures as $supply) {
                $inventaire->lines()->create([
                    'supply_id'         => $supply->id,
                    'expected_quantity' => (int) $supply->quantity,
                    'counted_quantity'  => null,
                    'unit_cost'         => (float) $supply->average_cost,
                ]);
            }

            return $inventaire->load('lines');
        });
    }

    /** Saisit les quantités comptées. Une ligne non transmise reste non comptée. */
    public function saisirComptage(StockCount $inventaire, array $comptages): void
    {
        if ($inventaire->status !== 'open') {
            throw new \RuntimeException("L'inventaire {$inventaire->reference} est clos.");
        }

        DB::transaction(function () use ($inventaire, $comptages) {
            foreach ($comptages as $ligneId => $quantite) {
                if ($quantite === null || $quantite === '') {
                    continue;
                }

                $inventaire->lines()
                    ->whereKey($ligneId)
                    ->update(['counted_quantity' => max(0, (int) $quantite), 'updated_at' => now()]);
            }
        });
    }

    /**
     * Clôture le comptage et régularise les écarts.
     *
     * Chaque écart produit un MOUVEMENT tracé, jamais une écriture directe sur
     * la quantité : une correction sans mouvement est indiscernable d'une
     * erreur, et rend le journal de stock incohérent avec les quantités.
     *
     * @return array{regularisations: int, ecart_valeur: float, non_comptees: int}
     */
    public function cloturerInventaire(StockCount $inventaire, User $auteur): array
    {
        if ($inventaire->status !== 'open') {
            throw new \RuntimeException("L'inventaire {$inventaire->reference} est déjà clos.");
        }

        $lignes = $inventaire->lines()->with('supply')->get();

        $nonComptees = $lignes->whereNull('counted_quantity')->count();
        $regularisations = 0;
        $ecartValeur = 0.0;

        foreach ($lignes as $ligne) {
            if ($ligne->counted_quantity === null || ! $ligne->supply) {
                continue;
            }

            $ecart = (int) $ligne->counted_quantity - (int) $ligne->expected_quantity;

            if ($ecart === 0) {
                continue;
            }

            $motif = sprintf(
                'Régularisation inventaire %s : théorique %d, compté %d',
                $inventaire->reference,
                $ligne->expected_quantity,
                $ligne->counted_quantity
            );

            // Le coût figé à l'ouverture sert de référence : l'écart est
            // valorisé au prix auquel l'article était inscrit, pas à un coût
            // moyen qui aurait bougé entre-temps.
            if ($ecart > 0) {
                $this->entrer($ligne->supply, $ecart, $motif, $auteur, (float) $ligne->unit_cost, 'stock_count', $inventaire->id);
            } else {
                $this->sortir($ligne->supply, abs($ecart), $motif, $auteur, 'stock_count', $inventaire->id);
            }

            $regularisations++;
            $ecartValeur += $ecart * (float) $ligne->unit_cost;
        }

        $inventaire->update([
            'status'    => 'closed',
            'closed_by' => $auteur->id,
            'closed_at' => now(),
        ]);

        return [
            'regularisations' => $regularisations,
            'ecart_valeur'    => round($ecartValeur, 2),
            'non_comptees'    => $nonComptees,
        ];
    }
}
