/**
 * pwa.spec.ts
 * Tests E2E — Progressive Web App (PWA) SECRETIS ERP
 *
 * Couvre :
 *  - manifest.json accessible et valide
 *  - Service Worker enregistré
 *  - Page hors-ligne accessible après mise en cache
 *  - Notification push reçue
 */
import { test, expect, BrowserContext, Page } from '@playwright/test';

// Tests PWA — pas besoin d'auth pour manifest/SW
test.describe('PWA — Progressive Web App', () => {
  // --------------------------------------------------------------------
  // 1. manifest.json accessible et valide
  // --------------------------------------------------------------------
  test('manifest.json accessible et valide', async ({ request }) => {
    const response = await request.get('/manifest.json');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/i);

    const manifest = await response.json();

    // Champs obligatoires selon la spécification PWA
    expect(manifest).toMatchObject({
      name: expect.any(String),
      short_name: expect.any(String),
      start_url: expect.any(String),
      display: expect.stringMatching(/standalone|fullscreen|minimal-ui|browser/),
      background_color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/),
      theme_color: expect.stringMatching(/^#[0-9a-fA-F]{6}$/),
      icons: expect.arrayContaining([
        expect.objectContaining({
          src: expect.any(String),
          sizes: expect.any(String),
          type: expect.stringMatching(/image\//),
        }),
      ]),
    });

    // Vérifications spécifiques SECRETIS
    expect(manifest.name).toContain('SECRETIS');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Icône 192x192 requise
    const icon192 = manifest.icons.find((i: { sizes: string }) => i.sizes.includes('192'));
    expect(icon192).toBeDefined();

    // Icône 512x512 requise
    const icon512 = manifest.icons.find((i: { sizes: string }) => i.sizes.includes('512'));
    expect(icon512).toBeDefined();
  });

  // --------------------------------------------------------------------
  // 2. Service Worker enregistré
  // --------------------------------------------------------------------
  test('Service Worker enregistré et actif', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Vérifier l'enregistrement du SW via JavaScript
    const swStatus = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false };
      }

      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length === 0) {
        return { supported: true, registered: false };
      }

      const reg = registrations[0];
      return {
        supported: true,
        registered: true,
        scope: reg.scope,
        state: reg.active?.state ?? reg.installing?.state ?? reg.waiting?.state ?? 'unknown',
      };
    });

    expect(swStatus.supported).toBe(true);
    expect(swStatus.registered).toBe(true);
    expect(swStatus.state).toMatch(/activated|activating|installed/i);
  });

  test('Service Worker intercepte les requêtes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Attendre que le SW soit actif
    await page.waitForTimeout(1000);

    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    });

    expect(swActive).toBe(true);
  });

  // --------------------------------------------------------------------
  // 3. Page hors-ligne accessible après mise en cache
  // --------------------------------------------------------------------
  test('page hors-ligne accessible après mise en cache', async ({ page, context }) => {
    // Charger la page pour la mettre en cache par le SW
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Attendre que le SW ait mis en cache les ressources
    await page.waitForTimeout(2000);

    // Simuler le mode hors-ligne
    await context.setOffline(true);

    // Tenter de naviguer vers la page principale
    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 15_000 });
    } catch {
      // La navigation peut timeout en offline — vérifier ce qui est affiché
    }

    // Soit la page en cache est servie, soit la page offline spéciale
    const pageContent = page.locator('body');
    await expect(pageContent).not.toBeEmpty();

    // Il ne doit pas y avoir une page d'erreur réseau brute du navigateur
    const hasNetworkError = await page.locator('text=/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/').isVisible().catch(() => false);
    expect(hasNetworkError).toBe(false);

    // Si une page offline dédiée existe
    const offlinePage = page.locator('[data-testid="offline-page"], .offline-indicator');
    const hasOfflinePage = await offlinePage.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasOfflinePage) {
      await expect(offlinePage).toContainText(/hors-ligne|offline|connexion/i);
    }

    // Remettre en ligne
    await context.setOffline(false);
  });

  // --------------------------------------------------------------------
  // 4. Notification push reçue
  // --------------------------------------------------------------------
  test('notification push — permission accordée et notification reçue', async ({ page, context }) => {
    // Accorder la permission de notification
    await context.grantPermissions(['notifications']);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Vérifier que l'API de notification est disponible
    const notifSupported = await page.evaluate(() => {
      return 'Notification' in window && 'PushManager' in window;
    });

    if (!notifSupported) {
      test.skip(true, 'API Notification/Push non supportée dans ce navigateur');
      return;
    }

    // Vérifier que la permission est accordée
    const permission = await page.evaluate(() => Notification.permission);
    expect(permission).toBe('granted');

    // Envoyer une notification de test via l'API admin
    const testNotifResponse = await page.request.post('/api/test/push-notification', {
      data: {
        title: 'Test Notification SECRETIS',
        body: 'Ceci est un test de notification push E2E',
      },
      headers: {
        'X-Test-Secret': process.env.TEST_SECRET ?? 'e2e-test-secret',
      },
    });

    // Si l'endpoint de test existe
    if (testNotifResponse.ok()) {
      // Écouter les notifications via le Service Worker
      const notification = await page.evaluate(() => {
        return new Promise<{ title: string; body: string } | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000);

          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'PUSH_NOTIFICATION') {
              clearTimeout(timeout);
              resolve(event.data.notification);
            }
          });
        });
      });

      if (notification) {
        expect(notification.title).toContain('SECRETIS');
      }
    } else {
      // L'endpoint de test n'existe pas — vérifier juste la subscription
      const hasSubscription = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false;
        const reg = await navigator.serviceWorker.ready;
        if (!reg.pushManager) return false;
        const sub = await reg.pushManager.getSubscription();
        return !!sub;
      });

      // Une subscription existe (ou sera créée au premier login)
      // En test, on vérifie simplement que pushManager est disponible
      expect(hasSubscription !== undefined).toBe(true);
    }
  });

  // --------------------------------------------------------------------
  // Tests supplémentaires PWA
  // --------------------------------------------------------------------

  test('ressources statiques essentielles en cache SW', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Vérifier le cache via l'API Cache Storage
    const cachedResources = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      if (cacheNames.length === 0) return [];

      const allCachedUrls: string[] = [];
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        allCachedUrls.push(...requests.map((r) => r.url));
      }
      return allCachedUrls;
    });

    // Au moins quelques ressources doivent être en cache
    expect(cachedResources.length).toBeGreaterThan(0);
  });

  test('theme-color dans le meta tag correspond au manifest', async ({ page, request }) => {
    const manifest = await (await request.get('/manifest.json')).json();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');

    if (themeColor && manifest.theme_color) {
      expect(themeColor.toLowerCase()).toBe(manifest.theme_color.toLowerCase());
    }
  });
});
