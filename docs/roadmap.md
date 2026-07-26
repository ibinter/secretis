# IBIG SECRETIS — Roadmap Produit

> Dernière mise à jour : 21 juillet 2026 | Responsable produit : Équipe IBIG Soft

---

## Version 1.0 (actuelle) — Fondations du secrétariat numérique

**Date de livraison** : Juillet 2026  
**Statut** : Production

### Fonctionnalités livrées

| Module | Fonctionnalités clés |
|--------|----------------------|
| **Agenda** | Calendrier mensuel/semaine/jour, gestion des participants, rappels par email, synchronisation iCal (import), export PDF |
| **Courrier / GED** | Enregistrement courrier entrant/sortant/interne, numérotation automatique `{ANNÉE}/{MOIS}/{SEQ}`, GED avec versioning, OCR Tesseract, recherche full-text Meilisearch, QR code de traçabilité |
| **Réunions** | Planification, convocations email automatiques, ordre du jour structuré, procès-verbal généré par IA, export PDF, suivi des décisions |
| **Tâches** | Kanban (todo/en_cours/revue/terminé/bloqué), sous-tâches, commentaires collaboratifs, pièces jointes, deadlines, vues par utilisateur |
| **Communication** | Messagerie interne temps réel (WebSocket Reverb), canaux thématiques, mentions (@), réactions emoji, partage de fichiers, notifications push/email |
| **Accueil** | Registre visiteurs numérique, badge temporaire PDF, rendez-vous d'accueil, alerte temps réel à l'hôte, export journalier |
| **Ressources** | Réservation salles/véhicules/matériels, vérification disponibilité, workflow approbation, calendrier de ressource, taux d'utilisation |
| **RH** | Annuaire personnel, organigramme interactif, demandes de congé (workflow validation), registre de présence, export Excel |
| **Rapports** | Tableaux de bord KPI par module, rapports planifiés (quotidien/hebdo/mensuel), exports PDF/Excel/CSV, rapports personnalisés |
| **Paramètres** | Gestion organisation, utilisateurs, invitations email, rôles RBAC custom, modules activés/désactivés, intégrations, facturation |

### Infrastructures livrées

- Architecture multi-tenant (Single DB + `organization_id`)
- Authentification Sanctum (SPA + API Bearer)
- 2FA TOTP (Google Authenticator, Authy)
- RBAC complet (10 rôles, 60+ permissions granulaires)
- Audit trail complet (insert-only, données sensibles masquées)
- Gestion des licences (trial 14j, abonnement, grace period 7j, suspension)
- Interface SuperAdmin IBIG (gestion multi-tenant, monitoring)
- Monitoring des files d'attente (Laravel Horizon)
- Rate limiting (API + authentification)

### Technologies

Laravel 11 · React 18 · Inertia.js · Tailwind CSS 3.4 · MySQL 8.0 · Redis 7 · Laravel Reverb · Laravel Horizon · Spatie Permission · Spatie Multitenancy · Meilisearch · DomPDF · Tesseract OCR · Pest PHP

---

## Version 1.1 — Améliorations et mobilité

**Horizon cible** : T4 2026 (3 mois après v1.0)  
**Statut** : Planification

### Nouvelles fonctionnalités

#### 1. Synchronisation Google Calendar bidirectionnelle
- OAuth 2.0 Google Calendar API
- Sync bidirectionnelle : SECRETIS → Google et Google → SECRETIS
- Résolution intelligente des conflits
- Tokens stockés chiffrés, auto-rafraîchissement

#### 2. Signature électronique native
- Signature manuscrite sur tablette/mobile (canvas HTML5)
- Signature qualifiée par code OTP email/SMS
- Intégration directe dans le module Courrier et Documents
- Certificat d'authenticité PDF généré
- Sans dépendance à Docusign ou DocuSign

#### 3. OCR avancé sur PDF scannés
- Amélioration du pipeline Tesseract (prétraitement image)
- Support multi-pages
- Extraction structurée (tableaux, en-têtes, dates)
- File d'attente prioritaire pour les documents urgents

#### 4. Mode sombre complet
- Thème sombre natif (CSS variables + Tailwind dark mode)
- Préférence système respectée (`prefers-color-scheme`)
- Persistance du choix utilisateur
- Tous les composants et modules couverts

#### 5. Application mobile React Native
- iOS (App Store) et Android (Google Play)
- Modules prioritaires : Agenda, Tâches, Communication, Accueil visiteurs
- Mode hors-ligne pour la consultation
- Notifications push native (FCM + APNs)
- Authentification biométrique (Face ID, empreinte)

#### 6. Import Excel pour le module RH
- Import en masse des dossiers employés depuis Excel
- Validation des données avec rapport d'erreurs
- Mapping configurable des colonnes

#### 7. Tableau de bord personnalisable
- Widgets drag-and-drop par module
- KPIs configurables par utilisateur
- Sauvegarde de la disposition par rôle

#### 8. Notifications SMS (Afrique)
- Intégration Orange SMS API, MTN SMS API
- Alertes configurable : rappels de réunion, tâches échues, visiteurs
- Gestion des crédits SMS dans l'interface admin

#### 9. Export avancé Courrier
- Export en lot (sélection multiple + PDF groupé)
- Bordereau de transmission automatique
- Étiquettes QR code en lot (impression)

#### 10. Améliorations UX générales
- Raccourcis clavier globaux (naviguer entre modules)
- Tour guidé interactif pour les nouveaux utilisateurs
- Recherche globale unifiée (tous modules, barre de commande)

---

## Version 2.0 — Extension fonctionnelle majeure

**Horizon cible** : T2-T3 2027 (6-9 mois après v1.0)  
**Statut** : Vision approuvée

### Nouveaux modules

#### Module Comptabilité légère
- Émission de factures clients (numérotation, TVA, remises)
- Suivi des paiements et des impayés
- Relances automatiques (email, SMS)
- Tableau de bord cash-flow mensuel
- Intégration paiements : CinetPay, Orange Money, Wave
- Export comptable (format standardisé)

#### Module Gestion de projets avancée
- Structure Projet > Phases > Jalons > Tâches
- Diagramme de Gantt interactif (drag-and-drop)
- Suivi budgétaire et écart prévisionnel
- Gestion des ressources humaines sur projets
- Tableau Kanban étendu par projet
- Rapports d'avancement automatiques

#### Module Formation interne (e-learning)
- Catalogue de formations internes
- Modules de cours (texte, vidéo, PDF, quiz)
- Suivi de progression par employé
- Génération automatique d'attestations (PDF signé)
- Tableau de bord de conformité formation
- Intégration module RH (plan de formation)

#### Portail client / partenaire externe
- Espace dédié pour les partenaires extérieurs
- Accès limité et contrôlé (sans compte interne)
- Partage de documents et suivi de dossiers
- Communication sécurisée avec l'organisation
- Authentification par lien magique (sans mot de passe)

#### API publique documentée
- API REST v1 ouverte pour intégrations tierces
- Documentation interactive Swagger / OpenAPI 3.1
- Gestion de clés API par organisation
- Webhooks outbound configurables
- Rate limiting par clé, métriques d'usage

#### Intégration ERP partenaires
- Connecteur SAP (Import/Export données RH et documents)
- Connecteur Odoo (Synchronisation contacts, commandes)
- Connecteur Microsoft 365 (SharePoint, Teams)
- Framework d'intégration extensible (adapters)

#### Business Intelligence avancée
- Cubes OLAP multi-dimensionnels
- Rapports personnalisables par glisser-déposer
- Indicateurs croisés entre modules
- Exports vers Excel avec tableaux croisés dynamiques
- Alertes automatiques sur seuils configurables

#### Gestion des contrats
- Suivi cycle de vie des contrats (draft → signé → actif → expiré)
- Alertes d'expiration configurables
- Versioning des contrats
- Signature électronique intégrée
- Extraction IA des clauses clés

#### Annuaire contacts externe
- Répertoire des contacts externes (fournisseurs, partenaires, clients)
- Import CSV/vCard
- Historique des interactions par contact
- Lien avec le module Courrier (expéditeur/destinataire connu)

#### Gestion des archives physiques
- Référencement des boîtes d'archives physiques
- QR code par boîte et par dossier physique
- Localisation (salle, étagère, travée)
- Demande de consultation en ligne
- Plan de conservation et destruction planifiée

#### Tableau de bord dirigeant
- Vue exécutive consolidée (tous modules)
- KPIs stratégiques personnalisables
- Comparaisons périodiques (mois/trimestre/année)
- Partage de dashboard en lecture seule
- Export PDF du tableau de bord complet

---

## Version 3.0 — Vision long terme

**Horizon cible** : 2027-2028 (12-18 mois après v1.0)  
**Statut** : Vision stratégique

### SECRETIS Mobile natif (iOS + Android)
- Applications natives Swift (iOS) et Kotlin (Android)
- Couverture complète des 10 modules
- Mode hors-ligne complet avec synchronisation différée
- Biométrie, notifications push avancées
- Scanner de documents intégré (caméra)

### Intelligence artificielle avancée
- Prédictions : tâches à risque de retard, courrier à traiter en priorité
- Automatisations intelligentes : classification auto courrier, rappels proactifs
- Assistant vocal pour la saisie (annulation de réunions, ajout tâche)
- Analyse de sentiment sur les communications internes
- Synthèse automatique des réunions (audio → PV)

### Marketplace de modules tiers
- Plateforme ouverte aux développeurs partenaires
- Modules tiers certifiés IBIG (secrétariat juridique, médical, universitaire)
- Système de licences modules tiers
- Revues et notes par les organisations
- Intégration via API publique v2

### SECRETIS On-Premise
- Version auto-hébergée pour les organisations avec contraintes de souveraineté
- Image Docker officielle (docker-compose + Kubernetes)
- Licence perpétuelle avec maintenance annuelle
- Mises à jour manuelles contrôlées
- Support dédié on-premise

### Certification ISO 27001
- Audit de sécurité complet par organisme tiers
- Mise en conformité procédures internes IBIG Soft
- Documentation SMSI (Système de Management de la Sécurité de l'Information)
- Certification délivrée et renouvelée annuellement
- Avantage concurrentiel pour les marchés institutionnels

### Autres initiatives v3.0
- SECRETIS Government (version adaptée administrations publiques)
- Conformité RGPD renforcée avec portabilité des données
- Multi-langues étendu (Anglais, Arabe, Portugais, Wolof)
- Infrastructure edge computing (CDN Afrique)
- Programme partenaires revendeurs certifiés

---

## Suivi des versions

| Version | Date cible | Statut |
|---------|------------|--------|
| 1.0.0 | Juillet 2026 | Livré |
| 1.1.0 | Octobre 2026 | En planification |
| 2.0.0 | T2 2027 | Vision approuvée |
| 3.0.0 | 2028 | Vision stratégique |

---

*Roadmap sujette à modifications selon les retours clients et les priorités produit. Pour proposer une fonctionnalité : ouvrir une issue GitHub avec le label `enhancement` ou écrire à product@ibigsoft.com.*
