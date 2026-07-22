@component('mail::message')
{{-- ══ En-tête ══ --}}
# Invitation à un Appel d'Offres

Madame, Monsieur **{{ $supplier->contact_name ?? $supplier->company_name }}**,

**{{ $organization->name }}** a le plaisir de vous inviter à participer à l'appel d'offres suivant :

---

## {{ $rfq->title }}

@if($rfq->description)
{{ $rfq->description }}
@endif

| Référence AO | Date limite de réponse | Nombre d'articles |
|---|---|---|
| **{{ $rfq->rfq_number }}** | **{{ \Carbon\Carbon::parse($rfq->closing_date)->format('d/m/Y à H:i') }}** | {{ count($rfq->items ?? []) }} article(s) |

---

## Articles à proposer

@component('mail::table')
| # | Désignation | Quantité | Unité | Spécifications |
|:---:|---|:---:|---|---|
@foreach($rfq->items ?? [] as $i => $item)
| {{ $i + 1 }} | **{{ $item['description'] ?? '' }}** | {{ $item['qty'] ?? '' }} | {{ $item['unit'] ?? '' }} | {{ $item['specifications'] ?? '—' }} |
@endforeach
@endcomponent

---

## Critères d'évaluation

Vos offres seront évaluées selon les critères suivants :

@foreach($rfq->evaluation_criteria ?? [] as $criterion)
- **{{ $criterion['name'] }}** — Pondération : {{ $criterion['weight'] }}%
@endforeach

---

## Comment répondre ?

Pour soumettre votre offre, connectez-vous à notre portail fournisseur :

@component('mail::button', ['url' => $portalUrl, 'color' => 'primary'])
Accéder au portail fournisseur
@endcomponent

**Vos identifiants de connexion :**

| Champ | Valeur |
|---|---|
| Adresse email | `{{ $supplier->portal_email ?? $supplier->email }}` |
| Mot de passe | `{{ $portalPassword ?? '(utilisez votre mot de passe habituel)' }}` |

> **Important :** Si c'est votre première connexion, veuillez changer votre mot de passe après connexion.

---

## Date limite de réponse

@component('mail::panel')
⏰ **Vous avez jusqu'au {{ \Carbon\Carbon::parse($rfq->closing_date)->format('d/m/Y à H:i') }} (UTC)** pour soumettre votre offre.

Aucune offre ne sera acceptée après cette date.
@endcomponent

@if($rfq->notes)
## Notes complémentaires

{{ $rfq->notes }}
@endif

---

Pour toute question, contactez notre service achats :
- Email : {{ $organization->email ?? config('mail.from.address') }}
- Téléphone : {{ $organization->phone ?? '—' }}

Nous vous remercions de l'intérêt que vous portez à notre appel d'offres et espérons recevoir votre meilleure offre.

Cordialement,

**Le Service Achats**
{{ $organization->name }}

@component('mail::subcopy')
Si vous ne souhaitez plus recevoir nos invitations, contactez-nous à {{ $organization->email ?? config('mail.from.address') }}.
Référence interne : {{ $rfq->rfq_number }} — Fournisseur : {{ $supplier->supplier_number }}
@endcomponent

@endcomponent
