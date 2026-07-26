<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\BudgetAlert;
use App\Models\BudgetLine;
use App\Models\BudgetRevision;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * BudgetService — Gestion budgétaire SECRETIS ERP
 *
 * Couvre : création, approbation, révision, réels SYSCOHADA,
 * analyse des écarts, prévisions, alertes, import/export.
 */
class BudgetService
{
    // =========================================================================
    // CRÉATION
    // =========================================================================

    /**
     * Crée un budget avec ses lignes budgétaires.
     *
     * @param  array $data {
     *   organization_id, name, fiscal_year_id, type, notes, created_by,
     *   lines: [{ account_number, account_name, department_id?, project_id?,
     *             description?, q1_amount, q2_amount, q3_amount, q4_amount,
     *             is_income, category }]
     * }
     */
    public function createBudget(array $data): Budget
    {
        return DB::transaction(function () use ($data) {
            $lines = $data['lines'] ?? [];

            $totalAmount = collect($lines)->sum(fn($l) =>
                ($l['q1_amount'] ?? 0) + ($l['q2_amount'] ?? 0)
              + ($l['q3_amount'] ?? 0) + ($l['q4_amount'] ?? 0)
            );

            $budget = Budget::create([
                'organization_id' => $data['organization_id'],
                'name'            => $data['name'],
                'fiscal_year_id'  => $data['fiscal_year_id'] ?? null,
                'type'            => $data['type'] ?? 'operationnel',
                'status'          => 'draft',
                'total_amount'    => $totalAmount,
                'notes'           => $data['notes'] ?? null,
                'created_by'      => $data['created_by'] ?? null,
            ]);

            foreach ($lines as $line) {
                $this->createBudgetLine($budget, $line);
            }

            return $budget->refresh();
        });
    }

    /**
     * Crée ou met à jour une ligne budgétaire et recalcule le total du budget.
     */
    public function createBudgetLine(Budget $budget, array $line): BudgetLine
    {
        $q1 = (float) ($line['q1_amount'] ?? 0);
        $q2 = (float) ($line['q2_amount'] ?? 0);
        $q3 = (float) ($line['q3_amount'] ?? 0);
        $q4 = (float) ($line['q4_amount'] ?? 0);

        $bl = BudgetLine::create([
            'budget_id'      => $budget->id,
            'account_number' => $line['account_number'],
            'account_name'   => $line['account_name'],
            'department_id'  => $line['department_id'] ?? null,
            'project_id'     => $line['project_id'] ?? null,
            'description'    => $line['description'] ?? null,
            'q1_amount'      => $q1,
            'q2_amount'      => $q2,
            'q3_amount'      => $q3,
            'q4_amount'      => $q4,
            'annual_amount'  => $q1 + $q2 + $q3 + $q4,
            'is_income'      => (bool) ($line['is_income'] ?? false),
            'category'       => $line['category'] ?? 'fonctionnement',
        ]);

        $this->recalcBudgetTotal($budget);

        return $bl;
    }

    /**
     * Recalcule le total du budget depuis ses lignes.
     */
    private function recalcBudgetTotal(Budget $budget): void
    {
        $total = BudgetLine::where('budget_id', $budget->id)->sum('annual_amount');
        $budget->update(['total_amount' => $total]);
    }

    // =========================================================================
    // APPROBATION
    // =========================================================================

    /**
     * Approuve un budget et le gèle en status "active".
     *
     * @throws \Exception si le budget n'est pas en statut approvable
     */
    public function approveBudget(Budget $budget, User $approver): void
    {
        if (! in_array($budget->status, ['draft', 'approved'])) {
            throw new \Exception("Ce budget ne peut pas être approuvé (statut actuel : {$budget->status}).");
        }

        $budget->update([
            'status'      => 'active',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        Log::info("Budget #{$budget->id} approuvé par user#{$approver->id}");
    }

    // =========================================================================
    // RÉVISION
    // =========================================================================

    /**
     * Crée une révision budgétaire avec snapshot des lignes actuelles.
     *
     * @param  array  $changes  [['line_id' => X, 'q1_amount' => Y, ...], ...]
     * @param  string $reason   Motif obligatoire
     * @throws \Exception
     */
    public function reviseBudget(Budget $budget, array $changes, string $reason): BudgetRevision
    {
        if (empty(trim($reason))) {
            throw new \Exception("Le motif de révision est obligatoire.");
        }

        return DB::transaction(function () use ($budget, $changes, $reason) {
            // Snapshot des lignes avant modification
            $previousLines = BudgetLine::where('budget_id', $budget->id)
                ->get()
                ->toArray();

            // Numéro de révision
            $revisionNumber = BudgetRevision::where('budget_id', $budget->id)->count() + 1;

            // Appliquer les modifications
            foreach ($changes as $change) {
                $line = BudgetLine::find($change['line_id'] ?? null);
                if (! $line || $line->budget_id !== $budget->id) continue;

                $q1 = (float) ($change['q1_amount'] ?? $line->q1_amount);
                $q2 = (float) ($change['q2_amount'] ?? $line->q2_amount);
                $q3 = (float) ($change['q3_amount'] ?? $line->q3_amount);
                $q4 = (float) ($change['q4_amount'] ?? $line->q4_amount);

                $line->update([
                    'q1_amount'     => $q1,
                    'q2_amount'     => $q2,
                    'q3_amount'     => $q3,
                    'q4_amount'     => $q4,
                    'annual_amount' => $q1 + $q2 + $q3 + $q4,
                ]);
            }

            $this->recalcBudgetTotal($budget);

            $revision = BudgetRevision::create([
                'budget_id'       => $budget->id,
                'revision_number' => $revisionNumber,
                'reason'          => $reason,
                'previous_lines'  => $previousLines,
                'revised_by'      => auth()->id(),
                'revised_at'      => now(),
            ]);

            return $revision;
        });
    }

    // =========================================================================
    // RÉELS COMPTABLES (SYSCOHADA)
    // =========================================================================

    /**
     * Récupère les chiffres réels depuis les journaux comptables SYSCOHADA
     * par compte, groupés par trimestre.
     *
     * Cherche dans la table `accounting_entries` (ou `journal_lines` selon votre
     * modèle comptable). Retourne un tableau indexé par account_number → [q1, q2, q3, q4, ytd].
     *
     * @return array<string, array{q1: float, q2: float, q3: float, q4: float, ytd: float}>
     */
    public function getActuals(Budget $budget): array
    {
        $year = $this->getBudgetYear($budget);

        // Tenter de lire depuis le cache d'abord
        $cached = DB::table('actuals_cache')
            ->where('budget_id', $budget->id)
            ->where('period_year', $year)
            ->get();

        if ($cached->isNotEmpty()) {
            return $this->aggregateCacheToQuarters($cached);
        }

        // Fallback : lire depuis les journaux comptables
        return $this->fetchActualsFromJournal($budget, $year);
    }

    /**
     * Agrège les réels cachés (par mois) en trimestres.
     */
    private function aggregateCacheToQuarters(Collection $cache): array
    {
        $result = [];
        foreach ($cache as $row) {
            $acc = $row->account_number;
            $result[$acc] ??= ['q1' => 0, 'q2' => 0, 'q3' => 0, 'q4' => 0, 'ytd' => 0];
            $quarter = $this->monthToQuarter((int) $row->period_month);
            $result[$acc]["q{$quarter}"] += (float) $row->actual_amount;
            $result[$acc]['ytd'] += (float) $row->actual_amount;
        }
        return $result;
    }

    /**
     * Lit les réels depuis accounting_journal_lines (structure SYSCOHADA).
     * Adapte la requête à votre schéma comptable réel.
     */
    private function fetchActualsFromJournal(Budget $budget, int $year): array
    {
        // Requête générique — adapte les noms de table/colonnes à votre schéma
        $rows = DB::table('accounting_journal_lines as jl')
            ->join('accounting_journal_entries as je', 'je.id', '=', 'jl.entry_id')
            ->where('je.organization_id', $budget->organization_id)
            ->whereYear('je.entry_date', $year)
            ->whereNotNull('jl.account_number')
            ->selectRaw('
                jl.account_number,
                EXTRACT(MONTH FROM je.entry_date) AS period_month,
                SUM(jl.debit - jl.credit) AS net_amount
            ')
            ->groupByRaw('jl.account_number, EXTRACT(MONTH FROM je.entry_date)')
            ->get();

        $result = [];
        foreach ($rows as $row) {
            $acc = $row->account_number;
            $result[$acc] ??= ['q1' => 0, 'q2' => 0, 'q3' => 0, 'q4' => 0, 'ytd' => 0];
            $q = $this->monthToQuarter((int) $row->period_month);
            $result[$acc]["q{$q}"] += (float) $row->net_amount;
            $result[$acc]['ytd'] += (float) $row->net_amount;
        }

        // Persister en cache
        $this->persistActualsCache($budget, $rows, $year);

        return $result;
    }

    /**
     * Met à jour le cache des réels.
     */
    private function persistActualsCache(Budget $budget, Collection $rows, int $year): void
    {
        foreach ($rows as $row) {
            DB::table('actuals_cache')->upsert([
                'organization_id' => $budget->organization_id,
                'budget_id'       => $budget->id,
                'account_number'  => $row->account_number,
                'period_month'    => (int) $row->period_month,
                'period_year'     => $year,
                'actual_amount'   => (float) $row->net_amount,
                'updated_at'      => now(),
            ], ['budget_id', 'account_number', 'period_month', 'period_year'], ['actual_amount', 'updated_at']);
        }
    }

    // =========================================================================
    // ANALYSE DES ÉCARTS
    // =========================================================================

    /**
     * Analyse complète Budget vs Réel avec consolidations.
     *
     * Retourne :
     * - lines  : tableau par ligne budgétaire avec écarts Q1-Q4 + YTD
     * - by_department : consolidation par département
     * - by_category   : consolidation par catégorie
     * - by_project    : consolidation par projet
     * - alerts        : lignes avec dépassement ou à risque
     *
     * @return array{
     *   lines: array,
     *   by_department: array,
     *   by_category: array,
     *   by_project: array,
     *   alerts: array,
     *   summary: array
     * }
     */
    public function getVarianceAnalysis(Budget $budget): array
    {
        $actuals = $this->getActuals($budget);
        $lines   = BudgetLine::where('budget_id', $budget->id)
            ->with(['department:id,name'])
            ->get();

        $lineResults    = [];
        $byDepartment   = [];
        $byCategory     = [];
        $byProject      = [];
        $alerts         = [];

        $totalBudget    = 0;
        $totalActual    = 0;

        foreach ($lines as $line) {
            $acc = $line->account_number;
            $actual = $actuals[$acc] ?? ['q1' => 0, 'q2' => 0, 'q3' => 0, 'q4' => 0, 'ytd' => 0];

            $budgeted = (float) $line->annual_amount;
            $realYtd  = (float) $actual['ytd'];
            $variance = $budgeted - $realYtd;  // positif = sous-réalisation charge
            $pct      = $budgeted != 0 ? round(($realYtd / $budgeted) * 100, 2) : 0;

            // Statut favorable/défavorable selon nature (charge vs produit)
            if ($line->is_income) {
                // Produit : favorable si réel >= budget
                $status = $realYtd >= $budgeted ? 'favorable' : 'défavorable';
            } else {
                // Charge : favorable si réel <= budget
                $status = $realYtd <= $budgeted ? 'favorable' : 'défavorable';
            }

            $row = [
                'id'             => $line->id,
                'account_number' => $acc,
                'account_name'   => $line->account_name,
                'department'     => $line->department?->name,
                'department_id'  => $line->department_id,
                'project_id'     => $line->project_id,
                'category'       => $line->category,
                'is_income'      => $line->is_income,
                'budgeted_q1'    => (float) $line->q1_amount,
                'budgeted_q2'    => (float) $line->q2_amount,
                'budgeted_q3'    => (float) $line->q3_amount,
                'budgeted_q4'    => (float) $line->q4_amount,
                'budgeted'       => $budgeted,
                'actual_q1'      => (float) $actual['q1'],
                'actual_q2'      => (float) $actual['q2'],
                'actual_q3'      => (float) $actual['q3'],
                'actual_q4'      => (float) $actual['q4'],
                'actual_ytd'     => $realYtd,
                'variance'       => $variance,
                'variance_pct'   => $pct,
                'consumption_pct'=> $pct,
                'status'         => $status,
            ];

            $lineResults[] = $row;

            // Consolidation département
            if ($line->department_id) {
                $deptKey = $line->department_id;
                $deptName = $line->department?->name ?? 'N/A';
                $byDepartment[$deptKey] ??= ['name' => $deptName, 'budgeted' => 0, 'actual' => 0];
                $byDepartment[$deptKey]['budgeted'] += $budgeted;
                $byDepartment[$deptKey]['actual']   += $realYtd;
            }

            // Consolidation catégorie
            $cat = $line->category;
            $byCategory[$cat] ??= ['budgeted' => 0, 'actual' => 0];
            $byCategory[$cat]['budgeted'] += $budgeted;
            $byCategory[$cat]['actual']   += $realYtd;

            // Consolidation projet
            if ($line->project_id) {
                $byProject[$line->project_id] ??= ['budgeted' => 0, 'actual' => 0];
                $byProject[$line->project_id]['budgeted'] += $budgeted;
                $byProject[$line->project_id]['actual']   += $realYtd;
            }

            // Alertes dépassement
            if (! $line->is_income && $budgeted > 0 && $pct >= 80) {
                $alerts[] = [
                    'line_id'        => $line->id,
                    'account_number' => $acc,
                    'account_name'   => $line->account_name,
                    'pct'            => $pct,
                    'severity'       => $pct >= 100 ? 'exceeded' : ($pct >= 80 ? 'warning' : 'info'),
                ];
            }

            $totalBudget += $line->is_income ? 0 : $budgeted;
            $totalActual += $line->is_income ? 0 : $realYtd;
        }

        // Enrichir consolidations avec variance
        foreach ($byDepartment as &$dept) {
            $dept['variance']     = $dept['budgeted'] - $dept['actual'];
            $dept['variance_pct'] = $dept['budgeted'] ? round(($dept['actual'] / $dept['budgeted']) * 100, 2) : 0;
        }
        foreach ($byCategory as &$catData) {
            $catData['variance']     = $catData['budgeted'] - $catData['actual'];
            $catData['variance_pct'] = $catData['budgeted'] ? round(($catData['actual'] / $catData['budgeted']) * 100, 2) : 0;
        }

        return [
            'lines'         => $lineResults,
            'by_department' => array_values($byDepartment),
            'by_category'   => $byCategory,
            'by_project'    => array_values($byProject),
            'alerts'        => $alerts,
            'summary'       => [
                'total_budget'       => $totalBudget,
                'total_actual'       => $totalActual,
                'total_variance'     => $totalBudget - $totalActual,
                'consumption_pct'    => $totalBudget ? round(($totalActual / $totalBudget) * 100, 2) : 0,
                'lines_count'        => count($lineResults),
                'alerts_count'       => count($alerts),
            ],
        ];
    }

    // =========================================================================
    // PRÉVISIONS
    // =========================================================================

    /**
     * Calcule les prévisions fin d'exercice pour deux méthodes :
     *  - linear   : rythme actuel extrapolé sur les mois restants
     *  - weighted : saisonnalité basée sur N-1 (si disponible)
     *
     * @return array{
     *   method_linear: array,
     *   method_weighted: array,
     *   scenarios: array{optimistic: float, realistic: float, pessimistic: float}
     * }
     */
    public function getForecast(Budget $budget): array
    {
        $actuals   = $this->getActuals($budget);
        $lines     = BudgetLine::where('budget_id', $budget->id)->get();
        $now       = Carbon::now();
        $yearStart = Carbon::create($now->year, 1, 1);
        $elapsed   = $yearStart->diffInMonths($now) + 1; // mois écoulés
        $remaining = 12 - $elapsed;

        $linearLines   = [];
        $weightedLines = [];
        $totalForecastLinear   = 0;
        $totalForecastWeighted = 0;

        foreach ($lines as $line) {
            $acc     = $line->account_number;
            $ytd     = (float) ($actuals[$acc]['ytd'] ?? 0);
            $budget  = (float) $line->annual_amount;

            // Méthode linéaire : rythme mensuel moyen x 12
            $monthlyRate   = $elapsed > 0 ? $ytd / $elapsed : 0;
            $forecastLinear = $ytd + ($monthlyRate * $remaining);

            // Méthode pondérée : répartition trimestrielle N-1 comme pondération
            // Ici on simule avec la répartition budgétée comme proxy de saisonnalité
            $q1w = $line->q1_amount / max($budget, 1);
            $q2w = $line->q2_amount / max($budget, 1);
            $q3w = $line->q3_amount / max($budget, 1);
            $q4w = $line->q4_amount / max($budget, 1);

            // Calcul pondéré basé sur la part de l'exercice restante
            $remainingWeight = $this->getRemainingQuarterWeight($elapsed, $q3w, $q4w);
            $forecastWeighted = $ytd + ($budget * $remainingWeight);

            $row = [
                'line_id'        => $line->id,
                'account_number' => $acc,
                'account_name'   => $line->account_name,
                'budgeted'       => $budget,
                'actual_ytd'     => $ytd,
                'elapsed_months' => $elapsed,
            ];

            $linearLines[]   = array_merge($row, ['forecast' => round($forecastLinear, 2), 'variance' => round($budget - $forecastLinear, 2)]);
            $weightedLines[]  = array_merge($row, ['forecast' => round($forecastWeighted, 2), 'variance' => round($budget - $forecastWeighted, 2)]);

            $totalForecastLinear   += $forecastLinear;
            $totalForecastWeighted += $forecastWeighted;
        }

        $realistic = ($totalForecastLinear + $totalForecastWeighted) / 2;

        return [
            'method_linear'   => ['lines' => $linearLines,   'total_forecast' => round($totalForecastLinear, 2)],
            'method_weighted' => ['lines' => $weightedLines,  'total_forecast' => round($totalForecastWeighted, 2)],
            'elapsed_months'  => $elapsed,
            'remaining_months'=> $remaining,
            'scenarios'       => [
                'optimistic'  => round($realistic * 0.90, 2),
                'realistic'   => round($realistic, 2),
                'pessimistic' => round($realistic * 1.10, 2),
            ],
        ];
    }

    private function getRemainingQuarterWeight(int $elapsed, float $q3w, float $q4w): float
    {
        if ($elapsed <= 6) return $q3w + $q4w; // Q3 + Q4 restants
        if ($elapsed <= 9) return $q4w;         // Q4 reste
        return 0.0;
    }

    // =========================================================================
    // ALERTES
    // =========================================================================

    /**
     * Vérifie les seuils d'alertes budgétaires et notifie les utilisateurs concernés.
     */
    public function checkAlerts(Budget $budget): void
    {
        $actuals = $this->getActuals($budget);

        $activeAlerts = BudgetAlert::where('is_active', true)
            ->whereHas('budgetLine', fn($q) => $q->where('budget_id', $budget->id))
            ->with('budgetLine')
            ->get();

        foreach ($activeAlerts as $alert) {
            $line   = $alert->budgetLine;
            $acc    = $line->account_number;
            $ytd    = (float) ($actuals[$acc]['ytd'] ?? 0);
            $budget_amount = (float) $line->annual_amount;

            if ($budget_amount <= 0) continue;

            $pct = ($ytd / $budget_amount) * 100;

            if ($pct >= $alert->threshold_percent) {
                $this->sendAlert($alert, $line, $pct, $budget);
            }
        }
    }

    private function sendAlert(BudgetAlert $alert, BudgetLine $line, float $pct, Budget $budget): void
    {
        $userIds = $alert->notification_user_ids ?? [];
        if (empty($userIds)) return;

        $users = \App\Models\User::whereIn('id', $userIds)->get();
        $msg   = "Alerte budget — {$line->account_name} ({$line->account_number}) : "
               . round($pct, 1) . "% consommé (seuil : {$alert->threshold_percent}%).";

        foreach ($users as $user) {
            try {
                // Notification in-app via NotificationService
                app(NotificationService::class)->send($user, 'budget_alert', $msg, [
                    'budget_id'      => $budget->id,
                    'budget_line_id' => $line->id,
                    'pct'            => $pct,
                ]);
            } catch (\Throwable $e) {
                Log::warning("Alerte budget non envoyée à {$user->email}: " . $e->getMessage());
            }
        }
    }

    // =========================================================================
    // EXPORT CSV
    // =========================================================================

    /**
     * Génère un fichier CSV multi-sections et retourne son chemin dans storage.
     */
    public function exportBudgetExcel(Budget $budget): string
    {
        $variance = $this->getVarianceAnalysis($budget);
        $lines    = $variance['lines'];

        $rows = [];
        // En-tête
        $rows[] = ['Budget : ' . $budget->name, '', '', '', '', '', '', '', ''];
        $rows[] = ['Compte', 'Libellé', 'Catégorie', 'Q1 Budg.', 'Q2 Budg.', 'Q3 Budg.', 'Q4 Budg.', 'Annuel Budg.', 'Réel YTD', 'Écart', 'Écart %', 'Statut'];

        foreach ($lines as $l) {
            $rows[] = [
                $l['account_number'],
                $l['account_name'],
                $l['category'],
                $l['budgeted_q1'],
                $l['budgeted_q2'],
                $l['budgeted_q3'],
                $l['budgeted_q4'],
                $l['budgeted'],
                $l['actual_ytd'],
                $l['variance'],
                $l['variance_pct'] . '%',
                $l['status'],
            ];
        }

        $rows[] = [];
        $rows[] = ['CONSOLIDATION PAR CATÉGORIE', '', '', '', '', '', '', '', '', '', '', ''];
        $rows[] = ['Catégorie', 'Budgété', 'Réel', 'Écart', 'Écart %'];
        foreach ($variance['by_category'] as $cat => $data) {
            $rows[] = [$cat, $data['budgeted'], $data['actual'], $data['variance'], $data['variance_pct'] . '%'];
        }

        $csv      = '';
        foreach ($rows as $row) {
            $csv .= implode(';', array_map(fn($v) => '"' . str_replace('"', '""', (string) $v) . '"', $row)) . "\n";
        }

        $path = "budgets/export_budget_{$budget->id}_" . now()->format('Ymd_His') . '.csv';
        Storage::put($path, "\xEF\xBB\xBF" . $csv); // BOM UTF-8 pour Excel

        return $path;
    }

    // =========================================================================
    // IMPORT CSV
    // =========================================================================

    /**
     * Importe un budget depuis un fichier CSV.
     *
     * Format attendu (avec en-tête) :
     *   account_number;account_name;category;is_income;q1;q2;q3;q4;department_id;project_id;description
     */
    public function importBudgetFromCsv(string $filePath, Organization $org): Budget
    {
        if (! file_exists($filePath)) {
            throw new \Exception("Fichier introuvable : {$filePath}");
        }

        $lines   = [];
        $handle  = fopen($filePath, 'r');
        $header  = fgetcsv($handle, 0, ';');

        if (! $header) {
            throw new \Exception("Fichier CSV vide ou invalide.");
        }

        // Normaliser l'en-tête (retirer BOM)
        $header[0] = ltrim($header[0], "\xEF\xBB\xBF");

        $headerMap = array_flip(array_map('trim', $header));

        $requiredCols = ['account_number', 'account_name', 'q1', 'q2', 'q3', 'q4'];
        foreach ($requiredCols as $col) {
            if (! isset($headerMap[$col])) {
                throw new \Exception("Colonne manquante dans le CSV : {$col}");
            }
        }

        $rowNum = 1;
        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            $rowNum++;
            if (count($row) < count($header)) continue;

            $mapped = [];
            foreach ($header as $i => $col) {
                $mapped[trim($col)] = trim($row[$i] ?? '');
            }

            $q1 = (float) str_replace(',', '.', $mapped['q1'] ?? '0');
            $q2 = (float) str_replace(',', '.', $mapped['q2'] ?? '0');
            $q3 = (float) str_replace(',', '.', $mapped['q3'] ?? '0');
            $q4 = (float) str_replace(',', '.', $mapped['q4'] ?? '0');

            $lines[] = [
                'account_number' => $mapped['account_number'],
                'account_name'   => $mapped['account_name'],
                'category'       => $mapped['category'] ?? 'fonctionnement',
                'is_income'      => in_array(strtolower($mapped['is_income'] ?? ''), ['1', 'true', 'oui', 'yes']),
                'q1_amount'      => $q1,
                'q2_amount'      => $q2,
                'q3_amount'      => $q3,
                'q4_amount'      => $q4,
                'department_id'  => $mapped['department_id'] ?: null,
                'project_id'     => $mapped['project_id'] ?: null,
                'description'    => $mapped['description'] ?? null,
            ];
        }
        fclose($handle);

        if (empty($lines)) {
            throw new \Exception("Le fichier CSV ne contient aucune ligne de données.");
        }

        return $this->createBudget([
            'organization_id' => $org->id,
            'name'            => 'Import CSV — ' . now()->format('d/m/Y H:i'),
            'type'            => 'operationnel',
            'created_by'      => auth()->id(),
            'lines'           => $lines,
        ]);
    }

    // =========================================================================
    // DASHBOARD KPIs
    // =========================================================================

    /**
     * Retourne les KPIs globaux pour le tableau de bord budgétaire.
     *
     * @return array{
     *   total_approved: float,
     *   total_consumed: float,
     *   total_remaining: float,
     *   execution_pct: float,
     *   budgets_by_status: array,
     *   top_lines_consumed: array,
     *   monthly_progression: array,
     *   active_alerts_count: int
     * }
     */
    public function getBudgetDashboard(Organization $org, mixed $fiscalYear = null): array
    {
        $query = Budget::where('organization_id', $org->id)
                       ->whereIn('status', ['active', 'approved']);

        if ($fiscalYear) {
            $query->where('fiscal_year_id', $fiscalYear instanceof \Illuminate\Database\Eloquent\Model
                ? $fiscalYear->id
                : $fiscalYear);
        }

        $budgets = $query->with('lines')->get();

        $totalApproved = 0;
        $totalConsumed = 0;
        $topLines      = [];
        $monthlyData   = array_fill(1, 12, ['budget' => 0, 'actual' => 0]);

        foreach ($budgets as $budget) {
            $actuals = $this->getActuals($budget);

            foreach ($budget->lines as $line) {
                $acc    = $line->account_number;
                $ytd    = (float) ($actuals[$acc]['ytd'] ?? 0);
                $annual = (float) $line->annual_amount;
                $pct    = $annual > 0 ? round(($ytd / $annual) * 100, 1) : 0;

                if (! $line->is_income) {
                    $totalApproved += $annual;
                    $totalConsumed += $ytd;

                    $topLines[] = [
                        'account_number' => $acc,
                        'account_name'   => $line->account_name,
                        'budgeted'       => $annual,
                        'actual'         => $ytd,
                        'pct'            => $pct,
                    ];

                    // Répartition mensuelle budget (équirépartition trimestrielle)
                    for ($m = 1; $m <= 12; $m++) {
                        $q = $this->monthToQuarter($m);
                        $monthlyData[$m]['budget'] += (float) $line->{"q{$q}_amount"} / 3;
                    }
                    // Répartition mensuelle réels
                    $cached = DB::table('actuals_cache')
                        ->where('budget_id', $budget->id)
                        ->where('account_number', $acc)
                        ->get();
                    foreach ($cached as $c) {
                        $monthlyData[(int) $c->period_month]['actual'] += (float) $c->actual_amount;
                    }
                }
            }
        }

        // Top 10 lignes consommées
        usort($topLines, fn($a, $b) => $b['pct'] <=> $a['pct']);
        $topLines = array_slice($topLines, 0, 10);

        // Progression cumulative
        $cumBudget  = 0;
        $cumActual  = 0;
        $monthly    = [];
        for ($m = 1; $m <= 12; $m++) {
            $cumBudget += $monthlyData[$m]['budget'];
            $cumActual += $monthlyData[$m]['actual'];
            $monthly[] = [
                'month'      => $m,
                'budget'     => round($cumBudget, 2),
                'actual'     => round($cumActual, 2),
            ];
        }

        $activeAlerts = BudgetAlert::where('organization_id', $org->id)
                                   ->where('is_active', true)
                                   ->count();

        $totalRemaining = $totalApproved - $totalConsumed;
        $executionPct   = $totalApproved > 0 ? round(($totalConsumed / $totalApproved) * 100, 2) : 0;

        $byStatus = Budget::where('organization_id', $org->id)
            ->selectRaw('status, COUNT(*) as count, SUM(total_amount) as total')
            ->groupBy('status')
            ->get();

        return [
            'total_approved'      => round($totalApproved, 2),
            'total_consumed'      => round($totalConsumed, 2),
            'total_remaining'     => round($totalRemaining, 2),
            'execution_pct'       => $executionPct,
            'budgets_by_status'   => $byStatus,
            'top_lines_consumed'  => $topLines,
            'monthly_progression' => $monthly,
            'active_alerts_count' => $activeAlerts,
        ];
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function monthToQuarter(int $month): int
    {
        return (int) ceil($month / 3);
    }

    private function getBudgetYear(Budget $budget): int
    {
        // Tenter d'utiliser l'année de l'exercice fiscal, sinon année courante
        if ($budget->fiscal_year_id) {
            $fy = DB::table('fiscal_years')->find($budget->fiscal_year_id);
            if ($fy && isset($fy->start_date)) {
                return (int) Carbon::parse($fy->start_date)->year;
            }
        }
        return (int) now()->year;
    }
}
