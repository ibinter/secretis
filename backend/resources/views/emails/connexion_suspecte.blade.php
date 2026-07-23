@extends('emails.layout')

@section('subject', 'Nouvelle connexion détectée sur votre compte SECRETIS')
@section('preheader', "Connexion depuis {{ $country ?? 'un pays inconnu' }} le {{ $login_at ?? now()->format('d/m/Y H:i') }}. Si ce n'est pas vous, agissez maintenant.")
@section('header_label', 'Alerte sécurité')
@section('header_title', 'Nouvelle connexion détectée')

@section('cta_primary', 'Vérifier mon activité')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/security/activity')

@section('cta_secondary', 'Réinitialiser mon mot de passe')
@section('cta_secondary_url', ($app_url ?? config('app.url')) . '/password/reset-request')

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Une nouvelle connexion à votre compte SECRETIS a été détectée.
    Voici les détails de cette connexion :
</p>

{{-- Détails connexion --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EBF0F5;border-radius:8px;overflow:hidden;margin:20px 0;">
    <tr style="background-color:#1A3A5C;">
        <td colspan="2" style="padding:12px 20px;">
            <span style="color:#FFFFFF;font-weight:700;font-size:14px;">Détails de la connexion</span>
        </td>
    </tr>
    @foreach([
        ['📅 Date et heure', $login_at ?? now()->format('d/m/Y à H:i')],
        ['🌍 Localisation', ($city ?? '') . ($city ? ', ' : '') . ($country ?? 'Inconnu')],
        ['🌐 Adresse IP', $ip_address ?? '—'],
        ['💻 Appareil', $device ?? 'Inconnu'],
        ['🔍 Navigateur', $browser ?? 'Inconnu'],
        ['📱 Système', $os ?? 'Inconnu'],
    ] as $row)
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;width:45%;">{{ $row[0] }}</td>
        <td style="padding:10px 20px;font-weight:600;color:#2C3E50;font-size:14px;border-bottom:1px solid #F4F6F8;">{{ $row[1] }}</td>
    </tr>
    @endforeach
</table>

{{-- Alerte si c'est suspect --}}
@if($is_suspicious ?? false)
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
    <tr>
        <td style="background-color:#FDEDEC;border:2px solid #E74C3C;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 8px;font-weight:700;color:#C0392B;font-size:15px;">
                🚨 Connexion suspecte détectée
            </p>
            <p style="margin:0;color:#5D6D7E;font-size:14px;line-height:1.6;">
                Cette connexion provient d'un pays ou appareil inhabituel.
                Si ce n'est pas vous, <strong>réinitialisez immédiatement votre mot de passe</strong>
                et contactez notre support.
            </p>
        </td>
    </tr>
</table>
@else
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
    <tr>
        <td style="background-color:#EAF7EA;border:1px solid #27AE60;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:14px;color:#1D8348;line-height:1.6;">
                ✅ Si c'est bien vous, aucune action n'est requise.
                Cette notification est envoyée pour votre sécurité.
            </p>
        </td>
    </tr>
</table>
@endif

<p style="margin:16px 0 0;font-size:14px;color:#5D6D7E;">
    🔒 <strong>Si ce n'est pas vous :</strong>
    réinitialisez immédiatement votre mot de passe et contactez notre support de sécurité à
    <a href="mailto:security@ibig-soft.ci" style="color:#E74C3C;">security@ibig-soft.ci</a>
</p>
@endsection

@section('footer_note')
Vous recevez cet email de sécurité car une nouvelle connexion a été effectuée sur votre compte.
Pour désactiver ces alertes, allez dans Paramètres → Sécurité → Alertes de connexion.
@endsection
