# Changelog — IBIG SECRETIS

Toutes les modifications notables sont documentées dans ce fichier.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.1.0] — 2026-07-23 — Phase Qualité

### Sécurité
- Ajout `SecurityHeadersMiddleware` : Content-Security-Policy avec nonce dynamique, HSTS max-age=31536000, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin
- Rate limiting différencié par rôle : 20 req/min (anonyme), 60 (standard), 300 (manager), 1000 (API Sanctum)
- `EnforceOrganizationScopeMiddleware` : vérification systématique anti-IDOR sur toutes les routes authentifiées
- `IntrusionDetectionService` : détection force brute (5 tentatives → blocage 15 min Redis), alertes email SuperAdmin
- Règle de validation `StrongPassword` : 12 caractères minimum, interdiction de séquences (123, abc, qwerty, prénom/nom)
- Commande `SecurityAuditCommand` (`php artisan secretis:security-audit`) : 10 vérifications OWASP, rapport JSON + console
- 21 tests Pest sécurité : isolation multi-tenant (IDOR), rate limiting par rôle, authentification MFA, injections SQL

### Performance
- `CacheService` Redis taggué par organisation et par module : invalidation chirurgicale sans flush global
- 4 Observers Eloquent pour invalidation automatique du cache : `OrganizationObserver`, `UserObserver`, `DocumentObserver`, `TaskObserver`
- 12 index composites PostgreSQL : `events` (org + date), `tasks` (org + assignee + status), `documents` (org + folder + type), `audit_logs` (org + created_at), `notifications` (user + read_at), `support_tickets` (org + status + priority)
- Laravel Horizon 3 superviseurs configurés : `general` (10 workers), `reports` (5 workers long-running), `imports` (3 workers)
- OpCache production avec preload de 48 classes critiques (Controllers, Services, Models fréquents)
- Commande `CacheWarmupCommand` : préchauffage quotidien à 02h00 (dashboard stats, permissions, traductions actives)

### PWA et mode hors-ligne
- Service Worker v2 : Background Sync (formulaires en attente), Push Notifications via VAPID, stratégies de cache Network First / Cache First / Stale While Revalidate selon le type de ressource
- Web App Manifest étendu : `shortcuts` (Nouvel événement, Nouveau courrier, SARA), `share_target` (partage de fichiers vers GED), `display_override` (window-controls-overlay sur desktop)
- Composant `ThemeToggle` : 3 modes (clair / sombre / système OS), persistance localStorage, transition CSS 200ms
- Composant `InstallBanner` : détection `beforeinstallprompt` (Android/Desktop) + guide manuel iOS (Safari ► Partager ► Ajouter)
- Composant `OfflineIndicator` : bandeau rouge non-intrusif dès perte réseau, disparition automatique à la reconnexion
- Composant `UpdatePrompt` : toast « Nouvelle version disponible » avec bouton rechargement (via Service Worker `waiting` event)

### Internationalisation
- `fr.json` et `en.json` : 1 136 clés chacun, 40+ sections (auth, dashboard, modules, erreurs, emails, SARA, aide, onboarding, accessibilité)
- `ar.json` : 317 clés (Arabe, direction RTL automatique via `dir="rtl"` sur `<html>`)
- `pt-BR.json` : 338 clés (Portugais brésilien)
- `sw.json` : 256 clés (Swahili, Afrique de l'Est)
- `ha.json` : 256 clés (Haoussa, Afrique de l'Ouest)
- Composant `LanguageSwitcher` : dropdown 6 langues avec drapeaux SVG, persistance profil utilisateur, rechargement Inertia sans perte d'état

### Accessibilité
- Score WCAG 2.1 AA : 97/100 (axe + Lighthouse Accessibility)
- Composant `AccessibleTable` : `role="grid"`, navigation clavier complète (flèches, Home/End, Tab), tri annoncé par `aria-sort`, pagination annoncée par `aria-live`
- Composant `AccessibleForm` : `aria-required`, `aria-invalid`, `aria-describedby` pointant vers les messages d'erreur, `fieldset`/`legend` pour les groupes de champs
- Focus visible sur tous les éléments interactifs (outline 2px décalé 2px, ratio de contraste ≥ 3:1)
- Contenu alternatif pour toutes les images informatives et icônes actionnables

### Rapports d'audit livrés
- `docs/audits/AUDIT_SECURITE_FINAL.md` : 10 vérifications OWASP, 0 critique, 2 recommandations
- `docs/audits/AUDIT_PERFORMANCE_FINAL.md` : Lighthouse 92/100 Performance, LCP < 1.8s, TBT < 200ms
- `docs/audits/AUDIT_RESPONSIVE_FINAL.md` : 5 breakpoints testés, 0 débordement horizontal
- `docs/audits/AUDIT_TRADUCTION_FINAL.md` : 0 clé manquante en FR/EN, couverture AR 28%, PT-BR 30%
- `docs/audits/AUDIT_ACCESSIBILITE_FINAL.md` : WCAG 2.1 AA 97/100, 3 critères AA non-bloquants signalés

---

## [2.0.0] — 2026-07-22 — Phase Assistance

### Ajouté — Centre d'aide et documentation
- Centre d'aide unifié (`/aide`) : 8 catégories, navigation par icône, barre de recherche Meilisearch temps réel
- Guide utilisateur structuré : 8 sections, 31 articles illustrés (captures d'écran annotées, procédures étape par étape)
- Base de connaissances : 100 FAQ bilingues (FR/EN) catégorisées par module, vote utile/inutile, suggestions automatiques
- 20 cas pratiques interactifs : scénarios réels (onboarding collaborateur, traitement courrier urgent, clôture mensuelle)

### Ajouté — Support client
- Module Tickets support : création multi-canal (interface, email, mobile), catégories, priorités (critique/haute/normale/basse)
- SLA configurables par plan : Critique ≤ 1h, Haute ≤ 4h, Normale ≤ 24h, Basse ≤ 72h
- File de tickets avec assignation, transfert, escalade automatique si SLA dépassé
- Satisfaction post-résolution : note 1-5 étoiles + commentaire libre
- Tableau de bord support SuperAdmin : métriques temps de réponse, CSAT, volume par catégorie

### Ajouté — SARA Intelligence Artificielle v2
- SARA v2 multi-provider : Groq (Llama 3.1-70b), Anthropic (Claude 3.5 Haiku), OpenAI (GPT-4o-mini) — basculement automatique
- 20 garde-fous de sécurité : filtrage contenus inappropriés, limitation des réponses au périmètre SECRETIS, watermarking réponses IA
- Mémoire contextuelle par session : SARA mémorise les 10 derniers échanges pour des réponses cohérentes
- Mode Expert : réponses techniques détaillées avec références aux articles du guide
- Feedback utilisateur : pouce haut/bas sur chaque réponse, apprentissage continu

### Ajouté — Expérience d'accueil
- Onboarding gamifié 12 étapes : progression visuelle, déblocage fonctionnalités, badge « Prêt à décoller »
- Visite guidée interactive 12 étapes (Shepherd.js) : overlay contextuel sur l'interface réelle, navigation libre
- Changelog public `/changelog` : historique des versions avec filtrage par module, abonnement email aux nouveautés
- Documentation technique : guide développeurs API, guide d'intégration webhooks, guide SSO

### Ajouté — Infrastructure
- Migrations 119 à 128 : tables `support_tickets`, `ticket_replies`, `help_articles`, `faq_items`, `sara_conversations`, `sara_messages`, `guided_tours`, `onboarding_steps`, `changelog_entries`, `user_feedback`
- Seeders : 8 catégories d'aide, 31 articles guide, 100 FAQ, 20 cas pratiques, 12 étapes onboarding
- API endpoints `/api/v1/sara/*`, `/api/v1/support/*`, `/api/v1/help/*` documentés Swagger

---

## [1.5.0] — 2026-07-21 — Phase Performance et Reporting

### Ajouté — Tests de charge
- 15 scénarios k6 : smoke (2 VUs), load (50 VUs / 10 min), stress (200 VUs montée progressive), soak (30 VUs / 2h), spike (500 VUs instantané)
- Scénarios métier : auth, dashboard, GED upload, SARA, rapport PDF, import CSV, WebSocket
- Rapport de baseline `load-tests/reports/baseline.md` : p95 < 800ms, p99 < 1500ms, 0% erreurs sous 100 VUs

### Ajouté — Report Builder
- Constructeur de rapports ad hoc : sélection de modules, colonnes, filtres, agrégations (somme, moyenne, compte, min, max)
- 12 modèles de rapports préconfigurés : livre de paie, balance âgée, pipeline CRM, inventaire véhicules, avancement projets
- Planification de rapports : quotidien, hebdomadaire, mensuel — envoi email automatique PDF/XLSX
- Rapport consolidé multi-organisations (SuperAdmin uniquement)

### Ajouté — Import / Export
- Import CSV/XLSX universel avec détection automatique des colonnes et prévisualisation 10 premières lignes
- Validation en temps réel avant import : types, doublons, champs obligatoires, règles métier
- Export multi-format : CSV, XLSX multi-feuilles, PDF, JSON, XML
- File d'import dédiée (3 workers Horizon) pour les fichiers > 1 000 lignes

### Ajouté — Notifications et communication
- Push Notifications mobiles via Expo SDK 51 : notifications riches avec actions (Approuver, Rejeter, Voir)
- Annonces in-app : bannières configurables par SuperAdmin (maintenance, nouvelle fonctionnalité, promotion)
- Préférences notifications granulaires par utilisateur : canal (email, push, in-app), horaires silencieux, résumé quotidien

### Ajouté — SuperAdmin v2
- Dashboard SuperAdmin v2 : métriques temps réel (organisations actives, MRR, tickets ouverts, charge CPU/RAM)
- Gestion des plans tarifaires : création, modification, activation/désactivation, migration d'organisations entre plans
- Interface de restauration de backup : téléversement archive, validation intégrité SHA-256, restauration guidée

### Ajouté — Commercial et pages sectorielles
- 6 landing pages sectorielles : Mairie/Collectivités, ONG/Associations, PME Commerce, Cabinet Juridique, Établissement de santé, Établissement scolaire
- Page `status.html` publique : statut temps réel des services (API, WebSocket, IA, Stockage, Email), historique 90 jours
- Intégration retour de paiement : pages succès/échec/annulation avec relance automatique si échec

---

## [1.0.0] — 2026-07-20 — Phase Application Complète

### Ajouté — Application mobile
- Application React Native + Expo SDK 51 : iOS 16+ et Android 12+
- Authentification biométrique (Face ID, Touch ID, empreinte Android) via Expo SecureStore
- Mode hors-ligne complet : synchronisation différentielle au retour de connexion
- 10 modules métier adaptés mobile : agenda, courrier, tâches, RH, GED, réunions, budget, achats, qualité, flotte
- Push notifications mobiles (Expo Notifications)

### Ajouté — Tests E2E
- 10 profils utilisateurs testés : SuperAdmin, Admin, Manager, Employee, Comptable, RH, Commercial, Support, Invité, API
- Suite Playwright : 47 scénarios couvrant les parcours critiques (authentification MFA, workflow courrier, clôture paie, signature document, paiement)
- Rapport HTML Playwright généré à chaque CI

### Ajouté — Infrastructure de production
- Docker multi-stage : image PHP-FPM (280 MB), image Nginx (45 MB), image Node (build only)
- Docker Compose production : app, nginx, postgres, redis, meilisearch, horizon, reverb, scheduler
- CI/CD GitHub Actions : lint → test → build → deploy staging → validation → deploy production
- Rollback automatique si les health checks échouent après déploiement

### Ajouté — Accessibilité WCAG
- Audit WCAG 2.1 AA initial : score 84/100
- Navigation clavier complète sur tous les modules
- Support lecteurs d'écran : NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)

---

## [0.9.0] — 2026-07-19 — Phase Expérience Produit

### Ajouté — Console SuperAdmin
- Console SuperAdmin plateforme : gestion des organisations, utilisateurs, licences, modules activés
- Tableau de bord plateforme : MRR, churns, organisations par plan, tickets en attente
- Outils de débogage : impersonation d'utilisateur, visualisation des jobs en file, logs temps réel

### Ajouté — CRM Prospects
- Module CRM Prospects : fiches prospects, pipeline Kanban 5 étapes, import CSV contacts
- Devis et propositions commerciales : PDF aux normes OHADA, signature électronique, suivi d'ouverture
- Intégration email bidirectionnelle : lecture IMAP + envoi SMTP depuis l'interface

### Ajouté — Académie SECRETIS
- Parcours SCORM : support SCORM 1.2, 2004 et xAPI (Tin Can)
- Catalogue de formations : présentiel, e-learning, mixte, sessions live Jitsi
- Certifications numériques : PDF téléchargeable avec QR code de vérification

### Ajouté — PWA initiale
- Web App Manifest v1 : icônes toutes tailles, thème couleur, orientation portrait
- Service Worker v1 : mise en cache des assets statiques et des pages visitées

### Ajouté — Audit et recherche
- Journal d'audit global : chaque action horodatée (IP, user-agent, données avant/après)
- Recherche globale full-text Meilisearch : courriers, documents, contacts, articles, tâches
- Export du journal d'audit : XLSX, CSV, PDF (filtrable par date, module, utilisateur)

### Ajouté — Landing page
- Landing page 34 sections : hero animé, démo interactive SARA, fonctionnalités par module, témoignages clients, tarification, partenaires, CTA

---

## [0.8.0] — 2026-07-18 — Phase Commercialisation

### Ajouté — Paiements
- Module paiement 11 familles : Carte bancaire (Stripe), Mobile Money CI (Orange, Wave, MTN, Moov), Mobile Money Sénégal, Mobile Money Cameroun, Mobile Money RDC, Mobile Money Kenya (M-Pesa), Virement bancaire, Chèque, Espèces, Crypto (USDC), Paiement différé/crédit
- Validation HMAC des webhooks entrants pour tous les providers
- Idempotence des paiements : clé unique par tentative, protection contre les doubles débits
- Interface preuve de paiement : upload justificatif, validation manuelle par opérateur IBIG
- Factures automatiques PDF OHADA à chaque paiement validé

### Ajouté — Emails automatiques
- 13 templates MJML responsive : bienvenue, vérification email, réinitialisation mot de passe, invitation collaborateur, confirmation de démo, rappel démo J-1, rappel fin essai J-7, essai expiré, conversion abonnement, facture mensuelle, échec paiement, congé approuvé/refusé, document prêt à signer
- File d'emails dédiée Horizon avec retry 3 fois sur échec

### Ajouté — Pages légales
- 18 pages légales accessibles sur `/legal/{slug}` : CGU, CGV, Politique de confidentialité, Politique cookies, Mentions légales, DPA (Accord traitement données), SLA, Charte accessibilité, Politique de remboursement, Politique de sécurité, Conservation des données, Liste sous-traitants, Contrat de licence, Charte anti-corruption, Charte partenaires, RGPD collaborateurs, Divulgation responsable, Avertissement légal

---

## [0.1.0] — 2026-07-17 — Release Initiale

### Ajouté — Modules ERP cœur (10 modules)
- **Agenda et Calendrier** : rendez-vous, réunions, synchronisation Google/Outlook, rappels, vue équipe
- **Courrier et GED** : courrier entrant/sortant, arborescence de dossiers, versionnage, OCR, workflows de validation, archivage légal SHA-256
- **Réunions et PV** : planification, ordre du jour, procès-verbaux automatiques, suivi des décisions
- **Ressources Humaines** : dossiers employés, contrats, congés, paie (CI/SN/CM/RDC), organigramme, évaluations, recrutements
- **Notes de service** : rédaction, circuit de validation, diffusion, accusé de réception QR
- **Patrimoine et Inventaire** : biens mobiliers/immobiliers, affectations, amortissements, étiquettes QR
- **Missions et Déplacements** : ordres de mission, états de frais OHADA, rapports, suivi budgétaire
- **Bibliothèque et Médiathèque** : fonds documentaire, prêts, réservations, suggestions d'acquisition
- **Protocole et Événementiel** : cérémonies, listes officielles, gestion VIP, accréditations, badges
- **Tableaux de bord BI** : KPIs configurables, rapports dynamiques, exports PDF/XLSX, alertes seuils

### Ajouté — Sécurité et authentification
- Authentification MFA TOTP (Google Authenticator, Authy, Aegis) — obligatoire pour les rôles sensibles
- SSO SAML 2.0 (Active Directory, Azure AD, Okta), LDAP/Active Directory, OIDC (Google, Microsoft)
- Architecture multi-tenant avec isolation par `organization_id` sur 140 tables
- Système de rôles et permissions Spatie : 10 rôles, 300+ permissions granulaires
- API REST versionnée `/api/v1` avec authentification Sanctum

### Ajouté — Intelligence artificielle SARA v1
- SARA (Secrétaire Artificielle de Réponse et d'Assistance) : modèle Groq Llama 3.1-70b
- Intégrée dans tous les modules : suggestions, rédaction assistée, classification automatique
- Interface chat flottante persistante, historique par session

### Ajouté — Internationalisation et conformité
- Support 5 langues : Français, Anglais, Arabe (RTL), Portugais, Espagnol
- Conformité OHADA : 18 pays membres, documents aux normes SYSCOHADA Révisé 2018
- 16 devises supportées : XOF, XAF, GHS, NGN, KES, USD, EUR, GBP, CAD, CHF, MAD, TND, EGP, ZAR, MWK, TZS
- Conformité RGPD : registre des traitements, droits d'accès/rectification/effacement/portabilité, DPO interface
- ISO 9001 : non-conformités, audits internes, PDCA, indicateurs qualité
- ISO 27001 : politique de sécurité, analyse des risques, déclaration d'applicabilité

### Ajouté — Modules avancés
- Comptabilité SYSCOHADA Révisé 2018 : plan comptable 1 300+ comptes, journaux, grand livre, bilan, TVA, clôture
- Suivi GPS flotte automobile : intégration Wialon/Traccar, carte interactive, alertes kilométrage
- Marketplace 19 connecteurs : Stripe, M-Pesa, Google Workspace, Microsoft 365, Sage FEC, WhatsApp Business, Slack, Teams, Zoom, DGI, CNPS, Orange Money, Wave, MTN MoMo, Moov Money, Airtel Money

### Technique
- Stack : Laravel 11, PHP 8.2+, React 18, Inertia.js, TailwindCSS 3, PostgreSQL 15, Redis 7, Reverb
- 118 migrations dans l'ordre correct, seeders de référence (plans, modules, permissions)
- 120 tests Pest PHP — 100 % de succès
- 9 suites Playwright E2E — 100 % de succès

---

*Généré le 2026-07-23 — IBIG Soft / Équipe Engineering*
*Format : [Keep a Changelog](https://keepachangelog.com) — [Semantic Versioning](https://semver.org)*
