@extends('emails.layouts.base')

@section('title', 'Votre demande de démonstration SECRETIS')
@section('header-tagline', 'Demande de démo reçue')

@section('content')
<div style="text-align:center; margin-bottom: 24px;">
  <span class="badge badge-green" style="font-size: 13px; padding: 6px 16px;">Demande reçue ✓</span>
</div>

<h1>Nous avons bien reçu votre demande !</h1>

<p>
  Bonjour {{ $contactName }},<br><br>
  Merci pour votre intérêt pour <strong>IBIG SECRETIS</strong>.
  Votre demande de démonstration pour <strong>{{ $organisationName ?? 'votre organisation' }}</strong>
  a bien été enregistrée.
</p>

<div class="info-box">
  <p>
    <strong>Récapitulatif de votre demande</strong><br>
    Nom : {{ $contactName }}<br>
    Email : {{ $contactEmail }}<br>
    Organisation : {{ $organisationName ?? 'Non renseignée' }}<br>
    @if(!empty($phone))Téléphone : {{ $phone }}<br>@endif
    @if(!empty($message))Message : {{ $message }}@endif
  </p>
</div>

<h2>Et maintenant ?</h2>
<ul class="steps">
  <li>
    <div class="step-num">1</div>
    <div class="step-content">
      <strong>Analyse de votre besoin</strong>
      <span>L'un de nos consultants étudie votre demande pour préparer une démo adaptée à votre secteur.</span>
    </div>
  </li>
  <li>
    <div class="step-num">2</div>
    <div class="step-content">
      <strong>Prise de contact sous 24h ouvrées</strong>
      <span>Vous recevrez un email ou un appel pour convenir d'un créneau qui vous convient.</span>
    </div>
  </li>
  <li>
    <div class="step-num">3</div>
    <div class="step-content">
      <strong>Démonstration personnalisée</strong>
      <span>Session de 30 à 45 min en visio ou sur site, avec vos cas d'usage réels.</span>
    </div>
  </li>
</ul>

<div class="btn-wrapper">
  <a href="{{ config('app.url') }}" class="btn btn-secondary">Découvrir SECRETIS en attendant</a>
</div>

<hr class="divider">

<div class="warning-box">
  <p>
    <strong>Besoin urgent ?</strong> Contactez-nous directement :<br>
    Email : <a href="mailto:commercial@secretis.app">commercial@secretis.app</a><br>
    Téléphone : <strong>{{ config('app.commercial_phone', '+225 XX XX XX XX') }}</strong>
    (Lun-Ven, 8h-18h)
  </p>
</div>
@endsection
