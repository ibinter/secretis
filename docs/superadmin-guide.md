# Guide SuperAdmin IBIG Soft — SECRETIS ERP

**Version :** 1.0 · **Audience :** Équipe interne IBIG Soft uniquement  
**Accès :** Rôle `superadmin_ibig` requis

---

## Table des matières

1. [Accès et authentification](#1-accès-et-authentification)
2. [Dashboard SaaS : interprétation des métriques](#2-dashboard-saas--interprétation-des-métriques)
3. [Analyse MRR](#3-analyse-mrr)
4. [Analyse de cohortes](#4-analyse-de-cohortes)
5. [Health Score : calcul et actions](#5-health-score--calcul-et-actions)
6. [Gestion des feature flags](#6-gestion-des-feature-flags)
7. [Procédure d'impersonification](#7-procédure-dimpersonification)
8. [Support client : workflow tickets](#8-support-client--workflow-tickets)
9. [Annonces et communications](#9-annonces-et-communications)
10. [Monitoring de la plateforme](#10-monitoring-de-la-plateforme)
11. [Gestionnaire des organisations](#11-gestionnaire-des-organisations)
12. [CRON quotidien et alertes automatiques](#12-cron-quotidien-et-alertes-automatiques)

---

## 1. Accès et authentification

### Prérequis

Seuls les employés IBIG Soft disposant du rôle `superadmin_ibig` ont accès au dashboard SuperAdmin.

**Ce rôle ne doit jamais être accordé à un client**, même temporairement.

### Attribution du rôle

```bash
# En base de données (depuis le serveur, jamais en production directement)
php artisan tinker
>>> User::find(ID)->assignRole('superadmin_ibig');
```

### URLs d'accès

| Page | URL |
|------|-----|
| Dashboard SaaS | `/superadmin/saas-dashboard` |
| Analyse MRR | `/superadmin/metrics/mrr` |
| Cohortes | `/superadmin/metrics/cohorts` |
| Santé orgs | `/superadmin/metrics/health` |
| Support | `/superadmin/support` |
| Feature Flags | `/superadmin/feature-flags` |
| Annonces | `/superadmin/announcements` |
| Monitoring | `/superadmin/monitoring` |
| Organisations | `/superadmin/organizations` |

---

## 2. Dashboard SaaS : interprétation des métriques

### KPI Row 1 — Revenus

| Métrique | Définition | Alerte si... |
|----------|------------|--------------|
| **MRR** | Monthly Recurring Revenue = somme des abonnements actifs (mensuel + annuel/12) | Baisse > 5% vs M-1 → email automatique |
| **ARR** | MRR × 12 | — |
| **Croissance MRR** | `(MRR_M - MRR_M1) / MRR_M1 × 100` | < 0% → rouge |
| **Churn Rate** | `churned_orgs / active_orgs_M1 × 100` | > 3% → orange ; > 5% → rouge |

### KPI Row 2 — Engagement

| Métrique | Définition | Objectif |
|----------|------------|----------|
| **Orgs actives** | Organisations avec une licence en cours | — |
| **MAU** | Users ayant eu une session dans les 30 derniers jours | Croissance mensuelle |
| **DAU** | Users connectés aujourd'hui | — |
| **DAU/MAU** | Ratio d'engagement quotidien/mensuel | > 20% = bon ; > 40% = excellent |

### Graphiques

**AreaChart MRR :** Évolution mensuelle sur 12 mois. Une stagnation sur 2+ mois consécutifs doit déclencher une revue commerciale.

**BarChart Nouvelles orgs vs Churned :** L'objectif est que `new > churned` chaque mois. Un mois avec `churned > new` signale un problème de rétention.

**LineChart DAU/MAU :** Mesure la "stickiness" de l'application. En dessous de 15%, l'app n'est pas utilisée régulièrement.

---

## 3. Analyse MRR

### Waterfall MRR

Le waterfall décompose le mouvement MRR d'un mois :

```
MRR Début
  + New MRR       (nouvelles souscriptions ce mois)
  + Expansion MRR (upgrades de plan ce mois)
  - Churned MRR   (annulations ce mois)
= MRR Fin
```

**Interprétation :**
- `Net New MRR > 0` : croissance nette → bonne santé
- `Expansion MRR élevé` : les clients existants passent à des plans supérieurs → excellent signal de valeur
- `Churned MRR > New MRR` : perte nette → urgence de revue de la rétention

### Prévisions 3 scénarios

Les prévisions sont calculées à partir du **taux de croissance composé mensuel (CAGR)** des 6 derniers mois.

| Scénario | Multiplicateur du taux |
|----------|----------------------|
| Pessimiste | × 0.5 |
| Réaliste | × 1.0 (base) |
| Optimiste | × 1.5 |

---

## 4. Analyse de cohortes

### Lecture de la table heatmap

- **Lignes** = mois de souscription (cohorte)
- **Colonnes** = période depuis la souscription (M+0, M+1, M+3, M+6, M+12)
- **Valeur** = % d'organisations encore actives

**Couleurs :**
- Vert foncé (≥ 80%) : excellent
- Vert clair (60-79%) : bon
- Orange (40-59%) : à surveiller
- Rouge (< 40%) : problème de rétention

### Actions selon les cohortes

**Rétention M+1 < 70% :** L'onboarding est insuffisant. Revoir le wizard de démarrage et les emails de la première semaine.

**Rétention M+6 < 50% :** Les clients ne trouvent pas de valeur long terme. Investiguer avec des entretiens clients.

**Rétention M+12 < 40% :** Problème structurel de product-market fit sur ce segment. Déclencher une revue produit.

---

## 5. Health Score : calcul et actions

### Formule de calcul (0-100 points)

| Composante | Poids max | Calcul |
|------------|-----------|--------|
| Fréquence de connexion | 25 pts | `(logins_7j / nb_users) × 25`, max 25 |
| Adoption des fonctionnalités | 30 pts | `(modules_actifs / 12) × 30` |
| Volume de données | 15 pts | `(data_gb / 1.0) × 15`, max 15 |
| Récence dernière activité | 20 pts | `20 - (jours_inactif × 2)`, min 0 |
| Tickets support ouverts | -10 pts max | `-3 par ticket ouvert`, min -10 |

### Risque de churn

| Score | Risque | Action recommandée |
|-------|--------|-------------------|
| < 40 | **Élevé** | Contact proactif sous 24h |
| 40-60 | **Moyen** | Surveiller, envoyer ressources utiles |
| > 60 | **Faible** | Monitoring habituel |

### Actions par risque

**Risque élevé (score < 40) :**
1. Appeler le responsable compte (pas un email)
2. Identifier la raison prédite (inactivité / faible adoption / tickets non résolus)
3. Proposer une session de formation gratuite si adoption < 30%
4. Escalader au CTO si le client menace de partir

**Risque moyen (40-60) :**
1. Envoyer un email personnalisé avec les ressources du module sous-utilisé
2. Inviter à un webinaire mensuel
3. Planifier un suivi dans 2 semaines

---

## 6. Gestion des feature flags

### Principes

Les feature flags permettent de déployer des fonctionnalités progressivement **sans redéploiement**.

### Types de déploiement

**Activation globale** (`is_global = true`) : Toutes les organisations voient la fonctionnalité. Réserver aux corrections critiques ou aux fonctionnalités stables.

**Ciblage par plan :** Activer pour `enterprise` d'abord, puis `pro`, puis `starter`. Permet de valider avant un déploiement large.

**Ciblage par organisation :** Pour les tests avec des clients volontaires (beta testeurs).

**Rollout progressif (%)** : Déploiement par tranches. Le bucket est déterministe (basé sur le hash de l'org_id), donc la même organisation voit toujours la même chose.

### Procédure de déploiement progressif

```
1. Créer le flag : is_active=false, enabled_percent=0
2. Tester en interne : cibler les orgs IBIG (test accounts)
3. 5% → vérifier les métriques 48h
4. 25% → vérifier 48h
5. 50% → vérifier 48h
6. 100% ou is_global=true → déploiement complet
7. Après 2 semaines stable : supprimer le flag et nettoyer le code
```

### Nommage des slugs

Format : `[module]_[feature]` ou `[feature]_[version]`

Exemples : `ai_assistant`, `new_billing_ui`, `gantt_v2`, `mfa_enforced`

---

## 7. Procédure d'impersonification

### Qu'est-ce que l'impersonification ?

L'impersonification permet à un SuperAdmin IBIG de se connecter à la plateforme **en tant qu'administrateur d'une organisation cliente**, pour diagnostiquer un problème de support.

### Règles obligatoires

1. **Toujours avec le consentement du client** (sauf urgence de sécurité)
2. **Chaque impersonification est journalisée** dans `audit_logs` avec :
   - `user_id` du SuperAdmin
   - `organization_id` ciblée
   - Timestamp exact
   - IP de connexion
3. **Durée limitée** : La session impersonifiée expire automatiquement après 2 heures
4. **Jamais pour accéder aux données confidentielles** non liées au ticket support

### Comment procéder

1. Aller dans **Organisations** → trouver l'organisation
2. Cliquer sur **Détail** → bouton **"Se connecter en tant qu'Admin de [Org]"**
3. Confirmer la boîte de dialogue (qui mentionne l'audit log)
4. Une fois connecté : une **bannière orange** indique le mode impersonification
5. Cliquer **"Quitter l'impersonification"** pour revenir à la session SuperAdmin

### En cas d'abus

L'utilisation de l'impersonification à des fins autres que le support client (espionnage commercial, extraction de données concurrentes, etc.) est une faute grave pouvant entraîner des poursuites pénales.

---

## 8. Support client : workflow tickets

### Niveaux de priorité

| Priorité | Délai de première réponse | Exemples |
|----------|--------------------------|----------|
| **Urgent** | < 1 heure | App totalement inutilisable, perte de données |
| **Haute** | < 4 heures | Fonctionnalité critique en erreur, problème de facturation |
| **Normale** | < 24 heures | Bug mineur, question de configuration |
| **Faible** | < 72 heures | Demande de fonctionnalité, documentation |

### Workflow

```
OUVERT → EN COURS → ATTENTE CLIENT → RÉSOLU → FERMÉ
   ↑                      |
   └──────────────────────┘ (si réouverture)
```

**OUVERT** : Ticket reçu, non pris en charge  
**EN COURS** : Assigné, SuperAdmin travaille dessus  
**ATTENTE CLIENT** : On attend une réponse ou action du client  
**RÉSOLU** : Solution fournie, 5 jours pour contestation  
**FERMÉ** : Archivé (après 5 jours de résolu sans contestation)

### Métriques cibles

| Métrique | Définition | Objectif |
|----------|------------|----------|
| **MTTR** | Mean Time To Resolve | < 8h (urgent/haute) |
| **CSAT** | Note satisfaction 1-5 | ≥ 4.2 |
| **First Contact Resolution** | Résolus dès le premier contact | > 60% |

---

## 9. Annonces et communications

### Types d'annonces

| Type | Couleur bannière | Usage |
|------|-----------------|-------|
| **Info** | Bleu | Nouveautés générales, tips |
| **Avertissement** | Orange | CGU, changements importants |
| **Maintenance** | Rouge | Interruptions de service planifiées |
| **Nouveauté** | Vert | Lancement de fonctionnalités |

### Bonnes pratiques

- **Maintenance :** Annoncer minimum 72h à l'avance (sauf urgence sécurité)
- **Expiration :** Toujours définir une date d'expiration (sinon le bandeau s'affiche indéfiniment)
- **Ciblage :** Utiliser le ciblage par plan pour éviter de surcharger les petits clients avec des annonces Enterprise
- **Longueur :** Bannière = max 2 lignes. Renvoyer vers la documentation pour les détails

### Planification d'une maintenance

1. Créer l'annonce de type **Maintenance**
2. `scheduled_at` = début de la maintenance (apparaît dans le bandeau dès la publication)
3. `expires_at` = fin de la maintenance
4. Publier **72h avant**
5. Envoyer aussi un email via le module de communication (hors SECRETIS)

---

## 10. Monitoring de la plateforme

### Services critiques

| Service | Impact si arrêt |
|---------|----------------|
| `app` (Laravel) | Application totalement inutilisable |
| `nginx` | Application totalement inutilisable |
| `postgres` | Perte totale des données en cours |
| `redis` | Dégradation des performances, sessions perdues |
| `reverb` | Notifications temps réel désactivées |
| `queue` | Emails, exports, IA différés |
| `scheduler` | CRONs quotidiens non exécutés |
| `minio` | Impossible d'uploader/télécharger des fichiers |

### Procédure en cas d'incident

**Niveau 1 (service dégradé)** :
1. Vérifier les logs du service (`docker logs secretis_[service]`)
2. Tenter un redémarrage : `docker restart secretis_[service]`
3. Publier une annonce de type **Maintenance** sur la plateforme

**Niveau 2 (service arrêté, impact utilisateur)** :
1. Alerter immédiatement le CTO par appel téléphonique
2. Activer le plan de continuité (basculement sur le VPS de secours si disponible)
3. Envoyer un email aux clients affectés dans les 30 minutes

**Niveau 3 (perte de données)** :
1. Arrêter tous les services pour éviter l'aggravation
2. Restaurer depuis le dernier backup (voir `docs/backup-recovery.md`)
3. Notifier les clients dans les 2 heures (obligation RGPD si données personnelles affectées)

### Seuils d'alerte

| Métrique | Avertissement | Critique |
|----------|--------------|----------|
| CPU | > 70% sur 5 min | > 90% sur 5 min |
| RAM | > 80% | > 90% |
| Disque | > 75% | > 90% |
| Temps de réponse API | > 500ms (p95) | > 2s (p95) |

---

## 11. Gestionnaire des organisations

### Création manuelle (ventes directes)

Pour les clients signés sans passer par le formulaire d'inscription public :

1. Aller dans **Organisations** → **+ Nouvelle organisation**
2. Remplir les informations de base
3. Choisir le plan et la durée
4. Générer et envoyer les identifiants de connexion au client
5. Le client peut changer son mot de passe à la première connexion

### Changement de plan

1. Ouvrir le détail de l'organisation
2. Cliquer **"Changer de plan"**
3. Sélectionner le nouveau plan et la durée restante
4. Le changement est immédiat (pro-rata non calculé automatiquement — ajuster la facturation manuellement)

### Suspension d'une organisation

**Cas justifiants une suspension :**
- Non-paiement après période de grâce (14 jours)
- Violation des CGU
- Fraude avérée
- Demande explicite du client (résiliation)

**Procédure :**
1. Contacter le client 48h avant par email (sauf violation grave)
2. Ouvrir le détail → **"Suspendre"**
3. Renseigner le motif obligatoirement (journalisé)
4. Le client reçoit automatiquement un email de suspension

**Effets de la suspension :**
- Les utilisateurs ne peuvent plus se connecter (erreur 403)
- Les données sont conservées 90 jours
- Les intégrations tierces (webhooks) sont désactivées

---

## 12. CRON quotidien et alertes automatiques

### CRON `saas:compute-metrics`

**Exécution :** Tous les jours à 02h00 UTC

**Ce qu'il fait :**
1. Calcule et stocke le snapshot SaaS journalier (`saas_daily_metrics`)
2. Calcule le health score de chaque organisation active (`organization_health_scores`)
3. Détecte les nouvelles organisations passant en risque élevé
4. Vérifie si le MRR a baissé > 5% vs le mois précédent

**En cas d'échec du CRON :**
- Vérifier les logs : `docker logs secretis_scheduler`
- Relancer manuellement : `php artisan saas:compute-metrics`
- Pour simuler sans persister : `php artisan saas:compute-metrics --dry-run`

### Alertes MRR automatiques

Si le MRR moyen du mois en cours est inférieur de plus de **5%** au mois précédent, un email est envoyé à `SECRETIS_SUPERADMIN_ALERT_EMAILS` (configurable dans `.env`).

```env
SECRETIS_SUPERADMIN_ALERT_EMAILS=cto@ibigsoft.com,commercial@ibigsoft.com
```

### Alertes churn automatiques

Une alerte est loggée (et bientôt notifiée) pour chaque organisation passant en risque élevé pour la **première fois** (pas déjà en high risk le jour précédent).

---

*Document interne IBIG Soft — Version 1.0 — Juillet 2026*  
*Ne pas partager en dehors de l'équipe IBIG Soft.*
