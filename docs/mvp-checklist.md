# SECRETIS ERP — Checklist MVP avant mise en production

> **Version** : 1.0.0  
> **Dernière mise à jour** : Juillet 2026  
> **Responsable validation** : Chef de projet + Lead technique  
> **Score cible** : 100/100 points ✅ avant tout déploiement en production

---

## Comment utiliser cette checklist

- **[ ]** = À vérifier  
- **[x]** = Validé  
- **[~]** = Partiel / À surveiller  
- Chaque section est indépendante — assignez un responsable par section  
- Utiliser `php artisan secretis:verify` pour les vérifications automatisables  

---

## 🔐 SÉCURITÉ — 25 points

### Authentification & Autorisation

- [ ] **[SEC-01]** Toutes les routes API protégées par `auth:sanctum` middleware
- [ ] **[SEC-02]** Routes premium vérifiées avec middleware `check.license` (licence active)
- [ ] **[SEC-03]** Isolation multi-tenant testée : utilisateur de l'org A ne peut pas accéder aux données de l'org B
- [ ] **[SEC-04]** Rate limiting activé sur `/api/login` : max 5 tentatives, blocage 15 min
- [ ] **[SEC-05]** Rate limiting global API : 60 requêtes/minute par IP
- [ ] **[SEC-06]** Tokens Sanctum : expiration configurée (ex. 7 jours), révocation fonctionnelle
- [ ] **[SEC-07]** Mots de passe hachés bcrypt (cost ≥ 12) — jamais en clair en base

### Transport & Infrastructure

- [ ] **[SEC-08]** HTTPS forcé sur toutes les routes (`FORCE_HTTPS=true` + redirect 301)
- [ ] **[SEC-09]** HSTS configuré : `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] **[SEC-10]** Headers sécurité actifs sur toutes les réponses :
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Content-Security-Policy` configuré (nonces pour scripts inline)
  - `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] **[SEC-11]** Certificat SSL valide, non expiré, chaîne complète
- [ ] **[SEC-12]** CORS configuré (whitelist domaines autorisés, pas de `*` en production)

### Données & Stockage

- [ ] **[SEC-13]** Clés API tierces (Groq, Stripe, etc.) dans `.env` — jamais en base, jamais dans le code
- [ ] **[SEC-14]** Variables `.env` en lecture seule (chmod 600)
- [ ] **[SEC-15]** Fichiers uploadés stockés dans `storage/` privé — jamais dans `public/`
- [ ] **[SEC-16]** Validation MIME des fichiers uploadés (pas uniquement l'extension)
- [ ] **[SEC-17]** Taille max des uploads configurée et testée (API + PHP + Nginx)

### Protection des paiements

- [ ] **[SEC-18]** Webhooks Stripe/CinetPay : signature HMAC vérifiée avant traitement
- [ ] **[SEC-19]** Idempotence paiements : testée sous charge concurrente (pas de double facturation)
- [ ] **[SEC-20]** Données bancaires jamais stockées en clair — utiliser les tokens Stripe/CinetPay

### Logs & Traces

- [ ] **[SEC-21]** `APP_DEBUG=false` en production (stack traces non exposées)
- [ ] **[SEC-22]** Logs de connexion actifs (IP, user-agent, timestamp)
- [ ] **[SEC-23]** Journal d'audit : toutes les actions CRUD sensibles tracées (qui, quoi, quand, IP)
- [ ] **[SEC-24]** Logs d'erreurs ne contiennent pas de données personnelles/sensibles
- [ ] **[SEC-25]** Scan de vulnérabilités dépendances : `composer audit` sans CVE critique

---

## ⚡ PERFORMANCE — 15 points

### Temps de chargement

- [ ] **[PERF-01]** TTFB (Time To First Byte) < 500 ms — mesuré via GTmetrix ou WebPageTest
- [ ] **[PERF-02]** FCP (First Contentful Paint) < 2 secondes sur connexion 4G simulée
- [ ] **[PERF-03]** LCP (Largest Contentful Paint) < 3 secondes
- [ ] **[PERF-04]** Score Lighthouse Performance ≥ 85 sur mobile

### Backend

- [ ] **[PERF-05]** Aucune requête N+1 en production (vérifier Laravel Telescope / Debugbar en staging)
- [ ] **[PERF-06]** Index de base de données vérifiés sur toutes les clés étrangères et colonnes filtrées
- [ ] **[PERF-07]** Cache Redis actif et fonctionnel pour les requêtes fréquentes
- [ ] **[PERF-08]** Queue workers actifs (Supervisor configuré, redémarrage automatique)
- [ ] **[PERF-09]** `php artisan config:cache && route:cache && view:cache` exécutés au déploiement

### Frontend

- [ ] **[PERF-10]** Assets JS/CSS compilés et minifiés (`npm run build` production)
- [ ] **[PERF-11]** Assets compressés : Brotli (br) + Gzip — vérifier dans Network > Response Headers
- [ ] **[PERF-12]** Images optimisées : WebP utilisé, lazy loading sur images hors viewport
- [ ] **[PERF-13]** Code splitting activé (chunks séparés par route)

### Temps réel

- [ ] **[PERF-14]** Reverb WebSocket stable sous 50 connexions simultanées
- [ ] **[PERF-15]** Reconnexion automatique WebSocket testée (coupure réseau simulée)

---

## ✅ FONCTIONNEL — 30 points

### Interface & Navigation

- [ ] **[FUNC-01]** 0 bouton sans action (tous les boutons ont un gestionnaire d'événement)
- [ ] **[FUNC-02]** 0 lien cassé (href="#" ou lien retournant 404) — tester avec un crawler
- [ ] **[FUNC-03]** Toutes les pages responsive : testé de 320px (iPhone SE) à 1920px (Full HD)
- [ ] **[FUNC-04]** 0 scroll horizontal sur aucune page (mobile + desktop)
- [ ] **[FUNC-05]** États de chargement (skeleton/spinner) présents sur tous les appels API lents
- [ ] **[FUNC-06]** Messages d'erreur clairs et compréhensibles pour l'utilisateur final

### Landing Page (34 zones)

- [ ] **[FUNC-07]** Hero section : CTA "Essai gratuit" fonctionnel → inscription
- [ ] **[FUNC-08]** Section fonctionnalités : toutes les 6+ fonctionnalités affichées correctement
- [ ] **[FUNC-09]** Section tarifs : 3 plans affichés avec boutons d'action fonctionnels
- [ ] **[FUNC-10]** Section témoignages : textes réels, photos cohérentes
- [ ] **[FUNC-11]** Section FAQ : accordéon fonctionnel, toutes les questions-réponses chargées
- [ ] **[FUNC-12]** Formulaire contact : envoi OK, email reçu, confirmation affichée
- [ ] **[FUNC-13]** Footer : tous les liens (CGU, Politique confidentialité, mentions légales) pointent vers des pages existantes

### SARA Assistant IA

- [ ] **[FUNC-14]** SARA répond correctement aux questions fréquentes (public + interne)
- [ ] **[FUNC-15]** SARA contextualise ses réponses selon le module actif (courrier, agenda, etc.)
- [ ] **[FUNC-16]** SARA ne répond pas de manière inappropriée aux tentatives de jailbreak
- [ ] **[FUNC-17]** Fallback gracieux si l'API Groq est indisponible (message d'erreur lisible)

### Emails & Notifications

- [ ] **[FUNC-18]** 13 templates d'email testés et reçus (vérifier les previews dans Mailpit/Mailtrap) :
  - Email de bienvenue à l'inscription
  - Vérification d'adresse email
  - Réinitialisation de mot de passe
  - Invitation utilisateur dans l'organisation
  - Notification nouveau courrier urgent
  - Notification tâche assignée
  - Rappel échéance tâche
  - Notification demande de congé (employé)
  - Notification décision congé (responsable RH)
  - Confirmation réservation salle
  - Facture / reçu paiement abonnement
  - Alerte stock fournitures bas
  - Rapport hebdomadaire automatique
- [ ] **[FUNC-19]** Notifications push navigateur fonctionnelles (Chrome + Firefox + Safari iOS)
- [ ] **[FUNC-20]** Notifications en temps réel via Reverb (badge compteur, toast)

### Import / Export

- [ ] **[FUNC-21]** Export PDF fonctionnel sur tous les rapports (courrier, tâches, congés, visiteurs)
- [ ] **[FUNC-22]** Export Excel (.xlsx) fonctionnel avec données complètes
- [ ] **[FUNC-23]** Import CSV fonctionnel avec rapport d'erreurs ligne par ligne
- [ ] **[FUNC-24]** Téléchargement des exports non bloquant (async, barre de progression)

### Données & Audit

- [ ] **[FUNC-25]** Journal d'audit : toutes les actions tracées (création, modification, suppression, connexion)
- [ ] **[FUNC-26]** Filtres du journal d'audit fonctionnels (par date, par user, par action, par module)
- [ ] **[FUNC-27]** Recherche globale (⌘K) : résultats en < 300 ms, indexation correcte

### Sauvegarde

- [ ] **[FUNC-28]** Sauvegarde automatique configurée et testée (cron actif)
- [ ] **[FUNC-29]** Restauration testée : backup complet → restore → données intactes
- [ ] **[FUNC-30]** Rétention des backups configurée (ex. 30 jours)

---

## 🌍 MULTILINGUE — 5 points

- [ ] **[I18N-01]** 0 texte codé en dur dans les composants Vue/React (tout dans `lang/fr.json` et `lang/en.json`)
- [ ] **[I18N-02]** Toutes les chaînes traduites en français ET anglais (0 clé manquante)
- [ ] **[I18N-03]** Formats date/heure affichés selon la locale utilisateur (jj/mm/aaaa en FR, mm/dd/yyyy en EN)
- [ ] **[I18N-04]** Sélecteur de langue fonctionnel (FR ↔ EN), préférence sauvegardée
- [ ] **[I18N-05]** Emails envoyés dans la langue configurée par l'utilisateur

---

## 📱 MOBILE & PWA — 5 points

- [ ] **[PWA-01]** Application installable sur Android (Chrome : "Ajouter à l'écran d'accueil")
- [ ] **[PWA-02]** Application installable sur iOS (Safari : Partager → Ajouter à l'écran d'accueil)
- [ ] **[PWA-03]** Service Worker actif et enregistré (F12 > Application > Service Workers)
- [ ] **[PWA-04]** Mode hors-ligne : pages en cache accessibles sans réseau (tableau de bord, derniers courriers)
- [ ] **[PWA-05]** Notifications push fonctionnelles sur Android (Chrome) et iOS 16.4+

---

## 📋 DÉPLOIEMENT — Commandes avant Go-Live

```bash
# 1. Mettre l'application en mode maintenance
php artisan down --message="Mise à jour en cours..." --retry=60

# 2. Récupérer le code
git pull origin main

# 3. Installer les dépendances sans les dépendances de dev
composer install --no-dev --optimize-autoloader

# 4. Exécuter les migrations
php artisan migrate --force

# 5. Vider et reconstruire les caches
php artisan config:clear && php artisan config:cache
php artisan route:clear && php artisan route:cache
php artisan view:clear && php artisan view:cache
php artisan event:clear && php artisan event:cache

# 6. Lien symbolique storage
php artisan storage:link

# 7. Vérifier l'installation
php artisan secretis:verify

# 8. Rouvrir l'application
php artisan up
```

---

## 🚨 CONTACTS D'URGENCE

| Rôle | Nom | Contact |
|------|-----|---------|
| Lead Technique | À compléter | @ |
| DevOps / Hébergement | À compléter | @ |
| Support Client | À compléter | @ |
| Responsable Sécurité | À compléter | @ |

---

## ✅ VALIDATION FINALE

| Section | Points | Score | Validé par | Date |
|---------|--------|-------|------------|------|
| Sécurité | /25 | | | |
| Performance | /15 | | | |
| Fonctionnel | /30 | | | |
| Multilingue | /5 | | | |
| Mobile & PWA | /5 | | | |
| **TOTAL** | **/80** | | | |

> **Règle** : Score minimum **75/80** requis avant déploiement en production.  
> En dessous, ouvrir un ticket bloquant et ne pas déployer.

---

*Checklist générée pour SECRETIS ERP v1.0 — Cabinet Conseil DEMO SARL*
