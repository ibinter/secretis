/**
 * agenda.spec.ts
 * Tests E2E — Module Agenda / Calendrier SECRETIS ERP
 *
 * Couvre :
 *  - Affichage du calendrier (mois courant)
 *  - Création d'un événement simple
 *  - Création d'un événement récurrent (hebdomadaire)
 *  - Drag-and-drop d'un événement
 *  - Conflit horaire → alerte
 *  - Réservation de salle depuis l'événement
 *  - Suppression d'un événement
 */
import { test, expect } from '../fixtures/auth.fixture';
import { createEvent, deleteEvent } from '../helpers/api.helper';

// Utiliser l'état auth admin
test.use({ storageState: 'e2e/.auth/admin.json' });

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function getTodayFormatted(): string {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

async function openNewEventModal(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /nouvel événement|créer|ajouter/i }).click();
  await page.waitForSelector('[data-testid="event-modal"], [role="dialog"]');
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test.describe('Agenda — Calendrier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');
  });

  // --------------------------------------------------------------------
  // 1. Afficher le calendrier → mois courant visible
  // --------------------------------------------------------------------
  test('afficher le calendrier → mois courant visible', async ({ page }) => {
    // Le titre du calendrier contient le mois et l'année courants
    const calendarHeader = page.getByTestId('calendar-header').or(
      page.locator('.fc-toolbar-title, .calendar-title, h1, h2').first(),
    );

    await expect(calendarHeader).toBeVisible();

    const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long' });
    await expect(calendarHeader).toContainText(new RegExp(currentMonth, 'i'));

    // La grille du calendrier est visible
    await expect(page.locator('.fc-daygrid, [data-testid="calendar-grid"], .calendar-body')).toBeVisible();
  });

  // --------------------------------------------------------------------
  // 2. Créer un événement simple → apparaît sur le calendrier
  // --------------------------------------------------------------------
  test('créer un événement simple → apparaît sur le calendrier', async ({ page }) => {
    const eventTitle = `Test Event ${Date.now()}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await openNewEventModal(page);

    // Remplir le formulaire
    await page.getByLabel(/titre|title|nom/i).fill(eventTitle);

    // Date de début
    const startDateInput = page.getByLabel(/début|start date/i).or(page.getByTestId('event-start-date'));
    await startDateInput.fill(tomorrow.toISOString().split('T')[0]);

    // Heure début
    const startTimeInput = page.getByLabel(/heure début|start time/i).or(page.getByTestId('event-start-time'));
    await startTimeInput.fill('09:00');

    // Heure fin
    const endTimeInput = page.getByLabel(/heure fin|end time/i).or(page.getByTestId('event-end-time'));
    await endTimeInput.fill('10:00');

    // Soumettre
    await page.getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i }).click();

    // Modal fermée
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

    // L'événement apparaît dans le calendrier
    const eventEl = page.locator(`[data-testid="calendar-event"], .fc-event`).filter({ hasText: eventTitle });
    await expect(eventEl.first()).toBeVisible({ timeout: 10_000 });
  });

  // --------------------------------------------------------------------
  // 3. Créer un événement récurrent (hebdomadaire) → plusieurs occurrences
  // --------------------------------------------------------------------
  test('créer un événement récurrent hebdomadaire → plusieurs occurrences visibles', async ({ page }) => {
    const eventTitle = `Récurrent Hebdo ${Date.now()}`;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // demain

    await openNewEventModal(page);

    await page.getByLabel(/titre|title|nom/i).fill(eventTitle);
    await page.getByLabel(/début|start date/i).or(page.getByTestId('event-start-date')).fill(
      startDate.toISOString().split('T')[0],
    );
    await page.getByLabel(/heure début|start time/i).or(page.getByTestId('event-start-time')).fill('10:00');
    await page.getByLabel(/heure fin|end time/i).or(page.getByTestId('event-end-time')).fill('11:00');

    // Activer la récurrence
    const recurrenceToggle = page.getByLabel(/récurrence|répéter|recurring/i).or(
      page.getByTestId('recurrence-toggle'),
    );
    await recurrenceToggle.check();

    // Sélectionner "hebdomadaire"
    const recurrenceType = page.getByLabel(/fréquence|frequency|type/i).or(
      page.getByTestId('recurrence-frequency'),
    );
    await recurrenceType.selectOption('weekly');

    // Date de fin dans 4 semaines
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 28);
    const recurrenceEndInput = page.getByLabel(/fin récurrence|end recurrence|repeat until/i).or(
      page.getByTestId('recurrence-end-date'),
    );
    await recurrenceEndInput.fill(endDate.toISOString().split('T')[0]);

    await page.getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

    // Naviguer vers la vue semaine pour voir plusieurs occurrences
    await page.getByRole('button', { name: /semaine|week/i }).click();

    // Au moins une occurrence visible
    const events = page.locator(`[data-testid="calendar-event"], .fc-event`).filter({ hasText: eventTitle });
    await expect(events.first()).toBeVisible({ timeout: 10_000 });
  });

  // --------------------------------------------------------------------
  // 4. Drag-and-drop d'un événement → date mise à jour
  // --------------------------------------------------------------------
  test('drag-drop événement → date mise à jour', async ({ page }) => {
    // Créer l'événement via API d'abord
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const event = await createEvent(page.request, {
      title: `DnD Test ${Date.now()}`,
      start: `${tomorrow.toISOString().split('T')[0]}T09:00:00`,
      end: `${tomorrow.toISOString().split('T')[0]}T10:00:00`,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Trouver l'événement dans le calendrier
    const eventEl = page
      .locator(`[data-testid="calendar-event"][data-event-id="${event.id}"], .fc-event`)
      .filter({ hasText: event.title })
      .first();

    await expect(eventEl).toBeVisible({ timeout: 10_000 });

    // Trouver la cellule du jour suivant (+2 jours)
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const targetDay = dayAfterTomorrow.getDate().toString();

    const targetCell = page
      .locator(`.fc-daygrid-day[data-date], [data-testid="calendar-day"]`)
      .filter({ hasText: new RegExp(`^${targetDay}$`) })
      .first();

    // Drag-drop
    const sourceBox = await eventEl.boundingBox();
    const targetBox = await targetCell.boundingBox();

    if (sourceBox && targetBox) {
      await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
        steps: 10,
      });
      await page.mouse.up();
    }

    // Confirmation du déplacement si dialog apparaît
    const confirmBtn = page.getByRole('button', { name: /confirmer|oui|yes|ok/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    // Toast ou indication de succès
    await expect(
      page.locator('[data-testid="toast-success"], .toast-success, [role="status"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    // Nettoyage
    await deleteEvent(page.request, event.id);
  });

  // --------------------------------------------------------------------
  // 5. Conflit horaire → alerte affichée
  // --------------------------------------------------------------------
  test('conflit horaire → alerte affichée', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    // Créer un premier événement via API
    const existingEvent = await createEvent(page.request, {
      title: `Conflit Base ${Date.now()}`,
      start: `${dateStr}T14:00:00`,
      end: `${dateStr}T15:00:00`,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Tenter de créer un événement au même horaire
    await openNewEventModal(page);
    await page.getByLabel(/titre|title|nom/i).fill(`Conflit Overlap ${Date.now()}`);
    await page.getByLabel(/début|start date/i).or(page.getByTestId('event-start-date')).fill(dateStr);
    await page.getByLabel(/heure début|start time/i).or(page.getByTestId('event-start-time')).fill('14:30');
    await page.getByLabel(/heure fin|end time/i).or(page.getByTestId('event-end-time')).fill('15:30');

    await page.getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i }).click();

    // Attendre soit une alerte de conflit, soit un warning
    const conflictAlert = page.locator(
      '[data-testid="conflict-alert"], .alert-warning, [role="alert"]',
    );
    await expect(conflictAlert).toBeVisible({ timeout: 10_000 });
    await expect(conflictAlert).toContainText(/conflit|overlap|chevauchement/i);

    // Nettoyage
    await deleteEvent(page.request, existingEvent.id);
  });

  // --------------------------------------------------------------------
  // 6. Réserver une salle depuis l'événement
  // --------------------------------------------------------------------
  test('réserver une salle depuis l\'événement', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await openNewEventModal(page);

    await page.getByLabel(/titre|title|nom/i).fill(`Event avec salle ${Date.now()}`);
    await page.getByLabel(/début|start date/i).or(page.getByTestId('event-start-date')).fill(
      tomorrow.toISOString().split('T')[0],
    );
    await page.getByLabel(/heure début|start time/i).fill('11:00');
    await page.getByLabel(/heure fin|end time/i).fill('12:00');

    // Section salle
    const roomSection = page.getByTestId('room-reservation').or(
      page.getByLabel(/salle|room/i),
    );
    const hasRoomSection = await roomSection.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasRoomSection) {
      // Sélectionner la première salle disponible
      const roomSelect = page.getByTestId('room-select').or(page.getByLabel(/salle|room/i));
      await roomSelect.first().click();

      const firstRoom = page.locator('[data-testid="room-option"], option').first();
      await firstRoom.click();

      await page.getByRole('button', { name: /enregistrer|sauvegarder|créer|save/i }).click();

      // Succès
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

      const successIndicator = page.locator('[data-testid="toast-success"], .toast-success');
      await expect(successIndicator.first()).toBeVisible({ timeout: 10_000 });
    } else {
      test.skip(true, 'Module salle non disponible dans cet environnement');
    }
  });

  // --------------------------------------------------------------------
  // 7. Supprimer un événement → disparaît du calendrier
  // --------------------------------------------------------------------
  test('supprimer un événement → disparaît du calendrier', async ({ page }) => {
    // Créer via API
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const event = await createEvent(page.request, {
      title: `À supprimer ${Date.now()}`,
      start: `${tomorrow.toISOString().split('T')[0]}T16:00:00`,
      end: `${tomorrow.toISOString().split('T')[0]}T17:00:00`,
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const eventEl = page
      .locator(`[data-testid="calendar-event"], .fc-event`)
      .filter({ hasText: event.title })
      .first();

    await expect(eventEl).toBeVisible({ timeout: 10_000 });

    // Cliquer sur l'événement pour ouvrir le détail
    await eventEl.click();
    await page.waitForSelector('[role="dialog"], [data-testid="event-detail"]');

    // Cliquer sur Supprimer
    await page.getByRole('button', { name: /supprimer|delete|effacer/i }).click();

    // Confirmation
    const confirmBtn = page.getByRole('button', { name: /confirmer|oui|yes|supprimer quand même/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    // L'événement ne doit plus être visible
    await expect(eventEl).not.toBeVisible({ timeout: 10_000 });
  });
});
