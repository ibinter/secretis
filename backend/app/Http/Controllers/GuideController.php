<?php

namespace App\Http\Controllers;

use App\Models\GuideSection;
use App\Models\GuideArticle;
use Inertia\Inertia;
use Inertia\Response;

class GuideController extends Controller
{
    /**
     * Toutes les sections du guide avec le premier article de chaque section.
     */
    public function index(): Response
    {
        $sections = GuideSection::active()
            ->ordered()
            ->with(['articles' => function ($q) {
                $q->ordered()->limit(1);
            }])
            ->get()
            ->map(function (GuideSection $section) {
                $articlesCount = $section->articles()->count();
                $totalTime     = $section->articles()->sum('read_time_minutes');

                return [
                    'id'             => $section->id,
                    'slug'           => $section->slug,
                    'icon'           => $section->icon,
                    'color'          => $section->color,
                    'role_target'    => $section->role_target,
                    'translations'   => $section->translations,
                    'articles_count' => $articlesCount,
                    'total_read_time'=> $totalTime,
                    'first_article'  => $section->articles->first() ? [
                        'id'           => $section->articles->first()->id,
                        'slug'         => $section->articles->first()->slug,
                        'translations' => $section->articles->first()->translations,
                    ] : null,
                ];
            });

        return Inertia::render('Help/Guide/Index', [
            'sections' => $sections,
        ]);
    }

    /**
     * Détail d'une section avec tous ses articles.
     */
    public function section(GuideSection $section): Response
    {
        abort_unless($section->is_active, 404);

        $articles = $section->articles()
            ->ordered()
            ->get()
            ->map(fn (GuideArticle $a) => [
                'id'                => $a->id,
                'slug'              => $a->slug,
                'order'             => $a->order,
                'read_time_minutes' => $a->read_time_minutes,
                'translations'      => $a->translations,
            ]);

        return Inertia::render('Help/Guide/Section', [
            'section'  => [
                'id'           => $section->id,
                'slug'         => $section->slug,
                'icon'         => $section->icon,
                'color'        => $section->color,
                'translations' => $section->translations,
            ],
            'articles' => $articles,
        ]);
    }

    /**
     * Article complet avec navigation précédent/suivant.
     */
    public function article(GuideSection $section, GuideArticle $article): Response
    {
        abort_unless($section->is_active, 404);
        abort_unless($article->guide_section_id === $section->id, 404);

        // Tous les articles de la section pour sidebar + navigation
        $sectionArticles = $section->articles()
            ->ordered()
            ->get()
            ->map(fn (GuideArticle $a) => [
                'id'                => $a->id,
                'slug'              => $a->slug,
                'order'             => $a->order,
                'read_time_minutes' => $a->read_time_minutes,
                'translations'      => $a->translations,
            ]);

        // Précédent / suivant
        $prevArticle = $section->articles()
            ->where('order', '<', $article->order)
            ->orderByDesc('order')
            ->first();

        $nextArticle = $section->articles()
            ->where('order', '>', $article->order)
            ->orderBy('order')
            ->first();

        return Inertia::render('Help/Guide/Article', [
            'section'         => [
                'id'           => $section->id,
                'slug'         => $section->slug,
                'icon'         => $section->icon,
                'color'        => $section->color,
                'translations' => $section->translations,
            ],
            'article'         => [
                'id'                => $article->id,
                'slug'              => $article->slug,
                'order'             => $article->order,
                'read_time_minutes' => $article->read_time_minutes,
                'translations'      => $article->translations,
            ],
            'sectionArticles' => $sectionArticles,
            'prevArticle'     => $prevArticle ? [
                'slug'         => $prevArticle->slug,
                'translations' => $prevArticle->translations,
            ] : null,
            'nextArticle'     => $nextArticle ? [
                'slug'         => $nextArticle->slug,
                'translations' => $nextArticle->translations,
            ] : null,
        ]);
    }
}
