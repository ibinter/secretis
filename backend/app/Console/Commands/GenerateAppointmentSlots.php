<?php

namespace App\Console\Commands;

use App\Models\AppointmentSlot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Génère les créneaux de RDV pour les hôtes acceptant les rendez-vous.
 * Jours ouvrés, 09:00–17:00, créneaux de 30 min, en sautant l'existant.
 *
 * Usage : php artisan appointments:generate-slots [--days=14] [--org=ID]
 */
class GenerateAppointmentSlots extends Command
{
    protected $signature = 'appointments:generate-slots {--days=14 : Nombre de jours à générer} {--org= : Limiter à une organisation}';

    protected $description = 'Génère les créneaux de rendez-vous pour les hôtes disponibles';

    public function handle(): int
    {
        $days      = (int) $this->option('days');
        $startHour = 9;   // 09:00
        $endHour   = 17;  // 17:00
        $stepMin   = 30;

        $hostsQuery = User::query()
            ->where('status', 'active')
            ->where('accepts_appointments', true);

        if ($orgId = $this->option('org')) {
            $hostsQuery->where('organization_id', $orgId);
        }

        $hosts = $hostsQuery->get(['id', 'organization_id']);

        if ($hosts->isEmpty()) {
            $this->warn('Aucun hôte avec accepts_appointments=true. Rien à générer.');
            return self::SUCCESS;
        }

        $created = 0;
        $today   = Carbon::today();

        foreach ($hosts as $host) {
            for ($d = 0; $d < $days; $d++) {
                $date = (clone $today)->addDays($d);

                // Jours ouvrés uniquement (lundi–vendredi).
                if ($date->isWeekend()) {
                    continue;
                }

                for ($h = $startHour; $h < $endHour; $h++) {
                    for ($m = 0; $m < 60; $m += $stepMin) {
                        $start = sprintf('%02d:%02d:00', $h, $m);
                        $endM  = $m + $stepMin;
                        $endH  = $h + intdiv($endM, 60);
                        $end   = sprintf('%02d:%02d:00', $endH, $endM % 60);

                        $exists = AppointmentSlot::where('organization_id', $host->organization_id)
                            ->where('host_id', $host->id)
                            ->where('date', $date->toDateString())
                            ->where('start_time', $start)
                            ->exists();

                        if ($exists) {
                            continue;
                        }

                        AppointmentSlot::create([
                            'organization_id' => $host->organization_id,
                            'host_id'         => $host->id,
                            'date'            => $date->toDateString(),
                            'start_time'      => $start,
                            'end_time'        => $end,
                            'is_available'    => true,
                        ]);
                        $created++;
                    }
                }
            }
        }

        $this->info("✅ {$created} créneau(x) généré(s) pour {$hosts->count()} hôte(s) sur {$days} jour(s).");
        return self::SUCCESS;
    }
}
