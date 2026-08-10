{{--
    Email de bienvenue (démarrage de l'essai 14 jours).
    Appelé par : App\Notifications\WelcomeNotification::toMail() (ligne 41) -> ->view('emails.welcome', [...])
    Variables :
      $organisationName  string  nom de l'organisation créée
      $adminName         string  nom de l'administrateur destinataire
      $trialEndsAt       string  date de fin d'essai (déjà formatée par l'appelant)
      $loginUrl          string  URL de connexion (config('app.url').'/dashboard' par défaut)
    NB : le layout affiche $unsubscribe_email ?? '' dans le pied de page (non fourni ici).
--}}
@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Bienvenue sur SECRETIS ERP</h2>

<p>Bonjour {{ $adminName ?? '' }},</p>

<p>
    Votre espace <strong>{{ $organisationName ?? 'votre organisation' }}</strong> est desormais actif.
    Vous beneficiez d'un <strong>essai gratuit de 14 jours</strong>, sans engagement et sans
    saisie de moyen de paiement.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#faf5ff;border-radius:8px;margin:18px 0;">
    <tr>
        <td style="padding:16px 20px;font-size:14px;line-height:1.9;color:#1f2937;">
            <strong>Organisation :</strong> {{ $organisationName ?? '—' }}<br>
            <strong>Administrateur :</strong> {{ $adminName ?? '—' }}<br>
            <strong>Fin de la periode d'essai :</strong> {{ $trialEndsAt ?? '—' }}
        </td>
    </tr>
</table>

<p style="margin-bottom:8px;"><strong>Pour bien demarrer :</strong></p>
<ol style="padding-left:20px;margin:0 0 16px;">
    <li>Completez la fiche de votre organisation (logo, adresse, coordonnees).</li>
    <li>Invitez vos collaborateurs et attribuez-leur les bons roles.</li>
    <li>Enregistrez vos premiers courriers entrants et sortants.</li>
    <li>Centralisez vos documents dans la GED et planifiez vos reunions.</li>
</ol>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
        <td style="background:#9333EA;border-radius:8px;">
            <a href="{{ $loginUrl ?? '#' }}"
               style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;
                      text-decoration:none;font-size:15px;">
                Acceder a mon espace
            </a>
        </td>
    </tr>
</table>

<p style="font-size:12px;color:#6b7280;text-align:center;margin:0 0 18px;word-break:break-all;">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="{{ $loginUrl ?? '#' }}" style="color:#9333EA;">{{ $loginUrl ?? '' }}</a>
</p>

<p style="color:#6b7280;font-size:13px;">
    Une question pour demarrer ? Notre assistante <strong>SARA</strong> est disponible
    directement dans l'application, et notre equipe vous repond a
    <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;">secretis@ibigsoft.com</a>.
</p>

<p style="color:#6b7280;font-size:13px;margin-bottom:0;">
    A l'issue des 14 jours, vous pourrez choisir la formule adaptee a votre structure.
    Vos donnees restent conservees pendant la periode de transition.
</p>

@endsection
