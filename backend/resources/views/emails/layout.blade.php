<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SECRETIS ERP</title>
</head>
<body style="margin:0;padding:0;background:#f4f0fa;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f0fa;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(147,51,234,.12);">
  <tr>
    <td style="background:#9333EA;padding:28px 32px;text-align:center;">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#ffffff;color:#9333EA;font-size:22px;font-weight:bold;border-radius:10px;">SE</div>
      <div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:10px;">SECRETIS ERP</div>
      <div style="color:#e9d5ff;font-size:12px;">Secrétariat &amp; gestion du courrier — IBIG Soft</div>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.65;">
      @yield('content')
    </td>
  </tr>
  <tr>
    <td style="background:#faf5ff;padding:20px 32px;text-align:center;border-top:1px solid #e9d5ff;">
      <div style="font-size:12px;color:#6b7280;line-height:1.6;">
        SECRETIS ERP — une solution <strong style="color:#9333EA;">IBIG Soft</strong><br>
        <a href="https://secretis.ibigsoft.com" style="color:#9333EA;text-decoration:none;">secretis.ibigsoft.com</a> ·
        <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;text-decoration:none;">secretis@ibigsoft.com</a><br>
        <span style="color:#9ca3af;">Cet email a été envoyé à {{ $unsubscribe_email ?? '' }}. Il concerne votre compte SECRETIS ERP.</span>
      </div>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>
