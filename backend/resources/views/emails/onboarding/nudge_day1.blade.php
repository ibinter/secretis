<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Avez-vous commencé votre configuration ?</title>
<style>
  body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a2540; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header  { background:linear-gradient(135deg,#1e3a8a,#3b82f6); padding:36px 40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:24px; font-weight:700; }
  .body    { padding:40px; }
  .progress-bar { background:#e2e8f0; border-radius:999px; height:12px; margin:24px 0; }
  .progress-fill { background:linear-gradient(90deg,#1e3a8a,#3b82f6); height:100%; border-radius:999px; width:{{ $progress['percent'] }}%; }
  .progress-label { font-size:13px; color:#64748b; text-align:right; margin-top:4px; }
  .tip-box { background:#f0fdf4; border-left:4px solid #22c55e; padding:16px 20px; border-radius:0 8px 8px 0; margin:24px 0; font-size:14px; color:#166534; }
  .cta-btn { display:inline-block; background:linear-gradient(135deg,#1e3a8a,#3b82f6); color:#fff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:15px; font-weight:700; }
  .footer  { background:#f8fafc; padding:20px 40px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
  .footer a { color:#3b82f6; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>⚙️ Avez-vous configuré votre organisation ?</h1>
  </div>
  <div class="body">
    <p>Bonjour <strong>{{ $admin->first_name ?? $admin->name }}</strong>,</p>
    <p style="color:#475569;line-height:1.7;">
      Vous vous êtes inscrit hier sur IBIG SECRETIS. Avez-vous eu le temps de commencer votre configuration ?
      Il vous suffit de <strong>15 minutes</strong> pour être opérationnel.
    </p>

    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    <div class="progress-label">{{ $progress['completed'] }}/{{ $progress['total'] }} étapes complétées ({{ $progress['percent'] }}%)</div>

    @if($progress['nextStep'])
    <div class="tip-box">
      💡 <strong>Prochaine étape :</strong>
      {{ \App\Services\OnboardingService::STEPS[$progress['nextStep']]['label'] ?? $progress['nextStep'] }}
    </div>
    @endif

    <p style="text-align:center;margin:32px 0;">
      <a href="{{ config('app.url') }}/onboarding" class="cta-btn">Continuer ma configuration →</a>
    </p>

    <p style="font-size:13px;color:#94a3b8;">
      Besoin d'aide ? Notre équipe est disponible par email ou via le chat de l'application.
    </p>
  </div>
  <div class="footer">
    © {{ date('Y') }} IBIG SECRETIS · <a href="#">Se désabonner</a>
  </div>
</div>
</body>
</html>
