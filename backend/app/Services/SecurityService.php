<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * SecurityService — Services de sécurité transversaux SECRETIS
 *
 * Centralise les opérations de sécurité qui ne peuvent pas vivre dans un seul middleware :
 *  - Détection de connexions suspectes (géolocalisation, device fingerprint)
 *  - Génération et validation de tokens CSRF rotatifs
 *  - Validation stricte des fichiers uploadés (MIME réel + magic bytes)
 *  - Sanitisation des entrées utilisateur
 *  - Hachage des données sensibles pour les logs
 */
class SecurityService
{
    /**
     * Extensions de fichiers autorisées par catégorie.
     */
    private const ALLOWED_MIME_TYPES = [
        // Documents
        'application/pdf'                                                     => 'pdf',
        'application/msword'                                                  => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel'                                            => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'   => 'xlsx',
        'application/vnd.ms-powerpoint'                                       => 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        // Images
        'image/jpeg'                                                          => 'jpg',
        'image/png'                                                           => 'png',
        'image/gif'                                                           => 'gif',
        'image/webp'                                                          => 'webp',
        'image/svg+xml'                                                       => 'svg',
        // Archives
        'application/zip'                                                     => 'zip',
        'application/x-rar-compressed'                                        => 'rar',
        // Texte
        'text/plain'                                                          => 'txt',
        'text/csv'                                                            => 'csv',
    ];

    /**
     * Magic bytes (signatures binaires) pour les types les plus courants.
     * Permet de détecter les fichiers mal nommés (ex: shell PHP renommé en .jpg).
     *
     * Format : mime_type => [hex_signature, offset_en_bytes]
     */
    private const MAGIC_BYTES = [
        'image/jpeg'      => [['FFD8FF'], 0],
        'image/png'       => [['89504E47'], 0],
        'image/gif'       => [['474946383761', '474946383961'], 0], // GIF87a et GIF89a
        'image/webp'      => [['52494646'], 0], // RIFF
        'application/pdf' => [['25504446'], 0], // %PDF
        'application/zip' => [['504B0304', '504B0506', '504B0708'], 0],
    ];

    /**
     * Extensions exécutables toujours rejetées, peu importe le MIME déclaré.
     */
    private const DANGEROUS_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar',
        'exe', 'bat', 'cmd', 'sh', 'bash', 'py', 'pl', 'rb',
        'js', 'vbs', 'jar', 'war', 'ear',
        'asp', 'aspx', 'cfm', 'cgi',
        'htaccess', 'htpasswd',
    ];

    // -------------------------------------------------------------------------
    // Détection de connexions suspectes
    // -------------------------------------------------------------------------

    /**
     * Analyse une tentative de connexion et détecte les anomalies.
     *
     * Critères de suspicion :
     *  1. Nouveau pays/ville par rapport aux connexions habituelles
     *  2. Nouveau device fingerprint
     *  3. Connexion hors des heures habituelles (défini par le profil de l'utilisateur)
     *  4. IP répertoriée dans une liste noire
     *
     * @return bool true si la connexion est suspecte (déclenche une alerte)
     */
    public function detectSuspiciousLogin(User $user, Request $request): bool
    {
        $isSuspicious  = false;
        $reasons       = [];
        $currentIp     = $request->ip();
        $userAgent     = $request->userAgent() ?? '';

        // 1. Vérification de la géolocalisation
        $geoInfo = $this->getGeoInfo($currentIp);

        if ($geoInfo && $this->isNewLocation($user, $geoInfo)) {
            $isSuspicious = true;
            $reasons[]    = 'new_location';

            Log::channel('security')->info('Connexion depuis un nouveau pays/ville', [
                'user_id'  => $user->id,
                'email'    => $this->hashSensitiveData($user->email),
                'country'  => $geoInfo['country'] ?? 'unknown',
                'city'     => $geoInfo['city'] ?? 'unknown',
                'ip'       => $this->hashSensitiveData($currentIp), // IP hashée dans les logs
            ]);

            // Envoi d'une notification à l'utilisateur
            $this->notifyNewLocation($user, $geoInfo, $currentIp);
        }

        // 2. Vérification du device fingerprint
        $fingerprint = $this->computeDeviceFingerprint($request);

        if ($this->isNewDevice($user, $fingerprint)) {
            $isSuspicious = true;
            $reasons[]    = 'new_device';

            Log::channel('security')->info('Connexion depuis un nouveau device', [
                'user_id'     => $user->id,
                'fingerprint' => substr($fingerprint, 0, 8) . '...', // Partiel dans les logs
            ]);

            // Stocker le nouveau device comme connu
            $this->registerDevice($user, $fingerprint);
        }

        // 3. Vérification des heures habituelles
        if ($this->isUnusualHour($user)) {
            $reasons[] = 'unusual_hour';

            Log::channel('security')->info('Connexion hors heures habituelles', [
                'user_id' => $user->id,
                'hour'    => now($user->timezone ?? 'UTC')->hour,
            ]);
        }

        // 4. IP en liste noire
        if ($this->isBlacklistedIp($currentIp)) {
            $isSuspicious = true;
            $reasons[]    = 'blacklisted_ip';

            Log::channel('security')->warning('Connexion depuis une IP en liste noire', [
                'user_id' => $user->id,
                'ip_hash' => $this->hashSensitiveData($currentIp),
            ]);
        }

        if ($isSuspicious) {
            // Enregistrer la tentative suspecte en cache pour monitoring
            $cacheKey = "suspicious_logins:{$user->id}";
            $attempts = Cache::get($cacheKey, []);
            $attempts[] = [
                'timestamp' => now()->toIso8601String(),
                'reasons'   => $reasons,
                'ip_hash'   => $this->hashSensitiveData($currentIp),
            ];
            Cache::put($cacheKey, array_slice($attempts, -10), now()->addDays(30));
        }

        return $isSuspicious;
    }

    // -------------------------------------------------------------------------
    // CSRF tokens rotatifs
    // -------------------------------------------------------------------------

    /**
     * Génère un token CSRF rotatif par session.
     * Stocké en session, invalidé après utilisation ou expiration.
     *
     * Usage pour les formulaires critiques (paiement, suppression de compte) :
     *   $token = $securityService->generateCsrfToken();
     *   // Côté serveur : $securityService->validateCsrfToken($request->input('_security_token'));
     */
    public function generateCsrfToken(): string
    {
        $token = Str::random(64);

        // Stocker avec expiration (token valide 30 minutes)
        session(['_security_token' => [
            'value'      => hash('sha256', $token),
            'expires_at' => now()->addMinutes(30)->timestamp,
            'used'       => false,
        ]]);

        return $token;
    }

    /**
     * Valide et invalide (usage unique) un token CSRF de sécurité.
     */
    public function validateCsrfToken(string $token): bool
    {
        $stored = session('_security_token');

        if (! $stored) {
            return false;
        }

        // Vérifier l'expiration
        if ($stored['expires_at'] < now()->timestamp) {
            session()->forget('_security_token');
            return false;
        }

        // Vérifier si déjà utilisé (usage unique)
        if ($stored['used']) {
            Log::channel('security')->warning('Token CSRF déjà utilisé — possible replay attack', [
                'user_id' => auth()->id(),
                'ip'      => request()->ip(),
            ]);
            return false;
        }

        // Comparaison en temps constant (résistant au timing attack)
        $valid = hash_equals($stored['value'], hash('sha256', $token));

        if ($valid) {
            // Invalider le token après usage
            session(['_security_token' => array_merge($stored, ['used' => true])]);
        }

        return $valid;
    }

    // -------------------------------------------------------------------------
    // Validation stricte des fichiers uploadés
    // -------------------------------------------------------------------------

    /**
     * Valide un fichier uploadé avec plusieurs niveaux de vérification.
     *
     * Niveau 1 : Extension interdite (exécutables)
     * Niveau 2 : MIME type annoncé par le navigateur (faible confiance)
     * Niveau 3 : MIME type réel via finfo (lecture du fichier)
     * Niveau 4 : Magic bytes (signature binaire dans le fichier)
     * Niveau 5 : Scan antivirus ClamAV (optionnel)
     *
     * @return ValidationResult {valid: bool, error: string|null, mime: string|null}
     */
    public function validateFileUpload(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $path      = $file->getRealPath();

        // Niveau 1 — Extension exécutable toujours rejetée
        if (in_array($extension, self::DANGEROUS_EXTENSIONS, true)) {
            Log::channel('security')->warning('Upload rejeté : extension dangereuse', [
                'extension'     => $extension,
                'original_name' => $this->hashSensitiveData($file->getClientOriginalName()),
                'user_id'       => auth()->id(),
            ]);

            return ['valid' => false, 'error' => 'Type de fichier non autorisé.', 'mime' => null];
        }

        // Niveau 2 — MIME type réel via finfo (PHP fileinfo extension)
        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($path);

        if (! $realMime) {
            return ['valid' => false, 'error' => 'Impossible de déterminer le type du fichier.', 'mime' => null];
        }

        // Niveau 3 — Vérifier que le MIME est dans la liste autorisée
        if (! array_key_exists($realMime, self::ALLOWED_MIME_TYPES)) {
            Log::channel('security')->warning('Upload rejeté : MIME non autorisé', [
                'real_mime'  => $realMime,
                'user_id'    => auth()->id(),
            ]);

            return ['valid' => false, 'error' => 'Type de fichier non autorisé : ' . $realMime, 'mime' => $realMime];
        }

        // Niveau 4 — Vérification des magic bytes pour les types les plus sensibles
        if (isset(self::MAGIC_BYTES[$realMime])) {
            [$expectedSignatures, $offset] = self::MAGIC_BYTES[$realMime];

            if (! $this->verifyMagicBytes($path, $expectedSignatures, $offset)) {
                Log::channel('security')->warning('Upload rejeté : magic bytes invalides', [
                    'real_mime'   => $realMime,
                    'user_id'     => auth()->id(),
                ]);

                return ['valid' => false, 'error' => 'Le fichier est corrompu ou sa signature est invalide.', 'mime' => $realMime];
            }
        }

        // Niveau 5 — Scan ClamAV (optionnel, si configuré)
        if (config('security.clamav_enabled', false)) {
            $scanResult = $this->scanWithClamAv($path);

            if ($scanResult === false) {
                return ['valid' => false, 'error' => 'Fichier rejeté par l\'antivirus.', 'mime' => $realMime];
            }
        }

        // Vérification de la taille maximale
        $maxSizeBytes = config('security.max_upload_size_mb', 50) * 1024 * 1024;

        if ($file->getSize() > $maxSizeBytes) {
            return [
                'valid' => false,
                'error' => 'Fichier trop volumineux (max ' . config('security.max_upload_size_mb', 50) . ' MB).',
                'mime'  => $realMime,
            ];
        }

        return ['valid' => true, 'error' => null, 'mime' => $realMime];
    }

    // -------------------------------------------------------------------------
    // Sanitisation des entrées
    // -------------------------------------------------------------------------

    /**
     * Nettoyage récursif des entrées utilisateur.
     * Supprime les balises HTML dangereuses, normalise les espaces.
     *
     * NOTE : N'utiliser que pour les données non-HTML. Pour les champs
     * qui doivent accepter du HTML riche, utiliser HTMLPurifier.
     *
     * @param  mixed  $input  Scalaire, tableau ou null
     * @return mixed          Même structure, nettoyée
     */
    public function sanitizeInput(mixed $input): mixed
    {
        if (is_null($input)) {
            return null;
        }

        if (is_array($input)) {
            return array_map([$this, 'sanitizeInput'], $input);
        }

        if (is_string($input)) {
            // Supprimer les caractères de contrôle (sauf tabulation et saut de ligne)
            $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);

            // Supprimer les balises HTML/script
            $cleaned = strip_tags($cleaned ?? '');

            // Normaliser les espaces multiples
            $cleaned = preg_replace('/\s+/', ' ', $cleaned);

            // Trim
            return trim($cleaned ?? '');
        }

        // Entiers, flottants, booléens : retournés tels quels
        return $input;
    }

    // -------------------------------------------------------------------------
    // Hachage des données sensibles pour les logs
    // -------------------------------------------------------------------------

    /**
     * Hache une donnée sensible pour l'inclure dans les logs sans l'exposer.
     *
     * Propriétés :
     *  - Déterministe : la même valeur produit toujours le même hash → corrélation possible
     *  - Irréversible : impossible de retrouver la valeur originale depuis les logs
     *  - Résistant aux rainbow tables : salé avec APP_KEY
     *
     * Utilisation :
     *   Log::info('Tentative', ['email' => $security->hashSensitiveData($email)]);
     *   → "email" => "sha256:a3f8b2..." (corrélable entre logs, pas déchiffrable)
     */
    public function hashSensitiveData(string $data): string
    {
        $salt = config('app.key', 'default_salt');

        return 'sha256:' . substr(hash_hmac('sha256', $data, $salt), 0, 16);
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    /**
     * Récupère les informations de géolocalisation d'une IP.
     * Utilise le service configuré (MaxMind GeoLite2 ou ipapi.co en fallback).
     *
     * @return array{country: string, city: string, lat: float, lon: float}|null
     */
    private function getGeoInfo(string $ip): ?array
    {
        // IPs locales/privées → pas de géolocalisation
        if (in_array($ip, ['127.0.0.1', '::1']) || str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.')) {
            return null;
        }

        try {
            // Cache 24h pour éviter de sur-solliciter l'API
            return Cache::remember("geo:{$ip}", now()->addDay(), function () use ($ip) {
                // MaxMind GeoLite2 (local, recommandé pour la production)
                // $reader = new \GeoIp2\Database\Reader(storage_path('geoip/GeoLite2-City.mmdb'));
                // $record = $reader->city($ip);
                // return ['country' => $record->country->isoCode, 'city' => $record->city->name];

                // Fallback HTTP (ne pas utiliser en production avec des données sensibles)
                $response = \Illuminate\Support\Facades\Http::timeout(3)->get("https://ipapi.co/{$ip}/json/");

                if ($response->successful()) {
                    $data = $response->json();
                    return [
                        'country' => $data['country_code'] ?? 'XX',
                        'city'    => $data['city'] ?? 'Unknown',
                        'lat'     => $data['latitude'] ?? 0,
                        'lon'     => $data['longitude'] ?? 0,
                    ];
                }

                return null;
            });
        } catch (\Throwable $e) {
            Log::debug('GeoIP lookup failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Vérifie si la localisation est nouvelle pour cet utilisateur.
     */
    private function isNewLocation(User $user, array $geoInfo): bool
    {
        $knownLocations = Cache::get("known_locations:{$user->id}", []);
        $locationKey    = ($geoInfo['country'] ?? 'XX') . ':' . ($geoInfo['city'] ?? 'Unknown');

        if (! in_array($locationKey, $knownLocations)) {
            $knownLocations[] = $locationKey;
            Cache::put("known_locations:{$user->id}", array_unique($knownLocations), now()->addYear());
            return true;
        }

        return false;
    }

    /**
     * Calcule un fingerprint pseudo-anonyme du device.
     * Hash de l'User-Agent + Accept-Language (non lié à une IP).
     */
    private function computeDeviceFingerprint(Request $request): string
    {
        $components = implode('|', [
            $request->userAgent() ?? '',
            $request->header('Accept-Language', ''),
            $request->header('Accept-Encoding', ''),
        ]);

        return hash('sha256', $components);
    }

    /**
     * Vérifie si le device fingerprint est nouveau pour cet utilisateur.
     */
    private function isNewDevice(User $user, string $fingerprint): bool
    {
        $knownDevices = Cache::get("known_devices:{$user->id}", []);
        return ! in_array($fingerprint, $knownDevices);
    }

    /**
     * Enregistre un nouveau device fingerprint comme connu.
     */
    private function registerDevice(User $user, string $fingerprint): void
    {
        $knownDevices   = Cache::get("known_devices:{$user->id}", []);
        $knownDevices[] = $fingerprint;

        // Garder uniquement les 20 derniers devices connus
        Cache::put("known_devices:{$user->id}", array_slice(array_unique($knownDevices), -20), now()->addYear());
    }

    /**
     * Vérifie si la connexion est hors des heures habituelles (23h-5h).
     */
    private function isUnusualHour(User $user): bool
    {
        $hour = now($user->timezone ?? 'UTC')->hour;
        return $hour >= 23 || $hour <= 5;
    }

    /**
     * Vérifie si une IP est en liste noire (cache Redis).
     * La liste noire est maintenue manuellement ou via fail2ban.
     */
    private function isBlacklistedIp(string $ip): bool
    {
        return Cache::has("ip_blacklist:{$ip}");
    }

    /**
     * Envoie une notification par email en cas de nouvelle localisation.
     */
    private function notifyNewLocation(User $user, array $geoInfo, string $ip): void
    {
        try {
            // TODO: Créer un Mailable NewLocationDetected
            // Mail::to($user->email)->send(new NewLocationDetected($user, $geoInfo, $ip));
            Log::info('Notification nouvelle localisation à envoyer', [
                'user_id' => $user->id,
                'country' => $geoInfo['country'] ?? 'XX',
            ]);
        } catch (\Throwable $e) {
            Log::error('Échec envoi notification sécurité', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Vérifie les magic bytes d'un fichier.
     *
     * @param  string   $path               Chemin absolu du fichier
     * @param  string[] $expectedSignatures  Signatures hex attendues
     * @param  int      $offset              Offset en bytes dans le fichier
     */
    private function verifyMagicBytes(string $path, array $expectedSignatures, int $offset): bool
    {
        $handle = fopen($path, 'rb');

        if (! $handle) {
            return false;
        }

        fseek($handle, $offset);
        $bytes  = fread($handle, 8);
        fclose($handle);

        if ($bytes === false) {
            return false;
        }

        $hex = strtoupper(bin2hex($bytes));

        foreach ($expectedSignatures as $signature) {
            if (str_starts_with($hex, strtoupper($signature))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Scan antivirus via ClamAV (socket Unix ou TCP).
     *
     * @return bool|null  true = propre, false = infecté, null = service indisponible
     */
    private function scanWithClamAv(string $path): ?bool
    {
        try {
            $socket = config('security.clamav_socket', '/var/run/clamav/clamd.sock');

            if (str_starts_with($socket, '/')) {
                // Socket Unix
                $conn = stream_socket_client("unix://{$socket}", $errno, $errstr, 5);
            } else {
                // TCP
                [$host, $port] = explode(':', $socket, 2);
                $conn = stream_socket_client("tcp://{$host}:{$port}", $errno, $errstr, 5);
            }

            if (! $conn) {
                Log::warning('ClamAV indisponible', ['socket' => $socket, 'error' => $errstr]);
                return null; // Non bloquant si ClamAV est indisponible
            }

            fwrite($conn, "SCAN {$path}\n");
            $result = fgets($conn, 256);
            fclose($conn);

            return ! str_contains((string) $result, 'FOUND');
        } catch (\Throwable $e) {
            Log::warning('Erreur scan ClamAV', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
