<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Badge Visiteur — {{ $visitor->full_name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }

        .badge {
            width: 105mm;
            height: 148mm; /* A6 */
            background: #fff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,.2);
            display: flex;
            flex-direction: column;
            position: relative;
        }

        /* Bandeau couleur en haut */
        .badge-header {
            background: {{ $badgeColor }};
            color: #fff;
            padding: 12px 14px 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .badge-header .org-logo {
            width: 44px;
            height: 44px;
            object-fit: contain;
            background: rgba(255,255,255,.2);
            border-radius: 6px;
            padding: 3px;
        }
        .badge-header .org-name {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .5px;
            text-transform: uppercase;
        }
        .badge-type {
            background: {{ $badgeColor }};
            color: #fff;
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 6px;
            text-align: center;
            padding: 6px 0;
            border-bottom: 3px solid rgba(0,0,0,.1);
        }

        /* Corps du badge */
        .badge-body { padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 8px; }

        .visitor-photo {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid {{ $badgeColor }};
            align-self: center;
        }
        .visitor-photo-placeholder {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            align-self: center;
            border: 3px solid {{ $badgeColor }};
        }

        .visitor-name {
            font-size: 16px;
            font-weight: 800;
            color: #1a1a2e;
            text-align: center;
        }
        .visitor-company {
            font-size: 11px;
            color: #666;
            text-align: center;
        }

        .info-row { display: flex; align-items: flex-start; gap: 6px; font-size: 10px; }
        .info-row .label { color: #888; min-width: 68px; font-weight: 600; }
        .info-row .value { color: #1a1a2e; font-weight: 500; }

        .divider { border: none; border-top: 1px dashed #ddd; margin: 4px 0; }

        /* QR code */
        .qr-section {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 8px;
            margin-top: auto;
        }
        .qr-section img { width: 64px; height: 64px; }
        .qr-info { font-size: 9px; color: #888; }
        .qr-info .badge-num { font-size: 12px; font-weight: 800; color: {{ $badgeColor }}; }

        /* Pied de page */
        .badge-footer {
            background: #1A3A5C;
            color: rgba(255,255,255,.7);
            font-size: 8px;
            text-align: center;
            padding: 5px;
        }
        .badge-footer strong { color: #F39C12; }

        @media print {
            body { background: none; }
            .badge { box-shadow: none; }
        }
    </style>
</head>
<body>
<div class="badge">
    <!-- En-tête organisation -->
    <div class="badge-header">
        @if($org->logo_path)
            <img src="{{ asset('storage/' . $org->logo_path) }}" alt="Logo" class="org-logo">
        @endif
        <div>
            <div class="org-name">{{ $org->name }}</div>
            <div style="font-size:9px;opacity:.8;">{{ $org->address ?? '' }}</div>
        </div>
    </div>

    <!-- Type de badge -->
    <div class="badge-type">VISITEUR</div>

    <!-- Corps -->
    <div class="badge-body">
        <!-- Photo visiteur -->
        @if($visitor->photo_path)
            <img src="{{ asset('storage/' . $visitor->photo_path) }}" alt="Photo" class="visitor-photo">
        @else
            <div class="visitor-photo-placeholder">👤</div>
        @endif

        <!-- Nom et société -->
        <div class="visitor-name">{{ $visitor->full_name }}</div>
        @if($visitor->company)
            <div class="visitor-company">{{ $visitor->company }}</div>
        @endif

        <hr class="divider">

        <!-- Informations visite -->
        <div class="info-row">
            <span class="label">Hôte :</span>
            <span class="value">{{ $visit->host->name ?? 'N/A' }}</span>
        </div>
        <div class="info-row">
            <span class="label">Motif :</span>
            <span class="value">{{ ucfirst($visit->purpose) }}{{ $visit->purpose_detail ? ' — ' . $visit->purpose_detail : '' }}</span>
        </div>
        <div class="info-row">
            <span class="label">Arrivée :</span>
            <span class="value">{{ $visit->check_in_at?->format('H:i') }}</span>
        </div>
        @if($visit->location)
        <div class="info-row">
            <span class="label">Lieu :</span>
            <span class="value">{{ $visit->location }}{{ $visit->floor ? ', Étage ' . $visit->floor : '' }}</span>
        </div>
        @endif

        <hr class="divider">

        <!-- QR Code pour check-out rapide -->
        <div class="qr-section">
            <img src="data:image/png;base64,{{ $qrCode }}" alt="QR Code">
            <div class="qr-info">
                <div class="badge-num">{{ $visitor->badge_number }}</div>
                <div>Scannez pour<br>le check-out</div>
                <div style="margin-top:4px;">
                    <strong>Valable :</strong> {{ $visit->check_in_at?->format('d/m/Y') }} uniquement
                </div>
            </div>
        </div>
    </div>

    <!-- Pied de page -->
    <div class="badge-footer">
        Ce badge est personnel et non transmissible — <strong>IBIG SECRETIS</strong>
    </div>
</div>
</body>
</html>
