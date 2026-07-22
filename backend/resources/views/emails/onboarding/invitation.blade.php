<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invitation à rejoindre {{ $organization->name }}</title>
<style>
  body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a2540; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header  { background:linear-gradient(135deg,#0f172a,#1e3a8a); padding:40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:26px; font-weight:700; }
  .header p  { color:#93c5fd; margin:8px 0 0; font-size:15px; }
  .body    { padding:40px; }
  .org-card { background:#eff6ff; border-radius:10px; padding:20px; margin:24px 0; display:flex; align-items:center; gap:16px; }
  .org-avatar { width:56px; height:56px; border-radius:12px; background:#1e3a8a; color:#fff; font-size:22px; font-weight:800; display:flex; align-items:center; justify-content:center; }
  .org-info h3 { margin:0 0 4px; font-size:18px; }
  .org-info p  { margin:0; font-size:13px; color:#64748b; }
  .role-badge  { display:inline-block; background:#dbeafe; color:#1e40af; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:600; text-transform:uppercase; }
  .expire-note { font-size:13px; color:#f59e0b; background:#fef9c3; border-radius:6px; padding:10px 14px; margin:16px 0; }
  .cta-block  { text-align:center; margin:36px 0; }
  .cta-btn    { display:inline-block; background:linear-gradient(135deg,#1e3a8a,#3b82f6); color:#fff; text-decoration:none; padding:16px 40px; border-radius:8px; font-size:16px; font-weight:700; }
  .token-note { font-size:12px; color:#94a3b8; word-break:break-all; background:#f8fafc; padding:10px; border-radius:6px; margin-top:12px; }
  .footer  { background:#f8fafc; padding:20px 40px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
  .footer a { color:#3b82f6; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>✉️ Vous êtes invité !</h1>
    <p>{{ $invitedBy->name }} vous invite à rejoindre son organisation</p>
  </div>
  <div class="body">
    <p>Bonjour,</p>
    <p style="color:#475569;line-height:1.7;">
      <strong>{{ $invitedBy->name }}</strong> vous a invité à rejoindre l'organisation suivante sur <strong>IBIG SECRETIS</strong> :
    </p>

    <div class="org-card">
      <div class="org-avatar">{{ strtoupper(substr($organization->name, 0, 2)) }}</div>
      <div class="org-info">
        <h3>{{ $organization->name }}</h3>
        <p>Votre rôle : <span class="role-badge">{{ $invitation->role }}</span></p>
      </div>
    </div>

    <div class="expire-note">
      ⏰ Cette invitation expire le <strong>{{ $invitation->expires_at->format('d/m/Y à H:i') }}</strong>.
    </div>

    <div class="cta-block">
      <a href="{{ config('app.url') }}/invitations/accept/{{ $invitation->token }}" class="cta-btn">
        Accepter l'invitation →
      </a>
      <div class="token-note">
        Lien complet : {{ config('app.url') }}/invitations/accept/{{ $invitation->token }}
      </div>
    </div>

    <p style="font-size:13px;color:#64748b;">
      Si vous n'attendiez pas cette invitation, ignorez cet email. Aucune action ne sera effectuée.
    </p>
  </div>
  <div class="footer">
    © {{ date('Y') }} IBIG SECRETIS · <a href="#">Politique de confidentialité</a>
  </div>
</div>
</body>
</html>
