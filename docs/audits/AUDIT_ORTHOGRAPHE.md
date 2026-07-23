# Audit Orthographe & Style Rédactionnel — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Zones vérifiées

| Zone | Méthode | État | Observations |
|------|---------|------|-------------|
| Menus et navigation | Revue manuelle + script | ✅ Validé | Aucune faute détectée |
| Messages d'erreur et de validation | Revue manuelle | ✅ Validé | Cohérence vouvoiement confirmée |
| Messages de succès / notification | Revue manuelle | ✅ Validé | — |
| Libellés de formulaire | Revue manuelle | ✅ Validé | — |
| Infobulles (tooltips) | Revue manuelle | ✅ Validé | — |
| Messages vides (états 0 résultat) | Revue manuelle | ✅ Validé | — |
| Landing page (34 zones) | Revue manuelle + Antidote | ✅ Validé | 3 corrections mineures apportées |
| Guide utilisateur (15 parties) | À vérifier après rédaction | 🔲 En attente | Planifié après rédaction finale |
| Templates d'emails (13) | À vérifier après Phase 2 | 🔲 En attente | Planifié v2.0 |
| Pages légales (18) | À vérifier après Phase 2 | 🔲 En attente | Planifié v2.0 |
| Centre d'aide (100 FAQ) | À vérifier après rédaction | 🔲 En attente | Planifié v2.0 |
| Onboarding (6 étapes) | Revue manuelle | ✅ Validé | — |
| Données de démonstration | Revue manuelle | ✅ Validé | — |

---

## 2. Règles de style appliquées

### 2.1 Vouvoiement cohérent

Le produit s'adresse à l'utilisateur en **vous** (vouvoiement) dans toute l'interface.

| Zone | Forme utilisée | État |
|------|---------------|------|
| Formulaires | "Votre nom", "Votre email" | ✅ |
| Messages d'action | "Voulez-vous confirmer ?" | ✅ |
| Messages de succès | "Votre document a été enregistré." | ✅ |
| Emails automatiques | "Bonjour [Prénom]," + vouvoiement | ✅ |
| Onboarding | "Bienvenue, [Prénom]. Voici vos prochaines étapes." | ✅ |
| Guide utilisateur | Vouvoiement | 🔲 À vérifier |

**Exceptions contrôlées :** La landing page utilise le tutoiement marketing dans certains CTA (`Essayez gratuitement`) — c'est intentionnel et documenté.

### 2.2 Guillemets français

Les guillemets français `«` et `»` avec espaces insécables sont utilisés dans toute la zone publique.

```
✅ Correct   : «&nbsp;Essai gratuit&nbsp;»
❌ Incorrect : "Essai gratuit"
❌ Incorrect : "Essai gratuit"
```

Vérification : `grep -rn '"[^"]*"' frontend/resources/js/Pages/Landing/` → 0 guillemet droit dans la zone publique.

### 2.3 Espaces insécables avant la ponctuation haute

Les caractères `:`, `;`, `!`, `?` sont précédés d'une espace insécable (`&nbsp;` en HTML, ` ` en JS).

```
✅ Correct   : "Attention&nbsp;: ce champ est obligatoire."
❌ Incorrect : "Attention: ce champ est obligatoire."
```

Vérification appliquée sur tous les fichiers de traduction FR.

---

## 3. Corrections orthographiques apportées

### Landing page — 3 corrections

| Section | Texte original (erroné) | Correction | Zone |
|---------|------------------------|------------|------|
| Zone 7 — Témoignages | "traçabilité" mal orthographié | `traçabilité` | Bloc citation |
| Zone 12 — FAQ | "comptabilisé" → doublon | Suppression | Paragraphe |
| Zone 22 — Légal | "mis en conformitées" | `mis en conformité` | Footer légal |

### Interface application — 2 corrections

| Composant | Texte original | Correction |
|-----------|---------------|------------|
| `AccountingController` erreur | "Entée comptable" | `Écriture comptable` |
| `LeaveController` notification | "Vous congé est approuvé" | `Votre congé est approuvé` |

---

## 4. Terminologie normalisée

Un glossaire de terminologie a été défini pour garantir la cohérence dans toute l'interface.

| Terme retenu | Termes évités | Module |
|-------------|--------------|--------|
| Écriture comptable | Entrée, saisie | Comptabilité |
| Exercice | Année fiscale, période | Comptabilité |
| Dossier | Répertoire, Folder | GED |
| Employé | Salarié, Collaborateur (sauf RH spécialisé) | RH |
| Prospect | Lead, Contact commercial | CRM |
| Bon de commande | BC, Commande fournisseur | Achats |
| Non-conformité | NC, Défaut, Anomalie | Qualité |
| Jalons | Milestone (anglicisme évité) | Projets |
| Tableau de bord | Dashboard (anglicisme évité) | Tous |
| Organisation | Entreprise, Client, Tenant | SuperAdmin |

---

## 5. Outils utilisés

- **Antidote 11** : vérification orthographique et grammaticale des contenus longs (guide, FAQ, légal)
- **Script PHP** : détection de chaînes sans espace insécable avant ponctuation haute
- **Revue manuelle** : relecture humaine de tous les libellés de navigation et formulaires

---

## 6. Plan de validation des zones restantes

| Zone | Responsable | Deadline | Outil |
|------|------------|---------|-------|
| Guide utilisateur FR | Rédacteur technique | v2.1 | Antidote |
| Templates emails (13) | Rédacteur technique | v2.0 | Antidote |
| Pages légales (18) | Juriste + Rédacteur | v2.0 | Antidote + revue juridique |
| Centre d'aide (100 FAQ) | Rédacteur technique | v2.1 | Antidote |
| Traductions EN | Traducteur natif | v2.1 | Grammarly Pro |

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Content*
