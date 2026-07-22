# Checklist d'Audit ISO 27001:2022 — Prête à l'Emploi
## IBIG SECRETIS ERP — 150 Questions d'Audit

**Document :** ISO-27001-CHECKLIST  
**Version :** 1.0  
**Date :** 2026-07-22  
**Usage :** Audit interne et préparation à la certification  

**Statuts :** C = Conforme | NC-m = Non-Conformité Mineure | NC-M = Non-Conformité Majeure | NA = Non Applicable | NE = Non Évalué  
**Pondération :** ⭐⭐⭐ Critique | ⭐⭐ Importante | ⭐ Standard  

---

## SECTION 1 — GOUVERNANCE ET POLITIQUE (Clauses 4, 5, 6)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 1 | L'organisation a-t-elle documenté son contexte interne et externe ? | Document 00-introduction.md | ⭐⭐⭐ | | |
| 2 | Les parties prenantes et leurs attentes sont-elles identifiées ? | Tableau parties prenantes | ⭐⭐ | | |
| 3 | Le périmètre du SMSI est-il clairement défini avec justification des exclusions ? | Périmètre écrit + exclusions justifiées | ⭐⭐⭐ | | |
| 4 | La politique de sécurité est-elle approuvée par la direction générale ? | Signature DG sur document | ⭐⭐⭐ | | |
| 5 | La politique de sécurité est-elle communiquée à tout le personnel ? | Preuve de diffusion (email, intranet) | ⭐⭐⭐ | | |
| 6 | La politique a-t-elle été révisée dans les 12 derniers mois ? | Date de révision, historique versions | ⭐⭐⭐ | | |
| 7 | Les objectifs de sécurité sont-ils mesurables et alignés avec la politique ? | KPIs avec cibles documentées | ⭐⭐⭐ | | |
| 8 | Les rôles RSSI, DPO, CTO sont-ils formellement attribués ? | Fiches de poste, nomination formelle | ⭐⭐⭐ | | |
| 9 | La direction participe-t-elle aux revues de direction semestrielles ? | PV signés avec liste présences | ⭐⭐⭐ | | |
| 10 | Le RSSI dispose-t-il d'un budget dédié à la sécurité ? | Budget alloué, justificatifs dépenses | ⭐⭐ | | |
| 11 | L'organisation a-t-elle documenté les exigences légales et réglementaires applicables ? | Registre obligations légales | ⭐⭐⭐ | | |
| 12 | Les risques de sécurité sont-ils identifiés et évalués selon une méthodologie documentée ? | 02-analyse-risques.md avec méthodologie | ⭐⭐⭐ | | |
| 13 | La matrice de risque (critères de probabilité et d'impact) est-elle définie ? | Matrice documentée, échelles définies | ⭐⭐⭐ | | |
| 14 | Les critères d'acceptation des risques sont-ils définis et approuvés ? | Seuil documenté, approbation DG | ⭐⭐⭐ | | |
| 15 | Le Plan de Traitement des Risques est-il documenté et approuvé ? | 04-plan-traitement-risques.md | ⭐⭐⭐ | | |

---

## SECTION 2 — GESTION DES ACTIFS (A.5.9 — A.5.13)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 16 | Un inventaire exhaustif des actifs informationnels est-il maintenu ? | Registre des actifs à jour | ⭐⭐⭐ | | |
| 17 | Chaque actif a-t-il un propriétaire désigné ? | Colonne "Propriétaire" dans registre | ⭐⭐ | | |
| 18 | Les informations sont-elles classifiées selon un schéma formel ? | Politique classification + exemples | ⭐⭐⭐ | | |
| 19 | Les documents sensibles sont-ils correctement étiquetés ? | Exemples de documents avec étiquettes | ⭐⭐ | | |
| 20 | Une politique d'utilisation acceptable des actifs existe-t-elle ? | Document politique utilisation acceptable | ⭐⭐ | | |
| 21 | La procédure de restitution des actifs lors de l'offboarding est-elle documentée ? | Checklist offboarding avec actifs | ⭐⭐ | | |

---

## SECTION 3 — CONTRÔLE D'ACCÈS (A.5.15 — A.5.18, A.8.1 — A.8.5)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 22 | Une politique de contrôle d'accès est-elle documentée ? | Politique accès basée sur RBAC | ⭐⭐⭐ | | |
| 23 | L'accès est-il accordé selon le principe du moindre privilège ? | Exemple matrice RBAC, vérification sur système | ⭐⭐⭐ | | |
| 24 | Une procédure formelle de création de compte existe-t-elle ? | Procédure documentée + exemples tickets | ⭐⭐⭐ | | |
| 25 | L'approbation du manager est-elle requise pour tout accès ? | Exemple ticket avec approbation | ⭐⭐⭐ | | |
| 26 | Les droits d'accès sont-ils revus régulièrement (au moins annuellement) ? | Rapport revue accès daté | ⭐⭐⭐ | | |
| 27 | La procédure de révocation d'accès lors de l'offboarding est-elle respectée ? | 3 exemples de départs récents — comptes désactivés J+0 ou J+1 | ⭐⭐⭐ | | |
| 28 | L'authentification multifacteur est-elle obligatoire pour tous les comptes admin ? | KPI-03 rapport, vérification sur console SSO | ⭐⭐⭐ | | |
| 29 | L'authentification multifacteur est-elle obligatoire pour tous les utilisateurs internes ? | KPI-03 rapport | ⭐⭐⭐ | | |
| 30 | Un SSO centralisé est-il utilisé comme référentiel unique d'identité ? | Configuration SSO, liste des apps intégrées | ⭐⭐ | | |
| 31 | Les comptes à privilèges sont-ils distincts des comptes utilisateurs courants ? | Vérification annuaire — pas de compte admin = compte quotidien | ⭐⭐⭐ | | |
| 32 | Les sessions d'administration sont-elles tracées et auditées ? | Logs bastion SSH, journal admin | ⭐⭐⭐ | | |
| 33 | Les comptes inactifs depuis plus de 90 jours sont-ils désactivés ? | Rapport comptes inactifs — 0 compte actif > 90j | ⭐⭐⭐ | | |
| 34 | Les accès aux systèmes distants sont-ils sécurisés (VPN, bastion) ? | Configuration VPN, accès SSH via bastion uniquement | ⭐⭐⭐ | | |
| 35 | Les codes sources sont-ils accessibles uniquement aux développeurs autorisés ? | Configuration GitHub org, permissions repo | ⭐⭐⭐ | | |
| 36 | La politique de mots de passe respecte-t-elle les exigences (longueur, complexité) ? | Configuration SSO/Active Directory | ⭐⭐⭐ | | |

---

## SECTION 4 — SÉCURITÉ DU DÉVELOPPEMENT (A.8.25 — A.8.34)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 37 | Un cycle de vie de développement sécurisé (SDLC) est-il documenté ? | Procédure SDLC, guide développement sécurisé | ⭐⭐⭐ | | |
| 38 | Des exigences de sécurité sont-elles définies pour chaque nouvelle fonctionnalité ? | Exemples tickets Jira avec critères sécurité | ⭐⭐ | | |
| 39 | Les revues de code incluent-elles une vérification de la sécurité ? | Exemples de PR avec checklist sécurité complétée | ⭐⭐⭐ | | |
| 40 | Un outil SAST est-il intégré dans le pipeline CI/CD ? | Configuration CI/CD avec SonarQube/Semgrep | ⭐⭐⭐ | | |
| 41 | Un scan des secrets est-il automatisé dans le pipeline CI/CD ? | truffleHog ou git-secrets configuré | ⭐⭐⭐ | | |
| 42 | Un scan des dépendances (SCA) est-il intégré dans le pipeline CI/CD ? | Dependabot + Snyk/Trivy configurés | ⭐⭐⭐ | | |
| 43 | Les environnements de développement, test et production sont-ils strictement séparés ? | Architecture réseau, VPC séparés | ⭐⭐⭐ | | |
| 44 | Les données de production sont-elles anonymisées pour les environnements de test ? | Politique données test, exemples de données anonymisées | ⭐⭐⭐ | | |
| 45 | Les packages déployés en production sont-ils signés et vérifiés ? | Pipeline CI/CD, signatures Docker images | ⭐⭐ | | |
| 46 | La gestion des changements inclut-elle des procédures formelles d'approbation ? | Exemple Change Request approuvé | ⭐⭐⭐ | | |
| 47 | Un plan de rollback est-il documenté pour chaque déploiement majeur ? | Exemples plans rollback | ⭐⭐ | | |
| 48 | Des tests de pénétration sont-ils réalisés au moins annuellement ? | Rapport pentest daté < 12 mois | ⭐⭐⭐ | | |
| 49 | Les vulnérabilités critiques sont-elles corrigées dans les 48 heures ? | KPI-01 rapport + 3 exemples récents | ⭐⭐⭐ | | |
| 50 | Un SBOM (Software Bill of Materials) est-il maintenu ? | Fichier SBOM généré et versionné | ⭐⭐ | | |

---

## SECTION 5 — CRYPTOGRAPHIE ET PROTECTION DES DONNÉES (A.8.24, A.5.34)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 51 | Une politique de cryptographie est-elle documentée ? | Politique cryptographie (standards, algorithmes) | ⭐⭐⭐ | | |
| 52 | Toutes les données en transit sont-elles chiffrées (TLS 1.2 minimum, TLS 1.3 recommandé) ? | Scan SSL Labs, configuration nginx/apache | ⭐⭐⭐ | | |
| 53 | HSTS est-il activé pour tous les domaines ? | Vérification en-têtes HTTP | ⭐⭐⭐ | | |
| 54 | Les données au repos sont-elles chiffrées (AES-256 minimum) ? | Configuration RDS encryption, S3 encryption | ⭐⭐⭐ | | |
| 55 | Les clés cryptographiques sont-elles gérées dans un KMS ou Vault dédié ? | Configuration HashiCorp Vault ou AWS KMS | ⭐⭐⭐ | | |
| 56 | Les clés sont-elles renouvelées régulièrement (< 90 jours pour les secrets applicatifs) ? | KPI-09 rapport | ⭐⭐⭐ | | |
| 57 | Les certificats TLS sont-ils tous valides avec expiration > 30 jours ? | KPI-10 rapport | ⭐⭐⭐ | | |
| 58 | Les mots de passe sont-ils stockés avec un algorithme de hachage approprié (bcrypt, argon2) ? | Revue du code d'authentification | ⭐⭐⭐ | | |
| 59 | Les clés API et secrets ne sont-ils jamais loggués en clair ? | Revue des logs applicatifs, configuration masquage | ⭐⭐⭐ | | |

---

## SECTION 6 — SÉCURITÉ DES OPÉRATIONS (A.8.6 — A.8.23)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 60 | Les procédures d'exploitation sont-elles documentées et à jour ? | 05-procedures-operationnelles.md | ⭐⭐⭐ | | |
| 61 | Une politique de gestion des correctifs est-elle en place ? | Délais de patch définis et respectés | ⭐⭐⭐ | | |
| 62 | Les sauvegardes sont-elles réalisées selon la politique définie ? | Logs jobs backup, horaires, fréquences | ⭐⭐⭐ | | |
| 63 | Les sauvegardes sont-elles chiffrées ? | Configuration chiffrement backup | ⭐⭐⭐ | | |
| 64 | Les sauvegardes sont-elles stockées hors site ou cross-region ? | Configuration S3 cross-region | ⭐⭐⭐ | | |
| 65 | Les tests de restauration sont-ils réalisés mensuellement ? | Rapports tests restauration des 3 derniers mois | ⭐⭐⭐ | | |
| 66 | Des outils de surveillance et de monitoring 24/7 sont-ils en place ? | Dashboards Grafana, alertes PagerDuty | ⭐⭐⭐ | | |
| 67 | Les journaux (logs) sont-ils centralisés et protégés contre la modification ? | Configuration ELK/CloudWatch, WORM ou append-only | ⭐⭐⭐ | | |
| 68 | La rétention des journaux est-elle au minimum de 12 mois ? | Politique de rétention, configuration storage | ⭐⭐⭐ | | |
| 69 | La synchronisation des horloges (NTP) est-elle assurée sur tous les systèmes ? | Configuration NTP, vérification serveurs | ⭐⭐ | | |
| 70 | Les serveurs sont-ils protégés par un anti-malware ou EDR ? | Liste des agents installés | ⭐⭐⭐ | | |
| 71 | L'infrastructure est-elle déployée via IaC (Infrastructure as Code) ? | Dépôt Terraform/Ansible | ⭐⭐ | | |
| 72 | Des sauvegardes hors-ligne (offline/immutable) sont-elles disponibles ? | S3 Object Lock, backup offline | ⭐⭐⭐ | | |

---

## SECTION 7 — SÉCURITÉ DES RÉSEAUX (A.8.20 — A.8.23)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 73 | Les réseaux sont-ils segmentés (production, staging, dev, bureau) ? | Diagramme réseau, VPC configuration | ⭐⭐⭐ | | |
| 74 | Un pare-feu applicatif (WAF) est-il en place ? | Configuration WAF, règles actives | ⭐⭐⭐ | | |
| 75 | Les accès réseau depuis l'extérieur sont-ils limités au strict nécessaire ? | Security groups, règles firewall | ⭐⭐⭐ | | |
| 76 | Une protection DDoS est-elle en place ? | Service protection DDoS hébergeur/CDN | ⭐⭐ | | |
| 77 | Le filtrage DNS (filtrage web) est-il actif sur le réseau corporate ? | Configuration DNS Filtering | ⭐ | | |
| 78 | DMARC, DKIM et SPF sont-ils configurés pour tous les domaines email ? | Requêtes DNS : dig TXT _dmarc.ibigsoft.com | ⭐⭐⭐ | | |
| 79 | Les accès VPN sont-ils limités aux utilisateurs autorisés avec MFA ? | Configuration VPN + MFA | ⭐⭐⭐ | | |

---

## SECTION 8 — SÉCURITÉ PHYSIQUE (A.7.1 — A.7.14)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 80 | Les locaux sont-ils sécurisés par contrôle d'accès physique ? | Badge access, registre visiteurs | ⭐⭐ | | |
| 81 | Le datacenter hébergeur est-il certifié ISO 27001 ou équivalent ? | Certificat hébergeur en cours de validité | ⭐⭐⭐ | | |
| 82 | La politique bureau propre est-elle formalisée et appliquée ? | Document politique, résultats inspections | ⭐⭐ | | |
| 83 | Les supports de stockage sont-ils inventoriés et leur destruction documentée ? | Inventaire supports, certificats destruction | ⭐⭐ | | |
| 84 | Les équipements mobiles sont-ils chiffrés ? | Politique + vérification sur 3 postes | ⭐⭐⭐ | | |
| 85 | Une procédure de réforme sécurisée du matériel est-elle en place ? | Procédure effacement, exemples | ⭐⭐ | | |

---

## SECTION 9 — RESSOURCES HUMAINES (A.6.1 — A.6.8)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 86 | Des vérifications d'antécédents sont-elles réalisées pour les postes sensibles ? | Politique de présélection, exemples | ⭐⭐⭐ | | |
| 87 | Tous les contrats incluent-ils des clauses de confidentialité ? | Contrat type, exemples signés | ⭐⭐⭐ | | |
| 88 | Les NDA sont-ils signés avant tout accès aux systèmes ? | Exemples NDA signés | ⭐⭐⭐ | | |
| 89 | La formation de sécurité onboarding est-elle obligatoire et tracée ? | Registre formations, attestations | ⭐⭐⭐ | | |
| 90 | Le taux de complétion de la formation annuelle est-il ≥ 95 % ? | KPI-11 rapport | ⭐⭐⭐ | | |
| 91 | Des simulations de phishing sont-elles organisées trimestriellement ? | Rapports 4 dernières campagnes | ⭐⭐⭐ | | |
| 92 | Le processus disciplinaire est-il documenté ? | Règlement intérieur, politique sécurité §9 | ⭐⭐ | | |
| 93 | Une procédure d'offboarding IT est-elle en place et respectée ? | Checklist offboarding, 3 exemples récents | ⭐⭐⭐ | | |
| 94 | Les collaborateurs connaissent-ils les canaux de signalement des incidents ? | Test : demander à 5 employés — connaissent-ils le canal ? | ⭐⭐⭐ | | |
| 95 | Une politique de télétravail sécurisé est-elle documentée ? | Politique télétravail avec exigences VPN/MFA | ⭐⭐ | | |

---

## SECTION 10 — GESTION DES INCIDENTS (A.5.24 — A.5.28)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 96 | Une procédure de réponse aux incidents est-elle documentée ? | IRP documenté (05-procedures.md §5) | ⭐⭐⭐ | | |
| 97 | Les niveaux de sévérité des incidents sont-ils définis (P1 à P4) ? | Classification documentée | ⭐⭐⭐ | | |
| 98 | Les contacts d'urgence IRP sont-ils documentés et à jour ? | Liste contacts vérifiée (< 3 mois) | ⭐⭐⭐ | | |
| 99 | Le délai de signalement d'un incident est-il ≤ 1 heure ? | Vérification sur incidents récents | ⭐⭐⭐ | | |
| 100 | Un post-mortem est-il réalisé après chaque incident P1/P2 ? | Rapports post-mortem incidents | ⭐⭐⭐ | | |
| 101 | Les preuves numériques sont-elles correctement préservées lors des incidents ? | Procédure preservation preuves | ⭐⭐⭐ | | |
| 102 | La procédure de notification RGPD (72h) est-elle documentée et testée ? | Procédure + preuve de test | ⭐⭐⭐ | | |
| 103 | Un registre des incidents est-il maintenu ? | Jira SECURITY — liste incidents | ⭐⭐⭐ | | |
| 104 | KPI-13 : le nombre d'incidents P1 est-il ≤ 0 sur les 12 derniers mois ? | Rapport incidents | ⭐⭐⭐ | | |

---

## SECTION 11 — CONTINUITÉ D'ACTIVITÉ (A.5.29, A.5.30)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 105 | Un PCA/PRA documenté est-il en place ? | 06-continuité-activité.md | ⭐⭐⭐ | | |
| 106 | Les RTO et RPO sont-ils définis et formellement approuvés ? | RTO/RPO dans PCA, approbation DG | ⭐⭐⭐ | | |
| 107 | Des exercices de continuité sont-ils réalisés deux fois par an ? | Rapports des 2 derniers tests | ⭐⭐⭐ | | |
| 108 | Le RTO réel mesuré lors des tests est-il ≤ au RTO objectif ? | Rapport test avec mesures | ⭐⭐⭐ | | |
| 109 | Des procédures de failover sont-elles documentées et testées ? | Runbooks failover + preuve de test | ⭐⭐⭐ | | |
| 110 | Une page de statut public est-elle disponible et maintenue ? | status.secretis.app ou équivalent | ⭐⭐ | | |
| 111 | Les contacts de crise (hébergeur, assureur, avocat) sont-ils documentés ? | Section contacts PCA | ⭐⭐ | | |

---

## SECTION 12 — RELATIONS FOURNISSEURS (A.5.19 — A.5.23)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 112 | Une politique de gestion des fournisseurs est-elle documentée ? | Politique + processus évaluation | ⭐⭐⭐ | | |
| 113 | Les fournisseurs critiques sont-ils certifiés ISO 27001 ou ont-ils passé une évaluation de sécurité ? | Certificats fournisseurs ou rapports d'évaluation | ⭐⭐⭐ | | |
| 114 | Les contrats fournisseurs incluent-ils des clauses de sécurité (NDA, DPA, droit d'audit) ? | Exemple contrat avec clauses | ⭐⭐⭐ | | |
| 115 | Un DPA est-il en place avec tous les sous-traitants traitant des données personnelles ? | Liste sous-traitants + DPA signés | ⭐⭐⭐ | | |
| 116 | Une revue annuelle des fournisseurs critiques est-elle réalisée ? | Rapport revue fournisseurs | ⭐⭐ | | |
| 117 | La procédure d'offboarding fournisseur (révocation des accès) est-elle appliquée ? | 3 exemples de fins de contrat | ⭐⭐⭐ | | |

---

## SECTION 13 — CONFORMITÉ ET MESURES (Clauses 9, 10, A.5.31 — A.5.37)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 118 | La Déclaration d'Applicabilité (SoA) est-elle documentée et approuvée ? | 03-declaration-applicabilite.md signé | ⭐⭐⭐ | | |
| 119 | Les KPIs de sécurité sont-ils mesurés et reportés mensuellement ? | Rapports KPIs des 3 derniers mois | ⭐⭐⭐ | | |
| 120 | Les audits internes sont-ils planifiés et réalisés annuellement ? | Plan d'audit + rapports | ⭐⭐⭐ | | |
| 121 | Les non-conformités identifiées sont-elles traitées avec analyse des causes racines ? | Registre NC + actions correctives | ⭐⭐⭐ | | |
| 122 | Les actions correctives sont-elles vérifiées pour leur efficacité ? | PV de clôture NC avec preuve | ⭐⭐⭐ | | |
| 123 | La conformité RGPD est-elle documentée ? | docs/rgpd-conformite.md | ⭐⭐⭐ | | |
| 124 | Un registre des traitements de données est-il maintenu à jour ? | Registre des traitements | ⭐⭐⭐ | | |
| 125 | Les licences logicielles sont-elles toutes en règle ? | Inventaire licences | ⭐⭐ | | |
| 126 | La documentation du SMSI est-elle versionnée et maîtrisée ? | Versioning des documents, approbations | ⭐⭐⭐ | | |

---

## SECTION 14 — CONTRÔLES AUTOMATISÉS (`SecurityComplianceService`)

| # | Question d'audit | Preuve attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 127 | Le service `SecurityComplianceService` est-il déployé et fonctionnel ? | Code PHP + tests unitaires | ⭐⭐ | | |
| 128 | La commande `secretis:compliance-check` s'exécute-t-elle sans erreur ? | Résultat de la commande | ⭐⭐ | | |
| 129 | Le rapport de conformité automatique couvre-t-il le MFA ? | Output du rapport | ⭐⭐ | | |
| 130 | Le service détecte-t-il les certificats TLS proches de l'expiration ? | Test avec certificat de test < 30j | ⭐⭐ | | |
| 131 | Le service détecte-t-il les comptes inactifs > 90 jours ? | Test avec compte de test inactif | ⭐⭐ | | |
| 132 | Le service vérifie-t-il la rotation des clés (< 90 jours) ? | Output du rapport | ⭐⭐ | | |

---

## SECTION 15 — QUESTIONS D'ENTRETIEN (Collaborateurs)

*Ces questions sont posées à différents collaborateurs (développeurs, support, management) lors d'entretiens d'audit.*

| # | Question posée au collaborateur | Réponse attendue | Pond. | Statut | Observations |
|---|---|---|---|---|---|
| 133 | Comment signaleriez-vous un incident de sécurité ? | security@ibigsoft.com ou #security-alerts | ⭐⭐⭐ | | |
| 134 | Que faites-vous si vous recevez un email suspect ? | Le signaler au RSSI, ne pas cliquer | ⭐⭐⭐ | | |
| 135 | Où stockez-vous vos mots de passe professionnels ? | Dans le gestionnaire approuvé (Bitwarden) | ⭐⭐⭐ | | |
| 136 | Utilisez-vous le MFA pour vous connecter aux systèmes ? | Oui, à chaque connexion | ⭐⭐⭐ | | |
| 137 | Que faites-vous avant de quitter votre poste de travail ? | Verrouiller l'écran, ranger les documents | ⭐⭐ | | |
| 138 | Avez-vous complété la formation de sensibilisation sécurité ? | Oui (avec date) | ⭐⭐⭐ | | |
| 139 | Pouvez-vous installer n'importe quel logiciel sur votre ordinateur pro ? | Non, uniquement les logiciels approuvés | ⭐⭐ | | |
| 140 | Que faites-vous si vous travaillez dans un café avec un réseau Wi-Fi public ? | Activer le VPN | ⭐⭐⭐ | | |
| 141 | Qui est le RSSI de l'organisation ? | Connaît le nom et le contact | ⭐⭐ | | |
| 142 | Avez-vous connaissance de la politique de sécurité ? | Oui, accès et contenu connus | ⭐⭐⭐ | | |

---

## SECTION 16 — TESTS TECHNIQUES (Vérifications en Environnement)

| # | Test | Méthode de vérification | Pond. | Résultat | Observations |
|---|---|---|---|---|---|
| 143 | TLS 1.3 actif sur tous les endpoints | `nmap --script ssl-enum-ciphers` ou SSL Labs | ⭐⭐⭐ | | |
| 144 | HSTS activé avec preloading | `curl -I https://app.secretis.app` — vérifier Strict-Transport-Security | ⭐⭐⭐ | | |
| 145 | Content-Security-Policy correctement configurée | `curl -I` — vérifier en-tête CSP | ⭐⭐ | | |
| 146 | Pas de directory listing sur les URLs applicatives | Test navigateur sur /api/, /storage/ | ⭐⭐ | | |
| 147 | Les erreurs serveur ne divulguent pas de stack trace | Provoquer une erreur 500 — vérifier la réponse | ⭐⭐⭐ | | |
| 148 | DMARC configuré avec politique reject | `dig TXT _dmarc.ibigsoft.com` | ⭐⭐⭐ | | |
| 149 | Comptes admin inaccessibles depuis l'interface publique | Tenter login admin depuis IP externe | ⭐⭐⭐ | | |
| 150 | Rate limiting actif sur les endpoints d'authentification | Simuler 10 tentatives de connexion échouées | ⭐⭐⭐ | | |

---

## Synthèse de l'Audit

```
FICHE DE SYNTHÈSE AUDIT
═══════════════════════════════

Date : ___________  Auditeur : ___________

RÉSULTATS GLOBAUX :
  Total questions évaluées    : _____ / 150
  Conformes (C)              : _____  (_____%)
  NC Mineures (NC-m)         : _____
  NC Majeures (NC-M)         : _____
  Non Applicables (NA)       : _____
  Non Évalués (NE)           : _____

PAR CRITICITÉ :
  Questions ⭐⭐⭐ Critiques   : _____ / _____  (_____% conformes)
  Questions ⭐⭐ Importantes  : _____ / _____  (_____% conformes)
  Questions ⭐ Standards     : _____ / _____  (_____% conformes)

CONCLUSION :
  □ Prêt pour certification ISO 27001
  □ Non-conformités mineures à corriger avant audit de certification
  □ Non-conformités majeures — certification non recommandée

PRINCIPALES NC MAJEURES :
  1. _______________________
  2. _______________________
  3. _______________________

PROCHAINES ÉTAPES :
  Plan d'action à soumettre dans : _____ jours
  Date de réévaluation : ___________
```

---

*Document produit par le RSSI d'IBIG Soft*  
*Prochaine révision : annuellement ou après tout changement de la norme*
