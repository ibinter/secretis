# Guide du module Gestion de Projets — IBIG SECRETIS

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Liste des projets](#liste-des-projets)
3. [Dashboard de projet](#dashboard-de-projet)
4. [Diagramme de Gantt](#diagramme-de-gantt)
5. [Chemin critique (CPM)](#chemin-critique-cpm)
6. [Gestion du budget](#gestion-du-budget)
7. [Feuille de temps](#feuille-de-temps)
8. [Gestion des risques](#gestion-des-risques)
9. [Indicateurs de santé](#indicateurs-de-santé)
10. [Milestones](#milestones)

---

## Vue d'ensemble

Le module Gestion de Projets d'IBIG SECRETIS permet de piloter l'ensemble du cycle de vie d'un projet :

- Planification et suivi des tâches avec dépendances
- Visualisation Gantt interactive (SVG natif, sans librairie externe)
- Suivi budgétaire en temps réel (depuis les feuilles de temps)
- Analyse des risques sur matrice Probabilité × Impact
- Indicateurs de santé automatiques (on_track / at_risk / off_track)
- Milestones avec progression automatique

---

## Liste des projets

Accessible via **Menu → Projets**.

### Vues disponibles

| Vue   | Description |
|-------|-------------|
| Cards | Carte visuelle avec mini-Gantt 4 semaines, barre de budget, pastille de santé |
| Liste | Tableau dense, idéal pour comparer de nombreux projets |

### Filtres

- **Recherche** : nom, client, manager
- **Santé** : En bonne voie / À risque / Hors piste
- **Statut** : Actif / En pause / Terminé / Annulé

### Pastille de santé

Chaque projet affiche une pastille colorée indiquant sa santé globale :

- 🟢 **En bonne voie** — planning et budget respectés
- 🟡 **À risque** — léger retard ou dépassement de budget
- 🔴 **Hors piste** — retard significatif ou dépassement important

---

## Dashboard de projet

Le dashboard offre une vue 360° du projet sur une seule page.

### Sections

1. **Header** — Nom, client, badge de santé, barre de progression globale, dates
2. **KPIs** (4 tuiles) :
   - Budget consommé (% et montants)
   - Tâches (terminées/total, en cours, en retard)
   - Heures saisies et membres actifs
   - Risques ouverts
3. **Courbe en S** — Progression planifiée vs réelle sur la durée du projet
4. **Milestones** — Liste avec statut et avancement
5. **Risques ouverts** — Tableau trié par criticité
6. **Alertes planning** — Tâches en retard ou à risque
7. **Équipe** — Membres du projet avec leur rôle

### Courbe en S (S-curve)

La courbe en S compare :
- **Ligne bleue** : progression théorique (linéaire selon la durée)
- **Ligne verte** : progression réelle (basée sur les tâches complétées)

Un écart entre les deux indique un retard (ligne verte sous la bleue) ou une avance (ligne verte au-dessus).

---

## Diagramme de Gantt

### Navigation

| Action | Résultat |
|--------|----------|
| Bouton **+ Zoom** | Passe en vue Jour (plus détaillée) |
| Bouton **− Zoom** | Passe en vue Semaine ou Mois |
| **Molette souris** | Zoom in/out |
| Bouton **Aujourd'hui** | Centre la vue sur la date du jour |
| **Clic sur une tâche** | Sélectionne la tâche (panneau gauche) |

### Vues Zoom

| Niveau | Unité | Période affichée |
|--------|-------|-----------------|
| Jour   | Jour  | 14 jours |
| Semaine | Semaine | 6 semaines |
| Mois   | Mois  | 6 mois |

### Éléments visuels

| Élément | Description |
|---------|-------------|
| **Barre de tâche** | Largeur proportionnelle à la durée, couleur selon l'assigné |
| **Progression** | Zone semi-transparente à l'intérieur de la barre |
| **Barre rouge** | Tâche sur le chemin critique |
| **Losange ◆** | Milestone sur la timeline |
| **Flèche en pointillé** | Dépendance entre deux tâches |
| **Ligne bleue verticale** | Aujourd'hui |

### Modifier les dates (drag & drop)

1. **Déplacer une tâche** : cliquer-glisser sur le corps de la barre horizontalement
2. **Modifier la durée** : cliquer-glisser sur la poignée droite de la barre
3. Les changements sont envoyés automatiquement à l'API (PATCH /tasks/{id}/dates)

### Ajouter une dépendance

Via l'API ou le panneau de détail de tâche :
```
POST /tasks/{id}/dependencies
{
  "depends_on_task_id": 42,
  "dependency_type": "finish_to_start",
  "lag_days": 0
}
```

Types de dépendances :
- `finish_to_start` (FS) — La tâche B commence quand A se termine *(plus courant)*
- `start_to_start` (SS) — Les deux tâches commencent ensemble
- `finish_to_finish` (FF) — Les deux tâches se terminent ensemble

---

## Chemin critique (CPM)

### Définition

Le **chemin critique** est la séquence de tâches qui détermine la durée minimale du projet. Un retard sur l'une de ces tâches retarde l'ensemble du projet.

### Comment SECRETIS le calcule

L'algorithme CPM (Critical Path Method) est exécuté en deux passes :

**1. Passe avant (Forward pass)**
- Calcule la date de début au plus tôt (ES) et de fin au plus tôt (EF) pour chaque tâche
- Part de la première tâche (ES = 0)
- Pour chaque tâche, ES = max(EF de tous les prédécesseurs)

**2. Passe arrière (Backward pass)**
- Calcule la date de fin au plus tard (LF) et de début au plus tard (LS)
- Part de la dernière tâche (LF = durée totale du projet)
- Pour chaque tâche, LF = min(LS de tous les successeurs)

**3. Identification**
- **Marge totale** = LS − ES (ou LF − EF)
- Une tâche est sur le **chemin critique** si sa marge = 0

### Lecture dans SECRETIS

- Les barres de tâches **rouges** dans le Gantt sont sur le chemin critique
- Le panneau gauche affiche un point rouge pour ces tâches
- L'API retourne le tableau `criticalPath` avec les IDs des tâches concernées

### Bonnes pratiques

- Concentrez les ressources sur les tâches du chemin critique en priorité
- Toute ressource libérée sur une tâche non-critique peut être redirigée vers le chemin critique
- Surveiller l'allongement de durée d'une tâche critique — même un jour de retard impacte la livraison

---

## Gestion du budget

### Structure du budget

| Champ | Description |
|-------|-------------|
| `budget_planned` | Budget prévisionnel initial |
| `budget_spent`   | Budget consommé (recalculé depuis les timesheets) |
| `budget_currency` | Devise (ex. XOF, EUR, USD) |

### Calcul automatique

Le budget consommé est recalculé automatiquement à chaque saisie de temps :

```
budget_spent = SUM(heures × taux_horaire) pour toutes les entrées facturables
```

Le recalcul est déclenché par le Job `RecalculateProjectHealth` après chaque modification.

### Indicateur dans le dashboard

- **< 85%** — Vert : budget bien maîtrisé
- **85–100%** — Amber : attention, approche du plafond
- **> 100%** — Rouge : dépassement de budget

### KPI "Score budget"

Comparaison du taux de consommation budget vs taux d'avancement des tâches :
- Si vous avez consommé 70% du budget pour 70% des tâches → Score 100 (en bonne voie)
- Si vous avez consommé 90% du budget pour 50% des tâches → Score 20 (hors piste)

---

## Feuille de temps

### Accès

Dashboard de projet → bouton **⏱ Temps** ou Menu → Projets → [Projet] → Feuille de temps

### Saisie

1. Sélectionnez la **vue** (Semaine ou Mois)
2. Naviguez avec les boutons **‹** et **›**
3. **Double-cliquez** sur une cellule pour saisir les heures
4. Entrez le nombre d'heures (ex. `7.5` pour 7h30)
5. Appuyez sur **Entrée** ou cliquez ailleurs pour valider

### Colonnes et lignes

- **Lignes** : un collaborateur par ligne
- **Colonnes** : un jour par colonne (weekend grisé)
- **Ligne de total** : somme par jour
- **Colonne Total** : somme par collaborateur

### Export CSV

Le bouton **↓ Export CSV** génère un fichier Excel-compatible avec :
- Toutes les entrées de la période
- Totaux par collaborateur et par jour
- Encodage UTF-8 avec BOM pour l'ouverture correcte dans Excel

### Données facturables

Chaque entrée peut être marquée comme facturable (`is_billable: true`).
Le montant facturable = heures × taux horaire.
Ce montant est visible dans les KPIs du dashboard.

---

## Gestion des risques

### Créer un risque

Via le dashboard → section Risques → bouton "+ Risque" ou par API :
```
POST /projets/{id}/risks
{
  "title": "Départ d'un développeur clé",
  "probability": "medium",
  "impact": "high",
  "mitigation": "Former un développeur de backup",
  "owner_id": 12
}
```

### Matrice des risques (RiskMatrix)

La matrice 3×3 classe chaque risque à l'intersection de :
- **Probabilité** (axe vertical) : Faible / Moyen / Élevé
- **Impact** (axe horizontal) : Faible / Moyen / Élevé

| Score | Zone | Couleur |
|-------|------|---------|
| 1–2   | Faible    | 🟢 Vert |
| 3     | Moyen     | 🟡 Amber |
| 4–5   | Élevé     | 🟠 Orange |
| 6–9   | Critique  | 🔴 Rouge |

Cliquer sur un risque dans la matrice ouvre un **drawer** latéral avec tous les détails.

### Cycle de vie d'un risque

```
open → mitigated → closed
```

- **open** : risque actif, visible dans la matrice
- **mitigated** : le plan d'atténuation est appliqué, risque réduit
- **closed** : risque éliminé, n'apparaît plus dans la matrice

---

## Indicateurs de santé

### Calcul automatique

La santé est recalculée par le Job `RecalculateProjectHealth` après chaque modification de tâche ou milestone.

**Score planning** (0–100) :
```
delta = avancement_réel% − avancement_théorique%
delta ≥ -10%  → Score 100 (on track)
delta ≥ -25%  → Score  60 (at risk)
delta <  -25% → Score  20 (off track)
```

**Score budget** (0–100) :
```
delta = taux_consommation_budget% − avancement_réel%
delta ≤ 10%   → Score 100
delta ≤ 25%   → Score  60
delta >  25%  → Score  20
```

**Santé globale** = moyenne des deux scores :
- ≥ 70 → **on_track** (En bonne voie)
- ≥ 40 → **at_risk** (À risque)
- < 40 → **off_track** (Hors piste)

### Notifications automatiques

Le manager du projet reçoit une notification si la santé se dégrade :
- on_track → at_risk
- on_track → off_track
- at_risk → off_track

---

## Milestones

### Définition

Un milestone (jalon) est un événement clé dans le projet, associé à une date et un ensemble de tâches.

### Créer un milestone

```
POST /projets/{id}/milestones
{
  "name": "Livraison V1",
  "due_date": "2026-03-31",
  "color": "#8B5CF6",
  "description": "Livraison de la première version..."
}
```

### Progression automatique

La progression d'un milestone est calculée automatiquement :
```
completion_percent = (tâches_terminées / tâches_du_milestone) × 100
```

### Statuts automatiques

| Condition | Statut |
|-----------|--------|
| completion_percent = 100 | completed ✅ |
| due_date < aujourd'hui ET < 100% | missed ❌ |
| 0 < completion_percent < 100 | in_progress 🔄 |
| completion_percent = 0 | pending ⏳ |

### Affichage dans le Gantt

Les milestones apparaissent comme des **losanges ◆** sur la timeline horizontale :
- 🟢 Vert : terminé
- 🔴 Rouge : manqué
- 🟣 Violet (ou couleur custom) : en attente / en cours

---

## Permissions et visibilité

| Rôle membre | Voir | Modifier tâches | Modifier projet |
|-------------|------|-----------------|-----------------|
| observer    | ✅   | ❌              | ❌              |
| member      | ✅   | ✅              | ❌              |
| manager     | ✅   | ✅              | ✅              |

La visibilité du projet (`private` / `team` / `public`) contrôle qui peut le voir :
- **private** : membres uniquement
- **team** : toute l'organisation
- **public** : visible par les portails clients

---

## API Reference

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/projets` | Liste des projets |
| GET | `/projets/{id}` | Dashboard du projet |
| GET | `/projets/{id}/gantt` | Vue Gantt |
| GET | `/api/projets/{id}/gantt` | Données Gantt (JSON) |
| GET | `/api/projets/{id}/dashboard` | Métriques (JSON) |
| POST | `/api/projets/{id}/milestones` | Créer milestone |
| PUT | `/api/projets/{id}/milestones/{mId}` | Modifier milestone |
| DELETE | `/api/projets/{id}/milestones/{mId}` | Supprimer milestone |
| POST | `/api/tasks/{id}/dependencies` | Ajouter dépendance |
| DELETE | `/api/tasks/{id}/dependencies/{dId}` | Supprimer dépendance |
| PATCH | `/api/tasks/{id}/dates` | Modifier dates/progression |
| GET | `/api/projets/{id}/feuille-de-temps` | Rapport de temps |
| POST | `/api/projets/{id}/feuille-de-temps` | Saisir du temps |
| GET | `/api/projets/{id}/risks` | Liste des risques |
| POST | `/api/projets/{id}/risks` | Créer un risque |
| PUT | `/api/projets/{id}/risks/{rId}` | Modifier un risque |
