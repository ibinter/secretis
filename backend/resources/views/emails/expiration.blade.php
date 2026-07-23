@extends('emails.layout')

@php $is_trial = $is_trial ?? false; @endphp

@section('subject', "Votre " . ($is_trial ? 'essai' : 'abonnement') . " SECRETIS a expiré — réactivez maintenant")
@section('preheader', "Votre accès est en période de grâce. Réactivez dans les 7 jours pour éviter tout archivage.")
@section('header_label', 'Compte expiré')
@section('header_title', ($is_trial ? 'Votre essai' : 'Votre abonnement') . " a expiré")

@section('cta_primary', 'Réactiver mon abonnement')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/billing/reactivate')

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Votre {{ $is_trial ? 'essai gratuit' : 'abonnement' }} SECRETIS pour <strong>{{ $org_name }}</strong>
    a expiré le <strong>{{ $expired_at ?? now()->format('d/m/Y') }}</strong>.
</p>

{{-- Alerte période de grâce --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
    <tr>
        <td style="background-color:#FEF9E7;border:1px solid #F39C12;border-radius:8px;padding:20px;">
            <p style="margin:0 0 8px;font-weight:700;color:#E67E22;font-size:15px;">⚠️ Période de grâce — 7 jours</p>
            <p style="margin:0;color:#5D6D7E;font-size:14px;line-height:1.6;">
                Votre compte est actuellement en <strong>mode lecture seule</strong>.
                Vous pouvez consulter vos données mais pas créer ou modifier d'enregistrements.
                <br><br>
                <strong>Vos données sont conservées jusqu'au {{ $grace_until ?? now()->addDays(7)->format('d/m/Y') }}.</strong>
                Au-delà, l'accès sera suspendu et les données archivées.
            </p>
        </td>
    </tr>
</table>

{{-- Ce que vous perdez --}}
<p style="margin:16px 0 8px;font-weight:600;color:#1A3A5C;">Sans réactivation, vous perdrez :</p>
<ul style="margin:0 0 20px;padding-left:20px;color:#2C3E50;font-size:14px;line-height:1.8;">
    <li>L'accès à tous les modules SECRETIS</li>
    <li>La possibilité de créer et modifier des données</li>
    <li>Les automatisations et synchronisations actives</li>
    <li>L'accès de toute votre équipe ({{ $user_count ?? 'N' }} utilisateurs)</li>
</ul>

<p style="margin:0 0 16px;font-size:14px;color:#5D6D7E;">
    Contactez notre équipe commerciale pour un accompagnement personnalisé :<br>
    <a href="mailto:commercial@ibig-soft.ci" style="color:#2E86C1;">commercial@ibig-soft.ci</a>
</p>
@endsection

@section('footer_note')
Vous avez des questions sur votre compte ?
Contactez le support : <a href="mailto:support@ibig-soft.ci" style="color:#2E86C1;">support@ibig-soft.ci</a>
ou appelez le +225 07 00 000 000.
@endsection
