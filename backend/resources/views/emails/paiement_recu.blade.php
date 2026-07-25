@extends('emails.layout')

@section('content')

<h2 style="color:#16a34a;margin:0 0 14px;">Paiement reçu — merci ! ✅</h2>
<p>Bonjour {{ $user_name }},</p>
<p>Nous confirmons la réception de votre paiement pour <strong>{{ $org_name }}</strong>.</p>
<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
  <strong>Reçu n° :</strong> {{ $invoice_number }}<br>
  <strong>Montant :</strong> {{ number_format((float) $amount, 0, ',', ' ') }} {{ $currency }}<br>
  <strong>Moyen de paiement :</strong> {{ $payment_method }}<br>
  <strong>Référence :</strong> {{ $payment_reference }}<br>
  <strong>Date :</strong> {{ $paid_at }}<br>
  <strong>Formule :</strong> {{ $plan_name }} ({{ $max_users }} utilisateurs max)<br>
  <strong>Période couverte :</strong> du {{ $period_start }} au {{ $period_end }}
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Accéder à mon espace</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Conservez cet email : il fait office de reçu de paiement.</p>

@endsection
