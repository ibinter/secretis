import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Configuration Playwright — IBIG SECRETIS ERP
 * Couvre 10 rôles, desktop + mobile, setup/teardown global.
 *
 * Projets :
 *   setup      — crée les auth states pour chaque rôle (dépendance universelle)
 *   cleanup    — supprime les données E2E après la suite (teardown du setup)
 *   chromium   — Chrome desktop, auth admin par défaut
 *   firefox    — Firefox desktop
 *   mobile-chrome — Pixel 5
 *   mobile-safari — iPhone 12 (uniquement les specs *mobile*)
 */
export default defineConfig({
  // -------------------------------------------------------------------------
  // Répertoire racine : couvre tests/, roles/, security/, features/
  // -------------------------------------------------------------------------
  testDir: '.',

  // Exclure node_modules et les fichiers de config
  testIgnore: ['**/node_modules/**', '**/.auth/**'],

  // Timeout global par test (45 s pour les tests de rôles complexes)
  timeout: 45_000,

  // Timeout pour les expect()
  expect: { timeout: 12_000 },

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  // Reporters
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['junit', { outputFile: '../test-results/junit.xml' }],
    ['list'],
  ],

  // Artifacts globaux
  use: {
    baseURL: process.env.E2E_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:8000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: process.env.CI ? 'on-first-retry' : 'off',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' },
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
  },

  outputDir: '../test-results/artifacts',

  projects: [
    // -------------------------------------------------------------------------
    // Setup : pré-authentifie les 10 rôles et les stocke dans .auth/
    // Teardown : nettoie les données E2E après la suite complète
    // -------------------------------------------------------------------------
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },

    // Setup legacy (tests/auth.setup.ts pour compatibilité avec les specs existants)
    {
      name: 'legacy-setup',
      testMatch: /tests[\\/]auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // -------------------------------------------------------------------------
    // Desktop Chrome — navigateur principal
    // auth state : admin (les specs qui ont besoin d'un rôle précis
    // chargent leur propre storageState via test.use)
    // -------------------------------------------------------------------------
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup', 'legacy-setup'],
    },

    // -------------------------------------------------------------------------
    // Firefox
    // -------------------------------------------------------------------------
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup', 'legacy-setup'],
    },

    // -------------------------------------------------------------------------
    // Mobile Chrome — Pixel 5
    // -------------------------------------------------------------------------
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup', 'legacy-setup'],
    },

    // -------------------------------------------------------------------------
    // Mobile Safari — iPhone 12 (uniquement les specs *mobile*)
    // -------------------------------------------------------------------------
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*mobile.*/,
      dependencies: ['setup', 'legacy-setup'],
    },
  ],

  // -------------------------------------------------------------------------
  // Serveur web (décommentez en CI ou si vous ne l'avez pas déjà lancé)
  // -------------------------------------------------------------------------
  // webServer: {
  //   command: 'php artisan serve --env=testing --port=8000',
  //   cwd: '../backend',
  //   port: 8000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 60_000,
  // },
});
