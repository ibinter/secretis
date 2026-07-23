@extends('emails.layout')

@section('subject', "Reçu de paiement — {$plan_name} SECRETIS")
@section('preheader', "Votre paiement de {$amount} {$currency} a été validé. Merci !")
@section('header_label', 'Paiement confirmé')
@section('header_title', 'Paiement reçu — Merci !')

@section('cta_primary', 'Ouvrir mon espace SECRETIS')
@section('cta_primary_url', $app_url ?? config('app.url'))

@section('cta_secondary', 'Télécharger le reçu PDF')
@section('cta_secondary_url', ($app_url ?? config('app.url')) . '/billing/receipts/' . ($payment_id ?? ''))

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 24px;">
    Votre paiement a été validé avec succès. Voici le récapitulatif de votre transaction.
</p>

{{-- Reçu --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EBF0F5;border-radius:8px;overflow:hidden;margin-bottom:24px;">
    <tr style="background-color:#1A3A5C;">
        <td colspan="2" style="padding:14px 20px;">
            <span style="color:#FFFFFF;font-weight:700;font-size:15px;">Reçu N° {{ $invoice_number ?? 'REC-' . date('Y') . '-XXXX' }}</span>
            <span style="float:right;color:#7FB3D3;font-size:13px;">{{ $paid_at ?? now()->format('d/m/Y') }}</span>
        </td>
    </tr>
    @foreach([
        ['Organisation', $org_name ?? '—'],
        ['Plan', $plan_name ?? '—'],
        ['Période', ($period_start ?? '—') . ' → ' . ($period_end ?? '—')],
        ['Méthode de paiement', $payment_method ?? '—'],
        ['Référence', $payment_reference ?? '—'],
        ['Utilisateurs inclus', ($max_users ?? '—') . ' utilisateurs'],
    ] as $row)
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;width:45%;">{{ $row[0] }}</td>
        <td style="padding:10px 20px;font-weight:600;color:#2C3E50;font-size:14px;border-bottom:1px solid #F4F6F8;">{{ $row[1] }}</td>
    </tr>
    @endforeach
    <tr style="background-color:#EBF5FB;">
        <td style="padding:14px 20px;font-weight:700;color:#1A3A5C;font-size:16px;">TOTAL PAYÉ</td>
        <td style="padding:14px 20px;font-weight:700;color:#1A3A5C;font-size:20px;">{{ number_format($amount, 0, ',', ' ') }} {{ $currency ?? 'XOF' }}</td>
    </tr>
</table>

{{-- Modules actifs --}}
@if(!empty($active_modules))
<p style="margin:0 0 8px;font-weight:600;color:#1A3A5C;">Modules actifs sur votre abonnement :</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:24px;">
    @foreach(array_chunk($active_modules, 2) as $chunk)
    <tr>
        @foreach($chunk as $module)
        <td style="padding:4px 8px;font-size:13px;color:#2C3E50;">
            <span style="color:#27AE60;">✓</span> {{ $module }}
        </td>
        @endforeach
    </tr>
    @endforeach
</table>
@endif

<p style="margin:0;color:#27AE60;font-weight:600;font-size:14px;">
    ✅ Votre abonnement est actif jusqu'au <strong>{{ $period_end ?? '—' }}</strong>.
</p>
@endsection

@section('footer_note')
Ce reçu est généré automatiquement et vaut justificatif de paiement.
Pour toute question de facturation : <a href="mailto:facturation@ibig-soft.ci">facturation@ibig-soft.ci</a>
@endsection
