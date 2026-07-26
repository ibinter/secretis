# ISO/IEC 27001:2022 — Introduction et Contexte du SMSI
## IBIG SECRETIS ERP — Système de Management de la Sécurité de l'Information

**Document :** ISO-27001-00  
**Version :** 1.0  
**Date :** 2026-07-22  
**Propriétaire :** RSSI — IBIG Soft  
**Classification :** CONFIDENTIEL — INTERNE  

---

## 1. Contexte de l'Organisation

### 1.1 Présentation d'IBIG Soft

IBIG Soft est un éditeur de logiciels africain spécialisé dans les solutions de gestion d'entreprise (ERP). La société développe et commercialise **SECRETIS ERP**, une plateforme modulaire couvrant :

- Comptabilité & Finance (normes OHADA et IFRS)
- Ressources Humaines & Paie
- Gestion de Projet & Collaboration
- CRM & Relation Client
- Business Intelligence & Reporting
- Gestion Documentaire
- Académie & Formation
- Courrier & Archivage

**Siège social :** Afrique de l'Ouest  
**Marchés cibles :** PME, ETI, administrations publiques et organisations internationales opérant en Afrique  
**Modèles de déploiement :** SaaS multi-tenant et On-Premise  

### 1.2 Enjeux Stratégiques

IBIG Soft opère dans un environnement où :

- Les données traitées incluent des **données financières, RH et personnelles** de haute sensibilité
- La réglementation RGPD et les lois locales de protection des données imposent des obligations strictes
- Les clients grands comptes exigent des **preuves de conformité** (SOC 2, ISO 27001)
- La concurrence internationale pousse à démontrer un niveau de sécurité équivalent aux éditeurs européens et américains
- Le risque cyber (ransomware, APT, fraude) est en forte croissance en Afrique subsaharienne

---

## 2. Périmètre du SMSI

### 2.1 Définition du Périmètre

Le périmètre du Système de Management de la Sécurité de l'Information (SMSI) d'IBIG Soft couvre :

```
┌─────────────────────────────────────────────────────────────────┐
│                    PÉRIMÈTRE SMSI IBIG SOFT                     │
│                                                                  │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │   SECRETIS ERP SaaS  │    │  SECRETIS ERP On-Premise     │   │
│  │                      │    │                              │   │
│  │ • Infrastructure     │    │ • Package d'installation     │   │
│  │   cloud (hébergement)│    │ • Licences et activation     │   │
│  │ • Application web    │    │ • Support et maintenance     │   │
│  │ • API REST / mobile  │    │ • Mises à jour de sécurité   │   │
│  │ • Données clients    │    │ • Documentation technique    │   │
│  │ • Monitoring / logs  │    │                              │   │
│  └──────────────────────┘    └──────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ACTIVITÉS DE SUPPORT                         │   │
│  │  • Développement logiciel (équipe R&D)                   │   │
│  │  • DevOps / Infrastructure as Code                       │   │
│  │  • Support client (Helpdesk)                             │   │
│  │  • Ventes et avant-vente                                 │   │
│  │  • Administration générale                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Exclusions

Les éléments suivants sont **exclus** du périmètre SMSI :

| Élément exclu | Justification |
|---|---|
| Infrastructure On-Premise des clients | Responsabilité contractuellement transférée au client |
| Systèmes d'information des partenaires revendeurs | Entités juridiques indépendantes |
| Applications mobiles tierces non intégrées | Hors maîtrise d'IBIG Soft |

### 2.3 Interfaces et Dépendances

- **Fournisseur d'hébergement cloud** : Contrats SLA avec clauses de sécurité (ISO 27001 requis)
- **Intégrations tierces** : Microsoft 365, Google Workspace, passerelles de paiement
- **Sous-traitants** : développeurs freelance, consultants (soumis à NDA et politique de sécurité)

---

## 3. Parties Prenantes et Leurs Attentes

### 3.1 Cartographie des Parties Prenantes

| Partie prenante | Intérêts / Attentes | Criticité |
|---|---|---|
| **Clients (PME/ETI)** | Confidentialité des données, disponibilité du service, conformité RGPD | CRITIQUE |
| **Clients grands comptes** | Audit de sécurité, rapports de conformité, SLA garantis | CRITIQUE |
| **Employés IBIG Soft** | Protection des données personnelles, outils sécurisés | HAUTE |
| **Actionnaires / Direction** | Protection du capital immatériel, réputation, continuité d'activité | HAUTE |
| **Régulateurs** | Conformité aux lois locales, RGPD, protection des données | HAUTE |
| **Partenaires revendeurs** | Accès sécurisé aux outils de démonstration et portail partenaire | MOYENNE |
| **Hébergeur cloud** | Respect des politiques d'usage, reporting d'incidents | MOYENNE |
| **Auditeurs / Certificateurs** | Preuves documentées, traçabilité, efficacité du SMSI | HAUTE |
| **Compagnie d'assurance cyber** | Niveau de maturité sécurité, gestion des risques documentée | MOYENNE |

### 3.2 Exigences Légales et Réglementaires

| Référentiel | Domaine | Applicabilité |
|---|---|---|
| RGPD (UE 2016/679) | Protection des données personnelles | Applicable (clients EU) |
| Loi 2013-450 (Côte d'Ivoire) | Protection des données personnelles | Applicable |
| OHADA | Comptabilité, conservation des pièces | Applicable |
| PCI-DSS | Données de paiement | Partielle (passerelle déléguée) |
| ISO/IEC 27001:2022 | SMSI | Référentiel de certification visé |
| ISO/IEC 27701:2019 | Extension vie privée | Objectif moyen terme |

---

## 4. Référentiel : ISO/IEC 27001:2022

### 4.1 Structure de la Norme

L'édition 2022 de l'ISO/IEC 27001 introduit une nouvelle structure de l'Annexe A avec **93 contrôles** organisés en **4 thèmes** (contre 114 contrôles en 14 domaines dans la version 2013) :

| Thème | Contrôles | Description |
|---|---|---|
| **A.5** — Contrôles organisationnels | 37 | Politiques, rôles, gestion des risques, relations fournisseurs |
| **A.6** — Contrôles liés aux personnes | 8 | RH, sensibilisation, télétravail |
| **A.7** — Contrôles physiques | 14 | Sécurité physique, environnement |
| **A.8** — Contrôles technologiques | 34 | Accès, cryptographie, développement sécurisé, incidents |

### 4.2 Nouveaux Contrôles ISO 27001:2022

11 nouveaux contrôles ont été introduits dans la version 2022 :

| Contrôle | Description |
|---|---|
| A.5.7 | Threat intelligence |
| A.5.23 | Sécurité de l'information pour l'utilisation des services cloud |
| A.5.30 | Préparation aux TIC pour la continuité d'activité |
| A.6.8 | Signalement des événements de sécurité de l'information |
| A.7.4 | Surveillance de la sécurité physique |
| A.8.9 | Gestion de la configuration |
| A.8.10 | Suppression des informations |
| A.8.11 | Masquage des données |
| A.8.12 | Prévention des fuites de données (DLP) |
| A.8.16 | Activités de surveillance |
| A.8.23 | Filtrage web |
| A.8.28 | Codage sécurisé |

### 4.3 Approche PDCA (Plan-Do-Check-Act)

```
         PLAN                    DO
   ┌─────────────┐         ┌─────────────┐
   │ Contexte    │         │ Mise en     │
   │ Risques     │────────▶│ œuvre des   │
   │ Objectifs   │         │ contrôles   │
   └─────────────┘         └──────┬──────┘
          ▲                       │
          │                       ▼
   ┌─────────────┐         ┌─────────────┐
   │ Amélioration│         │ Surveillance │
   │ Continue    │◀────────│ & Mesure    │
   │ Direction   │         │ Audits      │
   └─────────────┘         └─────────────┘
        ACT                    CHECK
```

---

## 5. Déclaration d'Applicabilité (SoA) — Résumé

La Déclaration d'Applicabilité complète est disponible dans le document `03-declaration-applicabilite.md`. Le tableau ci-dessous présente le résumé par thème :

| Thème | Total contrôles | Applicables | Implémentés | En cours | Non applicables |
|---|---|---|---|---|---|
| A.5 — Organisationnels | 37 | 35 | 28 | 7 | 2 |
| A.6 — Personnes | 8 | 8 | 6 | 2 | 0 |
| A.7 — Physiques | 14 | 10 | 8 | 2 | 4 |
| A.8 — Technologiques | 34 | 34 | 27 | 7 | 0 |
| **TOTAL** | **93** | **87** | **69** | **18** | **6** |

**Taux d'implémentation global : 79 %**  
**Objectif certification : 100 % des contrôles applicables implémentés**

### 5.1 Justifications des Exclusions

| Contrôle exclu | Justification |
|---|---|
| A.7.1 Périmètres de sécurité physique (propres locaux) | Hébergement externalisé chez fournisseur certifié ISO 27001 |
| A.7.2 Contrôles d'entrée physiques (propres locaux) | Idem — responsabilité hébergeur |
| A.7.3 Sécurisation des bureaux (datacenter) | Idem |
| A.7.4 Surveillance sécurité physique (datacenter) | Idem |
| A.5.14 Transfert d'informations (filiales) | IBIG Soft n'a pas de filiales |
| A.6.6 Accords de confidentialité (candidats) | Géré par clause NDA contrat travail |

---

## 6. Gouvernance du SMSI

### 6.1 Engagement de la Direction

La Direction Générale d'IBIG Soft s'engage à :

1. Allouer les ressources humaines et budgétaires nécessaires au SMSI
2. Promouvoir la culture de sécurité à tous les niveaux
3. Participer aux revues de direction semestrielles
4. Approuver la politique de sécurité et ses révisions annuelles
5. Soutenir les démarches de certification et d'amélioration continue

### 6.2 Calendrier de Certification

| Étape | Échéance | Responsable |
|---|---|---|
| Mise en place du SMSI | T1 2026 | RSSI |
| Audit interne | T2 2026 | Auditeur interne |
| Revue de direction | T2 2026 | DG + RSSI |
| Audit de certification Étape 1 (documentation) | T3 2026 | Organisme certificateur |
| Audit de certification Étape 2 (terrain) | T4 2026 | Organisme certificateur |
| Obtention du certificat ISO 27001:2022 | T4 2026 | — |
| Audit de surveillance annuel | T4 2027 | Organisme certificateur |
| Renouvellement (3 ans) | T4 2029 | Organisme certificateur |

---

*Document approuvé par la Direction Générale d'IBIG Soft*  
*Prochaine révision : juillet 2027*
