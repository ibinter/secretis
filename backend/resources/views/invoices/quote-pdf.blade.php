@php
    /**
     * Devis — SECRETIS ERP
     * Appelée par App\Services\AccountingService::generateQuotePdf()
     * Variables : $quote (App\Models\Quote), $client (AccountingClient), $org (Organization), $items (Collection<QuoteItem>)
     */
    $fmt = fn ($v) => number_format((float) ($v ?? 0), 0, ',', ' ');
    $devise = $client->currency ?? 'XOF';

    $statuts = [
        'draft'    => 'Brouillon',
        'sent'     => 'Envoyé',
        'accepted' => 'Accepté',
        'rejected' => 'Refusé',
        'expired'  => 'Expiré',
    ];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Devis {{ $quote->quote_number ?? '' }}</title>
    <style>
        @page { margin: 14mm 12mm 18mm 12mm; }
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 11px; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 14px; }
        .header td { vertical-align: top; }
        .org-name { font-size: 16px; font-weight: bold; color: #111827; }
        .org-meta { font-size: 9px; color: #6b7280; line-height: 1.5; margin-top: 3px; }
        .doc-type { font-size: 20px; font-weight: bold; color: #9333EA; text-align: right; }
        .doc-num { font-size: 12px; text-align: right; margin-top: 2px; }
        .doc-status { font-size: 9px; text-align: right; color: #6b7280; margin-top: 2px; text-transform: uppercase; }

        table { width: 100%; border-collapse: collapse; }
        .meta { margin-bottom: 14px; }
        .meta td { vertical-align: top; width: 50%; padding: 0; }
        .box { border: 1px solid #e5e7eb; padding: 8px 10px; }
        .box-title { font-size: 8px; text-transform: uppercase; letter-spacing: .5px; color: #9333EA; margin-bottom: 4px; }
        .box-name { font-weight: bold; font-size: 12px; }
        .box-line { font-size: 9px; color: #4b5563; line-height: 1.5; }

        .dates td { padding: 4px 8px; border: 1px solid #e5e7eb; font-size: 10px; }
        .dates .lbl { background: #f5f3ff; color: #5b21b6; font-size: 8px; text-transform: uppercase; width: 16%; }

        table.lines { margin-top: 14px; }
        table.lines th { background: #f5f3ff; color: #5b21b6; text-align: left; padding: 6px 8px;
                         font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #ddd6fe; }
        table.lines td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; font-size: 10px; }
        .num { text-align: right; }
        .ctr { text-align: center; }
        .muted { color: #9ca3af; }

        .totals { margin-top: 12px; }
        .totals td { padding: 0; vertical-align: top; }
        table.rec td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #f0f0f0; }
        table.rec .lbl { color: #4b5563; }
        table.rec tr.grand td { border-top: 2px solid #9333EA; border-bottom: none;
                                background: #f5f3ff; font-weight: bold; font-size: 13px; padding: 8px; }

        .notes { margin-top: 16px; font-size: 9px; color: #4b5563; line-height: 1.5; }
        .notes h3 { font-size: 9px; text-transform: uppercase; color: #9333EA; margin: 0 0 3px; }
        .sign { margin-top: 26px; }
        .sign td { width: 50%; font-size: 9px; color: #4b5563; vertical-align: top; padding-right: 14px; }
        .sign-box { border: 1px solid #e5e7eb; height: 60px; margin-top: 4px; }
        .footer { margin-top: 22px; border-top: 1px solid #e5e7eb; padding-top: 6px;
                  font-size: 8px; color: #9ca3af; text-align: center; line-height: 1.5; }
    </style>
</head>
<body>

<table class="header">
    <tr>
        <td>
            <div class="org-name">{{ $org->name ?? 'Organisation' }}</div>
            <div class="org-meta">
                @if(!empty($org?->address)){{ $org->address }}<br>@endif
                @if(!empty($org?->city)){{ $org->city }}@if(!empty($org?->country)) — {{ $org->country }}@endif<br>@endif
                @if(!empty($org?->phone))Tél. : {{ $org->phone }}<br>@endif
                @if(!empty($org?->email)){{ $org->email }}<br>@endif
                @if(!empty($org?->tax_number))N° contribuable : {{ $org->tax_number }}@endif
            </div>
        </td>
        <td>
            <div class="doc-type">DEVIS</div>
            <div class="doc-num">N° {{ $quote->quote_number ?? '—' }}</div>
            <div class="doc-status">{{ $statuts[$quote->status ?? ''] ?? ($quote->status ?? '') }}</div>
        </td>
    </tr>
</table>

<table class="meta">
    <tr>
        <td style="padding-right:6px;">
            <div class="box">
                <div class="box-title">Objet</div>
                <div class="box-name">{{ $quote->title ?? '—' }}</div>
            </div>
        </td>
        <td style="padding-left:6px;">
            <div class="box">
                <div class="box-title">Destinataire</div>
                <div class="box-name">{{ $client->name ?? '—' }}</div>
                <div class="box-line">
                    @if(!empty($client?->address)){{ $client->address }}<br>@endif
                    @if(!empty($client?->phone))Tél. : {{ $client->phone }}<br>@endif
                    @if(!empty($client?->email)){{ $client->email }}<br>@endif
                    @if(!empty($client?->tax_number))N° contribuable : {{ $client->tax_number }}@endif
                </div>
            </div>
        </td>
    </tr>
</table>

<table class="dates">
    <tr>
        <td class="lbl">Date d'émission</td>
        <td>{{ !empty($quote->issue_date) ? \Carbon\Carbon::parse($quote->issue_date)->format('d/m/Y') : '—' }}</td>
        <td class="lbl">Valable jusqu'au</td>
        <td>{{ !empty($quote->valid_until) ? \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') : '—' }}</td>
        <td class="lbl">Devise</td>
        <td>{{ $devise }}</td>
    </tr>
</table>

<table class="lines">
    <thead>
        <tr>
            <th style="width:6%;">N°</th>
            <th>Désignation</th>
            <th class="num" style="width:12%;">Quantité</th>
            <th class="num" style="width:18%;">Prix unitaire</th>
            <th class="num" style="width:20%;">Montant HT</th>
        </tr>
    </thead>
    <tbody>
        @forelse(($items ?? []) as $i => $item)
            <tr>
                <td class="ctr">{{ $i + 1 }}</td>
                <td>{{ $item->description ?? '—' }}</td>
                <td class="num">{{ rtrim(rtrim(number_format((float) ($item->quantity ?? 0), 3, ',', ' '), '0'), ',') }}</td>
                <td class="num">{{ $fmt($item->unit_price ?? 0) }}</td>
                <td class="num">{{ $fmt($item->total ?? 0) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" class="muted ctr" style="padding:18px;">Aucun élément</td>
            </tr>
        @endforelse
    </tbody>
</table>

<table class="totals">
    <tr>
        <td style="width:52%; padding-right:12px;">
            @if(!empty($quote->notes))
                <div class="notes">
                    <h3>Notes</h3>
                    {!! nl2br(e($quote->notes)) !!}
                </div>
            @endif
            <div class="notes">
                <h3>Conditions</h3>
                @if(!empty($quote->terms))
                    {!! nl2br(e($quote->terms)) !!}
                @else
                    Devis établi sur la base des éléments communiqués par le client.
                    @if(!empty($quote->valid_until))
                        Offre valable jusqu'au {{ \Carbon\Carbon::parse($quote->valid_until)->format('d/m/Y') }}.
                    @endif
                    Prix fermes pendant la durée de validité. Le règlement s'effectue selon les conditions
                    précisées sur la facture définitive.
                @endif
            </div>
        </td>
        <td style="width:48%;">
            <table class="rec">
                <tr>
                    <td class="lbl">Sous-total HT</td>
                    <td class="num">{{ $fmt($quote->subtotal ?? 0) }} {{ $devise }}</td>
                </tr>
                @if((float) ($quote->discount_amount ?? 0) > 0)
                    <tr>
                        <td class="lbl">Remise</td>
                        <td class="num">- {{ $fmt($quote->discount_amount) }} {{ $devise }}</td>
                    </tr>
                @endif
                <tr>
                    <td class="lbl">TVA ({{ rtrim(rtrim(number_format((float) ($quote->tax_rate ?? 0), 2, ',', ' '), '0'), ',') }} %)</td>
                    <td class="num">{{ $fmt($quote->tax_amount ?? 0) }} {{ $devise }}</td>
                </tr>
                <tr class="grand">
                    <td>TOTAL TTC</td>
                    <td class="num">{{ $fmt($quote->total ?? 0) }} {{ $devise }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table class="sign">
    <tr>
        <td>
            Pour {{ $org->name ?? 'l\'émetteur' }}
            <div class="sign-box"></div>
        </td>
        <td>
            Bon pour accord — {{ $client->name ?? 'le client' }} (date, signature et cachet)
            <div class="sign-box"></div>
        </td>
    </tr>
</table>

<div class="footer">
    {{ $org->name ?? '' }}@if(!empty($org?->tax_number)) — N° contribuable {{ $org->tax_number }}@endif @if(!empty($org?->email)) — {{ $org->email }}@endif<br>
    Document non contractuel tant qu'il n'est pas retourné signé. Montants exprimés en {{ $devise }}.<br>
    Document généré le {{ now()->format('d/m/Y à H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
