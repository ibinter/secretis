@extends('emails.layouts.base')

@section('title', 'Votre accès SECRETIS a expiré')
@section('header-tagline', 'Abonnement expiré')

@section('content')
<h1>Votre abonnement a expiré</h1>

<p>
  Bonjour {{ $adminName }},<br><br>
  L'abonnement de <strong>{{ $organisationName }}</strong> a pris fin le <strong>{{ $expiredAt }}</strong>.
  Votre espace est actuellement en mode <strong>lecture seule</strong>.
</p>

<div class="info-box">
  <p>
    <strong>Vos données sont en sécurité.</strong><br>
    L'intégralité de vos courriers, tâches et documents est conservée pendant <strong>30 jours</strong>
    à compter de l'expiration. Réactivez votre abonnement pour retrouver un accès complet immédiatement.
  </p>
</div>

<h2>Ce qui est toujours accessible</h2>
<ul style="color: #444; font-size: 14px; line-height: 2.2; padding-left: 20px;">
  <li>Consultation de vos documents existants (lecture seule)</li>
  <li>Export de vos données (Paramètres → Export)</li>
  <li>Accès à votre historique de facturation</li>
  <li>Contact du support</li>
</ul>

<h2>Ce qui nécessite une réactivation</h2>
<ul style="color: #E74C3C; font-size: 14px; line-height: 2.2; padding-left: 20px;">
  <li>Création de nouveaux courriers ou tâches</li>
  <li>Invitations de collaborateurs</li>
  <li>Envoi de documents</li>
  <li>Accès à SARA IA</li>
</ul>

<div class="btn-wrapper">
  <a href="{{ $reactivateUrl }}" class="btn btn-primary">Réactiver maintenant</a>
</div>

<p style="text-align:center; font-size: 13px; color: #999;">
  Vous avez rencontré un problème de paiement ? <a href="{{ config('app.url') }}/contact">Contactez-nous</a>
</p>

<hr class="divider">

<p style="font-size: 13px; color: #777;">
  Si vous avez décidé de ne plus utiliser SECRETIS, vous pouvez exporter vos données depuis votre espace.
  Nous espérons vous revoir. Pour tout retour, écrivez-nous à
  <a href="mailto:contact@secretis.app">contact@secretis.app</a>.
</p>
@endsection
