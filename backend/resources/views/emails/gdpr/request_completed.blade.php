<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Demande RGPD traitée – SECRETIS</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
        .header { background: #1a56db; color: #fff; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 22px; }
        .body { padding: 32px; color: #374151; line-height: 1.7; }
        .status-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 13px; }
        .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 16px 20px; margin: 20px 0; font-size: 14px; }
        .btn { display: inline-block; background: #1a56db; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin: 16px 0; }
        .footer { padding: 20px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .footer a { color: #1a56db; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>Votre demande RGPD a été traitée</h1>
    </div>
    <div class="body">
        <p>Bonjour <strong>{{ $subjectName }}</strong>,</p>

        <p>Nous avons le plaisir de vous informer que votre demande RGPD a été
        <span class="status-badge">traitée</span> avec succès.</p>

        <div class="info-box">
            <strong>Référence :</strong> #{{ $requestId }}<br>
            <strong>Type :</strong> {{ $requestTypeLabel }}<br>
            <strong>Traitée le :</strong> {{ \Carbon\Carbon::parse($completedAt)->format('d/m/Y à H\hi') }}<br>
            @if($responseMessage)
            <strong>Résultat :</strong> {{ $responseMessage }}
            @endif
        </div>

        @if($downloadUrl)
        <p>Votre export de données est disponible au téléchargement :</p>
        <a href="{{ $downloadUrl }}" class="btn">Télécharger mes données</a>
        <p style="font-size:13px;color:#6b7280;">Lien valable 48h.</p>
        @endif

        @if($requestType === 'erasure')
        <p>Conformément à l'article 17 du RGPD, vos données personnelles ont été supprimées
        de nos systèmes, à l'exception des données pour lesquelles nous avons une obligation
        légale de conservation (données comptables, 10 ans).</p>
        @endif

        <p><strong>Vous avez des questions ?</strong><br>
        Contactez notre DPO : <a href="mailto:dpo@ibig.ci">dpo@ibig.ci</a></p>

        <p>Si vous estimez que vos droits n'ont pas été respectés, vous pouvez introduire
        une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés)
        à l'adresse <a href="https://www.cnil.fr">www.cnil.fr</a>.</p>
    </div>
    <div class="footer">
        <p>IBIG SECRETIS · <a href="{{ config('app.url') }}/privacy">Politique de confidentialité</a></p>
        <p>Cet email est envoyé automatiquement.</p>
    </div>
</div>
</body>
</html>
