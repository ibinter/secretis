# Glossaire IBIG SECRETIS

Définitions des termes métier et techniques utilisés dans IBIG SECRETIS.

---

## A

**Action (DDD)**
Classe PHP représentant une opération métier atomique. Chaque action a une responsabilité unique : `CreateEventAction`, `AssignCourrierAction`. Les actions sont orchestrées par les Services et testées indépendamment. Patron de conception issu du Domain-Driven Design.

**Agent**
Utilisateur avec un rôle limité, chargé de la saisie de données ou du traitement des tâches qui lui sont assignées. Il n'a pas accès aux fonctions d'administration.

**Annuaire**
Dans le module RH, registre de l'ensemble du personnel d'une organisation. Inclut les coordonnées professionnelles, le poste, le département et l'organigramme.

**API Bearer Token**
Jeton d'authentification transmis dans l'en-tête HTTP `Authorization: Bearer {token}` pour authentifier les requêtes API REST. Émis par Laravel Sanctum.

**Archivage**
Action de basculer un courrier, document ou enregistrement dans un état définitif non modifiable. L'archivage préserve l'historique tout en retirant l'élément des listes actives.

**Attestation (Formation)**
Document PDF généré automatiquement à la fin d'un module de formation validé. Porte la signature électronique de l'administrateur et le contenu de la formation suivie.

**Audit Trail**
Journal chronologique et immuable de toutes les actions effectuées dans le système. Stocké dans la table `audit_logs` en insert-only. Contient : utilisateur, action, ressource, IP, timestamp, valeurs avant/après.

---

## B

**Badge Visiteur**
Document PDF temporaire généré lors de l'enregistrement d'un visiteur à l'accueil. Contient le nom du visiteur, le motif de visite, l'hôte et un QR code de validation.

**BelongsToTenant**
Trait PHP ajouté à tous les modèles Eloquent du domaine métier. Il injecte automatiquement un Global Scope pour filtrer les données par `organization_id`, garantissant l'isolation entre organisations.

**Bordereau de transmission**
Document récapitulatif généré lors du transfert d'un ou plusieurs courriers entre services. Sert de preuve de transmission dans la chaîne de traitement.

**Broadcast**
Mécanisme d'envoi d'événements depuis le serveur Laravel vers les clients connectés via WebSocket (Laravel Reverb). Utilisé pour les notifications temps réel, la messagerie et les mises à jour de statut.

---

## C

**Canal (Communication)**
Espace de messagerie thématique dans le module Communication. Peut être public (visible par tous les membres de l'organisation) ou privé (sur invitation). Exemples : `#général`, `#projets-2026`, `#direction`.

**CINETPAY**
Passerelle de paiement africaine intégrée à SECRETIS pour le traitement des abonnements. Supporte les cartes bancaires et le mobile money (Orange Money, MTN Money, Wave, Moov).

**Code d'erreur SECRETIS**
Identifiant unique préfixé `SEC-` attribué à chaque type d'erreur métier ou technique. Exemples : `SEC-001` (licence expirée), `SEC-005` (paiement déjà traité).

**Convocation**
Email automatique envoyé aux participants lors de la création ou modification d'une réunion. Contient l'ordre du jour, la date, le lieu et un lien de réponse RSVP.

**Courrier entrant**
Document reçu par l'organisation de la part d'un expéditeur externe. Enregistré avec la date de réception, le numéro d'ordre et assigné à un service pour traitement.

**Courrier interne**
Document circulant entre services au sein d'une même organisation. Tracé avec son historique de circulation.

**Courrier sortant**
Document émis par l'organisation vers un destinataire externe. Archivé avec la preuve d'envoi.

---

## D

**Dashboard**
Tableau de bord principal de l'application, personnalisable par l'utilisateur. Affiche les KPIs clés, les activités récentes et les alertes de chaque module activé.

**DDD (Domain-Driven Design)**
Approche architecturale choisie pour SECRETIS. Chaque domaine métier (Agenda, Courrier, etc.) est encapsulé dans un dossier `Domain/` avec ses propres modèles, actions, services et repositories.

**Département**
Unité organisationnelle au sein d'une organisation. Chaque employé est rattaché à un département. Les départements forment l'organigramme hiérarchique.

**DTO (Data Transfer Object)**
Objet immutable transportant des données validées entre les couches de l'application. Créé à l'aide de `spatie/laravel-data`. Exemple : `EventData` contenant les attributs d'un événement validés.

---

## E

**Eloquent**
ORM (Object-Relational Mapper) de Laravel utilisé pour interagir avec la base de données MySQL. Toutes les requêtes SECRETIS passent par Eloquent pour garantir l'isolation multi-tenant via les Global Scopes.

**Escalade**
Mécanisme par lequel une tâche non traitée dans les délais est automatiquement remontée à un niveau hiérarchique supérieur avec notification.

---

## F

**FIFO (First In First Out)**
Ordre de traitement des jobs dans les files d'attente Redis. Les jobs les plus anciens sont traités en premier, sauf pour la queue `high` qui a la priorité sur `default` et `low`.

**Fortify**
Package Laravel gérant les fonctionnalités d'authentification avancées : 2FA TOTP, vérification email, réinitialisation de mot de passe.

---

## G

**GED (Gestion Électronique de Documents)**
Fonctionnalité du module Courrier permettant de stocker, classer, rechercher et partager des documents numériques. Inclut le versioning, l'OCR et la recherche full-text.

**Global Scope**
Filtre Eloquent appliqué automatiquement à toutes les requêtes d'un modèle. Dans SECRETIS, le trait `BelongsToTenant` ajoute `WHERE organization_id = {id}` à toutes les requêtes du tenant courant.

**Grace Period**
Période de 7 jours après l'expiration d'un abonnement durant laquelle l'organisation conserve un accès limité à SECRETIS. Permet de régulariser la situation sans coupure brutale.

---

## H

**Horizon**
Dashboard Laravel pour la supervision des files d'attente (queues). Affiche les jobs en attente, en cours, échoués et les métriques de performance. Accessible à `/horizon` pour les super administrateurs.

---

## I

**IBIG Soft**
Société éditrice d'IBIG SECRETIS. Propriétaire de la marque, du code source et des droits intellectuels. Fournit le support, les mises à jour et la gestion des licences.

**Idempotence**
Propriété d'une opération qui produit le même résultat qu'elle soit exécutée une ou plusieurs fois. Appliquée aux paiements (code `SEC-005`) pour éviter la double facturation en cas de re-soumission d'un webhook.

**Inertia.js**
Framework JavaScript permettant de construire des applications SPA (Single Page Application) sans API REST, en partageant les données via les props des composants React. SECRETIS utilise Inertia.js v1.3 avec l'adaptateur React.

**Isolation tenant**
Garantie que les données d'une organisation ne sont jamais accessibles par les utilisateurs d'une autre organisation. Assurée par la combinaison du middleware `SetTenantMiddleware` et du trait `BelongsToTenant`.

---

## J

**Job**
Tâche asynchrone exécutée en arrière-plan par Laravel Horizon. Exemples : `ProcessOCRJob`, `SendReminderJob`, `GenerateReportJob`. Les jobs libèrent le thread HTTP principal.

---

## K

**Kanban**
Méthode visuelle de gestion de tâches représentée par un tableau avec colonnes de statut. Dans SECRETIS : `À faire → En cours → En revue → Terminé` (avec colonne supplémentaire `Bloqué`).

**KPI (Key Performance Indicator)**
Indicateur clé de performance. Dans SECRETIS, les KPIs sont calculés par module (taux d'archivage courrier, délai moyen de traitement, taux de participation aux réunions, etc.) et affichés sur le tableau de bord.

---

## L

**Licence**
Droit d'utilisation de SECRETIS accordé à une organisation par IBIG Soft. Peut être en période d'essai (trial), active, en période de grâce, expirée ou suspendue. Vérifiée à chaque requête.

**LicenseService**
Service PHP centralisant toute la logique de vérification et de gestion des licences. Retourne un statut parmi : `active`, `trial`, `grace`, `expired`, `suspended`.

---

## M

**Meilisearch**
Moteur de recherche full-text auto-hébergé, utilisé dans SECRETIS pour la recherche dans les courriers et les documents GED. Indexation temps réel via Laravel Scout.

**Mention (@)**
Dans le module Communication, référencement d'un utilisateur dans un message en tapant `@nom`. L'utilisateur mentionné reçoit une notification immédiate.

**Middleware**
Couche de traitement interceptant les requêtes HTTP avant qu'elles n'atteignent le contrôleur. SECRETIS utilise des middlewares dédiés pour la résolution du tenant, la vérification de licence, le RBAC et le contrôle d'accès aux modules.

**Module**
Unité fonctionnelle de SECRETIS correspondant à un domaine métier. Les modules peuvent être activés ou désactivés par plan d'abonnement. Les 10 modules sont : Agenda, Courrier, Réunions, Tâches, Communication, Accueil, Ressources, RH, Rapports, Paramètres.

**Multi-tenant**
Architecture permettant à une seule instance de SECRETIS de servir plusieurs organisations de manière isolée. Implémentée via une base de données unique avec la colonne `organization_id`.

---

## N

**Numérotation automatique**
Dans le module Courrier, génération automatique d'une référence unique par format `{ANNÉE}/{MOIS}/{SÉQUENCE}` (ex : `2026/07/00142`). La séquence est atomique et garantit l'unicité par organisation.

---

## O

**OCR (Optical Character Recognition)**
Extraction automatique du texte depuis des documents PDF scannés ou des images. SECRETIS utilise Tesseract 5 via le job `ProcessOCRJob`.

**ODJ (Ordre Du Jour)**
Liste structurée des points à traiter lors d'une réunion. Généré au format PDF et envoyé avec la convocation.

**ORM (Object-Relational Mapper)**
Outil faisant le lien entre les objets PHP et les tables de la base de données. SECRETIS utilise Eloquent ORM de Laravel exclusivement.

**Organisation**
Entité cliente de SECRETIS (un ministère, une entreprise, une ONG). Identifiée par un `slug` unique, elle constitue le tenant. Chaque organisation a ses propres utilisateurs, données et plan d'abonnement.

**Organigramme**
Représentation graphique de la hiérarchie d'une organisation. Généré dynamiquement dans le module RH à partir des liens département/responsable.

---

## P

**Permission**
Droit granulaire accordé à un rôle. Formulé en `module.action` : `courrier.assign`, `agenda.delete`, `rh.export`. Les permissions sont vérifiées à chaque requête via Spatie Laravel Permission.

**Plan**
Formule d'abonnement SECRETIS (STARTER, PRO, BUSINESS, ENTREPRISE) définissant les modules disponibles et le nombre maximum d'utilisateurs.

**PV (Procès-Verbal)**
Document officiel synthétisant le déroulement d'une réunion : participants, points abordés, décisions prises et actions à suivre. Généré automatiquement dans le module Réunions.

---

## Q

**Queue (File d'attente)**
Système de traitement asynchrone des tâches longues. SECRETIS utilise trois niveaux de priorité : `high` (notifications urgentes), `default` (emails, OCR), `low` (rapports planifiés, exports).

---

## R

**RAG (Retrieval-Augmented Generation)**
Architecture IA utilisée par SARA. Avant de répondre, le système récupère des documents pertinents de la base de données de l'organisation pour enrichir le contexte du modèle de langage.

**Rate Limiting**
Limitation du nombre de requêtes acceptées par période. SECRETIS applique : 60 requêtes/min sur l'API, 5 tentatives de connexion par email+IP, 3 demandes de réinitialisation de mot de passe par heure.

**RBAC (Role-Based Access Control)**
Contrôle d'accès basé sur les rôles. Chaque utilisateur a un rôle, chaque rôle a des permissions. Implémenté avec Spatie Laravel Permission.

**Reverb**
Serveur WebSocket natif de Laravel. Permet la communication bidirectionnelle en temps réel entre le serveur et les clients. Utilisé pour la messagerie, les notifications et la collaboration.

**Repository**
Pattern de conception isolant la couche de persistance. L'interface définit le contrat (méthodes), l'implémentation Eloquent contient le code SQL. Permet de changer de base de données sans modifier le code métier.

**Rôle**
Ensemble prédéfini de permissions assigné à un utilisateur. SECRETIS définit 10 rôles : `superadmin_ibig`, `admin_org`, `director`, `secretary`, `assistant`, `admin_responsible`, `receptionist`, `communication_officer`, `auditor`, `operator`.

**RSVP**
Réponse à une invitation de réunion. Un participant peut accepter ou refuser sa convocation, avec notification automatique à l'organisateur.

---

## S

**Sanctum**
Package Laravel gérant l'authentification des SPA (via cookies de session) et des API (via tokens Bearer). Utilisé dans SECRETIS pour les deux modes.

**SARA**
Secrétaire Assistante à Réponse Automatisée. Assistant IA intégré à SECRETIS utilisant une architecture RAG multi-fournisseur (OpenAI, Anthropic, Ollama) pour répondre aux questions contextuelles.

**Scout**
Package Laravel d'abstraction pour les moteurs de recherche full-text. SECRETIS l'utilise avec Meilisearch comme driver.

**Seeder**
Script PHP initialisant la base de données avec des données de référence (plans, permissions, rôles, superadmin, organisation de démonstration).

**Spatie**
Collection de packages PHP open-source largement utilisés dans SECRETIS : `laravel-permission` (RBAC), `laravel-multitenancy` (multi-tenant), `laravel-activitylog` (audit), `laravel-data` (DTOs).

**Superadmin IBIG**
Utilisateur de niveau plateforme employé par IBIG Soft. Accède à toutes les organisations pour le support, le monitoring et la gestion des licences. Rôle `superadmin_ibig`.

---

## T

**Tailwind CSS**
Framework CSS utilitaire utilisé pour l'interface SECRETIS. Configuré avec un design system personnalisé (tokens, couleurs, typographie).

**Tenant**
Synonyme d'organisation dans le contexte multi-tenant. Chaque tenant est isolé dans la base de données partagée.

**Tesseract**
Moteur OCR open-source utilisé pour extraire le texte des documents scannés. Version 5 recommandée.

**TOTP (Time-based One-Time Password)**
Algorithme de génération de codes d'authentification à usage unique valables 30 secondes. Utilisé pour le 2FA avec des applications comme Google Authenticator ou Authy.

**Trial**
Période d'essai gratuit de 14 jours accordée à toute nouvelle organisation. Donne accès à tous les modules du plan STARTER.

---

## U

**UUID**
Identifiant universel unique (Universally Unique Identifier). Utilisé comme identifiant public de certaines ressources SECRETIS pour éviter l'exposition d'ID numériques séquentiels dans les URLs.

---

## V

**Versioning (Documents)**
Fonctionnalité GED conservant toutes les versions successives d'un document. Chaque modification crée une nouvelle version avec horodatage, auteur et possibilité de restauration.

**Visiteur**
Personne extérieure à l'organisation enregistrée à l'accueil. Son passage est tracé : heure d'arrivée, heure de sortie, motif de visite, hôte reçu.

**Vite**
Outil de build JavaScript utilisé pour compiler les assets React et Tailwind CSS. Assure le hot module replacement (HMR) en développement et l'optimisation en production.

---

## W

**WebSocket**
Protocole de communication bidirectionnel persistant entre le client et le serveur. Utilisé par SECRETIS via Laravel Reverb pour la messagerie et les notifications temps réel.

**Webhook**
Notification HTTP envoyée par un service tiers (prestataire de paiement, fournisseur email) vers SECRETIS lorsqu'un événement survient. Sécurisée par signature HMAC.

---

## Z

**Zustand**
Bibliothèque de gestion d'état React légère utilisée dans SECRETIS pour les stores globaux : `authStore` (utilisateur courant), `tenantStore` (organisation courante), `notificationStore` (compteur et liste de notifications).
