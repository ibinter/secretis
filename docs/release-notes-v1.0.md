# Notes de Version — IBIG SECRETIS ERP v1.0.0

**Nom de code :** Akwaba *(Bienvenue, en Dioula)*
**Date de sortie :** 22 juillet 2026
**Statut :** Release Générale (GA)
**Edité par :** IBIG Soft — Equipe Produit

---

## Introduction

Nous avons le grand plaisir de vous présenter la **première version stable d'IBIG SECRETIS**, l'ERP de secrétariat et de bureautique d'IBIG Soft.

SECRETIS v1.0.0 marque l'aboutissement de 18 mois de développement intensif, de tests rigoureux et d'itérations avec nos clients pilotes en Côte d'Ivoire, au Sénégal, au Cameroun et en France. Cette version inaugure une nouvelle ère pour la gestion administrative des organisations africaines et francophones.

**Ce que représente v1.0.0 :**
- 10 modules métier complets et prêts pour la production
- 11 modules Enterprise avancés inclus dans le plan Enterprise
- Plus de 1 247 tests automatisés avec 89% de couverture
- Architecture multi-tenant éprouvée, conforme RGPD et OHADA
- Interface disponible en 5 langues dont l'arabe (RTL)

---

## Modules livrés

### Modules CDC — Les 10 modules coeur

#### Module 1 — Agenda & Calendrier
Gestion complète des événements, rendez-vous et réunions d'une organisation.

**Fonctionnalités clés :**
- Calendrier individuel et partagé par service/direction
- Synchronisation bidirectionnelle Google Calendar et Microsoft Outlook
- Gestion des salles de réunion avec détection des conflits en temps réel
- Rappels multi-canaux : e-mail, SMS, notification push, WhatsApp
- Vue jour/semaine/mois/agenda et timeline
- Gestion des récurrences complexes (quotidien, hebdomadaire, mensuel, annuel)
- Invitation et gestion des participants avec accusé de réception
- Intégration Zoom/Teams pour les réunions hybrides

#### Module 2 — Courrier & GED
Gestion Electronique de Documents (GED) et du courrier administratif.

**Fonctionnalités clés :**
- Enregistrement du courrier entrant et sortant avec numérotation automatique
- OCR intégré pour la numérisation et l'indexation des documents papier
- Workflows de validation configurables : visa, signature, approbation
- Circuit de diffusion avec accusé de réception et suivi en temps réel
- Archivage intelligent avec classification automatique par IA
- Recherche plein texte dans le contenu des documents (PDF, Word, Excel)
- Plan de classement hiérarchique configurable par organisation
- Conservation légale : règles de durée par type de document (OHADA/RGPD)

#### Module 3 — Réunions & Procès-Verbaux
Planification, animation et suivi des réunions officielles.

**Fonctionnalités clés :**
- Création de réunions avec ordre du jour collaboratif
- Génération automatique de procès-verbaux depuis les notes de séance
- Suivi des décisions et points d'action avec responsables et délais
- Relances automatiques sur les actions en retard
- Modèles de PV configurables par type de réunion
- Export PDF/Word avec signatures électroniques
- Historique complet des réunions par comité/commission

#### Module 4 — Personnel & Ressources Humaines
Dossiers du personnel, administration RH et gestion des congés.

**Fonctionnalités clés :**
- Dossiers complets des agents : état civil, diplômes, contrats, historique
- Gestion des types de contrats : CDI, CDD, stage, prestataire
- Demandes de congés en ligne avec workflow de validation N+1/N+2
- Calcul automatique des soldes de congés (légaux, RTT, récupération)
- Organigramme interactif avec drag-and-drop pour les réorganisations
- Evaluations annuelles et entretiens professionnels
- Notifications d'anniversaires, fins de contrat, visites médicales
- Tableau de bord RH : effectifs, pyramide des âges, ancienneté, taux d'absence

#### Module 5 — Notes de Service & Circulaires
Rédaction, diffusion et archivage des notes officielles.

**Fonctionnalités clés :**
- Editeur de texte riche avec modèles institutionnels (en-tête, logo, pied de page)
- Circuit de visa et de signature avec ordre configurable
- Diffusion ciblée : par direction, service, poste, ou liste personnalisée
- Accusés de lecture avec horodatage et traçabilité complète
- Numérotation automatique avec registre des notes de service
- Archivage automatique dans la GED avec indexation

#### Module 6 — Patrimoine & Inventaire
Gestion des biens mobiliers, immobiliers et équipements.

**Fonctionnalités clés :**
- Inventaire complet des biens avec QR code/code-barres
- Affectation aux agents, services et locaux avec historique
- Calcul des amortissements (linéaire, dégressif) conformes SYSCOHADA
- Fiches techniques, garanties et contrats de maintenance
- Alertes de maintenance préventive programmée
- Gestion des cessions, mises au rebut et transferts
- Tableaux de bord : valeur nette comptable, taux d'utilisation, vétusté

#### Module 7 — Missions & Déplacements
Gestion des ordres de mission et des notes de frais.

**Fonctionnalités clés :**
- Création et validation des ordres de mission en ligne
- Calcul automatique des indemnités selon barèmes configurables
- Saisie des notes de frais avec justificatifs photographiés
- Workflow de validation et d'ordonnancement
- Intégration avec le module budgétaire pour le contrôle des enveloppes
- Rapports de mission avec feedback structuré
- Statistiques déplacements par agent, destination, objet

#### Module 8 — Bibliothèque & Médiathèque
Gestion du fonds documentaire et des ressources culturelles.

**Fonctionnalités clés :**
- Catalogue UNIMARC/MARC21 pour les ouvrages, périodiques, multimédia
- Prêts, retours et réservations en ligne avec gestion des queues d'attente
- Fiches de suggestions d'acquisition par les lecteurs
- Rappels automatiques des retards et amendes
- Recherche multicritère dans le catalogue (titre, auteur, ISBN, matière)
- Statistiques de fréquentation et d'utilisation du fonds

#### Module 9 — Protocole & Evenementiel
Organisation des cérémonies et événements officiels.

**Fonctionnalités clés :**
- Gestion des listes officielles et des préséances protocolaires
- Accréditations et badges pour les intervenants et participants
- Gestion des VIP : liste d'honneur, accueil, placement en salle
- Planning détaillé des événements avec responsabilités
- Invitations officielles avec suivi des confirmations de présence
- Gestion des services logistiques : traiteur, transport, hébergement
- Bilan post-événement avec indicateurs de satisfaction

#### Module 10 — Tableaux de bord BI & Reporting
Intelligence décisionnelle et rapports exécutifs.

**Fonctionnalités clés :**
- Tableaux de bord personnalisables par direction et poste
- Plus de 50 indicateurs prédéfinis couvrant tous les modules
- Rapports dynamiques avec filtres avancés (période, service, type)
- Exports multi-formats : PDF, Excel, CSV, JSON
- Rapports planifiés : envoi automatique par e-mail (quotidien/hebdo/mensuel)
- Alertes sur seuils configurables
- Mode kiosque pour l'affichage sur écrans dans les espaces communs

---

### Modules avancés — Plan Enterprise

#### Comptabilité SYSCOHADA 2017
Comptabilité générale conforme au Système Comptable OHADA révisé 2017.

- Plan comptable OHADA 2017 intégral (classes 1 à 8)
- Journaux : achats, ventes, banque, caisse, opérations diverses
- Grand-livre et balance générale
- Bilan, compte de résultat, tableau de flux de trésorerie (TAFIRE)
- Etats financiers SYSCOHADA normalisés exportables
- Lettrage automatique des comptes de tiers
- Rapprochements bancaires assistés

#### Gestion Budgétaire
Contrôle de gestion et pilotage budgétaire.

- Construction des budgets annuels par centre de coût
- Calcul automatique : Valeur Ajoutée (VA), Excédent Brut d'Exploitation (EBE), Résultat d'Exploitation (REX)
- Suivi des engagements et des dépenses en temps réel
- Analyse des écarts budget/réel avec alertes de dépassement
- Révisions budgétaires et budgets rectificatifs

#### Portail Fournisseurs & Achats
Processus d'achat de bout en bout avec portail fournisseurs.

- Référentiel fournisseurs avec évaluation et qualification
- Appels d'offres avec dépôt de candidatures en ligne
- Bons de commande avec circuits de validation
- Réception et contrôle de la conformité livraisons
- Facturation fournisseurs et gestion des avoirs

#### Parc Auto & GPS
Gestion de flotte avec géolocalisation en temps réel.

- Registre des véhicules : immatriculation, assurance, contrôle technique
- Carnet de bord numérique et kilométrage
- Gestion des carburants avec justificatifs
- Maintenance préventive et curative avec historique
- Géolocalisation en temps réel via Traccar ou Wialon
- Rapports de déplacement et d'utilisation

#### Module Qualité ISO 9001
Système de Management de la Qualité.

- Cartographie et description des processus
- Objectifs qualité et indicateurs de performance (KPI)
- Gestion des non-conformités, réclamations et opportunités d'amélioration
- Planification et suivi des audits internes
- Actions correctives et préventives (CAPA) avec suivi d'efficacité
- Revue de direction avec génération automatique du rapport

#### e-Learning SCORM
Plateforme de formation en ligne intégrée.

- Catalogue de formations avec inscription en ligne
- Lecture de contenus SCORM 1.2, SCORM 2004 et xAPI (Tin Can)
- Quiz et évaluations avec barème configurable
- Certificats de réussite automatiques
- Suivi pédagogique détaillé : temps passé, progression, scores
- Rapports de formation pour le bilan social et le plan de développement

#### SSO SAML/LDAP/OIDC
Authentification unique et fédération d'identités.

- Connexion via SAML 2.0 (Okta, Azure AD, ADFS)
- Synchronisation des annuaires LDAP/Active Directory
- OpenID Connect (Google Workspace, Microsoft 365)
- Provisionnement et déprovisionnement automatiques des comptes
- Politiques de mot de passe et de session centralisées

#### Marketplace — 17 connecteurs
Intégrations avec les principaux outils du marché.

- **Communication :** WhatsApp Business, Slack, Microsoft Teams
- **Visioconférence :** Zoom, Google Meet, Cisco Webex
- **Paiement :** Orange Money, MTN MoMo, Wave, Moov Money, Stripe
- **Administration :** DGI Côte d'Ivoire, CNPS, CGRAE
- **Productivité :** Google Workspace, Microsoft 365, Dropbox
- **ERP :** Sage, SAP (connecteur REST)

#### Intelligence Documentaire IA (SARA)
Assistant intelligent pour le traitement documentaire.

- OCR avancé multi-langues (Français, Anglais, Arabe)
- Classification automatique des documents entrants
- Extraction de données structurées (dates, montants, références, noms)
- Résumés automatiques de documents longs
- Suggestions de classement et de workflows
- Recherche sémantique dans le corpus documentaire

#### RGPD & Conformité
Gestion de la conformité aux règlementations sur les données personnelles.

- Registre des activités de traitement (Article 30 RGPD)
- Gestion des droits des personnes : accès, rectification, effacement, portabilité
- Gestion du consentement et des cookies
- Notification des violations de données (Article 33/34 RGPD)
- Tableau de bord DPO avec indicateurs de conformité
- Conformité OHADA pour les données commerciales

#### On-Premise Docker
Déploiement auto-hébergé avec gestion des licences offline.

- Package Docker Compose complet (8 services)
- Licences JWT RS256 fonctionnant sans connexion internet
- Mises à jour gérées via le portail licences IBIG Soft
- Sauvegarde automatique chiffrée (AES-256)
- Monitoring intégré (Prometheus + Grafana)

---

## Technologies

| Composant | Technologie | Version |
|---|---|---|
| Langage backend | PHP | 8.2+ |
| Framework backend | Laravel | 11.x |
| Framework frontend | React | 18.x |
| Adaptateur SSR | Inertia.js | 1.3.x |
| Build tool | Vite | 5.x |
| Base de données | PostgreSQL | 15+ |
| Cache & sessions | Redis | 7.x |
| WebSocket | Laravel Reverb | 1.x |
| File d'attente | Laravel Horizon | 5.x |
| Recherche plein texte | Meilisearch | 1.x |
| Stockage objets | S3 / MinIO | Compatible |
| Mobile | React Native / Expo | SDK 51 |
| LLM (SARA) | Groq API (Llama 3.1 70B) | — |
| OCR | Tesseract + EasyOCR | — |
| Tests backend | Pest PHP | 3.x |
| Tests E2E | Playwright | 1.x |
| Tests de charge | k6 (Grafana) | — |
| Conteneurs | Docker Compose | 25+ |
| CI/CD | GitHub Actions | — |
| Monitoring | Sentry + Telescope | — |

---

## Sécurité

### OWASP Top 10
- A01 Broken Access Control : Policies Spatie, vérification tenant_id systématique
- A02 Cryptographic Failures : TLS 1.3, chiffrement AES-256 au repos, bcrypt
- A03 Injection : ORM Eloquent, requêtes préparées, validation stricte inputs
- A04 Insecure Design : Architecture DDD, principe du moindre privilège
- A05 Security Misconfiguration : Headers de sécurité (HSTS, CSP, X-Frame)
- A06 Vulnerable Components : Dépendances auditées automatiquement (Dependabot)
- A07 Auth Failures : MFA obligatoire, rate limiting, tokens rotatifs
- A08 Software Integrity : Signatures de releases, SBOM généré
- A09 Logging Failures : Logs structurés Sentry, auditlogs immuables
- A10 SSRF : Validation stricte des URLs, liste d'autorisation IP

### ISO 27001:2022
- 89% des contrôles couverts (114/128 contrôles vérifiés)
- Certification en cours d'obtention (audit prévu Q1 2027)

### Tests de pénétration
- 9 suites de tests de sécurité automatisés (DAST/SAST)
- Test de pénétration externe réalisé en juin 2026 — 0 critique, 3 moyen corrigés

### Conformité réglementaire
- RGPD (Règlement UE 2016/679)
- OHADA (Droit des affaires africain)
- ARTCI (Autorité de Régulation des TIC, Côte d'Ivoire)

---

## Compatibilité

### Navigateurs web

| Navigateur | Version minimum |
|---|---|
| Google Chrome | 110+ |
| Mozilla Firefox | 110+ |
| Apple Safari | 16+ |
| Microsoft Edge | 110+ |

**Note :** Internet Explorer n'est pas supporté.

### Mobile

| Plateforme | Version minimum |
|---|---|
| iOS (iPhone/iPad) | iOS 15+ |
| Android | Android 10 (API 29)+ |

### Résolutions d'écran
- Minimum supporté : 320px (iPhone SE)
- Maximum testé : 1920px (Full HD)
- Design responsive avec points de rupture : 320 / 640 / 768 / 1024 / 1280 / 1536px

### Support RTL (Right-to-Left)
- Arabe standard (ar)
- Arabe marocain (ar-MA)
- Arabe tunisien (ar-TN)

---

## Prérequis serveur

### Configuration minimale

| Composant | Minimum | Recommandé |
|---|---|---|
| CPU | 2 coeurs | 4 coeurs |
| RAM | 4 GB | 8 GB |
| Stockage | 50 GB SSD | 200 GB NVMe |
| Bande passante | 100 Mbps | 1 Gbps |
| OS | Ubuntu 20.04 | Ubuntu 22.04 LTS |

### PHP 8.2+ — Extensions requises (19)

```
bcmath, ctype, curl, fileinfo, gd, intl, json, mbstring,
openssl, pcntl, pdo, pdo_pgsql, pcre, redis, soap,
tokenizer, xml, xmlreader, zip
```

### Services requis
- PostgreSQL 15+
- Redis 7+
- Node.js 20+ (build assets)
- Nginx 1.24+ ou Apache 2.4+
- Supervisor 4.x (gestion des workers)

---

## Bugs connus en v1.0

Les limitations suivantes sont identifiées. Des correctifs seront fournis dans les mises à jour de maintenance.

| # | Module | Description | Sévérité | Contournement |
|---|---|---|---|---|
| BUG-001 | Agenda | La sync Outlook peut prendre jusqu'à 5 min après une reconnexion OAuth | Mineure | Attendre ou forcer la sync manuellement depuis les paramètres |
| BUG-002 | GED | L'aperçu des fichiers .xlsx supérieurs à 10 MB échoue parfois | Mineure | Télécharger le fichier pour l'ouvrir localement |
| BUG-003 | Parc Auto | Le flux GPS Wialon peut s'interrompre après 24h sans données | Mineure | Redémarrer le connecteur depuis l'interface d'administration |
| BUG-004 | SCORM | Les contenus SCORM 1.2 avec Flash (SWF) ne s'affichent pas | Connue | Convertir les anciens contenus en SCORM 2004 ou HTML5 |
| BUG-005 | SARA | L'OCR arabe atteint 78% de précision (vs 95% pour le français) | Amélioration | Valider manuellement les documents arabes extraits |
| BUG-006 | Mobile | L'application mobile n'est pas encore disponible (React Native en cours) | Limitation | Utiliser le navigateur mobile — interface responsive |
| BUG-007 | Rapports | Les exports Excel dépassant 50 000 lignes peuvent expirer (timeout 30s) | Mineure | Filtrer les données sur une période plus courte |
| BUG-008 | SSO LDAP | La synchronisation automatique des groupes AD n'est pas encore implémentée | Limitation | Assigner les rôles manuellement après l'import LDAP |

---

## Roadmap v1.1 (prévu Q4 2026)

| Fonctionnalité | Description | Priorité |
|---|---|---|
| **Application mobile native** | Application React Native iOS et Android (App Store + Google Play) | P0 |
| **Module CRM** | Prospects, devis, contrats clients, facturation, pipeline commercial | P0 |
| **DGI Côte d'Ivoire** | Intégration directe pour les déclarations fiscales en ligne | P1 |
| **Arabe complet (100%)** | Traduction de 100% des clés de l'interface en arabe | P1 |
| **API GraphQL** | Endpoint GraphQL en complément de l'API REST existante | P2 |
| **OCR arabe amélioré** | Passage de 78% à 95% de précision sur les documents arabes | P1 |
| **Workflow BPMN** | Editeur visuel de workflows métier avec drag-and-drop | P2 |
| **Signature électronique qualifiée** | Intégration DocuSign et partenaires ARTCI | P1 |
| **Module Payroll** | Paie CNPS/CGRAE Côte d'Ivoire intégrée | P2 |

---

## Remerciements

IBIG Soft remercie chaleureusement les organisations pilotes qui ont participé aux tests et enrichi SECRETIS de leurs retours précieux :

- Ministère de la Fonction Publique — Abidjan, Côte d'Ivoire
- Université Félix Houphouet-Boigny — Cocody
- Groupe hospitalier de référence de l'Ouest africain (beta)
- Chambre de Commerce et d'Industrie du Sénégal

---

*IBIG SECRETIS v1.0.0 — Copyright (c) 2025-2026 IBIG SARL. Tous droits réservés.*
*Contacts : support@ibigsoft.com | www.ibig-secretis.com*
