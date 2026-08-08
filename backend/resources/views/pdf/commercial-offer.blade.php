@php
    /**
     * Offre commerciale SECRETIS — SECRETIS ERP
     * Appelée par App\Http\Controllers\SuperAdmin\CrmProspectsController::generateOfferPdf()
     * Variables : $offer (stdClass, table commercial_offers), $lines (Collection<stdClass>, commercial_offer_lines),
     *             $prospect (stdClass|null, table prospects)
     * Remarque : aucune variable $org n'est transmise — l'émetteur est l'éditeur (IBIG Soft).
     */
    $fmt = fn ($v) => number_format((float) ($v ?? 0), 0, ',', ' ');
    $dev = $offer->currency ?? 'XOF';

    $periodes = ['monthly' => 'Mensuel', 'yearly' => 'Annuel'];
    $statuts  = [
        'draft'    => 'Brouillon',
        'sent'     => 'Envoyée',
        'viewed'   => 'Consultée',
        'accepted' => 'Acceptée',
        'refused'  => 'Refusée',
        'expired'  => 'Expirée',
    ];

    $prospectNom = trim(($prospect->first_name ?? '') . ' ' . ($prospect->last_name ?? ''));
    $remisePct   = (int) ($offer->discount_pct ?? 0);
    $totalHt     = (float) ($offer->amount_ht ?? 0);
    $totalTtc    = (float) ($offer->amount_ttc ?? 0);
    $tva         = max(0, $totalTtc - $totalHt);
    $tauxTva     = $totalHt > 0 ? round(($tva / $totalHt) * 100, 2) : 0;
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>Offre commerciale {{ $offer->number ?? '' }}</title>
    <style>
        @page { margin: 14mm 12mm 18mm 12mm; }
        * { font-family: 'DejaVu Sans', sans-serif; }
        body { margin: 0; color: #1f2937; font-size: 11px; }

        .header { border-bottom: 2px solid #9333EA; padding-bottom: 10px; margin-bottom: 14px; }
        .header td { vertical-align: top; }
        .org-name { font-size: 16px; font-weight: bold; color: #111827; }
        .org-meta { font-size: 9px; color: #6b7280; line-height: 1.5; margin-top: 3px; }
        .doc-type { font-size: 18px; font-weight: bold; color: #9333EA; text-align: right; }
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
        table.lines th.num { text-align: right; }
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
        .sign { margin-top: 24px; }
        .sign td { width: 50%; font-size: 9px; color: #4b5563; vertical-align: top; padding-right: 14px; }
        .sign-box { border: 1px solid #e5e7eb; height: 58px; margin-top: 4px; }
        .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 6px;
                  font-size: 8px; color: #9ca3af; text-align: center; line-height: 1.5; }
    </style>
</head>
<body>

<table class="header">
    <tr>
        <td>
            <div class="org-name">IBIG Soft</div>
            <div class="org-meta">
                Éditeur de la solution SECRETIS ERP<br>
                Abidjan — Côte d'Ivoire<br>
                secretis@ibigsoft.com
            </div>
        </td>
        <td>
            <div class="doc-type">OFFRE COMMERCIALE</div>
            <div class="doc-num">N° {{ $offer->number ?? '—' }}</div>
            <div class="doc-status">{{ $statuts[$offer->status ?? ''] ?? ($offer->status ?? '') }}</div>
        </td>
    </tr>
</table>

<table class="meta">
    <tr>
        <td style="padding-right:6px;">
            <div class="box">
                <div class="box-title">Solution proposée</div>
                <div class="box-name">{{ $offer->software ?? 'SECRETIS ERP' }}</div>
                <div class="box-line">
                    @if(!empty($offer->plan))Formule : {{ $offer->plan }}<br>@endif
                    Utilisateurs : {{ $offer->users_count ?? 1 }}<br>
                    Entités : {{ $offer->entities_count ?? 1 }}<br>
                    Périodicité : {{ $periodes[$offer->period ?? ''] ?? ($offer->period ?? '—') }}
                </div>
            </div>
        </td>
        <td style="padding-left:6px;">
            <div class="box">
                <div class="box-title">Destinataire</div>
                <div class="box-name">{{ $prospect->company ?? ($prospectNom !== '' ? $prospectNom : '—') }}</div>
                <div class="box-line">
                    @if($prospectNom !== ''){{ $prospectNom }}@if(!empty($prospect?->function)) — {{ $prospect->function }}@endif<br>@endif
                    @if(!empty($prospect?->phone))Tél. : {{ $prospect->phone }}<br>@endif
                    @if(!empty($prospect?->email)){{ $prospect->email }}<br>@endif
                    @if(!empty($prospect?->country))Pays : {{ $prospect->country }}@endif
                </div>
            </div>
        </td>
    </tr>
</table>

<table class="dates">
    <tr>
        <td class="lbl">Date d'émission</td>
        <td>{{ !empty($offer->created_at) ? \Carbon\Carbon::parse($offer->created_at)->format('d/m/Y') : now()->format('d/m/Y') }}</td>
        <td class="lbl">Valable jusqu'au</td>
        <td>{{ !empty($offer->valid_until) ? \Carbon\Carbon::parse($offer->valid_until)->format('d/m/Y') : '—' }}</td>
        <td class="lbl">Devise</td>
        <td>{{ $dev }}</td>
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
        <tr>
            <td class="ctr">1</td>
            <td>
                Abonnement {{ $offer->software ?? 'SECRETIS ERP' }}@if(!empty($offer->plan)) — formule {{ $offer->plan }}@endif
                ({{ strtolower($periodes[$offer->period ?? ''] ?? ($offer->period ?? '')) }},
                {{ $offer->users_count ?? 1 }} utilisateur(s), {{ $offer->entities_count ?? 1 }} entité(s))
            </td>
            <td class="num">1</td>
            <td class="num muted">—</td>
            <td class="num muted">—</td>
        </tr>
        @forelse(($lines ?? []) as $i => $line)
            <tr>
                <td class="ctr">{{ $i + 2 }}</td>
                <td>{{ $line->description ?? '—' }}</td>
                <td class="num">{{ $fmt($line->quantity ?? 0) }}</td>
                <td class="num">{{ $fmt($line->unit_price ?? 0) }}</td>
                <td class="num">{{ $fmt($line->total ?? 0) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="5" class="muted ctr" style="padding:14px;">Aucun élément complémentaire</td>
            </tr>
        @endforelse
    </tbody>
</table>

<table class="totals">
    <tr>
        <td style="width:52%; padding-right:12px;">
            <div class="notes">
                <h3>Conditions</h3>
                @if(!empty($offer->conditions))
                    {!! nl2br(e($offer->conditions)) !!}
                @else
                    Offre établie sur la base du périmètre décrit ci-dessus.
                    @if(!empty($offer->valid_until))
                        Elle est valable jusqu'au {{ \Carbon\Carbon::parse($offer->valid_until)->format('d/m/Y') }}.
                    @endif
                    Mise en service, reprise des données et formation des utilisateurs incluses.
                    Support et mises à jour compris pendant toute la durée de l'abonnement.
                @endif
            </div>
            <div class="notes">
                <h3>Modalités de règlement</h3>
                Règlement par virement bancaire ou Mobile Money à réception de la facture.
                Contact : secretis@ibigsoft.com.
            </div>
        </td>
        <td style="width:48%;">
            <table class="rec">
                <tr>
                    <td class="lbl">Total HT</td>
                    <td class="num">{{ $fmt($totalHt) }} {{ $dev }}</td>
                </tr>
                @if($remisePct > 0)
                    <tr>
                        <td class="lbl">Remise commerciale</td>
                        <td class="num">{{ $remisePct }} %</td>
                    </tr>
                @endif
                <tr>
                    <td class="lbl">TVA ({{ rtrim(rtrim(number_format($tauxTva, 2, ',', ' '), '0'), ',') }} %)</td>
                    <td class="num">{{ $fmt($tva) }} {{ $dev }}</td>
                </tr>
                <tr class="grand">
                    <td>TOTAL TTC</td>
                    <td class="num">{{ $fmt($totalTtc) }} {{ $dev }}</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<table class="sign">
    <tr>
        <td>
            Pour IBIG Soft
            <div class="sign-box"></div>
        </td>
        <td>
            Bon pour accord — {{ $prospect->company ?? ($prospectNom !== '' ? $prospectNom : 'le client') }}
            (date, signature et cachet)
            <div class="sign-box"></div>
        </td>
    </tr>
</table>

<div class="footer">
    IBIG Soft — SECRETIS ERP — secretis@ibigsoft.com<br>
    Offre non contractuelle tant qu'elle n'est pas retournée signée. Montants exprimés en {{ $dev }}.<br>
    Document généré le {{ now()->format('d/m/Y à H:i') }} — SECRETIS ERP · IBIG Soft
</div>

</body>
</html>
