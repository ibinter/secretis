<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * IntrusionDetectionService — Détection et blocage des tentatives d'intrusion.
 *
 * Responsabilités :
 *  - Comptabiliser les échecs de connexion par IP et par email (Redis)
 *  - Bloquer les IPs et emails après dépassement du seuil
 *  - Enregistrer les activités suspectes et alerter les super-admins
 *  - Fournir la liste des IPs suspectes pour supervision
 *
 * Intégration dans les contrôleurs d'authentification :
 *   $ids = app(IntrusionDetectionService::class);
 *   if ($ids->isBlocked($email, $ip)) abort(429, 'Compte temporairement bloqué.');
 *   // ... tentative de login ...
 *   // En cas d'échec :
 *   $ids->recordFailedLogin($email, $ip);
 */
class IntrusionDetectionService
{
    /**
     * Nombre maximum de tentatives par IP avant blocage.
     */
    private const MAX_ATTEMPTS_BY_IP = 5;

    /**
     * Nombre maximum de tentatives par email avant blocage.
     */
    private const MAX_ATTEMPTS_BY_EMAIL = 3;

    /**
     * Durée du blocage et de la fenêtre de comptage (en minutes).
     */
    private const LOCKOUT_MINUTES = 15;

    /**
     * Seuil d'activités suspectes par utilisateur en 1 heure avant alerte admin.
     */
    private const SUSPICIOUS_ACTIVITY_THRESHOLD = 3;

    /**
     * Nombre de tentatives par IP en 1 heure pour être signalé comme suspect.
     */
    private const SUSPICIOUS_IP_THRESHOLD = 10;

    /**
     * Enregistre un échec de connexion pour une IP et un email donnés.
     * Incrémente les compteurs Redis avec une expiration de LOCKOUT_MINUTES.
     */
    public function recordFailedLogin(string $email, string $ip): void
    {
        $ipKey    = $this->ipKey($ip);
        $emailKey = $this->emailKey($email);
        $ttl      = self::LOCKOUT_MINUTES * 60;

        // Incrémenter le compteur IP
        $ipAttempts = Cache::increment($ipKey);
        if ($ipAttempts === 1) {
            // Première tentative : définir l'expiration
            Cache::put($ipKey, 1, $ttl);
        } else {
            // Renouveler le TTL à chaque tentative pour maintenir la fenêtre glissante
            Cache::put($ipKey, $ipAttempts, $ttl);
        }

        // Incrémenter le compteur email
        $emailAttempts = Cache::increment($emailKey);
        if ($emailAttempts === 1) {
            Cache::put($emailKey, 1, $ttl);
        } else {
            Cache::put($emailKey, $emailAttempts, $ttl);
        }

        // Journaliser
        Log::channel('security')->info('IntrusionDetection: échec de connexion', [
            'email'          => $email,
            'ip'             => $ip,
            'ip_attempts'    => $ipAttempts,
            'email_attempts' => $emailAttempts,
        ]);

        // Alerte si seuil atteint
        if ($ipAttempts >= self::MAX_ATTEMPTS_BY_IP) {
            Log::channel('security')->warning('IntrusionDetection: IP bloquée', [
                'ip'      => $ip,
                'email'   => $email,
                'attempts'=> $ipAttempts,
            ]);
        }

        if ($emailAttempts >= self::MAX_ATTEMPTS_BY_EMAIL) {
            Log::channel('security')->warning('IntrusionDetection: email bloqué', [
                'email'   => $email,
                'ip'      => $ip,
                'attempts'=> $emailAttempts,
            ]);
        }

        // Compteur global IP pour la liste des IPs suspectes (fenêtre 1 heure)
        $suspiciousKey = $this->suspiciousIpKey($ip);
        $hourlyCount   = Cache::increment($suspiciousKey);
        if ($hourlyCount === 1) {
            Cache::put($suspiciousKey, 1, 3600);
        } else {
            Cache::put($suspiciousKey, $hourlyCount, 3600);
        }
    }

    /**
     * Détermine si un email ou une IP est actuellement bloqué.
     *
     * @return bool true si l'accès doit être refusé
     */
    public function isBlocked(string $email, string $ip): bool
    {
        $ipAttempts    = (int) Cache::get($this->ipKey($ip), 0);
        $emailAttempts = (int) Cache::get($this->emailKey($email), 0);

        return $ipAttempts >= self::MAX_ATTEMPTS_BY_IP
            || $emailAttempts >= self::MAX_ATTEMPTS_BY_EMAIL;
    }

    /**
     * Retourne le nombre de secondes restantes avant déblocage pour une IP.
     */
    public function retryAfterSeconds(string $ip): int
    {
        return (int) (Cache::getStore() instanceof \Illuminate\Cache\RedisStore
            ? $this->getRedisTtl($this->ipKey($ip))
            : self::LOCKOUT_MINUTES * 60);
    }

    /**
     * Réinitialise les compteurs après une connexion réussie.
     */
    public function clearFailedAttempts(string $email, string $ip): void
    {
        Cache::forget($this->ipKey($ip));
        Cache::forget($this->emailKey($email));
    }

    /**
     * Enregistre une activité suspecte pour un utilisateur authentifié.
     * Notifie les super-admins si le seuil est dépassé en 1 heure.
     *
     * @param string $type    Type d'activité (ex: 'org_scope_violation', 'mass_export', 'privilege_escalation')
     * @param array  $context Données additionnelles de contexte
     */
    public function recordSuspiciousActivity(User $user, string $type, array $context = []): void
    {
        $cacheKey = 'suspicious_activity:' . $user->id;
        $count    = Cache::increment($cacheKey);

        if ($count === 1) {
            Cache::put($cacheKey, 1, 3600);
        } else {
            Cache::put($cacheKey, $count, 3600);
        }

        // Persistance dans la table d'audit si disponible
        $this->persistAuditLog($user, $type, $context);

        Log::channel('security')->warning('IntrusionDetection: activité suspecte', array_merge([
            'user_id'         => $user->id,
            'user_email'      => $user->email,
            'organization_id' => $user->organization_id,
            'type'            => $type,
            'count_last_hour' => $count,
        ], $context));

        // Notification super-admin si seuil dépassé
        if ($count >= self::SUSPICIOUS_ACTIVITY_THRESHOLD) {
            $this->notifySuperAdmins($user, $type, $count, $context);
        }
    }

    /**
     * Retourne la liste des IPs avec plus de SUSPICIOUS_IP_THRESHOLD tentatives
     * dans la dernière heure, triées par nombre décroissant de tentatives.
     *
     * @return array<array{ip: string, attempts: int}>
     */
    public function getSuspiciousIps(): array
    {
        // Lire toutes les clés suspicious_ip:* depuis le cache
        // (fonctionne avec Redis ; avec file cache, retourne uniquement les IPs connues)
        $results = [];

        try {
            $store = Cache::getStore();

            if ($store instanceof \Illuminate\Cache\RedisStore) {
                $prefix  = config('cache.prefix') . ':suspicious_ip:*';
                $redis   = $store->connection();
                $keys    = $redis->keys($prefix);

                foreach ($keys as $key) {
                    $attempts = (int) $redis->get($key);
                    if ($attempts >= self::SUSPICIOUS_IP_THRESHOLD) {
                        // Extraire l'IP depuis la clé
                        $rawKey = str_replace(config('cache.prefix') . ':', '', $key);
                        $ip     = str_replace('suspicious_ip:', '', $rawKey);
                        $results[] = ['ip' => $ip, 'attempts' => $attempts];
                    }
                }

                usort($results, fn ($a, $b) => $b['attempts'] <=> $a['attempts']);
            }
        } catch (\Exception $e) {
            Log::channel('security')->error('IntrusionDetection: impossible de lire les IPs suspectes', [
                'error' => $e->getMessage(),
            ]);
        }

        return $results;
    }

    // =========================================================================
    // Méthodes privées
    // =========================================================================

    private function ipKey(string $ip): string
    {
        return 'failed_login:' . sha1($ip);
    }

    private function emailKey(string $email): string
    {
        return 'failed_login_email:' . sha1(mb_strtolower($email));
    }

    private function suspiciousIpKey(string $ip): string
    {
        return 'suspicious_ip:' . sha1($ip);
    }

    /**
     * Persiste l'activité suspecte dans la table audit_logs si elle existe.
     */
    private function persistAuditLog(User $user, string $type, array $context): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('audit_logs')) {
                \Illuminate\Support\Facades\DB::table('audit_logs')->insert([
                    'user_id'         => $user->id,
                    'organization_id' => $user->organization_id,
                    'action'          => 'suspicious_activity',
                    'subject_type'    => 'security',
                    'subject_id'      => null,
                    'properties'      => json_encode(array_merge(['type' => $type], $context)),
                    'ip_address'      => request()->ip(),
                    'user_agent'      => request()->userAgent(),
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }
        } catch (\Exception $e) {
            Log::channel('security')->error('IntrusionDetection: impossible de persister en audit_logs', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifie les super-admins d'une activité suspecte répétée.
     */
    private function notifySuperAdmins(User $user, string $type, int $count, array $context): void
    {
        try {
            $superAdmins = \App\Models\User::role('superadmin_ibig')->get();

            if ($superAdmins->isEmpty()) {
                return;
            }

            Log::channel('security')->critical(
                'IntrusionDetection: ALERTE — activités suspectes répétées, super-admins notifiés',
                [
                    'user_id'   => $user->id,
                    'email'     => $user->email,
                    'type'      => $type,
                    'count'     => $count,
                    'context'   => $context,
                ]
            );

            // Notification via le système de notification Laravel
            // (personnaliser la classe de notification selon l'implémentation du projet)
            if (class_exists(\App\Notifications\SuspiciousActivityAlert::class)) {
                Notification::send($superAdmins, new \App\Notifications\SuspiciousActivityAlert(
                    $user,
                    $type,
                    $count,
                    $context
                ));
            }
        } catch (\Exception $e) {
            Log::channel('security')->error('IntrusionDetection: erreur lors de la notification super-admin', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Lit le TTL restant d'une clé Redis.
     */
    private function getRedisTtl(string $key): int
    {
        try {
            $store = Cache::getStore();
            if ($store instanceof \Illuminate\Cache\RedisStore) {
                $prefixedKey = config('cache.prefix') . ':' . $key;
                $ttl         = $store->connection()->ttl($prefixedKey);
                return max(0, (int) $ttl);
            }
        } catch (\Exception $e) {
            // Silencieux
        }

        return self::LOCKOUT_MINUTES * 60;
    }
}
