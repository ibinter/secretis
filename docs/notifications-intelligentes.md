# Système de Notifications Intelligentes — IBIG SECRETIS

## Vue d'ensemble

Le système de notifications intelligentes de SECRETIS analyse le contexte de chaque utilisateur avant d'envoyer une notification. L'objectif est d'envoyer **moins de notifications, mais plus pertinentes**.

---

## 1. Comment fonctionne le scoring de pertinence

Chaque notification candidate reçoit un score de 0 à 100 avant d'être envoyée. Elle n'est envoyée que si le score dépasse **60**.

### Composantes du score

| Composante | Poids | Description |
|-----------|-------|-------------|
| Priorité de base | 30 pts | Score intrinsèque du type (visiteur arrivé = 95, digest = 30) |
| Activité utilisateur | 20 pts | Connecté récemment = score élevé, inactif depuis 8h = score bas |
| Canal préféré | 20 pts | Le canal préféré de l'utilisateur est disponible |
| Contexte temporel | 15 pts | Heures de pointe (9h-12h, 14h-17h) = bonus |
| Préférences apprises | 15 pts | Ajusté par vos interactions passées (-50 à +50) |

### Priorités de base par type

| Type | Priorité | Canal par défaut |
|------|----------|-----------------|
| Visiteur arrivé | 95 | WhatsApp + Push |
| Courrier urgent | 90 | WhatsApp + Push |
| Tâche en retard | 85 | Push |
| Rappel réunion | 80 | Push |
| Tâche assignée | 65 | Push |
| Message | 60 | Reverb (app) |
| Circulaire | 50 | Email |
| Digest | 30 | Email |

### Filtres bloquants (avant le calcul du score)

Certaines conditions bloquent l'envoi indépendamment du score :

1. **Mode Ne Pas Déranger** : seules les notifications avec priorité ≥ 90 passent
2. **Heures de silence** : seules les priorités ≥ 85 passent
3. **Cooldown** : pas de 2e notification du même type dans les 10 minutes
4. **Utilisateur inactif** (>24h) : seules les priorités ≥ 70 passent

---

## 2. Configurer les heures de silence

Les heures de silence empêchent les notifications non-urgentes pendant des plages horaires définies.

### Via l'interface

1. Ouvrir **Paramètres → Notifications → Préférences**
2. Section **Heures de silence**
3. Choisir les jours de la semaine et la plage horaire
4. Exemple : tous les jours de 22h00 à 07h00

### Règles par défaut

```
Tous les jours : 22h00 → 07h00
```

### Fonctionnement technique

Les heures de silence gèrent correctement les plages qui traversent minuit. Exemple : `22h → 07h` couvre bien de 22h jusqu'à 7h le lendemain.

---

## 3. Comprendre le digest quotidien

Le digest est un résumé personnalisé envoyé chaque matin à **7h30** via email et notification push.

### Contenu du digest

1. **Salutation personnalisée** — adaptée à l'heure de la journée
2. **Résumé de la veille** — nombre et types de notifications reçues
3. **Agenda du jour** — tous vos événements avec horaires
4. **Tâches urgentes** — tâches dues aujourd'hui ou en retard
5. **Courriers urgents** — courriers non traités en attente

### Personnalisation

- **Activer/désactiver** : Préférences → Digest quotidien (toggle)
- **Changer l'heure** : Préférences → Heure du digest (format HH:MM)
- **Le digest ne s'envoie pas** si la journée est calme (aucun événement, tâche ou courrier)

### Accès depuis le dashboard

La **DigestCard** apparaît automatiquement le matin sur votre dashboard jusqu'à 14h. Elle disparaît si vous la fermez (mémorisé pour la journée).

---

## 4. Entraîner SECRETIS à vos préférences

Le système apprend de vos interactions pour ajuster les scores de pertinence de chaque type de notification.

### Actions disponibles

| Action | Effet sur le score | Description |
|--------|-------------------|-------------|
| Ouvrir la notification | +5 | Vous avez trouvé la notification utile |
| Snooze (reporter) | -3 | Le moment n'était pas idéal |
| Rejeter (fermer) | -10 | La notification n'était pas pertinente |
| Like (👍) | +10 | Notification explicitement appréciée |
| Dislike (👎) | -15 | Notification explicitement non désirée |

### Comment donner un feedback

Dans le **Centre de notifications** (`/notifications/center`) :
- Au hover sur une notification, les boutons 👍 et 👎 apparaissent à droite
- Le feedback est pris en compte immédiatement pour les prochaines notifications

### Limites du score appris

Le score appris est borné entre **-50** et **+50** pour éviter le blocage total d'un type important.

### Réinitialiser les préférences apprises

Via les Préférences → section "Préférences apprises" → bouton "Réinitialiser" *(à implémenter si nécessaire)*.

---

## 5. Exemples de suggestions proactives par rôle

L'**assistant proactif** (job CRON toutes les 30 minutes) génère des suggestions contextuelles selon votre profil.

### Secrétariat / Administration

```
"Votre réunion CODIR commence dans 15 min — Ordre du jour disponible"
"Vous avez 3 courriers urgents en attente de traitement"
"M. Kofi Adjoumani vous attend à l'accueil depuis 5 minutes"
```

### Direction / Management

```
"Bon anniversaire d'entreprise à Marie Kouassi (3 ans aujourd'hui)"
"5 tâches en retard dans votre équipe — Voulez-vous un rapport ?"
"Journée surchargée vendredi (7h de réunions) — Envisagez de déplacer la réunion équipe"
```

### Ressources / Logistique

```
"Le stock de papier A4 est épuisé (0 ramettes)"
"Cartouche d'imprimante Canon : 2 unités restantes (seuil minimum : 5)"
"3 demandes de véhicule en attente de validation"
```

### IT / Technique

```
"La licence SECRETIS expire dans 15 jours"
"Le webhook Outlook n'a plus répondu depuis 2 heures"
"5 tickets support en attente depuis plus de 48h"
```

---

## 6. Canaux disponibles

### Push (navigateur)

Notification native du navigateur. Requiert l'accord de l'utilisateur (popup demandée à la première connexion).

### Reverb (temps réel)

Notification dans l'application via WebSocket. Apparaît instantanément si l'application est ouverte. Icône cloche dans le header.

### Email

Envoyé via SMTP selon la configuration `mail.*` dans `.env`. Template dans `resources/views/emails/notifications/`.

### WhatsApp

Requiert la configuration de l'API WhatsApp Business dans `config/secretis.php` :
```php
'whatsapp' => [
    'api_url' => env('WHATSAPP_API_URL'),
    'token'   => env('WHATSAPP_TOKEN'),
]
```

Utilisé uniquement pour les notifications urgentes (visiteur, courrier urgent).

---

## 7. Architecture technique

### Backend

```
Services/
  SmartNotificationService.php  — Moteur de décision + apprentissage
  SmartAgendaService.php        — Extensions IA agenda
Jobs/
  DailyDigestJob.php            — CRON 7h30 — digest quotidien
  ProactiveAssistantJob.php     — CRON toutes 30min — suggestions
Listeners/
  SmartNotificationListener.php — Connecteur événements → SmartNotification
Http/Controllers/
  NotificationCenterController.php — API REST du centre
```

### Frontend

```
hooks/
  useNotificationCenter.js      — TanStack Query + Reverb
Components/Notifications/
  SmartBell.jsx                 — Cloche header (dropdown + temps réel)
  DigestCard.jsx                — Carte digest dashboard
Pages/Notifications/
  Center.jsx                    — Centre complet avec filtres
  Preferences.jsx               — Configuration granulaire
Components/Agenda/
  SmartScheduler.jsx            — Planification en langage naturel
  MeetingBrief.jsx              — Brief pré-réunion
```

### CRON (app/Console/Kernel.php)

```php
$schedule->job(new DailyDigestJob)->dailyAt('07:30');
$schedule->job(new ProactiveAssistantJob)->everyThirtyMinutes();
```

### Queues

Les jobs utilisent deux files séparées :
- `digests` — pour les digest quotidiens (peu urgent)
- `proactive` — pour l'assistant proactif

Commande pour les démarrer :
```bash
php artisan queue:work --queue=digests,proactive,default
```

---

## 8. Migration requise

La colonne `snoozed_until` doit être ajoutée à `app_notifications` :

```php
$table->timestamp('snoozed_until')->nullable()->after('read_at');
$table->timestamp('archived_at')->nullable()->after('snoozed_until');
```

Créer la migration :
```bash
php artisan make:migration add_smart_columns_to_app_notifications
```
