<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Accusé de réception – Demande RGPD</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .header { background: #059669; color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 22px; }
        .body { padding: 32px; color: #374151; line-height: 1.7; }
        .info-box { background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
        .info-box table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .info-box td { padding: 4px 0; }
        .info-box td:first-child { font-weight: 600; color: #065f46; width: 180px; }
        .deadline { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #1e40af; margin: 20px 0; }
        .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .footer a { color: #1a56db; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>Accusé de réception – Demande RGPD</h1>
    </div>
    <div class="body">
        <p>Bonjour <strong>{{ $subjectName }}</strong>,</p>

        <p>Nous avons bien reçu votre demande d'exercice de droits au titre du Règlement
        Général sur la Protection des Données (RGPD).</p>

        <div class="info-box">
            <table>
                <tr><td>Référence :</td><td>#{{ $requestId }}</td></tr>
                <tr><td>Type de demande :</td><td>{{ $requestTypeLabel }}</td></tr>
                <tr><td>Date de réception :</td><td>{{ \Carbon\Carbon::parse($requestedAt)->format('d/m/Y à H\hi') }}</td></tr>
                <tr><td>Organisation :</td><td>{{ $orgName }}</td></tr>
            </table>
        </div>

        <div class="deadline">
            <strong>📅 Délai légal de réponse :</strong><br>
            Conformément à l'article 12 du RGPD, nous disposons d'un délai de <strong>30 jours</strong>
            pour répondre à votre demande, soit au plus tard le
            <strong>{{ \Carbon\Carbon::parse($requestedAt)->addDays(30)->format('d/m/Y') }}</strong>.
        </div>

        <p>Si votre demande est complexe ou si vous soumettez un grand nombre de demandes,
        ce délai peut être prolongé de 2 mois supplémentaires (nous vous en informerons).</p>

        <p><strong>Que se passe-t-il ensuite ?</strong></p>
        <ol>
            <li>Notre équipe examine votre demande sous 72h ouvrées.</li>
            <li>Nous pouvons vous contacter pour vérifier votre identité si nécessaire.</li>
            <li>Vous recevrez une réponse complète avant la date limite indiquée ci-dessus.</li>
        </ol>

        <p>Pour toute question, contactez notre Délégué à la Protection des Données :
        <a href="mailto:dpo@ibig.ci">dpo@ibig.ci</a></p>
    </div>
    <div class="footer">
        <p>IBIG SECRETIS · <a href="{{ config('app.url') }}/privacy">Politique de confidentialité</a>
        · <a href="{{ config('app.url') }}/legal">Mentions légales</a></p>
        <p>Cet email est envoyé automatiquement. Merci de ne pas y répondre directement.</p>
    </div>
</div>
</body>
</html>
