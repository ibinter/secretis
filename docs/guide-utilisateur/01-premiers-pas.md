# Guide Utilisateur IBIG SECRETIS — Chapitre 01 : Premiers pas

> **Module** : Onboarding & Configuration initiale  
> **Profils concernés** : Tous les utilisateurs, Administrateur  
> **Durée estimée** : 30 à 60 minutes

---

## 1. Créer votre compte et votre organisation

### 1.1 Inscription de l'organisation

Avant que vos collaborateurs puissent accéder à SECRETIS, l'administrateur principal doit créer l'organisation.

```
┌─────────────────────────────────────────────────────────────┐
│              IBIG SECRETIS — Inscription                    │
├─────────────────────────────────────────────────────────────┤
│  Nom de l'organisation : [________________________]         │
│  Secteur d'activité    : [▼ Sélectionner          ]         │
│  Pays                  : [▼ Sélectionner          ]         │
│  Nombre d'employés     : [▼ Sélectionner          ]         │
│  Email administrateur  : [________________________]         │
│  Mot de passe          : [________________________]         │
│  Confirmer mot de passe: [________________________]         │
│                                                             │
│  [   Créer mon organisation   ]                             │
└─────────────────────────────────────────────────────────────┘
```

**Étapes :**

1. Rendez-vous sur `https://app.ibig-secretis.com/register`
2. Renseignez le **Nom de l'organisation** (ex : "Mairie de Daloa")
3. Sélectionnez votre **Secteur d'activité** dans la liste déroulante
4. Sélectionnez votre **Pays**
5. Indiquez le **nombre d'employés** approximatif
6. Saisissez l'**adresse email** de l'administrateur principal
7. Créez un **mot de passe** fort (minimum 8 caractères, 1 majuscule, 1 chiffre)
8. Cliquez sur **Créer mon organisation**
9. Vérifiez votre boîte email et cliquez sur le lien de confirmation

> **[!] Attention**  
> L'email administrateur sera l'identifiant permanent du compte principal. Choisissez une adresse email institutionnelle (ex : admin@mairie-daloa.ci) et non une adresse personnelle.

### 1.2 Première connexion

```
┌─────────────────────────────────────────────────────────────┐
│              IBIG SECRETIS — Connexion                      │
├─────────────────────────────────────────────────────────────┤
│  Email    : [________________________]                      │
│  Mot de passe : [____________________]                      │
│  [ ] Se souvenir de moi                                     │
│                                                             │
│  [        Se connecter        ]                             │
│                                                             │
│  Mot de passe oublié ?                                      │
└─────────────────────────────────────────────────────────────┘
```

1. Accédez à `https://app.ibig-secretis.com`
2. Saisissez votre **email** et votre **mot de passe**
3. Cochez **Se souvenir de moi** pour rester connecté 30 jours
4. Cliquez sur **Se connecter**

Au premier login, la visite guidée interactive se lance automatiquement. Vous pouvez la suivre ou l'ignorer (elle sera disponible dans `Aide > Visite guidée`).

---

## 2. Configuration initiale obligatoire

Avant d'inviter vos collaborateurs, configurez les éléments fondamentaux de votre organisation.

Accédez à : `Administration > Paramètres > Organisation`

### 2.1 Identité visuelle

```
┌─────────────────────────────────────────────────────────────┐
│  Logo de l'organisation                                     │
│  ┌─────────────┐                                           │
│  │   [LOGO]    │  [Télécharger un logo]                    │
│  └─────────────┘  Format : PNG/SVG, max 2 Mo               │
│                                                             │
│  Couleur principale : [#1E40AF ▐▐▐▐▐]                      │
│  Couleur secondaire : [#F59E0B ▐▐▐▐▐]                      │
└─────────────────────────────────────────────────────────────┘
```

1. Cliquez sur **Télécharger un logo** et sélectionnez votre logo (PNG ou SVG recommandé)
2. Définissez la **couleur principale** de votre organisation (code hexadécimal)
3. Cliquez sur **Enregistrer**

### 2.2 Paramètres régionaux

| Paramètre | Valeur recommandée (exemple) |
|-----------|------------------------------|
| Devise | XOF — Franc CFA |
| Fuseau horaire | Africa/Abidjan (UTC+0) |
| Format de date | JJ/MM/AAAA |
| Langue | Français |
| Premier jour de la semaine | Lundi |

### 2.3 Numérotation des courriers

Définissez la convention de numérotation automatique :

- **Format entrant** : `ENT-YYYY-NNNN` (ex : ENT-2026-0001)
- **Format sortant** : `SRT-YYYY-NNNN` (ex : SRT-2026-0001)
- **Compteur de départ** : 1 (ou numéro de continuation si vous migrez)

> **[ASTUCE]**  
> Configurez la numérotation AVANT d'enregistrer le premier courrier. Elle ne peut pas être modifiée rétroactivement sans intervention de l'administrateur.

### 2.4 Activer les services et modules

Naviguez vers `Administration > Modules` et activez les modules correspondant à votre abonnement :

| Module | Description | Recommandé pour |
|--------|-------------|-----------------|
| Agenda & Calendrier | Gestion des événements et réservations | Tous |
| Courrier & GED | Registre du courrier et gestion documentaire | Tous |
| Réunions | Planification et compte-rendus | Tous |
| Tâches & Projets | Gestion de projet Kanban/Gantt | Équipes projet |
| Communication | Messagerie, circulaires, annuaire | Tous |
| Accueil Visiteurs | Enregistrement et gestion des visiteurs | Accueil |
| Ressources | Salles, matériel, véhicules | Logistique |
| RH Léger | Congés, notes de frais, organigramme | RH |
| Rapports | Tableaux de bord et exports | Managers |
| SARA (IA) | Assistante intelligente | Recommandé |

---

## 3. Inviter les premiers utilisateurs

`Administration > Utilisateurs > Inviter`

```
┌─────────────────────────────────────────────────────────────┐
│  Inviter un utilisateur                                     │
├─────────────────────────────────────────────────────────────┤
│  Prénom        : [________________]                         │
│  Nom           : [________________]                         │
│  Email         : [________________]                         │
│  Département   : [▼ Sélectionner ]                          │
│  Rôle          : [▼ Sélectionner ]                          │
│  Poste         : [________________]                         │
│                                                             │
│  [  Envoyer l'invitation  ]  [  Inviter en masse  ]         │
└─────────────────────────────────────────────────────────────┘
```

**Rôles disponibles :**

| Rôle | Accès |
|------|-------|
| `super_admin` | Accès total à tous les modules et la configuration |
| `admin` | Gestion des utilisateurs et de la configuration |
| `manager` | Supervision de son département, validation |
| `agent` | Accès aux modules métier selon permissions |
| `viewer` | Lecture seule — consultation sans modification |

> **[ASTUCE]**  
> Pour inviter plusieurs utilisateurs à la fois, utilisez **Inviter en masse** et importez un fichier Excel avec les colonnes : Prénom, Nom, Email, Département, Rôle.

L'utilisateur invité reçoit un email avec un lien d'activation valable 72 heures. Il définit lui-même son mot de passe lors de sa première connexion.

---

## 4. Tour guidé du tableau de bord

Au premier login, SECRETIS affiche le tableau de bord principal. Voici les zones clés :

```
┌────────────────────────────────────────────────────────────────────┐
│ [≡] IBIG SECRETIS    [🔔 3]  [👤 Konan A.]  [SARA ✨]            │
├──────────────┬─────────────────────────────────────────────────────┤
│              │  Bonjour, Konan ! Voici votre journée              │
│  NAVIGATION  ├───────────────┬────────────────┬───────────────────┤
│  📅 Agenda   │ ÉVÉNEMENTS    │ COURRIERS       │ TÂCHES            │
│  📬 Courrier │ Aujourd'hui   │ En attente      │ À faire           │
│  🤝 Réunions │ ──────────    │ ──────────      │ ──────────        │
│  ✅ Tâches   │  3 réunions   │  7 non traités  │  5 en retard      │
│  💬 Comms    ├───────────────┴────────────────┴───────────────────┤
│  🏛️ Accueil  │           ACTIVITÉ RÉCENTE                         │
│  🏢 Ressourc │  • Konan A. a enregistré le courrier ENT-2026-0042 │
│  👥 RH       │  • Réunion COMEX ajoutée pour demain 09h00         │
│  📊 Rapports │  • Décision #12 marquée comme réalisée             │
│  ⚙️ Admin    │                                                    │
│              ├────────────────────────────────────────────────────┤
│              │  SARA : "Vous avez 2 réunions demain. Souhaitez-  │
│              │  vous préparer les ordres du jour ?" [Oui] [Non]  │
└──────────────┴────────────────────────────────────────────────────┘
```

**Zones du tableau de bord :**

- **Barre supérieure** : notifications, profil utilisateur, accès rapide à SARA
- **Menu latéral** : navigation principale vers tous les modules
- **Tuiles de synthèse** : compteurs en temps réel (événements, courriers, tâches)
- **Fil d'activité** : journal des dernières actions de l'équipe
- **Zone SARA** : suggestions et alertes de l'assistante IA

---

## 5. Installation PWA sur mobile

SECRETIS est disponible comme application mobile sans passer par un app store.

### Sur Android (Chrome)
1. Ouvrez `https://app.ibig-secretis.com` dans Chrome
2. Appuyez sur le menu **⋮** (trois points) en haut à droite
3. Sélectionnez **Ajouter à l'écran d'accueil**
4. Confirmez en appuyant sur **Ajouter**
5. L'icône SECRETIS apparaît sur votre écran d'accueil

### Sur iPhone (Safari)
1. Ouvrez `https://app.ibig-secretis.com` dans Safari
2. Appuyez sur l'icône de partage **□↑** en bas de l'écran
3. Faites défiler et appuyez sur **Sur l'écran d'accueil**
4. Confirmez en appuyant sur **Ajouter**

> **[i] Information**  
> La PWA fonctionne hors ligne en mode consultation. Les modifications sont synchronisées automatiquement à la reconnexion.

---

## 6. Activation de SARA

SARA (Secrétaire Artificielle Responsive et Autonome) est l'assistante IA de SECRETIS. Pour l'activer :

1. Naviguez vers `Administration > Intégrations > Intelligence Artificielle`
2. Cliquez sur **Activer SARA**
3. Sélectionnez le fournisseur IA configuré par votre administrateur
4. Cliquez sur **Tester la connexion**
5. Si le test est concluant, cliquez sur **Enregistrer**

> **[ADMIN]** L'activation de SARA nécessite une clé API IA configurée par l'administrateur dans les paramètres d'intégration.

**Capacités de SARA :**

| Capacité | Description |
|----------|-------------|
| Recherche de créneaux | Trouve automatiquement les disponibilités communes |
| Synthèse de réunion | Extrait les décisions et actions du compte rendu |
| Rédaction assistée | Aide à rédiger courriers, circulaires et comptes rendus |
| Alertes prioritaires | Identifie et notifie les urgences du jour |
| Questions/Réponses | Répond aux questions sur le fonctionnement de SECRETIS |

**Accéder à SARA** : cliquez sur le bouton **SARA ✨** dans la barre supérieure ou utilisez le raccourci `Ctrl+Espace`.

---

*Fin du chapitre 01 — Premiers pas*

[← Chapitre précédent : 00 — Introduction](00-introduction.md) | [Chapitre suivant : 02 — Agenda & Planning →](02-agenda-planning.md)
