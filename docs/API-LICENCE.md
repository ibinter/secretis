# API de licence — SECRETIS ERP

**Référence :** *IBIG SOFT — Cahier d'implémentation universel v1.1*, section 9.4.
**Contrôleur :** `backend/app/Http/Controllers/Api/LicenceController.php`
**Routes :** `backend/routes/licence-api.php`
**Moteur :** `backend/app/Services/LicenceService.php`
**Source unique de vérité :** `backend/config/licence.config.json`

> ⚠️ **Les valeurs chiffrées des exemples sont ILLUSTRATIVES.** Durées, plafonds
> et noms de paliers viennent tous de `licence.config.json` et changent sans
> préavis. **Ne les recopiez nulle part** : ni dans un composant, ni dans un
> e-mail, ni dans un guide, ni dans une réponse SARA. Lisez-les dans la réponse
> de l'API. Une valeur écrite en dur est un défaut, même si elle est juste
> aujourd'hui.

---

## Table des matières

1. [Principes](#1-principes)
2. [Authentification et débit](#2-authentification-et-débit)
3. [Enveloppe de réponse](#3-enveloppe-de-réponse)
4. [Codes d'erreur](#4-codes-derreur)
5. [`GET /api/licence/etat`](#5-get-apilicenceetat)
6. [`POST /api/licence/verifier`](#6-post-apilicenceverifier)
7. [`POST /api/licence/essai`](#7-post-apilicenceessai)
8. [`POST /api/licence/activer`](#8-post-apilicenceactiver)
9. [`GET /api/quotas/{compteur}`](#9-get-apiquotascompteur)
10. [`POST /api/paiement/callback`](#10-post-apipaiementcallback)
11. [On-premise (section 9.7)](#11-on-premise-section-97)
12. [Sécurité (section 9.8)](#12-sécurité-section-98)
13. [Raccordement et configuration](#13-raccordement-et-configuration)

---

## 1. Principes

Six règles gouvernent toute cette API. Les connaître évite d'en mal lire les
réponses.

1. **L'état est calculé côté serveur à chaque requête.** Aucun endpoint ne lit
   un état dans la requête ; aucun n'accepte un identifiant d'organisation dans
   le corps. L'espace vient de l'utilisateur authentifié, ou — pour le webhook —
   de l'enregistrement de paiement retrouvé en base.
2. **Toute réponse porte l'état courant** : clé `etat` dans le corps, en-tête
   `X-Licence-Etat`. Y compris les réponses d'erreur, où l'interface en a le plus
   besoin.
3. **Rien de décisif ne vit dans `localStorage`.** Le front interroge
   `GET /api/licence/etat` au chargement puis toutes les 15 minutes.
4. **Le contrôle de quota qui fait foi se fait à l'écriture**, dans la couche
   métier (`LicenceService::peutCreer()` / `incrementer()`), jamais à
   l'affichage. `GET /api/quotas/{compteur}` est une lecture d'information.
5. **On ne coupe pas, on ne supprime pas.** Un refus est toujours partiel : la
   lecture reste ouverte, les données restent visibles et non masquées. Aucune
   réponse de cette API ne signale qu'une donnée est perdue.
6. **Aucune durée, aucun plafond, aucun prix n'est écrit dans le contrôleur.**
   Tout vient du moteur, qui lit `licence.config.json`.

### Les six états

`DEMO` · `FREE` (palier *Découverte*) · `TRIAL` (*Essai*) · `ACTIVE` ·
`GRACE` (*Période de grâce*) · `EXPIRED` (*Lecture seule*)

Les droits ouverts par chaque état sont dans `droits_par_etat` de
`licence.config.json`, et renvoyés tels quels dans le champ `droits`. **Ne les
recopiez pas** : lisez-les.

---

## 2. Authentification et débit

| Endpoint | Auth | Débit |
|---|---|---|
| `GET /api/licence/etat` | `auth:sanctum` | 60 / min |
| `POST /api/licence/verifier` | **publique** | 20 / min |
| `POST /api/licence/essai` | `auth:sanctum` | 5 / min |
| `POST /api/licence/activer` | `auth:sanctum` | 10 / min |
| `GET /api/quotas/{compteur}` | `auth:sanctum` | 60 / min |
| `POST /api/paiement/callback` | **publique + HMAC** | 30 / min |

`POST /api/licence/verifier` est publique par nécessité : une instance
on-premise n'a pas de session sur cette instance-ci. Elle ne divulgue rien à qui
ne détient pas déjà une clé et ne modifie rien.

`POST /api/paiement/callback` est publique parce qu'une passerelle de paiement
ne porte pas de session. Sa sécurité repose **entièrement** sur la signature
HMAC.

Les fenêtres de débit ci-dessus sont des garde-fous techniques, pas des règles
de licence : elles vivent dans `routes/licence-api.php`.

---

## 3. Enveloppe de réponse

Chaque réponse JSON commence par l'état, recalculé au dernier moment :

```json
{
  "etat": "TRIAL",
  "...": "charge utile de l'endpoint"
}
```

Et porte l'en-tête correspondant :

```
X-Licence-Etat: TRIAL
```

`etat` vaut `null` (en-tête `INCONNU`) quand aucun espace n'a pu être résolu :
requête non authentifiée, compte sans organisation, clé inconnue, callback non
signé.

---

## 4. Codes d'erreur

Le corps d'une erreur porte toujours `code` (constante stable, destinée au
programme) et `message` (français, destiné à l'utilisateur).

```json
{
  "etat": "FREE",
  "code": "ETAT_INCOMPATIBLE",
  "message": "Cet espace dispose déjà d'un essai ou d'un abonnement en cours."
}
```

### Choix des statuts HTTP — et pourquoi

| HTTP | Code | Sens | Quand |
|---|---|---|---|
| **402** | `QUOTA_DEPASSE` | **Refus commercial, levable** | Le plafond du palier gratuit est atteint. La même requête réussira une fois une formule activée. |
| **403** | `ETAT_LECTURE_SEULE` | **Refus d'état, non levable ici** | L'état courant (`EXPIRED`) n'ouvre pas l'écriture. |
| **403** | `DROIT_ABSENT` | Droit fermé par l'état | Export, API, multi-utilisateur… fermés dans `droits`. |
| **403** | `ORGANISATION_ABSENTE` | Aucun espace rattaché au compte | — |
| **409** | `ETAT_INCOMPATIBLE` | L'opération est sans objet dans l'état courant | Essai demandé alors qu'un essai ou un abonnement court. |
| **409** | `CLE_ECHUE` | La clé présentée est arrivée à échéance | — |
| **409** | `PAIEMENT_NON_VALIDE` | Paiement enregistré mais pas encore encaissé | — |
| **409** | `DUREE_INDETERMINEE` | Le paiement ne porte aucune durée exploitable | Intervention nécessaire ; **aucune durée n'est devinée**. |
| **404** | `CLE_INCONNUE` | Clé inconnue, ou appartenant à un autre espace | Message volontairement identique dans les deux cas. |
| **404** | `PAIEMENT_INTROUVABLE` | Aucune référence de paiement ne correspond | — |
| **404** | `FORMULE_INCONNUE` | Formule absente du catalogue `plans` | — |
| **404** | `COMPTEUR_INCONNU` | Compteur métier inexistant pour cette solution | La réponse liste `compteurs_disponibles`. |
| **422** | *(validation Laravel)* | Corps de requête invalide | Messages en français dans `errors`. |
| **422** | `SOLUTION_INCONNUE` | `solution` ≠ solution servie par l'instance | — |
| **401** | `SIGNATURE_INVALIDE` | Signature de webhook absente ou invalide | Webhook uniquement. |

**Pourquoi 402 et pas 403 pour le quota.** Les deux refus sont de nature
différente et le client doit les traiter différemment. Le plafond est un refus
*commercial* : rien n'est cassé, l'utilisateur n'a rien fait d'interdit, et la
même requête passera après souscription — 402 « Payment Required » dit
exactement cela. Un 403 laisserait croire à un défaut de droit d'accès, et un
429 à une limitation de débit : deux contresens qui orientent mal le support
comme le client. À l'inverse, `EXPIRED` ferme réellement l'écriture tant que
l'état n'a pas changé : c'est un 403.

**Aucun refus métier ne sort en 5xx.** Un serveur en erreur et un espace au
plafond ne se pilotent pas de la même façon côté client.

> ⚠️ **ARBITRAGE EN ATTENTE — 402 ou 403 pour le plafond ?**
> Le chantier « application des droits à l'écriture » a livré en parallèle
> `App\Exceptions\PlafondAtteintException`, qui rend le même refus en **403**.
> Deux statuts pour un même événement, c'est exactement l'incohérence que le
> cahier combat. Le raisonnement en faveur de 402 est exposé ci-dessus ; celui
> en faveur de 403 est l'uniformité avec `DroitFermeException` et
> `EnforceLicence`, qui rendent eux aussi 403. **Un seul statut doit survivre.**
> Le changement tient en une ligne de chaque côté. En attendant l'arbitrage,
> **c'est `PlafondAtteintException` qui fait foi sur le chemin d'écriture** —
> ne construisez pas une troisième convention.

> **Divergence assumée avec `docs/api-reference.md`.** L'API v1 générique
> utilise des codes `SEC-0xx`. L'API de licence, non versionnée et appelée aussi
> par des instances on-premise, emploie des codes parlants et stables. Les deux
> conventions coexistent ; ne mélangez pas les tables.

---

## 5. `GET /api/licence/etat`

État complet de l'espace courant. Appelé au chargement de l'application **et
toutes les 15 minutes** (section 9.4). C'est la seule autorité du front.

**Paramètres :** aucun.

**200 OK**

```json
{
  "etat": "TRIAL",
  "solution": "secretis",
  "formule": "Essentiel",
  "jours_restants": 14,
  "date_fin": "2026-08-23",
  "date_purge": "2026-11-28",
  "droits": {
    "ecriture": true, "export": true, "api": true, "multi_utilisateur": true,
    "sara": true, "whatsapp": true, "sms": true, "filigrane": false, "quotas": false
  },
  "quotas": {},
  "plafond_resume": "5 courriers par mois",
  "filigrane": null,
  "message": "Essai en cours — 14 jour(s) restant(s) sur la formule Essentiel.",
  "prolongeable": true
}
```

| Champ | Sens |
|---|---|
| `jours_restants` | `null` hors `TRIAL`, `ACTIVE`, `GRACE`. |
| `quotas` | Vide quand l'état ne plafonne pas (`droits.quotas = false`). |
| `plafond_resume` | Texte officiel du plafond. **À afficher tel quel, jamais reformulé.** |
| `filigrane` | Mention à apposer sur les documents, ou `null` si l'état en dispense. |
| `message` | Bannière officielle (section 8.4). **Copier, ne pas réécrire.** |
| `prolongeable` | Un essai non encore prolongé peut l'être — manuellement, avec motif. |

**Erreurs :** `403 ORGANISATION_ABSENTE`, `401` (non authentifié).

---

## 6. `POST /api/licence/verifier`

Vérifie une clé. Sert au portail **et à l'on-premise** (section 9.7).

**Corps**

| Champ | Type | Obligatoire |
|---|---|---|
| `cle_licence` | chaîne, ≤ 64 | oui |

**200 OK — clé valide**

```json
{
  "etat": "ACTIVE",
  "valide": true,
  "motif": null,
  "solution": "secretis",
  "formule": "Essentiel",
  "date_fin": "2027-07-26",
  "date_purge": "2027-10-31",
  "droits": { "...": "..." },
  "hors_ligne": {
    "tolerance_jours": 15,
    "verifie_le": "2026-08-09T18:42:37+00:00",
    "degradation_le": "2026-08-24T18:42:37+00:00",
    "comportement_apres": "lecture_seule",
    "blocage_total": false
  }
}
```

**200 OK — clé inconnue**

```json
{
  "valide": false,
  "motif": "CLE_INCONNUE",
  "message": "Cette clé n'est pas reconnue. L'accès reste ouvert en lecture seule le temps de la régulariser.",
  "etat": null,
  "solution": "secretis",
  "formule": null,
  "date_fin": null,
  "hors_ligne": { "...": "..." }
}
```

**200 OK — espace en lecture seule :** `valide: false`, `motif:
"ETAT_LECTURE_SEULE"`, avec `etat`, `formule` et `date_fin` renseignés.

> **Cet endpoint ne renvoie jamais 4xx pour une clé inconnue ou échue**, et ce
> n'est pas un oubli. Une instance installée chez le client interprète tout code
> d'erreur comme « je n'ai pas pu vérifier ». Le verdict est donc dans le corps,
> en 200, où il ne peut pas être confondu avec une panne réseau. Les seuls codes
> non-200 possibles ici sont `422` (corps invalide) et `429` (débit).

`valide: true` signifie **« la clé ouvre encore l'écriture »**, pas « le client
est à jour de paiement » : `GRACE` est valide — c'est tout l'objet d'une période
de grâce.

---

## 7. `POST /api/licence/essai`

Démarre un essai. **La durée n'est pas un paramètre** : elle vient de
`essai_jours` dans la configuration. `plans.trial_days` est ignoré (décision D4,
colonne neutralisée par la migration du socle).

**Corps**

| Champ | Type | Obligatoire | Note |
|---|---|---|---|
| `formule` | chaîne, ≤ 60 | oui | Slug (`essentiel`) ou nom (`Essentiel`) d'une formule active de `plans`. |
| `solution` | chaîne, ≤ 32 | non | Accepté pour compatibilité multi-produits ; doit valoir la solution servie. |

**201 Created**

```json
{
  "etat": "TRIAL",
  "demarre": true,
  "formule": "Essentiel",
  "date_fin": "2026-08-23",
  "licence": { "...": "charge de GET /api/licence/etat" }
}
```

La ligne créée porte `origine: essai`, une `cle_licence` générée, et ses dates
de grâce et de purge dérivées — jamais saisies.

**Erreurs :** `409 ETAT_INCOMPATIBLE` (essai ou abonnement déjà en cours),
`404 FORMULE_INCONNUE`, `422 SOLUTION_INCONNUE`, `403 ORGANISATION_ABSENTE`.

**Prolongation.** Elle n'est pas exposée ici : le cahier (section 5.5) en fait
une prise de contact commerciale — une seule fois, manuelle, motif obligatoire.
Elle passe par `LicenceService::prolongerEssai()` depuis la console
super-administrateur.

---

## 8. `POST /api/licence/activer`

**Corps — l'un OU l'autre, jamais les deux** (deux chemins d'activation dans une
même requête, ce sont deux vérités possibles sur la formule obtenue).

| Champ | Type | Note |
|---|---|---|
| `cle_licence` | chaîne, ≤ 64 | Clé déjà rattachée à cet espace. |
| `reference_paiement` | chaîne, ≤ 120 | `payments.reference`, `payments.gateway_ref`, `payments.idempotency_key` ou `orders.reference`. |

### Par clé

La clé doit appartenir à l'espace appelant. Une clé inconnue et une clé d'un
autre espace renvoient **le même** `404 CLE_INCONNUE` — le message n'apprend
rien à qui balaie des clés. La tentative est journalisée.

**200 OK** — `{ "etat": "ACTIVE", "active": true, "licence": { … } }`
Rejouer la requête renvoie 200 avec `"deja": true` (idempotence).

### Par référence de paiement

La **durée** vient de `payments.duration_months` (ou `orders.quantity_months`).
Si elle est absente, l'API refuse en `409 DUREE_INDETERMINEE` au lieu d'en
inventer une : une durée devinée se propage silencieusement à la date de grâce,
à la date de purge et à la facturation suivante.

La licence courante est mise à l'écart (`superseded_at`) et une nouvelle ligne
`ACTIVE` est créée, avec `origine: paiement`.

**200 OK**

```json
{
  "etat": "ACTIVE",
  "active": true,
  "formule": "Essentiel",
  "date_fin": "2026-11-09",
  "licence": { "...": "..." }
}
```

**Erreurs :** `404 PAIEMENT_INTROUVABLE`, `409 PAIEMENT_NON_VALIDE` (avec
`statut_paiement`), `409 DUREE_INDETERMINEE`, `404 FORMULE_INCONNUE`,
`409 CLE_ECHUE`, `404 CLE_INCONNUE`, `422` (aucun ou les deux identifiants).

Chaque activation écrit une ligne dans `license_transitions` — journal **non
modifiable** — avec la cause, l'acteur et la référence.

---

## 9. `GET /api/quotas/{compteur}`

`{compteur}` : nom du compteur métier (`[a-z0-9_]+`). Pour SECRETIS :
`courriers_mois`. La liste vient de `licence.config.json` ; un compteur inconnu
renvoie `404 COMPTEUR_INCONNU` **avec** `compteurs_disponibles`.

> Sans ce garde-fou, une faute de frappe renverrait « plafond `null`, donc
> autorisé » : un quota désactivé en silence.

**200 OK — sous le plafond**

```json
{
  "etat": "FREE",
  "compteur": "courriers_mois",
  "valeur": 0,
  "plafond": 5,
  "restant": 5,
  "autorise": true,
  "periode": "2026-08",
  "mensuel": true
}
```

**200 OK — plafond atteint**

```json
{
  "etat": "FREE",
  "valeur": 5, "plafond": 5, "restant": 0, "autorise": false,
  "motif_refus": "QUOTA_DEPASSE",
  "message_refus": "Limite du palier Découverte atteinte (5 courriers par mois). Vos données restent accessibles et modifiables. Pour aller au-delà, activez la formule Essentiel."
}
```

**200 OK — état en lecture seule**

```json
{
  "etat": "EXPIRED",
  "autorise": false,
  "motif_refus": "ETAT_LECTURE_SEULE",
  "message_refus": "Abonnement expiré — lecture seule. Données conservées jusqu'au 31/10/2027."
}
```

Les deux refus sont distingués : un espace expiré à zéro courrier s'entendrait
sinon dire que son plafond est atteint — faux, et cela l'orienterait vers le
mauvais geste.

| Champ | Sens |
|---|---|
| `plafond` | `null` = compteur non plafonné pour cette solution. |
| `periode` | `'YYYY-MM'` pour un flux mensuel, `'total'` pour un stock. Un stock ne se remet jamais à zéro. |
| `mensuel` | Le compteur se réinitialise le 1er du mois, dans le fuseau de l'espace. |

**Pourquoi 200 et non 402 quand le compteur est plein.** C'est une **lecture**,
et elle a réussi. Elle ne consomme rien et **ne journalise aucune tentative de
dépassement** : compter un dépassement ici gonflerait `quota_hits` à chaque
rafraîchissement d'écran et ruinerait le signal commercial que la section 9.8
cherche précisément à produire (« un compte qui bute 5 fois sur le plafond est
un prospect chaud »). Le 402 est émis par les endpoints d'**écriture** qui
refusent réellement.

**Côté serveur, la séquence à respecter dans chaque module métier.** Le refus
passe par `PlafondAtteintException`, qui se rend elle-même et porte déjà le
texte officiel et la formule suivante — n'écrivez pas votre propre réponse :

```php
use App\Exceptions\PlafondAtteintException;

$L = app(\App\Services\LicenceService::class);

if (! $L->peutCreer($orgId, 'courriers_mois')) {
    $L->journaliserDepassement($orgId, 'courriers_mois', auth()->id());

    throw new PlafondAtteintException('courriers_mois');
}

// … écriture …

$L->incrementer($orgId, 'courriers_mois');   // APRÈS le succès, jamais avant
```

Le statut rendu par cette exception est aujourd'hui **403** — voir l'arbitrage
en attente au § 4.

L'incrément est volontairement séparé du contrôle : compter avant que
l'écriture ait abouti ferait consommer un courrier qu'une validation a
finalement refusé.

---

## 10. `POST /api/paiement/callback`

Webhook passerelle : passage en `ACTIVE` et journalisation.

**En-tête obligatoire**

```
X-Licence-Signature: <hash_hmac('sha256', corps_brut, LICENCE_WEBHOOK_SECRET)>
Content-Type: application/json
```

La comparaison est faite en temps constant (`hash_equals`). Le nom de l'en-tête
est configurable (`licence-api.webhook_header`).

**Corps**

| Champ | Type | Obligatoire | Note |
|---|---|---|---|
| `reference_paiement` | chaîne, ≤ 120 | oui | — |
| `statut` | chaîne | non | Défaut `succes`. Valeurs abouties : `succes`, `success`, `validated`, `paid`, `completed`. |

**L'organisation, le montant et la formule ne sont JAMAIS lus dans le corps** :
ils viennent de l'enregistrement de paiement retrouvé en base à partir de la
référence. Un corps signé reste un corps rédigé par un tiers.

**200 OK — activation**

```json
{
  "recu": true,
  "traite": true,
  "etat": "ACTIVE",
  "active": true,
  "formule": "Pro",
  "date_fin": "2027-08-09",
  "licence": { "...": "..." }
}
```

**200 OK — non traité** (`traite: false`, avec `motif`) :
`STATUT_NON_ABOUTI`, `PAIEMENT_INTROUVABLE`, `CORPS_INVALIDE`,
`PAIEMENT_NON_VALIDE`, `DUREE_INDETERMINEE`.

**401 `SIGNATURE_INVALIDE`** — seul code non-200 de cet endpoint.

> **Pourquoi 200 même en cas de refus métier.** Un 4xx déclenche des
> relivraisons en boucle chez la plupart des passerelles : une erreur de données
> deviendrait un incident. Le refus est journalisé côté serveur ; la passerelle,
> elle, doit savoir que le message est arrivé.

**Idempotence.** Une relivraison du même événement renvoie 200 avec
`"deja": true` et **ne crée pas** de seconde période d'abonnement (la référence
est recherchée dans le journal des transitions).

**Sans secret configuré, le webhook refuse tout** et journalise une erreur. Un
secret vide accepté par défaut ferait d'un oubli de configuration une porte
ouverte sur l'activation des licences.

---

## 11. On-premise (section 9.7)

Même moteur, même clé datée. L'instance installée chez le client appelle
`POST /api/licence/verifier` **au démarrage puis une fois par jour**.

Le bloc `hors_ligne` de la réponse lui dit tout ce qu'elle doit savoir :

| Champ | Origine | Sens |
|---|---|---|
| `tolerance_jours` | `tolerance_hors_ligne_jours` de la configuration | Nombre de jours d'indisponibilité réseau tolérés. |
| `verifie_le` | horloge serveur | Date de cette vérification réussie. |
| `degradation_le` | `verifie_le + tolerance_jours` | Date à partir de laquelle l'instance bascule si elle n'a plus joint le serveur. |
| `comportement_apres` | constante | `lecture_seule`. |
| `blocage_total` | constante | **`false`, toujours.** |

**Comportement attendu de l'instance locale**

1. Vérification réussie → mémoriser `verifie_le` et `degradation_le`.
2. Réseau indisponible → **continuer normalement** jusqu'à `degradation_le`.
3. Après `degradation_le` sans vérification réussie → **lecture seule**,
   annoncée par la bannière officielle, données visibles et non masquées.
4. **Jamais de blocage total, jamais de suppression.** « Une clinique ou une
   école bloquée un jour de rentrée coûte plus cher en réputation que
   l'impayé. »

`blocage_total: false` est présent dans la charge utile, et pas seulement dans
cette page : une instance on-premise ne lit pas la documentation.

---

## 12. Sécurité (section 9.8)

| Exigence | Mise en œuvre |
|---|---|
| L'état n'est jamais accepté du client | Aucun endpoint ne lit `etat` ; l'organisation vient de l'utilisateur authentifié ou du paiement retrouvé en base. |
| Toute réponse porte l'état courant | Clé `etat` + en-tête `X-Licence-Etat`, y compris sur les erreurs. Recalculé au dernier moment de la requête. |
| Les tentatives de dépassement sont journalisées | `LicenceService::journaliserDepassement()` → table `quota_hits`, appelée **à l'écriture** par la couche métier (voir § 9). |
| Rien de décisif en `localStorage` | Le front doit relire `GET /api/licence/etat` ; l'état reçu n'est jamais réutilisé pour décider d'une écriture côté serveur. |
| Transitions non répudiables | `license_transitions` refuse `UPDATE` et `DELETE` par déclencheur. |
| Traces d'anomalie | Clé inconnue, clé d'un autre espace, callback non signé, paiement sans durée : journalisés avec IP et utilisateur. |

**Ce que l'API ne dit pas.** Une clé inconnue et une clé appartenant à un autre
espace renvoient le même code et le même message : la réponse n'apprend rien à
qui balaie des clés.

---

## 13. Raccordement et configuration

### Routes

Les routes vivent dans `backend/routes/licence-api.php`. **Ce fichier n'est
chargé par personne tant qu'une ligne n'a pas été ajoutée au premier niveau de
`routes/api.php`** (hors de tout groupe `prefix`) :

```php
require __DIR__ . '/licence-api.php';
```

Le préfixe `/api` posé par `bootstrap/app.php` s'applique alors, et les chemins
obtenus sont exactement ceux de la section 9.4. Ils ne sont **pas** versionnés
en `/api/v1` : le cahier les fixe sans version, et une instance on-premise déjà
installée ne saura jamais qu'on a changé de préfixe.

Après raccordement sur le serveur :

```bash
php8.3 artisan route:cache     # sinon les nouvelles routes restent introuvables
systemctl reload php8.3-fpm
```

### Variables d'environnement

```dotenv
# Secret partagé avec la passerelle de paiement. Sans lui, le webhook refuse tout.
LICENCE_WEBHOOK_SECRET=

# Optionnel — nom de l'en-tête portant la signature HMAC.
LICENCE_WEBHOOK_HEADER=X-Licence-Signature
```

Lues dans `backend/config/licence-api.php`, qui ne porte **que** des réglages de
transport. Durées, plafonds et droits restent dans `licence.config.json` : y
ajouter un jour `essai_jours` créerait la seconde vérité que le cahier interdit.

### Exemples `curl`

```bash
# État courant
curl -s https://secretis.ibigsoft.com/api/licence/etat \
     -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json'

# Vérification de clé (on-premise, publique)
curl -s -X POST https://secretis.ibigsoft.com/api/licence/verifier \
     -H 'Content-Type: application/json' \
     -d '{"cle_licence":"SECRETIS-XXXXXXXXXXXX"}'

# Démarrage d'un essai
curl -s -X POST https://secretis.ibigsoft.com/api/licence/essai \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"formule":"essentiel"}'

# Consommation d'un compteur
curl -s https://secretis.ibigsoft.com/api/quotas/courriers_mois \
     -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json'

# Webhook signé
CORPS='{"reference_paiement":"PAY-2026-000123","statut":"succes"}'
SIG=$(printf '%s' "$CORPS" | openssl dgst -sha256 -hmac "$LICENCE_WEBHOOK_SECRET" -r | cut -d' ' -f1)
curl -s -X POST https://secretis.ibigsoft.com/api/paiement/callback \
     -H 'Content-Type: application/json' -H "X-Licence-Signature: $SIG" \
     -d "$CORPS"
```

---

## Vocabulaire

**Imposé :** Démo publique · Découverte · Essai · Formule · Période de grâce ·
Lecture seule · Plafond · Compteur métier · Espace · Filigrane.

**Banni partout, y compris dans les messages d'erreur :** « version
d'évaluation », « période test », « mode gratuit », « compte free », « licence à
vie », « licence perpétuelle », « compte suspendu », « compte bloqué », « accès
révoqué », ainsi que « trial » et « free » employés en français.

La liste fait foi dans `termes_bannis` de `licence.config.json`.

---

*Voir aussi : `docs/LICENCE-BRIEF.md` (contrat commun), `docs/api-reference.md`
(API v1 générique, conventions distinctes).*
