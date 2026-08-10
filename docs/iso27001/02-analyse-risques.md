# Analyse des Risques de Sécurité de l'Information
## IBIG SECRETIS ERP — ISO/IEC 27005

**Document :** ISO-27001-02  
**Version :** 1.2  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Classification :** CONFIDENTIEL — USAGE INTERNE STRICT  
**Prochaine révision :** janvier 2027  

---

## 1. Méthodologie d'Analyse des Risques

### 1.1 Référentiel

L'analyse des risques d'IBIG Soft est conduite conformément à la norme **ISO/IEC 27005:2022** (Gestion des risques liés à la sécurité de l'information), en cohérence avec les exigences de l'ISO/IEC 27001:2022.

### 1.2 Processus d'Analyse

```
┌─────────────────────────────────────────────────────────────┐
│              PROCESSUS D'ANALYSE DES RISQUES                │
│                                                             │
│  1. IDENTIFICATION DES ACTIFS                               │
│     └─▶ Inventaire + classification + valorisation          │
│                                                             │
│  2. IDENTIFICATION DES MENACES & VULNÉRABILITÉS             │
│     └─▶ Sources de menaces, vecteurs d'attaque              │
│                                                             │
│  3. ESTIMATION DU RISQUE                                    │
│     └─▶ Probabilité × Impact = Score de risque             │
│                                                             │
│  4. ÉVALUATION DU RISQUE                                    │
│     └─▶ Comparaison aux critères d'acceptation             │
│                                                             │
│  5. TRAITEMENT DU RISQUE                                    │
│     └─▶ Réduire / Accepter / Transférer / Éviter           │
│                                                             │
│  6. SUIVI & RÉÉVALUATION (annuel + après incident)         │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Matrice de Risque 5×5

**Échelle de Probabilité (P) :**

| Niveau | Score | Description | Fréquence estimée |
|---|---|---|---|
| Très faible | 1 | Incident extrêmement rare | < 1 fois en 10 ans |
| Faible | 2 | Incident rare | 1 fois en 5 ans |
| Moyenne | 3 | Incident possible | 1 fois par an |
| Élevée | 4 | Incident probable | Plusieurs fois par an |
| Très élevée | 5 | Incident quasi-certain | Mensuel ou plus |

**Échelle d'Impact (I) :**

| Niveau | Score | Impact Financier | Impact Opérationnel | Impact Réputationnel |
|---|---|---|---|---|
| Négligeable | 1 | < 1 000 € | Service non affecté | Aucun |
| Mineur | 2 | 1 000 — 10 000 € | Dégradation légère | Interne seulement |
| Modéré | 3 | 10 000 — 100 000 € | Interruption partielle | Quelques clients |
| Majeur | 4 | 100 000 — 1 M€ | Interruption significative | Presse régionale |
| Catastrophique | 5 | > 1 M€ | Interruption totale | Presse nationale / procès |

**Matrice de Risque :**

```
Impact →      1          2          3          4          5
           Négl.      Mineur     Modéré     Majeur    Catastrop.
         ┌──────────┬──────────┬──────────┬──────────┬──────────┐
P=5      │    5     │   10     │   15     │   20     │   25     │
Très     │  FAIBLE  │  MOYEN   │  ÉLEVÉ   │ CRITIQUE │ CRITIQUE │
élevé    ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=4      │    4     │    8     │   12     │   16     │   20     │
Élevé    │  FAIBLE  │  MOYEN   │  ÉLEVÉ   │ CRITIQUE │ CRITIQUE │
         ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=3      │    3     │    6     │    9     │   12     │   15     │
Moyen    │  FAIBLE  │  FAIBLE  │  MOYEN   │  ÉLEVÉ   │  ÉLEVÉ   │
         ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=2      │    2     │    4     │    6     │    8     │   10     │
Faible   │  FAIBLE  │  FAIBLE  │  FAIBLE  │  MOYEN   │  MOYEN   │
         ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=1      │    1     │    2     │    3     │    4     │    5     │
Très     │  FAIBLE  │  FAIBLE  │  FAIBLE  │  FAIBLE  │  MOYEN   │
faible   └──────────┴──────────┴──────────┴──────────┴──────────┘

Légende : FAIBLE (1-5) | MOYEN (6-11) | ÉLEVÉ (12-16) | CRITIQUE (17-25)
```

**Seuils d'acceptabilité :**
- Score ≤ 5 : Risque accepté sans traitement additionnel
- Score 6-11 : Surveillance avec mesures légères
- Score 12-16 : Traitement obligatoire (Plan de Traitement des Risques)
- Score ≥ 17 : Traitement prioritaire et urgent

---

## 2. Inventaire des Actifs

### 2.1 Actifs Informationnels

| Actif | Classification | Propriétaire | Valeur |
|---|---|---|---|
| Données comptables clients | TRÈS CONFIDENTIEL | CTO | Critique |
| Données RH et paie clients | TRÈS CONFIDENTIEL | CTO | Critique |
| Données personnelles (RGPD) | CONFIDENTIEL | DPO | Critique |
| Code source SECRETIS ERP | TRÈS CONFIDENTIEL | CTO | Critique |
| Clés API et secrets d'application | TRÈS CONFIDENTIEL | DevOps Lead | Critique |
| Clés de chiffrement (KMS) | TRÈS CONFIDENTIEL | DevOps Lead | Critique |
| Configurations infrastructure (IaC) | CONFIDENTIEL | DevOps Lead | Haute |
| Journaux d'audit | CONFIDENTIEL | RSSI | Haute |
| Données de monitoring | INTERNE | DevOps Lead | Moyenne |
| Documentation technique | INTERNE | CTO | Moyenne |
| Données commerciales (CRM) | CONFIDENTIEL | Commercial | Haute |
| Propriété intellectuelle (algos, modèles IA) | TRÈS CONFIDENTIEL | CTO | Critique |

### 2.2 Actifs Technologiques

| Actif | Description | Criticité |
|---|---|---|
| Serveurs d'application (cloud) | Hébergement SECRETIS ERP SaaS | Critique |
| Base de données PostgreSQL | Données multi-tenant clients | Critique |
| Cluster Redis | Cache et sessions | Haute |
| Serveurs de fichiers (S3/équivalent) | Documents clients, exports | Haute |
| Pipeline CI/CD (GitLab/GitHub) | Déploiement continu | Haute |
| Système de monitoring (Grafana/Prometheus) | Supervision 24/7 | Haute |
| VPN d'accès distant | Accès équipes en télétravail | Haute |
| Gestionnaire de secrets (Vault) | Stockage des clés et credentials | Critique |
| Pare-feu applicatif (WAF) | Protection contre attaques web | Critique |
| Load balancer | Distribution de charge | Haute |
| Réseau privé virtuel cloud (VPC) | Isolation réseau | Haute |

---

## 3. Registre des Risques — 20 Risques Identifiés

### RISQUE R01 — Accès Non Autorisé aux Données Client

**Description :** Un acteur malveillant (externe ou interne) accède aux données de production des clients sans autorisation, pouvant conduire à une exfiltration massive.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Base de données clients, données comptables et RH |
| **Source de menace** | Attaquant externe, employé malveillant, prestataire |
| **Vecteur** | Vol de credentials, élévation de privilèges, API non sécurisée |
| **Probabilité (P)** | 4 — Élevée |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **16 — CRITIQUE** |
| **Mesures existantes** | MFA obligatoire, RBAC, isolation multi-tenant, journalisation accès |
| **Risque résiduel** | 8 — MOYEN (P=2 × I=4) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Revoir les règles RBAC trimestriellement, déployer DLP |

---

### RISQUE R02 — Injection SQL / Injection de Code

**Description :** Un attaquant exploite une faille d'injection pour exécuter du code arbitraire dans la base de données ou le serveur, permettant l'exfiltration ou la destruction des données.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Base de données, application web, données clients |
| **Source de menace** | Attaquant externe (web application attack) |
| **Vecteur** | Formulaires non filtrés, endpoints API, paramètres URL |
| **Probabilité (P)** | 4 — Élevée |
| **Impact (I)** | 5 — Catastrophique |
| **Score brut (P×I)** | **20 — CRITIQUE** |
| **Mesures existantes** | ORM Eloquent (Laravel), requêtes paramétrées, WAF, tests OWASP |
| **Risque résiduel** | 6 — FAIBLE (P=2 × I=3) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Tests de pénétration trimestriels, formation OWASP équipe dev, scanner SAST |

---

### RISQUE R03 — Compromission d'un Compte Administrateur

**Description :** Le compte d'un administrateur système ou d'un super-utilisateur est compromis (phishing, credential stuffing, vol), donnant un accès total aux systèmes.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Ensemble de l'infrastructure, toutes les données clients |
| **Source de menace** | Attaquant ciblé, phishing, campagne de credential stuffing |
| **Vecteur** | Email de phishing, réutilisation de mot de passe, accès physique |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 5 — Catastrophique |
| **Score brut (P×I)** | **15 — ÉLEVÉ** |
| **Mesures existantes** | MFA TOTP/FIDO2, SSO, comptes dédiés aux opérations admin, audit logs |
| **Risque résiduel** | 5 — FAIBLE (P=1 × I=5) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Implémenter PAM (Privileged Access Management), sessions éphémères |

---

### RISQUE R04 — Attaque Ransomware

**Description :** Un ransomware chiffre les données de production ou les sauvegardes, rendant le service indisponible et pouvant contraindre à payer une rançon.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Serveurs d'application, bases de données, sauvegardes |
| **Source de menace** | Cybercriminel, groupe APT |
| **Vecteur** | Email malveillant, exploitation de vulnérabilité, accès RDP exposé |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 5 — Catastrophique |
| **Score brut (P×I)** | **15 — ÉLEVÉ** |
| **Mesures existantes** | Sauvegardes offline, segmentation réseau, EDR sur postes, filtrage email |
| **Risque résiduel** | 6 — FAIBLE (P=2 × I=3) |
| **Stratégie** | Réduire + Transférer (assurance cyber) |
| **Actions supplémentaires** | Tester restauration depuis backup offline trimestriellement, simulation d'incident |

---

### RISQUE R05 — Fuite ou Vol de Clés API et Secrets

**Description :** Des clés API, tokens d'accès, credentials de base de données ou clés de chiffrement sont exposés (commit Git, logs, variable d'environnement, erreur de configuration).

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Intégrations tierces, base de données, services cloud |
| **Source de menace** | Erreur interne, attaquant (scan GitHub), employé négligent |
| **Vecteur** | Commit de fichier .env, logs applicatifs, repository public accidentel |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **12 — ÉLEVÉ** |
| **Mesures existantes** | HashiCorp Vault, rotation automatique 90j, .gitignore, git-secrets hooks, jamais loggées |
| **Risque résiduel** | 4 — FAIBLE (P=1 × I=4) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Déployer truffleHog dans CI/CD, audit des secrets existants |

---

### RISQUE R06 — Indisponibilité du Service (Panne Infrastructure)

**Description :** Une défaillance technique (panne serveur, saturation, bug applicatif) rend SECRETIS ERP indisponible, affectant les opérations des clients.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Service SaaS, disponibilité clients |
| **Source de menace** | Défaillance technique, erreur opérationnelle, panne hébergeur |
| **Vecteur** | Panne matérielle, erreur de déploiement, saturation capacité |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 3 — Modéré |
| **Score brut (P×I)** | **9 — MOYEN** |
| **Mesures existantes** | Architecture multi-zone, load balancer, monitoring 24/7, PCA documenté |
| **Risque résiduel** | 4 — FAIBLE (P=2 × I=2) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Tests de charge réguliers, améliorer observabilité |

---

### RISQUE R07 — Vol de Données en Transit

**Description :** Des données sensibles sont interceptées lors de leur transmission entre le client et le serveur, ou entre composants internes (man-in-the-middle, écoute réseau).

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Données en transit (comptabilité, RH, authentification) |
| **Source de menace** | Attaquant réseau, opérateur malveillant, écoute Wi-Fi |
| **Vecteur** | SSL stripping, certificat frauduleux, réseau non chiffré |
| **Probabilité (P)** | 2 — Faible |
| **Impact (I)** | 5 — Catastrophique |
| **Score brut (P×I)** | **10 — MOYEN** |
| **Mesures existantes** | TLS 1.3 obligatoire, HSTS avec preloading, validation certificats, mTLS interne |
| **Risque résiduel** | 2 — FAIBLE (P=1 × I=2) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Certificate Transparency monitoring, renouvellement automatique (Let's Encrypt) |

---

### RISQUE R08 — Attaque par Déni de Service (DDoS)

**Description :** Une attaque DDoS sature la bande passante ou les ressources serveur, rendant le service inaccessible aux clients légitimes.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Disponibilité du service SaaS, réputation |
| **Source de menace** | Cybercriminel, concurrent malveillant, hacktiviste |
| **Vecteur** | Amplification UDP, SYN flood, application layer (HTTP flood) |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 3 — Modéré |
| **Score brut (P×I)** | **9 — MOYEN** |
| **Mesures existantes** | Protection DDoS hébergeur (incluse), CDN, rate limiting API, WAF |
| **Risque résiduel** | 3 — FAIBLE (P=1 × I=3) |
| **Stratégie** | Réduire + Transférer |
| **Actions supplémentaires** | Contrat protection DDoS avancée, runbook de réponse |

---

### RISQUE R09 — Vulnérabilité dans une Dépendance Tierce (Supply Chain)

**Description :** Une bibliothèque open source ou un composant tiers utilisé dans SECRETIS ERP contient une vulnérabilité critique (type Log4Shell, XZ Utils), pouvant être exploitée.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Application, données clients, infrastructure |
| **Source de menace** | Attaquant externe, compromission supply chain |
| **Vecteur** | Mise à jour malveillante, dépendance transitive, package typosquatting |
| **Probabilité (P)** | 4 — Élevée |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **16 — CRITIQUE** |
| **Mesures existantes** | Dependabot, SBOM (Software Bill of Materials), audit npm/composer, lock files |
| **Risque résiduel** | 8 — MOYEN (P=2 × I=4) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Analyse SCA dans CI/CD (Snyk/Trivy), politique de mise à jour forcée <48h pour critiques |

---

### RISQUE R10 — Accès Physique Non Autorisé au Datacenter

**Description :** Un individu non autorisé accède physiquement aux serveurs hébergeant SECRETIS ERP (serveurs cloud ou On-Premise chez un client).

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Serveurs physiques, supports de stockage |
| **Source de menace** | Intrus, employé ou prestataire malveillant, social engineering |
| **Vecteur** | Tailgating, fausse identité, corruption d'agent de sécurité |
| **Probabilité (P)** | 2 — Faible |
| **Impact (I)** | 3 — Modéré |
| **Score brut (P×I)** | **6 — FAIBLE** |
| **Mesures existantes** | Hébergement chez fournisseur certifié ISO 27001/SOC2, contrôles d'accès physiques stricts |
| **Risque résiduel** | 2 — FAIBLE (P=1 × I=2) |
| **Stratégie** | Accepter + Surveiller |
| **Actions supplémentaires** | Vérification annuelle des certifications hébergeur, audit des journaux d'accès physique |

---

### RISQUE R11 — Perte d'un Développeur ou Expert Clé (Bus Factor)

**Description :** Le départ soudain d'un développeur ou expert clé (démission, accident, maladie) sans transfert de connaissances crée une dépendance critique non gérable.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Code source, documentation, connaissances implicites |
| **Source de menace** | Départ volontaire ou involontaire, maladie, accident |
| **Vecteur** | Concentration des connaissances sur une seule personne |
| **Probabilité (P)** | 4 — Élevée |
| **Impact (I)** | 2 — Mineur |
| **Score brut (P×I)** | **8 — MOYEN** |
| **Mesures existantes** | Documentation du code, revues de code croisées, pair programming |
| **Risque résiduel** | 4 — FAIBLE (P=2 × I=2) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Bus factor analysis, runbooks complets, plan de succession, code ownership partagé |

---

### RISQUE R12 — Phishing et Ingénierie Sociale

**Description :** Un collaborateur est victime d'une attaque de phishing ciblée (spear phishing) ou d'ingénierie sociale, conduisant à la divulgation de credentials ou à l'installation de malware.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Credentials, postes de travail, accès VPN |
| **Source de menace** | Cybercriminel, groupe APT ciblant les PME africaines |
| **Vecteur** | Email frauduleux, faux site web, appel téléphonique |
| **Probabilité (P)** | 4 — Élevée |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **16 — CRITIQUE** |
| **Mesures existantes** | Filtrage email anti-phishing, MFA, sensibilisation trimestrielle, simulation phishing |
| **Risque résiduel** | 8 — MOYEN (P=2 × I=4) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Déployer DMARC/DKIM/SPF, simuler campagnes phishing trimestrielles |

---

### RISQUE R13 — Mauvaise Configuration d'Infrastructure (Misconfiguration Cloud)

**Description :** Un bucket S3, une règle de sécurité réseau ou une configuration cloud incorrecte expose des données sensibles sur Internet ou crée une faille d'accès.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Données clients, code source, secrets |
| **Source de menace** | Erreur opérationnelle, pression de déploiement |
| **Vecteur** | Bucket S3 public, groupe de sécurité trop permissif, variables d'env exposées |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **12 — ÉLEVÉ** |
| **Mesures existantes** | Infrastructure as Code (Terraform), revue des configurations, CSPM tool |
| **Risque résiduel** | 6 — FAIBLE (P=2 × I=3) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Déployer CSPM (Cloud Security Posture Management), alertes automatiques sur changements |

---

### RISQUE R14 — Violation de Données Personnelles (RGPD)

**Description :** Des données personnelles de clients ou de salariés sont exposées suite à un incident de sécurité, entraînant des obligations de notification et des sanctions réglementaires.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Données personnelles (noms, emails, données RH, données bancaires) |
| **Source de menace** | Incident de sécurité, erreur interne, accès non autorisé |
| **Vecteur** | Tout vecteur conduisant à une exposition de données personnelles |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **12 — ÉLEVÉ** |
| **Mesures existantes** | Pseudonymisation, chiffrement, contrôle d'accès, politique RGPD, DPO désigné |
| **Risque résiduel** | 6 — FAIBLE (P=2 × I=3) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Procédure de notification 72h, DPIA pour nouveaux traitements, formation DPO |

---

### RISQUE R15 — Défaillance des Sauvegardes

**Description :** Les sauvegardes automatiques échouent silencieusement pendant une période prolongée, rendant impossible la restauration en cas d'incident.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Données clients, historiques comptables |
| **Source de menace** | Défaillance technique, erreur de configuration |
| **Vecteur** | Bug dans le script de sauvegarde, saturation stockage, erreur de permission |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **12 — ÉLEVÉ** |
| **Mesures existantes** | Monitoring des jobs de sauvegarde, alertes sur échec, tests de restauration mensuels |
| **Risque résiduel** | 4 — FAIBLE (P=1 × I=4) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Test de restauration hebdomadaire automatisé, alertes Slack sur toute anomalie |

---

### RISQUE R16 — Accès Non Autorisé par un Ancien Employé ou Prestataire

**Description :** Un compte d'un employé ou prestataire ayant quitté l'organisation n'est pas désactivé dans les délais, permettant un accès illégitime aux systèmes.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Systèmes d'information, données clients, code source |
| **Source de menace** | Ancien employé mécontent, prestataire dont le contrat a expiré |
| **Vecteur** | Compte non désactivé, token d'accès API non révoqué |
| **Probabilité (P)** | 4 — Élevée |
| **Impact (I)** | 3 — Modéré |
| **Score brut (P×I)** | **12 — ÉLEVÉ** |
| **Mesures existantes** | Procédure offboarding RH, revue trimestrielle des comptes, SSO centralisé |
| **Risque résiduel** | 4 — FAIBLE (P=1 × I=4) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Automatiser la désactivation via RH → IT workflow (J+0 départ), audit mensuel comptes inactifs |

---

### RISQUE R17 — Attaque XSS (Cross-Site Scripting)

**Description :** Un attaquant injecte du code JavaScript malveillant dans l'application, permettant le vol de sessions utilisateurs ou la redirection vers des sites frauduleux.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Sessions utilisateurs, données affichées dans le navigateur |
| **Source de menace** | Attaquant externe |
| **Vecteur** | Champs de saisie non échappés, injection via URL, stockage XSS |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 3 — Modéré |
| **Score brut (P×I)** | **9 — MOYEN** |
| **Mesures existantes** | Content Security Policy (CSP), échappement Blade/Vue, OWASP ZAP dans CI |
| **Risque résiduel** | 3 — FAIBLE (P=1 × I=3) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Audit CSP, formation développeurs OWASP Top 10 |

---

### RISQUE R18 — Défaillance d'un Fournisseur Critique

**Description :** Un fournisseur critique (hébergeur cloud, passerelle de paiement, service d'authentification) connaît une panne prolongée ou cesse son activité.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Disponibilité du service, intégrations critiques |
| **Source de menace** | Défaillance opérationnelle du fournisseur |
| **Vecteur** | Panne datacenter, faillite fournisseur, incident de sécurité chez le fournisseur |
| **Probabilité (P)** | 2 — Faible |
| **Impact (I)** | 4 — Majeur |
| **Score brut (P×I)** | **8 — MOYEN** |
| **Mesures existantes** | SLA contractuels, hébergement multi-zone, évaluation fournisseurs annuelle |
| **Risque résiduel** | 4 — FAIBLE (P=1 × I=4) |
| **Stratégie** | Réduire + Transférer |
| **Actions supplémentaires** | Plan de migration alternatif hébergeur, fournisseurs de secours identifiés |

---

### RISQUE R19 — Exfiltration de Données par un Initié Malveillant

**Description :** Un employé ou prestataire ayant accès aux systèmes exfiltre délibérément des données clients ou le code source (vente à un concurrent, chantage, revanche).

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Données clients, code source, propriété intellectuelle |
| **Source de menace** | Employé malveillant, prestataire, recrutement par un concurrent |
| **Vecteur** | Téléchargement massif, email de données, clé USB, accès à des systèmes hors périmètre |
| **Probabilité (P)** | 2 — Faible |
| **Impact (I)** | 5 — Catastrophique |
| **Score brut (P×I)** | **10 — MOYEN** |
| **Mesures existantes** | RBAC strict, DLP (prévention fuite données), audit logs, restriction ports USB |
| **Risque résiduel** | 5 — FAIBLE (P=1 × I=5) |
| **Stratégie** | Réduire |
| **Actions supplémentaires** | Déployer UEBA (User Entity Behavior Analytics), alertes sur téléchargements massifs |

---

### RISQUE R20 — Expiration / Révocation de Certificats TLS

**Description :** Un ou plusieurs certificats TLS expirent sans renouvellement, causant des erreurs de navigation pour les clients et une interruption du service perçue.

| Attribut | Valeur |
|---|---|
| **Actifs menacés** | Disponibilité et confiance du service SaaS |
| **Source de menace** | Erreur opérationnelle, oubli de renouvellement |
| **Vecteur** | Expiration de certificat, révocation par autorité de certification |
| **Probabilité (P)** | 3 — Moyenne |
| **Impact (I)** | 2 — Mineur |
| **Score brut (P×I)** | **6 — FAIBLE** |
| **Mesures existantes** | Renouvellement automatique Let's Encrypt/ACME, alertes à J-30 et J-7 |
| **Risque résiduel** | 2 — FAIBLE (P=1 × I=2) |
| **Stratégie** | Accepter + Surveiller |
| **Actions supplémentaires** | Monitoring Certificate Transparency, inventaire des certificats |

---

## 4. Synthèse des Risques

### 4.1 Tableau de Synthèse

| # | Risque | P | I | Score | Niveau | Risque résiduel | Priorité |
|---|---|---|---|---|---|---|---|
| R02 | Injection SQL | 4 | 5 | **20** | CRITIQUE | 6 | 1 |
| R01 | Accès non autorisé données | 4 | 4 | **16** | CRITIQUE | 8 | 2 |
| R09 | Vulnérabilité dépendances | 4 | 4 | **16** | CRITIQUE | 8 | 3 |
| R12 | Phishing / Ingénierie sociale | 4 | 4 | **16** | CRITIQUE | 8 | 4 |
| R03 | Compromission compte admin | 3 | 5 | **15** | ÉLEVÉ | 5 | 5 |
| R04 | Ransomware | 3 | 5 | **15** | ÉLEVÉ | 6 | 6 |
| R05 | Fuite de clés API | 3 | 4 | **12** | ÉLEVÉ | 4 | 7 |
| R13 | Misconfiguration cloud | 3 | 4 | **12** | ÉLEVÉ | 6 | 8 |
| R14 | Violation données RGPD | 3 | 4 | **12** | ÉLEVÉ | 6 | 9 |
| R15 | Défaillance sauvegardes | 3 | 4 | **12** | ÉLEVÉ | 4 | 10 |
| R16 | Compte ex-employé actif | 4 | 3 | **12** | ÉLEVÉ | 4 | 11 |
| R07 | Vol données en transit | 2 | 5 | **10** | MOYEN | 2 | 12 |
| R19 | Initié malveillant | 2 | 5 | **10** | MOYEN | 5 | 13 |
| R06 | Indisponibilité service | 3 | 3 | **9** | MOYEN | 4 | 14 |
| R08 | DDoS | 3 | 3 | **9** | MOYEN | 3 | 15 |
| R17 | XSS | 3 | 3 | **9** | MOYEN | 3 | 16 |
| R11 | Bus factor | 4 | 2 | **8** | MOYEN | 4 | 17 |
| R18 | Défaillance fournisseur | 2 | 4 | **8** | MOYEN | 4 | 18 |
| R10 | Accès physique datacenter | 2 | 3 | **6** | FAIBLE | 2 | 19 |
| R20 | Expiration certificats TLS | 3 | 2 | **6** | FAIBLE | 2 | 20 |

### 4.2 Cartographie des Risques (Heatmap)

```
Impact →    1 Négl.   2 Mineur   3 Modéré   4 Majeur   5 Catastrop.
          ┌──────────┬──────────┬──────────┬──────────┬──────────┐
P=5       │          │          │          │          │          │
Très élevé│          │          │          │          │          │
          ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=4       │          │   R11    │   R16    │ R01 R09  │   R02    │
Élevé     │          │          │          │    R12   │          │
          ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=3       │          │   R20    │ R06 R08  │ R05 R13  │ R03 R04  │
Moyen     │          │          │   R17    │ R14 R15  │          │
          ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=2       │          │          │   R10    │   R18    │ R07 R19  │
Faible    │          │          │          │          │          │
          ├──────────┼──────────┼──────────┼──────────┼──────────┤
P=1       │          │          │          │          │          │
Très faible│         │          │          │          │          │
          └──────────┴──────────┴──────────┴──────────┴──────────┘

Légende : ░░ FAIBLE  ▒▒ MOYEN  ▓▓ ÉLEVÉ  ██ CRITIQUE
```

### 4.3 Risques Nécessitant un Traitement Prioritaire (Score > 12)

| Risque | Score | Action prioritaire | Délai |
|---|---|---|---|
| R02 — Injection SQL | 20 | Tests pénétration + SAST + formation OWASP | 30 jours |
| R01 — Accès données | 16 | Revoir RBAC + déployer DLP | 60 jours |
| R09 — Supply chain | 16 | Intégrer SCA dans CI/CD | 30 jours |
| R12 — Phishing | 16 | Campagnes simulation + DMARC | 30 jours |
| R03 — Compte admin | 15 | PAM + sessions éphémères | 90 jours |
| R04 — Ransomware | 15 | Test backup offline + assurance cyber | 60 jours |
| R05 — Clés API | 12 | truffleHog dans CI/CD | 14 jours |
| R13 — Misconfiguration | 12 | CSPM + alertes automatiques | 45 jours |
| R14 — RGPD | 12 | Procédure notification 72h | 30 jours |
| R15 — Sauvegardes | 12 | Tests restauration hebdo automatisés | 14 jours |
| R16 — Ex-employés | 12 | Automatiser offboarding IT | 45 jours |

Le Plan de Traitement des Risques détaillé est disponible dans le document `04-plan-traitement-risques.md`.

---

*Document établi par le RSSI d'IBIG Soft*  
*Validé en revue de direction le 2026-07-22*  
*Prochaine réévaluation complète : janvier 2027*
