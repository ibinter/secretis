<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SimpleXMLElement;
use ZipArchive;

/**
 * ScormService — Gestion des paquets SCORM et du LRS xAPI léger
 *
 * Prend en charge SCORM 1.2, SCORM 2004 et xAPI (Tin Can).
 */
class ScormService
{
    // ─── Extraction & Validation ──────────────────────────────────────────────

    /**
     * Extrait le ZIP SCORM, parse le manifest et valide la structure.
     *
     * @return array{
     *   version: string,
     *   title: string,
     *   launch_url: string,
     *   manifest_path: string,
     *   package_path: string
     * }
     * @throws \RuntimeException si le paquet est invalide
     */
    public function extractAndValidate(string $zipPath): array
    {
        if (! file_exists($zipPath)) {
            throw new \RuntimeException("Fichier ZIP introuvable : {$zipPath}");
        }

        $zip = new ZipArchive();
        $result = $zip->open($zipPath);
        if ($result !== true) {
            throw new \RuntimeException("Impossible d'ouvrir le ZIP SCORM (code {$result}).");
        }

        // Répertoire d'extraction unique
        $packageDir = 'scorm_packages/' . Str::uuid();
        $extractPath = storage_path("app/public/{$packageDir}");

        if (! mkdir($extractPath, 0755, true) && ! is_dir($extractPath)) {
            throw new \RuntimeException("Impossible de créer le répertoire d'extraction.");
        }

        $zip->extractTo($extractPath);
        $zip->close();

        // Chercher imsmanifest.xml (SCORM 1.2 / 2004)
        $manifestRelPath = 'imsmanifest.xml';
        $manifestFullPath = $extractPath . '/' . $manifestRelPath;

        if (! file_exists($manifestFullPath)) {
            // Chercher tincan.xml (xAPI)
            $tincanPath = $extractPath . '/tincan.xml';
            if (file_exists($tincanPath)) {
                return $this->parseTincanManifest($tincanPath, $packageDir, $extractPath);
            }
            throw new \RuntimeException("Manifest SCORM (imsmanifest.xml) introuvable dans le paquet.");
        }

        return $this->parseScormManifest($manifestFullPath, $manifestRelPath, $packageDir, $extractPath);
    }

    private function parseScormManifest(
        string $manifestPath,
        string $manifestRelPath,
        string $packageDir,
        string $extractPath
    ): array {
        $xml = new SimpleXMLElement(file_get_contents($manifestPath));
        $namespaces = $xml->getNamespaces(true);

        // Détecter la version
        $schemaVersion = '';
        if (isset($xml->metadata->schemaversion)) {
            $schemaVersion = (string) $xml->metadata->schemaversion;
        }

        $version = 'scorm_12';
        if (str_contains($schemaVersion, '2004') || str_contains($schemaVersion, '1.3')) {
            $version = 'scorm_2004';
        }

        // Titre
        $title = 'Formation SCORM';
        if (isset($xml->organizations->organization->title)) {
            $title = (string) $xml->organizations->organization->title;
        }

        // URL de lancement
        $launchUrl = $this->findLaunchUrl($xml, $extractPath);

        return [
            'version'       => $version,
            'title'         => $title,
            'launch_url'    => $launchUrl,
            'manifest_path' => $packageDir . '/' . $manifestRelPath,
            'package_path'  => $packageDir,
        ];
    }

    private function parseTincanManifest(string $tincanPath, string $packageDir, string $extractPath): array
    {
        $xml = new SimpleXMLElement(file_get_contents($tincanPath));
        $title = (string) ($xml->activities->activity->name ?? 'Formation xAPI');
        $launchUrl = (string) ($xml->activities->activity->launch ?? 'index.html');

        return [
            'version'       => 'xapi',
            'title'         => $title,
            'launch_url'    => $launchUrl,
            'manifest_path' => $packageDir . '/tincan.xml',
            'package_path'  => $packageDir,
        ];
    }

    private function findLaunchUrl(SimpleXMLElement $xml, string $extractPath): string
    {
        // Récupère le premier item de l'organisation par défaut
        $defaultOrg = $xml->organizations->attributes()['default'] ?? null;
        $org = null;
        if ($defaultOrg) {
            foreach ($xml->organizations->organization as $o) {
                if ((string) $o->attributes()['identifier'] === (string) $defaultOrg) {
                    $org = $o;
                    break;
                }
            }
        }
        if (! $org && isset($xml->organizations->organization)) {
            $org = $xml->organizations->organization;
        }

        $launchRef = null;
        if ($org && isset($org->item)) {
            $launchRef = (string) $org->item->attributes()['identifierref'];
        }

        // Trouver la ressource correspondante
        if ($launchRef) {
            foreach ($xml->resources->resource as $resource) {
                if ((string) $resource->attributes()['identifier'] === $launchRef) {
                    return (string) $resource->attributes()['href'];
                }
            }
        }

        // Fallback : première ressource SCO
        foreach ($xml->resources->resource as $resource) {
            $type = (string) $resource->attributes()['type'];
            if (str_contains(strtolower($type), 'sco') || str_contains(strtolower($type), 'asset')) {
                return (string) $resource->attributes()['href'];
            }
        }

        return 'index.html';
    }

    // ─── Sessions SCORM ───────────────────────────────────────────────────────

    /**
     * Crée une session SCORM pour un utilisateur.
     */
    public function createScormSession(object $package, User $user): object
    {
        $existingSession = DB::table('training_scorm_sessions')
            ->where('scorm_package_id', $package->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existingSession) {
            DB::table('training_scorm_sessions')
                ->where('id', $existingSession->id)
                ->update(['last_accessed_at' => now()]);

            return DB::table('training_scorm_sessions')->find($existingSession->id);
        }

        $id = DB::table('training_scorm_sessions')->insertGetId([
            'scorm_package_id'  => $package->id,
            'user_id'           => $user->id,
            'organization_id'   => $user->organization_id,
            'session_data'      => json_encode([
                'cmi.core.lesson_status'   => 'not attempted',
                'cmi.core.lesson_location' => '',
                'cmi.suspend_data'         => '',
                'cmi.core.score.raw'       => '',
            ]),
            'completion_status' => 'not attempted',
            'started_at'        => now(),
            'last_accessed_at'  => now(),
        ]);

        return DB::table('training_scorm_sessions')->find($id);
    }

    /**
     * Génère l'URL sécurisée pour lancer le contenu SCORM dans une iframe.
     */
    public function getSecureLaunchUrl(object $package, object $session): string
    {
        $token = Str::random(64);

        // Stocker le token en cache (valide 4h)
        cache()->put("scorm_token_{$token}", [
            'session_id'  => $session->id,
            'package_id'  => $package->id,
            'user_id'     => $session->user_id,
        ], now()->addHours(4));

        return route('training.scorm.serve', [
            'packageId' => $package->id,
            'token'     => $token,
        ]);
    }

    /**
     * Met à jour les données SCORM (cmi.*) dans la session.
     */
    public function updateScormData(object $session, array $data): void
    {
        $sessionData = json_decode($session->session_data ?? '{}', true);
        $sessionData = array_merge($sessionData, $data);

        // Extraire les indicateurs principaux
        $completionStatus = $sessionData['cmi.core.lesson_status']
            ?? $sessionData['cmi.completion_status']
            ?? $session->completion_status;

        $successStatus = $sessionData['cmi.success_status'] ?? $session->success_status;

        $scoreRaw = $sessionData['cmi.core.score.raw']
            ?? $sessionData['cmi.score.raw']
            ?? $session->score_raw;

        $scoreMax = $sessionData['cmi.core.score.max']
            ?? $sessionData['cmi.score.max']
            ?? $session->score_max;

        $totalTime = $sessionData['cmi.core.total_time']
            ?? $sessionData['cmi.total_time']
            ?? $session->total_time;

        DB::table('training_scorm_sessions')
            ->where('id', $session->id)
            ->update([
                'session_data'      => json_encode($sessionData),
                'completion_status' => $completionStatus,
                'success_status'    => $successStatus,
                'score_raw'         => is_numeric($scoreRaw) ? (float) $scoreRaw : null,
                'score_max'         => is_numeric($scoreMax) ? (float) $scoreMax : null,
                'total_time'        => $totalTime,
                'last_accessed_at'  => now(),
            ]);
    }

    /**
     * Retourne les données cmi.* pour initialiser le runtime SCORM.
     */
    public function getScormData(object $session): array
    {
        $data = json_decode($session->session_data ?? '{}', true);

        // Valeurs par défaut SCORM 1.2
        $defaults = [
            'cmi.core.lesson_status'        => 'not attempted',
            'cmi.core.lesson_location'      => '',
            'cmi.suspend_data'              => '',
            'cmi.core.score.raw'            => '',
            'cmi.core.score.max'            => '100',
            'cmi.core.score.min'            => '0',
            'cmi.core.total_time'           => '0000:00:00.00',
            'cmi.core.exit'                 => '',
            'cmi.core.session_time'         => '0000:00:00.00',
            'cmi.launch_data'               => '',
            'cmi.student_preference.audio'  => '0',
            'cmi.student_preference.speed'  => '0',
        ];

        return array_merge($defaults, $data);
    }

    // ─── LRS xAPI ─────────────────────────────────────────────────────────────

    /**
     * Enregistre un statement xAPI dans le LRS interne.
     */
    public function recordXapiStatement(array $statement, Organization $org): void
    {
        try {
            $actor      = $statement['actor'] ?? [];
            $verb       = $statement['verb'] ?? [];
            $object     = $statement['object'] ?? [];
            $result     = $statement['result'] ?? [];
            $context    = $statement['context'] ?? [];

            $actorEmail = $actor['mbox'] ?? '';
            if (str_starts_with($actorEmail, 'mailto:')) {
                $actorEmail = substr($actorEmail, 7);
            }

            DB::table('xapi_statements')->insert([
                'id'                   => $statement['id'] ?? Str::uuid(),
                'organization_id'      => $org->id,
                'actor_email'          => $actorEmail,
                'verb_id'              => $verb['id'] ?? '',
                'verb_display'         => json_encode($verb['display'] ?? []),
                'object_id'            => $object['id'] ?? '',
                'object_name'          => json_encode($object['definition']['name'] ?? []),
                'result_score'         => $result['score']['raw'] ?? null,
                'result_success'       => isset($result['success']) ? (bool) $result['success'] : null,
                'result_completion'    => isset($result['completion']) ? (bool) $result['completion'] : null,
                'context_registration' => $context['registration'] ?? null,
                'stored_at'            => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('xAPI statement recording failed', [
                'error'     => $e->getMessage(),
                'statement' => $statement,
            ]);
        }
    }

    /**
     * Récupère les statements xAPI pour un acteur / organisation.
     */
    public function queryStatements(int $organizationId, array $filters = []): \Illuminate\Support\Collection
    {
        $query = DB::table('xapi_statements')
            ->where('organization_id', $organizationId);

        if (! empty($filters['actor_email'])) {
            $query->where('actor_email', $filters['actor_email']);
        }
        if (! empty($filters['verb_id'])) {
            $query->where('verb_id', $filters['verb_id']);
        }
        if (! empty($filters['since'])) {
            $query->where('stored_at', '>=', $filters['since']);
        }
        if (! empty($filters['until'])) {
            $query->where('stored_at', '<=', $filters['until']);
        }

        return $query->orderByDesc('stored_at')->limit(200)->get();
    }
}
