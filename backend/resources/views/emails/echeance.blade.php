@extends('emails.layout')

@php
    $is_trial = $is_trial ?? false;
    $days_left = $days_left ?? 7;
    $type_label = $is_trial ? 'essai gratuit' : 'abonnement';
    $cta_label = $is_trial ? 'Activer mon abonnement' : 'Renouveler maintenant';

    if ($is_trial && $days_left <= 1) {
        $subject_text = "Votre essai expire dans moins de 24 heures — ne perdez pas accès";
    } elseif ($is_trial) {
        $subject_text = "Votre essai SECRETIS expire dans {$days_left} jours";
    } elseif ($days_left <= 1) {
        $subject_text = "Votre abonnement SECRETIS expire dans moins de 24 heures";
    } else {
        $subject_text = "Votre abonnement SECRETIS arrive à échéance dans {$days_left} jours";
    }

    $urgency_color = $days_left <= 1 ? '#E74C3C' : ($days_left <= 3 ? '#E67E22' : '#F39C12');
@endphp

@section('subject', $subject_text)
@section('preheader', "Votre {$type_label} expire le {$expires_at}. Agissez maintenant pour conserver l'accès.")
@section('header_label', $days_left <= 1 ? '⚠️ Urgent' : 'Rappel')
@section('header_title', "Votre {$type_label} expire dans {$days_left} jour" . ($days_left > 1 ? 's' : ''))

@section('cta_primary', $cta_label)
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/billing')

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Votre <strong>{{ $type_label }}</strong> SECRETIS pour <strong>{{ $org_name }}</strong>
    expire le <strong>{{ $expires_at }}</strong>.
    @if($days_left <= 1)
        <strong style="color:#E74C3C;">Il vous reste moins de 24 heures.</strong>
    @endif
</p>

{{-- Indicateur d'urgence --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
    <tr>
        <td style="background-color:{{ $urgency_color }}1A;border:1px solid {{ $urgency_color }};border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:14px;color:{{ $urgency_color }};font-weight:700;">
                ⏱ Expiration dans {{ $days_left }} jour{{ $days_left > 1 ? 's' : '' }} — {{ $expires_at }}
            </p>
        </td>
    </tr>
</table>

{{-- Usage actuel --}}
@if(!empty($modules_used))
<p style="margin:16px 0 8px;font-weight:600;color:#1A3A5C;">Modules actuellement utilisés :</p>
<ul style="margin:0 0 16px;padding-left:20px;color:#2C3E50;">
    @foreach($modules_used as $module)
    <li style="margin-bottom:4px;">{{ $module }}</li>
    @endforeach
</ul>
@endif

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;border:1px solid #EBF0F5;border-radius:8px;overflow:hidden;">
    <tr style="background-color:#F8FAFB;">
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#1A3A5C;border-bottom:1px solid #EBF0F5;">
            PLAN {{ strtoupper($plan_name ?? 'SECRETIS') }}
        </td>
    </tr>
    <tr>
        <td style="padding:16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="color:#5D6D7E;font-size:14px;padding:4px 0;">Prix</td>
                    <td style="text-align:right;font-weight:700;color:#2C3E50;font-size:14px;">{{ $price ?? '—' }} {{ $currency ?? 'XOF' }}/mois</td>
                </tr>
                <tr>
                    <td style="color:#5D6D7E;font-size:14px;padding:4px 0;">Utilisateurs</td>
                    <td style="text-align:right;font-weight:600;color:#2C3E50;font-size:14px;">{{ $max_users ?? '—' }} utilisateurs</td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 16px;color:#5D6D7E;font-size:13px;">
    Vos données sont conservées pendant 7 jours après expiration.
    Au-delà, l'accès passera en lecture seule puis les données seront archivées.
</p>
@endsection

@section('cta_secondary', 'Accéder à la facturation')
@section('cta_secondary_url', ($app_url ?? config('app.url')) . '/billing')

@section('footer_note')
Besoin d'aide pour renouveler ? Contactez-nous sur WhatsApp :
<a href="https://wa.me/{{ config('app.whatsapp', '2250700000000') }}" style="color:#2E86C1;">+225 07 00 000 000</a>
ou par email : <a href="mailto:commercial@ibig-soft.ci" style="color:#2E86C1;">commercial@ibig-soft.ci</a>
@endsection
