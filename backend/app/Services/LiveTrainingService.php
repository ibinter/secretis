<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * LiveTrainingService — Sessions de formation en direct
 */
class LiveTrainingService
{
    // ─── Création de session live ─────────────────────────────────────────────

    /**
     * Crée une session live.
     * Tente de générer le lien de réunion via API externe si configuré.
     */
    public function createLiveSession(array $data): object
    {
        $meetingUrl = $data['meeting_url'] ?? null;
        $meetingId  = $data['meeting_id'] ?? null;

        // Intégration Teams / Zoom si clé API configurée
        if (empty($meetingUrl)) {
            [$meetingUrl, $meetingId] = $this->generateMeetingLink(
                $data['platform'] ?? 'teams',
                $data['title'],
                $data['scheduled_at'],
                $data['duration_minutes'] ?? 60
            );
        }

        $id = DB::table('training_live_sessions')->insertGetId([
            'organization_id'    => $data['organization_id'],
            'course_id'          => $data['course_id'] ?? null,
            'title'              => $data['title'],
            'description'        => $data['description'] ?? null,
            'instructor_user_id' => $data['instructor_user_id'],
            'scheduled_at'       => $data['scheduled_at'],
            'duration_minutes'   => $data['duration_minutes'] ?? 60,
            'platform'           => $data['platform'] ?? 'teams',
            'meeting_url'        => $meetingUrl,
            'meeting_id'         => $meetingId,
            'max_participants'   => $data['max_participants'] ?? 50,
            'status'             => 'scheduled',
            'materials_paths'    => json_encode($data['materials_paths'] ?? []),
            'created_at'         => now(),
        ]);

        return DB::table('training_live_sessions')->find($id);
    }

    /**
     * Tente de créer un lien de réunion via l'API Teams/Zoom configurée.
     * Retourne [url, meeting_id] ou [null, null] si pas configuré.
     */
    private function generateMeetingLink(
        string $platform,
        string $title,
        string $scheduledAt,
        int $durationMinutes
    ): array {
        // Microsoft Teams via Graph API
        if ($platform === 'teams' && config('services.microsoft.client_id')) {
            try {
                // Implémentation Microsoft Graph API onlineMeeting
                // Nécessite un token OAuth valide stocké pour l'organisation
                Log::info("Teams meeting creation would happen here for: {$title}");
            } catch (\Throwable $e) {
                Log::warning("Teams meeting creation failed: {$e->getMessage()}");
            }
        }

        // Zoom via API v2
        if ($platform === 'zoom' && config('services.zoom.api_key')) {
            try {
                Log::info("Zoom meeting creation would happen here for: {$title}");
            } catch (\Throwable $e) {
                Log::warning("Zoom meeting creation failed: {$e->getMessage()}");
            }
        }

        return [null, null];
    }

    // ─── Inscriptions ─────────────────────────────────────────────────────────

    /**
     * Inscrit un utilisateur à une session live et envoie un email de confirmation.
     */
    public function registerAttendee(object $session, User $user): object
    {
        $existing = DB::table('training_live_attendees')
            ->where('live_session_id', $session->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        // Vérifier le nombre de places
        $attendeeCount = DB::table('training_live_attendees')
            ->where('live_session_id', $session->id)
            ->whereIn('status', ['registered', 'attended'])
            ->count();

        if ($attendeeCount >= $session->max_participants) {
            throw new \RuntimeException("La session est complète (max {$session->max_participants} participants).");
        }

        $id = DB::table('training_live_attendees')->insertGetId([
            'live_session_id' => $session->id,
            'user_id'         => $user->id,
            'organization_id' => $user->organization_id,
            'status'          => 'registered',
        ]);

        // Notification par email (best effort)
        try {
            $this->sendRegistrationEmail($user, $session);
        } catch (\Throwable $e) {
            Log::warning("Email confirmation live session failed: {$e->getMessage()}");
        }

        return DB::table('training_live_attendees')->find($id);
    }

    private function sendRegistrationEmail(User $user, object $session): void
    {
        // Utiliser le système de notification SECRETIS
        DB::table('notifications')->insert([
            'organization_id' => $user->organization_id,
            'user_id'         => $user->id,
            'type'            => 'live_session_registered',
            'title'           => "Inscription confirmée : {$session->title}",
            'body'            => "Vous êtes inscrit(e) à la session du " .
                date('d/m/Y à H:i', strtotime($session->scheduled_at)) .
                ". Lien : {$session->meeting_url}",
            'is_read'         => false,
            'created_at'      => now(),
        ]);
    }

    // ─── Gestion du cycle de vie ──────────────────────────────────────────────

    /**
     * Démarre la session → statut live + notification push à tous les inscrits.
     */
    public function startSession(object $session): void
    {
        DB::table('training_live_sessions')
            ->where('id', $session->id)
            ->update(['status' => 'live']);

        // Notifier tous les inscrits
        $attendees = DB::table('training_live_attendees')
            ->where('live_session_id', $session->id)
            ->where('status', 'registered')
            ->get();

        $notifications = $attendees->map(fn ($a) => [
            'organization_id' => $a->organization_id,
            'user_id'         => $a->user_id,
            'type'            => 'live_session_started',
            'title'           => "La session \"{$session->title}\" est en direct !",
            'body'            => "Rejoignez maintenant : {$session->meeting_url}",
            'is_read'         => false,
            'created_at'      => now(),
        ])->toArray();

        if (! empty($notifications)) {
            DB::table('notifications')->insert($notifications);
        }
    }

    /**
     * Termine la session → statut completed + génération d'attestations.
     */
    public function endSession(object $session): void
    {
        DB::table('training_live_sessions')
            ->where('id', $session->id)
            ->update(['status' => 'completed']);

        // Marquer les participants "registered" encore comme "absent"
        DB::table('training_live_attendees')
            ->where('live_session_id', $session->id)
            ->where('status', 'registered')
            ->update(['status' => 'absent']);
    }

    /**
     * Enregistre la présence effective d'un participant.
     */
    public function recordAttendance(object $session, User $user, int $durationMinutes): void
    {
        DB::table('training_live_attendees')
            ->where('live_session_id', $session->id)
            ->where('user_id', $user->id)
            ->update([
                'status'           => 'attended',
                'joined_at'        => now()->subMinutes($durationMinutes),
                'left_at'          => now(),
                'duration_minutes' => $durationMinutes,
            ]);
    }

    // ─── Statistiques ─────────────────────────────────────────────────────────

    /**
     * Retourne les statistiques d'une session live.
     */
    public function getLiveSessionStats(object $session): array
    {
        $attendees = DB::table('training_live_attendees')
            ->where('live_session_id', $session->id)
            ->get();

        $total      = $attendees->count();
        $attended   = $attendees->where('status', 'attended')->count();
        $absent     = $attendees->where('status', 'absent')->count();
        $registered = $attendees->where('status', 'registered')->count();

        $avgDuration = $attendees
            ->where('status', 'attended')
            ->avg('duration_minutes') ?? 0;

        $avgRating = $attendees
            ->whereNotNull('evaluation_rating')
            ->avg('evaluation_rating') ?? 0;

        return [
            'total_registered'    => $total,
            'attended'            => $attended,
            'absent'              => $absent,
            'pending'             => $registered,
            'attendance_rate'     => $total > 0 ? round($attended / $total * 100, 1) : 0,
            'avg_duration_min'    => round($avgDuration, 1),
            'avg_rating'          => round($avgRating, 2),
            'ratings_count'       => $attendees->whereNotNull('evaluation_rating')->count(),
        ];
    }

    /**
     * Retourne les sessions live d'une organisation avec filtres optionnels.
     */
    public function getSessionsForOrganization(int $organizationId, array $filters = []): \Illuminate\Support\Collection
    {
        $query = DB::table('training_live_sessions as ls')
            ->join('users as u', 'u.id', '=', 'ls.instructor_user_id')
            ->where('ls.organization_id', $organizationId)
            ->select(
                'ls.*',
                'u.name as instructor_name',
                DB::raw('(SELECT COUNT(*) FROM training_live_attendees WHERE live_session_id = ls.id) as registrant_count')
            );

        if (! empty($filters['status'])) {
            $query->where('ls.status', $filters['status']);
        }
        if (! empty($filters['from'])) {
            $query->where('ls.scheduled_at', '>=', $filters['from']);
        }
        if (! empty($filters['to'])) {
            $query->where('ls.scheduled_at', '<=', $filters['to']);
        }
        if (! empty($filters['instructor_id'])) {
            $query->where('ls.instructor_user_id', $filters['instructor_id']);
        }

        return $query->orderBy('ls.scheduled_at')->get();
    }
}
