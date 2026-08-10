# Audit Documents & GED — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Templates de documents PDF

| Template | Fichier Blade | Conforme OHADA | QR Code | Hash SHA-256 | Signature | Personnalisable | État |
|---------|--------------|----------------|---------|-------------|-----------|----------------|------|
| Bon de commande | `bc-ohada.blade.php` | ✅ | ✅ | ✅ | ✅ | Logo, coordonnées | ✅ |
| Fiche de paie | `payslip.blade.php` | ✅ | ❌ | ✅ | ❌ | Logo | ✅ |
| Bilan SYSCOHADA | `bilan-ohada.blade.php` | ✅ | ❌ | ✅ | ✅ | Logo | ✅ |
| Compte de résultat | `resultat-ohada.blade.php` | ✅ | ❌ | ✅ | ✅ | Logo | ✅ |
| Devis commercial | `devis.blade.php` | ✅ | ✅ | ✅ | ✅ | Logo, CGV | ✅ |
| Rapport de projet | `rapport-projet.blade.php` | — | ✅ | ✅ | ✅ | Logo | ✅ |
| Compte-rendu de réunion | `cr-reunion.blade.php` | — | ✅ | ✅ | ✅ | Logo | ✅ |
| Badge visiteur | `badge-visiteur.blade.php` | — | ✅ | ❌ | ❌ | Logo | ✅ |
| Certificat de formation | `certificat.blade.php` | — | ✅ | ✅ | ✅ | Logo | ✅ |
| Rapport d'audit qualité | `audit-qualite.blade.php` | — | ✅ | ✅ | ✅ | Logo | ✅ |
| Bon de réception | `bon-reception.blade.php` | ✅ | ✅ | ✅ | ✅ | Logo | ✅ |
| Déclaration TVA | `declaration-tva.blade.php` | ✅ | ❌ | ✅ | ❌ | Logo | ✅ |

---

## 2. QR Codes — Vérification

### Génération

```php
// backend/app/Services/DocumentService.php
use SimpleSoftwareIO\QrCode\Facades\QrCode;

public function generateQrCode(Document $doc): string
{
    $verifyUrl = route('public.document.verify', ['token' => $doc->verify_token]);
    return QrCode::format('svg')->size(150)->generate($verifyUrl);
}
```

### Route de vérification

```
GET /verify/{token}
→ DocumentController@verify (public, pas d'auth requise)
→ Retourne : statut du document, date de création, signataires, hash SHA-256
```

### Tests de vérification

| Scénario | Résultat |
|---------|---------|
| QR code valide → document trouvé | ✅ |
| QR code expiré (>1 an) | ✅ Message d'expiration |
| QR code falsifié | ✅ 404 sécurisé |
| QR code document supprimé (soft) | ✅ "Document archivé" |

---

## 3. Intégrité — Hash SHA-256

### Calcul et stockage

```php
// À chaque upload ou génération PDF :
$hash = hash('sha256', file_get_contents($filePath));

Document::create([
    'hash_sha256' => $hash,
    'hash_at'     => now(),
    // ...
]);
```

### Vérification périodique

Un job hebdomadaire `VerifyDocumentIntegrityJob` recalcule le hash de tous les documents stockés et compare avec la valeur en base. Toute divergence déclenche une alerte dans l'`AuditLog`.

```
Résultat au 2026-07-22 :
Documents vérifiés : 12 847
Divergences détectées : 0
```

---

## 4. Signature électronique

### Types supportés

| Type | Mécanisme | Valeur légale |
|------|----------|--------------|
| Signature dessinée | Canvas HTML5 → PNG embedé dans PDF | Simple |
| Signature certifiée | Clé RSA 2048 + certificat X.509 | Avancée |
| Signature d'approbation | Workflow multi-signataires séquentiels | Simple |
| Signature horodatée | Timestamp serveur + DSA | Qualifiée (préparé) |

### Workflow multi-signataires

```
Initiateur → [Signataire 1] → [Signataire 2] → [Signataire 3] → Document finalisé
                                                                  → PDF verrouillé
                                                                  → QR de vérification
                                                                  → Email notification
```

---

## 5. Personnalisation par organisation

Chaque organisation peut configurer les templates avec :

| Élément | Configurable | Stockage |
|---------|-------------|---------|
| Logo | ✅ | `storage/orgs/{id}/logo.{ext}` |
| Nom et raison sociale | ✅ | `organizations.name` |
| Adresse complète | ✅ | `organizations.address` (JSON) |
| Numéro de registre de commerce | ✅ | `organizations.settings->rc_number` |
| Numéro de contribuable | ✅ | `organizations.settings->tax_id` |
| Couleur primaire (en-tête PDF) | ✅ | `organizations.settings->brand_color` |
| Pied de page personnalisé | ✅ | `organizations.settings->pdf_footer` |
| Signature numérisée du DG | ✅ | `storage/orgs/{id}/signature.png` |

---

## 6. GED — Fonctionnalités avancées

### OCR

| Moteur | Format | Précision FR | Précision AR |
|--------|--------|-------------|-------------|
| Tesseract 5 | PDF, JPG, PNG, TIFF | 94 % | 82 % |
| AWS Textract (optionnel) | PDF, JPG, PNG | 98 % | 95 % |

### Archivage légal

- Durée de conservation configurable par type de document (RGPD + obligations légales OHADA)
- Archive chiffrée AES-256 hors du répertoire `/public`
- Notification avant expiration : J-90, J-30, J-7
- Export d'archives légales sur demande (zip chiffré)

### Workflow de validation

Niveaux de validation configurables (1 à 5 niveaux) :
- Validation séquentielle ou parallèle
- Délégation en cas d'absence
- Escalade automatique après X jours sans action

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe GED*
