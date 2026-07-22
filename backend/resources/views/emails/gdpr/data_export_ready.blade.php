<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vos données sont disponibles – SECRETIS</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .header { background: #1a56db; color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
        .header p { margin: 6px 0 0; opacity: .85; font-size: 14px; }
        .body { padding: 32px; color: #374151; line-height: 1.6; }
        .body h2 { font-size: 18px; color: #111; margin-top: 0; }
        .btn { display: inline-block; background: #1a56db; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #92400e; margin: 20px 0; }
        .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .footer a { color: #1a56db; text-decoration: none; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>SECRETIS · Export de vos données</h1>
        <p>Règlement (UE) 2016/679 – Article 20</p>
    </div>
    <div class="body">
        <h2>Bonjour {{ $subjectName }},</h2>

        <p>Suite à votre demande du <strong>{{ \Carbon\Carbon::parse($requestedAt)->format('d/m/Y') }}</strong>,
        votre export de données personnelles est prêt.</p>

        <p>Cliquez sur le bouton ci-dessous pour télécharger votre fichier (ZIP) :</p>

        <a href="{{ $downloadUrl }}" class="btn">Télécharger mes données</a>

        <div class="warning">
            <strong>⏰ Attention :</strong> Ce lien est valable <strong>48 heures</strong>
            et expirera le {{ \Carbon\Carbon::parse($expiresAt)->format('d/m/Y à H\hi') }}.
        </div>

        <p><strong>Contenu de l'archive :</strong></p>
        <ul>
            <li>Votre profil utilisateur</li>
            <li>Vos événements et réunions</li>
            <li>Vos tâches et projets</li>
            <li>Vos courriers et documents</li>
            <li>Vos messages internes</li>
            <li>Votre historique d'activité</li>
            <li>Vos consentements enregistrés</li>
        </ul>

        <p>Si vous n'avez pas effectué cette demande, contactez immédiatement notre DPO :
        <a href="mailto:dpo@ibig.ci">dpo@ibig.ci</a></p>
    </div>
    <div class="footer">
        <p>IBIG SECRETIS · Responsable de traitement : {{ $orgName }}<br>
        DPO : <a href="mailto:dpo@ibig.ci">dpo@ibig.ci</a> · <a href="{{ config('app.url') }}/privacy">Politique de confidentialité</a></p>
        <p>Cet email a été envoyé automatiquement en réponse à votre demande RGPD #{{ $requestId }}.</p>
    </div>
</div>
</body>
</html>
