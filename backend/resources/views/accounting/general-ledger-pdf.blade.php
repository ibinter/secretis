<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 11px; }
        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 14px; }
        .org-name { font-size: 16px; font-weight: bold; color: #9333EA; }
        .org-meta { font-size: 10px; color: #6b7280; margin-top: 2px; }
        h1 { font-size: 15px; margin: 0 0 4px; }
        .sub { font-size: 11px; color: #4b5563; margin-bottom: 12px; }
        .sub strong { color: #111827; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f5f3ff; color: #5b21b6; text-align: left; padding: 6px 8px; font-size: 10px; border-bottom: 1px solid #ddd6fe; }
        td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
        .num { text-align: right; }
        .ran td { background: #fafafa; font-style: italic; }
        .totals td { border-top: 2px solid #9333EA; font-weight: bold; background: #f5f3ff; }
        .footer { margin-top: 20px; font-size: 9px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="org-name">{{ $org->name ?? 'Organisation' }}</div>
        <div class="org-meta">
            @if(!empty($org->address)){{ $org->address }}@endif
            @if(!empty($org->city)), {{ $org->city }}@endif
            @if(!empty($org->tax_number)) — NCC/NIF : {{ $org->tax_number }}@endif
        </div>
    </div>

    <h1>Grand livre du compte</h1>
    <div class="sub">
        Compte <strong>{{ $data['account_number'] }} — {{ $data['account_name'] }}</strong><br>
        Période du <strong>{{ \Carbon\Carbon::parse($data['period']['start'])->format('d/m/Y') }}</strong>
        au <strong>{{ \Carbon\Carbon::parse($data['period']['end'])->format('d/m/Y') }}</strong>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>N° écriture</th>
                <th>Jrnl</th>
                <th>Libellé</th>
                <th>Réf.</th>
                <th class="num">Débit</th>
                <th class="num">Crédit</th>
                <th class="num">Solde</th>
            </tr>
        </thead>
        <tbody>
            <tr class="ran">
                <td colspan="7">Report à nouveau</td>
                <td class="num">{{ number_format((float) $data['report_a_nouveau'], 0, ',', ' ') }}</td>
            </tr>
            @foreach($data['lines'] as $line)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($line['entry_date'])->format('d/m/Y') }}</td>
                    <td>{{ $line['entry_number'] }}</td>
                    <td>{{ $line['journal_type'] }}</td>
                    <td>{{ $line['description'] }}</td>
                    <td>{{ $line['reference'] }}</td>
                    <td class="num">{{ (float) $line['debit_amount'] ? number_format((float) $line['debit_amount'], 0, ',', ' ') : '' }}</td>
                    <td class="num">{{ (float) $line['credit_amount'] ? number_format((float) $line['credit_amount'], 0, ',', ' ') : '' }}</td>
                    <td class="num">{{ number_format((float) $line['solde_cumul'], 0, ',', ' ') }}</td>
                </tr>
            @endforeach
            <tr class="totals">
                <td colspan="5">Totaux de la période</td>
                <td class="num">{{ number_format((float) $data['total_debit'], 0, ',', ' ') }}</td>
                <td class="num">{{ number_format((float) $data['total_credit'], 0, ',', ' ') }}</td>
                <td class="num">{{ number_format((float) $data['solde_final'], 0, ',', ' ') }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        SECRETIS ERP — Édité le {{ now()->format('d/m/Y H:i') }} — Montants en {{ $org->currency ?? 'XOF' }}
    </div>
</body>
</html>
