<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport des visites — {{ $date->format('d/m/Y') }}</title>
    <style>
        * { font-family: DejaVu Sans, sans-serif; }
        body { font-size: 11px; color: #1f2937; margin: 0; }
        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 16px; }
        .org { font-size: 16px; font-weight: bold; color: #111827; }
        .title { font-size: 13px; color: #4b5563; margin-top: 2px; }
        .kpis { width: 100%; margin-bottom: 18px; border-collapse: collapse; }
        .kpis td { width: 25%; padding: 8px; border: 1px solid #e5e7eb; text-align: center; }
        .kpi-value { font-size: 18px; font-weight: bold; color: #9333EA; }
        .kpi-label { font-size: 9px; color: #6b7280; text-transform: uppercase; }
        table.list { width: 100%; border-collapse: collapse; }
        table.list th { background: #f3f4f6; text-align: left; padding: 6px; font-size: 9px;
                        text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #d1d5db; }
        table.list td { padding: 6px; border-bottom: 1px solid #f3f4f6; }
        .num { text-align: right; }
        .muted { color: #9ca3af; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>

<div class="header">
    <div class="org">{{ $org->name }}</div>
    <div class="title">Rapport des visites — {{ $date->locale('fr')->isoFormat('dddd D MMMM YYYY') }}</div>
</div>

<table class="kpis">
    <tr>
        <td>
            <div class="kpi-value">{{ $report['total_visits'] ?? 0 }}</div>
            <div class="kpi-label">Visites</div>
        </td>
        <td>
            <div class="kpi-value">{{ $report['checked_in'] ?? 0 }}</div>
            <div class="kpi-label">Encore présents</div>
        </td>
        <td>
            <div class="kpi-value">{{ $report['checked_out'] ?? 0 }}</div>
            <div class="kpi-label">Départs</div>
        </td>
        <td>
            <div class="kpi-value">{{ $report['average_duration_min'] ?? 0 }} min</div>
            <div class="kpi-label">Durée moyenne</div>
        </td>
    </tr>
</table>

<table class="list">
    <thead>
        <tr>
            <th>Badge</th>
            <th>Visiteur</th>
            <th>Société</th>
            <th>Hôte</th>
            <th>Objet</th>
            <th>Arrivée</th>
            <th>Départ</th>
            <th class="num">Durée</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($visits as $v)
            @php
                $in  = $v->checked_in_at ? \Carbon\Carbon::parse($v->checked_in_at) : null;
                $out = $v->checked_out_at ? \Carbon\Carbon::parse($v->checked_out_at) : null;
            @endphp
            <tr>
                <td>{{ $v->badge_number ?: '—' }}</td>
                <td>{{ trim(($v->visitor->first_name ?? '') . ' ' . ($v->visitor->last_name ?? '')) ?: '—' }}</td>
                <td>{{ $v->visitor->company ?? '—' }}</td>
                <td>{{ $v->host->name ?? '—' }}</td>
                <td>{{ $v->purpose ?: '—' }}</td>
                <td>{{ $in?->format('H:i') ?? '—' }}</td>
                <td>{{ $out?->format('H:i') ?? '—' }}</td>
                <td class="num">{{ ($in && $out) ? $out->diffInMinutes($in) . ' min' : '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="8" class="muted" style="text-align:center; padding:20px;">Aucune visite enregistrée ce jour.</td></tr>
        @endforelse
    </tbody>
</table>

<div class="footer">
    Document généré le {{ now()->format('d/m/Y à H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
