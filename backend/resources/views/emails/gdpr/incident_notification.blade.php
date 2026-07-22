<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Information importante concernant vos données – SECRETIS</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .header { background: #dc2626; color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 6px 0 0; opacity: .9; font-size: 14px; }
        .body { padding: 32px; color: #374151; line-height: 1.7; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
        .section { margin: 24px 0; }
        .section h3 { font-size: 15px; color: #111; margin: 0 0 8px; }
        .actions { background: #f0f9ff; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
        .actions ul { margin: 8px 0; padding-left: 20px; }
        .actions li { margin-bottom: 6px; font-size: 14px; }
        .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .footer a { color: #1a56db; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>Information importante concernant vos données</h1>
        <p>Notification conformément à l'article 34 du Règlement (UE) 2016/679</p>
    </div>
    <div class="body">
        <p>Bonjour,</p>

        <p>Nous vous contactons pour vous informer d'un incident de sécurité susceptible
        d'avoir affecté vos données personnelles.</p>

        <div class="alert-box">
            <strong>Incident référencé :</strong> #{{ $incidentId }}<br>
            <strong>Découvert le :</strong> {{ \Carbon\Carbon::parse($discoveredAt)->format('d/m/Y') }}<br>
            <strong>Nature :</strong> {{ $incidentTitle }}<br>
            <strong>Gravité :</strong> {{ ucfirst($severity) }}
        </div>

        <div class="section">
            <h3>Que s'est-il passé ?</h3>
            <p>{{ $description }}</p>
        </div>

        <div class="section">
            <h3>Données potentiellement concernées</h3>
            <p>{{ $dataAffected ?? 'Données de profil (nom, email) et historique d\'activité.' }}</p>
        </div>

        <div class="section">
            <h3>Ce que nous avons fait</h3>
            <p>{{ $containmentMeasures ?? 'Dès la découverte de l\'incident, nous avons pris des mesures immédiates pour le contenir et avons notifié les autorités compétentes.' }}</p>
            @if($notifiedAuthority)
            <p>Cet incident a été signalé à la CNIL le {{ \Carbon\Carbon::parse($reportedAt)->format('d/m/Y') }}
            conformément à l'article 33 du RGPD.</p>
            @endif
        </div>

        <div class="actions">
            <h3 style="margin-top:0;">Ce que vous devez faire</h3>
            <ul>
                <li>Changez votre mot de passe SECRETIS immédiatement.</li>
                <li>Activez l'authentification à deux facteurs si ce n'est pas encore fait.</li>
                <li>Vérifiez les accès récents à votre compte depuis votre profil.</li>
                <li>Soyez vigilant face aux tentatives de phishing utilisant vos informations.</li>
                @if($additionalActions ?? false)
                    @foreach($additionalActions as $action)
                    <li>{{ $action }}</li>
                    @endforeach
                @endif
            </ul>
        </div>

        <p>Si vous avez des questions ou des préoccupations, notre Délégué à la Protection des Données
        est disponible à : <a href="mailto:dpo@ibig.ci">dpo@ibig.ci</a></p>

        <p>Nous nous excusons sincèrement pour ce incident et pour tout désagrément occasionné.
        La protection de vos données est notre priorité absolue.</p>

        <p>Cordialement,<br>
        <strong>L'équipe IBIG SECRETIS</strong></p>
    </div>
    <div class="footer">
        <p>IBIG SECRETIS · <a href="{{ config('app.url') }}/privacy">Politique de confidentialité</a>
        · <a href="https://www.cnil.fr">CNIL</a></p>
        <p>Vous recevez cet email car vos données sont susceptibles d'avoir été affectées par l'incident #{{ $incidentId }}.</p>
    </div>
</div>
</body>
</html>
