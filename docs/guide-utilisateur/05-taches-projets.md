# Guide Utilisateur IBIG SECRETIS — Chapitre 05 : Tâches & Projets

> **Module** : Gestion des Tâches et Projets  
> **Profils concernés** : Chef de Projet, Managers, Collaborateurs  
> **Accès** : Menu > Tâches | Menu > Projets

---

## 1. Créer et assigner des tâches

`Tâches > Nouvelle tâche`

### 1.1 Formulaire de création

```
┌─────────────────────────────────────────────────────────────────┐
│  NOUVELLE TÂCHE                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Titre       : [_________________________________]              │
│  Description : [_________________________________]              │
│               [_________________________________]              │
│  Assigné à   : [▼ Sélectionner un utilisateur  ]               │
│  Projet      : [▼ Sélectionner un projet       ]               │
│  Priorité    : ( ) Basse  (●) Normale  ( ) Haute  ( ) Urgente  │
│  Date début  : [__________]  Date fin : [__________]           │
│  Étiquettes  : [_____________]                                  │
│  Sous-tâches : [+ Ajouter une sous-tâche]                      │
│  Pièces jointes : [📎 Ajouter un fichier]                      │
│                                                                 │
│  [  Enregistrer  ]                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Niveaux de priorité :**

| Priorité | Usage | Délai recommandé |
|----------|-------|-----------------|
| Urgente | Bloquant, impact immédiat | Moins de 24h |
| Haute | Important, à traiter en priorité | 2-3 jours |
| Normale | Tâche courante | Dans la semaine |
| Basse | À faire quand possible | Sans contrainte forte |

### 1.2 Assigner une tâche

- **Assignation simple** : sélectionnez un utilisateur dans le champ **Assigné à**
- **Assignation multiple** : cliquez sur **+ Co-assigné** pour ajouter des membres additionnels
- La personne assignée reçoit une notification immédiate

> **[ASTUCE]**  
> Utilisez les étiquettes (tags) pour regrouper visuellement les tâches par thème : `#urgence`, `#budget`, `#RH`, `#client`.

---

## 2. Utiliser la vue Kanban (glisser-déposer)

`Tâches > Vue Kanban`

La vue Kanban affiche les tâches sous forme de colonnes représentant les statuts :

```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│   À FAIRE     │   EN COURS    │   EN RÉVISION │   TERMINÉ     │
│─────────────── │─────────────── │─────────────── │───────────────│
│ ┌───────────┐ │ ┌───────────┐ │ ┌───────────┐ │ ┌───────────┐ │
│ │Préparer   │ │ │Rapport    │ │ │Budget Q3  │ │ │Convocations│ │
│ │convocation│ │ │mensuel RH │ │ │prévision. │ │ │envoyées   │ │
│ │📅 25/07   │ │ │👤 Yao A.  │ │ │👤 Konan A.│ │ │✓ Terminé  │ │
│ │👤 Ahou C. │ │ │🔴 En retard│ │ │🟡 Normale │ │ └───────────┘ │
│ └───────────┘ │ └───────────┘ │ └───────────┘ │               │
│               │               │               │               │
│ [+ Ajouter]   │ [+ Ajouter]   │ [+ Ajouter]   │               │
└───────────────┴───────────────┴───────────────┴───────────────┘
```

### Déplacer une tâche

1. Cliquez sur une carte tâche et maintenez le bouton enfoncé
2. Faites glisser la carte vers la colonne de destination
3. Relâchez — le statut de la tâche est mis à jour automatiquement
4. La personne assignée reçoit une notification de changement de statut

### Personnaliser les colonnes

`Tâches > Paramètres Kanban > Colonnes`

Vous pouvez ajouter, renommer ou supprimer des colonnes selon votre workflow d'équipe.

---

## 3. Utiliser la vue liste et le diagramme de Gantt

### 3.1 Vue Liste

`Tâches > Vue Liste`

La vue liste affiche les tâches sous forme tabulaire avec filtres avancés :

| Colonne | Description |
|---------|-------------|
| Titre | Nom de la tâche avec icône de priorité |
| Assigné | Avatar de l'utilisateur assigné |
| Projet | Projet parent |
| Statut | Couleur et libellé du statut |
| Échéance | Date limite avec indicateur de retard |
| Avancement | Barre de progression (%) |

**Filtres disponibles** : Par assigné, par projet, par statut, par priorité, par date, par étiquette.

### 3.2 Diagramme de Gantt

`Projets > [Nom du projet] > Vue Gantt`

```
PROJET : Digitalisation des archives — Gantt Juillet-Août 2026

  Tâche                        │ Juil 21│ Juil 28│ Août 04│ Août 11│
  ─────────────────────────────┼────────┼────────┼────────┼────────┤
  1. Audit documents existants │▓▓▓▓▓▓▓ │        │        │        │
  2. Création arborescence GED │   ▓▓▓▓▓│▓▓      │        │        │
  3. Numérisation courriers    │        │  ▓▓▓▓▓▓│▓▓▓▓▓▓▓ │        │
  4. Formation équipe          │        │        │    ▓▓▓ │        │
  5. Validation et mise en prod│        │        │        │▓▓▓▓▓   │
  ─────────────────────────────┴────────┴────────┴────────┴────────┘
```

- **Barre pleine** : durée planifiée de la tâche
- **Barre hachurée** : avancement réel
- **Ligne rouge** : aujourd'hui
- **Flèche** : dépendance entre tâches

Pour ajuster les dates : cliquez et faites glisser les extrémités de la barre.

---

## 4. Créer des projets et regrouper des tâches

`Projets > Nouveau projet`

### 4.1 Informations du projet

| Champ | Description |
|-------|-------------|
| **Nom** | Intitulé du projet |
| **Description** | Objectifs et contexte |
| **Chef de projet** | Responsable principal |
| **Membres** | Équipe projet |
| **Dates** | Date de début et de fin prévue |
| **Budget** | Budget alloué (optionnel) |
| **Statut** | Planifié, En cours, En pause, Terminé |
| **Couleur** | Couleur d'identification visuelle |

### 4.2 Regrouper les tâches en sprints ou phases

Dans un projet, organisez les tâches en **phases** :
1. Cliquez sur **+ Ajouter une phase**
2. Nommez la phase (ex : "Phase 1 — Cadrage")
3. Glissez-déposez les tâches dans la phase souhaitée

---

## 5. Gérer les sous-tâches et les dépendances

### 5.1 Sous-tâches

Une tâche peut contenir autant de sous-tâches que nécessaire :

1. Ouvrez la fiche d'une tâche
2. Dans la section **Sous-tâches**, cliquez sur **+ Ajouter**
3. Saisissez le titre de la sous-tâche
4. Assignez et définissez l'échéance si nécessaire
5. Cochez les sous-tâches au fur et à mesure de l'avancement

La tâche parente affiche automatiquement la progression : `Sous-tâches : 3/7 complétées (43%)`

### 5.2 Dépendances entre tâches

`Vue Gantt > Clic droit sur une tâche > Ajouter une dépendance`

Types de dépendances disponibles :
- **Fin → Début** : la tâche B ne peut commencer qu'après la fin de A (le plus courant)
- **Début → Début** : les deux tâches doivent commencer en même temps
- **Fin → Fin** : les deux tâches doivent finir en même temps

> **[!] Attention**  
> Si vous décalez une tâche qui a des dépendances, SECRETIS vous propose de décaler automatiquement les tâches liées.

---

## 6. Commenter et collaborer sur une tâche

Dans chaque tâche, un espace de discussion est disponible :

1. Ouvrez la fiche de la tâche
2. Faites défiler jusqu'à la section **Commentaires**
3. Saisissez votre commentaire dans la zone de texte
4. Mentionnez des collègues avec `@prenom.nom` pour les notifier
5. Joignez des fichiers ou des captures d'écran avec 📎
6. Cliquez sur **Envoyer**

> **[ASTUCE]**  
> Utilisez les **réactions emoji** pour accuser réception d'un commentaire sans encombrer la discussion (👍, ✅, 🔍).

---

## 7. Recevoir les alertes d'échéance

SECRETIS envoie des alertes automatiques pour vos tâches :

| Délai | Type d'alerte |
|-------|--------------|
| 3 jours avant | Notification in-app + email |
| 1 jour avant | Notification in-app + email (urgence) |
| Le jour J | Rappel matin 08h00 |
| Après l'échéance | Alerte retard (quotidien jusqu'à complétion) |

### Configurer vos préférences d'alerte

`Profil > Préférences > Notifications > Tâches`

Vous pouvez choisir :
- Les canaux : In-app, Email, WhatsApp (si configuré)
- Les délais : 1 semaine, 3 jours, 1 jour, Jour J
- La fréquence des rappels en retard

---

## 8. Tableau de bord d'avancement projet

`Projets > [Nom du projet] > Vue d'ensemble`

```
┌─────────────────────────────────────────────────────────────────┐
│  PROJET : Digitalisation des archives                           │
│  Statut : En cours  │  Début : 01/07/2026  │  Fin : 31/08/2026 │
├──────────────────────┬──────────────────────────────────────────┤
│  AVANCEMENT GLOBAL   │             TÂCHES PAR STATUT            │
│                      │  À faire      ████░░░░░░░  8 (40%)       │
│    ████████░░  65%   │  En cours     ███░░░░░░░░  6 (30%)       │
│                      │  En révision  ██░░░░░░░░░  3 (15%)       │
│                      │  Terminées    ███░░░░░░░░  3 (15%)       │
├──────────────────────┴──────────────────────────────────────────┤
│  TÂCHES EN RETARD (2)                                           │
│  • Numérisation courriers 2022 — Retard : 3 jours — 👤 Ahou C. │
│  • Validation arborescence — Retard : 1 jour — 👤 Konan A.     │
├─────────────────────────────────────────────────────────────────┤
│  MEMBRES DE L'ÉQUIPE                 │  ACTIVITÉ RÉCENTE        │
│  👤 Yao A. — Chef de projet          │  Ahou C. a terminé       │
│  👤 Konan A. — 5 tâches              │  "Audit docs 2023"       │
│  👤 Ahou C. — 8 tâches               │  il y a 2 heures         │
│  👤 Diallo S. — 4 tâches             │                          │
└──────────────────────────────────────────────────────────────────┘
```

---

*Fin du chapitre 05 — Tâches & Projets*

[← Chapitre précédent : 04 — Réunions](04-reunions.md) | [Chapitre suivant : 06 — Communication →](06-communication.md)
