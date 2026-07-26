# Guide de conformité OHADA — IBIG SECRETIS ERP

## Organisation pour l'Harmonisation en Afrique du Droit des Affaires

**Version :** 2.0 — Juillet 2026  
**Référence :** SYSCOHADA Révisé (2017), Actes Uniformes OHADA  
**Maintenu par :** Équipe SECRETIS

---

## 1. Les 17 États membres OHADA

| Code | Pays                        | Devise | TVA     | Timezone  |
|------|-----------------------------|--------|---------|-----------|
| BJ   | Bénin                       | XOF    | 18,0%   | UTC+1     |
| BF   | Burkina Faso                | XOF    | 18,0%   | UTC+0     |
| CM   | Cameroun                    | XAF    | 19,25%  | UTC+1     |
| CF   | Rép. Centrafricaine         | XAF    | 19,0%   | UTC+1     |
| KM   | Comores                     | KMF    | 10,0%   | UTC+3     |
| CG   | Congo                       | XAF    | 18,0%   | UTC+1     |
| CI   | Côte d'Ivoire               | XOF    | 18,0%   | UTC+0     |
| GA   | Gabon                       | XAF    | 18,0%   | UTC+1     |
| GN   | Guinée                      | GNF    | 18,0%   | UTC+0     |
| GW   | Guinée-Bissau               | XOF    | 15,0%   | UTC+0     |
| GQ   | Guinée Équatoriale          | XAF    | 15,0%   | UTC+1     |
| ML   | Mali                        | XOF    | 18,0%   | UTC+0     |
| NE   | Niger                       | XOF    | 19,0%   | UTC+1     |
| CD   | Rép. Dém. du Congo          | CDF    | 16,0%   | UTC+1     |
| SN   | Sénégal                     | XOF    | 18,0%   | UTC+0     |
| TD   | Tchad                       | XAF    | 18,0%   | UTC+1     |
| TG   | Togo                        | XOF    | 18,0%   | UTC+0     |

---

## 2. Mentions légales obligatoires sur les factures

### 2.1 Mentions communes à tous les pays OHADA

Toute facture émise dans un pays OHADA doit obligatoirement comporter :

1. **Dénomination sociale** complète et forme juridique (SARL, SA, GIE, EI…)
2. **Capital social** (pour les sociétés)
3. **Siège social** avec adresse complète
4. **Numéro RCCM** (Registre du Commerce et du Crédit Mobilier)
5. **Numéro d'identification fiscale** (NIF, NCC, NINEA, NIU selon le pays)
6. **Numéro de TVA** si assujetti
7. **Numéro et date de la facture**
8. **Date d'émission** et date d'échéance
9. **Identification du client** (nom, adresse, RCCM si professionnel)
10. **Description détaillée** des biens/services
11. **Prix unitaire HT**, quantités, sous-totaux
12. **Taux et montant de TVA** par ligne
13. **Total HT, montant TVA, total TTC**
14. **Conditions de paiement** et pénalités de retard
15. **Mention du plan comptable SYSCOHADA** avec codes de comptes

### 2.2 Mentions spécifiques par pays

#### Côte d'Ivoire
- NCC (Numéro de Compte Contribuable) : format 7 chiffres
- RCCM Abidjan : format `CI-ABJ-AAAA-A/B-XXXXXX`
- Pénalités de retard : 1,5% par mois (art. 577 Code Général des Impôts CI)
- Compétence : Tribunal de Commerce d'Abidjan

#### Sénégal
- NINEA (Numéro d'Identification Nationale des Entreprises et Associations)
- RCCM Dakar : format `SN-DKR-AAAA-A/B-XXXXXX`
- Indemnité forfaitaire de recouvrement : 40 000 FCFA
- Déclaration TVA mensuelle pour CA > 50 M FCFA

#### Cameroun
- NIU (Numéro d'Identifiant Unique) : format alphanumérique 14 caractères
- TVA spéciale : 19,25% (dont 17% TVA + 2% CAC)
- Timbre fiscal sur certains actes commerciaux
- Compétence : Tribunal de Grande Instance de Douala/Yaoundé

#### Bénin
- IFU (Identifiant Fiscal Unique) : 13 chiffres
- Facture normalisée DGI obligatoire pour CA > 150 M FCFA

---

## 3. Plan Comptable SYSCOHADA Révisé

### 3.1 Structure des classes

| Classe | Intitulé                                        | Comptes principaux |
|--------|-------------------------------------------------|--------------------|
| 1      | Ressources durables (capitaux)                  | 10 à 19            |
| 2      | Emplois stables (immobilisations)               | 20 à 29            |
| 3      | Stocks                                          | 30 à 39            |
| 4      | Tiers (clients, fournisseurs, État)             | 40 à 49            |
| 5      | Trésorerie                                      | 50 à 59            |
| 6      | Charges des activités ordinaires                | 60 à 69            |
| 7      | Produits des activités ordinaires               | 70 à 79            |
| 8      | Autres charges et autres produits               | 80 à 89            |
| 9      | Comptabilité analytique de gestion              | 90 à 99            |

### 3.2 Comptes fréquents dans SECRETIS

| Compte | Intitulé                          | Usage dans SECRETIS         |
|--------|-----------------------------------|-----------------------------|
| 40100  | Fournisseurs                      | Factures fournisseurs       |
| 41100  | Clients                           | Factures clients            |
| 41700  | Clients — Avoirs à établir        | Avoirs clients              |
| 44571  | TVA collectée                     | TVA sur ventes              |
| 44566  | TVA déductible sur biens          | TVA sur achats              |
| 70100  | Ventes de marchandises            | Ligne de facture négoce     |
| 70600  | Services vendus                   | Prestations de services     |
| 70800  | Produits des activités annexes    | Autres produits             |
| 75100  | Loyers et charges locatives       | Locations                   |
| 52100  | Banque                            | Règlements bancaires        |
| 57100  | Caisse                            | Règlements espèces          |
| 57300  | Mobile Money                      | Orange Money, MTN, Wave     |

---

## 4. TVA par pays membre — Taux et règles

| Pays | Taux normal | Taux réduit | Exonérations notables              |
|------|-------------|-------------|-------------------------------------|
| CI   | 18%         | Néant       | Agriculture, santé, éducation       |
| SN   | 18%         | Néant       | Produits agricoles, presse          |
| CM   | 19,25%      | Néant       | Médicaments, livres scolaires       |
| BJ   | 18%         | Néant       | Produits de première nécessité      |
| BF   | 18%         | Néant       | Eau, électricité domestique         |
| ML   | 18%         | Néant       | Intrants agricoles                  |
| NE   | 19%         | Néant       | Bétail, céréales                    |
| TG   | 18%         | Néant       | Produits pharmaceutiques            |
| GA   | 18%         | Néant       | Produits pétroliers (régime spécial)|
| CG   | 18%         | Néant       | Denrées alimentaires de base        |
| CD   | 16%         | Néant       | Produits miniers (régime minier)    |
| GN   | 18%         | Néant       | Médicaments essentiels              |
| KM   | 10%         | Néant       | Agriculture, pêche                  |
| GW   | 15%         | Néant       | Produits alimentaires               |
| GQ   | 15%         | Néant       | Néant                               |
| TD   | 18%         | Néant       | Biens de première nécessité         |
| CF   | 19%         | Néant       | Néant                               |

---

## 5. Jours fériés et congés légaux

### 5.1 Fêtes communes à tous les pays OHADA

- **1er janvier** — Jour de l'An (universel)
- **1er mai** — Fête du Travail (universel)
- **Lundi de Pâques** (calendrier grégorien)
- **Ascension** (39 jours après Pâques)
- **Lundi de Pentecôte** (49 jours après Pâques)
- **Aïd el-Fitr (Korité)** — variable selon calendrier islamique
- **Aïd el-Adha (Tabaski)** — variable selon calendrier islamique
- **Maouloud** — variable selon calendrier islamique

### 5.2 Fêtes nationales spécifiques

| Pays | Date       | Fête nationale                          |
|------|------------|-----------------------------------------|
| CI   | 7 août     | Indépendance de la Côte d'Ivoire (1960) |
| CI   | 15 novembre| Journée Nationale de la Paix            |
| SN   | 4 avril    | Indépendance du Sénégal (1960)          |
| CM   | 20 mai     | Fête Nationale (Unité Nationale)        |
| CM   | 11 février | Fête de la Jeunesse                     |
| BJ   | 1er août   | Indépendance du Bénin (1960)            |
| BJ   | 10 janvier | Fête Vodoun (Religions Endogènes)       |
| BF   | 5 août     | Fête Nationale (Révolution 1983)        |
| ML   | 22 septembre | Indépendance du Mali (1960)           |
| TG   | 27 avril   | Indépendance du Togo (1960)             |
| TG   | 13 janvier | Fête Nationale de la Libération         |
| GA   | 17 août    | Indépendance du Gabon (1960)            |
| CG   | 15 août    | Indépendance du Congo (1960)            |
| NE   | 3 août     | Indépendance du Niger (1960)            |
| TD   | 11 août    | Indépendance du Tchad (1960)            |
| CD   | 30 juin    | Indépendance du Congo-Kinshasa (1960)   |
| GN   | 2 octobre  | Indépendance de la Guinée (1958)        |

### 5.3 Durée légale du travail (pays OHADA)

- Semaine de travail : **40 heures** dans la majorité des pays OHADA
- Congés payés annuels : **2,5 jours ouvrables par mois** (soit 30 jours/an)
- Premier jour de la semaine recommandé : **Lundi** (norme ISO 8601)

---

## 6. Archivage légal des documents comptables

Conformément aux dispositions de l'Acte Uniforme OHADA relatif au Droit Commercial Général :

| Type de document             | Durée de conservation |
|------------------------------|-----------------------|
| Factures clients/fournisseurs| **10 ans**            |
| Livres comptables            | **10 ans**            |
| Journaux de caisse           | **10 ans**            |
| Déclarations fiscales        | **10 ans**            |
| Contrats commerciaux         | **10 ans**            |
| Bulletins de paie            | **5 ans**             |
| Statuts de la société        | **Permanente**        |
| Procès-verbaux d'AG          | **Permanente**        |
| Registre du commerce (RCCM)  | **Permanente**        |
| Registre des actionnaires    | **Permanente**        |

> **Important :** SECRETIS archive automatiquement tous les documents comptables pendant la durée légale. Les documents permanents ne peuvent pas être supprimés.

---

## 7. Zones économiques et banques centrales

### UEMOA — Union Économique et Monétaire Ouest-Africaine
- **Pays membres :** Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo
- **Devise :** XOF (Franc CFA Afrique de l'Ouest)
- **Banque centrale :** BCEAO (Banque Centrale des États de l'Afrique de l'Ouest, Dakar)
- **Parité fixe avec l'Euro :** 1 EUR = 655,957 FCFA (parité fixe depuis 1994)

### CEMAC — Communauté Économique et Monétaire de l'Afrique Centrale
- **Pays membres :** Cameroun, Rép. Centrafricaine, Congo, Gabon, Guinée Équatoriale, Tchad
- **Devise :** XAF (Franc CFA Afrique Centrale)
- **Banque centrale :** BEAC (Banque des États de l'Afrique Centrale, Yaoundé)
- **Parité fixe avec l'Euro :** 1 EUR = 655,957 FCFA (même parité que XOF)

> XOF et XAF ont **la même valeur** (1 XOF = 1 XAF) mais sont des devises distinctes non interchangeables physiquement.

---

## 8. Formats d'identification par pays

| Pays | Identifiant fiscal | Format                    | Organisme    |
|------|--------------------|---------------------------|--------------|
| CI   | NCC                | 7 chiffres                | DGI CI       |
| SN   | NINEA              | 7 chiffres + 2 lettres + 1| DGID SN      |
| CM   | NIU                | 14 caractères alphanumériques | DGI CM   |
| BJ   | IFU                | 13 chiffres               | DGI BJ       |
| BF   | NIF/IFU            | 11 chiffres               | DGI BF       |
| ML   | NIF                | 8 chiffres                | DGI ML       |
| NE   | NIF                | 8–11 chiffres             | DGI NE       |
| TG   | RCCM/NIF           | 9–11 chiffres             | OTR TG       |
| GA   | NIF                | 7–10 chiffres             | DGI GA       |
| CG   | NIU                | 9–12 chiffres             | DGI CG       |

---

## 9. Références légales

| Référence | Description |
|-----------|-------------|
| Traité OHADA | Traité relatif à l'Harmonisation du Droit des Affaires en Afrique (Port-Louis, 17 octobre 1993, révisé à Québec le 17 octobre 2008) |
| AUDCIF | Acte Uniforme relatif au Droit comptable et à l'Information Financière |
| AUSCGIE | Acte Uniforme relatif au Droit des Sociétés Commerciales et du GIE |
| AUDCG | Acte Uniforme relatif au Droit Commercial Général |
| SYSCOHADA | Système Comptable OHADA (révision 2017, applicable depuis le 1er janvier 2018) |
| CCJA | Cour Commune de Justice et d'Arbitrage (Abidjan, Côte d'Ivoire) |
| ERSUMA | École Régionale Supérieure de la Magistrature (Porto-Novo, Bénin) |

---

## 10. Configuration dans SECRETIS

### Variables d'environnement requises

```env
# Pays OHADA par défaut
APP_COUNTRY=CI
APP_CURRENCY=XOF
APP_LOCALE=fr-CI
APP_TIMEZONE=Africa/Abidjan

# Taux de change
OPENEXCHANGERATES_KEY=votre_clé_api
CURRENCY_CACHE_TTL=3600

# TVA par défaut (Côte d'Ivoire)
DEFAULT_VAT_RATE=18.0
VAT_NAME=TVA
PLAN_COMPTABLE=SYSCOHADA
```

### Tâches planifiées (CRON)

```cron
# Récupération quotidienne des taux de change à 6h UTC
0 6 * * * cd /var/www/secretis && php artisan secretis:fetch-rates

# Nettoyage des anciens taux (conservation 2 ans)
0 2 1 * * cd /var/www/secretis && php artisan secretis:cleanup-rates --keep=730
```

### Routes API disponibles

```
GET  /api/currencies                    Liste des devises actives
GET  /api/currencies/{code}             Détail d'une devise
GET  /api/currencies/rates?from=XOF&to=EUR   Taux de change
GET  /api/currencies/convert?amount=50000&from=XOF&to=EUR   Conversion
GET  /api/currencies/historical?from=XOF&to=EUR&date=2025-01-15  Taux historique
GET  /api/ohada/countries               17 pays membres
GET  /api/ohada/holidays/{country}/{year}  Jours fériés
```

---

*Document maintenu par l'équipe IBIG SECRETIS. Pour toute mise à jour réglementaire, contacter compliance@secretis.app*  
*Dernière révision : Juillet 2026 — OHADA 2017 Révisé*
