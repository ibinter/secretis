<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $isReminder ? '[Rappel] ' : '' }}Signature requise — {{ $request->title }}</title>
    <style>
        body { margin: 0; padding: 0; background: #F1F5F9; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 580px; margin: 32px auto; }
        .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
        .header { background: #1E3A5F; padding: 28px 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 700; }
        .header p  { color: rgba(255,255,255,.7); margin: 6px 0 0; font-size: 14px; }
        .body { padding: 32px; }
        .body p { color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
        .doc-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
        .doc-box h3 { margin: 0 0 6px; font-size: 16px; color: #1E3A5F; }
        .doc-box p  { margin: 0; font-size: 13px; color: #64748B; }
        .message-box { background: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 20px 0; font-size: 14px; color: #1E40AF; }
        .btn { display: block; width: fit-content; margin: 28px auto; padding: 16px 40px; background: #2563EB; color: white; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 700; letter-spacing: .3px; }
        .reminder-banner { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #92400E; text-align: center; font-weight: 600; }
        .expiry { text-align: center; color: #D97706; font-size: 13px; margin-top: -12px; margin-bottom: 20px; }
        .footer { background: #F8FAFC; padding: 20px 32px; text-align: center; }
        .footer p { font-size: 12px; color: #94A3B8; margin: 4px 0; }
        .url-fallback { word-break: break-all; font-size: 11px; color: #94A3B8; margin-top: 16px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">

        <!-- Header -->
        <div class="header">
            <h1>SECRETIS ERP</h1>
            <p>Signature électronique sécurisée</p>
        </div>

        <!-- Corps -->
        <div class="body">

            @if($isReminder)
            <div class="reminder-banner">
                ⏰ RAPPEL — Ce document attend toujours votre signature
            </div>
            @endif

            <p>Bonjour <strong>{{ $signer->name }}</strong>,</p>

            <p>
                @if($isReminder)
                    Nous vous rappelons qu'une signature électronique est attendue de votre part sur le document suivant.
                @else
                    Vous êtes invité(e) à signer électroniquement le document suivant.
                @endif
            </p>

            <!-- Informations du document -->
            <div class="doc-box">
                <h3>{{ $request->title }}</h3>
                <p>Document : <strong>{{ $request->document->title ?? 'N/A' }}</strong></p>
                @if($request->signing_order === 'sequential')
                <p>Ordre de signature : Séquentiel — votre tour est venu.</p>
                @endif
            </div>

            <!-- Message personnalisé de l'expéditeur -->
            @if($request->message)
            <div class="message-box">
                <strong>Message :</strong><br>
                {{ $request->message }}
            </div>
            @endif

            <!-- Expiration -->
            @if($request->expires_at)
            <p class="expiry">
                ⚠ Ce lien de signature expire le
                <strong>{{ \Carbon\Carbon::parse($request->expires_at)->format('d/m/Y à H:i') }}</strong>.
            </p>
            @endif

            <!-- Bouton CTA -->
            <a href="{{ $signUrl }}" class="btn">
                ✍ Signer le document
            </a>

            <p style="font-size:13px;color:#64748B;text-align:center">
                En cliquant sur ce bouton, vous accéderez à une page sécurisée.<br>
                Aucun compte SECRETIS n'est requis pour signer.
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Cet email a été envoyé automatiquement par <strong>IBIG SECRETIS ERP</strong>.</p>
            <p>Si vous ne souhaitez pas signer, vous pouvez ignorer cet email ou refuser via le lien ci-dessus.</p>
            <p class="url-fallback">
                Si le bouton ne fonctionne pas, copiez ce lien : {{ $signUrl }}
            </p>
        </div>

    </div>

    <p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:16px">
        SECRETIS ERP — Gestion documentaire sécurisée pour l'Afrique francophone
    </p>
</div>
</body>
</html>
