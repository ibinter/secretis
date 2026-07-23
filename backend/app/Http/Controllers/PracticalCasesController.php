<?php

namespace App\Http\Controllers;

use App\Models\PracticalCase;
use App\Models\PracticalCaseCompletion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PracticalCasesController extends Controller
{
    /**
     * GET /aide/cas-pratiques — catalogue des cas pratiques (Inertia).
     */
    public function index(): Response
    {
        $user = Auth::user();

        $cases = PracticalCase::orderBy('order')->get();

        $completedIds = PracticalCaseCompletion::where('user_id', $user->id)
            ->pluck('practical_case_id')
            ->toArray();

        $locale = $user->locale ?? 'fr';

        $formatted = $cases->map(fn($c) => $this->formatCase($c, $locale, $completedIds));

        $progress = $this->computeProgress($cases, $completedIds);

        return Inertia::render('Help/PracticalCases/Index', [
            'cases'    => $formatted,
            'progress' => $progress,
        ]);
    }

    /**
     * GET /aide/cas-pratiques/{slug} — cas pratique complet (Inertia).
     */
    public function show(PracticalCase $practicalCase): Response
    {
        $user   = Auth::user();
        $locale = $user->locale ?? 'fr';

        $completed = PracticalCaseCompletion::where('user_id', $user->id)
            ->where('practical_case_id', $practicalCase->id)
            ->exists();

        $translations = $practicalCase->translations;
        $t = $translations[$locale] ?? $translations['fr'] ?? [];

        // Cas précédent et suivant dans la même catégorie
        $siblings = PracticalCase::where('category', $practicalCase->category)
            ->orderBy('order')
            ->get(['id', 'slug', 'order', 'translations']);

        $currentIndex = $siblings->search(fn($s) => $s->id === $practicalCase->id);
        $prev = $currentIndex > 0 ? $siblings[$currentIndex - 1] : null;
        $next = $currentIndex < $siblings->count() - 1 ? $siblings[$currentIndex + 1] : null;

        return Inertia::render('Help/PracticalCases/Show', [
            'practicalCase' => [
                'id'                  => $practicalCase->id,
                'slug'                => $practicalCase->slug,
                'category'            => $practicalCase->category,
                'difficulty'          => $practicalCase->difficulty,
                'duration_minutes'    => $practicalCase->duration_minutes,
                'prerequisites'       => $practicalCase->prerequisites ?? [],
                'learning_objectives' => $practicalCase->learning_objectives ?? [],
                'is_featured'         => $practicalCase->is_featured,
                'title'               => $t['title'] ?? '',
                'description'         => $t['description'] ?? '',
                'context'             => $t['context'] ?? '',
                'steps'               => $t['steps'] ?? [],
                'expected_result'     => $t['expected_result'] ?? '',
            ],
            'completed' => $completed,
            'prev'      => $prev ? [
                'slug'  => $prev->slug,
                'title' => ($prev->translations[$locale]['title'] ?? $prev->translations['fr']['title'] ?? ''),
            ] : null,
            'next'      => $next ? [
                'slug'  => $next->slug,
                'title' => ($next->translations[$locale]['title'] ?? $next->translations['fr']['title'] ?? ''),
            ] : null,
        ]);
    }

    /**
     * POST /api/practical-cases/{practicalCase}/complete — marquer comme complété.
     */
    public function complete(PracticalCase $practicalCase): JsonResponse
    {
        $user = Auth::user();

        PracticalCaseCompletion::firstOrCreate([
            'user_id'           => $user->id,
            'practical_case_id' => $practicalCase->id,
        ], [
            'completed_at' => now(),
        ]);

        return response()->json(['message' => 'Cas pratique complété !', 'completed' => true]);
    }

    /**
     * GET /api/practical-cases/progress — progression de l'utilisateur.
     */
    public function progress(): JsonResponse
    {
        $user = Auth::user();

        $total = PracticalCase::count();

        $completedIds = PracticalCaseCompletion::where('user_id', $user->id)
            ->pluck('practical_case_id');

        $completed = $completedIds->count();

        // Progression par catégorie
        $categories = ['agenda', 'ged', 'tasks', 'visitors', 'hr', 'accounting', 'reporting', 'admin'];
        $byCategory = [];

        foreach ($categories as $category) {
            $catTotal     = PracticalCase::where('category', $category)->count();
            $catCompleted = PracticalCase::where('category', $category)
                ->whereIn('id', $completedIds)
                ->count();

            $byCategory[$category] = [
                'total'     => $catTotal,
                'completed' => $catCompleted,
                'percent'   => $catTotal > 0 ? round(($catCompleted / $catTotal) * 100) : 0,
            ];
        }

        return response()->json([
            'completed'   => $completed,
            'total'       => $total,
            'percent'     => $total > 0 ? round(($completed / $total) * 100) : 0,
            'by_category' => $byCategory,
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function formatCase(PracticalCase $c, string $locale, array $completedIds): array
    {
        $t = $c->translations[$locale] ?? $c->translations['fr'] ?? [];
        return [
            'id'               => $c->id,
            'slug'             => $c->slug,
            'category'         => $c->category,
            'difficulty'       => $c->difficulty,
            'duration_minutes' => $c->duration_minutes,
            'is_featured'      => $c->is_featured,
            'objectives_count' => count($c->learning_objectives ?? []),
            'title'            => $t['title'] ?? '',
            'description'      => $t['description'] ?? '',
            'objectives'       => array_slice($c->learning_objectives ?? [], 0, 3),
            'completed'        => in_array($c->id, $completedIds),
        ];
    }

    private function computeProgress($cases, array $completedIds): array
    {
        $total     = $cases->count();
        $completed = count(array_filter($completedIds));

        return [
            'total'     => $total,
            'completed' => count(array_intersect($completedIds, $cases->pluck('id')->toArray())),
            'percent'   => $total > 0 ? round((count(array_intersect($completedIds, $cases->pluck('id')->toArray())) / $total) * 100) : 0,
        ];
    }
}
