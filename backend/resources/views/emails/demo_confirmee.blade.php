@extends('emails.layout')

@section('subject', 'Votre demande de démonstration SECRETIS a été reçue')
@section('preheader', "Nous avons bien reçu votre demande. Notre équipe vous contacte sous 48h.")
@section('header_label', 'Démonstration')
@section('header_title', 'Demande de démonstration reçue ✓')

@section('cta_primary', 'Suivre ma demande')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/demo/status/' . ($demo_token ?? ''))

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $contact_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Nous avons bien reçu votre demande de démonstration pour <strong>IBIG SECRETIS</strong>.
    Notre équipe commerciale vous contactera dans les <strong>48 heures ouvrables</strong>.
</p>

{{-- Récapitulatif --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EBF0F5;border-radius:8px;overflow:hidden;margin:20px 0;">
    <tr style="background-color:#EBF5FB;">
        <td colspan="2" style="padding:12px 20px;font-weight:700;color:#1A3A5C;font-size:14px;border-bottom:1px solid #EBF0F5;">
            Récapitulatif de votre demande
        </td>
    </tr>
    @foreach([
        ['Nom', $contact_name ?? '—'],
        ['Entreprise', $company_name ?? '—'],
        ['Email', $contact_email ?? '—'],
        ['Téléphone', $contact_phone ?? '—'],
        ['Taille entreprise', $company_size ?? '—'],
        ['Modules d\'intérêt', implode(', ', $modules_interest ?? ['Tous les modules'])],
        ['Date souhaitée', $preferred_date ?? 'Dès que possible'],
    ] as $row)
    <tr>
        <td style="padding:9px 20px;color:#5D6D7E;font-size:13px;border-bottom:1px solid #F4F6F8;width:40%;">{{ $row[0] }}</td>
        <td style="padding:9px 20px;color:#2C3E50;font-size:13px;border-bottom:1px solid #F4F6F8;">{{ $row[1] }}</td>
    </tr>
    @endforeach
</table>

<p style="margin:0 0 16px;padding:16px;background-color:#EAF7FB;border-left:4px solid #2E86C1;border-radius:4px;font-size:14px;color:#2C3E50;">
    💬 <strong>SARA</strong> peut répondre à vos questions en attendant la démonstration.
    Visitez <a href="{{ config('app.url') }}" style="color:#2E86C1;">ibig-secretis.ci</a> pour en savoir plus.
</p>

<p style="margin:0;color:#5D6D7E;font-size:14px;">
    À très bientôt,<br>
    <strong>L'équipe commerciale IBIG Soft</strong>
</p>
@endsection

@section('footer_note')
Numéro de référence : <strong>{{ $demo_reference ?? 'DEMO-' . date('Y-m-d') }}</strong>
— Soumis le {{ now()->format('d/m/Y à H:i') }}
@endsection
