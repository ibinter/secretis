<?php

namespace App\Http\Controllers;

use App\Services\TrainingService;
use App\Services\ScormService;
use App\Services\LiveTrainingService;
use App\Services\LearningPathService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * TrainingController — Module Formation Interne
 *
 * Routes :
 *   GET    /training/courses                       → catalogue
 *   POST   /training/courses                       → créer cours (admin)
 *   GET    /training/courses/{id}                  → détail cours
 *   PUT    /training/courses/{id}                  → modifier cours (admin)
 *   DELETE /training/courses/{id}                  → supprimer cours (admin)
 *   POST   /training/courses/{id}/enroll           → s'inscrire
 *   GET    /training/my-courses                    → mes inscriptions
 *   GET    /training/courses/{id}/modules          → liste modules
 *   PUT    /training/progress/{moduleId}           → mise à jour progression
 *   POST   /training/quizzes/{id}/submit           → soumettre un quiz
 *   GET    /training/certificates                  → mes certificats
 *   GET    /training/certificates/{id}/pdf         → télécharger PDF
 *   GET    /training/analytics                     → statistiques (admin)
 *   GET    /verify/certificate/{token}             → vérification publique (sans auth)
 */
class TrainingController extends Controller
{
    public function __construct(
        private TrainingService $trainingService,
        private ScormService $scormService,
        private LiveTrainingService $liveTrainingService,
        private LearningPathService $learningPathService
    ) {}

    // ─── Catalogue ────────────────────────────────────────────────────────────

    public function index(Request $request): Response|JsonResponse
    {
        $user = Auth::user();

        $query = DB::table('training_courses')
            ->where('organization_id', $user->organization_id)
            ->where('is_published', true);

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }

        if ($search = $request->query('search')) {
            $like = '%' . addcslashes($search, '%_') . '%';
            $query->where(function ($q) use ($like) {
                $q->where('title', 'ilike', $like)
                  ->orWhere('description', 'ilike', $like);
            });
        }

        $courses = $query->orderBy('created_at', 'desc')
            ->paginate($request->query('per_page', 12));

        // Enrichit avec la progression de l'utilisateur
        $enrollments = DB::table('training_enrollments')
            ->where('user_id', $user->id)
            ->whereIn('course_id', collect($courses->items())->pluck('id'))
            ->get()
            ->keyBy('course_id');

        $items = collect($courses->items())->map(function ($course) use ($enrollments) {
            $enrollment = $enrollments[$course->id] ?? null;
            $course->enrollment = $enrollment;
            return $course;
        });

        if ($request->wantsJson()) {
            return response()->json(['data' => $items, 'meta' => $courses->toArray()]);
        }

        return Inertia::render('Formation/Catalogue', [
            'courses'     => $items,
            'pagination'  => $courses->toArray(),
            'filters'     => $request->only(['category', 'level', 'search', 'status']),
            'categories'  => $this->getCategories($user->organization_id),
        ]);
    }

    // ─── CRUD cours (admin) ───────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'title'            => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'category'         => ['required', 'string', 'max:100'],
            'thumbnail_path'   => ['nullable', 'string'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'level'            => ['required', 'in:beginner,intermediate,advanced'],
            'is_published'     => ['boolean'],
        ]);

        $courseId = DB::table('training_courses')->insertGetId(array_merge($validated, [
            'organization_id' => Auth::user()->organization_id,
            'created_by'      => Auth::id(),
            'is_published'    => $validated['is_published'] ?? false,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]));

        return response()->json([
            'message' => 'Cours créé avec succès.',
            'course'  => DB::table('training_courses')->find($courseId),
        ], 201);
    }

    public function show(int $id): Response|JsonResponse
    {
        $user   = Auth::user();
        $course = $this->findCourse($id, $user->organization_id);

        $modules = DB::table('training_modules')
            ->where('course_id', $id)
            ->orderBy('sort_order')
            ->get();

        $enrollment = DB::table('training_enrollments')
            ->where('course_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (request()->wantsJson()) {
            return response()->json([
                'course'     => $course,
                'modules'    => $modules,
                'enrollment' => $enrollment,
            ]);
        }

        return Inertia::render('Formation/CoursePlayer', [
            'course'     => $course,
            'modules'    => $modules,
            'enrollment' => $enrollment,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $course = $this->findCourse($id, Auth::user()->organization_id);

        $validated = $request->validate([
            'title'            => ['sometimes', 'required', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'category'         => ['sometimes', 'required', 'string', 'max:100'],
            'thumbnail_path'   => ['nullable', 'string'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'level'            => ['sometimes', 'required', 'in:beginner,intermediate,advanced'],
            'is_published'     => ['boolean'],
        ]);

        DB::table('training_courses')
            ->where('id', $id)
            ->update(array_merge($validated, ['updated_at' => now()]));

        return response()->json([
            'message' => 'Cours mis à jour.',
            'course'  => DB::table('training_courses')->find($id),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $this->findCourse($id, Auth::user()->organization_id);

        DB::table('training_courses')->where('id', $id)->delete();

        return response()->json(['message' => 'Cours supprimé.']);
    }

    // ─── Inscription ──────────────────────────────────────────────────────────

    public function enroll(int $courseId): JsonResponse
    {
        $enrollment = $this->trainingService->enrollUser(Auth::user(), $courseId);

        return response()->json([
            'message'    => 'Inscription réussie.',
            'enrollment' => $enrollment,
        ], 201);
    }

    // ─── Mes cours ────────────────────────────────────────────────────────────

    public function myCourses(Request $request): Response|JsonResponse
    {
        $user = Auth::user();

        $enrollments = DB::table('training_enrollments as e')
            ->join('training_courses as c', 'c.id', '=', 'e.course_id')
            ->where('e.user_id', $user->id)
            ->where('c.organization_id', $user->organization_id)
            ->select('e.*', 'c.title as course_title', 'c.thumbnail_path', 'c.level', 'c.category', 'c.duration_minutes')
            ->when($request->query('status'), fn($q, $s) => $q->where('e.status', $s))
            ->orderBy('e.enrolled_at', 'desc')
            ->paginate(12);

        if ($request->wantsJson()) {
            return response()->json($enrollments);
        }

        return Inertia::render('Formation/MesCours', ['enrollments' => $enrollments]);
    }

    // ─── Modules d'un cours ───────────────────────────────────────────────────

    public function modules(int $courseId): JsonResponse
    {
        $user   = Auth::user();
        $this->findCourse($courseId, $user->organization_id);

        $modules = DB::table('training_modules')
            ->where('course_id', $courseId)
            ->orderBy('sort_order')
            ->get();

        $enrollment = DB::table('training_enrollments')
            ->where('course_id', $courseId)
            ->where('user_id', $user->id)
            ->first();

        $progress = $enrollment
            ? DB::table('training_progress')
                ->where('enrollment_id', $enrollment->id)
                ->get()
                ->keyBy('module_id')
            : collect();

        $modules = $modules->map(function ($module) use ($progress) {
            $module->progress = $progress[$module->id] ?? null;
            return $module;
        });

        return response()->json(['modules' => $modules, 'enrollment' => $enrollment]);
    }

    // ─── Mise à jour progression ──────────────────────────────────────────────

    public function updateProgress(Request $request, int $moduleId): JsonResponse
    {
        $validated = $request->validate([
            'enrollment_id'     => ['required', 'integer'],
            'time_spent_seconds'=> ['nullable', 'integer', 'min:0'],
        ]);

        // Vérifie que l'inscription appartient à l'utilisateur
        $enrollment = DB::table('training_enrollments')
            ->where('id', $validated['enrollment_id'])
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $result = $this->trainingService->updateProgress(
            $enrollment->id,
            $moduleId,
            $validated['time_spent_seconds'] ?? 0
        );

        return response()->json([
            'message'    => 'Progression mise à jour.',
            'enrollment' => $result,
        ]);
    }

    // ─── Soumission quiz ──────────────────────────────────────────────────────

    public function submitQuiz(Request $request, int $quizId): JsonResponse
    {
        $validated = $request->validate([
            'answers' => ['required', 'array'],
        ]);

        $result = $this->trainingService->submitQuiz(Auth::user(), $quizId, $validated['answers']);

        return response()->json($result);
    }

    // ─── Certificats ──────────────────────────────────────────────────────────

    public function certificates(Request $request): Response|JsonResponse
    {
        $user = Auth::user();

        $certificates = DB::table('training_certificates as cert')
            ->join('training_courses as c', 'c.id', '=', 'cert.course_id')
            ->where('cert.user_id', $user->id)
            ->select(
                'cert.*',
                'c.title as course_title',
                'c.category',
                'c.level',
                'c.thumbnail_path'
            )
            ->orderBy('cert.issued_at', 'desc')
            ->get();

        if ($request->wantsJson()) {
            return response()->json($certificates);
        }

        return Inertia::render('Formation/MyCertificates', ['certificates' => $certificates]);
    }

    public function downloadCertificatePdf(int $id): \Symfony\Component\HttpFoundation\Response
    {
        $cert = DB::table('training_certificates')
            ->where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        $pdf = $this->trainingService->generateCertificatePdf($cert->id);

        return $pdf->download("certificat-{$cert->certificate_number}.pdf");
    }

    // ─── Analytics (admin) ────────────────────────────────────────────────────

    public function analytics(): JsonResponse
    {
        $this->authorizeAdmin();

        $data = $this->trainingService->getCourseAnalytics(Auth::user()->organization_id);

        return response()->json($data);
    }

    // ─── Vérification publique ────────────────────────────────────────────────

    public function verifyCertificate(string $token): Response|JsonResponse
    {
        $result = $this->trainingService->verifyCertificate($token);

        if (request()->wantsJson()) {
            return $result
                ? response()->json($result)
                : response()->json(['message' => 'Certificat invalide ou introuvable.'], 404);
        }

        return Inertia::render('Public/CertificateVerification', [
            'certificate' => $result,
        ]);
    }

    // ─── Gestion des modules (admin) ──────────────────────────────────────────

    public function storeModule(Request $request, int $courseId): JsonResponse
    {
        $this->authorizeAdmin();
        $this->findCourse($courseId, Auth::user()->organization_id);

        $validated = $request->validate([
            'title'            => ['required', 'string', 'max:255'],
            'content_type'     => ['required', 'in:video,text,quiz,file'],
            'content'          => ['nullable', 'array'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'sort_order'       => ['nullable', 'integer', 'min:0'],
            'is_required'      => ['boolean'],
        ]);

        $moduleId = DB::table('training_modules')->insertGetId(array_merge($validated, [
            'course_id'  => $courseId,
            'content'    => json_encode($validated['content'] ?? null),
            'sort_order' => $validated['sort_order'] ?? 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json([
            'message' => 'Module créé.',
            'module'  => DB::table('training_modules')->find($moduleId),
        ], 201);
    }

    public function storeQuiz(Request $request, int $moduleId): JsonResponse
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'title'              => ['required', 'string', 'max:255'],
            'pass_score'         => ['required', 'integer', 'min:0', 'max:100'],
            'questions'          => ['required', 'array', 'min:1'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1'],
        ]);

        $quizId = DB::table('training_quizzes')->insertGetId([
            'module_id'          => $moduleId,
            'title'              => $validated['title'],
            'pass_score'         => $validated['pass_score'],
            'questions'          => json_encode($validated['questions']),
            'time_limit_minutes' => $validated['time_limit_minutes'] ?? null,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        return response()->json([
            'message' => 'Quiz créé.',
            'quiz'    => DB::table('training_quizzes')->find($quizId),
        ], 201);
    }

    // ─── Admin : page de gestion ──────────────────────────────────────────────

    public function adminIndex(): Response
    {
        $this->authorizeAdmin();
        $user = Auth::user();

        $courses = DB::table('training_courses')
            ->where('organization_id', $user->organization_id)
            ->orderBy('created_at', 'desc')
            ->get();

        $stats = [
            'total_courses'      => $courses->count(),
            'published_courses'  => $courses->where('is_published', true)->count(),
            'total_enrollments'  => DB::table('training_enrollments')
                ->where('organization_id', $user->organization_id)
                ->count(),
            'total_certificates' => DB::table('training_certificates')
                ->join('training_courses', 'training_courses.id', '=', 'training_certificates.course_id')
                ->where('training_courses.organization_id', $user->organization_id)
                ->count(),
        ];

        return Inertia::render('Formation/AdminCourses', [
            'courses' => $courses,
            'stats'   => $stats,
        ]);
    }

    // ─── SCORM ───────────────────────────────────────────────────────────────

    /** POST /training/scorm/upload */
    public function scormUpload(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $request->validate([
            'file'      => ['required', 'file', 'mimes:zip', 'max:307200'], // 300 MB
            'course_id' => ['nullable', 'integer'],
        ]);

        $user    = Auth::user();
        $zipPath = $request->file('file')->store('scorm_uploads_tmp');
        $zipFull = Storage::path($zipPath);

        $meta = $this->scormService->extractAndValidate($zipFull);
        Storage::delete($zipPath); // nettoyage ZIP temporaire

        $id = DB::table('training_scorm_packages')->insertGetId([
            'organization_id' => $user->organization_id,
            'course_id'       => $request->input('course_id'),
            'title'           => $meta['title'],
            'version'         => $meta['version'],
            'package_path'    => $meta['package_path'],
            'manifest_path'   => $meta['manifest_path'],
            'launch_url'      => $meta['launch_url'],
            'created_at'      => now(),
        ]);

        return response()->json([
            'message' => 'Paquet SCORM importé avec succès.',
            'package' => DB::table('training_scorm_packages')->find($id),
        ], 201);
    }

    /** GET /training/scorm/{id}/launch */
    public function scormLaunch(int $id): JsonResponse
    {
        $user    = Auth::user();
        $package = DB::table('training_scorm_packages')
            ->where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        $session    = $this->scormService->createScormSession($package, $user);
        $launchUrl  = $this->scormService->getSecureLaunchUrl($package, $session);
        $scormData  = $this->scormService->getScormData($session);

        return response()->json([
            'session_id'  => $session->id,
            'launch_url'  => $launchUrl,
            'scorm_data'  => $scormData,
            'version'     => $package->version,
        ]);
    }

    /** POST /training/scorm/{id}/data */
    public function scormSaveData(Request $request, int $id): JsonResponse
    {
        $user    = Auth::user();
        $session = DB::table('training_scorm_sessions')
            ->where('scorm_package_id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $data = $request->validate(['data' => ['required', 'array']]);
        $this->scormService->updateScormData($session, $data['data']);

        return response()->json(['message' => 'Données SCORM sauvegardées.']);
    }

    // ─── xAPI LRS ────────────────────────────────────────────────────────────

    /** POST /training/xapi/statements */
    public function xapiStore(Request $request): JsonResponse
    {
        $user = Auth::user();
        $org  = DB::table('organizations')->find($user->organization_id);

        $statements = $request->input('statements', [$request->all()]);
        foreach ($statements as $statement) {
            $this->scormService->recordXapiStatement($statement, (object) $org);
        }

        return response()->json(null, 204);
    }

    /** GET /training/xapi/statements */
    public function xapiQuery(Request $request): JsonResponse
    {
        $user       = Auth::user();
        $statements = $this->scormService->queryStatements($user->organization_id, $request->all());
        return response()->json(['statements' => $statements]);
    }

    // ─── Sessions live ────────────────────────────────────────────────────────

    /** GET /training/live-sessions */
    public function liveSessions(Request $request): Response|JsonResponse
    {
        $user     = Auth::user();
        $sessions = $this->liveTrainingService->getSessionsForOrganization(
            $user->organization_id,
            $request->only(['status', 'from', 'to', 'instructor_id'])
        );

        // Enrichir avec le statut d'inscription de l'utilisateur
        $myRegistrations = DB::table('training_live_attendees')
            ->where('user_id', $user->id)
            ->pluck('status', 'live_session_id');

        $sessions = $sessions->map(function ($s) use ($myRegistrations) {
            $s->my_status = $myRegistrations[$s->id] ?? null;
            $s->materials_paths = json_decode($s->materials_paths ?? '[]', true);
            return $s;
        });

        if ($request->wantsJson()) {
            return response()->json($sessions);
        }

        return Inertia::render('Formation/LiveSessions', [
            'sessions' => $sessions,
            'filters'  => $request->only(['status', 'from', 'to']),
        ]);
    }

    /** POST /training/live-sessions */
    public function storeLiveSession(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'title'              => ['required', 'string', 'max:255'],
            'description'        => ['nullable', 'string'],
            'course_id'          => ['nullable', 'integer'],
            'instructor_user_id' => ['required', 'integer'],
            'scheduled_at'       => ['required', 'date'],
            'duration_minutes'   => ['required', 'integer', 'min:1', 'max:480'],
            'platform'           => ['required', 'in:zoom,teams,meet,secretis_video'],
            'meeting_url'        => ['nullable', 'url'],
            'max_participants'   => ['nullable', 'integer', 'min:1'],
            'materials_paths'    => ['nullable', 'array'],
        ]);

        $session = $this->liveTrainingService->createLiveSession(array_merge(
            $validated,
            ['organization_id' => Auth::user()->organization_id]
        ));

        return response()->json(['message' => 'Session créée.', 'session' => $session], 201);
    }

    /** POST /training/live-sessions/{id}/register */
    public function registerLiveSession(int $id): JsonResponse
    {
        $user    = Auth::user();
        $session = DB::table('training_live_sessions')
            ->where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        if ($session->status !== 'scheduled' && $session->status !== 'live') {
            return response()->json(['message' => 'Inscription impossible pour cette session.'], 422);
        }

        $attendee = $this->liveTrainingService->registerAttendee($session, $user);
        return response()->json(['message' => 'Inscription confirmée.', 'attendee' => $attendee], 201);
    }

    /** POST /training/live-sessions/{id}/start */
    public function startLiveSession(int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $session = DB::table('training_live_sessions')
            ->where('id', $id)
            ->where('organization_id', Auth::user()->organization_id)
            ->firstOrFail();

        $this->liveTrainingService->startSession($session);
        return response()->json(['message' => 'Session démarrée.']);
    }

    /** POST /training/live-sessions/{id}/end */
    public function endLiveSession(int $id): JsonResponse
    {
        $this->authorizeAdmin();
        $session = DB::table('training_live_sessions')
            ->where('id', $id)
            ->where('organization_id', Auth::user()->organization_id)
            ->firstOrFail();

        $this->liveTrainingService->endSession($session);
        $stats = $this->liveTrainingService->getLiveSessionStats($session);
        return response()->json(['message' => 'Session terminée.', 'stats' => $stats]);
    }

    // ─── Catalogue public ─────────────────────────────────────────────────────

    /** GET /training/catalog */
    public function catalog(Request $request): Response|JsonResponse
    {
        $query = DB::table('training_courses')
            ->where('is_public', true)
            ->where('is_published', true);

        if ($level = $request->query('level')) {
            $query->where('level', $level);
        }
        if ($lang = $request->query('language')) {
            $query->where('language', $lang);
        }
        if ($search = $request->query('search')) {
            $like = '%' . addcslashes($search, '%_') . '%';
            $query->where(function ($q) use ($like) {
                $q->where('title', 'ilike', $like)->orWhere('description', 'ilike', $like);
            });
        }
        if ($request->boolean('free')) {
            $query->where('price_xof', 0);
        }

        $sort = match ($request->query('sort', 'popular')) {
            'rating'   => ['rating_avg', 'desc'],
            'date'     => ['created_at', 'desc'],
            'duration' => ['duration_minutes', 'asc'],
            default    => ['rating_count', 'desc'],
        };
        $courses = $query->orderBy(...$sort)->paginate(12);

        if ($request->wantsJson()) {
            return response()->json($courses);
        }

        $user = Auth::user();
        return Inertia::render('Formation/Catalog', [
            'courses'    => $courses,
            'filters'    => (object) $request->only(['level', 'language', 'search', 'free', 'sort']),
            'userRole'   => $user?->role ?? 'guest',
        ]);
    }

    // ─── Parcours d'apprentissage ─────────────────────────────────────────────

    /** GET /training/learning-paths */
    public function learningPaths(Request $request): Response|JsonResponse
    {
        $user  = Auth::user();
        $paths = $this->learningPathService->getPathsForUser($user);

        if ($request->wantsJson()) {
            return response()->json($paths);
        }

        return Inertia::render('Formation/LearningPaths', ['paths' => $paths]);
    }

    /** POST /training/learning-paths */
    public function storeLearningPath(Request $request): JsonResponse
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'target_role'    => ['nullable', 'string'],
            'thumbnail_path' => ['nullable', 'string'],
            'total_hours'    => ['nullable', 'integer', 'min:0'],
            'difficulty'     => ['required', 'in:debutant,intermediaire,avance'],
            'items'          => ['required', 'array'],
            'items.*.type'   => ['required', 'in:course,live,scorm,quiz'],
            'items.*.id'     => ['required', 'integer'],
            'items.*.order'  => ['required', 'integer'],
            'items.*.is_mandatory' => ['boolean'],
        ]);

        $id = DB::table('training_learning_paths')->insertGetId(array_merge($validated, [
            'organization_id' => Auth::user()->organization_id,
            'items'           => json_encode($validated['items']),
            'created_at'      => now(),
        ]));

        return response()->json([
            'message' => 'Parcours créé.',
            'path'    => DB::table('training_learning_paths')->find($id),
        ], 201);
    }

    /** POST /training/learning-paths/{id}/enroll */
    public function enrollLearningPath(int $id): JsonResponse
    {
        $user = Auth::user();
        $path = DB::table('training_learning_paths')
            ->where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        $enrollment = $this->learningPathService->enrollUserInPath($user, $path);
        return response()->json(['message' => 'Inscription au parcours confirmée.', 'enrollment' => $enrollment], 201);
    }

    /** GET /training/learning-paths/{id}/progress */
    public function learningPathProgress(int $id): JsonResponse
    {
        $user = Auth::user();
        $path = DB::table('training_learning_paths')
            ->where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        return response()->json($this->learningPathService->getPathProgress($user, $path));
    }

    // ─── Ratings ─────────────────────────────────────────────────────────────

    /** POST /training/courses/{id}/rate */
    public function rateCourse(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $this->findCourse($id, $user->organization_id);

        $validated = $request->validate([
            'rating'  => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::table('training_course_ratings')->updateOrInsert(
            ['course_id' => $id, 'user_id' => $user->id],
            array_merge($validated, [
                'organization_id' => $user->organization_id,
                'created_at'      => now(),
            ])
        );

        // Recalculer la moyenne
        $stats = DB::table('training_course_ratings')
            ->where('course_id', $id)
            ->selectRaw('AVG(rating) as avg, COUNT(*) as cnt')
            ->first();

        DB::table('training_courses')
            ->where('id', $id)
            ->update([
                'rating_avg'   => round($stats->avg, 2),
                'rating_count' => $stats->cnt,
            ]);

        return response()->json(['message' => 'Évaluation enregistrée.']);
    }

    // ─── Instructor Dashboard ─────────────────────────────────────────────────

    /** GET /training/instructor/dashboard */
    public function instructorDashboard(): Response
    {
        $user = Auth::user();

        $myCourses = DB::table('training_courses as c')
            ->where('c.created_by', $user->id)
            ->select(
                'c.id', 'c.title', 'c.rating_avg', 'c.rating_count', 'c.thumbnail_path',
                DB::raw('(SELECT COUNT(*) FROM training_enrollments WHERE course_id = c.id) as enrollments'),
                DB::raw('(SELECT COUNT(*) FROM training_enrollments WHERE course_id = c.id AND status = \'completed\') as completions')
            )
            ->get()
            ->map(function ($c) {
                $c->completion_rate = $c->enrollments > 0
                    ? round($c->completions / $c->enrollments * 100, 1)
                    : 0;
                return $c;
            });

        $myLiveSessions = $this->liveTrainingService->getSessionsForOrganization(
            $user->organization_id,
            ['instructor_id' => $user->id]
        );

        $recentRatings = DB::table('training_course_ratings as r')
            ->join('users as u', 'u.id', '=', 'r.user_id')
            ->join('training_courses as c', 'c.id', '=', 'r.course_id')
            ->where('c.created_by', $user->id)
            ->orderByDesc('r.created_at')
            ->limit(10)
            ->select('r.*', 'u.name as user_name', 'c.title as course_title')
            ->get();

        return Inertia::render('Formation/InstructorDashboard', [
            'myCourses'      => $myCourses,
            'myLiveSessions' => $myLiveSessions,
            'recentRatings'  => $recentRatings,
        ]);
    }

    /** GET /training/admin/dashboard */
    public function adminDashboard(): Response
    {
        $this->authorizeAdmin();
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $activeCourses = DB::table('training_courses')
            ->where('organization_id', $orgId)
            ->where('is_published', true)
            ->count();

        $totalEnrollments = DB::table('training_enrollments as e')
            ->join('training_courses as c', 'c.id', '=', 'e.course_id')
            ->where('c.organization_id', $orgId)
            ->count();

        $completions = DB::table('training_enrollments as e')
            ->join('training_courses as c', 'c.id', '=', 'e.course_id')
            ->where('c.organization_id', $orgId)
            ->where('e.status', 'completed')
            ->count();

        $certsThisMonth = DB::table('training_certificates as cert')
            ->join('training_courses as c', 'c.id', '=', 'cert.course_id')
            ->where('c.organization_id', $orgId)
            ->whereBetween('cert.issued_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        $topCourses = DB::table('training_courses as c')
            ->where('c.organization_id', $orgId)
            ->select(
                'c.id', 'c.title', 'c.category',
                DB::raw('(SELECT COUNT(*) FROM training_enrollments WHERE course_id = c.id) as enrollments'),
                DB::raw('(SELECT COUNT(*) FROM training_enrollments WHERE course_id = c.id AND status = \'completed\') as completions')
            )
            ->orderByRaw('enrollments DESC')
            ->limit(10)
            ->get();

        $activityByMonth = DB::table('training_enrollments as e')
            ->join('training_courses as c', 'c.id', '=', 'e.course_id')
            ->where('c.organization_id', $orgId)
            ->whereBetween('e.enrolled_at', [now()->subMonths(11)->startOfMonth(), now()->endOfMonth()])
            ->selectRaw("TO_CHAR(e.enrolled_at, 'YYYY-MM') as month, COUNT(*) as count")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return Inertia::render('Formation/AdminDashboard', [
            'kpis' => [
                'active_courses'       => $activeCourses,
                'total_enrollments'    => $totalEnrollments,
                'completion_rate'      => $totalEnrollments > 0
                    ? round($completions / $totalEnrollments * 100, 1)
                    : 0,
                'certs_this_month'     => $certsThisMonth,
            ],
            'topCourses'       => $topCourses,
            'activityByMonth'  => $activityByMonth,
        ]);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private function findCourse(int $id, int $orgId): object
    {
        return DB::table('training_courses')
            ->where('id', $id)
            ->where('organization_id', $orgId)
            ->firstOrFail();
    }

    private function authorizeAdmin(): void
    {
        $user = Auth::user();
        if (! $user->isAdmin() && ! $user->hasRole('super_admin')) {
            abort(403, 'Accès réservé aux administrateurs.');
        }
    }

    private function getCategories(int $orgId): array
    {
        return DB::table('training_courses')
            ->where('organization_id', $orgId)
            ->where('is_published', true)
            ->distinct()
            ->pluck('category')
            ->filter()
            ->values()
            ->toArray();
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */

    // ── Mon Espace Formation ───────────────────────────────────────────────────
    public function mySpace(\Illuminate\Http\Request $request): \Inertia\Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $enrollments = DB::table('training_enrollments as e')
            ->join('training_courses as c', 'c.id', '=', 'e.course_id')
            ->where('e.user_id', $user->id)
            ->where('c.organization_id', $orgId)
            ->select(
                'e.id',
                'e.status',
                'e.enrolled_at',
                'c.id as course_id',
                'c.title as course_title',
                'c.category',
                'c.thumbnail_path'
            )
            ->orderBy('e.enrolled_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn($e) => [
                'id'       => $e->id,
                'status'   => $e->status,
                'progress' => 0,
                'course'   => [
                    'id'        => $e->course_id,
                    'title'     => $e->course_title,
                    'category'  => $e->category,
                    'thumbnail' => $e->thumbnail_path,
                ],
                'started_at'   => null,
                'completed_at' => null,
            ]);

        return Inertia::render('Formation/MySpace', [
            'enrollments' => $enrollments,
            'user'        => $user->only(['id', 'name', 'email']),
        ]);
    }

    // GET /training/catalog (public) → délègue vers catalog() qui gère déjà le cas invité
    public function publicCatalog(Request $request): Response|JsonResponse
    {
        return $this->catalog($request);
    }

    // ─── Alias API (routes/api.php) → méthodes réelles ─────────────────────────
    // Ces alias délèguent vers les implémentations existantes afin d'éviter
    // le filet __call() (stub JSON). Signatures et types de retour compatibles.

    /** GET /api/training/courses → index() */
    public function courses(Request $request): Response|JsonResponse
    {
        return $this->index($request);
    }

    /** POST /api/training/courses → store() */
    public function storeCourse(Request $request): JsonResponse
    {
        return $this->store($request);
    }

    /** GET /api/training/courses/{id} → show() */
    public function showCourse(int $id): Response|JsonResponse
    {
        return $this->show($id);
    }

    /** PUT /api/training/courses/{id} → update() */
    public function updateCourse(Request $request, int $id): JsonResponse
    {
        return $this->update($request, $id);
    }

    /** DELETE /api/training/courses/{id} → destroy() */
    public function destroyCourse(int $id): JsonResponse
    {
        return $this->destroy($id);
    }

    /** GET /api/training/my-trainings → myCourses() */
    public function myTrainings(Request $request): Response|JsonResponse
    {
        return $this->myCourses($request);
    }

    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
