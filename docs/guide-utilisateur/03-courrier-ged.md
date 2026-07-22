# Guide Utilisateur IBIG SECRETIS — Chapitre 03 : Courrier & GED

> **Module** : Courrier & Gestion Électronique des Documents  
> **Profils concernés** : Secrétaire de Direction, Responsable Administratif, Agent  
> **Accès** : Menu > Courrier | Menu > Documents

---

## 1. Enregistrer un courrier entrant

### 1.1 Accéder au registre

Naviguez vers `Courrier > Courrier entrant > Nouveau courrier entrant`

### 1.2 Formulaire d'enregistrement

```
┌─────────────────────────────────────────────────────────────────┐
│  NOUVEAU COURRIER ENTRANT                                       │
├─────────────────────────────────────────────────────────────────┤
│  Numéro      : [ENT-2026-0043]  (attribué automatiquement)      │
│  Date réception : [21/07/2026]                                  │
│  Date du courrier : [18/07/2026]                                │
│  Expéditeur  : [________________________]                       │
│  Organisation exp. : [____________________]                     │
│  Objet       : [________________________]                       │
│  Référence exp. : [__________]                                  │
│  Priorité    : [▼ Normale  ]  Urgent [ ]                        │
│  Type        : [▼ Lettre       ]                                │
│  Destinataire interne : [▼ Sélectionner ]                       │
│  Service concerné : [▼ Sélectionner   ]                         │
│  Pièces jointes : [📎 Ajouter un fichier]                       │
│  Observations : [________________________]                      │
│                                                                 │
│  [  Enregistrer  ]  [  Enregistrer & Assigner  ]                │
└─────────────────────────────────────────────────────────────────┘
```

**Étapes :**

1. Le **numéro** est attribué automatiquement selon la convention définie dans les paramètres
2. Renseignez la **date de réception** (date à laquelle le courrier est arrivé dans vos locaux)
3. Renseignez la **date du courrier** (date figurant sur le document)
4. Identifiez l'**expéditeur** — si déjà dans le système, sélectionnez-le dans la liste
5. Saisissez l'**objet** du courrier de façon claire et concise
6. Définissez la **priorité** (Normale, Haute, Urgente)
7. Sélectionnez le **type** (Lettre, Décision, Rapport, Facture, etc.)
8. Désignez le **destinataire interne** responsable du traitement
9. Scannez ou photographiez le document et cliquez sur **📎 Ajouter un fichier**
10. Cliquez sur **Enregistrer & Assigner** pour notifier le destinataire

> **[!] Attention**  
> Le numéro automatique ne peut pas être modifié manuellement. Si vous commettez une erreur, utilisez la fonction **Annuler l'enregistrement** disponible dans les 24 heures.

---

## 2. Enregistrer un courrier sortant

`Courrier > Courrier sortant > Nouveau courrier sortant`

| Champ | Description |
|-------|-------------|
| **Numéro** | Attribué automatiquement (SRT-2026-NNNN) |
| **Date d'envoi** | Date effective d'envoi |
| **Destinataire** | Personne ou organisation destinataire |
| **Objet** | Objet du courrier sortant |
| **Référence interne** | Numéro du courrier entrant auquel il répond (si applicable) |
| **Voie d'envoi** | Email, Poste, Coursier, Remise en main propre |
| **Expéditeur interne** | Agent qui a rédigé le courrier |
| **Signataire** | Responsable qui a signé le document |
| **Pièce jointe** | Document final (PDF signé) |

> **[ASTUCE]**  
> Lorsqu'un courrier sortant répond à un courrier entrant, liez-les via le champ **Référence interne**. Cela crée un fil de correspondance consultable dans l'historique.

---

## 3. Assigner et suivre un courrier

### 3.1 Assigner un courrier

Depuis la liste des courriers, cliquez sur le courrier souhaité, puis :

1. Cliquez sur **Assigner**
2. Sélectionnez l'agent ou le service responsable
3. Définissez une **date limite de traitement** (optionnel)
4. Ajoutez une **note d'instruction** si nécessaire
5. Cliquez sur **Confirmer l'assignation**

L'agent reçoit une notification (email + notification in-app).

### 3.2 Tableau de suivi

```
┌─────────────────────────────────────────────────────────────────────┐
│  REGISTRE DES COURRIERS                                            │
├──────────┬───────────┬──────────────────┬──────────┬───────────────┤
│  Numéro  │  Date     │  Objet           │  Statut  │  Assigné à    │
├──────────┼───────────┼──────────────────┼──────────┼───────────────┤
│ENT-0043  │ 21/07/26  │ Demande agrément │ PENDING  │ Konan A.      │
│ENT-0042  │ 20/07/26  │ Facture fourniss.│PROCESSING│ Yao B.        │
│ENT-0041  │ 19/07/26  │ Rapport mensuel  │PROCESSED │ Ahou C.       │
│ENT-0040  │ 18/07/26  │ Décision DGAL    │ ARCHIVED │ —             │
└──────────┴───────────┴──────────────────┴──────────┴───────────────┘
```

---

## 4. Workflow de traitement du courrier

Chaque courrier suit un cycle de vie standardisé à 4 états :

```
  PENDING ──────► PROCESSING ──────► PROCESSED ──────► ARCHIVED
  (En attente)    (En cours)          (Traité)           (Archivé)
     │                │                   │                  │
     │                │                   │                  │
  Courrier         Agent                Validé            Archivage
  enregistré       en cours             par N+1           automatique
  et assigné       de traiter                             ou manuel
```

| État | Couleur | Signification |
|------|---------|--------------|
| **PENDING** | 🟡 Orange | Courrier enregistré, en attente de prise en charge |
| **PROCESSING** | 🔵 Bleu | En cours de traitement par l'agent assigné |
| **PROCESSED** | 🟢 Vert | Traitement terminé, en attente d'archivage |
| **ARCHIVED** | ⚫ Gris | Archivé, consultable mais non modifiable |

### Changer l'état d'un courrier

1. Ouvrez la fiche du courrier
2. Cliquez sur le bouton de statut actuel
3. Sélectionnez le nouveau statut dans la liste
4. Ajoutez un commentaire de transition (obligatoire pour PROCESSED)
5. Confirmez

---

## 5. Uploader et organiser vos documents (GED)

`Documents > Mes documents`

### 5.1 Uploader un document

1. Cliquez sur **+ Nouveau document** ou glissez-déposez un fichier dans la zone prévue
2. Renseignez les métadonnées :
   - **Titre** : nom lisible du document
   - **Type** : Rapport, Contrat, Facture, Procédure, etc.
   - **Dossier de destination** : sélectionnez dans l'arborescence
   - **Niveau de confidentialité** : voir section 7
   - **Tags** : mots-clés pour la recherche
3. Cliquez sur **Téléverser**

> **[i] Information**  
> Formats acceptés : PDF, DOCX, XLSX, PPTX, JPEG, PNG, MP4. Taille maximale par fichier : 50 Mo. Stockage total selon abonnement.

### 5.2 Versionning automatique

Chaque fois qu'un document est modifié et re-téléversé sur la même fiche, SECRETIS conserve l'historique des versions. Accédez aux versions via l'onglet **Versions** de la fiche document.

---

## 6. Créer une arborescence de dossiers

`Documents > Mes documents > Nouveau dossier`

**Exemple d'arborescence recommandée :**

```
📁 Organisation
  ├── 📁 Direction Générale
  │     ├── 📁 Rapports de direction
  │     ├── 📁 Décisions
  │     └── 📁 Correspondances
  ├── 📁 Ressources Humaines
  │     ├── 📁 Contrats
  │     ├── 📁 Procédures RH
  │     └── 📁 Formations
  ├── 📁 Finance & Comptabilité
  │     ├── 📁 Factures
  │     └── 📁 Rapports financiers
  └── 📁 Courrier archivé
        ├── 📁 2024
        ├── 📁 2025
        └── 📁 2026
```

Pour créer un dossier :
1. Naviguez vers le dossier parent
2. Cliquez sur **+ Nouveau dossier**
3. Saisissez le **nom** du dossier
4. Définissez les **permissions** d'accès (héritées du parent ou personnalisées)
5. Cliquez sur **Créer**

---

## 7. Définir les niveaux de confidentialité

| Niveau | Icône | Accès |
|--------|-------|-------|
| **Public** | 🔓 | Tous les utilisateurs de l'organisation |
| **Interne** | 🔒 | Membres du département concerné |
| **Confidentiel** | 🔐 | Utilisateurs explicitement autorisés |
| **Secret** | 🔑 | Administrateur et propriétaire uniquement |

> **[!] Attention**  
> Un document marqué **Secret** ne peut pas être partagé via le lien standard. Seule une invitation nominative permet l'accès.

---

## 8. Créer et utiliser des modèles de documents

`Documents > Modèles > Nouveau modèle`

### 8.1 Créer un modèle

1. Cliquez sur **+ Nouveau modèle**
2. Saisissez le **nom** du modèle (ex : "Lettre de convocation officielle")
3. Sélectionnez la **catégorie** (Lettre, Rapport, Contrat, etc.)
4. Rédigez le contenu dans l'éditeur avec les **variables dynamiques** :

| Variable | Valeur insérée automatiquement |
|----------|-------------------------------|
| `{{date}}` | Date du jour (JJ/MM/AAAA) |
| `{{organisation}}` | Nom de l'organisation |
| `{{expediteur_nom}}` | Nom de l'agent qui génère le document |
| `{{destinataire_nom}}` | Nom du destinataire |
| `{{ref}}` | Numéro de référence auto-généré |
| `{{objet}}` | Objet saisi lors de la génération |

5. Cliquez sur **Enregistrer le modèle**

### 8.2 Utiliser un modèle

1. Dans `Documents > Nouveau document`, cliquez sur **Depuis un modèle**
2. Sélectionnez le modèle souhaité
3. Renseignez les variables demandées
4. Le document est généré — vous pouvez le modifier dans l'éditeur
5. Exportez en PDF ou Word

---

## 9. Partager un document de façon sécurisée

Depuis la fiche d'un document :

1. Cliquez sur **Partager**
2. Choisissez le mode de partage :
   - **Utilisateurs internes** : sélectionnez des utilisateurs ou groupes
   - **Lien externe sécurisé** : génère un lien avec expiration et mot de passe optionnel
3. Définissez les **droits** : Lecture seule, Commentaire, ou Modification
4. Définissez la **date d'expiration** du partage
5. Cliquez sur **Partager**

> **[!] Attention**  
> Les liens de partage externe doivent être utilisés avec discernement. N'envoyez jamais un lien pour un document confidentiel sans protection par mot de passe.

---

## 10. Rechercher dans la GED

`Documents > Recherche avancée`

```
┌─────────────────────────────────────────────────────────────────┐
│  RECHERCHE DOCUMENTAIRE                                         │
├─────────────────────────────────────────────────────────────────┤
│  Recherche plein texte : [_______________________________]      │
│                                                                 │
│  Filtres avancés :                                              │
│  Type de document  : [▼ Tous       ]                           │
│  Date (de)         : [__________]  à  [__________]             │
│  Auteur            : [▼ Tous       ]                            │
│  Dossier           : [▼ Tous       ]                            │
│  Niveau conf.      : [▼ Tous       ]                            │
│  Tags              : [_______________]                          │
│                                                                 │
│  [  Rechercher  ]                                               │
└─────────────────────────────────────────────────────────────────┘
```

La recherche plein texte analyse le contenu des documents (PDF avec texte, DOCX, etc.) et pas uniquement les métadonnées.

> **[SARA]**  
> Vous pouvez demander à SARA : "Trouve le contrat de prestation avec IBIG Technologies signé en 2025." SARA interroge la GED et vous retourne les résultats pertinents.

---

*Fin du chapitre 03 — Courrier & GED*

[← Chapitre précédent : 02 — Agenda & Planning](02-agenda-planning.md) | [Chapitre suivant : 04 — Réunions →](04-reunions.md)
