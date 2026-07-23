@extends('emails.layout')

@section('subject', "Votre demande #{$ticket_number} a été traitée")
@section('preheader', "Ticket #{$ticket_number} résolu. Donnez votre avis sur la qualité du support.")
@section('header_label', 'Support')
@section('header_title', "Ticket #{$ticket_number} — Résolu ✓")

@section('cta_primary', 'Voir la réponse complète')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/support/tickets/' . ($ticket_id ?? ''))

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Votre demande de support <strong>#{{ $ticket_number }}</strong> a été traitée par notre équipe.
</p>

{{-- Résumé résolution --}}
@if(!empty($resolution_summary))
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
    <tr>
        <td style="background-color:#EAF7EA;border-left:4px solid #27AE60;border-radius:4px;padding:16px 20px;">
            <p style="margin:0 0 6px;font-weight:700;color:#1D8348;font-size:14px;">Résumé de la résolution :</p>
            <p style="margin:0;color:#2C3E50;font-size:14px;line-height:1.6;">{{ $resolution_summary }}</p>
        </td>
    </tr>
</table>
@endif

{{-- Note de satisfaction --}}
<p style="margin:24px 0 12px;font-weight:600;color:#1A3A5C;font-size:15px;">Votre avis compte 🌟</p>
<p style="margin:0 0 12px;color:#5D6D7E;font-size:14px;">
    Évaluez la qualité de notre support pour nous aider à nous améliorer :
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
    <tr>
        @for($star = 1; $star <= 5; $star++)
        <td style="padding:4px;">
            <a href="{{ ($app_url ?? config('app.url')) }}/api/tickets/{{ $ticket_id ?? '' }}/rate?rating={{ $star }}&token={{ $rating_token ?? '' }}"
               style="display:inline-block;width:44px;height:44px;background-color:#F4F6F8;border:2px solid #EBF0F5;border-radius:8px;text-align:center;line-height:44px;font-size:20px;text-decoration:none;"
               title="{{ $star }} étoile{{ $star > 1 ? 's' : '' }}">
                ⭐
            </a>
        </td>
        @endfor
    </tr>
    <tr>
        @for($star = 1; $star <= 5; $star++)
        <td style="text-align:center;font-size:11px;color:#95A5A6;padding:0 4px;">{{ $star }}</td>
        @endfor
    </tr>
</table>

{{-- Option de réouverture --}}
<p style="margin:0;font-size:14px;color:#5D6D7E;">
    Le problème n'est pas résolu ?
    <a href="{{ ($app_url ?? config('app.url')) . '/support/tickets/' . ($ticket_id ?? '') . '/reopen' }}" style="color:#E67E22;font-weight:600;">Rouvrir ce ticket</a>
</p>
@endsection

@section('footer_note')
Ticket résolu le {{ $resolved_at ?? now()->format('d/m/Y à H:i') }}.
Délai de traitement : {{ $resolution_time ?? '—' }}.
@endsection
