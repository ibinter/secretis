<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * SecurityHeaders — Tous les headers de sécurité HTTP en un seul middleware
 *
 * À enregistrer dans bootstrap/app.php ou Kernel.php dans le groupe 'web' et 'api'.
 *
 * Références :
 *  - OWASP Secure Headers Project
 *  - MDN Web Docs: HTTP security headers
 *  - Mozilla Observatory
 */
class SecurityHeaders
{
    /**
     * CDN autorisés pour SECRETIS (whitelist CSP).
     * Mettre à jour si de nouveaux CDN sont ajoutés.
     */
    private const ALLOWED_SCRIPT_SOURCES = [
        "'self'",
        'cdnjs.cloudflare.com',
    ];

    private const ALLOWED_STYLE_SOURCES = [
        "'self'",
        "'unsafe-inline'",          // Tailwind CSS inline styles (à remplacer par nonce en v2)
        'fonts.googleapis.com',
        'cdnjs.cloudflare.com',
    ];

    private const ALLOWED_FONT_SOURCES = [
        "'self'",
        'fonts.googleapis.com',
        'fonts.gstatic.com',
    ];

    private const ALLOWED_IMG_SOURCES = [
        "'self'",
        'data:',                    // Avatars base64
        'blob:',                    // Fichiers uploadés prévisualisés
    ];

    private const ALLOWED_CONNECT_SOURCES = [
        "'self'",
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Générer un nonce unique par requête et le stocker dans le conteneur IoC
        // pour usage dans les vues Blade : <script nonce="{{ app('csp-nonce') }}">
        $nonce = base64_encode(random_bytes(16));
        app()->instance('csp-nonce', $nonce);

        $response = $next($request);

        // Ne pas ajouter sur les réponses de téléchargement (binary)
        if ($this->isBinaryResponse($response)) {
            return $response;
        }

        $this->addSecurityHeaders($response, $nonce);

        return $response;
    }

    private function addSecurityHeaders(Response $response, string $nonce = ''): void
    {
        // Empêche le clickjacking
        $response->headers->set('X-Frame-Options', 'DENY');

        // Empêche le MIME sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Protection XSS legacy (IE/Edge)
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Contrôle le Referer header envoyé lors des navigations
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Désactive les API sensibles inutilisées
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
        );

        // HSTS — Force HTTPS pendant 1 an, incluant les sous-domaines
        // ATTENTION : Ne pas activer avant d'avoir un certificat SSL valide
        if (config('app.env') === 'production') {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        // Content Security Policy — politique stricte SECRETIS avec nonce
        $response->headers->set('Content-Security-Policy', $this->buildCsp($nonce));

        // Empêche les informations sur le serveur web
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');
    }

    /**
     * Construit la politique CSP pour SECRETIS.
     *
     * Principe du moindre privilège : tout est bloqué par défaut,
     * on whiteliste uniquement ce qui est nécessaire.
     */
    private function buildCsp(string $nonce = ''): string
    {
        $noncePart  = $nonce ? " 'nonce-{$nonce}'" : '';
        $scriptSrc  = implode(' ', self::ALLOWED_SCRIPT_SOURCES) . $noncePart;
        $styleSrc   = implode(' ', self::ALLOWED_STYLE_SOURCES);
        $fontSrc    = implode(' ', self::ALLOWED_FONT_SOURCES);
        $imgSrc     = implode(' ', self::ALLOWED_IMG_SOURCES);
        $connectSrc = implode(' ', self::ALLOWED_CONNECT_SOURCES);

        $directives = [
            "default-src 'none'",
            "script-src {$scriptSrc}",
            "style-src {$styleSrc}",
            "font-src {$fontSrc}",
            "img-src {$imgSrc}",
            "connect-src {$connectSrc}",
            "form-action 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "media-src 'self'",
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            // report-uri à activer avec un endpoint de monitoring CSP
            // "report-uri /api/csp-report",
        ];

        return implode('; ', $directives);
    }

    /**
     * Détermine si la réponse est un fichier binaire (PDF, image, etc.)
     * Sur lequel on ne doit pas ajouter CSP.
     */
    private function isBinaryResponse(Response $response): bool
    {
        $contentType = $response->headers->get('Content-Type', '');

        $binaryTypes = [
            'application/octet-stream',
            'application/pdf',
            'image/',
            'audio/',
            'video/',
        ];

        foreach ($binaryTypes as $type) {
            if (str_starts_with($contentType, $type)) {
                return true;
            }
        }

        return false;
    }
}
