{{--
    Page publique : lien de signature invalide, expiré, annulé ou déjà utilisé.
    Appelé par : App\Http\Controllers\SignatureController::renderSignError() (ligne 321)
                 via view('signatures.error', compact('message'))->render()
    Variables :
      $message  string  message explicatif déjà rédigé par le contrôleur
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lien de signature indisponible — SECRETIS ERP</title>
<style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: #f4f0fa; color: #1f2937;
           font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
           font-size: 15px; line-height: 1.6; }

    header.top { background: #9333EA; color: #fff; padding: 18px 20px; text-align: center; }
    header.top .brand { font-size: 18px; font-weight: 700; }
    header.top .tag { font-size: 12px; color: #e9d5ff; }

    .wrap { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-top: 4px solid #9333EA;
            border-radius: 12px; padding: 34px 28px; text-align: center; }

    .mark { width: 62px; height: 62px; line-height: 58px; margin: 0 auto 18px;
            border: 2px solid #d8b4fe; border-radius: 50%; color: #9333EA;
            font-size: 30px; font-weight: 700; }

    h1 { font-size: 19px; margin: 0 0 10px; color: #111827; }
    .message { background: #faf5ff; border-left: 3px solid #9333EA; border-radius: 0 8px 8px 0;
               padding: 14px 16px; text-align: left; color: #4b5563; margin: 18px 0; }
    .help { font-size: 13.5px; color: #6b7280; }
    .help a { color: #6b21a8; }

    footer.bottom { text-align: center; font-size: 12px; color: #6b7280; padding: 6px 20px 30px; }
    footer.bottom strong { color: #6b21a8; }
</style>
</head>
<body>

<header class="top">
    <div class="brand">SECRETIS ERP</div>
    <div class="tag">Signature electronique — IBIG Soft</div>
</header>

<div class="wrap">
    <div class="card">
        <div class="mark">!</div>

        <h1>Ce lien de signature n'est pas utilisable</h1>

        <div class="message">
            {{ $message ?? 'Lien de signature invalide ou expire.' }}
        </div>

        <p class="help">
            Si vous pensez qu'il s'agit d'une erreur, rapprochez-vous de la personne qui vous a
            transmis cette demande : elle peut vous envoyer un nouveau lien de signature.
            Chaque lien est personnel, a usage unique et peut comporter une date limite.
        </p>

        <p class="help">
            Assistance : <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a>
        </p>
    </div>
</div>

<footer class="bottom">
    SECRETIS ERP — une solution <strong>IBIG Soft</strong>
</footer>

</body>
</html>
