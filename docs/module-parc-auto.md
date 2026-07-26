# Module Parc Auto Avancé — IBIG SECRETIS ERP

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Configuration des trackers GPS](#configuration-des-trackers-gps)
4. [Paramétrage des alertes de maintenance](#paramétrage-des-alertes-de-maintenance)
5. [Guide conducteur — Carnet de bord](#guide-conducteur--carnet-de-bord)
6. [Géofences — Zones géographiques](#géofences--zones-géographiques)
7. [Calcul TCO et indicateurs de performance](#calcul-tco-et-indicateurs-de-performance)
8. [API & Webhooks GPS](#api--webhooks-gps)
9. [Déploiement et configuration serveur](#déploiement-et-configuration-serveur)

---

## Vue d'ensemble

Le module Parc Auto Avancé étend les fonctionnalités de base (gestion des véhicules, demandes de véhicules) en ajoutant :

- **Géolocalisation temps réel** via trackers GPS (Traccar, Wialon, custom)
- **Maintenance prédictive** avec alertes kilométriques et calendaires
- **Gestion du carburant** avec calcul automatique de consommation L/100km
- **Carnet de bord numérique** pour les conducteurs
- **Géofences** (zones d'alerte géographiques)
- **Rapport mensuel complet** avec TCO, coût/km, taux d'utilisation

---

## Architecture technique

### Stack

| Couche     | Technologie |
|------------|-------------|
| Backend    | Laravel 11 + PHP 8.3 |
| Frontend   | React 18 + Inertia.js |
| Styles     | TailwindCSS |
| Graphiques | Recharts |
| Cartographie | Leaflet.js (CDN) |
| Queue      | Laravel Horizon (Redis) |
| CRON       | Laravel Task Scheduling |

### Nouvelles tables (migration 2026_01_01_000114)

| Table | Rôle |
|-------|------|
| `vehicle_gps_logs` | Historique complet des positions GPS |
| `vehicle_trips` | Trajets avec distances, durées, conducteurs |
| `vehicle_maintenance_schedules` | Planning maintenances par véhicule et type |
| `vehicle_maintenance_logs` | Historique interventions |
| `vehicle_fuel_logs` | Journal des pleins |
| `vehicle_assignments` | Affectations véhicule ↔ utilisateur |
| `vehicle_geofences` | Zones géographiques d'alerte |

La table `vehicles` est enrichie de colonnes GPS : `current_lat`, `current_lng`, `current_speed`, `engine_on`, `fuel_level_percent`, `odometer_km`, `last_gps_update`, `gps_device_id`, `gps_provider`.

### Fichiers clés

```
backend/
├── app/
│   ├── Http/Controllers/
│   │   ├── FleetController.php          — Toutes les routes Fleet
│   │   └── GpsWebhookController.php     — Réception données GPS (Traccar, Wialon)
│   ├── Services/
│   │   └── FleetService.php             — Logique métier (maintenance, carburant, KPIs)
│   ├── Jobs/
│   │   └── FleetMaintenanceAlertJob.php — CRON alertes maintenance
│   └── Models/
│       ├── VehicleGpsLog.php
│       ├── VehicleTrip.php
│       ├── VehicleMaintenanceSchedule.php
│       ├── VehicleMaintenanceLog.php
│       ├── VehicleFuelLog.php
│       ├── VehicleAssignment.php
│       └── VehicleGeofence.php
├── database/migrations/
│   └── 2026_01_01_000114_enhance_vehicles_advanced.php
└── routes/api/
    └── fleet.php

frontend/resources/js/Pages/Fleet/
├── MapView.jsx            — Carte temps réel
├── VehicleDetail.jsx      — Fiche véhicule (4 onglets)
├── MaintenancePlanning.jsx — Planning maintenance flotte
├── FuelManagement.jsx     — Gestion carburant
├── FleetReport.jsx        — Rapport mensuel
├── GeofenceManager.jsx    — Zones géographiques
└── TripLogger.jsx         — Carnet de bord conducteur
```

---

## Configuration des trackers GPS

### Option 1 — Traccar (open source, recommandé)

**Installation Traccar Server :**
```bash
# Ubuntu/Debian
wget https://www.traccar.org/download/traccar-linux-64-latest.zip
unzip traccar-linux-64-latest.zip
sudo ./traccar.run
```

**Configuration SECRETIS :**

1. Dans l'interface Traccar, créez un appareil par véhicule
2. Copiez l'`ID unique` de l'appareil (ex: `ABC123456`)
3. Dans SECRETIS, fiche véhicule, renseignez :
   - **Fournisseur GPS** : `traccar`
   - **ID Device GPS** : `ABC123456` (l'ID Traccar)

4. Configurez un webhook Traccar vers SECRETIS :
```
URL : https://votre-domaine.com/fleet/gps-webhook/traccar
Method : POST
Content-Type : application/json
```

**Format JSON envoyé par Traccar :**
```json
{
  "deviceId": "ABC123456",
  "position": {
    "latitude": 5.3600,
    "longitude": -4.0083,
    "speed": 45.2,
    "course": 180,
    "altitude": 25,
    "accuracy": 5,
    "attributes": {
      "ignition": true,
      "fuel1Level": 65,
      "odometer": 48500000
    }
  }
}
```

> Note : Traccar envoie la vitesse en nœuds (knots). Le contrôleur la convertit automatiquement en km/h (×1.852). L'odomètre Traccar est en mètres, converti en km automatiquement.

---

### Option 2 — Wialon

1. Dans Wialon Hosting, configurez un **trigger** de type "Job > Notification"
2. Destination : `https://votre-domaine.com/fleet/gps-webhook/wialon`
3. Format supporté :
```json
{
  "unit_id": 12345,
  "t": 1704067200,
  "pos": { "x": -4.0083, "y": 5.3600, "s": 60, "c": 90, "z": 20 },
  "p": { "engine_on": 1, "fuel_percent": 45, "mileage": 48500 }
}
```
- `x` = longitude, `y` = latitude (convention Wialon)
- Ajoutez le header `X-Wialon-Token: <token>` ou renseignez `gps_device_id` avec le `unit_id`

---

### Option 3 — Tracker custom

Tous les trackers envoyant un JSON vers l'endpoint générique :

```
POST https://votre-domaine.com/fleet/gps-webhook
Header: X-Device-Token: <token_du_vehicule>
```

Le token s'obtient en renseignant dans la fiche véhicule :
- **Fournisseur GPS** : `custom`
- **ID Device GPS** : le token (chaîne unique, ex: `flotte_veh_001_abc123`)

**Format JSON attendu :**
```json
{
  "lat": 5.3600,
  "lng": -4.0083,
  "speed": 65,
  "heading": 225,
  "altitude": 30,
  "accuracy": 8,
  "engine_on": true,
  "fuel_percent": 55,
  "odometer": 48500,
  "timestamp": 1704067200
}
```

---

## Paramétrage des alertes de maintenance

### Types de maintenance supportés

| Code | Label | Recommandation |
|------|-------|----------------|
| `vidange` | Vidange moteur | tous les 10 000 km ou 6 mois |
| `pneus` | Pneus | tous les 40 000 km ou 24 mois |
| `freins` | Freins | tous les 20 000 km ou 12 mois |
| `courroie` | Courroie de distribution | tous les 100 000 km ou 60 mois |
| `revision` | Révision générale | tous les 30 000 km ou 24 mois |
| `ct` | Contrôle technique | tous les 24 mois (légal) |
| `assurance` | Assurance | annuelle (12 mois) |
| `vignette` | Vignette | annuelle (12 mois) |

### Configurer un planning pour un véhicule

Via l'API (ou interface admin — à créer) :

```bash
POST /fleet/maintenance-logs
{
  "vehicle_id": 1,
  "maintenance_type": "vidange",
  "done_date": "2024-01-15",
  "done_km": 45000,
  "cost": 35000
}
```

Cela crée ou met à jour automatiquement le `VehicleMaintenanceSchedule` et recalcule les prochaines échéances.

### Seuils d'alerte

| Statut | Km restants | Jours restants | Couleur |
|--------|------------|----------------|---------|
| `ok` | > 1 500 km | > 30 jours | Vert |
| `bientot` | 500–1 500 km | 15–30 jours | Jaune |
| `urgent` | 0–500 km | 0–15 jours | Orange |
| `depassé` | < 0 km | < 0 jours | Rouge |

### CRON d'alertes

Le job `FleetMaintenanceAlertJob` tourne **chaque jour à 07h00**.

Ajoutez dans `routes/console.php` ou `app/Console/Kernel.php` :

```php
use App\Jobs\FleetMaintenanceAlertJob;

$schedule->job(FleetMaintenanceAlertJob::class)
    ->dailyAt('07:00')
    ->withoutOverlapping()
    ->onOneServer();
```

**Ce que le CRON fait :**
- Parcourt tous les véhicules de toutes les organisations
- Envoie des notifications pour `urgent` et `depassé`
- Vérifie CT, assurance, vignette 30 jours avant expiration
- Chaque lundi : rapport hebdomadaire santé flotte

---

## Guide conducteur — Carnet de bord

Le module TripLogger (`/fleet/trips/logger`) est une interface simplifiée pour les conducteurs.

### Démarrer un trajet

1. Accédez à **Mon carnet de bord** dans le menu
2. Cliquez sur l'onglet **▶ Démarrer**
3. Sélectionnez le véhicule assigné
4. Indiquez le motif (Professionnel / Personnel / Mixte)
5. Optionnel : indiquez le lieu de départ et les notes de mission
6. Cliquez **▶ Démarrer le trajet**

### Terminer un trajet

1. Cliquez sur l'onglet **⏹ Terminer** (actif uniquement si un trajet est en cours)
2. Indiquez le lieu d'arrivée
3. Relevez le kilométrage affiché sur le compteur et saisissez-le
4. Cliquez **⏹ Terminer le trajet**

Le système calcule automatiquement :
- Distance parcourue (si GPS disponible : calcul réel ; sinon : estimé depuis les km)
- Durée du trajet
- Vitesse moyenne

### Historique mensuel

L'onglet **📋 Mes trajets** affiche :
- Tous les trajets du mois en cours
- Total des km parcourus
- Nombre de trajets
- Distance moyenne par trajet

---

## Géofences — Zones géographiques

### Créer une zone circulaire

1. Accédez à **Fleet > Zones géographiques**
2. Cliquez **+ Nouvelle zone**
3. Renseignez :
   - Nom de la zone (ex: "Zone client ABC")
   - Type : **Cercle**
   - Latitude et longitude du centre
   - Rayon en mètres (minimum 50 m)
4. Cochez les alertes souhaitées (entrée / sortie)
5. Cliquez **Créer**

Pour obtenir les coordonnées : clic droit sur Google Maps > "Plus d'infos sur cet endroit"

### Comportement des alertes

Lorsqu'un véhicule entre ou sort d'une zone active :
- Une notification est envoyée immédiatement
- Le type d'événement (entrée/sortie) est mentionné
- Les utilisateurs définis dans `notify_user_ids` reçoivent l'alerte

Le système utilise un **cache 2h** pour éviter les alertes répétées sur la même zone (une seule alerte par transition entrée/sortie).

---

## Calcul TCO et indicateurs de performance

### TCO (Total Cost of Ownership)

Calculé sur les **12 derniers mois glissants** :

```
TCO = Σ(Coûts carburant) + Σ(Coûts maintenance)
```

> Note : L'amortissement et les coûts d'assurance peuvent être ajoutés via les logs de maintenance (type `assurance`).

### Coût au kilomètre

```
Coût/km = TCO / Total km parcourus (12 mois)
```

Idéalement < 150 F CFA/km pour un véhicule de tourisme.

### Taux de disponibilité

```
Disponibilité (%) = (Nb véhicules - Nb en maintenance) / Nb total × 100
```

Objectif : > 90%

### Taux d'utilisation

```
Utilisation (%) = Véhicules ayant effectué ≥ 1 trajet sur 7 jours / Total × 100
```

Un taux < 50% indique une sur-flotte potentielle.

### Consommation L/100km

Calculée entre deux pleins **complets consécutifs** :

```
L/100km = Litres plein N / (Km plein N - Km plein N-1) × 100
```

Une anomalie est détectée si L/100km > Moyenne × 1,20 (+20%).

---

## API & Webhooks GPS

### Endpoints sécurisés (auth:sanctum)

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/fleet/map` | Positions actuelles de la flotte |
| GET | `/fleet/vehicles/{id}/trips` | Historique trajets |
| POST | `/fleet/trips/start` | Démarrer un trajet |
| POST | `/fleet/trips/{id}/end` | Terminer un trajet |
| GET | `/fleet/vehicles/{id}/maintenance` | Planning maintenance |
| POST | `/fleet/maintenance-logs` | Enregistrer une maintenance |
| GET | `/fleet/vehicles/{id}/fuel` | Historique carburant |
| POST | `/fleet/fuel-logs` | Enregistrer un plein |
| GET | `/fleet/report?month=2024-01` | Rapport mensuel |
| GET/POST/PUT/DELETE | `/fleet/geofences` | CRUD zones |
| GET | `/fleet/assignments` | Affectations |
| POST | `/fleet/assignments` | Nouvelle affectation |

### Webhooks GPS (publics, token device)

| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/fleet/gps-webhook` | Generic (header X-Device-Token) |
| POST | `/fleet/gps-webhook/traccar` | Format Traccar |
| POST | `/fleet/gps-webhook/wialon` | Format Wialon |

---

## Déploiement et configuration serveur

### Variables d'environnement à ajouter

```env
# Cache pour les états géofences (recommandé: Redis)
CACHE_DRIVER=redis
REDIS_HOST=127.0.0.1

# Queue pour les notifications GPS en temps réel
QUEUE_CONNECTION=redis

# Optionnel : intervalle de rafraîchissement carte (en ms)
VITE_FLEET_MAP_REFRESH=30000
```

### Activation du CRON

```bash
# crontab -e
* * * * * php /var/www/secretis/artisan schedule:run >> /dev/null 2>&1
```

### Migration

```bash
php artisan migrate
```

### Permissions (Spatie Laravel Permission)

Ajoutez dans le seeder :

```php
$permissions = [
    'fleet.view',        // Voir la flotte
    'fleet.gps',         // Voir les positions GPS
    'fleet.trips',       // Gérer les trajets
    'fleet.maintenance', // Gérer les maintenances
    'fleet.fuel',        // Gérer le carburant
    'fleet.geofences',   // Gérer les géofences
    'fleet.report',      // Voir les rapports
    'fleet.manage',      // Administration complète
];
```

### Routes Inertia à ajouter dans web.php

```php
use App\Http\Controllers\FleetController;

Route::prefix('fleet')->middleware(['auth', 'tenant'])->group(function () {
    Route::get('/map',         [FleetController::class, 'mapView'])          ->name('fleet.map');
    Route::get('/vehicles/{id}',[FleetController::class, 'vehicleDetail'])   ->name('fleet.vehicles.detail');
    Route::get('/maintenance', [FleetController::class, 'maintenancePlanning'])->name('fleet.maintenance');
    Route::get('/fuel',        [FleetController::class, 'fuelManagement'])   ->name('fleet.fuel');
    Route::get('/report',      [FleetController::class, 'fleetReport'])      ->name('fleet.report');
    Route::get('/geofences',   [FleetController::class, 'geofenceManager']) ->name('fleet.geofences');
    Route::get('/trips/logger',[FleetController::class, 'tripLogger'])       ->name('fleet.trips.logger');
});
```
