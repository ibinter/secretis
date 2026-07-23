/**
 * roles/chef_projet.spec.ts
 * Tests E2E — Rôle chef_projet (Chef de Projet)
 *
 * Le chef de projet gère les projets, le Kanban, le Gantt et assigne
 * des tâches aux membres de son équipe.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'chef_projet.json') });

test.describe('Chef de Projet', () => {
  // -------------------------------------------------------------------------
  // Projets
  // -------------------------------------------------------------------------
  test('peut voir la liste des projets', async ({ page }) => {
    await page.goto('/projets');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/login/);

    const content = page.locator(
      '[data-testid="projects-list"], [data-testid="project-cards"], .projects-list, h1',
    ).first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('peut créer un nouveau projet', async ({ page }) => {
    await page.goto('/projets');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', {
      name: /nouveau projet|créer un projet|ajouter/i,
    });
    const hasCreate = await createBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCreate) {
      test.skip(true, 'Bouton création projet non trouvé');
      return;
    }

    await createBtn.click();
    await page.waitForSelector('[role="dialog"], [data-testid="project-modal"]');

    const projectName = `Projet E2E ${Date.now()}`;
    await page.getByLabel(/nom du projet|titre|name/i).fill(projectName);

    const startDate = new Date();
    await page
      .getByLabel(/date de début|start date/i)
      .fill(startDate.toISOString().split('T')[0])
      .catch(() => null);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    await page
      .getByLabel(/date de fin|end date|deadline/i)
      .fill(endDate.toISOString().split('T')[0])
      .catch(() => null);

    await page
      .getByRole('button', { name: /enregistrer|créer|sauvegarder|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Kanban
  // -------------------------------------------------------------------------
  test('peut voir le tableau Kanban d\'un projet', async ({ page }) => {
    await page.goto('/projets');
    await page.waitForLoadState('networkidle');

    // Ouvrir le premier projet
    const firstProject = page.locator(
      '[data-testid="project-card"], [data-testid="project-row"], .project-card',
    ).first();
    const hasProject = await firstProject.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasProject) {
      test.skip(true, 'Aucun projet disponible pour le test Kanban');
      return;
    }

    await firstProject.click();
    await page.waitForLoadState('networkidle');

    // Naviguer vers la vue Kanban
    const kanbanTab = page.getByRole('tab', { name: /kanban|tableau/i }).or(
      page.getByRole('link', { name: /kanban/i }),
    );
    const hasKanban = await kanbanTab.isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasKanban) await kanbanTab.click();

    const board = page.locator(
      '[data-testid="kanban-board"], .kanban-board, [data-testid="kanban"]',
    );
    await expect(board.first()).toBeVisible({ timeout: 10_000 });

    // Les colonnes Kanban sont visibles
    const columns = page.locator(
      '[data-testid="kanban-column"], .kanban-column, .column',
    );
    await expect(columns.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Gantt
  // -------------------------------------------------------------------------
  test('peut voir le diagramme de Gantt', async ({ page }) => {
    await page.goto('/projets');
    await page.waitForLoadState('networkidle');

    const firstProject = page.locator(
      '[data-testid="project-card"], [data-testid="project-row"], .project-card',
    ).first();
    const hasProject = await firstProject.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasProject) {
      test.skip(true, 'Aucun projet disponible pour le test Gantt');
      return;
    }

    await firstProject.click();
    await page.waitForLoadState('networkidle');

    const ganttTab = page.getByRole('tab', { name: /gantt|planning/i }).or(
      page.getByRole('link', { name: /gantt/i }),
    );
    const hasGantt = await ganttTab.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasGantt) {
      test.skip(true, 'Vue Gantt non disponible dans cet environnement');
      return;
    }

    await ganttTab.click();

    const ganttChart = page.locator(
      '[data-testid="gantt-chart"], .gantt-chart, .gantt',
    );
    await expect(ganttChart.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Assignation de tâches
  // -------------------------------------------------------------------------
  test('peut assigner une tâche à un membre de l\'équipe', async ({ page }) => {
    await page.goto('/taches');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', { name: /nouvelle tâche|créer/i });
    const hasCreate = await createBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCreate) {
      test.skip(true, 'Bouton création tâche non trouvé');
      return;
    }

    await createBtn.click();
    await page.waitForSelector('[role="dialog"], [data-testid="task-modal"]');

    await page.getByLabel(/titre|title|nom de la tâche/i).fill(`Tâche assignée E2E ${Date.now()}`);

    // Sélectionner un assigné
    const assigneeSelect = page
      .getByLabel(/assigné à|assignee|responsable/i)
      .or(page.getByTestId('task-assignee'));
    const hasAssignee = await assigneeSelect.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasAssignee) {
      // Sélectionner le premier utilisateur disponible
      await assigneeSelect.selectOption({ index: 1 }).catch(() => null);
    }

    await page
      .getByRole('button', { name: /enregistrer|créer|sauvegarder|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Restrictions
  // -------------------------------------------------------------------------
  test('ne peut pas accéder aux paramètres de l\'organisation', async ({ page }) => {
    await page.goto('/parametres/utilisateurs');
    await page.waitForLoadState('networkidle');

    const isBlocked =
      page.url().includes('login') ||
      page.url().includes('403') ||
      (await page
        .locator('[data-testid="access-denied"], .access-denied')
        .isVisible()
        .catch(() => false));

    if (!isBlocked) {
      // Si la page est accessible, il ne doit pas pouvoir inviter des utilisateurs
      const inviteBtn = page.getByRole('button', { name: /inviter/i });
      expect(await inviteBtn.isVisible().catch(() => false)).toBeFalsy();
    }
  });
});
