@extends('emails.layouts.base')

@section('title', 'Bienvenue sur IBIG SECRETIS !')
@section('header-tagline', 'Votre essai gratuit est activé · 14 jours')

@section('content')
<h1>Bienvenue sur IBIG SECRETIS, {{ $adminName }} !</h1>

<p>
  L'espace de <strong>{{ $organisationName }}</strong> est prêt. Votre essai gratuit de <strong>14 jours</strong>
  est activé dès aujourd'hui — sans carte bancaire, sans engagement.
</p>

<div class="info-box">
  <p>
    <strong>Organisation :</strong> {{ $organisationName }}<br>
    <strong>Administrateur :</strong> {{ $adminName }}<br>
    <strong>Essai gratuit jusqu'au :</strong> {{ $trialEndsAt }}
  </p>
</div>

<h2>3 étapes pour bien démarrer</h2>

<ul class="steps">
  <li>
    <div class="step-num">1</div>
    <div class="step-content">
      <strong>Configurez votre organisation</strong>
      <span>Renseignez le logo, les informations légales et les départements de votre structure.</span>
    </div>
  </li>
  <li>
    <div class="step-num">2</div>
    <div class="step-content">
      <strong>Invitez votre équipe</strong>
      <span>Ajoutez vos collaborateurs et définissez leurs rôles et permissions.</span>
    </div>
  </li>
  <li>
    <div class="step-num">3</div>
    <div class="step-content">
      <strong>Activez vos modules</strong>
      <span>Courrier, Agenda, Tâches, RH… activez uniquement ce dont vous avez besoin.</span>
    </div>
  </li>
</ul>

<div class="btn-wrapper">
  <a href="{{ $loginUrl }}" class="btn btn-primary">Ouvrir mon espace SECRETIS</a>
</div>

<hr class="divider">

<div class="warning-box">
  <p>
    <strong>SARA est là pour vous guider.</strong><br>
    Notre assistante IA intégrée répond à vos questions, vous aide à configurer vos modules
    et vous accompagne à chaque étape. Cliquez sur l'icône SARA dans votre espace.
  </p>
</div>

<p style="font-size: 14px; color: #777;">
  Besoin d'aide supplémentaire ? Écrivez-nous à
  <a href="mailto:support@secretis.app">support@secretis.app</a>
  ou consultez notre <a href="{{ config('app.url') }}/docs">documentation en ligne</a>.
</p>
@endsection
