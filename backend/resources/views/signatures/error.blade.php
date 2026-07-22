<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lien invalide — SECRETIS</title>
    <style>
        body { margin: 0; background: #F8FAFC; font-family: 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .box { background: white; border-radius: 16px; padding: 3rem 2.5rem; max-width: 440px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        h1 { color: #1E3A5F; font-size: 1.3rem; margin-bottom: .5rem; }
        p  { color: #64748B; font-size: .95rem; line-height: 1.6; }
    </style>
</head>
<body>
<div class="box">
    <div class="icon">⚠️</div>
    <h1>Accès impossible</h1>
    <p>{{ $message }}</p>
    <p style="font-size:.85rem;margin-top:1.5rem">
        Si vous avez des questions, contactez la personne qui vous a envoyé ce lien de signature.
    </p>
</div>
</body>
</html>
