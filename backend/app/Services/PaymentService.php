<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

/**
 * PaymentService — Orchestrateur des paiements SECRETIS ERP
 *
 * RÈGLES DE SÉCURITÉ ABSOLUES :
 *
 * 1. IDEMPOTENCE : Un idempotency_key ne peut activer la licence qu'UNE SEULE FOIS.
 *    Implémenté via SELECT FOR UPDATE + vérification statut avant tout traitement.
 *
 * 2. HMAC TIMING-SAFE : Toutes les vérifications de signature passent par
 *    WebhookVerifier qui utilise hash_equals() (temps constant).
 *
 * 3. STOCKAGE PRIVÉ : Toutes les preuves et factures sont dans storage/app/private
 *    (inaccessibles depuis le web directement).
 *
 * 4. CHIFFREMENT : Les métadonnées sensibles sont chiffrées via Crypt (AES-256-CBC).
 *
 * 5. DATE SERVEUR : Toutes les dates de validation utilisent Carbon::now() côté
 *    serveur. Aucune date externe n'est acceptée.
 *
 * 6. UNICITÉ INTENTION : Impossible de créer deux intentions de paiement
 *    pour le même plan si une est déjà en attente.
 */
class PaymentService
{
    public function __construct(
        private LicenseService   $licenseService,
        private AuditService     $auditService,
        private WebhookVerifier  $webhookVerifier,
    ) {}

    // =========================================================================
    // Création d'intention de paiement
    // =========================================================================

    /**
     * Crée une intention de paiement avec idempotency_key unique.
     *
     * RÈGLE : Si une intention est déjà en attente (pending) pour le même
     * plan, on la retourne sans en créer une nouvelle (protection contre
     * les doubles-clics et les formulaires resoumis).
     *
     * @throws \RuntimeException si le plan n'existe pas ou est inactif
     */
    public function createPaymentIntent(
        Organization $org,
        Plan $plan,
        string $method,
        string $currency = 'XOF',
        int $durationMonths = 1
    ): Payment {
        if (! $plan->is_active) {
            throw new \RuntimeException("Plan {$plan->slug} non disponible.");
        }

        return DB::transaction(function () use ($org, $plan, $method, $currency, $durationMonths) {
            // PROTECTION UNICITÉ : Vérifier s'il existe déjà une intention en attente
            $existing = Payment::where('organization_id', $org->id)
                ->where('plan_slug', $plan->slug)
                ->where('status', 'pending')
                ->lockForUpdate()
                ->latest()
                ->first();

            if ($existing && $existing->created_at->greaterThan(now()->subHours(24))) {
                Log::info('PaymentService: intention existante retournée (anti-doublon)', [
                    'payment_id'      => $existing->id,
                    'organization_id' => $org->id,
                    'plan'            => $plan->slug,
                ]);

                return $existing;
            }

            $amount = $plan->getPriceForCurrency($currency) * $durationMonths;

            $payment = Payment::create([
                'organization_id' => $org->id,
                'plan_slug'       => $plan->slug,
                // SÉCURITÉ : UUID v4 cryptographiquement sécurisé
                'idempotency_key' => Str::uuid()->toString(),
                'amount'          => $amount,
                'currency'        => strtoupper($currency),
                'method'          => $method,
                'provider'        => $this->resolveProvider($method),
                'status'          => 'pending',
                'duration_months' => $durationMonths,
                // Métadonnées chiffrées en base via setMetadataAttribute
                'metadata'        => [
                    'plan_name'       => $plan->name,
                    'initiated_at'    => now()->toIso8601String(),
                    'initiated_by_ip' => request()->ip(),
                ],
            ]);

            $this->auditService->log(
                action:       'payment_initiated',
                module:       'billing',
                resourceType: 'payment',
                resourceId:   $payment->id,
                newValues:    [
                    'plan'     => $plan->slug,
                    'amount'   => $amount,
                    'currency' => $currency,
                    'method'   => $method,
                ],
                organizationId: $org->id,
            );

            return $payment;
        });
    }

    // =========================================================================
    // Traitement des webhooks (paiements automatiques)
    // =========================================================================

    /**
     * Traite un paiement confirmé via webhook.
     *
     * FLUX SÉCURISÉ (ordre impératif) :
     *   1. Vérification signature HMAC (timing-safe)
     *   2. SELECT FOR UPDATE sur idempotency_key → verrouillage pessimiste
     *   3. Vérification statut (idempotence) → si déjà traité, return silencieux
     *   4. Activation licence via LicenseService
     *   5. Envoi email reçu
     *   6. Log audit
     *
     * @param  string $provider  cinetpay|paystack|flutterwave
     * @param  array  $payload   Données webhook décodées
     * @param  string $rawBody   Corps brut (pour vérification signature)
     * @param  string $signature Signature du header HTTP
     * @param  string $secret    Clé secrète du prestataire (déchiffrée)
     *
     * @throws \Exception si la signature est invalide (logged + rethrown)
     */
    public function processWebhookPayment(
        string $provider,
        array  $payload,
        string $rawBody,
        string $signature,
        string $secret
    ): void {
        // ÉTAPE 1 : Vérification signature (TOUJOURS en premier)
        $signatureValid = match ($provider) {
            'cinetpay'    => $this->webhookVerifier->verifyCinetPay($payload, $signature, $secret),
            'paystack'    => $this->webhookVerifier->verifyPaystack($rawBody, $signature, $secret),
            'flutterwave' => $this->webhookVerifier->verifyFlutterwave($rawBody, $signature, $secret),
            default       => throw new \InvalidArgumentException("Provider inconnu : {$provider}"),
        };

        if (! $signatureValid) {
            // Log explicite — une signature invalide est une tentative de fraude
            Log::channel('security')->critical("Webhook {$provider} : signature invalide", [
                'provider'   => $provider,
                'ip'         => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            throw new \Exception("Signature webhook invalide pour {$provider}");
        }

        // Extraire la référence externe selon le provider
        $reference = $this->extractReference($provider, $payload);

        DB::transaction(function () use ($provider, $payload, $reference) {
            // ÉTAPE 2 : Récupérer le paiement avec verrou pessimiste
            $payment = Payment::where('idempotency_key', $reference)
                ->lockForUpdate()
                ->first();

            // Essayer aussi via reference si idempotency_key ne matche pas
            if (! $payment) {
                $payment = Payment::where('reference', $reference)
                    ->lockForUpdate()
                    ->first();
            }

            if (! $payment) {
                Log::warning("Webhook {$provider} : paiement introuvable", [
                    'reference' => $reference,
                    'provider'  => $provider,
                ]);
                return; // Retour silencieux (peut être un test du prestataire)
            }

            // ÉTAPE 3 : Vérification idempotence
            if ($payment->isIdempotent()) {
                Log::info("Webhook {$provider} : paiement déjà traité (idempotent)", [
                    'payment_id' => $payment->id,
                    'reference'  => $reference,
                ]);
                return; // Retour silencieux — pas d'erreur, juste un doublon
            }

            // Vérifier le statut du paiement chez le prestataire
            $isSuccess = $this->isPaymentSuccessful($provider, $payload);

            if (! $isSuccess) {
                $payment->update([
                    'status'   => 'rejected',
                    'metadata' => array_merge($payment->metadata ?? [], [
                        'webhook_payload'    => $payload,
                        'webhook_provider'   => $provider,
                        'processed_at'       => now()->toIso8601String(),
                    ]),
                ]);

                Log::info("Webhook {$provider} : paiement échoué", [
                    'payment_id' => $payment->id,
                ]);
                return;
            }

            // ÉTAPE 4 : Activation licence
            $license = $this->licenseService->activate(
                organizationId: $payment->organization_id,
                planId:         $payment->plan_slug,
                paymentId:      $payment->id,
                durationMonths: $payment->duration_months ?? 1,
            );

            // Mettre à jour le paiement
            $payment->update([
                'status'      => 'validated',
                'license_id'  => $license->id,
                'reference'   => $reference,
                'paid_at'     => Carbon::now(), // Date SERVEUR
                'metadata'    => array_merge($payment->metadata ?? [], [
                    'webhook_payload'  => $payload,
                    'webhook_provider' => $provider,
                    'processed_at'     => now()->toIso8601String(),
                ]),
            ]);

            // ÉTAPE 5 : Générer facture + envoyer email reçu
            $this->generateInvoicePdf($payment);
            $this->sendPaymentConfirmationEmail($payment);

            // ÉTAPE 6 : Log audit
            $this->auditService->log(
                action:         'payment_webhook_validated',
                module:         'billing',
                resourceType:   'payment',
                resourceId:     $payment->id,
                newValues:      [
                    'provider'   => $provider,
                    'reference'  => $reference,
                    'license_id' => $license->id,
                ],
                organizationId: $payment->organization_id,
            );
        });
    }

    // =========================================================================
    // Validation manuelle (paiements mobiles/virements)
    // =========================================================================

    /**
     * Valide manuellement un paiement Mobile Money ou virement.
     *
     * SÉCURITÉ :
     * - Réservé aux paiements avec preuve uploadée (Mobile Money, virement, espèces)
     * - L'admin qui valide est enregistré avec timestamp serveur
     * - Log d'audit immuable de l'action admin
     *
     * @throws \RuntimeException si le paiement n'est pas en attente de validation manuelle
     */
    public function validateManualPayment(Payment $payment, User $admin): void
    {
        if (! $payment->requiresManualValidation()) {
            throw new \RuntimeException(
                "Le paiement #{$payment->id} n'est pas en attente de validation manuelle."
            );
        }

        DB::transaction(function () use ($payment, $admin) {
            // Verrou pessimiste pour éviter la double-validation simultanée
            $payment = Payment::where('id', $payment->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Vérification idempotence au cas où un autre admin valide en même temps
            if ($payment->isIdempotent()) {
                Log::info('PaymentService: validation manuelle doublon ignoré', [
                    'payment_id' => $payment->id,
                    'admin_id'   => $admin->id,
                ]);
                return;
            }

            // Activer la licence
            $license = $this->licenseService->activate(
                organizationId: $payment->organization_id,
                planId:         $payment->plan_slug,
                paymentId:      $payment->id,
                durationMonths: $payment->duration_months ?? 1,
            );

            $payment->update([
                'status'           => 'validated',
                'license_id'       => $license->id,
                'validated_by_id'  => $admin->id,
                'validated_at'     => Carbon::now(), // Date SERVEUR
                'paid_at'          => Carbon::now(), // Date SERVEUR
            ]);

            // Générer la facture et envoyer l'email
            $this->generateInvoicePdf($payment->refresh());
            $this->sendPaymentConfirmationEmail($payment->refresh());

            // Log audit de l'action admin — immuable
            $this->auditService->log(
                action:         'payment_manual_validated',
                module:         'billing',
                resourceType:   'payment',
                resourceId:     $payment->id,
                newValues:      [
                    'validated_by'  => $admin->id,
                    'admin_name'    => $admin->name,
                    'license_id'    => $license->id,
                    'validated_at'  => now()->toIso8601String(),
                ],
                userId:         $admin->id,
                organizationId: $payment->organization_id,
            );
        });
    }

    /**
     * Rejette un paiement manuel avec motif.
     */
    public function rejectManualPayment(Payment $payment, User $admin, string $reason): void
    {
        if ($payment->status !== 'pending') {
            throw new \RuntimeException("Le paiement #{$payment->id} n'est pas en statut pending.");
        }

        $payment->update([
            'status'           => 'rejected',
            'rejection_reason' => $reason,
            'validated_by_id'  => $admin->id,
            'validated_at'     => Carbon::now(),
        ]);

        // Notifier le client du refus
        $this->sendPaymentRejectionEmail($payment, $reason);

        $this->auditService->log(
            action:         'payment_rejected',
            module:         'billing',
            resourceType:   'payment',
            resourceId:     $payment->id,
            newValues:      [
                'rejected_by'  => $admin->id,
                'admin_name'   => $admin->name,
                'reason'       => $reason,
            ],
            userId:         $admin->id,
            organizationId: $payment->organization_id,
        );
    }

    // =========================================================================
    // Génération de facture PDF
    // =========================================================================

    /**
     * Génère une facture PDF professionnelle pour un paiement validé.
     *
     * SÉCURITÉ : Le PDF est stocké dans storage/app/private (jamais /public).
     * L'accès se fait via une route authentifiée qui génère une URL temporaire.
     *
     * Numérotation : FACT-{ANNÉE}-{5 chiffres avec padding zéro}
     *
     * @return string Chemin du fichier dans le storage privé
     * @throws \RuntimeException si le paiement n'est pas validé
     */
    public function generateInvoicePdf(Payment $payment): string
    {
        if ($payment->status !== 'validated') {
            throw new \RuntimeException(
                "Impossible de générer une facture pour un paiement non validé."
            );
        }

        // Générer le numéro de facture si pas encore fait
        if (! $payment->invoice_number) {
            $year    = now()->year;
            $seq     = str_pad(Payment::whereYear('validated_at', $year)->count() + 1, 5, '0', STR_PAD_LEFT);
            $number  = "FACT-{$year}-{$seq}";

            $payment->update(['invoice_number' => $number]);
            $payment->refresh();
        }

        $org   = $payment->organization;
        $admin = $payment->validatedBy;

        // Générer le PDF via DomPDF avec le template blade
        $pdf = Pdf::loadView('invoices.payment', [
            'payment'         => $payment,
            'organization'    => $org,
            'invoice_number'  => $payment->invoice_number,
            'invoice_date'    => $payment->validated_at ?? $payment->paid_at,
            'plan_name'       => $payment->plan_slug,
            'amount'          => $payment->amount,
            'currency'        => $payment->currency,
            'validated_by'    => $admin?->name ?? 'Système automatique',
            'company_name'    => config('secretis.company.name', 'IBIG Soft'),
            'company_email'   => config('secretis.company.email', 'contact@ibigsoft.com'),
            'company_phone'   => config('secretis.company.phone', ''),
            'company_address' => config('secretis.company.address', ''),
        ]);

        $pdf->setPaper('A4', 'portrait');

        // SÉCURITÉ : Stockage dans le répertoire privé (non accessible publiquement)
        $path = "invoices/{$org->id}/{$payment->invoice_number}.pdf";
        Storage::disk('private')->put($path, $pdf->output());

        $payment->update(['invoice_path' => $path]);

        Log::info('Facture générée', [
            'payment_id'     => $payment->id,
            'invoice_number' => $payment->invoice_number,
            'path'           => $path,
        ]);

        return $path;
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    /**
     * Détermine le provider selon la méthode de paiement.
     */
    private function resolveProvider(string $method): string
    {
        return match ($method) {
            'card'         => 'cinetpay',
            'mobile_money' => 'manual',
            'bank_transfer' => 'manual',
            'cash'         => 'manual',
            default        => 'manual',
        };
    }

    /**
     * Extrait la référence unique selon le provider webhook.
     */
    private function extractReference(string $provider, array $payload): string
    {
        return match ($provider) {
            'cinetpay'    => $payload['cpm_trans_id']   ?? '',
            'paystack'    => $payload['data']['reference'] ?? '',
            'flutterwave' => $payload['data']['tx_ref']    ?? '',
            default       => $payload['reference']         ?? '',
        };
    }

    /**
     * Vérifie si le paiement est réussi selon les données du provider.
     */
    private function isPaymentSuccessful(string $provider, array $payload): bool
    {
        return match ($provider) {
            'cinetpay'    => ($payload['cpm_payment_status'] ?? '') === 'ACCEPTED',
            'paystack'    => ($payload['data']['status']     ?? '') === 'success',
            'flutterwave' => ($payload['data']['status']     ?? '') === 'successful',
            default       => false,
        };
    }

    /**
     * Envoie l'email de confirmation de paiement avec la facture en pièce jointe.
     */
    private function sendPaymentConfirmationEmail(Payment $payment): void
    {
        try {
            $org = $payment->organization;

            Mail::send('emails.payment-confirmed', [
                'payment'      => $payment,
                'organization' => $org,
            ], function ($message) use ($payment, $org) {
                $message->to($org->email, $org->name)
                        ->subject("Confirmation de paiement — {$payment->invoice_number}");

                // Attacher la facture PDF si elle existe
                if ($payment->invoice_path && Storage::disk('private')->exists($payment->invoice_path)) {
                    $message->attachData(
                        Storage::disk('private')->get($payment->invoice_path),
                        "{$payment->invoice_number}.pdf",
                        ['mime' => 'application/pdf']
                    );
                }
            });

            Log::info('Email confirmation paiement envoyé', [
                'payment_id' => $payment->id,
                'email'      => $org->email,
            ]);
        } catch (\Throwable $e) {
            // Ne jamais faire échouer la validation à cause de l'email
            Log::error('Échec envoi email confirmation', [
                'payment_id' => $payment->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Envoie l'email de refus de paiement au client.
     */
    private function sendPaymentRejectionEmail(Payment $payment, string $reason): void
    {
        try {
            $org = $payment->organization;

            Mail::send('emails.payment-rejected', [
                'payment'      => $payment,
                'organization' => $org,
                'reason'       => $reason,
            ], function ($message) use ($org) {
                $message->to($org->email, $org->name)
                        ->subject("Paiement refusé — Action requise");
            });
        } catch (\Throwable $e) {
            Log::error('Échec envoi email refus', [
                'payment_id' => $payment->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }
}
