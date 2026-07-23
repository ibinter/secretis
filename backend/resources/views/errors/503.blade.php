@extends('errors.layout')

@section('error_code', '503')
@section('icon', '🔧')
@section('icon_label', 'Maintenance en cours')
@section('title', 'Maintenance en cours')
@section('message', 'IBIG SECRETIS est temporairement indisponible pour une maintenance planifiée. Nous faisons le maximum pour terminer le plus rapidement possible.')

@section('extra')
    @php $duration = env('MAINTENANCE_DURATION', null); @endphp
    @if($duration)
        <p style="font-size:0.875rem;color:var(--muted);margin-top:0.75rem;">
            Durée estimée : <strong style="color:var(--text)">{{ $duration }}</strong>
        </p>
    @endif
    <div style="display:flex;justify-content:center;gap:1rem;margin-top:1rem;">
        <a href="https://twitter.com/IBIGSoft" target="_blank" rel="noopener"
           style="font-size:0.8125rem;color:var(--blue);text-decoration:none;">
            Suivre @IBIGSoft sur X
        </a>
        <a href="https://linkedin.com/company/ibig-soft" target="_blank" rel="noopener"
           style="font-size:0.8125rem;color:var(--blue);text-decoration:none;">
            LinkedIn
        </a>
    </div>
@endsection

@section('actions')
    <button class="btn btn-primary" onclick="window.location.reload()">Vérifier à nouveau</button>
@endsection
