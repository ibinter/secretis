<?php

namespace App\Services;

use App\Models\User;
use App\Models\Organization;
use App\Models\DataSubjectRequest;
use App\Models\DataRetentionPolicy;
use App\Models\ConsentRecord;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;
use Carbon\Carbon;

class GdprService
{
    /**
     * Exporte TOUTES les données personnelles d'un utilisateur (Article 20 RGPD).
     * Délai légal : 30 jours.
     */
    public function exportUserData(User $user, Organization $org): array
    {
        $data = [
            'export_date'   => now()->toIso8601String(),
            'regulation'    => 'RGPD – Règlement (UE) 2016/679',
            'organization'  => $org->name,
            'subject'       => [
                'name'       => $user->name,
                'email'      => $user->email,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'data' => [],
        ];

        // --- Profil utilisateur ---
        $data['data']['profile'] = [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'phone'      => $user->phone,
            'avatar'     => $user->avatar_path,
            'role'       => $user->role,
            'department' => $user->department?->name,
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];

        // --- Événements agenda ---
        $events = DB::table('events')
            ->where('organization_id', $org->id)
            ->where('created_by', $user->id)
            ->select(['id', 'title', 'description', 'start_at', 'end_at', 'location', 'created_at'])
            ->get();
        $data['data']['events'] = $events->toArray();

        // --- Tâches / projets ---
        $tasks = DB::table('tasks')
            ->where('organization_id', $org->id)
            ->where('assigned_to', $user->id)
            ->select(['id', 'title', 'description', 'status', 'due_date', 'created_at'])
            ->get();
        $data['data']['tasks'] = $tasks->toArray();

        // --- Courriers ---
        $mails = DB::table('mail_registry')
            ->where('organization_id', $org->id)
            ->where(function ($q) use ($user) {
                // Colonnes réelles de mail_registry : registered_by (pas created_by),
                // sender_name / recipient_name (pas sender / recipient).
                $q->where('registered_by', $user->id)->orWhere('assigned_to', $user->id);
            })
            ->select(['id', 'reference', 'subject', 'sender_name', 'recipient_name', 'type', 'status', 'received_at', 'created_at'])
            ->get();
        $data['data']['mail_registry'] = $mails->toArray();

        // --- Documents GED ---
        $documents = DB::table('documents')
            ->where('organization_id', $org->id)
            ->where('created_by', $user->id)
            // Colonnes réelles de `documents` : title / mime_type / file_size / file_path.
            ->select(['id', 'title', 'mime_type', 'file_size', 'file_path', 'created_at'])
            ->get();
        $data['data']['documents'] = $documents->toArray();

        // --- Messages internes ---
        // Colonnes réelles de `messages` : conversation_id, user_id, body, type, read_at.
        // (Pas de organization_id / subject / sender_id / recipient_id / sent_at :
        // le cloisonnement se fait par la conversation.)
        $messages = DB::table('messages')
            ->join('conversations', 'conversations.id', '=', 'messages.conversation_id')
            ->where('conversations.organization_id', $org->id)
            ->where('messages.user_id', $user->id)
            ->select([
                'messages.id',
                'messages.conversation_id',
                'messages.body',
                'messages.type',
                'messages.read_at',
                'messages.created_at',
            ])
            ->orderByDesc('messages.created_at')
            ->limit(1000)
            ->get();
        $data['data']['messages'] = $messages->toArray();

        // --- Activités (audit) ---
        // Colonnes réelles : resource_type / resource_id (pas model_type / model_id).
        $activities = DB::table('audit_logs')
            ->where('organization_id', $org->id)
            ->where('user_id', $user->id)
            ->select(['id', 'action', 'module', 'resource_type', 'resource_id', 'ip_address', 'created_at'])
            ->orderBy('created_at', 'desc')
            ->limit(500)
            ->get();
        $data['data']['activity_log'] = $activities->toArray();

        // --- Consentements ---
        $consents = ConsentRecord::where('organization_id', $org->id)
            ->where('user_id', $user->id)
            ->get(['consent_type', 'granted_at', 'revoked_at', 'version']);
        $data['data']['consents'] = $consents->toArray();

        // --- Visites portail ---
        // Colonnes réelles de `visitor_logs` : host_id, checked_in_at/checked_out_at
        // (pas email / host_name / check_in_at). On rattache les visites dont
        // l'utilisateur était l'hôte.
        $visits = DB::table('visitor_logs')
            ->where('organization_id', $org->id)
            ->where('host_id', $user->id)
            ->select(['id', 'visitor_id', 'purpose', 'badge_number', 'checked_in_at', 'checked_out_at'])
            ->get();
        $data['data']['visits'] = $visits->toArray();

        // Créer le ZIP
        $zipPath = $this->buildExportZip($user, $org, $data, $documents);

        return [
            'json'     => $data,
            'zip_path' => $zipPath,
        ];
    }

    /**
     * Construit le fichier ZIP de l'export.
     */
    private function buildExportZip(User $user, Organization $org, array $data, $documents): string
    {
        $filename = 'gdpr_export_' . Str::slug($user->name) . '_' . now()->format('Ymd_His') . '.zip';
        $tmpPath  = storage_path('app/private/gdpr_exports/' . $filename);

        @mkdir(dirname($tmpPath), 0755, true);

        $zip = new ZipArchive();
        $zip->open($tmpPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // Données JSON
        $zip->addFromString('mes_donnees.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // Résumé lisible
        $zip->addFromString('LISEZ_MOI.txt', $this->buildReadmeText($user, $org));

        // Fichiers attachés (documents)
        foreach ($documents as $doc) {
            // La requête ci-dessus sélectionne `file_path` (colonne réelle de
            // `documents`) : `$doc->path` était toujours nul, aucune pièce
            // jointe n'était donc jamais ajoutée à l'archive.
            $filePath = storage_path('app/' . ($doc->file_path ?? ''));
            if (file_exists($filePath)) {
                $zip->addFile($filePath, 'documents/' . basename($filePath));
            }
        }

        $zip->close();

        return $tmpPath;
    }

    private function buildReadmeText(User $user, Organization $org): string
    {
        return "EXPORT DE VOS DONNÉES PERSONNELLES\n"
            . "=====================================\n\n"
            . "Conformément au Règlement (UE) 2016/679 (RGPD), Article 20\n\n"
            . "Titulaire : {$user->name} ({$user->email})\n"
            . "Organisation : {$org->name}\n"
            . "Date d'export : " . now()->format('d/m/Y H:i') . "\n\n"
            . "Ce fichier contient :\n"
            . "- mes_donnees.json : toutes vos données au format structuré\n"
            . "- documents/ : vos fichiers personnels\n\n"
            . "Pour toute question : dpo@ibig.ci";
    }

    /**
     * Anonymise les données personnelles d'un utilisateur (Article 17 RGPD).
     * Conserve les données agrégées pour les statistiques.
     */
    public function anonymizeUser(User $user, Organization $org): void
    {
        $originalEmail = $user->email;
        $anonymizedId  = 'anon_' . $user->id . '_' . Str::random(8);

        DB::transaction(function () use ($user, $org, $originalEmail, $anonymizedId) {
            // Anonymiser le profil
            $user->update([
                'name'         => 'Utilisateur anonymisé',
                'email'        => $anonymizedId . '@anonyme.invalid',
                'phone'        => null,
                'avatar_path'  => null,
                'password'     => bcrypt(Str::random(32)),
                'remember_token' => null,
            ]);

            // Anonymiser les messages de l'intéressé.
            // `messages` n'a NI `organization_id`, NI `sender_id`, NI `subject` :
            // ses colonnes réelles sont `conversation_id`, `user_id`, `body`.
            // Le cloisonnement par organisation passe donc par `conversations`.
            DB::table('messages')
                ->where('user_id', $user->id)
                ->whereIn('conversation_id', function ($q) use ($org) {
                    $q->select('id')->from('conversations')->where('organization_id', $org->id);
                })
                ->update(['body' => '[Message anonymisé]']);

            // Supprimer les tokens de session
            DB::table('personal_access_tokens')
                ->where('tokenable_id', $user->id)
                ->where('tokenable_type', User::class)
                ->delete();

            // Audit log irréversible
            DB::table('audit_logs')->insert([
                'organization_id' => $org->id,
                'user_id'         => null,
                'action'          => 'gdpr.anonymization',
                // `module` est NOT NULL : l'insert échouait sans lui.
                'module'          => 'rgpd',
                // Colonnes réelles : resource_type / resource_id.
                'resource_type'   => 'users',
                'resource_id'     => (string) $user->id,
                'old_values'      => json_encode(['email' => $originalEmail]),
                'new_values'      => json_encode(['status' => 'anonymized', 'anonymized_at' => now()->toIso8601String()]),
                'ip_address'      => request()->ip(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        });

        Log::channel('gdpr')->info('User anonymized', [
            'user_id' => $user->id,
            'org_id'  => $org->id,
        ]);
    }

    /**
     * Supprime les données personnelles (Article 17 RGPD – droit à l'effacement).
     * Conserve les données comptables (obligation légale 10 ans).
     */
    public function deleteUserData(User $user, Organization $org): void
    {
        DB::transaction(function () use ($user, $org) {
            // Supprimer les consentements
            ConsentRecord::where('user_id', $user->id)->delete();

            // Supprimer les messages écrits par l'intéressé.
            // Mêmes colonnes fantômes que ci-dessus : on passe par
            // `conversations` pour rester dans son organisation.
            DB::table('messages')
                ->where('user_id', $user->id)
                ->whereIn('conversation_id', function ($q) use ($org) {
                    $q->select('id')->from('conversations')->where('organization_id', $org->id);
                })
                ->delete();

            // Supprimer les événements créés (sauf récurrents partagés)
            DB::table('events')
                ->where('organization_id', $org->id)
                ->where('created_by', $user->id)
                // La colonne réelle est `parent_event_id`.
                ->whereNull('parent_event_id')
                ->delete();

            // Supprimer les documents personnels non-partagés
            // `documents` n'a ni colonne `is_shared` ni table `document_shares` :
            // la portée se lit dans `access_level`, et le partage externe dans
            // `document_share_tokens` / `portal_shared_documents`. Un document
            // diffusé n'est pas une donnée purement personnelle — on ne
            // supprime que ceux qui sont restés privés et non partagés.
            $privateDocs = DB::table('documents')
                ->where('organization_id', $org->id)
                ->where('created_by', $user->id)
                ->where(function ($q) {
                    $q->where('access_level', 'private')->orWhereNull('access_level');
                })
                ->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))
                      ->from('document_share_tokens')
                      ->whereColumn('document_share_tokens.document_id', 'documents.id');
                })
                ->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))
                      ->from('portal_shared_documents')
                      ->whereColumn('portal_shared_documents.document_id', 'documents.id');
                })
                ->get();

            foreach ($privateDocs as $doc) {
                // La colonne est `file_path`, pas `path` : sans cela, aucun
                // fichier n'était réellement effacé du disque — le document
                // disparaissait de la base mais restait sur le serveur.
                if (! empty($doc->file_path)) {
                    Storage::delete($doc->file_path);
                }
                DB::table('document_versions')->where('document_id', $doc->id)->delete();
            }
            DB::table('documents')
                ->whereIn('id', collect($privateDocs)->pluck('id'))
                ->delete();

            // Pseudonymiser les audit_logs (conserver sans identification)
            DB::table('audit_logs')
                ->where('organization_id', $org->id)
                ->where('user_id', $user->id)
                ->update([
                    'user_id'    => null,
                    'ip_address' => '0.0.0.0',
                    'old_values' => null,
                    'new_values' => json_encode(['pseudonymized' => true]),
                ]);

            // NOTE : on NE supprime PAS les données comptables (factures, paiements)
            // conformément aux articles L.123-22 et suivants du Code de commerce (10 ans)

            // Audit de l'effacement lui-même
            DB::table('audit_logs')->insert([
                'organization_id' => $org->id,
                'user_id'         => null,
                'action'          => 'gdpr.erasure',
                'module'          => 'rgpd',
                // Colonnes réelles : resource_type / resource_id.
                'resource_type'   => 'users',
                'resource_id'     => (string) $user->id,
                'old_values'      => null,
                'new_values'      => json_encode(['erased_at' => now()->toIso8601String()]),
                'ip_address'      => request()->ip(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        });

        Log::channel('gdpr')->info('User data deleted', [
            'user_id' => $user->id,
            'org_id'  => $org->id,
        ]);
    }

    /**
     * Applique les politiques de rétention (CRON mensuel).
     */
    public function processRetentionPolicies(): array
    {
        $policies = DataRetentionPolicy::where('auto_delete', true)->get();
        $report   = [];

        foreach ($policies as $policy) {
            $cutoff = now()->subDays($policy->retention_days);
            $deleted = 0;

            try {
                $deleted = $this->applyRetentionForType(
                    $policy->organization_id,
                    $policy->data_type,
                    $cutoff
                );

                $policy->update([
                    'last_run_at'          => now(),
                    'last_deleted_count'   => $deleted,
                ]);

                $report[] = [
                    'policy'  => $policy->data_type,
                    'org_id'  => $policy->organization_id,
                    'deleted' => $deleted,
                    'cutoff'  => $cutoff->toDateString(),
                    'status'  => 'success',
                ];

                Log::channel('gdpr')->info('Retention applied', [
                    'type'    => $policy->data_type,
                    'org_id'  => $policy->organization_id,
                    'deleted' => $deleted,
                ]);
            } catch (\Throwable $e) {
                $report[] = [
                    'policy' => $policy->data_type,
                    'org_id' => $policy->organization_id,
                    'status' => 'error',
                    'error'  => $e->getMessage(),
                ];

                Log::channel('gdpr')->error('Retention error', [
                    'type'  => $policy->data_type,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $report;
    }

    private function applyRetentionForType(int $orgId, string $dataType, Carbon $cutoff): int
    {
        return match ($dataType) {
            'audit_logs' => DB::table('audit_logs')
                ->where('organization_id', $orgId)
                ->where('created_at', '<', $cutoff)
                ->where('action', 'not like', 'gdpr.%') // jamais supprimer les logs RGPD
                ->delete(),

            'messages' => DB::table('messages')
                ->where('organization_id', $orgId)
                ->where('sent_at', '<', $cutoff)
                ->delete(),

            'visitor_logs' => DB::table('visitor_logs')
                ->where('organization_id', $orgId)
                ->where('check_in_at', '<', $cutoff)
                ->delete(),

            'consent_records' => DB::table('consent_records')
                ->where('organization_id', $orgId)
                ->whereNotNull('revoked_at')
                ->where('revoked_at', '<', $cutoff)
                ->delete(),

            'notifications' => DB::table('notifications')
                ->where('notifiable_type', User::class)
                ->where('created_at', '<', $cutoff)
                ->delete(),

            default => 0,
        };
    }

    /**
     * Génère le registre des traitements (Article 30 RGPD).
     */
    public function generateDataInventory(Organization $org): array
    {
        $records = DB::table('data_processing_records')
            // Colonnes qualifiées : `users` possède aussi organization_id (sinon « ambiguous »).
            ->where('data_processing_records.organization_id', $org->id)
            ->where('data_processing_records.is_active', true)
            ->join('users', 'data_processing_records.created_by', '=', 'users.id')
            ->select([
                'data_processing_records.*',
                'users.name as created_by_name',
            ])
            ->get();

        return [
            'organization'       => $org->name,
            'generated_at'       => now()->toIso8601String(),
            'regulation'         => 'Article 30 du Règlement (UE) 2016/679',
            'processing_records' => $records->map(function ($r) {
                return [
                    'id'                    => $r->id,
                    'name'                  => $r->name,
                    'purpose'               => $r->purpose,
                    'legal_basis'           => $r->legal_basis,
                    'data_categories'       => json_decode($r->data_categories, true),
                    'data_subjects'         => json_decode($r->data_subjects, true),
                    'retention_period_days' => $r->retention_period_days,
                    'third_parties'         => json_decode($r->third_parties, true),
                    'created_by'            => $r->created_by_name,
                    'created_at'            => $r->created_at,
                ];
            })->toArray(),
        ];
    }

    /**
     * Dispatch et traite une demande de personne concernée.
     */
    public function handleDataSubjectRequest(DataSubjectRequest $request): void
    {
        $org  = Organization::findOrFail($request->organization_id);
        $user = User::where('email', $request->subject_email)
            ->where('organization_id', $org->id)
            ->first();

        $request->update(['status' => 'processing']);

        try {
            match ($request->type) {
                'access', 'portability' => $this->handleAccessRequest($request, $user, $org),
                'erasure'               => $this->handleErasureRequest($request, $user, $org),
                'rectification'         => $this->handleRectificationRequest($request, $user, $org),
                'objection'             => $this->handleObjectionRequest($request, $user, $org),
            };

            $request->update([
                'status'       => 'completed',
                'completed_at' => now(),
            ]);

            Mail::to($request->subject_email)
                ->send(new \App\Mail\Gdpr\RequestCompleted($request));
        } catch (\Throwable $e) {
            $request->update(['status' => 'pending']);
            Log::channel('gdpr')->error('Request handling failed', [
                'request_id' => $request->id,
                'error'      => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function handleAccessRequest(DataSubjectRequest $request, ?User $user, Organization $org): void
    {
        if (! $user) {
            $request->update([
                'response_data'   => ['message' => 'Aucun compte trouvé pour cet email.'],
                'status'          => 'completed',
                'completed_at'    => now(),
            ]);
            return;
        }

        $export = $this->exportUserData($user, $org);

        $token   = Str::random(64);
        $expires = now()->addHours(48);

        $request->update([
            'response_data'    => ['export_path' => $export['zip_path'], 'items_count' => count($export['json']['data'])],
            'download_token'   => hash('sha256', $token),
            'token_expires_at' => $expires,
        ]);

        Mail::to($request->subject_email)
            ->send(new \App\Mail\Gdpr\DataExportReady($request, $token));
    }

    private function handleErasureRequest(DataSubjectRequest $request, ?User $user, Organization $org): void
    {
        if ($user) {
            $this->deleteUserData($user, $org);
        }

        $request->update([
            'response_data' => ['message' => 'Données personnelles supprimées le ' . now()->toDateString()],
        ]);
    }

    private function handleRectificationRequest(DataSubjectRequest $request, ?User $user, Organization $org): void
    {
        // La rectification nécessite une intervention humaine (DPO)
        $request->update([
            'status'        => 'pending',
            'response_data' => ['message' => 'Demande transmise au DPO pour traitement manuel.'],
        ]);
    }

    private function handleObjectionRequest(DataSubjectRequest $request, ?User $user, Organization $org): void
    {
        if ($user) {
            // Révoquer tous les consentements non-essentiels
            ConsentRecord::where('user_id', $user->id)
                ->where('consent_type', '!=', 'essential')
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);
        }

        $request->update([
            'response_data' => ['message' => 'Opposition enregistrée. Traitements non-essentiels arrêtés.'],
        ]);
    }
}
