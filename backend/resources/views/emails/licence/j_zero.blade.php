{{--
  J0 — « bascule en Découverte + e-mail de confirmation » (sections 5.4, 5.6, 8.6).
  Corps prescrit : état exact du compte, ce qui est modifiable, ce qui est en
  lecture seule, comment tout récupérer.
  Le message d'état est celui de la section 8.4 (« APRÈS ESSAI »), transmis par
  le moteur dans $banniere : la même phrase que celle affichée dans
  l'application, pour qu'un écran et un e-mail ne racontent jamais deux règles.
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Votre espace est passé en {{ $palier_gratuit }}</h2>

<p>Bonjour {{ $destinataire_nom }},</p>

<p>L'essai de <strong>{{ $org_nom }}</strong> s'est terminé le <strong>{{ $date_fin }}</strong>.
Voici l'état exact de votre compte aujourd'hui.</p>

<table role="presentation" width="100%" style="background:#faf5ff;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <strong>Palier :</strong> {{ $palier_gratuit }}<br>
  <strong>Durée :</strong> sans limite de durée, sans carte bancaire<br>
  <strong>Plafond :</strong> {{ $plafond_resume }}
</td></tr></table>

<p><strong style="color:#15803d;">Ce qui est modifiable</strong> — {{ $plafond_resume }}.
Vous continuez à enregistrer, modifier et consulter dans cette limite,
mois après mois.</p>

<p><strong style="color:#b45309;">Ce qui est en lecture seule</strong> — tout ce qui dépasse ce plafond.
Ces enregistrements restent affichés, consultables et recherchables. Ils ne sont
ni masqués, ni archivés, ni supprimés&nbsp;: vous voyez exactement ce que vous
retrouverez modifiable en activant une formule.</p>

<p><strong style="color:#9333EA;">Ce qui est mis en pause</strong> — les fonctions avancées&nbsp;:</p>

<ul style="padding-left:20px;color:#4b5563;">
  @foreach ($ferme as $fonction)
    <li>{{ $fonction }}</li>
  @endforeach
</ul>

<p>Les documents que vous générez portent désormais la mention
«&nbsp;{{ $filigrane }}&nbsp;».</p>

<table role="presentation" width="100%" style="background:#f0fdf4;border-radius:8px;margin:16px 0;"><tr><td style="padding:16px 20px;font-size:14px;">
  <strong style="color:#15803d;">Comment tout récupérer</strong>
  <p style="margin:8px 0 0;">Activer une formule payante rouvre l'ensemble
  immédiatement, sur vos données actuelles. Il n'y a rien à réimporter, rien à
  ressaisir, aucune manipulation technique&nbsp;: la lecture seule se lève au moment
  de l'activation.</p>
</td></tr></table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $url_formules }}" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Voir les formules</a></td></tr></table>

<p style="color:#6b7280;font-size:13px;margin:0;">{{ $banniere }}</p>

@endsection
