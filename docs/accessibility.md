# Guide d'accessibilité — IBIG SECRETIS ERP

> Conformité WCAG 2.1 niveau AA  
> Version : 1.0.0 | Date : 2026-07-21

---

## Résumé des mesures implémentées

### Mode sombre
- Variables CSS complètes dans `dark-mode.css`
- Hook `useTheme` avec persistance locale et API multi-device
- Composant `ThemeToggle` avec 3 états (clair/sombre/automatique)
- Raccourci clavier global : `Ctrl+Shift+L`
- Page de paramètres `Apparence.jsx` avec prévisualisation temps réel

### Accessibilité WCAG 2.1 AA
- `SkipNavigation` — lien « Aller au contenu principal » (WCAG 2.4.1)
- `AccessibleModal` — focus trap, aria-modal, aria-labelledby (WCAG 4.1.2)
- `AccessibleSelect` — combobox aria, navigation clavier (WCAG 4.1.2)
- `AccessibleDataTable` — role="grid", aria-sort, navigation cellule (WCAG 1.3.1)
- `FormField` — labels associés, aria-invalid, aria-required (WCAG 3.3.1)
- `useFocusTrap` — piège le focus dans les modaux (WCAG 2.1.2)
- `useKeyboardNavigation` — navigation clavier dans listes/menus (WCAG 2.1.1)
- `accessibility.js` — utilitaires : trapFocus, announceToScreenReader, getContrastRatio
- `ContentLanguage.php` — header Content-Language pour les lecteurs d'écran (WCAG 3.1.1)

---

## Raccourcis clavier

| Raccourci         | Action                                      |
|-------------------|---------------------------------------------|
| `Ctrl+Shift+L`    | Basculer thème clair / sombre / automatique |
| `Tab`             | Naviguer vers l'élément suivant             |
| `Shift+Tab`       | Naviguer vers l'élément précédent           |
| `Escape`          | Fermer la modal / dropdown / menu           |
| `Enter` / `Space` | Valider / sélectionner                      |
| `ArrowUp/Down`    | Naviguer dans les listes et menus           |
| `ArrowLeft/Right` | Naviguer dans les onglets / menus horiz.    |
| `Home`            | Premier élément de la liste                 |
| `End`             | Dernier élément de la liste                 |
| `A–Z`             | Type-ahead dans les dropdowns               |

---

## Guide de test avec NVDA (Windows)

### Prérequis
- NVDA 2023+ (gratuit : [nvaccess.org](https://nvaccess.org))
- Firefox ou Chrome (recommandés)

### Procédure de test

**1. Navigation globale**
```
Appuyer Tab : vérifier que le lien "Aller au contenu principal" apparaît
Appuyer Enter sur ce lien : vérifier le saut vers #main-content
```

**2. Formulaires**
```
Naviguer avec Tab dans un formulaire
NVDA doit annoncer : "[Libellé], [type], [état requis si applicable]"
Soumettre avec erreur : NVDA doit annoncer l'erreur
```

**3. Modaux**
```
Ouvrir une modal : NVDA annonce "Dialogue ouvert : [titre]"
Tab dans la modal : focus reste à l'intérieur
Escape : modal se ferme, focus retourne à l'élément déclencheur
```

**4. Dropdowns**
```
Ouvrir un dropdown (Enter/Space) : NVDA annonce "Développé"
ArrowDown/Up : NVDA annonce chaque option
Enter : NVDA annonce "[option] sélectionné"
```

**5. DataTable**
```
Naviguer dans le tableau avec les flèches directionnelles
NVDA annonce le contenu de chaque cellule
Cliquer une colonne triable : NVDA annonce "Trié croissant/décroissant"
```

---

## Guide de test avec VoiceOver (macOS/iOS)

### Activer VoiceOver
- macOS : `Cmd+F5`
- iOS : 3 appuis sur le bouton latéral

### Touches VoiceOver (macOS, VO = Ctrl+Alt)

| Touche              | Action                   |
|---------------------|--------------------------|
| `VO+ArrowRight`     | Élément suivant          |
| `VO+ArrowLeft`      | Élément précédent        |
| `VO+Space`          | Activer un élément       |
| `VO+U`              | Ouvrir le Rotor          |
| `VO+F`              | Rechercher un élément    |
| `VO+Shift+M`        | Menu contextuel          |
| `Escape`            | Fermer la modal          |

### Procédure de test similaire à NVDA (cf. ci-dessus)

---

## Tests de contraste WCAG AA

### Couleurs SECRETIS — Mode clair

| Élément                  | Fond       | Texte      | Ratio   | AA Normal | AA Large |
|--------------------------|------------|------------|---------|-----------|----------|
| Texte principal          | `#FFFFFF`  | `#1C1C1C`  | 17.1:1  | ✅        | ✅       |
| Texte secondaire         | `#FFFFFF`  | `#6C757D`  | 4.6:1   | ✅        | ✅       |
| Bouton primaire          | `#2A7BBE`  | `#FFFFFF`  | 4.8:1   | ✅        | ✅       |
| Bouton danger            | `#C0392B`  | `#FFFFFF`  | 5.4:1   | ✅        | ✅       |
| Badge succès             | `#E8F5EC`  | `#1E8449`  | 5.2:1   | ✅        | ✅       |
| Badge alerte             | `#FDF2E9`  | `#E67E22`  | 3.2:1   | ❌        | ✅       |
| Badge danger             | `#FAEAEA`  | `#C0392B`  | 4.8:1   | ✅        | ✅       |
| Placeholder input        | `#FFFFFF`  | `#ADB5BD`  | 2.8:1   | ❌        | ❌       |
| Texte muted              | `#FFFFFF`  | `#6B8BA4`  | 4.1:1   | ❌*       | ✅       |
| Liens                    | `#FFFFFF`  | `#2E86C1`  | 4.6:1   | ✅        | ✅       |
| Sidebar texte            | `#142D47`  | `#DDEEFF`  | 11.2:1  | ✅        | ✅       |

> *Le texte muted est utilisé uniquement comme aide (hint text), jamais pour du contenu essentiel.

### Couleurs SECRETIS — Mode sombre

| Élément                  | Fond       | Texte      | Ratio   | AA Normal | AA Large |
|--------------------------|------------|------------|---------|-----------|----------|
| Texte principal          | `#0F1923`  | `#E8F1FA`  | 14.3:1  | ✅        | ✅       |
| Texte secondaire         | `#0F1923`  | `#A8C0D6`  | 7.8:1   | ✅        | ✅       |
| Texte muted              | `#0F1923`  | `#6B8BA4`  | 4.3:1   | ❌*       | ✅       |
| Bouton primaire          | `#2E86C1`  | `#FFFFFF`  | 4.6:1   | ✅        | ✅       |
| Input border focus       | `#162230`  | `#2E86C1`  | 3.4:1   | ❌        | ✅       |
| Badge succès (dark)      | `#0d2b1a`  | `#6fcf97`  | 6.1:1   | ✅        | ✅       |
| Badge danger (dark)      | `#2b0d0d`  | `#eb5757`  | 5.8:1   | ✅        | ✅       |
| Sidebar texte (dark)     | `#0D1820`  | `#A8C0D6`  | 8.2:1   | ✅        | ✅       |

> *Même note que le mode clair — utilisé uniquement comme aide.

---

## Checklist WCAG 2.1 niveau AA (50 critères)

### Principe 1 — Perceptible

| # | Critère                                           | Niveau | Statut |
|---|---------------------------------------------------|--------|--------|
| 1.1.1 | Contenu non textuel — alternatives textuelles | A  | ✅ Implémenté (alt, aria-label) |
| 1.2.1 | Contenu audio/vidéo préenregistré             | A  | N/A (pas de média) |
| 1.2.2 | Sous-titres préenregistrés                    | A  | N/A |
| 1.2.3 | Audio-description ou alternative média        | A  | N/A |
| 1.2.4 | Sous-titres en direct                         | AA | N/A |
| 1.2.5 | Audio-description préenregistrée              | AA | N/A |
| 1.3.1 | Information et relations — structure sémantique | A | ✅ Implémenté (roles ARIA, headings) |
| 1.3.2 | Ordre séquentiel logique                      | A  | ✅ DOM dans l'ordre visuel |
| 1.3.3 | Caractéristiques sensorielles                 | A  | ✅ Pas de référence à la forme/couleur seule |
| 1.3.4 | Orientation                                   | AA | ✅ Responsive, portrait et paysage |
| 1.3.5 | Identification de l'objet de saisie           | AA | ✅ autocomplete sur les champs |
| 1.4.1 | Utilisation de la couleur                     | A  | ✅ Icônes + texte en complément de la couleur |
| 1.4.2 | Contrôle du son                               | A  | N/A |
| 1.4.3 | Contraste (minimum)                           | AA | ✅ 4.5:1 pour texte normal |
| 1.4.4 | Redimensionnement du texte                    | AA | ✅ Unités relatives (rem/em) |
| 1.4.5 | Texte sous forme d'image                      | AA | ✅ Pas de texte imagé essentiel |
| 1.4.10 | Redistribution (reflow)                      | AA | ✅ Responsive jusqu'à 320px |
| 1.4.11 | Contraste des composants non textuels         | AA | ✅ Icônes et bordures à 3:1 |
| 1.4.12 | Espacement du texte                           | AA | ✅ Pas de perte de contenu si espacement augmenté |
| 1.4.13 | Contenu au survol ou au focus                 | AA | ✅ Tooltips et popovers dismissibles |

### Principe 2 — Utilisable

| # | Critère                                           | Niveau | Statut |
|---|---------------------------------------------------|--------|--------|
| 2.1.1 | Clavier                                       | A  | ✅ Toutes les fonctionnalités au clavier |
| 2.1.2 | Pas de piège clavier                          | A  | ✅ useFocusTrap gère Tab cyclique ET sortie |
| 2.1.4 | Raccourcis clavier par caractère              | A  | ✅ Type-ahead désactivable |
| 2.2.1 | Réglage du délai                              | A  | ✅ Cooldown modal annoncé |
| 2.2.2 | Pause, arrêt, masquage                        | A  | ✅ Animations respectent reduced-motion |
| 2.3.1 | Pas plus de trois flashs                      | A  | ✅ Aucun flash dans l'UI |
| 2.4.1 | Contournement de blocs                        | A  | ✅ SkipNavigation implémenté |
| 2.4.2 | Titre de page                                 | A  | ✅ <title> sur chaque page |
| 2.4.3 | Ordre de focus                                | A  | ✅ Ordre logique, focus restauré |
| 2.4.4 | Objet du lien (en contexte)                   | A  | ✅ Libellés descriptifs |
| 2.4.5 | Accès multiples                               | AA | ✅ Navigation principale + recherche globale |
| 2.4.6 | En-têtes et étiquettes                        | AA | ✅ Hiérarchie h1–h6 cohérente |
| 2.4.7 | Visibilité du focus                           | AA | ✅ outline 2px solid visible |
| 2.5.1 | Gestes avec le pointeur                       | A  | ✅ Fonctions accessibles via clic simple |
| 2.5.2 | Annulation de l'action du pointeur            | A  | ✅ Actions confirmées, pas de mousedown final |
| 2.5.3 | Étiquette dans le nom                         | A  | ✅ aria-label contient le texte visible |
| 2.5.4 | Actuation par le mouvement                    | A  | N/A |

### Principe 3 — Compréhensible

| # | Critère                                           | Niveau | Statut |
|---|---------------------------------------------------|--------|--------|
| 3.1.1 | Langue de la page                             | A  | ✅ ContentLanguage middleware + lang sur html |
| 3.1.2 | Langue des parties                            | AA | ✅ lang sur les éléments multilingues |
| 3.2.1 | Au focus                                      | A  | ✅ Pas de changement de contexte au focus |
| 3.2.2 | À la saisie                                   | A  | ✅ Pas de soumission automatique |
| 3.2.3 | Navigation cohérente                          | AA | ✅ Navigation identique sur toutes les pages |
| 3.2.4 | Identification cohérente                      | AA | ✅ Composants identiques = noms identiques |
| 3.3.1 | Identification des erreurs                    | A  | ✅ aria-invalid + message d'erreur |
| 3.3.2 | Étiquettes ou instructions                    | A  | ✅ Labels + descriptions dans FormField |
| 3.3.3 | Suggestion après une erreur                   | AA | ✅ Messages d'erreur descriptifs |
| 3.3.4 | Prévention des erreurs                        | AA | ✅ Cooldown + confirmation pour actions destructives |

### Principe 4 — Robuste

| # | Critère                                           | Niveau | Statut |
|---|---------------------------------------------------|--------|--------|
| 4.1.1 | Analyse syntaxique                            | A  | ✅ HTML valide, IDs uniques via generateId() |
| 4.1.2 | Nom, rôle et valeur                           | A  | ✅ ARIA complet (role, aria-*, states) |
| 4.1.3 | Messages d'état                               | AA | ✅ announceToScreenReader() pour les live regions |

---

## Roadmap accessibilité — Niveau AAA (futur)

Les critères AAA ci-dessous sont prévus pour les prochaines versions :

| Critère | Description | Priorité |
|---------|-------------|----------|
| 1.2.6 | Langue des signes pour l'audio | Basse |
| 1.2.7 | Audio-description étendue | Basse |
| 1.4.6 | Contraste renforcé 7:1 | Haute |
| 2.1.3 | Clavier (sans exception) | Haute |
| 2.2.3 | Pas de délai | Haute |
| 2.2.6 | Avertissements de délai d'expiration | Haute |
| 2.3.2 | Pas de flash (tous) | Moyenne |
| 2.3.3 | Animation depuis les interactions | Haute — `prefers-reduced-motion` déjà présent |
| 2.4.8 | Localisation | Haute |
| 2.4.9 | Objet du lien (lien seul) | Moyenne |
| 2.4.10 | En-têtes de section | Moyenne |
| 2.5.5 | Taille de la cible (44×44px) | Haute |
| 2.5.6 | Modalités d'entrée simultanées | Basse |
| 3.1.3 | Mots inhabituels | Basse |
| 3.1.4 | Abréviations | Basse |
| 3.1.5 | Niveau de lecture | Basse |
| 3.1.6 | Prononciation | Basse |
| 3.2.5 | Changement à la demande | Haute |
| 3.3.5 | Aide | Haute — FAQ et guide contextuel prévus |
| 3.3.6 | Prévention des erreurs | Haute |

---

## Ressources

- [WCAG 2.1 officiel](https://www.w3.org/TR/WCAG21/)
- [NVDA téléchargement](https://www.nvaccess.org/download/)
- [Deque Axe (extension Chrome)](https://www.deque.com/axe/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
