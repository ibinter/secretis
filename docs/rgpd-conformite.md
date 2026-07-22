# Guide de Conformité RGPD — IBIG SECRETIS

> Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016  
> Version 1.0 — Juillet 2026

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Registre des traitements pré-rempli](#2-registre-des-traitements-pré-rempli)
3. [Durées de rétention recommandées](#3-durées-de-rétention-recommandées)
4. [Procédure de réponse aux demandes](#4-procédure-de-réponse-aux-demandes)
5. [Nomination du DPO](#5-nomination-du-dpo)
6. [Checklist conformité RGPD (50 points)](#6-checklist-conformité-rgpd-50-points)

---

## 1. Introduction

SECRETIS est une plateforme de gestion organisationnelle (ERP) traitant des données personnelles
pour le compte d'organisations clientes (responsables de traitement) et d'IBIG TECHNOLOGIES
(sous-traitant / co-responsable selon les cas).

### Rôles RGPD dans l'écosystème SECRETIS

| Entité | Rôle RGPD | Obligations |
|--------|-----------|-------------|
| Organisation cliente | Responsable de traitement | Registre Art. 30, réponses aux droits, DPO si requis |
| IBIG TECHNOLOGIES | Sous-traitant (+ Resp. pour son propre usage) | DPA, sécurité Art. 32, notification incidents Art. 33 |
| Utilisateurs finaux | Personnes concernées | Droits Art. 15-22 |

### Bases légales utilisées dans SECRETIS

- **Art. 6.1.b** (Contrat) : données nécessaires à l'exécution du contrat SaaS
- **Art. 6.1.c** (Obligation légale) : données comptables, logs de sécurité
- **Art. 6.1.f** (Intérêts légitimes) : sécurité, prévention fraude, amélioration service
- **Art. 6.1.a** (Consentement) : cookies non-essentiels, marketing

---

## 2. Registre des traitements pré-rempli

### 2.1 Module Utilisateurs & Authentification

| Champ | Valeur |
|-------|--------|
| **Nom** | Gestion des comptes utilisateurs |
| **Finalité** | Créer et gérer les accès à la plateforme SECRETIS |
| **Base légale** | Exécution du contrat (Art. 6.1.b) |
| **Catégories de données** | Identité (nom, prénom), contact (email), professionnel (poste, département) |
| **Personnes concernées** | Salariés et prestataires de l'organisation cliente |
| **Rétention** | Durée du contrat + 3 ans |
| **Destinataires** | Équipe SECRETIS (admin), administrateurs de l'organisation |
| **Transferts hors UE** | Aucun (hébergement EU) |

### 2.2 Module Agenda & Événements

| Champ | Valeur |
|-------|--------|
| **Nom** | Gestion de l'agenda organisationnel |
| **Finalité** | Planification des réunions et événements professionnels |
| **Base légale** | Exécution du contrat (Art. 6.1.b) |
| **Catégories de données** | Identité, coordonnées professionnelles, données d'activité |
| **Personnes concernées** | Salariés, prestataires, contacts extérieurs |
| **Rétention** | 3 ans après l'événement |
| **Destinataires** | Participants aux événements, administrateurs |

### 2.3 Module Gestion Électronique de Documents (GED)

| Champ | Valeur |
|-------|--------|
| **Nom** | Gestion électronique des documents |
| **Finalité** | Archivage, partage et gestion de documents professionnels |
| **Base légale** | Exécution du contrat (Art. 6.1.b) + Obligation légale (Art. 6.1.c) pour archives légales |
| **Catégories de données** | Contenu documentaire (variable), métadonnées (auteur, date) |
| **Personnes concernées** | Salariés, clients, partenaires |
| **Rétention** | 5 ans archives courantes / 30 ans archives définitives |

### 2.4 Module Courrier

| Champ | Valeur |
|-------|--------|
| **Nom** | Gestion du courrier entrant et sortant |
| **Finalité** | Traçabilité des échanges courriers de l'organisation |
| **Base légale** | Intérêts légitimes (Art. 6.1.f) |
| **Catégories de données** | Coordonnées expéditeur/destinataire, contenu du courrier |
| **Personnes concernées** | Correspondants internes et externes |
| **Rétention** | 5 ans |

### 2.5 Module Messagerie Interne

| Champ | Valeur |
|-------|--------|
| **Nom** | Messagerie interne professionnelle |
| **Finalité** | Communication professionnelle entre membres de l'organisation |
| **Base légale** | Exécution du contrat (Art. 6.1.b) |
| **Catégories de données** | Identité, contenu des messages, métadonnées (date, heure) |
| **Personnes concernées** | Salariés |
| **Rétention** | 2 ans après envoi |

### 2.6 Module Ressources Humaines

| Champ | Valeur |
|-------|--------|
| **Nom** | Gestion des ressources humaines |
| **Finalité** | Administration du personnel, paie, congés, formations |
| **Base légale** | Obligation légale (Art. 6.1.c) + Contrat (Art. 6.1.b) |
| **Catégories de données** | Identité, données socio-professionnelles, données de paie, absences |
| **Personnes concernées** | Salariés |
| **Rétention** | 5 ans après fin du contrat de travail |
| **Données sensibles** | Oui (santé pour arrêts maladie) — Art. 9.2.b |

### 2.7 Module Comptabilité

| Champ | Valeur |
|-------|--------|
| **Nom** | Comptabilité et facturation |
| **Finalité** | Tenue des comptes, facturation clients et fournisseurs |
| **Base légale** | Obligation légale (Art. 6.1.c) — Code de commerce L.123-22 |
| **Catégories de données** | Coordonnées professionnelles, données financières |
| **Personnes concernées** | Clients, fournisseurs, partenaires |
| **Rétention** | 10 ans (livres comptables — art. L.123-22 C.com) |

### 2.8 Logs d'audit et sécurité

| Champ | Valeur |
|-------|--------|
| **Nom** | Journaux d'activité et de sécurité |
| **Finalité** | Sécurité des systèmes, détection des incidents, conformité |
| **Base légale** | Intérêts légitimes (Art. 6.1.f) + Obligation légale (Art. 6.1.c) |
| **Catégories de données** | Adresses IP, horodatages, actions utilisateurs (pseudonymisées) |
| **Personnes concernées** | Tous les utilisateurs |
| **Rétention** | 12 mois glissants (recommandation CNIL / art. L.34-1 CPCE) |

### 2.9 Consentements et cookies

| Champ | Valeur |
|-------|--------|
| **Nom** | Registre des consentements |
| **Finalité** | Preuve des consentements recueillis (charge de la preuve art. 7 RGPD) |
| **Base légale** | Obligation légale (Art. 6.1.c) |
| **Rétention** | 5 ans après révocation |

---

## 3. Durées de rétention recommandées

### Tableau de référence SECRETIS

| Type de données | Durée de rétention | Base légale | Module |
|----------------|-------------------|-------------|--------|
| Compte utilisateur actif | Durée contrat + 3 ans | Art. 6.1.b | Utilisateurs |
| Données RH actif | Durée CDI/CDD + 5 ans | Code du travail | RH |
| Bulletins de salaire | 5 ans | Art. R.3243-4 C.trav. | RH / Comptabilité |
| Documents comptables | 10 ans | Art. L.123-22 C.com | Comptabilité |
| Contrats commerciaux | 5 ans après expiration | Art. L.110-4 C.com | GED |
| Courriers | 5 ans | Art. L.110-4 C.com | Courrier |
| Messages internes | 2 ans | Recommandation CNIL | Messagerie |
| Logs d'audit | 12 mois | Art. L.34-1 CPCE | Audit |
| Cookies analytiques | 13 mois maximum | Délibération CNIL | Cookies |
| Consentements révoqués | 5 ans (preuve) | Art. 7.1 RGPD | Consentements |
| Visiteurs portail | 1 an | Intérêt légitime | Accueil |
| Incidents de sécurité | 5 ans | Bonne pratique | Sécurité |
| Candidatures non retenues | 2 ans | Recommandation CNIL | RH |
| Données anonymisées | Illimité | — | Statistiques |

> **Note importante :** Les données comptables et fiscales ne peuvent jamais être supprimées
> avant expiration du délai légal, même en cas de demande d'effacement RGPD (Art. 17.3.b).

---

## 4. Procédure de réponse aux demandes

### Flowchart de traitement

```
RÉCEPTION D'UNE DEMANDE DE DROITS
            │
            ▼
    ┌───────────────────┐
    │  Identifier le    │
    │  type de demande  │
    └───────┬───────────┘
            │
    ┌───────▼───────────────────────────────────┐
    │                                           │
    ▼              ▼                ▼           ▼
[ACCÈS]     [RECTIFICATION]    [EFFACEMENT] [PORTABILITÉ]
Art. 15       Art. 16           Art. 17      Art. 20
    │              │                │           │
    ▼              ▼                ▼           ▼
Vérifier     Identifier les   Vérifier si  Générer
l'identité   données à        suppression  l'export
             corriger         possible     JSON/ZIP
    │              │                │           │
    └──────────────┴────────────────┴───────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │  Réponse sous 30 jours│
            │  (art. 12 RGPD)       │
            │  Prorogeable 2 mois   │
            └───────────┬───────────┘
                        │
            ┌───────────▼───────────┐
            │  Notifier l'auteur de │
            │  la demande par email │
            └───────────────────────┘
```

### Délais légaux à respecter

| Étape | Délai | Article RGPD |
|-------|-------|--------------|
| Accusé de réception | Immédiat (automatique) | Art. 12.3 |
| Vérification d'identité | 1 mois max | Art. 12.6 |
| Réponse initiale | 1 mois max | Art. 12.3 |
| Prorogation possible | + 2 mois (complexité) | Art. 12.3 |
| Notification de refus | Sans délai indu | Art. 12.4 |

### Motifs légaux de refus

- Demande manifestement infondée ou excessive (Art. 12.5)
- Données nécessaires à des obligations légales (Art. 17.3.b)
- Données nécessaires à la constatation, l'exercice ou la défense de droits en justice (Art. 17.3.e)
- Demande non identifiable (Art. 11)

---

## 5. Nomination du DPO

### Modèle de lettre de nomination

```
LETTRE DE NOMINATION DU DÉLÉGUÉ À LA PROTECTION DES DONNÉES
============================================================

[Ville], le [Date]

[Nom de l'Organisation]
[Adresse]

OBJET : Nomination du Délégué à la Protection des Données (DPO)
        Conformément à l'article 37 du Règlement (UE) 2016/679

Par la présente, [Nom de l'Organisation], représentée par
[Nom du représentant légal], en qualité de [Titre],

DÉSIGNE

M./Mme [Prénom NOM], [Titre/Fonction]
Contact : [email] / [téléphone]

en tant que Délégué à la Protection des Données (DPO) de l'organisation,
conformément à l'article 37 du Règlement (UE) 2016/679 (RGPD).

MISSIONS DU DPO (Art. 39 RGPD) :
• Informer et conseiller sur les obligations RGPD
• Contrôler le respect du RGPD et des politiques internes
• Conseiller sur l'analyse d'impact (AIPD) si requise
• Coopérer avec l'autorité de contrôle (CNIL)
• Faire office de point de contact pour les personnes concernées

Le DPO bénéficie :
• De l'indépendance dans l'exercice de ses missions (Art. 38.3)
• Des ressources nécessaires (Art. 38.2)
• D'une protection contre toute sanction (Art. 38.3)

Cette nomination prend effet à compter du [Date d'effet].

[Signature du représentant légal]                [Signature du DPO]
[Nom et Titre]                                   [Nom et Titre]
```

### Obligation de désignation d'un DPO

Le DPO est **obligatoire** pour SECRETIS lorsque (Art. 37) :
1. Le traitement est effectué par une autorité publique.
2. Les activités de base consistent en un suivi régulier et systématique à grande échelle.
3. Les données traitées sont des catégories spéciales (Art. 9) ou des données pénales à grande échelle.

**Recommandation IBIG** : désigner un DPO même lorsqu'il n'est pas obligatoire (bonne pratique).

### Déclaration à la CNIL

Le DPO doit être enregistré auprès de la CNIL sur : https://notifications.cnil.fr/notifications/siret

---

## 6. Checklist conformité RGPD (50 points)

### A. Gouvernance (10 points)

- [ ] **A1** — Un DPO (interne ou externe) est nommé et déclaré à la CNIL.
- [ ] **A2** — Une politique de protection des données est formalisée et approuvée par la direction.
- [ ] **A3** — Le registre des traitements (Art. 30) est tenu à jour.
- [ ] **A4** — Des procédures de gestion des droits des personnes sont documentées.
- [ ] **A5** — Des formations RGPD sont organisées pour le personnel concerné.
- [ ] **A6** — Des clauses RGPD sont incluses dans les contrats avec les sous-traitants (DPA Art. 28).
- [ ] **A7** — Un budget et des ressources sont alloués à la conformité RGPD.
- [ ] **A8** — Des revues périodiques (au moins annuelles) de la conformité sont planifiées.
- [ ] **A9** — La direction est sensibilisée aux enjeux et responsabilités RGPD.
- [ ] **A10** — Un correspondant RGPD est identifié dans chaque département.

### B. Traitements et bases légales (10 points)

- [ ] **B1** — Chaque traitement dispose d'une base légale documentée (Art. 6).
- [ ] **B2** — Les traitements de données sensibles (Art. 9) font l'objet d'une base légale spécifique.
- [ ] **B3** — Le principe de minimisation est respecté (données adéquates, pertinentes, limitées).
- [ ] **B4** — La finalité des traitements est déterminée avant la collecte.
- [ ] **B5** — La compatibilité des finalités secondaires est vérifiée.
- [ ] **B6** — Les sous-traitants ont été audités et font l'objet d'un DPA.
- [ ] **B7** — Les transferts hors UE sont encadrés (CCT, adéquation, BCR).
- [ ] **B8** — Une AIPD (Analyse d'Impact) est réalisée pour les traitements à risque élevé.
- [ ] **B9** — Les logiciels utilisés respectent le principe de privacy by design.
- [ ] **B10** — Le principe de privacy by default est appliqué (paramètres les plus protecteurs par défaut).

### C. Information et consentement (10 points)

- [ ] **C1** — Une politique de confidentialité est accessible et rédigée en langage clair.
- [ ] **C2** — Les mentions d'information sont présentes lors de chaque collecte (Art. 13/14).
- [ ] **C3** — Le consentement est recueilli de manière active et documentée.
- [ ] **C4** — Le retrait du consentement est aussi facile que son octroi.
- [ ] **C5** — Une bannière cookies conforme est en place (catégories, choix granulaire).
- [ ] **C6** — Les consentements sont horodatés et conservés comme preuve.
- [ ] **C7** — Les mentions légales sont complètes et à jour.
- [ ] **C8** — Les jeunes de moins de 16 ans bénéficient de protections spécifiques.
- [ ] **C9** — La politique de cookies est versionnée et les changements notifiés.
- [ ] **C10** — L'information sur les droits est fournie en langue compréhensible par les personnes concernées.

### D. Droits des personnes (10 points)

- [ ] **D1** — Un processus de réponse aux demandes est en place (délai 30 jours).
- [ ] **D2** — Les demandes peuvent être soumises en ligne (formulaire dédié).
- [ ] **D3** — La procédure de vérification d'identité est définie.
- [ ] **D4** — L'export de données est disponible en format portable (JSON, ZIP).
- [ ] **D5** — La suppression des données respecte les exceptions légales.
- [ ] **D6** — Les rectifications sont effectuées et notifiées aux destinataires.
- [ ] **D7** — Les refus sont motivés et contiennent les voies de recours.
- [ ] **D8** — Les demandes sont consignées dans un registre.
- [ ] **D9** — Le droit à la limitation est techniquement implémenté.
- [ ] **D10** — Les personnes sont informées de leur droit de recours auprès de la CNIL.

### E. Sécurité et incidents (10 points)

- [ ] **E1** — Les données sont chiffrées en transit (TLS 1.2 minimum) et au repos.
- [ ] **E2** — Des contrôles d'accès (RBAC) sont en place et documentés.
- [ ] **E3** — L'authentification multi-facteurs est disponible et recommandée.
- [ ] **E4** — Des sauvegardes régulières et chiffrées sont effectuées.
- [ ] **E5** — Des tests de pénétration sont réalisés au moins annuellement.
- [ ] **E6** — Une procédure de gestion des violations de données est documentée.
- [ ] **E7** — La notification à la CNIL sous 72h est opérationnelle (Art. 33).
- [ ] **E8** — La notification aux personnes concernées est possible (Art. 34).
- [ ] **E9** — Un registre des incidents de sécurité est tenu.
- [ ] **E10** — Les accès aux données sont journalisés (audit logs).

---

### Score de maturité RGPD

| Score | Niveau | Action |
|-------|--------|--------|
| 0–19/50 | 🔴 Non conforme | Actions immédiates requises |
| 20–34/50 | 🟡 Partiellement conforme | Plan de remédiation à 6 mois |
| 35–44/50 | 🟠 En cours de conformité | Actions correctives ciblées |
| 45–49/50 | 🟢 Conforme | Maintien et surveillance |
| 50/50 | ✅ Excellence | Audit externe recommandé |

---

## Contacts utiles

| Organisme | Contact |
|-----------|---------|
| CNIL (France) | www.cnil.fr · 01 53 73 22 22 |
| DPO IBIG SECRETIS | dpo@ibig.ci |
| ARTCI (Côte d'Ivoire) | www.artci.ci |

---

*Ce guide est fourni à titre informatif. Pour des questions juridiques spécifiques,
consultez un juriste spécialisé en droit des données personnelles.*

*Document révisé annuellement — Prochaine révision : Juillet 2027*
