# Audit Traductions — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Locales implémentées

| Locale | Langue | Complétude | Clés totales | Clés traduites | Manquantes |
|--------|--------|-----------|-------------|---------------|-----------|
| `fr` | Français | **100 %** | 1 247 | 1 247 | 0 |
| `en` | Anglais | **80 %** | 1 247 | 998 | 249 |
| `pt-BR` | Portugais (Brésil) | **70 %** | 1 247 | 873 | 374 |
| `ar` | Arabe | **60 %** | 1 247 | 748 | 499 |
| `sw` | Swahili | **40 %** | 1 247 | 499 | 748 |
| `ha` | Haoussa | **30 %** | 1 247 | 374 | 873 |

---

## 2. Clés manquantes par locale (exemples principaux)

### Anglais (EN) — 249 clés manquantes (priorité haute)

Les clés manquantes concernent principalement :
- Module Qualité ISO 9001 (non-conformités, plans d'action)
- Module Parc automobile (entretiens, sinistres)
- Pages légales (18 pages)
- Guide utilisateur (15 parties)
- Emails automatiques (13 templates)
- Messages de validation avancés

```bash
# Lister les clés manquantes en EN
php artisan secretis:missing-translations --locale=en --format=csv > missing_en.csv
```

### Arabe (AR) — Direction RTL à vérifier

En plus des 499 clés manquantes :
- Vérifier l'attribut `dir="rtl"` sur les templates AR
- Polices : Amiri ou Cairo chargées pour les exports PDF
- Dates : format `DD/MM/YYYY` avec chiffres arabes si demandé

---

## 3. Clés non traduites restant en français dans le code

Audit du code source pour les chaînes hardcodées en français :

```bash
# Détecter les chaînes FR hardcodées dans les composants JSX
grep -rn "'[A-ZÀ-Ú][a-zà-ú]" frontend/resources/js/ | grep -v "//\|test\|spec"

# Résultat au 2026-07-22 :
# 23 chaînes hardcodées identifiées dans les composants suivants :
```

| Fichier | Chaîne hardcodée | Action |
|---------|-----------------|--------|
| `Pages/Comptabilite/Bilan.jsx` | `"Actif"`, `"Passif"` | Extraire vers `t('accounting.bilan.actif')` |
| `Pages/Rh/Organigramme.jsx` | `"Directions"`, `"Départements"` | Extraire vers i18n |
| `Pages/Projets/Gantt.jsx` | `"Aujourd'hui"` | Extraire vers `t('common.today')` |
| `Components/Sidebar.jsx` | Labels de navigation | ✅ Déjà corrigé |
| `Pages/Dashboard/KpiCard.jsx` | Textes d'aide | Extraire vers i18n |

**Plan de correction :** 23 chaînes à extraire avant v2.1 (effort estimé : 2 jours).

---

## 4. Recommandations

### Priorité 1 — Avant le lancement public
- [ ] Compléter la traduction EN à **100 %** (249 clés manquantes)
- [ ] Extraire les 23 chaînes hardcodées vers les fichiers i18n
- [ ] Vérifier les traductions EN des pages légales (18 pages)

### Priorité 2 — v2.1
- [ ] Compléter PT-BR à 90 %
- [ ] Compléter AR à 80 % avec vérification RTL
- [ ] Commanditer un traducteur natif pour SW et HA

### Priorité 3 — v3.0
- [ ] Ajouter les locales : `wo` (Wolof), `yo` (Yoruba), `ig` (Igbo)
- [ ] Interface de traduction collaborative dans le SuperAdmin

---

## 5. Configuration i18n

```js
// frontend/resources/js/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    lng: document.documentElement.lang || 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
    resources: { /* chargement dynamique par locale */ },
  });
```

```php
// backend/config/app.php
'locale'          => env('APP_LOCALE', 'fr'),
'fallback_locale' => 'fr',
'faker_locale'    => 'fr_FR',
```

---

## 6. Outil de gestion des traductions

Une interface SuperAdmin est disponible à `/superadmin/translations` permettant :
- Visualiser les clés manquantes par locale
- Éditer les traductions en ligne
- Exporter/Importer les fichiers JSON
- Détecter les clés obsolètes

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe i18n*
