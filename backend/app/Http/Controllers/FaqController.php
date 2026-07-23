<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class FaqController extends Controller
{
    /**
     * Page FAQ complète (Inertia).
     * FAQ groupées par catégorie, les featured d'abord.
     */
    public function index(): Response
    {
        $faqs = Faq::active()
            ->ordered()
            ->get()
            ->map(fn (Faq $faq) => [
                'id'           => $faq->id,
                'category'     => $faq->category,
                'order'        => $faq->order,
                'is_featured'  => $faq->is_featured,
                'translations' => $faq->translations,
            ]);

        $grouped = $faqs->groupBy('category')->toArray();

        // Catégories avec libellés bilingues
        $categories = Faq::categories();

        return Inertia::render('Help/Faq', [
            'faqs'       => $faqs->values(),
            'grouped'    => $grouped,
            'categories' => $categories,
            'total'      => $faqs->count(),
            'featured'   => $faqs->where('is_featured', true)->values(),
        ]);
    }

    /**
     * API JSON pour intégration landing page et SARA.
     */
    public function apiIndex(): JsonResponse
    {
        $faqs = Faq::active()
            ->ordered()
            ->get()
            ->map(fn (Faq $faq) => [
                'id'          => $faq->id,
                'category'    => $faq->category,
                'order'       => $faq->order,
                'is_featured' => $faq->is_featured,
                'question_fr' => $faq->getQuestion('fr'),
                'question_en' => $faq->getQuestion('en'),
                'answer_fr'   => $faq->getAnswer('fr'),
                'answer_en'   => $faq->getAnswer('en'),
            ]);

        return response()->json([
            'data'       => $faqs->values(),
            'total'      => $faqs->count(),
            'categories' => Faq::categories(),
        ]);
    }
}
