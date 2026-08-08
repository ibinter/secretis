<?php

namespace App\Services;

use App\Models\JournalEntry;
use App\Models\SupplierInvoice;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Pont achats → comptabilité. Symétrique du pont sur les ventes.
 *
 * Écriture d'achat en SYSCOHADA :
 *
 *     605  Achats et charges externes   débit   HT
 *     4451 TVA déductible               débit   TVA
 *         401  Fournisseurs                   crédit   TTC
 *
 * Écriture de règlement :
 *
 *     401  Fournisseurs                 débit   montant payé
 *         521  Banque                         crédit   montant payé
 *
 * Sans ces écritures, la TVA déductible reste à zéro et la déclaration ne
 * retient que la TVA collectée : l'entreprise paie une taxe qu'elle a déjà
 * supportée sur ses achats.
 */
class PurchaseAccountingService
{
    public function __construct(private SyscohadaService $syscohada) {}

    /**
     * Comptabilise une facture fournisseur.
     *
     * Idempotent : une facture déjà passée n'est pas repassée. Une double
     * écriture gonflerait les charges ET la TVA récupérable — le sens inverse
     * du risque sur les ventes, mais tout aussi contrôlable.
     */
    public function comptabiliserFacture(SupplierInvoice $facture, User $auteur): JournalEntry
    {
        if ($facture->status === 'draft') {
            throw new \RuntimeException(
                "La facture {$facture->invoice_number} est un brouillon : "
                . "seule une facture reçue et vérifiée se comptabilise."
            );
        }

        if ($facture->status === 'cancelled') {
            throw new \RuntimeException("La facture {$facture->invoice_number} est annulée.");
        }

        if ($existante = $this->ecritureDe($facture)) {
            throw new \RuntimeException(
                "La facture {$facture->invoice_number} est déjà comptabilisée "
                . "(écriture {$existante->entry_number}). La repasser gonflerait "
                . "les charges et la TVA récupérable."
            );
        }

        $orgId = $facture->organization_id;
        $ht    = round((float) $facture->subtotal, 2);
        $tva   = round((float) $facture->tax_amount, 2);
        $ttc   = round((float) $facture->total, 2);

        if ($ttc <= 0) {
            throw new \RuntimeException("La facture {$facture->invoice_number} est d'un montant nul.");
        }

        // Contrôle de cohérence AVANT d'écrire : une facture dont le TTC ne
        // correspond pas à HT + TVA révèle une erreur de saisie. La passer en
        // l'état produirait une écriture équilibrée mais fausse.
        if (abs(($ht + $tva) - $ttc) > 0.01) {
            throw new \RuntimeException(sprintf(
                "Facture %s incohérente : HT %s + TVA %s ≠ TTC %s. Corrigez la saisie.",
                $facture->invoice_number,
                number_format($ht, 2, ',', ' '),
                number_format($tva, 2, ',', ' '),
                number_format($ttc, 2, ',', ' ')
            ));
        }

        // Le compte de charge dépend de la nature de l'achat : loyer, fourniture,
        // maintenance… Celui saisi sur la facture prime sur le défaut.
        $compteCharge = $facture->expense_account ?: $this->compte($orgId, 'purchases');
        $this->assertCompteExiste($orgId, $compteCharge);

        $lignes = [
            [
                'account_number' => $compteCharge,
                'debit_amount'   => $ht,
                'credit_amount'  => 0,
                'description'    => $facture->notes ?: 'Achat — ' . ($facture->supplier->company_name ?? 'fournisseur'),
            ],
        ];

        if ($tva > 0) {
            $lignes[] = [
                'account_number' => $this->compte($orgId, 'vat_deductible'),
                'debit_amount'   => $tva,
                'credit_amount'  => 0,
                'description'    => 'TVA déductible ' . rtrim(rtrim(number_format((float) $facture->tax_rate, 2, ',', ''), '0'), ',') . ' %',
            ];
        }

        $lignes[] = [
            'account_number' => $this->compte($orgId, 'suppliers'),
            'debit_amount'   => 0,
            'credit_amount'  => $ttc,
            'description'    => 'Fournisseur — ' . ($facture->supplier->company_name ?? 'non identifié'),
        ];

        return $this->syscohada->createJournalEntry([
            'organization_id' => $orgId,
            'entry_date'      => optional($facture->invoice_date)->toDateString() ?? now()->toDateString(),
            'description'     => "Facture fournisseur {$facture->invoice_number}"
                               . ($facture->supplier?->company_name ? ' — ' . $facture->supplier->company_name : ''),
            'reference'       => $this->reference($facture),
            'journal_type'    => 'AC',   // journal des achats
            'created_by'      => $auteur->id,
            'lines'           => $lignes,
        ]);
    }

    /**
     * Comptabilise un règlement fournisseur.
     *
     * @param string $moyen bank | cash
     */
    public function comptabiliserReglement(
        SupplierInvoice $facture,
        float $montant,
        string $moyen,
        User $auteur,
        ?string $date = null,
    ): JournalEntry {
        if ($montant <= 0) {
            throw new \RuntimeException('Le montant réglé doit être positif.');
        }

        if (! $this->ecritureDe($facture)) {
            throw new \RuntimeException(
                "La facture {$facture->invoice_number} n'est pas comptabilisée : "
                . "régler une dette absente du journal créerait un solde fournisseur débiteur."
            );
        }

        $reste = round((float) $facture->total - (float) $facture->paid_amount, 2);

        if ($montant > $reste + 0.01) {
            throw new \RuntimeException(sprintf(
                'Règlement de %s supérieur au solde dû (%s).',
                number_format($montant, 2, ',', ' '),
                number_format($reste, 2, ',', ' ')
            ));
        }

        $orgId = $facture->organization_id;

        return $this->syscohada->createJournalEntry([
            'organization_id' => $orgId,
            'entry_date'      => $date ?? now()->toDateString(),
            'description'     => "Règlement facture fournisseur {$facture->invoice_number}",
            'reference'       => $this->reference($facture) . '/REG',
            'journal_type'    => $moyen === 'cash' ? 'CA' : 'BQ',
            'created_by'      => $auteur->id,
            'lines'           => [
                [
                    'account_number' => $this->compte($orgId, 'suppliers'),
                    'debit_amount'   => round($montant, 2),
                    'credit_amount'  => 0,
                    'description'    => 'Fournisseur — ' . ($facture->supplier->company_name ?? 'non identifié'),
                ],
                [
                    'account_number' => $this->compte($orgId, $moyen === 'cash' ? 'cash' : 'bank'),
                    'debit_amount'   => 0,
                    'credit_amount'  => round($montant, 2),
                    'description'    => 'Règlement ' . ($moyen === 'cash' ? 'espèces' : 'banque'),
                ],
            ],
        ]);
    }

    public function ecritureDe(SupplierInvoice $facture): ?JournalEntry
    {
        return JournalEntry::where('organization_id', $facture->organization_id)
            ->where('reference', $this->reference($facture))
            ->first();
    }

    /** Factures reçues sans écriture — la TVA qu'on ne récupère pas encore. */
    public function facturesNonComptabilisees(int $orgId)
    {
        $referencees = JournalEntry::where('organization_id', $orgId)
            ->where('reference', 'like', 'FF/%')
            ->pluck('reference');

        return SupplierInvoice::with('supplier:id,company_name')
            ->where('organization_id', $orgId)
            ->whereNotIn('status', ['draft', 'cancelled'])
            ->get()
            ->reject(fn ($f) => $referencees->contains($this->reference($f)))
            ->values();
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    /** `FF/` pour distinguer des factures de vente (`FAC/`). */
    private function reference(SupplierInvoice $facture): string
    {
        return 'FF/' . $facture->supplier_id . '/' . $facture->invoice_number;
    }

    private function compte(int $orgId, string $purpose): string
    {
        $compte = DB::table('accounting_mappings')
            ->where('organization_id', $orgId)
            ->where('purpose', $purpose)
            ->value('account_number');

        if (! $compte) {
            throw new \RuntimeException(
                "Aucun compte n'est paramétré pour l'opération « {$purpose} ». "
                . "Complétez le paramétrage comptable avant de comptabiliser."
            );
        }

        return $compte;
    }

    /** Un compte saisi à la main peut ne pas exister dans le plan. */
    private function assertCompteExiste(int $orgId, string $numero): void
    {
        $existe = DB::table('chart_of_accounts')
            ->where('organization_id', $orgId)
            ->where('account_number', $numero)
            ->exists();

        if (! $existe) {
            throw new \RuntimeException(
                "Le compte de charge {$numero} n'existe pas dans votre plan comptable."
            );
        }
    }
}
