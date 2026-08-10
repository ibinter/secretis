@extends('emails.layout')

@section('content')

<h2 style="color:#16a34a;margin:0 0 14px;">Ticket résolu ✅</h2>
<p>Bonjour {{ $user_name }},</p>
<p>
  Votre ticket <strong>{{ $ticket_number }}</strong> a été résolu
  @if($resolved_at) le {{ $resolved_at }} @endif
  @if($resolution_time) (temps de résolution : {{ $resolution_time }}) @endif .
</p>
@if($resolution_summary)
<p style="background:#faf5ff;border-radius:8px;padding:14px 18px;font-size:14px;">{{ $resolution_summary }}</p>
@endif
<p>Si le problème persiste, répondez simplement depuis votre espace : le ticket sera rouvert automatiquement.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Voir le ticket</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Votre avis compte : notez notre intervention depuis votre espace SECRETIS.</p>

@endsection
