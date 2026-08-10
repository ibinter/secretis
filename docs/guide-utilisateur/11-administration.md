# Guide Utilisateur IBIG SECRETIS — Chapitre 11 : Administration

> **Module** : Administration & Configuration  
> **Profils concernés** : Administrateur, Super Administrateur  
> **Accès** : Menu > Administration

> **[ADMIN]** Ce chapitre est réservé aux utilisateurs avec le rôle `admin` ou `super_admin`.

---

## 1. Configurer l'organisation

`Administration > Paramètres > Organisation`

### 1.1 Informations générales

| Paramètre | Description |
|-----------|-------------|
| Nom officiel | Raison sociale complète |
| Sigle | Abréviation officielle |
| Numéro RCCM / SIRET | Identifiant légal |
| Adresse du siège | Adresse complète |
| Téléphone | Numéro principal |
| Site web | URL officielle |
| Email de contact | Email public de l'organisation |
| Secteur d'activité | Secteur de l'organisation |
| Logo | Télécharger le logo officiel |

### 1.2 Paramètres régionaux

| Paramètre | Options |
|-----------|---------|
| Langue par défaut | Français, Anglais |
| Fuseau horaire | Liste des fuseaux (Africa/Abidjan, etc.) |
| Devise | XOF, EUR, USD, GNF, XAF, etc. |
| Format de date | JJ/MM/AAAA, AAAA-MM-JJ |
| Premier jour de la semaine | Lundi, Dimanche |

### 1.3 Paramètres de numérotation

Définissez les conventions de numérotation pour chaque entité :

| Entité | Exemple de format | Compteur |
|--------|------------------|---------|
| Courrier entrant | `ENT-{YYYY}-{NNNN}` | 1 |
| Courrier sortant | `SRT-{YYYY}-{NNNN}` | 1 |
| Réunion | `REU-{YYYY}-{NNN}` | 1 |
| Note de frais | `NDF-{YYYY}-{NNNN}` | 1 |
| Circulaire | `CIRC-{YYYY}-{NNNN}` | 1 |
| Visiteur | `VIS-{YYYY}-{NNNNN}` | 1 |

---

## 2. Gérer les utilisateurs et les rôles

`Administration > Utilisateurs`

### 2.1 Tableau des utilisateurs

```
┌─────────────────────────────────────────────────────────────────┐
│  UTILISATEURS (47)  [+ Inviter]  [Inviter en masse]  [Exporter] │
├────────────────┬──────────────┬──────────┬──────────┬───────────┤
│  Utilisateur   │  Email       │  Rôle    │  Statut  │  Dernier  │
├────────────────┼──────────────┼──────────┼──────────┼───────────┤
│  Konan Adjoa   │ k.adjoa@...  │ agent    │ Actif    │ Il y a 2h │
│  Bah Oumar     │ o.bah@...    │ manager  │ Actif    │ Il y a 4h │
│  Yao Alice     │ a.yao@...    │ manager  │ Actif    │ Hier      │
│  Diallo Seydou │ s.diallo@... │ agent    │ Inactif  │ 15/07/26  │
└────────────────┴──────────────┴──────────┴──────────┴───────────┘
```

### 2.2 Matrice des rôles et permissions

| Permission | super_admin | admin | manager | agent | viewer |
|------------|:-----------:|:-----:|:-------:|:-----:|:------:|
| Lire tous les modules | ✓ | ✓ | Partiel | Partiel | Partiel |
| Créer/modifier dans son service | ✓ | ✓ | ✓ | ✓ | ✗ |
| Valider (approuver) | ✓ | ✓ | ✓ | ✗ | ✗ |
| Gérer les utilisateurs | ✓ | ✓ | ✗ | ✗ | ✗ |
| Configurer l'organisation | ✓ | ✓ | ✗ | ✗ | ✗ |
| Voir les rapports complets | ✓ | ✓ | ✓ | ✗ | ✗ |
| Gérer les intégrations | ✓ | ✓ | ✗ | ✗ | ✗ |
| Consulter le journal d'audit | ✓ | ✓ | ✗ | ✗ | ✗ |
| Gérer l'abonnement | ✓ | ✗ | ✗ | ✗ | ✗ |

### 2.3 Créer un rôle personnalisé

`Administration > Rôles > + Nouveau rôle`

Pour des besoins spécifiques, créez des rôles sur mesure :

1. Donnez un **nom** au rôle (ex : "Responsable Courrier")
2. Cochez les **permissions** granulaires souhaitées
3. Définissez la **portée** : tous les départements, ou département spécifique
4. Cliquez sur **Créer le rôle**
5. Assignez ce rôle aux utilisateurs concernés

### 2.4 Désactiver un utilisateur

Lorsqu'un collaborateur quitte l'organisation :

1. Recherchez l'utilisateur
2. Cliquez sur **⚙️ Options > Désactiver le compte**
3. L'utilisateur ne peut plus se connecter
4. Ses données sont conservées dans le système (audit, historique)
5. Ses tâches et courriers assignés sont réassignés si nécessaire

> **[DANGER] Action irréversible**  
> La suppression définitive d'un compte efface l'historique des actions de cet utilisateur. Préférez toujours la **désactivation** à la suppression.

---

## 3. Configurer les notifications

`Administration > Paramètres > Notifications`

### 3.1 Canaux de notification disponibles

| Canal | Configuration requise |
|-------|----------------------|
| **In-app** | Activé par défaut, aucune configuration |
| **Email** | Serveur SMTP configuré (voir section 4) |
| **WhatsApp** | API WhatsApp Business configurée |
| **SMS** | Passerelle SMS configurée |

### 3.2 Règles de notification par événement

Pour chaque événement système, définissez quels rôles reçoivent quelle notification sur quel canal :

| Événement | Admin | Manager | Agent |
|-----------|-------|---------|-------|
| Nouveau courrier entrant | Email | In-app | In-app |
| Courrier en retard | Email | Email | Email + In-app |
| Réunion planifiée | — | In-app | In-app |
| Demande de congé soumise | — | Email + In-app | — |
| Note de frais soumise | — | In-app | — |
| Stock sous seuil minimum | Email | Email | — |
| Nouveau visiteur enregistré | — | — | In-app |

---

## 4. Connecter les intégrations

`Administration > Intégrations`

### 4.1 Configuration SMTP (emails)

```
┌─────────────────────────────────────────────────────────────────┐
│  CONFIGURATION SMTP                                             │
├─────────────────────────────────────────────────────────────────┤
│  Serveur SMTP    : [smtp.gmail.com        ]                     │
│  Port            : [587]  Chiffrement : [▼ TLS ]               │
│  Email expéditeur: [noreply@organisation.ci]                    │
│  Nom expéditeur  : [IBIG SECRETIS — Organisation]              │
│  Login           : [____________________________]              │
│  Mot de passe    : [____________________________]              │
│                                                                 │
│  [  Tester la connexion  ]  [  Enregistrer  ]                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 WhatsApp Business

1. Obtenez un **numéro de téléphone WhatsApp Business** dédié
2. Créez une application sur [Meta for Developers](https://developers.facebook.com/)
3. Obtenez le **Token API** et le **numéro d'ID Phone**
4. Renseignez ces informations dans `Intégrations > WhatsApp`
5. Testez en envoyant un message de test

### 4.3 Intégration IA (SARA)

| Fournisseur | Configuration requise |
|-------------|----------------------|
| OpenAI (GPT) | Clé API OpenAI + sélection du modèle |
| Anthropic (Claude) | Clé API Anthropic + modèle |
| Modèle local | URL du serveur Ollama + nom du modèle |

### 4.4 Autres intégrations

| Intégration | Usage | Configuration |
|-------------|-------|--------------|
| Google Calendar | Synchronisation des agendas | OAuth2 Google |
| Microsoft 365 | Outlook, Teams | OAuth2 Microsoft |
| Passerelle SMS | Notifications SMS | Clé API opérateur |
| Signature électronique | Signature de documents | DocuSign / YumiSign |

---

## 5. Gérer les sauvegardes

`Administration > Sauvegardes`

### 5.1 Sauvegardes automatiques

SECRETIS SaaS effectue des sauvegardes automatiques :

| Fréquence | Rétention | Type |
|-----------|-----------|------|
| Quotidienne | 30 jours | Incrémentale |
| Hebdomadaire | 3 mois | Complète |
| Mensuelle | 1 an | Complète |

### 5.2 Télécharger une sauvegarde

`Administration > Sauvegardes > Télécharger`

1. Sélectionnez la date de la sauvegarde souhaitée
2. Choisissez ce à inclure : Base de données, Fichiers (GED), Tout
3. Cliquez sur **Générer le téléchargement**
4. Le fichier est préparé (quelques minutes) puis disponible pendant 24h

> **[ASTUCE]**  
> Programmez un téléchargement mensuel de sauvegarde et conservez-le sur un support externe sécurisé (conformité, RGPD).

---

## 6. Consulter le journal d'audit

`Administration > Audit`

Le journal d'audit enregistre toutes les actions effectuées dans SECRETIS, avec horodatage et identification de l'auteur.

```
┌────────────────────────────────────────────────────────────────────────┐
│  JOURNAL D'AUDIT — Filtres : [Tous les utilisateurs] [Aujourd'hui]    │
├───────────────────┬──────────────┬───────────────────────┬────────────┤
│  Date/Heure       │  Utilisateur │  Action               │  Objet     │
├───────────────────┼──────────────┼───────────────────────┼────────────┤
│ 21/07/26 10h47    │  Konan A.    │  Création             │ ENT-2026-43│
│ 21/07/26 10h32    │  Yao A.      │  Modification statut  │ NDF-0089   │
│ 21/07/26 10h15    │  Bah O.      │  Connexion            │ Compte     │
│ 21/07/26 09h58    │  Diallo S.   │  Suppression          │ Tâche #234 │
│ 21/07/26 09h30    │  Konan A.    │  Export PDF           │ Rapport J. │
└───────────────────┴──────────────┴───────────────────────┴────────────┘
```

**Filtres disponibles :**
- Par utilisateur, par date, par type d'action, par module

**Actions enregistrées :**
- Connexions et déconnexions
- Créations, modifications, suppressions
- Exports et téléchargements
- Changements de statut
- Modifications de configuration
- Accès aux données confidentielles

---

## 7. Gérer l'abonnement et les paiements

`Administration > Abonnement`

### 7.1 Informations sur l'abonnement actuel

```
┌─────────────────────────────────────────────────────────────────┐
│  ABONNEMENT ACTUEL                                              │
│  Plan         : SECRETIS Professional                           │
│  Statut       : Actif ✓                                         │
│  Utilisateurs : 47 / 50 (94%)                                   │
│  Stockage GED : 8,4 Go / 20 Go (42%)                           │
│  Renouvellement: 01/01/2027                                     │
│  Montant      : 350 000 XOF / an                                │
│  Prochaine facture : 01/01/2027                                  │
│                                                                 │
│  [  Mettre à niveau  ]  [  Télécharger les factures  ]          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Plans disponibles

| Plan | Utilisateurs | Stockage | Modules | Prix/mois |
|------|-------------|---------|---------|-----------|
| Starter | 5 | 5 Go | Essentiels | 15 000 XOF |
| Standard | 25 | 15 Go | Tous | 50 000 XOF |
| Professional | 50 | 50 Go | Tous + IA | 100 000 XOF |
| Enterprise | Illimité | Illimité | Tous + IA | Sur devis |

### 7.3 Mettre à niveau ou résilier

Pour toute modification d'abonnement, contactez l'équipe IBIG Technologies :

- **Email** : support@ibig-technologies.ci
- **Téléphone** : +225 XX XX XX XX
- **Portail client** : `https://client.ibig-secretis.com`

---

*Fin du chapitre 11 — Administration*

[← Chapitre précédent : 10 — Rapports](10-rapports.md)

---

## Index général du Guide Utilisateur

| Chapitre | Titre | Profil principal |
|----------|-------|-----------------|
| [00](00-introduction.md) | Introduction | Tous |
| [01](01-premiers-pas.md) | Premiers pas | Tous |
| [02](02-agenda-planning.md) | Agenda & Planning | Tous |
| [03](03-courrier-ged.md) | Courrier & GED | Secrétariat |
| [04](04-reunions.md) | Réunions | Secrétariat, Managers |
| [05](05-taches-projets.md) | Tâches & Projets | Chefs de projet |
| [06](06-communication.md) | Communication | Tous |
| [07](07-accueil-visiteurs.md) | Accueil Visiteurs | Agent d'accueil |
| [08](08-ressources.md) | Ressources | Logistique |
| [09](09-rh-leger.md) | RH Léger | RH, Employés |
| [10](10-rapports.md) | Rapports | Managers, Dirigeants |
| [11](11-administration.md) | Administration | Administrateurs |
