# SARA v2 — Guide complet IBIG SECRETIS

> Version 2.0 — Assistante Intelligente Agentique

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Capacités SARA v2](#2-capacités-sara-v2)
3. [Actions disponibles](#3-actions-disponibles)
4. [Exemples de commandes](#4-exemples-de-commandes)
5. [Guide Automatisations](#5-guide-automatisations)
6. [Prédictions IA](#6-prédictions-ia)
7. [Limites et guard-rails](#7-limites-et-guard-rails)
8. [Architecture technique](#8-architecture-technique)

---

## 1. Vue d'ensemble

SARA v2 est l'assistante intelligente d'IBIG SECRETIS. Par rapport à la version 1 (FAQ + réponses textuelles), SARA v2 peut **exécuter des actions** dans votre ERP après confirmation.

### Nouveautés v2

| Fonctionnalité | v1 | v2 |
|---|---|---|
| Réponses aux questions | ✅ | ✅ |
| Actions métier | ❌ | ✅ |
| Classification d'intentions | ❌ | ✅ |
| Mémoire de conversation | ❌ | ✅ (24h, Redis) |
| Suggestions proactives | ❌ | ✅ |
| Mode vocal | ❌ | ✅ (Web Speech API) |
| Extraction données structurées | ❌ | ✅ |

---

## 2. Capacités SARA v2

### 2.1 Classification d'intentions

SARA analyse chaque message et le classe dans une catégorie :

- **QUERY** — Question sur les données ou le système
- **ACTION** — Demande d'exécution d'une tâche
- **SMALLTALK** — Salutations, conversation informelle
- **HELP** — Demande d'aide sur les fonctionnalités de SARA

La classification utilise d'abord des règles rapides (patterns), puis le LLM en cas d'ambiguïté.

### 2.2 Mémoire de conversation

SARA mémorise vos échanges pendant **24 heures** (partagé entre vos onglets/sessions). Après 10 messages, la mémoire est résumée automatiquement. Elle est stockée dans Redis avec expiration automatique.

### 2.3 Contexte automatique

SARA dispose en permanence de :
- Votre rôle et vos modules actifs
- La date et l'heure
- Vos événements du jour
- Le nombre de tâches en retard
- Les KPIs pertinents selon la page courante

Les données sensibles (mots de passe, tokens, IBAN…) sont automatiquement filtrées avant injection dans le contexte LLM.

### 2.4 Suggestions proactives

SARA peut afficher jusqu'à 3 suggestions en bulles flottantes, basées sur :
- Un événement dans les 30 prochaines minutes
- Des courriers urgents non traités depuis 24h
- Un projet en retard
- Des tâches dues aujourd'hui non démarrées

---

## 3. Actions disponibles

| Action | Description | Irréversible |
|---|---|---|
| `create_event` | Crée un événement dans l'agenda | Non |
| `create_task` | Crée une tâche avec priorité et échéance | Non |
| `search_documents` | Recherche dans la GED | Non |
| `find_free_slot` | Trouve un créneau libre dans les agendas | Non |
| `summarize_meeting` | Résume un compte rendu de réunion | Non |
| `generate_report` | Génère un rapport d'activité/tâches/courrier | Non |
| `draft_letter` | Rédige un brouillon de courrier | Non |

> **Note :** Toutes les actions nécessitent une **confirmation explicite** avant exécution. SARA affiche un modal récapitulatif. Vous pouvez annuler à tout moment avant confirmation.

### Rate limits actions

- Maximum **10 actions par heure** par utilisateur
- Les actions irréversibles (suppression) nécessitent une **double confirmation**
- Toutes les actions sont loggées dans `audit_logs` avec l'acteur `SARA+user:{id}`

---

## 4. Exemples de commandes

### Créer un événement

```
"Réunion avec Jean demain à 14h salle de conférence A"
→ title: "Réunion avec Jean", start_at: demain 14:00, location: "salle A"

"Planifie une réunion de direction vendredi à 9h pour 2 heures"
→ title: "Réunion de direction", start_at: vendredi 09:00, end_at: 11:00
```

### Créer une tâche

```
"Ajoute une tâche : finaliser le rapport RH pour vendredi, priorité haute"
→ title: "Finaliser le rapport RH", due_date: vendredi, priority: high

"Rappel urgent : envoyer le bilan à la direction avant lundi"
→ title: "Envoyer le bilan à la direction", due_date: lundi, priority: urgent
```

### Chercher un document

```
"Cherche le contrat fournisseur Dupont"
→ Recherche dans la GED : "contrat fournisseur Dupont"

"Trouve les documents RH de janvier"
→ Recherche dans la GED : "RH janvier"
```

### Trouver un créneau libre

```
"Trouve un créneau de 1h pour moi et Marie la semaine prochaine"
→ Scanne les agendas → propose 3 créneaux disponibles

"Quand est-ce qu'on peut se voir avec l'équipe RH pour 2h ?"
→ Cherche créneau commun pour tous les membres de l'équipe RH
```

### Résumer une réunion

```
"Résume la dernière réunion de direction"
→ Extrait les décisions et l'ordre du jour de la dernière réunion

"Résume la réunion du 15 janvier"
→ Cherche la réunion du 15/01 et retourne le résumé
```

### Générer un rapport

```
"Rapport d'activité de la semaine"
→ Génère : événements créés, tâches complétées, courriers reçus, documents

"Rapport des tâches en retard"
→ Génère le rapport des tâches dépassées avec statuts

"Rapport de correspondance du mois"
→ Volume de courriers entrants/sortants/urgents du mois
```

### Rédiger un courrier

```
"Rédige un courrier de relance pour le client Dupont concernant la facture FAC-2026-001"
→ Produit un brouillon formel de relance

"Écris un courrier pour demander une extension de délai à notre fournisseur"
→ Produit un brouillon semi-formel avec les points clés
```

---

## 5. Guide Automatisations

Les automatisations permettent d'exécuter des actions sans intervention manuelle, basées sur des événements système.

### 5.1 Structure d'une règle

```
SI [Déclencheur] ET [Conditions] ALORS [Actions]
```

### 5.2 Déclencheurs disponibles

| Déclencheur | Description | Champs disponibles |
|---|---|---|
| `courrier.received` | Courrier entrant enregistré | sender, subject, priority |
| `task.overdue` | Tâche passée sa date limite | priority, days_overdue, assigned_to |
| `event.starting_soon` | Événement dans N minutes | title, minutes_before, location |
| `leave.approved` | Congé validé par RH | type, duration_days, employee_id |
| `visitor.arrived` | Visiteur scanné à l'accueil | full_name, host_id, reason |
| `invoice.overdue` | Facture impayée | amount, days_overdue, client |
| `document.uploaded` | Document ajouté dans la GED | name, mime_type, folder, size |

### 5.3 Opérateurs de conditions

| Opérateur | Exemple |
|---|---|
| `equals` | priority **est égal à** urgent |
| `contains` | sender **contient** @dgi.gouv |
| `greater_than` | days_overdue **est supérieur à** 3 |
| `in` | type **est parmi** [sick, unjustified] |
| `is_not_empty` | attachments **n'est pas vide** |

### 5.4 Actions disponibles

| Action | Paramètres clés |
|---|---|
| `assign_user` | user_id, model, model_id |
| `change_status` | model, model_id, status |
| `send_notification` | channels (push/email/whatsapp), title, body |
| `create_task` | title, priority, assignee_id, due_date |
| `add_tag` | model, model_id, tag |
| `webhook` | url, method (POST/GET), secret |
| `sara_action` | action_type |

> **Variables** : utilisez `{{field}}` pour interpoler les données du déclencheur dans vos paramètres.  
> Exemple dans le titre d'une tâche : `"Traiter courrier urgent de {{sender}}"`

### 5.5 Exemples de règles utiles

#### Secrétariat / Administration

```
SI courrier reçu
ET sender contient "@dgi.gouv.ci"
ALORS assigner à Secrétaire DGI
   ET ajouter tag "fiscal"
   ET envoyer notification push au directeur
```

```
SI tâche en retard
ET priority equals urgent
ALORS envoyer email à l'assigné
   ET envoyer notification push au manager
   ET créer tâche de suivi "Relance : {{title}}"
```

#### RH

```
SI congé approuvé
ALORS créer événement "Absence {{employee_name}}" dans le calendrier RH
   ET envoyer notification à l'équipe
```

```
SI tâche en retard
ET days_overdue greater than 5
ALORS envoyer notification whatsapp à l'assigné
   ET assigner également au manager
```

#### Accueil / Visiteurs

```
SI visiteur arrivé
ET host_id is_not_empty
ALORS envoyer notification push à l'hôte
   ET envoyer email à l'hôte
```

#### Comptabilité

```
SI facture en retard
ET days_overdue greater than 30
ALORS appeler webhook de relance automatique
   ET créer tâche "Relance facture {{invoice_number}}"
```

#### GED / Documents

```
SI document importé
ET mime_type equals application/pdf
ALORS demander à SARA de lancer l'OCR
   ET ajouter tag "à-indexer"
```

---

## 6. Prédictions IA

### 6.1 Prédiction de complétion de tâche

**Algorithme :** Médiane des durées historiques de l'assigné (même priorité) × facteur de charge actuelle.

**Sortie :**
```json
{
  "estimated_date": "2026-02-15",
  "confidence": 0.78,
  "days_estimate": 5,
  "reasoning": "Basé sur 12 tâches similaires (priorité haute). Durée médiane : 32h. Charge actuelle : 8 tâches."
}
```

**Interprétation :**
- `confidence >= 0.80` → estimation fiable (>10 points de données)
- `confidence 0.50-0.79` → estimation indicative
- `confidence < 0.50` → peu de données historiques, estimation prudente

### 6.2 Prédiction de retard de projet

**Facteurs analysés :**
1. Ratio tâches en retard / total tâches (poids 40%)
2. Écart avancement réel vs temps écoulé (poids 35%)
3. Tâches bloquées en révision > 3 jours (poids 25%)

**Niveaux de risque :**

| Score | Niveau | Action recommandée |
|---|---|---|
| 0-25% | `low` | Maintenir le rythme |
| 25-50% | `medium` | Surveiller les bloquants |
| 50-75% | `high` | Réunion de suivi urgente |
| 75-100% | `critical` | Renégocier le périmètre/délai |

### 6.3 Détection d'anomalies

Méthode **Z-score** (σ) sur 4 semaines glissantes :
- `|z| < 2` → normal
- `|z| ≥ 2` → anomalie medium
- `|z| ≥ 3` → anomalie high (alerte immédiate recommandée)

**Anomalies détectées :**
- Pic de courriers urgents
- Hausse des absences maladie
- Tâches créées sans assigné
- Baisse inhabituelle du volume de visiteurs

### 6.4 Créneau optimal de réunion

L'algorithme analyse les **heures de début favorites** des participants sur 3 mois, puis combine avec la disponibilité réelle pour proposer les 3 meilleurs créneaux, triés par score de préférence.

### 6.5 Prévision volume visiteurs

**Algorithme :** Moyenne pondérée (semaines récentes = poids plus élevé) des mêmes jours de semaine sur 8 semaines.

**Interprétation de la confiance :**
- `confidence >= 0.80` → volume prévisible (faible variabilité)
- `confidence 0.50-0.79` → variabilité modérée, prévoir +/- 20%
- `confidence < 0.50` → forte variabilité, utiliser la fourchette min/max

---

## 7. Limites et guard-rails

### Actions

- **Aucune action exécutée sans confirmation** : SARA affiche toujours un récapitulatif avant d'agir
- **Actions irréversibles** (suppression) : double confirmation requise + token
- **Rate limit actions** : 10 actions/heure par utilisateur
- **Audit complet** : toutes les actions SARA sont loggées dans `audit_logs` avec `actor = SARA+user:{id}`

### Données

- **Isolation multi-tenant** : SARA ne peut accéder qu'aux données de votre organisation
- **Filtrage sensible** : mots de passe, tokens, IBAN, numéros de carte jamais injectés dans le LLM
- **Fenêtre de contexte** : le contexte est tronqué à ~4000 tokens (champs les moins critiques supprimés en premier)
- **Mémoire** : expire après 24h d'inactivité

### Automatisations

- **Rate limit** : les webhooks ont un timeout de 10 secondes
- **Logging complet** : chaque exécution est enregistrée dans `automation_logs`
- **Mode test** : tester une règle ne déclenche jamais d'actions réelles

### IA

- SARA peut faire des erreurs : vérifiez toujours les données importantes
- Les réponses sont générées par un LLM externe (Groq/OpenAI/Anthropic) ; ne partagez pas d'informations ultra-confidentielles
- En cas d'indisponibilité du LLM, SARA répond avec un message de fallback

---

## 8. Architecture technique

### Services

```
app/Services/Sara/
├── SaraV2Service.php      — Orchestrateur principal
├── SaraResponse.php       — Value-object réponse
├── IntentClassifier.php   — Classification intentions (patterns + LLM)
├── ContextBuilder.php     — Construction contexte enrichi
├── ActionExecutor.php     — Exécution des actions métier
└── ConversationMemory.php — Mémoire Redis (24h)

app/Services/
├── AutomationService.php  — Moteur de règles d'automatisation
└── PredictionService.php  — Prédictions IA (vélocité, anomalies, etc.)
```

### Routes API (à ajouter dans api.php)

```php
// SARA v2
Route::prefix('sara')->group(function () {
    Route::get('/status',          [SaraV2Controller::class, 'status']);
    Route::get('/quick-questions', [SaraV2Controller::class, 'quickQuestions']);
    Route::get('/suggestions',     [SaraV2Controller::class, 'suggestions']);
    Route::post('/v2/chat',        [SaraV2Controller::class, 'chat']);
    Route::post('/v2/execute',     [SaraV2Controller::class, 'execute']);
    Route::delete('/v2/memory',    [SaraV2Controller::class, 'clearMemory']);
});

// Automatisations
Route::apiResource('automations', AutomationController::class);
Route::patch('automations/{id}/toggle', [AutomationController::class, 'toggle']);
Route::post('automations/{id}/test',   [AutomationController::class, 'test']);
Route::get('automations/{id}/logs',    [AutomationController::class, 'logs']);
```

### Configuration .env requise

```env
# IA Provider (groq | openai | anthropic)
AI_PROVIDER=groq
AI_GROQ_KEY=gsk_xxxxx
AI_GROQ_MODEL=llama-3.3-70b-versatile

# Redis (pour la mémoire SARA)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=null
```

### Déclenchement des automatisations

Appelez `AutomationService::registerTrigger()` dans vos Services existants :

```php
// Dans CourrierService::store() :
$this->automationService->registerTrigger('courrier.received', [
    'organization_id' => $mail->organization_id,
    'id'              => $mail->id,
    'model'           => 'courrier',
    'sender'          => $mail->sender_email,
    'subject'         => $mail->subject,
    'priority'        => $mail->priority,
    'direction'       => 'incoming',
]);
```

---

*Documentation générée pour IBIG SECRETIS ERP v2 — IBIG Soft, Côte d'Ivoire*
