# IBIG SECRETIS — Suite de tests E2E (Playwright)

Suite de tests End-to-End complète pour SECRETIS ERP.

Stack : **Laravel 11 + React + Inertia.js + Playwright (TypeScript)**

---

## Installation

```bash
cd e2e
npm install
# Installer les navigateurs Playwright (Chrome, Firefox, WebKit)
npx playwright install --with-deps
```

---

## Lancer les tests

### Tous les tests (tous navigateurs)
```bash
npx playwright test
```

### Un fichier de test
```bash
npx playwright test auth.spec.ts
npx playwright test agenda.spec.ts
npx playwright test courrier.spec.ts
npx playwright test taches.spec.ts
npx playwright test visiteurs.spec.ts
npx playwright test paiement.spec.ts
npx playwright test multitenancy.spec.ts
npx playwright test sara.spec.ts
npx playwright test pwa.spec.ts
```

### Un navigateur spécifique
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=mobile-chrome
npx playwright test --project=mobile-safari
```

### Mode headed (debug, fenêtre visible)
```bash
npx playwright test --headed
npx playwright test auth.spec.ts --headed --project=chromium
```

### Mode debug (pas à pas)
```bash
npx playwright test --debug
PWDEBUG=1 npx playwright test auth.spec.ts
```

### Voir le rapport HTML
```bash
npx playwright show-report
```

### Lancer uniquement les tests "setup" (créer les états d'authentification)
```bash
npx playwright test --project=setup
```

### Paralléllisme forcé
```bash
npx playwright test --workers=4
```

---

## Structure des répertoires

```
e2e/
├── playwright.config.ts        # Configuration multi-projet
├── package.json
├── .auth/                      # États d'authentification (gitignored)
│   ├── admin.json
│   ├── secretary.json
│   ├── manager.json
│   ├── director.json
│   └── receptionist.json
├── fixtures/
│   └── auth.fixture.ts         # Fixtures de login réutilisables
├── helpers/
│   └── api.helper.ts           # Création de données via API Laravel
├── tests/
│   ├── auth.setup.ts           # Setup : crée les états d'auth
│   ├── auth.spec.ts            # Tests authentification
│   ├── agenda.spec.ts          # Tests calendrier
│   ├── courrier.spec.ts        # Tests gestion du courrier
│   ├── taches.spec.ts          # Tests Kanban tâches
│   ├── visiteurs.spec.ts       # Tests gestion visiteurs
│   ├── paiement.spec.ts        # Tests webhooks CinetPay
│   ├── multitenancy.spec.ts    # Tests isolation multi-tenant
│   ├── sara.spec.ts            # Tests assistant IA SARA
│   └── pwa.spec.ts             # Tests PWA
└── README.md
```

---

## Variables d'environnement

Créer un fichier `.env.test` dans le répertoire `e2e/` :

```env
# URL de base de l'application
BASE_URL=http://localhost:8000

# Credentials de test — Admin
TEST_ADMIN_EMAIL=admin@test-secretis.ci
TEST_ADMIN_PASSWORD=Admin@Test2024!

# Credentials de test — Secrétaire
TEST_SECRETARY_EMAIL=secretaire@test-secretis.ci
TEST_SECRETARY_PASSWORD=Secretaire@Test2024!

# Credentials de test — Manager
TEST_MANAGER_EMAIL=manager@test-secretis.ci
TEST_MANAGER_PASSWORD=Manager@Test2024!

# Credentials de test — Directeur
TEST_DIRECTOR_EMAIL=directeur@test-secretis.ci
TEST_DIRECTOR_PASSWORD=Directeur@Test2024!

# Credentials de test — Licence expirée
TEST_EXPIRED_EMAIL=expired@test-secretis.ci
TEST_EXPIRED_PASSWORD=Expired@Test2024!

# Credentials de test — MFA activé
TEST_MFA_EMAIL=mfa@test-secretis.ci
TEST_MFA_PASSWORD=MfaUser@Test2024!
TEST_MFA_SECRET=JBSWY3DPEHPK3PXP

# Org B (multi-tenancy)
TEST_ORG_B_EMAIL=admin@org-b-test.ci
TEST_ORG_B_PASSWORD=OrgB@Test2024!
TEST_ORG_B_SLUG=org-b-test

# ID de l'organisation de test principale
TEST_ORG_ID=1

# Secret pour les endpoints de test backend (X-Test-Secret)
TEST_SECRET=e2e-test-secret

# CinetPay (webhooks)
CINETPAY_WEBHOOK_SECRET=test-webhook-secret
CINETPAY_SITE_ID=test-site-id
```

Charger ces variables :
```bash
# Linux/Mac
export $(cat .env.test | xargs) && npx playwright test

# Windows PowerShell
Get-Content .env.test | ForEach-Object { $env:($_.Split('=')[0]) = $_.Split('=',2)[1] }
npx playwright test
```

---

## Prérequis backend

Le backend Laravel doit avoir :

1. **Seeders de test** : utilisateurs avec les rôles correspondants, organisations dédiées au E2E
2. **Endpoints de test** (protégés par `X-Test-Secret`, désactivés en production) :
   - `POST /api/test/organizations` — créer une org de test
   - `DELETE /api/test/organizations/{id}` — supprimer une org de test
   - `POST /api/test/users` — créer un utilisateur de test
   - `DELETE /api/test/users/{id}` — supprimer un utilisateur de test
   - `POST /api/test/licenses/activate` — activer une licence de test
   - `POST /api/test/licenses/expire` — expirer une licence de test
   - `DELETE /api/test/cleanup` — nettoyage par lot
   - `POST /api/test/push-notification` — envoyer une notif push de test
3. **Base de données** : distincte de la production (`DB_DATABASE_TEST` ou SQLite en mémoire en CI)

---

## Commandes utiles

```bash
# Générer le rapport de couverture
npx playwright test --reporter=html

# Lancer et garder le navigateur ouvert après l'échec
npx playwright test --headed --workers=1

# Filtrer par nom de test
npx playwright test -g "connexion valide"

# Enregistrer une nouvelle interaction (codegen)
npx playwright codegen http://localhost:8000

# Voir les traces
npx playwright show-trace test-results/trace.zip

# Mettre à jour les snapshots visuels
npx playwright test --update-snapshots
```

---

## CI/CD

Le workflow GitHub Actions (`.github/workflows/e2e.yml`) :
- Démarre automatiquement sur PR et push main
- Lance Laravel avec SQLite en mémoire
- Exécute les tests Playwright
- Upload le rapport HTML comme artifact

---

## Bonnes pratiques

- Toujours utiliser `data-testid` pour les sélecteurs critiques
- Créer les données de test via l'API helper (pas l'UI) pour la rapidité
- Nettoyer les données créées dans `afterEach` ou via `cleanupAll()`
- Utiliser les fixtures d'auth pour éviter de se connecter à chaque test
- Marquer les tests conditionnels avec `test.skip()` si la feature n'est pas disponible
