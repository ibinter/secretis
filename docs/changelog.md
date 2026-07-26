# Changelog — IBIG SECRETIS

Tous les changements notables de ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte le [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [1.0.0] — 2026-07-21

Publication initiale d'IBIG SECRETIS — ERP de secrétariat africain.

### Added

#### Infrastructure et socle technique

- Architecture multi-tenant Single Database avec `organization_id` sur toutes les tables métier
- Trait `BelongsToTenant` avec Global Scope Eloquent automatique pour l'isolation des données
- Middleware stack complet : `SetTenantMiddleware`, `CheckLicenseMiddleware`, `CheckRBACMiddleware`, `CheckModuleAccessMiddleware`, `HandleInertiaRequests`
- Gestion des licences avec statuts : `active`, `trial`, `grace` (7j), `expired`, `suspended`
- Essai gratuit de 14 jours à la création d'une organisation
- Interface SuperAdmin IBIG (`/superadmin`) : gestion multi-tenant, licences, plans, monitoring
- Plans d'abonnement configurables : STARTER, PRO, BUSINESS, ENTREPRISE
- Système RBAC complet via Spatie Laravel Permission : 10 rôles, 60+ permissions granulaires
- Audit trail insert-only via Spatie ActivityLog (données sensibles masquées)
- Authentification Laravel Sanctum (SPA session + API Bearer token)
- Authentification à deux facteurs TOTP (Google Authenticator, Authy)
- Rate limiting : 5 tentatives par email+IP, lockout 60s
- Verrouillage de compte après 5 échecs consécutifs (15 minutes)
- Création d'organisation + admin en transaction atomique avec essai automatique
- Réinitialisation de mot de passe par email (anti-énumération d'utilisateurs)
- Exigences mot de passe : 12 caractères min, mixte, non compromis (Pwned Passwords)
- WebSocket temps réel via Laravel Reverb 1.x (canaux privés et de présence)
- File d'attente Redis avec Laravel Horizon (queues : high, default, low)
- Recherche full-text via Meilisearch et Laravel Scout
- Génération PDF via DomPDF (templates Blade)
- OCR de documents scannés via Tesseract
- Design system Tailwind CSS avec tokens de conception personnalisés
- Internationalisation bilingue français/anglais

#### Module 1 — Agenda

- Calendrier avec vues mensuelle, hebdomadaire et journalière
- Création, modification et suppression d'événements avec gestion des conflits horaires
- Gestion des participants avec statuts de présence (accepté, refusé, en attente)
- Rappels configurables envoyés par email et notification in-app
- Invitation par email avec lien d'acceptation/refus
- Export au format iCal (.ics) pour synchronisation externe
- Export de période en PDF et Excel
- Broadcast temps réel : `EventCreated`, `EventUpdated`, `EventCancelled`

#### Module 2 — Courrier / GED

- Enregistrement courrier entrant, sortant et interne
- Numérotation automatique par format `{ANNÉE}/{MOIS}/{SÉQUENCE}` (ex : `2026/07/00142`)
- Attribution et circulation du courrier entre services avec historique de traçabilité
- QR code de traçabilité par courrier
- Archivage définitif avec indexation
- Accusé de réception et transmission entre services
- Gestion Électronique de Documents : upload, téléchargement, partage
- Versioning des documents (historique complet des révisions)
- OCR automatique des documents PDF scannés via Tesseract
- Recherche full-text dans le contenu des documents (Meilisearch)
- Résumé automatique IA des documents
- Export liste courriers (PDF/Excel/CSV)
- Statistiques : volume par type, délais de traitement, taux d'archivage

#### Module 3 — Réunions

- Planification de réunions avec type, date, lieu (physique ou visio) et statut
- Envoi automatique des convocations par email aux participants
- Gestion de l'ordre du jour (points ajoutables, triables, supprimables)
- Export de l'ordre du jour en PDF
- Saisie des présences réelles (vs invités)
- Réponses RSVP des participants (acceptation/refus)
- Procès-verbal structuré avec génération assistée par IA depuis les notes
- Export PV en PDF et envoi automatique aux participants
- Suivi des décisions prises en réunion
- Broadcast temps réel : `ReunionCreated`, `ParticipantAdded`

#### Module 4 — Tâches

- Tableau Kanban avec colonnes : `à faire`, `en cours`, `en revue`, `terminé`, `bloqué`
- Drag-and-drop entre colonnes avec mise à jour statut en temps réel
- Assignation de tâches à un ou plusieurs utilisateurs
- Sous-tâches hiérarchiques
- Commentaires collaboratifs avec mentions d'utilisateurs
- Pièces jointes par tâche
- Priorités : basse, normale, haute, critique
- Deadlines avec alertes de dépassement
- Vue "Mes tâches" et vue "Tâches en retard"
- Export (PDF/Excel)
- Notification temps réel : `TacheAssigned`, `TacheStatusChanged`

#### Module 5 — Communication

- Messagerie interne temps réel via Laravel Reverb (WebSocket)
- Canaux thématiques créés par les administrateurs ou managers
- Envoi de messages texte, fichiers joints, liens
- Mentions d'utilisateurs (`@nom`)
- Réactions emoji sur les messages
- Partage de fichiers dans les canaux
- Gestion des membres par canal (rôles : admin, membre)
- Archivage de canaux
- Notifications système et utilisateur (in-app, email)
- Marquage lu/non-lu des notifications
- Liste des utilisateurs en ligne (canal de présence Reverb)

#### Module 6 — Accueil

- Enregistrement numérique des visiteurs (identité, motif, hôte désigné)
- Alerte temps réel à l'hôte à l'arrivée du visiteur
- Génération de badge visiteur temporaire (PDF)
- Enregistrement de la sortie des visiteurs
- Planification de rendez-vous d'accueil
- Confirmation d'arrivée par l'hôte
- Statistiques visiteurs : jour, semaine, mois
- Export liste visiteurs

#### Module 7 — Ressources

- Catalogue de ressources : salles de réunion, véhicules, matériels, équipements
- Catégorisation des ressources
- Réservation avec vérification de disponibilité en temps réel
- Workflow d'approbation optionnel (réservation soumise → approuvée/rejetée)
- Libération anticipée d'une ressource
- Calendrier de disponibilité par ressource
- Taux d'utilisation et statistiques d'occupation
- Export des réservations

#### Module 8 — Ressources Humaines

- Annuaire du personnel avec fiches employés complètes
- Organigramme interactif par département
- Gestion des départements et services
- Activation/désactivation des comptes employés
- Demandes de congé : types configurables (annuel, maladie, maternité, sans solde, etc.)
- Workflow de validation des congés (soumission → approbation/refus)
- Calendrier des congés de l'organisation
- Registre de présence/pointage
- Correction des saisies par les managers
- Statistiques RH : effectifs, soldes de congés, taux de présence
- Exports : annuaire, congés, présences

#### Module 9 — Rapports

- Tableaux de bord KPI globaux par organisation
- Rapports prédéfinis par module (Agenda, Courrier, Réunions, Tâches, Accueil, Ressources, RH)
- Rapports personnalisés créés par les administrateurs
- Planification de rapports récurrents (quotidien, hebdomadaire, mensuel)
- Envoi automatique des rapports planifiés par email
- Exports : PDF, Excel, CSV
- Flux d'activité récent de l'organisation

#### Module 10 — Paramètres

- Gestion des informations de l'organisation (nom, logo, coordonnées)
- Invitation d'utilisateurs par email avec assignation de rôle
- Gestion des rôles personnalisés et des permissions
- Activation/désactivation granulaire des modules
- Préférences de notification par utilisateur
- Gestion des intégrations tierces (connexion/déconnexion/test)
- Accès à la facturation, historique des factures, téléchargement PDF
- Profil personnel (avatar, mot de passe, préférences)

---

### Security

- Chiffrement des données sensibles avec la clé applicative Laravel (`encrypt()`)
- Tokens API stockés hashés (jamais en clair)
- Protection CSRF via tokens Laravel + cookies SameSite=Strict
- Headers de sécurité HTTP (X-Frame-Options, X-Content-Type-Options, HSTS)
- Rate limiting sur tous les endpoints d'authentification et d'API
- Audit trail complet avec adresses IP, User-Agent, timestamps
- Vérification d'intégrité des webhooks via signature HMAC
- Idempotence des paiements (code SEC-005) pour éviter la double facturation
- Données sensibles (mots de passe, tokens) masquées `[REDACTED]` dans les logs
- Politique de mot de passe renforcée (12 chars min, complexity + Pwned Passwords)
- Session regeneration après login pour prévenir la fixation de session

---

### Performance

- Cache Redis à deux niveaux (L1 PHP in-memory + L2 Redis)
- Paramètres organisation mis en cache 1h, permissions RBAC 15min
- Index de base de données sur toutes les colonnes `organization_id`, `created_at`, clés étrangères fréquentes
- Eager loading systématique des relations pour éviter le problème N+1
- Jobs asynchrones pour les tâches longues (OCR, génération PDF, envoi d'emails, rappels)
- Laravel Horizon pour la supervision et la priorisation des queues
- Pagination de toutes les listes (20 éléments par défaut, configurable)
- Assets compilés et optimisés par Vite (tree-shaking, code splitting par page Inertia)
- Compression Gzip activée sur Nginx pour les assets et les réponses JSON

---

[1.0.0]: https://github.com/ibigsoft/secretis/releases/tag/v1.0.0
