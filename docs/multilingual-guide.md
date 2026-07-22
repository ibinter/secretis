# SECRETIS ERP — Guide Multilingue

## 1. Langues supportées

| Code locale | Langue / Région                      | Niveau | Direction | Calendrier | Devise défaut |
|-------------|--------------------------------------|--------|-----------|------------|---------------|
| `fr`        | Français                             | ✅ Complet | LTR | Grégorien | XOF (FCFA) |
| `fr-CI`     | Français — Côte d'Ivoire             | ✅ Complet | LTR | Grégorien | XOF |
| `fr-SN`     | Français — Sénégal                   | ✅ Complet | LTR | Grégorien | XOF |
| `fr-CM`     | Français — Cameroun                  | ✅ Complet | LTR | Grégorien | XAF |
| `en`        | English                              | ✅ Complet | LTR | Grégorien | USD |
| `ar`        | العربية (Arabe standard)             | ✅ Complet | **RTL** | Grégorien / Hijri | — |
| `ar-MA`     | العربية — Maroc                      | ✅ Complet | **RTL** | Grégorien / Hijri | MAD |
| `ar-TN`     | العربية — Tunisie                    | ✅ Complet | **RTL** | Grégorien / Hijri | TND |
| `pt-BR`     | Português — Brasil                   | ✅ Complet | LTR | Grégorien | BRL |
| `pt-ST`     | Português — São Tomé e Príncipe      | ✅ Complet | LTR | Grégorien | STN |
| `pt-MZ`     | Português — Moçambique               | ✅ Complet | LTR | Grégorien | MZN |
| `sw`        | Kiswahili (Swahili)                  | 🟡 Partiel (~150 clés) | LTR | Grégorien | TZS |
| `ha`        | Hausa (Haoussa)                      | 🟡 Partiel (~100 clés) | LTR | Grégorien | NGN |

---

## 2. Architecture des fichiers

### Frontend (React / Inertia)

```
frontend/resources/js/
├── i18n/
│   ├── fr.json          # Français (référence — 300+ clés)
│   ├── en.json          # English
│   ├── ar.json          # Arabe complet (RTL)
│   ├── ar-MA.json       # Overrides Maroc
│   ├── ar-TN.json       # Overrides Tunisie
│   ├── pt-BR.json       # Portugais brésilien complet
│   ├── pt-ST.json       # Overrides São Tomé
│   ├── pt-MZ.json       # Overrides Mozambique
│   ├── sw.json          # Swahili (essentiel)
│   └── ha.json          # Haoussa (essentiel)
├── hooks/
│   ├── useTranslation.js  # Hook principal i18n + deepMerge des variantes
│   └── useDirection.js    # Détection RTL/LTR + application sur <html>
└── Pages/Parametres/
    └── LangueRegion.jsx   # Page de paramètres langue & région
```

```
frontend/resources/css/
├── fonts-arabic.css   # Import Cairo + Noto Sans Arabic (Google Fonts)
└── rtl-overrides.css  # Overrides CSS complets pour direction RTL
```

```
frontend/
└── tailwind.config.js  # Config Tailwind avec plugin RTL, ms-/me-/ps-/pe-
```

### Backend (Laravel 11)

```
backend/
├── lang/
│   ├── ar/
│   │   ├── auth.php
│   │   ├── passwords.php
│   │   ├── pagination.php
│   │   └── validation.php
│   └── pt/
│       ├── auth.php
│       ├── passwords.php
│       ├── pagination.php
│       └── validation.php
└── app/
    ├── Http/Middleware/
    │   └── ContentLanguage.php    # Résolution locale (6 niveaux de priorité)
    └── Services/
        └── LocalizationService.php # formatDate, formatCurrency, getHijriDate
```

---

## 3. Comment ajouter une nouvelle langue

### 3.1 Créer le fichier de traduction frontend

```bash
# Copier le fichier anglais comme base
cp frontend/resources/js/i18n/en.json frontend/resources/js/i18n/XX.json
```

Éditer `XX.json` en remplaçant les valeurs. Respecter la structure existante :
- `nav.*` — Navigation
- `buttons.*` — Actions
- `labels.*` — Labels de formulaires
- `statuses.*`, `priorities.*` — Énumérations
- `feedback.*` — Messages système
- `dates.*` — Dates et calendriers

### 3.2 Enregistrer dans useTranslation.js

```js
// Dans frontend/resources/js/hooks/useTranslation.js
import xxTranslations from '../i18n/XX.json';

const TRANSLATIONS = {
  // ... existants
  'xx': xxTranslations,
};

const SUPPORTED_LOCALES = [/* ... */, 'xx'];
```

### 3.3 Ajouter les fichiers Laravel backend

```
backend/lang/xx/
├── auth.php
├── passwords.php
├── pagination.php
└── validation.php
```

### 3.4 Enregistrer dans ContentLanguage.php

```php
protected const SUPPORTED_LOCALES = [
    // ... existants
    'xx' => 'xx',
];
```

### 3.5 Ajouter dans LocalizationService.php

```php
protected const DEFAULT_CURRENCIES = [
    // ... existants
    'xx' => 'XXX',  // code ISO devise
];

protected const DATE_FORMATS = [
    // ... existants
    'xx' => 'd/m/Y',
];
```

### 3.6 Ajouter dans LangueRegion.jsx

```js
const SUPPORTED_LANGUAGES = [
  // ... existants
  { code: 'xx', flag: '🏳️', nativeName: 'Langue Native', englishName: 'Language Name', dir: 'ltr' },
];
```

---

## 4. Comment ajouter une variante régionale

Une variante régionale (ex: `fr-MA` pour français marocain) hérite de la langue de base et ne contient que les **différences**.

```json
// frontend/resources/js/i18n/fr-MA.json
{
  "_meta": {
    "locale": "fr-MA",
    "base": "fr",
    "description": "Overrides français marocain"
  },
  "labels": {
    "currency": "Dirham"
  },
  "comptabilite": {
    "currency_code": "MAD"
  }
}
```

Dans `useTranslation.js`, utiliser `deepMerge` :

```js
import frMATranslations from '../i18n/fr-MA.json';

const TRANSLATIONS = {
  // ...
  'fr-MA': deepMerge(frTranslations, frMATranslations),
};
```

---

## 5. Support RTL — Guide développeur

### 5.1 Principes fondamentaux

L'arabe (`ar`, `ar-MA`, `ar-TN`) est une langue **Right-to-Left (RTL)**. L'interface doit être **miroir** de l'interface LTR.

**Règle d'or :** Ne jamais utiliser `margin-left` / `margin-right` / `padding-left` / `padding-right` directement dans les composants. Utiliser les propriétés logiques :

| À éviter          | À utiliser         | Description          |
|-------------------|--------------------|----------------------|
| `ml-4`            | `ms-4`             | Margin start         |
| `mr-4`            | `me-4`             | Margin end           |
| `pl-4`            | `ps-4`             | Padding start        |
| `pr-4`            | `pe-4`             | Padding end          |
| `text-left`       | `text-start`       | Alignement début     |
| `text-right`      | `text-end`         | Alignement fin       |
| `left-0`          | `inset-s-0`        | Position début       |
| `right-0`         | `inset-e-0`        | Position fin         |

### 5.2 Utiliser le hook useDirection

```jsx
import { useDirection } from '../hooks/useDirection';
import { useTranslation } from '../hooks/useTranslation';

function MonComposant() {
  const { t, locale } = useTranslation();
  const { dir, isRTL, fontClass } = useDirection(locale);

  return (
    <div dir={dir} className={fontClass}>
      <p className="text-start">{t('buttons.save')}</p>
      {isRTL && <span className="rtl:rotate-180">→</span>}
    </div>
  );
}
```

### 5.3 Classes Tailwind RTL disponibles

```html
<!-- Inverser l'ordre des éléments flexbox en RTL -->
<div class="flex rtl:flex-row-reverse">...</div>

<!-- Espacer les éléments en RTL -->
<div class="flex space-x-4 rtl:space-x-reverse">...</div>

<!-- Icônes directionnelles -->
<svg class="rtl:rotate-180">...</svg>

<!-- Propriétés logiques -->
<div class="ms-4 me-2 ps-6 pe-3">...</div>

<!-- Border-radius logique -->
<button class="rounded-s-md">Début</button>
<button class="rounded-e-md">Fin</button>
```

### 5.4 Polices arabes

La police **Cairo** (poids 400-700) est utilisée pour les textes arabes. Elle est déclarée dans `fonts-arabic.css` et appliquée automatiquement via `[lang^="ar"]`.

```html
<!-- Appliquer manuellement la police arabe -->
<p class="font-arabic">نص عربي</p>
```

### 5.5 Checklist RTL pour les nouveaux composants

- [ ] `dir={dir}` sur le conteneur racine
- [ ] Utiliser `ms-/me-` au lieu de `ml-/mr-`
- [ ] Utiliser `ps-/pe-` au lieu de `pl-/pr-`
- [ ] Icônes directionnelles avec `rtl:rotate-180`
- [ ] Flexbox avec `rtl:flex-row-reverse` si nécessaire
- [ ] `text-start` / `text-end` pour l'alignement
- [ ] Tester en arabe marocain (`ar-MA`) — la plus exigeante
- [ ] Boutons de modal dans le bon ordre
- [ ] Toasts / notifications à gauche (pas à droite)

---

## 6. Calendrier Hijri

### 6.1 Cas d'usage

Le calendrier Hijri (islamique) est disponible en option pour les utilisateurs arabes. Il est activable dans **Paramètres → Langue & Région → Calendrier**.

### 6.2 Précision

La conversion utilise :
1. **Extension PHP `intl`** (recommandée) — précision ±0 jour, basée sur `IntlCalendar::createInstance(null, 'ar@calendar=islamic-civil')`
2. **Algorithme manuel** (fallback) — précision ±1 jour (méthode Fliegel & Van Flandern)

### 6.3 Mois Hijri

| # | Nom arabe         | Translitération   |
|---|-------------------|-------------------|
| 1 | محرم              | Muharram          |
| 2 | صفر               | Safar             |
| 3 | ربيع الأول        | Rabi al-Awwal     |
| 4 | ربيع الثاني       | Rabi al-Thani     |
| 5 | جمادى الأولى      | Jumada al-Ula     |
| 6 | جمادى الآخرة      | Jumada al-Akhira  |
| 7 | رجب               | Rajab             |
| 8 | شعبان             | Sha'ban           |
| 9 | رمضان             | Ramadan           |
|10 | شوال              | Shawwal           |
|11 | ذو القعدة          | Dhul Qa'dah       |
|12 | ذو الحجة           | Dhul Hijjah       |

### 6.4 API backend

```php
// Dans un contrôleur ou service
use App\Services\LocalizationService;

$localization = app(LocalizationService::class);

// Conversion date → Hijri
$hijri = $localization->getHijriDate(Carbon::now(), 'long');
// → "22 محرم 1448 هـ"

// Formatage date selon locale
$date = $localization->formatDateForLocale(Carbon::now(), 'ar-MA', true);
// → "22/07/2026 14:30"

// Formatage devise
$amount = $localization->formatCurrencyForLocale(1500.00, 'MAD', 'ar-MA');
// → "1.500,00 MAD" ou "١٥٠٠٫٠٠ درهم"
```

---

## 7. Résolution de la locale (Backend)

Le middleware `ContentLanguage` résout la locale dans cet ordre :

```
1. user.locale (BDD)          → le plus prioritaire
2. Session secretis_locale    → persistance inter-requêtes
3. Sous-domaine HTTP          → ar.secretis.com → 'ar'
4. Accept-Language header     → préférence navigateur
5. Config Laravel app.locale  → défaut de l'instance
6. Fallback 'fr'              → langue par défaut SECRETIS
```

### Exemples de mapping sous-domaines

| Sous-domaine              | Locale   |
|--------------------------|----------|
| `ar.secretis.com`        | `ar`     |
| `ma.secretis.com`        | `ar-MA`  |
| `tn.secretis.com`        | `ar-TN`  |
| `br.secretis.com`        | `pt-BR`  |
| `mz.secretis.com`        | `pt-MZ`  |
| `st.secretis.com`        | `pt-ST`  |
| `en.secretis.com`        | `en`     |

---

## 8. Contribuer une traduction

### 8.1 Processus

1. **Fork** le dépôt
2. Créer `frontend/resources/js/i18n/XX.json` depuis `en.json`
3. Traduire **au minimum** les sections : `nav`, `buttons`, `labels`, `statuses`, `priorities`, `feedback`, `dates`
4. Créer `backend/lang/XX/` avec les 4 fichiers PHP
5. Ouvrir une **Pull Request** avec le tag `[i18n]`

### 8.2 Consignes de traduction

- **Cohérence** : utiliser la terminologie administrative locale officielle
- **Ton** : formel / professionnel (il s'agit d'un ERP)
- **Interpolation** : conserver les `:variables` telles quelles (`:name`, `:date`, `:recipient`)
- **Tableaux** : les tableaux `days_short`, `days_long`, `months_short`, `months_long` doivent avoir exactement 7 / 7 / 12 / 12 éléments
- **Clés manquantes** : si une clé n'a pas d'équivalent direct, utiliser le terme le plus proche, pas une translittération

### 8.3 Test de la traduction

```bash
# Vérifier que toutes les clés du fichier de référence (fr) sont présentes
node scripts/check-translations.js --locale=XX

# Lancer l'app en mode développement avec la nouvelle locale
VITE_DEFAULT_LOCALE=XX npm run dev
```

---

## 9. Dépendances

### Frontend
- **tailwindcss** v3+ — classes RTL via plugin custom
- **Google Fonts CDN** — Cairo, Noto Sans Arabic (fonts-arabic.css)
- Aucune librairie i18n externe — système custom (useTranslation)

### Backend
- **PHP extension `intl`** — pour les formats de date/heure localisés (recommandée, pas obligatoire)
- **Carbon** — manipulation des dates
- **Laravel 11** — framework

### Installation extension intl (si absente)

```bash
# Ubuntu/Debian
sudo apt-get install php8.3-intl

# Alpine (Docker)
apk add php83-intl

# Activer dans php.ini
extension=intl
```

---

*Document maintenu par l'équipe IBIG SECRETIS — v1.0.0 — 2026*
