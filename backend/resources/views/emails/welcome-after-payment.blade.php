<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue dans SECRETIS Pro</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #F0F4F8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
    a { color: #2E86C1; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .wrapper { width: 100% !important; }
      .step-card { display: block !important; width: 100% !important; }
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
          <td style="background: linear-gradient(135deg, #1A3A5C 0%, #2E86C1 100%); border-radius: 12px 12px 0 0; padding: 40px; text-align:center;">
            <div style="font-size:32px; font-weight:800; color:#FFFFFF; letter-spacing:-0.5px;">
              <span style="color:#F39C12;">IBIG</span> SECRETIS
            </div>
            <div style="color:rgba(255,255,255,0.85); font-size:16px; margin-top:8px; font-weight:500;">
              🎉 Votre abonnement Pro est actif !
            </div>
          </td>
        </tr>

        {{-- Corps --}}
        <tr>
          <td style="background:#FFFFFF; padding: 40px; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">

            <h1 style="font-size:22px; font-weight:700; color:#1A3A5C; margin:0 0 12px;">
              Bienvenue, {{ $adminName }} !
            </h1>

            <p style="font-size:15px; color:#4A5568; line-height:1.7; margin:0 0 24px;">
              Merci pour votre confiance. Votre abonnement <strong>SECRETIS {{ ucfirst($planName ?? 'Pro') }}</strong>
              pour <strong>{{ $orgName }}</strong> est maintenant actif.
              Voici comment démarrer efficacement.
            </p>

            {{-- Confirmation paiement --}}
            <div style="background:#F0FDF4; border:1.5px solid #86EFAC; border-radius:8px; padding:16px 20px; margin-bottom:32px;">
              <div style="font-size:13px; color:#166534; font-weight:700; margin-bottom:6px;">✅ Paiement confirmé</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px; color:#374151; padding:2px 0;">Plan</td>
                  <td style="font-size:13px; color:#374151; text-align:right; font-weight:600;">{{ ucfirst($planName ?? 'Pro') }}</td>
                </tr>
                <tr>
                  <td style="font-size:13px; color:#374151; padding:2px 0;">Montant</td>
                  <td style="font-size:13px; color:#374151; text-align:right; font-weight:600;">{{ number_format($amount ?? 0, 0, ',', ' ') }} FCFA</td>
                </tr>
                <tr>
                  <td style="font-size:13px; color:#374151; padding:2px 0;">Valide jusqu'au</td>
                  <td style="font-size:13px; color:#374151; text-align:right; font-weight:600;">{{ $licenseExpiresAt ?? 'N/A' }}</td>
                </tr>
              </table>
              @isset($invoiceNumber)
              <div style="margin-top:8px; font-size:12px; color:#64748B;">Facture N° {{ $invoiceNumber }} en pièce jointe</div>
              @endisset
            </div>

            {{-- 3 premières étapes --}}
            <div style="margin-bottom:32px;">
              <div style="font-size:16px; font-weight:700; color:#1A3A5C; margin-bottom:20px;">
                Vos 3 premières étapes recommandées
              </div>

              {{-- Étape 1 --}}
              <div style="display:flex; align-items:flex-start; margin-bottom:16px; background:#F8FAFC; border-radius:8px; padding:16px;">
                <div style="width:36px; height:36px; background:#1A3A5C; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFF; font-weight:700; font-size:15px; flex-shrink:0; text-align:center; line-height:36px; margin-right:14px;">1</div>
                <div>
                  <div style="font-size:14px; font-weight:700; color:#1A3A5C; margin-bottom:3px;">Invitez votre équipe</div>
                  <div style="font-size:13px; color:#64748B; line-height:1.5;">Ajoutez vos collaborateurs et définissez leurs rôles pour travailler ensemble.</div>
                  <a href="{{ $appUrl ?? config('app.url') }}/parametres/utilisateurs" style="font-size:12px; color:#2E86C1; font-weight:600; margin-top:4px; display:inline-block;">Gérer les utilisateurs →</a>
                </div>
              </div>

              {{-- Étape 2 --}}
              <div style="display:flex; align-items:flex-start; margin-bottom:16px; background:#F8FAFC; border-radius:8px; padding:16px;">
                <div style="width:36px; height:36px; background:#2E86C1; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFF; font-weight:700; font-size:15px; flex-shrink:0; text-align:center; line-height:36px; margin-right:14px;">2</div>
                <div>
                  <div style="font-size:14px; font-weight:700; color:#1A3A5C; margin-bottom:3px;">Activez vos modules métier</div>
                  <div style="font-size:13px; color:#64748B; line-height:1.5;">Sélectionnez les modules adaptés à votre secteur : Comptabilité, RH, GED, Projets…</div>
                  <a href="{{ $appUrl ?? config('app.url') }}/parametres/modules" style="font-size:12px; color:#2E86C1; font-weight:600; margin-top:4px; display:inline-block;">Configurer les modules →</a>
                </div>
              </div>

              {{-- Étape 3 --}}
              <div style="display:flex; align-items:flex-start; background:#F8FAFC; border-radius:8px; padding:16px;">
                <div style="width:36px; height:36px; background:#1E8449; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFF; font-weight:700; font-size:15px; flex-shrink:0; text-align:center; line-height:36px; margin-right:14px;">3</div>
                <div>
                  <div style="font-size:14px; font-weight:700; color:#1A3A5C; margin-bottom:3px;">Importez vos données existantes</div>
                  <div style="font-size:13px; color:#64748B; line-height:1.5;">Importez vos contacts, documents et données depuis votre ancien système via nos assistants d'import.</div>
                  <a href="{{ $appUrl ?? config('app.url') }}/parametres/import" style="font-size:12px; color:#2E86C1; font-weight:600; margin-top:4px; display:inline-block;">Importer des données →</a>
                </div>
              </div>
            </div>

            {{-- CTA Guide --}}
            <div style="text-align:center; margin-bottom:20px;">
              <a href="{{ $guideUrl ?? config('app.url') . '/guide' }}"
                 style="display:inline-block; background:#F39C12; color:#FFFFFF; font-size:15px; font-weight:700;
                        padding:14px 36px; border-radius:8px; text-decoration:none;">
                Consulter le guide de démarrage
              </a>
            </div>

            {{-- Contact support dédié --}}
            <div style="border:1.5px solid #2E86C1; border-radius:8px; padding:20px; text-align:center; margin-bottom:0;">
              <div style="font-size:14px; font-weight:700; color:#1A3A5C; margin-bottom:6px;">Votre support dédié</div>
              <div style="font-size:13px; color:#64748B; line-height:1.6;">
                En tant que client Pro, bénéficiez d'un support prioritaire.<br>
                <a href="mailto:pro-support@ibigsoft.com" style="color:#2E86C1; font-weight:600;">pro-support@ibigsoft.com</a>
                &nbsp;·&nbsp; Réponse en moins de 4h
              </div>
            </div>

          </td>
        </tr>

        {{-- Footer --}}
        <tr>
          <td style="background:#F8FAFC; border: 1px solid #E2E8F0; border-top:none; border-radius:0 0 12px 12px; padding:24px 40px; text-align:center;">
            <div style="font-size:13px; color:#64748B; line-height:1.8;">
              <strong style="color:#1A3A5C;">IBIG Soft</strong> — Abidjan, Côte d'Ivoire<br>
              <a href="mailto:support@ibigsoft.com" style="color:#2E86C1;">support@ibigsoft.com</a>
              &nbsp;·&nbsp;
              <a href="{{ config('app.url') }}/aide" style="color:#2E86C1;">Centre d'aide</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
