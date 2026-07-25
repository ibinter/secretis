@extends('emails.layout')

@section('content')

<h2 style="color:#d97706;margin:0 0 14px;">Nouvelle connexion détectée 🔐</h2>
<p>Bonjour {{ $user_name }},</p>
<p>Une connexion à votre compte SECRETIS ERP a été détectée :</p>
<table role="presentation" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
  <strong>Date :</strong> {{ $login_at }}<br>
  <strong>Adresse IP :</strong> {{ $ip_address }}<br>
  <strong>Localisation :</strong> {{ $city ? $city . ', ' : '' }}{{ $country }}<br>
  <strong>Appareil :</strong> {{ $device }} — {{ $browser }} ({{ $os }})
</td></tr></table>
<p>Si c'était bien vous, vous pouvez ignorer cet email. Sinon, <strong>changez immédiatement votre mot de passe</strong> :</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Sécuriser mon compte</a></td></tr></table>

@endsection
