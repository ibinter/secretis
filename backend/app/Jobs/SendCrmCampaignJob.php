<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * SendCrmCampaignJob — Envoi d'une campagne CRM par lots
 *
 * Dispatché par CrmProspectsController::sendCampaign().
 * Envoie les emails aux destinataires de la campagne et met à jour les stats.
 *
 * File recommandée : 'campaigns' (processer lentement pour éviter le spam)
 */
class SendCrmCampaignJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300;

    public function __construct(
        private readonly int $campaignId
    ) {}

    public function handle(): void
    {
        $campaign = DB::table('campaigns')->find($this->campaignId);

        if (!$campaign || $campaign->status === 'sent') {
            return;
        }

        // Marquer comme en cours d'envoi
        DB::table('campaigns')
            ->where('id', $this->campaignId)
            ->update(['status' => 'sending', 'sent_at' => now()]);

        $recipients = DB::table('campaign_recipients')
            ->where('campaign_id', $this->campaignId)
            ->whereNull('sent_at')
            ->get();

        $sent  = 0;
        $errors = 0;

        foreach ($recipients as $recipient) {
            $prospect = DB::table('prospects')->find($recipient->prospect_id);
            if (!$prospect || empty($prospect->email)) {
                continue;
            }

            // Vérifier anti-spam : dernier contact < 7 jours -> skip
            $lastContact = DB::table('prospect_interactions')
                ->where('prospect_id', $prospect->id)
                ->where('type', 'email')
                ->orderByDesc('created_at')
                ->value('created_at');

            if ($lastContact && now()->diffInDays($lastContact) < 7) {
                DB::table('campaign_recipients')
                    ->where('id', $recipient->id)
                    ->update(['status' => 'skipped_antispam']);
                continue;
            }

            try {
                $subject = $campaign->subject ?? 'Message de IBIG Soft';
                $body    = $this->personalizeBody($campaign->body ?? '', $prospect);

                Mail::html($body, function ($message) use ($prospect, $subject) {
                    $message->to($prospect->email, $prospect->company_name ?? $prospect->contact_name)
                        ->subject($subject)
                        ->replyTo(config('mail.from.address'), config('mail.from.name'));
                });

                DB::table('campaign_recipients')
                    ->where('id', $recipient->id)
                    ->update(['status' => 'sent', 'sent_at' => now()]);

                // Enregistrer l'interaction
                DB::table('prospect_interactions')->insert([
                    'prospect_id' => $prospect->id,
                    'type'        => 'email',
                    'notes'       => "Email campagne #{$this->campaignId} : {$subject}",
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);

                $sent++;
            } catch (\Throwable $e) {
                DB::table('campaign_recipients')
                    ->where('id', $recipient->id)
                    ->update(['status' => 'error', 'error_message' => $e->getMessage()]);
                Log::warning("Campaign {$this->campaignId}: failed to send to prospect {$prospect->id}", [
                    'error' => $e->getMessage(),
                ]);
                $errors++;
            }

            // Pause entre envois (éviter le rate-limiting)
            usleep(200_000); // 200 ms
        }

        // Finaliser la campagne
        $totalSent = DB::table('campaign_recipients')
            ->where('campaign_id', $this->campaignId)
            ->where('status', 'sent')
            ->count();

        DB::table('campaigns')
            ->where('id', $this->campaignId)
            ->update([
                'status'     => 'sent',
                'stats'      => json_encode([
                    'sent'        => $totalSent,
                    'errors'      => $errors,
                    'sent_at'     => now()->toISOString(),
                ]),
            ]);

        Log::info("Campaign {$this->campaignId} sent: {$sent} emails, {$errors} errors.");
    }

    public function failed(\Throwable $exception): void
    {
        DB::table('campaigns')
            ->where('id', $this->campaignId)
            ->update(['status' => 'error']);

        Log::error("Campaign {$this->campaignId} job failed", ['error' => $exception->getMessage()]);
    }

    private function personalizeBody(string $body, object $prospect): string
    {
        $replacements = [
            '{{contact_name}}'  => $prospect->contact_name ?? 'Madame/Monsieur',
            '{{company_name}}'  => $prospect->company_name ?? 'votre entreprise',
            '{{first_name}}'    => explode(' ', $prospect->contact_name ?? '')[0] ?? 'Madame/Monsieur',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $body);
    }
}
