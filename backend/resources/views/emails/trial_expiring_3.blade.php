@extends('emails.layouts.base')

@section('title', 'Plus que 3 jours d\'essai SECRETIS !')
@section('header-tagline', 'Rappel essai gratuit · J-3')

@section('content')
<h1>Plus que <span style="color:#F39C12;">3 jours</span> pour sécuriser vos données !</h1>

<p>
  Bonjour {{ $adminName }},<br><br>
  L'essai gratuit de <strong>{{ $organisationName }}</strong> expire le <strong>{{ $trialEndsAt }}</strong>.
  Pour ne pas perdre l'accès à vos courriers, tâches et documents, activez votre abonnement maintenant.
</p>

<div class="warning-box">
  <p>
    <strong>Que se passe-t-il à l'expiration ?</strong><br>
    Votre espace passe en lecture seule pendant 30 jours. Après ce délai, les données non exportées
    peuvent être supprimées. Vos données restent les vôtres — activez votre abonnement pour les conserver.
  </p>
</div>

<h2>Avantages des plans payants</h2>

<table class="data-table">
  <thead>
    <tr>
      <th>Fonctionnalité</th>
      <th style="text-align:center;">Essai</th>
      <th style="text-align:center;">Plan payant</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Courriers</td>
      <td style="text-align:center;">100</td>
      <td style="text-align:center;"><strong>Illimité</strong></td>
    </tr>
    <tr>
      <td>Collaborateurs</td>
      <td style="text-align:center;">3</td>
      <td style="text-align:center;"><strong>Selon plan</strong></td>
    </tr>
    <tr>
      <td>Stockage</td>
      <td style="text-align:center;">500 Mo</td>
      <td style="text-align:center;"><strong>10 Go+</strong></td>
    </tr>
    <tr>
      <td>Support</td>
      <td style="text-align:center;">Email</td>
      <td style="text-align:center;"><strong>Prioritaire</strong></td>
    </tr>
    <tr>
      <td>SARA IA</td>
      <td style="text-align:center;">Limité</td>
      <td style="text-align:center;"><strong>Illimité</strong></td>
    </tr>
  </tbody>
</table>

<div class="btn-wrapper">
  <a href="{{ $upgradeUrl }}" class="btn btn-primary">Activer mon abonnement</a>
</div>

<p style="text-align:center; font-size: 13px; color: #999;">
  Besoin d'un devis ? <a href="{{ config('app.url') }}/contact-commercial">Contacter un commercial</a>
</p>
@endsection
