# Module Reception & Visiteurs — IBIG SECRETIS

> **Stack :** Laravel 11 · React.js · Inertia.js · TailwindCSS · Laravel Reverb (WebSocket)

---

## Table des matieres

1. [Vue d ensemble](#1-vue-densemble)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Configuration initiale](#3-configuration-initiale)
4. [Guide receptionniste](#4-guide-receptionniste)
5. [Guide employe hote](#5-guide-employe-hote)
6. [Mode kiosque](#6-mode-kiosque)
7. [Webhooks et integration physique](#7-webhooks-et-integration-physique)
8. [Alertes et CRON](#8-alertes-et-cron)
9. [Securite et liste noire](#9-securite-et-liste-noire)
10. [Rapports et exports](#10-rapports-et-exports)

---

## 1. Vue d ensemble

Le module Reception & Visiteurs permet :

- L **accueil physique** des visiteurs avec badge imprimable
- La **gestion des invitations** pre-enregistrees avec QR code
- Le **suivi temps reel** (WebSocket Reverb) des presents en reception
- Les **alertes automatiques** a l hote lors de l arrivee d un visiteur
- La **liste noire** avec alertes lors d une tentative de check-in
- Des **rapports** detailles (affluence, durees, motifs, tops)
- Un **mode kiosque** tactile pour tablette en libre-service

---

## 2. Structure des fichiers

```
backend/
  database/migrations/
    2026_01_01_000111_create_visitor_management.php  # 5 tables

  app/
    Services/
      VisitorService.php           # Logique metier centrale
    Http/Controllers/
      VisitorController.php        # 11 endpoints REST + Inertia
    Jobs/
      NotifyHostVisitorArrived.php # Job asynchrone : notif hote
    Console/Commands/
      VisitorAlerts.php            # CRON : depassements, expiration, rapport

  resources/views/
    visitor-badge.blade.php        # Badge HTML A6 imprimable
    emails/
      visitor-invitation.blade.php # Email d invitation avec QR

frontend/
  resources/js/
    Pages/Reception/
      Kiosk.jsx                    # Mode kiosque plein ecran
      Dashboard.jsx                # Dashboard receptionniste temps reel
      VisitorLog.jsx               # Journal des visites
      Invitations.jsx              # Gestion invitations (employe hote)
      Reports.jsx                  # Graphiques et exports
      Blacklist.jsx                # Liste noire

    Components/Reception/
      BadgePreview.jsx             # Composant badge previsualisation

docs/
  module-reception.md              # Ce fichier
```

---

## 3. Configuration initiale

### 3.1 Migration

```bash
php artisan migrate
```

Cree les tables : `visitors`, `visit_logs`, `visitor_invitations`, `access_zones`, `parking_spots`.

### 3.2 Zones d acces

Via l interface admin ou directement en base :

```sql
INSERT INTO access_zones (organization_id, name, requires_escort, access_level, capacity)
VALUES
  (1, 'Hall d accueil',     false, 'public',       50),
  (1, 'Salle de reunion',   false, 'public',       20),
  (1, 'Open space',         false, 'restricted',   100),
  (1, 'Direction',          true,  'restricted',   10),
  (1, 'Salle serveur',      true,  'confidential', 5);
```

**Regles de couleur des badges :**
- Vert `#27AE60` — Zone `public` sans escorte
- Orange `#F39C12` — Zone `restricted` ou escorte requise
- Rouge `#E74C3C` — Zone `confidential`

### 3.3 Spots de parking

```sql
INSERT INTO parking_spots (organization_id, spot_number, zone, is_available)
VALUES
  (1, 'V01', 'visiteurs', true),
  (1, 'V02', 'visiteurs', true),
  (1, 'V03', 'visiteurs', true),
  (1, 'D01', 'direction', true);
```

### 3.4 Variables d environnement

```env
# Laravel Reverb (WebSocket)
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=localhost
REVERB_PORT=8080

# Mail (invitations + alertes)
MAIL_MAILER=smtp
MAIL_HOST=smtp.exemple.com
MAIL_FROM_ADDRESS=reception@votre-organisation.com
MAIL_FROM_NAME="Reception IBIG SECRETIS"

# Push notifications mobiles (optionnel)
FCM_SERVER_KEY=your-fcm-key
```

### 3.5 Routes a ajouter

```php
// routes/web.php
Route::prefix('reception')->middleware(['auth'])->group(function () {
    Route::get('/dashboard',    [VisitorController::class, 'today']);
    Route::get('/log',          [VisitorController::class, 'log']);
    Route::get('/invitations',  [VisitorController::class, 'invitations']);
    Route::get('/reports',      [VisitorController::class, 'report']);
});

Route::prefix('visitors')->middleware(['auth'])->group(function () {
    Route::get('/',                     [VisitorController::class, 'index']);
    Route::post('/check-in',            [VisitorController::class, 'checkIn']);
    Route::post('/{id}/blacklist',      [VisitorController::class, 'blacklist']);
    Route::delete('/{id}/blacklist',    [VisitorController::class, 'unblacklist']);
});

Route::prefix('visits')->middleware(['auth'])->group(function () {
    Route::post('/{id}/check-out',      [VisitorController::class, 'checkOut']);
    Route::get('/today',                [VisitorController::class, 'today']);
    Route::get('/report',               [VisitorController::class, 'report']);
});

Route::prefix('visitor-invitations')->group(function () {
    Route::post('/',            [VisitorController::class, 'storeInvitation'])->middleware('auth');
    Route::get('/{code}',       [VisitorController::class, 'validateInvitation']); // public
});

// Mode kiosque (auth legere ou sans auth)
Route::get('/kiosk/{org}',  [VisitorController::class, 'kiosk'])->name('reception.kiosk');
```

### 3.6 CRON

Ajouter dans `app/Console/Kernel.php` :

```php
$schedule->command('visitors:alerts')->hourly();
```

Ou avec Laravel 11 dans `routes/console.php` :

```php
Schedule::command('visitors:alerts')->hourly();
```

---

## 4. Guide receptionniste

### 4.1 Dashboard temps reel

Accessible via `/reception/dashboard`.

- Les cartes se mettent a jour **automatiquement** via WebSocket sans recharger la page.
- Une carte rouge avec animation pulse indique un **depassement de 4 heures**.
- Le bouton **Check-out** sur chaque carte libere le badge et le parking.

### 4.2 Enregistrer une arrivee (check-in)

**Via le kiosque :**
1. Le visiteur choisit "Je n ai pas d invitation"
2. Il remplit le formulaire et se prend en photo
3. Le receptionniste recoit une notification

**Via le dashboard receptionniste :**
- Utiliser le bouton "+ Check-in" (a ajouter dans votre layout)
- Ou passer par `/visitors/check-in` via l API

**Si le visiteur est blackliste :**
- Une alerte rouge s affiche immediatement
- Le check-in est bloque (HTTP 403)
- Ne jamais communiquer le motif au visiteur, contacter la securite

### 4.3 Enregistrer un depart (check-out)

- Bouton **Check-out** sur la carte du visiteur dans le dashboard
- Ou scan du QR code du badge via `/visits/scan/{id}`
- Le badge est marque comme rendu, le parking libere

### 4.4 Badge visiteur

Le badge est genere automatiquement au check-in.  
Il est disponible via `GET /visits/{id}/badge` (HTML imprimable).

Options d impression :
- **Badge papier** : impression via le navigateur (CSS @media print integre)
- **Affichage tablette** : composant `BadgePreview` en mode `screen`

---

## 5. Guide employe hote

### 5.1 Creer une invitation

1. Aller sur `/reception/invitations`
2. Cliquer "+ Inviter un visiteur"
3. Remplir : nom, email, date, horaires, objet, salle
4. Valider — l email est envoye automatiquement au visiteur avec le QR code
5. Le QR code est affiche immediatement et telechargeable

### 5.2 Ce que recoit le visiteur

Un email contient :
- Les details de la visite (date, heure, lieu)
- Un QR code unique a presenter a la reception
- Un code alphanum de secours (8 caracteres)
- Un lien Google Maps vers les locaux
- Les coordonnees de l hote
- Les instructions de stationnement

### 5.3 Notification d arrivee

Des que le visiteur est enregistre en reception :
- Email : "Votre visiteur [Nom] est arrive en reception"
- Notification push mobile (si FCM configure)
- Badge rouge dans l application (compteur Notifications)

### 5.4 Inviter plusieurs visiteurs

Creer une invitation par personne — chaque visiteur a son propre QR code.  
Indiquer le meme creneau et la meme salle pour une reunion de groupe.

---

## 6. Mode kiosque

### 6.1 Installation sur tablette

Le mode kiosque est accessible a `/kiosk/{slug-organisation}`.

**Materiel recommande :**
- Tablette 10" minimum (Android ou iPad)
- Support fixe avec anti-vol
- Imprimante badge Zebra ZD220 ou Brother QL-820NWB (via AirPrint / IPP)
- Webcam integree ou externe pour la photo

**Navigateur :** Chrome en mode "Kiosque" (plein ecran, barre masquee)

```bash
# Lancer Chrome en mode kiosque (Windows)
chrome.exe --kiosk --no-first-run https://votre-erp.com/kiosk/votre-org
```

### 6.2 Mise en veille automatique

Apres **2 minutes d inactivite**, le mode veille s active :
- Affichage de l horloge, la date et le logo organisation
- Fond bleu IBIG `#1A3A5C`
- Un simple toucher reacti ve l ecran

### 6.3 Parcours visiteur sans invitation

1. Toucher "Je n ai pas d invitation"
2. Le formulaire s affiche (typographie 24px, boutons geants)
3. La webcam se lance pour la photo (optionnelle)
4. Remplir les champs, choisir l hote et le motif
5. Valider — confirmation et notification automatique a l hote

### 6.4 Parcours visiteur avec invitation

1. Toucher "J ai une invitation"
2. Saisir le code QR (ou scanner avec le lecteur USB/Bluetooth)
3. Les details de la visite s affichent pour confirmation
4. Confirmer — notification a l hote

### 6.5 Securite kiosque

- URL `/kiosk/{org}` ne necessite pas d authentification Laravel complete
- La session est legere (organisation publique, hotes publics)
- Les donnees sensibles (blacklist, etc.) sont validees cote serveur
- Activer le mode "Guided Access" sur iPad pour bloquer toute sortie de l app

---

## 7. Webhooks et integration physique

Le module peut envoyer des webhooks sortants vers un systeme de controle d acces physique (Genetec, Lenel, Hikvision...).

### 7.1 Configuration

Ajouter dans `config/reception.php` :

```php
return [
    'webhooks' => [
        'access_control_url' => env('ACCESS_CONTROL_WEBHOOK_URL'),
        'access_control_key' => env('ACCESS_CONTROL_WEBHOOK_KEY'),
    ],
];
```

### 7.2 Evenements emis

| Evenement | Payload |
|-----------|---------|
| `visitor.checked_in`   | `visit_id`, `visitor_id`, `badge_number`, `access_zone_id`, `check_in_at` |
| `visitor.checked_out`  | `visit_id`, `visitor_id`, `badge_number`, `check_out_at` |
| `visitor.blacklisted`  | `visitor_id`, `id_number`, `reason` |

### 7.3 Exemple d integration

```php
// Dans VisitorService::checkIn(), apres le broadcast :
Http::withToken(config('reception.webhooks.access_control_key'))
    ->post(config('reception.webhooks.access_control_url'), [
        'event'       => 'visitor.checked_in',
        'badge'       => $visitor->badge_number,
        'zone'        => $visit->accessZone?->name,
        'check_in_at' => $visit->check_in_at->toISOString(),
    ]);
```

---

## 8. Alertes et CRON

La commande `php artisan visitors:alerts` s execute **toutes les heures**.

| Alerte | Condition | Destinataire |
|--------|-----------|--------------|
| Depassement de sejour | Visiteur present depuis > 4h | Receptionnistes (role `receptionist`) |
| Invitation expirant | Expires dans < 2h, non utilisee | Employe hote (invited_by) |
| Rapport journalier | Apres 17h00, si visites > 0 | Admins + Receptionnistes |

---

## 9. Securite et liste noire

### 9.1 Verification automatique

A chaque check-in, le numero de piece est verifie contre la liste noire.
Si le visiteur est blackliste :
- HTTP 403 retourne avec `{ blacklisted: true, reason: "..." }`
- Le kiosque affiche "Acces refuse — contacter la reception"
- Le receptionniste recoit une alerte

### 9.2 Ajouter un visiteur a la liste noire

Via l interface `/visitors` (filtre "Blacklistés") :
1. Chercher le visiteur par nom ou N° de piece
2. Cliquer "Blacklister"
3. Saisir le motif obligatoire
4. Confirmer

Via l API :
```http
POST /visitors/{id}/blacklist
Authorization: Bearer {token}
Content-Type: application/json

{ "reason": "Comportement agressif lors de la visite du 2026-01-15" }
```

### 9.3 Import CSV (partage inter-sites)

Format attendu :
```csv
id_type,id_number,full_name,reason
CNI,CI123456789,Jean Martin,Tentative de vol
Passeport,FR12345678,Marie Dupont,Acces non autorise
```

Via le bouton "Import CSV" dans l interface ou :
```http
POST /visitors/blacklist/import
Content-Type: multipart/form-data
file: blacklist.csv
```

---

## 10. Rapports et exports

### 10.1 Rapport journalier

Page `/visits/report` avec selection de date.

**Donnees disponibles :**
- KPIs : total, presents, partis, no-shows, duree moyenne, taux no-show
- BarChart : visites sur 30 jours glissants
- LineChart : affluence par heure (8h-18h)
- PieChart : repartition par motif (reunion, livraison, maintenance, autre)
- TOP 10 hotes les plus visites
- Barre de progression par hote

### 10.2 Exports

**Journal CSV :**
```
GET /reception/log/export?date=2026-01-15&status=checked_out
```

**Journal PDF :**
```
GET /reception/log/export-pdf?date=2026-01-15
```

**Rapport mensuel PDF :**
```
GET /visits/report/pdf?date=2026-01-01
```

**Export liste noire :**
```
GET /visitors/blacklist/export
```

---

*Document genere par IBIG SECRETIS ERP — Module Reception & Visiteurs v1.0*
