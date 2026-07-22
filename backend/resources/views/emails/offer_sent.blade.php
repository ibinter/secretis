@extends('emails.layouts.base')

@section('title', 'Votre offre personnalisée SECRETIS est disponible')
@section('header-tagline', 'Offre commerciale personnalisée')

@section('content')
<h1>Votre offre personnalisée est disponible</h1>

<p>
  Bonjour {{ $contactName }},<br><br>
  Suite à notre échange, nous avons préparé une offre sur mesure pour
  <strong>{{ $organisationName }}</strong>. Elle tient compte de vos besoins spécifiques
  et de la taille de votre équipe.
</p>

<div class="info-box">
  <p>
    <strong>Offre N° :</strong> {{ $offerRef }}<br>
    <strong>Établie le :</strong> {{ $offerDate }}<br>
    <strong>Valide jusqu'au :</strong> {{ $validUntil }}<br>
    <strong>Plan proposé :</strong> {{ $planName }}<br>
    <strong>Montant :</strong> <span style="font-size: 16px; font-weight: 700; color: #1A3A5C;">{{ $amount }} {{ $currency }}</span> / {{ $billingPeriod }}
  </p>
</div>

@if(!empty($features))
<h2>Ce qui est inclus dans votre offre</h2>
<ul style="color: #444; font-size: 14px; line-height: 2.2; padding-left: 20px;">
  @foreach($features as $feature)
  <li>{{ $feature }}</li>
  @endforeach
</ul>
@endif

<div class="btn-wrapper">
  <a href="{{ $offerUrl }}" class="btn btn-primary">Voir mon offre complète</a>
</div>

<p style="text-align:center; font-size: 13px; color: #999;">
  L'offre inclut une période de mise en route gratuite et une formation initiale.
</p>

<hr class="divider">

<p style="font-size: 14px; color: #555;">
  Des questions sur cette offre ? Votre chargé de compte,
  <strong>{{ $accountManagerName ?? 'notre équipe commerciale' }}</strong>,
  est disponible pour en discuter :
</p>
<ul style="color: #444; font-size: 14px; line-height: 2; padding-left: 20px;">
  <li>Email : <a href="mailto:{{ $accountManagerEmail ?? 'commercial@secretis.app' }}">{{ $accountManagerEmail ?? 'commercial@secretis.app' }}</a></li>
  @if(!empty($accountManagerPhone))
  <li>Téléphone : <strong>{{ $accountManagerPhone }}</strong></li>
  @endif
</ul>

<div class="warning-box">
  <p>
    Cette offre est valable jusqu'au <strong>{{ $validUntil }}</strong>.
    Passé ce délai, les tarifs peuvent être révisés.
  </p>
</div>
@endsection
