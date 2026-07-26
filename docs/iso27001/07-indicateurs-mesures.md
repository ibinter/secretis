# Indicateurs et Mesures de Sécurité — KPIs SMSI
## IBIG SECRETIS ERP — ISO/IEC 27001:2022

**Document :** ISO-27001-07  
**Version :** 1.0  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Classification :** CONFIDENTIEL — INTERNE  

---

## 1. Introduction

La mesure des performances du SMSI est une exigence de la clause 9.1 de l'ISO/IEC 27001:2022. IBIG Soft définit **15 indicateurs clés de performance (KPIs)** couvrant les dimensions essentielles de la sécurité de l'information.

**Cadre de mesure :**
- Fréquence de collecte définie pour chaque indicateur
- Cibles quantifiées
- Outil de mesure identifié
- Seuils d'alerte et d'action définis

---

## 2. Catalogue des 15 KPIs de Sécurité

### KPI-01 — Délai de Correction des Vulnérabilités Critiques

| Attribut | Valeur |
|---|---|
| **Description** | Délai moyen entre la publication d'une CVE critique (CVSS ≥ 9) et son correction effective dans l'environnement de production |
| **Cible** | 100 % des CVE critiques corrigées en ≤ 48 heures |
| **Seuil d'alerte** | > 48h pour une CVE critique |
| **Seuil d'action** | > 72h pour une CVE critique → escalade DG |
| **Fréquence** | Mensuel (rapport) + temps réel (alertes) |
| **Outil de mesure** | Dependabot, Snyk, Jira (tracking tickets CVE) |
| **Formule** | Moyenne(Date_correction - Date_publication) pour CVE critiques du mois |
| **ISO 27001** | A.8.8 — Gestion des vulnérabilités techniques |

---

### KPI-02 — Délai de Détection des Incidents de Sécurité

| Attribut | Valeur |
|---|---|
| **Description** | Temps moyen entre le début d'un incident de sécurité et sa détection par les équipes IBIG Soft (MTTD — Mean Time To Detect) |
| **Cible** | MTTD ≤ 1 heure pour les incidents P1/P2 |
| **Seuil d'alerte** | MTTD > 1 heure |
| **Seuil d'action** | MTTD > 4 heures → revue du dispositif de monitoring |
| **Fréquence** | Par incident + rapport trimestriel |
| **Outil de mesure** | SIEM (Grafana/ELK), journaux d'incidents Jira |
| **Formule** | Moyenne(Date_détection - Date_début_incident) sur la période |
| **ISO 27001** | A.5.24, A.8.15, A.8.16 |

---

### KPI-03 — Couverture MFA (Multi-Factor Authentication)

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage de comptes utilisateurs actifs ayant le MFA activé, segmenté par type de compte |
| **Cible** | Admins : 100 % / Utilisateurs internes : 100 % / Clients : ≥ 70 % |
| **Seuil d'alerte** | Tout compte admin sans MFA → alerte immédiate |
| **Seuil d'action** | < 95 % utilisateurs internes → suspension des comptes non-conformes après 5 jours |
| **Fréquence** | Hebdomadaire |
| **Outil de mesure** | `SecurityComplianceService::runComplianceCheck()`, rapport SSO |
| **Formule** | (Comptes avec MFA actif / Total comptes actifs) × 100 |
| **ISO 27001** | A.8.5 — Authentification sécurisée |

---

### KPI-04 — Disponibilité du Service (SLA)

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage de temps pendant lequel SECRETIS ERP SaaS est accessible et opérationnel pour les clients |
| **Cible** | ≥ 99,5 % mensuel (≤ 3,6 heures d'arrêt par mois) |
| **Seuil d'alerte** | < 99,9 % sur 7 jours glissants |
| **Seuil d'action** | < 99,5 % mensuel → analyse cause racine + compensation SLA clients |
| **Fréquence** | Temps réel + rapport mensuel |
| **Outil de mesure** | Monitoring Grafana, page statut status.secretis.app, alertes PagerDuty |
| **Formule** | ((Minutes_mois - Minutes_indisponibilité) / Minutes_mois) × 100 |
| **ISO 27001** | A.5.29, A.5.30, A.8.14 |

---

### KPI-05 — Tests de Pénétration et Couverture Sécurité

| Attribut | Valeur |
|---|---|
| **Description** | Réalisation des tests de pénétration planifiés et taux de correction des vulnérabilités identifiées |
| **Cible** | 1 pentest externe annuel + 0 vulnérabilité critique non corrigée 30 jours après rapport |
| **Seuil d'alerte** | Vulnérabilité critique non corrigée > 30 jours |
| **Seuil d'action** | Pentest annuel non réalisé → bloquer validation ISO 27001 |
| **Fréquence** | Annuel (pentest) + suivi mensuel (correction des findings) |
| **Outil de mesure** | Rapport pentest externe, suivi Jira |
| **ISO 27001** | A.5.35, A.8.29 |

---

### KPI-06 — Score CVSS Moyen des Vulnérabilités en Production

| Attribut | Valeur |
|---|---|
| **Description** | Score CVSS moyen de l'ensemble des vulnérabilités connues non corrigées dans l'environnement de production |
| **Cible** | Score CVSS moyen ≤ 4,0 (seuil moyen) |
| **Seuil d'alerte** | Score moyen > 5,0 |
| **Seuil d'action** | Score moyen > 7,0 → plan de patch accéléré |
| **Fréquence** | Mensuel |
| **Outil de mesure** | Snyk, Trivy, rapport mensuel automatisé |
| **Formule** | Moyenne(CVSS) de toutes les CVE non corrigées en production |
| **ISO 27001** | A.8.8 |

---

### KPI-07 — Taux de Couverture des Sauvegardes et Tests de Restauration

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage des données critiques couvertes par une sauvegarde testée et validée dans le mois |
| **Cible** | 100 % des bases de données critiques sauvegardées et testées mensuellement |
| **Seuil d'alerte** | Un test de restauration échoue ou est manqué |
| **Seuil d'action** | 2 échecs consécutifs → escalade CTO + plan d'action 48h |
| **Fréquence** | Mensuel |
| **Outil de mesure** | Dashboard Grafana (monitoring jobs backup), rapports de test restauration |
| **ISO 27001** | A.8.13 — Sauvegarde |

---

### KPI-08 — Conformité MFA et Rotation des Clés (Comptes Inactifs)

| Attribut | Valeur |
|---|---|
| **Description** | Nombre de comptes inactifs (> 90 jours sans connexion) encore actifs dans les systèmes |
| **Cible** | 0 compte inactif > 90 jours sans justification documentée |
| **Seuil d'alerte** | Tout compte inactif > 30 jours signalé au propriétaire |
| **Seuil d'action** | Suspension automatique à 90 jours, révocation à 120 jours |
| **Fréquence** | Mensuel |
| **Outil de mesure** | `SecurityComplianceService::runComplianceCheck()`, rapports SSO |
| **ISO 27001** | A.5.16, A.5.18 |

---

### KPI-09 — Rotation des Clés Cryptographiques et Secrets

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage de clés API, tokens et secrets dont la date de dernière rotation est ≤ 90 jours |
| **Cible** | 100 % des secrets tournés tous les 90 jours maximum |
| **Seuil d'alerte** | Secret > 80 jours sans rotation |
| **Seuil d'action** | Secret > 90 jours → révocation automatique |
| **Fréquence** | Hebdomadaire |
| **Outil de mesure** | HashiCorp Vault (metadata), `SecurityComplianceService::runComplianceCheck()` |
| **ISO 27001** | A.8.24 — Cryptographie |

---

### KPI-10 — Validité des Certificats TLS

| Attribut | Valeur |
|---|---|
| **Description** | Nombre de certificats TLS dont la date d'expiration est dans plus de 30 jours |
| **Cible** | 100 % des certificats valides > 30 jours (0 certificat expirant dans moins de 30 jours sans renouvellement planifié) |
| **Seuil d'alerte** | Certificat expirant dans < 30 jours |
| **Seuil d'action** | Certificat expirant dans < 7 jours → renouvellement d'urgence |
| **Fréquence** | Quotidien (automatique) |
| **Outil de mesure** | `SecurityComplianceService::runComplianceCheck()`, monitoring SSL, Let's Encrypt |
| **ISO 27001** | A.8.24 |

---

### KPI-11 — Taux de Couverture de la Formation Sécurité

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage du personnel ayant complété la formation de sensibilisation à la sécurité obligatoire |
| **Cible** | 100 % du personnel formé dans les 30 jours suivant l'embauche + rappel annuel |
| **Seuil d'alerte** | < 95 % formés avant l'audit annuel |
| **Seuil d'action** | Employé non formé après 45 jours → restriction d'accès aux systèmes sensibles |
| **Fréquence** | Mensuel |
| **Outil de mesure** | LMS (Learning Management System), registre des formations RH |
| **ISO 27001** | A.6.3 |

---

### KPI-12 — Résultats des Simulations de Phishing

| Attribut | Valeur |
|---|---|
| **Description** | Taux de clic sur les emails de phishing simulés lors des campagnes trimestrielles |
| **Cible** | Taux de clic < 5 % après 4 campagnes consécutives |
| **Seuil d'alerte** | Taux de clic > 15 % |
| **Seuil d'action** | Taux de clic > 25 % → formation d'urgence + nouvelle simulation dans 30 jours |
| **Fréquence** | Trimestriel |
| **Outil de mesure** | Plateforme de simulation phishing (GoPhish ou service managé) |
| **ISO 27001** | A.6.3, A.5.24 |

---

### KPI-13 — Nombre d'Incidents de Sécurité par Mois

| Attribut | Valeur |
|---|---|
| **Description** | Nombre d'incidents de sécurité confirmés par niveau de sévérité, par mois |
| **Cible** | 0 incident P1, ≤ 2 incidents P2 par mois |
| **Seuil d'alerte** | 1 incident P1 ou > 3 incidents P2 dans le mois |
| **Seuil d'action** | 2 incidents P1 sur 3 mois consécutifs → révision de la posture de sécurité |
| **Fréquence** | Mensuel |
| **Outil de mesure** | Jira (projet SECURITY), rapport incidents RSSI |
| **ISO 27001** | A.5.24, A.5.26, A.5.27 |

---

### KPI-14 — Conformité du Pipeline CI/CD (Contrôles de Sécurité)

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage des déploiements en production ayant passé l'ensemble des contrôles de sécurité automatisés du pipeline CI/CD |
| **Cible** | 100 % des déploiements avec SAST + scan secrets + scan dépendances passants |
| **Seuil d'alerte** | Tout déploiement bypasse un contrôle de sécurité |
| **Seuil d'action** | Déploiement sans contrôles → rollback immédiat + investigation |
| **Fréquence** | Par déploiement + rapport mensuel |
| **Outil de mesure** | GitLab CI/CD logs, SonarQube reports |
| **ISO 27001** | A.8.25, A.8.28, A.8.29 |

---

### KPI-15 — Indice de Conformité SMSI Global

| Attribut | Valeur |
|---|---|
| **Description** | Pourcentage de contrôles ISO 27001 implémentés et efficaces, calculé automatiquement par `SecurityComplianceService` et lors des audits internes |
| **Cible** | ≥ 95 % avant audit de certification, 100 % des contrôles critiques |
| **Seuil d'alerte** | < 90 % global ou tout contrôle critique non conforme |
| **Seuil d'action** | Non-conformité majeure → plan d'action sous 30 jours |
| **Fréquence** | Mensuel (automatisé) + trimestriel (audit interne) |
| **Outil de mesure** | `SecurityComplianceService::generateComplianceReport()`, checklist audit |
| **ISO 27001** | Clause 9.1 — Surveillance, mesure, analyse et évaluation |

---

## 3. Tableau de Bord SMSI Mensuel

```
╔══════════════════════════════════════════════════════════════════════╗
║          TABLEAU DE BORD SMSI — IBIG SECRETIS ERP                   ║
║                      [MOIS / ANNÉE]                                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  VULNÉRABILITÉS                    ACCÈS & IDENTITÉ                 ║
║  ┌────────────────────────┐         ┌────────────────────────┐       ║
║  │ KPI-01 Délai patch CVE │         │ KPI-03 Couverture MFA  │       ║
║  │ Critique : [X] heures  │         │ Admins   : [X%] 🎯100% │       ║
║  │ Cible : ≤ 48h          │         │ Internes : [X%] 🎯100% │       ║
║  │ Statut : 🟢/🟡/🔴     │         │ Clients  : [X%] 🎯70%  │       ║
║  ├────────────────────────┤         ├────────────────────────┤       ║
║  │ KPI-06 Score CVSS moyen│         │ KPI-08 Comptes inactifs│       ║
║  │ Production : [X.X]     │         │ > 90 jours : [N]       │       ║
║  │ Cible : ≤ 4.0          │         │ Cible : 0              │       ║
║  └────────────────────────┘         └────────────────────────┘       ║
║                                                                      ║
║  DISPONIBILITÉ & CONTINUITÉ        CRYPTOGRAPHIE & CERTS            ║
║  ┌────────────────────────┐         ┌────────────────────────┐       ║
║  │ KPI-04 Disponibilité   │         │ KPI-09 Rotation clés   │       ║
║  │ SaaS : [X.XX%]         │         │ Conformes : [X%]       │       ║
║  │ Cible : ≥ 99.5%        │         │ Cible : 100%           │       ║
║  ├────────────────────────┤         ├────────────────────────┤       ║
║  │ KPI-07 Sauvegardes     │         │ KPI-10 Certs TLS       │       ║
║  │ Tests OK : [X/X]       │         │ Expirant < 30j : [N]   │       ║
║  │ Cible : 100%           │         │ Cible : 0              │       ║
║  └────────────────────────┘         └────────────────────────┘       ║
║                                                                      ║
║  INCIDENTS & MENACES               CONFORMITÉ & FORMATION           ║
║  ┌────────────────────────┐         ┌────────────────────────┐       ║
║  │ KPI-13 Incidents mois  │         │ KPI-11 Formation       │       ║
║  │ P1: [N] P2: [N]        │         │ Formés : [X%]          │       ║
║  │ P3: [N] P4: [N]        │         │ Cible : 100%           │       ║
║  ├────────────────────────┤         ├────────────────────────┤       ║
║  │ KPI-02 MTTD            │         │ KPI-15 Indice SMSI     │       ║
║  │ Détection : [X]h [X]min│         │ Conformité : [X%]      │       ║
║  │ Cible : ≤ 1h           │         │ Cible : ≥ 95%          │       ║
║  └────────────────────────┘         └────────────────────────┘       ║
║                                                                      ║
║  CI/CD & SÉCURITÉ DEV              PHISHING                         ║
║  ┌────────────────────────┐         ┌────────────────────────┐       ║
║  │ KPI-14 Pipeline CI/CD  │         │ KPI-12 Simulation      │       ║
║  │ Conformes : [X%]       │         │ Taux clic : [X%]       │       ║
║  │ Cible : 100%           │         │ Cible : < 5%           │       ║
║  └────────────────────────┘         └────────────────────────┘       ║
║                                                                      ║
║  LÉGENDE : 🟢 Conforme  🟡 Attention  🔴 Non conforme  🎯 Cible     ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 4. Processus de Collecte et Reporting

### 4.1 Collecte Automatisée

Le service `SecurityComplianceService.php` collecte automatiquement les indicateurs suivants :
- KPI-03 (Couverture MFA)
- KPI-08 (Comptes inactifs)
- KPI-09 (Rotation clés)
- KPI-10 (Certificats TLS)
- KPI-15 (Indice conformité SMSI)

La commande `php artisan secretis:compliance-check` génère un rapport complet.

### 4.2 Collecte Manuelle / Semi-automatique

| KPI | Responsable collecte | Source | Délai |
|---|---|---|---|
| KPI-01 | DevOps Lead | Dependabot + Jira | Mensuel |
| KPI-02 | RSSI | Jira SECURITY | Mensuel |
| KPI-04 | DevOps Lead | Grafana | Mensuel |
| KPI-05 | RSSI | Rapport pentest | Annuel |
| KPI-06 | DevOps Lead | Snyk rapport | Mensuel |
| KPI-07 | DevOps Lead | Rapports backup | Mensuel |
| KPI-11 | RH + RSSI | LMS | Mensuel |
| KPI-12 | RSSI | Plateforme phishing | Trimestriel |
| KPI-13 | RSSI | Jira SECURITY | Mensuel |
| KPI-14 | DevOps Lead | CI/CD logs | Mensuel |

### 4.3 Rapport Mensuel RSSI

Le RSSI produit un **rapport mensuel de 2 pages** incluant :
1. Tableau de bord KPIs (statuts vs cibles)
2. Incidents du mois (synthèse)
3. Actions du PTR réalisées / en retard
4. Points d'attention pour la direction
5. Décisions requises

Ce rapport est présenté en revue de direction trimestrielle.

---

*Document approuvé par le RSSI*  
*Prochaine révision : annuellement ou lors de tout changement significatif*
