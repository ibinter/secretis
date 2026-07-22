# Déclaration d'Applicabilité (Statement of Applicability — SoA)
## IBIG SECRETIS ERP — ISO/IEC 27001:2022 Annexe A

**Document :** ISO-27001-03  
**Version :** 1.0  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Approuvé par :** Direction Générale  
**Classification :** CONFIDENTIEL  

---

## Introduction

La présente Déclaration d'Applicabilité (SoA) liste l'ensemble des 93 contrôles de l'Annexe A de la norme ISO/IEC 27001:2022 et précise, pour chacun :
- S'il est **applicable** au périmètre du SMSI d'IBIG Soft
- S'il est **implémenté** (ou en cours)
- La **justification** de son inclusion ou exclusion
- La **référence** au document ou système d'implémentation

**Statuts d'implémentation :**
- ✅ Implémenté — contrôle en place et efficace
- 🔄 En cours — implémentation partielle ou en déploiement
- ❌ Non applicable — exclu avec justification

---

## A.5 — Contrôles Organisationnels (37 contrôles)

| Réf. | Contrôle | App. | Impl. | Justification | Référence Implémentation |
|---|---|---|---|---|---|
| A.5.1 | Politiques de sécurité de l'information | O | ✅ | Fondement du SMSI | `docs/iso27001/01-politique-securite.md` |
| A.5.2 | Rôles et responsabilités en matière de sécurité | O | ✅ | Responsabilités définies | Politique sécurité §4, fiches de poste |
| A.5.3 | Séparation des tâches | O | ✅ | Rôles dev/ops/admin séparés | RBAC, principe 4 yeux sur production |
| A.5.4 | Responsabilités du management | O | ✅ | Engagement DG formalisé | Politique sécurité §1, revues de direction |
| A.5.5 | Contact avec les autorités | O | ✅ | DPO notifie ARTCI/CNIL | Procédure incidents, contacts DPO |
| A.5.6 | Contact avec des groupes d'intérêt spéciaux | O | 🔄 | Adhésion à des CERTs africains planifiée | En cours — membership CERT-CI |
| A.5.7 | Threat intelligence | O | 🔄 | Veille CVE active, abonnement flux TI planifié | Dependabot, NVD, flux MISP prévu |
| A.5.8 | Sécurité de l'information dans la gestion de projet | O | ✅ | Security by design dans process dev | Template Jira avec checklist sécurité |
| A.5.9 | Inventaire des informations et autres actifs | O | ✅ | Registre des actifs maintenu | `docs/iso27001/02-analyse-risques.md` §2 |
| A.5.10 | Utilisation acceptable des informations et actifs | O | ✅ | Politique d'utilisation acceptable | Politique sécurité §6, contrats travail |
| A.5.11 | Restitution des actifs | O | ✅ | Procédure offboarding documentée | `docs/iso27001/05-procedures-operationnelles.md` |
| A.5.12 | Classification des informations | O | ✅ | 4 niveaux de classification définis | Politique sécurité §2.1, labels dans outils |
| A.5.13 | Étiquetage des informations | O | ✅ | Labellisation des documents sensibles | En-têtes documents, tags cloud storage |
| A.5.14 | Transfert d'informations | O | ✅ | Procédures de transfert sécurisé | TLS 1.3, chiffrement PGP si nécessaire |
| A.5.15 | Contrôle d'accès | O | ✅ | RBAC + MFA implémentés | `SecurityService.php`, SSO, LDAP |
| A.5.16 | Gestion des identités | O | ✅ | IAM centralisé via SSO | SSO OIDC/SAML, `OidcService.php` |
| A.5.17 | Informations d'authentification | O | ✅ | Politique mots de passe, MFA obligatoire | Auth module, `SecurityService.php` |
| A.5.18 | Droits d'accès | O | ✅ | Revues trimestrielles des droits | Process revue accès, RBAC granulaire |
| A.5.19 | Sécurité de l'information dans les relations avec les fournisseurs | O | ✅ | Clauses de sécurité dans contrats | NDA standard, questionnaire fournisseurs |
| A.5.20 | Traitement de la sécurité dans les accords avec les fournisseurs | O | ✅ | Clauses contractuelles spécifiques | Contrats types avec clauses SMSI |
| A.5.21 | Gestion de la sécurité de l'information dans la chaîne logistique TIC | O | 🔄 | SBOM partiel, processus en cours | Dependabot, SBOM via Syft — en déploiement |
| A.5.22 | Surveillance, révision et gestion des changements des services fournisseurs | O | ✅ | Suivi SLA hébergeur, revue annuelle | Reporting hébergeur, revue contrats |
| A.5.23 | Sécurité de l'information pour les services cloud | O | ✅ | Politique cloud, fournisseur ISO 27001 | Contrat hébergeur, politique cloud |
| A.5.24 | Planification et préparation de la gestion des incidents | O | ✅ | Procédure IRP documentée | `docs/incident-response.md`, IRP §5 |
| A.5.25 | Évaluation et prise de décision sur les événements de sécurité | O | ✅ | Triage des incidents, critères définis | `docs/iso27001/05-procedures-operationnelles.md` |
| A.5.26 | Réponse aux incidents de sécurité | O | ✅ | Équipe IRP, runbooks de réponse | `docs/incident-response.md` |
| A.5.27 | Apprentissage tiré des incidents | O | ✅ | Post-mortem obligatoire après tout incident | Template post-mortem, JIRA incidents |
| A.5.28 | Collecte de preuves | O | ✅ | Logs immuables, chaîne de custody | `AuditService.php`, logs CloudWatch |
| A.5.29 | Sécurité de l'information pendant une perturbation | O | ✅ | PCA inclut volet sécurité | `docs/iso27001/06-continuité-activité.md` |
| A.5.30 | Préparation aux TIC pour la continuité | O | ✅ | PRA documenté, tests semestriels | `docs/iso27001/06-continuité-activité.md` |
| A.5.31 | Exigences légales, statutaires, réglementaires et contractuelles | O | ✅ | Veille réglementaire, DPO actif | Registre des obligations légales, DPO |
| A.5.32 | Droits de propriété intellectuelle | O | ✅ | Licences logicielles gérées, code propriétaire | Registre licences, contrats développeurs |
| A.5.33 | Protection des enregistrements | O | ✅ | Rétention des logs 12 mois, archives légales | Politique de rétention, stockage S3 chiffré |
| A.5.34 | Confidentialité et protection des informations personnelles | O | ✅ | RGPD, DPO désigné, AIPD | `docs/rgpd-conformite.md`, `GdprService.php` |
| A.5.35 | Revue indépendante de la sécurité de l'information | O | ✅ | Audit interne annuel + pentest externe | `docs/iso27001/08-audit-interne.md` |
| A.5.36 | Conformité aux politiques et normes de sécurité | O | ✅ | Contrôles de conformité automatisés | `SecurityComplianceService.php` |
| A.5.37 | Procédures d'exploitation documentées | O | ✅ | Procédures opérationnelles complètes | `docs/iso27001/05-procedures-operationnelles.md` |

---

## A.6 — Contrôles liés aux Personnes (8 contrôles)

| Réf. | Contrôle | App. | Impl. | Justification | Référence Implémentation |
|---|---|---|---|---|---|
| A.6.1 | Présélection | O | ✅ | Vérification antécédents, références pour postes sensibles | Processus RH, checklist recrutement |
| A.6.2 | Conditions d'emploi | O | ✅ | Clauses de confidentialité et responsabilités dans contrats | Contrat travail type, NDA |
| A.6.3 | Sensibilisation, formation et éducation à la sécurité | O | ✅ | Programme de sensibilisation structuré | `docs/iso27001/09-formation-sensibilisation.md` |
| A.6.4 | Processus disciplinaire | O | ✅ | Sanctions définies dans politique sécurité | Politique sécurité §9, règlement intérieur |
| A.6.5 | Responsabilités à la suite de la rupture ou de la modification du contrat | O | ✅ | Procédure offboarding formalisée | `docs/iso27001/05-procedures-operationnelles.md` §1.3 |
| A.6.6 | Accords de confidentialité et de non-divulgation | O | ✅ | NDA signé avant tout accès aux systèmes | NDA template, suivi RH |
| A.6.7 | Travail à distance | O | ✅ | Politique télétravail avec exigences sécurité | Politique sécurité §6.3, VPN obligatoire |
| A.6.8 | Signalement des événements de sécurité | O | ✅ | Canaux de signalement définis, culture no-blame | Politique sécurité §7, canal Slack #security |

---

## A.7 — Contrôles Physiques (14 contrôles)

| Réf. | Contrôle | App. | Impl. | Justification | Référence Implémentation |
|---|---|---|---|---|---|
| A.7.1 | Périmètres de sécurité physique | Partiel | ✅ | Bureaux IBIG : contrôle d'accès par badge ; datacenter : délégué à hébergeur certifié ISO 27001 | Contrat hébergeur, badges bureau |
| A.7.2 | Contrôles des accès physiques | Partiel | ✅ | Bureaux : liste d'accès, visiteurs accompagnés ; datacenter : hébergeur | Registre visiteurs, politique accès bureau |
| A.7.3 | Sécurisation des bureaux, salles et équipements | O | ✅ | Politique bureau propre, armoires verrouillées, écrans orientés | Politique clean desk, guide télétravail |
| A.7.4 | Surveillance de la sécurité physique | Partiel | 🔄 | Bureaux : pas de CCTV (locaux partagés) ; datacenter : hébergeur | Contrat hébergeur (CCTV inclus) |
| A.7.5 | Protection contre les menaces physiques et environnementales | Partiel | ✅ | Datacenter : hébergeur certifié (climatisation, anti-incendie) ; bureaux : précautions basiques | Certifications hébergeur |
| A.7.6 | Travail dans les zones sécurisées | O | ✅ | Accès aux systèmes sensibles uniquement depuis postes autorisés | Politique VPN, contrôles réseau |
| A.7.7 | Bureau propre et écran propre | O | ✅ | Politique clean desk formalisée et communiquée | `docs/iso27001/09-formation-sensibilisation.md` §4.1 |
| A.7.8 | Emplacement et protection du matériel | O | ✅ | Matériel sensible en zone sécurisée, chiffrement disques | BitLocker/FileVault sur postes, rack verrouillé |
| A.7.9 | Sécurité des actifs hors des locaux | O | ✅ | Politique BYOD, chiffrement obligatoire des portables | MDM, chiffrement, tracking actifs |
| A.7.10 | Supports de stockage | O | ✅ | Procédure destruction sécurisée, inventaire supports | Procédure effacement NIST 800-88, inventaire |
| A.7.11 | Services utilitaires de support | Partiel | ✅ | Datacenter : UPS, groupe électrogène (hébergeur) ; bureaux : onduleurs basiques | Contrat hébergeur |
| A.7.12 | Sécurité du câblage | Partiel | ✅ | Datacenter : géré par hébergeur ; bureaux : câblage structuré | — |
| A.7.13 | Maintenance du matériel | O | ✅ | Contrats de maintenance, procédure réforme matériel | Inventaire matériel, contrats mainteneurs |
| A.7.14 | Mise au rebut ou réutilisation sécurisée du matériel | O | ✅ | Effacement sécurisé avant réutilisation ou mise au rebut | Procédure effacement, certificats destruction |

---

## A.8 — Contrôles Technologiques (34 contrôles)

| Réf. | Contrôle | App. | Impl. | Justification | Référence Implémentation |
|---|---|---|---|---|---|
| A.8.1 | Terminaux d'utilisateurs | O | ✅ | MDM, chiffrement, antivirus sur tous les postes | MDM (Jamf/Intune), EDR |
| A.8.2 | Droits d'accès privilégiés | O | ✅ | PAM, comptes admin dédiés, accès bastion | Bastion SSH, comptes admin séparés |
| A.8.3 | Restriction d'accès aux informations | O | ✅ | RBAC granulaire, données cloisonnées par tenant | RBAC dans SECRETIS, isolation PostgreSQL |
| A.8.4 | Accès au code source | O | ✅ | Accès Git restreint, protection branches main/prod | GitHub branch protection, revues obligatoires |
| A.8.5 | Authentification sécurisée | O | ✅ | MFA TOTP/FIDO2, SSO, politique mots de passe | Auth module, `OidcService.php`, MFA |
| A.8.6 | Dimensionnement | O | ✅ | Auto-scaling, monitoring capacité, alertes | AWS Auto Scaling, Grafana dashboards |
| A.8.7 | Protection contre les maliciels | O | ✅ | EDR sur postes, scan images Docker, filtrage email | CrowdStrike/Defender, Trivy, anti-spam |
| A.8.8 | Gestion des vulnérabilités techniques | O | ✅ | Dependabot, scan CVE, patch <48h critiques | Dependabot, Snyk, procédure patch |
| A.8.9 | Gestion de la configuration | O | ✅ | Infrastructure as Code (Terraform), config management | Terraform, Ansible, git configs |
| A.8.10 | Suppression des informations | O | ✅ | Politique de rétention, suppression sécurisée | Procédure RGPD effacement, NIST 800-88 |
| A.8.11 | Masquage des données | O | 🔄 | Pseudonymisation implémentée, masquage logs en cours | `GdprService.php`, masquage PII en cours |
| A.8.12 | Prévention des fuites de données (DLP) | O | 🔄 | DLP basique (restriction USB, email), outil DLP avancé planifié | Restrictions BYOD, DLP email en déploiement |
| A.8.13 | Sauvegarde des informations | O | ✅ | Sauvegardes horaires chiffrées, tests mensuels | Procédure backup, `docs/iso27001/06-continuité-activité.md` |
| A.8.14 | Redondance des équipements de traitement | O | ✅ | Architecture multi-zone, load balancer, réplication DB | AWS multi-AZ, RDS Multi-AZ |
| A.8.15 | Journalisation | O | ✅ | Logs centralisés, immuables, rétention 12 mois | ELK Stack, `AuditService.php`, CloudWatch |
| A.8.16 | Activités de surveillance | O | ✅ | Monitoring 24/7, alertes automatiques, SIEM | Grafana, Prometheus, alertes PagerDuty |
| A.8.17 | Synchronisation des horloges | O | ✅ | NTP synchronisé sur tous les serveurs | NTP via AWS Time Sync Service |
| A.8.18 | Utilisation de programmes utilitaires à privilèges | O | ✅ | Outils admin contrôlés, accès via bastion uniquement | Bastion host, audit des outils admin |
| A.8.19 | Installation de logiciels sur les systèmes en exploitation | O | ✅ | Déploiement via CI/CD uniquement, images Docker immutables | GitLab CI/CD, Docker immutable images |
| A.8.20 | Sécurité des réseaux | O | ✅ | VPC, NACL, security groups, segmentation réseau | VPC AWS, segmentation par environnement |
| A.8.21 | Sécurité des services réseau | O | ✅ | WAF, TLS obligatoire, filtrage entrée/sortie | AWS WAF, règles de filtrage |
| A.8.22 | Cloisonnement des réseaux | O | ✅ | Production, staging, dev séparés (VPC dédiés) | VPC séparés, pas de peering prod-dev |
| A.8.23 | Filtrage web | O | ✅ | Proxy avec filtrage de catégories sur réseau corporate | DNS filtering (Cloudflare Gateway) |
| A.8.24 | Utilisation de la cryptographie | O | ✅ | TLS 1.3, AES-256, clés gérées via KMS/Vault | `docs/iso27001/05-procedures-operationnelles.md`, Vault |
| A.8.25 | Cycle de vie du développement sécurisé | O | ✅ | SDLC sécurisé, OWASP, revues de code | Process dev, checklist OWASP, revues PR |
| A.8.26 | Exigences de sécurité des applications | O | ✅ | Exigences sécurité dans specs fonctionnelles | Templates Jira, critères d'acceptation sécurité |
| A.8.27 | Architecture et principes d'ingénierie sécurisée | O | ✅ | Principes Zero Trust, defense in depth | `docs/architecture.md`, principes définis |
| A.8.28 | Codage sécurisé | O | ✅ | Standards OWASP, SAST, revues de code | SonarQube, guide de codage sécurisé |
| A.8.29 | Tests de sécurité en développement et en acceptation | O | ✅ | SAST, DAST dans CI/CD, tests de pénétration annuels | Pipeline CI/CD, OWASP ZAP, pentest annuel |
| A.8.30 | Développement externalisé | O | ✅ | Clause sécurité dans contrats prestataires dev | Contrats type, NDA, code review obligatoire |
| A.8.31 | Séparation des environnements de développement, test et production | O | ✅ | Environnements strictement séparés, pas de données réelles en dev | Infrastructure séparée, données anonymisées en test |
| A.8.32 | Gestion des changements | O | ✅ | Processus de gestion des changements formalisé | `docs/iso27001/05-procedures-operationnelles.md` §2 |
| A.8.33 | Informations relatives aux tests | O | ✅ | Données de test anonymisées, jamais de données production | Politique données test, faker/seeders |
| A.8.34 | Protection des systèmes d'information en cours d'audit | O | ✅ | Audits planifiés, accès lecture seule pour auditeurs | Comptes auditeurs read-only, planification |

---

## Synthèse de la SoA

| Thème | Total | Applicables | ✅ Implémenté | 🔄 En cours | ❌ Non app. |
|---|---|---|---|---|---|
| A.5 — Organisationnels | 37 | 37 | 34 | 3 | 0 |
| A.6 — Personnes | 8 | 8 | 8 | 0 | 0 |
| A.7 — Physiques | 14 | 14 | 12 | 2 | 0 |
| A.8 — Technologiques | 34 | 34 | 29 | 5 | 0 |
| **TOTAL** | **93** | **93** | **83** | **10** | **0** |

**Taux d'implémentation :** 89 % (83/93 contrôles implémentés)  
**Objectif certification :** 100 % des contrôles applicables implémentés avant audit de certification (T3 2026)

### Contrôles en cours nécessitant une action prioritaire

| Contrôle | Action requise | Responsable | Délai |
|---|---|---|---|
| A.5.6 — Threat intelligence | Adhésion CERT-CI, abonnement flux MISP | RSSI | T2 2026 |
| A.5.7 — Threat intelligence avancée | Déploiement flux MISP, tableau de bord TI | RSSI | T3 2026 |
| A.5.21 — Supply chain TIC | Générer SBOM complet via Syft/CycloneDX | DevOps Lead | T2 2026 |
| A.7.4 — Surveillance physique | Évaluer CCTV pour bureaux propres | Direction | T3 2026 |
| A.8.11 — Masquage données | Finaliser masquage PII dans tous les logs | Dev Lead | T2 2026 |
| A.8.12 — DLP avancé | Déployer solution DLP (Nightfall ou équivalent) | DevOps Lead | T3 2026 |
| A.6.8 — Signalement (processus) | Former l'ensemble du personnel au canal de signalement | RSSI | T1 2026 |
| A.7.4 — Surveillance physique bureaux | CCTV ou justification d'exclusion documentée | Direction | T3 2026 |
| A.8.16 — SIEM | Formaliser corrélation d'événements, playbooks SIEM | RSSI | T3 2026 |
| A.8.12 — DLP | Déployer outil DLP centralisé | RSSI + DevOps | T3 2026 |

---

*Document approuvé par le RSSI et la Direction Générale*  
*Référence de certification visée : ISO/IEC 27001:2022*  
*Prochaine révision : après chaque audit ou au minimum annuellement*
