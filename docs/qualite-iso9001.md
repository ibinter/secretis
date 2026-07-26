# Module Qualité ISO 9001 — IBIG SECRETIS ERP

## Vue d'ensemble

Le module Qualité de SECRETIS ERP implémente les exigences de la norme **ISO 9001:2015** pour le Système de Management de la Qualité (SMQ). Il couvre l'intégralité du cycle PDCA (Plan-Do-Check-Act) et s'intègre nativement avec les autres modules de la plateforme.

---

## 1. Architecture du module

### 1.1 Tables de base de données

| Table | Description |
|---|---|
| `quality_processes` | Cartographie des processus (Management / Réalisation / Support) |
| `nonconformities` | Non-conformités avec référence auto NC-YYYY-XXXX |
| `corrective_actions` | Actions correctives liées aux NC |
| `quality_audits` | Planification et suivi des audits qualité |
| `audit_findings` | Constatations d'audit (NC, observations, points positifs) |
| `quality_indicators` | Définition des indicateurs de performance qualité |
| `quality_indicator_values` | Valeurs mensuelles/trimestrielles des indicateurs |
| `quality_documents` | Bibliothèque documentaire avec workflow d'approbation |
| `customer_complaints` | Réclamations clients avec lien NC automatique |

### 1.2 Pages frontend

| Page | Route | Description |
|---|---|---|
| Dashboard | `/qualite/dashboard` | KPIs, graphiques, indicateurs |
| Non-conformités | `/qualite/nc` | Liste filtrée avec codes couleur |
| Fiche NC | `/qualite/nc/{id}` | Workflow complet, analyse des causes, actions |
| Indicateurs | `/qualite/indicators` | Grille de cartes avec feux tricolores |
| Audits | `/qualite/audits` | Planification, constatations, rapports |
| Documents | `/qualite/documents` | Bibliothèque avec workflow approbation |
| Réclamations | `/qualite/complaints` | Suivi réclamations clients |
| Cartographie | `/qualite/processes` | Vue graphique des processus |

---

## 2. Traitement des non-conformités

### 2.1 Cycle de vie

```
OUVERT → ANALYSE → ACTION CORRECTIVE → VÉRIFICATION → CLOS
```

Chaque transition est tracée avec horodatage et utilisateur.

**Transitions** :
- `ouvert` → `analyse` : quand l'analyse des causes est enregistrée
- `analyse` → `action_corrective` : dès l'ajout de la première action corrective
- `action_corrective` → `vérification` : manuellement par le responsable qualité
- `vérification` → `clos` : si l'efficacité est notée ≥ 3/5
- `vérification` → `action_corrective` : si l'efficacité est < 3/5 (NC réouverte)

### 2.2 Génération automatique de référence

Format : `NC-YYYY-XXXX` (ex: `NC-2026-0042`)

La séquence est automatique par organisation et par année calendaire.

### 2.3 Détection de récurrence

Le système détecte automatiquement les NC récurrentes en comparant :
- L'organisation
- Le processus concerné
- La similarité du titre (25 premiers caractères)
- Les NC clôturées dans les 12 derniers mois

Le compteur `recurrence_count` est incrémenté et visible dans la liste.

### 2.4 Sources de NC

| Code | Libellé |
|---|---|
| `audit` | Constatation d'audit (interne ou externe) |
| `client_complaint` | Réclamation client |
| `internal_detection` | Détection interne (contrôle, inspection) |
| `supplier` | Non-conformité fournisseur |
| `regulatory` | Exigence réglementaire non respectée |

---

## 3. Analyse des causes

### 3.1 Méthode 5 Pourquoi

L'interface présente 5 champs enchaînés visuellement (`Pourquoi 1` → `Pourquoi 2` → ... → `Pourquoi 5`), suivi d'un champ "Cause racine identifiée".

**Structure stockée** (JSONB) :
```json
{
  "why1": "Le produit a été livré en retard",
  "why2": "La commande fournisseur était en retard",
  "why3": "Le fournisseur n'a pas reçu la commande à temps",
  "why4": "Le bon de commande n'a pas été envoyé dans les délais",
  "why5": "Aucune procédure de délai d'envoi n'était définie",
  "root_conclusion": "Absence de procédure formalisée de gestion des délais fournisseurs"
}
```

### 3.2 Diagramme Ishikawa (5M / 6M)

Le composant `IshikawaDiagram.jsx` génère un diagramme en arête de poisson interactif avec 6 branches :

| Branche | Description |
|---|---|
| Matière | Matières premières, consommables, pièces |
| Méthode | Procédures, modes opératoires, instructions |
| Milieu | Environnement de travail, conditions physiques |
| Main-d'œuvre | Compétences, formation, comportement humain |
| Matériel | Équipements, machines, outils, infrastructure |
| Management | Organisation, planification, décisions |

**Export** : le diagramme peut être exporté en SVG ou PNG pour intégration dans les rapports.

**Structure stockée** (JSONB) :
```json
{
  "matiere":     ["Matière première non conforme", "Lot B hors tolérance"],
  "methode":     ["Procédure de contrôle insuffisante"],
  "milieu":      [],
  "main_oeuvre": ["Opérateur non formé sur le poste"],
  "materiel":    ["Étalonnage du pied à coulisse expiré"],
  "management":  ["Absence de revue hebdomadaire qualité"]
}
```

---

## 4. Pilotage des indicateurs qualité

### 4.1 Indicateurs pré-configurés

Le système propose 6 indicateurs ISO 9001 de référence :

| Code | Indicateur | Unité | Cible | Seuil alerte |
|---|---|---|---|---|
| IQ-01 | Taux de satisfaction client | % | ≥ 85 | 75 |
| IQ-02 | Taux de NC critiques | % | = 0 | 1 |
| IQ-03 | Délai moyen de clôture NC | jours | ≤ 15 | 20 |
| IQ-04 | Taux de livraison à temps | % | ≥ 95 | 90 |
| IQ-05 | Taux de réclamations clients | % | ≤ 2 | 3 |
| IQ-06 | Taux d'audits réalisés dans les délais | % | 100 | 90 |

### 4.2 Système de feux tricolores

| Couleur | Condition | Signification |
|---|---|---|
| Vert | Valeur ≥ Cible | Conforme aux objectifs |
| Orange | Cible > Valeur ≥ Seuil d'alerte | Attention requise |
| Rouge | Valeur < Seuil d'alerte | Hors objectif — action requise |
| Gris | Aucune valeur saisie | Non renseigné |

### 4.3 Saisie des valeurs

La saisie mensuelle est accessible depuis la grille des indicateurs (bouton dans le panel d'historique). Les valeurs peuvent être modifiées rétroactivement pour correction.

---

## 5. Préparation aux audits ISO 9001

### 5.1 Types d'audits

| Type | Description |
|---|---|
| `interne` | Audit réalisé par des auditeurs internes |
| `externe` | Audit par un organisme externe |
| `certification` | Audit de certification / renouvellement ISO 9001 |
| `fournisseur` | Audit chez un fournisseur critique |
| `surveillance` | Audit de surveillance entre deux certifications |

### 5.2 Checklist par clause ISO 9001:2015

Le système fournit des questions d'audit pour toutes les clauses ISO 9001:2015, accessibles via l'API :

```
GET /qualite/audits/{id}/checklist?clause=8.3
```

Clauses disponibles : 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3.

### 5.3 Workflow d'un audit

1. **Planification** : création de l'audit avec périmètre, dates, auditeur
2. **Réalisation** (`en_cours`) : saisie des constatations (NC, observations, points positifs)
3. **Rapport** (`rapport_en_attente`) : upload du rapport d'audit
4. **Clôture** (`clos`) : suivi des NC générées depuis l'audit

### 5.4 Génération automatique de NC depuis les constatations

Lors de la saisie d'une constatation de type "Non-conformité", l'auditeur peut cocher "Créer automatiquement une NC". Le système :
1. Crée la NC avec source = `audit`
2. Attribue la sévérité selon le niveau de risque (élevé → critique, moyen → majeure, faible → mineure)
3. Lie la constatation à la NC créée

---

## 6. Gestion documentaire qualité

### 6.1 Workflow d'approbation

```
BROUILLON → EN REVUE → APPROUVÉ → OBSOLÈTE
```

Seuls les documents en statut "Approuvé" sont considérés comme applicables.

### 6.2 Alertes de révision

Un CRON quotidien (`QualityService::checkDocumentExpiry()`) vérifie les documents dont la date de révision est dans les 30 jours. Les badges d'alerte sont affichés dans la bibliothèque documentaire :

- Badge **orange** : révision dans moins de 30 jours (affiche le nombre de jours restants)
- Badge **rouge** : date de révision dépassée

### 6.3 Types de documents

| Type | Description | Exemples |
|---|---|---|
| `procedure` | Comment faire | Procédure de traitement des NC |
| `instruction` | Instruction de travail | Instruction de soudage IS-04 |
| `formulaire` | Enregistrement à remplir | Fiche de contrôle F-012 |
| `enregistrement` | Preuve de conformité | Rapport d'essai, PV de réception |
| `politique` | Engagement de la direction | Politique qualité, politique RSE |

---

## 7. Réclamations clients

### 7.1 Création automatique de NC

Pour toute réclamation de sévérité **majeure** ou **critique**, une non-conformité est automatiquement créée avec :
- Source = `client_complaint`
- Même sévérité que la réclamation
- Lien bidirectionnel entre la réclamation et la NC

### 7.2 Clôture et satisfaction

La clôture d'une réclamation requiert :
1. Une description de la résolution apportée
2. Une note de satisfaction client (1 à 5 étoiles)

Ces notes alimentent le KPI "Satisfaction client" du tableau de bord.

---

## 8. API REST — Référence rapide

### Non-conformités

```
GET    /qualite/nc                           Liste paginée avec filtres
GET    /qualite/nc/{id}                      Détail d'une NC
POST   /qualite/nc                           Créer une NC
PUT    /qualite/nc/{id}                      Modifier une NC
DELETE /qualite/nc/{id}                      Supprimer une NC
PATCH  /qualite/nc/{id}/status              Changer le statut
POST   /qualite/nc/{id}/root-cause          Analyser les causes
POST   /qualite/nc/{id}/corrective-action   Ajouter une action corrective
POST   /qualite/nc/{id}/verify              Vérifier l'efficacité (rating 1-5)
```

### Indicateurs

```
GET  /qualite/indicators                     Liste avec statuts RAG
POST /qualite/indicators                     Créer un indicateur
PUT  /qualite/indicators/{id}               Modifier un indicateur
POST /qualite/indicators/{id}/values        Enregistrer une valeur
GET  /qualite/indicators/{id}/history       Historique des valeurs
```

### Audits

```
GET  /qualite/audits                         Liste des audits
POST /qualite/audits                         Planifier un audit
GET  /qualite/audits/{id}                    Détail d'un audit
PATCH /qualite/audits/{id}                  Mettre à jour le statut/rapport
GET  /qualite/audits/{id}/checklist?clause= Questions par clause ISO
POST /qualite/audits/{id}/findings          Ajouter une constatation
POST /qualite/audits/{id}/report            Uploader le rapport
```

### Documents

```
GET   /qualite/documents                     Liste filtrée
POST  /qualite/documents                     Créer un document
PATCH /qualite/documents/{id}/approve       Approuver un document
POST  /qualite/documents/{id}/file          Uploader le fichier
```

---

## 9. Glossaire qualité

| Terme | Définition |
|---|---|
| **NC** | Non-conformité : non-satisfaction d'une exigence |
| **Action corrective** | Action visant à éliminer la cause d'une NC |
| **Action préventive** | Action visant à éliminer la cause d'une NC potentielle |
| **Audit** | Processus systématique et indépendant d'obtention de preuves |
| **Clause ISO** | Référence à un paragraphe de la norme ISO 9001:2015 |
| **Constatation** | Résultat de l'évaluation des preuves d'audit |
| **Efficacité** | Réalisation des activités planifiées et obtention des résultats escomptés |
| **Enregistrement** | Document faisant état de résultats obtenus ou de la preuve de réalisation d'une activité |
| **Indicateur** | Mesure permettant d'évaluer la performance d'un processus |
| **Ishikawa** | Outil d'analyse des causes (diagramme en arête de poisson) |
| **KPI** | Key Performance Indicator — Indicateur clé de performance |
| **Maturité** | Niveau de maîtrise d'un processus (1 = initial, 5 = optimisé) |
| **PDCA** | Plan-Do-Check-Act : roue de l'amélioration continue (Deming) |
| **Processus** | Ensemble d'activités corrélées qui transforme des éléments d'entrée en éléments de sortie |
| **Réclamation** | Expression d'insatisfaction adressée à un organisme |
| **SMQ** | Système de Management de la Qualité |
| **5M** | Méthode d'analyse des causes : Matière, Méthode, Milieu, Main-d'œuvre, Matériel (+ Management = 6M) |
| **5 Pourquoi** | Technique d'analyse itérative des causes racines |

---

## 10. Configuration et démarrage

### 10.1 Migration

```bash
php artisan migrate --path=database/migrations/2026_01_01_000115_create_quality_tables.php
```

### 10.2 Seeders recommandés

Créer un seeder `QualitySeeder` pour insérer les 6 indicateurs par défaut et les processus ISO de base lors de l'onboarding d'une nouvelle organisation.

### 10.3 CRON — Alertes documents

Ajouter dans `app/Console/Kernel.php` :

```php
$schedule->call(fn () => app(QualityService::class)->checkDocumentExpiry())
         ->daily()
         ->at('08:00')
         ->description('Alertes révision documents qualité');
```

### 10.4 Routes (à ajouter dans `routes/web.php`)

```php
Route::prefix('qualite')->name('qualite.')->middleware(['auth'])->group(function () {
    Route::get('/dashboard', [QualityController::class, 'dashboard'])->name('dashboard');
    Route::get('/report',    [QualityController::class, 'report'])->name('report');

    // Non-conformités
    Route::get('/nc',               [QualityController::class, 'ncIndex'])->name('nc.index');
    Route::get('/nc/{id}',          [QualityController::class, 'ncShow'])->name('nc.show');
    Route::post('/nc',              [QualityController::class, 'ncStore'])->name('nc.store');
    Route::put('/nc/{id}',          [QualityController::class, 'ncUpdate'])->name('nc.update');
    Route::delete('/nc/{id}',       [QualityController::class, 'ncDestroy'])->name('nc.destroy');
    Route::patch('/nc/{id}/status', [QualityController::class, 'ncChangeStatus'])->name('nc.status');
    Route::post('/nc/{id}/root-cause',         [QualityController::class, 'ncRootCause'])->name('nc.root-cause');
    Route::post('/nc/{id}/corrective-action',  [QualityController::class, 'ncCorrectiveAction'])->name('nc.corrective-action');
    Route::post('/nc/{id}/verify',             [QualityController::class, 'ncVerify'])->name('nc.verify');

    // Indicateurs
    Route::get('/indicators',              [QualityController::class, 'indicatorsIndex'])->name('indicators.index');
    Route::post('/indicators',             [QualityController::class, 'indicatorStore'])->name('indicators.store');
    Route::put('/indicators/{id}',         [QualityController::class, 'indicatorUpdate'])->name('indicators.update');
    Route::post('/indicators/{id}/values', [QualityController::class, 'indicatorRecordValue'])->name('indicators.values');
    Route::get('/indicators/{id}/history', [QualityController::class, 'indicatorHistory'])->name('indicators.history');

    // Audits
    Route::get('/audits',                [QualityController::class, 'auditsIndex'])->name('audits.index');
    Route::get('/audits/{id}',           [QualityController::class, 'auditShow'])->name('audits.show');
    Route::post('/audits',               [QualityController::class, 'auditStore'])->name('audits.store');
    Route::patch('/audits/{id}',         [QualityController::class, 'auditUpdate'])->name('audits.update');
    Route::get('/audits/{id}/checklist', [QualityController::class, 'auditChecklist'])->name('audits.checklist');
    Route::post('/audits/{id}/findings', [QualityController::class, 'auditAddFinding'])->name('audits.findings');
    Route::post('/audits/{id}/report',   [QualityController::class, 'auditUploadReport'])->name('audits.report');

    // Documents
    Route::get('/documents',              [QualityController::class, 'documentsIndex'])->name('documents.index');
    Route::post('/documents',             [QualityController::class, 'documentStore'])->name('documents.store');
    Route::patch('/documents/{id}/approve', [QualityController::class, 'documentApprove'])->name('documents.approve');
    Route::post('/documents/{id}/file',   [QualityController::class, 'documentUploadFile'])->name('documents.file');

    // Réclamations
    Route::get('/complaints',            [QualityController::class, 'complaintsIndex'])->name('complaints.index');
    Route::post('/complaints',           [QualityController::class, 'complaintStore'])->name('complaints.store');
    Route::post('/complaints/{id}/close',[QualityController::class, 'complaintClose'])->name('complaints.close');

    // Cartographie processus
    Route::get('/processes',             [QualityController::class, 'processesIndex'])->name('processes.index');
    Route::post('/processes',            [QualityController::class, 'processStore'])->name('processes.store');
    Route::put('/processes/{id}',        [QualityController::class, 'processUpdate'])->name('processes.update');
});
```
