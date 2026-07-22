# Intelligence Documentaire IBIG SECRETIS — Guide complet

## Vue d'ensemble

Le module d'intelligence documentaire de SECRETIS ERP apporte trois capacités majeures à votre Gestion Électronique de Documents (GED) :

1. **Classification automatique** — catégorisation immédiate de chaque document après l'OCR
2. **Workflows de validation** — circuits d'approbation configurables par catégorie
3. **Archivage légal** — conservation conforme aux durées OHADA avec vérification d'intégrité

---

## Partie 1 — Classification automatique

### Catégories disponibles

| Code           | Libellé            | Exemple de document              |
|----------------|--------------------|----------------------------------|
| `CONTRAT`      | Contrat            | Contrat de prestation, bail      |
| `FACTURE`      | Facture            | Facture fournisseur, avoir       |
| `COURRIER`     | Courrier           | Lettre officielle, email formel  |
| `RAPPORT`      | Rapport            | Rapport annuel, audit            |
| `PV_REUNION`   | PV de réunion      | Procès-verbal, compte rendu      |
| `FICHE_RH`     | Fiche RH           | Contrat de travail, fiche paie   |
| `BON_COMMANDE` | Bon de commande    | Purchase Order, BC fournisseur   |
| `DEVIS`        | Devis              | Proposition commerciale          |
| `DECISION`     | Décision           | Note de direction, arrêté        |
| `AUTRE`        | Autre              | Documents non catégorisés        |

### Pipeline de classification

```
Document uploadé
      │
      ▼
[OCR] → texte extrait
      │
      ▼
[Règles regex] ──→ confidence ≥ 70 % ──→ Résultat final
      │
      └──→ confidence < 70 % ──→ [API Claude (Haiku)] ──→ Résultat affiné
```

**Étape 1 — Règles regex** (< 5 ms) : chaque catégorie dispose de 4–6 patterns testés sur le nom du fichier + texte OCR. Le score est proportionnel au nombre de patterns matchés.

**Étape 2 — LLM** (si confidence < 70 %) : un appel à l'API Anthropic (claude-haiku-4-5) analyse un extrait de 1 500 caractères et retourne catégorie + confiance en JSON.

### Métadonnées extraites par catégorie

| Catégorie    | Champs extraits                                                   |
|--------------|-------------------------------------------------------------------|
| CONTRAT      | parties, date_signature, durée, montant, date_expiration          |
| FACTURE      | fournisseur, numéro, date, montant_ht, montant_ttc, échéance      |
| COURRIER     | expéditeur, destinataire, objet, date, référence                  |
| PV_REUNION   | date, participants (liste), décisions (liste), prochaine_réunion  |
| FICHE_RH     | employé, poste, salaire, date_embauche, département               |
| BON_COMMANDE | fournisseur, numéro, date, montant, livraison                     |
| DEVIS        | client, numéro, date, validité, montant_ttc                       |

### Détection de doublons

Deux niveaux de détection :

- **Doublons exacts** : comparaison du hash SHA-256 du fichier
- **Doublons similaires** : algorithme de bigrams sur le texte OCR — alerte si similarité ≥ 90 %

### Configuration de la clé API Claude

Ajoutez dans `.env` :

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxx
```

Si la clé est absente, la classification fonctionne en mode regex uniquement (sans LLM).

---

## Partie 2 — Workflows de validation

### Concepts

- **Template** : modèle de workflow réutilisable, lié à une catégorie de document (ex : "Validation contrats" → 3 étapes)
- **Instance** : workflow déclenché pour un document spécifique
- **Étape** : validation individuelle assignée à un rôle ou un utilisateur

### Statuts d'une instance

```
pending → in_progress → approved
                     ↘ rejected
                     ↘ cancelled
```

### Actions disponibles

| Action      | Effet                                                                |
|-------------|----------------------------------------------------------------------|
| `approve`   | Valide l'étape → passe à la suivante (ou complète si dernière étape) |
| `reject`    | Annule le workflow, notifie l'auteur avec le commentaire             |
| `send_back` | Renvoie à l'étape précédente pour révision                          |

### Configuration d'un template (Admin)

1. Aller dans **GED → Administration → Templates de workflow**
2. Cliquer sur **Nouveau template**
3. Renseigner :
   - **Nom** : ex. "Validation factures > 500 000 FCFA"
   - **Catégorie déclenchante** : FACTURE
   - **Étapes** : ajouter autant d'étapes que nécessaire

Exemple de template à 3 étapes :

```json
[
  {
    "step_name": "Validation comptable",
    "approver_role": "comptable",
    "is_required": true,
    "timeout_hours": 48
  },
  {
    "step_name": "Validation DAF",
    "approver_role": "daf",
    "is_required": true,
    "timeout_hours": 72
  },
  {
    "step_name": "Approbation DG",
    "approver_role": "pdg",
    "is_required": false,
    "timeout_hours": 120
  }
]
```

### Rappels automatiques (CRON)

La méthode `DocumentWorkflowService::remindApprovers()` doit être appelée toutes les heures :

```php
// app/Console/Kernel.php
$schedule->call(fn() => app(DocumentWorkflowService::class)->remindApprovers())
         ->hourly()
         ->name('workflow-reminders');
```

Logique de rappel :
- **50 % du délai écoulé** → 1er rappel par notification
- **75 % du délai écoulé** → rappel urgent
- **100 % du délai écoulé** → escalade au manager du rôle

---

## Partie 3 — Archivage légal

### Durées de conservation OHADA

| Catégorie    | Durée  | Base légale                                  |
|--------------|--------|----------------------------------------------|
| FICHE_RH     | 30 ans | Code du travail OHADA — Art. 136             |
| CONTRAT      | 10 ans | Obligations civiles — Code civil Art. 2224   |
| FACTURE      | 10 ans | SYSCOHADA révisé — obligations comptables    |
| PV_REUNION   | 10 ans | Droit des sociétés OHADA — AUSCGIE           |
| DECISION     | 10 ans | Actes administratifs                         |
| BON_COMMANDE | 7 ans  | SYSCOHADA — pièces justificatives            |
| COURRIER     | 5 ans  | Prescription quinquennale                    |
| RAPPORT      | 5 ans  | Usage professionnel                          |
| DEVIS        | 5 ans  | Prescription quinquennale                    |
| AUTRE        | 5 ans  | Durée minimale par défaut                    |

### Archivage automatique mensuel

La méthode `LegalArchiveService::scheduleAutoArchive()` archive automatiquement les documents :

```php
// app/Console/Kernel.php
$schedule->call(fn() => app(LegalArchiveService::class)->scheduleAutoArchive())
         ->monthlyOn(1, '03:00')
         ->name('auto-archive');
```

Critères de déclenchement :
- Document validé (`validation_status = validated`)
- Créé depuis plus de 6 mois
- Non encore archivé

### Empreinte légale (RFC 3161 simplifié)

Chaque document archivé reçoit un **timestamp token** immuable :

```json
{
  "version": "1.0",
  "hash": "sha256:abc123...",
  "algorithm": "sha256",
  "timestamp": "2026-01-15T10:30:00+00:00",
  "issuer": "SECRETIS-ERP-TSA"
}
```

Le token est signé par HMAC-SHA256 avec la clé `APP_KEY`. Il est stocké en base64 dans `legal_archive_log.timestamp_token`.

### Configuration du stockage archive

Dans `config/filesystems.php`, ajoutez :

```php
'archive' => [
    'driver' => env('ARCHIVE_DISK_DRIVER', 'local'),
    'root'   => storage_path('app/archive'),
    // Ou pour S3 Glacier :
    // 'driver' => 's3',
    // 'key'    => env('AWS_ACCESS_KEY_ID'),
    // 'secret' => env('AWS_SECRET_ACCESS_KEY'),
    // 'region' => env('AWS_DEFAULT_REGION'),
    // 'bucket' => env('ARCHIVE_S3_BUCKET'),
],
```

Variables d'environnement :

```env
ARCHIVE_DISK_DRIVER=local      # ou s3
ARCHIVE_S3_BUCKET=secretis-archive-legal
```

### Vérification d'intégrité

La vérification compare le hash SHA-256 actuel du fichier avec celui enregistré à l'archivage :

```php
$isValid = app(LegalArchiveService::class)->verifyArchiveIntegrity($document);
// true  = fichier intact
// false = fichier altéré (alerte critique loguée)
```

Depuis l'interface : **GED → Archives → icône cadenas** sur chaque ligne.

Un cadenas vert indique l'intégrité confirmée. Un cadenas rouge avec "Altéré !" déclenche une alerte critique dans les logs.

### Récupération d'un document archivé

```php
$url = app(LegalArchiveService::class)->requestArchiveRetrieval($document);
// URL valide 15 minutes
```

---

## Partie 4 — Bonnes pratiques

### Nommage des fichiers

Adoptez une convention claire pour améliorer la classification regex :

```
FACTURE_SUPPLIER_2026-01.pdf
CONTRAT_PRESTATION_NOM-CLIENT_2026.pdf
PV-REUNION_DG_2026-07-15.pdf
```

### Niveaux de confidentialité

| Niveau        | Accès                          | Catégories typiques        |
|---------------|--------------------------------|----------------------------|
| `public`      | Tous                           | Communications externes    |
| `internal`    | Tous les employés de l'org     | Courriers, rapports        |
| `confidential`| Managers + direction           | Contrats, devis            |
| `secret`      | Direction uniquement           | Fiches RH, décisions DG    |

### Performance

- La classification regex est quasi-instantanée (< 5 ms)
- Le LLM est appelé uniquement si la confidence regex < 70 %
- La détection de doublons textuelle est limitée aux 200 documents les plus récents
- L'archivage automatique tourne à 03:00 le 1er de chaque mois pour éviter la charge serveur

### Sécurité des archives

- Les fichiers archivés restent dans le stockage **privé** (jamais exposés publiquement)
- Les URL de récupération sont temporaires (15 min) et signées par HMAC
- Toute récupération est tracée dans l'audit log
- La vérification d'intégrité est idempotente et peut être exécutée à tout moment

---

## API Reference rapide

### Endpoints workflow

```
GET    /api/documents/{id}/workflow                       — état du workflow
POST   /api/documents/{id}/workflow/start                 — démarrer
POST   /api/documents/{id}/workflow/steps/{stepId}/approve
POST   /api/documents/{id}/workflow/steps/{stepId}/reject
POST   /api/documents/{id}/workflow/steps/{stepId}/send-back

GET    /api/document-workflow-templates                   — liste des templates
POST   /api/document-workflow-templates                   — créer un template
PUT    /api/document-workflow-templates/{id}              — modifier
DELETE /api/document-workflow-templates/{id}              — supprimer
```

### Endpoints archive

```
GET    /api/documents/archives                            — liste des archives
POST   /api/documents/{id}/archive/retrieve              — URL de récupération
POST   /api/documents/{id}/archive/verify                — vérifier l'intégrité
GET    /api/documents/archives/export                    — export CSV du registre
```

### Endpoints validation (approbateurs)

```
GET    /api/documents/pending-validation                  — mes documents à valider
GET    /api/documents/validation-stats                    — statistiques
```

---

*Module développé pour IBIG SECRETIS ERP — Conforme droit OHADA — v1.0.0*
