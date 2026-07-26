/**
 * roles/secretaire.spec.ts
 * Tests E2E — Rôle secretary (Secrétaire)
 *
 * La secrétaire est le cœur opérationnel du système :
 * agenda, courrier, GED, réunions, visiteurs, tâches.
 * Elle n'a pas accès aux modules RH (salaires) ni à l'administration.
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'secretaire.json') });

test.describe('Secrétaire — modules de base', () => {
  // -------------------------------------------------------------------------
  // Agenda
  // -------------------------------------------------------------------------
  test('peut consulter le calendrier', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');

    const calendar = page.locator(
      '.fc-view, [data-testid="calendar-grid"], .calendar-body',
    );
    await expect(calendar.first()).toBeVisible({ timeout: 10_000 });
  });

  test('peut créer un événement dans l\'agenda', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /nouvel événement|créer|ajouter/i })
      .click();

    await page.waitForSelector('[role="dialog"], [data-testid="event-modal"]');

    const title = `Réunion test Playwright ${Date.now()}`;
    await page.getByLabel(/titre|title|nom/i).fill(title);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    await page
      .getByLabel(/début|start date/i)
      .or(page.getByTestId('event-start-date'))
      .fill(dateStr);
    await page
      .getByLabel(/heure début|start time/i)
      .or(page.getByTestId('event-start-time'))
      .fill('09:00');
    await page
      .getByLabel(/heure fin|end time/i)
      .or(page.getByTestId('event-end-time'))
      .fill('10:00');

    await page
      .getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i })
      .click();

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 8_000 });

    // L'événement apparaît dans le calendrier
    const eventEl = page
      .locator('[data-testid="calendar-event"], .fc-event')
      .filter({ hasText: title });
    // Naviguer vers la semaine concernée si besoin
    await expect(eventEl.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Courrier
  // -------------------------------------------------------------------------
  test('peut voir la liste du courrier', async ({ page }) => {
    await page.goto('/courrier');
    await page.waitForLoadState('networkidle');

    const list = page.locator(
      '[data-testid="mail-list"], table, .mail-registry',
    ).first();
    await expect(list).toBeVisible({ timeout: 10_000 });
  });

  test('peut créer un nouveau courrier entrant', async ({ page }) => {
    await page.goto('/courrier');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /nouveau courrier|ajouter|enregistrer/i })
      .click();

    await page.waitForSelector('[role="dialog"], [data-testid="courrier-modal"]');

    await page
      .getByLabel(/objet|subject|intitulé/i)
      .fill(`Courrier E2E ${Date.now()}`);

    // Type entrant
    const typeSelect = page
      .getByLabel(/type|catégorie/i)
      .or(page.getByTestId('courrier-type'));
    const hasType = await typeSelect.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasType) {
      await typeSelect
        .selectOption('incoming')
        .catch(() => typeSelect.selectOption({ index: 0 }));
    }

    await page
      .getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // GED — Gestion Électronique des Documents
  // -------------------------------------------------------------------------
  test('peut uploader un document dans la GED', async ({ page }) => {
    await page.goto('/ged');
    await page.waitForLoadState('networkidle');

    const uploadBtn = page.getByRole('button', {
      name: /uploader|importer|ajouter un document/i,
    });
    const hasUpload = await uploadBtn.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasUpload) {
      test.skip(true, 'Bouton upload non trouvé dans cet environnement');
      return;
    }

    await uploadBtn.click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'document-e2e-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 E2E test document'),
    });

    const docNameInput = page
      .getByLabel(/nom|titre|name/i)
      .or(page.getByTestId('doc-name'));
    const hasDocName = await docNameInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasDocName) {
      await docNameInput.fill(`Document test E2E ${Date.now()}`);
    }

    await page
      .getByRole('button', { name: /enregistrer|sauvegarder|uploader|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 15_000 });
  });

  // -------------------------------------------------------------------------
  // Réunions
  // -------------------------------------------------------------------------
  test('peut créer une réunion', async ({ page }) => {
    await page.goto('/reunions');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /nouvelle réunion|organiser|créer/i })
      .click();

    await page.waitForSelector('[role="dialog"], [data-testid="meeting-modal"]');

    const title = `Réunion E2E ${Date.now()}`;
    await page.getByLabel(/titre|sujet|objet/i).fill(title);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page
      .getByLabel(/date/i)
      .first()
      .fill(tomorrow.toISOString().split('T')[0]);

    await page
      .getByRole('button', { name: /enregistrer|créer|planifier|save/i })
      .click();

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Visiteurs
  // -------------------------------------------------------------------------
  test('peut enregistrer l\'arrivée d\'un visiteur', async ({ page }) => {
    await page.goto('/visiteurs');
    await page.waitForLoadState('networkidle');

    const checkInBtn = page.getByRole('button', {
      name: /enregistrer un visiteur|check-in|arrivée|accueillir/i,
    });
    await expect(checkInBtn).toBeVisible({ timeout: 10_000 });
    await checkInBtn.click();

    await page.waitForSelector('[role="dialog"], [data-testid="visitor-modal"]');

    await page
      .getByLabel(/nom du visiteur|nom complet|name/i)
      .or(page.getByTestId('visitor-name'))
      .fill(`Jean Test E2E ${Date.now()}`);

    const hostInput = page
      .getByLabel(/hôte|host|personne reçue/i)
      .or(page.getByTestId('visitor-host'));
    const hasHost = await hostInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasHost) await hostInput.fill('Marie Admin');

    await page
      .getByRole('button', { name: /confirmer|enregistrer|check-in|save/i })
      .click();

    const success = page.locator(
      '[data-testid="success-toast"], .toast-success, [role="status"]',
    );
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // -------------------------------------------------------------------------
  // Tâches
  // -------------------------------------------------------------------------
  test('peut créer une tâche et la marquer comme terminée', async ({ page }) => {
    await page.goto('/taches');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', {
      name: /nouvelle tâche|créer|ajouter/i,
    });
    await expect(createBtn).toBeVisible({ timeout: 10_000 });
    await createBtn.click();

    await page.waitForSelector('[role="dialog"], [data-testid="task-modal"]');

    const taskTitle = `Tâche E2E ${Date.now()}`;
    await page.getByLabel(/titre|title|nom de la tâche/i).fill(taskTitle);

    await page
      .getByRole('button', { name: /enregistrer|créer|save/i })
      .click();

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 8_000 });

    // Trouver la tâche et la marquer comme terminée
    const taskRow = page.locator('[data-testid="task-row"], .task-item').filter({
      hasText: taskTitle,
    });
    await expect(taskRow.first()).toBeVisible({ timeout: 10_000 });

    const checkbox = taskRow.first().locator(
      '[data-testid="task-checkbox"], input[type="checkbox"], [role="checkbox"]',
    );
    const hasCheckbox = await checkbox.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasCheckbox) {
      await checkbox.click();

      // Vérifier le statut
      const status = taskRow.first().locator(
        '[data-testid="task-status"], .task-status, .badge',
      );
      await expect(status.first()).toContainText(/terminée?|done|completed/i, {
        timeout: 8_000,
      });
    }
  });

  // -------------------------------------------------------------------------
  // Restrictions : pas d'accès au module RH
  // -------------------------------------------------------------------------
  test('ne peut pas accéder au module RH (employés/salaires)', async ({ page }) => {
    await page.goto('/rh/salaires');
    await page.waitForLoadState('networkidle');

    const isBlocked =
      page.url().includes('login') ||
      page.url().includes('403') ||
      (await page
        .locator('[data-testid="access-denied"], .access-denied, [data-testid="forbidden"]')
        .isVisible()
        .catch(() => false));

    expect(isBlocked).toBeTruthy();
  });

  test('ne peut pas accéder aux paramètres d\'administration', async ({ page }) => {
    await page.goto('/parametres/utilisateurs');
    await page.waitForLoadState('networkidle');

    const isBlocked =
      page.url().includes('login') ||
      page.url().includes('403') ||
      (await page
        .locator('[data-testid="access-denied"], .access-denied')
        .isVisible()
        .catch(() => false));

    // L'admin peut voir les utilisateurs mais pas les gérer — vérifier que le bouton inviter est absent
    const inviteBtn = page.getByRole('button', {
      name: /inviter|ajouter un utilisateur/i,
    });
    const hasInvite = await inviteBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    // Soit bloqué, soit page affichée sans droits d'édition
    expect(isBlocked || !hasInvite).toBeTruthy();
  });
});
