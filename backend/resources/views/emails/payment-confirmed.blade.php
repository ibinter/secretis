@extends('emails.layout')

@section('content')

<h2 style="color:#16a34a;margin:0 0 14px;">Paiement confirmé — licence activée ✅</h2>
<p>Bonjour,</p>
<p>Votre paiement pour <strong>{{ $organization->name ?? 'votre organisation' }}</strong> a été validé et votre licence SECRETIS ERP est <strong>active</strong>.</p>
<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
  <strong>Reçu n° :</strong> {{ $payment->invoice_number ?? '—' }}<br>
  <strong>Formule :</strong> {{ $payment->plan_slug }}<br>
  <strong>Montant :</strong> {{ number_format((float) $payment->amount, 0, ',', ' ') }} {{ $payment->currency }}<br>
  <strong>Payé le :</strong> {{ optional($payment->paid_at)->format('d/m/Y H:i') }}
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ config('app.url') }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Ouvrir mon espace</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Votre reçu PDF est disponible depuis votre espace abonnement.</p>

@endsection
