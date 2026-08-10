@extends('emails.layout')

{{-- Envoi d'une facture au client — le PDF est joint par AccountingService.
     Variables : invoice, client, org. --}}

@php
    // SECRETIS est déployé dans plusieurs zones monétaires : la devise
    // vient du document, sinon de l'organisation émettrice — jamais d'un
    // repli codé en dur.
    $devise = $invoice->currency
        ?: ($org ? app(\App\Services\CurrencyService::class)->getOrganizationCurrency($org) : 'XOF');
    $fmt    = fn ($m) => number_format((float) $m, 0, ',', ' ');
@endphp

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Facture {{ $invoice->invoice_number }}</h2>

<p>Bonjour{{ $client?->name ? ' ' . $client->name : '' }},</p>

<p>Veuillez trouver ci-joint la facture <strong>{{ $invoice->invoice_number }}</strong> émise par <strong>{{ $org?->name ?? config('app.name') }}</strong>.</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:18px 0;"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.8;">
  <strong>Date d'émission :</strong> {{ optional($invoice->issue_date)->format('d/m/Y') }}<br>
  <strong>Échéance :</strong> {{ optional($invoice->due_date)->format('d/m/Y') }}<br>
  <strong>Montant hors taxes :</strong> {{ $fmt($invoice->subtotal) }} {{ $devise }}<br>
  <strong>TVA :</strong> {{ $fmt($invoice->tax_amount) }} {{ $devise }}<br>
  <span style="display:inline-block;margin-top:8px;padding-top:8px;border-top:1px solid #e9d5ff;font-size:17px;color:#9333EA;"><strong>Total à régler : {{ $fmt($invoice->total) }} {{ $devise }}</strong></span>
</td></tr></table>

@if($invoice->due_date)
<p>Le règlement est attendu au plus tard le <strong>{{ optional($invoice->due_date)->format('d/m/Y') }}</strong>.</p>
@endif

<p>Nous restons à votre disposition pour toute question relative à cette facture.</p>

<p style="margin-top:24px;">Cordialement,<br><strong>{{ $org?->name ?? config('app.name') }}</strong></p>

@endsection
