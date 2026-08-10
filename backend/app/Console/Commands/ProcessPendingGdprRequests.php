<?php

namespace App\Console\Commands;

use App\Models\DataSubjectRequest;
use App\Services\GdprService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProcessPendingGdprRequests extends Command
{
    protected $signature   = 'secretis:gdpr-process';
    protected $description = 'Traite automatiquement les demandes RGPD en attente (CRON quotidien)';

    public function __construct(private readonly GdprService $gdprService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('[RGPD] Traitement des demandes en attente — ' . now()->format('d/m/Y H:i'));

        $processed = 0;
        $errors    = 0;
        $alerts    = [];

        // 1. Traitement automatique des demandes de portabilité et d'accès
        $autoProcessable = DataSubjectRequest::where('status', 'pending')
            ->whereIn('type', ['access', 'portability'])
            ->where('requested_at', '>=', now()->subDays(1)) // pas encore traitées aujourd'hui
            ->get();

        foreach ($autoProcessable as $request) {
            try {
                $this->gdprService->handleDataSubjectRequest($request);
                $processed++;
                $this->line("  ✓ Demande #{$request->id} ({$request->type}) traitée pour {$request->subject_email}");
                Log::channel('gdpr')->info('Auto-processed request', ['id' => $request->id, 'type' => $request->type]);
            } catch (\Throwable $e) {
                $errors++;
                $this->error("  ✗ Demande #{$request->id} — Erreur : {$e->getMessage()}");
                Log::channel('gdpr')->error('Auto-process failed', ['id' => $request->id, 'error' => $e->getMessage()]);
            }
        }

        // 2. Alertes pour demandes dépassant J-29 (1 jour avant la limite légale)
        $almostOverdue = DataSubjectRequest::whereIn('status', ['pending', 'processing'])
            ->where('requested_at', '<', now()->subDays(29))
            ->get();

        foreach ($almostOverdue as $request) {
            $daysPending = now()->diffInDays($request->requested_at);
            $alerts[]    = [
                'id'          => $request->id,
                'type'        => $request->type,
                'email'       => $request->subject_email,
                'days'        => $daysPending,
                'org_id'      => $request->organization_id,
                'deadline'    => \Carbon\Carbon::parse($request->requested_at)->addDays(30)->toDateString(),
            ];
            $this->warn("  ⚠ Demande #{$request->id} en attente depuis {$daysPending} jours ! Deadline : " . end($alerts)['deadline']);
        }

        if (count($alerts) > 0) {
            $this->sendAlertToDpo($alerts);
            Log::channel('gdpr')->warning('Overdue GDPR requests detected', ['count' => count($alerts), 'requests' => $alerts]);
        }

        $this->info(sprintf(
            '[RGPD] Traitement terminé. Traitées : %d | Erreurs : %d | Alertes J-29 : %d',
            $processed,
            $errors,
            count($alerts)
        ));

        return $errors > 0 ? self::FAILURE : self::SUCCESS;
    }

    private function sendAlertToDpo(array $alerts): void
    {
        $dpoEmail = config('gdpr.dpo_email', env('GDPR_DPO_EMAIL'));

        if (! $dpoEmail) {
            return;
        }

        try {
            Mail::to($dpoEmail)->send(new \App\Mail\Gdpr\OverdueRequestsAlert($alerts));
        } catch (\Throwable $e) {
            Log::channel('gdpr')->error('Failed to send DPO overdue alert', ['error' => $e->getMessage()]);
        }
    }
}
