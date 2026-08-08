@php
    /**
     * Bilan SYSCOHADA — SECRETIS ERP
     * Appelée par App\Http\Controllers\SyscohadaController::balanceSheetPdf() — A4 paysage
     * Variables : $data (array, cf. SyscohadaService::generateBalanceSheet), $org (Organization), $fy (FiscalYear)
     */
    $fmt = fn ($v) => number_format((float) ($v ?? 0), 0, ',', ' ');

    $actif   = $data['actif']  ?? [];
    $passif  = $data['passif'] ?? [];
    $immo    = $actif['immobilisations'] ?? [];
    $circ    = $actif['circulant'] ?? [];
    $cp      = $passif['capitaux_propres'] ?? [];
    $pcirc   = $passif['passif_circulant'] ?? [];

    $immoRows = [
        'Immobilisations incorporelles'        => $immo['incorporelles'] ?? [],
        'Terrains'                             => $immo['terrains'] ?? [],
        'Bâtiments'                            => $immo['batiments'] ?? [],
        'Autres immobilisations corporelles'   => $immo['autres_corporelles'] ?? [],
        'Immobilisations financières'          => $immo['financieres'] ?? [],
    ];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Bilan SYSCOHADA — {{ $fy->name ?? '' }}</title>
    <style>
        @page { margin: 12mm 10mm 14mm 10mm; }
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 10px; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 8px; margin-bottom: 10px; }
        .org-name { font-size: 15px; font-weight: bold; color: #111827; }
        .org-meta { font-size: 9px; color: #6b7280; margin-top: 2px; }
        h1 { font-size: 14px; margin: 10px 0 2px; }
        .sub { font-size: 10px; color: #4b5563; margin-bottom: 10px; }
        .sub strong { color: #111827; }

        table { width: 100%; border-collapse: collapse; }
        .cols td { vertical-align: top; width: 50%; padding: 0; }

        table.bs { border: 1px solid #e5e7eb; }
        table.bs caption { caption-side: top; text-align: left; background: #9333EA; color: #ffffff;
                           font-size: 10px; font-weight: bold; padding: 5px 8px; letter-spacing: .5px; }
        table.bs th { background: #f5f3ff; color: #5b21b6; font-size: 8px; text-transform: uppercase;
                      padding: 4px 6px; border-bottom: 1px solid #ddd6fe; text-align: right; }
        table.bs th.lbl { text-align: left; }
        table.bs td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; font-size: 9px; }
        .num { text-align: right; }
        .grp td { background: #fafafa; font-weight: bold; font-size: 9px; text-transform: uppercase; color: #4b5563; }
        .sub-total td { background: #f7f5ff; font-weight: bold; border-top: 1px solid #ddd6fe; }
        .total td { background: #f5f3ff; font-weight: bold; font-size: 11px; border-top: 2px solid #9333EA; }
        .muted { color: #9ca3af; }

        .balance { margin-top: 10px; border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 9px; }
        .footer { margin-top: 14px; font-size: 8px; color: #9ca3af; text-align: center; line-height: 1.5; }
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

<h1>Bilan — Référentiel SYSCOHADA révisé</h1>
<div class="sub">
    Exercice <strong>{{ $data['fiscal_year'] ?? ($fy->name ?? '—') }}</strong>
    @if(!empty($data['period']['start']) && !empty($data['period']['end']))
        — Période du <strong>{{ \Carbon\Carbon::parse($data['period']['start'])->format('d/m/Y') }}</strong>
        au <strong>{{ \Carbon\Carbon::parse($data['period']['end'])->format('d/m/Y') }}</strong>
    @endif
    — Montants en {{ $org->currency ?? 'XOF' }}
</div>

<table class="cols">
    <tr>
        <td style="padding-right:6px;">

            <table class="bs">
                <caption>ACTIF</caption>
                <thead>
                    <tr>
                        <th class="lbl">Rubrique</th>
                        <th style="width:20%;">Brut</th>
                        <th style="width:20%;">Amort. / Prov.</th>
                        <th style="width:20%;">Net (N)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="grp"><td colspan="4">Actif immobilisé</td></tr>
                    @forelse($immoRows as $label => $row)
                        <tr>
                            <td>{{ $label }}</td>
                            <td class="num">{{ $fmt($row['brut'] ?? 0) }}</td>
                            <td class="num">{{ $fmt($row['amort'] ?? 0) }}</td>
                            <td class="num">{{ $fmt($row['net'] ?? 0) }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="muted">Aucun élément</td></tr>
                    @endforelse
                    <tr class="sub-total">
                        <td>Total actif immobilisé</td>
                        <td class="num">{{ $fmt($immo['total_brut'] ?? 0) }}</td>
                        <td class="num">{{ $fmt($immo['total_amort'] ?? 0) }}</td>
                        <td class="num">{{ $fmt($immo['total_net'] ?? 0) }}</td>
                    </tr>

                    <tr class="grp"><td colspan="4">Actif circulant</td></tr>
                    <tr>
                        <td>Stocks et en-cours</td>
                        <td class="num muted">—</td><td class="num muted">—</td>
                        <td class="num">{{ $fmt($circ['stocks'] ?? 0) }}</td>
                    </tr>
                    <tr>
                        <td>Créances clients</td>
                        <td class="num muted">—</td><td class="num muted">—</td>
                        <td class="num">{{ $fmt($circ['creances_clients'] ?? 0) }}</td>
                    </tr>
                    <tr>
                        <td>Autres créances</td>
                        <td class="num muted">—</td><td class="num muted">—</td>
                        <td class="num">{{ $fmt($circ['autres_creances'] ?? 0) }}</td>
                    </tr>
                    <tr class="sub-total">
                        <td>Total actif circulant</td>
                        <td class="num muted">—</td><td class="num muted">—</td>
                        <td class="num">{{ $fmt($circ['total'] ?? 0) }}</td>
                    </tr>

                    <tr class="grp"><td colspan="4">Trésorerie - Actif</td></tr>
                    <tr>
                        <td>Banques, caisses et assimilés</td>
                        <td class="num muted">—</td><td class="num muted">—</td>
                        <td class="num">{{ $fmt($actif['tresorerie'] ?? 0) }}</td>
                    </tr>

                    <tr class="total">
                        <td>TOTAL ACTIF</td>
                        <td class="num muted">—</td><td class="num muted">—</td>
                        <td class="num">{{ $fmt($data['total_actif'] ?? ($actif['total'] ?? 0)) }}</td>
                    </tr>
                </tbody>
            </table>

        </td>
        <td style="padding-left:6px;">

            <table class="bs">
                <caption>PASSIF</caption>
                <thead>
                    <tr>
                        <th class="lbl">Rubrique</th>
                        <th style="width:30%;">Net (N)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="grp"><td colspan="2">Capitaux propres et ressources assimilées</td></tr>
                    <tr><td>Capital</td><td class="num">{{ $fmt($cp['capital'] ?? 0) }}</td></tr>
                    <tr><td>Réserves</td><td class="num">{{ $fmt($cp['reserves'] ?? 0) }}</td></tr>
                    <tr><td>Report à nouveau</td><td class="num">{{ $fmt($cp['report_nouveau'] ?? 0) }}</td></tr>
                    <tr><td>Résultat net de l'exercice</td><td class="num">{{ $fmt($cp['resultat'] ?? 0) }}</td></tr>
                    <tr><td>Subventions d'investissement</td><td class="num">{{ $fmt($cp['subventions'] ?? 0) }}</td></tr>
                    <tr><td>Autres capitaux propres</td><td class="num">{{ $fmt($cp['autres'] ?? 0) }}</td></tr>
                    <tr class="sub-total">
                        <td>Total capitaux propres</td>
                        <td class="num">{{ $fmt($cp['total'] ?? 0) }}</td>
                    </tr>

                    <tr class="grp"><td colspan="2">Dettes financières et ressources assimilées</td></tr>
                    <tr><td>Emprunts et dettes financières</td><td class="num">{{ $fmt($passif['dettes_financieres'] ?? 0) }}</td></tr>
                    <tr><td>Provisions pour risques et charges</td><td class="num">{{ $fmt($passif['provisions'] ?? 0) }}</td></tr>
                    <tr class="sub-total">
                        <td>Total ressources durables</td>
                        <td class="num">{{ $fmt($passif['ressources_durables'] ?? 0) }}</td>
                    </tr>

                    <tr class="grp"><td colspan="2">Passif circulant</td></tr>
                    <tr><td>Dettes fournisseurs</td><td class="num">{{ $fmt($pcirc['fournisseurs'] ?? 0) }}</td></tr>
                    <tr><td>Dettes fiscales et sociales</td><td class="num">{{ $fmt($pcirc['dettes_fiscales'] ?? 0) }}</td></tr>
                    <tr><td>Autres dettes</td><td class="num">{{ $fmt($pcirc['autres_dettes'] ?? 0) }}</td></tr>
                    <tr class="sub-total">
                        <td>Total passif circulant</td>
                        <td class="num">{{ $fmt($pcirc['total'] ?? 0) }}</td>
                    </tr>

                    <tr class="grp"><td colspan="2">Trésorerie - Passif</td></tr>
                    <tr><td>Banques, crédits de trésorerie</td><td class="num">{{ $fmt($passif['tresorerie'] ?? 0) }}</td></tr>

                    <tr class="total">
                        <td>TOTAL PASSIF</td>
                        <td class="num">{{ $fmt($data['total_passif'] ?? ($passif['total'] ?? 0)) }}</td>
                    </tr>
                </tbody>
            </table>

        </td>
    </tr>
</table>

<div class="balance">
    @if(($data['is_balanced'] ?? false) === true)
        <strong>Bilan équilibré</strong> — Total actif = Total passif = {{ $fmt($data['total_actif'] ?? 0) }} {{ $org->currency ?? 'XOF' }}.
    @else
        <strong>Bilan non équilibré</strong> — Écart constaté : {{ $fmt($data['ecart'] ?? 0) }} {{ $org->currency ?? 'XOF' }}.
        Vérifier l'équilibre des écritures de la période avant dépôt.
    @endif
    Les comparatifs de l'exercice N-1 ne sont pas repris dans cette édition.
</div>

<div class="footer">
    {{ $org->name ?? '' }}@if(!empty($org?->tax_number)) — N° contribuable {{ $org->tax_number }}@endif<br>
    États financiers établis selon le référentiel SYSCOHADA révisé (OHADA). Montants en {{ $org->currency ?? 'XOF' }}.<br>
    Document généré le {{ now()->format('d/m/Y à H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
