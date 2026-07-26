<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title inertia>{{ config('app.name', 'SECRETIS ERP') }}</title>
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        {{-- Format classique data-page : compatible @inertiajs/react 2.x --}}
        <div id="app" data-page="{{ json_encode($page) }}"></div>
    <script>if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(console.warn);}</script>
    <script src="/assets/js/ibigsoft-universal.js"
            data-solution="secretis"
            data-accent="#9333EA"
            data-render="none"
            data-bulles="true"
            data-pwa="true"></script>
    <script>
    window.openSaraChat = function() {
      window.location.href = '/sara';
    };
    </script>
</body>
</html>
