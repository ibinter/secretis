<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\StreamedResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * AcademyService — Espace Académie IBIG SECRETIS (Section 12.4)
 *
 * Responsabilités :
 *   - Catalogue des cours et catégories avec progression utilisateur
 *   - Suivi de la progression par leçon et par cours
 *   - Évaluation et enregistrement des quiz
 *   - Génération de certificats (avec PDF)
 *   - Téléchargement des ressources
 *   - Tableau de bord personnel de l'apprenant
 */
class AcademyService
{
    // ─── Catalogue ────────────────────────────────────────────────────────────

    /**
     * Retourne le catalogue complet (catégories + cours) enrichi de la progression
     * de l'utilisateur. Les cours "featured" apparaissent en premier.
     */
    public function getCatalog(User $user): array
    {
        $categories = DB::table('academy_categories')
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        $courses = DB::table('academy_courses')
            ->where('is_active', true)
            ->orderByDesc('is_featured')
            ->orderBy('order')
            ->get();

        // Progression globale par cours pour cet utilisateur
        $progress = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->whereNull('lesson_id') // lignes agrégées au niveau cours
            ->get()
            ->keyBy('course_id');

        // Nombre de leçons par cours
        $lessonCounts = DB::table('academy_lessons')
            ->where('is_active', true)
            ->select('course_id', DB::raw('count(*) as total'))
            ->groupBy('course_id')
            ->get()
            ->keyBy('course_id');

        $coursesByCategory = [];
        foreach ($courses as $course) {
            $prog   = $progress[$course->id] ?? null;
            $lessons = $lessonCounts[$course->id] ?? null;

            $coursesByCategory[$course->category_id][] = [
                'id'               => $course->id,
                'slug'             => $course->slug,
                'title'            => json_decode($course->title, true),
                'description'      => json_decode($course->description, true),
                'objectives'       => json_decode($course->objectives ?? '[]', true),
                'level'            => $course->level,
                'duration_minutes' => $course->duration_minutes,
                'thumbnail'        => $course->thumbnail,
                'is_featured'      => (bool) $course->is_featured,
                'lessons_count'    => $lessons->total ?? 0,
                'progress_percent' => $prog?->progress_percent ?? 0,
                'is_completed'     => (bool) ($prog?->is_completed ?? false),
                'last_accessed_at' => $prog?->last_accessed_at,
            ];
        }

        $result = [];
        foreach ($categories as $cat) {
            $catCourses = $coursesByCategory[$cat->id] ?? [];
            $completedCount = count(array_filter($catCourses, fn($c) => $c['is_completed']));
            $totalCount     = count($catCourses);

            $result[] = [
                'id'              => $cat->id,
                'slug'            => $cat->slug,
                'name'            => json_decode($cat->name, true),
                'description'     => json_decode($cat->description ?? '{}', true),
                'icon'            => $cat->icon,
                'color'           => $cat->color,
                'courses'         => $catCourses,
                'total_courses'   => $totalCount,
                'completed_count' => $completedCount,
                'percent_done'    => $totalCount > 0 ? (int) round($completedCount / $totalCount * 100) : 0,
            ];
        }

        return $result;
    }

    // ─── Détail cours ─────────────────────────────────────────────────────────

    /**
     * Retourne un cours avec toutes ses leçons et la progression de l'utilisateur
     * leçon par leçon.
     */
    public function getCourseWithProgress(string $slug, User $user): array
    {
        $course = DB::table('academy_courses')
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        $category = DB::table('academy_categories')
            ->find($course->category_id);

        $lessons = DB::table('academy_lessons')
            ->where('course_id', $course->id)
            ->where('is_active', true)
            ->orderBy('order')
            ->get();

        // Progression par leçon
        $lessonProgress = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->whereNotNull('lesson_id')
            ->get()
            ->keyBy('lesson_id');

        // Quiz par leçon
        $quizzesByLesson = DB::table('academy_quizzes')
            ->whereIn('lesson_id', $lessons->pluck('id'))
            ->orderBy('order')
            ->get()
            ->groupBy('lesson_id');

        $formattedLessons = $lessons->map(function ($lesson) use ($lessonProgress, $quizzesByLesson) {
            $prog = $lessonProgress[$lesson->id] ?? null;

            $quizzes = ($quizzesByLesson[$lesson->id] ?? collect())->map(fn($q) => [
                'id'          => $q->id,
                'question'    => json_decode($q->question, true),
                'options'     => json_decode($q->options, true),
                'explanation' => json_decode($q->explanation ?? 'null', true),
                'order'       => $q->order,
            ])->values()->toArray();

            return [
                'id'               => $lesson->id,
                'slug'             => $lesson->slug,
                'title'            => json_decode($lesson->title, true),
                'type'             => $lesson->type,
                'content'          => json_decode($lesson->content ?? 'null', true),
                'video_url'        => $lesson->video_url,
                'duration_minutes' => $lesson->duration_minutes,
                'resource_file'    => $lesson->resource_file,
                'is_preview'       => (bool) $lesson->is_preview,
                'order'            => $lesson->order,
                'is_completed'     => (bool) ($prog?->is_completed ?? false),
                'quiz_score'       => $prog?->quiz_score,
                'quizzes'          => $quizzes,
            ];
        })->values()->toArray();

        // Progression globale du cours
        $courseProgress = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->whereNull('lesson_id')
            ->first();

        // Certificat éventuellement existant
        $certificate = DB::table('academy_certificates')
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        return [
            'course' => [
                'id'                 => $course->id,
                'slug'               => $course->slug,
                'title'              => json_decode($course->title, true),
                'description'        => json_decode($course->description, true),
                'objectives'         => json_decode($course->objectives ?? '[]', true),
                'level'              => $course->level,
                'duration_minutes'   => $course->duration_minutes,
                'thumbnail'          => $course->thumbnail,
                'version_compatible' => $course->version_compatible,
                'category'           => $category ? [
                    'slug'  => $category->slug,
                    'name'  => json_decode($category->name, true),
                    'color' => $category->color,
                    'icon'  => $category->icon,
                ] : null,
            ],
            'lessons'          => $formattedLessons,
            'progress_percent' => $courseProgress?->progress_percent ?? 0,
            'is_completed'     => (bool) ($courseProgress?->is_completed ?? false),
            'certificate'      => $certificate ? [
                'uuid'      => $certificate->uuid,
                'score'     => $certificate->score,
                'issued_at' => $certificate->issued_at,
            ] : null,
        ];
    }

    // ─── Progression ─────────────────────────────────────────────────────────

    /**
     * Marque une leçon comme terminée et recalcule la progression globale du cours.
     * Si toutes les leçons sont terminées et le score quiz ≥ 70%, génère le certificat.
     */
    public function markLessonComplete(User $user, int $lessonId): array
    {
        $lesson = DB::table('academy_lessons')->findOrFail($lessonId);
        $course = DB::table('academy_courses')->findOrFail($lesson->course_id);

        // Créer ou mettre à jour la ligne de progression de la leçon
        $existing = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->where('course_id', $lesson->course_id)
            ->where('lesson_id', $lessonId)
            ->first();

        $now = now();

        if ($existing) {
            DB::table('academy_user_progress')
                ->where('id', $existing->id)
                ->update([
                    'is_completed'     => true,
                    'completed_at'     => $existing->completed_at ?? $now,
                    'last_accessed_at' => $now,
                    'updated_at'       => $now,
                ]);
        } else {
            DB::table('academy_user_progress')->insert([
                'user_id'          => $user->id,
                'course_id'        => $lesson->course_id,
                'lesson_id'        => $lessonId,
                'progress_percent' => 100,
                'is_completed'     => true,
                'completed_at'     => $now,
                'last_accessed_at' => $now,
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);
        }

        // Recalculer la progression du cours
        $totalLessons     = DB::table('academy_lessons')
            ->where('course_id', $lesson->course_id)
            ->where('is_active', true)
            ->count();

        $completedLessons = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->where('course_id', $lesson->course_id)
            ->whereNotNull('lesson_id')
            ->where('is_completed', true)
            ->count();

        $progressPercent  = $totalLessons > 0
            ? (int) round($completedLessons / $totalLessons * 100)
            : 0;

        $courseComplete = $completedLessons >= $totalLessons;

        // Mettre à jour ou créer la ligne agrégée du cours
        $courseRow = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->where('course_id', $lesson->course_id)
            ->whereNull('lesson_id')
            ->first();

        if ($courseRow) {
            DB::table('academy_user_progress')
                ->where('id', $courseRow->id)
                ->update([
                    'progress_percent' => $progressPercent,
                    'is_completed'     => $courseComplete,
                    'completed_at'     => $courseComplete && !$courseRow->completed_at ? $now : $courseRow->completed_at,
                    'last_accessed_at' => $now,
                    'updated_at'       => $now,
                ]);
        } else {
            DB::table('academy_user_progress')->insert([
                'user_id'          => $user->id,
                'course_id'        => $lesson->course_id,
                'lesson_id'        => null,
                'progress_percent' => $progressPercent,
                'is_completed'     => $courseComplete,
                'completed_at'     => $courseComplete ? $now : null,
                'last_accessed_at' => $now,
                'created_at'       => $now,
                'updated_at'       => $now,
            ]);
        }

        // Générer le certificat si cours terminé et quiz passé avec ≥ 70%
        $certificate = null;
        if ($courseComplete) {
            $quizScore = $this->getCourseQuizScore($user, $lesson->course_id);
            if ($quizScore === null || $quizScore >= 70) {
                $certificate = $this->generateCertificate($user, $lesson->course_id, $quizScore);
            }
        }

        return [
            'progress_percent' => $progressPercent,
            'course_completed' => $courseComplete,
            'certificate'      => $certificate ? [
                'uuid'      => $certificate->uuid,
                'issued_at' => $certificate->issued_at,
            ] : null,
        ];
    }

    // ─── Quiz ─────────────────────────────────────────────────────────────────

    /**
     * Évalue les réponses du quiz, enregistre le score et retourne le détail
     * (score, réponses correctes, explications).
     */
    public function saveQuizAnswer(User $user, int $lessonId, array $answers): array
    {
        $lesson = DB::table('academy_lessons')->findOrFail($lessonId);

        $questions = DB::table('academy_quizzes')
            ->where('lesson_id', $lessonId)
            ->orderBy('order')
            ->get();

        $total   = $questions->count();
        $correct = 0;
        $details = [];

        foreach ($questions as $question) {
            $options     = json_decode($question->options, true);
            $userAnswer  = $answers[$question->id] ?? null;
            $correctIdx  = null;

            foreach ($options as $idx => $option) {
                if ($option['is_correct']) {
                    $correctIdx = $idx;
                    break;
                }
            }

            $isCorrect = ($userAnswer === $correctIdx);
            if ($isCorrect) {
                $correct++;
            }

            $details[] = [
                'question_id'   => $question->id,
                'user_answer'   => $userAnswer,
                'correct_index' => $correctIdx,
                'is_correct'    => $isCorrect,
                'explanation'   => json_decode($question->explanation ?? 'null', true),
            ];
        }

        $score = $total > 0 ? (int) round($correct / $total * 100) : 0;

        // Enregistrer le score dans la progression de la leçon
        DB::table('academy_user_progress')
            ->updateOrInsert(
                [
                    'user_id'   => $user->id,
                    'course_id' => $lesson->course_id,
                    'lesson_id' => $lessonId,
                ],
                [
                    'quiz_score'       => $score,
                    'last_accessed_at' => now(),
                    'updated_at'       => now(),
                    'created_at'       => now(),
                ]
            );

        // Sauvegarder le score au niveau cours si c'est la dernière leçon
        DB::table('academy_user_progress')
            ->updateOrInsert(
                [
                    'user_id'   => $user->id,
                    'course_id' => $lesson->course_id,
                    'lesson_id' => null,
                ],
                [
                    'quiz_score'  => $score,
                    'updated_at'  => now(),
                    'created_at'  => now(),
                ]
            );

        return [
            'score'          => $score,
            'total_questions'=> $total,
            'correct_answers'=> $correct,
            'passed'         => $score >= 70,
            'details'        => $details,
        ];
    }

    // ─── Certificat ───────────────────────────────────────────────────────────

    /**
     * Crée ou retourne le certificat existant pour un utilisateur et un cours.
     * Le certificat est généré uniquement si le cours est terminé.
     */
    public function generateCertificate(User $user, int $courseId, ?int $score = null): object
    {
        $existing = DB::table('academy_certificates')
            ->where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->first();

        if ($existing) {
            return $existing;
        }

        $course = DB::table('academy_courses')->findOrFail($courseId);
        $title  = json_decode($course->title, true);

        $uuid = Str::uuid()->toString();
        $now  = now();

        DB::table('academy_certificates')->insert([
            'uuid'         => $uuid,
            'user_id'      => $user->id,
            'course_id'    => $courseId,
            'user_name'    => $user->name,
            'course_title' => $title['fr'] ?? ($title['en'] ?? 'Formation SECRETIS'),
            'score'        => $score,
            'issued_at'    => $now,
            'created_at'   => $now,
            'updated_at'   => $now,
        ]);

        return DB::table('academy_certificates')
            ->where('uuid', $uuid)
            ->first();
    }

    /**
     * Génère le PDF du certificat et le retourne en StreamedResponse.
     */
    public function generateCertificatePdf(string $uuid): StreamedResponse
    {
        $cert = DB::table('academy_certificates')
            ->where('uuid', $uuid)
            ->firstOrFail();

        $verifyUrl = url('/training/verify/' . $uuid);
        $issuedAt  = \Carbon\Carbon::parse($cert->issued_at)->translatedFormat('d F Y');

        $html = view('pdf.academy-certificate', compact('cert', 'verifyUrl', 'issuedAt'))->render();

        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4', 'landscape')
            ->setOptions(['dpi' => 150, 'defaultFont' => 'sans-serif']);

        $filename = 'certificat-' . Str::slug($cert->course_title) . '-' . substr($uuid, 0, 8) . '.pdf';

        return response()->streamDownload(
            fn() => print($pdf->output()),
            $filename,
            ['Content-Type' => 'application/pdf']
        );
    }

    // ─── Ressources ───────────────────────────────────────────────────────────

    /**
     * Incrémente le compteur de téléchargement et retourne la ressource en streaming.
     */
    public function downloadResource(User $user, int $resourceId): StreamedResponse
    {
        $resource = DB::table('academy_resources')
            ->where('id', $resourceId)
            ->where('is_active', true)
            ->firstOrFail();

        // Incrémenter le compteur
        DB::table('academy_resources')
            ->where('id', $resourceId)
            ->increment('download_count');

        if ($resource->external_url) {
            return redirect()->away($resource->external_url);
        }

        $path = $resource->file_path;

        abort_unless(Storage::disk('private')->exists($path), 404, 'Ressource introuvable.');

        $title    = json_decode($resource->title, true);
        $filename = Str::slug($title['fr'] ?? 'ressource') . '.' . $resource->type;

        return Storage::disk('private')->download($path, $filename);
    }

    // ─── Tableau de bord apprenant ────────────────────────────────────────────

    /**
     * Retourne le tableau de bord personnel de l'apprenant :
     * cours en cours, terminés, certificats, recommandations, ressources récentes.
     */
    public function getUserDashboard(User $user): array
    {
        // Progressions actives
        $allProgress = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->whereNull('lesson_id')
            ->get()
            ->keyBy('course_id');

        $courseIds = $allProgress->keys()->toArray();

        $courses = [];
        if (!empty($courseIds)) {
            $courses = DB::table('academy_courses')
                ->whereIn('id', $courseIds)
                ->where('is_active', true)
                ->get()
                ->keyBy('id');
        }

        $inProgress = [];
        $completed  = [];

        foreach ($allProgress as $prog) {
            $course = $courses[$prog->course_id] ?? null;
            if (!$course) {
                continue;
            }

            $title = json_decode($course->title, true);
            $item  = [
                'id'               => $course->id,
                'slug'             => $course->slug,
                'title'            => $title,
                'level'            => $course->level,
                'duration_minutes' => $course->duration_minutes,
                'thumbnail'        => $course->thumbnail,
                'progress_percent' => $prog->progress_percent,
                'last_accessed_at' => $prog->last_accessed_at,
                'completed_at'     => $prog->completed_at,
                'quiz_score'       => $prog->quiz_score,
            ];

            if ($prog->is_completed) {
                $completed[] = $item;
            } elseif ($prog->progress_percent > 0) {
                $inProgress[] = $item;
            }
        }

        // Trier : en cours → dernier accès desc
        usort($inProgress, fn($a, $b) => strcmp($b['last_accessed_at'] ?? '', $a['last_accessed_at'] ?? ''));
        // Terminés → date de complétion desc
        usort($completed, fn($a, $b) => strcmp($b['completed_at'] ?? '', $a['completed_at'] ?? ''));

        // Certificats
        $certificates = DB::table('academy_certificates')
            ->where('user_id', $user->id)
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn($c) => [
                'uuid'         => $c->uuid,
                'course_title' => $c->course_title,
                'score'        => $c->score,
                'issued_at'    => $c->issued_at,
                'verify_url'   => url('/training/verify/' . $c->uuid),
            ])
            ->toArray();

        // Cours recommandés (non démarrés, pertinents pour le rôle)
        $startedIds = array_merge(
            array_column($inProgress, 'id'),
            array_column($completed, 'id')
        );

        $recommended = DB::table('academy_courses')
            ->where('is_active', true)
            ->where('is_featured', true)
            ->when(!empty($startedIds), fn($q) => $q->whereNotIn('id', $startedIds))
            ->orderBy('order')
            ->limit(4)
            ->get()
            ->map(fn($c) => [
                'id'               => $c->id,
                'slug'             => $c->slug,
                'title'            => json_decode($c->title, true),
                'level'            => $c->level,
                'duration_minutes' => $c->duration_minutes,
                'thumbnail'        => $c->thumbnail,
            ])
            ->toArray();

        // Ressources récentes
        $recentResources = DB::table('academy_resources')
            ->where('is_active', true)
            ->orderByDesc('download_count')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'id'    => $r->id,
                'title' => json_decode($r->title, true),
                'type'  => $r->type,
                'module'=> $r->module,
            ])
            ->toArray();

        // Temps total estimé passé (8 min × leçons terminées)
        $completedLessons = DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->whereNotNull('lesson_id')
            ->where('is_completed', true)
            ->count();

        return [
            'in_progress'       => $inProgress,
            'completed'         => $completed,
            'certificates'      => $certificates,
            'recommended'       => $recommended,
            'recent_resources'  => $recentResources,
            'total_time_spent'  => $completedLessons * 8, // minutes estimées
            'stats' => [
                'courses_in_progress' => count($inProgress),
                'courses_completed'   => count($completed),
                'certificates_earned' => count($certificates),
                'lessons_completed'   => $completedLessons,
            ],
        ];
    }

    // ─── Vérification publique ────────────────────────────────────────────────

    /**
     * Vérifie l'authenticité d'un certificat (page publique, sans authentification).
     * Ne retourne pas de données sensibles.
     */
    public function verifyCertificate(string $uuid): ?array
    {
        $cert = DB::table('academy_certificates')
            ->where('uuid', $uuid)
            ->first();

        if (!$cert) {
            return null;
        }

        return [
            'uuid'         => $cert->uuid,
            'user_name'    => $cert->user_name,
            'course_title' => $cert->course_title,
            'score'        => $cert->score,
            'issued_at'    => $cert->issued_at,
            'is_valid'     => true,
        ];
    }

    // ─── Helpers privés ───────────────────────────────────────────────────────

    /**
     * Retourne le score quiz le plus élevé d'un utilisateur pour un cours donné.
     */
    private function getCourseQuizScore(User $user, int $courseId): ?int
    {
        return DB::table('academy_user_progress')
            ->where('user_id', $user->id)
            ->where('course_id', $courseId)
            ->whereNull('lesson_id')
            ->value('quiz_score');
    }
}
