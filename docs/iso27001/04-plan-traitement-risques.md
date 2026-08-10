# Plan de Traitement des Risques (PTR)
## IBIG SECRETIS ERP — ISO/IEC 27001:2022

**Document :** ISO-27001-04  
**Version :** 1.1  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Approuvé par :** Direction Générale  
**Classification :** CONFIDENTIEL  

---

## 1. Introduction

Le Plan de Traitement des Risques (PTR) définit les actions à mettre en œuvre pour traiter les risques identifiés dans l'analyse des risques (`02-analyse-risques.md`) dont le score dépasse le seuil d'acceptabilité fixé à **12** (sur une échelle de 1 à 25).

### 1.1 Stratégies de Traitement

| Stratégie | Description | Critère de sélection |
|---|---|---|
| **Réduire** | Implémenter des contrôles pour diminuer la probabilité ou l'impact | Risque réductible par des contrôles techniques ou organisationnels |
| **Transférer** | Déléguer le risque (assurance, sous-traitance) | Risque à impact financier fort, coût d'assurance < coût du contrôle |
| **Accepter** | Accepter le risque résiduel sans action supplémentaire | Risque résiduel acceptable, coût traitement disproportionné |
| **Éviter** | Éliminer l'activité qui génère le risque | Risque intrinsèque à une activité non essentielle |

### 1.2 Critères d'Acceptation des Risques Résiduels

- Score résiduel ≤ 8 : Accepté par le RSSI
- Score résiduel 9-12 : Accepté par la Direction avec justification documentée
- Score résiduel > 12 : Non accepté — traitement additionnel obligatoire

---

## 2. Plan d'Action par Risque (Risques > 12)

### 2.1 R02 — Injection SQL / Code (Score 20 → Résiduel cible : 4)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 20 (P=4, I=5) |
| **Risque résiduel cible** | 4 (P=1, I=4) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Audit de code complet — revue OWASP Top 10 sur tous les endpoints | Lead Dev | 30 jours | 3 000 € (interne) | 0 injection détectée en pentest |
| 2 | Intégrer SAST (SonarQube ou Semgrep) dans CI/CD | DevOps Lead | 14 jours | 0 € (open source) | SAST actif sur chaque PR |
| 3 | Formation OWASP Secure Coding pour toute l'équipe dev (8h) | RSSI | 45 jours | 2 000 € | 100% dev formés, quiz > 80% |
| 4 | Test de pénétration web externe (pentest OWASP) | RSSI | 60 jours | 8 000 — 15 000 € | Rapport pentest, 0 critique non corrigé |
| 5 | Vérification systématique : 100% requêtes DB via ORM | Lead Dev | 21 jours | 0 € | Audit code — 0 requête brute |
| 6 | WAF — affiner les règles anti-injection (SQLi, NoSQLi) | DevOps Lead | 21 jours | Inclus WAF | Score WAF OWASP ModSecurity actif |

---

### 2.2 R01 — Accès Non Autorisé aux Données Client (Score 16 → Résiduel cible : 6)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 16 (P=4, I=4) |
| **Risque résiduel cible** | 6 (P=2, I=3) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Revue complète des règles RBAC — appliquer least privilege | Lead Dev + RSSI | 30 jours | 1 500 € (interne) | Matrice RBAC auditée et approuvée |
| 2 | Déployer solution DLP (Data Loss Prevention) | DevOps Lead | 90 jours | 500 €/mois | Alertes DLP actives, 0 exfiltration non détectée |
| 3 | Audit trimestriel automatisé des droits d'accès | RSSI | 14 jours | 0 € | Rapport généré automatiquement par `SecurityComplianceService.php` |
| 4 | Chiffrement au niveau colonne pour données ultra-sensibles (clés, mots de passe, numéros compte bancaire) | Lead Dev | 60 jours | 2 000 € | 100% champs sensibles chiffrés |
| 5 | Segmentation réseau — isolation par tenant | DevOps Lead | 45 jours | 1 000 € | VPC rules validées, audit réseau |
| 6 | SIEM : alertes sur accès massifs ou anormaux | DevOps Lead | 60 jours | 300 €/mois | Alertes temps réel sur anomalies |

---

### 2.3 R09 — Vulnérabilité dans Dépendances Tierces (Score 16 → Résiduel cible : 6)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 16 (P=4, I=4) |
| **Risque résiduel cible** | 6 (P=2, I=3) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Générer SBOM complet (Syft + CycloneDX) pour backend et frontend | DevOps Lead | 7 jours | 0 € | SBOM généré et publié à chaque release |
| 2 | Intégrer Snyk ou Trivy dans CI/CD (scan SCA à chaque PR) | DevOps Lead | 14 jours | 0 — 500 €/mois | 100% des PRs scannées, blocage si critique |
| 3 | Politique de patch : CVE critique → correctif < 48h, haute < 7j | RSSI | 7 jours | 0 € | KPI mesuré mensuellement |
| 4 | Audit mensuel des dépendances (composer audit + npm audit) | Lead Dev | 7 jours | 0 € | Rapport mensuel zéro critique non traité |
| 5 | Mettre en place un registre privé de packages (miroir) | DevOps Lead | 30 jours | 200 €/mois | Aucun package installé depuis source non vérifiée |

---

### 2.4 R12 — Phishing et Ingénierie Sociale (Score 16 → Résiduel cible : 6)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 16 (P=4, I=4) |
| **Risque résiduel cible** | 6 (P=2, I=3) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Déployer DMARC (p=quarantine puis p=reject), DKIM, SPF | DevOps Lead | 14 jours | 0 € | DMARC p=reject actif, rapport hebdomadaire |
| 2 | Campagnes de simulation phishing trimestrielles | RSSI | 30 jours | 500 €/trimestre | Taux de clic < 5% au bout de 2 campagnes |
| 3 | Formation anti-phishing obligatoire (1h) pour tout le personnel | RSSI | 45 jours | 1 000 € | 100% formés, attestation signée |
| 4 | Procédure de vérification par téléphone pour virements > 5 000 € | DG + DAF | 14 jours | 0 € | Procédure documentée et communiquée |
| 5 | Filtrage email avancé (sandbox analysis des pièces jointes) | DevOps Lead | 30 jours | 300 €/mois | 0 malware livré par email depuis déploiement |

---

### 2.5 R03 — Compromission Compte Administrateur (Score 15 → Résiduel cible : 5)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 15 (P=3, I=5) |
| **Risque résiduel cible** | 5 (P=1, I=5) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | MFA FIDO2 (clé physique) obligatoire pour tous les comptes admin de production | DevOps Lead | 30 jours | 500 € (clés YubiKey) | 100% comptes admin avec MFA FIDO2 |
| 2 | Implémenter PAM (Privileged Access Management) — sessions éphémères 4h max | DevOps Lead | 90 jours | 1 000 — 3 000 €/an | 0 accès admin sans session PAM tracée |
| 3 | Bastion host SSH avec enregistrement des sessions | DevOps Lead | 30 jours | 0 € (open source) | 100% connexions SSH via bastion |
| 4 | Alerte immédiate sur connexion admin hors horaires (timezone) | DevOps Lead | 14 jours | 0 € | Alertes actives, 0 faux négatif testés |
| 5 | Rotation obligatoire des tokens d'accès admin tous les 90 jours | RSSI | 14 jours | 0 € | 0 token > 90 jours (automatisé) |

---

### 2.6 R04 — Attaque Ransomware (Score 15 → Résiduel cible : 5)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire + Transférer (assurance cyber) |
| **Risque actuel** | 15 (P=3, I=5) |
| **Risque résiduel cible** | 5 (P=1, I=5) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Vérifier que les sauvegardes sont **hors ligne** et immuables (immutable backup) | DevOps Lead | 14 jours | 200 €/mois (S3 Object Lock) | Test restauration depuis backup offline réussi |
| 2 | Test de restauration depuis backup offline : trimestriel | DevOps Lead | 30 jours | 0 € | Rapport de test avec RTO mesuré |
| 3 | Simulation d'incident ransomware (tabletop exercise) | RSSI | 60 jours | 0 € (interne) | Exercice documenté, runbook validé |
| 4 | Souscrire une assurance cyber (couverture ransomware, frais de notif) | DG | 90 jours | 5 000 — 15 000 €/an | Police d'assurance active |
| 5 | EDR (Endpoint Detection & Response) sur tous les postes | DevOps Lead | 30 jours | 15 €/poste/mois | 100% postes couverts, alertes automatiques |
| 6 | Segmentation réseau strict (micro-segmentation) | DevOps Lead | 60 jours | 1 500 € | Pas de propagation latérale possible testée |

---

### 2.7 R05 — Fuite ou Vol de Clés API (Score 12 → Résiduel cible : 4)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 12 (P=3, I=4) |
| **Risque résiduel cible** | 4 (P=1, I=4) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Déployer truffleHog ou git-secrets dans tous les pipelines CI/CD | DevOps Lead | 7 jours | 0 € | 0 secret commité depuis déploiement |
| 2 | Audit rétrospectif de l'historique Git (scanner tous les commits) | Lead Dev | 14 jours | 0 € | Aucun secret dans l'historique existant |
| 3 | Rotation forcée de toutes les clés API et secrets existants | DevOps Lead | 30 jours | 0 € | 100% clés renouvelées, rotation auto < 90j |
| 4 | Migration 100% des secrets vers HashiCorp Vault | DevOps Lead | 45 jours | 0 € (open source) | 0 secret en dur dans le code ou config files |

---

### 2.8 R13 — Misconfiguration Cloud (Score 12 → Résiduel cible : 6)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 12 (P=3, I=4) |
| **Risque résiduel cible** | 6 (P=2, I=3) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Déployer CSPM (Cloud Security Posture Management) — AWS Security Hub ou Prowler | DevOps Lead | 30 jours | 0 — 500 €/mois | Score conformité > 90%, alertes auto |
| 2 | Toute infrastructure via IaC (Terraform) — aucun changement manuel en production | DevOps Lead | 45 jours | 0 € | 0 drift détecté entre IaC et réalité |
| 3 | Alertes automatiques sur tout changement de groupe de sécurité | DevOps Lead | 14 jours | 0 € | Alertes Slack actives sur changements |
| 4 | Revue trimestrielle des configurations cloud | RSSI | Récurrent | 0 € | Rapport trimestriel |

---

### 2.9 R14 — Violation de Données RGPD (Score 12 → Résiduel cible : 6)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 12 (P=3, I=4) |
| **Risque résiduel cible** | 6 (P=2, I=3) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Formaliser et tester la procédure de notification 72h | DPO | 30 jours | 0 € | Procédure testée en simulation |
| 2 | Réaliser DPIA pour tous les traitements à risque élevé | DPO | 60 jours | 2 000 € (consultant) | DPIA pour 3 traitements critiques |
| 3 | Mettre à jour le registre des traitements | DPO | 30 jours | 0 € | Registre complet et à jour |
| 4 | Formation RGPD obligatoire pour tout le personnel | DPO | 45 jours | 1 000 € | 100% formés, quiz > 75% |

---

### 2.10 R15 — Défaillance des Sauvegardes (Score 12 → Résiduel cible : 4)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 12 (P=3, I=4) |
| **Risque résiduel cible** | 4 (P=1, I=4) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Automatiser les tests de restauration hebdomadaires | DevOps Lead | 14 jours | 0 € | Rapport test restauration chaque semaine |
| 2 | Alertes Slack immédiates sur tout échec de sauvegarde | DevOps Lead | 7 jours | 0 € | 0 échec non détecté dans les 15 minutes |
| 3 | Règle 3-2-1 : 3 copies, 2 médias différents, 1 hors site | DevOps Lead | 30 jours | 200 €/mois | Architecture validée, test cross-region |
| 4 | Dashboard backup (Grafana) : état temps réel | DevOps Lead | 21 jours | 0 € | Dashboard disponible, vu en revue mensuelle |

---

### 2.11 R16 — Compte Ex-Employé Actif (Score 12 → Résiduel cible : 4)

| Attribut | Valeur |
|---|---|
| **Stratégie** | Réduire |
| **Risque actuel** | 12 (P=4, I=3) |
| **Risque résiduel cible** | 4 (P=1, I=4) |

**Actions de traitement :**

| # | Action | Responsable | Délai | Coût estimé | Indicateur de succès |
|---|---|---|---|---|---|
| 1 | Automatiser offboarding IT : DRH → ticket IT → désactivation J+0 | RSSI + RH | 30 jours | 0 € | 0 compte actif > J+1 après départ |
| 2 | Audit mensuel comptes inactifs > 30 jours | RSSI | 14 jours | 0 € | 0 compte inactif > 30j non signalé |
| 3 | Révoquer tous les tokens API et accès lors de l'offboarding | DevOps Lead | 14 jours | 0 € | Checklist offboarding validée à 100% |
| 4 | SSO centralisé — désactivation unique propagée à tous les systèmes | DevOps Lead | 30 jours | Inclus SSO | Test désactivation SSO → tous systèmes |

---

## 3. Planning de Mise en Œuvre (Gantt ASCII)

```
PLAN DE TRAITEMENT DES RISQUES — GANTT 2026

Légende : [===] Réalisation  [---] Planifié  [***] Test/Validation

                          JAN  FEV  MAR  AVR  MAI  JUN  JUL  AOÛ  SEP  OCT  NOV  DEC
                          2026 2026 2026 2026 2026 2026 2026 2026 2026 2026 2026 2026

PHASE 1 — ACTIONS URGENTES (< 30 jours)
  R05 — truffleHog CI/CD    [===]
  R05 — Audit historique Git [===]
  R15 — Alertes backup       [===]
  R12 — DMARC/DKIM/SPF      [===]
  R16 — Offboarding auto     [===][===]
  R09 — SBOM (Syft)          [===]
  R03 — Alertes hors-horaire [===]

PHASE 2 — ACTIONS PRIORITAIRES (30-60 jours)
  R02 — Audit code OWASP     [===][===]
  R02 — SAST dans CI/CD      [===]
  R01 — Revue RBAC           [===][===]
  R09 — Snyk/Trivy CI/CD     [===]
  R12 — Formation phishing   [===][===]
  R03 — Bastion SSH          [===][===]
  R04 — Backup offline test  [===][===]
  R14 — Procédure RGPD 72h   [===][===]
  R15 — Tests restauration   [===][===][===][===][===][===][===][===][===][===][===][===]
  R13 — CSPM déploiement     [===][===]

PHASE 3 — ACTIONS STRUCTURANTES (60-90 jours)
  R02 — Pentest externe      [---][---][***]
  R04 — EDR déploiement      [---][---][===]
  R04 — Assurance cyber      [---][---][===]
  R03 — PAM sessions         [---][---][---][===]
  R01 — DLP déploiement      [---][---][---][===][===]
  R04 — Segmentation réseau  [---][---][---][===][===]
  R05 — Migration vers Vault [---][---][===][===]
  R14 — DPIA réalisation     [---][---][===][===]

PHASE 4 — AMÉLIORATION CONTINUE
  Simulations phishing                          [***]     [***]     [***]     [***]
  Pentest annuel                                               [---][---][***]
  Audit interne                                                [---][===][***]
  Revue de direction                    [***]                       [***]
  Certification ISO 27001                                                [***][***]

JALONS CLÉS :
  ▼ Fin Phase 1 (J+30)         : Fév 2026
  ▼ Fin Phase 2 (J+60)         : Mar 2026
  ▼ Fin Phase 3 (J+90)         : Avr 2026
  ▼ Audit interne               : Sep 2026
  ▼ Audit certification Étape 1 : Oct 2026
  ▼ Audit certification Étape 2 : Nov 2026
  ▼ Certification ISO 27001     : Déc 2026
```

---

## 4. Budget Prévisionnel du PTR

| Catégorie | Coût estimé | Priorité |
|---|---|---|
| Tests de pénétration externes (annuel) | 8 000 — 15 000 € | Haute |
| Assurance cyber | 5 000 — 15 000 €/an | Haute |
| Outils DLP | 300 — 500 €/mois | Haute |
| EDR (postes de travail) | 15 €/poste/mois | Haute |
| PAM (Privileged Access Management) | 1 000 — 3 000 €/an | Haute |
| Clés de sécurité FIDO2 (YubiKey) | 500 € (initial) | Haute |
| Backup hors site (S3 Object Lock) | 200 €/mois | Haute |
| Formation sécurité équipes | 3 000 — 5 000 €/an | Moyenne |
| CSPM (Security Hub ou Prowler) | 0 — 500 €/mois | Moyenne |
| Simulation phishing | 500 €/trimestre | Moyenne |
| Certification ISO 27001 (organisme) | 10 000 — 20 000 € | Haute |
| **TOTAL ESTIMÉ ANNÉE 1** | **35 000 — 70 000 €** | — |

---

## 5. Risques Acceptés (Score ≤ 12)

Les risques suivants sont acceptés en l'état, avec surveillance continue :

| Risque | Score | Justification de l'acceptation |
|---|---|---|
| R10 — Accès physique datacenter | 6 | Hébergeur certifié ISO 27001, risque résiduel très faible |
| R20 — Expiration certificats TLS | 6 | Renouvellement automatique Let's Encrypt en place |
| R07 — Vol données en transit | 10 | TLS 1.3 + HSTS, risque résiduel = 2, acceptable |
| R17 — XSS | 9 | CSP + échappement Blade, risque résiduel = 3 |
| R06 — Indisponibilité service | 9 | Architecture redondante, SLA 99.5% |
| R08 — DDoS | 9 | Protection hébergeur incluse, CDN actif |
| R11 — Bus factor | 8 | Documentation améliorée, processus revue croisée |
| R18 — Défaillance fournisseur | 8 | SLA contractuels, plan migration documenté |
| R19 — Initié malveillant | 10 | RBAC + DLP + audit logs, risque résiduel = 5 |

**Validation de l'acceptation :** Ces risques sont formellement acceptés par le RSSI et la Direction Générale. Ils seront réévalués lors de la prochaine analyse annuelle des risques.

---

## 6. Suivi et Gouvernance

### 6.1 Revue du PTR

| Fréquence | Événement | Participants |
|---|---|---|
| Mensuel | Revue avancement actions PTR | RSSI, Leads techniques |
| Trimestriel | Revue KPIs sécurité + PTR | RSSI, Direction |
| Annuel | Révision complète analyse des risques | RSSI, DG, DPO, CTO |
| Ad hoc | Après tout incident de sécurité majeur | RSSI, DG, équipe IRP |

### 6.2 Tableau de Bord PTR

Les indicateurs de suivi du PTR sont intégrés dans le tableau de bord SMSI mensuel (`07-indicateurs-mesures.md`). Le RSSI produit un rapport d'avancement mensuel soumis à la Direction.

---

*Plan de Traitement des Risques approuvé par la Direction Générale d'IBIG Soft*  
*Date : 2026-07-22*
