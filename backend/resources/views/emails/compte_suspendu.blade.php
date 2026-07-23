@extends('emails.layout')

@section('subject', 'Information importante concernant votre compte SECRETIS')
@section('preheader', 'Une action est requise concernant votre compte IBIG SECRETIS.')
@section('header_label', 'Compte')
@section('header_title', 'Information importante concernant votre compte')

@section('cta_primary', 'Contacter le support')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/support/contact')

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Nous vous contactons concernant votre compte SECRETIS associé à
    <strong>{{ $org_name }}</strong>.
</p>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
    <tr>
        <td style="background-color:#FDEDEC;border:1px solid #E74C3C;border-radius:8px;padding:20px;">
            <p style="margin:0 0 8px;font-weight:700;color:#C0392B;font-size:15px;">
                ⚠️ Accès temporairement suspendu
            </p>
            <p style="margin:0;color:#5D6D7E;font-size:14px;line-height:1.6;">
                L'accès à votre espace SECRETIS a été temporairement suspendu.
                Vos données sont préservées et sécurisées.
                Contactez notre support pour régulariser votre situation.
            </p>
        </td>
    </tr>
</table>

<p style="margin:0 0 16px;font-size:14px;color:#2C3E50;line-height:1.6;">
    Notre équipe est disponible pour vous accompagner dans la résolution de cette situation dans les plus brefs délais.
</p>

{{-- Contacts --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EBF0F5;border-radius:8px;overflow:hidden;margin:20px 0;">
    <tr style="background-color:#F8FAFB;">
        <td colspan="2" style="padding:12px 20px;font-weight:700;color:#1A3A5C;font-size:13px;border-bottom:1px solid #EBF0F5;">
            CONTACTEZ-NOUS
        </td>
    </tr>
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;width:35%;">Email</td>
        <td style="padding:10px 20px;font-size:14px;">
            <a href="mailto:support@ibig-soft.ci" style="color:#2E86C1;">support@ibig-soft.ci</a>
        </td>
    </tr>
    <tr style="background-color:#F8FAFB;">
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;">WhatsApp</td>
        <td style="padding:10px 20px;font-size:14px;">
            <a href="https://wa.me/{{ config('app.whatsapp', '2250700000000') }}" style="color:#2E86C1;">+225 07 00 000 000</a>
        </td>
    </tr>
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;">Horaires</td>
        <td style="padding:10px 20px;font-size:14px;color:#2C3E50;">Lun–Ven 8h–18h (GMT+0)</td>
    </tr>
</table>
@endsection

@section('footer_note')
Référence du compte : <strong>{{ $org_id ?? 'N/A' }}</strong>.
Cet email a été envoyé à <strong>{{ $user_email }}</strong>.
@endsection
