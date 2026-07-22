# Guide Comptabilité Générale SYSCOHADA — IBIG SECRETIS ERP

## Table des matières

1. [Introduction au module](#1-introduction)
2. [Plan comptable SYSCOHADA](#2-plan-comptable-syscohada)
3. [Saisie des écritures courantes](#3-saisie-des-écritures-courantes)
4. [États financiers SYSCOHADA](#4-états-financiers)
5. [Clôture de l'exercice comptable](#5-clôture-de-lexercice)
6. [Déclarations fiscales par pays OHADA](#6-déclarations-fiscales)
7. [FAQ comptabilité ERP](#7-faq)

---

## 1. Introduction

Le module de comptabilité générale de SECRETIS ERP est conforme au **SYSCOHADA Révisé 2017** (Système Comptable OHADA), la norme comptable unifiée pour les 17 États membres de l'OHADA (Organisation pour l'Harmonisation en Afrique du Droit des Affaires).

### Norme applicable
- **Acte Uniforme** relatif au droit comptable et à l'information financière (AUDCIF), en vigueur depuis le 1er janvier 2018
- **Directive BCEAO** sur le reporting financier
- Monnaie principale : **FCFA (XOF)**, taux de change 1 EUR = 655,957 FCFA (fixe)

### Architecture du module
```
Wave 6 (base) : Facturation, Devis, Dépenses
     +
Wave 7 (SYSCOHADA) :
  ├── Plan comptable (200+ comptes pré-chargés)
  ├── Journal comptable (7 journaux)
  ├── Balance générale + Grand livre
  ├── Compte de résultat SYSCOHADA
  ├── Bilan SYSCOHADA
  ├── Déclarations fiscales (TVA, IS, CNPS, Patente)
  └── Clôture d'exercice automatique
```

---

## 2. Plan comptable SYSCOHADA

### Structure des 8 classes

| Classe | Intitulé | Nature | Exemples |
|--------|----------|--------|---------|
| **1** | Ressources durables | Capitaux propres + Dettes LT | 101 Capital social, 162 Emprunts |
| **2** | Actif immobilisé | Biens durables | 221 Bâtiments, 231 Matériel |
| **3** | Actif circulant (stocks) | Stocks | 311 Matières premières, 35 Produits finis |
| **4** | Actif/Passif circulant | Créances/Dettes | 411 Clients, 401 Fournisseurs |
| **5** | Trésorerie | Liquidités | 512 Banques, 571 Caisse |
| **6** | Charges | Dépenses d'exploitation | 601 Achats, 661 Salaires |
| **7** | Produits | Revenus d'exploitation | 701 Ventes, 706 Services |
| **8** | Charges/Produits spéciaux | HAO | 83 Charges HAO, 84 Produits HAO |

### Numérotation des comptes
- **1 chiffre** : classe (ex: 4 = Tiers)
- **2 chiffres** : compte principal (ex: 41 = Clients)
- **3 chiffres** : sous-compte (ex: 411 = Clients ordinaires)
- **4 chiffres** : compte auxiliaire (ex: 4112 = Clients particuliers)

### Comptes clés à retenir

| N° | Libellé | Usage fréquent |
|----|---------|----------------|
| 101 | Capital social | Apport initial |
| 411 | Clients | Créances clients |
| 401 | Fournisseurs | Dettes fournisseurs |
| 4431 | TVA collectée | Ventes HT × 18% |
| 4441 | TVA déductible | Achats HT × 18% |
| 512 | Banque | Mouvements bancaires |
| 571 | Caisse | Espèces |
| 701-706 | Ventes/Services | Chiffre d'affaires |
| 601-606 | Achats | Approvisionnements |
| 661 | Salaires | Paie du personnel |
| 431 | CNPS | Cotisations sociales |

---

## 3. Saisie des écritures courantes

### 3.1 Principe de la partie double

Toute écriture doit respecter : **Total Débit = Total Crédit**

L'application vérifie automatiquement cet équilibre et bloque la saisie en cas d'écart.

### 3.2 Types de journaux

| Code | Libellé | Utilisation |
|------|---------|-------------|
| **VE** | Ventes | Factures clients, avoirs |
| **AC** | Achats | Factures fournisseurs |
| **BQ** | Banque | Relevés bancaires |
| **CA** | Caisse | Mouvements d'espèces |
| **SA** | Salaires | Bulletins de paie |
| **OD** | Opérations diverses | Amortissements, provisions |
| **AN** | À-nouveaux | Reprise soldes N-1 |

### 3.3 Écritures types

#### Facturation client (vente de services)
```
Journal : VE — Date : 15/03/2026
Libellé : Prestation services — FAC-2026-042

411 Clients              DÉBIT     590 000
  701 Ventes services              CRÉDIT   500 000
  4431 TVA collectée               CRÉDIT    90 000
```

#### Règlement client (virement bancaire)
```
Journal : BQ — Date : 20/03/2026
Libellé : Règlement FAC-2026-042

512 Banque               DÉBIT     590 000
  411 Clients                      CRÉDIT   590 000
```
→ Après saisie, effectuer le **lettrage** du compte 411 pour rapprocher ces deux écritures.

#### Achat de fournitures (avec TVA)
```
Journal : AC — Date : 05/03/2026
Libellé : Achat fournitures bureau — FAC-FOURNISSEUR-156

606 Achats non stockés   DÉBIT      42 373
4441 TVA déductible      DÉBIT       7 627
  401 Fournisseurs                  CRÉDIT  50 000
```

#### Règlement fournisseur
```
Journal : BQ — Date : 10/03/2026
Libellé : Paiement FAC-FOURNISSEUR-156

401 Fournisseurs         DÉBIT      50 000
  512 Banque                        CRÉDIT  50 000
```

#### Salaires (mois de mars)
```
Journal : SA — Date : 31/03/2026
Libellé : Paie mars 2026

661 Salaires bruts       DÉBIT     850 000
  421 Personnel — rémunérations     CRÉDIT  715 500
  431 CNPS — part salariale         CRÉDIT   53 550
  442 Retenues à la source (ITS)    CRÉDIT   80 950
```

#### Paiement des salaires
```
Journal : BQ — Date : 31/03/2026

421 Personnel — rémunérations DÉBIT   715 500
  512 Banque                          CRÉDIT  715 500
```

#### Dotation aux amortissements
```
Journal : OD — Date : 31/12/2026
Libellé : DAP matériel informatique

681 Dotations amortissements DÉBIT   200 000
  2833 Amortissements matériel       CRÉDIT  200 000
```

### 3.4 Import automatique depuis les ventes

Le module génère automatiquement les écritures VE depuis les factures du module Wave 6 :
- Débit 411 (Clients) + Crédit 701/4431 (Ventes + TVA)
- Débit 512 (Banque) + Crédit 411 lors du paiement

---

## 4. États financiers

### 4.1 Balance générale

**Accès** : Comptabilité → Balance générale

La balance regroupe tous les comptes avec :
- **Débit cumulé** : somme des mouvements débiteurs
- **Crédit cumulé** : somme des mouvements créditeurs
- **Solde débiteur** ou **Solde créditeur** : différence

Cliquer sur un compte ouvre automatiquement son **grand livre**.

### 4.2 Grand livre

Détail chronologique de toutes les écritures d'un compte :
- Report à nouveau en tête
- Solde progressif après chaque mouvement
- Lettrage des écritures appairées (clients/règlements)

### 4.3 Compte de résultat SYSCOHADA

Présentation des **Soldes Intermédiaires de Gestion (SIG)** :

| SIG | Formule |
|-----|---------|
| **Marge commerciale** | Ventes marchés − Achats consommés |
| **Valeur Ajoutée (VA)** | Production − Consommations intermédiaires |
| **EBE** | VA − Charges personnel − Impôts/taxes |
| **REX** | EBE + Reprises − Dotations amort. − Autres charges |
| **Résultat financier** | Produits financiers − Charges financières |
| **RAO** | REX + Résultat financier |
| **Résultat HAO** | Produits HAO − Charges HAO |
| **Résultat net** | RAO + HAO − IS |

### 4.4 Bilan SYSCOHADA

**ACTIF** (emplois) :
- Actif immobilisé : brut − amortissements = net
- Actif circulant : stocks + créances + charges constatées
- Trésorerie-Actif : banques + caisse

**PASSIF** (ressources) :
- Capitaux propres : capital + réserves + résultat
- Dettes financières à long terme
- Passif circulant : fournisseurs + dettes fiscales/sociales
- Trésorerie-Passif : crédits de trésorerie

**Contrôle** : Total Actif = Total Passif (vérification automatique)

---

## 5. Clôture de l'exercice

### Étapes de clôture

1. **Vérifier la balance** : s'assurer que Débit = Crédit
2. **Contrôler les comptes** : vérifier les soldes aberrants
3. **Passer les écritures de fin d'exercice** :
   - Dotations aux amortissements (OD)
   - Provisions pour risques (OD)
   - Régularisations (CCA, PCA)
4. **Déclarations fiscales** : TVA, IS
5. **Valider toutes les écritures** (bouton Valider sur chaque écriture)
6. **Clôturer l'exercice** : Comptabilité → Exercices → Clôturer

### Écritures de clôture automatiques

Le système génère automatiquement :
- Virement des soldes des comptes de charges (classe 6) au crédit
- Virement des soldes des comptes de produits (classe 7) au débit
- Constatation du résultat net au compte 120 (bénéfice) ou 129 (perte)
- Verrouillage de toutes les écritures

### Après clôture

- Créer le nouvel exercice
- Saisir les **écritures d'à-nouveaux** (AN) : reprendre les soldes des comptes de bilan
- Les comptes de charges/produits recommencent à zéro

---

## 6. Déclarations fiscales par pays OHADA

### 6.1 TVA (Taxe sur la Valeur Ajoutée)

| Pays | Taux standard | Périodicité |
|------|--------------|-------------|
| Côte d'Ivoire | 18% | Mensuelle |
| Sénégal | 18% | Mensuelle |
| Cameroun | 19,25% | Mensuelle |
| Mali | 18% | Trimestrielle |
| Burkina Faso | 18% | Mensuelle |

**Calcul automatique** :
- TVA collectée = mouvements crédits du compte 4431
- TVA déductible = mouvements débits du compte 4441
- TVA nette = Collectée − Déductible

### 6.2 Impôt sur les Sociétés (IS)

| Pays | Taux IS | IMF (minimum) |
|------|---------|---------------|
| Côte d'Ivoire | 25% | 0,5% CA (min 500 000 FCFA) |
| Sénégal | 30% | 0,5% CA |
| Cameroun | 30% | 2,2% CA |
| Mali | 30% | 0,75% CA |
| Burkina Faso | 27,5% | 1% CA |

### 6.3 Patente / Contribution Forfaitaire

Taxe professionnelle annuelle calculée sur le chiffre d'affaires et la valeur locative des locaux. Varient selon la catégorie d'activité et le pays.

**Côte d'Ivoire** :
- Droit proportionnel : 0,5% du CA
- Droit fixe : selon catégorie (entre 10 000 et 5 000 000 FCFA)

### 6.4 CNPS / Cotisations sociales

**Côte d'Ivoire (CNPS)** :

| Risque | Part patronale | Part salariale |
|--------|---------------|----------------|
| Retraite | 7,7% | 6,3% |
| Prestations familiales | 5,75% | — |
| Accidents du travail | 2 à 5% | — |
| **Total** | **~15,45%** | **6,3%** |

Plafond de cotisation : 1 647 315 FCFA/mois (retraite).

---

## 7. FAQ

### Q : Comment corriger une écriture déjà validée ?
**R** : Une écriture validée est verrouillée. Il faut saisir une **écriture de contre-passation** (inverser débit/crédit) puis saisir l'écriture correcte. Jamais de modification directe.

### Q : Quelle est la différence entre journal OD et AN ?
**R** : Le journal **AN** (À-nouveaux) est exclusivement utilisé en début d'exercice pour reprendre les soldes bilantiels de l'exercice précédent. Le journal **OD** sert pour toutes les opérations diverses en cours d'exercice.

### Q : Comment lettrer les comptes clients (411) ?
**R** : Aller dans Grand livre → sélectionner le compte 411 → cliquer sur "Lettrage auto". Le système apparie automatiquement les débits et crédits de même montant. Les paires lettrées sont marquées AA, AB, AC…

### Q : Pourquoi mon bilan n'est pas équilibré ?
**R** : Vérifier :
1. Toutes les écritures d'à-nouveaux ont été saisies
2. Pas d'écriture avec compte hors plan comptable
3. Tous les amortissements ont été passés
4. Les comptes de régularisation (476/477) sont à jour

### Q : Comment inclure les comptes clients de la facturation dans la compta ?
**R** : Utiliser la fonctionnalité "Import depuis les factures" dans le journal VE. Elle génère automatiquement les écritures 411/701/4431 depuis les factures du module Wave 6.

### Q : Peut-on utiliser des devises étrangères ?
**R** : Oui. Chaque ligne d'écriture accepte un `currency_code` et un `exchange_rate`. Les montants sont convertis en XOF pour les états financiers. Le compte 676 (Pertes de change) et 776 (Gains de change) sont utilisés pour les écarts de conversion.

### Q : Comment gérer les avances clients (419) ?
**R** : Lors de la réception d'une avance :
```
512 Banque      DÉBIT     100 000
  419 Avances reçues clients  CRÉDIT  100 000
```
Lors de la facturation définitive :
```
419 Avances reçues clients  DÉBIT  100 000
  411 Clients                      CRÉDIT 100 000
```

### Q : À quelle fréquence sauvegarder les données comptables ?
**R** : L'ERP sauvegarde automatiquement. Pour l'archive légale : exporter la balance générale et le grand livre en CSV chaque mois. Conserver les PDF de bilans et comptes de résultat 10 ans minimum (obligation légale OHADA).

---

*Documentation IBIG SECRETIS ERP — Module Comptabilité SYSCOHADA v1.0*
*Conforme SYSCOHADA Révisé 2017 — Acte Uniforme OHADA du 26 janvier 2017*
