<?php

namespace App\Console\Commands;

use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmDeal;
use App\Models\Organization;
use App\Services\CrmService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * CrmDailyTasks — CRON quotidien 8h00 du CRM SuperAdmin IBIG Soft
 *
 * Planification dans app/Console/Kernel.php :
 *   $schedule->command('crm:daily-tasks')->dailyAt('08:00');
 *
 * Ce que fait cette commande chaque matin :
 *  1. Rappels des activités planifiées pour aujourd'hui
 *  2. Alertes deals sans activité depuis > 7 jours (refroidissement)
 *  3. Rapport : nouvelles inscriptions trial, conversions, churns
 *  4. Envoi du digest au SuperAdmin principal
 */
class CrmDailyTasks extends Command
{
    protected $signature   = 'crm:daily-tasks {--dry-run : Affiche sans envoyer}';
    protected $description = 'Tâches CRM quotidiennes : rappels, alertes, digest SuperAdmin';

    public function __construct(private CrmService $crmService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $today    = Carbon::today();

        $this->info("=== CRM Daily Tasks — {$today->format('d/m/Y H:i')} ===");

        // ── 1. Activités du jour ──────────────────────────────────────────────
        $todayActivities = $this->crmService->getTodayActivities();
        $this->line("\n[1/4] Activités planifiées aujourd'hui : {$todayActivities->count()}");

        foreach ($todayActivities as $activity) {
            $this->line("  • [{$activity->type}] {$activity->subject} — {$activity->contact->company_name} à {$activity->scheduled_at->format('H:i')}");
        }

        // ── 2. Deals à risque de refroidissement ─────────────────────────────
        $staleContacts = $this->crmService->getStaleDealContacts(7);
        $this->line("\n[2/4] Deals sans activité depuis 7+ jours : {$staleContacts->count()}");

        foreach ($staleContacts as $contact) {
            $daysSince = $contact->last_contact_at
                ? (int) Carbon::parse($contact->last_contact_at)->diffInDays(now())
                : 'jamais';
            $this->line("  ⚠ {$contact->company_name} — dernier contact : {$daysSince} jours");
        }

        // ── 3. Statistiques du jour ───────────────────────────────────────────
        $stats = $this->gatherDailyStats();
        $this->line("\n[3/4] Statistiques du jour :");
        $this->line("  Nouveaux trials     : {$stats['new_trials']}");
        $this->line("  Conversions trial→payant : {$stats['conversions']}");
        $this->line("  Churns (licences expirées) : {$stats['churns']}");
        $this->line("  Nouveaux leads CRM  : {$stats['new_leads']}");
        $this->line("  Deals gagnés        : {$stats['deals_won']}");
        $this->line("  Valeur gagnée       : " . number_format($stats['revenue_won'], 0, ',', ' ') . " XOF");

        // ── 4. Envoi du digest ────────────────────────────────────────────────
        $this->line("\n[4/4] Envoi du digest SuperAdmin...");

        if (! $isDryRun) {
            $this->sendDigest($stats, $todayActivities, $staleContacts);
            $this->info("  Digest envoyé.");
        } else {
            $this->warn("  [DRY-RUN] Aucun email envoyé.");
        }

        $this->info("\n=== CRM Daily Tasks terminé ===");

        Log::info('CRM Daily Tasks exécuté', [
            'today_activities' => $todayActivities->count(),
            'stale_contacts'   => $staleContacts->count(),
            'stats'            => $stats,
            'dry_run'          => $isDryRun,
        ]);

        return Command::SUCCESS;
    }

    // =========================================================================
    // STATISTIQUES
    // =========================================================================

    /**
     * Collecte les statistiques du jour depuis la base de données.
     */
    private function gatherDailyStats(): array
    {
        $today     = Carbon::today();
        $yesterday = Carbon::yesterday();

        // Nouveaux trials aujourd'hui
        $newTrials = Organization::where('status', 'trial')
            ->whereDate('created_at', $today)
            ->count();

        // Conversions trial → payant (licences activées aujourd'hui)
        $conversions = DB::table('licenses')
            ->where('status', 'active')
            ->whereDate('created_at', $today)
            ->where('trial', false)
            ->count();

        // Churns : licences expirées hier (sans renouvellement)
        $churns = DB::table('licenses')
            ->where('status', 'expired')
            ->whereDate('expires_at', $yesterday)
            ->count();

        // Nouveaux leads CRM
        $newLeads = CrmContact::whereDate('created_at', $today)->count();

        // Deals gagnés aujourd'hui
        $dealsWon = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
            ->whereDate('close_date_actual', $today)
            ->count();

        // Valeur gagnée aujourd'hui
        $revenueWon = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
            ->whereDate('close_date_actual', $today)
            ->sum('value');

        // MRR actuel
        $planMrr = ['starter' => 25000, 'pro' => 75000, 'enterprise' => 150000];
        $wonDeals = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
            ->whereNotNull('plan')
            ->get();
        $mrrCurrent = $wonDeals->sum(fn($d) => $planMrr[$d->plan] ?? 0);

        // Pipeline total
        $pipelineTotal = CrmDeal::whereHas('stage', fn($q) => $q
            ->where('is_closed_won', false)
            ->where('is_closed_lost', false)
        )->sum('value');

        return compact(
            'newTrials', 'conversions', 'churns', 'newLeads',
            'dealsWon', 'revenueWon', 'mrrCurrent', 'pipelineTotal'
        );
    }

    // =========================================================================
    // EMAIL DIGEST
    // =========================================================================

    /**
     * Envoie le digest quotidien au SuperAdmin principal (configuré en env).
     */
    private function sendDigest(
        array $stats,
        \Illuminate\Database\Eloquent\Collection $todayActivities,
        \Illuminate\Database\Eloquent\Collection $staleContacts
    ): void {
        $superAdminEmail = config('secretis.superadmin_email', env('SUPERADMIN_EMAIL'));

        if (! $superAdminEmail) {
            Log::warning('CRM digest: SUPERADMIN_EMAIL non configuré, digest non envoyé.');
            return;
        }

        $today = Carbon::today()->locale('fr')->isoFormat('dddd D MMMM Y');

        $html = $this->buildDigestHtml($stats, $todayActivities, $staleContacts, $today);

        try {
            Mail::html($html, function ($message) use ($superAdminEmail, $today) {
                $message->to($superAdminEmail)
                    ->subject("📊 Digest CRM IBIG Soft — {$today}")
                    ->from(
                        config('mail.from.address', 'noreply@ibigsoft.com'),
                        config('mail.from.name', 'IBIG Soft CRM')
                    );
            });
        } catch (\Throwable $e) {
            Log::error('CRM digest email failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Génère le HTML du digest quotidien.
     */
    private function buildDigestHtml(
        array $stats,
        \Illuminate\Database\Eloquent\Collection $todayActivities,
        \Illuminate\Database\Eloquent\Collection $staleContacts,
        string $today
    ): string {
        $fmt = fn($v) => number_format($v, 0, ',', ' ');

        $activitiesRows = '';
        foreach ($todayActivities as $act) {
            $activitiesRows .= "<tr>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'>{$act->scheduled_at->format('H:i')}</td>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'><strong>{$act->type}</strong></td>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'>{$act->subject}</td>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'>{$act->contact->company_name}</td>
            </tr>";
        }

        $staleRows = '';
        foreach ($staleContacts->take(10) as $contact) {
            $days = $contact->last_contact_at
                ? (int) Carbon::parse($contact->last_contact_at)->diffInDays(now()) . 'j'
                : 'jamais';
            $staleRows .= "<tr>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'>{$contact->company_name}</td>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'>{$contact->contact_name}</td>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#ef4444;'>{$days}</td>
                <td style='padding:6px 12px;border-bottom:1px solid #f0f0f0;'>{$contact->assignedUser->name ?? '—'}</td>
            </tr>";
        }

        $alertBadge = ($staleContacts->count() > 0 || $stats['churns'] > 0)
            ? "<div style='background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;margin:16px 0;color:#92400e;'>
                ⚠️ {$staleContacts->count()} deal(s) à risque · {$stats['churns']} churn(s) détecté(s) hier
               </div>"
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

    <!-- Header -->
    <div style="background:#1e3a5f;padding:24px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;">IBIG Soft — Digest CRM</div>
      <div style="color:#93c5fd;font-size:14px;margin-top:4px;">{$today}</div>
    </div>

    <!-- Body -->
    <div style="padding:24px 32px;">

      {$alertBadge}

      <!-- KPIs -->
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 16px;">Résumé du jour</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
        <div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#16a34a;">{$stats['newTrials']}</div>
          <div style="font-size:12px;color:#4b5563;">Nouveaux trials</div>
        </div>
        <div style="background:#eff6ff;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#2563eb;">{$stats['conversions']}</div>
          <div style="font-size:12px;color:#4b5563;">Conversions</div>
        </div>
        <div style="background:#fff7ed;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#ea580c;">{$stats['churns']}</div>
          <div style="font-size:12px;color:#4b5563;">Churns</div>
        </div>
        <div style="background:#f5f3ff;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#7c3aed;">{$stats['newLeads']}</div>
          <div style="font-size:12px;color:#4b5563;">Nouveaux leads</div>
        </div>
        <div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#16a34a;">{$stats['dealsWon']}</div>
          <div style="font-size:12px;color:#4b5563;">Deals gagnés</div>
        </div>
        <div style="background:#ecfdf5;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#059669;">{$fmt($stats['mrrCurrent'])} XOF</div>
          <div style="font-size:12px;color:#4b5563;">MRR actuel</div>
        </div>
      </div>

      <!-- Activités du jour -->
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;">Activités planifiées aujourd'hui ({$todayActivities->count()})</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Heure</th>
          <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Type</th>
          <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Sujet</th>
          <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Société</th>
        </tr></thead>
        <tbody>{$activitiesRows}</tbody>
      </table>

      <!-- Deals à risque -->
      <h2 style="font-size:16px;font-weight:700;color:#1f2937;margin:0 0 12px;">Deals à risque — Sans contact depuis 7+ jours</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
        <thead><tr style="background:#fef3c7;">
          <th style="padding:8px 12px;text-align:left;color:#92400e;font-weight:600;">Société</th>
          <th style="padding:8px 12px;text-align:left;color:#92400e;font-weight:600;">Contact</th>
          <th style="padding:8px 12px;text-align:left;color:#92400e;font-weight:600;">Inactivité</th>
          <th style="padding:8px 12px;text-align:left;color:#92400e;font-weight:600;">Assigné</th>
        </tr></thead>
        <tbody>{$staleRows}</tbody>
      </table>

    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <a href="/superadmin/crm/pipeline" style="color:#1e3a5f;text-decoration:none;font-size:13px;font-weight:600;">
        → Ouvrir le CRM SuperAdmin
      </a>
      <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">
        IBIG Soft · Ce digest est envoyé automatiquement chaque matin à 8h00
      </p>
    </div>
  </div>
</body>
</html>
HTML;
    }
}
