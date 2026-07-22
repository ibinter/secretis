<!DOCTYPE html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>@yield('title', 'IBIG SECRETIS')</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #F4F6F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
    img { border: 0; display: block; max-width: 100%; }
    a { color: #1A3A5C; }

    /* Layout */
    .email-wrapper { background-color: #F4F6F9; padding: 30px 16px; }
    .email-container { max-width: 600px; margin: 0 auto; }

    /* Header */
    .header { background-color: #1A3A5C; padding: 28px 40px; border-radius: 10px 10px 0 0; text-align: center; }
    .header-logo { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 2px; text-decoration: none; display: inline-block; }
    .header-logo span { color: #F39C12; }
    .header-tagline { color: rgba(255,255,255,0.6); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }

    /* Body */
    .email-body { background-color: #ffffff; padding: 40px; }
    .email-body h1 { font-size: 22px; color: #1A3A5C; margin: 0 0 16px; font-weight: 700; line-height: 1.3; }
    .email-body h2 { font-size: 18px; color: #1A3A5C; margin: 24px 0 12px; font-weight: 600; }
    .email-body p { font-size: 15px; color: #444; line-height: 1.7; margin: 0 0 16px; }
    .email-body a { color: #1A3A5C; }

    /* CTA Button */
    .btn { display: inline-block; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 700; text-decoration: none; text-align: center; cursor: pointer; }
    .btn-primary { background-color: #F39C12; color: #ffffff !important; }
    .btn-secondary { background-color: #1A3A5C; color: #ffffff !important; }
    .btn-danger { background-color: #E74C3C; color: #ffffff !important; }
    .btn-wrapper { text-align: center; margin: 28px 0; }

    /* Divider */
    .divider { border: none; border-top: 1px solid #EEE; margin: 24px 0; }

    /* Info box */
    .info-box { background: #F8F9FB; border-left: 4px solid #1A3A5C; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .info-box p { margin: 0; font-size: 14px; color: #555; }
    .warning-box { background: #FFF8EC; border-left: 4px solid #F39C12; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .warning-box p { margin: 0; font-size: 14px; color: #7D5E1A; }
    .danger-box { background: #FEF0EE; border-left: 4px solid #E74C3C; padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
    .danger-box p { margin: 0; font-size: 14px; color: #922B21; }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    .data-table th { background: #1A3A5C; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; }
    .data-table td { padding: 10px 14px; border-bottom: 1px solid #EEE; color: #444; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:nth-child(even) td { background: #F8F9FB; }
    .data-table .total td { font-weight: 700; color: #1A3A5C; background: #EBF0F5; }

    /* Steps */
    .steps { margin: 20px 0; padding: 0; list-style: none; }
    .steps li { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    .step-num { width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: #1A3A5C; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .step-content strong { display: block; font-size: 14px; color: #1A3A5C; margin-bottom: 2px; }
    .step-content span { font-size: 13px; color: #777; }

    /* Badge */
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-orange { background: #FEF0D0; color: #9A6407; }
    .badge-green { background: #D4EDDA; color: #1D6933; }
    .badge-red { background: #FDE8E6; color: #8B2119; }

    /* Footer */
    .email-footer { background-color: #F4F6F9; padding: 24px 40px; border-top: 1px solid #DDD; border-radius: 0 0 10px 10px; }
    .footer-text { font-size: 12px; color: #999; line-height: 1.6; text-align: center; }
    .footer-text a { color: #1A3A5C; text-decoration: none; }
    .footer-links { text-align: center; margin-bottom: 12px; }
    .footer-links a { font-size: 12px; color: #888; text-decoration: none; margin: 0 8px; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-body { padding: 24px 20px !important; }
      .header { padding: 20px !important; }
      .email-footer { padding: 20px !important; }
      .btn { display: block !important; }
    }
  </style>
</head>
<body>
<div class="email-wrapper">
  <div class="email-container">

    <!-- HEADER -->
    <div class="header">
      <div class="header-logo">IS&nbsp;<span>SECRETIS</span></div>
      <div class="header-tagline">@yield('header-tagline', 'ERP · Gestion documentaire &amp; administrative')</div>
    </div>

    <!-- BODY -->
    <div class="email-body">
      @yield('content')
    </div>

    <!-- FOOTER -->
    <div class="email-footer">
      <div class="footer-links">
        <a href="{{ config('app.url') }}">Mon espace</a>
        <a href="{{ config('app.url') }}/support">Support</a>
        <a href="{{ config('app.url') }}/confidentialite">Confidentialité</a>
        <a href="mailto:support@secretis.app">Nous contacter</a>
      </div>
      <div class="footer-text">
        Vous recevez cet email car vous avez un compte IBIG SECRETIS.<br>
        &copy; {{ date('Y') }} IBIG SECRETIS — Tous droits réservés.<br>
        <a href="{{ config('app.url') }}/notifications/preferences">Gérer mes préférences email</a>
        &nbsp;|&nbsp;
        <a href="{{ config('app.url') }}/unsubscribe">Se désabonner</a>
      </div>
    </div>

  </div>
</div>
</body>
</html>
