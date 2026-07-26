<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\User;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * ManualPaymentService — Gestion des paiements manuels
 * (Mobile Money, virement, espèces, chèque, crypto)
 *
 * RÈGLES DE SÉCURITÉ :
 * 1. Fichiers stockés UNIQUEMENT dans storage/app/private (jamais /public)
 * 2. MIME validé côté serveur (whitelist stricte : image/jpeg, image/png, image/gif, application/pdf)
 * 3. Fichiers exécutables refusés (.php, .exe, .js, .html, etc.)
 * 4. SHA-256 du fichier = détection des doublons absolus
 * 5. Nom de fichier généré par le système (jamais le nom original)
 * 6. Approbation réservée au rôle superadmin_ibig
 * 7. Chaque approbation/rejet journalisé dans audit_logs
 */
class ManualPaymentService
{
    /**
     * Types MIME autorisés pour les preuves de paiement.
     * TOUT autre type est rejeté — y compris les fichiers exécutables déguisés.
     */
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];

    /**
     * Extensions interdites (exécutables déguisés en image).
     */
    private const FORBIDDEN_EXTENSIONS = [
        'php', 'phtml', 'php3', 'php4', 'php5', 'phar',
        'exe', 'sh', 'bat', 'cmd', 'com',
        'js', 'ts', 'jsx', 'tsx',
        'html', 'htm', 'xhtml',
        'py', 'rb', 'pl', 'go',
        'asp', 'aspx', 'cfm',
        'svg',  // SVG peut contenir du JS
    ];

    public function __construct(
        private PaymentService $paymentService,
        private AuditService   $auditService,
    ) {}

    // =========================================================================
    // Soumission de preuve
    // =========================================================================

    /**
     * Soumet une preuve de paiement pour une commande.
     *
     * @throws ValidationException si le fichier est invalide ou dupliqué
     */
    public function submitProof(
        Order        $order,
        User         $user,
        UploadedFile $file,
        string       $transactionRef = null,
        string       $notes = null,
    ): PaymentProof {
        // SÉCURITÉ 1 : Vérifier que la commande appartient à l'utilisateur
        if ($order->organization_id !== $user->organization_id) {
            throw new \RuntimeException('Accès non autorisé à cette commande.');
        }

        // SÉCURITÉ 2 : Valider le MIME type (côté serveur, pas le mime déclaré)
        $detectedMime = $this->detectMimeType($file);
        if (! in_array($detectedMime, self::ALLOWED_MIMES, true)) {
            throw ValidationException::withMessages([
                'file' => "Type de fichier non autorisé : {$detectedMime}. Formats acceptés : JPEG, PNG, GIF, PDF.",
            ]);
        }

        // SÉCURITÉ 3 : Refuser les extensions d'exécutables
        $extension = strtolower($file->getClientOriginalExtension());
        if (in_array($extension, self::FORBIDDEN_EXTENSIONS, true)) {
            Log::channel('security')->warning('Tentative d\'upload de fichier exécutable', [
                'order_id'   => $order->id,
                'user_id'    => $user->id,
                'extension'  => $extension,
                'mime'       => $detectedMime,
                'ip'         => request()->ip(),
            ]);
            throw ValidationException::withMessages([
                'file' => "Ce type de fichier n'est pas autorisé.",
            ]);
        }

        // SÉCURITÉ 4 : Calculer SHA-256 du fichier (détection des doublons)
        $fileHash = hash_file('sha256', $file->getRealPath());

        // SÉCURITÉ 5 : Vérifier les doublons par hash
        if (PaymentProof::where('file_hash', $fileHash)->exists()) {
            throw ValidationException::withMessages([
                'file' => 'Ce fichier a déjà été soumis comme preuve de paiement.',
            ]);
        }

        // SÉCURITÉ 6 : Nom de fichier généré côté serveur (jamais le nom original)
        $safeExtension = match ($detectedMime) {
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/gif'  => 'gif',
            'image/webp' => 'webp',
            default      => 'pdf',
        };
        $storedFilename = "proof_{$fileHash}.{$safeExtension}";

        // SÉCURITÉ 7 : Stockage dans storage/app/private (JAMAIS /public)
        $storagePath = "payment-proofs/{$order->organization_id}/{$storedFilename}";
        Storage::disk('private')->put(
            $storagePath,
            file_get_contents($file->getRealPath())
        );

        return DB::transaction(function () use (
            $order, $user, $file, $storagePath, $fileHash,
            $detectedMime, $transactionRef, $notes
        ) {
            $proof = PaymentProof::create([
                'order_id'              => $order->id,
                'user_id'              => $user->id,
                'file_path'            => $storagePath,
                'file_hash'            => $fileHash,
                'original_filename'    => $file->getClientOriginalName(),
                'mime_type'            => $detectedMime,
                'file_size'            => $file->getSize(),
                'transaction_reference' => $transactionRef,
                'notes'                => $notes,
                'status'               => 'pending',
            ]);

            // Mettre à jour le statut de la commande
            $order->update(['status' => 'proof_submitted']);

            // Notifier l'équipe IBIG Soft
            $this->notifyAdminNewProof($order, $proof);

            $this->auditService->log(
                action:         'payment_proof_submitted',
                module:         'billing',
                resourceType:   'payment_proof',
                resourceId:     $proof->id,
                newValues:      [
                    'order_id'  => $order->id,
                    'mime_type' => $detectedMime,
                    'file_hash' => substr($fileHash, 0, 16) . '...', // hash partiel pour audit
                ],
                userId:         $user->id,
                organizationId: $order->organization_id,
            );

            return $proof;
        });
    }

    // =========================================================================
    // Approbation
    // =========================================================================

    /**
     * Approuve une preuve de paiement et active la licence.
     * RÉSERVÉ AU RÔLE superadmin_ibig.
     */
    public function approveProof(PaymentProof $proof, User $admin): void
    {
        DB::transaction(function () use ($proof, $admin) {
            // Verrou pessimiste
            $proof = PaymentProof::where('id', $proof->id)->lockForUpdate()->firstOrFail();

            if ($proof->status !== 'pending') {
                throw new \RuntimeException(
                    "Cette preuve est déjà {$proof->status}."
                );
            }

            $order = $proof->order;

            // Marquer la preuve comme approuvée
            $proof->update([
                'status'      => 'approved',
                'reviewed_by' => $admin->id,
                'reviewed_at' => Carbon::now(),
            ]);

            // Marquer la commande en cours de traitement
            $order->update(['status' => 'processing']);

            // Activer la licence via PaymentService
            $this->paymentService->activateLicense($order);

            $this->auditService->log(
                action:         'payment_proof_approved',
                module:         'billing',
                resourceType:   'payment_proof',
                resourceId:     $proof->id,
                newValues:      [
                    'order_id'     => $order->id,
                    'approved_by'  => $admin->id,
                    'admin_name'   => $admin->name,
                    'approved_at'  => Carbon::now()->toIso8601String(),
                ],
                userId:         $admin->id,
                organizationId: $order->organization_id,
            );
        });

        Log::info('Preuve de paiement approuvée', [
            'proof_id' => $proof->id,
            'admin_id' => $admin->id,
            'order_id' => $proof->order_id,
        ]);
    }

    // =========================================================================
    // Rejet
    // =========================================================================

    /**
     * Rejette une preuve de paiement avec motif.
     * RÉSERVÉ AU RÔLE superadmin_ibig.
     */
    public function rejectProof(PaymentProof $proof, User $admin, string $reason): void
    {
        DB::transaction(function () use ($proof, $admin, $reason) {
            $proof = PaymentProof::where('id', $proof->id)->lockForUpdate()->firstOrFail();

            if ($proof->status !== 'pending') {
                throw new \RuntimeException("Cette preuve est déjà {$proof->status}.");
            }

            $order = $proof->order;

            $proof->update([
                'status'           => 'rejected',
                'reviewed_by'      => $admin->id,
                'reviewed_at'      => Carbon::now(),
                'rejection_reason' => $reason,
            ]);

            // Remettre la commande en "pending" pour qu'elle puisse resoumettre
            $order->update(['status' => 'pending']);

            // Notifier le client avec le motif
            $this->notifyClientRejection($order, $reason);

            $this->auditService->log(
                action:         'payment_proof_rejected',
                module:         'billing',
                resourceType:   'payment_proof',
                resourceId:     $proof->id,
                newValues:      [
                    'order_id'    => $order->id,
                    'rejected_by' => $admin->id,
                    'admin_name'  => $admin->name,
                    'reason'      => $reason,
                ],
                userId:         $admin->id,
                organizationId: $order->organization_id,
            );
        });
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    /**
     * Détecte le MIME type réel du fichier (côté serveur, pas le header déclaré).
     * Utilise fileinfo pour éviter les fichiers malveillants avec un faux Content-Type.
     */
    private function detectMimeType(UploadedFile $file): string
    {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime  = finfo_file($finfo, $file->getRealPath());
        finfo_close($finfo);
        return $mime;
    }

    private function notifyAdminNewProof(Order $order, PaymentProof $proof): void
    {
        try {
            \Illuminate\Support\Facades\Notification::route('mail', config('payment.admin_notification_email'))
                ->notify(new \App\Notifications\NewPaymentProofSubmitted($order, $proof));
        } catch (\Throwable $e) {
            Log::error('Notification preuve non envoyée', [
                'proof_id' => $proof->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    private function notifyClientRejection(Order $order, string $reason): void
    {
        try {
            $org = $order->organization;
            \Illuminate\Support\Facades\Mail::to($org->email, $org->name)
                ->send(new \App\Mail\PaymentProofRejected($order, $reason));
        } catch (\Throwable $e) {
            Log::error('Email rejet preuve non envoyé', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }
}
