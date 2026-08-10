@extends('emails.layout')

{{-- Offre commerciale SECRETIS envoyée à un prospect depuis le CRM SuperAdmin.
     Variables : offer (ligne `commercial_offers`), prospect (peut être nul).
     Note : le fichier voisin `emails/offre_commerciale.blade.php` attend un tout
     autre jeu de variables — les deux ne sont pas interchangeables. --}}

@php
    // La devise suit l'offre ; à défaut, le pays du prospect la détermine.
    $devise = $offer->currency
        ?: (($prospect->country ?? null)
            ? (app(\App\Services\CurrencyService::class)->currencyForCountry($prospect->country) ?? 'XOF')
            : 'XOF');
    $fmt    = fn ($m) => number_format((float) $m, 0, ',', ' ');
    $appUrl = rtrim(config('app.url', 'https://secretis.ibigsoft.com'), '/');

    $periodes = ['monthly' => 'par mois', 'yearly' => 'par an', 'annual' => 'par an'];
    $periode  = $periodes[$offer->period ?? ''] ?? $offer->period;
@endphp

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Votre offre {{ $offer->software ?? 'SECRETIS' }}</h2>

<p>Bonjour{{ $prospect?->contact_name ?? $prospect?->name ? ' ' . ($prospect->contact_name ?? $prospect->name) : '' }},</p>

<p>Suite à nos échanges, voici notre proposition commerciale <strong>{{ $offer->number }}</strong>.</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:18px 0;"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.8;">
  <strong>Solution :</strong> {{ $offer->software ?? 'SECRETIS ERP' }} — formule {{ $offer->plan }}<br>
  @if($offer->users_count)<strong>Utilisateurs :</strong> {{ $offer->users_count }}<br>@endif
  @if($offer->entities_count)<strong>Entités :</strong> {{ $offer->entities_count }}<br>@endif
  <strong>Engagement :</strong> {{ $periode }}<br>
  @if(($offer->discount_pct ?? 0) > 0)
  <strong style="color:#0E9F6E;">Remise accordée : {{ rtrim(rtrim(number_format((float) $offer->discount_pct, 2, ',', ' '), '0'), ',') }} %</strong><br>
  @endif
  <strong>Montant hors taxes :</strong> {{ $fmt($offer->amount_ht) }} {{ $devise }}<br>
  <span style="display:inline-block;margin-top:8px;padding-top:8px;border-top:1px solid #e9d5ff;font-size:17px;color:#9333EA;"><strong>Total TTC : {{ $fmt($offer->amount_ttc) }} {{ $devise }} {{ $periode }}</strong></span>
</td></tr></table>

@if(!empty($offer->conditions))
<p style="font-size:14px;color:#4b5563;"><strong>Conditions particulières :</strong><br>{!! nl2br(e($offer->conditions)) !!}</p>
@endif

@if(!empty($offer->accept_token))
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td style="background:#9333EA;border-radius:8px;">
  <a href="{{ $appUrl }}/offres/{{ $offer->accept_token }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Consulter et accepter l'offre</a>
</td></tr></table>
@endif

@if($offer->valid_until)
<p style="text-align:center;font-size:13px;color:#6b7280;">Offre valable jusqu'au <strong>{{ \Carbon\Carbon::parse($offer->valid_until)->format('d/m/Y') }}</strong>.</p>
@endif

<p style="margin-top:24px;">Nous restons à votre disposition pour organiser une démonstration ou adapter cette proposition.</p>

<p>Cordialement,<br><strong>L'équipe IBIG Soft</strong></p>

@endsection
