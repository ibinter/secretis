<?php

namespace App\Services\Integrations;

use App\Models\AccountingEntry;
use App\Models\Contact;
use App\Models\Invoice;
use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use League\Csv\Reader;
use League\Csv\Writer;

/**
 * SageConnector — Interopérabilité avec Sage 100 Compta et Sage X3.
 *
 * Formats supportés :
 *  - FEC  (Fichier des Écritures Comptables) — norme DGFiP / OHADA
 *  - CSV  Sage 100 Compta (format d'import natif)
 *  - Mapping de comptes automatique : Plan Sage → Plan SYSCOHADA
 *
 * Plan de comptes de référence (mapping partiel) :
 *  Sage 700 → SYSCOHADA 70  (Ventes)
 *  Sage 711 → SYSCOHADA 701 (Ventes de marchandises)
 *  Sage 601 → SYSCOHADA 601 (Achats de marchandises)
 *  Sage 401 → SYSCOHADA 401 (Fournisseurs)
 *  Sage 411 → SYSCOHADA 411 (Clients)
 *  Sage 512 → SYSCOHADA 521 (Banques)
 *  Sage 530 → SYSCOHADA 571 (Caisse)
 */
class SageConnector
{
    private array $config = [];

    // Mapping Sage → SYSCOHADA (comptes principaux)
    private const ACCOUNT_MAPPING = [
        // Classe 4 — Tiers
        '401'  => '401',   // Fournisseurs
        '411'  => '411',   // Clients
        '421'  => '421',   // Personnel
        '431'  => '431',   // Sécurité sociale
        '441'  => '441',   // État impôts
        '445'  => '443',   // TVA (Sage 445 → SYSCOHADA 443)
        // Classe 5 — Financier
        '512'  => '521',   // Banque principale
        '514'  => '522',   // Banque secondaire
        '530'  => '571',   // Caisse
        // Classe 6 — Charges
        '601'  => '601',   // Achats marchandises
        '602'  => '602',   // Achats matières premières
        '606'  => '604',   // Achats fournitures
        '613'  => '622',   // Loyers (Sage 613 → SYSCOHADA 622)
        '615'  => '625',   // Entretien
        '616'  => '616',   // Assurances
        '622'  => '627',   // Honoraires
        '623'  => '623',   // Publicité
        '627'  => '627',   // Services bancaires
        '641'  => '661',   // Salaires
        '645'  => '664',   // Charges sociales
        '671'  => '671',   // Charges exceptionnelles
        '681'  => '681',   // Dotations amortissements
        // Classe 7 — Produits
        '700'  => '70',    // Ventes
        '701'  => '701',   // Ventes de marchandises
        '706'  => '706',   // Prestations de services
        '707'  => '707',   // Ventes de produits finis
        '709'  => '709',   // Rabais, remises, ristournes
        '740'  => '75',    // Subventions
        '771'  => '771',   // Produits exceptionnels
        '781'  => '781',   // Reprises amortissements
    ];

    public function withConfig(array $config): static
    {
        $this->config = $config;
        return $this;
    }

    // ─── 1. Export vers Sage ──────────────────────────────────────────────────

    /**
     * Génère un fichier CSV au format FEC (Fichier des Écritures Comptables)
     * compatible Sage 100 Compta pour une période donnée.
     *
     * @param  Organization $org    Organisation
     * @param  Carbon       $period Premier jour du mois à exporter
     * @return string               Chemin du fichier généré dans storage/
     */
    public function exportInvoicesToSage(Organization $org, Carbon $period): string
    {
        $start = $period->copy()->startOfMonth();
        $end   = $period->copy()->endOfMonth();

        // Récupération des écritures comptables
        $entries = AccountingEntry::where('organization_id', $org->id)
            ->whereBetween('date', [$start, $end])
            ->with(['journal', 'account'])
            ->orderBy('date')
            ->orderBy('journal_entry_id')
            ->get();

        // Construction du CSV FEC
        $csvContent = Writer::createFromString();

        // En-têtes FEC normalisés
        $csvContent->insertOne([
            'JournalCode',     // Code journal
            'JournalLib',      // Libellé journal
            'EcritureNum',     // Numéro écriture
            'EcritureDate',    // Date (YYYYMMDD)
            'CompteNum',       // Numéro de compte
            'CompteLib',       // Libellé compte
            'CompAuxNum',      // Compte auxiliaire
            'CompAuxLib',      // Libellé compte auxiliaire
            'PieceRef',        // Référence pièce
            'PieceDate',       // Date pièce
            'EcritureLib',     // Libellé écriture
            'Debit',           // Montant débit
            'Credit',          // Montant crédit
            'EcritureLet',     // Lettrage
            'DateLet',         // Date lettrage
            'ValidDate',       // Date validation
            'Montantdevise',   // Montant en devise
            'Idevise',         // Code devise
        ]);

        foreach ($entries as $entry) {
            $sageAccount = $this->syscohadaToSage($entry->account_number ?? '');

            $csvContent->insertOne([
                $entry->journal_code    ?? 'ACH',
                $entry->journal_name    ?? 'Achats',
                str_pad((string) $entry->id, 10, '0', STR_PAD_LEFT),
                Carbon::parse($entry->date)->format('Ymd'),
                $sageAccount,
                $entry->account_name    ?? '',
                $entry->aux_account     ?? '',
                $entry->aux_name        ?? '',
                $entry->reference       ?? '',
                Carbon::parse($entry->document_date ?? $entry->date)->format('Ymd'),
                $entry->description     ?? '',
                number_format((float) $entry->debit,  2, '.', ''),
                number_format((float) $entry->credit, 2, '.', ''),
                $entry->lettrage        ?? '',
                '',
                Carbon::parse($entry->validated_at ?? $entry->date)->format('Ymd'),
                number_format((float) ($entry->amount_foreign ?? 0), 2, '.', ''),
                $entry->currency        ?? 'XOF',
            ]);
        }

        $filename = sprintf(
            'sage_export_%s_%s_%s.csv',
            $org->id,
            $period->format('Y_m'),
            now()->format('YmdHis')
        );

        $path = "integrations/sage/{$filename}";
        Storage::disk('local')->put($path, $csvContent->toString());

        Log::info("Sage export généré", [
            'org'      => $org->id,
            'period'   => $period->format('Y-m'),
            'entries'  => $entries->count(),
            'file'     => $path,
        ]);

        return $path;
    }

    // ─── 2. Import depuis Sage ────────────────────────────────────────────────

    /**
     * Importe un fichier FEC Sage et crée les écritures dans le journal SYSCOHADA.
     *
     * @param  string $filePath  Chemin vers le fichier CSV Sage
     * @return array             Résumé : ['imported' => n, 'skipped' => n, 'errors' => [...]]
     */
    public function importFromSage(string $filePath): array
    {
        $csv = Reader::createFromPath($filePath, 'r');
        $csv->setHeaderOffset(0);
        $csv->setDelimiter(';'); // Sage utilise le point-virgule

        $imported = 0;
        $skipped  = 0;
        $errors   = [];

        foreach ($csv->getRecords() as $i => $row) {
            try {
                // Mapping compte Sage → SYSCOHADA
                $syscohadaAccount = $this->sageToSyscohadaAccount($row['CompteNum'] ?? '');

                // Vérification doublon (par référence pièce)
                if (AccountingEntry::where('reference', $row['PieceRef'] ?? '')->exists()) {
                    $skipped++;
                    continue;
                }

                AccountingEntry::create([
                    'journal_code'   => $row['JournalCode'] ?? 'IMP',
                    'journal_name'   => $row['JournalLib']  ?? 'Import Sage',
                    'date'           => Carbon::createFromFormat('Ymd', $row['EcritureDate'])->toDateString(),
                    'account_number' => $syscohadaAccount,
                    'account_name'   => $row['CompteLib'] ?? '',
                    'aux_account'    => $row['CompAuxNum'] ?? null,
                    'aux_name'       => $row['CompAuxLib'] ?? null,
                    'reference'      => $row['PieceRef']  ?? '',
                    'description'    => $row['EcritureLib'] ?? '',
                    'debit'          => (float) str_replace(',', '.', $row['Debit']  ?? '0'),
                    'credit'         => (float) str_replace(',', '.', $row['Credit'] ?? '0'),
                    'currency'       => $row['Idevise']  ?? 'XOF',
                    'source'         => 'sage_import',
                    'lettrage'       => $row['EcritureLet'] ?? null,
                ]);

                $imported++;
            } catch (\Throwable $e) {
                $errors[] = "Ligne {$i}: " . $e->getMessage();
                Log::warning("Import Sage ligne {$i}", ['error' => $e->getMessage(), 'row' => $row]);
            }
        }

        return compact('imported', 'skipped', 'errors');
    }

    // ─── 3. Sync contacts bidirectionnel ─────────────────────────────────────

    /**
     * Synchronise les clients/fournisseurs entre SECRETIS et Sage.
     * Via un fichier d'échange CSV dans un répertoire partagé (SFTP ou dossier local).
     */
    public function syncContactsSage(Organization $org): void
    {
        $contacts = Contact::where('organization_id', $org->id)
            ->whereIn('type', ['client', 'fournisseur'])
            ->get();

        $csv = Writer::createFromString();
        $csv->insertOne([
            'CompteNum', 'CompteLib', 'Type', 'Adresse',
            'CodePostal', 'Ville', 'Pays', 'Telephone', 'Email', 'SIRET',
        ]);

        foreach ($contacts as $contact) {
            $accountPrefix = $contact->type === 'client' ? '411' : '401';
            $accountNumber = $accountPrefix . str_pad((string) $contact->id, 8, '0', STR_PAD_LEFT);

            $csv->insertOne([
                $accountNumber,
                $contact->name,
                strtoupper($contact->type),
                $contact->address ?? '',
                $contact->postal_code ?? '',
                $contact->city ?? '',
                $contact->country ?? 'CI',
                $contact->phone ?? '',
                $contact->email ?? '',
                $contact->tax_id ?? '',
            ]);
        }

        $path = "integrations/sage/contacts_{$org->id}_" . now()->format('YmdHis') . '.csv';
        Storage::disk('local')->put($path, $csv->toString());

        // Dépose dans le dossier de synchronisation Sage si configuré
        $sageFolder = $this->config['sage_sync_folder'] ?? null;
        if ($sageFolder && is_dir($sageFolder)) {
            file_put_contents(
                $sageFolder . DIRECTORY_SEPARATOR . basename($path),
                Storage::disk('local')->get($path)
            );
        }

        Log::info("Sage sync contacts", ['org' => $org->id, 'count' => $contacts->count()]);
    }

    // ─── Helpers de mapping ───────────────────────────────────────────────────

    /**
     * Convertit un compte SYSCOHADA en compte Sage (inverse du mapping).
     */
    private function syscohadaToSage(string $syscohadaAccount): string
    {
        $flipped = array_flip(self::ACCOUNT_MAPPING);
        // Recherche exacte d'abord
        if (isset($flipped[$syscohadaAccount])) {
            return $flipped[$syscohadaAccount];
        }
        // Recherche préfixe (ex: 7011 → 701 → 700)
        foreach ($flipped as $syscohada => $sage) {
            if (str_starts_with($syscohadaAccount, $syscohada)) {
                return $sage . substr($syscohadaAccount, strlen($syscohada));
            }
        }
        return $syscohadaAccount; // Pas de mapping → retour tel quel
    }

    /**
     * Convertit un compte Sage en compte SYSCOHADA.
     */
    private function sageToSyscohadaAccount(string $sageAccount): string
    {
        // Recherche exacte
        if (isset(self::ACCOUNT_MAPPING[$sageAccount])) {
            return self::ACCOUNT_MAPPING[$sageAccount];
        }
        // Recherche préfixe
        foreach (self::ACCOUNT_MAPPING as $sage => $syscohada) {
            if (str_starts_with($sageAccount, $sage)) {
                return $syscohada . substr($sageAccount, strlen($sage));
            }
        }
        return $sageAccount;
    }
}
