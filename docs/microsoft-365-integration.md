# Guide d'intégration Microsoft 365 — IBIG SECRETIS ERP

## Vue d'ensemble

L'intégration Microsoft 365 permet aux utilisateurs de SECRETIS de connecter leur compte professionnel Microsoft pour synchroniser :

- **Outlook Calendar** : synchronisation bidirectionnelle des événements
- **Microsoft Teams** : création automatique de réunions en ligne
- **OneDrive** : synchronisation des documents avec la GED SECRETIS

---

## Prérequis

- Un tenant Azure Active Directory (Microsoft Entra ID)
- Des droits administrateur Azure AD pour enregistrer une application
- SECRETIS ERP version 2026.1 ou supérieure

---

## Partie 1 — Créer une application Azure AD

### Étape 1 : Accéder au portail Azure

1. Ouvrez votre navigateur et accédez à [https://portal.azure.com](https://portal.azure.com)
2. Connectez-vous avec un compte **Administrateur Global** ou **Administrateur d'application**
3. Dans la barre de recherche, tapez **"Azure Active Directory"** et sélectionnez le service

### Étape 2 : Enregistrer une nouvelle application

1. Dans le menu gauche, cliquez sur **"Inscriptions d'applications"**
2. Cliquez sur le bouton **"+ Nouvelle inscription"**
3. Remplissez le formulaire :
   - **Nom** : `SECRETIS ERP - Intégration Microsoft 365`
   - **Types de comptes pris en charge** : Sélectionnez selon votre besoin :
     - `Comptes dans cet annuaire d'organisation uniquement (locataire unique)` → Pour un déploiement mono-organisation
     - `Comptes dans n'importe quel annuaire d'organisation (multi-locataire)` → Pour IBIG hébergeant plusieurs clients
   - **URI de redirection** :
     - Type : **Web**
     - URL : `https://votre-domaine.secretis.io/integrations/microsoft/callback`
4. Cliquez sur **"S'inscrire"**

> **Note** : Copiez immédiatement l'**ID d'application (client)** affiché sur la page Vue d'ensemble. Vous en aurez besoin plus tard.

### Étape 3 : Configurer les permissions (Scopes API)

1. Dans le menu de l'application, cliquez sur **"Autorisations d'API"**
2. Cliquez sur **"+ Ajouter une autorisation"**
3. Sélectionnez **"Microsoft Graph"**
4. Choisissez **"Autorisations déléguées"** (les permissions agissent au nom de l'utilisateur connecté)
5. Recherchez et cochez les permissions suivantes :

| Permission | Utilité dans SECRETIS |
|---|---|
| `Calendars.ReadWrite` | Lire et écrire les événements Outlook de l'utilisateur |
| `Mail.Send` | Envoyer des emails depuis le compte Microsoft de l'utilisateur |
| `Files.ReadWrite` | Accéder aux fichiers OneDrive personnels |
| `Files.ReadWrite.All` | Accéder aux fichiers OneDrive partagés |
| `OnlineMeetings.ReadWrite` | Créer et gérer les réunions Teams |
| `Chat.ReadWrite` | Envoyer des messages dans les canaux Teams |
| `User.Read` | Lire le profil de base de l'utilisateur connecté |
| `offline_access` | Obtenir un refresh token pour le renouvellement silencieux |

6. Cliquez sur **"Ajouter des autorisations"**

> **Important** : Ne cochez PAS les permissions **Application** (sans délégation) sauf si vous avez des cas d'usage serveur-à-serveur spécifiques. Les permissions déléguées suffisent pour SECRETIS.

### Étape 4 : Créer un secret client

1. Dans le menu de l'application, cliquez sur **"Certificats et secrets"**
2. Sous l'onglet **"Secrets clients"**, cliquez sur **"+ Nouveau secret client"**
3. Remplissez :
   - **Description** : `SECRETIS ERP Production`
   - **Expiration** : `24 mois` (recommandé, à renouveler avant expiration)
4. Cliquez sur **"Ajouter"**
5. **IMPORTANT** : Copiez immédiatement la **Valeur** du secret (elle ne sera plus visible après la fermeture de la page)

---

## Partie 2 — Configurer SECRETIS ERP

### Étape 5 : Variables d'environnement

Ajoutez les variables suivantes dans votre fichier `.env` :

```env
# Microsoft 365 Integration
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=votre_secret_client_ici
MICROSOFT_TENANT_ID=common
# Utilisez 'common' pour multi-tenant, ou votre Directory ID pour mono-tenant
# Votre Directory ID se trouve dans Azure AD > Vue d'ensemble > ID du locataire

MICROSOFT_REDIRECT_URI=https://votre-domaine.secretis.io/integrations/microsoft/callback
```

### Étape 6 : Configuration Laravel (config/services.php)

Vérifiez que votre fichier `config/services.php` contient :

```php
'microsoft' => [
    'client_id'     => env('MICROSOFT_CLIENT_ID'),
    'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
    'tenant_id'     => env('MICROSOFT_TENANT_ID', 'common'),
    'redirect_uri'  => env('MICROSOFT_REDIRECT_URI'),
],
```

### Étape 7 : Exécuter la migration

```bash
php artisan migrate
```

Cette migration ajoute les colonnes Microsoft sur les tables `users` et `organizations`.

### Étape 8 : Configurer le CRON de synchronisation

Ajoutez dans votre `app/Console/Kernel.php` :

```php
$schedule->command('secretis:sync-outlook')
         ->everyFifteenMinutes()
         ->withoutOverlapping()
         ->runInBackground();
```

Ou directement dans le crontab système :

```cron
*/15 * * * * cd /var/www/secretis && php artisan secretis:sync-outlook >> /dev/null 2>&1
```

---

## Partie 3 — Connexion côté utilisateur

### Étape 9 : Se connecter depuis SECRETIS

1. Connectez-vous à SECRETIS ERP
2. Accédez à **Paramètres → Intégrations → Microsoft 365**
3. Cliquez sur **"Connecter avec Microsoft"**
4. Une fenêtre Microsoft s'ouvre — connectez-vous avec votre compte professionnel
5. Vérifiez les permissions demandées et cliquez sur **"Accepter"**
6. Vous êtes redirigé vers SECRETIS avec un message de confirmation

---

## Scopes requis et leur utilité détaillée

### `Calendars.ReadWrite`
Permet à SECRETIS de :
- Créer des événements dans votre calendrier Outlook lors de la planification dans SECRETIS
- Lire vos événements Outlook pour les afficher dans l'agenda SECRETIS
- Mettre à jour ou supprimer des événements synchronisés

### `OnlineMeetings.ReadWrite`
Permet à SECRETIS de :
- Créer automatiquement une réunion Teams lors de la planification d'une réunion SECRETIS
- Récupérer le lien `joinUrl` pour le bouton "Rejoindre sur Teams"
- Mettre à jour ou annuler la réunion Teams si la réunion SECRETIS est modifiée

### `Files.ReadWrite` et `Files.ReadWrite.All`
Permet à SECRETIS de :
- Uploader des documents de la GED SECRETIS vers votre OneDrive
- Importer des fichiers OneDrive dans la GED SECRETIS
- Générer des liens de partage pour les documents

### `Chat.ReadWrite`
Permet à SECRETIS de :
- Envoyer des notifications dans des canaux Teams (ex: nouvelle décision de réunion)
- Créer des canaux Teams pour les projets SECRETIS

### `offline_access`
Essentiel pour le fonctionnement en arrière-plan : permet à SECRETIS d'obtenir un `refresh_token` pour renouveler silencieusement l'`access_token` sans demander une reconnexion à chaque expiration (toutes les heures).

---

## Dépannage

### Erreur : "Token Microsoft expiré"

**Cause** : L'`access_token` a expiré et le `refresh_token` n'a pas pu être utilisé (révoqué ou expiré après 90 jours d'inactivité).

**Solution** :
1. Accédez à **Paramètres → Intégrations → Microsoft 365**
2. Cliquez sur **"Déconnecter"**
3. Reconnectez votre compte Microsoft

### Erreur : "Permissions manquantes" (403 Forbidden)

**Cause** : L'utilisateur n'a pas accordé toutes les permissions lors de la connexion OAuth2, ou un administrateur Azure AD a restreint les consentements.

**Solution** :
1. Si votre organisation nécessite l'approbation d'un administrateur Azure AD pour les nouvelles applications, demandez à votre administrateur d'accorder le consentement de l'administrateur dans le portail Azure :
   - Azure AD → Inscriptions d'applications → SECRETIS ERP → Autorisations d'API → **Accorder le consentement de l'administrateur pour [votre organisation]**
2. Déconnectez puis reconnectez votre compte Microsoft dans SECRETIS

### Erreur : "Impossible de créer la réunion Teams" (403 ou 401)

**Cause** : La fonctionnalité `OnlineMeetings.ReadWrite` peut nécessiter une politique Teams spécifique.

**Solution** :
1. Vérifiez dans le Centre d'administration Teams que les réunions en ligne sont autorisées pour votre compte
2. Vérifiez que la permission `OnlineMeetings.ReadWrite` a été accordée dans Azure AD

### La synchronisation CRON ne fonctionne pas

**Vérification** :
```bash
# Tester manuellement la synchronisation
php artisan secretis:sync-outlook --dry-run

# Vérifier les logs
tail -f storage/logs/laravel.log | grep "SyncMicrosoftCalendars"
```

**Cause fréquente** : Le CRON est configuré mais la commande n'est pas dans le planificateur Laravel (`Kernel.php`).

### Erreur 429 — Throttling Microsoft Graph

**Cause** : Trop de requêtes à l'API Microsoft Graph en peu de temps.

**Solution** : SECRETIS gère automatiquement le throttling avec un backoff exponentiel (3 tentatives). Si l'erreur persiste, vérifiez que le CRON de synchronisation n'est pas trop fréquent (recommandé : toutes les 15 minutes minimum).

---

## Sécurité et bonnes pratiques

- Les tokens Microsoft sont **chiffrés en base de données** avec la clé d'application Laravel (`APP_KEY`)
- Ne partagez jamais votre `MICROSOFT_CLIENT_SECRET` — stockez-le dans des secrets sécurisés (Vault, AWS Secrets Manager, etc.)
- Le `refresh_token` expire après **90 jours sans utilisation** : la synchronisation CRON toutes les 15 minutes garantit qu'il reste actif
- En cas de compromission, révoquez le secret dans Azure AD et regénérez-en un nouveau
- Les permissions accordées sont visibles et révocables par l'utilisateur dans [Mon compte Microsoft](https://myaccount.microsoft.com/permissions)

---

## Architecture technique

```
Utilisateur SECRETIS
       │
       ▼ GET /integrations/outlook/auth
OutlookController::auth()
       │
       ▼ Redirect vers Microsoft
Microsoft Identity Platform
       │
       ▼ Callback GET /integrations/outlook/callback?code=...&state=...
OutlookController::callback()
       │
       ▼
MicrosoftAuthService::handleCallback()
   ├── Valide le state (anti-CSRF, cache 5 min)
   ├── Échange le code → access_token + refresh_token
   ├── Récupère le profil Graph (/me)
   └── Stocke les tokens chiffrés (Crypt::encryptString)
       │
       ▼
users.microsoft_access_token    (chiffré)
users.microsoft_refresh_token   (chiffré)
users.microsoft_token_expires_at
users.microsoft_email
users.microsoft_scopes          (JSON)
```

---

*Guide rédigé pour IBIG SECRETIS ERP — Version 2026.1*
*Microsoft, Microsoft 365, Outlook, Teams et OneDrive sont des marques déposées de Microsoft Corporation.*
