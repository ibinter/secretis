# Module Formation Interne — IBIG SECRETIS

Guide complet du module de formation interne. Ce module permet aux organisations de créer des cours, inscrire leurs employés, créer des quiz et délivrer des attestations PDF vérifiables.

---

## Table des matières

1. [Architecture](#1-architecture)
2. [Créer un cours](#2-créer-un-cours)
3. [Ajouter des modules](#3-ajouter-des-modules)
4. [Créer un quiz](#4-créer-un-quiz)
5. [Inscrire des utilisateurs](#5-inscrire-des-utilisateurs)
6. [Suivre la progression](#6-suivre-la-progression)
7. [Vérifier une attestation](#7-vérifier-une-attestation)
8. [Analytics formation](#8-analytics-formation)
9. [Référence API](#9-référence-api)

---

## 1. Architecture

### Tables de base de données

| Table | Description |
|-------|-------------|
| `training_courses` | Catalogue des cours par organisation |
| `training_modules` | Modules (texte, vidéo, quiz, fichier) |
| `training_enrollments` | Inscriptions utilisateur–cours |
| `training_progress` | Progression par module |
| `training_quizzes` | Définition des quiz (questions JSON) |
| `training_quiz_attempts` | Historique des tentatives de quiz |
| `training_certificates` | Attestations émises avec token de vérification |

### Flux principal

```
Inscription → Modules → Progress 100% → Certificat PDF auto-généré
```

### Multi-tenant

Chaque cours est scopé à `organization_id`. Un utilisateur ne peut voir que les cours de son organisation.

---

## 2. Créer un cours

### Via l'interface (Admin)

1. Aller dans **Formation → Gestion des cours**
2. Cliquer **Nouveau cours**
3. Remplir : titre, description, catégorie, niveau, durée
4. Activer **Publier le cours** pour le rendre visible aux employés
5. Cliquer **Créer**

### Via l'API

```http
POST /training/courses
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Sécurité informatique en entreprise",
  "description": "Apprenez les bonnes pratiques de cybersécurité.",
  "category": "Sécurité",
  "level": "beginner",
  "duration_minutes": 120,
  "is_published": true
}
```

**Réponse :**
```json
{
  "message": "Cours créé avec succès.",
  "course": {
    "id": 1,
    "title": "Sécurité informatique en entreprise",
    "level": "beginner",
    "is_published": true
  }
}
```

---

## 3. Ajouter des modules

Un cours est composé de modules ordonnés. Chaque module peut être de 4 types :

| Type | Description | Contenu JSON |
|------|-------------|--------------|
| `text` | Texte riche (HTML TipTap) | `{ "html": "<p>...</p>" }` |
| `video` | Vidéo YouTube/Vimeo/directe | `{ "url": "https://youtube.com/..." }` |
| `quiz` | Quiz avec correction auto | `{ "quiz_id": 1 }` |
| `file` | Fichier à télécharger | `{ "url": "/storage/..." }` |

### Ajouter un module texte

```http
POST /training/courses/{id}/modules
Authorization: Bearer {token}

{
  "title": "Introduction à la cybersécurité",
  "content_type": "text",
  "content": { "html": "<h2>Qu'est-ce que la cybersécurité ?</h2><p>...</p>" },
  "duration_minutes": 15,
  "sort_order": 1,
  "is_required": true
}
```

### Ajouter un module vidéo

```http
POST /training/courses/{id}/modules

{
  "title": "Démonstration — phishing",
  "content_type": "video",
  "content": { "url": "https://www.youtube.com/watch?v=XXXX" },
  "duration_minutes": 10,
  "sort_order": 2
}
```

---

## 4. Créer un quiz

Un quiz est lié à un module de type `quiz`. Les questions supportent deux types :

- `single` — une seule bonne réponse (radio button)
- `multiple` — plusieurs bonnes réponses (checkbox)

### Structure d'une question

```json
{
  "id": "q1",
  "text": "Quel est le principal vecteur d'attaque par phishing ?",
  "type": "single",
  "explanation": "Le phishing exploite principalement l'email.",
  "answers": [
    { "id": "a1", "text": "Email frauduleux",    "is_correct": true  },
    { "id": "a2", "text": "Virus USB",            "is_correct": false },
    { "id": "a3", "text": "Attaque DDoS",         "is_correct": false },
    { "id": "a4", "text": "Intrusion physique",   "is_correct": false }
  ]
}
```

### Créer le quiz

```http
POST /training/quizzes/module/{module_id}
Authorization: Bearer {token}

{
  "title": "Quiz — Cybersécurité",
  "pass_score": 70,
  "time_limit_minutes": 15,
  "questions": [
    {
      "id": "q1",
      "text": "Quel est le principal vecteur d'attaque par phishing ?",
      "type": "single",
      "explanation": "Le phishing exploite principalement l'email.",
      "answers": [
        { "id": "a1", "text": "Email frauduleux",  "is_correct": true  },
        { "id": "a2", "text": "Virus USB",          "is_correct": false },
        { "id": "a3", "text": "Attaque DDoS",       "is_correct": false }
      ]
    },
    {
      "id": "q2",
      "text": "Lesquels sont de bons mots de passe ?",
      "type": "multiple",
      "answers": [
        { "id": "b1", "text": "P@ssw0rd!2024#Secure", "is_correct": true  },
        { "id": "b2", "text": "azerty123",             "is_correct": false },
        { "id": "b3", "text": "X7#mK9$qL!vN2",        "is_correct": true  }
      ]
    }
  ]
}
```

---

## 5. Inscrire des utilisateurs

### Auto-inscription (employé)

```http
POST /training/courses/{id}/enroll
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "message": "Inscription réussie.",
  "enrollment": {
    "id": 42,
    "course_id": 1,
    "user_id": 7,
    "status": "enrolled",
    "progress_percent": 0
  }
}
```

### Inscription en masse (admin)

Boucler sur la liste des utilisateurs :

```php
foreach ($users as $user) {
    $trainingService->enrollUser($user, $courseId);
}
```

---

## 6. Suivre la progression

### Marquer un module comme complété

```http
PUT /training/progress/{module_id}
Authorization: Bearer {token}

{
  "enrollment_id": 42,
  "time_spent_seconds": 900
}
```

**Réponse :**
```json
{
  "enrollment": {
    "id": 42,
    "status": "in_progress",
    "progress_percent": 50
  }
}
```

Quand `progress_percent` atteint 100, le statut passe à `completed` et un certificat est **automatiquement généré**.

### Soumettre un quiz

```http
POST /training/quizzes/{quiz_id}/submit
Authorization: Bearer {token}

{
  "answers": {
    "q1": ["a1"],
    "q2": ["b1", "b3"]
  }
}
```

**Réponse :**
```json
{
  "score": 100,
  "pass_score": 70,
  "passed": true,
  "total_correct": 2,
  "total_questions": 2,
  "corrections": {
    "q1": { "is_correct": true, "correct_answers": ["a1"], "user_answers": ["a1"] },
    "q2": { "is_correct": true, "correct_answers": ["b1", "b3"], "user_answers": ["b1", "b3"] }
  }
}
```

---

## 7. Vérifier une attestation

### Télécharger le PDF

```http
GET /training/certificates/{id}/pdf
Authorization: Bearer {token}
```

Retourne le PDF A4 paysage avec QR code de vérification.

### Vérification publique (sans authentification)

Accéder à l'URL de vérification publique :

```
https://secretis.ibigsoft.com/verify/certificate/{token}
```

### API de vérification

```http
GET /verify/certificate/{token}
Accept: application/json
```

**Réponse (certificat valide) :**
```json
{
  "certificate_number": "CERT-2026-00042",
  "issued_at": "2026-03-15T10:30:00Z",
  "expires_at": null,
  "is_valid": true,
  "holder_name": "Jean Kouadio",
  "course_title": "Sécurité informatique en entreprise",
  "organization_name": "Ministère de l'Économie"
}
```

**Réponse (certificat introuvable) :**
```json
{ "message": "Certificat invalide ou introuvable." }
```

### Format du numéro de certificat

```
CERT-{année}-{séquence 5 chiffres}
Exemple : CERT-2026-00042
```

---

## 8. Analytics formation

### Accéder aux statistiques (admin)

```http
GET /training/analytics
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "courses": [
    {
      "course_id": 1,
      "course_title": "Sécurité informatique",
      "total_enrolled": 45,
      "completed": 38,
      "completion_rate": 84.4,
      "avg_completion_minutes": 87
    }
  ],
  "global_pass_rate": 91.2,
  "hardest_question": {
    "question_id": "q3",
    "question_text": "Qu'est-ce que le man-in-the-middle ?",
    "success_rate": 42.0,
    "error_rate": 58.0,
    "total_attempts": 50
  }
}
```

### Métriques disponibles

| Métrique | Description |
|----------|-------------|
| `completion_rate` | % d'apprenants ayant terminé le cours |
| `avg_completion_minutes` | Temps moyen de complétion |
| `global_pass_rate` | Taux de réussite global sur tous les quiz |
| `hardest_question` | Question avec le plus d'erreurs |

---

## 9. Référence API

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/training/courses` | Oui | Catalogue des cours publiés |
| POST | `/training/courses` | Admin | Créer un cours |
| GET | `/training/courses/{id}` | Oui | Détail + modules |
| PUT | `/training/courses/{id}` | Admin | Modifier un cours |
| DELETE | `/training/courses/{id}` | Admin | Supprimer un cours |
| POST | `/training/courses/{id}/enroll` | Oui | S'inscrire |
| GET | `/training/my-courses` | Oui | Mes inscriptions |
| GET | `/training/courses/{id}/modules` | Oui | Liste des modules avec progression |
| PUT | `/training/progress/{moduleId}` | Oui | Mettre à jour la progression |
| POST | `/training/quizzes/{id}/submit` | Oui | Soumettre un quiz |
| GET | `/training/certificates` | Oui | Mes attestations |
| GET | `/training/certificates/{id}/pdf` | Oui | Télécharger le PDF |
| GET | `/training/analytics` | Admin | Statistiques |
| POST | `/training/courses/{id}/modules` | Admin | Ajouter un module |
| POST | `/training/quizzes/module/{id}` | Admin | Créer un quiz |
| GET | `/verify/certificate/{token}` | Public | Vérifier un certificat |

---

*Documentation générée pour IBIG SECRETIS ERP — Module Formation v1.0*
