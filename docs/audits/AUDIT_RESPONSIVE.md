# Audit Responsive — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0  
**Outil :** Chrome DevTools, Playwright, tests manuels

---

## 1. Breakpoints testés

| Breakpoint | Nom | Appareils cibles |
|-----------|-----|-----------------|
| 320 px | XS | Petits smartphones (iPhone SE 1ère gen) |
| 375 px | SM | iPhone 12/13/14 standard |
| 412 px | MD | Android mid-range (Samsung Galaxy A) |
| 768 px | LG | iPad portrait, tablettes |
| 1024 px | XL | iPad paysage, petits laptops |
| 1280 px | 2XL | Laptops standards |
| 1440 px | 3XL | Écrans larges |
| 1920 px | 4XL | Grands écrans, iMac |

---

## 2. CSS de base obligatoire — appliqué globalement

```css
/* resources/css/app.css */
*, *::before, *::after {
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
}

body {
    min-height: 100vh;
    overflow-x: hidden;
}

img, video, svg, canvas {
    max-width: 100%;
    height: auto;
    display: block;
}

table {
    width: 100%;
}

.overflow-table-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}
```

---

## 3. Résultats par module

### Landing Page

| Composant | 320 | 375 | 412 | 768 | 1024 | 1280+ | Statut |
|-----------|:---:|:---:|:---:|:---:|:----:|:-----:|--------|
| Navbar (hamburger < 768px) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Hero section | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Section fonctionnalités (grid → 1 col mobile) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Tableau de tarifs (scroll horizontal < 768px) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Section témoignages (carousel mobile) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Formulaire de démo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| SARA chatbot (bottom-right, z-50) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Footer (flex-col < 768px) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Bandeau cookie | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |

### Tableau de bord (Application)

| Composant | 320 | 375 | 412 | 768 | 1024 | 1280+ | Statut |
|-----------|:---:|:---:|:---:|:---:|:----:|:-----:|--------|
| Sidebar (drawer < 768px) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| KPI Cards (grid responsive) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Tableaux de données (scroll H) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Graphiques Recharts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Formulaires (stack vertical mobile) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Modale (fullscreen < 640px) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Gantt (scroll horizontal) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |
| Organigramme (zoom + pan) | 🟡 | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 320px limité |
| Kanban CRM (scroll H mobile) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ OK |

---

## 4. Problèmes identifiés et corrections

| # | Problème | Breakpoint | Module | Correction apportée | État |
|---|----------|-----------|--------|---------------------|------|
| 1 | Tableau comptabilité débordait à 320px | 320px | Comptabilité | Ajout `.overflow-x-auto` wrapper | ✅ Corrigé |
| 2 | Organigramme illisible à 320px | 320px | RH | Bouton "Voir en grand" ajouté | 🟡 Partiel |
| 3 | Bouton SARA chevauchait WhatsApp | < 375px | Landing | Positionnement `bottom-20 right-3` | ✅ Corrigé |
| 4 | Menu déroulant dépassait l'écran | 375px | Tous | `overflow-hidden` + `max-w-screen` | ✅ Corrigé |
| 5 | Graphique Recharts non responsive | < 768px | BI | `ResponsiveContainer width="100%"` | ✅ Corrigé |
| 6 | Images non compressées > 500 Ko | Tous | Landing | WebP + lazy loading | ✅ Corrigé |
| 7 | Text-overflow sur labels longs | 375px | RH, Budget | `truncate` + `title` tooltip | ✅ Corrigé |

---

## 5. Tests Playwright mobile

```bash
# Tests E2E responsive (extrait de e2e/tests/mobile.spec.ts)
npx playwright test --project=mobile-chrome   # iPhone 375×667
npx playwright test --project=mobile-android  # Pixel 5 393×851
npx playwright test --project=tablet-ipad     # iPad 768×1024
```

Résultats : **47 / 47 tests passés** au 2026-07-22.

---

## 6. Score Lighthouse Mobile (production)

| Métrique | Score |
|---------|-------|
| Performance | 91 |
| Accessibility | 96 |
| Best Practices | 100 |
| SEO | 98 |
| PWA | ✅ |

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Frontend*
