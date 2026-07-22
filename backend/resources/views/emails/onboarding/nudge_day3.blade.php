<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Votre progression sur IBIG SECRETIS</title>
<style>
  body { margin:0; padding:0; background:#f4f7fb; font-family:'Segoe UI',Arial,sans-serif; color:#1a2540; }
  .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
  .header  { background:linear-gradient(135deg,#7c3aed,#a78bfa); padding:36px 40px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:24px; font-weight:700; }
  .body    { padding:40px; }
  .steps-grid { display:flex; flex-direction:column; gap:10px; margin:24px 0; }
  .step-row   { display:flex; align-items:center; gap:12px; padding:12px 16px; background:#f8fafc; border-radius:8px; }
  .step-icon  { font-size:20px; width:32px; text-align:center; }
  .step-info  { flex:1; }
  .step-label { font-size:14px; font-weight:600; color:#1e293b; }
  .step-status{ font-size:12px; }
  .done       { color:#16a34a; }
  .pending    { color:#f59e0b; }
  .astuce     { background:#faf5ff; border-left:4px solid #7c3aed; padding:16px 20px; border-radius:0 8px 8px 0; margin:24px 0; font-size:14px; color:#5b21b6; }
  .cta-btn    { display:inline-block; background:linear-gradient(135deg,#7c3aed,#a78bfa); color:#fff; text-decoration:none; padding:14px 36px; border-radius:8px; font-size:15px; font-weight:700; }
  .footer     { background:#f8fafc; padding:20px 40px; text-align:center; font-size:12px; color:#94a3b8; border-top:1px solid #e2e8f0; }
  .footer a   { color:#7c3aed; text-decoration:none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📊 Votre progression — Jour 3</h1>
  </div>
  <div class="body">
    <p>Bonjour <strong>{{ $admin->first_name ?? $admin->name }}</strong>,</p>
    <p style="color:#475569;line-height:1.7;">
      Cela fait 3 jours que vous avez rejoint IBIG SECRETIS.
      Voici où vous en êtes et ce qu'il vous reste à faire.
    </p>

    <div class="steps-grid">
      @foreach($progress['steps'] as $step)
      <div class="step-row">
        <div class="step-icon">
          @if($step['status'] === 'completed') ✅
          @elseif($step['status'] === 'skipped') ⏭️
          @else ⏳
          @endif
        </div>
        <div class="step-info">
          <div class="step-label">{{ $step['label'] }}</div>
          <div class="step-status {{ $step['status'] === 'completed' ? 'done' : 'pending' }}">
            {{ $step['status'] === 'completed' ? 'Complété' : ($step['status'] === 'skipped' ? 'Passé' : 'En attente') }}
          </div>
        </div>
      </div>
      @endforeach
    </div>

    <div class="astuce">
      💡 <strong>Astuce du jour :</strong> Utilisez le module SARA pour automatiser vos recherches documentaires.
      Posez-lui une question sur n'importe quel document et elle trouve les informations pertinentes en secondes.
    </div>

    <p style="text-align:center;margin:32px 0;">
      <a href="{{ config('app.url') }}/onboarding" class="cta-btn">Reprendre la configuration →</a>
    </p>
  </div>
  <div class="footer">
    © {{ date('Y') }} IBIG SECRETIS · <a href="#">Se désabonner</a>
  </div>
</div>
</body>
</html>
