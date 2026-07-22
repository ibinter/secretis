import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Configuration Playwright — IBIG SECRETIS ERP
 * Multi-projet : Chrome, Firefox, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
 */
export default defineConfig({
  // Répertoire des tests
  testDir: './tests',

  // Timeout global par test
  timeout: 30_000,

  // Timeout pour les expect()
  expect: {
    timeout: 10_000,
  },

  // Rapport complet avant d'arrêter
  fullyParallel: true,

  // Fail fast en mode local si on dépasse ce seuil
  forbidOnly: !!process.env.CI,

  // Retry : 2 fois en CI, 0 en local
  retries: process.env.CI ? 2 : 0,

  // Workers : la moitié des CPUs en CI pour ne pas saturer
  workers: process.env.CI ? 2 : undefined,

  // Reporters
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['junit', { outputFile: '../test-results/junit.xml' }],
    ['list'],
  ],

  // Artifacts globaux (screenshots, vidéos, traces)
  use: {
    // Base URL configurable via env (défaut : Laravel Vite dev server)
    baseURL: process.env.BASE_URL ?? 'http://localhost:8000',

    // Screenshots uniquement en cas d'échec
    screenshot: 'only-on-failure',

    // Vidéo uniquement en cas d'échec
    video: 'retain-on-failure',

    // Traces pour le débogage en CI
    trace: process.env.CI ? 'retain-on-failure' : 'off',

    // Headers communs
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9',
    },

    // Locale française
    locale: 'fr-FR',
    timezoneId: 'Africa/Abidjan',
  },

  // Répertoire de sortie des artifacts
  outputDir: '../test-results/artifacts',

  // Projets multi-navigateurs
  projects: [
    // --------------------------------------------------------
    // Setup global : crée les états d'authentification réutilisables
    // --------------------------------------------------------
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // --------------------------------------------------------
    // Desktop Chrome (navigateur principal)
    // --------------------------------------------------------
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Réutiliser l'état d'auth créé par le setup
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup'],
    },

    // --------------------------------------------------------
    // Firefox
    // --------------------------------------------------------
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup'],
    },

    // --------------------------------------------------------
    // Mobile Chrome — Pixel 5
    // --------------------------------------------------------
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup'],
    },

    // --------------------------------------------------------
    // Mobile Safari — iPhone 12
    // --------------------------------------------------------
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: path.join(__dirname, '.auth/admin.json'),
      },
      dependencies: ['setup'],
    },
  ],

  // Serveur web local pour les tests (optionnel si déjà lancé)
  // webServer: {
  //   command: 'php artisan serve --port=8000',
  //   url: 'http://localhost:8000',
  //   reuseExistingServer: !process.env.CI,
  //   cwd: '../backend',
  // },
});
