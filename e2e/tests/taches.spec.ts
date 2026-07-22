/**
 * taches.spec.ts
 * Tests E2E — Module Tâches / Kanban SECRETIS ERP
 *
 * Couvre :
 *  - Créer une tâche → apparaît dans colonne "À faire"
 *  - Glisser-déposer vers "En cours" → statut mis à jour
 *  - Assigner un utilisateur → notification envoyée
 *  - Commenter une tâche
 *  - Créer une sous-tâche
 *  - Marquer comme terminée → colonne "Terminé"
 */
import { test, expect } from '../fixtures/auth.fixture';
import { createTask, deleteTask } from '../helpers/api.helper';

test.use({ storageState: 'e2e/.auth/admin.json' });

// -----------------------------------------------------------------------
// Sélecteurs Kanban (FullCalendar / React-Beautiful-DnD / custom)
// -----------------------------------------------------------------------
const SELECTORS = {
  todoColumn: '[data-testid="kanban-col-todo"], [data-column="todo"], .kanban-column:first-child',
  inProgressColumn: '[data-testid="kanban-col-in_progress"], [data-column="in_progress"]',
  doneColumn: '[data-testid="kanban-col-done"], [data-column="done"]',
  taskCard: '[data-testid="task-card"], .kanban-card, .task-item',
  newTaskBtn: 'button:has-text("Nouvelle tâche"), button:has-text("Ajouter"), button:has-text("Créer")',
  taskModal: '[role="dialog"], [data-testid="task-modal"]',
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function openNewTaskModal(page: import('@playwright/test').Page) {
  await page.locator(SELECTORS.newTaskBtn).first().click();
  await page.waitForSelector(SELECTORS.taskModal);
}

async function dragCardToColumn(
  page: import('@playwright/test').Page,
  cardTitle: string,
  targetColumnSelector: string,
) {
  const card = page.locator(SELECTORS.taskCard).filter({ hasText: cardTitle }).first();
  const target = page.locator(targetColumnSelector).first();

  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();

  if (!cardBox || !targetBox) throw new Error('Bounding box non trouvé pour le drag-drop');

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 30, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test.describe('Tâches — Kanban', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/taches');
    await page.waitForLoadState('networkidle');
  });

  // --------------------------------------------------------------------
  // 1. Créer une tâche → colonne "À faire"
  // --------------------------------------------------------------------
  test('créer une tâche → apparaît dans la colonne "À faire"', async ({ page }) => {
    const taskTitle = `Tâche E2E ${Date.now()}`;

    await openNewTaskModal(page);

    await page.getByLabel(/titre|title|nom/i).fill(taskTitle);
    await page.getByLabel(/description/i).fill('Description de la tâche de test E2E');

    // Priorité
    const prioritySelect = page.getByLabel(/priorité|priority/i);
    const hasPriority = await prioritySelect.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasPriority) await prioritySelect.selectOption('medium');

    await page.getByRole('button', { name: /créer|enregistrer|sauvegarder/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

    // La tâche apparaît dans la colonne "À faire"
    const todoCol = page.locator(SELECTORS.todoColumn);
    await expect(todoCol).toBeVisible();
    await expect(todoCol.locator(SELECTORS.taskCard).filter({ hasText: taskTitle })).toBeVisible({
      timeout: 10_000,
    });
  });

  // --------------------------------------------------------------------
  // 2. Glisser-déposer vers "En cours" → statut mis à jour
  // --------------------------------------------------------------------
  test('drag-drop vers "En cours" → statut mis à jour', async ({ page }) => {
    const task = await createTask(page.request, {
      title: `DnD Tâche ${Date.now()}`,
      status: 'todo',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await dragCardToColumn(page, task.title, SELECTORS.inProgressColumn);

    // La carte doit maintenant être dans la colonne "En cours"
    const inProgressCol = page.locator(SELECTORS.inProgressColumn);
    await expect(
      inProgressCol.locator(SELECTORS.taskCard).filter({ hasText: task.title }),
    ).toBeVisible({ timeout: 10_000 });

    // Nettoyage
    await deleteTask(page.request, task.id);
  });

  // --------------------------------------------------------------------
  // 3. Assigner un utilisateur → notification envoyée
  // --------------------------------------------------------------------
  test('assigner une tâche à un utilisateur → notification envoyée', async ({ page }) => {
    const task = await createTask(page.request, {
      title: `Assignation ${Date.now()}`,
      status: 'todo',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ouvrir la tâche
    const taskCard = page.locator(SELECTORS.taskCard).filter({ hasText: task.title }).first();
    await taskCard.click();

    await page.waitForSelector(SELECTORS.taskModal);

    // Assigner
    const assignInput = page
      .getByLabel(/assigné à|assigner|assigned to/i)
      .or(page.getByTestId('assignee-input'));
    await assignInput.click();

    const firstUser = page.locator('[data-testid="user-option"], [role="option"]').first();
    await expect(firstUser).toBeVisible({ timeout: 5_000 });
    await firstUser.click();

    await page.getByRole('button', { name: /enregistrer|sauvegarder|valider/i }).click();

    // Badge assigné visible
    const assignedBadge = page.locator('[data-testid="assigned-user"], .assigned-avatar').first();
    await expect(assignedBadge).toBeVisible({ timeout: 10_000 });

    // Vérifier notification via API
    const notifResponse = await page.request.get('/api/notifications?type=task_assigned&task_id=' + task.id);
    if (notifResponse.ok()) {
      const notifs = await notifResponse.json();
      expect(notifs.data?.length ?? notifs.length ?? 0).toBeGreaterThan(0);
    }

    await deleteTask(page.request, task.id);
  });

  // --------------------------------------------------------------------
  // 4. Commenter une tâche
  // --------------------------------------------------------------------
  test('commenter une tâche → commentaire visible', async ({ page }) => {
    const task = await createTask(page.request, {
      title: `Commentaire ${Date.now()}`,
      status: 'in_progress',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(SELECTORS.taskCard).filter({ hasText: task.title }).first();
    await taskCard.click();
    await page.waitForSelector(SELECTORS.taskModal);

    const commentText = `Commentaire E2E ${Date.now()}`;

    const commentInput = page
      .getByPlaceholder(/ajouter un commentaire|write a comment/i)
      .or(page.getByLabel(/commentaire/i));
    await commentInput.fill(commentText);

    await page.getByRole('button', { name: /envoyer|publier|poster|submit/i }).click();

    // Le commentaire apparaît dans la liste
    const commentEl = page.locator('[data-testid="comment-item"], .comment').filter({
      hasText: commentText,
    });
    await expect(commentEl.first()).toBeVisible({ timeout: 10_000 });

    await deleteTask(page.request, task.id);
  });

  // --------------------------------------------------------------------
  // 5. Créer une sous-tâche
  // --------------------------------------------------------------------
  test('créer une sous-tâche → apparaît dans la liste des sous-tâches', async ({ page }) => {
    const task = await createTask(page.request, {
      title: `Parent ${Date.now()}`,
      status: 'todo',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(SELECTORS.taskCard).filter({ hasText: task.title }).first();
    await taskCard.click();
    await page.waitForSelector(SELECTORS.taskModal);

    // Bouton "Ajouter sous-tâche"
    const addSubtaskBtn = page.getByRole('button', { name: /sous-tâche|subtask|sous tâche/i });
    await addSubtaskBtn.click();

    const subtaskTitle = `Sous-tâche ${Date.now()}`;
    const subtaskInput = page.getByPlaceholder(/titre sous-tâche|subtask title/i).or(
      page.locator('[data-testid="subtask-input"]'),
    );
    await subtaskInput.fill(subtaskTitle);

    await page.keyboard.press('Enter');

    // La sous-tâche apparaît
    const subtaskEl = page.locator('[data-testid="subtask-item"], .subtask').filter({
      hasText: subtaskTitle,
    });
    await expect(subtaskEl.first()).toBeVisible({ timeout: 10_000 });

    await deleteTask(page.request, task.id);
  });

  // --------------------------------------------------------------------
  // 6. Marquer comme terminée → colonne "Terminé"
  // --------------------------------------------------------------------
  test('marquer une tâche comme terminée → colonne "Terminé"', async ({ page }) => {
    const task = await createTask(page.request, {
      title: `Terminer ${Date.now()}`,
      status: 'in_progress',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Drag-drop vers "Terminé"
    await dragCardToColumn(page, task.title, SELECTORS.doneColumn);

    const doneCol = page.locator(SELECTORS.doneColumn);
    await expect(
      doneCol.locator(SELECTORS.taskCard).filter({ hasText: task.title }),
    ).toBeVisible({ timeout: 10_000 });

    // Ou via la checkbox
    const taskCard = page.locator(SELECTORS.taskCard).filter({ hasText: task.title }).first();
    const checkbox = taskCard.locator('input[type="checkbox"]');
    const hasCheckbox = await checkbox.isVisible({ timeout: 2_000 }).catch(() => false);

    if (hasCheckbox && !(await checkbox.isChecked())) {
      await checkbox.check();
      await expect(checkbox).toBeChecked({ timeout: 5_000 });
    }

    await deleteTask(page.request, task.id);
  });
});
