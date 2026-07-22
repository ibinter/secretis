/**
 * courrier.spec.ts
 * Tests E2E — Module Courrier SECRETIS ERP
 *
 * Couvre :
 *  - Enregistrer un courrier entrant → référence auto-générée
 *  - Assigner un courrier → statut "en traitement"
 *  - Traiter un courrier → statut "traité"
 *  - Archiver un courrier
 *  - Rechercher par référence
 *  - Export PDF
 */
import { test, expect } from '../fixtures/auth.fixture';
import { createCourrier, deleteCourrier } from '../helpers/api.helper';

test.use({ storageState: 'e2e/.auth/admin.json' });

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function openNewCourrierModal(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /nouveau courrier|enregistrer|ajouter/i }).click();
  await page.waitForSelector('[role="dialog"], [data-testid="courrier-modal"]');
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

test.describe('Courrier — Gestion du registre', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courrier');
    await page.waitForLoadState('networkidle');
  });

  // --------------------------------------------------------------------
  // 1. Enregistrer un courrier entrant → référence auto-générée
  // --------------------------------------------------------------------
  test('enregistrer un courrier entrant → référence générée automatiquement', async ({ page }) => {
    await openNewCourrierModal(page);

    // Remplir le formulaire
    await page.getByLabel(/objet|sujet|subject/i).fill(`Courrier test ${Date.now()}`);

    // Type : entrant
    const typeSelect = page.getByLabel(/type|direction/i).or(page.getByTestId('courrier-type'));
    await typeSelect.selectOption('incoming');

    // Expéditeur
    await page.getByLabel(/expéditeur|sender|de/i).fill('Ministère du Commerce');

    // Date
    await page.getByLabel(/date|reçu le/i).first().fill(new Date().toISOString().split('T')[0]);

    // Soumettre
    await page.getByRole('button', { name: /enregistrer|sauvegarder|créer/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

    // La référence est visible dans la liste (format : CR-2024-XXXX ou similaire)
    const refCell = page.locator('[data-testid="courrier-reference"], .courrier-ref, td').filter({
      hasText: /CR-|REF-|\d{4}-/,
    });
    await expect(refCell.first()).toBeVisible({ timeout: 10_000 });
  });

  // --------------------------------------------------------------------
  // 2. Assigner un courrier → statut "en traitement"
  // --------------------------------------------------------------------
  test('assigner un courrier → statut "en traitement"', async ({ page }) => {
    // Créer un courrier via API
    const courrier = await createCourrier(page.request, {
      subject: `Assignation test ${Date.now()}`,
      type: 'incoming',
      sender: 'Direction Générale',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ouvrir le courrier
    const courrierRow = page
      .locator(`[data-testid="courrier-row"][data-id="${courrier.id}"], tr`)
      .filter({ hasText: courrier.reference ?? courrier.subject })
      .first();
    await courrierRow.click();

    await page.waitForSelector('[role="dialog"], [data-testid="courrier-detail"]');

    // Assigner à un utilisateur
    const assignBtn = page.getByRole('button', { name: /assigner|affecter|assign/i });
    await assignBtn.click();

    // Choisir le premier utilisateur disponible
    const userOption = page.locator('[data-testid="user-option"], [role="option"]').first();
    await userOption.click();

    // Confirmer
    const confirmAssign = page.getByRole('button', { name: /assigner|confirmer|valider/i });
    const hasConfirm = await confirmAssign.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasConfirm) await confirmAssign.click();

    // Statut mis à jour
    const statusBadge = page.locator('[data-testid="courrier-status"], .status-badge');
    await expect(statusBadge).toContainText(/en traitement|in progress|assigned/i, { timeout: 10_000 });

    // Nettoyage
    await deleteCourrier(page.request, courrier.id);
  });

  // --------------------------------------------------------------------
  // 3. Traiter un courrier → statut "traité"
  // --------------------------------------------------------------------
  test('traiter un courrier → statut "traité"', async ({ page }) => {
    const courrier = await createCourrier(page.request, {
      subject: `Traitement test ${Date.now()}`,
      type: 'incoming',
      sender: 'Service Comptabilité',
      status: 'in_progress',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const courrierRow = page
      .locator(`tr, [data-testid="courrier-row"]`)
      .filter({ hasText: courrier.subject })
      .first();
    await courrierRow.click();

    await page.waitForSelector('[role="dialog"], [data-testid="courrier-detail"]');

    // Bouton "Marquer comme traité"
    await page.getByRole('button', { name: /traité|marquer traité|mark processed/i }).click();

    // Optionnel : commentaire de traitement
    const commentInput = page.getByLabel(/commentaire|note|observation/i);
    const hasComment = await commentInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasComment) await commentInput.fill('Traité dans les délais réglementaires.');

    const confirmBtn = page.getByRole('button', { name: /valider|confirmer|ok/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    const statusBadge = page.locator('[data-testid="courrier-status"], .status-badge');
    await expect(statusBadge).toContainText(/traité|processed|done/i, { timeout: 10_000 });

    await deleteCourrier(page.request, courrier.id);
  });

  // --------------------------------------------------------------------
  // 4. Archiver un courrier
  // --------------------------------------------------------------------
  test('archiver un courrier → statut "archivé"', async ({ page }) => {
    const courrier = await createCourrier(page.request, {
      subject: `Archivage test ${Date.now()}`,
      type: 'incoming',
      sender: 'Archives Nationales',
      status: 'processed',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const courrierRow = page
      .locator(`tr, [data-testid="courrier-row"]`)
      .filter({ hasText: courrier.subject })
      .first();

    // Clic droit ou menu action
    await courrierRow.click({ button: 'right' });
    const archiveOption = page.getByRole('menuitem', { name: /archiver|archive/i });
    const hasCtxMenu = await archiveOption.isVisible({ timeout: 2_000 }).catch(() => false);

    if (hasCtxMenu) {
      await archiveOption.click();
    } else {
      // Ou via le bouton dans le détail
      await courrierRow.click();
      await page.waitForSelector('[role="dialog"], [data-testid="courrier-detail"]');
      await page.getByRole('button', { name: /archiver|archive/i }).click();
    }

    // Confirmation si nécessaire
    const confirmBtn = page.getByRole('button', { name: /confirmer|oui|yes/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    const statusBadge = page.locator('[data-testid="courrier-status"], .status-badge');
    await expect(statusBadge).toContainText(/archivé|archived/i, { timeout: 10_000 });

    await deleteCourrier(page.request, courrier.id);
  });

  // --------------------------------------------------------------------
  // 5. Rechercher un courrier par référence
  // --------------------------------------------------------------------
  test('rechercher un courrier par référence → résultat trouvé', async ({ page }) => {
    const courrier = await createCourrier(page.request, {
      subject: `Recherche test ${Date.now()}`,
      type: 'incoming',
      sender: 'Service Test',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Champ de recherche
    const searchInput = page.getByPlaceholder(/rechercher|search|référence/i).or(
      page.getByRole('searchbox'),
    );
    await searchInput.fill(courrier.reference ?? courrier.subject);

    // Attendre les résultats
    await page.waitForTimeout(500); // debounce

    const results = page
      .locator(`tr, [data-testid="courrier-row"]`)
      .filter({ hasText: courrier.reference ?? courrier.subject });
    await expect(results.first()).toBeVisible({ timeout: 10_000 });

    await deleteCourrier(page.request, courrier.id);
  });

  // --------------------------------------------------------------------
  // 6. Export PDF d'un courrier
  // --------------------------------------------------------------------
  test('export PDF d\'un courrier → fichier téléchargé', async ({ page }) => {
    const courrier = await createCourrier(page.request, {
      subject: `Export PDF test ${Date.now()}`,
      type: 'incoming',
      sender: 'Direction Export',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const courrierRow = page
      .locator(`tr, [data-testid="courrier-row"]`)
      .filter({ hasText: courrier.subject })
      .first();
    await courrierRow.click();

    await page.waitForSelector('[role="dialog"], [data-testid="courrier-detail"]');

    // Déclencher le téléchargement
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /pdf|exporter|télécharger/i }).click(),
    ]);

    // Vérifier que le fichier a bien été téléchargé
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    expect((await download.path()) || '').toBeTruthy();

    await deleteCourrier(page.request, courrier.id);
  });
});
