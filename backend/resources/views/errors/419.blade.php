@extends('errors.layout')

@section('error_code', '419')
@section('icon', '⏱️')
@section('icon_label', 'Session expirée')
@section('title', 'Session expirée')
@section('message', 'Votre session a expiré par mesure de sécurité. Veuillez actualiser la page pour continuer.')

@section('actions')
    <button class="btn btn-primary" onclick="window.location.reload()">Actualiser la page</button>
    <a class="btn btn-outline" href="{{ route('login') }}">Se reconnecter</a>
@endsection

@push('scripts')
<script>
    // Auto-reload après 10 secondes si inactif
    let countdown = 60;
    const msg = document.querySelector('.error-message');
    const base = msg ? msg.textContent : '';
    function tick() {
        countdown--;
        if (msg) msg.textContent = base + ' Actualisation automatique dans ' + countdown + 's…';
        if (countdown <= 0) window.location.reload();
        else setTimeout(tick, 1000);
    }
    setTimeout(tick, 1000);
</script>
@endpush
