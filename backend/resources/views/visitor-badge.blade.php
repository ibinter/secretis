{{--
    Badge visiteur — rendu HTML imprimable.
    Appelé par : App\Services\VisitorService::generateBadge() (ligne 246) via view(...)->render()
    Variables :
      $visit       App\Models\VisitLog (table visitor_logs) — relations chargées : visitor, host, organization
                   colonnes : badge_number, purpose, checked_in_at, checked_out_at, vehicle_plate, notes
      $qrCode      string  PNG encodé en base64 (QrCode::format('png')->size(150))
      $badgeColor  string  couleur hexadécimale de la bande d'accès (ex. '#27AE60')
--}}
@php
    $visitor    = $visit->visitor ?? null;
    $fullName   = trim(($visitor->first_name ?? '') . ' ' . ($visitor->last_name ?? ''));
    $fullName   = $fullName !== '' ? $fullName : 'Visiteur';
    $checkedIn  = $visit->checked_in_at ? \Carbon\Carbon::parse($visit->checked_in_at) : null;
    $color      = $badgeColor ?? '#9333EA';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Badge visiteur {{ $visit->badge_number ?? '' }}</title>
<style>
    @page { size: 90mm 130mm; margin: 0; }
    * { box-sizing: border-box; font-family: "DejaVu Sans", Arial, Helvetica, sans-serif; }
    body { margin: 0; padding: 12px; background: #f3f4f6; color: #1f2937; }

    .badge {
        width: 90mm; height: 130mm; margin: 0 auto; background: #ffffff;
        border: 1px solid #e5e7eb; border-top: 4px solid #9333EA;
        page-break-inside: avoid;
    }
    .badge-inner { padding: 6mm 5mm; }

    .org { font-size: 13px; font-weight: bold; color: #111827; text-align: center; }
    .org-sub { font-size: 8px; color: #6b7280; text-align: center; letter-spacing: 1px;
               text-transform: uppercase; margin-top: 1px; }

    .band { margin: 4mm 0 3mm; padding: 3px 0; text-align: center;
            font-size: 9px; font-weight: bold; letter-spacing: 2px;
            text-transform: uppercase; color: #ffffff; }

    .name { font-size: 17px; font-weight: bold; color: #111827; text-align: center;
            line-height: 1.2; word-wrap: break-word; }
    .company { font-size: 11px; color: #4b5563; text-align: center; margin-top: 2px; }

    table.info { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 10px; }
    table.info th { text-align: left; padding: 3px 0; color: #6b7280; font-weight: normal;
                    font-size: 8px; text-transform: uppercase; width: 38%; vertical-align: top; }
    table.info td { text-align: left; padding: 3px 0; color: #111827; font-weight: bold;
                    vertical-align: top; }

    .qr { text-align: center; margin-top: 4mm; }
    .qr img { width: 28mm; height: 28mm; }
    .badge-no { text-align: center; font-size: 13px; font-weight: bold;
                letter-spacing: 1px; color: #111827; margin-top: 2mm; }
    .rule { border: 0; border-top: 1px solid #e5e7eb; margin: 3mm 0; }
    .notice { font-size: 7px; color: #9ca3af; text-align: center; line-height: 1.4; margin-top: 2mm; }
    .muted { color: #9ca3af; font-weight: normal; }

    .toolbar { text-align: center; margin: 0 0 10px; }
    .toolbar button { background: #9333EA; color: #fff; border: 0; border-radius: 6px;
                      padding: 8px 18px; font-size: 13px; cursor: pointer; }
    @media print {
        body { background: #ffffff; padding: 0; }
        .toolbar { display: none; }
        .badge { border: 0; margin: 0; }
    }
</style>
</head>
<body>

<div class="toolbar">
    <button type="button" onclick="window.print()">Imprimer le badge</button>
</div>

<div class="badge">
    <div class="badge-inner">

        <div class="org">{{ $visit->organization->name ?? 'SECRETIS ERP' }}</div>
        <div class="org-sub">Badge visiteur</div>

        <div class="band" style="background: {{ $color }};">Acces visiteur</div>

        <div class="name">{{ $fullName }}</div>
        @if (!empty($visitor->company))
            <div class="company">{{ $visitor->company }}</div>
        @endif

        <hr class="rule">

        <table class="info">
            <tr>
                <th>Personne visitee</th>
                <td>{{ $visit->host->name ?? '—' }}</td>
            </tr>
            <tr>
                <th>Motif</th>
                <td>{{ $visit->purpose ?: '—' }}</td>
            </tr>
            <tr>
                <th>Date d'arrivee</th>
                <td>{{ $checkedIn?->format('d/m/Y') ?? '—' }}</td>
            </tr>
            <tr>
                <th>Heure d'arrivee</th>
                <td>{{ $checkedIn?->format('H:i') ?? '—' }}</td>
            </tr>
            @if (!empty($visit->vehicle_plate))
            <tr>
                <th>Vehicule</th>
                <td>{{ $visit->vehicle_plate }}</td>
            </tr>
            @endif
        </table>

        <hr class="rule">

        @if (!empty($qrCode))
            <div class="qr">
                <img src="data:image/png;base64,{{ $qrCode }}" alt="QR code de controle du badge">
            </div>
        @endif

        <div class="badge-no">{{ $visit->badge_number ?: 'SANS NUMERO' }}</div>

        <div class="notice">
            Ce badge doit rester visible pendant toute la duree de la visite
            et etre restitue a l'accueil au depart.
        </div>

    </div>
</div>

</body>
</html>
