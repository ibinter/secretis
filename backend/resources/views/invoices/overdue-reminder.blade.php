<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Relance facture impayée</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; color: #2d3748; margin: 0; padding: 0; background: #f7fafc; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
        .header { background: #1A3A5C; padding: 30px 40px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 22px; }
        .header p  { color: #a8c5e0; margin: 6px 0 0; font-size: 13px; }
        .body { padding: 36px 40px; }
        .alert-box {
            background: #fff5f5; border: 1px solid #fed7d7; border-left: 4px solid #e53e3e;
            border-radius: 8px; padding: 16px 20px; margin: 20px 0;
        }
        .alert-box .label { font-size: 11px; text-transform: uppercase; color: #c53030; letter-spacing: 1px; margin-bottom: 4px; }
        .amount { font-size: 28px; font-weight: bold; color: #e53e3e; }
        .invoice-meta { background: #f7fafc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
        .invoice-meta table { width: 100%; border-collapse: collapse; }
        .invoice-meta td { padding: 4px 0; font-size: 13px; }
        .invoice-meta td:first-child { color: #718096; width: 40%; }
        .invoice-meta td:last-child { font-weight: 600; color: #2d3748; }
        .cta { text-align: center; margin: 28px 0; }
        .cta a {
            display: inline-block; background: #1A3A5C; color: #fff;
            padding: 12px 32px; border-radius: 8px; text-decoration: none;
            font-weight: bold; font-size: 14px;
        }
        .footer { background: #f7fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center; font-size: 12px; color: #a0aec0; }
        p { line-height: 1.7; color: #4a5568; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>{{ $org->name }}</h1>
        <p>Rappel de paiement — Facture impayée</p>
    </div>

    <div class="body">
        <p>Bonjour <strong>{{ $client->name }}</strong>,</p>

        <p>
            Sauf erreur de notre part, nous n'avons pas encore reçu le règlement
            de la facture mentionnée ci-dessous, dont l'échéance est dépassée depuis
            <strong>{{ $days_overdue }} jour{{ $days_overdue > 1 ? 's' : '' }}</strong>.
        </p>

        <div class="alert-box">
            <div class="label">Solde restant dû</div>
            <div class="amount">{{ number_format($invoice->balance_due, 0, ',', ' ') }} FCFA</div>
        </div>

        <div class="invoice-meta">
            <table>
                <tr>
                    <td>Numéro de facture</td>
                    <td>{{ $invoice->invoice_number }}</td>
                </tr>
                <tr>
                    <td>Objet</td>
                    <td>{{ $invoice->title }}</td>
                </tr>
                <tr>
                    <td>Date d'émission</td>
                    <td>{{ $invoice->issue_date?->format('d/m/Y') }}</td>
                </tr>
                <tr>
                    <td>Date d'échéance</td>
                    <td>{{ $invoice->due_date?->format('d/m/Y') }}</td>
                </tr>
                <tr>
                    <td>Total facturé</td>
                    <td>{{ number_format($invoice->total, 0, ',', ' ') }} FCFA</td>
                </tr>
                <tr>
                    <td>Déjà réglé</td>
                    <td>{{ number_format($invoice->paid_amount, 0, ',', ' ') }} FCFA</td>
                </tr>
            </table>
        </div>

        <p>
            Nous vous remercions de bien vouloir procéder au règlement dans les
            meilleurs délais. Si vous avez déjà effectué le paiement, veuillez
            ignorer ce message ou nous transmettre votre preuve de paiement.
        </p>

        @if($org->getSetting('bank_details'))
        <p>
            <strong>Coordonnées bancaires :</strong><br>
            {!! nl2br(e($org->getSetting('bank_details'))) !!}
        </p>
        @endif

        <div class="cta">
            <a href="mailto:{{ $org->email }}?subject=Paiement facture {{ $invoice->invoice_number }}">
                Confirmer mon paiement
            </a>
        </div>

        <p>
            Pour toute question ou litige, n'hésitez pas à nous contacter à
            <a href="mailto:{{ $org->email }}">{{ $org->email }}</a>.
        </p>

        <p>
            Cordialement,<br>
            <strong>L'équipe {{ $org->name }}</strong>
        </p>
    </div>

    <div class="footer">
        {{ $org->name }}
        @if($org->address) — {{ $org->address }}@endif
        @if($org->phone) — Tél : {{ $org->phone }}@endif<br>
        Ce message a été généré automatiquement par IBIG SECRETIS ERP.
    </div>
</div>
</body>
</html>
