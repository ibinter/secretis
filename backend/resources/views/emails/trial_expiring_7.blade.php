@extends('emails.layouts.base')

@section('title', 'Il vous reste 7 jours pour essayer SECRETIS')
@section('header-tagline', 'Rappel essai gratuit · J-7')

@section('content')
<h1>{{ $organisationName }}, il vous reste <span style="color:#F39C12;">7 jours</span> d'essai gratuit</h1>

<p>
  Bonjour {{ $adminName }},<br><br>
  Votre essai IBIG SECRETIS se termine le <strong>{{ $trialEndsAt }}</strong>.
  Profitez de cette dernière semaine pour explorer toutes les fonctionnalités !
</p>

@if(!empty($usedFeatures))
<h2>Ce que vous avez déjà utilisé</h2>
<ul style="padding-left: 20px; color: #444; font-size: 15px; line-height: 2;">
  @foreach($usedFeatures as $feature)
    <li>{{ $feature }}</li>
  @endforeach
</ul>
@endif

<h2>Pourquoi passer à un plan payant ?</h2>

<table class="data-table">
  <tr>
    <td>✓</td>
    <td><strong>Accès illimité</strong> à tous vos courriers et documents</td>
  </tr>
  <tr>
    <td>✓</td>
    <td><strong>Collaborateurs illimités</strong> selon votre plan</td>
  </tr>
  <tr>
    <td>✓</td>
    <td><strong>Support prioritaire</strong> avec réponse en moins de 4h</td>
  </tr>
  <tr>
    <td>✓</td>
    <td><strong>Sauvegarde quotidienne</strong> de vos données</td>
  </tr>
  <tr>
    <td>✓</td>
    <td><strong>SARA IA</strong> sans limite de requêtes</td>
  </tr>
</table>

<div class="btn-wrapper">
  <a href="{{ $upgradeUrl }}" class="btn btn-primary">Activer mon abonnement</a>
</div>

<p style="text-align:center; font-size: 13px; color: #999;">
  Ou <a href="{{ config('app.url') }}/contact-commercial">demander un devis personnalisé</a>
</p>

<hr class="divider">

<p style="font-size: 14px; color: #777;">
  Des questions ? Répondez directement à cet email ou contactez votre chargé de compte.
</p>
@endsection
