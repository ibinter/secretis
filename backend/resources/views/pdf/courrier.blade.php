{{--
    Registre du courrier — export PDF (dompdf, A4 paysage conseillé).
    Appelé par : App\Http\Controllers\CourrierController::exportPdf() (ligne 409)
    Variables :
      $mails         Illuminate\Database\Eloquent\Collection de App\Models\MailRegistry
                     (with 'assignee:id,name', 'registeredBy:id,name', 'department:id,name')
                     colonnes : reference, type (incoming|outgoing), urgency, status, subject, body,
                     sender_name, sender_organization, sender_email, recipient_name, recipient_email,
                     received_at, sent_at, due_date, notes, tags, processing_delay_days, created_at
      $organization  App\Models\Organization (name, email, phone, address)
      $generatedAt   Carbon
      $filters       array  ['type','status','urgency','from','to'] (clés présentes seulement si fournies)
--}}
@php
    $types = ['incoming' => 'Entrant', 'outgoing' => 'Sortant'];
    $urgencies = [
        'low' => 'Basse', 'normal' => 'Normale', 'high' => 'Haute', 'urgent' => 'Urgente',
    ];
    $statuses = [
        'received'    => 'Recu',
        'registered'  => 'Enregistre',
        'assigned'    => 'Affecte',
        'in_progress' => 'En traitement',
        'replied'     => 'Repondu',
        'archived'    => 'Archive',
        'closed'      => 'Clos',
        'pending'     => 'En attente',
        'processing'  => 'En traitement',
        'processed'   => 'Traite',
    ];

    $mails   = $mails ?? collect();
    $filters = array_filter($filters ?? [], fn ($v) => $v !== null && $v !== '');

    $countIn  = $mails->where('type', 'incoming')->count();
    $countOut = $mails->where('type', 'outgoing')->count();
    $countUrg = $mails->whereIn('urgency', ['high', 'urgent'])->count();

    $filterLabels = [];
    foreach ($filters as $k => $v) {
        $label = match ($k) {
            'type'    => 'Type : ' . ($types[$v] ?? $v),
            'status'  => 'Statut : ' . ($statuses[$v] ?? $v),
            'urgency' => 'Urgence : ' . ($urgencies[$v] ?? $v),
            'from'    => 'Du ' . $v,
            'to'      => 'Au ' . $v,
            default   => $k . ' : ' . $v,
        };
        $filterLabels[] = $label;
    }
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Registre du courrier — {{ $organization->name ?? 'SECRETIS ERP' }}</title>
    <style>
        * { font-family: "DejaVu Sans", sans-serif; }
        @page { margin: 18mm 12mm 16mm 12mm; }
        body { font-size: 10px; color: #1f2937; margin: 0; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 8px; margin-bottom: 12px; }
        .org { font-size: 15px; font-weight: bold; color: #111827; }
        .org-sub { font-size: 9px; color: #6b7280; margin-top: 1px; }
        .doctype { font-size: 9px; color: #9333EA; letter-spacing: 2px;
                   text-transform: uppercase; margin-top: 4px; }

        .kpis { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .kpis td { width: 25%; padding: 7px; border: 1px solid #e5e7eb; text-align: center; }
        .kpi-value { font-size: 16px; font-weight: bold; color: #9333EA; }
        .kpi-label { font-size: 8px; color: #6b7280; text-transform: uppercase; }

        .filters { background: #faf5ff; border: 1px solid #e9d5ff; padding: 6px 8px;
                   font-size: 9px; color: #6b21a8; margin-bottom: 12px; }

        table.list { width: 100%; border-collapse: collapse; }
        table.list th { background: #f3f4f6; text-align: left; padding: 5px; font-size: 8px;
                        text-transform: uppercase; color: #4b5563;
                        border-bottom: 1px solid #d1d5db; }
        table.list td { padding: 5px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        table.list tr { page-break-inside: avoid; }

        .ref { font-weight: bold; color: #111827; }
        .subject { color: #111827; }
        .small { font-size: 8px; color: #6b7280; }
        .muted { color: #9ca3af; }
        .center { text-align: center; }
        .tag-urgent { color: #dc2626; font-weight: bold; }
        .tag-high { color: #ea580c; font-weight: bold; }
        .late { color: #dc2626; font-weight: bold; }

        .empty { padding: 22px; border: 1px dashed #d1d5db; color: #9ca3af;
                 text-align: center; font-size: 11px; }

        .footer { position: fixed; bottom: -10mm; left: 0; right: 0;
                  font-size: 8px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>

<div class="footer">
    {{ $organization->name ?? 'SECRETIS ERP' }} — Registre du courrier —
    Genere le {{ ($generatedAt ?? now())->format('d/m/Y a H:i') }} — Document interne
</div>

<div class="header">
    <div class="org">{{ $organization->name ?? 'SECRETIS ERP' }}</div>
    <div class="org-sub">
        {{ $organization->address ?? '' }}
        @if (!empty($organization->phone)) · {{ $organization->phone }} @endif
        @if (!empty($organization->email)) · {{ $organization->email }} @endif
    </div>
    <div class="doctype">Registre du courrier</div>
</div>

<table class="kpis">
    <tr>
        <td>
            <div class="kpi-value">{{ $mails->count() }}</div>
            <div class="kpi-label">Courriers</div>
        </td>
        <td>
            <div class="kpi-value">{{ $countIn }}</div>
            <div class="kpi-label">Entrants</div>
        </td>
        <td>
            <div class="kpi-value">{{ $countOut }}</div>
            <div class="kpi-label">Sortants</div>
        </td>
        <td>
            <div class="kpi-value">{{ $countUrg }}</div>
            <div class="kpi-label">Urgents</div>
        </td>
    </tr>
</table>

@if (count($filterLabels) > 0)
    <div class="filters">
        <strong>Filtres appliques :</strong> {{ implode('  |  ', $filterLabels) }}
    </div>
@endif

@if ($mails->count() > 0)
    <table class="list">
        <thead>
            <tr>
                <th style="width:10%;">Reference</th>
                <th style="width:7%;">Type</th>
                <th style="width:24%;">Objet</th>
                <th style="width:17%;">Expediteur / Destinataire</th>
                <th style="width:11%;">Affecte a</th>
                <th style="width:9%;">Urgence</th>
                <th style="width:11%;">Statut</th>
                <th style="width:11%;">Date</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($mails as $mail)
                @php
                    $isIncoming = ($mail->type ?? null) === 'incoming';
                    $counterpart = $isIncoming
                        ? ($mail->sender_name ?: $mail->sender_email)
                        : ($mail->recipient_name ?: $mail->recipient_email);
                    $counterOrg = $isIncoming ? ($mail->sender_organization ?? null) : null;
                    $date = $isIncoming
                        ? ($mail->received_at ?? $mail->created_at)
                        : ($mail->sent_at ?? $mail->created_at);
                    $urg = $mail->urgency ?? 'normal';
                    $urgClass = $urg === 'urgent' ? 'tag-urgent' : ($urg === 'high' ? 'tag-high' : '');
                    $overdue = false;
                    try { $overdue = $mail->isOverdue(); } catch (\Throwable $e) { $overdue = false; }
                @endphp
                <tr>
                    <td class="ref">{{ $mail->reference ?: '—' }}</td>
                    <td>{{ $types[$mail->type ?? ''] ?? '—' }}</td>
                    <td>
                        <span class="subject">{{ $mail->subject ?: '—' }}</span>
                        @if (!empty($mail->tags) && is_array($mail->tags))
                            <br><span class="small">{{ implode(', ', $mail->tags) }}</span>
                        @endif
                    </td>
                    <td>
                        {{ $counterpart ?: '—' }}
                        @if (!empty($counterOrg))
                            <br><span class="small">{{ $counterOrg }}</span>
                        @endif
                    </td>
                    <td>
                        {{ $mail->assignee->name ?? '—' }}
                        @if (!empty($mail->department?->name))
                            <br><span class="small">{{ $mail->department->name }}</span>
                        @elseif (!empty($mail->registeredBy?->name))
                            <br><span class="small">Saisi par {{ $mail->registeredBy->name }}</span>
                        @endif
                    </td>
                    <td class="{{ $urgClass }}">{{ $urgencies[$urg] ?? $urg }}</td>
                    <td>
                        {{ $statuses[$mail->status ?? ''] ?? ($mail->status ?: '—') }}
                        @if ($overdue)
                            <br><span class="late small">En retard</span>
                        @endif
                    </td>
                    <td>
                        {{ $date ? \Carbon\Carbon::parse($date)->format('d/m/Y') : '—' }}
                        @if (!empty($mail->due_date))
                            <br><span class="small">
                                Ech. {{ \Carbon\Carbon::parse($mail->due_date)->format('d/m/Y') }}
                            </span>
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="empty">
        Aucun courrier ne correspond aux criteres selectionnes.
    </div>
@endif

</body>
</html>
