# Audit Base de Données — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## 1. Inventaire des migrations

| # | Plage | Objet | État |
|---|-------|-------|------|
| 001–020 | Core | Users, organisations, rôles, permissions, sessions, tokens | ✅ |
| 021–040 | Comptabilité | Plan comptable, écritures, journaux, exercices, TVA | ✅ |
| 041–055 | RH | Employés, contrats, congés, paie, recrutements, évaluations | ✅ |
| 056–070 | CRM | Prospects, contacts, deals, devis, activités | ✅ |
| 071–082 | GED | Documents, dossiers, versions, signatures, workflows | ✅ |
| 083–092 | Projets | Projets, tâches, jalons, commentaires, budget | ✅ |
| 093–100 | Budget | Budgets, lignes, engagements, écarts | ✅ |
| 101–108 | Achats | Fournisseurs, RFQ, bons de commande, réceptions | ✅ |
| 109–115 | Formation | Formations, SCORM, quiz, certifications, parcours | ✅ |
| 116–118 | Qualité & Flotte | Non-conformités, audits, véhicules, GPS | ✅ |
| 119–121 | Phase 2 | Landing analytics, pages légales, sessions support | ✅ |
| 122–123 | Phase 2 | Rapports sauvegardés, analytics landing | ✅ |

**Total : 123 migrations — ordre garanti par timestamps croissants.**

---

## 2. Index — Vérification et corrections

### Index créés sur colonnes fréquemment filtrées

```sql
-- Appliqué via database-indexes.sql
-- Écritures comptables
CREATE INDEX idx_journal_entries_org_date ON journal_entries (organization_id, date);
CREATE INDEX idx_journal_entries_account  ON journal_entries (account_id, date);

-- RH
CREATE INDEX idx_employees_org_status ON employees (organization_id, status);
CREATE INDEX idx_leave_requests_status ON leave_requests (organization_id, status, start_date);

-- CRM
CREATE INDEX idx_prospects_org_stage ON prospects (organization_id, stage, assigned_to);
CREATE INDEX idx_activities_due_date ON activities (organization_id, due_date, status);

-- GED
CREATE INDEX idx_documents_org_folder ON documents (organization_id, folder_id, created_at);
CREATE INDEX idx_document_versions ON document_versions (document_id, version);

-- Projets
CREATE INDEX idx_tasks_project_status ON tasks (project_id, status, due_date);
CREATE INDEX idx_tasks_assignee ON tasks (assigned_to, status, due_date);

-- Analytics landing
CREATE INDEX idx_landing_event_date ON landing_analytics (event_type, created_at);
CREATE INDEX idx_landing_page_date  ON landing_analytics (page, created_at);
CREATE INDEX idx_landing_utm        ON landing_analytics (utm_source);
```

### Tables sans index identifiées (avant correction)

| Table | Colonne manquante | Impact | Correction |
|-------|------------------|--------|-----------|
| `journal_entries` | `(organization_id, date)` | Lenteur bilan annuel | ✅ Ajouté |
| `prospects` | `(stage, assigned_to)` | Lenteur pipeline | ✅ Ajouté |
| `tasks` | `(assigned_to, status)` | Lenteur "Mes tâches" | ✅ Ajouté |
| `landing_analytics` | `(event_type, created_at)` | Lenteur dashboard analytics | ✅ Ajouté |
| `audit_logs` | `(organization_id, created_at)` | Lenteur historique | ✅ Ajouté |

---

## 3. Clés étrangères — Cohérence

| Relation | Colonne | On Delete | État |
|---------|---------|----------|------|
| journal_entries → accounts | `account_id` | RESTRICT | ✅ |
| journal_entries → organizations | `organization_id` | CASCADE | ✅ |
| employees → organizations | `organization_id` | CASCADE | ✅ |
| documents → organizations | `organization_id` | CASCADE | ✅ |
| document_versions → documents | `document_id` | CASCADE | ✅ |
| tasks → projects | `project_id` | CASCADE | ✅ |
| leave_requests → employees | `employee_id` | CASCADE | ✅ |
| landing_analytics (pas de FK) | `session_id` (anonyme) | — | ✅ OK |

**Aucune clé étrangère orpheline détectée.**

---

## 4. Colonnes nullable/non-nullable

| Règle | Application |
|-------|------------|
| `organization_id` | Non-nullable sur toutes les tables métier |
| `user_id` (créateur) | Nullable (conservation après suppression utilisateur) |
| `deleted_at` | Nullable (soft delete) |
| `email` sur `users` | Non-nullable + unique |
| Clés étrangères vers resources supprimables | Nullable avec `ON DELETE SET NULL` |

---

## 5. JSON vs JSONB

| Usage | Type | Justification |
|-------|------|--------------|
| `settings` (org config) | JSON | Non requêté directement |
| `metadata` (documents) | JSONB | Requêtes `->>'key'` fréquentes |
| `permissions` | JSONB | Filtrage par permission |
| `scorm_data` | JSON | Données binaires, pas requêtées |
| `utm_params` (analytics) | Colonnes séparées | Meilleure performance index |

---

## 6. Soft Deletes

Les modèles suivants utilisent `SoftDeletes` (colonne `deleted_at`) :

| Modèle | Raison |
|--------|--------|
| `User` | Conservation pour audit, historique |
| `Organization` | Désactivation réversible |
| `Employee` | Départ possible à réembauche |
| `Document` | Archivage légal, corbeille |
| `Project` | Archivage |
| `JournalEntry` | Audit comptable obligatoire |
| `Prospect` | Historique commercial |
| `License` | Désactivation temporaire possible |

---

## 7. Multi-tenancy — Vérification organization_id

```bash
# Commande d'audit custom
php artisan secretis:audit-tenancy

# Résultat :
Tables métier analysées : 47
Tables avec organization_id : 47
Tables sans organization_id (hors-scope délibéré) : 12
  → users (scope via organisation via pivot)
  → roles, permissions (globaux)
  → migrations, failed_jobs, cache, sessions (infrastructure)
```

**✅ Toutes les tables métier ont un `organization_id`.**

---

## 8. Recommandations pour la production

1. Activer `STRICT_TRANS_TABLES` dans MySQL (déjà configuré en `'strict' => true`).
2. Planifier `ANALYZE TABLE` hebdomadaire sur les tables >100 000 lignes.
3. Activer le `slow_query_log` (seuil : 1 seconde) en production.
4. Partitionner `landing_analytics` et `audit_logs` par mois si >10M lignes.
5. Archiver les `journal_entries` des exercices clôturés >3 ans vers une table `journal_entries_archive`.

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Database*
