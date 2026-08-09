# Brief licence — SECRETIS ERP

Référence : *IBIG SOFT — Cahier d'implémentation universel v1.1*.
Ce fichier est le contrat commun. **Il ne remplace pas le cahier**, il en fixe
l'application à SECRETIS et nomme le socle déjà construit.

## Le socle est posé — ne le reconstruisez pas

| Élément | Emplacement |
|---|---|
| Source unique de vérité | `backend/config/licence.config.json` |
| Moteur | `backend/app/Services/LicenceService.php` |
| Schéma | migration `2026_08_09_000001_licence_six_etats.php` (**déjà migrée en production**) |

### Paramètres SECRETIS
`solution = secretis` · essai **14 jours** · grâce **7 jours** · rétention **90 jours**
· compteur métier **`courriers_mois`** · plafond **5 courriers par mois**
· prolongation **15 jours, une seule fois, manuelle, motif obligatoire**

### Tables
- `licenses` étendue : `etat` (6 valeurs), `solution`, `cle_licence`, `origine`,
  `date_purge`, `prolongation_faite/le/motif`. La colonne `status` historique est
  conservée et **maintenue alignée par un déclencheur** — ne l'écrivez pas à la main.
- `quotas_usage` : `(organization_id, solution, compteur, periode)` → `valeur`.
  `periode` vaut `'YYYY-MM'` pour un flux, `'total'` pour un stock.
- `license_transitions` : journal **non modifiable** (déclencheur qui refuse
  UPDATE et DELETE). Écrivez-y via `LicenceService::journaliser()`.
- `quota_hits` : tentatives de dépassement (section 9.8).

### Contraintes en base — ne cherchez pas à les contourner
- `licenses_jamais_perpetuelle` : toute licence hors DEMO/FREE **doit** avoir `ends_at`.
- `licenses_etat_valide` : `etat ∈ {DEMO, FREE, TRIAL, ACTIVE, GRACE, EXPIRED}`.

## API du moteur — utilisez-la, ne la dupliquez pas

```php
$L = app(\App\Services\LicenceService::class);

$L->config();                      // tout licence.config.json
$L->essaiJours(); $L->graceJours(); $L->retentionJours();
$L->plafond('courriers_mois');     // 5
$L->resumePlafond();               // « 5 courriers par mois »
$L->filigrane();                   // « Généré avec Secretis ERP — ibigsoft.com »

$L->etat($orgId);                  // état CALCULÉ, la seule autorité
$L->etatComplet($orgId);           // { etat, jours_restants, droits, quotas, message, … }
$L->droits($etat);                 // { ecriture, export, api, multi_utilisateur, sara, whatsapp, sms, filigrane, quotas }
$L->peut($orgId, 'export');        // droit ponctuel

$L->peutCreer($orgId, 'courriers_mois');   // AVANT l'écriture
$L->incrementer($orgId, 'courriers_mois'); // APRÈS l'écriture réussie
$L->decrementer($orgId, 'courriers_mois'); // suppression
$L->quota($orgId, 'courriers_mois');       // { valeur, plafond, restant, autorise, … }
$L->journaliserDepassement($orgId, 'courriers_mois', $userId);
$L->messageRefus('courriers_mois');        // texte officiel 8.5

$L->demarrerEssai($orgId, $formule, $acteur);
$L->prolongerEssai($orgId, $acteur, $motif);
$L->recalculerEtats();             // tâche de 03:00
$L->journaliser($licence, $avant, $apres, $cause, $acteur, $user, $contexte);
```

## Règles non négociables

1. **Aucune durée, aucun plafond, aucun prix en dur.** Ni dans un contrôleur, ni
   dans un composant React, ni dans un e-mail, ni dans un PDF, ni dans un fichier
   de langue, ni dans une réponse SARA. Tout vient du moteur. Écrire `14` ou
   `5 courriers` quelque part est un défaut, même si la valeur est juste
   aujourd'hui.
2. **L'état est calculé côté serveur à chaque requête.** Une valeur d'état reçue
   du navigateur est ignorée. Rien de décisif ne vit dans `localStorage`.
3. **Le contrôle de quota se fait à l'ÉCRITURE, dans la couche métier.** Masquer
   un bouton n'empêche personne d'appeler l'API.
4. **On ne coupe pas, on ne supprime pas.** Fin d'essai → bascule en Découverte,
   l'excédent passe en **lecture seule**, visible et non masqué. Aucun écran ne
   doit dire qu'une donnée est perdue.
5. **Vocabulaire imposé** — Démo publique · Découverte · Essai · Formule ·
   Période de grâce · Lecture seule · Plafond · Compteur métier · Espace ·
   Filigrane.
   **Bannis partout** : « version d'évaluation », « période test », « mode
   gratuit », « compte free », « licence à vie », « licence perpétuelle »,
   « compte suspendu », « compte bloqué », « accès révoqué », « trial » ou
   « free » employés en français.
6. **Textes officiels : copier, ne pas réécrire.** Sections 8.1 à 8.8 du cahier.
   Une formulation qui varie d'un écran à l'autre donne l'impression de règles
   qui varient.

## Droits par état (résumé — la table fait foi dans le JSON)

| État | Écriture | Export | API | Multi-util. | SARA | WhatsApp/SMS | Filigrane | Quotas |
|---|---|---|---|---|---|---|---|---|
| DEMO | oui | non | non | non | non | non | oui | non |
| FREE | oui | non | non | non | non | non | oui | **oui** |
| TRIAL | oui | oui | oui | oui | oui | oui | non | non |
| ACTIVE | oui | oui | oui | oui | oui | oui | non | non |
| GRACE | oui | oui | oui | oui | oui | oui | non | non |
| EXPIRED | **non** | non | non | non | non | non | oui | oui |

## Consignes de travail

- **Environnement** : Laravel 11 + Inertia + React. PostgreSQL. Lint local
  `/c/xampp/php/php -l`. **Vérifiez toujours le schéma réel en base** avant de
  faire confiance à un modèle ou à une migration.
- **Ne touchez pas** `routes/web.php` ni `routes/api.php` : plusieurs chantiers
  tournent en parallèle. Écrivez vos routes dans le fichier qui vous est indiqué,
  et signalez-le dans votre compte rendu — le raccordement est centralisé.
- **Ne modifiez pas** `licence.config.json`, `LicenceService.php`, ni la
  migration du socle. Si le moteur vous manque quelque chose, **signalez-le**
  plutôt que de le contourner localement.
- **Design system** : `@/Components/UI` (`PageHeader`, `Button`, `Badge`, `Card`,
  `StatCard`, `EmptyState`, `Modal`, `FormInput`, `Select`, `cx`, `TEXT_TITLE`,
  `TEXT_MUTED`, `TEXT_FAINT`, `BORDER`, `NUM`). Attention : `Select` prend
  `options=[{value,label}]` et `onChange(valeur)`, pas des `<option>` enfants.
- **Ne déployez pas** sur le serveur et **ne committez pas**. Le déploiement est
  centralisé après recette.
- **Rendez compte** : fichiers créés ou modifiés, ce qui est vérifié et comment,
  ce qui reste ouvert, et toute contradiction rencontrée dans le cahier.

## Arbitrages en attente — à ne pas trancher seul

1. **Collision du nom « Découverte »** : la table `plans` contient déjà une
   formule **payante** nommée « Découverte » à 4 900 FCFA, alors que la section
   3.1 impose ce nom pour le palier **gratuit**. Le nom du palier gratuit est lu
   dans `licence.config.json` et nulle part ailleurs : le changer sera une
   modification d'une ligne. **N'inventez pas de contournement.**
2. **Org 4 (IBIG Soft, interne)** porte une licence contradictoire —
   `status = 'superseded'` avec `superseded_at` NULL — qui la ferait expirer le
   25/08/2026. Ne la corrigez pas : signalez-la.
3. **Démo publique** : `demo.actif = false` dans la configuration. Le cahier
   interdit de publier un lien de démo tant que l'instance n'est pas en ligne
   (section 4.7). N'activez rien, mais prévoyez le cas.
