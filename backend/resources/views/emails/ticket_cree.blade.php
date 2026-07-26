@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Ticket reçu — nous sommes dessus 🎫</h2>
<p>Bonjour {{ $user_name }},</p>
<p>Votre demande de support a bien été enregistrée :</p>
<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.9;">
  <strong>Ticket :</strong> {{ $ticket_number }}<br>
  <strong>Objet :</strong> {{ $ticket_subject }}<br>
  <strong>Catégorie :</strong> {{ $ticket_category }} — priorité {{ $ticket_priority }}<br>
  <strong>Délai de première réponse :</strong> {{ $sla_label }}
</td></tr></table>
<p>Vous serez notifié par email à chaque réponse de notre équipe.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Suivre mon ticket</a></td></tr></table>

@endsection
