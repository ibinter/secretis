<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenue sur IBIG SECRETIS</title>
<style>
  body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a2540; }
  .wrapper { max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header  { background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%); padding:48px 40px; text-align:center; }
  .header img { width:120px; margin-bottom:16px; }
  .header h1  { color:#fff; margin:0; font-size:28px; font-weight:700; letter-spacing:-.5px; }
  .header p   { color:#bfdbfe; margin:8px 0 0; font-size:15px; }
  .body  { padding:40px; }
  .hello { font-size:18px; font-weight:600; margin-bottom:8px; }
  .intro { color:#475569; font-size:15px; line-height:1.7; margin-bottom:32px; }
  .steps { background:#f8fafc; border-radius:10px; padding:24px; margin-bottom:32px; }
  .steps h3 { margin:0 0 16px; font-size:15px; color:#1e3a8a; text-transform:uppercase; letter-spacing:.5px; }
  .step-item { display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid #e2e8f0; }
  .step-item:last-child { border-bottom:none; }
  .step-num  { width:28px; height:28px; border-radius:50%; background:#1e3a8a; color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .step-text { font-size:14px; color:#334155; }
  .cta-block { text-align:center; margin:32px 0; }
  .cta-btn   { display:inline-block; background:linear-gradient(135deg,#1e3a8a,#3b82f6); color:#fff; text-decoration:none; padding:16px 40px; border-radius:8px; font-size:16px; font-weight:700; letter-spacing:.3px; }
  .trial-box { background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:16px 20px; margin-bottom:32px; font-size:14px; color:#1e40af; }
  .footer    { background:#f8fafc; padding:24px 40px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
  .footer a  { color:#3b82f6; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🎉 Bienvenue sur IBIG SECRETIS !</h1>
    <p>Votre espace de gestion est prêt</p>
  </div>

  <div class="body">
    <p class="hello">Bonjour {{ $admin->first_name ?? $admin->name }} 👋</p>
    <p class="intro">
      Votre organisation <strong>{{ $organization->name }}</strong> est maintenant active sur IBIG SECRETIS.
      Vous disposez d'un essai gratuit de <strong>{{ $trialDays ?? 14 }} jours</strong> pour découvrir toutes les fonctionnalités.
    </p>

    <div class="trial-box">
      ⏳ Votre trial expire le <strong>{{ $activation->trial_end->format('d/m/Y') }}</strong> —
      soit dans <strong>{{ $activation->trial_end->diffInDays(now()) }} jours</strong>.
    </div>

    <div class="steps">
      <h3>Vos premières étapes (15 min)</h3>
      <div class="step-item"><span class="step-num">1</span><span class="step-text">Compléter le profil de votre organisation</span></div>
      <div class="step-item"><span class="step-num">2</span><span class="step-text">Activer les modules nécessaires</span></div>
      <div class="step-item"><span class="step-num">3</span><span class="step-text">Configurer le préfixe de courrier</span></div>
      <div class="step-item"><span class="step-num">4</span><span class="step-text">Inviter vos collaborateurs</span></div>
      <div class="step-item"><span class="step-num">5</span><span class="step-text">Créer votre premier événement</span></div>
      <div class="step-item"><span class="step-num">6</span><span class="step-text">Uploader votre premier document</span></div>
      <div class="step-item"><span class="step-num">7</span><span class="step-text">Configurer les notifications</span></div>
      <div class="step-item"><span class="step-num">8</span><span class="step-text">Découvrir SARA, votre assistante IA</span></div>
    </div>

    <div class="cta-block">
      <a href="{{ $appUrl ?? config('app.url') }}/onboarding" class="cta-btn">Commencer maintenant →</a>
    </div>

    <p style="font-size:14px;color:#64748b;">
      Des questions ? Répondez directement à cet email ou contactez notre équipe support.
      Nous sommes là pour vous aider à démarrer.
    </p>
  </div>

  <div class="footer">
    © {{ date('Y') }} IBIG SECRETIS · <a href="#">Politique de confidentialité</a> · <a href="#">Se désabonner</a>
  </div>
</div>
</body>
</html>
