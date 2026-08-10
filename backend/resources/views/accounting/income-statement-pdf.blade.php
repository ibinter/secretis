@php
    /**
     * Compte de résultat SYSCOHADA — SECRETIS ERP
     * Appelée par App\Http\Controllers\SyscohadaController::incomeStatementPdf() — A4 portrait
     * Variables : $data (array, cf. SyscohadaService::generateIncomeStatement), $org (Organization), $fy (FiscalYear)
     */
    $fmt  = fn ($v) => number_format((float) ($v ?? 0), 0, ',', ' ');
    $pct  = fn ($v) => number_format((float) ($v ?? 0), 2, ',', ' ') . ' %';
    $dev  = $org->currency ?? 'XOF';

    /**
     * Lignes du compte de résultat :
     * [libellé, clé dans $data, type]  — type : 'produit' | 'charge' | 'solde'
     */
    $rows = [
        ['Chiffre d\'affaires',                          'chiffre_affaires',             'produit'],
        ['Autres produits d\'activités ordinaires',      'autres_produits',              'produit'],
        ['Production de l\'exercice',                    'production_exercice',          'solde'],

        ['Achats consommés',                             'achats_consommes',             'charge'],
        ['Transports',                                   'transports',                   'charge'],
        ['Services extérieurs A',                        'services_ext_a',               'charge'],
        ['Services extérieurs B',                        'services_ext_b',               'charge'],
        ['Consommations intermédiaires',                 'consommations_intermediaires', 'solde'],

        ['VALEUR AJOUTÉE (VA)',                          'valeur_ajoutee',               'sig'],

        ['Charges de personnel',                         'charges_personnel',            'charge'],
        ['Impôts et taxes',                              'impots_taxes',                 'charge'],
        ['EXCÉDENT BRUT D\'EXPLOITATION (EBE)',          'ebe',                          'sig'],

        ['Reprises de provisions et amortissements',     'reprises',                     'produit'],
        ['Autres charges d\'exploitation',               'autres_charges',               'charge'],
        ['Dotations aux amortissements et provisions',   'dotations_amort',              'charge'],
        ['RÉSULTAT D\'EXPLOITATION (REX)',               'rex',                          'sig'],

        ['Produits financiers',                          'produits_financiers',          'produit'],
        ['Charges financières',                          'charges_financieres',          'charge'],
        ['Résultat financier',                           'resultat_financier',           'solde'],

        ['RÉSULTAT DES ACTIVITÉS ORDINAIRES (RAO)',      'rao',                          'sig'],

        ['Produits hors activités ordinaires (HAO)',     'produits_hao',                 'produit'],
        ['Charges hors activités ordinaires (HAO)',      'charges_hao',                  'charge'],
        ['Résultat HAO',                                 'resultat_hao',                 'solde'],

        ['Impôts sur le résultat',                       'impots_sur_resultat',          'charge'],
    ];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Compte de résultat — {{ $fy->name ?? '' }}</title>
    <style>
        @page { margin: 14mm 12mm 16mm 12mm; }
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 10px; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 8px; margin-bottom: 10px; }
        .org-name { font-size: 15px; font-weight: bold; color: #111827; }
        .org-meta { font-size: 9px; color: #6b7280; margin-top: 2px; }
        h1 { font-size: 14px; margin: 10px 0 2px; }
        .sub { font-size: 10px; color: #4b5563; margin-bottom: 12px; }
        .sub strong { color: #111827; }

        table { width: 100%; border-collapse: collapse; }
        table.cr { border: 1px solid #e5e7eb; }
        table.cr th { background: #f5f3ff; color: #5b21b6; font-size: 8px; text-transform: uppercase;
                      padding: 5px 8px; border-bottom: 1px solid #ddd6fe; text-align: left; }
        table.cr th.num { text-align: right; }
        table.cr td { padding: 4px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
        .num { text-align: right; }
        .nat { font-size: 8px; color: #6b7280; text-transform: uppercase; }
        tr.solde td { background: #fafafa; font-weight: bold; }
        tr.sig td { background: #f7f5ff; font-weight: bold; border-top: 1px solid #ddd6fe; }
        tr.net td { background: #f5f3ff; font-weight: bold; font-size: 12px;
                    border-top: 2px solid #9333EA; padding: 8px; }
        .muted { color: #9ca3af; }

        table.ratios { margin-top: 14px; border: 1px solid #e5e7eb; }
        table.ratios td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
        table.ratios td.lbl { color: #4b5563; }
        .footer { margin-top: 18px; font-size: 8px; color: #9ca3af; text-align: center; line-height: 1.5; }
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

<h1>Compte de résultat — Référentiel SYSCOHADA révisé</h1>
<div class="sub">
    Exercice <strong>{{ $data['fiscal_year'] ?? ($fy->name ?? '—') }}</strong>
    @if(!empty($data['period']['start']) && !empty($data['period']['end']))
        — Période du <strong>{{ \Carbon\Carbon::parse($data['period']['start'])->format('d/m/Y') }}</strong>
        au <strong>{{ \Carbon\Carbon::parse($data['period']['end'])->format('d/m/Y') }}</strong>
    @endif
    — Montants en {{ $dev }}
</div>

<table class="cr">
    <thead>
        <tr>
            <th style="width:58%;">Libellé</th>
            <th style="width:14%;">Nature</th>
            <th class="num" style="width:28%;">Exercice N</th>
        </tr>
    </thead>
    <tbody>
        @forelse($rows as $row)
            @php
                [$label, $key, $type] = $row;
                $classe = in_array($type, ['solde', 'sig'], true) ? $type : '';
                $nature = match ($type) {
                    'produit' => 'Produit',
                    'charge'  => 'Charge',
                    default   => 'Solde',
                };
            @endphp
            <tr class="{{ $classe }}">
                <td>{{ $label }}</td>
                <td class="nat">{{ $nature }}</td>
                <td class="num">{{ $fmt($data[$key] ?? 0) }}</td>
            </tr>
        @empty
            <tr><td colspan="3" class="muted" style="text-align:center; padding:18px;">Aucun élément</td></tr>
        @endforelse

        <tr class="net">
            <td>RÉSULTAT NET DE L'EXERCICE</td>
            <td class="nat">{{ (float) ($data['resultat_net'] ?? 0) >= 0 ? 'Bénéfice' : 'Perte' }}</td>
            <td class="num">{{ $fmt($data['resultat_net'] ?? 0) }} {{ $dev }}</td>
        </tr>
    </tbody>
</table>

<table class="ratios">
    <tr>
        <td class="lbl" style="width:70%;">Taux de marge brute</td>
        <td class="num">{{ $pct($data['taux_marge_brute'] ?? 0) }}</td>
    </tr>
    <tr>
        <td class="lbl">Taux de valeur ajoutée</td>
        <td class="num">{{ $pct($data['taux_valeur_ajoutee'] ?? 0) }}</td>
    </tr>
</table>

<div class="footer">
    {{ $org->name ?? '' }}@if(!empty($org?->tax_number)) — N° contribuable {{ $org->tax_number }}@endif<br>
    Soldes intermédiaires de gestion établis selon le référentiel SYSCOHADA révisé (OHADA).
    Les comparatifs de l'exercice N-1 ne sont pas repris dans cette édition.<br>
    Document généré le {{ now()->format('d/m/Y à H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
