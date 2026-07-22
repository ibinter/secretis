<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation Visiteur — {{ $invitation->organization->name ?? 'IBIG SECRETIS' }}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }

        /* En-tête */
        .header { background: #1A3A5C; padding: 30px 40px; text-align: center; }
        .header img { height: 50px; margin-bottom: 12px; }
        .header h1 { color: #fff; font-size: 20px; margin: 0; }
        .header p { color: rgba(255,255,255,.7); font-size: 13px; margin-top: 4px; }

        /* Bandeau date */
        .date-banner {
            background: #F39C12;
            color: #fff;
            text-align: center;
            padding: 14px;
            font-size: 18px;
            font-weight: 700;
        }

        .body { padding: 36px 40px; }

        .greeting { font-size: 16px; color: #1a1a2e; margin-bottom: 20px; }

        /* Carte invitation */
        .invite-card {
            background: #f8f9fb;
            border: 2px solid #1A3A5C;
            border-radius: 10px;
            padding: 24px;
            margin-bottom: 24px;
        }
        .invite-card .row { display: flex; gap: 10px; margin-bottom: 12px; align-items: flex-start; }
        .invite-card .icon { font-size: 18px; width: 24px; flex-shrink: 0; }
        .invite-card .info .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .5px; }
        .invite-card .info .value { font-size: 14px; color: #1a1a2e; font-weight: 600; }

        /* QR Code */
        .qr-section { text-align: center; margin: 24px 0; }
        .qr-section img { width: 160px; height: 160px; border: 4px solid #1A3A5C; border-radius: 8px; padding: 6px; }
        .qr-section p { font-size: 12px; color: #888; margin-top: 8px; }
        .access-code {
            display: inline-block;
            background: #1A3A5C;
            color: #F39C12;
            font-family: monospace;
            font-size: 18px;
            letter-spacing: 3px;
            padding: 8px 20px;
            border-radius: 6px;
            margin: 10px 0;
        }

        /* Bouton CTA */
        .cta { text-align: center; margin: 28px 0; }
        .cta a {
            background: #1A3A5C;
            color: #fff;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            display: inline-block;
        }

        /* Infos pratiques */
        .practical { background: #eaf0f8; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
        .practical h3 { font-size: 13px; color: #1A3A5C; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
        .practical ul { list-style: none; padding: 0; margin: 0; }
        .practical li { font-size: 13px; color: #444; padding: 4px 0; display: flex; gap: 8px; }

        /* Liens */
        .links { display: flex; gap: 12px; justify-content: center; margin: 16px 0; flex-wrap: wrap; }
        .links a {
            background: #fff;
            border: 2px solid #1A3A5C;
            color: #1A3A5C;
            text-decoration: none;
            padding: 9px 20px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
        }

        /* Contact hote */
        .host-card { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px 18px; margin-top: 20px; }
        .host-avatar { width: 44px; height: 44px; border-radius: 50%; background: #1A3A5C; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0; }
        .host-info .name { font-size: 14px; font-weight: 700; color: #1a1a2e; }
        .host-info .title { font-size: 12px; color: #888; }
        .host-info .contact { font-size: 12px; color: #1A3A5C; }

        /* Footer */
        .footer { background: #1A3A5C; color: rgba(255,255,255,.5); text-align: center; padding: 20px; font-size: 11px; }
        .footer a { color: #F39C12; text-decoration: none; }
    </style>
</head>
<body>
<div class="wrapper">

    <!-- En-tête -->
    <div class="header">
        @if(isset($organization) && $organization->logo_path)
            <img src="{{ asset('storage/' . $organization->logo_path) }}" alt="{{ $organization->name }}">
        @endif
        <h1>Invitation à vous rendre chez<br>{{ $organization->name ?? 'IBIG SECRETIS' }}</h1>
        <p>Vous avez reçu une invitation officielle</p>
    </div>

    <!-- Bannière date -->
    <div class="date-banner">
        📅 {{ \Carbon\Carbon::parse($invitation->visit_date)->locale('fr')->isoFormat('dddd D MMMM YYYY') }}
        — {{ $invitation->visit_time_start }} à {{ $invitation->visit_time_end }}
    </div>

    <div class="body">
        <div class="greeting">
            Bonjour <strong>{{ $invitation->visitor_name }}</strong>,<br><br>
            <strong>{{ $host->name }}</strong> vous invite à le/la rejoindre dans nos locaux.
            Veuillez présenter le QR code ci-dessous à votre arrivée en réception.
        </div>

        <!-- Détails de la visite -->
        <div class="invite-card">
            <div class="row">
                <span class="icon">🏢</span>
                <div class="info">
                    <div class="label">Lieu</div>
                    <div class="value">{{ $invitation->location ?? $organization->address ?? 'Voir la carte ci-dessous' }}</div>
                </div>
            </div>
            <div class="row">
                <span class="icon">⏰</span>
                <div class="info">
                    <div class="label">Horaires</div>
                    <div class="value">{{ $invitation->visit_time_start }} — {{ $invitation->visit_time_end }}</div>
                </div>
            </div>
            @if($invitation->purpose)
            <div class="row">
                <span class="icon">📋</span>
                <div class="info">
                    <div class="label">Objet de la visite</div>
                    <div class="value">{{ $invitation->purpose }}</div>
                </div>
            </div>
            @endif
            <div class="row">
                <span class="icon">📌</span>
                <div class="info">
                    <div class="label">Hôte</div>
                    <div class="value">{{ $host->name }} — {{ $host->email }}</div>
                </div>
            </div>
        </div>

        <!-- QR Code et code d accès -->
        <div class="qr-section">
            <p><strong>Votre code d'accès visiteur</strong></p>
            <img src="{{ $qrCodeUrl }}" alt="QR Code d'accès">
            <p>Ou saisissez le code manuellement :</p>
            <div class="access-code">{{ strtoupper(substr($invitation->access_code, 0, 8)) }}</div>
            <p style="color:#e74c3c;font-size:11px;">⚠️ Ce code est personnel — ne le partagez pas</p>
        </div>

        <!-- Bouton voir invitation -->
        <div class="cta">
            <a href="{{ route('invitation.show', $invitation->access_code) }}">
                Voir mon invitation en ligne
            </a>
        </div>

        <!-- Liens pratiques -->
        <div class="links">
            <a href="{{ $mapsUrl }}">📍 Voir sur Google Maps</a>
            <a href="tel:{{ $organization->phone ?? '' }}">📞 Appeler la réception</a>
        </div>

        <!-- Infos pratiques -->
        <div class="practical">
            <h3>Informations pratiques</h3>
            <ul>
                <li>🪪 <span>Munissez-vous d'une pièce d'identité valide (CNI, Passeport ou Permis)</span></li>
                <li>🚗 <span>Des places de parking visiteurs sont disponibles — signalez votre véhicule à la réception</span></li>
                <li>📱 <span>En cas d'empêchement, contactez directement votre hôte</span></li>
                <li>⏱️ <span>Merci d'arriver 10 minutes avant l'heure prévue pour les formalités d'accueil</span></li>
            </ul>
        </div>

        <!-- Contact de l hote -->
        <div class="host-card">
            <div class="host-avatar">{{ strtoupper(substr($host->name, 0, 1)) }}</div>
            <div class="host-info">
                <div class="name">{{ $host->name }}</div>
                <div class="title">{{ $host->job_title ?? 'Collaborateur' }}</div>
                <div class="contact">{{ $host->email }} — {{ $host->phone ?? '' }}</div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        Ce message a été envoyé automatiquement par le système d'accueil d'<strong style="color:#F39C12;">IBIG SECRETIS</strong>.<br>
        Pour toute question : <a href="mailto:{{ $organization->email ?? 'contact@ibig-secretis.com' }}">{{ $organization->email ?? 'contact@ibig-secretis.com' }}</a><br><br>
        <a href="{{ route('invitation.show', $invitation->access_code) }}">Voir l'invitation</a> ·
        <a href="{{ route('invitation.cancel', $invitation->access_code) }}">Annuler ma visite</a>
    </div>
</div>
</body>
</html>
