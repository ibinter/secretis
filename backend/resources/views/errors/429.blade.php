@extends('errors.layout')

@section('error_code', '429')
@section('icon', '🚦')
@section('icon_label', 'Trop de requêtes')
@section('title', 'Trop de requêtes')
@section('message', 'Vous avez effectué trop de requêtes en peu de temps. Veuillez patienter quelques instants avant de réessayer.')

@section('extra')
    <p id="retry-msg" style="font-size:0.875rem;color:var(--muted);margin-top:0.75rem;"></p>
@endsection

@section('actions')
    <a class="btn btn-primary" href="{{ url()->current() }}" id="retry-btn" style="display:none">Réessayer maintenant</a>
    <a class="btn btn-ghost" href="{{ url('/dashboard') }}">Tableau de bord</a>
@endsection

@push('scripts')
<script>
    (function () {
        const retryAfter = {{ request()->header('Retry-After', 60) }};
        const msg = document.getElementById('retry-msg');
        const btn = document.getElementById('retry-btn');
        let remaining = parseInt(retryAfter, 10) || 60;

        function fmt(s) {
            return s >= 60
                ? Math.floor(s / 60) + 'm ' + (s % 60) + 's'
                : s + 's';
        }

        if (retryAfter && msg) {
            function tick() {
                if (remaining <= 0) {
                    msg.textContent = 'Vous pouvez maintenant réessayer.';
                    if (btn) btn.style.display = 'inline-flex';
                    return;
                }
                msg.textContent = 'Réessai possible dans : ' + fmt(remaining);
                remaining--;
                setTimeout(tick, 1000);
            }
            tick();
        }
    })();
</script>
@endpush
