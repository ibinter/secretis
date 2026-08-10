<?php

declare(strict_types=1);

namespace App\Mail\Gdpr;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Rapport de purge des politiques de rétention envoyé au DPO.
 *
 * Appelé par App\Console\Commands\ProcessGdprRetention :
 *   new RetentionReport($report, $totalDeleted, $errors)
 * Chaque entrée de $report : org_id, policy, status, deleted, cutoff, error.
 */
class RetentionReport extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param array<int, array<string, mixed>> $report
     * @param int|array<int, mixed>            $errors  Nombre d'erreurs (int) selon l'appelant
     */
    public function __construct(
        public readonly array $report,
        public readonly int   $totalDeleted,
        public readonly mixed $errors = 0,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[RGPD] Rapport de purge — ' . $this->totalDeleted . ' enregistrement(s) supprimé(s)',
        );
    }

    public function content(): Content
    {
        $rows = '';
        foreach ($this->report as $entry) {
            $rows .= '<tr>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($entry['org_id'] ?? '-')) . '</td>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($entry['policy'] ?? '-')) . '</td>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($entry['status'] ?? '-')) . '</td>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($entry['deleted'] ?? 0)) . '</td>'
                   . '<td style="padding:4px 0">' . e((string) ($entry['cutoff'] ?? ($entry['error'] ?? '-'))) . '</td>'
                   . '</tr>';
        }

        $errorCount = is_countable($this->errors) ? count($this->errors) : (int) $this->errors;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Rapport de purge RGPD</h2>'
              . '<p>Total supprimé : <strong>' . e((string) $this->totalDeleted) . '</strong> — '
              . 'Erreurs : <strong>' . e((string) $errorCount) . '</strong></p>'
              . '<table cellpadding="0" cellspacing="0">'
              . '<tr style="color:#666"><th align="left">Org</th><th align="left">Politique</th>'
              . '<th align="left">Statut</th><th align="left">Supprimés</th><th align="left">Seuil / erreur</th></tr>'
              . $rows
              . '</table>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — rapport automatique DPO.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
