# Matrice Rôles × Permissions — IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0  
**Moteur :** Spatie Laravel Permission (guards : web, api)

---

## Les 10 rôles

| # | Rôle | Description | Portée |
|---|------|-------------|--------|
| 1 | `super-admin` | Accès total à la plateforme SaaS (cross-org) | Plateforme |
| 2 | `admin` | Administrateur de l'organisation | Organisation |
| 3 | `manager` | Chef de service, accès lecture + approbation | Organisation |
| 4 | `comptable` | Module comptabilité, paie, budget | Organisation |
| 5 | `rh` | Module RH complet | Organisation |
| 6 | `commercial` | CRM, devis, prospects | Organisation |
| 7 | `chef-projet` | Module projets complet | Organisation |
| 8 | `employe` | Accès limité à ses données | Organisation |
| 9 | `auditeur` | Lecture seule sur tous les modules | Organisation |
| 10 | `partenaire` | Accès API tiers via clé | Organisation |

---

## Matrice Rôle × Permission (synthèse)

### Comptabilité

| Permission | super-admin | admin | manager | comptable | rh | commercial | chef-projet | employe | auditeur | partenaire |
|-----------|:-----------:|:-----:|:-------:|:---------:|:--:|:----------:|:-----------:|:-------:|:--------:|:----------:|
| accounting.view | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | 🟡 | ❌ | ✅ | 🟡 |
| accounting.create | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| accounting.update | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| accounting.delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| accounting.close | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| accounting.export | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | 🟡 |
| payroll.view | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | 🟡 | ✅ | ❌ |
| payroll.create | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Ressources Humaines

| Permission | super-admin | admin | manager | comptable | rh | commercial | chef-projet | employe | auditeur | partenaire |
|-----------|:-----------:|:-----:|:-------:|:---------:|:--:|:----------:|:-----------:|:-------:|:--------:|:----------:|
| hr.view | ✅ | ✅ | ✅ | 🟡 | ✅ | ❌ | 🟡 | 🟡 | ✅ | ❌ |
| hr.create | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| hr.update | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| hr.delete | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| hr.approve | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| hr.export | ✅ | ✅ | ✅ | 🟡 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |

### CRM

| Permission | super-admin | admin | manager | comptable | rh | commercial | chef-projet | employe | auditeur | partenaire |
|-----------|:-----------:|:-----:|:-------:|:---------:|:--:|:----------:|:-----------:|:-------:|:--------:|:----------:|
| crm.view | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | 🟡 | ❌ | ✅ | 🟡 |
| crm.create | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| crm.update | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| crm.delete | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| crm.export | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |

### GED

| Permission | super-admin | admin | manager | comptable | rh | commercial | chef-projet | employe | auditeur | partenaire |
|-----------|:-----------:|:-----:|:-------:|:---------:|:--:|:----------:|:-----------:|:-------:|:--------:|:----------:|
| ged.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ✅ | 🟡 |
| ged.create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ged.update | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 | ❌ | ❌ |
| ged.delete | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ |
| ged.sign | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### Projets

| Permission | super-admin | admin | manager | comptable | rh | commercial | chef-projet | employe | auditeur | partenaire |
|-----------|:-----------:|:-----:|:-------:|:---------:|:--:|:----------:|:-----------:|:-------:|:--------:|:----------:|
| projects.view | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | ✅ | 🟡 |
| projects.create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| projects.update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| projects.delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |

### Licences & SuperAdmin

| Permission | super-admin | admin | manager | autres |
|-----------|:-----------:|:-----:|:-------:|:------:|
| license.view | ✅ | ✅ | ❌ | ❌ |
| license.activate | ✅ | ❌ | ❌ | ❌ |
| license.suspend | ✅ | ❌ | ❌ | ❌ |
| organizations.create | ✅ | ❌ | ❌ | ❌ |
| organizations.delete | ✅ | ❌ | ❌ | ❌ |
| platform.monitoring | ✅ | ❌ | ❌ | ❌ |
| platform.analytics | ✅ | ❌ | ❌ | ❌ |

---

## Légende colonnes

| Symbole | Signification |
|---------|--------------|
| ✅ | Permission accordée |
| 🟡 | Permission partielle (accès à ses propres ressources uniquement) |
| ❌ | Permission refusée |

---

## Modules accessibles par rôle

| Rôle | Modules accessibles |
|------|---------------------|
| super-admin | Tous les modules + console plateforme |
| admin | Tous les modules de son organisation |
| manager | Dashboard, RH (lecture), projets, GED, courrier |
| comptable | Comptabilité, budget, achats, rapports financiers |
| rh | RH complet, congés, paie, recrutement, formation |
| commercial | CRM, devis, contacts, agenda, GED partiel |
| chef-projet | Projets complet, GED, tâches, Gantt, budget projet |
| employe | Ses fiches, ses congés, son espace GED, ses tâches |
| auditeur | Lecture seule sur tous les modules (aucune écriture) |
| partenaire | API uniquement, selon scope de la clé |

---

*Document généré le 2026-07-22 — IBIG Soft / Équipe Sécurité*
