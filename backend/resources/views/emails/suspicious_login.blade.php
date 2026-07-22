@extends('emails.layouts.base')

@section('title', 'Alerte de sécurité — Nouvelle connexion détectée')
@section('header-tagline', 'Sécurité de votre compte')

@section('content')
<div style="text-align:center; margin-bottom: 24px;">
  <span class="badge badge-red" style="font-size: 13px; padding: 6px 16px;">⚠ Alerte sécurité</span>
</div>

<h1>Nouvelle connexion détectée sur votre compte</h1>

<p>
  Bonjour {{ $userName }},<br><br>
  Nous avons détecté une connexion à votre compte SECRETIS depuis un
  <strong>nouvel appareil ou un nouvel emplacement</strong> inhabituel.
</p>

<div class="danger-box">
  <p>
    <strong>Détails de la connexion :</strong><br>
    Date et heure : <strong>{{ $loginAt }}</strong><br>
    Adresse IP : <strong>{{ $ipAddress }}</strong><br>
    Localisation approximative : <strong>{{ $location }}</strong><br>
    Appareil : <strong>{{ $device }}</strong><br>
    Navigateur : <strong>{{ $browser }}</strong>
  </p>
</div>

<p>Si c'est bien vous qui vous êtes connecté, aucune action n'est requise.</p>

<p><strong>Si vous n'êtes PAS à l'origine de cette connexion</strong>, votre compte est peut-être compromis. Agissez immédiatement :</p>

<div class="btn-wrapper">
  <a href="{{ $secureUrl }}" class="btn btn-danger">Ce n'est pas moi — Sécuriser mon compte</a>
</div>

<p style="text-align:center; font-size: 13px; color: #999;">
  Ce lien expire dans <strong>2 heures</strong>. Au-delà, contactez directement le support.
</p>

<hr class="divider">

<h2>Que faire en cas de connexion suspecte ?</h2>
<ul class="steps">
  <li>
    <div class="step-num" style="background: #E74C3C;">1</div>
    <div class="step-content">
      <strong>Cliquez sur "Sécuriser mon compte"</strong>
      <span>Toutes les sessions actives seront immédiatement déconnectées.</span>
    </div>
  </li>
  <li>
    <div class="step-num" style="background: #E74C3C;">2</div>
    <div class="step-content">
      <strong>Changez votre mot de passe</strong>
      <span>Choisissez un mot de passe fort que vous n'utilisez nulle part ailleurs.</span>
    </div>
  </li>
  <li>
    <div class="step-num" style="background: #E74C3C;">3</div>
    <div class="step-content">
      <strong>Activez la double authentification (2FA)</strong>
      <span>Disponible dans Paramètres → Sécurité pour protéger définitivement votre compte.</span>
    </div>
  </li>
  <li>
    <div class="step-num" style="background: #1A3A5C;">4</div>
    <div class="step-content">
      <strong>Contactez le support si nécessaire</strong>
      <span>Notre équipe peut bloquer l'accès et auditer les activités récentes de votre compte.</span>
    </div>
  </li>
</ul>

<hr class="divider">

<p style="font-size: 13px; color: #777;">
  SECRETIS ne vous demandera jamais votre mot de passe par email.
  Pour toute urgence sécurité, contactez <a href="mailto:securite@secretis.app">securite@secretis.app</a>.
</p>
@endsection
