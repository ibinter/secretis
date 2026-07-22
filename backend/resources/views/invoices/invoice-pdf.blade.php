<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $invoice->invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10pt;
            color: #2d3748;
            background: #fff;
            line-height: 1.5;
        }

        /* ---- En-tête ---- */
        .header {
            display: table;
            width: 100%;
            padding: 0 0 20px 0;
            border-bottom: 3px solid #1A3A5C;
            margin-bottom: 28px;
        }
        .header-left  { display: table-cell; width: 55%; vertical-align: top; }
        .header-right { display: table-cell; width: 45%; vertical-align: top; text-align: right; }

        .org-logo {
            max-height: 70px;
            max-width: 180px;
            margin-bottom: 8px;
        }
        .org-name {
            font-size: 15pt;
            font-weight: bold;
            color: #1A3A5C;
        }
        .org-info {
            font-size: 8.5pt;
            color: #666;
            margin-top: 4px;
            line-height: 1.6;
        }

        .doc-title {
            font-size: 22pt;
            font-weight: bold;
            color: #1A3A5C;
            letter-spacing: 1px;
        }
        .doc-number {
            font-size: 11pt;
            color: #4a5568;
            margin-top: 4px;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: bold;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-draft    { background: #e2e8f0; color: #4a5568; }
        .status-sent     { background: #bee3f8; color: #2b6cb0; }
        .status-paid     { background: #c6f6d5; color: #276749; }
        .status-overdue  { background: #fed7d7; color: #c53030; }
        .status-cancelled{ background: #feebc8; color: #c05621; }

        /* ---- Méta facture ---- */
        .meta-row {
            display: table;
            width: 100%;
            margin-bottom: 28px;
        }
        .meta-block {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        .meta-block:last-child { text-align: right; }

        .meta-label {
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #a0aec0;
            margin-bottom: 2px;
        }
        .meta-value {
            font-size: 10pt;
            color: #2d3748;
            font-weight: 600;
        }
        .meta-item { margin-bottom: 10px; }

        /* ---- Bloc client ---- */
        .client-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #1A3A5C;
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 28px;
        }
        .client-box .section-label {
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #a0aec0;
            margin-bottom: 6px;
        }
        .client-name { font-size: 12pt; font-weight: bold; color: #1A3A5C; }
        .client-info { font-size: 9pt; color: #4a5568; line-height: 1.7; margin-top: 4px; }

        /* ---- Tableau articles ---- */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .items-table thead tr {
            background: #1A3A5C;
            color: #fff;
        }
        .items-table thead th {
            padding: 9px 10px;
            text-align: left;
            font-size: 8.5pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        .items-table thead th.text-right { text-align: right; }
        .items-table tbody tr:nth-child(even) { background: #f7fafc; }
        .items-table tbody tr:hover { background: #edf2f7; }
        .items-table tbody td {
            padding: 9px 10px;
            font-size: 9.5pt;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
        }
        .items-table tbody td.text-right { text-align: right; }
        .items-table tbody td.text-center { text-align: center; }

        /* ---- Totaux ---- */
        .totals-wrapper {
            display: table;
            width: 100%;
            margin-bottom: 28px;
        }
        .totals-left  { display: table-cell; width: 55%; vertical-align: top; }
        .totals-right { display: table-cell; width: 45%; vertical-align: top; }

        .totals-table {
            width: 100%;
            border-collapse: collapse;
            margin-left: auto;
        }
        .totals-table td {
            padding: 5px 10px;
            font-size: 9.5pt;
        }
        .totals-table .label { color: #718096; }
        .totals-table .value { text-align: right; font-weight: 600; }
        .totals-table .separator td {
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
        }
        .totals-table .total-row td {
            background: #1A3A5C;
            color: #fff;
            font-size: 12pt;
            font-weight: bold;
            padding: 10px;
            border-radius: 4px;
        }
        .totals-table .total-row .value { color: #fff; }

        .balance-box {
            margin-top: 8px;
            padding: 8px 10px;
            border-radius: 4px;
            font-size: 10pt;
            font-weight: bold;
        }
        .balance-paid    { background: #c6f6d5; color: #276749; }
        .balance-pending { background: #fed7d7; color: #c53030; }

        /* ---- Notes / Conditions ---- */
        .notes-section {
            margin-bottom: 20px;
            padding: 12px;
            background: #fffbeb;
            border: 1px solid #f6e05e;
            border-radius: 4px;
        }
        .notes-section .section-label {
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #b7791f;
            margin-bottom: 4px;
            font-weight: bold;
        }
        .notes-section p { font-size: 9pt; color: #744210; }

        /* ---- Pied de page ---- */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            border-top: 2px solid #1A3A5C;
            padding: 10px 20px;
            font-size: 7.5pt;
            color: #718096;
            background: #fff;
        }
        .footer-inner {
            display: table;
            width: 100%;
        }
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
                @if($org->getSetting('nif'))
                    <br>NIF : {{ $org->getSetting('nif') }}
                @endif
            </div>
        </div>
        <div class="header-right">
            <div class="doc-title">FACTURE</div>
            <div class="doc-number">{{ $invoice->invoice_number }}</div>
            <div>
                <span class="status-badge status-{{ $invoice->status }}">
                    {{ $invoice->getStatusLabel() }}
                </span>
            </div>
        </div>
    </div>

    {{-- ===== MÉTA ===== --}}
    <div class="meta-row">
        <div class="meta-block">
            <div class="meta-item">
                <div class="meta-label">Date d'émission</div>
                <div class="meta-value">{{ $invoice->issue_date->format('d/m/Y') }}</div>
            </div>
            @if($invoice->due_date)
            <div class="meta-item">
                <div class="meta-label">Date d'échéance</div>
                <div class="meta-value @if($invoice->isOverdue()) style="color:#c53030;" @endif">
                    {{ $invoice->due_date->format('d/m/Y') }}
                    @if($invoice->isOverdue())
                        ({{ $invoice->getDaysOverdue() }} jours de retard)
                    @endif
                </div>
            </div>
            @endif
            @if($invoice->payment_date)
            <div class="meta-item">
                <div class="meta-label">Date de paiement</div>
                <div class="meta-value">{{ $invoice->payment_date->format('d/m/Y') }}</div>
            </div>
            @endif
        </div>
        <div class="meta-block">
            @if($invoice->quote)
            <div class="meta-item">
                <div class="meta-label">Devis de référence</div>
                <div class="meta-value">{{ $invoice->quote->quote_number }}</div>
            </div>
            @endif
            <div class="meta-item">
                <div class="meta-label">Objet</div>
                <div class="meta-value">{{ $invoice->title }}</div>
            </div>
        </div>
    </div>

    {{-- ===== CLIENT ===== --}}
    <div class="client-box">
        <div class="section-label">Facturé à</div>
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
            @if($invoice->notes)
            <div class="notes-section">
                <div class="section-label">Notes</div>
                <p>{{ $invoice->notes }}</p>
            </div>
            @endif

            @if($org->getSetting('bank_details'))
            <div style="font-size:8.5pt; color:#4a5568; line-height:1.7;">
                <strong style="color:#1A3A5C;">Coordonnées bancaires :</strong><br>
                {!! nl2br(e($org->getSetting('bank_details'))) !!}
            </div>
            @endif
        </div>

        <div class="totals-right">
            <table class="totals-table">
                <tr>
                    <td class="label">Sous-total HT</td>
                    <td class="value">{{ number_format($invoice->subtotal, 0, ',', ' ') }} FCFA</td>
                </tr>
                <tr>
                    <td class="label">TVA ({{ number_format($invoice->tax_rate, 0) }}%)</td>
                    <td class="value">{{ number_format($invoice->tax_amount, 0, ',', ' ') }} FCFA</td>
                </tr>
                @if($invoice->discount_amount > 0)
                <tr>
                    <td class="label">Remise</td>
                    <td class="value" style="color:#c53030;">- {{ number_format($invoice->discount_amount, 0, ',', ' ') }} FCFA</td>
                </tr>
                @endif
                <tr class="separator"><td></td><td></td></tr>
                <tr class="total-row">
                    <td class="label">TOTAL TTC</td>
                    <td class="value">{{ number_format($invoice->total, 0, ',', ' ') }} FCFA</td>
                </tr>
            </table>

            @if($invoice->status === 'paid')
            <div class="balance-box balance-paid">
                Payé intégralement le {{ $invoice->payment_date?->format('d/m/Y') }}
            </div>
            @elseif($invoice->balance_due > 0)
            <div class="balance-box balance-pending">
                Solde restant dû : {{ number_format($invoice->balance_due, 0, ',', ' ') }} FCFA
            </div>
            @endif
        </div>
    </div>

    {{-- ===== CONDITIONS ===== --}}
    @if($invoice->terms)
    <div style="margin-top:16px; font-size:8pt; color:#718096; border-top:1px solid #e2e8f0; padding-top:10px;">
        <strong>Conditions :</strong> {{ $invoice->terms }}
    </div>
    @endif

</div>

{{-- ===== PIED DE PAGE (fixe) ===== --}}
<div class="footer">
    <div class="footer-inner">
        <div class="footer-left">
            <span class="footer-org">{{ $org->name }}</span><br>
            @if($org->address){{ $org->address }} — @endif
            {{ $org->email }}
            @if($org->getSetting('rccm')) — RCCM : {{ $org->getSetting('rccm') }}@endif
        </div>
        <div class="footer-right">
            Facture générée via IBIG SECRETIS ERP<br>
            Document officiel — {{ now()->format('d/m/Y') }}
        </div>
    </div>
</div>

</body>
</html>
