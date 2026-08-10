<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Pont facturation → comptabilité.
 *
 * Jusqu'ici, facturation et comptabilité étaient deux silos étanches : les
 * factures s'empilaient d'un côté, le journal restait vide de l'autre, et la
 * déclaration de TVA sortait donc structurellement à ZÉRO. Une facture émise
 * qui ne produit aucune écriture n'existe pas pour l'administration fiscale.
 *
 * Écriture de vente en SYSCOHADA :
 *
 *     411  Clients              débit   TTC
 *         706  Services vendus        crédit   HT
 *         4431 TVA collectée          crédit   TVA
 *
 * Écriture d'encaissement :
 *
 *     521  Banque               débit   montant reçu
 *         411  Clients                crédit   montant reçu
 *
 * Les numéros de comptes viennent d'`accounting_mappings`, jamais du code :
 * le compte de produit dépend de l'activité, et une organisation peut avoir
 * subdivisé son plan.
 */
class InvoiceAccountingService
{
    public function __construct(private SyscohadaService $syscohada) {}

    /**
     * Comptabilise une facture de vente.
     *
     * Idempotent : une facture déjà comptabilisée n'est pas repassée. Une
     * double écriture gonflerait le chiffre d'affaires ET la TVA due, et ne se
     * verrait qu'au contrôle.
     */
    public function comptabiliserFacture(Invoice $facture, User $auteur): JournalEntry
    {
        if ($facture->status === 'draft') {
            throw new \RuntimeException(
                "La facture {$facture->invoice_number} est un brouillon : "
                . "seule une facture émise se comptabilise."
            );
        }

        if ($existante = $this->ecritureDe($facture)) {
            throw new \RuntimeException(
                "La facture {$facture->invoice_number} est déjà comptabilisée "
                . "(écriture {$existante->entry_number}). La repasser gonflerait "
                . "le chiffre d'affaires et la TVA due."
            );
        }

        $orgId   = $facture->organization_id;
        $ttc     = round((float) $facture->total, 2);
        $ht      = round((float) $facture->subtotal, 2);
        $tva     = round((float) $facture->tax_amount, 2);
        $remise  = round((float) ($facture->discount_amount ?? 0), 2);

        if ($ttc <= 0) {
            throw new \RuntimeException("La facture {$facture->invoice_number} est d'un montant nul.");
        }

        $lignes = [
            [
                'account_number' => $this->compte($orgId, 'clients'),
                'debit_amount'   => $ttc,
                'credit_amount'  => 0,
                'description'    => 'Client — ' . ($facture->client->name ?? 'non identifié'),
            ],
            [
                'account_number' => $this->compte($orgId, 'sales_services'),
                'debit_amount'   => 0,
                // La remise est portée à son propre compte : la comptabiliser en
                // moins du produit masquerait le chiffre d'affaires brut, que le
                // compte de résultat SYSCOHADA veut voir.
                'credit_amount'  => round($ht + $remise, 2),
                'description'    => $facture->title ?: 'Prestation facturée',
            ],
        ];

        if ($remise > 0) {
            $lignes[] = [
                'account_number' => $this->compte($orgId, 'discount_granted'),
                'debit_amount'   => $remise,
                'credit_amount'  => 0,
                'description'    => 'Remise accordée',
            ];
        }

        if ($tva > 0) {
            $lignes[] = [
                'account_number' => $this->compte($orgId, 'vat_collected'),
                'debit_amount'   => 0,
                'credit_amount'  => $tva,
                'description'    => 'TVA collectée ' . rtrim(rtrim(number_format((float) $facture->tax_rate, 2, ',', ''), '0'), ',') . ' %',
            ];
        }

        $ecriture = $this->syscohada->createJournalEntry([
            'organization_id' => $orgId,
            'entry_date'      => optional($facture->issue_date)->toDateString() ?? now()->toDateString(),
            'description'     => "Facture {$facture->invoice_number}"
                               . ($facture->client?->name ? ' — ' . $facture->client->name : ''),
            'reference'       => $this->reference($facture),
            'journal_type'    => 'VE',   // journal des ventes
            'created_by'      => $auteur->id,
            'lines'           => $lignes,
        ]);

        return $ecriture;
    }

    /**
     * Comptabilise un encaissement.
     *
     * @param string $moyen bank | cash
     */
    public function comptabiliserReglement(
        Invoice $facture,
        float $montant,
        string $moyen,
        User $auteur,
        ?string $date = null,
    ): JournalEntry {
        if ($montant <= 0) {
            throw new \RuntimeException('Le montant encaissé doit être positif.');
        }

        if (! $this->ecritureDe($facture)) {
            throw new \RuntimeException(
                "La facture {$facture->invoice_number} n'est pas comptabilisée : "
                . "encaisser une créance qui n'existe pas au journal créerait un solde client négatif."
            );
        }

        $reste = round((float) $facture->total - (float) ($facture->paid_amount ?? 0), 2);

        if ($montant > $reste + 0.01) {
            throw new \RuntimeException(
                sprintf('Encaissement de %s supérieur au solde dû (%s).',
                    number_format($montant, 2, ',', ' '), number_format($reste, 2, ',', ' '))
            );
        }

        $orgId = $facture->organization_id;

        return $this->syscohada->createJournalEntry([
            'organization_id' => $orgId,
            'entry_date'      => $date ?? now()->toDateString(),
            'description'     => "Règlement facture {$facture->invoice_number}",
            'reference'       => $this->reference($facture) . '/REG',
            'journal_type'    => $moyen === 'cash' ? 'CA' : 'BQ',  // caisse / banque
            'created_by'      => $auteur->id,
            'lines'           => [
                [
                    'account_number' => $this->compte($orgId, $moyen === 'cash' ? 'cash' : 'bank'),
                    'debit_amount'   => round($montant, 2),
                    'credit_amount'  => 0,
                    'description'    => 'Encaissement ' . ($moyen === 'cash' ? 'espèces' : 'banque'),
                ],
                [
                    'account_number' => $this->compte($orgId, 'clients'),
                    'debit_amount'   => 0,
                    'credit_amount'  => round($montant, 2),
                    'description'    => 'Client — ' . ($facture->client->name ?? 'non identifié'),
                ],
            ],
        ]);
    }

    /** L'écriture de vente d'une facture, si elle existe. */
    public function ecritureDe(Invoice $facture): ?JournalEntry
    {
        return JournalEntry::where('organization_id', $facture->organization_id)
            ->where('reference', $this->reference($facture))
            ->first();
    }

    /**
     * Factures émises qui n'ont pas encore d'écriture — le trou entre les deux
     * silos, rendu visible.
     */
    public function facturesNonComptabilisees(int $orgId)
    {
        $referencees = JournalEntry::where('organization_id', $orgId)
            ->where('reference', 'like', 'FAC/%')
            ->pluck('reference');

        return Invoice::where('organization_id', $orgId)
            ->whereNotIn('status', ['draft', 'cancelled'])
            ->get()
            ->reject(fn ($f) => $referencees->contains($this->reference($f)))
            ->values();
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    /** Référence stable, qui sert aussi de garde contre le double passage. */
    private function reference(Invoice $facture): string
    {
        return 'FAC/' . $facture->invoice_number;
    }

    /**
     * Compte paramétré pour une opération. Échoue explicitement plutôt que de
     * retomber sur un numéro deviné : une écriture au mauvais compte est plus
     * difficile à retrouver qu'une écriture absente.
     */
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
}
