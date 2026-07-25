<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{ $title }} — SECRETIS ERP</title>
<style>
body{margin:0;font-family:system-ui,Arial,sans-serif;background:#faf5ff;color:#1f2937;line-height:1.7}
header{background:#9333EA;color:#fff;padding:20px 24px;display:flex;align-items:center;gap:12px}
header .logo{width:40px;height:40px;background:#fff;color:#9333EA;font-weight:bold;font-size:18px;border-radius:8px;display:flex;align-items:center;justify-content:center}
main{max-width:820px;margin:32px auto;background:#fff;border-radius:14px;padding:36px;box-shadow:0 2px 10px rgba(147,51,234,.1)}
h1{color:#7e22ce;font-size:26px;margin-top:0}
h2{color:#7e22ce;font-size:19px;margin-top:28px}
a{color:#9333EA}
footer{text-align:center;color:#6b7280;font-size:13px;padding:24px}
.back{display:inline-block;margin-bottom:18px;color:#9333EA;text-decoration:none;font-weight:600}
</style>
</head>
<body>
<header><div class="logo">SE</div><strong>SECRETIS ERP</strong></header>
<main>
<a class="back" href="/">&larr; Retour à l'accueil</a>
<h1>{{ $title }}</h1>
{!! $content !!}
</main>
<footer>© {{ date('Y') }} IBIG Soft — SECRETIS ERP · <a href="mailto:secretis@ibigsoft.com">secretis@ibigsoft.com</a></footer>
</body>
</html>
