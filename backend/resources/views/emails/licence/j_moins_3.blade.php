{{--
  J-3 — sections 5.4 et 8.6.
  Corps prescrit : ce qui se ferme à la fin (export, multi-utilisateur, API,
  SARA), ce qui reste ouvert (les données), lien vers les formules.
  La liste de ce qui se ferme n'est PAS recopiée ici : elle est lue dans
  licence.config.json (gratuit.exclus) et passée en $ferme. Le jour où le palier
  gratuit change, cet e-mail change avec lui.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Il vous reste {{ $jours_restants }} jours d'essai</h2>

<p>Bonjour {{ $destinataire_nom }},</p>

<p>L'essai de <strong>{{ $org_nom }}</strong> sur la formule <strong>{{ $formule }}</strong> se termine
le <strong>{{ $date_fin }}</strong>. Voici, très concrètement, ce qui change ce jour-là.</p>

<table role="presentation" width="100%" style="background:#f0fdf4;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <strong style="color:#15803d;">Ce qui reste ouvert</strong>
  <p style="margin:8px 0 0;">Vos données. Toutes. Votre espace bascule en
  <strong>{{ $palier_gratuit }}</strong> : {{ $plafond_resume }} restent modifiables, le reste
  passe en lecture seule — visible, consultable, jamais masqué ni supprimé.</p>
</td></tr></table>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <strong style="color:#9333EA;">Ce qui se ferme</strong>
  <ul style="padding-left:20px;margin:8px 0 0;">
    @foreach ($ferme as $fonction)
      <li>{{ $fonction }}</li>
    @endforeach
  </ul>
</td></tr></table>

<p>Activer une formule payante rouvre l'ensemble immédiatement, sans rien réimporter.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_formules }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Voir les formules</a></td></tr></table>

<p style="color:#6b7280;font-size:13px;margin:0;">Un doute sur la formule à choisir&nbsp;? Répondez à ce message,
ou écrivez-nous sur WhatsApp au <a href="{{ $whatsapp_lien }}" style="color:#9333EA;">{{ $whatsapp_numero }}</a>.</p>

@endsection
