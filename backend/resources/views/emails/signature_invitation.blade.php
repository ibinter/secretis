@extends('emails.layout')

{{-- Invitation à signer électroniquement un document.
     Variables : request (SignatureRequest), signer, signUrl, isReminder. --}}

@php
    $relance = (bool) ($isReminder ?? false);
    $couleur = $relance ? '#D97706' : '#9333EA';
@endphp

@section('content')

<div style="display:inline-block;padding:4px 12px;border-radius:999px;background:{{ $couleur }}1a;color:{{ $couleur }};font-size:12px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;">{{ $relance ? 'Rappel' : 'Signature électronique' }}</div>

<h2 style="color:#111827;margin:14px 0 12px;font-size:20px;line-height:1.35;">{{ $request->title }}</h2>

<p>Bonjour {{ $signer->name ?? '' }},</p>

@if($relance)
<p>Ce document attend toujours votre signature. Il vous suffit de quelques secondes pour la déposer en ligne.</p>
@else
<p>Un document vous est adressé pour signature électronique.</p>
@endif

@if(!empty($request->message))
<table role="presentation" width="100%" style="background:#faf5ff;border-left:3px solid {{ $couleur }};border-radius:6px;margin:18px 0;"><tr><td style="padding:16px 20px;font-size:15px;color:#1f2937;line-height:1.6;">{!! nl2br(e($request->message)) !!}</td></tr></table>
@endif

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td style="background:{{ $couleur }};border-radius:8px;">
  <a href="{{ $signUrl }}" style="display:inline-block;padding:14px 38px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Signer le document</a>
</td></tr></table>

@if($request->expires_at)
<p style="text-align:center;font-size:13px;color:#6b7280;">Ce lien expire le <strong>{{ \Carbon\Carbon::parse($request->expires_at)->format('d/m/Y à H\hi') }}</strong>.</p>
@endif

<p style="font-size:13px;color:#6b7280;margin-top:22px;border-top:1px solid #f3e8ff;padding-top:16px;">
  Ce lien de signature vous est personnel : ne le transmettez pas. Chaque action est horodatée et consignée dans un journal d'audit conservé avec le document.
</p>

@endsection
