<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Service de gestion des licences On-Premise SECRETIS ERP
 *
 * La licence est un JWT signé en RSA-SHA256 par la clé privée IBIG Soft.
 * La vérification est entièrement hors-ligne via la clé publique embarquée.
 * Format : base64url(header).base64url(payload).base64url(signature)
 */
class OnPremiseLicenseService
{
    private const CACHE_KEY     = 'secretis.license.validation';
    private const CACHE_TTL     = 86400; // 24 heures
    private const GRACE_PERIOD  = 7;    // jours de grâce après expiration
    private const WARN_BEFORE   = 30;   // alerter X jours avant expiration

    /**
     * Clé publique RSA IBIG Soft (embarquée dans l'application)
     * À remplacer par la vraie clé publique lors de la publication.
     */
    private const IBIG_PUBLIC_KEY = <<<'PEM'
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a8Q7k3mP9vR1xL4wZ6n
oF8tHjKyMcXdU2bG5eVsNpAqT0rWlYIuBhCvEfDgJzO3sPQmKRnXi9HE7wBtAoV
UyZcL6FsM4dPxJhN1rW0vKGqT3bY8nOeL5XmDfCpIzAhJwE9sQ2vK7lBuRgTmPo
YdXnVa3kHiFcE0bL6WzJrAyNtMsXOePqU1hKlBvD9TfGgYmQcZ5rNuIwEoVkRsPt
HxL4bJfC2dGmNqBWoYeP7zsKlUvTaXcM3hFnIrDgZ8eJpQoWvBsT1NmAyKlXRuEd
FcL6zVpMoT9GqH5jKnEwD8bYsAhJrXvNuO3Q4lTmBpCfZRwKIDAQAB
-----END PUBLIC KEY-----
PEM;

    // -------------------------------------------------------------------------

    /**
     * Valide la clé de licence et retourne les informations décodées.
     *
     * @throws RuntimeException si la licence est invalide ou expirée
     */
    public function validateLicense(string $licenseKey): array
    {
        // Retourner depuis le cache si disponible
        $cached = Cache::get(self::CACHE_KEY);
        if ($cached !== null && $cached['raw_key'] === $licenseKey) {
            return $cached;
        }

        $validation = $this->performValidation($licenseKey);

        // Mettre en cache uniquement les licences valides
        if ($validation['valid']) {
            Cache::put(self::CACHE_KEY, $validation, self::CACHE_TTL);
        }

        return $validation;
    }

    // -------------------------------------------------------------------------

    /**
     * Validation complète de la signature et du payload.
     */
    private function performValidation(string $licenseKey): array
    {
        try {
            // Normaliser la clé (supprimer espaces/tirets superflus)
            $token = $this->normalizeKey($licenseKey);

            // Découper le token JWT-like
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return $this->invalidResult('Format de licence invalide (3 segments attendus)');
            }

            [$headerB64, $payloadB64, $signatureB64] = $parts;

            // Décoder le payload
            $payload = json_decode($this->base64UrlDecode($payloadB64), true);
            if (! is_array($payload)) {
                return $this->invalidResult('Payload de licence illisible');
            }

            // Vérifier la signature RSA-SHA256
            $dataToVerify = $headerB64 . '.' . $payloadB64;
            $signature    = $this->base64UrlDecode($signatureB64);

            $publicKey = openssl_pkey_get_public(self::IBIG_PUBLIC_KEY);
            if ($publicKey === false) {
                throw new RuntimeException('Clé publique IBIG invalide (erreur de configuration)');
            }

            $verified = openssl_verify($dataToVerify, $signature, $publicKey, OPENSSL_ALGO_SHA256);

            if ($verified !== 1) {
                return $this->invalidResult('Signature de licence invalide — clé falsifiée ou corrompue');
            }

            // Vérifier les champs obligatoires
            foreach (['organization', 'max_users', 'valid_until', 'features', 'issued_at'] as $field) {
                if (! isset($payload[$field])) {
                    return $this->invalidResult("Champ manquant dans la licence : $field");
                }
            }

            // Vérifier l'expiration
            $validUntil = \Carbon\Carbon::createFromTimestamp($payload['valid_until']);
            $now        = now();
            $isExpired  = $now->isAfter($validUntil);
            $graceEnd   = $validUntil->addDays(self::GRACE_PERIOD);
            $inGrace    = $isExpired && $now->isBefore($graceEnd);
            $expiringSoon = ! $isExpired && $validUntil->diffInDays($now) <= self::WARN_BEFORE;

            if ($isExpired && ! $inGrace) {
                return $this->invalidResult(
                    "Licence expirée le {$validUntil->format('d/m/Y')}. Renouvelez sur https://ibigsoft.com"
                );
            }

            return [
                'valid'             => true,
                'raw_key'           => $licenseKey,
                'in_grace_period'   => $inGrace,
                'expiring_soon'     => $expiringSoon,
                'organization'      => $payload['organization'],
                'max_users'         => (int) $payload['max_users'],
                'valid_until'       => $validUntil->toISOString(),
                'valid_until_human' => $validUntil->format('d/m/Y'),
                'features'          => (array) $payload['features'],
                'issued_at'         => \Carbon\Carbon::createFromTimestamp($payload['issued_at'])->toISOString(),
                'license_type'      => $payload['type'] ?? 'on-premise',
                'validated_at'      => now()->toISOString(),
                'error'             => null,
                'warning'           => $this->buildWarning($inGrace, $expiringSoon, $validUntil),
            ];
        } catch (\Throwable $e) {
            Log::error('OnPremiseLicenseService: validation error', ['error' => $e->getMessage()]);

            return $this->invalidResult('Erreur interne lors de la validation de la licence');
        }
    }

    // -------------------------------------------------------------------------

    /**
     * Retourne les informations de la licence actuellement configurée.
     */
    public function getLicenseInfo(): array
    {
        $key = config('secretis.license_key', env('SECRETIS_LICENSE_KEY', ''));

        if (empty($key)) {
            return [
                'valid'        => false,
                'configured'   => false,
                'error'        => 'Aucune clé de licence configurée (SECRETIS_LICENSE_KEY)',
            ];
        }

        $result = $this->validateLicense($key);
        $result['configured'] = true;
        $result['active_users'] = $this->getActiveUserCount();

        return $result;
    }

    // -------------------------------------------------------------------------

    /**
     * Vérifie si une fonctionnalité spécifique est activée dans la licence.
     */
    public function isFeatureEnabled(string $feature): bool
    {
        try {
            $info = $this->getLicenseInfo();

            if (! $info['valid']) {
                return false;
            }

            $features = $info['features'] ?? [];

            // Support wildcard : 'all' active toutes les features
            if (in_array('all', $features, true)) {
                return true;
            }

            return in_array($feature, $features, true);
        } catch (\Throwable $e) {
            return false;
        }
    }

    // -------------------------------------------------------------------------

    /**
     * Vérifie si le nombre d'utilisateurs actifs respecte la limite de la licence.
     */
    public function isUserLimitReached(): bool
    {
        $info = $this->getLicenseInfo();

        if (! $info['valid']) {
            return true;
        }

        $maxUsers    = $info['max_users'] ?? 0;
        $activeUsers = $info['active_users'] ?? 0;

        // Limite illimitée
        if ($maxUsers === -1 || $maxUsers === 0) {
            return false;
        }

        return $activeUsers >= $maxUsers;
    }

    // -------------------------------------------------------------------------

    /**
     * Génère une demande d'activation pour les clients air-gap (sans accès internet).
     * Le client envoie ce token à IBIG Soft pour obtenir une clé de licence.
     */
    public function generateActivationRequest(): string
    {
        $serverFingerprint = $this->getServerFingerprint();

        $request = [
            'type'           => 'activation_request',
            'version'        => '1.0',
            'timestamp'      => now()->toISOString(),
            'server_id'      => $serverFingerprint,
            'hostname'       => gethostname(),
            'ip'             => request()->ip() ?? 'cli',
            'php_version'    => PHP_VERSION,
            'app_version'    => config('app.version', '1.0.0'),
            'os'             => PHP_OS,
        ];

        return base64_encode(json_encode($request));
    }

    // -------------------------------------------------------------------------

    /**
     * Invalide le cache de licence (utile après activation ou renouvellement).
     */
    public function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    private function normalizeKey(string $key): string
    {
        // Si c'est le format tiret (XXXX-XXXX-...) le convertir en JWT
        // Sinon le retourner tel quel (déjà en format JWT a.b.c)
        if (str_contains($key, '.')) {
            return $key;
        }

        // Format legacy : concaténer et décoder
        return str_replace(['-', ' '], '', $key);
    }

    private function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder > 0) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($data, '-_', '+/'));
    }

    private function invalidResult(string $error): array
    {
        return [
            'valid'   => false,
            'error'   => $error,
            'raw_key' => null,
        ];
    }

    private function buildWarning(bool $inGrace, bool $expiringSoon, \Carbon\Carbon $validUntil): ?string
    {
        if ($inGrace) {
            return "Licence expirée — période de grâce active jusqu'au {$validUntil->addDays(self::GRACE_PERIOD)->format('d/m/Y')}. Renouvelez sur https://ibigsoft.com";
        }

        if ($expiringSoon) {
            $days = (int) now()->diffInDays($validUntil);
            return "Licence expire dans $days jour(s) ({$validUntil->format('d/m/Y')}). Renouvelez sur https://ibigsoft.com";
        }

        return null;
    }

    private function getActiveUserCount(): int
    {
        try {
            return \App\Models\User::where('is_active', true)->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getServerFingerprint(): string
    {
        // Empreinte serveur basée sur des éléments stables
        $factors = [
            gethostname(),
            php_uname('m'),  // architecture
            php_uname('s'),  // OS
            config('app.key', ''),
        ];

        return hash('sha256', implode('|', $factors));
    }
}
