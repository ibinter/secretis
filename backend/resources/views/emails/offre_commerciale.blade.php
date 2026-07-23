@extends('emails.layout')

@section('subject', 'Votre offre personnalisée SECRETIS est disponible')
@section('preheader', "Notre équipe a préparé une offre sur mesure pour {{ $org_name }}. Valable {{ $validity_days ?? 30 }} jours.")
@section('header_label', 'Offre commerciale')
@section('header_title', 'Votre offre personnalisée est prête')

@section('cta_primary', 'Voir mon offre')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/offers/' . ($offer_token ?? ''))

@section('cta_secondary', 'Accepter l\'offre')
@section('cta_secondary_url', ($app_url ?? config('app.url')) . '/offers/' . ($offer_token ?? '') . '/accept')

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Notre équipe IBIG Soft a préparé une offre commerciale personnalisée pour <strong>{{ $org_name }}</strong>.
</p>

{{-- Résumé de l'offre --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:2px solid #2E86C1;border-radius:8px;overflow:hidden;margin:20px 0;">
    <tr style="background-color:#2E86C1;">
        <td colspan="2" style="padding:14px 20px;font-weight:700;color:#FFFFFF;font-size:16px;">
            {{ $offer_title ?? 'Offre SECRETIS ' . ($plan_name ?? 'PRO') }}
        </td>
    </tr>
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;width:45%;">Plan</td>
        <td style="padding:10px 20px;font-weight:700;color:#1A3A5C;font-size:14px;border-bottom:1px solid #F4F6F8;">{{ $plan_name ?? '—' }}</td>
    </tr>
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;">Prix mensuel</td>
        <td style="padding:10px 20px;font-weight:700;color:#1A3A5C;font-size:14px;border-bottom:1px solid #F4F6F8;">{{ number_format($monthly_price ?? 0, 0, ',', ' ') }} {{ $currency ?? 'XOF' }}/mois</td>
    </tr>
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;">Durée</td>
        <td style="padding:10px 20px;font-weight:600;color:#2C3E50;font-size:14px;border-bottom:1px solid #F4F6F8;">{{ $duration ?? '12 mois' }}</td>
    </tr>
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;">Utilisateurs</td>
        <td style="padding:10px 20px;font-weight:600;color:#2C3E50;font-size:14px;border-bottom:1px solid #F4F6F8;">{{ $max_users ?? '—' }} utilisateurs</td>
    </tr>
    @if(!empty($discount_percent))
    <tr style="background-color:#EAF7EA;">
        <td style="padding:10px 20px;color:#27AE60;font-size:14px;font-weight:600;border-bottom:1px solid #F4F6F8;">Remise accordée</td>
        <td style="padding:10px 20px;font-weight:700;color:#27AE60;font-size:14px;border-bottom:1px solid #F4F6F8;">-{{ $discount_percent }}%</td>
    </tr>
    @endif
    <tr style="background-color:#EBF5FB;">
        <td style="padding:14px 20px;font-weight:700;color:#1A3A5C;font-size:15px;">TOTAL</td>
        <td style="padding:14px 20px;font-weight:700;color:#1A3A5C;font-size:20px;">{{ number_format($total_price ?? 0, 0, ',', ' ') }} {{ $currency ?? 'XOF' }}</td>
    </tr>
</table>

@if(!empty($included_modules))
<p style="margin:0 0 8px;font-weight:600;color:#1A3A5C;">Modules inclus :</p>
<p style="margin:0 0 20px;font-size:14px;color:#2C3E50;">{{ implode(' · ', $included_modules) }}</p>
@endif

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
    <tr>
        <td style="background-color:#FEF9E7;border:1px solid #F39C12;border-radius:6px;padding:12px 16px;">
            <p style="margin:0;font-size:13px;color:#8E6C00;">
                ⏳ Cette offre est valable jusqu'au <strong>{{ $offer_expires_at ?? now()->addDays($validity_days ?? 30)->format('d/m/Y') }}</strong>.
            </p>
        </td>
    </tr>
</table>

<p style="margin:16px 0 0;font-size:14px;color:#5D6D7E;">
    Questions ? Contactez directement votre commercial IBIG Soft :<br>
    <a href="mailto:{{ $commercial_email ?? 'commercial@ibig-soft.ci' }}" style="color:#2E86C1;">{{ $commercial_email ?? 'commercial@ibig-soft.ci' }}</a>
    @if(!empty($commercial_phone))
    | <a href="tel:{{ $commercial_phone }}" style="color:#2E86C1;">{{ $commercial_phone }}</a>
    @endif
</p>
@endsection

@section('footer_note')
Cette offre a été préparée spécifiquement pour {{ $org_name }}.
Référence offre : <strong>{{ $offer_reference ?? 'OFF-' . date('Y') . '-XXXX' }}</strong>
@endsection
