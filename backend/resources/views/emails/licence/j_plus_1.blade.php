{{--
  J+1 — « e-mail de prise en main » (sections 5.4 et 8.6).
  Corps prescrit : rappel de la durée restante, 3 actions concrètes à faire en
  premier, lien vers le centre d'aide, contact WhatsApp.
  Aucune durée n'est écrite ici : $jours_restants et $essai_jours viennent du moteur.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Bienvenue {{ $destinataire_nom }}</h2>

<p>Votre espace <strong>{{ $org_nom }}</strong> est ouvert sur {{ $solution }}. Votre essai
de la formule <strong>{{ $formule }}</strong> court sur {{ $essai_jours }} jours&nbsp;: il vous en
reste <strong>{{ $jours_restants }}</strong>, jusqu'au <strong>{{ $date_fin }}</strong>.</p>

<p>Rien à installer, rien à payer. Voici les trois choses à faire en premier&nbsp;:</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <p style="margin:0 0 10px;"><strong>1. Enregistrez un courrier entrant.</strong><br>
  <span style="color:#6b7280;">C'est le geste central de {{ $solution }} : arrivée, référence, expéditeur, pièce jointe.</span></p>
  <p style="margin:0 0 10px;"><strong>2. Affectez-le à un service ou à une personne.</strong><br>
  <span style="color:#6b7280;">Vous voyez immédiatement qui doit traiter quoi, et depuis quand.</span></p>
  <p style="margin:0;"><strong>3. Invitez un collègue.</strong><br>
  <span style="color:#6b7280;">Le multi-utilisateur est ouvert pendant l'essai : c'est le bon moment pour l'essayer à deux.</span></p>
</td></tr></table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_espace }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Ouvrir mon espace</a></td></tr></table>

<p style="color:#6b7280;font-size:13px;margin:0;">
  Le centre d'aide répond à la plupart des questions&nbsp;:
  <a href="{{ $url_aide }}" style="color:#9333EA;">{{ $url_aide }}</a>.<br>
  Une question précise&nbsp;? Écrivez-nous sur WhatsApp au
  <a href="{{ $whatsapp_lien }}" style="color:#9333EA;">{{ $whatsapp_numero }}</a>,
  ou à <a href="mailto:{{ $mail_solution }}" style="color:#9333EA;">{{ $mail_solution }}</a>.
</p>

@endsection
