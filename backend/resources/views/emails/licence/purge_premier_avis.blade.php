{{--
  J+60 après l'entrée en état expiré — section 8.8.
  Le cahier impose la phrase, à copier sans la réécrire :
    « Vos données seront supprimées le {DATE}. Réactivez votre abonnement ou
      demandez un export à support@ibigsoft.com. »
  C'est le SEUL endroit de la séquence où l'on écrit qu'une donnée sera
  supprimée — parce qu'ici c'est vrai, et qu'à ce stade prévenir est le seul
  service utile. Les cinq messages de l'essai (sections 5.4 et 8.6) ne le disent
  jamais, et pour cause : rien n'y est supprimé.
  La date vient de licenses.date_purge, dérivée de retention_jours. Elle n'est
  pas calculée ici.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Vos données sont conservées jusqu'au {{ $date_purge }}</h2>

<p>Bonjour {{ $destinataire_nom }},</p>

<p>L'abonnement de <strong>{{ $org_nom }}</strong> a pris fin le <strong>{{ $date_fin }}</strong>.
Depuis, l'espace est en <strong>lecture seule</strong>&nbsp;: tout est encore là, consultable et
recherchable, mais plus modifiable.</p>

<table role="presentation" width="100%" style="background:#fef3c7;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;color:#78350f;">
  <p style="margin:0;"><strong>Vos données seront supprimées le {{ $date_purge }}.</strong>
  Réactivez votre abonnement ou demandez un export à
  <a href="mailto:{{ $mail_support }}" style="color:#92400e;">{{ $mail_support }}</a>.</p>
</td></tr></table>

<p>Deux façons de conserver l'existant&nbsp;:</p>

<ul style="padding-left:20px;">
  <li><strong>Réactiver une formule</strong> — l'écriture se rouvre immédiatement,
  sur vos données actuelles, sans rien réimporter.</li>
  <li><strong>Demander un export</strong> — écrivez à
  <a href="mailto:{{ $mail_support }}" style="color:#9333EA;">{{ $mail_support }}</a>
  depuis l'adresse d'administration de l'espace&nbsp;; nous vous transmettons vos
  données avant l'échéance.</li>
</ul>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_formules }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Réactiver mon abonnement</a></td></tr></table>

<p style="color:#6b7280;font-size:13px;margin:0;">{{ $banniere }}</p>

@endsection
