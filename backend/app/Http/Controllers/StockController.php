<?php

namespace App\Http\Controllers;

use App\Models\StockCount;
use App\Models\Supply;
use App\Models\SupplyMovement;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Valorisation, journal des mouvements et inventaire physique.
 *
 * L'écran « Fournitures » existant montre des quantités. Il manquait ce qui en
 * fait un stock : une valeur, une trace des mouvements, et un moyen de
 * confronter le théorique au réel.
 */
class StockController extends Controller
{
    public function __construct(private StockService $stock) {}

    /** GET /stock — valorisation et derniers mouvements. */
    public function index(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $valorisation = $this->stock->valorisation($orgId);

        $mouvements = SupplyMovement::with(['supply:id,name,unit', 'user:id,name'])
            ->where('organization_id', $orgId)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($m) => [
                'id'           => $m->id,
                'date'         => $m->created_at?->format('d/m/Y H:i'),
                'supply'       => $m->supply->name ?? '—',
                'unit'         => $m->supply->unit ?? '',
                'type'         => $m->type,
                'quantity'     => $m->quantity,
                'stock_before' => $m->stock_before,
                'stock_after'  => $m->stock_after,
                'unit_cost'    => $m->unit_cost,
                'total_cost'   => $m->total_cost,
                'reason'       => $m->reason,
                'source'       => $m->source_type,
                'user'         => $m->user->name ?? '—',
            ]);

        return Inertia::render('Stock/Index', [
            'valeurTotale'  => $valorisation['total'],
            'lignes'        => $valorisation['lignes'],
            'mouvements'    => $mouvements,
            'sousSeuil'     => $valorisation['lignes']->where('sous_seuil', true)->count(),
            'inventaireOuvert' => StockCount::where('organization_id', $orgId)
                ->where('status', 'open')
                ->value('reference'),
        ]);
    }

    /** POST /stock/mouvement — entrée ou sortie manuelle. */
    public function mouvement(Request $request): RedirectResponse
    {
        $valide = $request->validate([
            'supply_id' => ['required', 'integer'],
            'type'      => ['required', 'in:in,out'],
            'quantity'  => ['required', 'integer', 'min:1'],
            'reason'    => ['required', 'string', 'max:255'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
        ]);

        $supply = Supply::where('organization_id', $request->user()->organization_id)
            ->findOrFail($valide['supply_id']);

        try {
            $valide['type'] === 'in'
                ? $this->stock->entrer(
                    $supply, $valide['quantity'], $valide['reason'], $request->user(),
                    isset($valide['unit_cost']) ? (float) $valide['unit_cost'] : null,
                )
                : $this->stock->sortir($supply, $valide['quantity'], $valide['reason'], $request->user());
        } catch (\Throwable $e) {
            return back()->withErrors(['mouvement' => $e->getMessage()]);
        }

        return back()->with('success', 'Mouvement enregistré.');
    }

    // ─── Inventaire physique ────────────────────────────────────────────────

    /** GET /stock/inventaire — comptage en cours, ou historique. */
    public function inventaire(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $encours = StockCount::with(['lines.supply:id,name,unit'])
            ->where('organization_id', $orgId)
            ->where('status', 'open')
            ->first();

        return Inertia::render('Stock/Inventaire', [
            'inventaire' => $encours ? [
                'id'         => $encours->id,
                'reference'  => $encours->reference,
                'count_date' => $encours->count_date?->format('d/m/Y'),
                'location'   => $encours->location,
                'notes'      => $encours->notes,
                'lignes'     => $encours->lines->map(fn ($l) => [
                    'id'       => $l->id,
                    'supply'   => $l->supply->name ?? '—',
                    'unit'     => $l->supply->unit ?? '',
                    'attendu'  => $l->expected_quantity,
                    'compte'   => $l->counted_quantity,
                    'cout'     => $l->unit_cost,
                    'ecart'    => $l->variance,
                ])->values(),
            ] : null,
            'historique' => StockCount::where('organization_id', $orgId)
                ->where('status', 'closed')
                ->latest('closed_at')
                ->limit(20)
                ->get()
                ->map(fn ($c) => [
                    'reference'  => $c->reference,
                    'count_date' => $c->count_date?->format('d/m/Y'),
                    'location'   => $c->location,
                    'closed_at'  => $c->closed_at?->format('d/m/Y'),
                ]),
            'lieux' => Supply::where('organization_id', $orgId)
                ->whereNotNull('location')
                ->distinct()
                ->orderBy('location')
                ->pluck('location'),
        ]);
    }

    /** POST /stock/inventaire — ouvre un comptage. */
    public function ouvrirInventaire(Request $request): RedirectResponse
    {
        $valide = $request->validate([
            'location' => ['nullable', 'string', 'max:255'],
            'notes'    => ['nullable', 'string', 'max:2000'],
        ]);

        try {
            $inventaire = $this->stock->ouvrirInventaire(
                $request->user()->organization_id,
                $request->user(),
                $valide['location'] ?? null,
                $valide['notes'] ?? null,
            );
        } catch (\Throwable $e) {
            return back()->withErrors(['inventaire' => $e->getMessage()]);
        }

        if ($inventaire->lines->isEmpty()) {
            return back()->with('success', "Inventaire {$inventaire->reference} ouvert, mais aucune fourniture à compter.");
        }

        return back()->with('success', "Inventaire {$inventaire->reference} ouvert — {$inventaire->lines->count()} article(s) à compter.");
    }

    /** POST /stock/inventaire/{id}/comptage — enregistre les quantités comptées. */
    public function saisirComptage(Request $request, int $id): RedirectResponse
    {
        $valide = $request->validate([
            'comptages'   => ['required', 'array'],
            'comptages.*' => ['nullable', 'integer', 'min:0'],
        ]);

        $inventaire = StockCount::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);

        try {
            $this->stock->saisirComptage($inventaire, $valide['comptages']);
        } catch (\Throwable $e) {
            return back()->withErrors(['inventaire' => $e->getMessage()]);
        }

        return back()->with('success', 'Comptage enregistré.');
    }

    /** POST /stock/inventaire/{id}/cloturer — régularise les écarts. */
    public function cloturerInventaire(Request $request, int $id): RedirectResponse
    {
        $inventaire = StockCount::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);

        try {
            $bilan = $this->stock->cloturerInventaire($inventaire, $request->user());
        } catch (\Throwable $e) {
            return back()->withErrors(['inventaire' => $e->getMessage()]);
        }

        $message = sprintf(
            'Inventaire %s clos — %d écart(s) régularisé(s), valeur %s.',
            $inventaire->reference,
            $bilan['regularisations'],
            number_format($bilan['ecart_valeur'], 0, ',', ' ')
        );

        if ($bilan['non_comptees'] > 0) {
            // Une ligne non comptée n'est PAS un écart nul : on ne sait tout
            // simplement pas. La signaler évite de croire l'inventaire complet.
            $message .= sprintf(' %d article(s) n\'ont pas été comptés et restent inchangés.', $bilan['non_comptees']);
        }

        return redirect('/stock/inventaire')->with('success', $message);
    }
}
