{{--
  J+7 — sections 5.4 et 8.6.
  « Relance commerciale UNIQUE, proposition d'échange de 15 minutes. »
  RÈGLE : aucune relance après J+7. Le compte du palier gratuit reste ouvert
  à vie. La contrainte d'unicité (license_id, jalon) de la table licence_emails
  rend un second envoi impossible, même si la commande est relancée des mois plus
  tard — ce n'est pas une politesse, c'est une garantie technique.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Une question sur {{ $solution }} ?</h2>

<p>Bonjour {{ $destinataire_nom }},</p>

<p>Votre espace <strong>{{ $org_nom }}</strong> est en {{ $palier_gratuit }} depuis une semaine.
Il le restera aussi longtemps que vous le souhaitez&nbsp;: ce message n'annonce
aucune échéance et n'attend aucune réponse obligatoire.</p>

<p>Nous écrivons simplement une fois, pour une raison&nbsp;: c'est souvent à ce
moment-là qu'une question reste en suspens — une reprise de données, un besoin
de plusieurs utilisateurs, une intégration, ou tout bonnement le prix.</p>

<p>Si l'un de ces points vous concerne, proposons-nous <strong>un échange de
15&nbsp;minutes</strong>. Pas de démonstration commerciale&nbsp;: vos questions, nos réponses,
et vous décidez ensuite.</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <p style="margin:0;">Répondez simplement à ce message avec deux créneaux qui vous
  arrangent, ou joignez-nous directement sur WhatsApp au
  <a href="{{ $whatsapp_lien }}" style="color:#9333EA;">{{ $whatsapp_numero }}</a>.</p>
</td></tr></table>

<p>Et si tout va bien&nbsp;: rien à faire. Votre espace, vos données et votre plafond
de {{ $plafond_resume }} restent en place. <strong>C'est notre dernier message de ce
type</strong> — nous ne relancerons plus.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_formules }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Voir les formules</a></td></tr></table>

@endsection
