{{--
  J-1 — sections 5.4 et 8.6.
  Ton PRESCRIT : « rassurer d'abord, proposer ensuite. Aucune urgence
  artificielle. » D'où l'ordre des blocs : la conservation des données vient
  avant toute proposition commerciale, et le bouton d'action n'apparaît qu'à la
  fin. Pas de compte à rebours, pas de « URGENT », pas de majuscules.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Vos données sont conservées</h2>

<p>Bonjour {{ $destinataire_nom }},</p>

<p>L'essai de <strong>{{ $org_nom }}</strong> se termine demain, le <strong>{{ $date_fin }}</strong>.
Le principal tient en une phrase&nbsp;: <strong>vous n'avez rien à faire pour garder vos données.</strong></p>

<table role="presentation" width="100%" style="background:#f0fdf4;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <p style="margin:0;">Demain, votre espace bascule simplement en <strong>{{ $palier_gratuit }}</strong>.
  Il reste ouvert, sans limite de durée et sans carte bancaire. Vos courriers, vos
  documents et vos contacts restent en place&nbsp;: {{ $plafond_resume }} restent modifiables,
  le reste est consultable en lecture seule. Rien n'est masqué, rien n'est supprimé.</p>
</td></tr></table>

<p>Ce qui se met en pause, ce sont les fonctions avancées de la formule
<strong>{{ $formule }}</strong>&nbsp;:</p>

<ul style="padding-left:20px;color:#4b5563;">
  @foreach ($ferme as $fonction)
    <li>{{ $fonction }}</li>
  @endforeach
</ul>

<p>Si elles vous sont utiles au quotidien, activer une formule les rouvre immédiatement,
sur les mêmes données. Si vous préférez rester en {{ $palier_gratuit }}, c'est un choix
parfaitement valable&nbsp;: l'espace reste le vôtre.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_formules }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Voir les formules</a></td></tr></table>

<p style="color:#6b7280;font-size:13px;margin:0;">Besoin d'un peu plus de temps pour décider&nbsp;?
Écrivez-nous&nbsp;: <a href="mailto:{{ $mail_solution }}" style="color:#9333EA;">{{ $mail_solution }}</a>.
Nous étudions les demandes de prolongation au cas par cas.</p>

@endsection
