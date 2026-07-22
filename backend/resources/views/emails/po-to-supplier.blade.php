@component('mail::message')
# Bon de Commande — {{ $po->po_number }}

Madame, Monsieur **{{ $supplier->contact_name ?? $supplier->company_name }}**,

**{{ $organization->name }}** a le plaisir de vous adresser le bon de commande suivant.
Veuillez en accuser réception via votre portail fournisseur ou par retour d'email.

---

## Récapitulatif de la commande

| Champ | Valeur |
|---|---|
| **N° Bon de commande** | {{ $po->po_number }} |
| **Date d'émission** | {{ \Carbon\Carbon::parse($po->created_at)->format('d/m/Y') }} |
| **Livraison attendue** | {{ $po->expected_delivery_date ? \Carbon\Carbon::parse($po->expected_delivery_date)->format('d/m/Y') : '—' }} |
| **Conditions de paiement** | {{ $po->payment_terms_days }} jours |
| **Devise** | {{ $po->currency_code }} |

---

## Détail des articles commandés

@component('mail::table')
| # | Désignation | Qté | Unité | Prix Unit. HT | Montant HT |
|:---:|---|:---:|---|---:|---:|
@foreach($po->items ?? [] as $i => $item)
@php $lineTotal = ($item['qty'] ?? 0) * ($item['unit_price'] ?? 0); @endphp
| {{ $i + 1 }} | **{{ $item['description'] ?? '' }}** | {{ number_format($item['qty'] ?? 0, 2, ',', ' ') }} | {{ $item['unit'] ?? '' }} | {{ number_format($item['unit_price'] ?? 0, 0, ',', ' ') }} {{ $po->currency_code }} | {{ number_format($lineTotal, 0, ',', ' ') }} {{ $po->currency_code }} |
@endforeach
@endcomponent

@php
    $subtotal = collect($po->items ?? [])->sum(fn($i) => ($i['qty'] ?? 0) * ($i['unit_price'] ?? 0));
    $tva = $subtotal * 0.18;
    $ttc = $subtotal + $tva;
@endphp

@component('mail::panel')
**Sous-total HT :** {{ number_format($subtotal, 0, ',', ' ') }} {{ $po->currency_code }}
**TVA (18%) :** {{ number_format($tva, 0, ',', ' ') }} {{ $po->currency_code }}
**TOTAL TTC : {{ number_format($ttc, 0, ',', ' ') }} {{ $po->currency_code }}**
@endcomponent

---

## Conditions de livraison

- **Adresse de livraison :** {{ $po->delivery_address ?: ($organization->address . ', ' . ($organization->city ?? '')) }}
- **Date limite de livraison :** {{ $po->expected_delivery_date ? \Carbon\Carbon::parse($po->expected_delivery_date)->format('d/m/Y') : 'À convenir' }}
- **Conditions de paiement :** {{ $po->payment_terms_days }} jours date de réception de la facture

@if($po->notes)
## Notes / Conditions particulières

{{ $po->notes }}
@endif

---

## Actions requises

Veuillez effectuer les actions suivantes dans les plus brefs délais :

1. **Accuser réception** du bon de commande via le portail fournisseur
2. **Confirmer** la date de livraison prévue
3. À la livraison, **déposer votre facture** sur le portail

@component('mail::button', ['url' => $portalUrl . '/orders', 'color' => 'primary'])
Accuser réception sur le portail
@endcomponent

---

> **Le bon de commande PDF est joint à cet email.** Veuillez le signer et le retourner par email ou via le portail.

Pour toute question concernant cette commande, contactez notre service achats :
- Email : {{ $organization->email ?? config('mail.from.address') }}
- Téléphone : {{ $organization->phone ?? '—' }}

En vous remerciant de votre confiance,

**Le Service Achats**
{{ $organization->name }}

@component('mail::subcopy')
Référence interne : {{ $po->po_number }} — Fournisseur : {{ $supplier->supplier_number }}
@if($po->rfq) AO : {{ $po->rfq->rfq_number }} @endif
Ce message et ses pièces jointes sont confidentiels. Si vous avez reçu cet email par erreur, veuillez nous contacter immédiatement.
@endcomponent

@endcomponent
