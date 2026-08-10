{{--
  J+83 après l'entrée en état expiré — section 8.8 : « même message, dernier
  rappel ». La phrase officielle est donc rigoureusement identique à celle du
  premier avis ; seul l'entourage signale qu'il s'agit du dernier envoi.
  Une reformulation donnerait l'impression que la règle a changé entre les deux
  messages — exactement ce que la section 12.8 cherche à éliminer.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Dernier rappel — vos données jusqu'au {{ $date_purge }}</h2>

<p>Bonjour {{ $destinataire_nom }},</p>

<p>Nous vous avons écrit une première fois au sujet de l'espace
<strong>{{ $org_nom }}</strong>, en lecture seule depuis la fin de l'abonnement le
<strong>{{ $date_fin }}</strong>. Voici le dernier rappel avant l'échéance.</p>

<table role="presentation" width="100%" style="background:#fef3c7;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;color:#78350f;">
  <p style="margin:0;"><strong>Vos données seront supprimées le {{ $date_purge }}.</strong>
  Réactivez votre abonnement ou demandez un export à
  <a href="mailto:{{ $mail_support }}" style="color:#92400e;">{{ $mail_support }}</a>.</p>
</td></tr></table>

<p>Après cette date, nous ne pourrons plus restituer ces données&nbsp;: c'est la
raison de ce second message, et il n'y en aura pas d'autre.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_formules }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Réactiver mon abonnement</a></td></tr></table>

<p style="color:#6b7280;font-size:13px;margin:0;">Une demande d'export reste possible jusqu'au
{{ $date_purge }} en écrivant à
<a href="mailto:{{ $mail_support }}" style="color:#9333EA;">{{ $mail_support }}</a>.</p>

@endsection
