# Plan de Finalisation — Phase 2 IBIG SECRETIS ERP
**Date :** 2026-07-22 | **Version :** 2.0.0

---

## Vue d'ensemble des priorités

| Priorité | Livrable | Durée estimée | Dépendances | Critère de validation |
|---------|---------|--------------|-------------|----------------------|
| P1 | Landing page (34 zones) | 5 jours | Design system | Déployée en production |
| P1 | 13 emails automatiques | 2 jours | MJML, SMTP | Tests d'envoi OK |
| P1 | 18 pages légales | 3 jours | Validation juridique | Accessibles sur /legal |
| P2 | Guide utilisateur FR (15 parties) | 5 jours | Landing livrée | Publié sur /aide |
| P2 | 100 FAQ + centre d'aide | 3 jours | Guide rédigé | Recherche plein texte OK |
| P3 | Onboarding interactif (6 étapes) | 2 jours | UX design | Testé sur 5 profils |
| P3 | Visite guidée interactive (7 étapes) | 2 jours | Onboarding livré | Testé E2E Playwright |
| P4 | Données de démonstration | 2 jours | Seeders métier | 3 orgs fictives créées |
| P5 | SEO complet | 1 jour | Landing livrée | Score Lighthouse SEO ≥ 95 |
| P5 | Analytics landing page | 1 jour | SEO livré | Dashboard visible SuperAdmin |
| P6 | Prise en main sécurisée (sandbox) | 2 jours | Demo data | Mode démo isolé fonctionnel |

**Durée totale estimée : 28 jours-homme**

---

## Priorité 1 — Landing page + Emails + Pages légales

### Landing page (34 zones)

**Responsable :** Lead Frontend + Designer UX  
**Durée :** 5 jours  
**Fichiers cibles :** `landing-page/`  

| Zone | Contenu | État |
|------|---------|------|
| 1–5 | Hero, barre de confiance, proposition de valeur | ✅ |
| 6–10 | Fonctionnalités clés, modules | ✅ |
| 11–15 | Témoignages, études de cas | ✅ |
| 16–20 | Tarifs, FAQ pricing | ✅ |
| 21–25 | SARA IA, démo interactive | ✅ |
| 26–30 | Intégrations, partenaires | ✅ |
| 31–34 | Footer, légal, CTA final | ✅ |

**Critère de validation :** Lighthouse Performance ≥ 90, SEO ≥ 95, Accessibility ≥ 95

### 13 Emails automatiques

**Responsable :** Lead Backend + Rédacteur  
**Durée :** 2 jours  
**Fichiers cibles :** `resources/views/emails/`  

| # | Email | Déclencheur |
|---|-------|------------|
| 1 | Bienvenue + accès | Inscription confirmée |
| 2 | Vérification d'email | Inscription |
| 3 | Réinitialisation mot de passe | Demande utilisateur |
| 4 | Invitation collaborateur | Admin invite un utilisateur |
| 5 | Confirmation demande de démo | Formulaire demo |
| 6 | Rappel démo J-1 | Planifié 24 h avant |
| 7 | Rappel essai J-7 avant expiration | Automatique |
| 8 | Essai expiré | Automatique |
| 9 | Conversion essai → abonnement | Paiement réussi |
| 10 | Facture mensuelle | Renouvellement |
| 11 | Paiement échoué | Stripe webhook |
| 12 | Congé approuvé/refusé | Approbation RH |
| 13 | Document prêt à signer | Workflow GED |

**Critère de validation :** Envoi testé sur Mailtrap, rendu HTML validé sur Gmail/Outlook

### 18 Pages légales

**Responsable :** Juriste + Rédacteur  
**Durée :** 3 jours  

| # | Page | Slug |
|---|------|------|
| 1 | Conditions Générales d'Utilisation | `/legal/cgu` |
| 2 | Conditions Générales de Vente | `/legal/cgv` |
| 3 | Politique de Confidentialité | `/legal/confidentialite` |
| 4 | Politique de Cookies | `/legal/cookies` |
| 5 | Mentions Légales | `/legal/mentions-legales` |
| 6 | DPA — Accord de traitement de données | `/legal/dpa` |
| 7 | Charte d'Accessibilité | `/legal/accessibilite` |
| 8 | Politique de Remboursement | `/legal/remboursement` |
| 9 | Politique de Sécurité | `/legal/securite` |
| 10 | Politique de Conservation des Données | `/legal/conservation-donnees` |
| 11 | Politique Sous-traitants | `/legal/sous-traitants` |
| 12 | Contrat de Licence Logiciel | `/legal/licence` |
| 13 | Accord de Niveau de Service (SLA) | `/legal/sla` |
| 14 | Politique Anti-corruption | `/legal/anti-corruption` |
| 15 | Charte Partenaires | `/legal/partenaires` |
| 16 | Politique RGPD Collaborateurs | `/legal/rgpd-collaborateurs` |
| 17 | Politique de Divulgation Responsable | `/legal/divulgation-responsable` |
| 18 | Avertissement Légal | `/legal/avertissement` |

**Critère de validation :** Validation juridique signée + pages accessibles sans auth

---

## Priorité 2 — Guide utilisateur + FAQ

### Guide utilisateur FR (15 parties)

**Responsable :** Rédacteur technique  
**Durée :** 5 jours  
**Fichiers cibles :** `docs/guide-utilisateur/`  

| Partie | Contenu |
|--------|---------|
| 1 | Prise en main — Connexion, navigation, profil |
| 2 | Tableau de bord — KPIs, personnalisation |
| 3 | Comptabilité — Plan comptable, écritures |
| 4 | Comptabilité — Bilan, résultat, clôture |
| 5 | RH — Employés, contrats |
| 6 | RH — Congés, paie |
| 7 | CRM — Prospects, pipeline |
| 8 | GED — Documents, workflow |
| 9 | Projets — Tâches, Gantt |
| 10 | Budget — Budgets, engagements |
| 11 | Achats — Bons de commande |
| 12 | Formation — SCORM, certifications |
| 13 | Qualité — Non-conformités |
| 14 | Administration — Rôles, paramètres |
| 15 | API & Intégrations — Webhooks, connecteurs |

### 100 FAQ + Centre d'aide

**Responsable :** Support + Rédacteur  
**Durée :** 3 jours  
**Critère :** Recherche plein texte opérationnelle, catégorisation par module

---

## Priorité 3 — Onboarding & Visite guidée

**Responsable :** Lead Frontend  
**Durée :** 4 jours  

### Onboarding interactif (6 étapes)
1. Bienvenue — Présentation SECRETIS
2. Paramétrage de l'organisation
3. Invitation des premiers collaborateurs
4. Configuration du plan comptable
5. Premier document GED
6. Tour du tableau de bord

### Visite guidée interactive (7 étapes)
Shepherd.js ou intro.js — guidage overlay sur l'interface réelle :
1. Navigation latérale
2. Tableau de bord KPIs
3. Module le plus utilisé (selon profil)
4. Création d'un premier enregistrement
5. Export de données
6. SARA IA — première question
7. Centre d'aide

---

## Priorité 4 — Données de démonstration

**Responsable :** Lead Backend  
**Durée :** 2 jours  

3 organisations fictives créées :
1. **AKOMA Trading SA** — Commerce import/export (50 employés)
2. **BENKADI Consulting** — Cabinet conseil (15 employés)
3. **SOFAMEX Industries** — Industrie manufacturière (120 employés)

Données réalistes : 2 années d'écritures, 500 documents GED, 3 projets en cours, pipeline CRM complet.

---

## Priorité 5 — SEO + Analytics

**Responsable :** Lead Backend  
**Durée :** 2 jours  
**Fichiers livrés :** `SeoController.php`, `SeoService.php`, `LandingAnalyticsService.php`, `LandingDashboard.jsx`

**Critère :** Score Lighthouse SEO ≥ 95, dashboard analytics visible en SuperAdmin

---

## Priorité 6 — Prise en main sécurisée (sandbox)

**Responsable :** Lead Backend + Lead Frontend  
**Durée :** 2 jours  

Mode démo isolé : organisation sandbox avec `DEMO_MODE=true`, données en lecture seule, reset automatique toutes les 24 h.

**Critère :** Aucune donnée de démo ne peut contaminer les données de production.

---

*Document généré le 2026-07-22 — IBIG Soft / Direction Produit*
