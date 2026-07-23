# Guide Utilisateur IBIG SECRETIS — Version 1.0
> Document officiel — IBIG Soft © 2026 — Tous droits réservés

---

## Table des matières

- [PARTIE 1 — DÉMARRAGE](#partie-1--démarrage)
- [PARTIE 2 — MODULE AGENDA](#partie-2--module-agenda)
- [PARTIE 3 — COURRIER & GED](#partie-3--courrier--ged)
- [PARTIE 4 — RÉUNIONS](#partie-4--réunions)
- [PARTIE 5 — TÂCHES & PROJETS](#partie-5--tâches--projets)
- [PARTIE 6 — COMMUNICATION](#partie-6--communication)
- [PARTIE 7 — RÉCEPTION & VISITEURS](#partie-7--réception--visiteurs)
- [PARTIE 8 — RESSOURCES & PARC AUTO](#partie-8--ressources--parc-auto)
- [PARTIE 9 — RH LÉGÈRE](#partie-9--rh-légère)
- [PARTIE 10 — RAPPORTS & BI](#partie-10--rapports--bi)
- [PARTIE 11 — PARAMÈTRES](#partie-11--paramètres)
- [PARTIE 12 — ASSISTANT SARA](#partie-12--assistant-sara)
- [PARTIE 13 — ADMINISTRATION AVANCÉE](#partie-13--administration-avancée)
- [PARTIE 14 — SÉCURITÉ & LICENCE](#partie-14--sécurité--licence)
- [PARTIE 15 — DÉPANNAGE](#partie-15--dépannage)

---

# PARTIE 1 — DÉMARRAGE

## 1.1 Présentation d'IBIG SECRETIS

**Objectif :** Comprendre ce qu'est IBIG SECRETIS, ses modules et sa philosophie.

**Utilisateurs concernés :** Tous les utilisateurs, en particulier les administrateurs et décideurs.

**Prérequis :** Aucun.

### Qu'est-ce qu'IBIG SECRETIS ?

IBIG SECRETIS est un ERP (Enterprise Resource Planning) de secrétariat général et de gestion administrative conçu par IBIG Soft pour les organisations africaines et francophones. Il centralise dans une seule plateforme cloud l'ensemble des processus administratifs d'une organisation : courrier, agenda, réunions, GED, tâches, RH légère, accueil des visiteurs, ressources et parc auto.

**Modules principaux :**
- **Agenda & Planification** : gestion des événements, réunions et salles
- **Courrier & GED** : gestion électronique des documents et du courrier
- **Réunions** : planification, compte-rendu IA, actions de suivi
- **Tâches & Projets** : kanban, Gantt, feuilles de temps
- **Communication** : messagerie interne, circulaires, tableau d'affichage
- **Réception & Visiteurs** : accueil, QR codes, registre
- **Ressources & Parc Auto** : salles, matériel, flotte, GPS
- **RH Légère** : personnel, congés, notes de frais
- **Rapports & BI** : tableaux de bord analytiques
- **SARA** : assistante IA intégrée

**Conformité :** SYSCOHADA, OHADA, RGPD, ISO 9001.

**Résultat attendu :** Vous avez une vision claire de la plateforme et de ses capacités.

---

## 1.2 Prérequis (navigateurs supportés, résolutions)

**Objectif :** Vérifier la compatibilité de votre environnement avant de commencer.

**Utilisateurs concernés :** Tous les utilisateurs.

**Navigateurs supportés :**

| Navigateur | Version minimale | Recommandé |
|---|---|---|
| Google Chrome | 110+ | Oui |
| Mozilla Firefox | 110+ | Oui |
| Microsoft Edge | 110+ | Oui |
| Safari | 16+ | Oui (macOS/iOS) |
| Opera | 95+ | Oui |
| Internet Explorer | Non supporté | Non |

**Résolutions d'écran supportées :**
- Minimum : 1024 × 768 px
- Recommandé bureau : 1366 × 768 px ou supérieur
- Full HD : 1920 × 1080 px (optimal)
- Mobile : 375 px et plus (interface responsive)
- Tablette : 768 px et plus

**Connexion Internet :**
- Minimale : 2 Mbps
- Recommandée : 10 Mbps et plus
- Pour la vidéoconférence intégrée : 5 Mbps minimum

**Activation JavaScript :** Obligatoire. SECRETIS est une application JavaScript moderne (React/Inertia).

**Cookies :** Doivent être activés pour la session et les préférences.

**Erreurs fréquentes :**
- Page blanche au chargement → vérifiez que JavaScript est activé
- Problèmes d'affichage → mettez à jour votre navigateur

**Conseils :** Utilisez Chrome ou Firefox pour la meilleure expérience. Videz le cache (`Ctrl+Shift+Del`) si vous rencontrez des problèmes après une mise à jour.

---

## 1.3 Première connexion et sécurisation du compte

**Objectif :** Se connecter pour la première fois et sécuriser son compte.

**Utilisateurs concernés :** Tous les utilisateurs lors de leur premier accès.

**Prérequis :** Avoir reçu une invitation par email.

### Procédure pas à pas

1. Ouvrez l'email d'invitation reçu de `noreply@ibigsoft.com`.
2. Cliquez sur le bouton **"Accepter l'invitation"** dans l'email.
3. Vous êtes redirigé vers la page de création de mot de passe.
4. Saisissez un mot de passe respectant les critères :
   - Minimum 8 caractères
   - Au moins une majuscule
   - Au moins un chiffre
   - Au moins un caractère spécial (@, #, !, etc.)
5. Confirmez le mot de passe.
6. Cliquez sur **"Créer mon compte"**.
7. Vous êtes automatiquement connecté et redirigé vers le wizard d'onboarding.

### Sécuriser votre compte après connexion

1. Accédez à **Profil → Sécurité** (icône avatar en haut à droite).
2. Activez l'**authentification à deux facteurs (MFA)** en cliquant sur "Activer le MFA".
3. Scannez le QR code avec Google Authenticator ou Authy.
4. Saisissez le code à 6 chiffres affiché pour valider.
5. Conservez précieusement les **codes de secours** affichés.

**Résultat attendu :** Vous êtes connecté et votre compte est sécurisé avec MFA.

**Erreurs fréquentes :**
- Lien d'invitation expiré (valable 72h) → demandez une nouvelle invitation à votre admin
- Mot de passe refusé → vérifiez qu'il respecte tous les critères

**Permissions nécessaires :** Aucune permission particulière — tout utilisateur invité peut réaliser ces étapes.

---

## 1.4 Configuration initiale de votre organisation

**Objectif :** Paramétrer les informations de base de votre organisation.

**Utilisateurs concernés :** Administrateur système (Super Admin ou Admin).

**Prérequis :** Être connecté avec un compte Administrateur.

### Procédure pas à pas

1. Accédez à **Paramètres → Organisation** dans le menu principal.
2. Renseignez les champs obligatoires :
   - **Nom complet** de l'organisation
   - **Pays**
   - **Secteur d'activité**
   - **Email de contact**
   - **Numéro de téléphone**
3. Renseignez les informations légales :
   - RCCM (Registre du Commerce)
   - Numéro fiscal
   - Adresse du siège
4. Définissez les préférences :
   - **Langue par défaut** : Français, Anglais
   - **Devise** : XOF, XAF, EUR, USD, etc.
   - **Fuseau horaire** : Africa/Abidjan, Africa/Dakar, etc.
   - **Format de date** : JJ/MM/AAAA ou MM/DD/YYYY
5. Cliquez sur **"Enregistrer"**.

**Résultat attendu :** Les informations de votre organisation sont configurées et apparaissent sur tous les documents générés.

**Erreurs fréquentes :**
- Certains champs semblent vides après sauvegarde → rechargez la page (F5)

**Permissions nécessaires :** `settings.organization.edit` (Admin uniquement).

---

## 1.5 Ajout des premiers utilisateurs et attribution des rôles

**Objectif :** Inviter les membres de votre équipe et leur attribuer les bons rôles.

**Utilisateurs concernés :** Administrateur.

**Prérequis :** Organisation configurée (section 1.4).

### Procédure pas à pas

1. Accédez à **Paramètres → Utilisateurs → Inviter**.
2. Saisissez l'**adresse email** de la personne à inviter.
3. Sélectionnez son **rôle** dans la liste :
   - **Super Admin** : accès complet, gestion des licences
   - **Admin** : administration de l'organisation
   - **Manager** : gestion des équipes et projets
   - **Employé** : accès aux modules quotidiens
   - **Réceptionniste** : module accueil visiteurs
   - **Lecteur** : consultation uniquement
4. Sélectionnez éventuellement le **département** ou le **service**.
5. Ajoutez un **message personnalisé** (optionnel).
6. Cliquez sur **"Envoyer l'invitation"**.
7. L'utilisateur reçoit un email et a 72h pour accepter.

### Invitation en masse

1. Cliquez sur **"Importer des utilisateurs"**.
2. Téléchargez le modèle CSV fourni.
3. Remplissez le fichier (email, prénom, nom, rôle, département).
4. Importez le fichier.
5. Validez l'aperçu et confirmez.

**Résultat attendu :** Les utilisateurs reçoivent leurs invitations et peuvent se connecter.

**Erreurs fréquentes :**
- Email déjà utilisé → l'utilisateur a déjà un compte, réinitialisez son rôle
- Fichier CSV mal formaté → utilisez strictement le modèle fourni

**Permissions nécessaires :** `users.invite`, `users.roles.assign`.

---

## 1.6 Paramétrage de la devise et du fuseau horaire

**Objectif :** Assurer que toutes les transactions et horodatages sont cohérents.

**Utilisateurs concernés :** Administrateur.

**Procédure pas à pas :**

1. Accédez à **Paramètres → Organisation → Préférences**.
2. **Devise :**
   - Sélectionnez la devise principale (XOF, XAF, GNF, EUR, USD…)
   - Choisissez le format d'affichage (1 000 000 XOF ou XOF 1,000,000)
3. **Fuseau horaire :**
   - Sélectionnez votre fuseau (ex : `Africa/Abidjan` UTC+0, `Africa/Douala` UTC+1, `Africa/Nairobi` UTC+3)
   - Tous les horodatages du système s'alignent automatiquement
4. **Format de date :** JJ/MM/AAAA (recommandé pour la zone OHADA)
5. **Format d'heure :** 24h ou 12h AM/PM
6. Cliquez sur **"Enregistrer"**.

**Conseil :** Le fuseau horaire affecte les emails de rappel, les exports de rapports et les horodatages d'audit. Choisissez soigneusement.

---

## 1.7 Configuration du logo et de l'identité de l'organisation

**Objectif :** Personnaliser SECRETIS aux couleurs de votre organisation.

**Utilisateurs concernés :** Administrateur.

**Procédure pas à pas :**

1. Accédez à **Paramètres → Organisation → Identité visuelle**.
2. **Logo :**
   - Cliquez sur "Téléverser un logo"
   - Format accepté : PNG ou SVG, fond transparent recommandé
   - Taille maximale : 2 MB — Dimensions recommandées : 300 × 100 px
3. **Favicon :** icône 32×32 px affichée dans l'onglet navigateur.
4. **Couleurs de la charte :**
   - Couleur principale (utilisée dans les en-têtes et boutons)
   - Couleur secondaire
   - Entrez les codes HEX (#1A3C8F par exemple)
5. **Pied de page des documents :** texte libre affiché sur les PDF générés.
6. Cliquez sur **"Aperçu"** pour visualiser avant de sauvegarder.
7. Cliquez sur **"Enregistrer"**.

**Résultat attendu :** Le logo apparaît dans l'en-tête de l'application et sur tous les documents PDF générés (courriers, comptes-rendus, rapports).

---

## 1.8 Visite du tableau de bord

**Objectif :** Comprendre et utiliser le tableau de bord principal.

**Utilisateurs concernés :** Tous les utilisateurs.

### Zones du tableau de bord

**En-tête :**
- Logo organisation + nom
- Barre de recherche globale (Ctrl+K)
- Notifications (cloche)
- Avatar profil

**Menu latéral gauche :**
- Icônes des modules actifs
- Indicateur de module actif
- Réductible pour plus d'espace de travail

**Zone centrale — Widgets :**
- **Mes tâches du jour** : tâches assignées avec échéance aujourd'hui
- **Prochains événements** : agenda des 48 prochaines heures
- **Courriers en attente** : courriers nécessitant une action
- **Réunions à venir** : prochaines réunions planifiées
- **Activité récente** : flux des dernières actions dans l'org
- **Statistiques rapides** : KPIs de l'organisation

**Barre inférieure droite :**
- Bouton SARA (assistante IA)
- Widget onboarding (les 30 premiers jours)

### Personnaliser le tableau de bord

1. Cliquez sur **"Personnaliser"** (icône crayon, en haut à droite du dashboard).
2. Activez/désactivez les widgets par glisser-déposer.
3. Réorganisez l'ordre selon vos préférences.
4. Cliquez sur **"Sauvegarder la disposition"**.

---

## 1.9 Navigation dans les menus

**Objectif :** Maîtriser la navigation dans SECRETIS.

**Structure de navigation :**

```
Menu latéral (icônes)
├── Tableau de bord
├── Agenda
├── Courrier / GED
├── Réunions
├── Tâches & Projets
├── Communication
├── Réception
├── Ressources
├── RH
├── Rapports
├── Paramètres (Admin uniquement)
└── Centre d'aide
```

**Raccourcis clavier :**

| Raccourci | Action |
|---|---|
| `Ctrl + K` | Recherche globale |
| `Ctrl + N` | Nouvelle tâche/événement (contextuel) |
| `?` | Afficher tous les raccourcis |
| `Esc` | Fermer modal / panneau |
| `G + D` | Aller au Dashboard |
| `G + A` | Aller à l'Agenda |

**Fil d'Ariane :** Visible en haut de chaque page, il vous indique votre position dans l'application.

---

## 1.10 Personnalisation de votre espace

**Objectif :** Adapter l'interface à vos préférences personnelles.

**Procédure :**

1. Cliquez sur votre **avatar** (en haut à droite).
2. Sélectionnez **"Mon profil"**.
3. Modifiez :
   - Photo de profil (JPEG/PNG, max 1 MB)
   - Prénom, nom, titre de poste
   - Langue d'interface (FR/EN)
   - Thème : Clair | Sombre | Système
   - Format d'affichage des dates et heures
4. **Notifications :** configurez vos alertes préférées (email, push, in-app).
5. Cliquez sur **"Enregistrer le profil"**.

---

# PARTIE 2 — MODULE AGENDA

## 2.1 Créer et gérer un événement

**Objectif :** Créer et gérer des événements dans l'agenda.

**Utilisateurs concernés :** Tous les utilisateurs.

**Prérequis :** Être connecté avec au minimum le rôle Employé.

### Créer un événement

1. Cliquez sur **Agenda** dans le menu latéral.
2. Cliquez sur **"+ Nouvel événement"** ou directement sur un créneau dans le calendrier.
3. Remplissez le formulaire :
   - **Titre** (obligatoire)
   - **Date et heure de début / fin**
   - **Type** : Réunion | Événement | Rappel | Tâche | Autre
   - **Lieu** : salle physique ou lien visioconférence
   - **Description**
   - **Participants** (voir 2.2)
   - **Récurrence** : aucune, quotidien, hebdomadaire, mensuel, personnalisé
   - **Rappels** : 15 min, 30 min, 1h, 1 jour avant
4. Cliquez sur **"Créer l'événement"**.

### Modifier un événement

1. Cliquez sur l'événement dans le calendrier.
2. Cliquez sur **"Modifier"** (icône crayon).
3. Modifiez les champs souhaités.
4. Pour un événement récurrent : choisissez "Modifier uniquement cet événement" ou "Modifier tous les événements suivants".
5. Cliquez sur **"Enregistrer"**.

**Résultat attendu :** L'événement apparaît dans l'agenda et les participants reçoivent une notification.

**Permissions nécessaires :** `agenda.events.create`, `agenda.events.edit`.

---

## 2.2 Inviter des participants

**Objectif :** Ajouter des participants à un événement.

**Procédure :**

1. Dans le formulaire de création/édition d'un événement.
2. Champ **"Participants"** : tapez le nom ou l'email d'un utilisateur de votre organisation.
3. Sélectionnez dans la liste suggérée.
4. Pour des **invités externes** : saisissez l'email complet et appuyez sur Entrée.
5. Définissez le statut de chaque participant : **Obligatoire** | **Optionnel**.
6. Activez **"Envoyer les invitations"** pour notifier par email.

**Résultat attendu :** Les participants reçoivent une invitation et peuvent accepter/refuser depuis l'email ou l'application.

---

## 2.3 Gérer les salles de réunion

**Objectif :** Réserver et gérer les salles de réunion disponibles.

**Utilisateurs concernés :** Tous les utilisateurs (réservation) ; Admin (gestion des salles).

### Ajouter une salle (Admin)

1. Accédez à **Ressources → Salles → + Nouvelle salle**.
2. Renseignez : Nom, Capacité, Équipements (projecteur, vidéo, tableau), Photo.
3. Définissez les **règles de réservation** : durée max, préavis minimum.
4. Cliquez sur **"Enregistrer"**.

### Réserver une salle

1. Dans un événement, cliquez sur **"Réserver une salle"**.
2. Filtrez par capacité, équipements, disponibilité.
3. Cliquez sur la salle disponible.
4. Confirmez la réservation.

**Résultat attendu :** La salle est réservée et bloquée dans l'agenda des ressources.

---

## 2.4 Synchronisation Google Calendar

**Objectif :** Synchroniser l'agenda SECRETIS avec Google Calendar.

**Prérequis :** Avoir un compte Google Workspace ou Gmail ; Admin doit avoir activé l'intégration Google.

**Procédure :**

1. Accédez à **Paramètres → Intégrations → Google Calendar**.
2. Cliquez sur **"Connecter mon Google Calendar"**.
3. Authentifiez-vous avec votre compte Google.
4. Accordez les permissions demandées.
5. Choisissez le sens de synchronisation :
   - SECRETIS → Google (export)
   - Google → SECRETIS (import)
   - Bidirectionnel (recommandé)
6. Cliquez sur **"Activer la synchronisation"**.

**Résultat attendu :** Les événements SECRETIS apparaissent dans Google Calendar et vice-versa.

**Erreurs fréquentes :**
- Autorisation refusée → vérifiez que votre admin Google autorise les applications tierces

---

## 2.5 Programmer des rappels

**Objectif :** Ne jamais manquer un événement important.

**Procédure :**

1. Dans un événement, section **"Rappels"**.
2. Cliquez sur **"+ Ajouter un rappel"**.
3. Choisissez le délai : 5 min | 15 min | 30 min | 1h | 2h | 1 jour | 1 semaine.
4. Choisissez le canal : Notification in-app | Email | SMS (si configuré).
5. Ajoutez plusieurs rappels si nécessaire.
6. Sauvegardez l'événement.

---

## 2.6 Vue jour / semaine / mois

**Objectif :** Naviguer entre les différentes vues du calendrier.

**Vues disponibles :**
- **Jour** : vue détaillée heure par heure
- **Semaine** : vue 7 jours (Lun–Dim)
- **Mois** : vue mensuelle avec aperçu des événements
- **Agenda** : liste chronologique

**Navigation :**
- Flèches gauche/droite : période précédente/suivante
- Bouton **"Aujourd'hui"** : revenir à la date du jour
- Clic sur une date dans le mini-calendrier latéral

**Filtres :**
- Par type d'événement
- Par participant
- Par salle/ressource

---

# PARTIE 3 — COURRIER & GED

## 3.1 Enregistrer un courrier entrant

**Objectif :** Enregistrer officiellement un courrier reçu dans le système.

**Utilisateurs concernés :** Secrétaire, Assistante de direction, Réceptionniste.

**Prérequis :** Rôle minimum : Employé avec accès module Courrier.

### Procédure pas à pas

1. Accédez à **Courrier → Entrants → + Nouveau courrier entrant**.
2. Remplissez le formulaire d'enregistrement :
   - **Numéro de référence** (auto-généré ou manuel)
   - **Date de réception** (automatiquement aujourd'hui)
   - **Expéditeur** : nom, organisation, contact
   - **Canal de réception** : Physique | Email | Fax | Coursier
   - **Objet** du courrier
   - **Nature** : Demande | Information | Réclamation | Invitation | Autre
   - **Priorité** : Normale | Urgente | Confidentielle
   - **Destinataire interne** (personne ou service concerné)
3. **Numérisation :** Téléversez le document scanné (PDF, JPEG, PNG).
4. **Indexation IA :** SARA propose automatiquement des mots-clés et une catégorie.
5. Sélectionnez le **dossier de classement** GED.
6. Cliquez sur **"Enregistrer et distribuer"**.

**Résultat attendu :** Le courrier est enregistré avec un numéro d'ordre, classé dans la GED et le destinataire est notifié.

**Permissions nécessaires :** `courrier.incoming.create`.

---

## 3.2 Préparer un courrier sortant

**Objectif :** Rédiger et envoyer un courrier officiel sortant.

**Procédure :**

1. Accédez à **Courrier → Sortants → + Nouveau courrier sortant**.
2. Choisissez un **modèle** de lettre ou commencez de zéro.
3. Remplissez les champs :
   - **Destinataire** : nom, organisation, adresse
   - **Objet**
   - **Corps du courrier** (éditeur riche avec formatage)
   - **Pièces jointes**
4. **Référence** : le numéro est généré automatiquement selon le plan de classement.
5. Vérifiez l'**aperçu PDF** (pré-en-tête avec logo organisation).
6. Choisissez le **circuit de validation** si requis (workflow).
7. Cliquez sur **"Soumettre pour validation"** ou **"Envoyer directement"** selon vos droits.

**Permissions nécessaires :** `courrier.outgoing.create`.

---

## 3.3 Importer un document dans la GED

**Objectif :** Ajouter un document à la bibliothèque documentaire.

**Procédure :**

1. Accédez à **GED → Documents → + Importer**.
2. Glissez-déposez le fichier ou cliquez pour sélectionner.
3. Formats acceptés : PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT (max 50 MB par fichier).
4. Remplissez les métadonnées :
   - **Titre**
   - **Catégorie / Type**
   - **Tags** (mots-clés)
   - **Date du document**
   - **Auteur**
   - **Confidentialité** : Public | Interne | Restreint | Confidentiel
5. Sélectionnez le **dossier de destination**.
6. Cliquez sur **"Importer"**.

**Résultat attendu :** Le document est indexé, consultable et accessible selon les droits configurés.

---

## 3.4 Organiser les dossiers

**Objectif :** Structurer votre arborescence documentaire.

**Procédure :**

1. Accédez à **GED → Dossiers**.
2. **Créer un dossier :** Cliquez sur "+ Nouveau dossier", nommez-le, choisissez l'emplacement parent.
3. **Déplacer des documents :** Sélectionnez le(s) document(s), cliquez sur "Déplacer vers", choisissez le dossier cible.
4. **Renommer :** Clic droit sur le dossier → "Renommer".
5. **Archiver un dossier :** Clic droit → "Archiver" (le dossier devient non-modifiable mais consultable).
6. **Droits d'accès par dossier :** Clic droit → "Gérer les accès" → ajoutez des utilisateurs ou des rôles.

**Conseil :** Adoptez une nomenclature standardisée : `ANNÉE/TYPE_DOCUMENT/OBJET` (ex : `2026/CONTRATS/Fournisseur_ACME`).

---

## 3.5 Partager un document

**Objectif :** Partager un document avec des collègues ou des tiers.

**Procédure (partage interne) :**

1. Ouvrez le document dans la GED.
2. Cliquez sur l'icône **"Partager"**.
3. Tapez le nom de l'utilisateur ou du groupe.
4. Définissez les droits : **Lecture** | **Commentaire** | **Modification**.
5. Cliquez sur **"Partager"**.

**Procédure (lien de partage externe) :**

1. Cliquez sur **"Obtenir un lien"**.
2. Définissez l'expiration du lien (7 jours, 30 jours, jamais).
3. Optionnellement, protégez par mot de passe.
4. Copiez le lien et envoyez-le.

---

## 3.6 Démarrer un workflow de validation

**Objectif :** Soumettre un document à un circuit de validation hiérarchique.

**Prérequis :** Les workflows doivent être configurés par l'Admin (Paramètres → Workflows).

**Procédure :**

1. Ouvrez le document à valider.
2. Cliquez sur **"Soumettre à validation"**.
3. Sélectionnez le **circuit de validation** applicable.
4. Ajoutez un commentaire d'envoi.
5. Cliquez sur **"Démarrer"**.

**Pour les validateurs :**
1. Reçoivent une notification par email et in-app.
2. Ouvrent le document.
3. Cliquent sur **"Approuver"** ou **"Refuser"** avec un commentaire.

**Résultat attendu :** Le document progresse dans le circuit et est finalement approuvé ou retourné.

---

## 3.7 Signer électroniquement un document

**Objectif :** Apposer une signature électronique légale sur un document.

**Prérequis :** Module Signatures activé ; certificat de signature configuré.

**Procédure :**

1. Ouvrez le document PDF dans la GED.
2. Cliquez sur **"Signer électroniquement"**.
3. Placez votre signature sur le document (glisser-déposer du champ signature).
4. Confirmez votre identité (saisie du code MFA ou PIN de signature).
5. Le document est signé et horodaté.
6. Les autres signataires sont notifiés automatiquement.

**Résultat attendu :** Document signé avec valeur juridique, traçabilité complète de la signature.

---

## 3.8 Rechercher dans la GED

**Objectif :** Retrouver rapidement un document parmi des milliers.

**Recherche simple :** Utilisez la barre de recherche globale (Ctrl+K) et tapez le titre ou un mot-clé.

**Recherche avancée :**
1. Dans la GED, cliquez sur **"Recherche avancée"**.
2. Combinez les critères :
   - Texte (titre, contenu, tags)
   - Type de document
   - Date (plage)
   - Auteur
   - Dossier
   - Confidentialité
3. Cliquez sur **"Rechercher"**.

**Résultat attendu :** Les documents correspondants s'affichent avec aperçu et métadonnées.

---

## 3.9 Archivage légal (OHADA)

**Objectif :** Archiver les documents avec valeur probatoire selon le droit OHADA.

**Prérequis :** Module Archivage légal activé.

**Procédure :**

1. Sélectionnez le document à archiver légalement.
2. Cliquez sur **"Archivage légal OHADA"**.
3. Renseignez :
   - **Durée de conservation** (selon la réglementation : 5 ans, 10 ans, permanente)
   - **Catégorie légale** (comptable, contractuel, RH, fiscal…)
   - **Attestation** d'intégrité du document
4. Confirmez l'archivage.

**Résultat attendu :** Document scellé numériquement, horodaté et conservé selon les obligations légales OHADA.

---

# PARTIE 4 — RÉUNIONS

## 4.1 Planifier une réunion

**Objectif :** Organiser une réunion formelle avec ordre du jour et suivi.

**Utilisateurs concernés :** Tous les utilisateurs.

**Procédure :**

1. Accédez à **Réunions → + Nouvelle réunion**.
2. Remplissez le formulaire :
   - **Titre de la réunion**
   - **Type** : Comité de direction | Réunion d'équipe | Réunion projet | Formation | Autre
   - **Date, heure de début et fin**
   - **Lieu** : salle physique ou lien visio (Zoom, Teams, Google Meet)
   - **Ordre du jour** : ajoutez les points à discuter avec les durées estimées
3. Cliquez sur **"Enregistrer"**.

**Permissions nécessaires :** `meetings.create`.

---

## 4.2 Inviter les participants

**Objectif :** Convoquer les participants à une réunion.

**Procédure :**

1. Dans la réunion, onglet **"Participants"**.
2. Ajoutez des participants internes (utilisateurs SECRETIS) ou externes (email).
3. Définissez le rôle : **Président** | **Secrétaire** | **Participant** | **Invité**.
4. Activez **"Envoyer les convocations"**.
5. Personnalisez le corps de l'email de convocation si besoin.
6. Cliquez sur **"Envoyer les convocations"**.

**Résultat attendu :** Chaque participant reçoit une convocation avec l'ordre du jour en pièce jointe.

---

## 4.3 Démarrer la réunion et prendre des notes

**Objectif :** Conduire la réunion et saisir les notes en temps réel.

**Procédure :**

1. Le jour J, ouvrez la réunion dans SECRETIS.
2. Cliquez sur **"Démarrer la réunion"** (enregistre l'heure de début officielle).
3. Dans l'onglet **"Notes de séance"** :
   - Saisissez les discussions par point de l'ordre du jour
   - Notez les décisions prises
   - Ajoutez des actions à suivre (`/action [responsable] [date]`)
   - Notez les participants présents (appel)
4. Plusieurs secrétaires peuvent saisir simultanément (collaboration en temps réel).

---

## 4.4 Générer le compte-rendu avec l'IA

**Objectif :** Créer automatiquement un compte-rendu de qualité avec l'assistance de SARA.

**Procédure :**

1. En fin de réunion, cliquez sur **"Générer le compte-rendu"**.
2. SARA analyse les notes saisies et produit un compte-rendu structuré :
   - En-tête (titre, date, lieu, participants)
   - Résumé exécutif
   - Développement par point de l'ordre du jour
   - Décisions prises
   - Actions à suivre (avec responsables et échéances)
   - Prochaine réunion
3. Vérifiez et corrigez le compte-rendu généré.
4. Cliquez sur **"Enregistrer le brouillon"**.

**Conseil :** Plus vos notes de séance sont structurées, meilleur sera le compte-rendu généré.

---

## 4.5 Valider et distribuer le CR

**Objectif :** Faire approuver et distribuer le compte-rendu.

**Procédure :**

1. Cliquez sur **"Soumettre à validation"** (au Président de séance).
2. Le Président reçoit une notification, révise et **approuve** ou **renvoie pour correction**.
3. Une fois approuvé, cliquez sur **"Distribuer"**.
4. Sélectionnez les destinataires (participants + éventuelles parties prenantes).
5. Le CR est envoyé par email et classé automatiquement dans la GED.

---

## 4.6 Créer des tâches depuis le CR

**Objectif :** Transformer les décisions de réunion en tâches actionnables.

**Procédure :**

1. Dans le compte-rendu, cliquez sur une **action identifiée**.
2. Cliquez sur **"Créer une tâche"**.
3. Les champs sont pré-remplis (titre, responsable, date limite depuis le CR).
4. Ajustez si nécessaire.
5. Cliquez sur **"Créer"**.

**Résultat attendu :** Les tâches apparaissent dans le module Tâches avec lien vers le CR source.

---

# PARTIE 5 — TÂCHES & PROJETS

## 5.1 Créer une tâche

**Objectif :** Créer et gérer des tâches individuelles.

**Procédure :**

1. Accédez à **Tâches → + Nouvelle tâche** (ou raccourci `Ctrl+N` depuis Tâches).
2. Remplissez :
   - **Titre** (obligatoire)
   - **Description** (éditeur riche)
   - **Priorité** : Faible | Normale | Haute | Critique
   - **Date d'échéance**
   - **Statut** : À faire | En cours | En révision | Terminé | Annulé
   - **Tags / Labels**
   - **Pièces jointes**
3. Cliquez sur **"Créer la tâche"**.

**Raccourci :** Tapez `/task` dans la barre de recherche globale pour créer rapidement.

---

## 5.2 Assigner à un utilisateur

**Objectif :** Déléguer une tâche à un membre de l'équipe.

**Procédure :**

1. Dans la tâche, champ **"Assigné à"**.
2. Tapez le nom de l'utilisateur.
3. Sélectionnez dans la liste.
4. Le responsable reçoit une notification.
5. Vous pouvez assigner plusieurs responsables (principal + co-responsables).

**Conseil :** Définissez toujours un responsable UNIQUE principal pour éviter la dilution des responsabilités.

---

## 5.3 Vue Kanban

**Objectif :** Visualiser et gérer les tâches en mode tableau.

**Procédure :**

1. Dans Tâches, cliquez sur l'icône **Kanban** (grille de colonnes).
2. Les colonnes représentent les statuts : À faire | En cours | En révision | Terminé.
3. **Déplacer une tâche :** glisser-déposer entre les colonnes.
4. **Filtrer :** par assigné, priorité, projet, date.
5. **Ajouter une colonne personnalisée :** cliquez sur "+ Ajouter une colonne" (Admin Projet).

---

## 5.4 Créer un projet

**Objectif :** Organiser un ensemble de tâches liées à un objectif commun.

**Procédure :**

1. Accédez à **Projets → + Nouveau projet**.
2. Renseignez :
   - **Nom du projet**
   - **Description**
   - **Date de début / Date de fin prévisionnelle**
   - **Chef de projet** (responsable principal)
   - **Membres de l'équipe**
   - **Budget** (optionnel)
   - **Couleur** d'identification
3. Cliquez sur **"Créer le projet"**.
4. Créez ensuite les tâches du projet depuis la vue projet.

---

## 5.5 Diagramme de Gantt

**Objectif :** Visualiser le calendrier du projet et les dépendances.

**Procédure :**

1. Dans un projet, cliquez sur l'onglet **"Gantt"**.
2. Les tâches s'affichent sous forme de barres temporelles.
3. **Définir des dépendances :** faites glisser une connexion de la fin d'une tâche vers le début d'une autre.
4. **Déplacer une tâche :** faites glisser la barre.
5. **Chemin critique :** affiché en rouge automatiquement.
6. **Exporter :** cliquez sur "Exporter Gantt" → PDF ou PNG.

---

## 5.6 Suivi de l'avancement

**Objectif :** Monitorer la progression d'un projet.

**Tableau de bord projet :**
- % de complétion global (calculé automatiquement)
- Tâches par statut (graphique donut)
- Tâches en retard (alertes)
- Charge par membre de l'équipe
- Prochaines échéances

**Rapport d'avancement :**
1. Cliquez sur **"Générer un rapport d'avancement"**.
2. Choisissez la période.
3. Le rapport PDF est généré et peut être partagé.

---

## 5.7 Saisie des feuilles de temps

**Objectif :** Enregistrer le temps passé sur les tâches et projets.

**Procédure :**

1. Accédez à **Tâches → Feuilles de temps → + Nouvelle entrée**.
2. Sélectionnez :
   - **Projet**
   - **Tâche**
   - **Date**
   - **Durée** (en heures)
   - **Description** de l'activité
3. Cliquez sur **"Enregistrer"**.

**Minuteur intégré :** Depuis une tâche, cliquez sur l'icône minuteur pour chronomètrer en temps réel.

---

# PARTIE 6 — COMMUNICATION

## 6.1 Messagerie interne

**Objectif :** Communiquer avec les membres de votre organisation.

**Procédure :**

1. Accédez à **Communication → Messages**.
2. **Nouvelle conversation :** cliquez sur "+" → sélectionnez un ou plusieurs destinataires.
3. **Groupe :** nommez le groupe, ajoutez les membres.
4. Tapez votre message dans le champ de saisie.
5. Pièces jointes : icône trombone → sélectionnez un fichier (max 25 MB).
6. Appuyez sur **Entrée** ou cliquez sur **Envoyer**.

**Fonctionnalités :**
- Mentions : `@nom` pour notifier spécifiquement
- Réactions emoji sur les messages
- Répondre à un message spécifique (fil de discussion)
- Recherche dans l'historique des messages

---

## 6.2 Envoyer une circulaire

**Objectif :** Diffuser une communication officielle à un groupe ou à toute l'organisation.

**Procédure :**

1. Accédez à **Communication → Circulaires → + Nouvelle circulaire**.
2. Renseignez :
   - **Objet**
   - **Destinataires** : tous | département | groupe | liste personnalisée
   - **Corps** (éditeur riche, possibilité d'insérer des images)
   - **Pièces jointes**
   - **Priorité** : Normale | Urgente
3. Cliquez sur **"Aperçu"** pour vérifier.
4. Cliquez sur **"Publier"** (envoi immédiat) ou **"Programmer"** (envoi différé).

**Résultat attendu :** Les destinataires reçoivent la circulaire par notification in-app et email.

---

## 6.3 Tableau d'affichage

**Objectif :** Afficher des annonces permanentes visibles de tous.

**Procédure :**

1. Accédez à **Communication → Tableau d'affichage → + Nouvelle annonce**.
2. Renseignez :
   - **Titre**
   - **Contenu** (texte, images, liens)
   - **Date d'expiration** (optionnel)
   - **Catégorie** : Information | Événement | Règlement | Urgent
3. Cliquez sur **"Publier"**.

**Résultat attendu :** L'annonce est visible dans le tableau d'affichage accessible depuis le menu Communication.

---

## 6.4 Annuaire des contacts

**Objectif :** Retrouver rapidement les coordonnées des collègues.

**Accès :** Communication → Annuaire

**Fonctionnalités :**
- Recherche par nom, prénom, département, poste
- Filtrer par site géographique
- Afficher les disponibilités (basé sur l'agenda)
- Initier un message directement depuis la fiche contact
- Exporter en vCard ou CSV

---

## 6.5 Notifications personnalisées

**Objectif :** Configurer quelles notifications vous souhaitez recevoir et comment.

**Procédure :**

1. Accédez à **Profil → Notifications**.
2. Pour chaque type d'événement, choisissez le canal :
   - **In-app** (bulle dans SECRETIS)
   - **Email**
   - **Push** (navigateur)
   - **SMS** (si configuré)
3. Définissez les horaires de réception (pour éviter les notifications nocturnes).
4. Cliquez sur **"Enregistrer"**.

---

# PARTIE 7 — RÉCEPTION & VISITEURS

## 7.1 Accueillir un visiteur

**Objectif :** Enregistrer l'arrivée d'un visiteur de manière professionnelle.

**Utilisateurs concernés :** Réceptionniste.

**Procédure :**

1. Accédez à **Réception → + Nouveau visiteur**.
2. Renseignez :
   - **Nom et prénom**
   - **Organisation / Entreprise**
   - **Motif de la visite**
   - **Personne visitée** (hôte interne)
   - **Identifiant** : pièce d'identité scannée ou saisie manuelle
3. Le **badge visiteur** est généré automatiquement (PDF imprimable + QR code).
4. L'hôte interne est notifié de l'arrivée.
5. Le visiteur signe la charte de confidentialité (si configurée) sur la tablette du kiosque.

---

## 7.2 Créer une invitation QR

**Objectif :** Envoyer une invitation numérique avec QR code pour pré-enregistrer un visiteur.

**Procédure :**

1. Accédez à **Réception → Invitations → + Nouvelle invitation**.
2. Renseignez :
   - Nom du visiteur
   - Email du visiteur
   - Date et heure prévues
   - Hôte interne
   - Motif
3. Cliquez sur **"Envoyer l'invitation"**.
4. Le visiteur reçoit un email avec un QR code unique.

**Résultat attendu :** Le jour de la visite, le visiteur présente son QR code au kiosque pour un check-in instantané.

---

## 7.3 Enregistrer l'arrivée (check-in)

**Procédures de check-in :**

**Option A — Via le kiosque tactile :**
1. Le visiteur présente son QR code devant le lecteur.
2. Son profil s'affiche.
3. Il confirme ses informations et signe électroniquement.
4. Le badge est imprimé automatiquement.

**Option B — Via la réception :**
1. Ouvrez **Réception → Visiteurs attendus**.
2. Trouvez le visiteur dans la liste.
3. Cliquez sur **"Check-in"**.
4. Confirmez l'arrivée.

---

## 7.4 Enregistrer le départ (check-out)

**Procédure :**

1. Accédez à **Réception → Visiteurs présents**.
2. Trouvez le visiteur.
3. Cliquez sur **"Check-out"**.
4. L'heure de départ est enregistrée automatiquement.
5. Le badge visiteur est invalidé.

---

## 7.5 Consulter le registre des visiteurs

**Objectif :** Avoir une trace complète de toutes les visites.

**Procédure :**

1. Accédez à **Réception → Registre**.
2. Filtrez par :
   - Date / plage de dates
   - Hôte interne
   - Statut (présent, parti, attendu)
3. **Exporter :** CSV ou PDF pour les audits de sécurité.

---

## 7.6 Kiosque tactile (mode réception)

**Objectif :** Activer le mode kiosque pour une tablette en réception.

**Prérequis :** Tablette Android ou iPad, connexion WiFi, imprimante badges.

**Configuration :**

1. Accédez à **Paramètres → Réception → Mode Kiosque**.
2. Notez le code d'activation.
3. Sur la tablette, ouvrez SECRETIS, accédez à la page kiosque.
4. Saisissez le code d'activation.
5. Le mode kiosque s'active (plein écran, navigation limitée à la réception).

---

# PARTIE 8 — RESSOURCES & PARC AUTO

## 8.1 Réserver une salle

**Objectif :** Réserver une salle de réunion ou un espace de travail.

**Procédure :**

1. Accédez à **Ressources → Salles**.
2. Vue calendrier ou liste des salles disponibles.
3. Cliquez sur un créneau disponible.
4. Remplissez : titre de la réunion, participants, équipements nécessaires.
5. Confirmez la réservation.

**Résultat attendu :** La salle est réservée, les ressources sont bloquées et les participants notifiés.

---

## 8.2 Gérer le matériel

**Objectif :** Suivre et prêter le matériel de l'organisation.

**Inventaire (Admin) :**
1. Accédez à **Ressources → Matériel → + Ajouter un équipement**.
2. Renseignez : nom, référence, catégorie, localisation, état.

**Demande de prêt :**
1. Accédez à **Ressources → Matériel → Demande de prêt**.
2. Sélectionnez l'équipement, la période souhaitée.
3. Soumettez la demande.
4. Un responsable approuve ou refuse.

---

## 8.3 Gérer les stocks de fournitures

**Objectif :** Suivre les consommables de bureau.

**Procédure :**
1. Accédez à **Ressources → Fournitures**.
2. Consultez les stocks disponibles.
3. **Demande de fournitures :** sélectionnez l'article, la quantité, validez.
4. Le responsable de stock prépare la commande.
5. Les sorties sont enregistrées automatiquement.

**Alertes de stock :** Configurez les seuils d'alerte (Paramètres → Ressources → Seuils).

---

## 8.4 Suivi du parc automobile

**Objectif :** Gérer la flotte de véhicules de l'organisation.

**Inventaire des véhicules (Admin) :**
1. Accédez à **Ressources → Parc Auto → + Ajouter un véhicule**.
2. Renseignez : marque, modèle, immatriculation, date de mise en service, kilométrage.

**Réservation de véhicule :**
1. Accédez à **Ressources → Parc Auto → Réserver**.
2. Sélectionnez le véhicule, les dates, le motif du déplacement.
3. Soumettez la demande.

**Carnet de bord :** Après utilisation, enregistrez le kilométrage et les incidents.

---

## 8.5 Planification de la maintenance

**Objectif :** Anticiper et planifier les maintenances préventives.

**Procédure :**

1. Accédez à **Ressources → Maintenance → + Nouvelle intervention**.
2. Sélectionnez l'actif (véhicule, équipement, salle).
3. Type : Préventif | Curatif | Inspection.
4. Date prévue, responsable, coût estimé.
5. Définissez la récurrence (si maintenance périodique).
6. Cliquez sur **"Planifier"**.

**Alertes :** SARA notifie automatiquement les responsables 7 jours avant chaque maintenance planifiée.

---

## 8.6 Tableau GPS en temps réel

**Objectif :** Localiser les véhicules de la flotte en temps réel.

**Prérequis :** Boîtiers GPS installés dans les véhicules + clé API GPS configurée par l'Admin.

**Procédure :**

1. Accédez à **Ressources → Parc Auto → Carte GPS**.
2. La carte affiche la position en temps réel de chaque véhicule actif.
3. Cliquez sur un véhicule pour voir : vitesse, conducteur actuel, trajet.
4. **Historique des trajets :** sélectionnez un véhicule et une plage de dates.
5. **Alertes géofencing :** configurez des zones et recevez une alerte si un véhicule en sort.

---

# PARTIE 9 — RH LÉGÈRE

## 9.1 Gérer le personnel

**Objectif :** Maintenir à jour le référentiel du personnel.

**Utilisateurs concernés :** DRH, Responsable RH, Admin.

**Procédure :**

1. Accédez à **RH → Personnel → + Ajouter un employé**.
2. Renseignez le dossier :
   - Informations personnelles (nom, prénom, date de naissance)
   - Informations contractuelles (poste, date d'embauche, type de contrat)
   - Service et responsable hiérarchique
   - Contact d'urgence
3. Téléversez les documents RH (contrat, diplômes, pièce d'identité).
4. Cliquez sur **"Créer le dossier"**.

---

## 9.2 Demander un congé

**Objectif :** Soumettre une demande de congé à son responsable.

**Procédure :**

1. Accédez à **RH → Congés → + Nouvelle demande**.
2. Sélectionnez :
   - **Type de congé** : Annuel | Maladie | Maternité/Paternité | Exceptionnel
   - **Dates de début et fin**
3. Ajoutez un commentaire si nécessaire.
4. Cliquez sur **"Soumettre la demande"**.
5. Votre responsable reçoit une notification pour validation.

**Solde de congés :** Visible dans **RH → Mes congés → Solde**.

---

## 9.3 Valider une demande de congé

**Objectif :** Approuver ou refuser une demande de congé.

**Utilisateurs concernés :** Manager, DRH.

**Procédure :**

1. Recevez la notification de demande de congé.
2. Accédez à **RH → Validations en attente**.
3. Consultez la demande (dates, solde disponible, absences chevauchantes).
4. Cliquez sur **"Approuver"** ou **"Refuser"** en ajoutant un motif.
5. L'employé reçoit une notification du résultat.

---

## 9.4 Soumettre une note de frais

**Objectif :** Déclarer et faire rembourser des frais professionnels.

**Procédure :**

1. Accédez à **RH → Notes de frais → + Nouvelle note**.
2. Ajoutez les lignes de dépenses :
   - Date, description, catégorie, montant, devise
   - Photo du justificatif (reçu, facture)
3. Totalisez la note de frais.
4. Cliquez sur **"Soumettre pour remboursement"**.

---

## 9.5 Planning de présence

**Objectif :** Visualiser et gérer les présences du personnel.

**Procédure :**

1. Accédez à **RH → Planning**.
2. Vue mensuelle ou hebdomadaire des présences.
3. Les congés approuvés, formations et absences s'affichent automatiquement.
4. **Modifier un planning :** cliquez sur un créneau pour ajouter une absence ou une formation.
5. **Exporter :** CSV pour intégration avec la paie.

---

## 9.6 Organigramme

**Objectif :** Visualiser la structure hiérarchique de l'organisation.

**Accès :** RH → Organigramme

**Fonctionnalités :**
- Arbre interactif (zoom, déplacement)
- Cliquez sur une fiche pour voir le détail du poste
- Filtrer par département
- Exporter en PNG ou PDF

---

# PARTIE 10 — RAPPORTS & BI

## 10.1 Accéder aux tableaux de bord

**Objectif :** Consulter les indicateurs de performance de votre organisation.

**Accès :** Rapports → Tableaux de bord

**Tableaux de bord disponibles :**
- **Vue générale** : KPIs globaux de l'organisation
- **Agenda & Réunions** : taux de participation, réunions par mois
- **Courrier & GED** : volumes traités, délais de traitement
- **Tâches & Projets** : avancement, retards, charge d'équipe
- **Réception** : fréquentation visiteurs, heures de pointe
- **RH** : absentéisme, congés, notes de frais
- **Ressources** : taux d'occupation des salles, utilisation du parc auto

---

## 10.2 Créer un rapport personnalisé

**Objectif :** Construire un rapport sur mesure selon vos besoins.

**Procédure :**

1. Accédez à **Rapports → + Nouveau rapport**.
2. Sélectionnez la **source de données** (module source).
3. Choisissez les **dimensions** (axes d'analyse) et **métriques** (valeurs à afficher).
4. Appliquez des **filtres** (période, département, utilisateur...).
5. Choisissez le **type de visualisation** : tableau, graphique en barres, courbe, camembert.
6. Nommez et sauvegardez le rapport.
7. Ajoutez-le à votre tableau de bord en cliquant sur "Ajouter au dashboard".

---

## 10.3 Exporter en PDF, XLSX, CSV

**Objectif :** Télécharger les données pour les partager ou les analyser.

**Procédure :**

1. Depuis n'importe quel rapport ou tableau de bord.
2. Cliquez sur l'icône **"Exporter"** (ou bouton "Exporter").
3. Choisissez le format :
   - **PDF** : mise en page avec logo et branding organisation
   - **XLSX** : données brutes pour Excel / Google Sheets
   - **CSV** : données brutes universelles
4. Choisissez la plage de données si applicable.
5. Cliquez sur **"Télécharger"**.

---

## 10.4 Programmer un rapport automatique

**Objectif :** Recevoir des rapports automatiquement à intervalles définis.

**Procédure :**

1. Depuis un rapport, cliquez sur **"Programmer"**.
2. Configurez :
   - **Fréquence** : quotidien | hebdomadaire | mensuel
   - **Jour et heure** d'envoi
   - **Destinataires** (emails internes ou externes)
   - **Format** : PDF ou XLSX
3. Activez la programmation.
4. Cliquez sur **"Enregistrer"**.

---

# PARTIE 11 — PARAMÈTRES

## 11.1 Gérer les utilisateurs et invitations

**Accès :** Paramètres → Utilisateurs

**Actions disponibles :**
- Voir la liste des utilisateurs actifs et en attente
- Renvoyer une invitation expirée
- Modifier le rôle d'un utilisateur
- Désactiver un compte (sans suppression des données)
- Transférer les données d'un utilisateur avant désactivation
- Voir le journal de connexion par utilisateur

---

## 11.2 Créer et modifier les rôles

**Objectif :** Définir des rôles personnalisés avec des permissions spécifiques.

**Prérequis :** Super Admin uniquement.

**Procédure :**

1. Accédez à **Paramètres → Rôles → + Nouveau rôle**.
2. Donnez un **nom** au rôle.
3. Sélectionnez les **permissions** par module (liste exhaustive).
4. Cliquez sur **"Créer le rôle"**.
5. Assignez ce rôle aux utilisateurs concernés.

**Conseil :** Suivez le principe du moindre privilège : n'accordez que les permissions nécessaires.

---

## 11.3 Configurer les notifications

**Accès :** Paramètres → Notifications

**Options :**
- Activer/désactiver les notifications par événement système
- Configurer les templates d'email (logo, couleur, pied de page)
- Configurer les SMS (fournisseur : Twilio, Orange SMS API)
- Heures calmes (ne pas envoyer entre 22h et 7h)

---

## 11.4 Gérer les intégrations

**Accès :** Paramètres → Intégrations

**Intégrations disponibles :**
- **Google Workspace** (Calendar, Drive, Gmail)
- **Microsoft 365** (Outlook, Teams, OneDrive)
- **Zoom** / **Google Meet** / **Microsoft Teams** (visioconférence)
- **Twilio** (SMS)
- **Stripe** / **CinetPay** / **Wave** / **MTN MoMo** (paiements)
- **API REST** (webhooks personnalisés)
- **SMTP** personnalisé (envoi d'emails)

**Procédure générale :** Cliquez sur l'intégration → suivez le guide de connexion → testez la connexion → activez.

---

## 11.5 Configurer le SSO

**Objectif :** Permettre aux utilisateurs de se connecter avec le compte de leur organisation (SSO).

**Prérequis :** Super Admin.

**Fournisseurs supportés :**
- **SAML 2.0** (Active Directory, Okta, Ping Identity)
- **OAuth 2.0 / OpenID Connect** (Google, Azure AD, Keycloak)

**Procédure :**
1. Accédez à **Paramètres → Sécurité → SSO**.
2. Sélectionnez votre fournisseur.
3. Saisissez les URL et certificats fournis par votre IdP.
4. Testez la connexion.
5. Activez le SSO.

---

## 11.6 Gestion RGPD et données personnelles

**Accès :** Paramètres → RGPD

**Fonctionnalités :**
- **Registre des traitements** : liste des données personnelles traitées
- **Droit d'accès** : exportez toutes les données d'un utilisateur en 1 clic
- **Droit à l'effacement** : anonymisez les données d'un utilisateur qui part
- **Durées de conservation** : configurez la rétention automatique
- **Consentements** : gérez les consentements collectés

---

## 11.7 Sauvegardes et restauration

**Accès :** Paramètres → Sauvegardes (Super Admin uniquement)

**Sauvegarde manuelle :**
1. Cliquez sur **"Lancer une sauvegarde"**.
2. Choisissez le périmètre : données uniquement | données + fichiers GED.
3. La sauvegarde est chiffrée et stockée (S3 ou stockage configuré).
4. Téléchargez le fichier de sauvegarde si nécessaire.

**Sauvegarde automatique :** Configurée par défaut toutes les 24h à 2h du matin.

**Restauration :**
1. Contactez le support IBIG Soft pour une restauration complète.
2. Pour une restauration partielle (documents), utilisez l'outil de restauration intégré.

---

# PARTIE 12 — ASSISTANT SARA

## 12.1 Accéder à SARA

**Objectif :** Ouvrir et utiliser l'assistante IA SARA.

**Accès :**
- Bouton **SARA** en bas à droite de toutes les pages (icône chat)
- Raccourci clavier : `Ctrl + Shift + S`
- Depuis le Centre d'aide → "Parler à SARA"

---

## 12.2 Poser une question à SARA

**Objectif :** Obtenir une réponse rapide sur n'importe quel sujet lié à SECRETIS.

**Exemples de questions :**
- "Comment créer un événement récurrent ?"
- "Où trouver les rapports d'absentéisme ?"
- "Comment exporter les courriers de la semaine en PDF ?"
- "Qui a accès au module GED ?"

**Procédure :**
1. Cliquez sur le bouton SARA.
2. Tapez votre question en langage naturel.
3. SARA répond avec des instructions, des liens directs vers les fonctionnalités ou des articles d'aide.
4. Si SARA ne comprend pas, reformulez ou utilisez le Centre d'aide.

---

## 12.3 Obtenir de l'aide sur un module

**Procédure :**
1. Naviguez vers le module en question.
2. SARA détecte automatiquement le contexte.
3. Cliquez sur SARA.
4. Posez votre question — SARA propose des réponses contextualisées au module affiché.

---

## 12.4 Demander à SARA d'ouvrir un ticket

**Procédure :**
1. Ouvrez SARA.
2. Tapez : "Je voudrais ouvrir un ticket" ou "J'ai un problème avec [module]".
3. SARA lance le formulaire de ticket pré-rempli avec le contexte.
4. Complétez le formulaire et soumettez.

---

# PARTIE 13 — ADMINISTRATION AVANCÉE

## 13.1 Module SYSCOHADA comptabilité

**Objectif :** Gérer la comptabilité selon le système SYSCOHADA révisé.

**Fonctionnalités :**
- Plan comptable SYSCOHADA intégré (personnalisable)
- Saisie des écritures comptables
- Grand livre, balance, journal
- États financiers : bilan, compte de résultat, tableau des flux
- Rapprochement bancaire
- Gestion des immobilisations

**Accès :** Menu principal → Comptabilité (rôle : Comptable ou Admin Comptabilité).

---

## 13.2 Gestion budgétaire

**Fonctionnalités :**
- Création de budgets annuels par département
- Suivi de la consommation en temps réel
- Alertes de dépassement
- Virements budgétaires
- Rapports budget vs réalisé

**Accès :** Comptabilité → Budget.

---

## 13.3 Achats et portail fournisseurs

**Fonctionnalités :**
- Demandes d'achat (DA)
- Bons de commande (BC)
- Appels d'offres
- Portail fournisseurs (accès extranet pour les fournisseurs)
- Réception de marchandises
- Rapprochement factures/BC

**Accès :** Menu principal → Achats.

---

## 13.4 Qualité ISO 9001

**Fonctionnalités :**
- Gestion des processus et procédures
- Non-conformités et actions correctives (CAPA)
- Audits internes
- Revue de direction
- Indicateurs qualité
- Gestion des risques

**Accès :** Menu principal → Qualité.

---

## 13.5 e-Learning et SCORM

**Fonctionnalités :**
- Création de cours en ligne
- Import de modules SCORM 1.2 et 2004
- Parcours de formation
- Suivi des apprenants (completion, scores)
- Certificats automatiques
- Catalogue de formations

**Accès :** Menu principal → Académie.

---

## 13.6 SaaS Metrics (SuperAdmin)

**Fonctionnalités réservées aux Super Admins IBIG Soft :**
- Vue de toutes les organisations (tenants)
- MRR, ARR, Churn, ARPU
- Utilisation par module
- Alertes d'inactivité
- Gestion des licences et plans

**Accès :** Menu SuperAdmin (barre latérale distincte).

---

# PARTIE 14 — SÉCURITÉ & LICENCE

## 14.1 Activer le MFA

**Objectif :** Sécuriser votre compte avec l'authentification à deux facteurs.

**Procédure :**

1. Accédez à **Profil → Sécurité → Authentification à deux facteurs**.
2. Cliquez sur **"Activer"**.
3. Installez une application d'authentification (Google Authenticator, Authy, Microsoft Authenticator).
4. Scannez le QR code affiché avec votre application.
5. Saisissez le code à 6 chiffres généré pour valider.
6. **Codes de secours :** notez et conservez précieusement les 8 codes de secours affichés (utilisables si vous perdez votre téléphone).
7. Cliquez sur **"Activer le MFA"**.

**Résultat attendu :** À chaque connexion, un code MFA vous sera demandé après le mot de passe.

---

## 14.2 Gérer vos sessions

**Objectif :** Voir et révoquer les sessions actives sur vos appareils.

**Procédure :**

1. Accédez à **Profil → Sécurité → Sessions actives**.
2. Visualisez la liste : appareil, navigateur, IP, dernière activité.
3. Cliquez sur **"Révoquer"** pour déconnecter un appareil spécifique.
4. Cliquez sur **"Révoquer toutes les autres sessions"** si vous suspectez un accès non autorisé.

---

## 14.3 Consulter l'abonnement

**Accès :** Paramètres → Abonnement (Admin ou Super Admin)

**Informations disponibles :**
- Plan actuel (Starter, Pro, Enterprise)
- Date de renouvellement
- Nombre d'utilisateurs actifs / licences disponibles
- Modules activés
- Utilisation du stockage

---

## 14.4 Renouveler la licence

**Procédure :**

1. Accédez à **Paramètres → Abonnement**.
2. Cliquez sur **"Renouveler / Mettre à niveau"**.
3. Choisissez le plan souhaité.
4. Procédez au paiement (CinetPay, Wave, virement bancaire, carte).
5. La licence est activée immédiatement après validation du paiement.

**Conseil :** Activez le renouvellement automatique pour éviter toute interruption de service.

---

## 14.5 Journal d'audit

**Objectif :** Tracer toutes les actions importantes dans le système.

**Accès :** Paramètres → Audit → Journal d'audit

**Informations disponibles pour chaque entrée :**
- Date et heure (UTC)
- Utilisateur (nom + email)
- Action effectuée
- Module concerné
- Objet modifié (avant/après pour les modifications)
- Adresse IP

**Filtres :** par utilisateur, action, module, période.

**Export :** CSV pour audits de conformité.

---

# PARTIE 15 — DÉPANNAGE

## 15.1 Je ne peux pas me connecter

**Causes et solutions :**

| Symptôme | Cause probable | Solution |
|---|---|---|
| "Identifiants incorrects" | Mot de passe erroné | Cliquez "Mot de passe oublié" |
| "Compte désactivé" | Admin a désactivé le compte | Contactez votre Admin |
| "Invitation expirée" | Lien de 72h dépassé | Demandez une nouvelle invitation |
| Page blanche | Cache navigateur | Ctrl+Shift+Del → vider le cache |
| Code MFA invalide | Heure téléphone désynchronisée | Synchronisez l'heure du téléphone |
| "Trop de tentatives" | Sécurité anti-brute-force | Attendez 15 min ou contactez l'Admin |

---

## 15.2 Je ne vois pas un menu

**Causes et solutions :**

1. **Permission manquante** : votre rôle ne permet pas d'accéder à ce module → demandez à votre Admin de vérifier vos permissions.
2. **Module non activé** : le module n'est pas inclus dans votre plan → vérifiez l'abonnement.
3. **Interface réduite** : le menu latéral est réduit → cliquez sur l'icône hamburger pour l'étendre.

---

## 15.3 Un document ne s'affiche pas

**Solutions :**

1. Vérifiez que vous avez les **droits d'accès** au document (demandez au propriétaire).
2. Vérifiez que le format est supporté (PDF, DOCX, XLSX, PPTX, images).
3. Si le document est volumineux (>10 MB), le chargement peut prendre quelques secondes.
4. Essayez de le **télécharger** plutôt que de le visualiser en ligne.
5. Videz le cache navigateur.

---

## 15.4 Un export est vide

**Solutions :**

1. Vérifiez les **filtres appliqués** : peut-être aucune donnée ne correspond aux critères.
2. Assurez-vous d'avoir les droits d'**export** sur ce module.
3. Vérifiez la **plage de dates** : elle doit contenir des données.
4. Essayez un autre format (PDF au lieu de XLSX).
5. Réessayez après 2 min (exports lourds sont en file d'attente).

---

## 15.5 SARA ne répond pas

**Solutions :**

1. Vérifiez votre connexion Internet.
2. Rechargez la page (F5) et réouvrez SARA.
3. Videz le cache et les cookies.
4. Si SARA affiche "Service temporairement indisponible" → vérifiez le [statut des services](https://status.ibigsoft.com).
5. Reformulez votre question de manière plus simple.

---

## 15.6 Contacter le support

**Niveaux de support :**

| Niveau | Délai de réponse | Disponibilité |
|---|---|---|
| Standard | 24-48h ouvrées | Lun-Ven 8h-18h |
| Prioritaire | 4-8h ouvrées | Lun-Ven 7h-20h |
| Critique (Enterprise) | 1h | 24h/7j |

**Canaux de contact :**
- **Via SECRETIS :** Centre d'aide → Ouvrir un ticket
- **Email :** support@ibigsoft.com
- **WhatsApp :** +225 27 20 XX XX XX
- **Téléphone :** +225 27 20 XX XX XX (Lun-Ven 8h-18h GMT)
- **Chat en ligne :** [support.ibigsoft.com](https://support.ibigsoft.com)

**Pour les urgences critiques :** Utilisez la ligne d'urgence disponible pour les abonnés Enterprise.

**Informations à préparer pour le support :**
- Votre organisation (nom)
- Le module concerné
- Description précise du problème
- Captures d'écran si possible
- Date et heure de l'incident
- Votre navigateur et version

---

*Guide Utilisateur IBIG SECRETIS v1.0 — Rédigé par l'équipe IBIG Soft*
*Dernière mise à jour : Juillet 2026*
*Pour toute suggestion d'amélioration de ce guide : docs@ibigsoft.com*
