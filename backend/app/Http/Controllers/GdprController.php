<?php

namespace App\Http\Controllers;

use App\Models\ConsentRecord;
use App\Models\DataSubjectRequest;
use App\Services\GdprService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class GdprController extends Controller
{
    public function __construct(private readonly GdprService $gdprService) {}

    /**
     * GET /gdpr/my-data
     * Exporte les données de l'utilisateur connecté.
     */
    public function exportMyData(Request $request): BinaryFileResponse|JsonResponse
    {
        $user = Auth::user();
        $org  = $user->organization;

        // Créer une demande de portabilité tracée
        $dsRequest = DataSubjectRequest::create([
            'organization_id' => $org->id,
            'type'            => 'portability',
            'subject_email'   => $user->email,
            'subject_name'    => $user->name,
            'status'          => 'processing',
            'requested_at'    => now(),
        ]);

        $export = $this->gdprService->exportUserData($user, $org);

        $dsRequest->update([
            'status'       => 'completed',
            'completed_at' => now(),
            'response_data' => ['items' => array_keys($export['json']['data'])],
        ]);

        return response()->download(
            $export['zip_path'],
            'mes_donnees_secretis_' . now()->format('Ymd') . '.zip',
            ['Content-Type' => 'application/zip']
        )->deleteFileAfterSend(true);
    }

    /**
     * GET /gdpr/my-data/summary
     * Résumé des données stockées (sans téléchargement).
     */
    public function myDataSummary(Request $request): JsonResponse
    {
        $user = Auth::user();
        $org  = $user->organization;

        $summary = [
            'profile'      => true,
            'events'       => \DB::table('events')->where('organization_id', $org->id)->where('created_by', $user->id)->count(),
            'tasks'        => \DB::table('tasks')->where('organization_id', $org->id)->where('assigned_to', $user->id)->count(),
            'documents'    => \DB::table('documents')->where('organization_id', $org->id)->where('created_by', $user->id)->count(),
            'messages'     => \DB::table('messages')->where('organization_id', $org->id)->where(fn($q) => $q->where('sender_id', $user->id)->orWhere('recipient_id', $user->id))->count(),
            'activity_log' => \DB::table('audit_logs')->where('organization_id', $org->id)->where('user_id', $user->id)->count(),
        ];

        return response()->json([
            'data'        => $summary,
            'account_age' => $user->created_at?->diffForHumans(),
        ]);
    }

    /**
     * POST /gdpr/requests
     * Soumettre une demande RGPD.
     */
    public function submitRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'          => 'required|in:access,rectification,erasure,portability,objection',
            'details'       => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();
        $org  = $user->organization;

        // Vérifier les demandes en cours (anti-spam)
        $pending = DataSubjectRequest::where('organization_id', $org->id)
            ->where('subject_email', $user->email)
            ->where('type', $validated['type'])
            ->whereIn('status', ['pending', 'processing'])
            ->exists();

        if ($pending) {
            return response()->json([
                'message' => 'Une demande de ce type est déjà en cours de traitement.',
            ], 422);
        }

        $dsRequest = DataSubjectRequest::create([
            'organization_id' => $org->id,
            'type'            => $validated['type'],
            'subject_email'   => $user->email,
            'subject_name'    => $user->name,
            'status'          => 'pending',
            'requested_at'    => now(),
            'response_data'   => isset($validated['details']) ? ['details' => $validated['details']] : null,
        ]);

        // Accusé de réception
        \Mail::to($user->email)->send(new \App\Mail\Gdpr\RequestReceived($dsRequest));

        return response()->json([
            'message'     => 'Votre demande a été enregistrée. Vous recevrez une réponse sous 30 jours.',
            'request_id'  => $dsRequest->id,
            'deadline'    => now()->addDays(30)->toDateString(),
        ], 201);
    }

    /**
     * GET /gdpr/requests
     * Mes demandes RGPD.
     */
    public function myRequests(Request $request): JsonResponse
    {
        $user = Auth::user();

        $requests = DataSubjectRequest::where('organization_id', $user->organization_id)
            ->where('subject_email', $user->email)
            ->orderByDesc('requested_at')
            ->get(['id', 'type', 'status', 'requested_at', 'completed_at']);

        return response()->json(['data' => $requests]);
    }

    /**
     * GET /gdpr/consent
     * Mes consentements actifs.
     */
    public function myConsents(Request $request): JsonResponse
    {
        $user = Auth::user();

        $consents = ConsentRecord::where('organization_id', $user->organization_id)
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->get(['id', 'consent_type', 'granted_at', 'version']);

        return response()->json(['data' => $consents]);
    }

    /**
     * POST /gdpr/consent
     * Enregistrer les consentements (depuis la bannière cookies).
     */
    public function saveConsent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consents'         => 'required|array',
            'consents.*'       => 'in:essential,analytics,marketing',
            'visitor_id'       => 'nullable|string|max:100',
            'version'          => 'nullable|string|max:20',
        ]);

        $user      = Auth::user();
        $org       = $user ? $user->organization : null;
        $orgId     = $org?->id ?? $request->get('organization_id');
        $version   = $validated['version'] ?? '1.0';
        $proofText = 'Consentement donné le ' . now()->format('d/m/Y H:i') . ' depuis ' . $request->ip();

        $allTypes = ['essential', 'analytics', 'marketing'];
        $granted  = $validated['consents'];

        foreach ($allTypes as $type) {
            $existing = ConsentRecord::where('organization_id', $orgId)
                ->when($user, fn($q) => $q->where('user_id', $user->id))
                ->when(! $user, fn($q) => $q->where('visitor_id', $validated['visitor_id']))
                ->where('consent_type', $type)
                ->latest()
                ->first();

            if (in_array($type, $granted)) {
                if (! $existing || $existing->revoked_at) {
                    ConsentRecord::create([
                        'organization_id' => $orgId,
                        'user_id'         => $user?->id,
                        'visitor_id'      => $user ? null : ($validated['visitor_id'] ?? null),
                        'consent_type'    => $type,
                        'granted_at'      => now(),
                        'ip_address'      => $request->ip(),
                        'proof_text'      => $proofText,
                        'version'         => $version,
                    ]);
                }
            } else {
                // Révoquer si existant
                if ($existing && ! $existing->revoked_at) {
                    $existing->update(['revoked_at' => now()]);
                }
            }
        }

        return response()->json(['message' => 'Préférences enregistrées.']);
    }

    /**
     * POST /gdpr/consent/revoke
     * Révoquer un consentement.
     */
    public function revokeConsent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'consent_type' => 'required|string',
        ]);

        $user = Auth::user();

        $consent = ConsentRecord::where('organization_id', $user->organization_id)
            ->where('user_id', $user->id)
            ->where('consent_type', $validated['consent_type'])
            ->whereNull('revoked_at')
            ->first();

        if (! $consent) {
            return response()->json(['message' => 'Consentement non trouvé ou déjà révoqué.'], 404);
        }

        $consent->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Consentement révoqué avec succès.']);
    }

    /**
     * GET /gdpr/download/{token}
     * Télécharger un export via token signé (48h).
     */
    public function downloadExport(string $token): BinaryFileResponse|JsonResponse
    {
        $hashedToken = hash('sha256', $token);

        $dsRequest = DataSubjectRequest::where('download_token', $hashedToken)
            ->where('token_expires_at', '>', now())
            ->first();

        if (! $dsRequest) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 404);
        }

        $path = $dsRequest->response_data['export_path'] ?? null;

        if (! $path || ! file_exists($path)) {
            return response()->json(['message' => 'Fichier non disponible.'], 404);
        }

        return response()->download($path)->deleteFileAfterSend(false);
    }
}
