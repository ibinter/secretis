@extends('emails.layout')

@section('subject', "Bienvenue sur IBIG SECRETIS — votre essai de {$trial_days} jours est activé")
@section('preheader', "Votre espace {$org_name} est prêt. Découvrez SECRETIS ERP dès maintenant.")
@section('header_label', 'Bienvenue')
@section('header_title', "Bienvenue, {$user_name} 🎉")

@section('cta_primary', 'Ouvrir mon espace SECRETIS')
@section('cta_primary_url', $app_url ?? config('app.url'))

@section('cta_secondary', 'Guide de démarrage rapide')
@section('cta_secondary_url', ($app_url ?? config('app.url')) . '/docs/start')

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Votre espace <strong>SECRETIS ERP</strong> est prêt pour <strong>{{ $org_name }}</strong>.
    Votre essai gratuit de <strong>{{ $trial_days }} jours</strong> est activé — sans engagement, sans carte bancaire.
</p>

{{-- 3 premières étapes --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
    <tr>
        <td style="background-color:#EBF5FB;border-radius:8px;padding:20px 24px;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1A3A5C;text-transform:uppercase;letter-spacing:1px;">
                3 premières choses à faire
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                    <td style="padding:8px 0;vertical-align:top;width:32px;">
                        <span style="display:inline-block;width:24px;height:24px;background:#F39C12;border-radius:50%;text-align:center;line-height:24px;color:#FFF;font-weight:700;font-size:13px;">1</span>
                    </td>
                    <td style="padding:8px 0 8px 8px;vertical-align:top;">
                        <strong style="color:#1A3A5C;">Configurer votre organisation</strong><br>
                        <span style="color:#5D6D7E;font-size:13px;">Logo, informations légales, départements</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 0;vertical-align:top;width:32px;">
                        <span style="display:inline-block;width:24px;height:24px;background:#F39C12;border-radius:50%;text-align:center;line-height:24px;color:#FFF;font-weight:700;font-size:13px;">2</span>
                    </td>
                    <td style="padding:8px 0 8px 8px;vertical-align:top;">
                        <strong style="color:#1A3A5C;">Inviter votre équipe</strong><br>
                        <span style="color:#5D6D7E;font-size:13px;">Ajoutez vos collaborateurs et définissez leurs rôles</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px 0;vertical-align:top;width:32px;">
                        <span style="display:inline-block;width:24px;height:24px;background:#F39C12;border-radius:50%;text-align:center;line-height:24px;color:#FFF;font-weight:700;font-size:13px;">3</span>
                    </td>
                    <td style="padding:8px 0 8px 8px;vertical-align:top;">
                        <strong style="color:#1A3A5C;">Explorer les modules</strong><br>
                        <span style="color:#5D6D7E;font-size:13px;">Agenda, GED, Réunions, RH, Comptabilité…</span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>

<p style="margin:0 0 16px;padding:16px;background-color:#FEF9E7;border-left:4px solid #F39C12;border-radius:4px;font-size:14px;">
    💬 <strong>SARA</strong> est disponible pour vous aider à tout moment. Cliquez sur l'icône SARA en bas à droite de votre espace pour poser vos questions.
</p>

<p style="margin:0;">
    L'équipe <strong>IBIG Soft</strong> est ravie de vous accueillir.<br>
    Bonne découverte !
</p>
@endsection

@section('footer_note')
Vous recevez cet email car vous venez de créer un compte sur IBIG SECRETIS.
Si vous n'êtes pas à l'origine de cette inscription, veuillez ignorer ce message.
Votre essai expire le <strong>{{ now()->addDays($trial_days)->format('d/m/Y') }}</strong>.
@endsection
