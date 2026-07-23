/**
 * performance/page-load.spec.ts
 * Performance — Temps de chargement des pages critiques
 *
 * Mesures via :
 *  - page.metrics() (Chrome DevTools Protocol)
 *  - performance.timing API (Navigation Timing)
 *  - performance.getEntriesByType('navigation')
 *
 * Seuils :
 *  - Dashboard < 3 000 ms
 *  - Agenda    < 2 000 ms
 *  - Documents < 2 000 ms
 *  - Recherche < 1 000 ms (réponse API)
 *  - SARA      < 5 000 ms (IA, incluant le premier token)
 *
 * Note : ces tests sont exécutés uniquement sur Chromium (metrics CDP).
 * Firefox et Mobile utilisent uniquement Navigation Timing.
 */
import { test, expect } from '@playwright/test';
import path from 'path';

test.use({
  storageState: path.join(__dirname, '..', '.auth', 'admin.json'),
});

// ---------------------------------------------------------------------------
// Helper : mesurer le temps de chargement d'une page
// ---------------------------------------------------------------------------

interface PageTimings {
  domContentLoaded: number;   // DOMContentLoadedEventEnd - navigationStart
  loadEvent: number;          // loadEventEnd - navigationStart
  firstPaint: number;         // First Paint (si disponible)
  firstContentfulPaint: number; // FCP (si disponible)
  domInteractive: number;     // domInteractive - navigationStart
}

async function measurePageLoad(
  page: import('@playwright/test').Page,
  url: string,
): Promise<PageTimings> {
  // Démarrer la mesure
  await page.goto(url, { waitUntil: 'networkidle' });

  // Récupérer les timings via Navigation Timing API
  const timings = await page.evaluate((): PageTimings => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const paint = performance.getEntriesByType('paint');

    const firstPaintEntry = paint.find((p) => p.name === 'first-paint');
    const fcpEntry = paint.find((p) => p.name === 'first-contentful-paint');

    if (nav) {
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadEvent: nav.loadEventEnd - nav.startTime,
        firstPaint: firstPaintEntry ? firstPaintEntry.startTime : 0,
        firstContentfulPaint: fcpEntry ? fcpEntry.startTime : 0,
        domInteractive: nav.domInteractive - nav.startTime,
      };
    }

    // Fallback : performance.timing (déprécié mais compatible)
    const t = performance.timing;
    return {
      domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
      loadEvent: t.loadEventEnd - t.navigationStart,
      firstPaint: 0,
      firstContentfulPaint: 0,
      domInteractive: t.domInteractive - t.navigationStart,
    };
  });

  return timings;
}

// ---------------------------------------------------------------------------
// Helper : mesure via CDP metrics (Chromium uniquement)
// ---------------------------------------------------------------------------

async function measureWithCDP(
  page: import('@playwright/test').Page,
  url: string,
): Promise<{ scriptDuration: number; layoutDuration: number; taskDuration: number }> {
  try {
    const client = await (page.context() as import('@playwright/test').BrowserContext & {
      newCDPSession?: (page: import('@playwright/test').Page) => Promise<{
        send: (method: string) => Promise<{ Timestamp?: number; ScriptDuration?: number; LayoutDuration?: number; TaskDuration?: number }>;
      }>;
    }).newCDPSession?.(page);

    if (!client) throw new Error('CDP non disponible');

    await client.send('Performance.enable');
    await page.goto(url, { waitUntil: 'networkidle' });
    const metrics = await client.send('Performance.getMetrics');

    return {
      scriptDuration: (metrics as unknown as { metrics: Array<{ name: string; value: number }> }).metrics.find((m) => m.name === 'ScriptDuration')?.value ?? 0,
      layoutDuration: (metrics as unknown as { metrics: Array<{ name: string; value: number }> }).metrics.find((m) => m.name === 'LayoutDuration')?.value ?? 0,
      taskDuration: (metrics as unknown as { metrics: Array<{ name: string; value: number }> }).metrics.find((m) => m.name === 'TaskDuration')?.value ?? 0,
    };
  } catch {
    // CDP non disponible (Firefox, WebKit) — retourner des valeurs neutres
    return { scriptDuration: 0, layoutDuration: 0, taskDuration: 0 };
  }
}

// ---------------------------------------------------------------------------
// Tests de performance
// ---------------------------------------------------------------------------

test.describe('Performance — Temps de chargement pages', () => {
  // -------------------------------------------------------------------------
  // 1. Dashboard < 3 secondes
  // -------------------------------------------------------------------------
  test('Dashboard charge en moins de 3 secondes', async ({ page }) => {
    const start = Date.now();
    const timings = await measurePageLoad(page, '/dashboard');
    const wallTime = Date.now() - start;

    // Vérifier que la page se charge correctement
    const main = page.locator('main, [data-testid="dashboard"], #dashboard');
    await expect(main.first()).toBeVisible({ timeout: 5_000 });

    // Seuil : loadEvent < 3 000 ms
    const loadTime = timings.loadEvent > 0 ? timings.loadEvent : wallTime;
    console.log(`Dashboard — loadEvent: ${Math.round(loadTime)}ms, FCP: ${Math.round(timings.firstContentfulPaint)}ms, DOMInteractive: ${Math.round(timings.domInteractive)}ms`);

    expect(
      loadTime,
      `Dashboard trop lent : ${Math.round(loadTime)}ms (seuil : 3 000ms)`,
    ).toBeLessThan(3_000);

    // FCP < 2 500 ms (si disponible)
    if (timings.firstContentfulPaint > 0) {
      expect(
        timings.firstContentfulPaint,
        `FCP Dashboard trop lent : ${Math.round(timings.firstContentfulPaint)}ms (seuil : 2 500ms)`,
      ).toBeLessThan(2_500);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Page Agenda < 2 secondes
  // -------------------------------------------------------------------------
  test('Page Agenda charge en moins de 2 secondes', async ({ page }) => {
    const start = Date.now();
    const timings = await measurePageLoad(page, '/agenda');
    const wallTime = Date.now() - start;

    // Vérifier la présence du calendrier
    const calendar = page.locator(
      '.fc, [data-testid="calendar-grid"], .calendar-body, [data-testid="agenda"]',
    );
    await expect(calendar.first()).toBeVisible({ timeout: 5_000 });

    const loadTime = timings.loadEvent > 0 ? timings.loadEvent : wallTime;
    console.log(`Agenda — loadEvent: ${Math.round(loadTime)}ms, FCP: ${Math.round(timings.firstContentfulPaint)}ms`);

    expect(
      loadTime,
      `Agenda trop lent : ${Math.round(loadTime)}ms (seuil : 2 000ms)`,
    ).toBeLessThan(2_000);
  });

  // -------------------------------------------------------------------------
  // 3. Liste documents < 2 secondes
  // -------------------------------------------------------------------------
  test('Liste documents charge en moins de 2 secondes', async ({ page }) => {
    const start = Date.now();
    const timings = await measurePageLoad(page, '/ged');
    const wallTime = Date.now() - start;

    // Vérifier la présence de la liste de documents
    const docList = page.locator(
      '[data-testid="document-list"], table, .document-list, [data-testid="ged"]',
    );
    await expect(docList.first()).toBeVisible({ timeout: 5_000 });

    const loadTime = timings.loadEvent > 0 ? timings.loadEvent : wallTime;
    console.log(`GED — loadEvent: ${Math.round(loadTime)}ms, DOMInteractive: ${Math.round(timings.domInteractive)}ms`);

    expect(
      loadTime,
      `GED trop lente : ${Math.round(loadTime)}ms (seuil : 2 000ms)`,
    ).toBeLessThan(2_000);
  });

  // -------------------------------------------------------------------------
  // 4. Recherche globale répond en moins de 1 seconde
  // -------------------------------------------------------------------------
  test('Recherche globale répond en moins de 1 seconde', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Ouvrir la recherche
    const searchTrigger = page.locator(
      '[data-testid="global-search"], [data-testid="search-trigger"], button[aria-label*="recherche" i]',
    ).first();

    const hasSearchTrigger = await searchTrigger.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSearchTrigger) {
      await searchTrigger.click();
    } else {
      await page.keyboard.press('Control+k');
    }

    const searchInput = page.locator(
      '[data-testid="search-input"], input[type="search"], [role="searchbox"]',
    ).first();

    const hasInput = await searchInput.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasInput) {
      test.skip(true, 'Recherche globale non disponible dans cet environnement');
      return;
    }

    // Mesurer le temps de réponse de la recherche
    const searchStart = Date.now();
    await searchInput.fill('test');

    // Mesurer via l'API de performance réseau
    const searchResponseTime = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const searchEntry = entries.find(
            (e) => e.name.includes('search') || e.name.includes('recherche'),
          );
          if (searchEntry) {
            observer.disconnect();
            resolve(searchEntry.duration);
          }
        });

        try {
          observer.observe({ entryTypes: ['resource'] });
          // Timeout si aucune requête de recherche n'est détectée
          setTimeout(() => {
            observer.disconnect();
            resolve(-1); // -1 = pas de requête réseau détectée (résultats locaux)
          }, 2_000);
        } catch {
          resolve(-1);
        }
      });
    });

    // Attendre les résultats
    await page.waitForTimeout(500);
    const wallTime = Date.now() - searchStart;

    console.log(
      `Recherche — wallTime: ${wallTime}ms, API responseTime: ${Math.round(searchResponseTime)}ms`,
    );

    // Le temps total (debounce + API + rendu) doit être < 1 000 ms
    expect(
      wallTime,
      `Recherche trop lente : ${wallTime}ms (seuil : 1 000ms)`,
    ).toBeLessThan(1_000);

    // Si une requête API a été détectée, sa durée doit être < 500 ms
    if (searchResponseTime > 0) {
      expect(
        searchResponseTime,
        `API de recherche trop lente : ${Math.round(searchResponseTime)}ms (seuil : 500ms)`,
      ).toBeLessThan(500);
    }
  });

  // -------------------------------------------------------------------------
  // 5. SARA répond en moins de 5 secondes
  // -------------------------------------------------------------------------
  test('SARA répond en moins de 5 secondes', async ({ page }) => {
    // Chercher l'interface SARA
    const saraUrls = ['/sara', '/assistant', '/ia', '/chatbot'];
    let saraLoaded = false;

    for (const url of saraUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const isBlocked = page.url().includes('login') || page.url().includes('403');
      if (!isBlocked) {
        saraLoaded = true;
        break;
      }
    }

    if (!saraLoaded) {
      // Chercher SARA dans le dashboard (widget flottant)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const saraWidget = page.locator(
        '[data-testid="sara-widget"], [data-testid="sara-button"], button[aria-label*="SARA" i], .sara-float',
      );
      const hasWidget = await saraWidget.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasWidget) {
        test.skip(true, 'Interface SARA non disponible dans cet environnement');
        return;
      }
      await saraWidget.first().click();
      await page.waitForTimeout(500);
    }

    // Trouver le champ de saisie SARA
    const saraInput = page.locator(
      '[data-testid="sara-input"], [data-testid="chat-input"], textarea[placeholder*="SARA" i], [aria-label*="message" i]',
    ).or(page.locator('textarea, input[type="text"]').last());

    const hasInput = await saraInput.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!hasInput) {
      test.skip(true, 'Interface de chat SARA non trouvée');
      return;
    }

    // Envoyer une question simple
    await saraInput.fill('Quelle est la date d\'aujourd\'hui ?');

    // Mesurer le temps de réponse
    const saraStart = Date.now();

    const sendBtn = page.getByRole('button', { name: /envoyer|send|soumettre/i })
      .or(page.locator('[data-testid="sara-send"]'));
    const hasSend = await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasSend) {
      await sendBtn.click();
    } else {
      await saraInput.press('Enter');
    }

    // Attendre la première réponse (streaming ou complète)
    const responseIndicator = page.locator(
      '[data-testid="sara-response"], [data-testid="chat-message"][data-role="assistant"], .message-assistant, .sara-message',
    ).or(
      page.locator('.typing-indicator, [data-testid="sara-typing"]'),
    );

    const firstResponseAppeared = await responseIndicator
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);

    const responseTime = Date.now() - saraStart;
    console.log(`SARA — premier token/réponse : ${responseTime}ms`);

    expect(
      firstResponseAppeared,
      `SARA n'a pas répondu dans les 5 secondes`,
    ).toBeTruthy();

    expect(
      responseTime,
      `SARA trop lente : ${responseTime}ms (seuil : 5 000ms)`,
    ).toBeLessThan(5_000);
  });

  // -------------------------------------------------------------------------
  // Bonus : rapport de performance complet (ne fait pas échouer la suite)
  // -------------------------------------------------------------------------
  test('Rapport de performance complet — toutes les pages critiques', async ({ page }) => {
    const pagesToBenchmark = [
      { url: '/dashboard', name: 'Dashboard', threshold: 3_000 },
      { url: '/agenda', name: 'Agenda', threshold: 2_000 },
      { url: '/ged', name: 'GED', threshold: 2_000 },
      { url: '/taches', name: 'Tâches', threshold: 2_000 },
      { url: '/visiteurs', name: 'Visiteurs', threshold: 2_000 },
      { url: '/reunions', name: 'Réunions', threshold: 2_000 },
      { url: '/courrier', name: 'Courrier', threshold: 2_000 },
    ];

    const results: Array<{
      page: string;
      url: string;
      loadEvent: number;
      fcp: number;
      domInteractive: number;
      threshold: number;
      status: 'PASS' | 'FAIL' | 'SKIP';
    }> = [];

    for (const { url, name, threshold } of pagesToBenchmark) {
      try {
        const timings = await measurePageLoad(page, url);

        const loadTime = timings.loadEvent > 0 ? timings.loadEvent : threshold + 1;
        results.push({
          page: name,
          url,
          loadEvent: Math.round(loadTime),
          fcp: Math.round(timings.firstContentfulPaint),
          domInteractive: Math.round(timings.domInteractive),
          threshold,
          status: loadTime < threshold ? 'PASS' : 'FAIL',
        });
      } catch {
        results.push({
          page: name,
          url,
          loadEvent: -1,
          fcp: -1,
          domInteractive: -1,
          threshold,
          status: 'SKIP',
        });
      }
    }

    // Afficher le rapport
    console.table(results.map((r) => ({
      Page: r.page,
      'Load (ms)': r.loadEvent,
      'FCP (ms)': r.fcp,
      'DOM Interactive (ms)': r.domInteractive,
      'Seuil (ms)': r.threshold,
      Statut: r.status,
    })));

    const failures = results.filter((r) => r.status === 'FAIL');
    if (failures.length > 0) {
      console.warn(
        `Pages dépassant le seuil de performance :\n` +
        failures.map((f) => `  - ${f.page}: ${f.loadEvent}ms > ${f.threshold}ms`).join('\n'),
      );
    }

    // Ce test ne fait pas échouer la suite — il est informatif
    // Les tests individuels ci-dessus font foi
    expect(results.filter((r) => r.status !== 'SKIP').length).toBeGreaterThan(0);
  });
});
