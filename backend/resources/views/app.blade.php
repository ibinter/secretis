<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'SECRETIS ERP') }}</title>

        {{-- ── PWA / mode hors-ligne ──────────────────────────────────────────
             Le manifeste doit être déclaré ici, sinon le navigateur ne propose
             jamais l'installation. Le Service Worker, lui, est enregistré par
             resources/js/pwa/registerServiceWorker.js (importé par app.jsx) :
             ne PAS ajouter d'enregistrement en dur ici, cela créerait deux
             enregistrements concurrents sur le même scope. --}}
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#7c3aed">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="SECRETIS">
        <link rel="apple-touch-icon" href="/assets/icon-192.png">
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        {{-- Format classique data-page : compatible @inertiajs/react 2.x --}}
        <div id="app" data-page="{{ json_encode($page) }}"></div>
    {{-- L'enregistrement du Service Worker se fait dans app.jsx
         (resources/js/pwa/registerServiceWorker.js) : URL versionnée `/sw.js?v=<hash>`,
         gestion du cycle de vie et invitation à recharger. --}}
    {{-- bannière IBIG SOFT (data-partners) + bulles WhatsApp/SARA (data-bulles) retirées en interne : réservées au landing externe. On conserve le script uniquement pour le bouton d'installation PWA (data-pwa). --}}
    <script src="/assets/js/ibigsoft-universal.js"
            data-solution="secretis"
            data-accent="#9333EA"
            data-render="none"
            data-bulles="false"
            data-partners="false"
            data-pwa="true"></script>
    <script>
    window.openSaraChat = function() {
      window.location.href = '/sara';
    };
    </script>
</body>
</html>
