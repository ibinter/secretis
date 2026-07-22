<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Failed as LoginFailed;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * LogSecurityEvent — Listener d'événements de sécurité SECRETIS ERP
 *
 * Écoute :
 *   - LoginFailed (Illuminate\Auth\Events\Failed)
 *   - PasswordReset (Illuminate\Auth\Events\PasswordReset)
 *   - MfaFailed (App\Events\MfaFailed) — si implémenté
 *   - SuspiciousActivity (App\Events\SuspiciousActivity) — si implémenté
 *
 * Alerte Slack si > 10 LoginFailed en 5 min depuis la même IP.
 */
class LogSecurityEvent
{
    /**
     * Seuil de tentatives de connexion avant alerte (par IP, sur 5 min).
     */
    private const LOGIN_FAILED_THRESHOLD = 10;

    /**
     * Handle d'un événement LoginFailed (Illuminate standard).
     */
    public function handleLoginFailed(LoginFailed $event): void
    {
        $email = optional($event->credentials)['email'] ?? 'inconnu';
        $ip    = request()->ip();
        $ua    = request()->userAgent();

        Log::channel('security')->warning('login_failed', [
            'email'      => $email,
            'ip'         => $ip,
            'user_agent' => $ua,
            'timestamp'  => now()->toIso8601String(),
        ]);

        $this->checkBruteForce($ip);
    }

    /**
     * Handle d'un événement PasswordReset (Illuminate standard).
     */
    public function handlePasswordReset(\Illuminate\Auth\Events\PasswordReset $event): void
    {
        Log::channel('security')->info('password_reset', [
            'user_id'    => optional($event->user)->id,
            'email'      => optional($event->user)->email,
            'ip'         => request()->ip(),
            'timestamp'  => now()->toIso8601String(),
        ]);
    }

    /**
     * Handle d'un événement MfaFailed (custom App\Events\MfaFailed).
     */
    public function handleMfaFailed(object $event): void
    {
        $userId = property_exists($event, 'user') ? optional($event->user)->id : null;
        $ip     = request()->ip();

        Log::channel('security')->warning('mfa_failed', [
            'user_id'   => $userId,
            'ip'        => $ip,
            'timestamp' => now()->toIso8601String(),
        ]);

        $this->checkBruteForce($ip);
    }

    /**
     * Handle d'un événement SuspiciousActivity (custom App\Events\SuspiciousActivity).
     */
    public function handleSuspiciousActivity(object $event): void
    {
        Log::channel('security')->error('suspicious_activity', [
            'description' => property_exists($event, 'description') ? $event->description : 'Activité suspecte détectée',
            'user_id'     => property_exists($event, 'userId') ? $event->userId : null,
            'ip'          => request()->ip(),
            'timestamp'   => now()->toIso8601String(),
        ]);

        // Toujours alerter sur Slack pour une activité suspecte
        Log::channel('slack')->critical('Activité suspecte SECRETIS', [
            'description' => property_exists($event, 'description') ? $event->description : 'Activité suspecte détectée',
            'ip'          => request()->ip(),
        ]);
    }

    // ─── Anti-brute force ────────────────────────────────────────────────────

    /**
     * Vérifie si une IP a dépassé le seuil de tentatives en 5 minutes.
     * Alerte Slack si c'est le cas, avec anti-spam (1 alerte / 15 min / IP).
     */
    private function checkBruteForce(string $ip): void
    {
        $windowKey = 'security:login_failed:' . $ip . ':' . now()->format('YmdHi');
        $count     = Redis::incr($windowKey);
        Redis::expire($windowKey, 300); // 5 minutes

        // Compter sur une fenêtre glissante de 5 minutes (5 clés)
        $total = 0;
        for ($i = 0; $i < 5; $i++) {
            $k     = 'security:login_failed:' . $ip . ':' . now()->subMinutes($i)->format('YmdHi');
            $total += (int) Redis::get($k);
        }

        if ($total < self::LOGIN_FAILED_THRESHOLD) {
            return;
        }

        // Anti-spam : 1 alerte max par 15 minutes par IP
        $alertKey = "security:alert:brute_force:{$ip}";
        if (Redis::exists($alertKey)) {
            return;
        }
        Redis::setex($alertKey, 900, 1); // 15 min

        Log::channel('slack')->critical('Brute Force détecté sur SECRETIS', [
            'ip'              => $ip,
            'failed_attempts' => $total,
            'window_minutes'  => 5,
            'timestamp'       => now()->toIso8601String(),
        ]);

        Log::channel('security')->critical('brute_force_detected', [
            'ip'              => $ip,
            'failed_attempts' => $total,
        ]);
    }

    // ─── Mapping events → handlers (pour EventServiceProvider) ───────────────

    /**
     * Retourne le mapping events → méthodes pour l'inscription manuelle.
     *
     * Usage dans EventServiceProvider::$listen ou boot() :
     *   Event::listen(LoginFailed::class, [LogSecurityEvent::class, 'handleLoginFailed']);
     */
    public static function eventMap(): array
    {
        return [
            \Illuminate\Auth\Events\Failed::class         => 'handleLoginFailed',
            \Illuminate\Auth\Events\PasswordReset::class  => 'handlePasswordReset',
            // Événements custom — décommenter quand implémentés :
            // \App\Events\MfaFailed::class               => 'handleMfaFailed',
            // \App\Events\SuspiciousActivity::class      => 'handleSuspiciousActivity',
        ];
    }
}
