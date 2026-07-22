@extends('emails.layouts.base')

@section('title', 'Votre accès SECRETIS expire dans moins de 24 heures')
@section('header-tagline', 'URGENT · Essai gratuit · Dernière chance')

@section('content')
<div style="text-align:center; margin-bottom: 24px;">
  <span class="badge badge-red" style="font-size: 13px; padding: 6px 16px;">⚠ Expire dans moins de 24h</span>
</div>

<h1 style="text-align:center;">Votre accès expire très bientôt</h1>

<p style="text-align:center;">
  Bonjour {{ $adminName }}, l'essai gratuit de <strong>{{ $organisationName }}</strong><br>
  se termine le <strong>{{ $trialEndsAt }}</strong>.
</p>

<div class="danger-box">
  <p>
    <strong>Sans abonnement actif :</strong> votre espace passe en lecture seule dans moins de 24 heures.
    Vos courriers, tâches et documents resteront accessibles 30 jours supplémentaires,
    puis seront archivés.
  </p>
</div>

<div class="btn-wrapper">
  <a href="{{ $upgradeUrl }}" class="btn btn-danger" style="font-size: 16px; padding: 16px 40px;">
    Activer maintenant — Continuer sans interruption
  </a>
</div>

<p style="text-align:center; font-size: 13px; color: #999; margin-top: -10px;">
  Activation immédiate · Sans engagement · Annulable à tout moment
</p>

<hr class="divider">

<h2>Vos données sont en sécurité</h2>
<p>
  Si vous avez besoin d'un délai ou souhaitez discuter de votre situation,
  notre équipe est disponible immédiatement :
</p>
<ul style="color: #444; font-size: 14px; line-height: 2; padding-left: 20px;">
  <li>Email : <a href="mailto:support@secretis.app">support@secretis.app</a></li>
  <li>Téléphone : <strong>{{ config('app.support_phone', '+225 XX XX XX XX') }}</strong></li>
  <li>Chat en direct : disponible dans votre espace</li>
</ul>

<div class="info-box">
  <p>
    <strong>Exportez vos données dès maintenant</strong> depuis
    Paramètres → Export des données — disponible même après l'expiration.
  </p>
</div>
@endsection
