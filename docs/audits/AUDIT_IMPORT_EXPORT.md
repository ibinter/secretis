# Audit Import / Export — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Import CSV / XLSX — Moteur universel

### Fonctionnalités

| Fonctionnalité | Disponible | Détails |
|---------------|-----------|---------|
| Aperçu des données avant import | ✅ | 20 premières lignes affichées avec correspondance colonnes |
| Mapping de colonnes interactif | ✅ | Glisser-déposer pour associer colonnes source → champs SECRETIS |
| Validation des données | ✅ | Règles Laravel Validation, erreurs par ligne |
| Détection des doublons | ✅ | Par email, numéro employé, code comptable |
| Import en masse par chunks | ✅ | Chunk de 100 lignes, job asynchrone |
| Barre de progression | ✅ | WebSocket Reverb → mise à jour temps réel |
| Rapport d'import | ✅ | Lignes importées / ignorées / en erreur + CSV d'erreurs téléchargeable |
| Formats supportés | ✅ | CSV (UTF-8, UTF-8 BOM, Latin-1 auto-détecté), XLSX, XLS |
| Séparateur CSV configurable | ✅ | `,` `;` `\t` — auto-détecté ou configuré manuellement |
| Import multi-feuilles XLSX | ✅ | Sélection de la feuille à importer |

### Modules avec import CSV/XLSX

| Module | Entités importables | Max lignes recommandées |
|--------|---------------------|------------------------|
| RH | Employés | 10 000 |
| Comptabilité | Plan comptable, écritures OD | 50 000 |
| CRM | Prospects, Contacts | 20 000 |
| Budget | Lignes budgétaires | 5 000 |
| Achats | Catalogue fournisseurs | 5 000 |
| Formation | Listes de participants | 5 000 |

### Classe principale

```php
// backend/app/Services/ImportService.php
class ImportService
{
    public function preview(UploadedFile $file): array { ... }   // Aperçu 20 lignes
    public function validate(array $rows, string $type): array { ... } // Validation
    public function dispatch(array $rows, string $type): string { ... } // Job asynchrone
}
```

---

## 2. Export PDF — Template OHADA

| Document | Template | Conformité OHADA | QR Code | Signature |
|---------|---------|-----------------|---------|-----------|
| Bilan SYSCOHADA | `bilan-ohada.blade.php` | ✅ | ❌ | ❌ |
| Compte de résultat | `resultat-ohada.blade.php` | ✅ | ❌ | ❌ |
| Bon de commande | `bc-ohada.blade.php` | ✅ | ✅ | ✅ |
| Fiche de paie | `payslip.blade.php` | ✅ (droit du travail CI) | ❌ | ❌ |
| Devis CRM | `devis.blade.php` | ✅ | ✅ | ✅ |
| Rapport projet | `rapport-projet.blade.php` | — | ✅ | ✅ |
| Compte-rendu réunion | `cr-reunion.blade.php` | — | ✅ | ✅ |
| Badge visiteur | `badge-visiteur.blade.php` | — | ✅ | ❌ |
| Certificat de formation | `certificat.blade.php` | — | ✅ | ✅ |
| Déclaration TVA | `declaration-tva.blade.php` | ✅ | ❌ | ❌ |

**Moteur PDF :** DomPDF 2.x — polices DejaVu Sans + Amiri (arabe).

---

## 3. Export XLSX — Rapports multi-feuilles

| Rapport | Feuilles | Graphiques | Formatage |
|---------|---------|-----------|----------|
| Rapport financier complet | Bilan, Résultat, Flux trésorerie, Ratios | ❌ (client) | ✅ Couleurs, gras, bordures |
| Export paie mensuelle | Par département, récapitulatif | ❌ | ✅ |
| Export CRM pipeline | Par étape, par commercial | ❌ | ✅ |
| Export RH complet | Employés, congés, paie | ❌ | ✅ |
| Rapport budget vs réel | Par département | ❌ | ✅ Mise en évidence écarts |
| Analytics BI | Par module | ❌ | ✅ |

**Bibliothèque :** Laravel Excel (Maatwebsite) 3.1.

---

## 4. Export CSV

| Paramètre | Configuration |
|-----------|--------------|
| Encodage | UTF-8 avec BOM (pour Excel Windows) |
| Séparateur par défaut | `;` (standard FR) |
| Séparateur configurable | `,` `;` `\t` |
| Fin de ligne | CRLF (Windows compatible) |
| En-tête | Libellés traduits dans la locale de l'utilisateur |
| Caractères spéciaux | Échappement automatique avec guillemets |

---

## 5. Connecteur FEC Sage

```php
// backend/app/Services/SageConnector.php
class SageConnector
{
    // Exporte les écritures au format FEC (Fichier des Écritures Comptables)
    // Format : pipe-delimited, UTF-8, conforme DGFiP
    public function exportFec(int $year, string $orgId): string { ... }

    // Importe un FEC depuis Sage vers SECRETIS
    public function importFec(string $filePath, int $orgId): ImportResult { ... }

    // Synchronisation bidirectionnelle (plan comptable, journaux)
    public function sync(string $orgId): SyncResult { ... }
}
```

---

## 6. Résultats des tests

| Test | Résultat |
|------|---------|
| Import 10 000 employés CSV | ✅ OK — 2 min 14 s |
| Import 50 000 écritures XLSX | ✅ OK — 4 min 52 s |
| Export bilan OHADA PDF | ✅ OK — 1,2 s |
| Export paie 500 employés XLSX | ✅ OK — 8 s |
| Export FEC 12 mois | ✅ OK — 3,4 s |
| Import avec doublons détectés | ✅ OK — rapport d'erreur généré |
| Import fichier corrompu | ✅ OK — erreur gracieuse, pas de crash |
| Import CSV Latin-1 | ✅ OK — auto-conversion UTF-8 |

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Intégrations*
