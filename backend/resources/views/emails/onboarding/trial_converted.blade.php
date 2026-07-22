<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bienvenue dans l'aventure IBIG SECRETIS !</title>
<style>
  body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a2540; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header  { background:linear-gradient(135deg,#16a34a,#4ade80); padding:48px 40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:28px; font-weight:800; }
  .header p  { color:#d1fae5; margin:8px 0 0; font-size:16px; }
  .body    { padding:40px; }
  .success-box { background:#f0fdf4; border:2px solid #86efac; border-radius:12px; padding:24px; text-align:center; margin:24px 0; }
  .success-box .check { font-size:48px; margin-bottom:8px; }
  .success-box h2 { margin:0 0 8px; color:#16a34a; font-size:20px; }
  .success-box p { margin:0; color:#166534; font-size:14px; }
  .details  { background:#f8fafc; border-radius:10px; padding:20px; margin:24px 0; }
  .detail-row { display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #e2e8f0; font-size:14px; }
  .detail-row:last-child { border-bottom:none; }
  .detail-label { color:#64748b; }
  .detail-value { font-weight:600; color:#1e293b; }
  .features-list { margin:24px 0; }
  .feat-item { display:flex; align-items:center; gap:10px; padding:8px 0; font-size:14px; color:#374151; }
  .feat-item::before { content:'✓'; color:#16a34a; font-weight:700; }
  .cta-btn { display:inline-block; background:linear-gradient(135deg,#16a34a,#4ade80); color:#fff; text-decoration:none; padding:16px 40px; border-radius:8px; font-size:16px; font-weight:700; }
  .footer  { background:#f8fafc; padding:20px 40px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
  .footer a { color:#16a34a; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🎊 Merci pour votre confiance !</h1>
    <p>Votre abonnement est maintenant actif</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>{{ $admin->first_name ?? $admin->name }}</strong>,</p>

    <div class="success-box">
      <div class="check">✅</div>
      <h2>Paiement confirmé !</h2>
      <p>Votre abonnement a été activé avec succès.</p>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Organisation</span>
        <span class="detail-value">{{ $organization->name }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Plan</span>
        <span class="detail-value">{{ strtoupper($activation->converted_plan_id ?? 'Pro') }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date d'activation</span>
        <span class="detail-value">{{ now()->format('d/m/Y') }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Prochaine facturation</span>
        <span class="detail-value">{{ now()->addMonth()->format('d/m/Y') }}</span>
      </div>
    </div>

    <div class="features-list">
      <p style="font-weight:600;margin-bottom:8px;">Ce que vous débloquez :</p>
      <div class="feat-item">Accès illimité à tous les modules</div>
      <div class="feat-item">Support prioritaire</div>
      <div class="feat-item">Sauvegardes automatiques quotidiennes</div>
      <div class="feat-item">API complète incluse</div>
      <div class="feat-item">Satisfaction garantie 30 jours</div>
    </div>

    <p style="text-align:center;margin:32px 0;">
      <a href="{{ config('app.url') }}/dashboard" class="cta-btn">Accéder à mon espace →</a>
    </p>

    <p style="font-size:13px;color:#64748b;text-align:center;">
      Une facture a été envoyée à <strong>{{ $admin->email }}</strong>.
      Pour toute question : <a href="mailto:support@secretis.ibig.africa" style="color:#16a34a;">support@secretis.ibig.africa</a>
    </p>
  </div>
  <div class="footer">
    © {{ date('Y') }} IBIG SECRETIS · <a href="#">Gérer mon abonnement</a> · <a href="#">Contact</a>
  </div>
</div>
</body>
</html>
