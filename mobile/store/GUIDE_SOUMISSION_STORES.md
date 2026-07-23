# Guide de Soumission — App Store & Google Play
## IBIG SECRETIS v2.2.0

**Auteur :** IBIG Soft — Équipe Engineering
**Date :** Juillet 2026
**Prérequis EAS CLI :** v10.0.0+

---

## Table des matières

1. [Prérequis et comptes développeurs](#1-prérequis-et-comptes-développeurs)
2. [Configuration Apple Developer](#2-configuration-apple-developer)
3. [Configuration Google Play](#3-configuration-google-play)
4. [Premier build iOS](#4-premier-build-ios)
5. [Premier build Android](#5-premier-build-android)
6. [Tests internes (TestFlight & Internal Testing)](#6-tests-internes)
7. [Préparation des assets visuels](#7-préparation-des-assets-visuels)
8. [Soumission App Store](#8-soumission-app-store)
9. [Soumission Google Play](#9-soumission-google-play)
10. [Processus de révision Apple](#10-processus-de-révision-apple)
11. [Déploiement progressif Google Play](#11-déploiement-progressif-google-play)
12. [OTA Updates — mises à jour sans re-soumission](#12-ota-updates)
13. [Monitoring post-lancement](#13-monitoring-post-lancement)
14. [Mise à jour version majeure](#14-mise-à-jour-version-majeure)
15. [Checklist finale pré-soumission](#15-checklist-finale-pré-soumission)

---

## 1. Prérequis et comptes développeurs

### Comptes nécessaires

| Compte | Coût | Délai activation | Lien |
|---|---|---|---|
| Apple Developer Program | 99 USD/an | 24-48h | https://developer.apple.com/programs/ |
| Google Play Developer | 25 USD (unique) | Quelques heures | https://play.google.com/console/signup |
| Expo / EAS | Gratuit (plan Production recommandé) | Immédiat | https://expo.dev |

### Outils à installer en local

```bash
# Node.js 20+
node --version  # doit afficher v20.x.x ou supérieur

# EAS CLI
npm install -g eas-cli
eas --version  # doit afficher 10.x.x ou supérieur

# Connexion EAS
eas login
# Entrez vos identifiants expo.dev

# Vérification du projet
cd mobile
eas whoami  # doit afficher ibigsoft
```

### Variables d'environnement requises

```bash
# Ajoutez dans votre ~/.bashrc ou ~/.zshrc
export EXPO_TOKEN="votre-token-expo"         # Généré sur expo.dev > Account > Access tokens

# Pour la CI/CD GitHub Actions (secrets)
# EXPO_TOKEN                    -> expo.dev token
# APPLE_ID                      -> dev@ibigsoft.com
# APPLE_APP_SPECIFIC_PASSWORD   -> généré sur appleid.apple.com
# GOOGLE_PLAY_SERVICE_ACCOUNT_JSON -> JSON du compte de service GCP
```

---

## 2. Configuration Apple Developer

### Étape 1 — Créer l'App ID

1. Connectez-vous sur https://developer.apple.com/account
2. Allez dans **Certificates, IDs & Profiles** > **Identifiers**
3. Cliquez **+** (Register a new identifier)
4. Sélectionnez **App IDs** > **App**
5. Renseignez :
   - **Description** : IBIG SECRETIS
   - **Bundle ID** : `com.ibigsoft.secretis` (Explicit)
6. Activez les **Capabilities** suivantes :
   - Associated Domains
   - Push Notifications
   - Sign In with Apple (si utilisé)
7. Cliquez **Continue** puis **Register**

### Étape 2 — Configurer les Push Notifications

1. Dans **Identifiers**, sélectionnez `com.ibigsoft.secretis`
2. Cliquez sur **Push Notifications** > **Configure**
3. Sous **Production SSL Certificate**, cliquez **Create Certificate**
4. Suivez les instructions pour générer le CSR et télécharger le certificat `.cer`
5. Importez-le dans Keychain Access et exportez-le en `.p12`

> **Note EAS :** Si vous utilisez EAS pour gérer les credentials (recommandé), cette étape est automatisée par `eas credentials`.

### Étape 3 — Créer l'entrée App Store Connect

1. Connectez-vous sur https://appstoreconnect.apple.com
2. Allez dans **Mes apps** > **+** > **Nouvelle app**
3. Renseignez :
   - **Plateformes** : iOS
   - **Nom** : IBIG SECRETIS
   - **Langue principale** : Français
   - **Bundle ID** : com.ibigsoft.secretis
   - **SKU** : IBIG-SECRETIS-001
4. Cliquez **Créer**
5. Notez l'**ASC App ID** (visible dans l'URL : `/apps/XXXXXXXXXX/`) et mettez-le à jour dans `eas.json` > `submit.production.ios.ascAppId`

### Étape 4 — Configurer les Associated Domains

Dans **app.json**, la valeur `associatedDomains: ["applinks:app.secretis.ibigsoft.com"]` est déjà configurée. Assurez-vous que le fichier `apple-app-site-association` est déployé sur votre serveur :

```
https://app.secretis.ibigsoft.com/.well-known/apple-app-site-association
```

---

## 3. Configuration Google Play

### Étape 1 — Créer l'application dans Play Console

1. Connectez-vous sur https://play.google.com/console
2. Cliquez **Créer une application**
3. Renseignez :
   - **Nom de l'application** : IBIG SECRETIS
   - **Langue par défaut** : Français (France)
   - **Application ou jeu** : Application
   - **Gratuit ou payant** : Gratuit
4. Cochez les déclarations et cliquez **Créer une application**

### Étape 2 — Créer le Service Account pour l'API Google Play

1. Dans **Play Console** > **Setup** > **API access**, cliquez **Create new service account**
2. Suivez le lien vers **Google Cloud Console**
3. Créez un compte de service avec le rôle **Editor** dans votre projet GCP
4. Générez une clé JSON et téléchargez-la
5. Renommez-la `google-services-key.json` et placez-la dans `mobile/` (jamais commitée — ajoutez à `.gitignore`)
6. Retournez dans Play Console et accordez les permissions à ce service account

### Étape 3 — Générer et sauvegarder le Keystore Android

```bash
cd mobile

# Génération automatique par EAS (recommandé)
eas credentials --platform android

# Sélectionnez "Set up a new keystore"
# EAS génère, stocke et gère le keystore de manière sécurisée
# Vous pouvez aussi télécharger une copie de sauvegarde depuis expo.dev
```

> **CRITIQUE :** Sauvegardez le keystore dans un endroit sécurisé (coffre-fort de mots de passe, AWS Secrets Manager, etc.). Si vous le perdez, vous ne pourrez plus mettre à jour l'app sur le Play Store.

### Étape 4 — Politique de confidentialité

La politique de confidentialité doit être publiée à l'URL déclarée avant la soumission :
```
https://app.secretis.ibigsoft.com/politique-confidentialite
```

---

## 4. Premier build iOS

```bash
cd mobile

# 1. Vérifiez que vous êtes connecté à EAS
eas whoami  # doit afficher ibigsoft

# 2. Générez les credentials iOS (certificats + provisioning profile)
#    EAS les génère et les stocke automatiquement
eas credentials --platform ios

# 3. Vérifiez la configuration EAS
eas config --platform ios --profile production

# 4. Lancez le build production
eas build --platform ios --profile production --non-interactive

# L'URL du build s'affiche. Suivez la progression sur :
# https://expo.dev/accounts/ibigsoft/projects/ibig-secretis/builds

# Durée typique : 15-30 minutes
```

### Résolution des problèmes courants iOS

| Erreur | Solution |
|---|---|
| `Missing push notification entitlement` | Activez Push Notifications dans l'App ID (Apple Developer) |
| `Provisioning profile doesn't include entitlement` | Regénérez le profil : `eas credentials --platform ios` |
| `Code signing error` | Vérifiez que le Bundle ID correspond exactement dans app.json et Apple Developer |
| `Missing NSXxxUsageDescription` | Ajoutez la clé manquante dans `app.json > ios.infoPlist` |

---

## 5. Premier build Android

```bash
cd mobile

# 1. Générez les credentials Android (keystore)
eas credentials --platform android

# 2. Vérifiez la configuration EAS
eas config --platform android --profile production

# 3. Lancez le build production (App Bundle .aab pour le Play Store)
eas build --platform android --profile production --non-interactive

# Durée typique : 10-20 minutes
```

### Vérification du .aab généré

```bash
# Téléchargez le build depuis expo.dev ou via la commande :
eas build:list --platform android --limit 1

# Vérifiez le contenu du bundle (nécessite bundletool) :
# java -jar bundletool.jar validate --bundle=app.aab
```

---

## 6. Tests internes

### iOS — TestFlight

1. Dans **App Store Connect**, allez dans votre app > **TestFlight**
2. Le build apparaît après soumission EAS (15-30 min de traitement Apple)
3. Sous **Testeurs internes**, ajoutez les membres de l'équipe IBIG Soft
4. Ils reçoivent une invitation par email et peuvent installer via l'app TestFlight
5. Testez pendant 3-5 jours avant la soumission à la révision

### Android — Closed Testing (Internal Track)

```bash
# Soumission au track internal (tests internes, pas de révision requise)
eas submit --platform android --profile production --latest \
  --track internal

# Dans Google Play Console > Testing > Internal testing :
# Ajoutez les emails des testeurs IBIG Soft
# Ils reçoivent un lien d'installation direct
```

---

## 7. Préparation des assets visuels

### Outils recommandés

- **Figma** (templates disponibles dans le workspace IBIG Soft)
- **Canva Pro** (alternative)
- **Sketch** (macOS uniquement)

### Dimensions requises par plateforme

#### App Store (iOS)

| Asset | Dimensions | Format | Notes |
|---|---|---|---|
| Icône App Store | 1024×1024 px | PNG sans transparence | Aucun coin arrondi |
| iPhone 6.7" screenshots | 1290×2796 px | PNG/JPG | 6 minimum, 10 maximum |
| iPhone 5.5" screenshots | 1242×2208 px | PNG/JPG | Requis si ciblé |
| iPad 12.9" screenshots | 2048×2732 px | PNG/JPG | Recommandé |
| Vidéo preview | 1080×1920 px | MOV/MP4 H.264 | 15-30 secondes |

#### Google Play (Android)

| Asset | Dimensions | Format | Notes |
|---|---|---|---|
| Icône | 512×512 px | PNG 32-bit | Requis |
| Feature Graphic | 1024×500 px | PNG/JPG | Requis |
| Phone screenshots | 1080×1920 px | PNG/JPG | 2 minimum, 8 maximum |
| Tablet 7" screenshots | 1200×1920 px | PNG/JPG | Recommandé |
| Tablet 10" screenshots | 1600×2560 px | PNG/JPG | Recommandé |
| Promotional video | YouTube URL | — | Optionnel |

### Génération des icônes depuis le fichier source

```bash
cd mobile

# L'icône source doit être 1024×1024 px minimum
# Placez-la dans mobile/assets/icon.png

# EAS génère toutes les tailles automatiquement au moment du build.
# Pour le Play Store (512×512) et l'App Store (1024×1024), exportez manuellement.
```

---

## 8. Soumission App Store

### Via EAS Submit (automatique)

```bash
cd mobile

# Soumission du dernier build production iOS
eas submit --platform ios --profile production --latest

# Ou avec un build ID spécifique
eas submit --platform ios --id XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

### Via App Store Connect (manuel)

Après la soumission EAS, complétez les métadonnées dans App Store Connect :

1. **App Store** > **Version Information** :
   - Copiez-collez la description depuis `mobile/store/ios/store-listing.md`
   - Ajoutez les mots-clés (100 chars max)
   - Renseignez les URLs (support, marketing, politique)

2. **App Preview and Screenshots** :
   - Importez vos captures d'écran par format d'appareil
   - Ajoutez la vidéo preview si disponible

3. **App Information** :
   - Catégories : Business + Productivity
   - Âge minimum : 4+
   - Droits d'auteur : © 2026 IBIG Soft

4. **Pricing and Availability** :
   - Prix : Gratuit
   - Pays : Tous (ou sélection selon stratégie)

5. **App Privacy** :
   - Remplissez le questionnaire Privacy Nutrition Label
   - URL politique de confidentialité : https://app.secretis.ibigsoft.com/politique-confidentialite

6. **In-App Purchases** :
   - Ajoutez les 3 plans (Starter gratuit, Pro, Enterprise)
   - Configurez les prix en USD et devises locales

7. **Review Information** :
   - Notes pour le reviewer (copiez depuis `store-listing.md`)
   - Compte de test : demo@secretis.ibigsoft.com / Demo2024!

8. Cliquez **Submit for Review**

---

## 9. Soumission Google Play

### Via EAS Submit (automatique)

```bash
cd mobile

# Soumission au track internal d'abord (pas de révision, disponible immédiatement)
eas submit --platform android --profile production --latest --track internal

# Puis promotion vers production depuis la Play Console
# (après validation interne)
```

### Compléter les métadonnées dans Play Console

1. **Store listing** (Présentation du store) :
   - Copiez-collez titre, résumé, description depuis `mobile/store/android/store-listing.md`
   - Ajoutez les screenshots et le Feature Graphic

2. **App content** (Contenu de l'application) :
   - Questionnaire de classification d'âge → Tout public (PEGI 3)
   - Déclaration Data Safety (voir `store-listing.md` → section Data Safety)
   - Politique de confidentialité URL

3. **Pricing & distribution** :
   - Prix : Gratuit
   - Pays : Sélection ou tous pays
   - Catégorie : Productivité

4. **In-app products** :
   - Créez les 3 abonnements (Starter, Pro, Enterprise)

5. Passez en **Production** en soumettant depuis le track internal

---

## 10. Processus de révision Apple

### Délais

- **Première soumission** : 1 à 3 jours ouvrés (parfois jusqu'à 7 jours)
- **Mises à jour** : 24 à 48 heures en général
- **Révision accélérée** : Disponible en cas d'urgence via le formulaire de contact Apple

### Réponse aux questions des reviewers

Si Apple demande des clarifications :

1. Vous recevez un email avec les questions
2. Dans App Store Connect, allez dans **Activity** > **App Review Information** > **Contact Us**
3. Répondez clairement et fournissez des captures d'écran si nécessaire
4. Exemples de questions courantes :
   - Fonctionnement du mode hors ligne → expliquez la synchronisation SQLite/API
   - Justification des permissions → référencez l'`infoPlist` dans `app.json`
   - Compte de test non fonctionnel → vérifiez les credentials demo@secretis.ibigsoft.com

### Re-soumission après rejet

```bash
# Corrigez le problème identifié par Apple, puis :
cd mobile

# Si le problème nécessite un nouveau build natif :
eas build --platform ios --profile production --non-interactive
eas submit --platform ios --profile production --latest

# Si le problème est uniquement dans les métadonnées (description, screenshots) :
# Corrigez directement dans App Store Connect et re-soumettez sans nouveau build
```

---

## 11. Déploiement progressif Google Play

Google Play permet un rollout progressif pour limiter l'impact d'éventuels bugs.

### Stratégie recommandée pour IBIG SECRETIS

| Jour | Pourcentage | Durée | Action si problème |
|---|---|---|---|
| J+0 | 10% | 24h | Surveiller Crashlytics + avis |
| J+1 | 50% | 24h | Surveiller métriques clés |
| J+2 | 100% | — | Déploiement complet |

### Via Play Console (interface)

1. Allez dans **Release** > **Production** > votre release
2. Cliquez **Edit release** > **Rollout percentage**
3. Modifiez le pourcentage et sauvegardez

### Via commande (si supporté par eas submit)

```bash
# Le rollout initial est défini dans eas.json > submit.production.android.rollout: 0.1
# Pour augmenter le rollout depuis Play Console directement
```

### Critères de passage à 100%

- Taux de crash < 0.5% (Firebase Crashlytics)
- Note moyenne > 4.0 (si avis reçus)
- Aucun bug critique remonté par les testeurs internes
- ANR rate < 0.2% (dans Play Console > Android Vitals)

---

## 12. OTA Updates

Les mises à jour OTA (Over-The-Air) permettent de publier des correctifs JavaScript sans re-soumettre aux stores. Elles fonctionnent grâce à Expo Updates.

### Quand utiliser OTA vs re-soumission

| Type de changement | OTA possible | Re-soumission requise |
|---|---|---|
| Correction de bug JavaScript | Oui | Non |
| Modification de texte/UI | Oui | Non |
| Nouveau module npm (JS uniquement) | Oui | Non |
| Modification native (plugin Expo) | Non | Oui |
| Nouvelle permission | Non | Oui |
| Mise à jour SDK Expo | Non | Oui |
| Changement de version app.json | Non (patch) | Oui (minor/major) |

### Publication d'une mise à jour OTA

```bash
cd mobile

# Publication sur le channel production
./scripts/publish-update.sh production "Correction bug agenda récurrent"

# Ou directement via EAS CLI
eas update --channel production --message "Correctifs v2.2.1" --non-interactive

# Publication sur preview (pour tests internes)
eas update --channel preview --message "Test nouvelle fonctionnalité SARA"
```

### Vérification du déploiement

```bash
# Liste des mises à jour publiées
eas update:list --channel production

# Détails d'une mise à jour
eas update:view XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

---

## 13. Monitoring post-lancement

### Outils de surveillance

| Outil | Métrique | URL |
|---|---|---|
| Firebase Crashlytics | Taux de crash, ANR | console.firebase.google.com |
| Expo Insights | Téléchargements, sessions actives | expo.dev/accounts/ibigsoft |
| Google Play Console | Android Vitals, avis utilisateurs | play.google.com/console |
| App Store Connect | Performances, avis, préoccupations | appstoreconnect.apple.com |
| Sentry (si intégré) | Erreurs JavaScript détaillées | sentry.io |

### Métriques clés à surveiller (J0 → J7)

- **Taux de crash** : < 0.5% (cible < 0.1%)
- **ANR rate** (Android Not Responding) : < 0.2%
- **Note moyenne** : objectif > 4.5 étoiles
- **Taux de rétention J1** : > 40%
- **Taux de rétention J7** : > 20%
- **Durée de session moyenne** : > 5 minutes

### Réponse aux avis utilisateurs

Répondez à **tous** les avis négatifs (1-3 étoiles) dans les 24h :

```
Bonjour [Prénom],
Merci pour votre retour. Nous sommes désolés de cette expérience.
Notre équipe va examiner ce problème. N'hésitez pas à nous contacter 
sur support@ibigsoft.com pour que nous puissions vous aider directement.
Cordialement, L'équipe IBIG Soft
```

---

## 14. Mise à jour version majeure

### Quand re-soumettre aux stores

| Situation | Action |
|---|---|
| Correctif bug JS uniquement | OTA Update |
| Nouvelle fonctionnalité JS | OTA Update (si runtimeVersion identique) |
| Nouvelle permission Android/iOS | Build + Re-soumission |
| Mise à jour Expo SDK | Build + Re-soumission |
| Nouveau plugin natif | Build + Re-soumission |
| Changement de versionCode/buildNumber | Build + Re-soumission |

### Processus de mise à jour de version

```bash
# 1. Mettez à jour app.json
# Modifiez version, ios.buildNumber, android.versionCode

# 2. Créez un tag git
git tag v2.3.0
git push origin v2.3.0

# → Le workflow GitHub Actions se déclenche automatiquement

# Ou manuellement :
cd mobile
eas build --platform all --profile production --non-interactive
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

### Règle runtimeVersion

La configuration `"runtimeVersion": {"policy": "appVersion"}` dans `app.json` signifie que les OTA updates sont compatibles uniquement avec les builds de la même version (ex: 2.2.0). Si vous changez la version (ex: 2.3.0), vous **devez** créer un nouveau build natif — les utilisateurs sur la version précédente ne recevront pas la mise à jour OTA tant qu'ils n'auront pas mis à jour depuis le store.

---

## 15. Checklist finale pré-soumission

### Technique

- [ ] `app.json` — version 2.2.0, buildNumber "1", versionCode 1
- [ ] `eas.json` — profil production configuré, credentialsSource: remote
- [ ] Bundle ID iOS `com.ibigsoft.secretis` vérifié dans Apple Developer
- [ ] Package Android `com.ibigsoft.secretis` vérifié dans Play Console
- [ ] EAS projectId renseigné dans `app.json > extra.eas.projectId`
- [ ] URL Expo Updates renseignée dans `app.json > updates.url`
- [ ] `PrivacyInfo.xcprivacy` présent dans `mobile/ios/` (requis iOS 17+)
- [ ] `google-services.json` présent dans `mobile/` (Firebase Android)
- [ ] Toutes les permissions iOS déclarées dans `infoPlist`
- [ ] Toutes les permissions Android déclarées dans `permissions`
- [ ] Associated domains configurés (applinks:app.secretis.ibigsoft.com)
- [ ] Build testé sur appareil physique iOS et Android réels
- [ ] Mode hors ligne testé (désactiver le Wi-Fi, vérifier l'accès aux données)
- [ ] Biométrie testée sur appareil physique
- [ ] Notifications push reçues sur appareil physique

### Assets visuels

- [ ] Icône 1024×1024 px (App Store) — PNG sans transparence
- [ ] Icône 512×512 px (Google Play) — PNG 32-bit
- [ ] Feature Graphic 1024×500 px (Google Play)
- [ ] 6+ screenshots iPhone 6.7" 1290×2796 px
- [ ] 6+ screenshots iPhone 5.5" 1242×2208 px (si ciblé)
- [ ] 3 screenshots iPad 12.9" 2048×2732 px
- [ ] 8 screenshots Android 1080×1920 px
- [ ] 2 screenshots tablette Android 1200×1920 px
- [ ] 2 screenshots tablette 10" Android 1600×2560 px

### Métadonnées

- [ ] Titre App Store (30 chars) : "IBIG SECRETIS"
- [ ] Sous-titre App Store (30 chars) : "ERP Secrétariat Afrique"
- [ ] Titre Google Play (30 chars) : "IBIG SECRETIS — ERP Admin"
- [ ] Description complète 800+ mots (FR) — voir `store-listing.md`
- [ ] Mots-clés App Store (100 chars)
- [ ] Tags Google Play
- [ ] URL politique de confidentialité déployée et accessible
- [ ] URL CGU déployée et accessible
- [ ] URL support déployée et accessible

### Conformité légale

- [ ] Déclaration Data Safety Google Play complétée
- [ ] Privacy Nutrition Label App Store complété
- [ ] Export compliance (EAR99) déclaré
- [ ] Déclaration d'utilisation du chiffrement (HTTPS/TLS)
- [ ] Contenu interdit vérifié (pas de contenu adulte, pas de jeux d'argent)

### Comptes et accès

- [ ] Compte de test demo@secretis.ibigsoft.com actif et accessible
- [ ] Notes reviewer rédigées (voir `store-listing.md`)
- [ ] Apple Team ID renseigné dans `eas.json`
- [ ] ASC App ID renseigné dans `eas.json`
- [ ] Service account Google Play configuré et testé
- [ ] Secrets GitHub Actions configurés (EXPO_TOKEN, APPLE_ID, etc.)

### Distribution

- [ ] Prix et pays configurés dans les deux stores
- [ ] Abonnements in-app créés (Starter, Pro, Enterprise)
- [ ] Classification d'âge complétée (Tout public / 4+)
- [ ] Politique de rollout Android définie (10% → 50% → 100%)
