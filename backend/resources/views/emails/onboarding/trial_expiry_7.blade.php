<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Votre trial expire dans 7 jours</title>
<style>
  body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a2540; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header  { background:linear-gradient(135deg,#f59e0b,#fbbf24); padding:36px 40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:24px; font-weight:700; }
  .header p  { color:#fef9c3; margin:8px 0 0; }
  .body    { padding:40px; }
  .countdown { text-align:center; padding:24px; background:#fff7ed; border-radius:12px; margin:20px 0; }
  .countdown .days { font-size:64px; font-weight:900; color:#f59e0b; line-height:1; }
  .countdown .label { font-size:14px; color:#92400e; font-weight:600; text-transform:uppercase; letter-spacing:1px; }
  .features { margin:24px 0; }
  .features h3 { font-size:15px; color:#1e293b; margin-bottom:12px; }
  .feat-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
  .feat-item:last-child { border-bottom:none; }
  .feat-bar-wrap { flex:1; background:#e2e8f0; border-radius:999px; height:8px; }
  .feat-bar      { background:linear-gradient(90deg,#f59e0b,#fbbf24); height:100%; border-radius:999px; }
  .feat-label    { font-size:13px; color:#475569; width:160px; }
  .feat-count    { font-size:13px; font-weight:700; color:#1e293b; width:40px; text-align:right; }
  .plans { display:flex; gap:16px; margin:24px 0; }
  .plan-card { flex:1; border:2px solid #e2e8f0; border-radius:10px; padding:20px; text-align:center; }
  .plan-card.highlight { border-color:#f59e0b; background:#fff7ed; }
  .plan-name  { font-size:16px; font-weight:700; margin-bottom:8px; }
  .plan-price { font-size:24px; font-weight:900; color:#f59e0b; }
  .plan-price span { font-size:13px; color:#94a3b8; font-weight:400; }
  .cta-btn { display:inline-block; background:linear-gradient(135deg,#f59e0b,#fbbf24); color:#fff; text-decoration:none; padding:16px 40px; border-radius:8px; font-size:16px; font-weight:700; }
  .footer  { background:#f8fafc; padding:20px 40px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
  .footer a { color:#f59e0b; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>⏳ Votre trial expire bientôt</h1>
    <p>Passez au plan payant pour ne rien perdre</p>
  </div>
  <div class="body">
    <p>Bonjour <strong>{{ $admin->first_name ?? $admin->name }}</strong>,</p>

    <div class="countdown">
      <div class="days">7</div>
      <div class="label">jours restants</div>
    </div>

    <p style="color:#475569;line-height:1.7;">
      Votre trial se termine le <strong>{{ $activation->trial_end->format('d/m/Y') }}</strong>.
      Voici ce que vous avez accompli grâce à IBIG SECRETIS :
    </p>

    @if(!empty($featuresUsed))
    <div class="features">
      <h3>📊 Vos modules les plus utilisés</h3>
      @php $maxUsage = max(array_column($featuresUsed, 'usage_count') ?: [1]); @endphp
      @foreach($featuresUsed as $feat)
      <div class="feat-item">
        <span class="feat-label">{{ $feat->module ?? $feat['module'] }}</span>
        <div class="feat-bar-wrap">
          <div class="feat-bar" style="width:{{ min(100, (($feat->usage_count ?? 0) / $maxUsage) * 100) }}%"></div>
        </div>
        <span class="feat-count">{{ $feat->usage_count ?? 0 }}</span>
      </div>
      @endforeach
    </div>
    @endif

    <p style="text-align:center;margin:32px 0;">
      <a href="{{ config('app.url') }}/subscription/plans" class="cta-btn">Voir les plans →</a>
    </p>
  </div>
  <div class="footer">
    © {{ date('Y') }} IBIG SECRETIS · <a href="#">Se désabonner</a>
  </div>
</div>
</body>
</html>
