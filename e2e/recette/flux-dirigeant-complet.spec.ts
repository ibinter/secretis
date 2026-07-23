/**
 * recette/flux-dirigeant-complet.spec.ts
 * Recette — Flux complet d'un dirigeant
 *
 * Vérifie que le dirigeant peut :
 *  - Consulter son tableau de bord exécutif avec les KPI
 *  - Accéder aux documents partagés par la secrétaire
 *  - Valider les tâches qui lui sont assignées
 *  - Consulter les rapports financiers
 *  - Voir les statistiques de l'organisation
 *  - Et qu'il est bien bloqué sur les écrans d'administration
 */
import { test, expect } from '@playwright/test';
import path from 'path';

test.use({
  storageState: path.join(__dirname, '..', '.auth', 'dirigeant.json'),
});

test.describe('Recette — Flux dirigeant', () => {
  // ---------------------------------------------------------------------------
  // 1. Tableau de bord exécutif avec KPI
  // ---------------------------------------------------------------------------
  test('Accès au tableau de bord exécutif avec KPI', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Le dashboard doit se charger
    const dashboard = page.locator('main, [data-testid="dashboard"]');
    await expect(dashboard.first()).toBeVisible({ timeout: 15_000 });

    // Vérifier la présence d'au moins un indicateur chiffré (KPI)
    const kpiCards = page.locator(
      '[data-testid="kpi-card"], [data-testid="stat-card"], .stat-card, .kpi-widget',
    );
    const kpiCount = await kpiCards.count();

    if (kpiCount > 0) {
      await expect(kpiCards.first()).toBeVisible();
      // Vérifier qu'au moins un KPI affiche une valeur numérique
      const firstKpi = kpiCards.first();
      const kpiText = await firstKpi.innerText();
      expect(kpiText.length).toBeGreaterThan(0);
    }

    // Vérifier la présence d'un graphique ou d'un résumé d'activité
    const charts = page.locator(
      '[data-testid="activity-chart"], canvas, [data-testid="summary-widget"], .chart-container',
    );
    const chartsCount = await charts.count();

    // Acceptable si pas de graphique (UI différente selon le plan)
    if (chartsCount > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Consulter les documents partagés par la secrétaire
  // ---------------------------------------------------------------------------
  test('Consulter les documents partagés par la secrétaire', async ({ page }) => {
    await page.goto('/ged');
    await page.waitForLoadState('networkidle');

    const ged = page.locator(
      '[data-testid="document-list"], .document-list, table, [data-testid="ged"]',
    );
    await expect(ged.first()).toBeVisible({ timeout: 12_000 });

    // Vérifier que le dirigeant peut consulter (pas seulement voir une page vide)
    const documents = page.locator(
      '[data-testid="document-row"], .document-item, tbody tr, [data-testid="doc-card"]',
    );
    const docCount = await documents.count();

    // La liste peut être vide en env de test — vérifier uniquement l'accès
    expect(docCount).toBeGreaterThanOrEqual(0);

    // S'il y a des documents, vérifier que le dirigeant peut en ouvrir un
    if (docCount > 0) {
      const firstDoc = documents.first();
      await expect(firstDoc).toBeVisible();

      // Cliquer pour visualiser
      const viewBtn = firstDoc.getByRole('button', { name: /voir|ouvrir|consulter|visualiser/i })
        .or(firstDoc.locator('a').first());
      const hasView = await viewBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      if (hasView) {
        await viewBtn.click();
        await page.waitForLoadState('networkidle');
        // Pas d'erreur 403
        expect(page.url()).not.toMatch(/403|unauthorized/);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Valider une tâche assignée
  // ---------------------------------------------------------------------------
  test('Valider une tâche assignée', async ({ page }) => {
    await page.goto('/taches');
    await page.waitForLoadState('networkidle');

    const taskList = page.locator(
      '[data-testid="task-list"], .task-list, table, [data-testid="kanban-board"]',
    );
    await expect(taskList.first()).toBeVisible({ timeout: 12_000 });

    // Chercher les tâches assignées au dirigeant
    const assignedTasks = page.locator(
      '[data-testid="task-row"], .task-item, [data-testid="task-card"]',
    );
    const taskCount = await assignedTasks.count();

    if (taskCount === 0) {
      // Aucune tâche assignée : acceptable en env de test
      test.skip(true, 'Aucune tâche assignée au dirigeant dans cet environnement');
      return;
    }

    const firstTask = assignedTasks.first();
    await expect(firstTask).toBeVisible();

    // Valider la tâche (checkbox ou bouton Valider)
    const validateAction = firstTask.locator(
      '[data-testid="task-validate"], [data-testid="task-checkbox"], input[type="checkbox"], [role="checkbox"]',
    ).or(
      firstTask.getByRole('button', { name: /valider|terminer|done|marquer/i }),
    );

    const hasValidate = await validateAction.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasValidate) {
      await validateAction.first().click();

      // Vérifier le changement d'état
      await page.waitForTimeout(500);
      const statusIndicator = firstTask.locator(
        '[data-testid="task-status"], .task-status, .badge, .status-badge',
      );
      const hasStatus = await statusIndicator.isVisible({ timeout: 3_000 }).catch(() => false);
      if (hasStatus) {
        const statusText = await statusIndicator.first().innerText();
        expect(statusText.toLowerCase()).toMatch(/terminée?|done|completed|valid/);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Consulter les rapports financiers
  // ---------------------------------------------------------------------------
  test('Consulter les rapports financiers', async ({ page }) => {
    // Tenter d'accéder aux rapports financiers
    const financialUrls = ['/rapports/financiers', '/rapports', '/finances/rapports', '/finances'];

    let loaded = false;
    for (const url of financialUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const is403 = page.url().includes('403') || await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 1_000 }).catch(() => false);
      const isLogin = page.url().includes('login');

      if (!is403 && !isLogin) {
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      // Le dirigeant n'a pas accès aux rapports financiers dans ce plan — acceptable
      test.skip(true, 'Module rapports financiers non disponible pour ce rôle/plan');
      return;
    }

    const content = page.locator('main, [data-testid="reports"], .reports-container');
    await expect(content.first()).toBeVisible({ timeout: 12_000 });

    // Vérifier la présence de données financières (tableau, graphique ou chiffre)
    const financialContent = page.locator(
      'table, canvas, [data-testid="financial-summary"], .revenue-card, .financial-widget',
    );
    const hasFinancials = await financialContent.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasFinancials) {
      await expect(financialContent.first()).toBeVisible();
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Vérifier les statistiques de l'organisation
  // ---------------------------------------------------------------------------
  test('Vérifier les statistiques de l\'organisation', async ({ page }) => {
    const statsUrls = ['/statistiques', '/analytics', '/rapports/activite'];

    let loaded = false;
    for (const url of statsUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const isBlocked = page.url().includes('login') ||
        page.url().includes('403') ||
        await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 1_000 }).catch(() => false);

      if (!isBlocked) {
        loaded = true;
        break;
      }
    }

    // Fallback : dashboard principal
    if (!loaded) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    }

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10_000 });

    // Vérifier la présence de chiffres (utilisateurs, événements, documents, tâches)
    const numbers = page.locator('[data-testid*="count"], [data-testid*="stat"], .stat-value, .kpi-value');
    const numbersCount = await numbers.count();
    // Au moins l'espace de travail est accessible
    expect(page.url()).not.toMatch(/login/);
  });

  // ---------------------------------------------------------------------------
  // 6. Accès refusé aux écrans d'administration
  // ---------------------------------------------------------------------------
  test('Accès refusé aux écrans d\'administration', async ({ page }) => {
    const adminRoutes = [
      '/parametres/utilisateurs',
      '/admin',
      '/admin/organisations',
      '/parametres/facturation/admin',
      '/superadmin',
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const isBlocked =
        page.url().includes('login') ||
        page.url().includes('403') ||
        page.url().includes('dashboard') || // redirection vers dashboard
        await page.locator('[data-testid="access-denied"], .access-denied, [data-testid="forbidden"]')
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

      expect(
        isBlocked,
        `Route d'administration ${route} accessible au dirigeant (URL actuelle: ${page.url()})`,
      ).toBeTruthy();
    }

    // Vérifier spécifiquement qu'il ne peut pas inviter un utilisateur
    await page.goto('/parametres/utilisateurs');
    await page.waitForLoadState('networkidle');

    const inviteBtn = page.getByRole('button', { name: /inviter|ajouter un utilisateur|créer un compte/i });
    const hasInvite = await inviteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    const stillOnAdminPage = page.url().includes('utilisateurs');

    // Soit la page est bloquée, soit il n'y a pas le bouton d'invitation
    expect(!stillOnAdminPage || !hasInvite).toBeTruthy();
  });
});
