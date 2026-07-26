<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\OnPremiseLicenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Contrôleur de gestion des licences On-Premise
 * Accessible uniquement aux SuperAdmins (middleware: auth, role:super-admin)
 */
class LicenseController extends Controller
{
    public function __construct(
        private readonly OnPremiseLicenseService $licenseService
    ) {}

    // -------------------------------------------------------------------------

    /**
     * GET /admin/license
     * Affiche les informations de la licence actuelle.
     */
    public function show(): JsonResponse
    {
        $info = $this->licenseService->getLicenseInfo();

        return response()->json([
            'data' => $this->formatLicenseResponse($info),
        ]);
    }

    // -------------------------------------------------------------------------

    /**
     * POST /admin/license/activate
     * Active ou renouvelle une clé de licence On-Premise.
     *
     * Body : { "license_key": "XXXX-XXXX-..." }
     */
    public function activate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'license_key' => ['required', 'string', 'min:10'],
        ]);

        $licenseKey = trim($validated['license_key']);

        try {
            // Invalider le cache avant de valider la nouvelle clé
            $this->licenseService->clearCache();

            $result = $this->licenseService->validateLicense($licenseKey);

            if (! $result['valid']) {
                return response()->json([
                    'message' => 'Clé de licence invalide',
                    'error'   => $result['error'],
                ], 422);
            }

            // Persister la clé dans le fichier .env
            $this->persistLicenseKey($licenseKey);

            Log::info('License activated', [
                'organization' => $result['organization'],
                'valid_until'  => $result['valid_until'],
                'by_user'      => auth()->id(),
            ]);

            return response()->json([
                'message' => 'Licence activée avec succès',
                'data'    => $this->formatLicenseResponse($result),
            ]);
        } catch (\Throwable $e) {
            Log::error('License activation error', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Erreur lors de l\'activation',
                'error'   => 'Une erreur interne est survenue',
            ], 500);
        }
    }

    // -------------------------------------------------------------------------

    /**
     * GET /admin/license/check
     * Vérifie l'état de la licence en temps réel (ignore le cache).
     */
    public function check(): JsonResponse
    {
        // Forcer une revalidation
        $this->licenseService->clearCache();

        $info = $this->licenseService->getLicenseInfo();

        return response()->json([
            'status'  => $info['valid'] ? 'valid' : 'invalid',
            'data'    => $this->formatLicenseResponse($info),
            'checked_at' => now()->toISOString(),
        ]);
    }

    // -------------------------------------------------------------------------

    /**
     * GET /admin/license/activation-request
     * Génère une demande d'activation pour les environnements air-gap.
     */
    public function activationRequest(): JsonResponse
    {
        $token = $this->licenseService->generateActivationRequest();

        return response()->json([
            'activation_request' => $token,
            'instructions'       => [
                '1. Copiez le token ci-dessus',
                '2. Envoyez-le à license@ibigsoft.com avec votre bon de commande',
                '3. Vous recevrez votre clé de licence par email sous 24h',
                '4. Activez-la via POST /admin/license/activate',
            ],
            'contact' => 'license@ibigsoft.com',
            'portal'  => 'https://ibigsoft.com/licenses',
        ]);
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    private function formatLicenseResponse(array $info): array
    {
        if (! $info['valid']) {
            return [
                'valid'       => false,
                'configured'  => $info['configured'] ?? false,
                'error'       => $info['error'] ?? 'Licence invalide',
            ];
        }

        return [
            'valid'             => true,
            'configured'        => true,
            'organization'      => $info['organization'],
            'license_type'      => $info['license_type'] ?? 'on-premise',
            'max_users'         => $info['max_users'],
            'active_users'      => $info['active_users'] ?? 0,
            'user_usage_pct'    => $info['max_users'] > 0
                ? round(($info['active_users'] ?? 0) / $info['max_users'] * 100, 1)
                : 0,
            'features'          => $info['features'],
            'valid_until'       => $info['valid_until'],
            'valid_until_human' => $info['valid_until_human'],
            'issued_at'         => $info['issued_at'],
            'validated_at'      => $info['validated_at'],
            'in_grace_period'   => $info['in_grace_period'] ?? false,
            'expiring_soon'     => $info['expiring_soon'] ?? false,
            'warning'           => $info['warning'] ?? null,
            'renewal_url'       => 'https://ibigsoft.com/licenses/renew',
        ];
    }

    private function persistLicenseKey(string $key): void
    {
        $envPath = base_path('.env');

        if (! file_exists($envPath)) {
            return;
        }

        $content = file_get_contents($envPath);

        if (str_contains($content, 'SECRETIS_LICENSE_KEY=')) {
            $content = preg_replace(
                '/^SECRETIS_LICENSE_KEY=.*/m',
                "SECRETIS_LICENSE_KEY=$key",
                $content
            );
        } else {
            $content .= "\nSECRETIS_LICENSE_KEY=$key\n";
        }

        file_put_contents($envPath, $content);

        // Recharger la config
        \Artisan::call('config:cache');
    }
}
