/**
 * visiteurs.spec.ts
 * Tests E2E — Module Visiteurs SECRETIS ERP
 *
 * Couvre :
 *  - Enregistrer un visiteur → badge QR généré
 *  - Vérifier badge QR via portail public
 *  - Enregistrer le départ
 *  - Bloquer un visiteur (liste noire)
 *  - Prendre un RDV via portail public (wizard 5 étapes)
 */
import { test, expect } from '../fixtures/auth.fixture';
import { createVisitor, deleteVisitor } from '../helpers/api.helper';

// Tests admin (back-office)
test.describe('Visiteurs — Back-office', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/visiteurs');
    await page.waitForLoadState('networkidle');
  });

  // --------------------------------------------------------------------
  // 1. Enregistrer un visiteur → badge QR généré
  // --------------------------------------------------------------------
  test('enregistrer un visiteur → badge QR généré', async ({ page }) => {
    await page.getByRole('button', { name: /nouveau visiteur|enregistrer|check-in/i }).click();
    await page.waitForSelector('[role="dialog"], [data-testid="visitor-modal"]');

    const visitorName = `Jean Konan ${Date.now()}`;
    await page.getByLabel(/nom|name/i).fill(visitorName);
    await page.getByLabel(/prénom|first name/i).fill('Jean');
    await page.getByLabel(/entreprise|société|company/i).fill('Société Test CI');

    const hostInput = page.getByLabel(/personne à voir|hôte|host/i).or(
      page.getByTestId('visitor-host'),
    );
    const hasHost = await hostInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasHost) {
      await hostInput.click();
      const firstHost = page.locator('[role="option"]').first();
      await expect(firstHost).toBeVisible({ timeout: 5_000 });
      await firstHost.click();
    }

    await page.getByLabel(/téléphone|phone/i).fill('+22501234567');
    await page.getByLabel(/motif|objet|reason/i).fill('Réunion commerciale');

    await page.getByRole('button', { name: /enregistrer|check-in|valider/i }).click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5_000 });

    // Le badge QR est visible dans la vue visiteur
    const qrBadge = page.locator('[data-testid="qr-badge"], .qr-code, canvas, img[alt*="QR"]');
    await expect(qrBadge.first()).toBeVisible({ timeout: 10_000 });
  });

  // --------------------------------------------------------------------
  // 2. Vérifier badge QR via portail public
  // --------------------------------------------------------------------
  test('vérifier badge QR via portail public → badge valide', async ({ page, context }) => {
    const visitor = await createVisitor(page.request, {
      name: `Vérif QR ${Date.now()}`,
      company: 'Test Corp',
      host: 'directeur@test-secretis.ci',
      reason: 'Test E2E',
    });

    // Ouvrir le portail public dans un nouvel onglet (sans auth)
    const publicPage = await context.newPage();
    const badgeUrl = `/public/visiteurs/badge/${visitor.qr_token}`;

    await publicPage.goto(badgeUrl);
    await publicPage.waitForLoadState('networkidle');

    // Le badge est visible avec les informations du visiteur
    await expect(publicPage.getByText(visitor.name)).toBeVisible({ timeout: 10_000 });
    await expect(publicPage.locator('[data-testid="badge-status"], .badge-valid')).toContainText(
      /valide|active|en cours/i,
    );

    await publicPage.close();
    await deleteVisitor(page.request, visitor.id);
  });

  // --------------------------------------------------------------------
  // 3. Enregistrer le départ
  // --------------------------------------------------------------------
  test('enregistrer le départ → statut "sorti"', async ({ page }) => {
    const visitor = await createVisitor(page.request, {
      name: `Départ ${Date.now()}`,
      company: 'Société Départ',
      host: 'admin@test-secretis.ci',
      reason: 'Réunion',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const visitorRow = page
      .locator(`tr, [data-testid="visitor-row"]`)
      .filter({ hasText: visitor.name })
      .first();

    await visitorRow.click();
    await page.waitForSelector('[role="dialog"], [data-testid="visitor-detail"]');

    // Bouton "Enregistrer le départ" / "Check-out"
    await page.getByRole('button', { name: /départ|check-out|sortie/i }).click();

    const confirmBtn = page.getByRole('button', { name: /confirmer|valider|oui/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    const statusBadge = page.locator('[data-testid="visitor-status"], .status-badge');
    await expect(statusBadge).toContainText(/sorti|departed|checked.?out/i, { timeout: 10_000 });

    await deleteVisitor(page.request, visitor.id);
  });

  // --------------------------------------------------------------------
  // 4. Bloquer un visiteur (liste noire)
  // --------------------------------------------------------------------
  test('bloquer un visiteur → ajouté à la liste noire', async ({ page }) => {
    const visitor = await createVisitor(page.request, {
      name: `Bloqué ${Date.now()}`,
      company: 'Non Grata Inc',
      host: 'admin@test-secretis.ci',
      reason: 'Visite suspecte',
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const visitorRow = page
      .locator(`tr, [data-testid="visitor-row"]`)
      .filter({ hasText: visitor.name })
      .first();

    await visitorRow.click({ button: 'right' });
    const blockOption = page.getByRole('menuitem', { name: /bloquer|liste noire|blacklist/i });
    const hasCtxMenu = await blockOption.isVisible({ timeout: 2_000 }).catch(() => false);

    if (hasCtxMenu) {
      await blockOption.click();
    } else {
      await visitorRow.click();
      await page.waitForSelector('[role="dialog"], [data-testid="visitor-detail"]');
      await page.getByRole('button', { name: /bloquer|liste noire|blacklist/i }).click();
    }

    // Raison du blocage
    const reasonInput = page.getByLabel(/raison|motif|reason/i);
    const hasReason = await reasonInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasReason) await reasonInput.fill('Comportement inapproprié lors de la dernière visite.');

    const confirmBtn = page.getByRole('button', { name: /confirmer|bloquer|valider/i });
    const hasConfirm = await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasConfirm) await confirmBtn.click();

    // Badge "bloqué" visible
    await expect(page.locator('[data-testid="visitor-status"], .status-badge')).toContainText(
      /bloqué|blacklisted/i,
      { timeout: 10_000 },
    );

    await deleteVisitor(page.request, visitor.id);
  });
});

// -----------------------------------------------------------------------
// Tests portail public — sans auth
// -----------------------------------------------------------------------

test.describe('Visiteurs — Portail public (Wizard RDV)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // --------------------------------------------------------------------
  // 5. Prendre un RDV via portail public (wizard 5 étapes)
  // --------------------------------------------------------------------
  test('prendre un RDV via portail public — wizard 5 étapes complètes', async ({ page }) => {
    await page.goto('/public/rendez-vous');
    await page.waitForLoadState('networkidle');

    // --- Étape 1 : Informations personnelles ---
    await expect(page.locator('[data-testid="wizard-step-1"], .wizard-step.active')).toBeVisible();

    await page.getByLabel(/nom|name/i).fill('Kouakou');
    await page.getByLabel(/prénom|first name/i).fill('Patrice');
    await page.getByLabel(/email/i).fill(`visiteur-${Date.now()}@external.ci`);
    await page.getByLabel(/téléphone|phone/i).fill('+22507654321');
    await page.getByLabel(/entreprise|société|company/i).fill('Cabinet Extern CI');

    await page.getByRole('button', { name: /suivant|next|continuer/i }).click();

    // --- Étape 2 : Choisir la personne à rencontrer ---
    await expect(page.locator('[data-testid="wizard-step-2"], .wizard-step.active')).toBeVisible({
      timeout: 5_000,
    });

    const hostSelect = page.getByLabel(/personne|destinataire|host/i).or(
      page.getByTestId('host-select'),
    );
    await hostSelect.click();
    const firstHost = page.locator('[role="option"], option').first();
    await expect(firstHost).toBeVisible({ timeout: 5_000 });
    await firstHost.click();

    await page.getByRole('button', { name: /suivant|next|continuer/i }).click();

    // --- Étape 3 : Date et heure ---
    await expect(page.locator('[data-testid="wizard-step-3"], .wizard-step.active')).toBeVisible({
      timeout: 5_000,
    });

    // Choisir une date disponible (demain)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateInput = page.getByLabel(/date|jour/i).first();
    await dateInput.fill(tomorrow.toISOString().split('T')[0]);

    const timeSlot = page.locator('[data-testid="time-slot"]:not(.disabled)').first();
    const hasSlots = await timeSlot.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasSlots) {
      await timeSlot.click();
    } else {
      const timeInput = page.getByLabel(/heure|time/i).first();
      await timeInput.fill('10:00');
    }

    await page.getByRole('button', { name: /suivant|next|continuer/i }).click();

    // --- Étape 4 : Motif de la visite ---
    await expect(page.locator('[data-testid="wizard-step-4"], .wizard-step.active')).toBeVisible({
      timeout: 5_000,
    });

    await page.getByLabel(/motif|objet|sujet|reason/i).fill('Discussion partenariat commercial 2025');

    const notesInput = page.getByLabel(/notes|observations|message/i);
    const hasNotes = await notesInput.isVisible({ timeout: 2_000 }).catch(() => false);
    if (hasNotes) await notesInput.fill('Merci de préparer la salle de réunion.');

    await page.getByRole('button', { name: /suivant|next|continuer/i }).click();

    // --- Étape 5 : Confirmation ---
    await expect(page.locator('[data-testid="wizard-step-5"], .wizard-step.active')).toBeVisible({
      timeout: 5_000,
    });

    // Récapitulatif visible
    await expect(page.getByText(/Kouakou/i)).toBeVisible();

    await page.getByRole('button', { name: /confirmer|envoyer|valider|submit/i }).click();

    // Message de succès
    const successMsg = page.locator(
      '[data-testid="appointment-success"], .alert-success, [role="status"]',
    );
    await expect(successMsg).toBeVisible({ timeout: 15_000 });
    await expect(successMsg).toContainText(/confirmé|enregistré|rendez-vous|confirmation/i);

    // Un email de confirmation est mentionné
    await expect(page.getByText(/email|mail/i)).toBeVisible();
  });
});
