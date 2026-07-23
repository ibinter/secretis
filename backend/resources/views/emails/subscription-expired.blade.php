<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre accès SECRETIS est suspendu</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #F0F4F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    a { color: #2E86C1; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .wrapper { width: 100% !important; }
      .btn-block { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8; padding: 32px 16px;">
  <tr>
    <td align="center">
      <table class="wrapper" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

        {{-- Header --}}
        <tr>
          <td style="background: linear-gradient(135deg, #1A3A5C 0%, #2E86C1 100%); border-radius: 12px 12px 0 0; padding: 32px 40px; text-align:center;">
            <div style="font-size:28px; font-weight:800; color:#FFFFFF; letter-spacing:-0.5px;">
              <span style="color:#F39C12;">IBIG</span> SECRETIS
            </div>
            <div style="color:rgba(255,255,255,0.75); font-size:13px; margin-top:4px;">Votre ERP administratif africain</div>
          </td>
        </tr>

        {{-- Corps --}}
        <tr>
          <td style="background:#FFFFFF; padding: 40px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">

            {{-- Badge statut --}}
            <div style="text-align:center; margin-bottom:28px;">
              <span style="display:inline-block; background:#FEE2E2; color:#C0392B; font-size:14px; font-weight:700; padding:8px 20px; border-radius:999px; border:1.5px solid #FCA5A5;">
                Accès suspendu
              </span>
            </div>

            <h1 style="font-size:22px; font-weight:700; color:#1A3A5C; margin:0 0 16px;">
              Bonjour {{ $adminName }},
            </h1>

            <p style="font-size:15px; color:#4A5568; line-height:1.7; margin:0 0 20px;">
              Votre abonnement <strong>IBIG SECRETIS</strong> a expiré le
              <strong style="color:#1A3A5C;">{{ $expiredAt }}</strong>.
              Votre espace est temporairement suspendu, mais toutes vos données sont en sécurité.
            </p>

            {{-- Encadré rassurant données --}}
            <div style="background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:8px; padding:16px 20px; margin-bottom:28px;">
              <div style="font-size:14px; color:#166534; font-weight:600; margin-bottom:4px;">🔒 Vos données sont sécurisées</div>
              <div style="font-size:13px; color:#16A34A; line-height:1.6;">
                Tous vos documents, courriers et données restent archivés et protégés
                pendant <strong>30 jours</strong>. Réactivez votre abonnement avant le
                <strong>{{ $archiveDate }}</strong> pour retrouver l'accès complet.
              </div>
            </div>

            {{-- Ce qui est suspendu --}}
            <div style="margin-bottom:28px;">
              <div style="font-size:14px; font-weight:700; color:#1A3A5C; margin-bottom:12px;">
                Pour retrouver l'accès à votre espace :
              </div>
              @foreach([
                'Tous vos courriers et documents GED',
                'Vos tableaux de bord et rapports',
                'La gestion de votre équipe',
                'L\'agenda et les réunions planifiées',
                'L\'assistant IA SARA',
              ] as $item)
              <div style="display:flex; align-items:center; padding:6px 0; font-size:14px; color:#374151;">
                <span style="color:#C0392B; font-weight:700; margin-right:10px;">⏸</span>
                {{ $item }}
              </div>
              @endforeach
            </div>

            {{-- CTA Principal --}}
            <div style="text-align:center; margin-bottom:12px;">
              <a href="{{ $reactivateUrl }}" class="btn-block"
                 style="display:inline-block; background:#1E8449; color:#FFFFFF; font-size:16px; font-weight:700;
                        padding:16px 40px; border-radius:8px; text-decoration:none;">
                Réactiver mon abonnement
              </a>
            </div>

            <p style="font-size:13px; color:#64748B; text-align:center; margin:0 0 24px;">
              La réactivation est immédiate — vous retrouvez l'accès en moins d'une minute.
            </p>

            {{-- Contact --}}
            <div style="border-top:1px solid #E2E8F0; padding-top:20px; text-align:center;">
              <p style="font-size:13px; color:#64748B; margin:0;">
                Une question ? Contactez notre équipe :
                <a href="mailto:support@ibigsoft.com" style="color:#2E86C1; font-weight:600;">support@ibigsoft.com</a>
              </p>
            </div>

          </td>
        </tr>

        {{-- Footer --}}
        <tr>
          <td style="background:#F8FAFC; border: 1px solid #E2E8F0; border-top:none; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
            <div style="font-size:13px; color:#64748B; line-height:1.8;">
              <strong style="color:#1A3A5C;">IBIG Soft</strong> — Abidjan, Côte d'Ivoire<br>
              <a href="{{ config('app.url') }}/unsubscribe?email={{ urlencode($adminEmail ?? '') }}" style="color:#94A3B8; font-size:12px;">Se désabonner des communications</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
