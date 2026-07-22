@extends('emails.layouts.base')

@section('title', 'Réinitialisation de votre mot de passe SECRETIS')
@section('header-tagline', 'Sécurité de votre compte')

@section('content')
<h1>Réinitialisation de mot de passe</h1>

<p>
  Bonjour {{ $userName }},<br><br>
  Une demande de réinitialisation de mot de passe a été effectuée pour votre compte SECRETIS
  associé à <strong>{{ $email }}</strong>.
</p>

<p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>

<div class="btn-wrapper">
  <a href="{{ $resetUrl }}" class="btn btn-secondary">Réinitialiser mon mot de passe</a>
</div>

<div class="info-box">
  <p>
    <strong>Ce lien est valable 60 minutes</strong> à compter de la réception de cet email.
    Passé ce délai, vous devrez effectuer une nouvelle demande.
  </p>
</div>

<div class="warning-box">
  <p>
    <strong>Vous n'êtes pas à l'origine de cette demande ?</strong><br>
    Ignorez simplement cet email — votre mot de passe actuel reste inchangé.
    Si vous suspectez une tentative d'accès non autorisé à votre compte,
    <a href="{{ $secureUrl }}">sécurisez votre compte immédiatement</a>.
  </p>
</div>

<hr class="divider">

<p style="font-size: 13px; color: #777;">
  Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
</p>
<p style="font-size: 12px; background: #F4F6F9; padding: 10px 14px; border-radius: 6px; word-break: break-all; color: #555; font-family: monospace;">
  {{ $resetUrl }}
</p>

<p style="font-size: 13px; color: #777; margin-top: 20px;">
  Pour des raisons de sécurité, SECRETIS ne vous demandera jamais votre mot de passe
  par email ou par téléphone.
</p>
@endsection
