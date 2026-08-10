<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Rapport de fin de journée des visites.
 *
 * Appelé par App\Console\Commands\VisitorAlerts :
 *   new DailyVisitorReportMail($org, $report)
 *
 * $report provient de VisitorService::getDailyReport() :
 *   date, total_visits, checked_in, checked_out, no_show, cancelled,
 *   average_duration_min, peak_hours, by_purpose, top_hosts
 *
 * Aucune vue Blade dédiée n'existe dans resources/views/emails/ :
 * le corps est généré en HTML inline (Content::htmlString).
 */
class DailyVisitorReportMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param array<string, mixed> $report
     */
    public function __construct(
        public readonly Organization $organization,
        public readonly array        $report,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        $date = (string) ($this->report['date'] ?? now()->toDateString());

        return new Envelope(
            subject: "Rapport visiteurs du {$date} — {$this->organization->name}",
        );
    }

    public function content(): Content
    {
        $rows = [
            'Total des visites'   => $this->report['total_visits']         ?? 0,
            'Encore présents'     => $this->report['checked_in']           ?? 0,
            'Sortis'              => $this->report['checked_out']          ?? 0,
            'Durée moyenne (min)' => $this->report['average_duration_min'] ?? 0,
        ];

        $lines = '';
        foreach ($rows as $label => $value) {
            $lines .= '<tr><td style="padding:6px 12px 6px 0;color:#666">'
                    . e((string) $label)
                    . '</td><td style="padding:6px 0;font-weight:600">'
                    . e((string) $value)
                    . '</td></tr>';
        }

        $topHosts = '';
        foreach ((array) ($this->report['top_hosts'] ?? []) as $host) {
            $topHosts .= '<li>' . e((string) ($host['host'] ?? '-'))
                       . ' : ' . e((string) ($host['count'] ?? 0)) . '</li>';
        }

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Rapport visiteurs — '
              . e((string) ($this->report['date'] ?? '')) . '</h2>'
              . '<p>' . e((string) $this->organization->name) . '</p>'
              . '<table cellpadding="0" cellspacing="0">' . $lines . '</table>'
              . ($topHosts !== '' ? '<h3 style="margin:18px 0 6px">Hôtes les plus sollicités</h3><ul>' . $topHosts . '</ul>' : '')
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — rapport automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
