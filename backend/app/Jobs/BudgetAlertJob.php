<?php

namespace App\Jobs;

use App\Models\Budget;
use App\Models\Organization;
use App\Services\BudgetService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * BudgetAlertJob — CRON mensuel (1er du mois)
 *
 * - Calcule les réels du mois écoulé
 * - Compare aux budgets ligne par ligne
 * - Envoie alertes si seuils 50%, 80%, 100% franchis
 * - Envoie rapport mensuel "État d'exécution budgétaire" aux managers DAF
 *
 * Planification (Kernel.php ou routes/console.php) :
 *   $schedule->job(new BudgetAlertJob)->monthlyOn(1, '07:00');
 */
class BudgetAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout    = 300; // 5 min max
    public int $tries      = 3;
    public int $backoff    = 60;

    // =========================================================================
    // HANDLE
    // =========================================================================

    public function handle(BudgetService $budgetService): void
    {
        Log::info('[BudgetAlertJob] Démarrage — ' . now()->toDateTimeString());

        $organizations = Organization::all();

        foreach ($organizations as $org) {
            try {
                $this->processOrganization($org, $budgetService);
            } catch (\Throwable $e) {
                Log::error("[BudgetAlertJob] Erreur org#{$org->id} ({$org->name}) : " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        Log::info('[BudgetAlertJob] Terminé — ' . now()->toDateTimeString());
    }

    // =========================================================================
    // PAR ORGANISATION
    // =========================================================================

    private function processOrganization(Organization $org, BudgetService $budgetService): void
    {
        $activeBudgets = Budget::where('organization_id', $org->id)
            ->whereIn('status', ['active', 'approved'])
            ->with('lines')
            ->get();

        if ($activeBudgets->isEmpty()) {
            Log::info("[BudgetAlertJob] Org #{$org->id} — aucun budget actif.");
            return;
        }

        $prevMonth = now()->subMonth();
        $month     = (int) $prevMonth->month;
        $year      = (int) $prevMonth->year;

        $reportData = [
            'org'    => $org,
            'month'  => $prevMonth->locale('fr')->monthName . ' ' . $year,
            'budgets'=> [],
        ];

        foreach ($activeBudgets as $budget) {
            // 1. Rafraîchir le cache des réels pour le mois écoulé
            $this->refreshActualsForMonth($budget, $month, $year);

            // 2. Vérifier les alertes
            $budgetService->checkAlerts($budget);

            // 3. Collecter données rapport
            $variance = $budgetService->getVarianceAnalysis($budget);
            $reportData['budgets'][] = [
                'name'            => $budget->name,
                'type'            => $budget->type,
                'total_budget'    => $variance['summary']['total_budget'],
                'total_actual'    => $variance['summary']['total_actual'],
                'consumption_pct' => $variance['summary']['consumption_pct'],
                'alerts_count'    => $variance['summary']['alerts_count'],
                'lines_exceeded'  => collect($variance['alerts'])->where('severity', 'exceeded')->count(),
                'lines_warning'   => collect($variance['alerts'])->where('severity', 'warning')->count(),
            ];
        }

        // 4. Envoyer le rapport mensuel aux managers DAF
        $this->sendMonthlyReport($org, $reportData);
    }

    // =========================================================================
    // REFRESH RÉELS DU MOIS ÉCOULÉ
    // =========================================================================

    private function refreshActualsForMonth(Budget $budget, int $month, int $year): void
    {
        try {
            // Recalculer les réels depuis les journaux comptables pour ce mois
            $rows = DB::table('journal_lines as jl')
                ->join('journal_entries as je', 'je.id', '=', 'jl.journal_entry_id')
                ->where('je.organization_id', $budget->organization_id)
                ->whereYear('je.entry_date', $year)
                ->whereMonth('je.entry_date', $month)
                ->whereNotNull('jl.account_number')
                ->selectRaw('jl.account_number, SUM(jl.debit_amount - jl.credit_amount) AS net_amount')
                ->groupBy('jl.account_number')
                ->get();

            foreach ($rows as $row) {
                DB::table('actuals_cache')->upsert([
                    'organization_id' => $budget->organization_id,
                    'budget_id'       => $budget->id,
                    'account_number'  => $row->account_number,
                    'period_month'    => $month,
                    'period_year'     => $year,
                    'actual_amount'   => (float) $row->net_amount,
                    'updated_at'      => now(),
                ], ['budget_id', 'account_number', 'period_month', 'period_year'], ['actual_amount', 'updated_at']);
            }

            Log::info("[BudgetAlertJob] Budget #{$budget->id} — cache réels {$month}/{$year} mis à jour ({$rows->count()} comptes).");
        } catch (\Throwable $e) {
            // Table comptable peut ne pas exister : log et continuer
            Log::warning("[BudgetAlertJob] Impossible de rafraîchir les réels (budget#{$budget->id}) : " . $e->getMessage());
        }
    }

    // =========================================================================
    // RAPPORT MENSUEL
    // =========================================================================

    private function sendMonthlyReport(Organization $org, array $reportData): void
    {
        // Destinataires : rôles DAF, admin_org
        $managers = \App\Models\User::where('organization_id', $org->id)
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['daf', 'admin_org', 'comptable_chef']))
            ->get();

        if ($managers->isEmpty()) {
            Log::info("[BudgetAlertJob] Org #{$org->id} — aucun manager DAF trouvé pour le rapport.");
            return;
        }

        foreach ($managers as $manager) {
            try {
                Mail::send([], [], function ($message) use ($manager, $org, $reportData) {
                    $message
                        ->to($manager->email, $manager->name)
                        ->subject("[{$org->name}] Rapport mensuel d'exécution budgétaire — {$reportData['month']}")
                        ->html($this->buildReportHtml($reportData, $manager));
                });

                Log::info("[BudgetAlertJob] Rapport mensuel envoyé à {$manager->email}");
            } catch (\Throwable $e) {
                Log::warning("[BudgetAlertJob] Échec envoi rapport à {$manager->email} : " . $e->getMessage());
            }
        }
    }

    private function buildReportHtml(array $reportData, \App\Models\User $manager): string
    {
        $org   = $reportData['org'];
        $month = $reportData['month'];

        $fcfa = fn($v) => number_format((float) $v, 0, ',', ' ') . ' FCFA';
        $pct  = fn($v) => number_format((float) $v, 1, ',', ' ') . '%';

        $rows = '';
        foreach ($reportData['budgets'] as $b) {
            $color = $b['consumption_pct'] >= 100 ? '#E74C3C'
                   : ($b['consumption_pct'] >= 80 ? '#F39C12' : '#27AE60');

            $rows .= "
            <tr>
                <td style='padding:8px;border-bottom:1px solid #eee;'>{$b['name']}</td>
                <td style='padding:8px;border-bottom:1px solid #eee;text-align:right;'>{$fcfa($b['total_budget'])}</td>
                <td style='padding:8px;border-bottom:1px solid #eee;text-align:right;'>{$fcfa($b['total_actual'])}</td>
                <td style='padding:8px;border-bottom:1px solid #eee;text-align:center;'>
                    <span style='color:{$color};font-weight:bold;'>{$pct($b['consumption_pct'])}</span>
                </td>
                <td style='padding:8px;border-bottom:1px solid #eee;text-align:center;'>{$b['alerts_count']}</td>
            </tr>";
        }

        return "
        <!DOCTYPE html>
        <html lang='fr'>
        <body style='font-family:Arial,sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px;'>
            <div style='background:#1A3A5C;padding:20px;border-radius:8px;margin-bottom:24px;'>
                <h1 style='color:white;margin:0;font-size:20px;'>État d'exécution budgétaire</h1>
                <p style='color:#90CAF9;margin:4px 0 0;'>{$org->name} — {$month}</p>
            </div>

            <p>Bonjour {$manager->name},</p>
            <p>Veuillez trouver ci-dessous le rapport mensuel d'exécution budgétaire pour la période de <strong>{$month}</strong>.</p>

            <table style='width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;'>
                <thead>
                    <tr style='background:#f5f5f5;'>
                        <th style='padding:10px;text-align:left;'>Budget</th>
                        <th style='padding:10px;text-align:right;'>Budgété</th>
                        <th style='padding:10px;text-align:right;'>Réel YTD</th>
                        <th style='padding:10px;text-align:center;'>Exécution</th>
                        <th style='padding:10px;text-align:center;'>Alertes</th>
                    </tr>
                </thead>
                <tbody>{$rows}</tbody>
            </table>

            <div style='background:#FFF8E1;border-left:4px solid #F39C12;padding:12px;border-radius:4px;margin:20px 0;'>
                <strong>⚠ Rappel :</strong> Les lignes affichant un taux d'exécution ≥ 80% requièrent une attention particulière.
                Connectez-vous à SECRETIS ERP pour consulter le détail et ajouter vos commentaires.
            </div>

            <p style='text-align:center;margin-top:30px;'>
                <a href='" . config('app.url') . "/budget/dashboard'
                   style='background:#1A3A5C;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>
                    Accéder au tableau de bord budgétaire
                </a>
            </p>

            <hr style='border:none;border-top:1px solid #eee;margin:30px 0;'>
            <p style='color:#999;font-size:12px;'>
                Ce message est généré automatiquement par SECRETIS ERP — IBIG.<br>
                Généré le " . now()->format('d/m/Y à H:i') . "
            </p>
        </body>
        </html>";
    }
}
