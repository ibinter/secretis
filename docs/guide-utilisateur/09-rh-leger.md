# Guide Utilisateur IBIG SECRETIS — Chapitre 09 : RH Léger

> **Module** : Ressources Humaines (Congés, Notes de frais, Organigramme)  
> **Profils concernés** : Tous les employés, Responsable RH, Managers  
> **Accès** : Menu > RH

---

## 1. Créer et gérer les fiches employés

`RH > Employés > + Nouvel employé` — [ADMIN] ou [RH]

### 1.1 Informations de la fiche employé

La fiche employé centralise toutes les informations professionnelles du collaborateur :

**Onglet Informations personnelles :**

| Champ | Description |
|-------|-------------|
| Photo | Photo professionnelle |
| Prénom / Nom | Identité officielle |
| Date de naissance | Date de naissance |
| Numéro CIN | Pièce d'identité nationale |
| Adresse | Adresse de résidence |
| Téléphone | Numéro personnel |
| Email personnel | Email hors organisation |
| Personne à contacter | Contact en cas d'urgence |

**Onglet Informations professionnelles :**

| Champ | Description |
|-------|-------------|
| Matricule | Numéro unique attribué par les RH |
| Poste | Intitulé exact du poste |
| Département | Service d'affectation |
| Date d'embauche | Date de début de contrat |
| Type de contrat | CDI, CDD, Stage, Consultant |
| Durée CDD | Si applicable |
| Manager direct | Responsable hiérarchique N+1 |
| Niveau | Junior, Senior, Manager, Directeur |

**Onglet Congés :**
- Quota annuel par type de congé
- Solde disponible
- Historique des congés pris

### 1.2 Modifier une fiche employé

1. Recherchez l'employé via la barre de recherche
2. Cliquez sur son nom pour ouvrir sa fiche
3. Cliquez sur **Modifier**
4. Effectuez les modifications
5. Cliquez sur **Enregistrer**

> **[i] Information**  
> Toute modification d'une fiche employé est enregistrée dans le journal d'audit avec le nom de l'auteur et la date.

---

## 2. Faire une demande de congé

`RH > Mes congés > Nouvelle demande`

```
┌─────────────────────────────────────────────────────────────────┐
│  DEMANDE DE CONGÉ                                               │
├─────────────────────────────────────────────────────────────────┤
│  Employé     : Konan Adjoa (automatique)                        │
│  Type        : [▼ Congés payés annuels    ]                     │
│  Date début  : [__/__/____]                                     │
│  Date fin    : [__/__/____]                                     │
│  Durée calculée : 5 jours ouvrables                             │
│  Solde avant    : 18 jours   Solde après : 13 jours             │
│  Motif          : [_________________________________]           │
│  Suppléant      : [▼ Sélectionner un suppléant      ]           │
│  Pièce jointe   : [📎 Justificatif médical si congé maladie]   │
│                                                                 │
│  [  Soumettre la demande  ]                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Types de congés disponibles :**

| Type | Abréviation | Quota standard |
|------|-------------|---------------|
| Congés payés annuels | CPA | 2,5 jours/mois (30 j/an) |
| Congé maladie | CM | Selon médecin |
| Congé maternité | CMAT | Selon législation locale |
| Congé paternité | CPAT | Selon législation locale |
| Congé sans solde | CSS | Sur autorisation |
| Congé événement familial | CEF | Mariage, décès (2-5 jours) |
| Récupération | RECU | Heures supplémentaires |

**Étapes de la demande :**

1. Sélectionnez le **type de congé**
2. Indiquez les **dates** (la durée en jours ouvrables est calculée automatiquement)
3. Vérifiez que votre **solde** est suffisant
4. Saisissez un **motif** si nécessaire
5. Désignez un **suppléant** qui prendra en charge vos responsabilités
6. Joignez un **justificatif** si requis (congé maladie, événement familial)
7. Cliquez sur **Soumettre la demande**

Votre manager N+1 reçoit une notification et doit approuver ou refuser.

---

## 3. Approuver ou refuser une demande (N+1 et RH)

### 3.1 Workflow de validation

```
  SOUMISE ──► VALIDÉE N+1 ──► VALIDÉE RH ──► APPROUVÉE
                    │                │
                    ▼                ▼
               REFUSÉE N+1      REFUSÉE RH
```

### 3.2 Valider en tant que N+1 (Manager)

1. Vous recevez une notification : "Konan Adjoa a soumis une demande de congé du 04/08 au 08/08/2026"
2. Cliquez sur la notification ou accédez à `RH > Demandes > En attente de ma validation`
3. Examinez la demande :
   - Vérifiez les dates et la durée
   - Consultez le calendrier d'absence de l'équipe
   - Vérifiez que le suppléant désigné est disponible
4. Cliquez sur **Approuver** ou **Refuser**
5. En cas de refus, saisissez obligatoirement un **motif**

### 3.3 Validation finale (RH)

Après l'approbation du N+1, le service RH reçoit la demande pour validation finale :
1. Vérification des soldes et des règles RH
2. Approbation ou refus avec commentaire
3. Après approbation définitive, l'employé et le manager sont notifiés

Le congé est automatiquement intégré dans :
- Le calendrier des absences de l'équipe
- Le calendrier de l'organisation (jours fériés et absences)
- Le solde de congés de l'employé

---

## 4. Consulter le calendrier des absences

`RH > Calendrier des absences`

```
┌─────────────────────────────────────────────────────────────────┐
│  CALENDRIER DES ABSENCES — Département Administratif            │
│  Août 2026                                                      │
├────────┬────────┬────────┬────────┬────────┬────────────────────┤
│  LUN   │  MAR   │  MER   │  JEU   │  VEN   │ Employé            │
├────────┼────────┼────────┼────────┼────────┼────────────────────┤
│ 4 ████ │ 5 ████ │ 6 ████ │ 7 ████ │ 8 ████ │ Konan A. (CPA)    │
│        │        │        │ 7 ░░░░ │ 8 ░░░░ │ Bah O. (Déplac.)  │
│        │        │ 6 ████ │ 7 ████ │        │ Yao A. (CM)        │
└────────┴────────┴────────┴────────┴────────┴────────────────────┘
  ████ Congé approuvé   ░░░░ Mission/Déplacement
```

Le calendrier permet d'identifier rapidement les conflits et de planifier les effectifs en conséquence.

---

## 5. Créer une note de frais

`RH > Notes de frais > Nouvelle note`

```
┌─────────────────────────────────────────────────────────────────┐
│  NOUVELLE NOTE DE FRAIS                                         │
├─────────────────────────────────────────────────────────────────┤
│  Référence   : [NDF-2026-0089]  (auto)                          │
│  Employé     : Konan Adjoa                                      │
│  Période     : Juillet 2026                                     │
│  Objet       : Mission Abidjan — Formation SECRETIS             │
│                                                                 │
│  LIGNES DE DÉPENSES :                                           │
├──────────────┬────────────┬──────────────┬─────────────────────┤
│  Catégorie   │   Date     │  Montant     │  Justificatif       │
├──────────────┼────────────┼──────────────┼─────────────────────┤
│  Transport   │ 21/07/2026 │  15 000 XOF  │ [📎 ticket taxi]    │
│  Hébergement │ 21/07/2026 │  45 000 XOF  │ [📎 facture hôtel]  │
│  Repas       │ 21/07/2026 │   8 500 XOF  │ [📎 facture resto]  │
│  Repas       │ 22/07/2026 │   7 200 XOF  │ [📎 facture resto]  │
│  [+ Ajouter une ligne]                                          │
├──────────────┴────────────┴──────────────┴─────────────────────┤
│  TOTAL                         75 700 XOF                      │
│                                                                 │
│  Avance reçue : 50 000 XOF   À rembourser : 25 700 XOF         │
│                                                                 │
│  [  Soumettre pour validation  ]                                │
└─────────────────────────────────────────────────────────────────┘
```

**Catégories de dépenses :**

| Catégorie | Plafond standard | Justificatif requis |
|-----------|-----------------|---------------------|
| Transport (taxi) | Sur justificatif | Ticket ou reçu |
| Transport (avion/train) | Sur billet | Billet nominatif |
| Hébergement | 60 000 XOF/nuit | Facture hôtel |
| Repas | 10 000 XOF/repas | Facture restaurant |
| Communication | Sur justificatif | Facture opérateur |
| Divers | Sur autorisation préalable | Reçu |

---

## 6. Valider les notes de frais

**Workflow :**
1. **Soumis** → Employé soumet la note
2. **Validé N+1** → Manager approuve les lignes de dépenses
3. **Validé RH/DAF** → Service RH ou financier valide le montant
4. **Remboursé** → Paiement effectué, marqué comme remboursé

Le manager N+1 peut :
- **Approuver** une ligne individuellement
- **Rejeter** une ligne avec motif (dépense non justifiée, hors plafond)
- **Approuver tout** en une seule action

---

## 7. Exporter pour la comptabilité

`RH > Notes de frais > Export comptabilité`

1. Sélectionnez la **période** (mois, trimestre)
2. Filtrez par **statut** : uniquement les notes validées
3. Choisissez le **format** :
   - Excel (.xlsx) avec détail des lignes
   - CSV pour import dans le logiciel comptable
4. Cliquez sur **Exporter**

L'export contient : référence, employé, département, catégorie, montant, date, statut — prêt pour l'import dans les outils comptables (Sage, etc.).

---

## 8. Lire l'organigramme

`RH > Organigramme`

L'organigramme de l'organisation est généré automatiquement à partir des fiches employés et des liens hiérarchiques définis.

```
                    ┌──────────────────┐
                    │  M. BAH Oumar    │
                    │ Directeur Général│
                    └────────┬─────────┘
          ┌─────────────────┼─────────────────┐
          │                 │                 │
  ┌───────┴──────┐  ┌───────┴──────┐  ┌──────┴───────┐
  │  Mme YAO A.  │  │  M. DIALLO   │  │  M. KONAN    │
  │  DAF          │  │  DRH         │  │  DSI          │
  └───────┬──────┘  └───────┬──────┘  └──────┬───────┘
          │                 │                 │
    [Équipe DAF]      [Équipe RH]       [Équipe DSI]
```

**Fonctionnalités de l'organigramme :**
- Zoom in/out avec la molette
- Cliquer sur un nom pour voir la fiche employé
- Exporter en PDF ou image PNG
- Afficher uniquement un département spécifique
- Basculer entre la vue hiérarchique et la vue département

---

*Fin du chapitre 09 — RH Léger*

[← Chapitre précédent : 08 — Ressources](08-ressources.md) | [Chapitre suivant : 10 — Rapports →](10-rapports.md)
