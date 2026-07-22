<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\OrganizationHealthScore;
use App\Services\SaasMetricsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * ComputeSaasMetrics — CRON quotidien 2h00
 *
 * Planification dans bootstrap/app.php ou Kernel.php :
 *   $schedule->command('saas:compute-metrics')->dailyAt('02:00');
 *
 * Ce que fait ce CRON :
 *   1. Calcule et stocke le snapshot SaaS journalier
 *   2. Calcule le health score de chaque organisation active
 *   3. Détecte les nouvelles organisations à risque de churn élevé
 *   4. Alerte l'équipe IBIG Soft si le MRR baisse > 5% vs mois précédent
 */
class ComputeSaasMetrics extends Command
{
    protected $signature   = 'saas:compute-metrics {--dry-run : Affiche sans persister}';
    protected $description = 'Calcule les métriques SaaS quotidiennes (health scores, MRR, churn risk)';

    public function __construct(private readonly SaasMetricsService $metricsService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $isDryRun  = $this->option('dry-run');
        $startedAt = now();

        $this->info('');
        $this->info('┌────────────────────────────────────────────────────────────┐');
        $this->info('│  SECRETIS — Calcul des métriques SaaS quotidiennes         │');
        $this->info('│  IBIG Soft — ' . $startedAt->format('d/m/Y H:i:s') . '                        │');
        $this->info('└────────────────────────────────────────────────────────────┘');
        $this->info('');

        if ($isDryRun) {
            $this->warn('[DRY-RUN] Mode simulation — aucune donnée ne sera persistée.');
            $this->info('');
        }

        $errors = 0;

        // ── ÉTAPE 1 : Snapshot SaaS journalier ───────────────────────────────
        $this->info('▶  Étape 1/4 — Calcul du snapshot SaaS journalier...');

        try {
            if (!$isDryRun) {
                $metric = $this->metricsService->computeDailyMetrics();
                $this->line("   ✓ Snapshot créé pour le {$metric->metric_date}");
                $this->line("   · MRR : " . number_format($metric->mrr_xof, 0, ',', ' ') . " XOF");
                $this->line("   · Organisations actives : {$metric->active_organizations}");
                $this->line("   · MAU : {$metric->active_users_mau} | DAU : {$metric->active_users_dau}");
            } else {
                $this->line('   [DRY-RUN] computeDailyMetrics() — ignoré.');
            }
        } catch (\Throwable $e) {
            $this->error("   ✗ Erreur snapshot journalier : {$e->getMessage()}");
            Log::error('ComputeSaasMetrics: snapshot error', ['error' => $e->getMessage()]);
            $errors++;
        }

        $this->info('');

        // ── ÉTAPE 2 : Health scores de chaque organisation ───────────────────
        $this->info('▶  Étape 2/4 — Calcul des health scores organisations...');

        $organizations = Organization::active()->get();
        $this->line("   → {$organizations->count()} organisations à traiter");

        $processed   = 0;
        $highRiskNew = [];

        // Récupérer les organisations déjà à risque élevé hier
        $alreadyHighRisk = OrganizationHealthScore::where('churn_risk', 'high')
            ->whereDate('score_date', Carbon::yesterday()->toDateString())
            ->pluck('organization_id')
            ->toArray();

        foreach ($organizations as $org) {
            try {
                if (!$isDryRun) {
                    $score     = $this->metricsService->computeHealthScore($org);
                    $risk      = $score < 40 ? 'HIGH' : ($score < 60 ? 'MEDIUM' : 'LOW');
                    $processed++;

                    // Détecter les nouvelles organisations à risque élevé (pas déjà en high risk hier)
                    if ($score < 40 && !in_array($org->id, $alreadyHighRisk, true)) {
                        $highRiskNew[] = ['org' => $org->name, 'score' => $score];
                    }

                    if ($this->getOutput()->isVerbose()) {
                        $color = $score >= 60 ? 'green' : ($score >= 40 ? 'yellow' : 'red');
                        $this->line("   [{$risk}] {$org->name} — score : <fg={$color}>{$score}</>");
                    }
                }
            } catch (\Throwable $e) {
                $this->warn("   ✗ Erreur health score [{$org->name}] : {$e->getMessage()}");
                Log::warning('ComputeSaasMetrics: health score error', [
                    'org_id' => $org->id,
                    'error'  => $e->getMessage(),
                ]);
                $errors++;
            }
        }

        if (!$isDryRun) {
            $this->line("   ✓ {$processed}/{$organizations->count()} organisations traitées");
        }

        $this->info('');

        // ── ÉTAPE 3 : Alertes nouvelles organisations à risque élevé ─────────
        $this->info('▶  Étape 3/4 — Détection des nouvelles organisations à risque élevé...');

        if (!empty($highRiskNew)) {
            $this->warn("   ⚠  {$count} nouvelle(s) organisation(s) en risque élevé :");
            foreach ($highRiskNew as ['org' => $name, 'score' => $score]) {
                $this->warn("      · {$name} (score : {$score}/100)");
                Log::warning('Nouvelle organisation à risque élevé de churn', [
                    'organization' => $name,
                    'health_score' => $score,
                    'date'         => Carbon::today()->toDateString(),
                ]);
            }
        } else {
            $this->line("   ✓ Aucune nouvelle organisation en risque élevé détectée");
        }

        $this->info('');

        // ── ÉTAPE 4 : Alerte MRR ─────────────────────────────────────────────
        $this->info('▶  Étape 4/4 — Vérification de la variation du MRR...');

        try {
            if (!$isDryRun) {
                $this->metricsService->checkMrrAlert();
                $this->line("   ✓ Vérification MRR effectuée");
            } else {
                $this->line('   [DRY-RUN] checkMrrAlert() — ignoré.');
            }
        } catch (\Throwable $e) {
            $this->error("   ✗ Erreur vérification MRR : {$e->getMessage()}");
            Log::error('ComputeSaasMetrics: MRR alert error', ['error' => $e->getMessage()]);
            $errors++;
        }

        $this->info('');

        // ── Résumé ────────────────────────────────────────────────────────────
        $duration = now()->diffInSeconds($startedAt);
        $this->info('─────────────────────────────────────────────────────────────');
        $this->info("✅ Calcul terminé en {$duration}s — Erreurs : {$errors}");
        $this->info('─────────────────────────────────────────────────────────────');
        $this->info('');

        Log::info('ComputeSaasMetrics: completed', [
            'duration_seconds'  => $duration,
            'orgs_processed'    => $processed ?? 0,
            'new_high_risk'     => count($highRiskNew),
            'errors'            => $errors,
        ]);

        return $errors > 0 ? Command::FAILURE : Command::SUCCESS;
    }
}
