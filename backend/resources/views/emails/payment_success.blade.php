{{--
    Email de confirmation de paiement (fait office de reçu).
    Appelé par : App\Notifications\PaymentSuccessNotification::toMail() (ligne 65)
                 -> ->view('emails.payment_success', [...])
    Variables :
      $adminName         string
      $organisationName  string
      $invoiceRef        string  référence de la facture / du reçu
      $paidAt            string  date de paiement (déjà formatée par l'appelant)
      $planName          string
      $periodStart       string  (déjà formatée)
      $periodEnd         string  (déjà formatée)
      $paymentMethod     string
      $amount            string  montant brut (chaîne)
      $currency          string  'FCFA' par défaut
      $addons            array   options souscrites — structure non typée côté PHP :
                                 chaînes simples ou tableaux ['name'/'label', 'price'/'amount']
      $dashboardUrl      string
    NB : le layout affiche $unsubscribe_email ?? '' dans le pied de page (non fourni ici).
--}}
@php
    $amountRaw = $amount ?? null;
    $amountNum = is_numeric(str_replace([' ', ','], ['', '.'], (string) $amountRaw))
        ? (float) str_replace([' ', ','], ['', '.'], (string) $amountRaw)
        : null;
    $amountLabel = $amountNum !== null
        ? number_format($amountNum, 0, ',', ' ')
        : (string) ($amountRaw ?? '—');

    $addonList = [];
    foreach ((array) ($addons ?? []) as $key => $addon) {
        if (is_array($addon)) {
            $label = $addon['name'] ?? $addon['label'] ?? $addon['title'] ?? (is_string($key) ? $key : '');
            $price = $addon['price'] ?? $addon['amount'] ?? null;
        } elseif (is_object($addon)) {
            $label = $addon->name ?? $addon->label ?? (is_string($key) ? $key : '');
            $price = $addon->price ?? $addon->amount ?? null;
        } else {
            $label = is_string($key) ? $key : (string) $addon;
            $price = is_string($key) ? $addon : null;
        }
        if ($label === '' || $label === null) { continue; }
        $addonList[] = ['label' => (string) $label, 'price' => $price];
    }
@endphp
@extends('emails.layout')

@section('content')

<h2 style="color:#16a34a;margin:0 0 14px;">Paiement confirme</h2>

<p>Bonjour {{ $adminName ?? '' }},</p>

<p>
    Nous confirmons la bonne reception de votre paiement pour
    <strong>{{ $organisationName ?? 'votre organisation' }}</strong>.
    Votre abonnement SECRETIS ERP est actif. Cet email vaut recu.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#f0fdf4;border-radius:8px;margin:18px 0;">
    <tr>
        <td style="padding:18px 20px;text-align:center;">
            <div style="font-size:12px;color:#166534;text-transform:uppercase;
                        letter-spacing:1px;">Montant regle</div>
            <div style="font-size:26px;font-weight:bold;color:#166534;margin-top:4px;">
                {{ $amountLabel }} {{ $currency ?? 'FCFA' }}
            </div>
        </td>
    </tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#faf5ff;border-radius:8px;margin:18px 0;">
    <tr>
        <td style="padding:16px 20px;font-size:14px;line-height:1.9;color:#1f2937;">
            <strong>Reference :</strong> {{ $invoiceRef ?? '—' }}<br>
            <strong>Date de paiement :</strong> {{ $paidAt ?? '—' }}<br>
            <strong>Moyen de paiement :</strong> {{ $paymentMethod ?? '—' }}<br>
            <strong>Formule :</strong> {{ $planName ?? '—' }}<br>
            <strong>Periode couverte :</strong>
            du {{ $periodStart ?? '—' }} au {{ $periodEnd ?? '—' }}
        </td>
    </tr>
</table>

@if (count($addonList) > 0)
    <p style="margin:0 0 8px;"><strong>Options souscrites</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e9d5ff;border-radius:8px;margin:0 0 18px;">
        @foreach ($addonList as $addon)
            <tr>
                <td style="padding:9px 16px;font-size:14px;color:#1f2937;
                           border-bottom:1px solid #f3e8ff;">
                    {{ $addon['label'] }}
                </td>
                <td style="padding:9px 16px;font-size:14px;color:#4b5563;text-align:right;
                           border-bottom:1px solid #f3e8ff;white-space:nowrap;">
                    @if ($addon['price'] !== null && $addon['price'] !== '')
                        {{ is_numeric($addon['price'])
                            ? number_format((float) $addon['price'], 0, ',', ' ') . ' ' . ($currency ?? 'FCFA')
                            : $addon['price'] }}
                    @else
                        Incluse
                    @endif
                </td>
            </tr>
        @endforeach
    </table>
@endif

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr>
        <td style="background:#9333EA;border-radius:8px;">
            <a href="{{ $dashboardUrl ?? '#' }}"
               style="display:inline-block;padding:13px 34px;color:#ffffff;font-weight:bold;
                      text-decoration:none;font-size:15px;">
                Acceder a mon espace
            </a>
        </td>
    </tr>
</table>

<p style="font-size:12px;color:#6b7280;text-align:center;margin:0 0 18px;word-break:break-all;">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="{{ $dashboardUrl ?? '#' }}" style="color:#9333EA;">{{ $dashboardUrl ?? '' }}</a>
</p>

<p style="color:#6b7280;font-size:13px;margin-bottom:0;">
    Conservez cet email : il tient lieu de justificatif de paiement. Votre facture detaillee
    reste disponible dans la rubrique <strong>Facturation</strong> de votre espace.
    Pour toute question, ecrivez a
    <a href="mailto:secretis@ibigsoft.com" style="color:#9333EA;">secretis@ibigsoft.com</a>
    en rappelant la reference {{ $invoiceRef ?? '' }}.
</p>

@endsection
