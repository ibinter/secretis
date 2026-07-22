@extends('emails.layouts.base')

@section('title', 'Accès à SECRETIS temporairement suspendu')
@section('header-tagline', 'Notification · Compte suspendu')

@section('content')
<h1>Accès temporairement suspendu</h1>

<p>
  Bonjour {{ $adminName }},<br><br>
  Nous vous informons que l'accès de <strong>{{ $organisationName }}</strong> à IBIG SECRETIS
  a été temporairement suspendu.
</p>

<div class="info-box">
  <p>
    <strong>Date de suspension :</strong> {{ $suspendedAt }}<br>
    @if(!empty($reason))
    <strong>Motif :</strong> {{ $reason }}<br>
    @endif
    @if(!empty($suspensionRef))
    <strong>Référence :</strong> {{ $suspensionRef }}
    @endif
  </p>
</div>

@if(!empty($reason))
<h2>Informations sur la suspension</h2>
<p>{{ $reasonDetail ?? 'Pour toute question concernant cette suspension, notre équipe est à votre disposition.' }}</p>
@endif

<h2>Que pouvez-vous faire ?</h2>
<ul class="steps">
  <li>
    <div class="step-num">1</div>
    <div class="step-content">
      <strong>Contacter notre support</strong>
      <span>Notre équipe peut clarifier la situation et vous indiquer les étapes à suivre.</span>
    </div>
  </li>
  @if(!empty($actionRequired))
  <li>
    <div class="step-num">2</div>
    <div class="step-content">
      <strong>{{ $actionRequired }}</strong>
      <span>{{ $actionDetail ?? '' }}</span>
    </div>
  </li>
  @endif
  <li>
    <div class="step-num" style="background: #1D6933;">3</div>
    <div class="step-content">
      <strong>Réactivation de l'accès</strong>
      <span>Une fois la situation résolue, l'accès est rétabli immédiatement.</span>
    </div>
  </li>
</ul>

<div class="btn-wrapper">
  <a href="{{ $supportUrl }}" class="btn btn-secondary">Contacter le support</a>
</div>

<hr class="divider">

<p style="font-size: 14px; color: #555;">
  <strong>Contacts directs :</strong>
</p>
<ul style="color: #444; font-size: 14px; line-height: 2; padding-left: 20px;">
  <li>Email : <a href="mailto:support@secretis.app">support@secretis.app</a></li>
  <li>Téléphone : <strong>{{ config('app.support_phone', '+225 XX XX XX XX') }}</strong> (Lun-Ven, 8h-18h)</li>
</ul>

<div class="info-box">
  <p>
    Vos données sont sécurisées et conservées intégralement pendant la période de suspension.
    Aucune donnée ne sera supprimée sans notification préalable.
  </p>
</div>
@endsection
