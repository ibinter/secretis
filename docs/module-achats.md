# Module Achats & Portail Fournisseurs — IBIG SECRETIS

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture des données](#architecture-des-données)
3. [Process standard : DA → AO → Devis → BC → Livraison](#process-standard)
4. [Évaluation des fournisseurs](#évaluation-des-fournisseurs)
5. [Guide portail fournisseur](#guide-portail-fournisseur)
6. [Intégration avec la comptabilité](#intégration-avec-la-comptabilité)
7. [Référence technique](#référence-technique)

---

## Vue d'ensemble

Le module Achats de SECRETIS ERP couvre l'intégralité du cycle procure-to-pay (P2P) :

```
Besoin interne → Demande d'Achat (DA) → Appel d'Offres (AO)
    → Réponses fournisseurs → Comparaison → Sélection
    → Bon de Commande (BC) → Livraison → Facturation → Paiement
```

### Acteurs du module

| Rôle | Périmètre |
|------|-----------|
| **Demandeur** | Crée et soumet les demandes d'achat |
| **Responsable achats** | Gère AO, devis, BC, évaluations fournisseurs |
| **Approbateur / Direction** | Approuve les DA et les BC |
| **Fournisseur** | Accède via le portail externe (sans compte SECRETIS) |

---

## Architecture des données

### Tables principales

| Table | N° auto | Description |
|-------|---------|-------------|
| `suppliers` | FOURN-0001 | Base de données des fournisseurs |
| `purchase_requests` | DA-2026-00001 | Demandes d'achat internes |
| `rfqs` | AO-2026-00001 | Appels d'offres |
| `rfq_suppliers` | — | Fournisseurs invités à un AO |
| `quotations` | DEV-2026-00001 | Devis soumis par les fournisseurs |
| `purchase_orders` | BC-2026-00001 | Bons de commande |
| `goods_receipts` | BR-2026-00001 | Bons de réception |
| `supplier_evaluations` | — | Évaluations des fournisseurs |

### Statuts et transitions

#### Demande d'Achat (DA)
```
brouillon → soumis → approuvé → converti
                  ↘ refusé
```

#### Appel d'Offres (AO)
```
brouillon → publié → clos
                  ↘ annulé
```

#### Bon de Commande (BC)
```
brouillon → approuvé → envoyé → accusé → livré_partiel
                                       ↘ livré → facturé → clôturé
                       ↘ annulé
```

---

## Process standard

### Étape 1 — Demande d'Achat (DA)

La DA est créée par un collaborateur pour exprimer un besoin interne.

**Données requises :**
- Titre et description du besoin
- Liste des articles (désignation, quantité, unité, prix estimé)
- Priorité : Normale / Urgente / Très urgente
- Date de besoin
- Justification

**Workflow d'approbation :**
1. Le demandeur crée la DA en brouillon
2. Il la soumet (`status = soumis`)
3. Le manager ou la direction achats approuve ou refuse
4. Si approuvée, la DA peut être convertie en AO ou en BC direct

```
POST /procurement/purchase-requests                 # Créer
POST /procurement/purchase-requests/{id}/submit    # Soumettre
POST /procurement/purchase-requests/{id}/approve   # Approuver
POST /procurement/purchase-requests/{id}/refuse    # Refuser
```

---

### Étape 2 — Appel d'Offres (AO)

Créé depuis une DA approuvée ou indépendamment pour des achats récurrents.

**Configuration de l'AO :**
- Titre, description, date limite de réponse
- Articles avec spécifications techniques
- Critères d'évaluation pondérés (total doit être = 100%)

**Exemple de critères d'évaluation :**
```json
[
  { "name": "Qualité technique",    "weight": 30, "type": "technique" },
  { "name": "Prix",                 "weight": 40, "type": "financier" },
  { "name": "Délai de livraison",   "weight": 20, "type": "technique" },
  { "name": "Références/Garanties", "weight": 10, "type": "technique" }
]
```

**Invitation des fournisseurs :**
- Sélection depuis la base fournisseurs actifs
- Email automatique d'invitation avec lien portail
- Suivi des réponses (invité / répondu / refusé)

---

### Étape 3 — Soumission et comparaison des devis

**Score financier (automatique) :**
Le fournisseur le moins cher obtient 100 points. Les autres sont calculés :
```
Score financier = (Prix minimum / Prix du fournisseur) × 100
```

**Score technique (manuel) :**
L'acheteur saisit le score technique de 0 à 100 pour chaque fournisseur, en fonction de la qualité de l'offre.

**Score total pondéré :**
```
Score total = (Score financier × Poids financier%) + (Score technique × Poids technique%)
```

**Sélection du gagnant :**
- Le responsable achats sélectionne le devis retenu
- Une justification écrite est obligatoire
- Email automatique de notification aux fournisseurs (gagnant et éliminés)

---

### Étape 4 — Bon de Commande (BC)

Créé automatiquement depuis le devis sélectionné, ou manuellement.

**Contenu du BC :**
- Désignation, quantité, unité, prix unitaire HT, TVA
- Sous-total HT, TVA (18% OHADA par défaut), Total TTC
- Conditions : délai de livraison, modalités de paiement, lieu de livraison

**PDF du BC :**
Généré via DomPDF, conforme aux mentions légales OHADA. Inclut :
- En-tête organisation + fournisseur
- Tableau des articles
- Totaux avec TVA
- Espaces signature (Service Achats + Direction + Fournisseur)

**Cycle de vie :**
1. `brouillon` → créé
2. `approuvé` → validé par le directeur achats
3. `envoyé` → PDF envoyé par email au fournisseur
4. `accusé` → le fournisseur a accusé réception (via portail)
5. `livré_partiel` / `livré` → bon de réception enregistré
6. `facturé` → facture fournisseur déposée sur le portail
7. `clôturé` → paiement effectué (intégration comptabilité)

---

### Étape 5 — Bon de Réception (BR)

Enregistrement de la réception des marchandises ou de la prestation.

**Par article :**
- Quantité commandée (référence BC)
- Quantité reçue
- Quantité rejetée + motif de rejet

**Statuts :**
- `complet` : tout reçu conforme
- `partiel` : réception incomplète
- `rejeté` : non-conformité totale

---

## Évaluation des fournisseurs

### Méthode de notation

Quatre critères notés de 1 à 5 :

| Critère | Description | Poids |
|---------|-------------|-------|
| **Qualité** | Conformité des produits/services aux spécifications | 25% |
| **Délai** | Respect des dates de livraison convenues | 25% |
| **Prix** | Compétitivité tarifaire sur le marché | 25% |
| **Communication** | Réactivité, transparence, gestion des litiges | 25% |

**Score global :** Moyenne arithmétique des 4 critères.

**Rating fournisseur :** Mise à jour automatique basée sur la moyenne des 3 dernières évaluations.

### Scorecard fournisseur (`/procurement/suppliers/{id}/scorecard`)

- Radar chart 4 axes (qualité, délai, prix, communication)
- Évolution du score dans le temps (graphique linéaire)
- Taux de ponctualité des livraisons
- Volume d'achat total
- Tendance : hausse / stable / baisse

### Règles de gestion

| Score moyen | Action recommandée |
|-------------|-------------------|
| ≥ 4.5/5 | Fournisseur privilégié, partenariat renforcé |
| 3.5 – 4.4 | Bon fournisseur, relation à maintenir |
| 2.5 – 3.4 | Fournisseur à surveiller, plan d'amélioration |
| 1.5 – 2.4 | Suspension temporaire recommandée |
| < 1.5 | Blacklistage |

---

## Guide portail fournisseur

### Accès

Le portail est accessible à l'URL `/supplier-portal`. Il s'agit d'un espace **distinct** de l'ERP SECRETIS, accessible sans compte interne.

**Activation du compte fournisseur :**
1. Dans la fiche fournisseur, cliquer sur "Activer le portail"
2. Saisir l'email du contact fournisseur
3. Un mot de passe temporaire est généré et envoyé par email
4. Le fournisseur doit changer son mot de passe à la première connexion

### Fonctionnalités disponibles pour le fournisseur

| Fonctionnalité | Description |
|----------------|-------------|
| **Tableau de bord** | Vue synthétique des AO en cours, commandes et factures |
| **AO en cours** | Consulter les appels d'offres et soumettre une offre |
| **Mes commandes** | Voir les BC reçus, accuser réception |
| **Mes factures** | Déposer une facture PDF après livraison |

### Flux de soumission d'une offre (côté fournisseur)

1. Connexion au portail avec email + mot de passe
2. Aller dans "Appels d'offres en cours"
3. Cliquer "Soumettre une offre" sur l'AO souhaité
4. Saisir le prix unitaire pour chaque article
5. Indiquer le délai de livraison, la validité de l'offre, les conditions de paiement
6. Soumettre → le devis est enregistré côté SECRETIS

> **Important :** Les offres ne peuvent être soumises qu'avant la date limite. Aucune modification n'est possible après soumission.

---

## Intégration avec la comptabilité

### BC → Facture fournisseur → Écriture comptable

Lorsqu'un BC passe au statut `facturé` (facture déposée par le fournisseur) :

1. Une écriture comptable est générée dans le plan de comptes SYSCOHADA :
   - **Débit** : Compte 60X (Achats) selon la catégorie fournisseur
   - **Débit** : Compte 4456 (TVA déductible)
   - **Crédit** : Compte 401 (Fournisseurs)

2. Référence : numéro de BC + numéro de facture fournisseur

3. Le BC passe en `clôturé` après le paiement enregistré dans la comptabilité.

### Comptes SYSCOHADA utilisés

| Compte | Libellé | Usage |
|--------|---------|-------|
| 601 | Achats de marchandises | Catégorie `materiel`, `consommables` |
| 604 | Achats d'études et prestations de services | Catégorie `services`, `it` |
| 621 | Personnel extérieur à l'entreprise | — |
| 623 | Publicité, publications, relations publiques | — |
| 401 | Fournisseurs | Créditeur des BC |
| 4456 | TVA déductible | 18% OHADA |

---

## Référence technique

### Services Laravel

| Service | Responsabilité |
|---------|----------------|
| `ProcurementService` | Logique métier complète (DA, AO, devis, BC, réception, évaluation) |
| `SupplierPortalService` | Portail externe fournisseur (auth, dashboard, soumission) |

### Routes principales

```
GET  /procurement/dashboard
GET  /procurement/suppliers
POST /procurement/suppliers
PUT  /procurement/suppliers/{id}
GET  /procurement/suppliers/{id}/scorecard
POST /procurement/suppliers/{id}/evaluate
POST /procurement/suppliers/{id}/portal

GET  /procurement/purchase-requests
POST /procurement/purchase-requests
POST /procurement/purchase-requests/{id}/submit
POST /procurement/purchase-requests/{id}/approve
POST /procurement/purchase-requests/{id}/refuse

GET  /procurement/rfqs
POST /procurement/rfqs
POST /procurement/rfqs/{id}/invite-suppliers
POST /procurement/rfqs/{id}/quotations/{supplierId}
POST /procurement/rfqs/{id}/evaluate
POST /procurement/rfqs/{id}/select

GET  /procurement/purchase-orders
POST /procurement/purchase-orders
POST /procurement/purchase-orders/{id}/approve
POST /procurement/purchase-orders/{id}/send
POST /procurement/purchase-orders/{id}/receive
GET  /procurement/purchase-orders/{id}/pdf

# Portail fournisseur (public)
GET  /supplier-portal
POST /supplier-portal/login
POST /supplier-portal/logout
GET  /supplier-portal/dashboard
GET  /supplier-portal/rfqs
POST /supplier-portal/rfqs/{id}/respond
GET  /supplier-portal/orders
POST /supplier-portal/orders/{id}/acknowledge
POST /supplier-portal/orders/{id}/invoice
```

### Variables d'environnement requises

```env
# Configuration achats
PROCUREMENT_APPROVER_EMAIL=achats@organisation.com
SUPPLIER_PORTAL_URL=https://votre-domaine.com/supplier-portal

# DomPDF pour les PDF
DOMPDF_PAPER_SIZE=A4
DOMPDF_PAPER_ORIENTATION=portrait
```

### Dépendances Composer

```bash
composer require barryvdh/laravel-dompdf   # Génération des PDF BC
```

### Migrations

```bash
php artisan migrate  # Inclut 2026_01_01_000118_create_supplier_portal.php
```
