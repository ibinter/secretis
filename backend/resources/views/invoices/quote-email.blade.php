@extends('emails.layout')

{{-- Envoi d'un devis au client — le PDF est joint par AccountingService.
     Variables : quote, client, org. --}}

@php
    // SECRETIS est déployé dans plusieurs zones monétaires : la devise
    // vient du document, sinon de l'organisation émettrice — jamais d'un
    // repli codé en dur.
    $devise = $quote->currency
        ?: ($org ? app(\App\Services\CurrencyService::class)->getOrganizationCurrency($org) : 'XOF');
    $fmt    = fn ($m) => number_format((float) $m, 0, ',', ' ');
@endphp

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Devis {{ $quote->quote_number }}</h2>

<p>Bonjour{{ $client?->name ? ' ' . $client->name : '' }},</p>

<p>Nous vous remercions de votre intérêt. Vous trouverez ci-joint notre devis <strong>{{ $quote->quote_number }}</strong>.</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:18px 0;"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.8;">
  <strong>Date d'émission :</strong> {{ optional($quote->issue_date)->format('d/m/Y') }}<br>
  @if($quote->valid_until ?? null)
  <strong>Validité :</strong> jusqu'au {{ optional($quote->valid_until)->format('d/m/Y') }}<br>
  @endif
  <strong>Montant hors taxes :</strong> {{ $fmt($quote->subtotal) }} {{ $devise }}<br>
  <strong>TVA :</strong> {{ $fmt($quote->tax_amount) }} {{ $devise }}<br>
  <span style="display:inline-block;margin-top:8px;padding-top:8px;border-top:1px solid #e9d5ff;font-size:17px;color:#9333EA;"><strong>Total : {{ $fmt($quote->total) }} {{ $devise }}</strong></span>
</td></tr></table>

@if($quote->valid_until ?? null)
<p>Cette proposition reste valable jusqu'au <strong>{{ optional($quote->valid_until)->format('d/m/Y') }}</strong>.</p>
@endif

<p>Pour accepter ce devis, il vous suffit de répondre à cet email. Nous restons disponibles pour l'ajuster à vos besoins.</p>

<p style="margin-top:24px;">Cordialement,<br><strong>{{ $org?->name ?? config('app.name') }}</strong></p>

@endsection
