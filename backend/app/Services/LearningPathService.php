<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * LearningPathService — Parcours d'apprentissage structurés
 */
class LearningPathService
{
    // ─── Inscriptions ─────────────────────────────────────────────────────────

    public function enrollUserInPath(User $user, object $path): object
    {
        $existing = DB::table('training_path_enrollments')
            ->where('path_id', $path->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        $id = DB::table('training_path_enrollments')->insertGetId([
            'path_id'         => $path->id,
            'user_id'         => $user->id,
            'organization_id' => $user->organization_id,
            'status'          => 'enrolled',
            'progress_percent'=> 0,
            'started_at'      => now(),
        ]);

        return DB::table('training_path_enrollments')->find($id);
    }

    // ─── Progression ──────────────────────────────────────────────────────────

    /**
     * Retourne la progression détaillée par item du parcours.
     */
    public function getPathProgress(User $user, object $path): array
    {
        $items = json_decode($path->items ?? '[]', true);
        $result = [];

        foreach ($items as $item) {
            $type   = $item['type'] ?? 'course';
            $itemId = $item['id'] ?? null;
            $status = 'locked';
            $progress = 0;

            if ($type === 'course') {
                $enrollment = DB::table('training_enrollments')
                    ->where('course_id', $itemId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($enrollment) {
                    $status   = $enrollment->status ?? 'enrolled';
                    $progress = $enrollment->progress_percent ?? 0;
                } else {
                    $status = 'available';
                }
            } elseif ($type === 'scorm') {
                $session = DB::table('training_scorm_sessions')
                    ->where('scorm_package_id', $itemId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($session) {
                    $status   = in_array($session->completion_status, ['completed', 'passed']) ? 'completed' : 'in_progress';
                    $progress = $status === 'completed' ? 100 : 50;
                } else {
                    $status = 'available';
                }
            } elseif ($type === 'live') {
                $attendee = DB::table('training_live_attendees')
                    ->where('live_session_id', $itemId)
                    ->where('user_id', $user->id)
                    ->first();

                if ($attendee) {
                    $status   = $attendee->status === 'attended' ? 'completed' : 'registered';
                    $progress = $attendee->status === 'attended' ? 100 : 0;
                } else {
                    $status = 'available';
                }
            } elseif ($type === 'quiz') {
                $attempt = DB::table('training_quiz_attempts')
                    ->where('quiz_id', $itemId)
                    ->where('user_id', $user->id)
                    ->where('passed', true)
                    ->first();

                $status   = $attempt ? 'completed' : 'available';
                $progress = $attempt ? 100 : 0;
            }

            $result[] = array_merge($item, [
                'status'   => $status,
                'progress' => $progress,
            ]);
        }

        return $result;
    }

    /**
     * Recalcule et met à jour le pourcentage global du parcours.
     */
    public function updatePathProgress(object $enrollment): void
    {
        $path = DB::table('training_learning_paths')->find($enrollment->path_id);
        if (! $path) {
            return;
        }

        $user  = (object) ['id' => $enrollment->user_id, 'organization_id' => $enrollment->organization_id];
        $items = $this->getPathProgress($user, $path);

        if (empty($items)) {
            return;
        }

        $completedCount = collect($items)->filter(fn ($i) => $i['status'] === 'completed')->count();
        $totalCount     = count($items);
        $percent        = $totalCount > 0 ? (int) round($completedCount / $totalCount * 100) : 0;

        DB::table('training_path_enrollments')
            ->where('id', $enrollment->id)
            ->update([
                'progress_percent' => $percent,
                'status'           => $percent === 100 ? 'completed' : 'in_progress',
            ]);

        if ($percent === 100) {
            $updated = DB::table('training_path_enrollments')->find($enrollment->id);
            $this->completePath($updated);
        }
    }

    /**
     * Finalise le parcours et génère le certificat de parcours.
     */
    public function completePath(object $enrollment): void
    {
        if ($enrollment->completed_at) {
            return; // Déjà complété
        }

        DB::table('training_path_enrollments')
            ->where('id', $enrollment->id)
            ->update(['completed_at' => now(), 'status' => 'completed']);

        $path = DB::table('training_learning_paths')->find($enrollment->path_id);
        $user = DB::table('users')->find($enrollment->user_id);

        if ($path && $user) {
            $this->generatePathCertificate($enrollment, $path, $user);
        }
    }

    /**
     * Génère un certificat de complétion du parcours.
     */
    private function generatePathCertificate(object $enrollment, object $path, object $user): void
    {
        $token = bin2hex(random_bytes(20));

        DB::table('training_certificates')->insert([
            'organization_id'  => $enrollment->organization_id,
            'user_id'          => $user->id,
            'course_id'        => null,
            'issued_at'        => now(),
            'verification_token' => $token,
            'certificate_data' => json_encode([
                'type'        => 'learning_path',
                'path_id'     => $path->id,
                'path_title'  => $path->title,
                'user_name'   => $user->name,
                'issued_at'   => now()->toIso8601String(),
            ]),
        ]);

        // Notification
        DB::table('notifications')->insert([
            'organization_id' => $enrollment->organization_id,
            'user_id'         => $user->id,
            'type'            => 'path_certificate_issued',
            'title'           => "Parcours terminé : {$path->title}",
            'body'            => "Félicitations ! Votre certificat de parcours est disponible.",
            'is_read'         => false,
            'created_at'      => now(),
        ]);
    }

    // ─── Catalogue de parcours ────────────────────────────────────────────────

    /**
     * Retourne les parcours d'une organisation avec la progression de l'utilisateur.
     */
    public function getPathsForUser(User $user): array
    {
        $paths = DB::table('training_learning_paths')
            ->where('organization_id', $user->organization_id)
            ->get();

        $enrollments = DB::table('training_path_enrollments')
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('path_id');

        return $paths->map(function ($path) use ($enrollments) {
            $enrollment = $enrollments[$path->id] ?? null;
            return (object) array_merge((array) $path, [
                'enrollment'       => $enrollment,
                'progress_percent' => $enrollment?->progress_percent ?? 0,
                'status'           => $enrollment?->status ?? 'not_enrolled',
                'items'            => json_decode($path->items ?? '[]', true),
            ]);
        })->toArray();
    }
}
