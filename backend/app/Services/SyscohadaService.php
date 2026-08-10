<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Organization;
use App\Models\TaxDeclaration;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * SyscohadaService — Moteur comptable SYSCOHADA Révisé 2017
 *
 * Fonctions principales :
 *   - Création / validation d'écritures comptables
 *   - Balance générale et balance de vérification
 *   - Compte de résultat SYSCOHADA
 *   - Bilan SYSCOHADA (Actif / Passif)
 *   - Déclarations fiscales (TVA, IS, Patente, CNPS)
 *   - Clôture d'exercice
 *   - Grand livre par compte
 *   - Lettrage automatique
 */
class SyscohadaService
{
    // =========================================================================
    // CRÉATION D'ÉCRITURE
    // =========================================================================

    /**
     * Crée une écriture comptable après vérification de l'équilibre.
     *
     * @param array{
     *   organization_id: int,
     *   entry_date: string,
     *   description: string,
     *   reference?: string,
     *   journal_type: string,
     *   fiscal_year_id?: int,
     *   created_by: int,
     *   lines: array<array{account_number,debit_amount,credit_amount,description?,analytic_code?,project_id?,currency_code?,exchange_rate?}>
     * } $data
     */
    public function createJournalEntry(array $data): JournalEntry
    {
        // --- Vérification équilibre Débit = Crédit ---
        $totalDebit  = collect($data['lines'])->sum(fn($l) => (float) ($l['debit_amount']  ?? 0));
        $totalCredit = collect($data['lines'])->sum(fn($l) => (float) ($l['credit_amount'] ?? 0));

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new RuntimeException(
                sprintf(
                    'Écriture déséquilibrée : débit %.2f ≠ crédit %.2f (écart %.2f)',
                    $totalDebit, $totalCredit, abs($totalDebit - $totalCredit)
                )
            );
        }

        if (empty($data['lines'])) {
            throw new RuntimeException('Une écriture doit contenir au moins 2 lignes.');
        }

        // --- Vérification exercice fiscal non clôturé ---
        if (! empty($data['fiscal_year_id'])) {
            $fy = FiscalYear::findOrFail($data['fiscal_year_id']);
            if ($fy->status === 'closed') {
                throw new RuntimeException("L'exercice fiscal {$fy->name} est clôturé. Impossible de saisir des écritures.");
            }
        }

        // --- Vérification que les comptes existent ---
        $orgId    = $data['organization_id'];
        $accounts = ChartOfAccount::where('organization_id', $orgId)
            ->pluck('account_number')
            ->flip();

        foreach ($data['lines'] as $line) {
            if (! isset($accounts[$line['account_number']])) {
                throw new RuntimeException(
                    "Compte {$line['account_number']} introuvable dans le plan comptable."
                );
            }
        }

        return DB::transaction(function () use ($data, $totalDebit) {
            $entry = JournalEntry::create([
                'organization_id' => $data['organization_id'],
                'entry_number'    => $this->generateEntryNumber($data['organization_id']),
                'entry_date'      => $data['entry_date'],
                'description'     => $data['description'],
                'reference'       => $data['reference'] ?? null,
                'journal_type'    => $data['journal_type'] ?? 'OD',
                'is_locked'       => false,
                'fiscal_year_id'  => $data['fiscal_year_id'] ?? null,
                'created_by'      => $data['created_by'],
            ]);

            foreach ($data['lines'] as $i => $line) {
                JournalLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_number'   => $line['account_number'],
                    'debit_amount'     => (float) ($line['debit_amount']  ?? 0),
                    'credit_amount'    => (float) ($line['credit_amount'] ?? 0),
                    'description'      => $line['description'] ?? null,
                    'analytic_code'    => $line['analytic_code'] ?? null,
                    'project_id'       => $line['project_id'] ?? null,
                    'currency_code'    => $line['currency_code'] ?? 'XOF',
                    'exchange_rate'    => (float) ($line['exchange_rate'] ?? 1.0),
                ]);
            }

            Log::info('SyscohadaService: écriture créée', [
                'entry_number' => $entry->entry_number,
                'total'        => $totalDebit,
                'lines'        => count($data['lines']),
            ]);

            return $entry->load('lines');
        });
    }

    /**
     * Validation d'une écriture (double contrôle obligatoire).
     * La personne qui valide ≠ la personne qui a saisi.
     */
    public function validateEntry(JournalEntry $entry, User $validator): void
    {
        if ($entry->is_locked) {
            throw new RuntimeException('Cette écriture est déjà validée et verrouillée.');
        }

        if ($entry->created_by === $validator->id) {
            throw new RuntimeException(
                'Le validateur ne peut pas être le même que le saisissant (principe des 4 yeux).'
            );
        }

        $entry->update([
            'is_locked'    => true,
            'validated_by' => $validator->id,
            'validated_at' => now(),
        ]);

        Log::info('SyscohadaService: écriture validée', [
            'entry_number' => $entry->entry_number,
            'validated_by' => $validator->id,
        ]);
    }

    // =========================================================================
    // BALANCE GÉNÉRALE
    // =========================================================================

    /**
     * Génère la balance générale sur une période donnée.
     *
     * @return array{
     *   accounts: array<array{account_number,account_name,account_type,ohada_class,debit_total,credit_total,solde_debiteur,solde_crediteur}>,
     *   totals: array{debit_total,credit_total,solde_debiteur,solde_crediteur}
     * }
     */
    public function generateBalance(Organization $org, Carbon $start, Carbon $end): array
    {
        $lines = DB::table('journal_lines as jl')
            ->join('journal_entries as je', 'jl.journal_entry_id', '=', 'je.id')
            ->join('chart_of_accounts as coa', function ($join) use ($org) {
                $join->on('jl.account_number', '=', 'coa.account_number')
                     ->where('coa.organization_id', '=', $org->id);
            })
            ->where('je.organization_id', $org->id)
            ->whereBetween('je.entry_date', [$start->toDateString(), $end->toDateString()])
            ->select(
                'jl.account_number',
                'coa.account_name',
                'coa.account_type',
                'coa.ohada_class',
                DB::raw('SUM(jl.debit_amount)  as debit_total'),
                DB::raw('SUM(jl.credit_amount) as credit_total')
            )
            ->groupBy('jl.account_number', 'coa.account_name', 'coa.account_type', 'coa.ohada_class')
            ->orderBy('jl.account_number')
            ->get();

        $accounts = $lines->map(function ($row) {
            $solde           = (float) $row->debit_total - (float) $row->credit_total;
            $solde_debiteur  = max(0, $solde);
            $solde_crediteur = max(0, -$solde);

            return [
                'account_number'  => $row->account_number,
                'account_name'    => $row->account_name,
                'account_type'    => $row->account_type,
                'ohada_class'     => (int) $row->ohada_class,
                'debit_total'     => (float) $row->debit_total,
                'credit_total'    => (float) $row->credit_total,
                'solde_debiteur'  => $solde_debiteur,
                'solde_crediteur' => $solde_crediteur,
            ];
        })->values()->toArray();

        $totals = [
            'debit_total'     => array_sum(array_column($accounts, 'debit_total')),
            'credit_total'    => array_sum(array_column($accounts, 'credit_total')),
            'solde_debiteur'  => array_sum(array_column($accounts, 'solde_debiteur')),
            'solde_crediteur' => array_sum(array_column($accounts, 'solde_crediteur')),
        ];

        return compact('accounts', 'totals');
    }

    /**
     * Balance de vérification pré-bilan.
     * Regroupe par catégorie : Actif / Passif / Charges / Produits
     */
    public function generateTrialBalance(Organization $org, FiscalYear $fy): array
    {
        $balance  = $this->generateBalance($org, Carbon::parse($fy->start_date), Carbon::parse($fy->end_date));
        $accounts = collect($balance['accounts']);

        return [
            'fiscal_year' => $fy->name,
            'actif'       => $accounts->where('account_type', 'actif')->values(),
            'passif'      => $accounts->where('account_type', 'passif')->values(),
            'capitaux'    => $accounts->where('account_type', 'capitaux')->values(),
            'charges'     => $accounts->where('account_type', 'charge')->values(),
            'produits'    => $accounts->where('account_type', 'produit')->values(),
            'totals'      => $balance['totals'],
            'is_balanced' => abs($balance['totals']['debit_total'] - $balance['totals']['credit_total']) < 0.01,
        ];
    }

    // =========================================================================
    // COMPTE DE RÉSULTAT SYSCOHADA
    // =========================================================================

    /**
     * Génère le compte de résultat selon la structure SYSCOHADA.
     *
     * Soldes intermédiaires de gestion :
     *   VA  = Marge brute - Consommations intermédiaires
     *   EBE = VA - Charges de personnel
     *   REX = EBE - Dotations amort. exploitation
     *   RAO = REX + Résultat financier
     *   RNE = RAO + Résultat HAO - IS
     */
    public function generateIncomeStatement(FiscalYear $fy): array
    {
        $org   = Organization::findOrFail($fy->organization_id);
        $start = Carbon::parse($fy->start_date);
        $end   = Carbon::parse($fy->end_date);

        $totals = $this->getAccountTotals($org->id, $start, $end);

        // Produits d'activités ordinaires (classes 70-75)
        $ca                   = $this->sumAccounts($totals, ['70', '701', '702', '703', '704', '705', '706', '707']);
        $autresProduits       = $this->sumAccounts($totals, ['71', '72', '73', '75']);
        $productionExercice   = $ca + $autresProduits;

        // Achats consommés (classe 60)
        $achatsConsommes      = $this->sumAccounts($totals, ['60', '601', '602', '603', '604', '605', '606', '608']);
        $transports           = $this->sumAccounts($totals, ['61']);
        $servicesExtA         = $this->sumAccounts($totals, ['62']);
        $servicesExtB         = $this->sumAccounts($totals, ['63']);
        $consommationsInt     = $achatsConsommes + $transports + $servicesExtA + $servicesExtB;

        // Valeur ajoutée
        $valeurAjoutee = $productionExercice - $consommationsInt;

        // Charges de personnel (classe 66)
        $chargesPersonnel = $this->sumAccounts($totals, ['66', '661', '662', '663', '664', '665', '668']);

        // Impôts et taxes (classe 64)
        $impotsTaxes = $this->sumAccounts($totals, ['64']);

        // EBE = VA - Charges de personnel - Impôts et taxes
        $ebe = $valeurAjoutee - $chargesPersonnel - $impotsTaxes;

        // Autres charges d'exploitation (classe 65)
        $autresCharges = $this->sumAccounts($totals, ['65']);

        // Reprises d'exploitation (78)
        $reprises = $this->sumAccounts($totals, ['78', '781', '782']);

        // Dotations aux amortissements exploitation (681, 682)
        $dotationsAmort = $this->sumAccounts($totals, ['68', '681', '682']);

        // Résultat d'exploitation
        $rex = $ebe + $reprises - $autresCharges - $dotationsAmort;

        // Résultat financier
        $produitsFinanciers = $this->sumAccounts($totals, ['77', '771', '772', '773', '774', '775', '776', '777', '778']);
        $chargesFinancieres = $this->sumAccounts($totals, ['67', '671', '672', '673', '674', '675', '676', '677', '678']);
        $resultatFinancier  = $produitsFinanciers - $chargesFinancieres;

        // Résultat des Activités Ordinaires (RAO)
        $rao = $rex + $resultatFinancier;

        // Résultat HAO (classes 81-88)
        $produitsHao = $this->sumAccounts($totals, ['82', '84', '86', '88']);
        $chargesHao  = $this->sumAccounts($totals, ['81', '83', '85', '87']);
        $resultatHao = $produitsHao - $chargesHao;

        // IS (compte 695)
        $is = $this->sumAccounts($totals, ['695', '69']);

        // Résultat net
        $resultatNet = $rao + $resultatHao - $is;

        return [
            'fiscal_year'          => $fy->name,
            'period'               => [
                'start' => $start->toDateString(),
                'end'   => $end->toDateString(),
            ],

            // Produits
            'chiffre_affaires'     => $ca,
            'autres_produits'      => $autresProduits,
            'production_exercice'  => $productionExercice,

            // Charges
            'achats_consommes'     => $achatsConsommes,
            'transports'           => $transports,
            'services_ext_a'       => $servicesExtA,
            'services_ext_b'       => $servicesExtB,
            'consommations_intermediaires' => $consommationsInt,

            // Soldes intermédiaires
            'valeur_ajoutee'       => $valeurAjoutee,
            'charges_personnel'    => $chargesPersonnel,
            'impots_taxes'         => $impotsTaxes,
            'ebe'                  => $ebe,

            'autres_charges'       => $autresCharges,
            'dotations_amort'      => $dotationsAmort,
            'reprises'             => $reprises,
            'rex'                  => $rex,

            'produits_financiers'  => $produitsFinanciers,
            'charges_financieres'  => $chargesFinancieres,
            'resultat_financier'   => $resultatFinancier,

            'rao'                  => $rao,

            'produits_hao'         => $produitsHao,
            'charges_hao'          => $chargesHao,
            'resultat_hao'         => $resultatHao,

            'impots_sur_resultat'  => $is,
            'resultat_net'         => $resultatNet,

            // Ratios
            'taux_marge_brute'     => $ca > 0 ? round(($ca - $achatsConsommes) / $ca * 100, 2) : 0,
            'taux_valeur_ajoutee'  => $productionExercice > 0
                ? round($valeurAjoutee / $productionExercice * 100, 2)
                : 0,
        ];
    }

    // =========================================================================
    // BILAN SYSCOHADA
    // =========================================================================

    /**
     * Génère le bilan selon la structure SYSCOHADA.
     *
     * @return array{
     *   actif: array,
     *   passif: array,
     *   total_actif: float,
     *   total_passif: float,
     *   is_balanced: bool
     * }
     */
    public function generateBalanceSheet(FiscalYear $fy): array
    {
        $org   = Organization::findOrFail($fy->organization_id);
        $start = Carbon::parse($fy->start_date);
        $end   = Carbon::parse($fy->end_date);

        $totals = $this->getAccountTotals($org->id, $start, $end);

        // ---- ACTIF ----

        // Immobilisations incorporelles
        $immobIncorpBrut = $this->sumAccounts($totals, ['201', '202', '203', '204', '207', '208', '20']);
        $immobIncorpAmort= $this->sumAccounts($totals, ['281', '291']);
        $immobIncorpNet  = $immobIncorpBrut - $immobIncorpAmort;

        // Terrains
        $terrainsBrut    = $this->sumAccounts($totals, ['211', '212', '213', '214', '215', '21']);
        $terrainsAmort   = $this->sumAccounts($totals, ['282', '292']);

        // Bâtiments
        $batimentsBrut   = $this->sumAccounts($totals, ['221', '222', '223', '224', '225', '22']);
        $batimentsAmort  = $this->sumAccounts($totals, ['283', '293']);

        // Autres immobilisations corporelles
        $autresImmobBrut = $this->sumAccounts($totals, ['231', '232', '233', '234', '235', '238', '23']);
        $autresImmobAmort= $this->sumAccounts($totals, ['284', '294']);

        // Immobilisations financières
        $immobFinBrut    = $this->sumAccounts($totals, ['261', '265', '266', '271', '272', '274', '275', '276', '26', '27']);
        $immobFinProv    = $this->sumAccounts($totals, ['296', '297']);

        $actifImmobiliseBrut = $immobIncorpBrut + $terrainsBrut + $batimentsBrut + $autresImmobBrut + $immobFinBrut;
        $actifImmobiliseAmort= $immobIncorpAmort + $terrainsAmort + $batimentsAmort + $autresImmobAmort + $immobFinProv;
        $actifImmobiliseNet  = $actifImmobiliseBrut - $actifImmobiliseAmort;

        // Stocks
        $stocks = $this->sumAccounts($totals, ['30', '31', '32', '33', '34', '35', '36', '37', '38']);

        // Créances clients
        $creancesClients = $this->sumAccounts($totals, ['411', '412', '416', '418', '41']);

        // Autres créances
        $autresCreances = $this->sumAccounts($totals, ['409', '422', '441', '471', '476', '478']);

        $actifCirculant = $stocks + $creancesClients + $autresCreances;

        // Trésorerie Actif
        $tresorerieActif = $this->sumAccounts($totals, ['51', '511', '512', '513', '514', '57', '571', '572', '578']);

        $totalActif = $actifImmobiliseNet + $actifCirculant + $tresorerieActif;

        // ---- PASSIF ----

        // Capitaux propres
        $capital      = $this->sumAccounts($totals, ['101', '102', '10']);
        $reserves     = $this->sumAccounts($totals, ['104', '105', '106', '107']);
        $reportNouv   = $this->sumAccounts($totals, ['110', '119', '11']);
        $resultat     = $this->sumAccounts($totals, ['120', '129', '12']);
        $subventions  = $this->sumAccounts($totals, ['13', '130', '131']);
        $autresCapit  = $this->sumAccounts($totals, ['14', '141', '142']);

        $capitauxPropres = $capital + $reserves + $reportNouv + $resultat + $subventions + $autresCapit;

        // Dettes financières
        $dettesFinancieres = $this->sumAccounts($totals, ['16', '161', '162', '163', '165', '168', '17', '172', '173']);

        // Provisions
        $provisions = $this->sumAccounts($totals, ['15', '151', '158']);

        $ressourcesDurables = $capitauxPropres + $dettesFinancieres + $provisions;

        // Passif circulant — Dettes fournisseurs
        $dettesFournisseurs = $this->sumAccounts($totals, ['401', '402', '408', '40']);

        // Dettes fiscales et sociales
        $dettesFiscales = $this->sumAccounts($totals, ['421', '423', '431', '432', '4431', '443', '4447', '447', '448']);

        // Autres dettes
        $autresDettes = $this->sumAccounts($totals, ['419', '472', '477', '479']);

        $passifCirculant = $dettesFournisseurs + $dettesFiscales + $autresDettes;

        // Trésorerie Passif
        $tresoreriePassif = $this->sumAccounts($totals, ['521', '522']);

        $totalPassif = $ressourcesDurables + $passifCirculant + $tresoreriePassif;

        return [
            'fiscal_year' => $fy->name,
            'period'      => [
                'start' => $start->toDateString(),
                'end'   => $end->toDateString(),
            ],

            'actif' => [
                'immobilisations' => [
                    'incorporelles' => [
                        'brut'  => $immobIncorpBrut,
                        'amort' => $immobIncorpAmort,
                        'net'   => $immobIncorpNet,
                    ],
                    'terrains' => [
                        'brut'  => $terrainsBrut,
                        'amort' => $terrainsAmort,
                        'net'   => $terrainsBrut - $terrainsAmort,
                    ],
                    'batiments' => [
                        'brut'  => $batimentsBrut,
                        'amort' => $batimentsAmort,
                        'net'   => $batimentsBrut - $batimentsAmort,
                    ],
                    'autres_corporelles' => [
                        'brut'  => $autresImmobBrut,
                        'amort' => $autresImmobAmort,
                        'net'   => $autresImmobBrut - $autresImmobAmort,
                    ],
                    'financieres' => [
                        'brut'  => $immobFinBrut,
                        'amort' => $immobFinProv,
                        'net'   => $immobFinBrut - $immobFinProv,
                    ],
                    'total_brut'  => $actifImmobiliseBrut,
                    'total_amort' => $actifImmobiliseAmort,
                    'total_net'   => $actifImmobiliseNet,
                ],
                'circulant' => [
                    'stocks'           => $stocks,
                    'creances_clients' => $creancesClients,
                    'autres_creances'  => $autresCreances,
                    'total'            => $actifCirculant,
                ],
                'tresorerie' => $tresorerieActif,
                'total'      => $totalActif,
            ],

            'passif' => [
                'capitaux_propres' => [
                    'capital'    => $capital,
                    'reserves'   => $reserves,
                    'report_nouveau' => $reportNouv,
                    'resultat'   => $resultat,
                    'subventions'=> $subventions,
                    'autres'     => $autresCapit,
                    'total'      => $capitauxPropres,
                ],
                'dettes_financieres' => $dettesFinancieres,
                'provisions'         => $provisions,
                'ressources_durables'=> $ressourcesDurables,
                'passif_circulant' => [
                    'fournisseurs'    => $dettesFournisseurs,
                    'dettes_fiscales' => $dettesFiscales,
                    'autres_dettes'   => $autresDettes,
                    'total'           => $passifCirculant,
                ],
                'tresorerie'         => $tresoreriePassif,
                'total'              => $totalPassif,
            ],

            'total_actif'  => $totalActif,
            'total_passif' => $totalPassif,
            'is_balanced'  => abs($totalActif - $totalPassif) < 1.00,
            'ecart'        => abs($totalActif - $totalPassif),
        ];
    }

    // =========================================================================
    // DÉCLARATIONS FISCALES
    // =========================================================================

    /**
     * Génère un brouillon de déclaration fiscale.
     *
     * @param string $type TVA|IS|PATENTE|CNPS
     */
    public function generateTaxDeclaration(
        Organization $org,
        string       $type,
        Carbon       $start,
        Carbon       $end
    ): array {
        $totals = $this->getAccountTotals($org->id, $start, $end);

        return match ($type) {
            'TVA'     => $this->calcTva($totals, $org, $start, $end),
            'IS'      => $this->calcIs($totals, $org, $start, $end),
            'PATENTE' => $this->calcPatente($totals, $org),
            'CNPS'    => $this->calcCotisationsSociales($totals, $org, $start, $end),
            default   => throw new RuntimeException("Type de déclaration inconnu : {$type}"),
        };
    }

    /**
     * Déclaration de TVA.
     *
     * ⚠️ Les comptes venaient d'une liste EN DUR (`4431`/`443` pour la collecte,
     * `4441`/`444` pour la déduction) qui ne correspondait pas au plan
     * réellement semé : la TVA déductible remontait donc à ZÉRO même quand les
     * écritures d'achat étaient correctement passées au 4451. Les comptes sont
     * désormais lus dans `accounting_mappings`, comme partout ailleurs — un
     * plan subdivisé différemment reste ainsi exploitable.
     */
    private function calcTva(array $totals, Organization $org, Carbon $start, Carbon $end): array
    {
        $collecte   = $this->comptesTva($org->id, 'vat_collected',  ['4431', '443']);
        $deductible = $this->comptesTva($org->id, 'vat_deductible', ['4451', '445']);

        $tvaCollectee  = $this->sumAccounts($totals, $collecte);
        $tvaDeductible = $this->sumAccounts($totals, $deductible);

        $tvaNette = $tvaCollectee - $tvaDeductible;

        return [
            'type'          => 'TVA',
            'period'        => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'tva_collectee' => $tvaCollectee,
            'tva_deductible'=> $tvaDeductible,
            'tva_nette'     => $tvaNette,
            'a_payer'       => max(0, $tvaNette),
            'credit_report' => max(0, -$tvaNette),
            'breakdown'     => [
                'comptes_collecte'   => $collecte,
                'comptes_deductible' => $deductible,
            ],
        ];
    }

    /**
     * Comptes de TVA d'une organisation : celui paramétré, plus ses
     * subdivisions éventuelles. Le repli n'est utilisé qu'à défaut de
     * paramétrage.
     *
     * @return array<int, string>
     */
    private function comptesTva(int $orgId, string $purpose, array $repli): array
    {
        $compte = DB::table('accounting_mappings')
            ->where('organization_id', $orgId)
            ->where('purpose', $purpose)
            ->value('account_number');

        if (! $compte) {
            return $repli;
        }

        // Une organisation peut ventiler sa TVA sur plusieurs sous-comptes
        // (44521, 44522…) : on retient le compte paramétré et tous ceux qui en
        // découlent, sinon une partie de la taxe échapperait à la déclaration.
        return DB::table('chart_of_accounts')
            ->where('organization_id', $orgId)
            ->where(function ($q) use ($compte) {
                $q->where('account_number', $compte)
                  ->orWhere('account_number', 'like', $compte . '%');
            })
            ->pluck('account_number')
            ->all();
    }

    private function calcIs(array $totals, Organization $org, Carbon $start, Carbon $end): array
    {
        // IS Côte d'Ivoire : 25% du bénéfice fiscal
        // IS Sénégal : 30%, Cameroun : 30%, Mali : 30%, Burkina : 27,5%
        $tauxIs = 0.25; // OHADA CI par défaut

        $ca             = $this->sumAccounts($totals, ['70', '701', '702', '703', '704', '705', '706', '707']);
        $totalCharges   = $this->sumAccounts($totals, ['60', '61', '62', '63', '64', '65', '66', '67', '68']);
        $beneficeFiscal = max(0, $ca - $totalCharges);
        $is             = round($beneficeFiscal * $tauxIs, 2);

        // Impôt minimum forfaitaire (IMF) : 0,5% CA, min 500 000 XOF
        $imf = max(500000, round($ca * 0.005, 2));

        return [
            'type'            => 'IS',
            'period'          => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'chiffre_affaires'=> $ca,
            'charges_totales' => $totalCharges,
            'benefice_fiscal' => $beneficeFiscal,
            'taux_is'         => $tauxIs,
            'is_calcule'      => $is,
            'imf'             => $imf,
            'montant_du'      => max($is, $imf),
            'note'            => 'IS calculé selon taux CI 25% — ajuster selon le pays OHADA',
        ];
    }

    private function calcPatente(array $totals, Organization $org): array
    {
        $ca = $this->sumAccounts($totals, ['70']);
        // Patente CI : Droit proportionnel 0,5% CA + Droit fixe selon catégorie
        $droitProportionnel = round($ca * 0.005, 2);
        $droitFixe          = 300000; // Catégorie standard

        return [
            'type'                => 'PATENTE',
            'chiffre_affaires'    => $ca,
            'droit_proportionnel' => $droitProportionnel,
            'droit_fixe'          => $droitFixe,
            'total'               => $droitProportionnel + $droitFixe,
            'note'                => 'Patente CI — vérifier catégorie d\'activité',
        ];
    }

    /**
     * Cotisations sociales dues sur la masse salariale de la période.
     *
     * ⚠️ Cette méthode s'appelait `calcCnps()` et appliquait **les taux CNPS
     * ivoiriens à toutes les organisations** : 15,45 % patronale et 6,3 %
     * salariale, en dur. La base compte pourtant des clients sénégalais
     * (IPRES + CSS) et béninois (CNSS), dont les caisses, taux et plafonds
     * diffèrent — leur déclaration sociale était donc silencieusement fausse.
     *
     * Les taux viennent désormais du référentiel `payroll_contribution_rules`,
     * par pays et par date d'effet. Si un pays n'y est pas paramétré, le calcul
     * REFUSE de s'exécuter : une déclaration absente se corrige, une
     * déclaration fausse se découvre au contrôle.
     */
    private function calcCotisationsSociales(array $totals, Organization $org, Carbon $start, Carbon $end): array
    {
        $salaireBrut = $this->sumAccounts($totals, ['661', '663']);

        $referentiel = app(\App\Services\PayrollRuleService::class);
        $pays = $referentiel->paysDe($org);

        // Lève une exception explicite si le pays n'est pas couvert.
        $calcul = $referentiel->calculerCotisations($salaireBrut, $pays, $end);

        return [
            'type'          => 'COTISATIONS_SOCIALES',
            'country'       => $pays,
            'scheme'        => $calcul['scheme'],
            'period'        => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'salaire_brut'  => $salaireBrut,
            'cotisation_patronale' => $calcul['employer'],
            'cotisation_salariale' => $calcul['employee'],
            'total_a_verser'=> $calcul['total'],
            'branches'      => $calcul['branches'],
            'is_verified'   => $calcul['is_verified'],
            'note'          => $calcul['is_verified']
                ? "Taux {$calcul['scheme']} ({$pays}) confirmés sur texte officiel."
                : "⚠️ Taux {$calcul['scheme']} ({$pays}) NON confirmés sur texte officiel : "
                  . "à vérifier avant dépôt de la déclaration.",
        ];
    }

    // =========================================================================
    // GRAND LIVRE
    // =========================================================================

    /**
     * Grand livre d'un compte sur une période.
     *
     * @return array{
     *   account_number: string,
     *   account_name: string,
     *   report_a_nouveau: float,
     *   lines: array,
     *   solde_final: float
     * }
     */
    public function generateGeneralLedger(
        Organization $org,
        string       $accountNumber,
        Carbon       $start,
        Carbon       $end
    ): array {
        // Report à nouveau : toutes les écritures AVANT la période
        $ran = DB::table('journal_lines as jl')
            ->join('journal_entries as je', 'jl.journal_entry_id', '=', 'je.id')
            ->where('je.organization_id', $org->id)
            ->where('jl.account_number', $accountNumber)
            ->where('je.entry_date', '<', $start->toDateString())
            ->selectRaw('SUM(jl.debit_amount) - SUM(jl.credit_amount) as solde')
            ->value('solde') ?? 0;

        // Écritures de la période
        $lines = DB::table('journal_lines as jl')
            ->join('journal_entries as je', 'jl.journal_entry_id', '=', 'je.id')
            ->where('je.organization_id', $org->id)
            ->where('jl.account_number', $accountNumber)
            ->whereBetween('je.entry_date', [$start->toDateString(), $end->toDateString()])
            ->select(
                'je.entry_date',
                'je.entry_number',
                'je.journal_type',
                'je.reference',
                'jl.description',
                'jl.debit_amount',
                'jl.credit_amount',
                'jl.lettering_code',
                'jl.id as line_id'
            )
            ->orderBy('je.entry_date')
            ->orderBy('je.entry_number')
            ->get();

        // Calcul solde progressif
        $solde       = (float) $ran;
        $linesWithSolde = $lines->map(function ($l) use (&$solde) {
            $solde += (float) $l->debit_amount - (float) $l->credit_amount;
            return array_merge((array) $l, ['solde_cumul' => $solde]);
        })->values()->toArray();

        $account = ChartOfAccount::where('organization_id', $org->id)
            ->where('account_number', $accountNumber)
            ->first();

        return [
            'account_number'   => $accountNumber,
            'account_name'     => $account?->account_name ?? $accountNumber,
            'account_type'     => $account?->account_type ?? '',
            'period'           => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'report_a_nouveau' => (float) $ran,
            'lines'            => $linesWithSolde,
            'solde_final'      => $solde,
            'total_debit'      => $lines->sum('debit_amount'),
            'total_credit'     => $lines->sum('credit_amount'),
        ];
    }

    // =========================================================================
    // CLÔTURE D'EXERCICE
    // =========================================================================

    /**
     * Clôture automatique de l'exercice fiscal.
     *
     * Étapes :
     *   1. Calcul du résultat net (produits - charges)
     *   2. Écriture de clôture : classes 6 et 7 → compte 12x
     *   3. Verrouillage de toutes les écritures non validées
     *   4. Passage exercice en statut "closed"
     */
    public function closeFiscalYear(FiscalYear $fy, User $closingUser): void
    {
        if ($fy->status === 'closed') {
            throw new RuntimeException("L'exercice {$fy->name} est déjà clôturé.");
        }

        $org   = Organization::findOrFail($fy->organization_id);
        $start = Carbon::parse($fy->start_date);
        $end   = Carbon::parse($fy->end_date);
        $totals= $this->getAccountTotals($org->id, $start, $end);

        DB::transaction(function () use ($fy, $org, $end, $totals, $closingUser) {

            // --- Passe exercice en "closing" ---
            $fy->update(['status' => 'closing']);

            // --- Calcul résultat net ---
            $totalProduits = $this->sumAccountsByClass($totals, [7]);
            $totalCharges  = $this->sumAccountsByClass($totals, [6]);
            $resultatNet   = $totalProduits - $totalCharges;

            // --- Écriture de clôture des charges (classe 6) ---
            $chargesLines  = $this->buildClosingLines($totals, [6], false); // crédit les charges
            $chargesLines[] = [
                'account_number' => $resultatNet >= 0 ? '120' : '129',
                'debit_amount'   => $resultatNet >= 0 ? $resultatNet : 0,
                'credit_amount'  => $resultatNet < 0  ? abs($resultatNet) : 0,
                'description'    => 'Résultat net de clôture',
            ];

            if (! empty($chargesLines)) {
                $this->createJournalEntry([
                    'organization_id' => $org->id,
                    'entry_date'      => $end->toDateString(),
                    'description'     => "Clôture charges exercice {$fy->name}",
                    'journal_type'    => 'OD',
                    'fiscal_year_id'  => $fy->id,
                    'created_by'      => $closingUser->id,
                    'lines'           => $chargesLines,
                ]);
            }

            // --- Écriture de clôture des produits (classe 7) ---
            $produitsLines  = $this->buildClosingLines($totals, [7], true); // débite les produits
            $produitsLines[] = [
                'account_number' => $resultatNet >= 0 ? '120' : '129',
                'debit_amount'   => $resultatNet < 0  ? abs($resultatNet) : 0,
                'credit_amount'  => $resultatNet >= 0 ? $resultatNet : 0,
                'description'    => 'Contrepartie résultat net',
            ];

            if (! empty($produitsLines)) {
                $this->createJournalEntry([
                    'organization_id' => $org->id,
                    'entry_date'      => $end->toDateString(),
                    'description'     => "Clôture produits exercice {$fy->name}",
                    'journal_type'    => 'OD',
                    'fiscal_year_id'  => $fy->id,
                    'created_by'      => $closingUser->id,
                    'lines'           => $produitsLines,
                ]);
            }

            // --- Verrouillage de toutes les écritures non validées ---
            JournalEntry::where('organization_id', $org->id)
                ->where('fiscal_year_id', $fy->id)
                ->where('is_locked', false)
                ->update([
                    'is_locked'    => true,
                    'validated_by' => $closingUser->id,
                    'validated_at' => now(),
                ]);

            // --- Fermeture exercice ---
            $fy->update([
                'status'    => 'closed',
                'closed_at' => now(),
            ]);

            Log::info('SyscohadaService: exercice clôturé', [
                'fiscal_year' => $fy->name,
                'resultat_net'=> $resultatNet,
                'closed_by'   => $closingUser->id,
            ]);
        });
    }

    // =========================================================================
    // LETTRAGE (RAPPROCHEMENT DE COMPTES)
    // =========================================================================

    /**
     * Lettrage automatique des écritures d'un compte (ex : 411 Clients).
     * Appaire les lignes Débit / Crédit de même montant qui ne sont pas encore lettrées.
     */
    public function reconcileAccount(Organization $org, string $accountNumber): array
    {
        $lines = JournalLine::whereHas('journalEntry', fn($q) =>
                $q->where('organization_id', $org->id)
            )
            ->where('account_number', $accountNumber)
            ->whereNull('lettering_code')
            ->get();

        $debits  = $lines->where('debit_amount',  '>', 0)->keyBy(fn($l) => round($l->debit_amount, 2));
        $credits = $lines->where('credit_amount', '>', 0)->keyBy(fn($l) => round($l->credit_amount, 2));

        $lettered = [];
        $letter   = 'AA';

        foreach ($debits as $amount => $debitLine) {
            if (isset($credits[$amount])) {
                $creditLine = $credits[$amount];

                $debitLine->update(['lettering_code' => $letter]);
                $creditLine->update(['lettering_code' => $letter]);

                $lettered[] = [
                    'letter'      => $letter,
                    'amount'      => $amount,
                    'debit_line'  => $debitLine->id,
                    'credit_line' => $creditLine->id,
                ];

                unset($credits[$amount]);
                $letter = $this->nextLetter($letter);
            }
        }

        return [
            'account_number' => $accountNumber,
            'pairs_found'    => count($lettered),
            'lettered'       => $lettered,
        ];
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    /** Génère un numéro d'écriture unique : JNL-YYYY-XXXXX */
    private function generateEntryNumber(int $orgId): string
    {
        $year  = now()->year;
        $count = JournalEntry::where('organization_id', $orgId)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('JNL-%d-%05d', $year, $count);
    }

    /**
     * Récupère les soldes (débit - crédit) par numéro de compte pour une période.
     * @return array<string, float>
     */
    private function getAccountTotals(int $orgId, Carbon $start, Carbon $end): array
    {
        $rows = DB::table('journal_lines as jl')
            ->join('journal_entries as je', 'jl.journal_entry_id', '=', 'je.id')
            ->where('je.organization_id', $orgId)
            ->whereBetween('je.entry_date', [$start->toDateString(), $end->toDateString()])
            ->select(
                'jl.account_number',
                DB::raw('SUM(jl.debit_amount) - SUM(jl.credit_amount) as solde')
            )
            ->groupBy('jl.account_number')
            ->get();

        $result = [];
        foreach ($rows as $row) {
            $result[$row->account_number] = (float) $row->solde;
        }

        return $result;
    }

    /**
     * Somme les soldes d'une liste de numéros de comptes.
     * Prend la valeur absolue pour les comptes créditeurs (passif, capitaux, produits).
     */
    private function sumAccounts(array $totals, array $accounts): float
    {
        $sum = 0.0;
        foreach ($accounts as $acc) {
            if (isset($totals[$acc])) {
                $sum += abs($totals[$acc]);
            }
        }

        return $sum;
    }

    /** Somme par classe SYSCOHADA (1–9). */
    private function sumAccountsByClass(array $totals, array $classes): float
    {
        $sum = 0.0;
        foreach ($totals as $acc => $solde) {
            $class = (int) substr((string) $acc, 0, 1);
            if (in_array($class, $classes, true)) {
                $sum += abs($solde);
            }
        }

        return $sum;
    }

    /**
     * Construit les lignes de clôture pour une classe.
     * @param bool $debit true = on débite (produits), false = on crédite (charges)
     */
    private function buildClosingLines(array $totals, array $classes, bool $debit): array
    {
        $lines = [];
        foreach ($totals as $acc => $solde) {
            if (abs($solde) < 0.01) {
                continue;
            }
            $class = (int) substr((string) $acc, 0, 1);
            if (! in_array($class, $classes, true)) {
                continue;
            }
            if ($debit) {
                $lines[] = [
                    'account_number' => $acc,
                    'debit_amount'   => abs($solde),
                    'credit_amount'  => 0,
                    'description'    => 'Écriture de clôture',
                ];
            } else {
                $lines[] = [
                    'account_number' => $acc,
                    'debit_amount'   => 0,
                    'credit_amount'  => abs($solde),
                    'description'    => 'Écriture de clôture',
                ];
            }
        }

        return $lines;
    }

    /** Passe au code lettrage suivant (AA → AB → … → AZ → BA → …) */
    private function nextLetter(string $current): string
    {
        if (strlen($current) !== 2) {
            return 'AA';
        }

        [$first, $second] = str_split($current);
        if ($second < 'Z') {
            return $first . chr(ord($second) + 1);
        }

        return chr(ord($first) + 1) . 'A';
    }
}
