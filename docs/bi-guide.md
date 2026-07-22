# Guide d'utilisation — Module Business Intelligence
**IBIG SECRETIS ERP** · Version 1.0

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Accès au module BI](#accès-au-module-bi)
3. [Dashboard principal](#dashboard-principal)
4. [Analytics par module](#analytics-par-module)
5. [Glossaire des métriques](#glossaire-des-métriques)
6. [Report Builder — Construction de rapports](#report-builder)
7. [Rapports sauvegardés](#rapports-sauvegardés)
8. [Planification automatique](#planification-automatique)
9. [Export PDF / Excel / CSV](#export)
10. [Exemples de rapports par rôle](#exemples-de-rapports-par-rôle)

---

## 1. Vue d'ensemble

Le module **Business Intelligence** de SECRETIS ERP offre une vision analytique en temps réel de toutes les activités de votre organisation. Il couvre six domaines :

| Module | Ce qu'il mesure |
|--------|----------------|
| Courrier | Flux de correspondance, urgences, délais de traitement |
| Tâches | Avancement projets, complétion, charge par équipe |
| Réunions | Fréquence, durée, décisions, taux de participation |
| RH | Absentéisme, congés, notes de frais |
| Visiteurs | Flux, motifs, heures de pointe, temps d'attente |
| Comptabilité | Revenus, recouvrement, DSO, dépenses |

---

## 2. Accès au module BI

**Navigation :** Menu latéral → **BI / Analytique**

**Permissions requises :**
- `bi.view` — voir le dashboard et les rapports publics
- `bi.reports` — créer et modifier des rapports
- `bi.export` — exporter en PDF, Excel, CSV
- `bi.admin` — gérer les rapports publics et les planifications

---

## 3. Dashboard principal

Le dashboard affiche une vue d'ensemble de tous les modules avec :

### Sélecteur de période
| Option | Période couverte |
|--------|-----------------|
| Aujourd'hui | 00:00 → 23:59 du jour courant |
| Cette semaine | Lundi → Dimanche de la semaine en cours |
| Ce mois | 1er → dernier jour du mois |
| Ce trimestre | Trimestre calendaire en cours |
| Cette année | 1er janvier → 31 décembre |
| Personnalisé | Dates libres saisies manuellement |

### KPI globaux (bandeau supérieur)
Six indicateurs clés, un par module, avec variation vs période précédente.

### Mini-dashboards
Six cartes, une par module, avec :
- 2 indicateurs clés
- Un micro-graphique d'évolution sur 14 jours
- Un lien "Voir détail" vers la page d'analytics dédiée

### Actions rapides
- **Actualiser** — force le rechargement des données (cache 5 min sinon)
- **Construire un rapport** — ouvre le Report Builder
- **Rapport PDF** — exporte le dashboard courant en PDF

---

## 4. Analytics par module

### 4.1 Courrier (`/bi/correspondence`)

Analysez l'ensemble de la correspondance entrante et sortante.

**Graphiques disponibles :**
- **Volume par période** (LineChart) — entrants vs sortants vs total
- **Répartition par urgence** (BarChart horizontal) — haute / normale / basse
- **Délai de traitement** (AreaChart) — évolution du délai moyen en minutes
- **Top 5 expéditeurs** (tableau) — volume de courrier entrant par expéditeur
- **Top 5 destinataires** (tableau) — courrier sortant par destinataire

**KPIs :**
- Volume total sur la période
- Taux SLA (% de courriers traités dans les 48h)
- Délai moyen de traitement (heure réception → statut "traité")
- Volume moyen par jour

---

### 4.2 Tâches (`/bi/tasks`)

Suivi de l'avancement des projets et de la performance des équipes.

**Graphiques :**
- **Créées vs Terminées** (AreaChart) — par semaine sur la période
- **Burndown Chart** (LineChart) — courbe idéale (ligne droite) vs courbe réelle
- **Par assigné** (BarChart horizontal) — total et terminées par membre de l'équipe
- **Par priorité** (PieChart) — haute / normale / basse
- **Taux par projet** (tableau) — % de complétion avec barre de progression

**KPIs :**
- Total de tâches créées
- Total terminées
- Taux de complétion global (%)
- Nombre de tâches en retard
- Durée moyenne par tâche (heures)

---

### 4.3 Réunions (`/bi/meetings`)

Efficacité des réunions et suivi des décisions.

**Graphiques :**
- **Volume par période** (BarChart) — nombre de réunions par semaine
- **Salles les plus utilisées** (BarChart horizontal) — top 5 salles
- **Décisions par type** (PieChart) — Action / Information / Validation

**KPIs :**
- Nombre total de réunions
- Durée moyenne planifiée vs réelle (écart en minutes)
- Taux d'acceptation des invitations (%)
- Réunions avec / sans compte rendu
- Total de décisions extraites

---

### 4.4 RH (`/bi/hr`)

Pilotage des ressources humaines : absences, congés, frais.

**Graphiques :**
- **Absentéisme par département** (BarChart) — jours d'absence
- **Congés par type** (PieChart) — annuel / maladie / maternité / etc.
- **Notes de frais par catégorie** (BarChart) — transport / hébergement / repas / etc.
- **Dépenses par département** (BarChart horizontal)

**KPIs :**
- Total d'absences (occurrences) et jours d'absence
- Montant total des notes de frais approuvées
- Délai moyen d'approbation des congés (heures)

---

### 4.5 Visiteurs (`/bi/visitors`)

Gestion et analyse du flux de visiteurs au siège.

**Graphiques :**
- **Flux visiteurs** (AreaChart) — par heure, jour ou semaine selon la période
- **Motifs de visite** (BarChart) — top 8 raisons
- **Heures de pointe** (BarChart) — distribution par tranche horaire 0-23h

**KPIs :**
- Total de visiteurs
- Rendez-vous vs passages libres
- Temps d'attente moyen (minutes)

---

### 4.6 Comptabilité (`/bi/accounting`)

Pilotage financier de l'organisation.

**Graphiques :**
- **Revenus mensuels** (AreaChart) — facturé / encaissé / en attente
- **Taux de recouvrement** (LineChart) — évolution mensuelle du % encaissé
- **Top 5 clients** (BarChart horizontal) — par chiffre d'affaires
- **Dépenses par catégorie** (PieChart)

**KPIs :**
- Total facturé sur la période
- Total encaissé
- Montant en attente
- DSO — Days Sales Outstanding (délai moyen de paiement en jours)
- Taux de recouvrement global (%)

---

## 5. Glossaire des métriques

### Taux SLA (Service Level Agreement)
**Définition :** Pourcentage de courriers traités dans le délai cible (48 heures par défaut).

**Calcul :**
```
Taux SLA = (courriers traités en ≤ 48h) / (total courriers) × 100
```

**Interprétation :** Un taux > 90% est excellent. En dessous de 75%, il faut investiguer les goulots d'étranglement.

---

### DSO — Days Sales Outstanding
**Définition :** Délai moyen entre l'émission d'une facture et son règlement effectif.

**Calcul :**
```
DSO = Moyenne(date_paiement - date_facture) en jours
```

**Interprétation :** Un DSO ≤ 30 jours est idéal. Au-delà de 60 jours, le risque d'impayés augmente significativement.

---

### Taux de complétion des tâches
**Définition :** Ratio de tâches terminées parmi celles créées sur la période.

**Calcul :**
```
Taux = (tâches statut "done") / (tâches créées) × 100
```

---

### Burndown Chart
**Définition :** Graphique montrant la vitesse de complétion des tâches. La courbe idéale est une droite descendant régulièrement jusqu'à zéro. La courbe réelle montre l'avancement effectif.

**Interprétation :**
- Courbe réelle **au-dessus** de l'idéale → l'équipe est en retard
- Courbe réelle **en dessous** → l'équipe est en avance

---

### Taux d'absentéisme
**Définition :** Rapport entre les jours d'absence et le nombre de jours ouvrés théoriques.

**Calcul :**
```
Taux = (jours d'absence approuvés) / (effectif × jours ouvrés) × 100
```

---

### Taux d'acceptation des invitations
**Définition :** Proportion de participants ayant accepté leur invitation de réunion.

**Calcul :**
```
Taux = (invitations "accepted") / (total invitations envoyées) × 100
```

---

### Taux de recouvrement
**Définition :** Pourcentage du montant facturé effectivement encaissé sur la période.

**Calcul :**
```
Taux = (montant encaissé) / (montant facturé) × 100
```

---

## 6. Report Builder

Le **Report Builder** (`/bi/reports/build`) permet de créer des rapports personnalisés sans connaissance technique.

### Interface

L'écran est divisé en trois zones :

1. **Panel gauche — Métriques disponibles**
   - Arbre organisé par module (Courrier, Tâches, Réunions, RH, Visiteurs, Comptabilité)
   - Champ de recherche pour trouver rapidement une métrique
   - Badge "Nouveau" sur les métriques récentes

2. **Canvas central — Construction du rapport**
   - Zone de dépôt principale
   - Grille responsive de blocs (1 à 3 colonnes selon l'écran)

3. **Barre d'outils supérieure**
   - Nom du rapport (modifiable en ligne)
   - Bouton Prévisualiser / Éditer
   - Bouton Planifier
   - Bouton Sauvegarder

### Comment ajouter une métrique

**Méthode 1 — Glisser-déposer :**
1. Localisez la métrique dans le panel gauche
2. Cliquez-glissez-la vers le canvas central
3. Relâchez dans la zone de dépôt

**Méthode 2 — Clic simple :**
1. Cliquez sur la métrique dans le panel gauche
2. Elle s'ajoute automatiquement au canvas

### Configurer un bloc

Chaque bloc dispose d'un menu contextuel (accessible au survol) :

| Action | Effet |
|--------|-------|
| Icône type (▾) | Changer le type de graphique |
| Icône télécharger | Exporter le graphique en PNG |
| Icône agrandir | Afficher en plein écran |
| × | Supprimer le bloc |

### Types de graphiques disponibles

| Type | Usage recommandé |
|------|-----------------|
| `line` | Évolutions dans le temps |
| `bar` | Comparaisons entre catégories |
| `area` | Volumes cumulés dans le temps |
| `pie` | Répartitions en parts |
| `scatter` | Corrélations entre deux variables |
| `radar` | Comparaison multidimensionnelle |
| `kpi` | Afficher un chiffre clé en grand |
| `table` | Données détaillées tabulaires |

---

## 7. Rapports sauvegardés

La page `/bi/reports` affiche la grille de tous les rapports créés.

### Filtres disponibles
- **Tous** — tous les rapports de l'organisation
- **Planifiés** — rapports avec une planification CRON active
- **Publics** — rapports visibles par tous les membres de l'organisation

### Actions sur un rapport

| Action | Description |
|--------|-------------|
| **Exécuter** | Lance le rapport immédiatement et met à jour `last_run_at` |
| **Modifier** | Ouvre le Report Builder avec la configuration existante |
| **Dupliquer** | Crée une copie du rapport (nommée "Copie de…") |
| **Planifier** | Définit ou modifie la planification CRON |
| **Supprimer** | Supprime définitivement le rapport après confirmation |

---

## 8. Planification automatique

Un rapport peut être configuré pour s'exécuter automatiquement selon une expression **CRON**.

### Préréglages disponibles

| Libellé | Expression CRON | Description |
|---------|-----------------|-------------|
| Chaque lundi à 8h | `0 8 * * 1` | Hebdomadaire, lundi matin |
| Chaque jour à 7h | `0 7 * * *` | Quotidien, 7h du matin |
| 1er du mois à 9h | `0 9 1 * *` | Mensuel |
| Vendredi à 17h | `0 17 * * 5` | Fin de semaine |

### Format CRON personnalisé
```
┌───────────── minute (0 - 59)
│ ┌───────────── heure (0 - 23)
│ │ ┌───────────── jour du mois (1 - 31)
│ │ │ ┌───────────── mois (1 - 12)
│ │ │ │ ┌───────────── jour de la semaine (0 = dim, 1 = lun, …, 6 = sam)
│ │ │ │ │
* * * * *
```

**Exemples :**
- `0 8 * * 1-5` — du lundi au vendredi à 8h
- `0 9 1 */3 *` — le 1er de chaque trimestre à 9h
- `30 7 * * 1` — tous les lundis à 7h30

---

## 9. Export PDF / Excel / CSV

### Depuis le dashboard
Bouton **"Rapport PDF"** dans l'en-tête → génère un PDF du dashboard courant.

### Depuis un rapport sauvegardé
Bouton **Exécuter** → données affichées → menu **Exporter**.

### Via l'API
```
POST /api/bi/export
{
  "format": "pdf" | "excel" | "csv",
  "report_id": 123,          // ou
  "config": { ... }          // configuration ad hoc
}
```

### Contenu des exports

**PDF :**
- En-tête avec nom du rapport et date de génération
- KPIs en tableau récapitulatif
- Graphiques SVG inline pour chaque série temporelle
- Pied de page IBIG SECRETIS

**Excel :**
- Une feuille par section de données
- En-têtes stylisées en bleu SECRETIS
- Auto-ajustement de la largeur des colonnes
- Graphiques Excel natifs pour les séries temporelles

**CSV :**
- Encodage UTF-8 avec BOM (compatible Excel France)
- Séparateur point-virgule (`;`)
- Première série de données disponible

---

## 10. Exemples de rapports par rôle

### Directeur Général (DG)

**Rapport recommandé : "Synthèse exécutive mensuelle"**

Métriques à inclure :
- Courrier → `summary.sla_rate` (KPI)
- Tâches → `summary.completion_rate` (KPI)
- Comptabilité → `summary.recovery_rate` (KPI)
- Réunions → `summary.total_decisions` (KPI)
- Tâches → `by_project` (tableau)
- Comptabilité → `revenue_by_month` (AreaChart)

Planification : `0 8 1 * *` (le 1er de chaque mois à 8h)

---

### Directeur des Ressources Humaines (DRH)

**Rapport recommandé : "Tableau de bord RH hebdomadaire"**

Métriques à inclure :
- RH → `absence_by_dept` (BarChart)
- RH → `by_leave_type` (PieChart)
- RH → `expenses_by_category` (BarChart)
- RH → `summary.avg_approval_hours` (KPI)
- Tâches → `by_assignee` (tableau)

Planification : `0 7 * * 1` (chaque lundi à 7h)

---

### Responsable du Secrétariat

**Rapport recommandé : "Suivi courrier et réunions"**

Métriques à inclure :
- Courrier → `time_series` (LineChart) — entrants/sortants
- Courrier → `by_urgency` (BarChart)
- Courrier → `top_senders` (tableau)
- Réunions → `by_period` (BarChart)
- Visiteurs → `flux` (AreaChart)
- Visiteurs → `summary.avg_wait_min` (KPI)

Planification : `0 8 * * 1,3,5` (lundi, mercredi, vendredi à 8h)

---

### Directeur Administratif et Financier (DAF)

**Rapport recommandé : "Performance financière mensuelle"**

Métriques à inclure :
- Comptabilité → `revenue_by_month` (AreaChart)
- Comptabilité → `recovery_rate` (LineChart)
- Comptabilité → `top_clients` (tableau)
- Comptabilité → `expenses_by_category` (PieChart)
- Comptabilité → `summary.dso_days` (KPI)
- RH → `expenses_by_dept` (BarChart horizontal)

Planification : `0 9 1 * *` (1er du mois à 9h)

---

### Chef de Projet

**Rapport recommandé : "Avancement projets"**

Métriques à inclure :
- Tâches → `created_vs_done` (AreaChart)
- Tâches → `burndown_real` (LineChart avec burndown idéal)
- Tâches → `by_project` (tableau)
- Tâches → `by_assignee` (BarChart)
- Tâches → `summary.overdue` (KPI)
- Réunions → `decisions` (PieChart)

Planification : `0 8 * * 1` (chaque lundi matin)

---

*Guide rédigé pour IBIG SECRETIS ERP — Module BI v1.0*
*Pour toute question : support@ibig-secretis.ci*
