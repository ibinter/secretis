<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\SupportSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * SECRETIS ERP — SupportSessionService
 *
 * Gestion complète des sessions de prise en main à distance par les agents IBIG Soft.
 *
 * Flux standard :
 *   1. requestAccess()     — L'agent IBIG Soft demande l'accès (status: pending)
 *   2. approveAccess()     — L'admin client approuve (status: active)
 *   3. impersonateOrg()    — L'agent prend la main (session PHP)
 *   4. logSensitiveAction()— Chaque action sensible est tracée
 *   5. endSession()        — Fin manuelle ou expiration auto (status: ended/expired)
 */
class SupportSessionService
{
    /** Durée maximale d'une session de prise en main : 4 heures */
    private const MAX_DURATION_HOURS = 4;

    /** Rôle requis pour l'agent IBIG Soft */
    private const SUPPORT_ROLE = 'superadmin_ibig';

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Demande d'accès
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Crée une demande de prise en main pour une organisation cliente.
     *
     * @param  User         $supportUser   Agent IBIG Soft (doit avoir le rôle superadmin_ibig)
     * @param  Organization $org           Organisation cliente ciblée
     * @param  string       $reason        Motif obligatoire de la demande
     * @param  string|null  $ticketRef     Référence du ticket support lié (optionnel)
     * @return SupportSession
     *
     * @throws \InvalidArgumentException Si l'agent n'a pas le bon rôle
     * @throws \RuntimeException        Si une session active existe déjà
     */
    public function requestAccess(
        User $supportUser,
        Organization $org,
        string $reason,
        ?string $ticketRef = null
    ): SupportSession {
        // ── Vérification du rôle ─────────────────────────────────────────────
        if (!$supportUser->hasRole(self::SUPPORT_ROLE)) {
            throw new \InvalidArgumentException(
                "L'utilisateur [{$supportUser->email}] n'a pas le rôle requis pour initier une prise en main."
            );
        }

        // ── Vérification d'unicité — pas de session active simultanée ────────
        $activeSession = SupportSession::where('organization_id', $org->id)
            ->where('is_active', true)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if ($activeSession) {
            throw new \RuntimeException(
                "Une session de prise en main est déjà active pour cette organisation (session #{$activeSession->id})."
            );
        }

        // ── Création de la session ───────────────────────────────────────────
        $session = SupportSession::create([
            'organization_id'  => $org->id,
            'support_user_id'  => $supportUser->id,
            'authorized_by_id' => null,
            'reason'           => $reason,
            'ticket_reference' => $ticketRef,
            'status'           => 'pending',
            'requested_at'     => Carbon::now(),
            'expires_at'       => Carbon::now()->addHours(self::MAX_DURATION_HOURS),
            'is_active'        => false,
            'client_notified'  => false,
            'actions_log'      => [],
        ]);

        // ── Notification à l'admin de l'organisation ─────────────────────────
        $this->notifyOrgAdmin($org, $session, 'request');

        // ── Journal d'audit ──────────────────────────────────────────────────
        $this->writeAuditLog($session, 'session_requested', [
            'reason'       => $reason,
            'ticket_ref'   => $ticketRef,
            'support_user' => $supportUser->email,
            'org_name'     => $org->name,
        ]);

        Log::channel('support')->info("Prise en main demandée", [
            'session_id'   => $session->id,
            'support_user' => $supportUser->email,
            'org_id'       => $org->id,
            'org_name'     => $org->name,
            'reason'       => $reason,
        ]);

        return $session;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Approbation par l'admin client
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Approuve une demande de prise en main.
     * Seul un admin de l'organisation concernée peut approuver.
     *
     * @param  int  $sessionId  ID de la session à approuver
     * @param  User $adminUser  Administrateur client qui approuve
     * @return SupportSession
     *
     * @throws \InvalidArgumentException Si l'admin n'appartient pas à la bonne organisation
     * @throws \RuntimeException        Si la session n'est pas en statut 'pending'
     */
    public function approveAccess(int $sessionId, User $adminUser): SupportSession
    {
        $session = SupportSession::findOrFail($sessionId);

        // ── Vérifications ────────────────────────────────────────────────────
        if ($session->status !== 'pending') {
            throw new \RuntimeException(
                "La session #{$sessionId} ne peut pas être approuvée (statut actuel : {$session->status})."
            );
        }

        if ($adminUser->organization_id !== $session->organization_id) {
            throw new \InvalidArgumentException(
                "L'utilisateur [{$adminUser->email}] n'appartient pas à l'organisation concernée par cette session."
            );
        }

        if (!$adminUser->hasAnyRole(['admin_organisation', 'dirigeant'])) {
            throw new \InvalidArgumentException(
                "Seul un administrateur ou un dirigeant peut approuver une prise en main."
            );
        }

        // ── Activation de la session ─────────────────────────────────────────
        $session->update([
            'status'           => 'active',
            'is_active'        => true,
            'authorized_by_id' => $adminUser->id,
            'approved_at'      => Carbon::now(),
            'started_at'       => Carbon::now(),
            'expires_at'       => Carbon::now()->addHours(self::MAX_DURATION_HOURS),
        ]);

        // ── Notification à l'agent IBIG Soft ────────────────────────────────
        $this->notifySupportUser($session, 'approved');

        // ── Journal d'audit ──────────────────────────────────────────────────
        $this->writeAuditLog($session, 'session_approved', [
            'approved_by'   => $adminUser->email,
            'expires_at'    => $session->expires_at->toIso8601String(),
        ]);

        Log::channel('support')->info("Prise en main approuvée", [
            'session_id'  => $session->id,
            'approved_by' => $adminUser->email,
            'expires_at'  => $session->expires_at,
        ]);

        return $session->fresh();
    }

    /**
     * Rejette une demande de prise en main.
     */
    public function rejectAccess(int $sessionId, User $adminUser, string $reason = ''): SupportSession
    {
        $session = SupportSession::findOrFail($sessionId);

        $session->update([
            'status'           => 'rejected',
            'is_active'        => false,
            'authorized_by_id' => $adminUser->id,
            'ended_at'         => Carbon::now(),
            'ended_by'         => 'client',
            'end_notes'        => $reason,
        ]);

        $this->notifySupportUser($session, 'rejected');
        $this->writeAuditLog($session, 'session_rejected', ['reason' => $reason]);

        return $session->fresh();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Impersonation de l'organisation
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Active la prise en main dans la session PHP.
     * Vérifie que la session est active et non expirée avant d'agir.
     *
     * @param  User         $supportUser  Agent IBIG Soft
     * @param  Organization $org          Organisation à prendre en main
     * @return void
     *
     * @throws \RuntimeException Si aucune session active n'est trouvée
     */
    public function impersonateOrg(User $supportUser, Organization $org): void
    {
        $session = SupportSession::where('organization_id', $org->id)
            ->where('support_user_id', $supportUser->id)
            ->where('status', 'active')
            ->where('is_active', true)
            ->where('expires_at', '>', Carbon::now())
            ->first();

        if (!$session) {
            throw new \RuntimeException(
                "Aucune session de prise en main active trouvée pour l'organisation [{$org->name}]. "
                . "Vérifiez que la session est approuvée et non expirée."
            );
        }

        // ── Injection dans la session PHP ────────────────────────────────────
        session([
            'impersonating_org_id' => $org->id,
            'support_session_id'   => $session->id,
            'support_agent_name'   => $supportUser->full_name,
            'support_agent_email'  => $supportUser->email,
            'impersonation_expires_at' => $session->expires_at->timestamp,
        ]);

        // ── Traçabilité ──────────────────────────────────────────────────────
        $this->logSensitiveAction($session->id, 'impersonation_started', [
            'support_user' => $supportUser->email,
            'org_name'     => $org->name,
            'ip'           => request()->ip(),
            'user_agent'   => request()->userAgent(),
        ]);

        $this->notifyOrgAdmin($org, $session, 'started');

        Log::channel('support')->warning("Prise en main démarrée", [
            'session_id'   => $session->id,
            'support_user' => $supportUser->email,
            'org_id'       => $org->id,
            'org_name'     => $org->name,
            'ip'           => request()->ip(),
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Journal des actions sensibles
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Enregistre une action sensible dans le journal de la session.
     *
     * @param  int    $sessionId  ID de la session active
     * @param  string $action     Code de l'action (ex: 'document_viewed', 'user_edited')
     * @param  array  $data       Données contextuelles de l'action
     * @return void
     */
    public function logSensitiveAction(int $sessionId, string $action, array $data = []): void
    {
        $session = SupportSession::find($sessionId);
        if (!$session) {
            return;
        }

        $currentLog = $session->actions_log ?? [];

        $currentLog[] = [
            'action'    => $action,
            'data'      => $data,
            'timestamp' => Carbon::now()->toIso8601String(),
            'ip'        => request()->ip() ?? 'CLI',
        ];

        // Limiter le log à 500 entrées maximum (protection volumétrie)
        if (count($currentLog) > 500) {
            array_shift($currentLog);
        }

        $session->update(['actions_log' => $currentLog]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Fin de session
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Termine manuellement une session de prise en main.
     *
     * @param  int         $sessionId  ID de la session à terminer
     * @param  string      $endedBy    Qui termine : 'support', 'client', 'system'
     * @param  string|null $notes      Notes de clôture optionnelles
     * @return void
     */
    public function endSession(int $sessionId, string $endedBy = 'support', ?string $notes = null): void
    {
        $session = SupportSession::findOrFail($sessionId);

        if (!$session->is_active && $session->status !== 'active') {
            return; // Session déjà terminée
        }

        $session->update([
            'status'   => 'ended',
            'is_active'=> false,
            'ended_at' => Carbon::now(),
            'ended_by' => $endedBy,
            'end_notes'=> $notes,
        ]);

        // ── Nettoyer la session PHP si active ────────────────────────────────
        if (session('support_session_id') === $sessionId) {
            session()->forget([
                'impersonating_org_id',
                'support_session_id',
                'support_agent_name',
                'support_agent_email',
                'impersonation_expires_at',
            ]);
        }

        // ── Notifications ────────────────────────────────────────────────────
        if ($session->organization) {
            $this->notifyOrgAdmin($session->organization, $session, 'ended');
        }

        $this->writeAuditLog($session, 'session_ended', [
            'ended_by'     => $endedBy,
            'notes'        => $notes,
            'duration_min' => $session->started_at
                ? Carbon::now()->diffInMinutes($session->started_at)
                : 0,
        ]);

        Log::channel('support')->info("Prise en main terminée", [
            'session_id' => $session->id,
            'ended_by'   => $endedBy,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // CRON : Expiration automatique des sessions
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Expire automatiquement les sessions dont la date d'expiration est dépassée.
     * Appelé par le CRON (Kernel.php) toutes les 15 minutes.
     *
     * @return int Nombre de sessions expirées
     */
    public function checkExpiredSessions(): int
    {
        $expiredSessions = SupportSession::where('is_active', true)
            ->where('expires_at', '<=', Carbon::now())
            ->get();

        $count = 0;
        foreach ($expiredSessions as $session) {
            $this->endSession($session->id, 'system', 'Session expirée automatiquement après 4 heures.');
            $count++;
        }

        // Expirer aussi les sessions 'pending' de plus de 48h sans réponse
        SupportSession::where('status', 'pending')
            ->where('requested_at', '<=', Carbon::now()->subHours(48))
            ->update([
                'status'   => 'expired',
                'is_active'=> false,
                'ended_at' => Carbon::now(),
                'ended_by' => 'system',
                'end_notes'=> 'Demande expirée sans réponse du client après 48 heures.',
            ]);

        return $count;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers privés
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * Notifie les administrateurs de l'organisation cliente.
     */
    private function notifyOrgAdmin(Organization $org, SupportSession $session, string $type): void
    {
        try {
            $admins = $org->users()
                ->whereIn('role', ['admin_organisation', 'dirigeant'])
                ->where('is_active', true)
                ->get();

            foreach ($admins as $admin) {
                // Notification in-app
                DB::table('notifications')->insert([
                    'id'               => \Str::uuid(),
                    'type'             => 'App\\Notifications\\SupportSessionNotification',
                    'notifiable_type'  => 'App\\Models\\User',
                    'notifiable_id'    => $admin->id,
                    'data'             => json_encode([
                        'type'         => $type,
                        'session_id'   => $session->id,
                        'agent_name'   => $session->supportUser?->full_name ?? 'Agent IBIG Soft',
                        'reason'       => $session->reason,
                        'expires_at'   => $session->expires_at?->toIso8601String(),
                    ]),
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);

                // TODO: Envoyer email via SupportSessionMail (à implémenter dans Mail/)
            }

            $session->update(['client_notified' => true]);

        } catch (\Throwable $e) {
            Log::error("Erreur notification admin client — session #{$session->id} : " . $e->getMessage());
        }
    }

    /**
     * Notifie l'agent IBIG Soft d'un changement de statut.
     */
    private function notifySupportUser(SupportSession $session, string $type): void
    {
        try {
            DB::table('notifications')->insert([
                'id'              => \Str::uuid(),
                'type'            => 'App\\Notifications\\SupportSessionStatusNotification',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id'   => $session->support_user_id,
                'data'            => json_encode([
                    'type'       => $type,
                    'session_id' => $session->id,
                    'org_name'   => $session->organization?->name,
                ]),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Erreur notification agent support — session #{$session->id} : " . $e->getMessage());
        }
    }

    /**
     * Écrit une entrée dans le journal d'audit global.
     */
    private function writeAuditLog(SupportSession $session, string $action, array $data = []): void
    {
        try {
            DB::table('audit_logs')->insert([
                'organization_id' => $session->organization_id,
                'user_id'         => $session->support_user_id,
                'action'          => $action,
                'description'     => "Session support #{$session->id} — " . $action,
                'properties'      => json_encode(array_merge($data, ['session_id' => $session->id])),
                'ip_address'      => request()->ip() ?? 'CLI',
                'user_agent'      => request()->userAgent() ?? 'CLI',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error("Erreur écriture audit log — session #{$session->id} : " . $e->getMessage());
        }
    }
}
