@extends('emails.layouts.base')

@section('title', 'Ticket #{{ $ticketNumber }} ouvert — SECRETIS Support')
@section('header-tagline', 'Support · Confirmation d\'ouverture de ticket')

@section('content')
<div style="text-align:center; margin-bottom: 24px;">
  <span class="badge badge-{{ $priorityColor ?? 'orange' }}" style="font-size: 13px; padding: 6px 16px;">
    Priorité : {{ $priority }}
  </span>
</div>

<h1>Votre demande a bien été enregistrée</h1>

<p>
  Bonjour {{ $userName }},<br><br>
  Votre ticket de support a été créé avec succès. Notre équipe l'examine et reviendra vers vous
  dans les délais indiqués ci-dessous.
</p>

<table class="data-table">
  <tbody>
    <tr>
      <td><strong>Numéro de ticket</strong></td>
      <td style="text-align:right; font-family: monospace; font-weight: 700; font-size: 15px; color: #1A3A5C;">
        #{{ $ticketNumber }}
      </td>
    </tr>
    <tr>
      <td><strong>Sujet</strong></td>
      <td style="text-align:right;">{{ $subject }}</td>
    </tr>
    <tr>
      <td><strong>Catégorie</strong></td>
      <td style="text-align:right;">{{ $category }}</td>
    </tr>
    <tr>
      <td><strong>Priorité</strong></td>
      <td style="text-align:right;"><span class="badge badge-{{ $priorityColor ?? 'orange' }}">{{ $priority }}</span></td>
    </tr>
    <tr>
      <td><strong>Date d'ouverture</strong></td>
      <td style="text-align:right;">{{ $createdAt }}</td>
    </tr>
    <tr>
      <td><strong>Délai de réponse estimé (SLA)</strong></td>
      <td style="text-align:right; font-weight: 700; color: #1A3A5C;">{{ $slaEstimate }}</td>
    </tr>
  </tbody>
</table>

<h2>Résumé de votre demande</h2>
<div class="info-box">
  <p style="white-space: pre-line;">{{ $description }}</p>
</div>

@if(!empty($attachments))
<p style="font-size: 14px; color: #555;">
  <strong>Pièces jointes reçues :</strong> {{ count($attachments) }} fichier(s)
</p>
@endif

<div class="btn-wrapper">
  <a href="{{ $ticketUrl }}" class="btn btn-secondary">Suivre mon ticket</a>
</div>

<hr class="divider">

<p style="font-size: 13px; color: #777;">
  Pour ajouter des informations, répondez directement à cet email en conservant le sujet,
  ou accédez à votre ticket via le lien ci-dessus.<br><br>
  Référencez toujours le numéro <strong>#{{ $ticketNumber }}</strong> dans vos échanges.
</p>
@endsection
