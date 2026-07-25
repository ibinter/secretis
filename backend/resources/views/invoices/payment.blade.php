<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
body { font-family: DejaVu Sans, Arial, sans-serif; color: #1f2937; font-size: 13px; margin: 0; }
.header { background: #9333EA; color: #fff; padding: 24px 32px; }
.header h1 { margin: 0; font-size: 20px; }
.header .sub { color: #e9d5ff; font-size: 11px; }
.content { padding: 28px 32px; }
h2 { color: #7e22ce; font-size: 15px; }
table.details { width: 100%; border-collapse: collapse; margin: 14px 0; }
table.details td { padding: 8px 10px; border-bottom: 1px solid #eee; }
table.details td:first-child { color: #6b7280; width: 40%; }
.total { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 14px 18px; font-size: 15px; font-weight: bold; color: #7e22ce; }
.footer { color: #9ca3af; font-size: 10px; padding: 18px 32px; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="header">
  <h1>SECRETIS ERP — Reçu de paiement</h1>
  <div class="sub">IBIG Soft · secretis.ibigsoft.com · secretis@ibigsoft.com</div>
</div>
<div class="content">
  <h2>Reçu n° {{ $payment->invoice_number ?? ('REC-' . date('Y') . '-' . str_pad((string) $payment->id, 4, '0', STR_PAD_LEFT)) }}</h2>
  <table class="details">
    <tr><td>Organisation</td><td>{{ $payment->organization->name ?? '—' }}</td></tr>
    <tr><td>Formule</td><td>{{ $payment->plan_slug }}</td></tr>
    <tr><td>Durée</td><td>{{ $payment->duration_months ?? 1 }} mois</td></tr>
    <tr><td>Moyen de paiement</td><td>{{ $payment->method }} ({{ $payment->provider ?? '—' }})</td></tr>
    <tr><td>Référence</td><td>{{ $payment->reference ?? $payment->idempotency_key }}</td></tr>
    <tr><td>Date de paiement</td><td>{{ optional($payment->paid_at)->format('d/m/Y H:i') ?? now()->format('d/m/Y H:i') }}</td></tr>
  </table>
  <div class="total">Montant payé : {{ number_format((float) $payment->amount, 0, ',', ' ') }} {{ $payment->currency }}</div>
  <p style="color:#6b7280;font-size:11px;margin-top:18px">
    Ce reçu atteste du paiement de votre abonnement SECRETIS ERP. Conservez-le : il fait office de justificatif comptable.
  </p>
</div>
<div class="footer">
  IBIG Soft — SECRETIS ERP · Document généré automatiquement le {{ now()->format('d/m/Y à H:i') }} · Nous ne vous demanderons jamais votre code secret ou mot de passe.
</div>
</body>
</html>
