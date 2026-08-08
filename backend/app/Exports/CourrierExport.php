<?php

declare(strict_types=1);

namespace App\Exports;

use App\Models\MailRegistry;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/**
 * Export Excel du registre du courrier.
 *
 * Appelé par App\Http\Controllers\CourrierController::exportExcel() :
 *   Excel::download(new CourrierExport($user->organization_id, $request->query()), $filename)
 *
 * Colonnes réelles de `mail_registry` : reference, type, urgency, status,
 * subject, sender_name, sender_organization, recipient_name, received_at,
 * sent_at, due_date, assigned_to.
 * (Il n'existe ni colonne `direction` ni colonne `priority`.)
 */
class CourrierExport implements FromCollection, WithHeadings, WithMapping
{
    private const TYPES = [
        'incoming' => 'Arrivée',
        'outgoing' => 'Départ',
        'internal' => 'Interne',
    ];

    private const URGENCIES = [
        'low'    => 'Faible',
        'normal' => 'Normale',
        'high'   => 'Haute',
        'urgent' => 'Urgente',
    ];

    private const STATUSES = [
        'received'    => 'Reçu',
        'registered'  => 'Enregistré',
        'assigned'    => 'Affecté',
        'in_progress' => 'En cours',
        'replied'     => 'Répondu',
        'archived'    => 'Archivé',
        'closed'      => 'Clos',
    ];

    /**
     * @param array<string, mixed> $filters type | status | urgency | from | to
     */
    public function __construct(
        private readonly string|int $organizationId,
        private readonly array      $filters = [],
    ) {}

    /**
     * @return Collection<int, MailRegistry>
     */
    public function collection(): Collection
    {
        $query = MailRegistry::query()
            ->where('organization_id', $this->organizationId)
            ->with(['assignee:id,name', 'department:id,name'])
            ->orderByDesc('created_at');

        if (! empty($this->filters['type'])) {
            $query->where('type', $this->filters['type']);
        }

        if (! empty($this->filters['status'])) {
            $query->where('status', $this->filters['status']);
        }

        if (! empty($this->filters['urgency'])) {
            $query->where('urgency', $this->filters['urgency']);
        }

        if (! empty($this->filters['department_id'])) {
            $query->where('department_id', $this->filters['department_id']);
        }

        // Même convention que l'export PDF : le registre se lit par date de
        // réception, la date de saisie ne servant que de repli.
        if (! empty($this->filters['from'])) {
            $from = $this->filters['from'];
            $query->where(function ($q) use ($from) {
                $q->whereDate('received_at', '>=', $from)
                  ->orWhere(fn ($q2) => $q2->whereNull('received_at')->whereDate('created_at', '>=', $from));
            });
        }

        if (! empty($this->filters['to'])) {
            $to = $this->filters['to'];
            $query->where(function ($q) use ($to) {
                $q->whereDate('received_at', '<=', $to)
                  ->orWhere(fn ($q2) => $q2->whereNull('received_at')->whereDate('created_at', '<=', $to));
            });
        }

        return $query->get();
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Référence',
            'Type',
            'Urgence',
            'Statut',
            'Objet',
            'Expéditeur',
            'Organisation expéditrice',
            'Destinataire',
            'Reçu le',
            'Envoyé le',
            'Échéance',
            'Service',
            'Affecté à',
        ];
    }

    /**
     * @param  MailRegistry $mail
     * @return array<int, string>
     */
    public function map($mail): array
    {
        return [
            (string) ($mail->reference ?? ''),
            self::TYPES[$mail->type]         ?? (string) ($mail->type ?? ''),
            self::URGENCIES[$mail->urgency]  ?? (string) ($mail->urgency ?? ''),
            self::STATUSES[$mail->status]    ?? (string) ($mail->status ?? ''),
            (string) ($mail->subject ?? ''),
            (string) ($mail->sender_name ?? ''),
            (string) ($mail->sender_organization ?? ''),
            (string) ($mail->recipient_name ?? ''),
            $this->date($mail->received_at),
            $this->date($mail->sent_at),
            $this->date($mail->due_date),
            (string) ($mail->department->name ?? ''),
            (string) ($mail->assignee->name ?? ''),
        ];
    }

    private function date(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('d/m/Y H:i');
        }

        return $value ? (string) $value : '';
    }
}
