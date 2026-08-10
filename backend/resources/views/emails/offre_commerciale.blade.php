@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Votre offre personnalisée SECRETIS ERP</h2>
<p>Bonjour {{ $user_name }},</p>
<p>Suite à nos échanges, voici l'offre préparée pour <strong>{{ $org_name }}</strong> :</p>
<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
  @if(!empty($plan_name))<strong>Formule :</strong> {{ $plan_name }}<br>@endif
  @if(!empty($price))<strong>Tarif :</strong> {{ $price }} {{ $currency }}<br>@endif
  @if(!empty($max_users))<strong>Utilisateurs :</strong> jusqu'à {{ $max_users }}<br>@endif
  <strong>Validité de l'offre :</strong> {{ $validity_days }} jours
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Profiter de cette offre</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Pour toute adaptation de l'offre : <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;">secretis@ibigsoft.com</a>.</p>

@endsection
