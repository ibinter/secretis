@extends('emails.layout')

@section('subject', 'Réinitialisation de votre mot de passe SECRETIS')
@section('preheader', 'Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire dans 60 minutes.')
@section('header_label', 'Sécurité')
@section('header_title', 'Réinitialisation du mot de passe')

@section('cta_primary', 'Réinitialiser mon mot de passe')
@section('cta_primary_url', $reset_url)

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Vous avez demandé à réinitialiser votre mot de passe pour votre compte SECRETIS
    (<strong>{{ $user_email }}</strong>).
</p>

<p style="margin:0 0 24px;">
    Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
    Ce lien est valide pendant <strong>60 minutes</strong> et ne peut être utilisé qu'une seule fois.
</p>

{{-- Lien de secours --}}
<p style="margin:24px 0 8px;font-size:13px;color:#5D6D7E;">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
</p>
<p style="margin:0 0 24px;word-break:break-all;font-size:12px;background-color:#F4F6F8;padding:12px;border-radius:4px;color:#2C3E50;">
    {{ $reset_url }}
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
    <tr>
        <td style="background-color:#FDEDEC;border:1px solid #E74C3C;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#C0392B;line-height:1.6;">
                🔒 Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                Votre mot de passe actuel reste inchangé.
                Si vous pensez que votre compte est compromis, contactez immédiatement le support.
            </p>
        </td>
    </tr>
</table>
@endsection

@section('footer_note')
Ce lien expire le <strong>{{ now()->addMinutes(60)->format('d/m/Y à H:i') }}</strong>.
Pour des raisons de sécurité, ce lien ne peut être utilisé qu'une seule fois.
@endsection
