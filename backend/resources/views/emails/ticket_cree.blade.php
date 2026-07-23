@extends('emails.layout')

@section('subject', "Votre demande #{$ticket_number} a été enregistrée — IBIG SECRETIS Support")
@section('preheader', "Ticket #{$ticket_number} créé. Délai de traitement estimé : {$sla_label ?? '48h'}.")
@section('header_label', 'Support')
@section('header_title', "Ticket #{$ticket_number} créé")

@section('cta_primary', 'Suivre le ticket')
@section('cta_primary_url', ($app_url ?? config('app.url')) . '/support/tickets/' . ($ticket_id ?? ''))

@section('body')
<p style="margin:0 0 16px;">Bonjour <strong>{{ $user_name }}</strong>,</p>

<p style="margin:0 0 16px;">
    Votre demande de support a bien été enregistrée. Notre équipe va prendre en charge votre demande.
</p>

{{-- Détails ticket --}}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border:1px solid #EBF0F5;border-radius:8px;overflow:hidden;margin:20px 0;">
    <tr style="background-color:#1A3A5C;">
        <td colspan="2" style="padding:12px 20px;">
            <span style="color:#FFFFFF;font-weight:700;">Ticket #{{ $ticket_number }}</span>
            <span style="float:right;color:#7FB3D3;font-size:12px;">{{ now()->format('d/m/Y H:i') }}</span>
        </td>
    </tr>
    @foreach([
        ['Objet', $ticket_subject ?? '—'],
        ['Catégorie', ucfirst($ticket_category ?? '—')],
        ['Priorité', ucfirst($ticket_priority ?? '—')],
        ['Statut', 'Ouvert'],
        ['Délai estimé', $sla_label ?? '48 heures ouvrables'],
    ] as $row)
    <tr>
        <td style="padding:10px 20px;color:#5D6D7E;font-size:14px;border-bottom:1px solid #F4F6F8;width:40%;">{{ $row[0] }}</td>
        <td style="padding:10px 20px;font-weight:600;color:#2C3E50;font-size:14px;border-bottom:1px solid #F4F6F8;">
            @if($row[0] === 'Priorité')
                @php
                    $priority_colors = ['low' => '#27AE60', 'medium' => '#F39C12', 'high' => '#E67E22', 'urgent' => '#E74C3C'];
                    $p = strtolower($ticket_priority ?? 'medium');
                @endphp
                <span style="color:{{ $priority_colors[$p] ?? '#F39C12' }};font-weight:700;">{{ $row[1] }}</span>
            @else
                {{ $row[1] }}
            @endif
        </td>
    </tr>
    @endforeach
</table>

<p style="margin:16px 0;padding:16px;background-color:#EAF7FB;border-left:4px solid #2E86C1;border-radius:4px;font-size:14px;color:#2C3E50;">
    💬 <strong>SARA</strong> peut répondre à vos questions simples immédiatement.
    Pour des problèmes techniques complexes, un agent humain prend le relais.
</p>

<p style="margin:0;font-size:14px;color:#5D6D7E;">
    Vous serez notifié par email à chaque mise à jour de votre ticket.
</p>
@endsection

@section('footer_note')
Pour ajouter des informations à ce ticket, répondez directement à cet email
ou accédez au portail support : <a href="{{ ($app_url ?? config('app.url')) . '/support' }}" style="color:#2E86C1;">support.ibig-secretis.ci</a>
@endsection
