<!DOCTYPE html>
<html lang="{{ $locale ?? 'fr' }}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <title>@yield('subject', 'IBIG SECRETIS')</title>
    <!--[if mso]>
    <noscript>
        <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset */
        * { box-sizing: border-box; }
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; background-color: #F4F6F8; width: 100%; }
        /* Typography */
        body, td, th { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
        /* Links */
        a { color: #2E86C1; text-decoration: none; }
        a:hover { color: #1A5276; text-decoration: underline; }
        /* Responsiveness */
        .wrapper { width: 100%; max-width: 600px; margin: 0 auto; }
        @media only screen and (max-width: 620px) {
            .wrapper { width: 100% !important; }
            .btn { width: 100% !important; display: block !important; text-align: center !important; }
            .col-half { width: 100% !important; display: block !important; }
            .mobile-padding { padding: 20px 16px !important; }
            .mobile-text-center { text-align: center !important; }
            .hide-mobile { display: none !important; }
        }
        /* Dark mode */
        @media (prefers-color-scheme: dark) {
            body, .body-bg { background-color: #1a1a2e !important; }
            .card { background-color: #16213e !important; }
            .text-dark { color: #e0e0e0 !important; }
            .text-muted { color: #a0a0b0 !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F8;">

    {{-- Preheader invisible --}}
    @hasSection('preheader')
    <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
        @yield('preheader')
        &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    @endif

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#F4F6F8;">
        <tr>
            <td style="padding:24px 12px;">

                {{-- Container principal --}}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="wrapper" style="max-width:600px;margin:0 auto;">

                    {{-- HEADER --}}
                    <tr>
                        <td style="background-color:#1A3A5C;border-radius:8px 8px 0 0;padding:24px 32px;" class="mobile-padding">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        {{-- Logo SECRETIS SVG inline --}}
                                        <svg width="180" height="40" viewBox="0 0 180 40" xmlns="http://www.w3.org/2000/svg" aria-label="IBIG SECRETIS">
                                            <rect x="0" y="8" width="24" height="24" rx="4" fill="#F39C12"/>
                                            <text x="6" y="25" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#1A3A5C">S</text>
                                            <text x="32" y="27" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#FFFFFF" letter-spacing="1">SECRETIS</text>
                                            <text x="32" y="38" font-family="Arial,sans-serif" font-size="9" fill="#7FB3D3" letter-spacing="2">BY IBIG SOFT</text>
                                        </svg>
                                    </td>
                                    <td style="text-align:right;vertical-align:middle;">
                                        <span style="color:#7FB3D3;font-size:12px;font-weight:500;">
                                            @yield('header_label', 'ERP Cloud')
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    {{-- BANNER TITRE --}}
                    @hasSection('header_title')
                    <tr>
                        <td style="background-color:#2E86C1;padding:20px 32px;" class="mobile-padding">
                            <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;">
                                @yield('header_title')
                            </h1>
                        </td>
                    </tr>
                    @endif

                    {{-- CORPS --}}
                    <tr>
                        <td class="card" style="background-color:#FFFFFF;padding:32px;" class="mobile-padding">
                            <div class="text-dark" style="color:#2C3E50;font-size:15px;line-height:1.7;">
                                @yield('body')
                            </div>

                            {{-- CTA Primaire --}}
                            @hasSection('cta_primary')
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0 0;">
                                <tr>
                                    <td style="border-radius:6px;background-color:#2E86C1;">
                                        <a href="@yield('cta_primary_url', '#')" class="btn" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;border-radius:6px;background-color:#2E86C1;mso-padding-alt:0;text-align:center;">
                                            @yield('cta_primary')
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            @endif

                            {{-- CTA Secondaire --}}
                            @hasSection('cta_secondary')
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 0 0;">
                                <tr>
                                    <td style="border-radius:6px;border:2px solid #2E86C1;">
                                        <a href="@yield('cta_secondary_url', '#')" class="btn" style="display:inline-block;padding:12px 28px;color:#2E86C1;font-size:15px;font-weight:600;text-decoration:none;border-radius:4px;text-align:center;">
                                            @yield('cta_secondary')
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            @endif

                            {{-- Note footer intra-card --}}
                            @hasSection('footer_note')
                            <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #EBF0F5;color:#7F8C8D;font-size:12px;line-height:1.6;">
                                @yield('footer_note')
                            </p>
                            @endif
                        </td>
                    </tr>

                    {{-- FOOTER LÉGAL --}}
                    <tr>
                        <td style="background-color:#EBF0F5;border-radius:0 0 8px 8px;padding:20px 32px;text-align:center;" class="mobile-padding">
                            <p style="margin:0 0 8px;color:#5D6D7E;font-size:12px;line-height:1.6;">
                                © {{ date('Y') }} <strong>IBIG SECRETIS</strong> — IBIG SARL<br>
                                Abidjan, Côte d'Ivoire | <a href="mailto:support@ibig-soft.ci" style="color:#2E86C1;">support@ibig-soft.ci</a>
                            </p>
                            <p style="margin:0;font-size:11px;color:#95A5A6;">
                                <a href="{{ config('app.url') }}/unsubscribe?email={{ urlencode($unsubscribe_email ?? '') }}" style="color:#95A5A6;text-decoration:underline;">Se désabonner</a>
                                &nbsp;·&nbsp;
                                <a href="{{ config('app.url') }}/privacy" style="color:#95A5A6;text-decoration:underline;">Politique de confidentialité</a>
                                &nbsp;·&nbsp;
                                <a href="{{ config('app.url') }}" style="color:#95A5A6;text-decoration:underline;">ibig-secretis.ci</a>
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
