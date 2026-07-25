@extends('emails.layout')

@section('content')

<h2 style="color:#dc2626;margin:0 0 14px;">Compte suspendu</h2>
<p>Bonjour {{ $user_name }},</p>
<p>L'accès de <strong>{{ $org_name }}</strong> à SECRETIS ERP a été suspendu, la période de grâce étant arrivée à son terme sans renouvellement.</p>
<p><strong>Vos données sont conservées en sécurité</strong> et seront intégralement restaurées dès la réactivation de votre licence.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Réactiver mon compte</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Pour toute question : <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;">secretis@ibigsoft.com</a> — réf. organisation #{{ $org_id }}.</p>

@endsection
