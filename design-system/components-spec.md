# IBIG SECRETIS — Spécification des Composants UI

> **Stack :** React.js + Inertia.js + Tailwind CSS  
> **Version :** 1.0.0  
> **Charte :** Bleu marine `#1A3A5C` / Bleu vif `#2E86C1` / Or `#F39C12`

---

## Table des matières

1. [Buttons](#1-buttons)
2. [Forms](#2-forms)
3. [Cards](#3-cards)
4. [Tables](#4-tables)
5. [Badges](#5-badges)
6. [Modals](#6-modals)
7. [Navigation](#7-navigation)
8. [Notifications](#8-notifications)
9. [Dashboard](#9-dashboard)
10. [Kanban](#10-kanban)
11. [Calendar](#11-calendar)

---

## 1. Buttons

### Variants

| Variant     | Fond              | Texte    | Utilisation                          |
|-------------|-------------------|----------|--------------------------------------|
| `Primary`   | `#1A3A5C`         | Blanc    | Action principale de la page         |
| `Secondary` | `#2E86C1`         | Blanc    | Actions secondaires, CTA alternatifs |
| `Danger`    | `#C0392B`         | Blanc    | Suppression, actions destructives    |
| `Ghost`     | Transparent       | `#1A3A5C` + bordure | Actions tertiaires, annulation |
| `Icon-only` | Transparent       | Icône    | Actions dans une barre d'outils      |
| `Accent`    | `#F39C12`         | Blanc    | Mise en avant, promotions            |

### Tailles

| Taille | Padding          | Font-size | Hauteur  |
|--------|------------------|-----------|----------|
| `sm`   | `6px 12px`       | 14px      | 32px     |
| `md`   | `8px 16px`       | 16px      | 40px     |
| `lg`   | `12px 24px`      | 18px      | 48px     |

### États

```
État          Classe / Style
──────────────────────────────────────────────────────────────
normal        Style de base
hover         Fond assombri de 10%, élévation shadow-primary
focus         ring-2 ring-offset-2 ring-primary-200
active        Fond assombri de 15%
disabled      opacity-50, cursor-not-allowed, pointer-events-none
loading       Icône spinner animé (spin 1s linear ∞), pointer-events-none
```

### État loading

Le bouton en loading affiche un `<svg>` spinner à gauche du texte. Le texte devient "Chargement…" ou reste visible selon le contexte. La largeur du bouton ne change pas.

### Spécification React

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  iconOnly?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}
```

---

## 2. Forms

### 2.1 Input Text

```
Hauteur         : 40px (sm: 32px, lg: 48px)
Padding         : 8px 12px
Border          : 1px solid #BDC3C7
Border radius   : 8px
Background      : #FFFFFF
Font            : Inter 16px / #1C1C1C
Placeholder     : #ADB5BD
```

**États :**

| État       | Border                          | Ring                               | Icône   |
|------------|---------------------------------|------------------------------------|---------|
| `default`  | `1px solid #BDC3C7`             | —                                  | —       |
| `focus`    | `1px solid #2E86C1`             | `0 0 0 3px rgba(46,134,193,0.25)` | —       |
| `error`    | `1px solid #C0392B`             | `0 0 0 3px rgba(192,57,43,0.20)`  | ✕ rouge |
| `success`  | `1px solid #1E8449`             | `0 0 0 3px rgba(30,132,73,0.20)`  | ✓ vert  |
| `disabled` | `1px solid #E8EAEC`, bg gris    | —                                  | —       |
| `readonly` | Pas de border, bg secondaire    | —                                  | 🔒      |

**Message d'aide / erreur :** texte `12px / #C0392B` ou `#6C757D` sous le champ, avec icône correspondante.

**Label :** `14px / font-medium / #1C1C1C`, requis marqué `*` en rouge.

### 2.2 Textarea

Mêmes règles que Input, avec :
- `resize: vertical` uniquement
- Hauteur min : 80px, hauteur max : 300px
- Compte de caractères optionnel en bas à droite

### 2.3 Select

- Apparence native cachée, remplacement custom
- Flèche chevron `#6C757D` à droite
- Dropdown : fond blanc, shadow-dropdown, radius 8px
- Options : padding `8px 12px`, hover `bg-bg-hover`
- Option sélectionnée : texte `#1A3A5C` + fond `#EAF0F7`
- Multi-select : tags/pilules supprimables

### 2.4 Checkbox

```
Taille          : 18px × 18px
Border radius   : 4px
Coché           : Fond #2E86C1 + coche blanche SVG
Non coché       : Bordure #BDC3C7, fond blanc
Indéterminé     : Fond #2E86C1 + tiret blanc
Focus           : ring-2 ring-offset-1 ring-secondary-300
```

Label cliquable sur toute la largeur. Groupe de checkboxes : espacement `8px` entre items.

### 2.5 Radio

```
Taille          : 18px × 18px (cercle)
Sélectionné     : Cercle extérieur #2E86C1, point intérieur blanc
Non sélectionné : Bordure #BDC3C7, fond blanc
```

### 2.6 Switch (Toggle)

```
Dimensions      : 44px × 24px (track) / 20px (thumb)
Activé          : Track #2E86C1, thumb blanc
Désactivé       : Track #BDC3C7, thumb blanc
Animation       : transition: transform 150ms ease-in-out
```

Avec label à droite, sous-label descriptif optionnel.

### 2.7 DatePicker

- Input text + icône calendrier à droite
- Popup : calendrier month view, navigation ◀ ▶
- Plage de dates : sélection start/end avec surbrillance bleue
- Header : mois/année en `font-semibold`
- Jours : fond transparent par défaut
- Jour sélectionné : fond `#1A3A5C`, texte blanc, radius-full
- Aujourd'hui : bordure `#2E86C1`
- Plage : fond `#EAF0F7`

### 2.8 FilePicker

```
Zone de drop    : Bordure dashed 2px #BDC3C7, radius 8px, fond #F5F7FA
État hover/drag : Bordure #2E86C1, fond #E8F4FB
Icône           : Upload cloud, couleur #6C757D
Texte           : "Glissez un fichier ici ou cliquez pour sélectionner"
Formats accept  : affichés sous la zone
Fichier ajouté  : Liste avec nom, taille, bouton supprimer ✕
```

### Formulaire — Structure globale

```
FormGroup
  └── Label [required?]
  └── HelperText? (avant le champ)
  └── Input / Select / ...
  └── ErrorMessage? | SuccessMessage?

Espacement vertical entre groupes : 20px
```

---

## 3. Cards

### 3.1 Card Basic

```
Background      : #FFFFFF
Border          : 1px solid #BDC3C7
Border radius   : 8px
Shadow          : 0 2px 8px rgba(0,0,0,0.08)
Padding         : 24px
```

Zones : `.card-header`, `.card-body`, `.card-footer`  
Séparateur : `1px solid #E8EAEC`

**Hover optionnel :** shadow augmente à `0 8px 24px rgba(0,0,0,0.12)` — transition 200ms.

### 3.2 Card Stats (KPI Tile)

```
Disposition     : icône à gauche (fond coloré) + valeur + label
Icône container : 48×48px, border-radius 12px, fond teinté
Valeur          : 30px / font-bold / #1C1C1C
Label           : 14px / #6C757D
Tendance        : flèche ▲▼ + pourcentage (vert/rouge)
Padding         : 20px 24px
```

Variantes couleur : `primary`, `secondary`, `success`, `warning`, `danger`  
L'icône container prend la couleur de variante à 15% d'opacité.

### 3.3 Module Card (écran d'accueil)

```
Disposition     : icône centrée en haut + titre + description
Taille icône    : 56×56px, border-radius 16px
Titre           : 18px / font-semibold
Description     : 14px / #6C757D
Hover           : scale(1.02) + shadow-card-hover
Clic            : navigation vers le module
```

---

## 4. Tables

### Structure

```
<table>
  <thead>  ← Fond #1A3A5C, texte blanc, font-semibold, 14px
  <tbody>
    <tr>   ← Lignes alternées : blanc / #F5F7FA
    <tr>   ← Hover : #F0F4F8
```

### Colonnes

- En-tête : `padding: 12px 16px`, texte UPPERCASE 12px, tracking-wider
- Cellule : `padding: 12px 16px`, font-size 14px
- Colonne actions : toujours à droite, icônes Voir/Modifier/Supprimer

### Sorting

- Icône `↕` sur les colonnes triables, affichée au hover
- Colonne active : icône `↑` ou `↓` + texte légèrement plus foncé
- Clic : ASC → DESC → aucun tri

### Sélection

- Checkbox dans la première colonne
- Ligne sélectionnée : fond `#EAF0F7`
- Barre d'actions contextuelle apparaît si > 0 sélectionnés

### Pagination

```
[← Précédent]  1  2  3 … 10  [Suivant →]
"Affichage de 1 à 20 sur 156 résultats"
Sélecteur : 10 / 20 / 50 / 100 par page
```

Boutons : ghost avec fond `#F5F7FA` hover, page active fond `#1A3A5C` texte blanc.

### Table vide

Illustration centrée + message "Aucun résultat" + bouton d'action primaire.

### Table compacte

Padding réduit à `8px 12px`, font-size 13px.

---

## 5. Badges

### Par statut document/courrier/tâche

| Badge       | Fond        | Texte      | Couleur fond | Couleur texte |
|-------------|-------------|------------|--------------|---------------|
| `pending`   | En attente  | Orange     | `#FAD9C1`    | `#AC5816`     |
| `active`    | Actif       | Vert       | `#C2E3CA`    | `#14582F`     |
| `expired`   | Expiré      | Rouge      | `#F0C0C0`    | `#84271D`     |
| `draft`     | Brouillon   | Gris       | `#E8EAEC`    | `#525252`     |
| `cancelled` | Annulé      | Gris barré | `#F3F4F6`    | `#6B7280`     |
| `urgent`    | Urgent      | Rouge fort | `#C0392B`    | `#FFFFFF`     |
| `info`      | Info        | Bleu       | `#C5E1F4`    | `#1D5680`     |
| `reviewed`  | Relu        | Bleu forêt | `#EAF0F7`    | `#1A3A5C`     |

### Spécification

```
Padding         : 2px 10px
Border radius   : 9999px (pilule)
Font-size       : 12px
Font-weight     : 600 (semibold)
Line-height     : 20px
```

### Badge numérique (notification)

Rond `20×20px`, fond `#C0392B`, texte blanc `12px / bold`, positionné en `top-right` de l'élément parent.  
Si valeur > 99 : afficher "99+"

---

## 6. Modals

### 6.1 Modal Standard

```
Overlay         : rgba(0,0,0,0.5), z-index 500
Conteneur       : #FFFFFF, radius 12px, shadow-modal
Max-width       : 512px (sm), 768px (lg)
Animation       : fadeIn 200ms + scale 0.95→1 200ms
```

**Structure :**
```
.modal
  .modal-header
    Titre (20px / font-semibold)
    Bouton fermer ✕ (top-right)
    [Séparateur border-bottom]
  .modal-body
    Contenu, padding 24px
  .modal-footer
    [Séparateur border-top]
    Boutons : [Annuler (ghost)] [Confirmer (primary)]
```

Fermeture : bouton ✕, clic sur overlay, touche Escape.  
Focus trap : le focus reste dans la modal (accessibilité).

### 6.2 Modal Confirmation (Destructive)

```
Icône           : ⚠️ ou 🗑️ dans cercle rouge 64×64px, centré
Titre           : "Confirmer la suppression"
Texte           : Description de l'action irréversible
Boutons         : [Annuler] [Supprimer (danger)]
```

Le bouton Supprimer a un délai optionnel de 3 secondes avant d'être actif (pattern "cooldown").

### 6.3 Modal Full-screen (Mobile)

Sur mobile (`< 768px`), la modal s'affiche en plein écran :
```
Position        : fixed, inset 0
Border radius   : radius-lg en haut seulement
Animation       : slide-up depuis le bas
Header          : fixé en haut
Footer          : fixé en bas
Body            : scrollable
```

---

## 7. Navigation

### 7.1 Sidebar Desktop

```
Largeur         : 256px (16rem)
Fond            : #142D47 (primary-800)
Position        : fixed, h-screen, z-100
Shadow          : 2px 0 8px rgba(0,0,0,0.10)
```

**Structure :**

```
.sidebar
  .sidebar-brand
    Logo 32×32px + "IBIG SECRETIS" (bold, blanc)
  .sidebar-nav
    .nav-section-label  ← "PRINCIPAL", "MODULES", etc. (10px, uppercase, gris)
    .nav-item           ← icône 20px + label
    .nav-item.active    ← fond #2E86C1, texte blanc
    .nav-item:hover     ← fond #1A3A5C, transition 150ms
  .sidebar-footer
    Avatar utilisateur + nom + rôle
    Lien Paramètres / Déconnexion
```

**10 modules SECRETIS :**

| # | Module              | Icône Lucide       |
|---|---------------------|--------------------|
| 1 | Tableau de bord     | LayoutDashboard    |
| 2 | Courriers           | Mail               |
| 3 | Tâches              | CheckSquare        |
| 4 | Agenda / Réunions   | Calendar           |
| 5 | Visiteurs           | Users              |
| 6 | Documents           | FolderOpen         |
| 7 | Décisions           | Scale              |
| 8 | Notes internes      | FileText           |
| 9 | Archives            | Archive            |
|10 | Paramètres          | Settings           |

### 7.2 Header

```
Hauteur         : 60px
Fond            : #FFFFFF
Border-bottom   : 1px solid #E8EAEC
Shadow          : 0 2px 4px rgba(0,0,0,0.08)
Z-index         : 200
```

**Zones :**
- Gauche : bouton toggle sidebar (hamburger), breadcrumb
- Centre : barre de recherche globale (max-width 400px)
- Droite : notifications 🔔, thème 🌙, avatar utilisateur

### 7.3 Bottom Navigation (Mobile)

```
Hauteur         : 64px
Fond            : #FFFFFF
Border-top      : 1px solid #BDC3C7
Position        : fixed, bottom-0, w-full
Z-index         : 200
```

**Items (4-5 max) :**

| Icône         | Label       |
|---------------|-------------|
| LayoutDashboard | Accueil   |
| Mail          | Courriers   |
| CheckSquare   | Tâches      |
| Calendar      | Agenda      |
| Menu          | Plus        |

- Item actif : icône + label `#2E86C1`, fond teinte bleue circulaire
- Inactive : `#6C757D`
- Badge de notification : cercle rouge `#C0392B`

---

## 8. Notifications

### 8.1 Toast

```
Position        : fixed, top-right, margin 16px (z-700)
Min-width       : 288px / Max-width : 384px
Border radius   : 8px
Shadow          : var(--shadow-toast)
Animation       : slide-in + fade-in (300ms) / slide-out + fade-out (200ms)
Auto-dismiss    : 4 secondes (success/info), 8 secondes (warning), jamais (error)
```

**Variants :**

| Type      | Fond       | Icône  | Border-left        |
|-----------|------------|--------|--------------------|
| `success` | Blanc      | ✓ vert | 4px solid #1E8449  |
| `error`   | Blanc      | ✕ rouge| 4px solid #C0392B  |
| `warning` | Blanc      | ⚠ ambre| 4px solid #E67E22  |
| `info`    | Blanc      | ℹ bleu | 4px solid #2E86C1  |

Structure : icône + titre + message + bouton fermer ✕ + barre de progression (durée).

### 8.2 Alert Banner

Pleine largeur, sous le header ou dans la zone de contenu.

```
Padding         : 12px 16px
Border radius   : 8px
Font-size       : 14px
```

| Type      | Fond       | Texte      | Icône  |
|-----------|------------|------------|--------|
| `success` | `#E8F5EC`  | `#14582F`  | ✓      |
| `error`   | `#FAEAEA`  | `#84271D`  | ✕      |
| `warning` | `#FDF2E9`  | `#AC5816`  | ⚠      |
| `info`    | `#E8F4FB`  | `#1D5680`  | ℹ      |

Avec bouton de fermeture ✕ à droite, action optionnelle (lien/bouton).

### 8.3 Badge Notification

```
Forme           : cercle 20×20px (≤99) ou pilule (>99)
Fond            : #C0392B
Texte           : blanc, 11px, bold
Position        : absolute, top: -4px, right: -4px
```

Pour les items de navigation sidebar et bottom-nav.

---

## 9. Dashboard

### 9.1 KPI Tile

Voir Card Stats (3.2). Layout sur une grille 4 colonnes desktop / 2 colonnes tablette / 1 colonne mobile.

Données affichées :
- Valeur principale (grand chiffre)
- Label descriptif
- Tendance (% vs période précédente) avec flèche colorée
- Icône représentative

### 9.2 Chart Container

```
Card wrapping un graphique Recharts
Header          : Titre + période selector [Jour/Semaine/Mois] (tabs)
Body            : <ResponsiveContainer height={280}>
Footer opt.     : Légende inline
```

Couleurs graphiques :
1. `#1A3A5C` (primary)
2. `#2E86C1` (secondary)
3. `#F39C12` (accent)
4. `#1E8449` (success)
5. `#E67E22` (warning)
6. `#C0392B` (danger)

### 9.3 Activity Feed

```
Liste chronologique d'événements
Item            : avatar/icône + description + horodatage (relative time)
Connecteur      : ligne verticale tiretée #E8EAEC entre items
Max visible     : 10 items + bouton "Voir tout"
```

Types d'activité : courrier reçu, tâche créée/clôturée, réunion planifiée, visiteur arrivé, document signé…

### 9.4 Agenda du jour

```
Section avec titre "Agenda du jour — Lundi 21 juillet 2026"
Items timeline  : heure + titre + lieu + participants
Heure passée    : opacité 50%
En cours        : bordure gauche #2E86C1 + fond #E8F4FB
À venir         : bordure gauche #BDC3C7
```

---

## 10. Kanban

### 10.1 Board

```
Disposition     : flex, overflow-x: auto, gap 16px, padding 16px
Fond            : #F5F7FA
Min-height      : calc(100vh - header - padding)
```

### 10.2 Column

```
Largeur         : 288px (18rem), flex-shrink: 0
Fond            : #FFFFFF
Border radius   : 12px
Shadow          : var(--shadow-sm)
Padding         : 12px
Max-height      : calc(100vh - 180px)
Overflow-y      : auto (scrollbar-thin)
```

**Header colonne :**
- Label + badge count (rond `#1A3A5C` + texte blanc)
- Bouton `+` ajouter une carte
- Couleur accent de la colonne (barre top 4px)

**Couleurs colonnes :**

| Colonne      | Barre top  |
|--------------|------------|
| À faire      | `#BDC3C7`  |
| En cours     | `#2E86C1`  |
| En révision  | `#F39C12`  |
| Terminé      | `#1E8449`  |
| Bloqué       | `#C0392B`  |

### 10.3 Card Kanban

```
Fond            : #FFFFFF
Border radius   : 8px
Shadow          : 0 1px 3px rgba(0,0,0,0.10)
Padding         : 12px
Margin-bottom   : 8px
Cursor          : grab / grabbing
```

**Contenu :**
- Titre (14px / font-medium)
- Description courte (12px / #6C757D, 2 lignes max)
- Badges priorité/statut
- Assignés : avatars groupés (max 3 + count)
- Date échéance (si proche ou dépassée : rouge)
- Barre progression optionnelle (checklist)
- Drag handle (6 points `⠿`) visible au hover

**États :**
- Hover : shadow-md
- Dragging : shadow-xl, rotation légère 2deg, opacité 90%
- Drop target : bordure dashed `#2E86C1`

---

## 11. Calendar

### 11.1 Vue Mois (Month View)

```
Grille          : 7 colonnes (lun→dim)
Header semaine  : L M M J V S D — 14px / font-semibold / #6C757D
Cellule jour    : min-height 80px, border #E8EAEC
Numéro jour     : top-right, 14px
Aujourd'hui     : numéro sur fond #2E86C1 rond, texte blanc
Autre mois      : opacité 40%
```

**Événements dans cellule :**
- Pilule colorée : 12px, truncate, radius 4px
- Max 3 visible + "+N autres"
- Clic : popover avec détail

### 11.2 Vue Semaine (Week View)

```
Colonnes        : 7 jours + colonne heures (gauche, 48px)
Hauteur heure   : 60px
Heures          : 00:00 → 23:00, 30min slots
Événement       : bloc positionné absolument, coloré, truncate
Overlap         : côte à côte, largeur divisée
Ligne "maintenant" : rouge, z-above events
```

### 11.3 Vue Jour (Day View)

Même principe que semaine, colonne unique avec détails complets de chaque événement.

**Header commun (toutes vues) :**

```
[◀ Précédent]  [Aujourd'hui]  [Suivant ▶]  |  [Mois] [Semaine] [Jour]
                "Juillet 2026"
```

**Couleurs d'événements :**

| Type              | Couleur    |
|-------------------|------------|
| Réunion           | `#2E86C1`  |
| Courrier          | `#1A3A5C`  |
| Tâche             | `#F39C12`  |
| Visiteur          | `#1E8449`  |
| Congé / Absence   | `#6C757D`  |
| Urgent            | `#C0392B`  |

---

## Principes d'accessibilité

- Ratio de contraste minimum 4.5:1 (WCAG AA) sur tous les textes
- Focus visible sur tous les éléments interactifs
- `aria-label` sur icônes sans texte
- `role` et `aria-*` appropriés (dialog, alertdialog, navigation, etc.)
- Keyboard navigation complète (Tab, Enter, Space, Escape, flèches)
- Messages d'erreur liés aux inputs via `aria-describedby`
- Animations respectent `prefers-reduced-motion`

---

## Grille responsive

| Breakpoint | Nom      | Largeur min | Sidebar    |
|------------|----------|-------------|------------|
| `xs`       | Mobile   | 0           | Bottom nav |
| `sm`       | Mobile L | 640px       | Bottom nav |
| `md`       | Tablette | 768px       | Sidebar collapsée (icônes) |
| `lg`       | Desktop  | 1024px      | Sidebar complète 256px |
| `xl`       | Desktop L| 1280px      | Sidebar + zone XL |
| `2xl`      | Wide     | 1536px      | Sidebar + contenu max-7xl |

---

*Document généré le 21 juillet 2026 — IBIG Soft / SECRETIS ERP*
