<?php

namespace App\Services;

use App\Models\Document;
use App\Models\SignatureRequest;
use App\Models\SignatureRequestSigner;
use App\Models\DocumentSignature;
use App\Models\SignatureAuditTrail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;

/**
 * SignatureService — Moteur de signature électronique SECRETIS
 *
 * Conforme à la loi n°2013-546 sur les transactions électroniques.
 * Chaque opération est consignée dans une piste d'audit immuable.
 */
class SignatureService
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    // =========================================================================
    // CRÉATION D'UNE DEMANDE DE SIGNATURE
    // =========================================================================

    /**
     * Crée une demande de signature pour un document.
     *
     * @param  array $data  {
     *   document_id, title, message, signing_order (parallel|sequential),
     *   expires_at, signers: [{name, email, order, user_id?}]
     * }
     * @param  int   $orgId
     * @return SignatureRequest
     */
    public function createSignatureRequest(array $data, int $orgId): SignatureRequest
    {
        return DB::transaction(function () use ($data, $orgId) {
            $document = Document::where('organization_id', $orgId)
                ->findOrFail($data['document_id']);

            // Hash SHA-256 du document original pour vérification d'intégrité
            $originalHash = $this->hashDocument($document->file_path);

            /** @var SignatureRequest $request */
            $request = SignatureRequest::create([
                'organization_id' => $orgId,
                'document_id'     => $document->id,
                'title'           => $data['title'],
                'message'         => $data['message'] ?? null,
                'status'          => 'pending',
                'signing_order'   => $data['signing_order'] ?? 'parallel',
                'expires_at'      => isset($data['expires_at'])
                    ? Carbon::parse($data['expires_at'])
                    : now()->addDays(30),
                'created_by'      => auth()->id(),
            ]);

            // Créer les signataires avec un token unique chacun
            $signers = collect($data['signers'])->sortBy('order');
            foreach ($signers as $signerData) {
                SignatureRequestSigner::create([
                    'request_id' => $request->id,
                    'user_id'    => $signerData['user_id'] ?? null,
                    'name'       => $signerData['name'],
                    'email'      => $signerData['email'],
                    'order'      => $signerData['order'] ?? 1,
                    'status'     => 'pending',
                    'token'      => Str::uuid()->toString(),
                ]);
            }

            // Stocker le hash dans les données du certificat (audit)
            $this->logAuditEvent($request, 'created', auth()->user()?->email, [
                'document_hash' => $originalHash,
                'signers_count' => count($data['signers']),
                'signing_order' => $data['signing_order'] ?? 'parallel',
            ]);

            // Envoyer les invitations
            $this->sendInvitations($request);

            return $request->load('signers');
        });
    }

    // =========================================================================
    // TRAITEMENT D'UNE SIGNATURE
    // =========================================================================

    /**
     * Enregistre la signature d'un signataire.
     *
     * @param  string $token         Token unique du signataire
     * @param  array  $signatureData {
     *   paths: SVG path strings,
     *   image_base64: PNG base64,
     *   legal_accepted: bool
     * }
     */
    public function processSignature(string $token, array $signatureData): void
    {
        DB::transaction(function () use ($token, $signatureData) {
            /** @var SignatureRequestSigner $signer */
            $signer = SignatureRequestSigner::where('token', $token)
                ->where('status', 'pending')
                ->with('request')
                ->firstOrFail();

            $request = $signer->request;

            // Vérifications de validité
            if ($request->status === 'cancelled') {
                throw new \RuntimeException('Cette demande de signature a été annulée.');
            }
            if ($request->expires_at && now()->isAfter($request->expires_at)) {
                $request->update(['status' => 'expired']);
                throw new \RuntimeException('Ce lien de signature a expiré.');
            }
            if (!($signatureData['legal_accepted'] ?? false)) {
                throw new \RuntimeException('Vous devez accepter les conditions légales.');
            }

            // Pour signature séquentielle : vérifier que c'est bien le tour de ce signataire
            if ($request->signing_order === 'sequential') {
                $pendingBefore = SignatureRequestSigner::where('request_id', $request->id)
                    ->where('order', '<', $signer->order)
                    ->where('status', 'pending')
                    ->exists();
                if ($pendingBefore) {
                    throw new \RuntimeException('Ce n\'est pas encore votre tour de signer.');
                }
            }

            // Sauvegarder l'image PNG de la signature
            $signatureImagePath = null;
            if (!empty($signatureData['image_base64'])) {
                $signatureImagePath = $this->saveSignatureImage(
                    $signatureData['image_base64'],
                    $request->id,
                    $signer->id
                );
            }

            // Hash du contenu de la signature
            $signatureHash = hash('sha256', json_encode($signatureData['paths'] ?? []));

            $ip = request()->ip();

            // Enregistrer la signature
            DocumentSignature::create([
                'request_id'           => $request->id,
                'signer_id'            => $signer->id,
                'document_id'          => $request->document_id,
                'signature_data'       => [
                    'paths' => $signatureData['paths'] ?? [],
                    'hash'  => $signatureHash,
                ],
                'signature_image_path' => $signatureImagePath,
                'certificate_data'     => [
                    'signer_name'  => $signer->name,
                    'signer_email' => $signer->email,
                    'signed_at'    => now()->toIso8601String(),
                    'ip_address'   => $ip,
                    'user_agent'   => request()->userAgent(),
                ],
                'signed_at'  => now(),
                'ip_address' => $ip,
            ]);

            // Mettre à jour le statut du signataire
            $signer->update([
                'status'     => 'signed',
                'signed_at'  => now(),
                'ip_address' => $ip,
                'user_agent' => request()->userAgent(),
            ]);

            $this->logAuditEvent($request, 'signed', $signer->email, [
                'signer_name'    => $signer->name,
                'ip_address'     => $ip,
                'signature_hash' => $signatureHash,
            ]);

            // Appliquer la signature au PDF
            $this->applySignatureToPdf($request, $signer, $signatureImagePath);

            // Vérifier si tous ont signé
            $allSigned = !SignatureRequestSigner::where('request_id', $request->id)
                ->where('status', 'pending')
                ->exists();

            if ($allSigned) {
                $request->update([
                    'status'       => 'completed',
                    'completed_at' => now(),
                ]);
                $this->logAuditEvent($request, 'completed', null, [
                    'completed_at' => now()->toIso8601String(),
                ]);
                $this->notifyCompletion($request);
            } else {
                $request->update(['status' => 'partially_signed']);

                // Pour signature séquentielle : notifier le prochain signataire
                if ($request->signing_order === 'sequential') {
                    $nextSigner = SignatureRequestSigner::where('request_id', $request->id)
                        ->where('status', 'pending')
                        ->orderBy('order')
                        ->first();
                    if ($nextSigner) {
                        $this->sendSigningInvitation($request, $nextSigner);
                    }
                }
            }
        });
    }

    // =========================================================================
    // REFUS DE SIGNATURE
    // =========================================================================

    public function declineSignature(string $token, string $reason): void
    {
        DB::transaction(function () use ($token, $reason) {
            $signer = SignatureRequestSigner::where('token', $token)
                ->where('status', 'pending')
                ->with('request')
                ->firstOrFail();

            $signer->update([
                'status'         => 'declined',
                'decline_reason' => $reason,
                'ip_address'     => request()->ip(),
            ]);

            $request = $signer->request;
            $request->update(['status' => 'cancelled']);

            $this->logAuditEvent($request, 'declined', $signer->email, [
                'reason'     => $reason,
                'ip_address' => request()->ip(),
            ]);

            // Notifier le créateur de la demande
            $creator = User::find($request->created_by);
            if ($creator) {
                $this->notificationService->send(
                    $creator,
                    'signature_declined',
                    'Signature refusée',
                    "{$signer->name} a refusé de signer « {$request->title} ». Motif : {$reason}",
                    ['request_id' => $request->id]
                );
            }
        });
    }

    // =========================================================================
    // ANNULATION
    // =========================================================================

    public function cancelRequest(SignatureRequest $request): void
    {
        $request->update(['status' => 'cancelled']);
        $this->logAuditEvent($request, 'cancelled', auth()->user()?->email, [
            'cancelled_by' => auth()->user()?->name,
        ]);
    }

    // =========================================================================
    // RAPPELS
    // =========================================================================

    public function sendReminder(SignatureRequest $request): void
    {
        $pendingSigners = $request->signers()->where('status', 'pending')->get();

        foreach ($pendingSigners as $signer) {
            $this->sendSigningInvitation($request, $signer, isReminder: true);
        }

        $this->logAuditEvent($request, 'reminder_sent', auth()->user()?->email, [
            'signers_reminded' => $pendingSigners->pluck('email')->toArray(),
        ]);
    }

    // =========================================================================
    // GÉNÉRATION DU CERTIFICAT PDF
    // =========================================================================

    /**
     * Génère le certificat de signature au format PDF.
     * Retourne le chemin du fichier PDF généré.
     */
    public function generateCertificate(SignatureRequest $request): string
    {
        $request->load(['signers', 'document', 'auditTrail']);

        $auditTrail = $request->auditTrail()->orderBy('created_at')->get();

        $data = [
            'request'     => $request,
            'auditTrail'  => $auditTrail,
            'generatedAt' => now(),
            'documentHash' => $this->hashDocument($request->document->file_path),
        ];

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('signatures.certificate', $data);
        $pdf->setPaper('A4', 'portrait');

        $filename = "certificate_signature_{$request->id}_" . now()->format('Ymd_His') . '.pdf';
        $path = "signatures/certificates/{$filename}";

        Storage::disk('local')->put($path, $pdf->output());

        return $path;
    }

    // =========================================================================
    // VÉRIFICATION D'INTÉGRITÉ
    // =========================================================================

    public function verifyDocumentIntegrity(string $documentPath, string $originalHash): bool
    {
        if (!Storage::disk('local')->exists($documentPath)) {
            return false;
        }
        $currentHash = $this->hashDocument($documentPath);
        return hash_equals($originalHash, $currentHash);
    }

    // =========================================================================
    // MÉTHODES PRIVÉES — UTILITAIRES
    // =========================================================================

    private function hashDocument(string $filePath): string
    {
        $content = Storage::disk('local')->get($filePath);
        return hash('sha256', $content ?? '');
    }

    private function saveSignatureImage(string $base64Png, int $requestId, int $signerId): string
    {
        // Décoder le base64 (retirer le préfixe data:image/png;base64,)
        $base64 = preg_replace('/^data:image\/\w+;base64,/', '', $base64Png);
        $imageData = base64_decode($base64);

        $filename = "signatures/{$requestId}/{$signerId}_" . Str::random(8) . '.png';
        Storage::disk('local')->put($filename, $imageData);

        return $filename;
    }

    private function applySignatureToPdf(
        SignatureRequest $request,
        SignatureRequestSigner $signer,
        ?string $signatureImagePath
    ): void {
        try {
            // Nécessite setasign/fpdi + tecnickcom/tcpdf ou barryvdh/laravel-dompdf
            // On vérifie si FPDI est disponible
            if (!class_exists('\setasign\Fpdi\Fpdi') || !$signatureImagePath) {
                Log::info("FPDI non disponible ou pas d'image de signature - PDF non modifié", [
                    'request_id' => $request->id,
                ]);
                return;
            }

            $document  = $request->document;
            $inputPath = Storage::disk('local')->path($document->file_path);

            // Chemin de sortie avec signature appliquée
            $outputPath = Storage::disk('local')->path(
                "signatures/signed/{$request->id}_{$signer->id}_signed.pdf"
            );

            Storage::disk('local')->makeDirectory("signatures/signed");

            $fpdi = new \setasign\Fpdi\Fpdi();
            $pageCount = $fpdi->setSourceFile($inputPath);

            for ($i = 1; $i <= $pageCount; $i++) {
                $tplId = $fpdi->importPage($i);
                $size  = $fpdi->getTemplateSize($tplId);
                $fpdi->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $fpdi->useTemplate($tplId);

                // Appliquer la signature sur la dernière page
                if ($i === $pageCount && $signatureImagePath) {
                    $imgPath = Storage::disk('local')->path($signatureImagePath);
                    $fpdi->Image($imgPath, 10, $size['height'] - 40, 50, 20);

                    $fpdi->SetFont('Helvetica', '', 7);
                    $fpdi->SetTextColor(100, 100, 100);
                    $fpdi->SetXY(65, $size['height'] - 38);
                    $fpdi->Write(4, "Signé par : {$signer->name} <{$signer->email}>");
                    $fpdi->SetXY(65, $size['height'] - 33);
                    $fpdi->Write(4, "Le : " . now()->format('d/m/Y H:i:s'));
                    $fpdi->SetXY(65, $size['height'] - 28);
                    $fpdi->Write(4, "IP : " . request()->ip());
                }
            }

            $fpdi->Output($outputPath, 'F');

            Log::info("Signature appliquée au PDF", [
                'request_id' => $request->id,
                'signer_id'  => $signer->id,
                'output'     => $outputPath,
            ]);
        } catch (\Throwable $e) {
            Log::error("Erreur application signature PDF", [
                'request_id' => $request->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    private function sendInvitations(SignatureRequest $request): void
    {
        $signers = $request->signers()->orderBy('order')->get();

        if ($request->signing_order === 'sequential') {
            // Envoyer uniquement au premier signataire
            $this->sendSigningInvitation($request, $signers->first());
        } else {
            // Envoyer à tous simultanément
            foreach ($signers as $signer) {
                $this->sendSigningInvitation($request, $signer);
            }
        }
    }

    private function sendSigningInvitation(
        SignatureRequest $request,
        SignatureRequestSigner $signer,
        bool $isReminder = false
    ): void {
        try {
            $signUrl = route('signatures.sign', ['token' => $signer->token]);
            $subject = $isReminder
                ? "[Rappel] Signature requise : {$request->title}"
                : "Signature requise : {$request->title}";

            Mail::send(
                'emails.signature_invitation',
                compact('request', 'signer', 'signUrl', 'isReminder'),
                function ($mail) use ($signer, $subject) {
                    $mail->to($signer->email, $signer->name)
                         ->subject($subject);
                }
            );

            $this->logAuditEvent(
                $request,
                $isReminder ? 'reminder_sent' : 'sent',
                $signer->email,
                ['sign_url' => $signUrl]
            );
        } catch (\Throwable $e) {
            Log::error("Erreur envoi invitation signature", [
                'signer_id' => $signer->id,
                'error'     => $e->getMessage(),
            ]);
        }
    }

    private function notifyCompletion(SignatureRequest $request): void
    {
        $creator = User::find($request->created_by);
        if ($creator) {
            $this->notificationService->send(
                $creator,
                'signature_completed',
                'Signature complétée',
                "Le document « {$request->title} » a été signé par tous les signataires.",
                ['request_id' => $request->id]
            );
        }
    }

    private function logAuditEvent(
        SignatureRequest $request,
        string $eventType,
        ?string $actorEmail,
        array $data = []
    ): void {
        try {
            SignatureAuditTrail::create([
                'request_id'  => $request->id,
                'event_type'  => $eventType,
                'actor_email' => $actorEmail,
                'actor_ip'    => request()->ip(),
                'data'        => $data,
            ]);
        } catch (\Throwable $e) {
            Log::error("Erreur audit trail signature", ['error' => $e->getMessage()]);
        }
    }
}
