# Programme d'Audit Interne ISO 27001
## IBIG SECRETIS ERP

**Document :** ISO-27001-08  
**Version :** 1.0  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Classification :** CONFIDENTIEL  

---

## 1. Objectifs du Programme d'Audit Interne

L'audit interne du SMSI est une exigence de la clause **9.2** de l'ISO/IEC 27001:2022. Il vise à :
- Vérifier que le SMSI est conforme aux exigences de la norme et aux politiques internes
- Identifier les non-conformités et opportunités d'amélioration
- Fournir une assurance à la direction sur l'efficacité du SMSI
- Préparer les audits de certification externes

---

## 2. Plan d'Audit Annuel 2026

### 2.1 Calendrier des Audits

| # | Domaine audité | Clauses ISO 27001 | Période | Durée | Auditeur |
|---|---|---|---|---|---|
| AU-01 | Politique et gouvernance du SMSI | 4, 5, 6 | Février 2026 | 2 jours | Auditeur interne ou externe |
| AU-02 | Gestion des risques | 6.1, 8.2, 8.3 | Mars 2026 | 1 jour | Auditeur interne |
| AU-03 | Contrôle d'accès et gestion des identités | A.5.15-18, A.8.1-5 | Avril 2026 | 2 jours | Auditeur interne |
| AU-04 | Sécurité du développement et opérations | A.8.19-34 | Mai 2026 | 2 jours | Auditeur interne + DSI |
| AU-05 | Gestion des incidents et continuité | A.5.24-30, A.5.29-30 | Juin 2026 | 1 jour | Auditeur interne |
| AU-06 | Ressources humaines et sensibilisation | A.6.1-8 | Juillet 2026 | 1 jour | Auditeur interne |
| AU-07 | Sécurité physique et environnementale | A.7.1-14 | Août 2026 | 1 jour | Auditeur interne |
| AU-08 | Relations fournisseurs | A.5.19-23 | Septembre 2026 | 1 jour | Auditeur interne |
| AU-09 | Conformité et mesures | 9.1, 9.2, 10 | Octobre 2026 | 1 jour | RSSI |
| AU-10 | **Audit complet pré-certification** | Toutes clauses | Novembre 2026 | 3 jours | Auditeur externe |

### 2.2 Critères de Qualification de l'Auditeur

- **Auditeur interne :** Connaissance ISO 27001, indépendant du domaine audité, formation audit (ISO 19011)
- **Auditeur externe :** Certifié ISO 27001 Lead Auditor (PECB, BSI ou équivalent)
- **Principe d'indépendance :** L'auditeur ne peut pas auditer son propre travail

---

## 3. Check-list d'Audit par Clause ISO 27001

### Clause 4 — Contexte de l'Organisation

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 4.1 | Le contexte interne et externe est-il documenté et maintenu à jour ? | Document contexte SMSI (00-introduction.md) | □ C □ NC □ NA |
| 4.2 | Les parties prenantes et leurs exigences sont-elles identifiées ? | Tableau parties prenantes, registre exigences | □ C □ NC □ NA |
| 4.3 | Le périmètre du SMSI est-il clairement défini et documenté ? | Document périmètre avec inclusions/exclusions justifiées | □ C □ NC □ NA |

### Clause 5 — Leadership

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 5.1 | La direction démontre-t-elle son leadership et son engagement envers le SMSI ? | PV revues direction, allocations budgétaires, déclaration d'engagement | □ C □ NC □ NA |
| 5.2 | La politique de sécurité est-elle approuvée, communiquée et revue annuellement ? | Politique signée avec date, preuve de communication | □ C □ NC □ NA |
| 5.3 | Les rôles et responsabilités sont-ils clairement définis et attribués ? | Fiches de poste, organigramme SMSI | □ C □ NC □ NA |

### Clause 6 — Planification

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 6.1.1 | Les risques et opportunités sont-ils identifiés et traités ? | Registre des risques documenté | □ C □ NC □ NA |
| 6.1.2 | Une analyse des risques formelle est-elle réalisée (méthodologie documentée) ? | 02-analyse-risques.md, critères d'acceptation | □ C □ NC □ NA |
| 6.1.3 | Le Plan de Traitement des Risques est-il documenté et approuvé ? | 04-plan-traitement-risques.md signé DG | □ C □ NC □ NA |
| 6.2 | Des objectifs de sécurité mesurables sont-ils définis ? | KPIs avec cibles (07-indicateurs-mesures.md) | □ C □ NC □ NA |

### Clause 7 — Support

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 7.1 | Les ressources nécessaires au SMSI sont-elles allouées ? | Budget SMSI, postes pourvus | □ C □ NC □ NA |
| 7.2 | Les compétences du personnel en charge du SMSI sont-elles vérifiées ? | CV RSSI, certifications, formations | □ C □ NC □ NA |
| 7.3 | Le personnel est-il sensibilisé à la politique de sécurité ? | Attestations formation, taux de formation KPI-11 | □ C □ NC □ NA |
| 7.4 | Les communications internes et externes liées au SMSI sont-elles maîtrisées ? | Canaux de communication définis, exemples | □ C □ NC □ NA |
| 7.5 | La documentation du SMSI est-elle gérée et contrôlée ? | Maîtrise des documents, versioning, approbations | □ C □ NC □ NA |

### Clause 8 — Fonctionnement

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 8.1 | Les processus de sécurité sont-ils planifiés et maîtrisés ? | Procédures opérationnelles (05-procedures.md) | □ C □ NC □ NA |
| 8.2 | L'appréciation des risques est-elle réalisée régulièrement ? | Date dernière analyse + résultats | □ C □ NC □ NA |
| 8.3 | Le Plan de Traitement des Risques est-il mis en œuvre ? | Tickets Jira PTR, preuves de mise en œuvre | □ C □ NC □ NA |

### Clause 9 — Évaluation des Performances

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 9.1 | La surveillance et la mesure du SMSI sont-elles réalisées ? | Rapports KPIs mensuels | □ C □ NC □ NA |
| 9.2 | Des audits internes sont-ils planifiés et réalisés ? | Plan d'audit, rapports d'audit précédents | □ C □ NC □ NA |
| 9.3 | Des revues de direction sont-elles tenues aux fréquences requises ? | PV de revue de direction | □ C □ NC □ NA |

### Clause 10 — Amélioration

| # | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| 10.1 | Les non-conformités sont-elles corrigées et leurs causes traitées ? | Registre NC, actions correctives closes | □ C □ NC □ NA |
| 10.2 | L'amélioration continue est-elle démontrée ? | Évolution des KPIs, historique des améliorations | □ C □ NC □ NA |

### Contrôles Annexe A (Sélection des points clés)

| Réf. | Question d'audit | Preuve attendue | Statut |
|---|---|---|---|
| A.5.15 | Le contrôle d'accès est-il basé sur le besoin d'en connaître (need-to-know) ? | Matrice RBAC, exemples d'accès | □ C □ NC □ NA |
| A.5.16 | Les identités sont-elles gérées de manière centralisée (SSO) ? | SSO configuré, pas de comptes orphelins | □ C □ NC □ NA |
| A.5.18 | Les droits d'accès sont-ils revus régulièrement ? | Rapport revue accès trimestrielle | □ C □ NC □ NA |
| A.6.3 | Les formations de sensibilisation sont-elles réalisées et tracées ? | Registre formations, attestations | □ C □ NC □ NA |
| A.8.5 | L'authentification multifacteur est-elle déployée ? | KPI-03 rapport, liste des comptes avec MFA | □ C □ NC □ NA |
| A.8.8 | Les vulnérabilités sont-elles gérées dans les délais définis ? | KPI-01 rapport, tickets CVE | □ C □ NC □ NA |
| A.8.13 | Les sauvegardes sont-elles testées régulièrement ? | Rapports tests restauration mensuels | □ C □ NC □ NA |
| A.8.15 | Les journaux sont-ils protégés contre toute altération ? | Configuration WORM/append-only, exemple log | □ C □ NC □ NA |
| A.8.24 | La cryptographie est-elle implémentée conformément à la politique ? | TLS 1.3 actif, rapport scan SSL, Vault | □ C □ NC □ NA |
| A.8.25 | Le cycle de vie du développement sécurisé est-il appliqué ? | Procédure revue code, CI/CD sécurisé | □ C □ NC □ NA |

---

## 4. Rapport Type d'Audit

```
RAPPORT D'AUDIT INTERNE ISO 27001
══════════════════════════════════════

INFORMATIONS GÉNÉRALES
  Référence audit   : AU-[XX]-2026
  Domaine audité    : [Domaine]
  Clauses auditées  : [Liste clauses]
  Date(s) d'audit   : [Date(s)]
  Auditeur          : [Nom + qualification]
  Audités           : [Noms + fonctions]
  Lieu              : [Bureau / Télé-audit]

SYNTHÈSE EXÉCUTIVE
  Conclusion générale : □ Conforme  □ Non-conformités mineures  □ Non-conformités majeures
  Nombre de NC majeures  : [N]
  Nombre de NC mineures  : [N]
  Nombre d'observations  : [N]
  Nombre de points forts : [N]

NON-CONFORMITÉS MAJEURES
  NC-M-[N] : [Description]
    Clause ISO 27001 : [Réf.]
    Preuve          : [Description de l'écart constaté]
    Risque associé  : [Description]
    Action requise  : Correction dans 30 jours
    Responsable     : [Nom]
    Délai           : [Date]

NON-CONFORMITÉS MINEURES
  NC-m-[N] : [Description]
    Clause ISO 27001 : [Réf.]
    Preuve          : [Description de l'écart constaté]
    Action requise  : Correction dans 90 jours
    Responsable     : [Nom]
    Délai           : [Date]

OBSERVATIONS (sans NC formelle)
  OB-[N] : [Description]
    Recommandation : [Action suggérée]

POINTS FORTS CONSTATÉS
  + [Description point fort 1]
  + [Description point fort 2]

CONSTATS DÉTAILLÉS
  [Pour chaque élément audité : question, réponse, preuve examinée, conclusion]

SIGNATURE
  Auditeur : _________________________ Date : ___________
  RSSI     : _________________________ Date : ___________
  Pris en compte par DG : ____________ Date : ___________
```

---

## 5. Processus de Revue de Direction

### 5.1 Fréquence et Organisation

| Type | Fréquence | Participants | Durée |
|---|---|---|---|
| Revue complète | Semestrielle (juin + décembre) | DG, RSSI, CTO, DPO, Responsables | 3 heures |
| Point flash | Mensuel | RSSI, CTO | 30 minutes |
| Revue extraordinaire | Sur incident P1 ou NC majeure | DG, RSSI, CTO, DPO | Ad hoc |

### 5.2 Ordre du Jour Type (Revue Semestrielle)

```
ORDRE DU JOUR — REVUE DE DIRECTION SMSI
Date : ___________  Durée : 3h

1. RÉSULTATS DE LA PÉRIODE (30 min)
   1.1 Tableau de bord KPIs sécurité
   1.2 Incidents de sécurité — bilan et enseignements
   1.3 Avancement Plan de Traitement des Risques
   1.4 Résultats audits internes

2. ÉTAT DU SMSI (30 min)
   2.1 Évolution du contexte et des risques
   2.2 Actions correctives ouvertes
   2.3 Retours des parties prenantes (clients, auditeurs)

3. PLAN D'ACTION (45 min)
   3.1 Décisions requises (budget, ressources, priorités)
   3.2 Objectifs de sécurité pour le prochain semestre
   3.3 Révisions de la politique ou des procédures

4. RESSOURCES ET BUDGET (15 min)
   4.1 Budget SMSI consommé vs prévu
   4.2 Besoins pour le prochain semestre

5. DIVERS ET CLÔTURE (15 min)
   5.1 Questions diverses
   5.2 Date de la prochaine revue
   5.3 Validation du PV
```

### 5.3 Sorties de la Revue de Direction

La revue de direction doit produire :
- **PV signé** avec décisions documentées
- **Actions correctives** avec responsables et délais
- **Décisions d'amélioration** du SMSI
- **Allocations de ressources** validées
- **Mise à jour du PTR** si nécessaire

---

## 6. Gestion des Non-Conformités

### 6.1 Classification

| Type | Définition | Délai de correction |
|---|---|---|
| **NC Majeure** | Absence d'un contrôle requis, défaillance systémique, risque immédiat | 30 jours |
| **NC Mineure** | Contrôle en place mais inefficace ou incomplet, écart isolé | 90 jours |
| **Observation** | Opportunité d'amélioration, risque émergent | Planifiée selon priorité |

### 6.2 Processus de Traitement

```
1. CONSTATATION (lors de l'audit)
   → Documentation dans le rapport d'audit

2. ENREGISTREMENT (J+2 après audit)
   → Ticket Jira avec description, clause, preuve

3. ANALYSE DES CAUSES RACINES (J+7)
   → Méthode 5 pourquoi ou Ishikawa

4. PLAN D'ACTION CORRECTIF (J+14)
   → Actions correctives et préventives
   → Responsable et délai validés par RSSI

5. MISE EN ŒUVRE
   → Suivi hebdomadaire jusqu'à clôture

6. VÉRIFICATION D'EFFICACITÉ (après délai)
   → Revue RSSI avec preuves de correction

7. CLÔTURE
   → PV de clôture dans Jira
   → Archivage pour audit de certification
```

---

*Document approuvé par le RSSI*  
*Prochaine révision : annuellement*
