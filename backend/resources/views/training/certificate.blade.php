<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attestation de Formation — {{ $certificate->certificate_number }}</title>
    <style>
        /* ── Reset & base ─────────────────────────────────────────────────── */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 landscape; margin: 0; }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            background: #fff;
            color: #1a1a2e;
            width: 297mm;
            height: 210mm;
            position: relative;
            overflow: hidden;
        }

        /* ── Cadre décoratif ──────────────────────────────────────────────── */
        .outer-border {
            position: absolute;
            inset: 8mm;
            border: 3px solid #1e3a5f;
            border-radius: 4px;
        }
        .inner-border {
            position: absolute;
            inset: 11mm;
            border: 1px solid #c9a84c;
            border-radius: 2px;
        }

        /* ── Arrière-plan décoratif ───────────────────────────────────────── */
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 80px;
            color: rgba(30, 58, 95, 0.04);
            font-weight: 900;
            white-space: nowrap;
            letter-spacing: 4px;
            pointer-events: none;
            text-transform: uppercase;
        }

        /* ── Coins décoratifs ─────────────────────────────────────────────── */
        .corner {
            position: absolute;
            width: 24mm;
            height: 24mm;
        }
        .corner-tl { top: 12mm; left: 12mm; border-top: 3px solid #c9a84c; border-left: 3px solid #c9a84c; }
        .corner-tr { top: 12mm; right: 12mm; border-top: 3px solid #c9a84c; border-right: 3px solid #c9a84c; }
        .corner-bl { bottom: 12mm; left: 12mm; border-bottom: 3px solid #c9a84c; border-left: 3px solid #c9a84c; }
        .corner-br { bottom: 12mm; right: 12mm; border-bottom: 3px solid #c9a84c; border-right: 3px solid #c9a84c; }

        /* ── Contenu principal ────────────────────────────────────────────── */
        .content {
            position: absolute;
            inset: 14mm;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* ── En-tête logos ────────────────────────────────────────────────── */
        .header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 6mm;
        }
        .logo-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 40mm;
        }
        .logo-img {
            height: 14mm;
            max-width: 38mm;
            object-fit: contain;
        }
        .logo-label {
            font-size: 7px;
            color: #666;
            margin-top: 1mm;
            text-align: center;
        }

        /* ── Bandeau titre ────────────────────────────────────────────────── */
        .title-band {
            text-align: center;
            margin-bottom: 5mm;
        }
        .title-sub {
            font-size: 9px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #c9a84c;
            font-weight: 600;
            margin-bottom: 1mm;
        }
        .title-main {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #1e3a5f;
            line-height: 1;
        }
        .title-divider {
            width: 60mm;
            height: 2px;
            background: linear-gradient(to right, transparent, #c9a84c, transparent);
            margin: 2mm auto 0;
        }

        /* ── Corps du certificat ──────────────────────────────────────────── */
        .body-text {
            text-align: center;
            margin-bottom: 3mm;
        }
        .body-text p {
            font-size: 10px;
            color: #444;
            line-height: 1.5;
        }
        .holder-name {
            font-size: 22px;
            font-weight: 700;
            color: #1e3a5f;
            font-style: italic;
            margin: 2mm 0;
            text-align: center;
        }
        .course-name {
            font-size: 14px;
            font-weight: 700;
            color: #c9a84c;
            text-align: center;
            margin: 1mm 0 3mm;
        }

        /* ── Méta-informations ────────────────────────────────────────────── */
        .meta-row {
            display: flex;
            justify-content: center;
            gap: 10mm;
            margin-bottom: 4mm;
        }
        .meta-item {
            text-align: center;
        }
        .meta-label {
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            display: block;
        }
        .meta-value {
            font-size: 10px;
            font-weight: 600;
            color: #1e3a5f;
            display: block;
        }

        /* ── Pied du certificat ───────────────────────────────────────────── */
        .footer {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto;
        }

        .signature-block {
            text-align: center;
            min-width: 50mm;
        }
        .signature-line {
            width: 45mm;
            height: 1px;
            background: #1e3a5f;
            margin: 0 auto 1mm;
        }
        .signature-name {
            font-size: 8px;
            font-weight: 600;
            color: #1e3a5f;
        }
        .signature-title {
            font-size: 7px;
            color: #666;
        }

        .qr-block {
            text-align: center;
        }
        .qr-block img {
            width: 20mm;
            height: 20mm;
        }
        .qr-label {
            font-size: 6px;
            color: #888;
            margin-top: 1mm;
        }

        .cert-number {
            font-size: 7px;
            color: #aaa;
            text-align: center;
            font-family: monospace;
        }

        /* ── Bande dorée latérale gauche ──────────────────────────────────── */
        .side-accent {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 8mm;
            background: linear-gradient(to bottom, #1e3a5f, #2d5fa6, #1e3a5f);
        }
        .side-accent-text {
            position: absolute;
            left: 1mm;
            top: 50%;
            transform: translateY(-50%) rotate(-90deg);
            font-size: 6px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.6);
            white-space: nowrap;
        }
    </style>
</head>
<body>
    <!-- Bordures décoratives -->
    <div class="outer-border"></div>
    <div class="inner-border"></div>

    <!-- Coins dorés -->
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>

    <!-- Filigrane -->
    <div class="watermark">IBIG SECRETIS</div>

    <!-- Bande latérale -->
    <div class="side-accent">
        <span class="side-accent-text">Formation &amp; Certification</span>
    </div>

    <!-- Contenu principal -->
    <div class="content" style="left: 20mm;">

        <!-- En-tête logos -->
        <div class="header">
            <div class="logo-box">
                <img src="{{ public_path('images/logo-ibig-secretis.png') }}"
                     alt="IBIG SECRETIS" class="logo-img"
                     onerror="this.style.display='none'">
                <span class="logo-label">IBIG SECRETIS</span>
            </div>

            <div style="flex: 1;"></div>

            @if($organization && $organization->logo_path)
            <div class="logo-box">
                <img src="{{ Storage::path($organization->logo_path) }}"
                     alt="{{ $organization->name }}" class="logo-img"
                     onerror="this.style.display='none'">
                <span class="logo-label">{{ $organization->name }}</span>
            </div>
            @endif
        </div>

        <!-- Titre -->
        <div class="title-band">
            <div class="title-sub">Ce document certifie que</div>
            <div class="title-main">Attestation de Formation</div>
            <div class="title-divider"></div>
        </div>

        <!-- Nom du participant -->
        <div class="body-text">
            <p>Il est attesté par la présente que</p>
        </div>

        <div class="holder-name">{{ $user->name ?? 'Participant' }}</div>

        <div class="body-text">
            <p>a suivi et validé avec succès la formation</p>
        </div>

        <div class="course-name">{{ $course->title }}</div>

        <div class="body-text">
            <p>{{ $organization->name ?? '' }} — Plateforme IBIG SECRETIS</p>
        </div>

        <!-- Métadonnées -->
        <div class="meta-row">
            <div class="meta-item">
                <span class="meta-label">Date de délivrance</span>
                <span class="meta-value">
                    {{ \Carbon\Carbon::parse($certificate->issued_at)->locale('fr')->isoFormat('D MMMM YYYY') }}
                </span>
            </div>

            <div class="meta-item">
                <span class="meta-label">Niveau</span>
                <span class="meta-value">
                    {{ match($course->level) {
                        'beginner'     => 'Débutant',
                        'intermediate' => 'Intermédiaire',
                        'advanced'     => 'Avancé',
                        default        => ucfirst($course->level)
                    } }}
                </span>
            </div>

            <div class="meta-item">
                <span class="meta-label">Durée</span>
                <span class="meta-value">{{ $course->duration_minutes }} min</span>
            </div>

            @if($avg_score !== null)
            <div class="meta-item">
                <span class="meta-label">Score obtenu</span>
                <span class="meta-value">{{ $avg_score }}%</span>
            </div>
            @endif

            @if($certificate->expires_at)
            <div class="meta-item">
                <span class="meta-label">Valide jusqu'au</span>
                <span class="meta-value">
                    {{ \Carbon\Carbon::parse($certificate->expires_at)->locale('fr')->isoFormat('D MMMM YYYY') }}
                </span>
            </div>
            @endif
        </div>

        <!-- Pied : signature + QR -->
        <div class="footer">

            <!-- Signature direction -->
            <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">{{ $organization->name ?? 'IBIG SECRETIS' }}</div>
                <div class="signature-title">Direction de la Formation</div>
            </div>

            <!-- Numéro de certificat centré -->
            <div style="text-align: center; flex: 1;">
                <div class="cert-number">N° {{ $certificate->certificate_number }}</div>
                <div style="font-size: 6px; color: #aaa; margin-top: 0.5mm;">
                    Vérifiez l'authenticité sur secretis.ibigsoft.com
                </div>
            </div>

            <!-- QR Code de vérification -->
            <div class="qr-block">
                {!! QrCode::size(75)->generate($verify_url) !!}
                <div class="qr-label">Scanner pour vérifier</div>
            </div>

        </div>

    </div><!-- /.content -->
</body>
</html>
