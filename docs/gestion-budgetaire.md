# Gestion Budgétaire — SECRETIS ERP (IBIG)

## 1. Vue d'ensemble

Le module de gestion budgétaire de SECRETIS ERP permet aux organisations de :

- **Préparer** des budgets annuels multi-types (opérationnel, investissement, projet, département)
- **Approuver** et geler les budgets validés par la hiérarchie
- **Suivre** l'exécution en temps réel via les journaux comptables SYSCOHADA
- **Analyser** les écarts (budget vs réel) par ligne, département, catégorie
- **Prévoir** la fin d'exercice selon deux méthodes (linéaire / saisonnalisée)
- **Alerter** automatiquement les responsables lors du franchissement des seuils

---

## 2. Architecture technique

### Backend (Laravel 11)

| Composant | Fichier | Rôle |
|-----------|---------|------|
| Migration | `database/migrations/2026_01_01_000113_create_budget_tables.php` | 5 tables : budgets, budget_lines, budget_revisions, budget_alerts, actuals_cache |
| Service | `app/Services/BudgetService.php` | Toute la logique métier |
| Contrôleur | `app/Http/Controllers/BudgetController.php` | Routes Inertia + JSON |
| Job | `app/Jobs/BudgetAlertJob.php` | CRON mensuel alertes + rapport |
| Modèles | `app/Models/Budget*.php` | Eloquent ORM |
| Vue PDF | `resources/views/budget/variance-report-pdf.blade.php` | Rapport DomPDF |
| Routes | `routes/api/budget.php` | 20+ routes |

### Frontend (React + Inertia)

| Page | Fichier |
|------|---------|
| Dashboard | `Pages/Budget/Dashboard.jsx` |
| Formulaire | `Pages/Budget/BudgetForm.jsx` |
| Analyse écarts | `Pages/Budget/VarianceAnalysis.jsx` |
| Prévisions | `Pages/Budget/Forecast.jsx` |
| Liste | `Pages/Budget/BudgetList.jsx` |
| Révision | `Pages/Budget/BudgetRevision.jsx` |
| Alertes | `Pages/Budget/AlertsConfig.jsx` |
| Jauge SVG | `Components/Budget/BudgetGauge.jsx` |

---

## 3. Modèle de données

### Table `budgets`
```sql
id, organization_id, name, fiscal_year_id, type, status,
total_amount, approved_by, approved_at, notes, created_by, created_at
```

- `type` : `operationnel | investissement | projet | departement`
- `status` : `draft → approved → active → closed`

### Table `budget_lines`
```sql
id, budget_id, account_number (SYSCOHADA), account_name,
department_id, project_id, description,
q1_amount, q2_amount, q3_amount, q4_amount, annual_amount,
is_income (bool), category
```

- `category` : `personnel | fonctionnement | investissement | impots | autres`
- `annual_amount` = q1 + q2 + q3 + q4 (calculé par le service)

### Table `budget_revisions`
Snapshots JSON des lignes avant chaque révision — audit trail complet.

### Table `budget_alerts`
Configuration des seuils d'alerte par ligne (`50% / 80% / 100% / exceeded`).

### Table `actuals_cache`
Cache des réels mensuels issu des journaux comptables SYSCOHADA.

---

## 4. Processus de préparation budgétaire

### Calendrier type (exercice N)

| Période | Étape | Acteurs |
|---------|-------|---------|
| Septembre N-1 | Cadrage macro + hypothèses | DAF, DG |
| Octobre N-1 | Saisie des budgets par département | Managers |
| Novembre N-1 | Consolidation et arbitrages | DAF |
| Décembre N-1 | Approbation finale | CA / DG |
| Janvier N | Activation du budget | DAF |
| Mensuel | Suivi de l'exécution + alertes | DAF, Comptable |
| Trimestriel | Révision éventuelle | DAF + approbation |

### Workflow d'approbation

```
Création (draft)
    ↓
Soumission pour approbation
    ↓
Approbation DAF / DG (→ status: active)
    ↓
Gel du budget (plus d'édition directe)
    ↓
Révision si besoin (avec motif + nouveau cycle d'approbation si > 10%)
    ↓
Clôture en fin d'exercice (→ status: closed)
```

---

## 5. Analyse des écarts

### Définition

L'écart = Budget − Réel

Pour les **charges** :
- Écart positif (réel < budget) = **Favorable** (dépense maîtrisée)
- Écart négatif (réel > budget) = **Défavorable** (dépassement)

Pour les **produits** :
- Écart positif (réel > budget) = **Favorable** (sur-réalisation)
- Écart négatif (réel < budget) = **Défavorable** (sous-réalisation)

### Code couleur

| Couleur | Seuil (charges) | Signification |
|---------|-----------------|---------------|
| Vert | ≤ 105% | Exécution normale |
| Orange | 105% – 115% | Écart modéré — à surveiller |
| Rouge | > 115% | Dépassement significatif |

### Actions correctives selon l'écart

**Écart favorable (charge sous-exécutée) :**
- Vérifier si report de dépense prévu
- Analyser si économie structurelle ou simple décalage
- Éventuellement réallouer le solde

**Écart défavorable (charge dépassée) :**
- Identifier immédiatement la cause (prix, volume, nouveau besoin)
- Proposer une mesure corrective ou une révision budgétaire
- Documenter dans les commentaires de la ligne

---

## 6. Prévisions

### Méthode linéaire

```
Rythme mensuel moyen = Réel YTD / Nombre de mois écoulés
Prévision fin exercice = Réel YTD + (Rythme × Mois restants)
```

**Usage :** dépenses régulières, loyers, salaires.

### Méthode saisonnalisée (pondérée)

La répartition budgétaire trimestrielle sert de proxy de saisonnalité. La part des trimestres restants (selon la répartition budgétée) est appliquée au réel cumulé.

**Usage :** activités saisonnières (campagnes marketing, arrêts techniques, activité cyclique).

### Scénarios

| Scénario | Formule |
|----------|---------|
| Optimiste | Prévision réaliste × 90% |
| Réaliste | Moyenne des deux méthodes |
| Pessimiste | Prévision réaliste × 110% |

---

## 7. Système d'alertes

### Configuration

Depuis `Budget → Alertes`, pour chaque ligne budgétaire :
1. Activer/désactiver chaque seuil (50%, 80%, 100%, Dépassé)
2. Sélectionner les destinataires (multi-utilisateurs)
3. Sauvegarder

### Déclenchement (CRON)

Le job `BudgetAlertJob` s'exécute le **1er de chaque mois à 07h00** :
1. Rafraîchit le cache des réels depuis les journaux SYSCOHADA
2. Compare chaque ligne à ses seuils configurés
3. Envoie les alertes par email aux destinataires
4. Génère et envoie le **rapport mensuel d'exécution** aux managers DAF

### Planification (Laravel Scheduler)

Dans `routes/console.php` :
```php
use App\Jobs\BudgetAlertJob;

Schedule::job(new BudgetAlertJob)->monthlyOn(1, '07:00');
```

---

## 8. Import / Export

### Export CSV

Le bouton **"Export CSV"** génère un fichier UTF-8 (avec BOM pour Excel) en deux sections :
1. Détail ligne par ligne (budget, réel, écart, %)
2. Consolidation par catégorie

### Import CSV

Format attendu (en-tête sur la première ligne, séparateur `;`) :

```
account_number;account_name;category;is_income;q1;q2;q3;q4;department_id;project_id;description
601;Achats marchandises;fonctionnement;0;5000000;5000000;5000000;5000000;;;
641;Salaires bruts;personnel;0;15000000;15000000;15000000;15000000;;;
706;Services vendus;fonctionnement;1;20000000;20000000;20000000;20000000;;;
```

- `is_income` : `1` = produit, `0` = charge
- Montants en FCFA sans espaces ni virgules décimales

### Export PDF

Le rapport PDF (DomPDF) comprend :
- En-tête organisation + métadonnées du budget
- Résumé exécutif (5 KPIs)
- Tableau détaillé par catégorie avec code couleur
- Liste des alertes actives
- Zone de signature DAF

---

## 9. Intégration SYSCOHADA

### Plan comptable supporté

Les codes comptes reconnus en autocomplete couvrent les classes principales :
- **Classe 6** : Charges (601–681)
- **Classe 7** : Produits (701–791)

### Lecture des réels

Le service lit depuis `accounting_journal_lines` (jointure `accounting_journal_entries`) en filtrant sur `organization_id` et `entry_date`. Les réels sont agrégés par compte et par mois, puis mis en cache dans `actuals_cache`.

> **Note d'intégration :** Adaptez les noms de table dans `BudgetService::fetchActualsFromJournal()` à votre schéma comptable SYSCOHADA réel (modules Comptabilité SECRETIS).

---

## 10. Bonnes pratiques et rôles

### Rôles recommandés

| Rôle | Accès |
|------|-------|
| **DAF** | Tous les budgets, approbation, révision, rapport mensuel |
| **Manager département** | Ses propres budgets, lecture analyse écarts |
| **Comptable** | Lecture + export, saisie réels |
| **DG** | Tableau de bord, approbation finale |

### Bonnes pratiques

1. **Construire le budget en bas-up** : chaque manager saisit son propre budget, le DAF consolide.
2. **Ne jamais modifier directement un budget actif** : utiliser la procédure de révision (avec motif obligatoire).
3. **Documenter les écarts dès le mois courant** : les commentaires de ligne sont essentiels pour le rapport de gestion.
4. **Analyser YTD et non pas mois par mois** : les décalages de paiement faussent l'analyse mensuelle.
5. **Vérifier les alertes à 80%** avant qu'elles ne deviennent des dépassements.
6. **Archiver le budget à la clôture** : le statut `closed` conserve l'historique pour les comparaisons N/N-1.
