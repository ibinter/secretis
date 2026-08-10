@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">@if($is_trial)Votre essai se termine dans {{ $days_left }} jour(s)@else Votre licence expire dans {{ $days_left }} jour(s)@endif</h2>
<p>Bonjour {{ $user_name }},</p>
<p>La licence <strong>{{ $plan_name }}</strong> de <strong>{{ $org_name }}</strong> arrive à échéance le <strong>{{ $expires_at }}</strong>.</p>
<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <strong>Formule :</strong> {{ $plan_name }} — {{ $price }} {{ $currency }}<br>
  <strong>Utilisateurs :</strong> jusqu'à {{ $max_users }}<br>
  <strong>Échéance :</strong> {{ $expires_at }}
</td></tr></table>
<p>Renouvelez dès maintenant pour éviter toute interruption de service — vos données restent bien entendu conservées.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Renouveler ma licence</a></td></tr></table>

@endsection
