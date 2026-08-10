@extends('emails.layout')

{{-- Relance de facture impayée. Variables : invoice, client, org, days_overdue. --}}

@php
    // SECRETIS est déployé dans plusieurs zones monétaires : la devise
    // vient du document, sinon de l'organisation émettrice — jamais d'un
    // repli codé en dur.
    $devise = $invoice->currency
        ?: ($org ? app(\App\Services\CurrencyService::class)->getOrganizationCurrency($org) : 'XOF');
    $fmt    = fn ($m) => number_format((float) $m, 0, ',', ' ');
    $jours  = (int) ($days_overdue ?? 0);

    // Le ton monte avec l'ancienneté de l'impayé, sans jamais devenir comminatoire.
    $ton = $jours >= 60
        ? ['#DC2626', 'Relance — facture impayée depuis ' . $jours . ' jours']
        : ($jours >= 15
            ? ['#D97706', 'Rappel — facture échue depuis ' . $jours . ' jours']
            : ['#9333EA', 'Rappel d\'échéance']);
    [$couleur, $titre] = $ton;
@endphp

@section('content')

<h2 style="color:{{ $couleur }};margin:0 0 14px;">{{ $titre }}</h2>

<p>Bonjour{{ $client?->name ? ' ' . $client->name : '' }},</p>

<p>Sauf erreur de notre part, la facture <strong>{{ $invoice->invoice_number }}</strong> demeure impayée à ce jour.</p>

<table role="presentation" width="100%" style="background:#fff7ed;border-left:3px solid {{ $couleur }};border-radius:6px;margin:18px 0;"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.8;">
  <strong>Facture :</strong> {{ $invoice->invoice_number }}<br>
  <strong>Échéance :</strong> {{ optional($invoice->due_date)->format('d/m/Y') }}<br>
  <strong>Retard :</strong> {{ $jours }} jour(s)<br>
  <span style="display:inline-block;margin-top:8px;padding-top:8px;border-top:1px solid #fed7aa;font-size:17px;color:{{ $couleur }};"><strong>Montant dû : {{ $fmt($invoice->total) }} {{ $devise }}</strong></span>
</td></tr></table>

<p>Si le règlement a été effectué entre-temps, merci de ne pas tenir compte de ce message et de nous transmettre la preuve de paiement.</p>

<p>Dans le cas contraire, nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais. Notre service comptable se tient à votre disposition pour convenir d'un échéancier si nécessaire.</p>

<p style="margin-top:24px;">Cordialement,<br><strong>{{ $org?->name ?? config('app.name') }}</strong></p>

@endsection
