@extends('emails.layouts.base')

@section('title', 'Confirmation de paiement — SECRETIS')
@section('header-tagline', 'Reçu de paiement')

@section('content')
<div style="text-align:center; margin-bottom: 28px;">
  <div style="width: 60px; height: 60px; background: #D4EDDA; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">
    ✓
  </div>
</div>

<h1 style="text-align:center;">Paiement confirmé</h1>
<p style="text-align:center; color: #777; margin-top: -8px;">Merci pour votre confiance, {{ $adminName }}.</p>

<table class="data-table" style="margin: 28px 0;">
  <thead>
    <tr><th colspan="2">Récapitulatif de votre abonnement</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Référence</strong></td>
      <td style="text-align:right; font-family: monospace;">{{ $invoiceRef }}</td>
    </tr>
    <tr>
      <td><strong>Date de paiement</strong></td>
      <td style="text-align:right;">{{ $paidAt }}</td>
    </tr>
    <tr>
      <td><strong>Organisation</strong></td>
      <td style="text-align:right;">{{ $organisationName }}</td>
    </tr>
    <tr>
      <td><strong>Plan souscrit</strong></td>
      <td style="text-align:right;"><span class="badge badge-orange">{{ $planName }}</span></td>
    </tr>
    <tr>
      <td><strong>Période</strong></td>
      <td style="text-align:right;">{{ $periodStart }} → {{ $periodEnd }}</td>
    </tr>
    <tr>
      <td><strong>Mode de paiement</strong></td>
      <td style="text-align:right;">{{ $paymentMethod }}</td>
    </tr>
    <tr class="total">
      <td><strong>Montant payé</strong></td>
      <td style="text-align:right; font-size: 16px; color: #1D6933;">{{ $amount }} {{ $currency }}</td>
    </tr>
  </tbody>
</table>

@if(!empty($addons))
<table class="data-table">
  <thead><tr><th colspan="2">Options incluses</th></tr></thead>
  <tbody>
    @foreach($addons as $addon)
    <tr>
      <td>{{ $addon['name'] }}</td>
      <td style="text-align:right;">{{ $addon['value'] }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
@endif

<div class="btn-wrapper">
  <a href="{{ $dashboardUrl }}" class="btn btn-secondary">Accéder à mon espace</a>
</div>

<div class="info-box">
  <p>
    Votre facture est disponible dans <strong>Paramètres → Facturation</strong>.
    Vous pouvez également la télécharger en PDF depuis votre espace client.
  </p>
</div>

<hr class="divider">

<p style="font-size: 13px; color: #999; text-align:center;">
  Pour toute question sur votre facture, contactez
  <a href="mailto:facturation@secretis.app">facturation@secretis.app</a>
  en indiquant la référence <strong>{{ $invoiceRef }}</strong>.
</p>
@endsection
