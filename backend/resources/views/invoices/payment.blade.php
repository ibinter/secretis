<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $invoice_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

        .page { padding: 40px; max-width: 800px; margin: 0 auto; }

        /* En-tête */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
        .company-logo { font-size: 24px; font-weight: 900; color: #1e40af; letter-spacing: -1px; }
        .company-logo span { color: #f59e0b; }
        .company-info { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6; }

        /* Badge FACTURE */
        .invoice-badge { background: #1e40af; color: white; padding: 8px 20px; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; display: inline-block; margin-bottom: 8px; }
        .invoice-number { font-size: 20px; font-weight: 800; color: #1e40af; }
        .invoice-date { font-size: 11px; color: #6b7280; margin-top: 4px; }

        /* Infos client et facture */
        .billing-section { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
        .billing-block { flex: 1; }
        .billing-block h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 8px; font-weight: 600; }
        .billing-block p { line-height: 1.7; font-size: 12px; color: #1a1a1a; }
        .billing-block strong { font-weight: 700; font-size: 13px; }

        /* Tableau des produits */
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        thead tr { background: #f8fafc; }
        th { padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; vertical-align: top; }
        td.amount { font-weight: 700; text-align: right; }
        th.right { text-align: right; }
        tr:last-child td { border-bottom: none; }

        /* Totaux */
        .totals { margin-left: auto; width: 280px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
        .total-row.grand-total { border-top: 2px solid #1e40af; border-bottom: none; padding-top: 10px; margin-top: 4px; }
        .total-row.grand-total span { font-size: 16px; font-weight: 800; color: #1e40af; }

        /* Statut */
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-paid { background: #dcfce7; color: #15803d; }
        .status-pending { background: #fef9c3; color: #854d0e; }

        /* Pied de page */
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
        .footer-left { font-size: 10px; color: #9ca3af; line-height: 1.6; }
        .footer-right { font-size: 10px; color: #9ca3af; text-align: right; }
        .thank-you { margin-top: 16px; text-align: center; font-size: 13px; color: #6b7280; font-style: italic; }

        /* Note légale */
        .legal-note { margin-top: 16px; font-size: 9px; color: #9ca3af; line-height: 1.5; text-align: center; border-top: 1px dashed #e5e7eb; padding-top: 12px; }
    </style>
</head>
<body>
<div class="page">

    <!-- En-tête : Logo IBIG + Infos société -->
    <div class="header">
        <div>
            <div class="company-logo">IBIG <span>SOFT</span></div>
            <div style="font-size:10px; color:#6b7280; margin-top:4px;">SECRETIS ERP — Logiciel de gestion institutionnelle</div>
        </div>
        <div class="company-info">
            <strong>{{ $company_name }}</strong><br>
            {{ $company_address }}<br>
            Tél : {{ $company_phone }}<br>
            {{ $company_email }}<br>
            RCCM : CI-ABJ-2024-XXXXX
        </div>
    </div>

    <!-- Référence Facture -->
    <div style="margin-bottom:24px;">
        <div class="invoice-badge">Facture</div>
        <div class="invoice-number">{{ $invoice_number }}</div>
        <div class="invoice-date">
            Date d'émission : {{ \Carbon\Carbon::parse($invoice_date)->format('d/m/Y') }}
            &nbsp;|&nbsp;
            <span class="status-badge status-paid">Payée</span>
        </div>
    </div>

    <!-- Infos facturation -->
    <div class="billing-section">
        <div class="billing-block">
            <h3>Facturé à</h3>
            <p>
                <strong>{{ $organization->name }}</strong><br>
                {{ $organization->email }}<br>
                @if($organization->phone)
                    Tél : {{ $organization->phone }}<br>
                @endif
                @if($organization->address)
                    {{ $organization->address }}<br>
                @endif
                Pays : {{ $organization->country }}
            </p>
        </div>
        <div class="billing-block" style="text-align:right;">
            <h3>Détails de paiement</h3>
            <p>
                <strong>Réf. paiement</strong><br>
                {{ $payment->reference ?? $payment->idempotency_key }}<br><br>
                <strong>Méthode</strong><br>
                {{ ucfirst(str_replace('_', ' ', $payment->method)) }}<br><br>
                <strong>Validé par</strong><br>
                {{ $validated_by }}
            </p>
        </div>
    </div>

    <!-- Tableau des produits -->
    <table>
        <thead>
            <tr>
                <th style="width:50%">Description</th>
                <th>Période</th>
                <th>Durée</th>
                <th class="right">Montant</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong>SECRETIS ERP — Plan {{ ucfirst($plan_name) }}</strong><br>
                    <span style="color:#6b7280; font-size:11px;">
                        Licence d'accès à la plateforme SaaS SECRETIS ERP<br>
                        Organisation : {{ $organization->name }}
                    </span>
                </td>
                <td style="color:#6b7280; font-size:11px;">
                    {{ \Carbon\Carbon::parse($payment->created_at)->format('d/m/Y') }}<br>
                    au<br>
                    @if($payment->license)
                        {{ \Carbon\Carbon::parse($payment->license->ends_at)->format('d/m/Y') }}
                    @else
                        —
                    @endif
                </td>
                <td style="color:#6b7280;">
                    {{ $payment->duration_months ?? 1 }} mois
                </td>
                <td class="amount">
                    {{ number_format($amount, 0, ',', ' ') }} {{ $currency }}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Totaux -->
    <div class="totals">
        <div class="total-row">
            <span style="color:#6b7280;">Sous-total HT</span>
            <span>{{ number_format($amount, 0, ',', ' ') }} {{ $currency }}</span>
        </div>
        <div class="total-row">
            <span style="color:#6b7280;">TVA (0%)*</span>
            <span>0 {{ $currency }}</span>
        </div>
        <div class="total-row grand-total">
            <span><strong>TOTAL TTC</strong></span>
            <span><strong>{{ number_format($amount, 0, ',', ' ') }} {{ $currency }}</strong></span>
        </div>
    </div>

    <!-- Note TVA -->
    <p style="font-size:9px; color:#9ca3af; margin-top:8px; text-align:right;">
        *Exonéré de TVA — Service logiciel (SaaS)
    </p>

    <!-- Remerciements -->
    <p class="thank-you">Merci pour votre confiance. Nous vous souhaitons une excellente utilisation de SECRETIS ERP.</p>

    <!-- Pied de page -->
    <div class="footer">
        <div class="footer-left">
            <strong>IBIG Soft</strong> — Éditeur de logiciels de gestion<br>
            Abidjan, Côte d'Ivoire<br>
            contact@ibigsoft.com
        </div>
        <div class="footer-right">
            Facture N° {{ $invoice_number }}<br>
            Générée automatiquement par SECRETIS ERP<br>
            Document authentique — Conservez ce document
        </div>
    </div>

    <!-- Note légale -->
    <div class="legal-note">
        Cette facture constitue un justificatif de paiement officiel. En cas de litige, contactez support@ibigsoft.com.
        La licence est strictement nominative et non transférable. Toute reproduction frauduleuse est passible de poursuites.
    </div>

</div>
</body>
</html>
