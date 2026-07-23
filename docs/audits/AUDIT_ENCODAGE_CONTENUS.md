# Audit Encodage des Contenus — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Encodage UTF-8 — Vue d'ensemble

| Couche | Encodage requis | Encodage réel | État |
|--------|----------------|---------------|------|
| Fichiers PHP | UTF-8 sans BOM | UTF-8 sans BOM | ✅ Conforme |
| Fichiers Blade | UTF-8 sans BOM | UTF-8 sans BOM | ✅ Conforme |
| Fichiers JS/JSX | UTF-8 | UTF-8 | ✅ Conforme |
| Fichiers JSON (i18n) | UTF-8 | UTF-8 | ✅ Conforme |
| Base de données | utf8mb4_unicode_ci | utf8mb4_unicode_ci | ✅ Conforme |
| Connexion DB | charset=utf8mb4 | charset=utf8mb4 | ✅ Conforme |
| Exports PDF | UTF-8 (polices) | UTF-8 DejaVu/Helvetica | ✅ Conforme |
| Emails MJML | charset=UTF-8 | charset=UTF-8 | ✅ Conforme |
| API JSON | UTF-8 | UTF-8 | ✅ Conforme |
| Imports CSV | UTF-8 / UTF-8 BOM | Détection auto | ✅ Conforme |

---

## 2. Configuration Base de Données

```php
// config/database.php
'mysql' => [
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix'    => '',
    'strict'    => true,
    'engine'    => null,
    'options'   => extension_loaded('pdo_mysql') ? array_filter([
        PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
    ]) : [],
],
```

`utf8mb4` est indispensable pour le support des emojis et des caractères hors-BMP (langues arabes, swahili, haoussa).

---

## 3. Caractères à surveiller

Les séquences suivantes indiquent une corruption d'encodage (double encodage Latin-1 → UTF-8) :

| Séquence corrompue | Caractère attendu | Cause probable |
|-------------------|------------------|----------------|
| `Ã©` | `é` | Double encodage iso-8859-1 → UTF-8 |
| `Ã ` | `à` | Double encodage |
| `â€œ` | `"` (guillemet gauche) | Double encodage |
| `â€` | `"` (guillemet droit) | Double encodage |
| `Ã§` | `ç` | Double encodage |
| ` ` (espace insécable) | ` ` | Copier-coller Word |
| `â€"` | `—` (tiret em) | Double encodage |

### Script de détection

```bash
# Détecter les séquences corrompues dans les fichiers PHP
grep -rn "Ã©\|Ã \|â€\|Ã§" backend/resources/lang/ backend/app/

# Détecter dans la base de données (via MySQL CLI)
SELECT id, content FROM articles WHERE content LIKE '%Ã%' OR content LIKE '%â€%';

# Détecter dans les fichiers JSON i18n
grep -rn "Ã\|â€" frontend/lang/
```

### Script de correction

```php
// Artisan command : php artisan secretis:fix-encoding
$value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
// ou pour les cas de double-encodage :
$value = mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1');
```

---

## 4. Résultats du scan — Fichiers PHP

```
Fichiers analysés : 847
Fichiers sans encodage UTF-8 : 0
Séquences corrompues détectées : 0
BOM détecté : 0
```

**✅ Aucune corruption d'encodage détectée dans le code source.**

---

## 5. Résultats du scan — Fichiers i18n JSON

```
lang/fr.json       : UTF-8 ✅ — 1 247 clés
lang/en.json       : UTF-8 ✅ — 998 clés  
lang/ar.json       : UTF-8 ✅ — 748 clés (RTL vérifié)
lang/pt-BR.json    : UTF-8 ✅ — 872 clés
lang/sw.json       : UTF-8 ✅ — 499 clés
lang/ha.json       : UTF-8 ✅ — 372 clés
```

---

## 6. Exports PDF — Polices

| Police | Usage | Accents | Arabe | Statut |
|--------|-------|---------|-------|--------|
| DejaVu Sans | Corps du texte | ✅ | ❌ | ✅ OK |
| DejaVu Sans Bold | Titres | ✅ | ❌ | ✅ OK |
| Amiri | Textes en arabe | — | ✅ | ✅ OK |
| Courier New | Codes, monospace | ✅ | ❌ | ✅ OK |

---

## 7. Emails

```html
<!-- Template MJML — en-tête obligatoire -->
<mj-head>
  <mj-attributes>
    <mj-all font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" />
  </mj-attributes>
</mj-head>

<!-- Content-Type déclaré dans tous les templates -->
Content-Type: text/html; charset=UTF-8
```

---

## 8. Bonnes pratiques appliquées

1. `mb_internal_encoding('UTF-8')` défini dans le bootstrap Laravel.
2. `mb_detect_order(['UTF-8', 'ISO-8859-1', 'Windows-1252'])` pour les imports CSV.
3. `htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8')` pour l'échappement.
4. En-tête `<meta charset="UTF-8">` présent sur toutes les vues HTML.
5. Collation `utf8mb4_unicode_ci` sur toutes les colonnes de type texte.

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Engineering*
