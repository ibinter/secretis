<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\AcademyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * AcademyController — Espace Académie IBIG SECRETIS (Section 12.4)
 *
 * Routes enregistrées dans routes/web.php et routes/api.php :
 *
 *   Web (authentifié) :
 *     GET  /academie                      → index()
 *     GET  /academie/catalogue            → catalog()
 *     GET  /academie/mon-espace           → mySpace()
 *     GET  /academie/cours/{slug}         → course()
 *     GET  /academie/certificat/{uuid}    → certificate()
 *     GET  /academie/ressources           → resources()
 *
 *   Public (sans auth) :
 *     GET  /training/verify/{uuid}        → verifyCertificate()
 *
 *   API v1 (authentifié) :
 *     POST /api/v1/academy/progress       → markLessonComplete()
 *     POST /api/v1/academy/quiz           → submitQuiz()
 *     GET  /api/v1/academy/resources/{id}/download → downloadResource()
 *     GET  /api/v1/academy/certificate/{uuid}/pdf  → downloadCertificatePdf()
 */
class AcademyController extends Controller
{
    public function __construct(
        private readonly AcademyService $academyService
    ) {}

    // ─── Pages Inertia ────────────────────────────────────────────────────────

    /**
     * Page d'accueil de l'Académie.
     * GET /academie
     */
    public function index(): InertiaResponse
    {
        $user      = Auth::user();
        $dashboard = $this->academyService->getUserDashboard($user);
        $catalog   = $this->academyService->getCatalog($user);

        return Inertia::render('Academie/Index', [
            'dashboard' => $dashboard,
            'catalog'   => $catalog,
        ]);
    }

    /**
     * Catalogue complet des cours.
     * GET /academie/catalogue
     */
    public function catalog(): InertiaResponse
    {
        $user    = Auth::user();
        $catalog = $this->academyService->getCatalog($user);

        return Inertia::render('Academie/Catalog', [
            'catalog' => $catalog,
        ]);
    }

    /**
     * Espace personnel de l'apprenant.
     * GET /academie/mon-espace
     */
    public function mySpace(): InertiaResponse
    {
        $user      = Auth::user();
        $dashboard = $this->academyService->getUserDashboard($user);

        return Inertia::render('Academie/MySpace', [
            'dashboard' => $dashboard,
        ]);
    }

    /**
     * Page détail d'un cours (avec leçons et progression).
     * GET /academie/cours/{slug}
     */
    public function course(string $slug): InertiaResponse
    {
        $user = Auth::user();
        $data = $this->academyService->getCourseWithProgress($slug, $user);

        return Inertia::render('Academie/Course', $data);
    }

    /**
     * Page d'affichage d'un certificat (authentifié — pour l'apprenant).
     * GET /academie/certificat/{uuid}
     */
    public function certificate(string $uuid): InertiaResponse
    {
        $user = Auth::user();

        $cert = DB::table('academy_certificates')
            ->where('uuid', $uuid)
            ->where('user_id', $user->id)
            ->firstOrFail();

        return Inertia::render('Academie/Certificate', [
            'certificate' => [
                'uuid'         => $cert->uuid,
                'user_name'    => $cert->user_name,
                'course_title' => $cert->course_title,
                'score'        => $cert->score,
                'issued_at'    => $cert->issued_at,
                'verify_url'   => url('/training/verify/' . $cert->uuid),
            ],
        ]);
    }

    /**
     * Bibliothèque de ressources téléchargeables.
     * GET /academie/ressources
     */
    public function resources(): InertiaResponse
    {
        $resources = DB::table('academy_resources')
            ->where('is_active', true)
            ->orderBy('order')
            ->get()
            ->map(fn($r) => [
                'id'             => $r->id,
                'title'          => json_decode($r->title, true),
                'description'    => json_decode($r->description ?? 'null', true),
                'type'           => $r->type,
                'module'         => $r->module,
                'download_count' => $r->download_count,
                'category_id'    => $r->category_id,
            ])
            ->toArray();

        $categories = DB::table('academy_categories')
            ->where('is_active', true)
            ->orderBy('order')
            ->get()
            ->map(fn($c) => [
                'id'    => $c->id,
                'slug'  => $c->slug,
                'name'  => json_decode($c->name, true),
                'color' => $c->color,
                'icon'  => $c->icon,
            ])
            ->toArray();

        return Inertia::render('Academie/Resources', [
            'resources'  => $resources,
            'categories' => $categories,
        ]);
    }

    /**
     * Page publique de vérification d'un certificat (sans authentification).
     * GET /training/verify/{uuid}
     */
    public function verifyCertificate(string $uuid): InertiaResponse
    {
        $certificate = $this->academyService->verifyCertificate($uuid);

        return Inertia::render('Training/VerifyCertificate', [
            'uuid'        => $uuid,
            'certificate' => $certificate,
            'is_valid'    => $certificate !== null,
        ]);
    }

    // ─── Endpoints API ────────────────────────────────────────────────────────

    /**
     * Marque une leçon comme terminée et retourne la progression mise à jour.
     * POST /api/v1/academy/progress
     *
     * Body : { lesson_id: int }
     */
    public function markLessonComplete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lesson_id' => ['required', 'integer', 'exists:academy_lessons,id'],
        ]);

        $result = $this->academyService->markLessonComplete(
            Auth::user(),
            $validated['lesson_id']
        );

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    /**
     * Soumet les réponses d'un quiz et retourne le score avec les explications.
     * POST /api/v1/academy/quiz
     *
     * Body : { lesson_id: int, answers: { [question_id]: answer_index } }
     */
    public function submitQuiz(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lesson_id' => ['required', 'integer', 'exists:academy_lessons,id'],
            'answers'   => ['required', 'array'],
        ]);

        $result = $this->academyService->saveQuizAnswer(
            Auth::user(),
            $validated['lesson_id'],
            $validated['answers']
        );

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    /**
     * Télécharge une ressource de la bibliothèque.
     * GET /api/v1/academy/resources/{id}/download
     */
    public function downloadResource(int $id): StreamedResponse
    {
        return $this->academyService->downloadResource(Auth::user(), $id);
    }

    /**
     * Génère et télécharge le PDF d'un certificat.
     * GET /api/v1/academy/certificate/{uuid}/pdf
     */
    public function downloadCertificatePdf(string $uuid): StreamedResponse
    {
        // Vérifier que le certificat appartient bien à l'utilisateur connecté
        DB::table('academy_certificates')
            ->where('uuid', $uuid)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        return $this->academyService->generateCertificatePdf($uuid);
    }
}
