# IBIG SECRETIS — Documentation du Flow d'Onboarding

## Vue d'ensemble

L'onboarding IBIG SECRETIS est conçu pour maximiser le taux d'activation et de conversion des
organisations en trial. Il se décompose en 8 étapes guidées, accessibles via un wizard multi-étapes.

---

## Architecture

```
POST /trial/start           → TrialService::startTrial()   → Email welcome
GET  /onboarding            → OnboardingController::index() → Wizard.jsx
POST /onboarding/{step}/complete → completeStep()
POST /onboarding/{step}/skip     → skipStep()
POST /invitations           → OnboardingService::inviteUser()
GET  /invitations/accept/{token} → acceptInvitation()
```

---

## Les 8 étapes d'onboarding

| # | Clé                       | Label                    | Skippable | Durée estimée |
|---|---------------------------|--------------------------|-----------|---------------|
| 1 | `organization_profile`    | Profil organisation      | Non       | 2 min         |
| 2 | `configure_services`      | Configurer les modules   | Oui       | 2 min         |
| 3 | `set_prefix`              | Préfixe de courrier      | Oui       | 1 min         |
| 4 | `invite_users`            | Inviter des utilisateurs | Oui       | 2 min         |
| 5 | `create_first_event`      | Premier événement        | Oui       | 3 min         |
| 6 | `upload_first_document`   | Premier document         | Oui       | 2 min         |
| 7 | `configure_notifications` | SMTP ou WhatsApp         | Oui       | 2 min         |
| 8 | `discover_sara`           | Découvrir SARA (IA)      | Oui       | 1 min         |

**Seule l'étape 1 (`organization_profile`) est obligatoire.**
Les autres peuvent être passées individuellement.

---

## Séquence des emails automatiques

### Emails d'onboarding (si onboarding incomplet)

| Déclencheur   | Template             | Objet                                          | Objectif                              |
|---------------|----------------------|------------------------------------------------|---------------------------------------|
| Inscription   | `welcome`            | "Bienvenue sur IBIG SECRETIS !"               | Accueil + premiers pas                |
| J+1           | `nudge_day1`         | "Avez-vous commencé votre configuration ?"    | Réactivation immédiate                |
| J+3           | `nudge_day3`         | "Votre progression — Jour 3"                  | Progression + astuce du jour          |
| J+7           | `nudge_day7`         | "Dernière chance de compléter votre setup"    | Urgence avant fin de la période       |

### Emails de trial (avant expiration)

| Déclencheur   | Template             | Objet                                          | Contenu clé                           |
|---------------|----------------------|------------------------------------------------|---------------------------------------|
| J-7           | `trial_expiry_7`     | "Votre trial expire dans 7 jours"             | Features utilisées + plans            |
| J-3           | `trial_expiry_3`     | "Plus que 3 jours pour votre trial"           | CTA upgrade fort + promo éventuelle   |
| J-1           | `trial_expiry_1`     | "Dernière chance — trial expire demain"       | Urgence maximale + support direct     |
| Conversion    | `trial_converted`    | "Bienvenue dans l'aventure IBIG SECRETIS !"  | Confirmation + facture + accès        |

### Déclenchement (Scheduler Laravel)

```php
// app/Console/Kernel.php
$schedule->command('onboarding:send-nudges')->dailyAt('09:00');
$schedule->command('trial:send-nudges')->dailyAt('10:00');
```

---

## Métriques de succès

### Onboarding

| Métrique                      | Définition                                         | Objectif |
|-------------------------------|----------------------------------------------------|----------|
| Taux de complétion J+3       | % d'orgs ayant complété ≥4 étapes en 3 jours      | > 60%    |
| Taux de complétion total     | % d'orgs ayant complété les 8 étapes               | > 75%    |
| Temps moyen de complétion    | Durée médiane entre inscription et étape 8         | < 48h    |
| Étape la plus abandonnée     | Étape où les orgs s'arrêtent le plus souvent       | Monitor  |
| Taux d'invitation            | % d'orgs ayant invité ≥1 utilisateur               | > 50%    |

### Trial & Conversion

| Métrique                      | Définition                                         | Objectif |
|-------------------------------|----------------------------------------------------|----------|
| Taux de conversion trial→payant | % de trials convertis en abonnement            | > 30%    |
| Délai moyen de conversion    | Jours entre démarrage trial et conversion          | < 10j    |
| Taux de churn post-conversion | % d'annulation dans les 30j suivant la conversion | < 5%     |
| Feature adoption rate        | % d'utilisateurs actifs sur chaque module          | > 40%    |
| MRR générée depuis trials    | Revenu mensuel récurrent issu des conversions      | KPI      |

---

## Composants frontend

### Pages

| Composant              | Route                    | Description                                        |
|------------------------|--------------------------|----------------------------------------------------|
| `Welcome.jsx`          | `/onboarding/welcome`    | Page d'accueil post-inscription avec confettis     |
| `Wizard.jsx`           | `/onboarding`            | Wizard multi-étapes avec persistence               |
| `Plans.jsx`            | `/subscription/plans`    | Comparaison plans avec toggle annuel/mensuel       |
| `Checkout.jsx`         | `/subscription/checkout` | Page de paiement multi-provider                    |
| `TrialAnalytics.jsx`   | `/superadmin/trials`     | Dashboard SuperAdmin analytics                     |

### Composants

| Composant               | Emplacement                          | Description                                    |
|-------------------------|--------------------------------------|------------------------------------------------|
| `ProgressBar.jsx`       | `Components/Onboarding/`            | Barre de progression 8 étapes (desktop/mobile) |
| `ChecklistWidget.jsx`   | `Components/Onboarding/`            | Widget flottant bottom-right (30 jours)        |

### Steps

| Step                        | Fonctionnalité principale                               |
|-----------------------------|--------------------------------------------------------|
| `OrganizationProfile.jsx`   | Logo drag-drop, nom, secteur, pays, devise              |
| `ConfigureServices.jsx`     | Grille 10 modules avec toggle et recommandations        |
| `SetPrefix.jsx`             | Preview live du numéro de courrier                      |
| `InviteUsers.jsx`           | Multi-invitations avec sélection de rôle               |
| `CreateFirstEvent.jsx`      | Mini-formulaire événement complet                       |
| `UploadFirstDocument.jsx`   | Drag-drop avec barre de progression animée              |
| `ConfigureNotifications.jsx`| SMTP ou WhatsApp avec test de connexion                |
| `DiscoverSara.jsx`          | Interface chat IA avec suggestions prédéfinies          |

---

## Middleware de redirection

`ShowOnboardingIfNeeded` redirige vers `/onboarding` si :
- L'utilisateur est authentifié
- L'organisation a moins de 7 jours
- L'onboarding n'est pas complet

Routes exemptées : `/api/*`, `/webhook`, `/onboarding`, `/invitations`, `/trial`, assets statiques.

---

## A/B Testing recommandé (futur)

### Test 1 — Ordre des étapes
- **Variante A** : Ordre actuel (profil → modules → ... → SARA)
- **Variante B** : SARA en étape 2 pour démontrer la valeur plus tôt
- **Métrique** : Taux de complétion J+1

### Test 2 — Email de bienvenue
- **Variante A** : Email texte long avec toutes les étapes
- **Variante B** : Email court avec un seul CTA "Commencer"
- **Métrique** : Taux d'ouverture et CTR

### Test 3 — Durée du trial
- **Variante A** : Trial 14 jours (actuel)
- **Variante B** : Trial 30 jours
- **Métrique** : Taux de conversion et délai de décision

### Test 4 — Page Plans
- **Variante A** : Toggle mensuel/annuel (actuel)
- **Variante B** : Annuel par défaut avec option mensuel
- **Métrique** : % d'abonnements annuels choisis

---

## Providers de paiement intégrés

| Provider     | Méthodes supportées              | Pays principaux           |
|--------------|----------------------------------|---------------------------|
| CinetPay     | Visa, Mastercard, Mobile Money   | CI, SN, BF, TG, BJ        |
| Orange Money | Mobile Money Orange              | CI, SN, ML, GN             |
| MTN MoMo     | Mobile Money MTN                 | CI, CM, GH, RW             |
| Paystack     | Cartes, Banque, Mobile Money     | NG, GH, ZA, KE             |

---

## Structure des fichiers créés

```
backend/
├── database/migrations/
│   └── 2026_01_01_000102_create_onboarding_tables.php
├── app/
│   ├── Services/
│   │   ├── OnboardingService.php
│   │   └── TrialService.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── OnboardingController.php
│   │   └── Middleware/
│   │       └── ShowOnboardingIfNeeded.php
└── resources/views/emails/onboarding/
    ├── welcome.blade.php
    ├── nudge_day1.blade.php
    ├── nudge_day3.blade.php
    ├── invitation.blade.php
    ├── trial_expiry_7.blade.php
    └── trial_converted.blade.php

frontend/resources/js/
├── Pages/
│   ├── Onboarding/
│   │   ├── Welcome.jsx
│   │   ├── Wizard.jsx
│   │   └── Steps/
│   │       ├── OrganizationProfile.jsx
│   │       ├── ConfigureServices.jsx
│   │       ├── SetPrefix.jsx
│   │       ├── InviteUsers.jsx
│   │       ├── CreateFirstEvent.jsx
│   │       ├── UploadFirstDocument.jsx
│   │       ├── ConfigureNotifications.jsx
│   │       └── DiscoverSara.jsx
│   ├── Subscription/
│   │   ├── Plans.jsx
│   │   └── Checkout.jsx
│   └── SuperAdmin/
│       └── TrialAnalytics.jsx
└── Components/
    └── Onboarding/
        ├── ProgressBar.jsx
        └── ChecklistWidget.jsx

docs/
└── onboarding-flow.md  ← ce fichier
```
