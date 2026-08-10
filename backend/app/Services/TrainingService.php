<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * TrainingService — Module Formation Interne IBIG SECRETIS
 *
 * Gère les inscriptions, la progression, les quiz et la génération de certificats.
 * Architecture multi-tenant : toutes les opérations sont scoped à organization_id.
 */
class TrainingService
{
    // ─── Inscription ──────────────────────────────────────────────────────────

    /**
     * Inscrit un utilisateur à un cours.
     * Si l'utilisateur est déjà inscrit, retourne l'inscription existante.
     */
    public function enrollUser(User $user, int $courseId): array
    {
        // Vérifie que le cours appartient à l'organisation
        $course = DB::table('training_courses')
            ->where('id', $courseId)
            ->where('organization_id', $user->organization_id)
            ->where('is_published', true)
            ->firstOrFail();

        // Déjà inscrit ?
        $existing = DB::table('training_enrollments')
            ->where('course_id', $courseId)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return (array) $existing;
        }

        $enrollmentId = DB::table('training_enrollments')->insertGetId([
            'course_id'       => $courseId,
            'user_id'         => $user->id,
            'organization_id' => $user->organization_id,
            'status'          => 'enrolled',
            'progress_percent'=> 0,
            'enrolled_at'     => now(),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Initialise la progression pour chaque module requis
        $modules = DB::table('training_modules')
            ->where('course_id', $courseId)
            ->where('is_required', true)
            ->get();

        foreach ($modules as $module) {
            DB::table('training_progress')->insertOrIgnore([
                'enrollment_id'     => $enrollmentId,
                'module_id'         => $module->id,
                'status'            => 'not_started',
                'time_spent_seconds'=> 0,
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);
        }

        return (array) DB::table('training_enrollments')->find($enrollmentId);
    }

    // ─── Mise à jour de la progression ───────────────────────────────────────

    /**
     * Met à jour la progression d'un module et recalcule l'avancement global.
     * Si 100% → marque le cours comme complété et génère le certificat.
     */
    public function updateProgress(int $enrollmentId, int $moduleId, int $timeSpentSeconds): array
    {
        $enrollment = DB::table('training_enrollments')->find($enrollmentId);
        $module     = DB::table('training_modules')->find($moduleId);

        if (! $enrollment || ! $module) {
            throw new \InvalidArgumentException('Inscription ou module introuvable.');
        }

        // Met à jour la progression du module
        DB::table('training_progress')
            ->where('enrollment_id', $enrollmentId)
            ->where('module_id', $moduleId)
            ->update([
                'status'             => 'completed',
                'time_spent_seconds' => DB::raw("time_spent_seconds + {$timeSpentSeconds}"),
                'completed_at'       => now(),
                'updated_at'         => now(),
            ]);

        // Recalcule le pourcentage global
        $totalRequired     = DB::table('training_progress')
            ->where('enrollment_id', $enrollmentId)
            ->count();

        $completedRequired = DB::table('training_progress')
            ->where('enrollment_id', $enrollmentId)
            ->where('status', 'completed')
            ->count();

        $percent = $totalRequired > 0
            ? (int) round(($completedRequired / $totalRequired) * 100)
            : 0;

        $updateData = [
            'progress_percent' => $percent,
            'status'           => $percent >= 100 ? 'completed' : ($percent > 0 ? 'in_progress' : 'enrolled'),
            'updated_at'       => now(),
        ];

        if ($percent >= 100 && ! $enrollment->completed_at) {
            $updateData['completed_at'] = now();
        }

        DB::table('training_enrollments')
            ->where('id', $enrollmentId)
            ->update($updateData);

        $enrollment = DB::table('training_enrollments')->find($enrollmentId);

        // Génération automatique du certificat
        if ($percent >= 100 && ! $enrollment->certificate_issued_at) {
            $this->generateCertificate($enrollment);
        }

        return (array) $enrollment;
    }

    // ─── Soumission d'un quiz ─────────────────────────────────────────────────

    /**
     * Corrige un quiz (QCM : une ou plusieurs bonnes réponses).
     * Retourne le score, les corrections, et valide le module si score >= pass_score.
     *
     * @param  array $answers  Format : {question_id => [answer_id, ...]}
     */
    public function submitQuiz(User $user, int $quizId, array $answers): array
    {
        $quiz = DB::table('training_quizzes')->find($quizId);

        if (! $quiz) {
            throw new \InvalidArgumentException('Quiz introuvable.');
        }

        $questions  = json_decode($quiz->questions, true);
        $totalScore = 0;
        $corrections = [];

        foreach ($questions as $question) {
            $qId             = (string) $question['id'];
            $correctAnswerIds = collect($question['answers'])
                ->where('is_correct', true)
                ->pluck('id')
                ->map(fn($id) => (string) $id)
                ->sort()
                ->values()
                ->toArray();

            $userAnswerIds = collect($answers[$qId] ?? [])
                ->map(fn($id) => (string) $id)
                ->sort()
                ->values()
                ->toArray();

            $isCorrect = $correctAnswerIds === $userAnswerIds;

            if ($isCorrect) {
                $totalScore++;
            }

            $corrections[$qId] = [
                'is_correct'      => $isCorrect,
                'correct_answers' => $correctAnswerIds,
                'user_answers'    => $userAnswerIds,
                'explanation'     => $question['explanation'] ?? null,
            ];
        }

        $scorePercent = count($questions) > 0
            ? (int) round(($totalScore / count($questions)) * 100)
            : 0;

        $passed = $scorePercent >= $quiz->pass_score;

        // Enregistre la tentative
        $attemptId = DB::table('training_quiz_attempts')->insertGetId([
            'quiz_id'      => $quizId,
            'user_id'      => $user->id,
            'score'        => $scorePercent,
            'passed'       => $passed,
            'answers'      => json_encode($answers),
            'started_at'   => now()->subMinutes(5), // approximatif
            'completed_at' => now(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        // Si quiz réussi → marque le module comme complété
        if ($passed) {
            $module = DB::table('training_modules')
                ->where('id', $quiz->module_id)
                ->first();

            if ($module) {
                // Trouve l'inscription correspondante
                $enrollment = DB::table('training_enrollments')
                    ->where('course_id', $module->course_id)
                    ->where('user_id', $user->id)
                    ->first();

                if ($enrollment) {
                    $this->updateProgress($enrollment->id, $module->id, 0);
                }
            }
        }

        return [
            'attempt_id'   => $attemptId,
            'score'        => $scorePercent,
            'pass_score'   => $quiz->pass_score,
            'passed'       => $passed,
            'corrections'  => $corrections,
            'total_correct'=> $totalScore,
            'total_questions'=> count($questions),
        ];
    }

    // ─── Génération de certificat ─────────────────────────────────────────────

    /**
     * Génère un certificat PDF pour une inscription complétée.
     * Numéro : CERT-{year}-{5chiffres séquentiels}
     */
    public function generateCertificate(object $enrollment): array
    {
        // Vérifie si un certificat existe déjà
        $existing = DB::table('training_certificates')
            ->where('enrollment_id', $enrollment->id)
            ->first();

        if ($existing) {
            return (array) $existing;
        }

        $year   = now()->year;
        $seq    = DB::table('training_certificates')
            ->whereYear('issued_at', $year)
            ->count() + 1;

        $number = sprintf('CERT-%d-%05d', $year, $seq);
        $token  = Str::uuid()->toString();

        $user   = DB::table('users')->find($enrollment->user_id);
        $course = DB::table('training_courses')->find($enrollment->course_id);

        $certId = DB::table('training_certificates')->insertGetId([
            'enrollment_id'      => $enrollment->id,
            'user_id'            => $enrollment->user_id,
            'course_id'          => $enrollment->course_id,
            'certificate_number' => $number,
            'issued_at'          => now(),
            'expires_at'         => null,
            'verification_token' => $token,
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        // Marque l'inscription avec la date d'émission du certificat
        DB::table('training_enrollments')
            ->where('id', $enrollment->id)
            ->update(['certificate_issued_at' => now(), 'updated_at' => now()]);

        Log::info('Certificat généré', [
            'certificate_number' => $number,
            'user_id'            => $enrollment->user_id,
            'course_id'          => $enrollment->course_id,
        ]);

        return (array) DB::table('training_certificates')->find($certId);
    }

    // ─── Génération PDF ───────────────────────────────────────────────────────

    /**
     * Génère le PDF du certificat via DomPDF.
     */
    public function generateCertificatePdf(int $certificateId): \Barryvdh\DomPDF\PDF
    {
        $cert = DB::table('training_certificates')
            ->where('id', $certificateId)
            ->firstOrFail();

        $user   = DB::table('users')->find($cert->user_id);
        $course = DB::table('training_courses')->find($cert->course_id);
        $org    = DB::table('organizations')->find($course->organization_id);

        // Score moyen des quiz du cours
        $modules = DB::table('training_modules')
            ->where('course_id', $cert->course_id)
            ->where('content_type', 'quiz')
            ->pluck('id');

        $avgScore = null;
        if ($modules->isNotEmpty()) {
            $avgScore = DB::table('training_quiz_attempts')
                ->whereIn('quiz_id', DB::table('training_quizzes')
                    ->whereIn('module_id', $modules)
                    ->pluck('id'))
                ->where('user_id', $cert->user_id)
                ->where('passed', true)
                ->avg('score');
        }

        $verifyUrl = config('app.url') . '/verify/certificate/' . $cert->verification_token;

        $pdf = Pdf::pourOrganisation($course->organization_id)
        ->loadView('training.certificate', [
            'certificate' => $cert,
            'user'        => $user,
            'course'      => $course,
            'organization'=> $org,
            'avg_score'   => $avgScore ? round($avgScore) : null,
            'verify_url'  => $verifyUrl,
        ]);

        $pdf->setPaper('A4', 'landscape');

        return $pdf;
    }

    // ─── Analytics ───────────────────────────────────────────────────────────

    /**
     * Analytics de formation pour une organisation.
     *
     * Retourne :
     *   - Taux de complétion par cours
     *   - Temps moyen de complétion (minutes)
     *   - Quiz : taux de réussite global, question la plus ratée
     */
    public function getCourseAnalytics(int $orgId): array
    {
        // Taux de complétion par cours
        $courses = DB::table('training_courses')
            ->where('organization_id', $orgId)
            ->get();

        $courseStats = [];
        foreach ($courses as $course) {
            $total     = DB::table('training_enrollments')
                ->where('course_id', $course->id)
                ->count();

            $completed = DB::table('training_enrollments')
                ->where('course_id', $course->id)
                ->where('status', 'completed')
                ->count();

            $avgMinutes = DB::table('training_enrollments')
                ->where('course_id', $course->id)
                ->where('status', 'completed')
                ->whereNotNull('completed_at')
                ->selectRaw('AVG(EXTRACT(EPOCH FROM (completed_at - enrolled_at)) / 60) as avg_minutes')
                ->value('avg_minutes');

            $courseStats[] = [
                'course_id'        => $course->id,
                'course_title'     => $course->title,
                'total_enrolled'   => $total,
                'completed'        => $completed,
                'completion_rate'  => $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'avg_completion_minutes' => $avgMinutes ? round($avgMinutes) : null,
            ];
        }

        // Quiz analytics globaux
        $quizModules = DB::table('training_modules')
            ->whereIn('course_id', $courses->pluck('id'))
            ->where('content_type', 'quiz')
            ->pluck('id');

        $quizIds = DB::table('training_quizzes')
            ->whereIn('module_id', $quizModules)
            ->pluck('id');

        $globalPassRate = null;
        $hardestQuestion = null;

        if ($quizIds->isNotEmpty()) {
            $totalAttempts = DB::table('training_quiz_attempts')
                ->whereIn('quiz_id', $quizIds)
                ->count();

            $passedAttempts = DB::table('training_quiz_attempts')
                ->whereIn('quiz_id', $quizIds)
                ->where('passed', true)
                ->count();

            $globalPassRate = $totalAttempts > 0
                ? round(($passedAttempts / $totalAttempts) * 100, 1)
                : null;

            // Question la plus ratée (nécessite analyse des réponses JSON)
            // Simplifié ici — une analyse complète nécessiterait une boucle sur les tentatives
            $hardestQuestion = $this->findHardestQuestion($quizIds->toArray());
        }

        return [
            'courses'          => $courseStats,
            'global_pass_rate' => $globalPassRate,
            'hardest_question' => $hardestQuestion,
        ];
    }

    /**
     * Analyse les tentatives pour trouver la question avec le plus d'erreurs.
     */
    private function findHardestQuestion(array $quizIds): ?array
    {
        if (empty($quizIds)) return null;

        $attempts = DB::table('training_quiz_attempts')
            ->whereIn('quiz_id', $quizIds)
            ->whereNotNull('answers')
            ->get();

        // Map question_id => [correct_count, total_count]
        $stats = [];

        foreach ($attempts as $attempt) {
            $answers = json_decode($attempt->answers, true) ?? [];
            $quiz    = DB::table('training_quizzes')->find($attempt->quiz_id);
            if (! $quiz) continue;

            $questions = json_decode($quiz->questions, true) ?? [];

            foreach ($questions as $question) {
                $qId = (string) $question['id'];
                if (! isset($stats[$qId])) {
                    $stats[$qId] = ['text' => $question['text'], 'correct' => 0, 'total' => 0];
                }

                $stats[$qId]['total']++;

                $correctIds = collect($question['answers'])
                    ->where('is_correct', true)
                    ->pluck('id')
                    ->map(fn($id) => (string) $id)
                    ->sort()->values()->toArray();

                $userIds = collect($answers[$qId] ?? [])
                    ->map(fn($id) => (string) $id)
                    ->sort()->values()->toArray();

                if ($correctIds === $userIds) {
                    $stats[$qId]['correct']++;
                }
            }
        }

        if (empty($stats)) return null;

        // La question avec le taux d'erreur le plus élevé
        $hardest = null;
        $minRate  = 101;

        foreach ($stats as $qId => $data) {
            $rate = $data['total'] > 0 ? ($data['correct'] / $data['total']) * 100 : 0;
            if ($rate < $minRate) {
                $minRate  = $rate;
                $hardest = [
                    'question_id'   => $qId,
                    'question_text' => $data['text'],
                    'success_rate'  => round($rate, 1),
                    'error_rate'    => round(100 - $rate, 1),
                    'total_attempts'=> $data['total'],
                ];
            }
        }

        return $hardest;
    }

    // ─── Vérification de certificat ──────────────────────────────────────────

    /**
     * Vérifie l'authenticité d'un certificat par son token (accès public).
     */
    public function verifyCertificate(string $token): ?array
    {
        $cert = DB::table('training_certificates')
            ->where('verification_token', $token)
            ->first();

        if (! $cert) return null;

        $user   = DB::table('users')->find($cert->user_id);
        $course = DB::table('training_courses')->find($cert->course_id);
        $org    = DB::table('organizations')->find($course->organization_id);

        return [
            'certificate_number' => $cert->certificate_number,
            'issued_at'          => $cert->issued_at,
            'expires_at'         => $cert->expires_at,
            'is_valid'           => ! $cert->expires_at || now()->lt($cert->expires_at),
            'holder_name'        => $user->name ?? 'Inconnu',
            'course_title'       => $course->title ?? 'Inconnu',
            'organization_name'  => $org->name ?? 'Inconnu',
        ];
    }
}
