<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Devis {{ $quote->quote_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10pt;
            color: #2d3748;
            background: #fff;
            line-height: 1.5;
        }
        .header {
            display: table;
            width: 100%;
            padding: 0 0 20px 0;
            border-bottom: 3px solid #1A3A5C;
            margin-bottom: 28px;
        }
        .header-left  { display: table-cell; width: 55%; vertical-align: top; }
        .header-right { display: table-cell; width: 45%; vertical-align: top; text-align: right; }
        .org-logo     { max-height: 70px; max-width: 180px; margin-bottom: 8px; }
        .org-name     { font-size: 15pt; font-weight: bold; color: #1A3A5C; }
        .org-info     { font-size: 8.5pt; color: #666; margin-top: 4px; line-height: 1.6; }
        .doc-title    { font-size: 22pt; font-weight: bold; color: #1A3A5C; letter-spacing: 1px; }
        .doc-number   { font-size: 11pt; color: #4a5568; margin-top: 4px; }
        .validity-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: bold;
            margin-top: 8px;
            background: #ebf8ff;
            color: #2b6cb0;
            border: 1px solid #bee3f8;
        }
        .meta-row  { display: table; width: 100%; margin-bottom: 28px; }
        .meta-block { display: table-cell; width: 50%; vertical-align: top; }
        .meta-block:last-child { text-align: right; }
        .meta-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8px; color: #a0aec0; margin-bottom: 2px; }
        .meta-value { font-size: 10pt; color: #2d3748; font-weight: 600; }
        .meta-item  { margin-bottom: 10px; }
        .client-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #1A3A5C;
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 28px;
        }
        .client-box .section-label { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8px; color: #a0aec0; margin-bottom: 6px; }
        .client-name  { font-size: 12pt; font-weight: bold; color: #1A3A5C; }
        .client-info  { font-size: 9pt; color: #4a5568; line-height: 1.7; margin-top: 4px; }
        .items-table  { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table thead tr { background: #1A3A5C; color: #fff; }
        .items-table thead th { padding: 9px 10px; text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .items-table thead th.text-right { text-align: right; }
        .items-table tbody tr:nth-child(even) { background: #f7fafc; }
        .items-table tbody td { padding: 9px 10px; font-size: 9.5pt; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .items-table tbody td.text-right  { text-align: right; }
        .items-table tbody td.text-center { text-align: center; }
        .totals-wrapper { display: table; width: 100%; margin-bottom: 28px; }
        .totals-left    { display: table-cell; width: 55%; vertical-align: top; }
        .totals-right   { display: table-cell; width: 45%; vertical-align: top; }
        .totals-table   { width: 100%; border-collapse: collapse; }
        .totals-table td { padding: 5px 10px; font-size: 9.5pt; }
        .totals-table .label { color: #718096; }
        .totals-table .value { text-align: right; font-weight: 600; }
        .totals-table .separator td { border-top: 1px solid #e2e8f0; padding-top: 8px; }
        .totals-table .total-row td { background: #1A3A5C; color: #fff; font-size: 12pt; font-weight: bold; padding: 10px; border-radius: 4px; }
        .bon-pour-accord {
            margin-top: 30px;
            border: 2px dashed #1A3A5C;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
        }
        .bon-pour-accord .label { font-size: 11pt; font-weight: bold; color: #1A3A5C; margin-bottom: 8px; }
        .bon-pour-accord .sub   { font-size: 8.5pt; color: #718096; }
        .signature-zone {
            display: table;
            width: 100%;
            margin-top: 16px;
        }
        .signature-block { display: table-cell; width: 50%; vertical-align: top; padding: 0 8px; }
        .signature-line  { border-top: 1px solid #cbd5e0; margin-top: 50px; font-size: 8pt; color: #a0aec0; text-align: center; padding-top: 4px; }
        .footer {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            border-top: 2px solid #1A3A5C;
            padding: 10px 20px;
            font-size: 7.5pt;
            color: #718096;
            background: #fff;
        }
        .footer-inner { display: table; width: 100%; }
        .footer-left  { display: table-cell; width: 60%; vertical-align: middle; }
        .footer-right { display: table-cell; width: 40%; vertical-align: middle; text-align: right; }
        .footer-org   { font-weight: bold; color: #1A3A5C; font-size: 8pt; }
        .page-content { margin-bottom: 80px; padding: 30px 35px 0; }
    </style>
</head>
<body>
<div class="page-content">

    {{-- ===== EN-TÊTE ===== --}}
    <div class="header">
        <div class="header-left">
            @if($org->getSetting('logo_url'))
                <img src="{{ $org->getSetting('logo_url') }}" alt="{{ $org->name }}" class="org-logo">
            @endif
            <div class="org-name">{{ $org->name }}</div>
            <div class="org-info">
                @if($org->address){{ $org->address }}<br>@endif
                @if($org->phone)Tél. : {{ $org->phone }}<br>@endif
                {{ $org->email }}
                @if($org->getSetting('nif'))<br>NIF : {{ $org->getSetting('nif') }}@endif
            </div>
        </div>
        <div class="header-right">
            <div class="doc-title">DEVIS</div>
            <div class="doc-number">{{ $quote->quote_number }}</div>
            @if($quote->valid_until)
            <div>
                <span class="validity-badge">
                    Valable jusqu'au {{ $quote->valid_until->format('d/m/Y') }}
                </span>
            </div>
            @endif
        </div>
    </div>

    {{-- ===== MÉTA ===== --}}
    <div class="meta-row">
        <div class="meta-block">
            <div class="meta-item">
                <div class="meta-label">Date d'émission</div>
                <div class="meta-value">{{ $quote->issue_date->format('d/m/Y') }}</div>
            </div>
            @if($quote->valid_until)
            <div class="meta-item">
                <div class="meta-label">Validité</div>
                <div class="meta-value">{{ $quote->valid_until->format('d/m/Y') }}</div>
            </div>
            @endif
        </div>
        <div class="meta-block">
            <div class="meta-item">
                <div class="meta-label">Objet</div>
                <div class="meta-value">{{ $quote->title }}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Référence</div>
                <div class="meta-value">{{ $quote->quote_number }}</div>
            </div>
        </div>
    </div>

    {{-- ===== CLIENT ===== --}}
    <div class="client-box">
        <div class="section-label">Devis établi pour</div>
        <div class="client-name">{{ $client->name }}</div>
        <div class="client-info">
            @if($client->address){{ $client->address }}<br>@endif
            @if($client->email){{ $client->email }}@endif
            @if($client->phone) — Tél. {{ $client->phone }}@endif
            @if($client->tax_number)<br>NIF : {{ $client->tax_number }}@endif
        </div>
    </div>

    {{-- ===== LIGNES ===== --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:5%">#</th>
                <th style="width:50%">Description</th>
                <th class="text-center" style="width:10%">Qté</th>
                <th class="text-right" style="width:17%">Prix unitaire</th>
                <th class="text-right" style="width:18%">Total HT</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $i => $item)
            <tr>
                <td style="color:#a0aec0">{{ $i + 1 }}</td>
                <td>{{ $item->description }}</td>
                <td class="text-center">{{ number_format($item->quantity, 2, ',', ' ') }}</td>
                <td class="text-right">{{ number_format($item->unit_price, 0, ',', ' ') }} FCFA</td>
                <td class="text-right">{{ number_format($item->total, 0, ',', ' ') }} FCFA</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- ===== TOTAUX ===== --}}
    <div class="totals-wrapper">
        <div class="totals-left">
            @if($quote->notes)
            <div style="margin-bottom:12px; font-size:8.5pt; color:#4a5568;">
                <strong>Notes :</strong> {{ $quote->notes }}
            </div>
            @endif
            @if($quote->terms)
            <div style="font-size:8.5pt; color:#718096;">
                <strong>Conditions :</strong> {{ $quote->terms }}
            </div>
            @endif
        </div>
        <div class="totals-right">
            <table class="totals-table">
                <tr>
                    <td class="label">Sous-total HT</td>
                    <td class="value">{{ number_format($quote->subtotal, 0, ',', ' ') }} FCFA</td>
                </tr>
                <tr>
                    <td class="label">TVA ({{ number_format($quote->tax_rate, 0) }}%)</td>
                    <td class="value">{{ number_format($quote->tax_amount, 0, ',', ' ') }} FCFA</td>
                </tr>
                <tr class="separator"><td></td><td></td></tr>
                <tr class="total-row">
                    <td class="label">TOTAL TTC</td>
                    <td class="value">{{ number_format($quote->total, 0, ',', ' ') }} FCFA</td>
                </tr>
            </table>
        </div>
    </div>

    {{-- ===== BON POUR ACCORD ===== --}}
    <div class="bon-pour-accord">
        <div class="label">BON POUR ACCORD</div>
        <div class="sub">
            En signant ce devis, le client accepte les conditions présentées ci-dessus.
            Ce devis est valable jusqu'au {{ $quote->valid_until?->format('d/m/Y') ?? 'date non précisée' }}.
        </div>
        <div class="signature-zone">
            <div class="signature-block">
                <div class="signature-line">Signature du prestataire<br>{{ $org->name }}</div>
            </div>
            <div class="signature-block">
                <div class="signature-line">Signature et cachet du client<br>{{ $client->name }}</div>
            </div>
        </div>
    </div>

</div>

{{-- ===== PIED DE PAGE ===== --}}
<div class="footer">
    <div class="footer-inner">
        <div class="footer-left">
            <span class="footer-org">{{ $org->name }}</span><br>
            @if($org->address){{ $org->address }} — @endif
            {{ $org->email }}
            @if($org->getSetting('rccm')) — RCCM : {{ $org->getSetting('rccm') }}@endif
        </div>
        <div class="footer-right">
            Devis généré via IBIG SECRETIS ERP<br>
            {{ now()->format('d/m/Y') }}
        </div>
    </div>
</div>
</body>
</html>
