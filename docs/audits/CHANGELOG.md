# Changelog — IBIG SECRETIS ERP

Toutes les modifications notables sont documentées dans ce fichier.  
Format : [Semantic Versioning](https://semver.org/lang/fr/)

---

## [2.0.0] — Phase 2 — 2026-07-22

### Ajouts majeurs

#### Présence commerciale
- **Landing page commerciale complète** (34 zones) — landing-page/ avec SARA IA, démo interactive, témoignages, tarifs, partenaires
- **Formulaire de demande de démo** avec confirmation email automatique
- **Bandeau de cookies** RGPD conforme avec consentement granulaire
- **PWA** — manifest, service worker, installation bureau/mobile

#### Contenu légal
- **18 pages légales** accessibles sur `/legal/{slug}` : CGU, CGV, Confidentialité, Cookies, Mentions légales, DPA, SLA, Charte accessibilité, Politique remboursement, Politique sécurité, Conservation données, Sous-traitants, Contrat licence, Anti-corruption, Charte partenaires, RGPD collaborateurs, Divulgation responsable, Avertissement légal

#### Emails automatiques
- **13 templates MJML** : bienvenue, vérification, reset password, invitation, confirmation démo, rappel démo, rappel essai J-7, essai expiré, conversion abonnement, facture mensuelle, paiement échoué, congé approuvé/refusé, document prêt à signer

#### Documentation utilisateur
- **Guide utilisateur FR** (15 parties) — docs/guide-utilisateur/
- **100 FAQ** — catégorisées par module, recherche plein texte Meilisearch
- **Centre d'aide unifié** — /aide avec navigation par catégorie

#### Expérience utilisateur
- **Onboarding interactif** (6 étapes) — guidage à la première connexion
- **Visite guidée interactive** (7 étapes) — overlay Shepherd.js sur l'interface réelle
- **Données de démonstration** — 3 organisations fictives réalistes (AKOMA Trading, BENKADI Consulting, SOFAMEX Industries)
- **Mode prise en main sécurisée** (sandbox) — données en lecture seule, reset automatique 24 h

#### SEO & Analytics
- **Sitemap XML dynamique** — `/sitemap.xml` avec hreflang FR/EN
- **Robots.txt dynamique** — `/robots.txt`
- **Métadonnées Open Graph et Twitter Card** sur toutes les pages
- **Données structurées JSON-LD** — SoftwareApplication, FAQPage, Organization, BreadcrumbList
- **Analytics landing page** — table `landing_analytics`, `LandingAnalyticsService`
- **Dashboard analytics SuperAdmin** — `LandingDashboard.jsx` avec Recharts

#### Infrastructure
- **3 nouvelles migrations** (119–123)
- **Variables d'environnement** ajoutées : `DEMO_MODE`, `ANALYTICS_ENABLED`, `LEGAL_VERSION`, `BACKUP_ARCHIVE_PASSWORD`

---

## [1.0.0] — Phase 1 (12 vagues) — 2026-07-22

### Modules livrés

#### Vague 1 — Architecture & Sécurité
- Architecture multi-tenant isolée (organization_id global scope)
- Authentification SSO (LDAP, SAML, OAuth2 — Google, Microsoft)
- 2FA TOTP (Google Authenticator, Authy)
- Système de rôles et permissions (Spatie, 300+ permissions, 10 rôles)
- SuperAdmin plateforme (gestion organisations, licences, monitoring)
- API REST versionnée (Sanctum, routes /api/v1)
- WebSocket temps réel (Laravel Reverb)

#### Vague 2 — Comptabilité SYSCOHADA
- Plan comptable SYSCOHADA Révisé 2018 (8 classes, 1 300+ comptes)
- Journaux comptables (OD, Achats, Ventes, Banque)
- Grand livre, Balance générale
- Bilan et Compte de résultat SYSCOHADA
- Déclaration TVA
- Rapprochement bancaire
- Clôture d'exercice
- Connecteur FEC Sage

#### Vague 3 — Ressources Humaines
- Fiche employé complète (personnel, contrat, compétences, documents)
- Gestion des contrats (CDI, CDD, stage, prestation)
- Congés et absences (quotas, workflow approbation, calendrier)
- Calcul de la paie (cotisations CI/Sénégal/Cameroun/RDC)
- Organigramme interactif (drag & drop)
- Évaluations de performance
- Recrutements (offres, candidatures, entretiens)

#### Vague 4 — CRM
- Gestion des prospects et contacts (import CSV)
- Pipeline commercial Kanban (5 étapes configurables)
- Devis et propositions commerciales (PDF OHADA)
- Suivi des activités et relances
- Intégration email (IMAP/SMTP lecture + envoi)
- Rapports CRM (conversion, performance commerciale)

#### Vague 5 — GED
- Arborescence de dossiers illimitée
- Upload multi-fichiers avec progress bar
- Versionnage automatique des documents
- OCR intégré (Tesseract 5, PDF + images)
- Signature électronique (dessinée + certifiée RSA)
- Workflow de validation multi-niveaux
- Archivage légal avec QR code de vérification
- Hash SHA-256 sur tous les documents

#### Vague 6 — Gestion de Projets
- Création et gestion de projets (Agile & Classique)
- Tâches et sous-tâches (priorité, assignation, dépendances)
- Diagramme de Gantt interactif
- Jalons (milestones) avec alertes
- Budget de projet (suivi engagements vs réel)
- Collaboration (commentaires, fichiers joints, mentions)

#### Vague 7 — Budget
- Budgets annuels par département / centre de coût
- Engagements de dépenses avec validation hiérarchique
- Suivi des écarts budgétaires en temps réel
- Alertes de dépassement configurables (50 %, 80 %, 100 %)
- Rapports budget vs réalisé (export XLSX multi-feuilles)

#### Vague 8 — Achats
- Catalogue fournisseurs avec évaluation
- Appels d'offres (RFQ) avec comparaison des offres
- Bons de commande OHADA (PDF, signature, QR code)
- Réception et contrôle qualité
- Portail fournisseurs (accès extranet)

#### Vague 9 — Formation & E-learning
- Catalogue de formations (présentiel, e-learning, mixte)
- Support SCORM 1.2 et 2004
- Quiz et évaluations (QCM, vrai/faux, texte libre)
- Certifications et badges numériques (PDF téléchargeable)
- Parcours d'apprentissage personnalisés (LearningPath)
- Sessions en direct (Live Training avec Jitsi)

#### Vague 10 — Qualité ISO 9001
- Enregistrement et suivi des non-conformités
- Audits internes (planification, rapport, clôture)
- Plans d'action corrective (PDCA)
- Indicateurs qualité (KPIs, tableaux de bord)
- Revue de direction (compte-rendu structuré)

#### Vague 11 — Parc Automobile & GPS
- Gestion du parc véhicules (fiches, assurances, contrôles)
- Planning d'entretien (préventif, correctif, alerte kilométrage)
- Gestion des sinistres et accidents
- Suivi GPS temps réel (webhook générique + Wialon)
- Tableau de bord flotte (carte interactive, alertes)

#### Vague 12 — BI, Intégrations & Modules transverses
- Tableaux de bord BI personnalisables (Recharts)
- Constructeur de rapports ad hoc
- Exports XLSX multi-feuilles, CSV, PDF
- API publique REST (portail développeurs, documentation Swagger)
- Webhooks sortants (signatures HMAC)
- Connecteurs : Sage FEC, Stripe, M-Pesa, Google Workspace, Microsoft 365
- Module Gestion Courrier (entrant/sortant, QR accusé réception)
- Module Réception visiteurs (badges QR, préinscription)
- RGPD & protection des données (droit accès, effacement, portabilité)
- ISO 27001 — Tableau de bord conformité
- Centre d'aide interne (base de connaissances)

### Technique v1.0.0
- **118 migrations** dans l'ordre correct
- **Seeders** : Organisation, Utilisateurs, Rôles/Permissions, Licences
- **120 cas de test Pest** — 100 % de succès
- **9 suites Playwright E2E** — 100 % de succès
- **15 scénarios k6** — 14/15 PASS, 1 acceptable
- **Stack :** Laravel 11, PHP 8.3, React 18, Inertia.js, Tailwind CSS 3, MySQL 8, Redis, Reverb

---

*Généré le 2026-07-22 — IBIG Soft / Équipe Engineering*
