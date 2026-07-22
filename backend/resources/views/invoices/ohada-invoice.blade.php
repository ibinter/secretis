<!DOCTYPE html>
<html lang="{{ $locale ?? 'fr' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $invoice->number }} — {{ $organization->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10pt;
            color: #1a1a1a;
            background: #fff;
            line-height: 1.5;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 15mm 20mm 15mm;
            margin: 0 auto;
        }

        /* ── En-tête ── */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8mm;
            padding-bottom: 5mm;
            border-bottom: 2px solid #1a5276;
        }

        .org-info { flex: 1; }
        .org-name {
            font-size: 16pt;
            font-weight: bold;
            color: #1a5276;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .org-legal-form {
            font-size: 9pt;
            color: #555;
            margin-top: 2px;
        }
        .org-details {
            font-size: 8.5pt;
            color: #444;
            margin-top: 4px;
            line-height: 1.6;
        }

        .invoice-title-box {
            text-align: right;
            min-width: 60mm;
        }
        .invoice-title {
            font-size: 20pt;
            font-weight: bold;
            color: #1a5276;
            text-transform: uppercase;
        }
        .invoice-number {
            font-size: 11pt;
            font-weight: bold;
            color: #444;
            margin-top: 3px;
        }
        .invoice-dates {
            font-size: 8.5pt;
            color: #555;
            margin-top: 5px;
            line-height: 1.6;
        }

        /* ── Bande colorée ── */
        .colored-bar {
            background: #1a5276;
            color: white;
            text-align: center;
            padding: 3px 0;
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 6mm;
        }

        /* ── Bloc émetteur / destinataire ── */
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 7mm;
        }
        .party-box {
            width: 48%;
        }
        .party-label {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #1a5276;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #1a5276;
            padding-bottom: 2px;
            margin-bottom: 3px;
        }
        .party-name {
            font-size: 11pt;
            font-weight: bold;
            color: #1a1a1a;
        }
        .party-details {
            font-size: 8.5pt;
            color: #444;
            margin-top: 3px;
            line-height: 1.5;
        }

        /* ── Tableau des prestations ── */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6mm;
        }
        .items-table thead tr {
            background: #1a5276;
            color: white;
        }
        .items-table thead th {
            padding: 5px 6px;
            text-align: left;
            font-size: 8pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .items-table thead th.right { text-align: right; }
        .items-table tbody tr { border-bottom: 1px solid #e5e7eb; }
        .items-table tbody tr:nth-child(even) { background: #f9fafb; }
        .items-table tbody td {
            padding: 5px 6px;
            font-size: 9pt;
            color: #1a1a1a;
            vertical-align: top;
        }
        .items-table tbody td.right { text-align: right; }
        .items-table tbody td.desc small {
            display: block;
            font-size: 7.5pt;
            color: #666;
            margin-top: 1px;
        }
        .account-code {
            font-size: 7pt;
            color: #888;
            font-family: monospace;
        }

        /* ── Totaux ── */
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 7mm;
        }
        .totals-table {
            width: 75mm;
            border-collapse: collapse;
        }
        .totals-table tr td {
            padding: 3px 6px;
            font-size: 9pt;
        }
        .totals-table tr td:first-child { color: #555; }
        .totals-table tr td:last-child {
            text-align: right;
            font-family: monospace;
        }
        .totals-table .subtotal-row { border-top: 1px solid #e5e7eb; }
        .totals-table .vat-row td { color: #555; font-size: 8.5pt; }
        .totals-table .total-row {
            background: #1a5276;
            color: white;
            border-radius: 3px;
        }
        .totals-table .total-row td {
            font-size: 11pt;
            font-weight: bold;
            color: white;
            padding: 5px 8px;
        }

        /* ── Montant en lettres ── */
        .amount-in-words {
            background: #f0f4f8;
            border-left: 3px solid #1a5276;
            padding: 5px 10px;
            font-size: 8.5pt;
            font-style: italic;
            color: #444;
            margin-bottom: 6mm;
        }
        .amount-in-words strong { font-style: normal; color: #1a5276; }

        /* ── Conditions de paiement ── */
        .payment-info {
            display: flex;
            gap: 5mm;
            margin-bottom: 7mm;
        }
        .payment-box {
            flex: 1;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 5px 8px;
        }
        .payment-box-title {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #1a5276;
            margin-bottom: 3px;
        }
        .payment-box-content { font-size: 8.5pt; color: #444; line-height: 1.5; }

        /* ── Signature et cachet ── */
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 8mm;
            margin-bottom: 6mm;
        }
        .signature-box {
            width: 45%;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 6px 10px;
            min-height: 25mm;
        }
        .signature-label {
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            color: #1a5276;
            margin-bottom: 2px;
        }
        .signature-area {
            height: 18mm;
            display: flex;
            align-items: flex-end;
        }
        .signature-name {
            font-size: 8pt;
            color: #555;
            border-top: 1px solid #bbb;
            width: 100%;
            padding-top: 2px;
            margin-top: 4px;
        }

        /* ── Pied de page légal OHADA ── */
        .legal-footer {
            border-top: 1.5px solid #1a5276;
            padding-top: 4mm;
            margin-top: 4mm;
        }
        .legal-bar {
            background: #1a5276;
            color: white;
            font-size: 7pt;
            font-weight: bold;
            text-align: center;
            padding: 2px 0;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }
        .legal-text {
            font-size: 7pt;
            color: #555;
            text-align: center;
            line-height: 1.5;
        }
        .legal-identifiers {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 3px;
        }
        .legal-identifier {
            font-size: 7pt;
            color: #333;
        }
        .legal-identifier strong { color: #1a5276; }

        /* ── Statut ── */
        .status-watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 60pt;
            font-weight: bold;
            opacity: 0.06;
            color: #1a5276;
            text-transform: uppercase;
            pointer-events: none;
            z-index: 0;
        }

        @media print {
            .page { padding: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>

{{-- Filigrane statut --}}
@if($invoice->status === 'paid')
    <div class="status-watermark">PAYÉE</div>
@elseif($invoice->status === 'cancelled')
    <div class="status-watermark">ANNULÉE</div>
@elseif($invoice->status === 'draft')
    <div class="status-watermark">BROUILLON</div>
@endif

<div class="page">

    {{-- ── En-tête ── --}}
    <div class="header">
        <div class="org-info">
            @if($organization->logo)
                <img src="{{ $organization->logo_url }}" alt="Logo" style="height: 14mm; margin-bottom: 4px;">
            @endif
            <div class="org-name">{{ $organization->name }}</div>
            @if($organization->legal_form)
                <div class="org-legal-form">{{ $organization->legal_form }}
                    @if($organization->share_capital)
                        — Capital social : {{ number_format($organization->share_capital, 0, ',', ' ') }} {{ $currency->symbol ?? 'FCFA' }}
                    @endif
                </div>
            @endif
            <div class="org-details">
                @if($organization->address)
                    {{ $organization->address_formatted }}<br>
                @endif
                @if($organization->phone) Tél : {{ $organization->phone }} @endif
                @if($organization->email) — {{ $organization->email }} @endif
                @if($organization->website)<br>{{ $organization->website }}@endif
            </div>
        </div>

        <div class="invoice-title-box">
            <div class="invoice-title">
                @if($invoice->type === 'quote') DEVIS
                @elseif($invoice->type === 'credit_note') AVOIR
                @elseif($invoice->type === 'proforma') FACTURE PROFORMA
                @else FACTURE
                @endif
            </div>
            <div class="invoice-number">N° {{ $invoice->number }}</div>
            <div class="invoice-dates">
                <strong>Date :</strong> {{ $invoice->issued_at->translatedFormat('d/m/Y') }}<br>
                @if($invoice->due_at)
                    <strong>Échéance :</strong> {{ $invoice->due_at->translatedFormat('d/m/Y') }}<br>
                @endif
                @if($invoice->status === 'paid' && $invoice->paid_at)
                    <strong>Payée le :</strong> {{ $invoice->paid_at->translatedFormat('d/m/Y') }}
                @endif
            </div>
        </div>
    </div>

    {{-- ── Bande titre ── --}}
    <div class="colored-bar">
        DOCUMENT COMPTABLE — SYSCOHADA RÉVISÉ — {{ strtoupper($ohadaCountry['name_fr'] ?? 'AFRIQUE') }}
    </div>

    {{-- ── Émetteur / Destinataire ── --}}
    <div class="parties">
        <div class="party-box">
            <div class="party-label">Émetteur (Fournisseur)</div>
            <div class="party-name">{{ $organization->name }}</div>
            <div class="party-details">
                @if($organization->rccm_number)
                    RCCM : {{ $organization->rccm_number }}<br>
                @endif
                @if($organization->tax_number)
                    {{ $ohadaCountry['nif_name'] ?? 'NIF' }} : {{ $organization->tax_number }}<br>
                @endif
                @if($organization->vat_number)
                    N° TVA : {{ $organization->vat_number }}<br>
                @endif
                @if($organization->po_box)
                    BP {{ $organization->po_box }},
                @endif
                {{ $organization->city ?? '' }}
                @if($organization->country) — {{ strtoupper($organization->country) }}@endif
            </div>
        </div>

        <div class="party-box" style="text-align: right;">
            <div class="party-label" style="text-align: right; border-color: #e74c3c; color: #e74c3c;">
                Destinataire (Client)
            </div>
            <div class="party-name">{{ $client->name }}</div>
            <div class="party-details">
                @if($client->rccm_number) RCCM : {{ $client->rccm_number }}<br>@endif
                @if($client->tax_number) NIF : {{ $client->tax_number }}<br>@endif
                @if($client->address) {{ $client->address_formatted }}<br>@endif
                @if($client->phone) Tél : {{ $client->phone }}<br>@endif
                @if($client->email) {{ $client->email }}@endif
            </div>
        </div>
    </div>

    {{-- ── Objet / Référence ── --}}
    @if($invoice->subject || $invoice->reference)
    <div style="margin-bottom: 5mm; font-size: 9pt;">
        @if($invoice->subject) <strong>Objet :</strong> {{ $invoice->subject }}<br>@endif
        @if($invoice->reference) <strong>Votre réf. :</strong> {{ $invoice->reference }}@endif
    </div>
    @endif

    {{-- ── Tableau des prestations ── --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 6%;">N°</th>
                <th>Désignation des prestations / Marchandises</th>
                <th class="right" style="width: 9%;">Qté</th>
                <th class="right" style="width: 13%;">P.U. HT</th>
                <th class="right" style="width: 10%;">TVA</th>
                <th class="right" style="width: 14%;">Montant HT</th>
                <th style="width: 9%; text-align: center;">Cpte</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td class="desc">
                    {{ $item->description }}
                    @if($item->notes)<small>{{ $item->notes }}</small>@endif
                </td>
                <td class="right">{{ number_format($item->quantity, 2, ',', ' ') }}</td>
                <td class="right">{{ number_format($item->unit_price, 0, ',', ' ') }}</td>
                <td class="right">{{ $item->tax_rate }}%</td>
                <td class="right">{{ number_format($item->subtotal, 0, ',', ' ') }}</td>
                <td class="account-code" style="text-align: center;">
                    {{ $item->account_code ?? '70600' }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- ── Totaux ── --}}
    <div class="totals-section">
        <table class="totals-table">
            <tr class="subtotal-row">
                <td>Total HT</td>
                <td>{{ number_format($invoice->subtotal, 0, ',', ' ') }} {{ $currency->symbol }}</td>
            </tr>
            @foreach($invoice->tax_lines as $taxLine)
            <tr class="vat-row">
                <td>{{ $ohadaCountry['vat_name'] ?? 'TVA' }} {{ $taxLine->rate }}%</td>
                <td>{{ number_format($taxLine->amount, 0, ',', ' ') }} {{ $currency->symbol }}</td>
            </tr>
            @endforeach
            @if($invoice->discount > 0)
            <tr>
                <td>Remise</td>
                <td>- {{ number_format($invoice->discount, 0, ',', ' ') }} {{ $currency->symbol }}</td>
            </tr>
            @endif
            @if($invoice->paid_amount > 0 && $invoice->status !== 'paid')
            <tr>
                <td>Déjà versé</td>
                <td>- {{ number_format($invoice->paid_amount, 0, ',', ' ') }} {{ $currency->symbol }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td>TOTAL {{ $ohadaCountry['vat_name'] ?? 'TVA' }} COMPRISE</td>
                <td>{{ number_format($invoice->total, 0, ',', ' ') }} {{ $currency->symbol }}</td>
            </tr>
        </table>
    </div>

    {{-- Montant en lettres --}}
    <div class="amount-in-words">
        <strong>Arrêtée la présente facture à la somme de :</strong>
        {{ $amountInWords ?? app(\App\Services\NumberToWordsService::class)->convert($invoice->total, $currency->code ?? 'XOF') }}
    </div>

    {{-- ── Conditions de paiement ── --}}
    <div class="payment-info">
        <div class="payment-box">
            <div class="payment-box-title">Mode de règlement</div>
            <div class="payment-box-content">
                {{ $invoice->payment_method_label ?? 'Virement bancaire / Espèces / Mobile Money' }}
                @if($bankAccount = $organization->primaryBankAccount)
                    <br>Banque : {{ $bankAccount->bank_name }}
                    <br>IBAN/Compte : {{ $bankAccount->account_number }}
                @endif
            </div>
        </div>
        <div class="payment-box">
            <div class="payment-box-title">Conditions</div>
            <div class="payment-box-content">
                Échéance : {{ $invoice->due_at ? $invoice->due_at->translatedFormat('d/m/Y') : 'À réception' }}<br>
                Pénalités de retard : 1,5% / mois<br>
                Indemnité forfaitaire de recouvrement : 40 000 FCFA
            </div>
        </div>
        @if($invoice->notes)
        <div class="payment-box">
            <div class="payment-box-title">Notes</div>
            <div class="payment-box-content">{{ $invoice->notes }}</div>
        </div>
        @endif
    </div>

    {{-- ── Signatures ── --}}
    <div class="signature-section">
        <div class="signature-box">
            <div class="signature-label">Pour {{ $organization->name }}</div>
            <div class="signature-area">
                @if($invoice->status === 'sent' || $invoice->status === 'paid')
                    <div class="signature-name">
                        {{ $invoice->signedBy?->name ?? $organization->ceo_name ?? 'Le Gérant' }}
                    </div>
                @endif
            </div>
            <div style="font-size: 7pt; color: #888; margin-top: 2px;">
                Cachet et signature
            </div>
        </div>
        <div class="signature-box" style="text-align: right;">
            <div class="signature-label" style="text-align: right;">Bon pour accord — Client</div>
            <div class="signature-area"></div>
            <div style="font-size: 7pt; color: #888; margin-top: 2px; text-align: right;">
                Date, cachet et signature du client
            </div>
        </div>
    </div>

    {{-- ── Pied de page légal OHADA ── --}}
    <div class="legal-footer">
        <div class="legal-bar">
            MENTIONS LÉGALES OBLIGATOIRES — CONFORME AUX DISPOSITIONS OHADA ET AU DROIT FISCAL
            {{ strtoupper($ohadaCountry['name_fr'] ?? '') }}
        </div>
        <div class="legal-text">
            Document établi conformément à l'Acte Uniforme OHADA relatif au Droit Commercial Général
            et au Plan Comptable SYSCOHADA Révisé (2017). Toute rectification fait l'objet d'un avoir.
        </div>
        <div class="legal-identifiers">
            @if($organization->rccm_number)
                <span class="legal-identifier">
                    <strong>RCCM :</strong> {{ $organization->rccm_number }}
                </span>
            @endif
            @if($organization->tax_number)
                <span class="legal-identifier">
                    <strong>{{ $ohadaCountry['nif_name'] ?? 'NIF' }} :</strong>
                    {{ $organization->tax_number }}
                </span>
            @endif
            @if($organization->vat_number)
                <span class="legal-identifier">
                    <strong>N° TVA :</strong> {{ $organization->vat_number }}
                </span>
            @endif
            <span class="legal-identifier">
                <strong>Plan comptable :</strong> SYSCOHADA — Compte produit : {{ $invoice->items->first()?->account_code ?? '70600' }}
            </span>
            <span class="legal-identifier">
                <strong>Devise :</strong> {{ $currency->name ?? 'Franc CFA' }} ({{ $currency->code ?? 'XOF' }})
            </span>
        </div>
        <div class="legal-text" style="margin-top: 3px; font-size: 6.5pt; color: #777;">
            Facture générée par IBIG SECRETIS ERP — Conservez ce document pendant 10 ans (obligation légale OHADA).
            Page 1/1 — {{ $invoice->number }} — {{ now()->translatedFormat('d/m/Y H:i') }}
        </div>
    </div>

</div>
</body>
</html>
