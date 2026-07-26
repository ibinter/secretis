# Procédures Opérationnelles de Sécurité
## IBIG SECRETIS ERP — ISO/IEC 27001:2022

**Document :** ISO-27001-05  
**Version :** 1.0  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Classification :** CONFIDENTIEL — USAGE INTERNE  

---

## 1. Gestion des Accès

### 1.1 Création d'un Compte Utilisateur

**Déclencheur :** Arrivée d'un nouvel employé, prestataire ou utilisateur client.

**Procédure :**

```
ÉTAPE 1 — DEMANDE D'ACCÈS (J-5 avant prise de poste)
  ├── Émetteur : Manager direct ou responsable projet
  ├── Canal : Ticket JIRA (projet SECURITY) — template "ACCES-CREATION"
  ├── Informations requises :
  │     • Nom complet, email professionnel
  │     • Rôle et périmètre fonctionnel
  │     • Date de début et fin (si prestataire)
  │     • Systèmes requis (liste exhaustive)
  │     • Justification métier
  └── Approbation : Manager N+1 + RSSI (si accès sensibles)

ÉTAPE 2 — VÉRIFICATION (J-3)
  ├── RH confirme le contrat signé et le NDA
  ├── RSSI vérifie la cohérence avec le principe de least privilege
  └── Approbation finale documentée dans JIRA

ÉTAPE 3 — PROVISIONNEMENT (J-1)
  ├── IT crée le compte dans SSO (source of truth)
  ├── Assignation des rôles RBAC appropriés
  ├── Configuration MFA obligatoire (TOTP ou FIDO2)
  ├── Activation des accès VPN si nécessaire
  └── Notification au manager et à l'utilisateur

ÉTAPE 4 — REMISE DES ACCÈS (Jour J)
  ├── Remise en main propre ou par canal chiffré sécurisé
  ├── Signature de l'accusé de réception des accès
  ├── Formation sécurité de base obligatoire (cf. doc 09)
  └── Activation du compte par l'utilisateur lui-même (reset mot de passe)
```

**Durée maximum de traitement :** 3 jours ouvrés  
**Référence ISO 27001 :** A.5.15, A.5.16, A.5.18, A.6.1, A.6.2

---

### 1.2 Modification des Droits d'Accès

**Déclencheur :** Changement de poste, de projet, de périmètre fonctionnel.

**Procédure :**
1. **Demande** du manager via ticket JIRA template "ACCES-MODIFICATION"
2. **Analyse** par le RSSI — application du principe de least privilege
3. **Validation** par le responsable du système concerné
4. **Application** par IT sous 24h ouvrées
5. **Révocation** des anciens droits (jamais d'accumulation)
6. **Documentation** dans le journal des accès

**Règle absolue :** Les droits sont **remplacés**, jamais accumulés. Tout changement de rôle implique la révocation des droits précédents.

---

### 1.3 Révocation d'un Compte (Offboarding)

**Déclencheur :** Fin de contrat, départ (démission, licenciement, fin de mission).

**SLA de révocation :** **Maximum 2 heures après notification RH** (en cas de licenciement : immédiat, simultané à l'annonce).

```
PROCÉDURE D'OFFBOARDING — CHECKLIST OBLIGATOIRE

□ RH envoie notification RSSI + IT (canal urgent si licenciement)
□ Désactivation compte SSO → propagation automatique à tous les systèmes
□ Révocation de tous les tokens API personnels
□ Révocation des accès VPN
□ Révocation des accès GitHub/GitLab (remove from org)
□ Révocation des accès cloud (AWS/GCP/Azure — supprimer IAM user)
□ Réinitialisation des mots de passe partagés si nécessaire
□ Récupération du matériel professionnel (laptop, téléphone, badge)
□ Effacement des données personnelles du matériel restitué
□ Transfert des fichiers et connaissances (procédure de passation)
□ Annulation des abonnements SaaS nominatifs
□ Documentation de la clôture dans JIRA (ticket fermé)
□ Archivage du profil utilisateur (3 ans minimum)
```

---

### 1.4 Revue Trimestrielle des Droits d'Accès

**Fréquence :** Trimestrielle (janvier, avril, juillet, octobre)  
**Responsable :** RSSI avec participation des managers

**Processus :**
1. Extraction automatique de la liste des accès par système (`SecurityComplianceService.php`)
2. Envoi aux managers pour validation des accès de leur équipe
3. Délai de réponse : 5 jours ouvrés
4. Révocation automatique des accès non validés
5. Rapport de la revue archivé (preuve pour audit ISO 27001)

---

## 2. Gestion des Changements

### 2.1 Processus de Revue de Code

**Règle :** Zéro déploiement sans revue de code approuvée.

**Procédure :**

```
WORKFLOW DE REVUE DE CODE

Développeur
    │
    ▼
[1] DÉVELOPPEMENT
    • Branche feature (git flow)
    • Tests unitaires obligatoires (couverture > 80%)
    • Auto-tests OWASP locaux
    │
    ▼
[2] PULL REQUEST
    • Template PR avec checklist sécurité obligatoire :
      □ Pas de credentials ou secrets dans le code
      □ Validation des entrées utilisateur
      □ Pas de SQL brut
      □ Tests de régression passants
      □ Documentation des impacts sécurité
    │
    ▼
[3] REVIEW AUTOMATIQUE (CI/CD)
    • Tests unitaires et intégration
    • SAST (SonarQube/Semgrep) — BLOQUANT si CRITIQUE
    • Scan secrets (truffleHog) — BLOQUANT si détection
    • Scan dépendances (Snyk/Trivy) — BLOQUANT si critique
    │
    ▼
[4] REVIEW HUMAINE (obligatoire)
    • Au moins 1 reviewer senior (code quality + fonctionnel)
    • Pour changements sécurité : revue RSSI ou Lead Dev sécurité
    • Délai maximum : 2 jours ouvrés
    │
    ▼
[5] MERGE → MAIN/STAGING
    • Merge uniquement si toutes les checks passent
    • Squash et message de commit standardisé
```

### 2.2 Procédure de Déploiement en Production

**Fenêtres de déploiement :**
- Production : mardi et jeudi de 14h00 à 16h00 (heure locale), hors période critique
- Urgences sécurité (CVE critique) : déploiement immédiat autorisé 24/7 avec approbation RSSI

```
PROCÉDURE DE DÉPLOIEMENT PRODUCTION

PRÉ-DÉPLOIEMENT (J-1)
  □ Change Request soumise dans JIRA (template CHANGE-PROD)
  □ Plan de rollback documenté
  □ Tests en environnement staging validés
  □ Communication clients si impact visible (email J-48h)
  □ Approbation : CTO + RSSI (pour changements d'infrastructure)

PENDANT LE DÉPLOIEMENT
  □ Snapshot / backup base de données avant migration
  □ Déploiement blue-green ou rolling update (zéro downtime)
  □ Monitoring renforcé pendant 2h après déploiement
  □ Équipe de permanence (dev + ops) disponible

POST-DÉPLOIEMENT (H+2)
  □ Validation des smoke tests automatiques
  □ Vérification des métriques clés (latence, taux d'erreur)
  □ Clôture du Change Request avec statut
  □ Notification dans #deployments (Slack)
```

### 2.3 Gestion des Correctifs de Sécurité (Patch Management)

| Criticité CVE | Score CVSS | Délai d'application | Approbation requise |
|---|---|---|---|
| Critique | 9.0 — 10.0 | **48 heures** | RSSI (urgence) |
| Haute | 7.0 — 8.9 | **7 jours** | RSSI + CTO |
| Moyenne | 4.0 — 6.9 | **30 jours** | Lead Dev |
| Faible | 0.1 — 3.9 | **90 jours** | Prochaine release |

**Processus pour patch critique (< 48h) :**
1. Alerte CVE reçue (Dependabot, NVD, CERT) → notification immédiate RSSI
2. Évaluation de l'exploitabilité dans notre contexte (< 2h)
3. Développement et test du correctif (ou mise en place de mitigation)
4. Déploiement en urgence avec procédure accélérée
5. Rapport d'incident préventif si client potentiellement affecté

---

## 3. Gestion des Sauvegardes

### 3.1 Politique de Sauvegarde

| Type de données | Fréquence | Rétention | Chiffrement | Stockage |
|---|---|---|---|---|
| Base de données PostgreSQL | Toutes les heures | 30 jours | AES-256 | S3 region principale + cross-region |
| Fichiers clients (documents) | Quotidienne | 90 jours | AES-256 | S3 + Glacier (> 30j) |
| Code source | Continue (Git) | Indéfinie | SSH/TLS | GitHub + miroir local |
| Logs d'audit | Continue | 12 mois | AES-256 | S3 avec Object Lock (WORM) |
| Configurations (IaC) | À chaque changement | 12 mois | Chiffré | Git + Vault |

**Règle 3-2-1 :**
- **3** copies des données
- **2** médias/systèmes différents
- **1** copie hors site (cross-region ou offline)

### 3.2 Test Mensuel de Restauration

**Fréquence :** 1er mercredi de chaque mois  
**Responsable :** DevOps Lead  
**Procédure :**

```
PROCÉDURE DE TEST RESTAURATION MENSUEL

1. SÉLECTION
   • Sélectionner un backup aléatoire des 7 derniers jours
   • Documenter : date du backup, taille, checksum

2. RESTAURATION EN ENVIRONNEMENT ISOLÉ
   • Restaurer sur environnement de test dédié (jamais en production)
   • Vérifier l'intégrité du fichier (hash SHA-256)
   • Décrypter et vérifier les données

3. VALIDATION FONCTIONNELLE
   • Lancer les smoke tests automatiques
   • Vérifier l'accès à 5 clients tests prédéfinis
   • Vérifier la cohérence des données comptables (soldes balancés)
   • Mesurer le temps de restauration (doit être < RTO défini)

4. DOCUMENTATION
   • Rapport de test (template fourni)
   • RTO mesuré vs RTO objectif
   • RPO mesuré vs RPO objectif
   • Anomalies constatées et actions correctives
   • Signature DevOps Lead + RSSI

5. ARCHIVAGE
   • Rapport archivé dans docs/tests-restauration/YYYY-MM.md
   • Indicateur mis à jour dans tableau de bord SMSI
```

**Critères de succès :**
- Restauration complète en moins de 4h (SaaS) / 2h (Enterprise)
- Données restaurées cohérentes avec timestamp attendu (RPO ≤ 1h)
- 0 corruption de données détectée

---

## 4. Gestion des Correctifs (CVE Workflow Détaillé)

```
CVE WORKFLOW — SECRETIS ERP

DÉTECTION
    ├── Dependabot (GitHub) — automatique
    ├── NVD RSS Feed — abonnement RSSI
    ├── CERT-CI / CERT-FR — alertes email
    └── Snyk / Trivy (CI/CD) — scan à chaque build

        │
        ▼
TRIAGE (< 4h pour CRITIQUE)
    ├── Analyste : RSSI ou Lead Dev Sécurité
    ├── Évaluer : la dépendance est-elle utilisée ?
    ├── Évaluer : le vecteur est-il exploitable dans notre contexte ?
    ├── Score CVSS environnemental calculé
    └── Décision : patch / mitigation / acceptation documentée

        │
        ▼
TRAITEMENT selon criticité
    ├── CRITIQUE (< 48h) → Fast track : PR directe, revue RSSI
    ├── HAUTE (< 7j) → Sprint suivant ou hotfix
    ├── MOYENNE (< 30j) → Backlog priorisé
    └── FAIBLE (< 90j) → Prochaine release planifiée

        │
        ▼
DÉPLOIEMENT
    ├── Test en staging
    ├── Déploiement production (procédure §2.2)
    └── Notification clients si impact (cf. §5)

        │
        ▼
CLÔTURE
    ├── CVE marquée comme résolue dans registre
    ├── Ticket JIRA clôturé avec proof of fix
    └── KPI mis à jour (délai de patch)
```

---

## 5. Gestion des Incidents de Sécurité

### 5.1 Niveaux de Sévérité des Incidents

| Niveau | Critères | Délai de réponse | Escalade |
|---|---|---|---|
| **P1 — Critique** | Données clients compromises, service indisponible > 1h, ransomware actif | **Immédiat (< 15 min)** | DG + RSSI + CTO + DPO |
| **P2 — Majeur** | Suspicion de compromission, incident en cours, dégradation majeure | **< 1 heure** | RSSI + CTO + Lead Ops |
| **P3 — Modéré** | Tentative d'intrusion bloquée, anomalie importante, incident contenu | **< 4 heures** | RSSI + Lead Ops |
| **P4 — Mineur** | Violation de politique, tentative de phishing, alerte outil sécurité | **< 24 heures** | RSSI |

### 5.2 Procédure de Réponse aux Incidents (IRP)

```
PHASE 1 — DÉTECTION & SIGNALEMENT (H0)
────────────────────────────────────────
  Source : Alerte monitoring, signalement collaborateur, client, outil SIEM
  Action : Signalement immédiat via security@ibigsoft.com ou #security-alerts
  SLA : < 1h après détection

PHASE 2 — TRIAGE & CONFINEMENT (H0 → H+1)
────────────────────────────────────────
  ├── RSSI évalue la sévérité (P1 à P4)
  ├── Activation de l'équipe IRP (selon niveau)
  ├── CONFINEMENT IMMÉDIAT :
  │     • Isoler les systèmes compromis (pas d'extinction sauf instructions)
  │     • Bloquer les accès suspects (IP, comptes)
  │     • Activer les règles de protection renforcées (WAF, firewall)
  │     • Préserver les preuves numériques (snapshots, logs)
  └── Communication interne : DG + équipes concernées

PHASE 3 — ANALYSE & INVESTIGATION (H+1 → H+24)
────────────────────────────────────────
  ├── Analyse forensique des logs et systèmes
  ├── Déterminer : vecteur d'attaque, périmètre affecté, données touchées
  ├── Timeline de l'incident
  ├── Evaluation : données personnelles compromises ? → DPO
  └── Documentation continue dans template d'incident

PHASE 4 — ÉRADICATION & CORRECTION (H+24 → H+72)
────────────────────────────────────────
  ├── Supprimer la menace (malware, backdoor, compte compromis)
  ├── Corriger la vulnérabilité exploitée
  ├── Renforcer les contrôles (patch, règles firewall, rotation secrets)
  ├── Vérification que la menace est totalement éliminée
  └── Tests de validation

PHASE 5 — RESTAURATION (H+72 → retour à la normale)
────────────────────────────────────────
  ├── Restauration des systèmes depuis backup sain si nécessaire
  ├── Validation de l'intégrité des données
  ├── Remise en production progressive
  ├── Monitoring renforcé (72h post-incident)
  └── Levée du mode de crise

PHASE 6 — RAPPORT & RETOUR D'EXPÉRIENCE (J+5 à J+15)
────────────────────────────────────────
  ├── Rapport d'incident complet (template)
  ├── Post-mortem sans blâme (blameless)
  ├── Actions correctives et préventives (JIRA)
  ├── Communication externe si nécessaire (clients, régulateurs)
  │     → RGPD : notification CNIL/ARTCI < 72h si données personnelles
  └── Mise à jour des procédures si lacune identifiée
```

### 5.3 Contacts d'Urgence IRP

| Rôle | Contact | Disponibilité |
|---|---|---|
| RSSI (astreinte) | security@ibigsoft.com + téléphone IRP | 24/7 |
| CTO | CTO direct + backup CTO | Heures ouvrées + astreinte P1/P2 |
| DPO | DPO direct | Heures ouvrées + astreinte violations données |
| Hébergeur cloud (support P1) | Numéro de support 24/7 du contrat | 24/7 |
| Assureur cyber | Numéro d'urgence police d'assurance | 24/7 (après souscription) |
| Avocat (cyber) | Cabinet juridique partenaire | Sur appel |

---

## 6. Gestion des Tiers et Fournisseurs

### 6.1 Évaluation des Fournisseurs

**Avant tout contrat :**

```
QUESTIONNAIRE D'ÉVALUATION FOURNISSEUR (extrait)

Sécurité de l'information
  □ Certification ISO 27001, SOC 2 ou équivalent ? → Requis pour accès données client
  □ Politique de traitement des données documentée ?
  □ Procédure de gestion des incidents et notification ?
  □ Chiffrement des données au repos et en transit ?
  □ Contrôle d'accès et authentification ?

Protection des données
  □ DPO désigné ?
  □ Registre des traitements maintenu ?
  □ Transferts hors UE encadrés (SCCs, BCR) ?

Continuité d'activité
  □ SLA de disponibilité documenté ?
  □ Plan de continuité testé ?
  □ Procédure de sortie de contrat ?
```

**Niveaux de risque fournisseur :**
| Niveau | Critère | Exigences |
|---|---|---|
| **Critique** | Accès aux données clients ou infrastructure | ISO 27001 requis + audit annuel + DPA |
| **Élevé** | Accès aux systèmes internes | SOC 2 ou questionnaire détaillé + NDA + DPA |
| **Moyen** | Accès aux bureaux ou outils internes | NDA + évaluation simplifiée |
| **Faible** | Aucun accès SI | NDA standard |

### 6.2 Clauses Contractuelles Obligatoires

Tout contrat avec un fournisseur ayant accès aux données ou systèmes doit inclure :

1. **NDA / Accord de confidentialité** — durée ≥ 5 ans après fin de contrat
2. **DPA (Data Processing Agreement)** — si traitement de données personnelles (RGPD Art. 28)
3. **Clause de sécurité** : exigences minimales de sécurité, droit d'audit
4. **Clause d'incident** : notification sous 24h de tout incident de sécurité
5. **Clause de sous-traitance** : approbation préalable requise pour toute sous-traitance
6. **Clause de restitution/destruction** : restitution des données à la fin du contrat
7. **Clause de droit d'audit** : IBIG Soft peut auditer ou faire auditer le fournisseur

### 6.3 Suivi des Fournisseurs

- **Revue annuelle** : renouvellement des évaluations, mise à jour des certifications
- **Incidents** : tout incident chez un fournisseur critique est traité comme un incident IBIG Soft
- **Offboarding fournisseur** : révocation des accès le jour de la fin de contrat

---

*Document approuvé par le RSSI et la Direction Générale*  
*Date : 2026-07-22*  
*Prochaine révision : juillet 2027 ou après tout incident majeur*
