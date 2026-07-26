<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use App\Models\FaqCategory;
use App\Models\FaqRating;
use App\Models\SupportTicket;
use App\Services\SaraAiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class HelpController extends Controller
{
    public function __construct(private SaraAiService $sara) {}

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/help/categories
    // Liste des catégories FAQ avec compteur d'articles
    // ─────────────────────────────────────────────────────────────────────────
    public function getFaqCategories(): JsonResponse
    {
        $categories = Cache::remember('help_categories', 600, function () {
            return FaqCategory::withCount(['faqs' => fn ($q) => $q->where('is_published', true)])
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($cat) => [
                    'id'          => $cat->id,
                    'name'        => $cat->name,
                    'slug'        => $cat->slug,
                    'description' => $cat->description,
                    'icon'        => $cat->icon,
                    'count'       => $cat->faqs_count,
                ]);
        });

        return response()->json($categories);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/help/category/{slug}
    // Catégorie + ses articles FAQ
    // ─────────────────────────────────────────────────────────────────────────
    public function getFaqByCategory(string $slug): JsonResponse
    {
        $category = FaqCategory::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $faqs = Faq::where('category_id', $category->id)
            ->where('is_published', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($faq) => [
                'id'                => $faq->id,
                'question'          => $faq->question,
                'answer'            => $faq->answer,
                'answer_html'       => $faq->answer_html,
                'helpful_count'     => $faq->helpful_count,
                'not_helpful_count' => $faq->not_helpful_count,
                'views'             => $faq->views,
                'guide_section_url' => $faq->guide_section_url,
                'category_name'     => $category->name,
                'category_slug'     => $category->slug,
            ]);

        // Incrémenter le compteur de vues catégorie
        $category->increment('views');

        return response()->json([
            'category' => [
                'id'          => $category->id,
                'name'        => $category->name,
                'slug'        => $category->slug,
                'description' => $category->description,
            ],
            'faqs' => $faqs,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/help/faq/popular
    // 5 FAQ les plus consultées
    // ─────────────────────────────────────────────────────────────────────────
    public function getPopularFaq(): JsonResponse
    {
        $faqs = Cache::remember('help_faq_popular', 3600, function () {
            return Faq::where('is_published', true)
                ->with('category:id,name,slug')
                ->orderByDesc('views')
                ->limit(5)
                ->get()
                ->map(fn ($faq) => [
                    'id'            => $faq->id,
                    'question'      => $faq->question,
                    'views'         => $faq->views,
                    'category_name' => $faq->category->name,
                    'category_slug' => $faq->category->slug,
                ]);
        });

        return response()->json($faqs);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/help/faq/search?q=&limit=
    // Recherche full-text dans les FAQ + fallback SARA si 0 résultat
    // ─────────────────────────────────────────────────────────────────────────
    public function searchFaq(Request $request): JsonResponse
    {
        $request->validate([
            'q'     => 'required|string|min:2|max:200',
            'limit' => 'nullable|integer|min:1|max:20',
        ]);

        $query = trim($request->q);
        $limit = min((int) ($request->limit ?? 10), 20);

        // Recherche full-text (MySQL MATCH ... AGAINST ou LIKE fallback)
        $faqs = Faq::where('is_published', true)
            ->where(function ($q) use ($query) {
                $q->whereFullText(['question', 'answer'], $query)
                  ->orWhere('question', 'LIKE', "%{$query}%")
                  ->orWhere('answer', 'LIKE', "%{$query}%");
            })
            ->with('category:id,name,slug')
            ->orderByDesc('views')
            ->limit($limit)
            ->get()
            ->map(fn ($faq) => [
                'id'            => $faq->id,
                'question'      => $faq->question,
                'category_name' => $faq->category->name,
                'category_slug' => $faq->category->slug,
            ]);

        // Incrémenter vues des résultats trouvés
        if ($faqs->count() > 0) {
            Faq::whereIn('id', $faqs->pluck('id'))->increment('views');
        }

        $response = ['results' => $faqs, 'sara_answer' => null];

        // SARA fallback si aucun résultat
        if ($faqs->isEmpty()) {
            try {
                $saraAnswer = $this->sara->answer($query);
                $response['sara_answer'] = $saraAnswer;
            } catch (\Exception) {
                // SARA indisponible, pas grave
            }
        }

        return response()->json($response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/help/faq/{id}/rate
    // Voter utile / pas utile sur une FAQ
    // ─────────────────────────────────────────────────────────────────────────
    public function rateFaq(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'vote' => 'required|in:up,down',
        ]);

        $faq = Faq::where('is_published', true)->findOrFail($id);

        // Empêcher vote multiple (par IP + session)
        $fingerprint = md5($request->ip() . '|' . session()->getId() . '|faq|' . $id);
        $cacheKey    = "faq_rated_{$fingerprint}";

        if (Cache::has($cacheKey)) {
            return response()->json(['message' => 'Vous avez déjà voté pour cet article.'], 422);
        }

        if ($request->vote === 'up') {
            $faq->increment('helpful_count');
        } else {
            $faq->increment('not_helpful_count');
        }

        Cache::put($cacheKey, true, now()->addDays(30));
        Cache::forget('help_faq_popular');

        return response()->json([
            'helpful_count'     => $faq->fresh()->helpful_count,
            'not_helpful_count' => $faq->fresh()->not_helpful_count,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/help/tickets
    // Créer un ticket de support
    // ─────────────────────────────────────────────────────────────────────────
    public function createTicket(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject'       => 'required|string|min:10|max:150',
            'category'      => 'required|in:technique,facturation,fonctionnel,securite,autre',
            'priority'      => 'required|in:low,medium,high,critical',
            'description'   => 'required|string|min:30|max:5000',
            'attachments'   => 'nullable|array|max:5',
            'attachments.*' => 'file|mimes:png,jpg,jpeg,gif,webp,pdf|max:5120',
        ]);

        $user = auth()->user();

        // Stocker les pièces jointes
        $attachmentPaths = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("tickets/attachments/{$user->organization_id}", 'public');
                $attachmentPaths[] = [
                    'path'          => $path,
                    'url'           => Storage::disk('public')->url($path),
                    'original_name' => $file->getClientOriginalName(),
                    'size'          => $file->getSize(),
                    'mime'          => $file->getMimeType(),
                ];
            }
        }

        // Calculer le numéro de ticket
        $ticketNumber = 'TKT-' . date('Y') . '-' . str_pad(
            SupportTicket::whereYear('created_at', date('Y'))->count() + 1,
            5, '0', STR_PAD_LEFT
        );

        $ticket = SupportTicket::create([
            'organization_id' => $user->organization_id,
            'user_id'         => $user->id,
            'ticket_number'   => $ticketNumber,
            'subject'         => $validated['subject'],
            'category'        => $validated['category'],
            'priority'        => $validated['priority'],
            'description'     => $validated['description'],
            'attachments'     => $attachmentPaths,
            'status'          => 'open',
        ]);

        // Chercher des FAQ liées à suggérer dans l'email
        $suggestedFaqs = Faq::where('is_published', true)
            ->where(function ($q) use ($validated) {
                $q->where('question', 'LIKE', '%' . substr($validated['subject'], 0, 30) . '%')
                  ->orWhere('answer', 'LIKE', '%' . substr($validated['subject'], 0, 30) . '%');
            })
            ->limit(3)
            ->get(['id', 'question']);

        // Notification email confirmation + suggestions FAQ
        $ticket->sendConfirmationNotification($suggestedFaqs);

        // Délai de réponse estimé selon priorité
        $estimatedResponse = match ($validated['priority']) {
            'critical' => 'moins de 4 heures',
            'high'     => 'moins de 24 heures',
            'medium'   => '1 à 3 jours ouvrés',
            default    => '3 à 5 jours ouvrés',
        };

        return response()->json([
            'id'                => $ticket->id,
            'ticket_number'     => $ticketNumber,
            'status'            => 'open',
            'estimated_response'=> $estimatedResponse,
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/help/tickets/{id}/status
    // Statut public d'un ticket (sans détails internes)
    // ─────────────────────────────────────────────────────────────────────────
    public function getTicketStatus(Request $request, int $id): JsonResponse
    {
        $ticket = SupportTicket::where('id', $id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        return response()->json([
            'id'            => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'subject'       => $ticket->subject,
            'category'      => $ticket->category,
            'priority'      => $ticket->priority,
            'status'        => $ticket->status,
            'created_at'    => $ticket->created_at->toIso8601String(),
            'updated_at'    => $ticket->updated_at->toIso8601String(),
            'last_reply_at' => $ticket->last_reply_at?->toIso8601String(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/help/sara/check
    // Vérifier si SARA peut répondre avant soumission ticket
    // ─────────────────────────────────────────────────────────────────────────
    public function saraCheck(Request $request): JsonResponse
    {
        $request->validate([
            'subject'     => 'required|string|max:200',
            'description' => 'nullable|string|max:1000',
            'category'    => 'nullable|string',
        ]);

        $text = $request->subject . ' ' . $request->description;

        try {
            $result = $this->sara->answer($text);
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'has_answer' => false,
                'message'    => 'SARA est indisponible pour le moment. Veuillez soumettre votre ticket.',
            ]);
        }
    }


    /**
     * Page d'aide principale.
     */
    public function index(): \Inertia\Response
    {
        $categories = collect();
        $recent     = collect();
        $featured   = collect();

        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('help_categories')) {
                $categories = \Illuminate\Support\Facades\DB::table('help_categories')
                    ->orderBy('sort_order')
                    ->get(['id', 'name', 'slug', 'icon']);
            }
            if (\Illuminate\Support\Facades\Schema::hasTable('help_articles')) {
                $recent = \Illuminate\Support\Facades\DB::table('help_articles')
                    ->where('published', true)
                    ->orderByDesc('published_at')
                    ->limit(5)
                    ->get(['id', 'title', 'slug', 'published_at']);

                $featured = \Illuminate\Support\Facades\DB::table('help_articles')
                    ->where('published', true)
                    ->where('is_featured', true)
                    ->limit(3)
                    ->get(['id', 'title', 'slug', 'excerpt']);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('HelpController::index: ' . $e->getMessage());
        }

        return \Inertia\Inertia::render('Help/Index', [
            'categories' => $categories,
            'recent'     => $recent,
            'featured'   => $featured,
        ]);
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
