<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>BON DE COMMANDE {{ $po->po_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 10px;
            color: #1a1a2e;
            background: #fff;
        }

        /* ── En-tête ── */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px 0 16px;
            border-bottom: 3px solid #1e3a5f;
            margin-bottom: 20px;
        }
        .logo-block img { height: 56px; }
        .logo-block .org-name {
            font-size: 14px;
            font-weight: 700;
            color: #1e3a5f;
            margin-top: 4px;
        }
        .logo-block .org-info { font-size: 8px; color: #555; line-height: 1.5; }
        .title-block { text-align: right; }
        .title-block h1 {
            font-size: 22px;
            font-weight: 900;
            color: #1e3a5f;
            letter-spacing: 1px;
        }
        .title-block .po-number {
            font-size: 14px;
            font-weight: 700;
            color: #c0392b;
            margin-top: 4px;
        }
        .title-block .po-date { font-size: 9px; color: #555; margin-top: 2px; }

        /* ── Parties ── */
        .parties {
            display: flex;
            gap: 16px;
            margin-bottom: 20px;
        }
        .party-box {
            flex: 1;
            border: 1px solid #dde3ec;
            border-radius: 4px;
            padding: 12px;
            background: #f8fafc;
        }
        .party-box .party-title {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #1e3a5f;
            border-bottom: 1px solid #dde3ec;
            padding-bottom: 4px;
            margin-bottom: 8px;
        }
        .party-box .party-name {
            font-size: 11px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 4px;
        }
        .party-box p { font-size: 9px; color: #444; line-height: 1.6; }

        /* ── Tableau articles ── */
        .items-section { margin-bottom: 20px; }
        .section-title {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #fff;
            background: #1e3a5f;
            padding: 6px 10px;
            margin-bottom: 0;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
        }
        table.items thead th {
            background: #eef2f7;
            color: #1e3a5f;
            font-size: 9px;
            font-weight: 700;
            padding: 7px 8px;
            text-align: left;
            border-bottom: 2px solid #1e3a5f;
        }
        table.items thead th.right { text-align: right; }
        table.items tbody tr:nth-child(even) { background: #f8fafc; }
        table.items tbody td {
            padding: 6px 8px;
            font-size: 9px;
            border-bottom: 1px solid #e8ecf2;
            vertical-align: top;
        }
        table.items tbody td.right { text-align: right; }
        table.items tbody td.bold { font-weight: 700; }

        /* ── Totaux ── */
        .totals {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
        }
        .totals-box { width: 260px; }
        .totals-box table { width: 100%; border-collapse: collapse; }
        .totals-box td {
            padding: 5px 8px;
            font-size: 10px;
            border-bottom: 1px solid #e8ecf2;
        }
        .totals-box td.label { color: #555; }
        .totals-box td.amount { text-align: right; font-weight: 600; }
        .totals-box tr.ttc td {
            background: #1e3a5f;
            color: #fff;
            font-weight: 700;
            font-size: 12px;
        }
        .totals-box tr.ttc td.amount { text-align: right; }

        /* ── Conditions ── */
        .conditions {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }
        .condition-box {
            flex: 1;
            border: 1px solid #dde3ec;
            border-radius: 4px;
            padding: 10px;
        }
        .condition-box .cond-title {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1e3a5f;
            margin-bottom: 6px;
            border-bottom: 1px solid #dde3ec;
            padding-bottom: 4px;
        }
        .condition-box p { font-size: 9px; color: #333; line-height: 1.6; }

        /* ── Signatures ── */
        .signatures {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            margin-top: 10px;
        }
        .sig-box {
            flex: 1;
            border: 1px dashed #aab;
            border-radius: 4px;
            padding: 10px;
            min-height: 70px;
            text-align: center;
        }
        .sig-box .sig-title { font-size: 9px; font-weight: 700; color: #1e3a5f; margin-bottom: 30px; }
        .sig-box .sig-line {
            border-top: 1px solid #999;
            margin-top: 10px;
            font-size: 8px;
            color: #555;
            padding-top: 4px;
        }

        /* ── Mentions légales ── */
        .legal {
            border-top: 2px solid #1e3a5f;
            padding-top: 10px;
            font-size: 7.5px;
            color: #777;
            line-height: 1.6;
        }

        /* ── Badge statut ── */
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 8px;
            font-weight: 700;
            background: #e8f4fd;
            color: #1e3a5f;
            margin-top: 4px;
        }

        .watermark {
            position: fixed;
            top: 40%;
            left: 20%;
            font-size: 70px;
            font-weight: 900;
            color: rgba(200,0,0,0.07);
            transform: rotate(-30deg);
            letter-spacing: 4px;
            pointer-events: none;
        }
    </style>
</head>
<body>

{{-- Filigrane si brouillon --}}
@if($po->status === 'brouillon')
    <div class="watermark">BROUILLON</div>
@endif

{{-- ── EN-TÊTE ── --}}
<div class="header">
    <div class="logo-block">
        @if($organization->logo_path)
            <img src="{{ storage_path('app/public/' . $organization->logo_path) }}" alt="Logo">
        @endif
        <div class="org-name">{{ $organization->name }}</div>
        <div class="org-info">
            {{ $organization->address ?? '' }}<br>
            {{ $organization->city ?? '' }}, {{ $organization->country ?? '' }}<br>
            @if($organization->tax_number) NIF : {{ $organization->tax_number }}<br> @endif
            @if($organization->rccm) RCCM : {{ $organization->rccm }}<br> @endif
            Tél : {{ $organization->phone ?? '—' }} — {{ $organization->email ?? '' }}
        </div>
    </div>
    <div class="title-block">
        <h1>BON DE COMMANDE</h1>
        <div class="po-number">N° {{ $po->po_number }}</div>
        <div class="po-date">
            Date : {{ \Carbon\Carbon::parse($po->created_at)->format('d/m/Y') }}<br>
            @if($po->sent_at) Envoyé le : {{ \Carbon\Carbon::parse($po->sent_at)->format('d/m/Y') }} @endif
        </div>
        <span class="status-badge">{{ strtoupper($po->status) }}</span>
    </div>
</div>

{{-- ── PARTIES ── --}}
<div class="parties">
    <div class="party-box">
        <div class="party-title">Acheteur</div>
        <div class="party-name">{{ $organization->name }}</div>
        <p>
            {{ $organization->address ?? '' }}<br>
            {{ $organization->city ?? '' }}{{ $organization->country ? ', ' . $organization->country : '' }}<br>
            @if($organization->tax_number) NIF : {{ $organization->tax_number }}<br> @endif
            @if($organization->rccm) RCCM : {{ $organization->rccm }}<br> @endif
            Tél : {{ $organization->phone ?? '—' }}<br>
            Email : {{ $organization->email ?? '—' }}
        </p>
    </div>

    <div class="party-box">
        <div class="party-title">Fournisseur</div>
        <div class="party-name">{{ $supplier->company_name }}</div>
        <p>
            @if($supplier->legal_form) {{ $supplier->legal_form }}<br> @endif
            {{ $supplier->address ?? '' }}<br>
            {{ $supplier->city ?? '' }}{{ $supplier->country ? ', ' . $supplier->country : '' }}<br>
            @if($supplier->tax_number) NIF : {{ $supplier->tax_number }}<br> @endif
            @if($supplier->rccm) RCCM : {{ $supplier->rccm }}<br> @endif
            Tél : {{ $supplier->phone ?? '—' }}<br>
            Email : {{ $supplier->email ?? '—' }}
        </p>
    </div>

    @if($po->rfq)
    <div class="party-box">
        <div class="party-title">Références</div>
        <p>
            <strong>AO :</strong> {{ $po->rfq->rfq_number }}<br>
            @if($po->quotation) <strong>Devis :</strong> {{ $po->quotation->quotation_number }}<br> @endif
            @if($po->purchase_request_id) <strong>DA :</strong> {{ $po->purchaseRequest->pr_number ?? '' }}<br> @endif
            <strong>Délai paiement :</strong> {{ $po->payment_terms_days }} jours<br>
            <strong>Devise :</strong> {{ $po->currency_code }}
        </p>
    </div>
    @endif
</div>

{{-- ── TABLEAU DES ARTICLES ── --}}
<div class="items-section">
    <div class="section-title">Désignation des articles / prestations</div>
    <table class="items">
        <thead>
            <tr>
                <th style="width:5%">#</th>
                <th style="width:40%">Désignation</th>
                <th style="width:8%" class="right">Qté</th>
                <th style="width:8%">Unité</th>
                <th style="width:15%" class="right">Prix unit. HT ({{ $po->currency_code }})</th>
                <th style="width:10%" class="right">TVA %</th>
                <th style="width:14%" class="right">Montant HT ({{ $po->currency_code }})</th>
            </tr>
        </thead>
        <tbody>
            @php
                $subtotalHT = 0;
                $totalTVA   = 0;
            @endphp
            @foreach($po->items ?? [] as $i => $item)
                @php
                    $lineHT  = ($item['qty'] ?? 0) * ($item['unit_price'] ?? 0);
                    $taxRate = $item['tax_rate'] ?? 18;
                    $lineTVA = $lineHT * ($taxRate / 100);
                    $subtotalHT += $lineHT;
                    $totalTVA   += $lineTVA;
                @endphp
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td class="bold">{{ $item['description'] ?? '' }}</td>
                    <td class="right">{{ number_format($item['qty'] ?? 0, 2, ',', ' ') }}</td>
                    <td>{{ $item['unit'] ?? '' }}</td>
                    <td class="right">{{ number_format($item['unit_price'] ?? 0, 0, ',', ' ') }}</td>
                    <td class="right">{{ $taxRate }}%</td>
                    <td class="right">{{ number_format($lineHT, 0, ',', ' ') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>

{{-- ── TOTAUX ── --}}
@php $totalTTC = $subtotalHT + $totalTVA; @endphp
<div class="totals">
    <div class="totals-box">
        <table>
            <tr>
                <td class="label">Sous-total HT</td>
                <td class="amount">{{ number_format($subtotalHT, 0, ',', ' ') }} {{ $po->currency_code }}</td>
            </tr>
            <tr>
                <td class="label">TVA (OHADA)</td>
                <td class="amount">{{ number_format($totalTVA, 0, ',', ' ') }} {{ $po->currency_code }}</td>
            </tr>
            <tr class="ttc">
                <td class="label">TOTAL TTC</td>
                <td class="amount">{{ number_format($totalTTC, 0, ',', ' ') }} {{ $po->currency_code }}</td>
            </tr>
        </table>
    </div>
</div>

{{-- ── CONDITIONS ── --}}
<div class="conditions">
    <div class="condition-box">
        <div class="cond-title">Délai de livraison</div>
        <p>
            @if($po->expected_delivery_date)
                Au plus tard le <strong>{{ \Carbon\Carbon::parse($po->expected_delivery_date)->format('d/m/Y') }}</strong>
            @else
                Selon accord entre les parties.
            @endif
        </p>
    </div>

    <div class="condition-box">
        <div class="cond-title">Modalités de paiement</div>
        <p>
            Paiement à <strong>{{ $po->payment_terms_days }} jours</strong> date de réception de la facture.<br>
            Devise : <strong>{{ $po->currency_code }}</strong>
        </p>
    </div>

    <div class="condition-box">
        <div class="cond-title">Lieu de livraison</div>
        <p>
            {{ $po->delivery_address ?: $organization->address . ', ' . ($organization->city ?? '') }}
        </p>
    </div>
</div>

@if($po->notes)
<div class="condition-box" style="margin-bottom:20px;">
    <div class="cond-title">Observations / Conditions particulières</div>
    <p>{{ $po->notes }}</p>
</div>
@endif

{{-- ── SIGNATURES ── --}}
<div class="signatures">
    <div class="sig-box">
        <div class="sig-title">Service Achats</div>
        <div class="sig-line">Nom, Signature et Cachet</div>
    </div>
    <div class="sig-box">
        <div class="sig-title">Direction Générale</div>
        <div class="sig-line">Nom, Signature et Cachet</div>
    </div>
    <div class="sig-box">
        <div class="sig-title">Accusé de réception Fournisseur</div>
        <div class="sig-line">Nom, Signature et Date</div>
    </div>
</div>

{{-- ── MENTIONS LÉGALES OHADA ── --}}
<div class="legal">
    <strong>Mentions légales :</strong>
    Ce bon de commande est émis conformément aux dispositions de l'Acte uniforme OHADA relatif aux contrats commerciaux généraux.
    En acceptant cette commande, le fournisseur s'engage à respecter les délais, les spécifications techniques et les conditions de paiement
    précisées ci-dessus. Tout litige relatif à l'exécution du présent bon de commande sera soumis à la juridiction compétente du siège
    social de l'acheteur, conformément au droit OHADA applicable. La non-conformité des marchandises ou des prestations autorise
    l'acheteur à refuser la livraison et à demander le remplacement ou le remboursement dans un délai de 15 jours.
    TVA applicable selon le Code général des Impôts en vigueur dans le pays de l'acheteur.
</div>

</body>
</html>
