@php
    /**
     * Rapport d'écarts budgétaires — SECRETIS ERP
     * Appelée par App\Http\Controllers\BudgetController::variancePdf()
     * Variables : $budget (App\Models\Budget), $analysis (array, cf. BudgetService::getVarianceAnalysis),
     *             $org (Organization|null), $date (string 'd/m/Y')
     */
    $fmt = fn ($v) => number_format((float) ($v ?? 0), 0, ',', ' ');
    $pct = fn ($v) => number_format((float) ($v ?? 0), 2, ',', ' ') . ' %';
    $dev = $org->currency ?? 'XOF';

    $summary = $analysis['summary'] ?? [];
    $lines   = $analysis['lines'] ?? [];
    $depts   = $analysis['by_department'] ?? [];
    $cats    = $analysis['by_category'] ?? [];
    $alerts  = $analysis['alerts'] ?? [];

    $types = [
        'operationnel'   => 'Opérationnel',
        'investissement' => 'Investissement',
        'projet'         => 'Projet',
        'departement'    => 'Département',
    ];
    $statuts = [
        'draft'    => 'Brouillon',
        'approved' => 'Approuvé',
        'active'   => 'Actif',
        'closed'   => 'Clôturé',
    ];
    $categories = [
        'personnel'      => 'Personnel',
        'fonctionnement' => 'Fonctionnement',
        'investissement' => 'Investissement',
        'impots'         => 'Impôts et taxes',
        'autres'         => 'Autres',
    ];
    $severites = [
        'exceeded' => 'Dépassement',
        'warning'  => 'Vigilance',
        'info'     => 'Information',
    ];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Rapport d'écarts budgétaires — {{ $budget->name ?? '' }}</title>
    <style>
        @page { margin: 12mm 10mm 14mm 10mm; }
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 10px; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 8px; margin-bottom: 10px; }
        .org-name { font-size: 15px; font-weight: bold; color: #111827; }
        .org-meta { font-size: 9px; color: #6b7280; margin-top: 2px; }
        h1 { font-size: 14px; margin: 10px 0 2px; }
        h2 { font-size: 11px; color: #5b21b6; margin: 16px 0 5px;
             border-bottom: 1px solid #ddd6fe; padding-bottom: 3px; }
        .sub { font-size: 10px; color: #4b5563; margin-bottom: 12px; }
        .sub strong { color: #111827; }

        table { width: 100%; border-collapse: collapse; }
        .kpis { margin-bottom: 6px; }
        .kpis td { width: 25%; padding: 7px; border: 1px solid #e5e7eb; text-align: center; }
        .kpi-value { font-size: 14px; font-weight: bold; color: #9333EA; }
        .kpi-label { font-size: 8px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }

        table.list th { background: #f5f3ff; color: #5b21b6; text-align: left; padding: 5px 6px;
                        font-size: 8px; text-transform: uppercase; border-bottom: 1px solid #ddd6fe; }
        table.list th.num { text-align: right; }
        table.list td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; font-size: 9px; }
        .num { text-align: right; }
        .ctr { text-align: center; }
        .muted { color: #9ca3af; }
        tr.tot td { background: #f5f3ff; font-weight: bold; border-top: 2px solid #9333EA; }
        .ko { font-weight: bold; }
        .footer { margin-top: 16px; font-size: 8px; color: #9ca3af; text-align: center; line-height: 1.5; }
    </style>
</head>
<body>

<div class="header">
    <div class="org-name">{{ $org->name ?? 'Organisation' }}</div>
    <div class="org-meta">
        @if(!empty($org?->address)){{ $org->address }}@endif
        @if(!empty($org?->city)), {{ $org->city }}@endif
        @if(!empty($org?->phone)) — Tél. {{ $org->phone }}@endif
        @if(!empty($org?->tax_number)) — N° contribuable : {{ $org->tax_number }}@endif
    </div>
</div>

<h1>Rapport d'écarts budgétaires</h1>
<div class="sub">
    Budget <strong>{{ $budget->name ?? '—' }}</strong>
    — Type : <strong>{{ $types[$budget->type ?? ''] ?? ($budget->type ?? '—') }}</strong>
    — Statut : <strong>{{ $statuts[$budget->status ?? ''] ?? ($budget->status ?? '—') }}</strong>
    — Édité le <strong>{{ $date ?? now()->format('d/m/Y') }}</strong>
    — Montants en {{ $dev }}
</div>

<table class="kpis">
    <tr>
        <td>
            <div class="kpi-value">{{ $fmt($summary['total_budget'] ?? 0) }}</div>
            <div class="kpi-label">Budget charges</div>
        </td>
        <td>
            <div class="kpi-value">{{ $fmt($summary['total_actual'] ?? 0) }}</div>
            <div class="kpi-label">Réalisé YTD</div>
        </td>
        <td>
            <div class="kpi-value">{{ $fmt($summary['total_variance'] ?? 0) }}</div>
            <div class="kpi-label">Écart</div>
        </td>
        <td>
            <div class="kpi-value">{{ $pct($summary['consumption_pct'] ?? 0) }}</div>
            <div class="kpi-label">Taux de consommation</div>
        </td>
    </tr>
</table>
<div class="muted" style="font-size:8px;">
    {{ $summary['lines_count'] ?? 0 }} ligne(s) budgétaire(s) — {{ $summary['alerts_count'] ?? 0 }} alerte(s).
</div>

<h2>Détail par ligne budgétaire</h2>
<table class="list">
    <thead>
        <tr>
            <th style="width:8%;">Compte</th>
            <th>Intitulé</th>
            <th style="width:12%;">Département</th>
            <th style="width:10%;">Catégorie</th>
            <th class="num" style="width:11%;">Budget</th>
            <th class="num" style="width:11%;">Réalisé YTD</th>
            <th class="num" style="width:11%;">Écart</th>
            <th class="num" style="width:8%;">Conso.</th>
            <th style="width:10%;">Statut</th>
        </tr>
    </thead>
    <tbody>
        @forelse($lines as $l)
            <tr>
                <td>{{ $l['account_number'] ?? '—' }}</td>
                <td>{{ $l['account_name'] ?? '—' }}@if(!empty($l['is_income'])) <span class="muted">(produit)</span>@endif</td>
                <td>{{ $l['department'] ?? '—' }}</td>
                <td>{{ $categories[$l['category'] ?? ''] ?? ($l['category'] ?? '—') }}</td>
                <td class="num">{{ $fmt($l['budgeted'] ?? 0) }}</td>
                <td class="num">{{ $fmt($l['actual_ytd'] ?? 0) }}</td>
                <td class="num">{{ $fmt($l['variance'] ?? 0) }}</td>
                <td class="num">{{ $pct($l['consumption_pct'] ?? 0) }}</td>
                <td class="{{ ($l['status'] ?? '') === 'défavorable' ? 'ko' : '' }}">{{ $l['status'] ?? '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="9" class="muted ctr" style="padding:16px;">Aucun élément</td></tr>
        @endforelse
        @if(count($lines) > 0)
            <tr class="tot">
                <td colspan="4">Total charges</td>
                <td class="num">{{ $fmt($summary['total_budget'] ?? 0) }}</td>
                <td class="num">{{ $fmt($summary['total_actual'] ?? 0) }}</td>
                <td class="num">{{ $fmt($summary['total_variance'] ?? 0) }}</td>
                <td class="num">{{ $pct($summary['consumption_pct'] ?? 0) }}</td>
                <td></td>
            </tr>
        @endif
    </tbody>
</table>

<h2>Consolidation par département</h2>
<table class="list">
    <thead>
        <tr>
            <th>Département</th>
            <th class="num" style="width:18%;">Budget</th>
            <th class="num" style="width:18%;">Réalisé</th>
            <th class="num" style="width:18%;">Écart</th>
            <th class="num" style="width:14%;">Conso.</th>
        </tr>
    </thead>
    <tbody>
        @forelse($depts as $d)
            <tr>
                <td>{{ $d['name'] ?? '—' }}</td>
                <td class="num">{{ $fmt($d['budgeted'] ?? 0) }}</td>
                <td class="num">{{ $fmt($d['actual'] ?? 0) }}</td>
                <td class="num">{{ $fmt($d['variance'] ?? 0) }}</td>
                <td class="num">{{ $pct($d['variance_pct'] ?? 0) }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="muted ctr" style="padding:14px;">Aucun élément</td></tr>
        @endforelse
    </tbody>
</table>

<h2>Consolidation par catégorie</h2>
<table class="list">
    <thead>
        <tr>
            <th>Catégorie</th>
            <th class="num" style="width:18%;">Budget</th>
            <th class="num" style="width:18%;">Réalisé</th>
            <th class="num" style="width:18%;">Écart</th>
            <th class="num" style="width:14%;">Conso.</th>
        </tr>
    </thead>
    <tbody>
        @forelse($cats as $key => $c)
            <tr>
                <td>{{ $categories[$key] ?? $key }}</td>
                <td class="num">{{ $fmt($c['budgeted'] ?? 0) }}</td>
                <td class="num">{{ $fmt($c['actual'] ?? 0) }}</td>
                <td class="num">{{ $fmt($c['variance'] ?? 0) }}</td>
                <td class="num">{{ $pct($c['variance_pct'] ?? 0) }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="muted ctr" style="padding:14px;">Aucun élément</td></tr>
        @endforelse
    </tbody>
</table>

<h2>Alertes de dépassement</h2>
<table class="list">
    <thead>
        <tr>
            <th style="width:12%;">Compte</th>
            <th>Intitulé</th>
            <th class="num" style="width:16%;">Consommation</th>
            <th style="width:20%;">Sévérité</th>
        </tr>
    </thead>
    <tbody>
        @forelse($alerts as $a)
            <tr>
                <td>{{ $a['account_number'] ?? '—' }}</td>
                <td>{{ $a['account_name'] ?? '—' }}</td>
                <td class="num">{{ $pct($a['pct'] ?? 0) }}</td>
                <td class="{{ ($a['severity'] ?? '') === 'exceeded' ? 'ko' : '' }}">
                    {{ $severites[$a['severity'] ?? ''] ?? ($a['severity'] ?? '—') }}
                </td>
            </tr>
        @empty
            <tr><td colspan="4" class="muted ctr" style="padding:14px;">Aucun élément</td></tr>
        @endforelse
    </tbody>
</table>

@if(!empty($budget->notes))
    <h2>Notes</h2>
    <div style="font-size:9px; color:#4b5563; line-height:1.5;">{!! nl2br(e($budget->notes)) !!}</div>
@endif

<div class="footer">
    {{ $org->name ?? '' }} — Écart = Budget - Réalisé. Un écart positif sur une charge traduit une sous-consommation.<br>
    Montants en {{ $dev }} — Document généré le {{ now()->format('d/m/Y à H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
