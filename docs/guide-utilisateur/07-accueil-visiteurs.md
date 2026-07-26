# Guide Utilisateur IBIG SECRETIS — Chapitre 07 : Accueil Visiteurs

> **Module** : Gestion de l'Accueil et des Visiteurs  
> **Profils concernés** : Agent d'Accueil, Responsable Accueil  
> **Accès** : Menu > Accueil Visiteurs

---

## 1. Enregistrer l'arrivée d'un visiteur

`Accueil > Enregistrement > Nouveau visiteur`

### 1.1 Formulaire d'arrivée

```
┌─────────────────────────────────────────────────────────────────┐
│  ENREGISTREMENT VISITEUR                                        │
│  21 juillet 2026 — 09h47                                        │
├─────────────────────────────────────────────────────────────────┤
│  Prénom      : [________________]  Nom : [_________________]    │
│  Organisation: [________________________________]               │
│  Téléphone   : [______________________]                         │
│  CIN / Passeport : [______________________]                     │
│  Photo       : [📷 Prendre une photo]  [📁 Importer]           │
│                                                                 │
│  Motif de visite : [▼ Réunion de travail ]                      │
│  Personne visitée : [▼ M. Bah Oumar — DG]                      │
│  Heure d'arrivée  : [09:47]   (auto)                           │
│  Départ prévu     : [11:00]                                     │
│  Badge numéro     : [B-042]   (auto)                            │
│  Matériel apporté : [______________________]  (PC, téléphone)   │
│  Observations     : [______________________]                    │
│                                                                 │
│  [  Enregistrer & Imprimer badge  ]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Étapes :**

1. Saisis le **prénom** et le **nom** du visiteur
2. Renseigne son **organisation** (entreprise, ministère, etc.)
3. Note le **numéro de pièce d'identité** (CIN ou passeport)
4. Prends une **photo** du visiteur si possible (webcam ou appareil connecté)
5. Sélectionne le **motif de visite** dans la liste
6. Sélectionne la **personne visitée** dans l'annuaire interne — elle sera notifiée
7. L'**heure d'arrivée** est automatiquement définie à l'heure système
8. Indique le **départ prévu** si connu
9. Note le **matériel apporté** (ordinateur portable, valise, etc.)
10. Clique sur **Enregistrer & Imprimer badge**

> **[!] Attention**  
> La prise de photo est soumise aux règles RGPD de votre organisation. Informez le visiteur et obtenez son consentement si votre règlement l'exige.

---

## 2. Gérer les départs

Lorsqu'un visiteur quitte les locaux :

1. Naviguez vers `Accueil > Visiteurs présents`
2. La liste des visiteurs actuellement dans les locaux s'affiche :

```
┌─────────────────────────────────────────────────────────────────┐
│  VISITEURS PRÉSENTS — 21/07/2026                                │
├──────────────┬──────────────────┬──────────┬────────────────────┤
│  Visiteur    │  Reçu par        │  Arrivée │  Départ prévu      │
├──────────────┼──────────────────┼──────────┼────────────────────┤
│  KOUA Pierre │  M. Bah (DG)     │  09h47   │  11h00             │
│  YAO Fatou   │  Mme Yao (DAF)   │  10h15   │  12h00             │
│  DIABI Marc  │  M. Konan (DSI)  │  10h30   │  —                 │
└──────────────┴──────────────────┴──────────┴────────────────────┘
```

3. Cliquez sur **Enregistrer le départ** en regard du visiteur
4. L'heure de départ est enregistrée automatiquement
5. Le badge est invalidé (si badge numérique)

---

## 3. Imprimer un badge visiteur

Après l'enregistrement, SECRETIS génère automatiquement le badge :

```
┌───────────────────────────────┐
│  ┌─────┐                      │
│  │PHOTO│  VISITEUR            │
│  └─────┘                      │
│  KOUA Pierre                  │
│  IBIG Technologies            │
│                               │
│  Reçu par : M. BAH Oumar      │
│  Le : 21/07/2026  à  09:47    │
│  Badge N° : B-042             │
│                               │
│  ████████████████████████     │
│  ████ QR CODE ████████████    │
│  ████████████████████████     │
└───────────────────────────────┘
```

1. La fenêtre d'impression s'ouvre automatiquement
2. Vérifiez la prévisualisation
3. Cliquez sur **Imprimer** (imprimante badge connectée recommandée)
4. Remettez le badge au visiteur

> **[ASTUCE]**  
> Si vous n'avez pas d'imprimante badge, le badge peut être envoyé au téléphone du visiteur par SMS ou email sous forme de QR code numérique.

---

## 4. Configurer le portail de prise de RDV en ligne

`Administration > Accueil > Portail RDV`

Le portail de prise de RDV permet aux visiteurs de réserver leur visite à l'avance depuis un lien public.

### 4.1 Activer le portail

1. Accédez à `Administration > Accueil > Portail RDV`
2. Activez **Portail de RDV en ligne**
3. Configurez :

| Paramètre | Description |
|-----------|-------------|
| **URL du portail** | `https://rdv.ibig-secretis.com/[votre-organisation]` |
| **Titre affiché** | "Prise de rendez-vous — Mairie de Daloa" |
| **Logo** | Logo de l'organisation |
| **Horaires d'accueil** | Lundi-Vendredi, 08h00-17h00 |
| **Délai minimum** | Réserver au minimum 24h à l'avance |
| **Durée par défaut** | 30 minutes par RDV |
| **Personnes disponibles** | Sélection des agents qui reçoivent |

### 4.2 Fonctionnement pour le visiteur

1. Le visiteur accède au lien du portail
2. Il sélectionne la personne qu'il souhaite rencontrer
3. Il choisit une date et un créneau disponible
4. Il renseigne ses informations (nom, organisation, motif)
5. Il reçoit une confirmation par email avec un QR code
6. Le jour de la visite, il présente son QR code à l'accueil

> **[i] Information**  
> L'agent d'accueil reçoit une notification dès qu'un RDV est pris en ligne. Les RDV en ligne apparaissent dans la liste des visites prévues de la journée.

---

## 5. Gérer la file d'attente virtuelle

`Accueil > File d'attente`

Le module de file d'attente virtuelle gère les visites spontanées sans RDV.

### 5.1 Ajouter un visiteur à la file

1. Cliquez sur **+ Ajouter à la file**
2. Enregistrez les informations minimales du visiteur
3. Sélectionnez le service ou agent sollicité
4. Un numéro d'ordre est attribué automatiquement : `A-007`
5. Un SMS ou notification est envoyé au visiteur avec sa position

### 5.2 Vue de la file d'attente

```
┌─────────────────────────────────────────────────────────────────┐
│  FILE D'ATTENTE — Guichet Direction                             │
│  Heure : 10h30 │ Temps d'attente moyen : 12 min                │
├─────────────────────────────────────────────────────────────────┤
│  EN COURS : A-005 — KOUA Pierre  (depuis 10h18)                │
├──────────────────────────────────────────────────────────────────┤
│  SUIVANTS :                                                     │
│  A-006 — YAO Fatou   (arrivée 10h22)  Attente estimée : 8 min  │
│  A-007 — DIABI Marc  (arrivée 10h29)  Attente estimée : 20 min │
│  A-008 — TOURÉ Awa   (arrivée 10h31)  Attente estimée : 32 min │
│                                                                 │
│  [  Appeler suivant  ]  [  Passer  ]  [  Fermer guichet  ]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Ajouter un visiteur à la liste noire

> **[!] Attention**  
> Cette fonctionnalité est réservée aux responsables d'accueil. Elle doit être utilisée avec discernement et conformément aux politiques de l'organisation.

`Accueil > Gestion > Liste noire > Ajouter`

1. Renseignez les informations d'identification du visiteur (nom, CIN)
2. Sélectionnez la **raison** parmi les motifs prédéfinis
3. Définissez la **durée** de l'interdiction (temporaire ou permanente)
4. Ajoutez des **notes** justificatives
5. Cliquez sur **Confirmer**

Lors d'un prochain enregistrement, si le système détecte une correspondance avec la liste noire, une alerte rouge s'affiche immédiatement pour l'agent d'accueil.

---

## 7. Consulter le rapport journalier

`Accueil > Rapports > Rapport du jour`

Le rapport journalier est généré automatiquement chaque fin de journée et peut être consulté à tout moment.

**Contenu du rapport journalier :**

```
RAPPORT D'ACCUEIL — 21 juillet 2026
══════════════════════════════════════

STATISTIQUES DU JOUR
  Visiteurs enregistrés    :  23
  RDV en ligne honorés     :   8 / 10 (80%)
  Visites spontanées       :  15
  Durée moyenne de visite  :  47 minutes
  Heure d'affluence max    :  10h00-11h00

DÉTAIL DES VISITES
  [Liste complète des visiteurs avec horaires]

INCIDENTS
  Aucun incident signalé.

PRÉVISIONS DEMAIN
  RDV en ligne confirmés   :   6
```

Cliquez sur **Exporter PDF** pour télécharger le rapport ou sur **Envoyer par email** pour le transmettre au responsable.

---

*Fin du chapitre 07 — Accueil Visiteurs*

[← Chapitre précédent : 06 — Communication](06-communication.md) | [Chapitre suivant : 08 — Ressources →](08-ressources.md)
