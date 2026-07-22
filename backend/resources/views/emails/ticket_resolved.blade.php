@extends('emails.layouts.base')

@section('title', 'Ticket #{{ $ticketNumber }} résolu — SECRETIS Support')
@section('header-tagline', 'Support · Demande traitée')

@section('content')
<div style="text-align:center; margin-bottom: 24px;">
  <div style="width: 60px; height: 60px; background: #D4EDDA; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px;">
    ✓
  </div>
</div>

<h1>Votre demande a été traitée</h1>

<p>
  Bonjour {{ $userName }},<br><br>
  Le ticket <strong>#{{ $ticketNumber }}</strong> a été résolu par notre équipe support.
  Nous espérons que la solution apportée correspond à vos attentes.
</p>

<div class="info-box">
  <p>
    <strong>Ticket N° :</strong> #{{ $ticketNumber }}<br>
    <strong>Sujet :</strong> {{ $subject }}<br>
    <strong>Ouvert le :</strong> {{ $createdAt }}<br>
    <strong>Résolu le :</strong> {{ $resolvedAt }}<br>
    <strong>Traité par :</strong> {{ $resolvedBy }}
  </p>
</div>

<h2>Résumé de la résolution</h2>
<div class="info-box">
  <p style="white-space: pre-line;">{{ $resolutionSummary }}</p>
</div>

@if(!empty($nextSteps))
<h2>Prochaines étapes</h2>
<ul style="color: #444; font-size: 14px; line-height: 2.2; padding-left: 20px;">
  @foreach($nextSteps as $step)
  <li>{{ $step }}</li>
  @endforeach
</ul>
@endif

<hr class="divider">

<h2 style="text-align:center; font-size: 16px;">Cette résolution vous a-t-elle aidé ?</h2>
<p style="text-align:center; color: #777; font-size: 14px;">Votre avis nous aide à améliorer notre support</p>

<div style="text-align:center; margin: 20px 0; display: flex; gap: 12px; justify-content: center;">
  <a href="{{ $feedbackUrl }}?rating=satisfied" class="btn btn-secondary" style="padding: 10px 20px; font-size: 14px;">
    😊 Oui, c'est résolu
  </a>
  <a href="{{ $feedbackUrl }}?rating=unsatisfied" style="display:inline-block; padding: 10px 20px; border: 2px solid #DDD; border-radius: 6px; font-size: 14px; color: #666; text-decoration: none; font-weight: 600;">
    😞 Pas encore
  </a>
</div>

<p style="text-align:center; font-size: 12px; color: #999; margin-top: 8px;">
  Si votre problème persiste, répondez à cet email et le ticket sera réouvert automatiquement.
</p>

<hr class="divider">

<div class="warning-box">
  <p>
    <strong>Ce ticket sera archivé dans 7 jours</strong> si aucune réponse n'est reçue.
    Pour le rouvrir, répondez à cet email ou contactez le support.
  </p>
</div>
@endsection
