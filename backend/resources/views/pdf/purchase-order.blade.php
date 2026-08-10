<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <style>
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 11px; }
        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 16px; }
        .org-name { font-size: 16px; font-weight: bold; color: #9333EA; }
        .org-meta { font-size: 10px; color: #6b7280; margin-top: 2px; }
        .title-row { margin-bottom: 16px; }
        h1 { font-size: 17px; margin: 0; color: #111827; }
        .po-number { font-size: 12px; color: #9333EA; font-weight: bold; }
        .cols { width: 100%; margin-bottom: 16px; }
        .cols td { vertical-align: top; width: 50%; padding: 0; }
        .box-label { font-size: 10px; text-transform: uppercase; color: #9333EA; font-weight: bold; margin-bottom: 4px; }
        .box p { margin: 1px 0; font-size: 10px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table.items th { background: #f5f3ff; color: #5b21b6; text-align: left; padding: 7px 8px; font-size: 10px; border-bottom: 1px solid #ddd6fe; }
        table.items td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
        .num { text-align: right; }
        .totals { width: 45%; margin-left: 55%; border-collapse: collapse; }
        .totals td { padding: 5px 8px; font-size: 11px; }
        .totals .grand { border-top: 2px solid #9333EA; font-weight: bold; font-size: 12px; background: #f5f3ff; }
        .notes { margin-top: 16px; font-size: 10px; color: #4b5563; }
        .footer { margin-top: 24px; font-size: 9px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
    @php
        $currency = $po->currency ?: 'XOF';
        $total    = $po->total ?? $po->total_amount_xof ?? 0;
    @endphp

    <div class="header">
        <div class="org-name">{{ $org->name ?? 'Organisation' }}</div>
        <div class="org-meta">
            @if(!empty($org->address)){{ $org->address }}@endif
            @if(!empty($org->city)), {{ $org->city }}@endif
            @if(!empty($org->country)) ({{ $org->country }})@endif
            @if(!empty($org->phone)) — Tél : {{ $org->phone }}@endif
            @if(!empty($org->email)) — {{ $org->email }}@endif
            @if(!empty($org->tax_number)) — NCC/NIF : {{ $org->tax_number }}@endif
        </div>
    </div>

    <div class="title-row">
        <h1>Bon de commande</h1>
        <span class="po-number">{{ $po->reference ?? ('BC-' . $po->id) }}</span>
    </div>

    <table class="cols">
        <tr>
            <td>
                <div class="box">
                    <div class="box-label">Fournisseur</div>
                    <p><strong>{{ $supplier->company_name ?? '—' }}</strong></p>
                    @if(!empty($supplier->supplier_number))<p>N° fournisseur : {{ $supplier->supplier_number }}</p>@endif
                    @if(!empty($supplier->city))<p>{{ $supplier->city }}@if(!empty($supplier->country)), {{ $supplier->country }}@endif</p>@endif
                    @if(!empty($supplier->contact_name))<p>Contact : {{ $supplier->contact_name }}</p>@endif
                    @if(!empty($supplier->email))<p>{{ $supplier->email }}</p>@endif
                    @if(!empty($supplier->phone))<p>Tél : {{ $supplier->phone }}</p>@endif
                </div>
            </td>
            <td>
                <div class="box">
                    <div class="box-label">Détails</div>
                    <p>Date : {{ optional($po->ordered_at ?? $po->created_at)->format('d/m/Y') }}</p>
                    <p>Statut : {{ ucfirst((string) $po->status) }}</p>
                    @if(!empty($supplier?->payment_terms_days))<p>Délai de paiement : {{ $supplier->payment_terms_days }} jours</p>@endif
                    @if(!empty($po->expected_delivery_date))<p>Livraison prévue : {{ optional($po->expected_delivery_date)->format('d/m/Y') }}</p>@endif
                    @if(!empty($po->received_at))<p>Réceptionné le : {{ optional($po->received_at)->format('d/m/Y') }}</p>@endif
                    @if(!empty($purchaseRequest?->name))<p>Demande d'achat : {{ $purchaseRequest->name }}</p>@endif
                </div>
            </td>
        </tr>
    </table>

    @if(!empty($items))
        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="num">Qté</th>
                    <th>Unité</th>
                    <th class="num">P.U.</th>
                    <th class="num">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($items as $item)
                    @php
                        if (!is_array($item)) { continue; }
                        $desc = $item['description'] ?? $item['label'] ?? $item['name'] ?? '';
                        $qty  = (float) ($item['qty'] ?? $item['quantity'] ?? 0);
                        $pu   = (float) ($item['unit_price'] ?? $item['price'] ?? 0);
                        $line = isset($item['total']) ? (float) $item['total'] : $qty * $pu;
                    @endphp
                    <tr>
                        <td>{{ $desc }}</td>
                        <td class="num">{{ rtrim(rtrim(number_format($qty, 2, ',', ' '), '0'), ',') }}</td>
                        <td>{{ $item['unit'] ?? '' }}</td>
                        <td class="num">{{ number_format($pu, 0, ',', ' ') }}</td>
                        <td class="num">{{ number_format($line, 0, ',', ' ') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <table class="totals">
        <tr class="grand">
            <td>Total ({{ $currency }})</td>
            <td class="num">{{ number_format((float) $total, 0, ',', ' ') }}</td>
        </tr>
    </table>

    <div class="footer">
        SECRETIS ERP — Bon de commande édité le {{ now()->format('d/m/Y H:i') }}
    </div>
</body>
</html>
