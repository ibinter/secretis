<?php

namespace App\Http\Controllers;

use App\Models\DocumentTemplate;
use App\Services\DocumentTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Modèles de lettres.
 *
 * La table existait depuis longtemps sans une ligne de code en face. Le
 * secrétariat repartait donc d'une page blanche pour chaque convocation,
 * attestation ou note de service.
 *
 * La fusion produit un texte ; ce que l'utilisateur en fait ensuite lui
 * appartient — l'enregistrer en GED, l'envoyer au parapheur, ou simplement le
 * copier. On ne présume pas de la suite.
 */
class DocumentTemplateController extends Controller
{
    public function __construct(private DocumentTemplateService $modeles) {}

    public function index(Request $request): Response|JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $liste = DocumentTemplate::where('organization_id', $orgId)
            ->actifs()
            ->when($request->filled('categorie'), fn ($q) => $q->where('category', $request->input('categorie')))
            ->when($request->filled('recherche'), function ($q) use ($request) {
                $terme = '%' . $request->input('recherche') . '%';
                $q->where(fn ($s) => $s->where('name', 'ilike', $terme)->orWhere('description', 'ilike', $terme));
            })
            // Les plus utilisés d'abord : c'est l'essentiel du confort quotidien.
            ->orderByDesc('usage_count')
            ->orderBy('name')
            ->get()
            ->map(fn ($m) => [
                'id'          => $m->id,
                'name'        => $m->name,
                'description' => $m->description,
                'category'    => $m->category,
                'access_level'=> $m->access_level,
                'usage_count' => $m->usage_count,
                'variables'   => $this->modeles->variablesDe($m->content ?? ''),
                'updated_at'  => optional($m->updated_at)->format('d/m/Y'),
            ]);

        $donnees = [
            'modeles'     => $liste,
            'categories'  => DocumentTemplate::CATEGORIES,
            'automatiques'=> $this->modeles->variablesAutomatiques(
                $request->user()->organization,
                $request->user()
            ),
        ];

        return $request->expectsJson()
            ? response()->json($donnees)
            : Inertia::render('GED/Modeles/Index', $donnees);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $modele = $this->trouver($request, $id);

        return response()->json([
            'data' => $modele->only([
                'id', 'name', 'description', 'category', 'content', 'access_level',
            ]) + ['variables' => $this->modeles->variablesDe($modele->content ?? '')],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $valide = $this->valider($request);

        DocumentTemplate::create($valide + [
            'organization_id' => $request->user()->organization_id,
            'created_by'      => $request->user()->id,
            'is_active'       => true,
        ]);

        return back()->with('success', 'Modèle enregistré.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $modele = $this->trouver($request, $id);
        $modele->update($this->valider($request, partiel: true));

        return back()->with('success', 'Modèle mis à jour.');
    }

    /**
     * Suppression logique : un modèle retiré peut avoir servi à produire des
     * documents qu'on voudra retracer. On le désactive plutôt que de l'effacer.
     */
    public function destroy(Request $request, int $id): RedirectResponse
    {
        $this->trouver($request, $id)->update(['is_active' => false]);

        return back()->with('success', 'Modèle retiré de la liste.');
    }

    /**
     * POST /ged/modeles/{id}/fusionner — produire la lettre.
     */
    public function fusionner(Request $request, int $id): JsonResponse
    {
        $modele = $this->trouver($request, $id);

        $valide = $request->validate([
            'valeurs' => ['nullable', 'array'],
            'valeurs.*' => ['nullable', 'string', 'max:5000'],
        ]);

        $resultat = $this->modeles->fusionner(
            $modele,
            $valide['valeurs'] ?? [],
            $request->user()->organization,
            $request->user(),
        );

        $this->modeles->marquerUtilise($modele);

        return response()->json([
            'contenu'    => $resultat['contenu'],
            // L'utilisateur doit savoir ce qui n'a pas été rempli : les
            // variables restées en place sont visibles sur le document.
            'manquantes' => $resultat['manquantes'],
            'nom'        => $modele->name,
        ]);
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function trouver(Request $request, int $id): DocumentTemplate
    {
        return DocumentTemplate::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);
    }

    private function valider(Request $request, bool $partiel = false): array
    {
        $r = fn (array $regles) => $partiel ? array_merge(['sometimes'], $regles) : $regles;

        return $request->validate([
            'name'        => $r(['required', 'string', 'max:255']),
            'description' => ['nullable', 'string', 'max:2000'],
            'category'    => ['nullable', 'string', 'max:60'],
            'content'     => $r(['required', 'string', 'max:100000']),
            // Contrainte CHECK en base : valider en `string` produirait une 500.
            'access_level'=> $r(['required', 'in:' . implode(',', DocumentTemplate::NIVEAUX_ACCES)]),
        ]);
    }
}
