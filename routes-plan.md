# IBIG SECRETIS ERP — Plan complet des routes

## Conventions

| Convention | Valeur |
|------------|--------|
| Préfixe API | `/api/v1` |
| Authentification API | Bearer token (Sanctum) |
| Authentification Web | Session cookie (Sanctum SPA) |
| Format réponse API | JSON `{ data, meta, message }` |
| Pagination | `?page=1&per_page=20` |
| Filtrage | `?filter[field]=value` |
| Tri | `?sort=field` ou `?sort=-field` (desc) |

---

## Groupe 1 — Authentification (`/auth`)

### Routes publiques (non authentifiées)

```
POST   /auth/login                  — Connexion (email + mot de passe)
POST   /auth/register               — Inscription organisation (trial)
POST   /auth/forgot-password        — Demande de réinitialisation
POST   /auth/reset-password         — Réinitialisation avec token
GET    /auth/verify-email/{id}/{hash} — Vérification email
POST   /auth/verify-email/resend    — Renvoyer email de vérification

POST   /auth/2fa/verify             — Vérification code 2FA (TOTP)
```

### Routes authentifiées

```
POST   /auth/logout                 — Déconnexion
GET    /auth/user                   — Utilisateur courant + permissions
POST   /auth/refresh                — Rafraîchissement token

PUT    /auth/password               — Changer son mot de passe
POST   /auth/2fa/enable             — Activer le 2FA
POST   /auth/2fa/disable            — Désactiver le 2FA
GET    /auth/2fa/qr-code            — QR Code d'activation TOTP
```

---

## Groupe 2 — SuperAdmin (`/superadmin`)

> Accès réservé aux utilisateurs avec rôle `super_admin`. Routes protégées par middleware `auth + role:super_admin`.

### Dashboard SuperAdmin

```
GET    /superadmin/dashboard        — Vue globale (stats, alertes, activité)
GET    /superadmin/stats            — Statistiques globales (tenants, revenus, usage)
```

### Gestion des organisations (Tenants)

```
GET    /superadmin/organizations              — Liste toutes les organisations
POST   /superadmin/organizations             — Créer une organisation
GET    /superadmin/organizations/{id}        — Détail d'une organisation
PUT    /superadmin/organizations/{id}        — Modifier une organisation
DELETE /superadmin/organizations/{id}        — Supprimer (soft delete)

POST   /superadmin/organizations/{id}/activate    — Activer
POST   /superadmin/organizations/{id}/deactivate  — Désactiver / Suspendre
POST   /superadmin/organizations/{id}/impersonate — Se connecter en tant que org admin
POST   /superadmin/organizations/{id}/reset-trial — Réinitialiser l'essai
GET    /superadmin/organizations/{id}/usage        — Usage (users, storage, API calls)
GET    /superadmin/organizations/{id}/audit-log    — Journal d'audit de l'organisation
```

### Gestion des licences

```
GET    /superadmin/licenses              — Liste des licences
POST   /superadmin/licenses             — Créer une licence
GET    /superadmin/licenses/{id}        — Détail d'une licence
PUT    /superadmin/licenses/{id}        — Modifier une licence
DELETE /superadmin/licenses/{id}        — Révoquer

POST   /superadmin/licenses/{id}/extend       — Prolonger la durée
POST   /superadmin/licenses/{id}/regenerate   — Régénérer la clé de licence
GET    /superadmin/licenses/check/{key}       — Vérifier validité d'une clé
```

### Gestion des plans

```
GET    /superadmin/plans              — Liste des plans
POST   /superadmin/plans             — Créer un plan
GET    /superadmin/plans/{id}        — Détail d'un plan
PUT    /superadmin/plans/{id}        — Modifier un plan
DELETE /superadmin/plans/{id}        — Supprimer un plan

POST   /superadmin/plans/{id}/assign/{org_id} — Assigner plan à organisation
```

### Monitoring & Système

```
GET    /superadmin/monitoring/health       — Santé système (DB, Redis, Queue)
GET    /superadmin/monitoring/queues       — État des files d'attente
GET    /superadmin/monitoring/jobs         — Jobs en cours / échoués
POST   /superadmin/monitoring/jobs/{id}/retry — Rejouer un job
GET    /superadmin/monitoring/logs         — Logs système récents

GET    /superadmin/users                   — Tous les utilisateurs (cross-tenant)
POST   /superadmin/announcements           — Envoyer annonce à tous les tenants
```

---

## Groupe 3 — Organisation (utilisateurs connectés)

> Toutes ces routes ont les middlewares : `auth`, `verified`, `tenant`, `license`, `module:{module_slug}`

### Dashboard principal

```
GET    /dashboard                    — Dashboard avec widgets personnalisables
GET    /dashboard/widgets            — Configuration widgets
PUT    /dashboard/widgets            — Mettre à jour disposition widgets
```

---

### Module Agenda — `/agenda`

```
# Événements
GET    /agenda/events                — Liste des événements (vue calendrier/liste)
POST   /agenda/events               — Créer un événement
GET    /agenda/events/{id}          — Détail d'un événement
PUT    /agenda/events/{id}          — Modifier un événement
DELETE /agenda/events/{id}          — Supprimer un événement

# Gestion des participants
POST   /agenda/events/{id}/attendees        — Ajouter participants
DELETE /agenda/events/{id}/attendees/{uid}  — Retirer un participant
POST   /agenda/events/{id}/invite           — Envoyer invitation email

# Rappels
GET    /agenda/events/{id}/reminders        — Liste des rappels
POST   /agenda/events/{id}/reminders        — Ajouter un rappel
DELETE /agenda/events/{id}/reminders/{rid}  — Supprimer un rappel

# Synchronisation calendrier
GET    /agenda/sync/google               — OAuth Google Calendar
GET    /agenda/sync/google/callback      — Callback OAuth Google
POST   /agenda/sync/outlook              — Synchroniser avec Outlook
GET    /agenda/sync/ical                 — Export format iCal (.ics)

# Export
GET    /agenda/export                    — Export PDF/Excel période
```

---

### Module Courrier & GED — `/courrier`

```
# Courriers
GET    /courrier                     — Liste courriers (filtrable par type/statut)
POST   /courrier                    — Enregistrer un nouveau courrier
GET    /courrier/{id}               — Détail d'un courrier
PUT    /courrier/{id}               — Modifier un courrier
DELETE /courrier/{id}               — Supprimer (si non archivé)

# Actions courrier
POST   /courrier/{id}/assign        — Assigner à un agent/service
POST   /courrier/{id}/archive       — Archiver définitivement
POST   /courrier/{id}/transmit      — Transmettre à un service
POST   /courrier/{id}/acknowledge   — Accuser réception
GET    /courrier/{id}/history       — Historique de circulation
GET    /courrier/{id}/qr-code       — QR Code de traçabilité

# Documents attachés
GET    /courrier/{id}/documents           — Documents d'un courrier
POST   /courrier/{id}/documents          — Attacher un document
GET    /courrier/{id}/documents/{did}    — Télécharger un document
DELETE /courrier/{id}/documents/{did}   — Supprimer un document
POST   /courrier/{id}/documents/{did}/versions — Nouvelle version

# GED — Documents indépendants
GET    /courrier/documents                   — Bibliothèque de documents
POST   /courrier/documents                  — Uploader un document
GET    /courrier/documents/{id}             — Détail et téléchargement
PUT    /courrier/documents/{id}             — Modifier métadonnées
DELETE /courrier/documents/{id}            — Supprimer

GET    /courrier/documents/search           — Recherche full-text (Scout)
POST   /courrier/documents/{id}/ocr        — Lancer l'OCR sur le document
GET    /courrier/documents/{id}/summary    — Résumé IA du document

# Statistiques & Export
GET    /courrier/stats                      — Statistiques courrier
GET    /courrier/export                     — Export liste (PDF/Excel/CSV)
GET    /courrier/reference/generate         — Générer prochain numéro
```

---

### Module Réunions — `/reunions`

```
# Réunions
GET    /reunions                     — Liste des réunions
POST   /reunions                    — Planifier une réunion
GET    /reunions/{id}               — Détail d'une réunion
PUT    /reunions/{id}               — Modifier une réunion
DELETE /reunions/{id}               — Annuler une réunion
POST   /reunions/{id}/cancel        — Annuler avec notification aux participants

# Participants
GET    /reunions/{id}/participants            — Liste des participants
POST   /reunions/{id}/participants           — Ajouter participants + envoi convocations
DELETE /reunions/{id}/participants/{uid}     — Retirer un participant
PUT    /reunions/{id}/participants/{uid}/rsvp — Réponse convocation (accept/decline)
POST   /reunions/{id}/participants/{uid}/attendance — Marquer présence réelle

# Ordre du jour
GET    /reunions/{id}/odj                    — Ordre du jour
POST   /reunions/{id}/odj                   — Ajouter un point ODJ
PUT    /reunions/{id}/odj/{pid}             — Modifier un point
DELETE /reunions/{id}/odj/{pid}            — Supprimer un point
POST   /reunions/{id}/odj/reorder          — Réordonner les points
GET    /reunions/{id}/odj/pdf              — Exporter ODJ en PDF

# Procès-verbal
GET    /reunions/{id}/pv                    — PV d'une réunion
POST   /reunions/{id}/pv                   — Créer / Mettre à jour le PV
POST   /reunions/{id}/pv/generate          — Générer PV via IA
GET    /reunions/{id}/pv/pdf               — Télécharger le PV en PDF
POST   /reunions/{id}/pv/send              — Envoyer le PV aux participants

# Export & Statistiques
GET    /reunions/stats                      — Statistiques réunions
GET    /reunions/export                     — Export liste
```

---

### Module Tâches — `/taches`

```
# Tâches
GET    /taches                       — Liste des tâches (vue liste ou kanban)
POST   /taches                      — Créer une tâche
GET    /taches/{id}                 — Détail d'une tâche
PUT    /taches/{id}                 — Modifier une tâche
DELETE /taches/{id}                 — Supprimer une tâche

# Actions tâche
POST   /taches/{id}/assign          — Assigner à un utilisateur
PUT    /taches/{id}/status          — Changer le statut (Kanban drag-drop)
POST   /taches/{id}/complete        — Marquer comme terminée
POST   /taches/{id}/archive         — Archiver

# Commentaires
GET    /taches/{id}/comments              — Commentaires d'une tâche
POST   /taches/{id}/comments             — Ajouter un commentaire
PUT    /taches/{id}/comments/{cid}       — Modifier un commentaire
DELETE /taches/{id}/comments/{cid}      — Supprimer un commentaire

# Pièces jointes
GET    /taches/{id}/attachments           — Pièces jointes
POST   /taches/{id}/attachments          — Ajouter une pièce jointe
DELETE /taches/{id}/attachments/{aid}   — Supprimer

# Sous-tâches
POST   /taches/{id}/subtasks             — Créer une sous-tâche
PUT    /taches/{id}/subtasks/{sid}       — Modifier une sous-tâche
DELETE /taches/{id}/subtasks/{sid}      — Supprimer

# Vues et filtres
GET    /taches/my                        — Mes tâches
GET    /taches/kanban                    — Données vue Kanban
GET    /taches/overdue                   — Tâches en retard

GET    /taches/stats                     — Statistiques
GET    /taches/export                    — Export
```

---

### Module Communication — `/communication`

```
# Canaux (channels)
GET    /communication/channels              — Liste des canaux
POST   /communication/channels             — Créer un canal
GET    /communication/channels/{id}        — Détail d'un canal
PUT    /communication/channels/{id}        — Modifier un canal
DELETE /communication/channels/{id}        — Supprimer un canal
POST   /communication/channels/{id}/archive — Archiver un canal

# Membres d'un canal
GET    /communication/channels/{id}/members           — Liste des membres
POST   /communication/channels/{id}/members          — Ajouter des membres
DELETE /communication/channels/{id}/members/{uid}   — Retirer un membre
PUT    /communication/channels/{id}/members/{uid}/role — Changer le rôle

# Messages
GET    /communication/channels/{id}/messages          — Messages paginés
POST   /communication/channels/{id}/messages         — Envoyer un message
PUT    /communication/channels/{id}/messages/{mid}   — Modifier un message
DELETE /communication/channels/{id}/messages/{mid}  — Supprimer un message
POST   /communication/channels/{id}/messages/{mid}/react — Réaction emoji

# Fichiers partagés
POST   /communication/channels/{id}/files            — Partager un fichier
GET    /communication/channels/{id}/files            — Fichiers partagés dans le canal

# Notifications utilisateur
GET    /communication/notifications              — Mes notifications
PUT    /communication/notifications/read-all    — Marquer tout comme lu
PUT    /communication/notifications/{id}/read  — Marquer comme lu
DELETE /communication/notifications/{id}       — Supprimer une notification

# Présence (Reverb)
GET    /communication/online-users              — Utilisateurs en ligne
```

---

### Module Accueil — `/accueil`

```
# Visiteurs
GET    /accueil/visiteurs              — Liste des visiteurs (du jour par défaut)
POST   /accueil/visiteurs             — Enregistrer un visiteur
GET    /accueil/visiteurs/{id}        — Détail d'un visiteur
PUT    /accueil/visiteurs/{id}        — Modifier les infos visiteur
DELETE /accueil/visiteurs/{id}        — Supprimer un enregistrement

POST   /accueil/visiteurs/{id}/checkout — Enregistrer la sortie
GET    /accueil/visiteurs/{id}/badge   — Générer badge PDF temporaire

# Rendez-vous accueil
GET    /accueil/rendez-vous                — Rendez-vous du jour / à venir
POST   /accueil/rendez-vous               — Planifier un RDV accueil
GET    /accueil/rendez-vous/{id}          — Détail d'un RDV
PUT    /accueil/rendez-vous/{id}          — Modifier
DELETE /accueil/rendez-vous/{id}          — Annuler
POST   /accueil/rendez-vous/{id}/confirm  — Confirmer l'arrivée du visiteur

# Statistiques
GET    /accueil/stats                  — Stats du jour, semaine, mois
GET    /accueil/export                 — Export liste visiteurs
```

---

### Module Ressources — `/ressources`

```
# Ressources
GET    /ressources                     — Liste des ressources
POST   /ressources                    — Ajouter une ressource
GET    /ressources/{id}               — Détail d'une ressource
PUT    /ressources/{id}               — Modifier une ressource
DELETE /ressources/{id}               — Supprimer
POST   /ressources/{id}/deactivate    — Désactiver temporairement

# Catégories
GET    /ressources/categories              — Liste des catégories
POST   /ressources/categories             — Créer une catégorie
PUT    /ressources/categories/{id}        — Modifier
DELETE /ressources/categories/{id}        — Supprimer

# Réservations
GET    /ressources/reservations                — Mes réservations / toutes
POST   /ressources/reservations               — Créer une réservation
GET    /ressources/reservations/{id}          — Détail
PUT    /ressources/reservations/{id}          — Modifier
DELETE /ressources/reservations/{id}          — Annuler

POST   /ressources/reservations/{id}/approve  — Approuver (si approbation requise)
POST   /ressources/reservations/{id}/reject   — Rejeter avec motif
POST   /ressources/reservations/{id}/release  — Libérer avant l'heure

# Disponibilité
GET    /ressources/{id}/availability           — Créneaux disponibles (plage date)
GET    /ressources/{id}/calendar               — Vue calendrier de la ressource

# Stats & Export
GET    /ressources/stats                       — Taux d'utilisation, stats
GET    /ressources/export                      — Export
```

---

### Module RH — `/rh`

```
# Employés
GET    /rh/employees                   — Annuaire du personnel
POST   /rh/employees                  — Créer un dossier employé
GET    /rh/employees/{id}             — Fiche employé complète
PUT    /rh/employees/{id}             — Modifier la fiche
DELETE /rh/employees/{id}             — Archiver l'employé

POST   /rh/employees/{id}/activate    — Activer
POST   /rh/employees/{id}/deactivate  — Désactiver

# Départements / Services
GET    /rh/departments                — Liste des départements
POST   /rh/departments               — Créer un département
GET    /rh/departments/{id}          — Détail
PUT    /rh/departments/{id}          — Modifier
DELETE /rh/departments/{id}          — Supprimer

GET    /rh/orgchart                   — Organigramme (données JSON)

# Congés
GET    /rh/leaves                     — Toutes les demandes de congé
POST   /rh/leaves                    — Soumettre une demande de congé
GET    /rh/leaves/{id}               — Détail d'une demande
PUT    /rh/leaves/{id}               — Modifier (si pas encore approuvée)
DELETE /rh/leaves/{id}               — Annuler une demande

POST   /rh/leaves/{id}/approve       — Approuver
POST   /rh/leaves/{id}/reject        — Rejeter avec motif
GET    /rh/leaves/calendar           — Vue calendrier des congés

# Types de congé
GET    /rh/leave-types               — Types de congé (annuel, maladie, etc.)
POST   /rh/leave-types              — Créer un type
PUT    /rh/leave-types/{id}         — Modifier
DELETE /rh/leave-types/{id}         — Supprimer

# Présences
GET    /rh/attendances               — Registre de présence
POST   /rh/attendances              — Pointer (entrée/sortie)
GET    /rh/attendances/{id}         — Détail
PUT    /rh/attendances/{id}         — Corriger une saisie (manager)

# Stats & Export
GET    /rh/stats                     — Statistiques RH
GET    /rh/employees/export          — Export annuaire
GET    /rh/leaves/export             — Export congés
GET    /rh/attendances/export        — Export présences
```

---

### Module Rapports — `/rapports`

```
# Rapports
GET    /rapports                     — Bibliothèque de rapports
POST   /rapports                    — Créer un rapport personnalisé
GET    /rapports/{id}               — Détail d'un rapport
PUT    /rapports/{id}               — Modifier
DELETE /rapports/{id}               — Supprimer

POST   /rapports/{id}/generate      — Générer / Rafraîchir les données
GET    /rapports/{id}/export        — Exporter (PDF/Excel/CSV)
POST   /rapports/{id}/schedule      — Planifier (quotidien/hebdo/mensuel)

# Rapports prédéfinis par module
GET    /rapports/agenda/summary       — Résumé activité agenda
GET    /rapports/courrier/summary     — Bilan courrier (entrant/sortant/traitement)
GET    /rapports/reunions/summary     — Bilan réunions et taux de participation
GET    /rapports/taches/summary       — Bilan tâches (completion, délais)
GET    /rapports/accueil/summary      — Bilan visiteurs
GET    /rapports/ressources/usage     — Taux d'utilisation des ressources
GET    /rapports/rh/summary           — Bilan RH (effectifs, congés, présences)

# Dashboard analytique
GET    /rapports/dashboard/kpis       — KPI globaux organisation
GET    /rapports/dashboard/activity   — Flux d'activité récent
```

---

### Module Paramètres — `/parametres`

```
# Paramètres organisation
GET    /parametres/organization             — Paramètres de l'organisation
PUT    /parametres/organization             — Mettre à jour
POST   /parametres/organization/logo        — Changer le logo
DELETE /parametres/organization/logo        — Supprimer le logo

# Utilisateurs
GET    /parametres/users                    — Liste des utilisateurs de l'organisation
POST   /parametres/users                   — Inviter un utilisateur
GET    /parametres/users/{id}              — Détail
PUT    /parametres/users/{id}              — Modifier (rôle, département)
DELETE /parametres/users/{id}              — Retirer de l'organisation
POST   /parametres/users/{id}/activate     — Activer
POST   /parametres/users/{id}/deactivate   — Désactiver
POST   /parametres/users/{id}/resend-invite — Renvoyer l'invitation

# Rôles et permissions
GET    /parametres/roles                    — Liste des rôles
POST   /parametres/roles                   — Créer un rôle personnalisé
GET    /parametres/roles/{id}              — Détail + permissions
PUT    /parametres/roles/{id}              — Modifier
DELETE /parametres/roles/{id}              — Supprimer

PUT    /parametres/roles/{id}/permissions  — Mettre à jour les permissions d'un rôle

# Modules activés
GET    /parametres/modules                 — Modules disponibles et statuts
PUT    /parametres/modules                 — Activer/désactiver des modules

# Profil personnel
GET    /parametres/profile                 — Mon profil
PUT    /parametres/profile                 — Mettre à jour mon profil
POST   /parametres/profile/avatar         — Changer mon avatar
PUT    /parametres/profile/password       — Changer mon mot de passe
PUT    /parametres/profile/notifications  — Préférences de notification

# Intégrations
GET    /parametres/integrations            — Liste des intégrations disponibles
POST   /parametres/integrations/{slug}/connect    — Connecter une intégration
DELETE /parametres/integrations/{slug}/disconnect — Déconnecter
GET    /parametres/integrations/{slug}/test       — Tester la connexion

# Facturation (si non géré par portail externe)
GET    /parametres/billing/plan            — Plan actuel et détails
GET    /parametres/billing/invoices        — Historique des factures
GET    /parametres/billing/invoices/{id}   — Télécharger une facture
POST   /parametres/billing/upgrade         — Passer à un plan supérieur
```

---

## Groupe 4 — Routes Web Inertia (pages SSR)

> Ces routes retournent des composants Inertia (React) et correspondent aux URLs navigables.

```
GET    /                              — Landing page publique
GET    /tarifs                        — Page des tarifs / plans
GET    /contact                       — Formulaire de contact

GET    /login                         — Page de connexion
GET    /register                      — Page d'inscription (essai gratuit)
GET    /forgot-password               — Mot de passe oublié
GET    /reset-password/{token}        — Réinitialisation
GET    /verify-email                  — Vérification email

GET    /dashboard                     — Dashboard principal (auth)
GET    /agenda                        — Module Agenda
GET    /agenda/{id}                   — Détail événement
GET    /courrier                      — Module Courrier
GET    /courrier/{id}                 — Détail courrier
GET    /reunions                      — Module Réunions
GET    /reunions/{id}                 — Détail réunion
GET    /taches                        — Module Tâches (Kanban)
GET    /taches/{id}                   — Détail tâche
GET    /communication                 — Module Communication (messagerie)
GET    /accueil                       — Module Accueil visiteurs
GET    /ressources                    — Module Ressources
GET    /rh                            — Module RH
GET    /rh/employees/{id}             — Fiche employé
GET    /rapports                      — Module Rapports
GET    /rapports/{id}                 — Rapport détaillé
GET    /parametres                    — Paramètres organisation
GET    /parametres/users              — Gestion utilisateurs
GET    /parametres/roles              — Gestion des rôles
GET    /parametres/billing            — Facturation

# SuperAdmin (Inertia)
GET    /superadmin                    — Dashboard SuperAdmin
GET    /superadmin/organizations      — Liste des organisations
GET    /superadmin/organizations/{id} — Détail organisation
GET    /superadmin/licenses           — Gestion licences
GET    /superadmin/plans              — Gestion plans
GET    /superadmin/monitoring         — Monitoring système
```

---

## Groupe 5 — Canaux Broadcast (WebSockets Reverb)

> Définis dans `routes/channels.php`

```php
// Canal privé par utilisateur (notifications, messages directs)
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Canal privé par organisation (événements globaux)
Broadcast::channel('org.{orgId}', function ($user, $orgId) {
    return (int) $user->organization_id === (int) $orgId;
});

// Canal privé par module + organisation
Broadcast::channel('org.{orgId}.{module}', function ($user, $orgId, $module) {
    return (int) $user->organization_id === (int) $orgId
        && $user->hasPermissionTo("{$module}.view");
});

// Canal de présence (qui est en ligne dans quel module)
Broadcast::channel('presence-module.{orgId}.{module}', function ($user, $orgId, $module) {
    if ((int) $user->organization_id !== (int) $orgId) return false;
    return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar_url];
});

// Canal de messagerie (channel interne)
Broadcast::channel('chat.{channelId}', function ($user, $channelId) {
    return $user->channels()->where('channel_id', $channelId)->exists();
});
```

---

## Groupe 6 — API Webhook

```
POST   /webhooks/payment/{provider}   — Réception callbacks paiement (CinetPay, Orange Money, etc.)
POST   /webhooks/email/{provider}     — Callbacks email (Mailgun, SendGrid)
POST   /webhooks/license              — Callbacks serveur de licence IBIG Soft
```

---

## Résumé des endpoints par groupe

| Groupe | Nombre de routes | Middleware |
|--------|-----------------|------------|
| Auth | ~12 | `guest` / `auth` |
| SuperAdmin | ~35 | `auth, role:super_admin` |
| Dashboard | 3 | `auth, tenant, license` |
| Agenda | ~18 | `auth, tenant, license, module:agenda` |
| Courrier / GED | ~25 | `auth, tenant, license, module:courrier` |
| Réunions | ~22 | `auth, tenant, license, module:reunions` |
| Tâches | ~22 | `auth, tenant, license, module:taches` |
| Communication | ~18 | `auth, tenant, license, module:communication` |
| Accueil | ~14 | `auth, tenant, license, module:accueil` |
| Ressources | ~18 | `auth, tenant, license, module:ressources` |
| RH | ~28 | `auth, tenant, license, module:rh` |
| Rapports | ~15 | `auth, tenant, license, module:rapports` |
| Paramètres | ~30 | `auth, tenant, license` |
| Web Inertia | ~30 | `auth, tenant, license` |
| Canaux Reverb | 5 canaux | Auth + règles métier |
| Webhooks | 3 | `signed` (HMAC) |
| **TOTAL** | **~299** | — |
