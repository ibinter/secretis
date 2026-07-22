<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Attestation de participation — {{ $session->title }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', 'Helvetica', Arial, sans-serif;
            background: #ffffff;
            color: #1a1a2e;
            width: 297mm;
            height: 210mm;
            overflow: hidden;
        }

        /* Bordure décorative */
        .page-border {
            position: absolute;
            inset: 8mm;
            border: 3px solid #4f46e5;
            border-radius: 4mm;
        }

        .page-border-inner {
            position: absolute;
            inset: 11mm;
            border: 1px solid #c7d2fe;
            border-radius: 3mm;
        }

        /* En-tête */
        .header {
            position: relative;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            padding: 12mm 20mm 8mm;
            text-align: center;
            margin: 8mm 8mm 0;
            border-radius: 4mm 4mm 0 0;
        }

        .logo-area {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 4mm;
        }

        .org-name {
            font-size: 20pt;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 2px;
        }

        .header-subtitle {
            font-size: 9pt;
            color: #c7d2fe;
            margin-top: 2mm;
            letter-spacing: 3px;
            text-transform: uppercase;
        }

        /* Corps */
        .body {
            padding: 8mm 20mm 6mm;
            text-align: center;
            position: relative;
        }

        .attestation-title {
            font-size: 26pt;
            font-weight: bold;
            color: #4f46e5;
            margin-bottom: 6mm;
            letter-spacing: 1px;
        }

        .present-text {
            font-size: 11pt;
            color: #374151;
            margin-bottom: 4mm;
        }

        .participant-name {
            font-size: 22pt;
            font-weight: bold;
            color: #1a1a2e;
            border-bottom: 2px solid #4f46e5;
            display: inline-block;
            padding-bottom: 2mm;
            margin-bottom: 5mm;
            min-width: 160mm;
        }

        .participant-title {
            font-size: 10pt;
            color: #6b7280;
            margin-bottom: 6mm;
        }

        .session-box {
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 3mm;
            padding: 5mm 10mm;
            display: inline-block;
            margin-bottom: 5mm;
            min-width: 180mm;
            text-align: left;
        }

        .session-title {
            font-size: 14pt;
            font-weight: bold;
            color: #4f46e5;
            margin-bottom: 3mm;
        }

        .session-meta {
            font-size: 9pt;
            color: #374151;
            line-height: 1.8;
        }

        .session-meta span {
            font-weight: bold;
            color: #1a1a2e;
        }

        /* Footer */
        .footer {
            position: absolute;
            bottom: 12mm;
            left: 0;
            right: 0;
            padding: 0 20mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .signature-block {
            text-align: center;
        }

        .signature-line {
            width: 55mm;
            border-top: 1px solid #374151;
            margin-bottom: 2mm;
        }

        .signature-label {
            font-size: 8pt;
            color: #6b7280;
        }

        .signature-name {
            font-size: 9pt;
            font-weight: bold;
            color: #1a1a2e;
        }

        .qr-section {
            text-align: center;
        }

        .qr-label {
            font-size: 7pt;
            color: #9ca3af;
            margin-top: 2mm;
        }

        /* Décorations */
        .deco-star {
            position: absolute;
            color: #e0e7ff;
            font-size: 60pt;
            font-weight: bold;
            opacity: 0.15;
        }

        .deco-star-left  { left: 12mm; top: 30mm; }
        .deco-star-right { right: 12mm; top: 30mm; }

        .cert-number {
            font-size: 7pt;
            color: #9ca3af;
            letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <!-- Cadres décoratifs -->
    <div class="page-border"></div>
    <div class="page-border-inner"></div>

    <!-- Étoiles décoratives -->
    <div class="deco-star deco-star-left">★</div>
    <div class="deco-star deco-star-right">★</div>

    <!-- En-tête -->
    <div class="header">
        <div class="logo-area">
            <div class="org-name">{{ strtoupper($organization->name ?? 'IBIG SECRETIS') }}</div>
        </div>
        <div class="header-subtitle">Centre de Formation Professionnel</div>
    </div>

    <!-- Corps -->
    <div class="body">
        <div class="attestation-title">Attestation de Participation</div>

        <div class="present-text">
            Nous certifions que
        </div>

        <div class="participant-name">{{ $attendee->name }}</div>

        @if($attendee->title ?? null)
            <div class="participant-title">{{ $attendee->title }}</div>
        @endif

        <div style="font-size: 10pt; color: #374151; margin-bottom: 5mm;">
            a participé à la session de formation en direct suivante :
        </div>

        <div class="session-box">
            <div class="session-title">{{ $session->title }}</div>
            <table class="session-meta" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="50%">
                        <div>Date : <span>{{ \Carbon\Carbon::parse($session->scheduled_at)->locale('fr')->isoFormat('dddd D MMMM YYYY') }}</span></div>
                        <div>Heure : <span>{{ \Carbon\Carbon::parse($session->scheduled_at)->format('H\hi') }}</span></div>
                    </td>
                    <td width="50%">
                        <div>Durée : <span>{{ $session->duration_minutes }} minutes</span></div>
                        <div>Plateforme : <span>{{ ucfirst(str_replace('_', ' ', $session->platform)) }}</span></div>
                    </td>
                </tr>
                @if($attendee->duration_minutes)
                    <tr>
                        <td colspan="2">
                            <div>Temps de présence : <span>{{ $attendee->duration_minutes }} minutes</span></div>
                        </td>
                    </tr>
                @endif
            </table>
        </div>

        <div style="font-size: 8pt; color: #6b7280; margin-top: 2mm;">
            Délivrée le {{ \Carbon\Carbon::now()->locale('fr')->isoFormat('D MMMM YYYY') }}
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <!-- Signature instructeur -->
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">{{ $instructor->name ?? 'L\'Instructeur' }}</div>
            <div class="signature-label">Instructeur / Formateur</div>
        </div>

        <!-- QR code de vérification -->
        <div class="qr-section">
            @if(!empty($qrCodeBase64))
                <img src="data:image/png;base64,{{ $qrCodeBase64 }}" width="30mm" height="30mm" alt="QR Vérification" />
            @else
                <!-- Placeholder QR -->
                <div style="width:30mm;height:30mm;border:1px dashed #d1d5db;display:flex;align-items:center;justify-content:center;font-size:6pt;color:#9ca3af;">
                    QR
                </div>
            @endif
            <div class="qr-label">Vérifiez l'authenticité</div>
            @if(!empty($verificationToken))
                <div class="cert-number">N° {{ strtoupper(substr($verificationToken, 0, 16)) }}</div>
            @endif
        </div>

        <!-- Signature organisation -->
        <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-name">{{ $organization->name ?? 'Organisation' }}</div>
            <div class="signature-label">Responsable Formation</div>
        </div>
    </div>
</body>
</html>
