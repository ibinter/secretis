<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\VisitLog;
use App\Models\VisitorInvitation;
use App\Services\VisitorService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class VisitorAlerts extends Command
{
    protected $signature   = 'visitors:alerts';
    protected $description = 'Alertes visiteurs : depassements, invitations expirees, rapport fin de journee';

    public function __construct(private readonly VisitorService $visitorService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->checkOverstays();
        $this->remindExpiringInvitations();
        $this->sendEndOfDayReport();

        $this->info('Alertes visiteurs traitees avec succes.');
        return self::SUCCESS;
    }

    // Alerte receptionniste si visiteur en depassement (> 4h sans checkout)
    private function checkOverstays(): void
    {
        $overstaying = $this->visitorService->getOverstayingVisitors();

        foreach ($overstaying as $item) {
            $visit      = $item['visit'];
            $durationH  = intdiv($item['duration_min'], 60);
            $durationM  = $item['duration_min'] % 60;

            $this->warn(
                "Depassement : {$visit->visitor->full_name} — {$durationH}h{$durationM}m (Hote : {$visit->host->name})"
            );

            // Notifier les receptionnistes de l organisation
            $receptionists = \App\Models\User::where('organization_id', $visit->organization_id)
                ->whereHas('roles', fn ($q) => $q->where('name', 'receptionist'))
                ->get();

            foreach ($receptionists as $rec) {
                $rec->notify(new \App\Notifications\VisitorOverstayNotification($visit, $item['duration_min']));
            }
        }
    }

    // Rappel a l hote si invitation expire dans les 2 prochaines heures et non utilisee
    private function remindExpiringInvitations(): void
    {
        $expiringSoon = VisitorInvitation::where('is_used', false)
            ->whereBetween('expires_at', [now(), now()->addHours(2)])
            ->with('invitedBy')
            ->get();

        foreach ($expiringSoon as $inv) {
            $this->info("Invitation expirant bientot : {$inv->visitor_name} — {$inv->expires_at}");

            $inv->invitedBy?->notify(
                new \App\Notifications\InvitationExpiringNotification($inv)
            );
        }
    }

    // Rapport de fin de journee automatique (envoye apres 18h)
    private function sendEndOfDayReport(): void
    {
        if (now()->hour < 17) {
            return; // Ne pas envoyer avant 17h
        }

        $organizations = Organization::all();

        foreach ($organizations as $org) {
            $report = $this->visitorService->getDailyReport($org, Carbon::today());

            if ($report['total_visits'] === 0) {
                continue;
            }

            $admins = \App\Models\User::where('organization_id', $org->id)
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'receptionist']))
                ->get();

            foreach ($admins as $admin) {
                \Mail::to($admin->email)
                    ->send(new \App\Mail\DailyVisitorReportMail($org, $report));
            }

            $this->info("Rapport fin de journee envoye pour {$org->name}");
        }
    }
}
