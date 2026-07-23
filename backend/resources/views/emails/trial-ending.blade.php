<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre essai SECRETIS se termine bientôt</title>
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

        {{-- Header dégradé --}}
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

            {{-- Badge jours restants --}}
            <div style="text-align:center; margin-bottom:24px;">
              <span style="display:inline-block; background:#FEF3C7; color:#D97706; font-size:14px; font-weight:700; padding:8px 20px; border-radius:999px; border:1.5px solid #FCD34D;">
                ⏰ Il vous reste {{ $daysLeft }} jour{{ $daysLeft > 1 ? 's' : '' }} d'essai
              </span>
            </div>

            <h1 style="font-size:22px; font-weight:700; color:#1A3A5C; margin:0 0 12px;">
              Bonjour {{ $adminName }},
            </h1>

            <p style="font-size:15px; color:#4A5568; line-height:1.7; margin:0 0 20px;">
              Votre essai gratuit <strong>IBIG SECRETIS</strong> se termine le
              <strong style="color:#1A3A5C;">{{ $trialEndsAt }}</strong>.
              Pour continuer à profiter de votre espace sans interruption, passez à un plan Pro dès maintenant.
            </p>

            @if(!empty($usedFeatures))
            {{-- Fonctionnalités utilisées --}}
            <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:20px 24px; margin-bottom:28px;">
              <div style="font-size:13px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">
                Ce que vous avez déjà accompli
              </div>
              @foreach($usedFeatures as $feature)
              <div style="display:flex; align-items:center; padding:6px 0; font-size:14px; color:#374151;">
                <span style="color:#1E8449; font-weight:700; margin-right:10px;">✓</span>
                {{ $feature }}
              </div>
              @endforeach
            </div>
            @endif

            {{-- Avantages Pro --}}
            <div style="margin-bottom:28px;">
              <div style="font-size:14px; font-weight:700; color:#1A3A5C; margin-bottom:12px;">
                Avec le plan Pro, vous débloquez :
              </div>
              @foreach([
                ['icon' => '∞', 'text' => 'Utilisateurs illimités pour toute votre équipe'],
                ['icon' => '🔐', 'text' => 'Signatures électroniques légalement valables'],
                ['icon' => '📊', 'text' => 'Tableaux de bord BI et rapports avancés'],
                ['icon' => '🤖', 'text' => 'SARA, votre assistante IA intégrée'],
                ['icon' => '🛡️', 'text' => 'Support prioritaire avec SLA garanti'],
              ] as $item)
              <div style="display:flex; align-items:flex-start; padding:7px 0; font-size:14px; color:#374151;">
                <span style="margin-right:10px; font-size:16px; min-width:22px;">{{ $item['icon'] }}</span>
                <span>{{ $item['text'] }}</span>
              </div>
              @endforeach
            </div>

            {{-- CTA Principal --}}
            <div style="text-align:center; margin-bottom:16px;">
              <a href="{{ $upgradeUrl }}" class="btn-block"
                 style="display:inline-block; background:#F39C12; color:#FFFFFF; font-size:16px; font-weight:700;
                        padding:16px 40px; border-radius:8px; text-decoration:none;">
                Choisir mon plan →
              </a>
            </div>

            {{-- CTA Secondaire --}}
            <div style="text-align:center; margin-bottom:28px;">
              <a href="{{ $demoUrl }}"
                 style="display:inline-block; color:#2E86C1; font-size:14px; font-weight:600;
                        padding:10px 24px; border-radius:8px; border:1.5px solid #2E86C1; text-decoration:none;">
                Parler à un conseiller
              </a>
            </div>

            <p style="font-size:13px; color:#94A3B8; text-align:center; margin:0;">
              Vos données restent en sécurité. Si vous ne souscrivez pas,
              votre espace sera conservé <strong>30 jours</strong> puis archivé.
            </p>

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
              &nbsp;·&nbsp;
              <a href="{{ config('app.url') }}/unsubscribe?email={{ urlencode($adminEmail ?? '') }}" style="color:#94A3B8; font-size:12px;">Se désabonner</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
