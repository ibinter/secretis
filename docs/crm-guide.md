# Guide CRM SuperAdmin — IBIG Soft SECRETIS

> Accès réservé aux SuperAdmins IBIG Soft (rôle `superadmin_ibig`).
> URL : `/superadmin/crm/`

---

## Table des matières

1. [Vue d'ensemble du module CRM](#1-vue-densemble)
2. [Pipeline de vente](#2-pipeline-de-vente)
3. [Gestion des contacts](#3-gestion-des-contacts)
4. [Qualification BANT](#4-qualification-bant)
5. [Deals et opportunités](#5-deals-et-opportunités)
6. [Activités et suivi](#6-activités-et-suivi)
7. [Templates et séquences email](#7-templates-et-séquences-email)
8. [Analytiques commerciales](#8-analytiques-commerciales)
9. [Conversion prospect → client](#9-conversion-prospect--client)
10. [CRON quotidien et alertes](#10-cron-quotidien-et-alertes)
11. [Métriques clés à surveiller](#11-métriques-clés-à-surveiller)
12. [Séquences email recommandées](#12-séquences-email-recommandées)

---

## 1. Vue d'ensemble

Le CRM IBIG Soft est une console interne (non accessible aux clients SECRETIS) qui permet aux commerciaux et SuperAdmins de gérer l'intégralité du cycle de vente de SECRETIS ERP :

```
Lead → Prospect qualifié → Démo → Proposition → Négociation → Deal gagné → Client SECRETIS
```

### Architecture

| Couche       | Fichier                                                        |
|--------------|----------------------------------------------------------------|
| Migration    | `backend/database/migrations/2026_01_01_000107_create_crm_tables.php` |
| Modèles      | `backend/app/Models/Crm/Crm*.php`                             |
| Service      | `backend/app/Services/CrmService.php`                          |
| Contrôleur   | `backend/app/Http/Controllers/SuperAdmin/CrmController.php`   |
| CRON         | `backend/app/Console/Commands/CrmDailyTasks.php`              |
| Frontend     | `frontend/resources/js/Pages/SuperAdmin/Crm/*.jsx`            |

---

## 2. Pipeline de vente

### Stages par défaut

Insérer ces données dans `crm_pipeline_stages` au seeding :

| Ordre | Nom                  | Couleur   | Probabilité | Statut      |
|-------|----------------------|-----------|-------------|-------------|
| 1     | Nouveau Lead         | `#6B7280` | 5%          | Ouvert      |
| 2     | Contacté             | `#3B82F6` | 15%         | Ouvert      |
| 3     | Démo planifiée       | `#8B5CF6` | 35%         | Ouvert      |
| 4     | Proposition envoyée  | `#F59E0B` | 55%         | Ouvert      |
| 5     | Négociation          | `#EF4444` | 75%         | Ouvert      |
| 6     | Gagné                | `#10B981` | 100%        | Closed Won  |
| 7     | Perdu                | `#6B7280` | 0%          | Closed Lost |

### Utilisation du Kanban (`/superadmin/crm/pipeline`)

- **Glisser-déposer** les cards entre colonnes pour déplacer un deal
- Si le deal arrive dans **Perdu**, une modal demande le motif (obligatoire)
- Les **filtres** (plan, pays) sont appliqués en temps réel
- Chaque card affiche : société, valeur, probabilité, plan, score BANT, date de clôture
- **Totaux** en haut de chaque colonne : nombre de deals + valeur cumulée

---

## 3. Gestion des contacts

### Types de contacts

| Type      | Description                                    |
|-----------|------------------------------------------------|
| `lead`    | Intérêt initial, pas encore qualifié           |
| `prospect`| Qualifié, en cours de conversation             |
| `client`  | A acheté SECRETIS (converti)                   |
| `partner` | Partenaire revendeur ou intégrateur            |

### Sources

| Source     | Description                          |
|------------|--------------------------------------|
| `web`      | Formulaire sur ibigsoft.com          |
| `inbound`  | Contact entrant spontané             |
| `referral` | Recommandation d'un client existant  |
| `partner`  | Via un partenaire revendeur          |
| `event`    | Salon, conférence, webinar           |
| `cold`     | Prospection à froid                  |
| `social`   | LinkedIn, Facebook, Twitter          |

### Import CSV

Format attendu (UTF-8, séparateur `,`) :
```
company_name,contact_name,email,phone,country,city,sector,source
Banque Nationale CI,Jean Kouassi,jean@banque.ci,+225 07 00 00 00,CI,Abidjan,Finance,event
```

### Export CSV

L'export inclut tous les champs + le score BANT + le nombre de deals.

---

## 4. Qualification BANT

Le score BANT (0-100) est calculé automatiquement à chaque création/modification de contact et à chaque nouveau deal.

### Décomposition du score

| Critère   | Points max | Critères d'évaluation                                        |
|-----------|------------|--------------------------------------------------------------|
| **Budget**    | 25     | CA annuel ≥ 100M XOF → 25 pts / ≥ 10M → 18 pts / ≥ 1M → 10 pts |
| **Authority** | 25     | Titre contient "directeur", "CEO", "DG", "responsable" → 20 pts |
| **Need**      | 25     | ≥ 50 employés → 20 pts / ≥ 10 → 15 pts / + secteur → +5 pts |
| **Timeline**  | 25     | Clôture prévue ≤ 30j → 25 pts / ≤ 90j → 15 pts / ≤ 180j → 10 pts |

### Interprétation

| Score   | Couleur | Signification                              |
|---------|---------|--------------------------------------------|
| 75-100  | Vert    | Lead très qualifié — prioritaire           |
| 50-74   | Ambre   | Qualifié — suivre régulièrement            |
| 25-49   | Orange  | Partiellement qualifié — enrichir données  |
| 0-24    | Rouge   | Faiblement qualifié — nourrir avec contenu |

---

## 5. Deals et opportunités

### Créer un deal

Un deal représente une opportunité commerciale concrète liée à un contact.

Champs importants :
- **Titre** : description courte (ex : "ERP Enterprise Banque CI")
- **Valeur** : montant estimé en XOF (ex : valeur annuelle du contrat)
- **Plan** : `starter` (25K/mois), `pro` (75K/mois), `enterprise` (150K/mois)
- **Utilisateurs** : nombre d'utilisateurs ciblés (impact tarification)
- **Date de clôture prévue** : utilisée pour les prévisions

### Probabilité effective

```
Probabilité effective = override deal || probabilité du stage
```

La **valeur pondérée** du deal pour les prévisions = `valeur × probabilité / 100`.

---

## 6. Activités et suivi

### Types d'activités

| Type        | Icône | Utilisation                              |
|-------------|-------|------------------------------------------|
| `call`      | 📞   | Appel téléphonique                        |
| `email`     | 📧   | Email manuel hors séquence               |
| `meeting`   | 🤝   | Réunion physique ou visio                |
| `demo`      | 🖥️   | Démonstration de SECRETIS                |
| `proposal`  | 📄   | Envoi d'une proposition commerciale      |
| `follow_up` | 🔔   | Relance                                  |
| `note`      | 📝   | Note interne                             |
| `task`      | ✅   | Tâche à effectuer                        |

### Règle des 7 jours

Un deal sans activité depuis 7 jours ou plus est considéré **à risque de refroidissement**. Le CRON quotidien envoie une alerte dans le digest SuperAdmin.

**Meilleure pratique** : planifier systématiquement la prochaine action après chaque interaction.

---

## 7. Templates et séquences email

### Variables disponibles

| Variable          | Contenu                             |
|-------------------|-------------------------------------|
| `{{contact_name}}`| Prénom et nom du contact             |
| `{{company}}`     | Nom de la société                    |
| `{{plan}}`        | Plan SECRETIS ciblé                  |
| `{{trial_days}}`  | Durée du trial (défaut : 14)         |
| `{{email}}`       | Adresse email du contact             |
| `{{country}}`     | Pays ISO (ex : CI)                   |

### Séquences automatiques

Les séquences se déclenchent selon un `trigger` :

| Trigger               | Moment de déclenchement              |
|-----------------------|--------------------------------------|
| `manual`              | Déclenchement manuel                 |
| `deal_stage_change`   | Deal change de stage                 |
| `trial_start`         | Nouvelle organisation en trial       |
| `trial_expiry`        | Trial expire dans N jours            |
| `demo_done`           | Démo complétée                       |
| `proposal_sent`       | Proposition envoyée                  |

---

## 8. Analytiques commerciales

### Métriques calculées

| Métrique             | Calcul                                                    |
|----------------------|-----------------------------------------------------------|
| **Pipeline total**   | Somme valeurs deals ouverts                               |
| **MRR actuel**       | Somme MRR plans clients actifs (Starter + Pro + Enterprise)|
| **MRR prévu**        | MRR actuel × 1.15 (projection +15%)                      |
| **Forecast 3 mois**  | Σ (valeur × probabilité) par mois                         |
| **Taux de conversion**| Ratio contacts entre chaque stage                        |
| **Délai moyen**       | Jours entre création contact et close_date_actual (won)  |

### Valeurs MRR par plan

| Plan       | MRR       |
|------------|-----------|
| Starter    | 25 000 XOF|
| Pro        | 75 000 XOF|
| Enterprise | 150 000 XOF|

---

## 9. Conversion prospect → client

Lorsqu'un deal est marqué **Gagné**, le bouton **"Convertir en client"** apparaît sur la fiche contact.

### Ce que fait la conversion

1. Crée une nouvelle `Organization` SECRETIS en mode `trial` (14 jours)
2. Met à jour le contact CRM : `type → client`, `status → won`
3. Logue l'activité dans la timeline
4. Stocke l'ID du contact CRM dans les settings de l'organisation (`crm_contact_id`)

### Après la conversion

L'organisation est visible dans la console SuperAdmin sous `/superadmin/organizations`.
Il faut ensuite :
- Créer le compte administrateur de l'organisation
- Activer la licence (ou la laisser en trial)
- Configurer les modules activés

---

## 10. CRON quotidien et alertes

### Planification

Ajouter dans `app/Console/Kernel.php` :

```php
$schedule->command('crm:daily-tasks')->dailyAt('08:00');
```

### Ce que fait la commande chaque matin

1. **Rappels activités** : liste les activités planifiées aujourd'hui
2. **Deals à risque** : contacts sans activité depuis > 7 jours
3. **Stats du jour** : nouveaux trials, conversions, churns, nouveaux leads, deals gagnés
4. **Digest email** : envoi au `SUPERADMIN_EMAIL` configuré en `.env`

### Configuration

```env
SUPERADMIN_EMAIL=superadmin@ibigsoft.com
```

### Lancement manuel

```bash
php artisan crm:daily-tasks
# Mode simulation (sans envoi email) :
php artisan crm:daily-tasks --dry-run
```

---

## 11. Métriques clés à surveiller

### CAC — Coût d'Acquisition Client

```
CAC = Budget marketing + Temps commercial / Nombre de clients acquis
```

Objectif IBIG Soft : CAC < 150 000 XOF par client Starter/Pro.

### LTV — Lifetime Value

```
LTV = MRR moyen × Durée de rétention moyenne (mois)
```

Exemple : Pro à 75 000 XOF × 24 mois = **1 800 000 XOF LTV**

### MRR — Monthly Recurring Revenue

```
MRR = Σ (clients actifs × MRR plan)
```

Objectif : croissance MRR ≥ 10% par mois en phase de démarrage.

### Churn Rate

```
Churn = Clients perdus ce mois / Clients en début de mois × 100
```

Seuil d'alerte : Churn > 5%/mois → action immédiate requise.

### Taux de conversion trial → payant

```
Conversion = Trials convertis / Trials expirés × 100
```

Benchmark SaaS : 15-25%. Objectif IBIG Soft : > 30%.

### NRR — Net Revenue Retention

```
NRR = (MRR fin de période - Churns + Upgrades) / MRR début × 100
```

NRR > 100% signifie que les upgrades compensent les churns.

---

## 12. Séquences email recommandées

### Séquence 1 — Nouveau lead (trigger: `manual`)

| Jour | Template          | Objectif                              |
|------|-------------------|---------------------------------------|
| J+0  | Outreach initial  | Présenter SECRETIS, proposer une démo |
| J+3  | Suivi #1          | Rappel + témoignage client            |
| J+7  | Suivi #2          | Offrir un essai gratuit 14 jours      |
| J+14 | Dernière chance   | Offre limitée ou question ouverte     |

### Séquence 2 — Après démo (trigger: `demo_done`)

| Jour | Template            | Objectif                             |
|------|---------------------|--------------------------------------|
| J+0  | Merci pour la démo  | Résumé, prochaines étapes            |
| J+2  | Proposition commerciale| Envoyer le devis personnalisé     |
| J+5  | Suivi proposition   | Répondre aux objections              |
| J+10 | Relance décision    | Urgencer la décision                 |

### Séquence 3 — Trial start (trigger: `trial_start`)

| Jour | Template             | Objectif                             |
|------|----------------------|--------------------------------------|
| J+0  | Bienvenue dans SECRETIS | Onboarding, guide de démarrage  |
| J+3  | Tips & astuces       | 3 fonctionnalités essentielles       |
| J+7  | Point mi-trial       | Offre d'aide, call de support        |
| J+12 | Avant expiration     | Rappel J+2, tarifs, convertir        |
| J+13 | Dernière chance trial| CTA fort pour activation             |

### Séquence 4 — Anti-churn (trigger: `trial_expiry`)

| Jour | Template              | Objectif                            |
|------|-----------------------|-------------------------------------|
| J-3  | Trial expire bientôt  | Urgence, tarif de lancement         |
| J+0  | Trial expiré          | Offre de réactivation 7 jours       |
| J+7  | Feedback post-trial   | Comprendre les raisons du non-achat |

---

*Guide rédigé pour IBIG Soft — SECRETIS ERP CRM v1.0*
*Module réservé aux SuperAdmins (rôle `superadmin_ibig`)*
