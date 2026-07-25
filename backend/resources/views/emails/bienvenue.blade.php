@extends('emails.layout')

@section('content')

<h2 style="color:#9333EA;margin:0 0 14px;">Bienvenue {{ $user_name }} ! 🎉</h2>
<p>Votre compte <strong>{{ $org_name }}</strong> est activé sur SECRETIS ERP, avec un <strong>essai gratuit de {{ $trial_days }} jours</strong>, sans engagement.</p>
<p>Dès maintenant, vous pouvez :</p>
<ul style="padding-left:20px;">
  <li>Enregistrer vos courriers entrants et sortants,</li>
  <li>Gérer vos visiteurs, réunions et agendas,</li>
  <li>Centraliser vos documents (GED) en toute sécurité,</li>
  <li>Inviter vos collaborateurs.</li>
</ul>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto;"><tr><td style="background:#9333EA;border-radius:8px;"><a href="{{ $app_url }}/login" style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px;">Accéder à mon espace</a></td></tr></table>
<p style="color:#6b7280;font-size:13px;">Besoin d'aide pour démarrer ? Notre assistante IA <strong>SARA</strong> est disponible directement dans l'application, et notre équipe répond à <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;">secretis@ibigsoft.com</a>.</p>

@endsection
