import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Configuration Playwright — IBIG SECRETIS ERP
 *
 * Projets :
 *   setup         — crée les auth states pour chaque rôle (dépendance universelle)
 *   cleanup       — supprime les données E2E après la suite (teardown du setup)
 *   chromium      — Chrome desktop, navigateur principal
 *   firefox       — Firefox desktop
 *   mobile-chrome — Pixel 7 (Android)
 *   mobile-safari — iPhone 14 (iOS)
 *
 * Suites :
 *   tests/        — Tests fonctionnels de base (auth, agenda, courrier…)
 *   roles/        — Un spec par rôle Spatie (10 rôles)
 *   security/     — Multitenancy et paiements
 *   features/     — Recherche, notifications, SARA, academy
 *   accessibility/ — WCAG 2.1 clavier/focus
 *   recette/      — Flux métier complets (secrétaire, dirigeant, admin)
 *   regression/   — Non-régression sécurité paiements, multitenancy, a11y
 *   performance/  — Temps de chargement pages critiques
 */
export default defineConfig({
  // -------------------------------------------------------------------------
  // Répertoire racine : couvre toutes les suites
  // -------------------------------------------------------------------------
  testDir: '.',

  // Exclure node_modules, .auth et les fichiers de configuration
  testIgnore: [
    '**/node_modules/**',
    '**/.auth/**',
    '**/playwright.config.ts',
    '**/global.setup.ts',
    '**/global.teardown.ts',
  ],

  // Timeout global par test
  // recette/ et performance/ peuvent être longs → 45 s
  timeout: 45_000,

  // Timeout pour les assertions expect()
  expect: { timeout: 12_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  // -------------------------------------------------------------------------
  // Reporters
  // -------------------------------------------------------------------------
  reporter: [
    // Rapport HTML interactif (navigateur)
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    // JSON machine-readable (dashboards, scripts de recette)
    ['json', { outputFile: 'reports/results.json' }],
    // JUnit pour les CI (Jenkins, GitLab, GitHub Actions)
    ['junit', { outputFile: 'reports/junit.xml' }],
    // Annotations inline GitHub Actions (annotations PR)
    ...(process.env.CI ? [['github'] as ['github']] : []),
    // Sortie console lisible en local
    ['list'],
  ],

  // -------------------------------------------------------------------------
  // Artifacts globaux
  // -------------------------------------------------------------------------
  use: {
    baseURL: process.env.E2E_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:8000',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
  },

  outputDir: 'reports/artifacts',

  // -------------------------------------------------------------------------
  // Projets
  // -------------------------------------------------------------------------
  projects: [
    // -- Orchestration -------------------------------------------------------
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },
    // Setup legacy pour les specs tests/ qui utilisent tests/auth.setup.ts
    {
      name: 'legacy-setup',
      testMatch: /tests[\\/]auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // -- Desktop Chrome (navigateur principal) --------------------------------
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup', 'legacy-setup'],
    },

    // -- Desktop Firefox ------------------------------------------------------
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup', 'legacy-setup'],
    },

    // -- Mobile Chrome — Pixel 7 ----------------------------------------------
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup', 'legacy-setup'],
    },

    // -- Mobile Safari — iPhone 14 (specs *mobile* uniquement) ---------------
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      testMatch: /.*mobile.*/,
      dependencies: ['setup', 'legacy-setup'],
    },
  ],

  // -------------------------------------------------------------------------
  // Serveur web
  // Activé automatiquement en CI ; en local le serveur doit être déjà lancé.
  // -------------------------------------------------------------------------
  webServer: process.env.CI
    ? {
        command: 'php artisan serve --env=testing --port=8000',
        cwd: path.join(__dirname, '..'),
        port: 8000,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          APP_ENV: 'testing',
          APP_DEBUG: 'false',
          CACHE_DRIVER: 'array',
          SESSION_DRIVER: 'array',
          QUEUE_CONNECTION: 'sync',
        },
      }
    : undefined,
});
