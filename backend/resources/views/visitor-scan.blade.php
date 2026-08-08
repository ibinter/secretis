<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Vérification de badge — SECRETIS</title>
    <style>
        body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0;
               background: #F1F5F9; color: #0F172A; display: flex; align-items: center;
               justify-content: center; min-height: 100vh; padding: 16px; }
        .card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08);
                max-width: 380px; width: 100%; overflow: hidden; }
        .band { padding: 18px 20px; color: #fff; }
        .ok  { background: #059669; }
        .ko  { background: #DC2626; }
        .band h1 { margin: 0; font-size: 17px; font-weight: 600; }
        .band p  { margin: 4px 0 0; font-size: 13px; opacity: .9; }
        .body { padding: 20px; }
        .row { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0;
               border-bottom: 1px solid #F1F5F9; font-size: 14px; }
        .row:last-child { border-bottom: 0; }
        .lbl { color: #64748B; }
        .val { font-weight: 600; text-align: right; }
        .foot { padding: 12px 20px; background: #F8FAFC; font-size: 11px; color: #94A3B8; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <div class="band {{ $valide ? 'ok' : 'ko' }}">
            <h1>{{ $valide ? 'Badge valide' : 'Badge expiré' }}</h1>
            <p>{{ $valide ? 'Visiteur actuellement présent' : 'La visite est terminée' }}</p>
        </div>
        <div class="body">
            <div class="row"><span class="lbl">Visiteur</span><span class="val">{{ $nom }}</span></div>
            @if(!empty($visit->visitor?->company))
                <div class="row"><span class="lbl">Société</span><span class="val">{{ $visit->visitor->company }}</span></div>
            @endif
            <div class="row"><span class="lbl">Badge</span><span class="val">{{ $visit->badge_number ?? '—' }}</span></div>
            <div class="row"><span class="lbl">Personne visitée</span><span class="val">{{ $visit->host->name ?? '—' }}</span></div>
            <div class="row"><span class="lbl">Motif</span><span class="val">{{ $visit->purpose ?? '—' }}</span></div>
            <div class="row">
                <span class="lbl">Arrivée</span>
                <span class="val">{{ $visit->checked_in_at ? \Carbon\Carbon::parse($visit->checked_in_at)->format('d/m/Y H:i') : '—' }}</span>
            </div>
            @if($visit->checked_out_at)
                <div class="row">
                    <span class="lbl">Départ</span>
                    <span class="val">{{ \Carbon\Carbon::parse($visit->checked_out_at)->format('d/m/Y H:i') }}</span>
                </div>
            @endif
        </div>
        <div class="foot">{{ $visit->organization->name ?? 'SECRETIS' }} — vérification effectuée le {{ now()->format('d/m/Y à H:i') }}</div>
    </div>
</body>
</html>
