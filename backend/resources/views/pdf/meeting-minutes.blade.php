{{--
    Procès-verbal / compte rendu de réunion (PDF dompdf, A4 portrait).
    Appelé par : App\Services\MeetingService::generateMeetingSummaryPdf() (ligne 318)
    Variables :
      $meeting      App\Models\Meeting — relations chargées : organizer, participants (pivot role,
                    invitation_status, invited_at, responded_at), president
                    colonnes : title, description, meeting_type, status, location, scheduled_at,
                    duration_minutes, started_at, ended_at, minutes_content (HTML TipTap),
                    minutes_approved_at, minutes_approved_by
      $agendaItems  array  Meeting::getSortedAgendaItems() -> [{ order, title, description, duration_min }]
      $decisions    array  [{ id, title, description, priority, due_date, task_id }]
--}}
@php
    $types = [
        'board'         => 'Conseil d\'administration',
        'team'          => 'Reunion d\'equipe',
        'project'       => 'Reunion de projet',
        'extraordinary' => 'Reunion extraordinaire',
    ];
    $statuses = [
        'planned'   => 'Planifiee',
        'ongoing'   => 'En cours',
        'completed' => 'Terminee',
        'cancelled' => 'Annulee',
    ];
    $priorities = [
        'low'    => 'Basse',
        'normal' => 'Normale',
        'high'   => 'Haute',
        'urgent' => 'Urgente',
    ];
    $scheduled = $meeting->scheduled_at ?? null;
    $started   = $meeting->started_at ?? null;
    $ended     = $meeting->ended_at ?? null;
    $agendaItems = $agendaItems ?? [];
    $decisions   = $decisions ?? [];
    $participants = $meeting->participants ?? collect();
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Proces-verbal — {{ $meeting->title ?? 'Reunion' }}</title>
    <style>
        * { font-family: "DejaVu Sans", sans-serif; }
        @page { margin: 22mm 16mm 20mm 16mm; }
        body { font-size: 11px; color: #1f2937; margin: 0; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 16px; }
        .org { font-size: 15px; font-weight: bold; color: #111827; }
        .doctype { font-size: 9px; color: #9333EA; letter-spacing: 2px; text-transform: uppercase; }
        .title { font-size: 14px; font-weight: bold; color: #111827; margin-top: 6px; }

        h2.section { font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
                     color: #9333EA; border-bottom: 1px solid #e9d5ff;
                     padding-bottom: 3px; margin: 18px 0 8px; }

        table { width: 100%; border-collapse: collapse; }
        table.meta td { padding: 4px 6px; border: 1px solid #e5e7eb; vertical-align: top; }
        table.meta td.k { width: 22%; background: #faf5ff; color: #6b7280; font-size: 9px;
                          text-transform: uppercase; }

        table.list th { background: #f3f4f6; text-align: left; padding: 6px; font-size: 9px;
                        text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #d1d5db; }
        table.list td { padding: 6px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        table.list tr { page-break-inside: avoid; }

        .num { text-align: right; }
        .center { text-align: center; }
        .muted { color: #9ca3af; }
        .small { font-size: 9px; }
        .desc { color: #4b5563; font-size: 10px; }

        .content { border: 1px solid #e5e7eb; padding: 10px 12px; line-height: 1.6; }
        .content p { margin: 0 0 8px; }

        .empty { padding: 10px; border: 1px dashed #d1d5db; color: #9ca3af;
                 text-align: center; font-size: 10px; }

        .sign { margin-top: 26px; page-break-inside: avoid; }
        .sign td { width: 50%; padding: 6px 10px 0; vertical-align: top; font-size: 10px; }
        .sign .line { border-top: 1px solid #9ca3af; margin-top: 40px; padding-top: 4px;
                      color: #6b7280; font-size: 9px; }

        .footer { position: fixed; bottom: -12mm; left: 0; right: 0;
                  font-size: 8px; color: #9ca3af; text-align: center; }
        .approved { color: #16a34a; font-weight: bold; }
        .pending { color: #d97706; font-weight: bold; }
    </style>
</head>
<body>

<div class="footer">
    {{ $meeting->organization->name ?? 'SECRETIS ERP' }} — Proces-verbal genere le
    {{ now()->format('d/m/Y a H:i') }} — Document interne
</div>

<div class="header">
    <div class="org">{{ $meeting->organization->name ?? 'SECRETIS ERP' }}</div>
    <div class="doctype">Proces-verbal de reunion</div>
    <div class="title">{{ $meeting->title ?? 'Reunion sans titre' }}</div>
</div>

<h2 class="section">Informations generales</h2>
<table class="meta">
    <tr>
        <td class="k">Type</td>
        <td>{{ $types[$meeting->meeting_type ?? ''] ?? ($meeting->meeting_type ?: '—') }}</td>
        <td class="k">Statut</td>
        <td>{{ $statuses[$meeting->status ?? ''] ?? ($meeting->status ?: '—') }}</td>
    </tr>
    <tr>
        <td class="k">Date prevue</td>
        <td>{{ $scheduled?->locale('fr')->isoFormat('dddd D MMMM YYYY [a] HH:mm') ?? '—' }}</td>
        <td class="k">Duree prevue</td>
        <td>{{ $meeting->duration_minutes ? $meeting->duration_minutes . ' min' : '—' }}</td>
    </tr>
    <tr>
        <td class="k">Ouverture</td>
        <td>{{ $started?->format('d/m/Y H:i') ?? '—' }}</td>
        <td class="k">Cloture</td>
        <td>{{ $ended?->format('d/m/Y H:i') ?? '—' }}</td>
    </tr>
    <tr>
        <td class="k">Lieu</td>
        <td>{{ $meeting->location ?: '—' }}</td>
        <td class="k">Duree reelle</td>
        <td>{{ ($started && $ended) ? $started->diffInMinutes($ended) . ' min' : '—' }}</td>
    </tr>
    <tr>
        <td class="k">President de seance</td>
        <td>{{ $meeting->president->name ?? '—' }}</td>
        <td class="k">Organisateur</td>
        <td>{{ $meeting->organizer->name ?? '—' }}</td>
    </tr>
</table>

@if (!empty($meeting->description))
    <h2 class="section">Objet de la reunion</h2>
    <div class="desc">{{ $meeting->description }}</div>
@endif

<h2 class="section">Participants ({{ $participants->count() }})</h2>
@if ($participants->count() > 0)
    <table class="list">
        <thead>
            <tr>
                <th style="width:4%;">#</th>
                <th style="width:34%;">Nom</th>
                <th style="width:28%;">Adresse e-mail</th>
                <th style="width:17%;">Role</th>
                <th style="width:17%;">Presence</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($participants as $i => $p)
                @php
                    $inv = $p->pivot->invitation_status ?? null;
                    $invLabel = match ($inv) {
                        'accepted' => 'Present (accepte)',
                        'declined' => 'Absent (decline)',
                        'tentative' => 'Provisoire',
                        'pending'  => 'Sans reponse',
                        default    => $inv ?: '—',
                    };
                @endphp
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $p->name ?? '—' }}</td>
                    <td class="small">{{ $p->email ?? '—' }}</td>
                    <td>{{ $p->pivot->role ?? '—' }}</td>
                    <td>{{ $invLabel }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="empty">Aucun participant enregistre pour cette reunion.</div>
@endif

<h2 class="section">Ordre du jour</h2>
@if (count($agendaItems) > 0)
    <table class="list">
        <thead>
            <tr>
                <th style="width:6%;">N°</th>
                <th style="width:34%;">Point</th>
                <th style="width:48%;">Details</th>
                <th style="width:12%;" class="num">Duree</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($agendaItems as $i => $item)
                <tr>
                    <td>{{ $item['order'] ?? ($i + 1) }}</td>
                    <td><strong>{{ $item['title'] ?? 'Point sans titre' }}</strong></td>
                    <td class="desc">{{ $item['description'] ?? '—' }}</td>
                    <td class="num">
                        {{ isset($item['duration_min']) ? $item['duration_min'] . ' min' : '—' }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="empty">Aucun point inscrit a l'ordre du jour.</div>
@endif

<h2 class="section">Compte rendu des debats</h2>
@if (!empty($meeting->minutes_content))
    <div class="content">{!! $meeting->minutes_content !!}</div>
@else
    <div class="empty">Le compte rendu n'a pas encore ete redige.</div>
@endif

<h2 class="section">Decisions et resolutions ({{ count($decisions) }})</h2>
@if (count($decisions) > 0)
    <table class="list">
        <thead>
            <tr>
                <th style="width:6%;">N°</th>
                <th style="width:32%;">Decision</th>
                <th style="width:36%;">Details</th>
                <th style="width:13%;">Priorite</th>
                <th style="width:13%;">Echeance</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($decisions as $i => $d)
                @php
                    $due = !empty($d['due_date'])
                        ? \Carbon\Carbon::parse($d['due_date'])->format('d/m/Y')
                        : '—';
                    $prio = $d['priority'] ?? 'normal';
                @endphp
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>
                        <strong>{{ $d['title'] ?? 'Decision sans intitule' }}</strong>
                        @if (!empty($d['task_id']))
                            <br><span class="muted small">Tache creee</span>
                        @endif
                    </td>
                    <td class="desc">{{ $d['description'] ?? '—' }}</td>
                    <td>{{ $priorities[$prio] ?? $prio }}</td>
                    <td>{{ $due }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="empty">Aucune decision n'a ete consignee.</div>
@endif

<h2 class="section">Validation</h2>
<table class="meta">
    <tr>
        <td class="k">Etat du proces-verbal</td>
        <td colspan="3">
            @if (!empty($meeting->minutes_approved_at))
                <span class="approved">Approuve</span>
                le {{ \Carbon\Carbon::parse($meeting->minutes_approved_at)->format('d/m/Y a H:i') }}
                @if (!empty($meeting->minutesApprover?->name))
                    par {{ $meeting->minutesApprover->name }}
                @endif
            @else
                <span class="pending">En attente d'approbation</span>
            @endif
        </td>
    </tr>
</table>

<table class="sign">
    <tr>
        <td>
            Le president de seance<br>
            <span class="muted">{{ $meeting->president->name ?? '—' }}</span>
            <div class="line">Signature</div>
        </td>
        <td>
            Le secretaire de seance<br>
            <span class="muted">{{ $meeting->organizer->name ?? '—' }}</span>
            <div class="line">Signature</div>
        </td>
    </tr>
</table>

</body>
</html>
