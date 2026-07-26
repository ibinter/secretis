# Guide e-Learning SECRETIS

> Module de formation avancé — SCORM, Sessions Live, Parcours, LRS xAPI

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Importer un paquet SCORM](#importer-un-paquet-scorm)
3. [Créer et animer une session live](#créer-et-animer-une-session-live)
4. [Créer un parcours d'apprentissage](#créer-un-parcours-dapprentissage)
5. [Guide apprenant](#guide-apprenant)
6. [Guide instructeur](#guide-instructeur)
7. [Intégration xAPI / LRS](#intégration-xapi--lrs)
8. [Administration et rapports](#administration-et-rapports)
9. [Architecture technique](#architecture-technique)

---

## Vue d'ensemble

Le module e-Learning SECRETIS (version avancée) ajoute à la base Wave 7 :

| Fonctionnalité | Description |
|---|---|
| **SCORM 1.2 / 2004** | Import de paquets ZIP, lecteur intégré sécurisé, reprise automatique |
| **xAPI (Tin Can)** | LRS interne pour enregistrer tous les statements d'apprentissage |
| **Sessions Live** | Planification Zoom/Teams/Meet, inscriptions, présence, replays |
| **Parcours** | Chemins structurés par rôle (Secrétaire, Manager, DAF, RH, Direction) |
| **Catalogue public** | Formations visibles sans authentification, achat en ligne |
| **Tableau de bord** | KPIs RH, graphiques, export rapport DRH |

---

## Importer un paquet SCORM

### Formats pris en charge

- **SCORM 1.2** — standard le plus répandu (fichier `imsmanifest.xml` avec schéma 1.2)
- **SCORM 2004** (éditions 2, 3 et 4) — schéma 1.3
- **xAPI / Tin Can** — contenu avec `tincan.xml`

### Étapes d'import

1. Aller dans **Formation → Gestion des cours** (rôle Admin)
2. Cliquer sur **"Importer SCORM"**
3. Glisser-déposer le fichier `.zip` (max 300 Mo)
4. Vérifier les métadonnées détectées automatiquement :
   - Titre extrait du manifest
   - Version détectée (SCORM 1.2 / 2004 / xAPI)
   - URL de lancement
5. Associer (optionnel) à un cours existant
6. Cliquer **"Importer"**

Le paquet est extrait dans `storage/app/public/scorm_packages/{uuid}/`. L'URL de lancement est signée avec un token de 4 heures.

### API de lancement

```
GET /training/scorm/{id}/launch
```
Retourne :
```json
{
  "session_id": 42,
  "launch_url": "https://votre-domaine/training/scorm/serve/1/abc123token",
  "scorm_data": { "cmi.core.lesson_status": "incomplete", "cmi.suspend_data": "..." },
  "version": "scorm_12"
}
```

### Fonctionnement du runtime SCORM

Le lecteur `ScormPlayer.jsx` installe automatiquement l'API SCORM dans la fenêtre parente :

- **SCORM 1.2** → `window.API` (LMSInitialize, LMSSetValue, LMSGetValue…)
- **SCORM 2004** → `window.API_1484_11` (Initialize, SetValue, GetValue…)

Les données `cmi.*` sont sauvegardées :
- En temps réel via debounce de 2 secondes après chaque `SetValue`
- Toutes les 60 secondes (sauvegarde auto du temps passé)
- À la fermeture via `LMSFinish` / `Terminate`

La reprise automatique charge `cmi.suspend_data` depuis la base de données.

### Sécurité SCORM

L'iframe utilise :
```html
sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
```
Les fichiers sont servis via un endpoint Laravel authentifié par token signé (cache 4h). Le token est invalidé après expiration.

---

## Créer et animer une session live

### Créer une session

1. **Formation → Sessions Live → "Nouvelle session"**
2. Remplir :
   - Titre et description
   - Instructeur (utilisateur interne)
   - Date et heure de démarrage
   - Durée (minutes)
   - Plateforme : `Teams`, `Zoom`, `Google Meet` ou `Secretis Video`
   - Lien de réunion (si déjà généré) ou laisser vide pour génération automatique
   - Nombre max de participants
3. Importer les supports (PDF, présentations) via `materials_paths`

### Intégration Microsoft Teams (optionnel)

Dans `config/services.php` :
```php
'microsoft' => [
    'client_id'     => env('MICROSOFT_CLIENT_ID'),
    'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
    'tenant_id'     => env('MICROSOFT_TENANT_ID'),
],
```
Avec les tokens valides, `LiveTrainingService::generateMeetingLink()` crée automatiquement une réunion Teams via Microsoft Graph API.

### Cycle de vie d'une session

| Statut | Déclencheur | Effet |
|---|---|---|
| `scheduled` | Création | Inscription possible |
| `live` | `POST /training/live-sessions/{id}/start` | Notification push à tous les inscrits |
| `completed` | `POST /training/live-sessions/{id}/end` | Absents marqués, attestations générables |
| `cancelled` | Admin | Notifications annulation |

### Inscription et présence

- Les apprenants s'inscrivent via le calendrier ou la fiche de session
- Un email de confirmation est envoyé (via le système de notifications SECRETIS)
- La présence est enregistrée manuellement ou via intégration Zoom webhook :
  ```
  POST /training/live-sessions/{id}/attendance
  { "user_id": 5, "duration_minutes": 45 }
  ```

### Générer une attestation de présence (PDF)

```php
// Dans votre contrôleur :
$pdf = PDF::loadView('training.live-attendance-certificate', [
    'session'           => $session,
    'attendee'          => $user,
    'instructor'        => $instructor,
    'organization'      => $org,
    'verificationToken' => bin2hex(random_bytes(20)),
    'qrCodeBase64'      => '', // intégrer une lib QR si besoin
]);
return $pdf->download("attestation-{$session->id}-{$user->id}.pdf");
```

---

## Créer un parcours d'apprentissage

### Structure d'un parcours

Un parcours (`training_learning_paths`) contient des items JSONB :

```json
{
  "items": [
    { "type": "course", "id": 12, "order": 1, "is_mandatory": true,  "title": "Introduction" },
    { "type": "live",   "id": 5,  "order": 2, "is_mandatory": false, "title": "Atelier live" },
    { "type": "scorm",  "id": 3,  "order": 3, "is_mandatory": true,  "title": "Simulation SCORM" },
    { "type": "quiz",   "id": 8,  "order": 4, "is_mandatory": true,  "title": "Évaluation finale" }
  ]
}
```

Types d'items supportés :
- `course` — cours interne Wave 7
- `live` — session live
- `scorm` — paquet SCORM
- `quiz` — quiz standalone

### Créer via l'API

```
POST /training/learning-paths
{
  "title": "Parcours Secrétaire Niveau 2",
  "target_role": "Secrétaire",
  "difficulty": "intermediaire",
  "total_hours": 12,
  "items": [...]
}
```

### Progression et complétion

`LearningPathService::updatePathProgress()` recalcule le pourcentage global à chaque avancement. À 100%, un certificat de parcours est automatiquement généré et une notification envoyée.

---

## Guide apprenant

### Trouver une formation

1. **Catalogue** — formations publiques + internes selon votre organisation
2. **Filtres** : niveau (Débutant / Intermédiaire / Avancé), langue, gratuit/payant
3. **Recommandées** — carrousel basé sur votre rôle

### Suivre une formation

1. S'inscrire (gratuit) ou Acheter (formations payantes)
2. Accéder aux modules dans le lecteur de cours
3. Pour les modules SCORM : lecteur plein écran avec reprise automatique
4. Pour les sessions live : s'inscrire depuis le calendrier, rejoindre le lien au moment J
5. Valider les quiz avec le score minimum requis

### Mes certificats

- Générés automatiquement à la complétion d'un cours ou d'un parcours
- Téléchargeables en PDF depuis **Formation → Mes certificats**
- Vérifiables publiquement via le QR code ou l'URL `/verify/certificate/{token}`

### Évaluer une formation

Après complétion, vous pouvez noter de 1 à 5 étoiles et laisser un commentaire depuis la fiche du cours (onglet **Avis**).

---

## Guide instructeur

### Accès

Les utilisateurs avec le rôle `instructor` ou `admin` accèdent au **Tableau de bord instructeur** via `Formation → Mon dashboard`.

### Créer un cours

1. **Formation → Gestion → "Nouveau cours"**
2. Renseigner : titre, description, catégorie, niveau, thumbnail, trailer (URL vidéo)
3. Ajouter les **Compétences enseignées** (liste, ex: `["Rédaction administrative", "Protocole"]`)
4. Définir les **prérequis** (liste de textes)
5. Ajouter des **tags** pour la recommandation par rôle (ex: `["Secrétaire", "RH"]`)
6. Publier le cours (`is_published: true`) pour le rendre visible
7. Cocher `is_public` pour l'exposer au catalogue public
8. Définir `price_xof: 0` pour gratuit ou un montant pour payant

### Créer des modules

```
POST /training/courses/{courseId}/modules
{
  "title": "Introduction à la gestion documentaire",
  "content_type": "video",  // video | text | quiz | scorm | file
  "duration_minutes": 20,
  "sort_order": 1,
  "is_required": true,
  "content": { "video_url": "https://..." }
}
```

### Statistiques en temps réel

Le tableau de bord instructeur affiche :
- Taux de complétion par cours
- Note moyenne et commentaires récents
- Sessions live : planifiées, participants inscrits, statut

---

## Intégration xAPI / LRS

### LRS interne SECRETIS

SECRETIS inclut un LRS (Learning Record Store) minimal conforme à la spécification xAPI 1.0.

**Endpoint LRS** : `POST /training/xapi/statements`

### Format d'un statement xAPI

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "actor": {
    "mbox": "mailto:utilisateur@exemple.com",
    "name": "Prénom Nom"
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/completed",
    "display": { "fr-FR": "a terminé" }
  },
  "object": {
    "id": "https://votre-domaine/formations/cours-gestion",
    "definition": {
      "name": { "fr-FR": "Gestion documentaire" }
    }
  },
  "result": {
    "score": { "raw": 87, "max": 100 },
    "success": true,
    "completion": true
  },
  "context": {
    "registration": "uuid-de-session"
  }
}
```

### Envoyer des statements depuis du contenu xAPI

Le contenu Tin Can (xAPI) peut envoyer des statements directement à l'endpoint :

```javascript
fetch('/training/xapi/statements', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
  },
  body: JSON.stringify(statement)
});
```

Ou en batch : envoyer un tableau de statements.

### Interroger le LRS

```
GET /training/xapi/statements?actor_email=user@example.com&verb_id=http://adlnet.gov/expapi/verbs/completed
```

### Verbes xAPI recommandés

| Verbe | URI | Signification |
|---|---|---|
| launched | `http://adlnet.gov/expapi/verbs/launched` | Démarre le contenu |
| initialized | `http://adlnet.gov/expapi/verbs/initialized` | Initialise la session |
| progressed | `http://adlnet.gov/expapi/verbs/progressed` | Progression |
| completed | `http://adlnet.gov/expapi/verbs/completed` | Termine le contenu |
| passed | `http://adlnet.gov/expapi/verbs/passed` | Réussit l'évaluation |
| failed | `http://adlnet.gov/expapi/verbs/failed` | Échoue à l'évaluation |
| scored | `http://adlnet.gov/expapi/verbs/scored` | Score attribué |

---

## Administration et rapports

### Tableau de bord RH (`/training/admin/dashboard`)

**KPIs disponibles :**
- Formations actives publiées
- Inscriptions totales (toutes formations)
- Taux de complétion global
- Certifications émises ce mois

**Graphiques :**
- BarChart : top 10 des formations les plus suivies (inscrits)
- LineChart : activité d'inscription mois par mois (12 derniers mois)
- Tableau : toutes les formations avec taux de complétion (tri par popularité)

### Export rapport DRH

```
GET /training/export/report
```
Génère un fichier Excel/PDF avec :
- Liste des apprenants et leurs formations
- Taux de complétion par département
- Certifications obtenues
- Heures de formation par employé

### Migrations

Exécuter la migration d'amélioration :
```bash
php artisan migrate --path=database/migrations/2026_01_01_000117_enhance_training_advanced.php
```

### Variables d'environnement

```env
# Intégration Microsoft Teams (optionnel)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=

# Intégration Zoom (optionnel)
ZOOM_API_KEY=
ZOOM_API_SECRET=

# Stockage SCORM (disk public recommandé)
FILESYSTEM_DISK=public
```

### Permissions Laravel

Ajouter dans `RolesAndPermissionsSeeder` :

```php
// Nouvelles permissions e-Learning avancé
'training.scorm.upload',
'training.live.manage',
'training.paths.manage',
'training.xapi.view',
'training.catalog.manage',
```

---

## Architecture technique

### Stack

| Couche | Technologie |
|---|---|
| Backend | Laravel 11 |
| Frontend | React.js + Inertia.js |
| Style | TailwindCSS |
| PDF | DomPDF (barryvdh/laravel-dompdf) |
| Stockage | Laravel Storage (disk public) |
| Base de données | PostgreSQL (JSONB pour session_data, items, etc.) |

### Nouvelles tables

| Table | Description |
|---|---|
| `training_scorm_packages` | Métadonnées des paquets SCORM importés |
| `training_scorm_sessions` | Sessions de lecture SCORM par utilisateur |
| `training_live_sessions` | Sessions de formation en direct |
| `training_live_attendees` | Présence aux sessions live |
| `training_learning_paths` | Parcours structurés |
| `training_path_enrollments` | Inscriptions aux parcours |
| `xapi_statements` | LRS — statements xAPI |
| `training_course_ratings` | Notes et avis sur les cours |

### Nouveaux services

| Service | Rôle |
|---|---|
| `ScormService` | Extraction ZIP, parsing manifest, runtime SCORM, LRS xAPI |
| `LiveTrainingService` | Cycle de vie des sessions live, présence, statistiques |
| `LearningPathService` | Progression des parcours, certificats de parcours |

### Nouveaux contrôleurs

| Contrôleur | Routes |
|---|---|
| `TrainingController` (étendu) | SCORM upload/launch, xAPI, live CRUD, catalog, paths |
| `ScormRuntimeController` | API SCORM runtime (Initialize, GetValue, SetValue, Commit…) |

### Nouvelles pages React

| Page | Chemin |
|---|---|
| Catalogue public | `Formation/Catalog` |
| Fiche cours détaillée | `Formation/CourseDetail` |
| Lecteur SCORM | `Formation/ScormPlayer` |
| Calendrier sessions live | `Formation/LiveSessions` |
| Parcours d'apprentissage | `Formation/LearningPaths` |
| Dashboard instructeur | `Formation/InstructorDashboard` |
| Dashboard admin RH | `Formation/AdminDashboard` |

### Composant partagé

- `Components/Formation/CourseRating` — notation 5 étoiles + commentaire + distribution
