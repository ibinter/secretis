<?php

namespace App\Http\Controllers;

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * HelpCenterController — Centre d'aide public SECRETIS ERP
 *
 * Routes accessibles sans authentification (sauf feedback).
 */
class HelpCenterController extends Controller
{
    // -------------------------------------------------------------------------
    // Page d'accueil du centre d'aide
    // -------------------------------------------------------------------------

    public function index(): Response
    {
        $locale = app()->getLocale();

        $categories = Cache::remember('help.categories.' . $locale, 3600, function () use ($locale) {
            return HelpCategory::active()
                ->ordered()
                ->withCount(['articles' => fn ($q) => $q->published()])
                ->get()
                ->map(fn (HelpCategory $cat) => [
                    'id'            => $cat->id,
                    'slug'          => $cat->slug,
                    'icon'          => $cat->icon,
                    'color'         => $cat->color,
                    'name'          => $cat->getName($locale),
                    'description'   => $cat->getDescription($locale),
                    'articles_count'=> $cat->articles_count,
                ]);
        });

        $featured = HelpArticle::published()
            ->featured()
            ->with('category')
            ->orderByDesc('view_count')
            ->take(6)
            ->get()
            ->map(fn (HelpArticle $a) => $this->mapArticle($a, $locale));

        $recent = HelpArticle::published()
            ->with('category')
            ->orderByDesc('published_at')
            ->take(4)
            ->get()
            ->map(fn (HelpArticle $a) => $this->mapArticle($a, $locale));

        return Inertia::render('Help/Index', [
            'categories' => $categories,
            'featured'   => $featured,
            'recent'     => $recent,
        ]);
    }

    // -------------------------------------------------------------------------
    // Page catégorie
    // -------------------------------------------------------------------------

    public function category(HelpCategory $category): Response
    {
        abort_unless($category->is_active, 404);

        $locale = app()->getLocale();

        $articles = HelpArticle::published()
            ->where('help_category_id', $category->id)
            ->with('author')
            ->with('tags')
            ->orderByDesc('published_at')
            ->paginate(15);

        $allCategories = HelpCategory::active()
            ->ordered()
            ->withCount(['articles' => fn ($q) => $q->published()])
            ->get()
            ->map(fn (HelpCategory $cat) => [
                'id'            => $cat->id,
                'slug'          => $cat->slug,
                'icon'          => $cat->icon,
                'color'         => $cat->color,
                'name'          => $cat->getName($locale),
                'articles_count'=> $cat->articles_count,
                'is_current'    => $cat->id === $category->id,
            ]);

        return Inertia::render('Help/Category', [
            'category' => [
                'id'          => $category->id,
                'slug'        => $category->slug,
                'icon'        => $category->icon,
                'color'       => $category->color,
                'name'        => $category->getName($locale),
                'description' => $category->getDescription($locale),
            ],
            'articles'      => $articles->through(fn ($a) => $this->mapArticle($a, $locale)),
            'allCategories' => $allCategories,
        ]);
    }

    // -------------------------------------------------------------------------
    // Page article complet
    // -------------------------------------------------------------------------

    public function article(HelpCategory $category, HelpArticle $article): Response
    {
        abort_unless($category->is_active, 404);
        abort_unless($article->status === 'published', 404);
        abort_unless($article->help_category_id === $category->id, 404);

        // Incrément vues (atomique, sans re-charger le modèle)
        $article->incrementViews();

        $locale = app()->getLocale();

        // Articles liés dans la même catégorie
        $related = HelpArticle::published()
            ->where('help_category_id', $category->id)
            ->where('id', '!=', $article->id)
            ->orderByDesc('view_count')
            ->take(5)
            ->get()
            ->map(fn (HelpArticle $a) => [
                'id'    => $a->id,
                'slug'  => $a->slug,
                'title' => $a->getTitle($locale),
            ]);

        $tags = $article->tags()->pluck('tag')->toArray();

        return Inertia::render('Help/Article', [
            'category' => [
                'id'   => $category->id,
                'slug' => $category->slug,
                'name' => $category->getName($locale),
                'icon' => $category->icon,
            ],
            'article' => [
                'id'               => $article->id,
                'slug'             => $article->slug,
                'title'            => $article->getTitle($locale),
                'content'          => $article->getContent($locale),
                'excerpt'          => $article->getExcerpt($locale),
                'meta_title'       => $article->getMetaTitle($locale),
                'meta_description' => $article->getMetaDescription($locale),
                'view_count'       => $article->view_count + 1,
                'helpful_count'    => $article->helpful_count,
                'not_helpful_count'=> $article->not_helpful_count,
                'published_at'     => $article->published_at?->toISOString(),
                'author'           => $article->author ? [
                    'name' => $article->author->name,
                ] : null,
                'tags'             => $tags,
            ],
            'related' => $related,
        ]);
    }

    // -------------------------------------------------------------------------
    // Recherche fulltext
    //
    // Servie par DEUX routes vers la même méthode :
    //   - API  GET /api/help/search  (name api.help.search) → réponse JSON
    //          (utilisée par l'autocomplete de Help/Index et Support/Tickets/Create)
    //   - WEB  GET /aide/search      (name help.search)     → page Inertia Help/Search
    //          (utilisée par router.visit(route('help.search', {q})))
    //
    // Le format de sortie est choisi selon le contexte de la requête.
    // -------------------------------------------------------------------------

    public function search(Request $request): JsonResponse|Response
    {
        $request->validate([
            // 'q' est nullable : la page web /aide/search peut être ouverte sans terme
            // (le formulaire de la sidebar peut être soumis vide) sans déclencher un 422.
            'q'        => 'nullable|string|max:200',
            'category' => 'nullable|string',
            'limit'    => 'nullable|integer|min:1|max:30',
        ]);

        $q      = trim((string) $request->input('q', ''));
        $limit  = (int) ($request->input('limit', 10));
        $locale = app()->getLocale();

        // API / AJAX (axios) → JSON ; sinon → page Inertia.
        $wantsJson = $request->routeIs('api.help.search')
            || $request->ajax()
            || $request->wantsJson();

        // Requête trop courte : on renvoie un résultat vide sans requêter la base.
        if (mb_strlen($q) < 2) {
            if ($wantsJson) {
                return response()->json(['query' => $q, 'count' => 0, 'results' => []]);
            }

            return Inertia::render('Help/Search', [
                'query'      => $q,
                'count'      => 0,
                'results'    => [],
                'categories' => $this->categoriesList($locale),
            ]);
        }

        $query = HelpArticle::published()->with('category');

        // Filtre catégorie optionnel
        if ($request->filled('category')) {
            $cat = HelpCategory::where('slug', $request->input('category'))->first();
            if ($cat) {
                $query->where('help_category_id', $cat->id);
            }
        }

        // Recherche dans le JSON translations (colonne jsonb PostgreSQL).
        // Accès jsonb correct : translations->'fr'->>'title'. ILIKE = insensible à la casse.
        $like = '%' . $q . '%';
        $query->where(function ($w) use ($like) {
            foreach (['fr', 'en'] as $loc) {
                foreach (['title', 'excerpt', 'content'] as $field) {
                    // $loc et $field sont des littéraux contrôlés (pas d'injection).
                    $w->orWhereRaw("translations->'{$loc}'->>'{$field}' ILIKE ?", [$like]);
                }
            }
        });

        $results = $query->orderByDesc('view_count')->take($limit)->get();

        $mapped = $results->map(fn (HelpArticle $a) => [
            'id'       => $a->id,
            'slug'     => $a->slug,
            'title'    => $a->getTitle($locale),
            'excerpt'  => $a->getExcerpt($locale),
            'category' => [
                'id'   => $a->category?->id,
                'slug' => $a->category?->slug,
                'name' => $a->category?->getName($locale),
                'icon' => $a->category?->icon,
            ],
            'view_count' => $a->view_count,
        ])->values();

        if ($wantsJson) {
            return response()->json([
                'query'   => $q,
                'count'   => $mapped->count(),
                'results' => $mapped,
            ]);
        }

        return Inertia::render('Help/Search', [
            'query'      => $q,
            'count'      => $mapped->count(),
            'results'    => $mapped,
            'categories' => $this->categoriesList($locale),
        ]);
    }

    // -------------------------------------------------------------------------
    // Feedback utile / pas utile (API, auth Sanctum)
    // -------------------------------------------------------------------------

    public function feedback(Request $request, HelpArticle $article): JsonResponse
    {
        $request->validate([
            'helpful' => 'required|boolean',
        ]);

        abort_unless($article->status === 'published', 404);

        $article->markHelpful((bool) $request->input('helpful'));

        return response()->json([
            'helpful_count'     => $article->fresh()->helpful_count,
            'not_helpful_count' => $article->fresh()->not_helpful_count,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /** Liste des catégories actives (id, slug, icon, name, articles_count) pour sidebars/filtres */
    private function categoriesList(string $locale): \Illuminate\Support\Collection
    {
        return HelpCategory::active()
            ->ordered()
            ->withCount(['articles' => fn ($q) => $q->published()])
            ->get()
            ->map(fn (HelpCategory $cat) => [
                'id'             => $cat->id,
                'slug'           => $cat->slug,
                'icon'           => $cat->icon,
                'name'           => $cat->getName($locale),
                'articles_count' => $cat->articles_count,
            ]);
    }

    private function mapArticle(HelpArticle $article, string $locale): array
    {
        return [
            'id'           => $article->id,
            'slug'         => $article->slug,
            'title'        => $article->getTitle($locale),
            'excerpt'      => $article->getExcerpt($locale),
            'view_count'   => $article->view_count,
            'published_at' => $article->published_at?->toISOString(),
            'is_featured'  => $article->is_featured,
            'category'     => $article->category ? [
                'id'   => $article->category->id,
                'slug' => $article->category->slug,
                'name' => $article->category->getName($locale),
                'icon' => $article->category->icon,
            ] : null,
        ];
    }
}
