<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\License;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Job CRON — Envoie les rappels d'expiration d'essai à J-7, J-3 et J-1.
 *
 * Planifié dans App\Console\Kernel (ou routes/console.php) :
 *   Schedule::job(new SendTrialEndingEmailJob(days: 7))->dailyAt('09:00');
 *   Schedule::job(new SendTrialEndingEmailJob(days: 3))->dailyAt('09:00');
 *   Schedule::job(new SendTrialEndingEmailJob(days: 1))->dailyAt('09:00');
 */
class SendTrialEndingEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $backoff = 120;

    public function __construct(
        public readonly int $days
    ) {
        $this->queue = 'emails';
    }

    public function handle(): void
    {
        $targetDate = Carbon::today()->addDays($this->days)->toDateString();

        Log::info("[SendTrialEndingEmailJob] Traitement J-{$this->days}", [
            'target_date' => $targetDate,
            'executed_at' => now()->toIso8601String(),
        ]);

        // Organisations en essai dont la licence expire dans exactement $days jours
        $organizations = Organization::query()
            ->whereHas('license', fn ($q) => $q
                ->where('status', 'trial')
                ->whereDate('ends_at', $targetDate)
            )
            ->with(['license', 'users' => fn ($q) => $q->where('is_admin', true)->limit(1)])
            ->get();

        $sentCount = 0;

        foreach ($organizations as $org) {
            /** @var Organization $org */
            $admin = $org->users->first()
                ?? User::where('organization_id', $org->id)->first();

            if (!$admin || !$admin->email) {
                Log::warning("[SendTrialEndingEmailJob] Admin introuvable", [
                    'organization_id' => $org->id,
                ]);
                continue;
            }

            // Anti-doublon Redis / Cache
            $cacheKey = "trial_ending_email:{$org->id}:{$this->days}";
            if (Cache::has($cacheKey)) {
                Log::info("[SendTrialEndingEmailJob] Email déjà envoyé aujourd'hui", [
                    'organization_id' => $org->id,
                    'days'            => $this->days,
                ]);
                continue;
            }

            try {
                $usedFeatures = $this->detectUsedFeatures($org);

                Mail::send(
                    'emails.trial-ending',
                    [
                        'adminName'       => $admin->first_name ?? $admin->name,
                        'orgName'         => $org->name,
                        'daysLeft'        => $this->days,
                        'trialEndsAt'     => Carbon::parse($org->license?->ends_at)->translatedFormat('d F Y'),
                        'usedFeatures'    => $usedFeatures,
                        'upgradeUrl'      => config('app.url') . '/abonnement',
                        'demoUrl'         => config('app.url') . '/demo',
                    ],
                    fn ($message) => $message
                        ->to($admin->email, $admin->name)
                        ->subject("Votre essai SECRETIS se termine dans {$this->days} jour" . ($this->days > 1 ? 's' : '') . " — Passez à Pro")
                );

                // Marquer comme envoyé jusqu'à minuit
                Cache::put($cacheKey, true, now()->endOfDay());

                $sentCount++;

                Log::info("[SendTrialEndingEmailJob] Email envoyé", [
                    'organization_id' => $org->id,
                    'admin_email'     => $admin->email,
                    'days'            => $this->days,
                ]);

            } catch (\Throwable $e) {
                Log::error("[SendTrialEndingEmailJob] Erreur envoi", [
                    'organization_id' => $org->id,
                    'error'           => $e->getMessage(),
                ]);
                // Ne pas faire échouer le job pour un seul email en erreur
            }
        }

        Log::info("[SendTrialEndingEmailJob] J-{$this->days} terminé", [
            'sent_count' => $sentCount,
            'total_orgs' => $organizations->count(),
        ]);
    }

    /**
     * Détecte les 5 fonctionnalités les plus utilisées par cette organisation.
     */
    private function detectUsedFeatures(Organization $org): array
    {
        $features = [];

        // Courriers
        $courriers = \Illuminate\Support\Facades\DB::table('courriers')
            ->where('organization_id', $org->id)->count();
        if ($courriers > 0) {
            $features[] = "Courrier — {$courriers} courrier" . ($courriers > 1 ? 's' : '') . " créé" . ($courriers > 1 ? 's' : '');
        }

        // Tâches
        $taches = \Illuminate\Support\Facades\DB::table('tasks')
            ->where('organization_id', $org->id)->count();
        if ($taches > 0) {
            $features[] = "Tâches — {$taches} tâche" . ($taches > 1 ? 's' : '') . " créée" . ($taches > 1 ? 's' : '');
        }

        // Documents GED
        $docs = \Illuminate\Support\Facades\DB::table('documents')
            ->where('organization_id', $org->id)->count();
        if ($docs > 0) {
            $features[] = "GED — {$docs} document" . ($docs > 1 ? 's' : '') . " archivé" . ($docs > 1 ? 's' : '');
        }

        // Agenda
        $events = \Illuminate\Support\Facades\DB::table('events')
            ->where('organization_id', $org->id)->count();
        if ($events > 0) {
            $features[] = "Agenda — {$events} événement" . ($events > 1 ? 's' : '') . " planifié" . ($events > 1 ? 's' : '');
        }

        // Collaborateurs
        $users = User::where('organization_id', $org->id)->count();
        if ($users > 1) {
            $features[] = "Équipe — {$users} collaborateur" . ($users > 1 ? 's' : '') . " ajouté" . ($users > 1 ? 's' : '');
        }

        return array_slice($features, 0, 5);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("[SendTrialEndingEmailJob] Job échoué définitivement", [
            'days'  => $this->days,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
