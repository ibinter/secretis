<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\User;
use App\Models\Voucher;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * VoucherService — Gestion des codes prépayés
 *
 * SÉCURITÉ :
 * - Rédemption avec SELECT FOR UPDATE pour éviter les races conditions
 * - Vérification expiration et utilisation côté serveur
 * - Génération cryptographiquement sécurisée des codes
 * - Activation licence immédiate via PaymentService
 */
class VoucherService
{
    public function __construct(
        private PaymentService $paymentService,
        private AuditService   $auditService,
    ) {}

    // =========================================================================
    // Génération de vouchers
    // =========================================================================

    /**
     * Génère un lot de vouchers.
     *
     * @param string       $batchName  Nom du lot (pour export CSV)
     * @param int          $quantity   Nombre de vouchers à générer
     * @param float        $value      Valeur en devise
     * @param string       $currency   Code devise (XOF, EUR, USD)
     * @param Carbon|null  $expiresAt  Date d'expiration (null = pas d'expiration)
     * @param User         $creator    Utilisateur créateur (superadmin)
     */
    public function generateBatch(
        string  $batchName,
        int     $quantity,
        float   $value,
        string  $currency,
        ?Carbon $expiresAt,
        User    $creator,
    ): Collection {
        if ($quantity < 1 || $quantity > 10000) {
            throw new \InvalidArgumentException('Quantité invalide (1-10 000).');
        }

        if ($value <= 0) {
            throw new \InvalidArgumentException('La valeur du voucher doit être positive.');
        }

        $vouchers = [];

        for ($i = 0; $i < $quantity; $i++) {
            $code = $this->generateCode();
            $vouchers[] = [
                'code'       => $code,
                'value'      => $value,
                'currency'   => strtoupper($currency),
                'batch_name' => $batchName,
                'created_by' => $creator->id,
                'expires_at' => $expiresAt?->toDateTimeString(),
                'created_at' => now()->toDateTimeString(),
                'updated_at' => now()->toDateTimeString(),
            ];
        }

        // Insertion en masse (plus efficace)
        Voucher::insert($vouchers);

        $this->auditService->log(
            action:       'voucher_batch_created',
            module:       'billing',
            resourceType: 'voucher_batch',
            resourceId:   null,
            newValues:    [
                'batch_name' => $batchName,
                'quantity'   => $quantity,
                'value'      => $value,
                'currency'   => $currency,
            ],
            userId: $creator->id,
        );

        return Voucher::where('batch_name', $batchName)
                      ->where('created_by', $creator->id)
                      ->latest()
                      ->take($quantity)
                      ->get();
    }

    // =========================================================================
    // Rédemption
    // =========================================================================

    /**
     * Rachète un voucher et active la licence.
     *
     * SÉCURITÉ : SELECT FOR UPDATE pour éviter la rédemption concurrente du même code.
     *
     * @throws ValidationException si le code est invalide, expiré ou insuffisant
     */
    public function redeem(string $code, Order $order, User $user): Voucher
    {
        $code = strtoupper(trim($code));

        return DB::transaction(function () use ($code, $order, $user) {
            // SELECT FOR UPDATE — verrouillage pessimiste
            $voucher = Voucher::where('code', $code)
                              ->lockForUpdate()
                              ->first();

            if (! $voucher) {
                throw ValidationException::withMessages([
                    'code' => 'Code voucher invalide.',
                ]);
            }

            if (! $voucher->isValid()) {
                throw ValidationException::withMessages([
                    'code' => $voucher->is_used
                        ? 'Ce code voucher a déjà été utilisé.'
                        : 'Ce code voucher est expiré.',
                ]);
            }

            // Vérifier que le montant est suffisant
            $required = $order->getNetAmount();
            if (! $voucher->coversAmount($required, $order->currency)) {
                throw ValidationException::withMessages([
                    'code' => sprintf(
                        'Ce voucher (%.0f %s) ne couvre pas le montant de la commande (%.0f %s).',
                        $voucher->value,
                        $voucher->currency,
                        $required,
                        $order->currency,
                    ),
                ]);
            }

            // Marquer le voucher comme utilisé
            $voucher->update([
                'is_used'     => true,
                'used_at'     => Carbon::now(),
                'used_by_org' => $order->organization_id,
            ]);

            // Activer la licence immédiatement
            $order->update(['status' => 'processing']);
            $this->paymentService->activateLicense($order);

            $this->auditService->log(
                action:         'voucher_redeemed',
                module:         'billing',
                resourceType:   'voucher',
                resourceId:     $voucher->id,
                newValues:      [
                    'voucher_code' => $code,
                    'order_id'     => $order->id,
                    'value'        => $voucher->value,
                ],
                userId:         $user->id,
                organizationId: $order->organization_id,
            );

            return $voucher;
        });
    }

    // =========================================================================
    // Export CSV
    // =========================================================================

    /**
     * Exporte les vouchers d'un lot en CSV.
     * Réservé aux superadmins IBIG Soft.
     */
    public function exportBatchCsv(string $batchName): StreamedResponse
    {
        $vouchers = Voucher::where('batch_name', $batchName)
                           ->orderBy('created_at')
                           ->get();

        $filename = "vouchers_{$batchName}_" . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($vouchers) {
            $fp = fopen('php://output', 'w');

            // En-têtes CSV
            fputcsv($fp, [
                'Code',
                'Valeur',
                'Devise',
                'Utilisé',
                'Utilisé le',
                'Utilisé par (org ID)',
                'Expire le',
                'Créé le',
            ]);

            foreach ($vouchers as $v) {
                fputcsv($fp, [
                    $v->code,
                    $v->value,
                    $v->currency,
                    $v->is_used ? 'Oui' : 'Non',
                    $v->used_at?->format('d/m/Y H:i') ?? '',
                    $v->used_by_org ?? '',
                    $v->expires_at?->format('d/m/Y') ?? 'Aucune',
                    $v->created_at->format('d/m/Y H:i'),
                ]);
            }

            fclose($fp);
        }, $filename, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Génère un code voucher cryptographiquement sécurisé.
     * Format : XXXX-XXXX-XXXX-XXXX (16 chars hex, 4 groupes)
     */
    private function generateCode(): string
    {
        do {
            $raw  = bin2hex(random_bytes(8)); // 16 chars hex
            $code = strtoupper(implode('-', str_split($raw, 4))); // XXXX-XXXX-XXXX-XXXX
        } while (Voucher::where('code', $code)->exists()); // unicité garantie

        return $code;
    }
}
