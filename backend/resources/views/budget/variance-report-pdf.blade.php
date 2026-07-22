<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport d'analyse des écarts — {{ $budget->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            color: #333;
            background: #fff;
            padding: 0;
        }

        /* ── En-tête ─────────────────────────────────── */
        .header {
            background: #1A3A5C;
            color: white;
            padding: 20px 30px;
        }
        .header-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .header h2 { font-size: 13px; font-weight: normal; color: #90CAF9; }
        .header .meta { text-align: right; color: #B0C4DE; font-size: 9px; line-height: 1.6; }

        /* ── Résumé exécutif ─────────────────────────── */
        .section { padding: 16px 30px; }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #1A3A5C;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #1A3A5C;
            padding-bottom: 4px;
            margin-bottom: 12px;
        }

        .kpi-grid {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }
        .kpi-card {
            flex: 1;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        }
        .kpi-label { font-size: 8px; color: #666; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
        .kpi-value { font-size: 14px; font-weight: bold; }
        .kpi-green  { color: #27AE60; }
        .kpi-red    { color: #E74C3C; }
        .kpi-orange { color: #F39C12; }
        .kpi-navy   { color: #1A3A5C; }

        /* ── Tableau ─────────────────────────────────── */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5px;
        }
        thead tr { background: #1A3A5C; color: white; }
        thead th {
            padding: 6px 8px;
            text-align: right;
            font-weight: bold;
            font-size: 8px;
            text-transform: uppercase;
        }
        thead th:first-child,
        thead th:nth-child(2) { text-align: left; }

        tbody tr { border-bottom: 1px solid #F1F5F9; }
        tbody tr:nth-child(even) { background: #F8FAFC; }
        tbody td { padding: 5px 8px; vertical-align: middle; }
        tbody td:not(:first-child):not(:nth-child(2)) { text-align: right; }

        /* Catégorie header */
        .cat-row td {
            background: #E8F4FD;
            font-weight: bold;
            color: #1A3A5C;
            padding: 5px 8px;
            font-size: 9px;
        }

        /* Couleurs statut */
        .status-ok       { background: #D4EDDA; color: #155724; padding: 2px 5px; border-radius: 3px; }
        .status-warning  { background: #FFF3CD; color: #856404; padding: 2px 5px; border-radius: 3px; }
        .status-exceeded { background: #F8D7DA; color: #721C24; padding: 2px 5px; border-radius: 3px; }

        .text-green  { color: #27AE60; }
        .text-red    { color: #E74C3C; }
        .text-orange { color: #F39C12; }

        /* Barre progression */
        .progress-track { background: #E2E8F0; height: 5px; border-radius: 3px; }
        .progress-fill  { height: 5px; border-radius: 3px; }

        /* Pied de page */
        .footer {
            position: fixed;
            bottom: 20px;
            left: 30px;
            right: 30px;
            border-top: 1px solid #E2E8F0;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: #999;
        }

        /* Signature */
        .signature-section {
            margin-top: 30px;
            padding: 20px 30px;
            display: flex;
            justify-content: flex-end;
        }
        .signature-box {
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 16px 30px;
            text-align: center;
            min-width: 200px;
        }
        .signature-title { font-size: 9px; font-weight: bold; color: #1A3A5C; margin-bottom: 40px; }
        .signature-line  { border-top: 1px solid #999; padding-top: 6px; font-size: 8px; color: #666; }

        /* Page break */
        .page-break { page-break-before: always; }
    </style>
</head>
<body>

{{-- ======== EN-TÊTE ======== --}}
<div class="header">
    <div class="header-grid">
        <div>
            <h1>{{ $org->name ?? 'Organisation' }}</h1>
            <h2>Rapport d'analyse des écarts budgétaires</h2>
        </div>
        <div class="meta">
            <div><strong>Budget :</strong> {{ $budget->name }}</div>
            <div><strong>Type :</strong> {{ ucfirst($budget->type) }}</div>
            <div><strong>Période :</strong> Cumul annuel (YTD)</div>
            <div><strong>Date d'arrêté :</strong> {{ $date }}</div>
            <div><strong>Statut :</strong> {{ ucfirst($budget->status) }}</div>
        </div>
    </div>
</div>

{{-- ======== RÉSUMÉ EXÉCUTIF ======== --}}
<div class="section">
    <div class="section-title">Résumé exécutif</div>

    @php
        $summary    = $analysis['summary'] ?? [];
        $totalBudg  = $summary['total_budget'] ?? 0;
        $totalReal  = $summary['total_actual'] ?? 0;
        $variance   = $summary['total_variance'] ?? 0;
        $execPct    = $summary['consumption_pct'] ?? 0;
        $alertCount = $summary['alerts_count'] ?? 0;

        $fcfa = fn($v) => number_format(abs($v), 0, ',', ' ') . ' FCFA';
        $pct  = fn($v) => number_format($v, 1, ',', ' ') . '%';

        $execColor = $execPct >= 100 ? 'kpi-red' : ($execPct >= 80 ? 'kpi-orange' : 'kpi-green');
    @endphp

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-label">Budget total (charges)</div>
            <div class="kpi-value kpi-navy">{{ $fcfa($totalBudg) }}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Réel consommé (YTD)</div>
            <div class="kpi-value {{ $execColor }}">{{ $fcfa($totalReal) }}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Taux d'exécution</div>
            <div class="kpi-value {{ $execColor }}">{{ $pct($execPct) }}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Écart net (Budg. − Réel)</div>
            <div class="kpi-value {{ $variance >= 0 ? 'kpi-green' : 'kpi-red' }}">
                {{ ($variance >= 0 ? '+' : '−') . $fcfa($variance) }}
            </div>
        </div>
        <div class="kpi-card">
            <div class="kpi-label">Alertes dépassement</div>
            <div class="kpi-value {{ $alertCount > 0 ? 'kpi-red' : 'kpi-green' }}">{{ $alertCount }}</div>
        </div>
    </div>
</div>

{{-- ======== TABLEAU DÉTAILLÉ ======== --}}
<div class="section">
    <div class="section-title">Analyse détaillée par catégorie</div>

    @php
        $byCategory = collect($analysis['lines'] ?? [])->groupBy('category');
    @endphp

    <table>
        <thead>
            <tr>
                <th style="text-align:left; width:70px;">Compte</th>
                <th style="text-align:left; width:160px;">Libellé</th>
                <th style="width:80px;">Budgété</th>
                <th style="width:80px;">Réel YTD</th>
                <th style="width:80px;">Écart</th>
                <th style="width:50px;">%</th>
                <th style="width:70px;">Statut</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($byCategory as $cat => $lines)
                {{-- Ligne catégorie --}}
                <tr class="cat-row">
                    <td colspan="7">{{ strtoupper($cat) }}</td>
                </tr>

                @foreach ($lines as $line)
                    @php
                        $pctLine = $line['variance_pct'] ?? 0;
                        $statusClass = $pctLine >= 100
                            ? 'status-exceeded'
                            : ($pctLine >= 80 ? 'status-warning' : 'status-ok');
                        $statusLabel = $pctLine >= 100
                            ? 'Dépassé'
                            : ($pctLine >= 80 ? 'À risque' : 'OK');
                        $varClass = ($line['variance'] ?? 0) >= 0 ? 'text-green' : 'text-red';
                    @endphp
                    <tr>
                        <td style="font-family:monospace; color:#666;">{{ $line['account_number'] }}</td>
                        <td>{{ $line['account_name'] }}</td>
                        <td>{{ $fcfa($line['budgeted'] ?? 0) }}</td>
                        <td style="font-weight:bold;">{{ $fcfa($line['actual_ytd'] ?? 0) }}</td>
                        <td class="{{ $varClass }}">
                            {{ (($line['variance'] ?? 0) >= 0 ? '+ ' : '− ') . $fcfa($line['variance'] ?? 0) }}
                        </td>
                        <td style="font-weight:bold;" class="{{ $pctLine >= 100 ? 'text-red' : ($pctLine >= 80 ? 'text-orange' : 'text-green') }}">
                            {{ $pct($pctLine) }}
                        </td>
                        <td>
                            <span class="{{ $statusClass }}">{{ $statusLabel }}</span>
                        </td>
                    </tr>
                @endforeach

                {{-- Sous-total catégorie --}}
                @php
                    $catBudget = $lines->sum('budgeted');
                    $catActual = $lines->sum('actual_ytd');
                    $catVar    = $catBudget - $catActual;
                    $catPct    = $catBudget ? round(($catActual / $catBudget) * 100, 1) : 0;
                @endphp
                <tr style="background:#EFF6FF; font-weight:bold; font-size:9px;">
                    <td colspan="2" style="text-align:right; padding-right:8px;">Sous-total {{ $cat }}</td>
                    <td>{{ $fcfa($catBudget) }}</td>
                    <td>{{ $fcfa($catActual) }}</td>
                    <td class="{{ $catVar >= 0 ? 'text-green' : 'text-red' }}">
                        {{ ($catVar >= 0 ? '+' : '−') . $fcfa($catVar) }}
                    </td>
                    <td class="{{ $catPct >= 100 ? 'text-red' : ($catPct >= 80 ? 'text-orange' : 'text-green') }}">
                        {{ $pct($catPct) }}
                    </td>
                    <td></td>
                </tr>
            @endforeach

            {{-- TOTAL GÉNÉRAL --}}
            <tr style="background:#1A3A5C; color:white; font-weight:bold; font-size:10px;">
                <td colspan="2" style="text-align:right; padding-right:8px; color:white;">TOTAL GÉNÉRAL</td>
                <td style="color:white;">{{ $fcfa($totalBudg) }}</td>
                <td style="color:white;">{{ $fcfa($totalReal) }}</td>
                <td style="color:{{ $variance >= 0 ? '#A3E0A3' : '#FCA5A5' }};">
                    {{ ($variance >= 0 ? '+' : '−') . $fcfa($variance) }}
                </td>
                <td style="color:white;">{{ $pct($execPct) }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>
</div>

{{-- ======== ALERTES ======== --}}
@if (!empty($analysis['alerts']))
<div class="section page-break">
    <div class="section-title">Lignes en alerte</div>
    <table>
        <thead>
            <tr>
                <th style="text-align:left;">Compte</th>
                <th style="text-align:left;">Libellé</th>
                <th>% Consommé</th>
                <th>Sévérité</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($analysis['alerts'] as $alert)
                <tr>
                    <td style="font-family:monospace;">{{ $alert['account_number'] }}</td>
                    <td>{{ $alert['account_name'] }}</td>
                    <td class="{{ $alert['pct'] >= 100 ? 'text-red' : 'text-orange' }}">{{ $pct($alert['pct']) }}</td>
                    <td>
                        <span class="{{ $alert['severity'] === 'exceeded' ? 'status-exceeded' : 'status-warning' }}">
                            {{ $alert['severity'] === 'exceeded' ? 'Dépassé' : 'Avertissement' }}
                        </span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ======== SIGNATURE ======== --}}
<div class="signature-section">
    <div class="signature-box">
        <div class="signature-title">
            Directeur Administratif et Financier<br>
            {{ $org->name ?? '' }}
        </div>
        <div class="signature-line">
            Date et signature
        </div>
    </div>
</div>

{{-- ======== PIED DE PAGE ======== --}}
<div class="footer">
    <div>SECRETIS ERP — {{ $org->name ?? 'IBIG' }} — Confidentiel</div>
    <div>Rapport généré le {{ $date }} · Budget : {{ $budget->name }}</div>
    <div>Page <span class="pagenum"></span></div>
</div>

</body>
</html>
