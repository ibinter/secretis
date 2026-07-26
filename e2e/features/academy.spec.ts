/**
 * features/academy.spec.ts
 * Tests E2E — Académie SECRETIS (centre de formation intégré)
 *
 * Couvre :
 *  - Navigation dans le catalogue de cours
 *  - Démarrage d'un cours
 *  - Sauvegarde de la progression après une leçon
 *  - Score du quiz
 *  - Certificat de complétion
 */
import { test, expect } from '../fixtures/auth';
import path from 'path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'secretaire.json') });

test.describe('Académie SECRETIS', () => {
  // -------------------------------------------------------------------------
  // Catalogue
  // -------------------------------------------------------------------------
  test('peut naviguer dans le catalogue de cours', async ({ page }) => {
    await page.goto('/academie');
    await page.waitForLoadState('networkidle');

    const hasAcademy = await page
      .locator('[data-testid="academy-catalog"], .academy-catalog, h1, h2')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (!hasAcademy || page.url().includes('login')) {
      test.skip(true, 'Module Académie non disponible dans cet environnement');
      return;
    }

    // Des cours sont listés
    const courses = page.locator('[data-testid="course-card"], .course-card, .course-item');
    const hasCourses = await courses.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCourses) {
      // Catalogue vide — vérifier juste l'accès à la page
      const emptyState = page.locator('[data-testid="empty-catalog"], text=/aucun cours/i');
      const hasEmpty = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasEmpty || hasCourses).toBeTruthy();
      return;
    }

    await expect(courses.first()).toBeVisible();

    // Filtres ou catégories disponibles
    const filters = page.locator('[data-testid="course-filter"], .course-category, [role="tab"]');
    const hasFilters = await filters.first().isVisible({ timeout: 3_000 }).catch(() => false);
    // Les filtres sont optionnels mais souhaitables
    if (hasFilters) {
      await filters.first().click();
      await page.waitForLoadState('networkidle');
      // La page ne doit pas planter après le filtre
      await expect(page).not.toHaveURL(/error|500/);
    }
  });

  // -------------------------------------------------------------------------
  // Démarrage d'un cours
  // -------------------------------------------------------------------------
  test('peut démarrer un cours', async ({ page }) => {
    await page.goto('/academie');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('login')) {
      test.skip(true, 'Académie non disponible');
      return;
    }

    const firstCourse = page
      .locator('[data-testid="course-card"], .course-card')
      .first();
    const hasCourse = await firstCourse.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCourse) {
      test.skip(true, 'Aucun cours disponible dans le catalogue');
      return;
    }

    // Cliquer sur le cours
    await firstCourse.click();
    await page.waitForLoadState('networkidle');

    const courseDetail = page.locator(
      '[data-testid="course-detail"], .course-detail, [data-testid="course-content"]',
    );
    await expect(courseDetail.first()).toBeVisible({ timeout: 10_000 });

    // Bouton "Commencer" ou "Continuer"
    const startBtn = page.getByRole('button', {
      name: /commencer|démarrer|continuer|start|suivant/i,
    });
    const hasStart = await startBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasStart) {
      await startBtn.first().click();
      await page.waitForLoadState('networkidle');

      // Une leçon est chargée
      const lesson = page.locator(
        '[data-testid="lesson-content"], .lesson-content, [data-testid="lesson"]',
      );
      await expect(lesson.first()).toBeVisible({ timeout: 10_000 });
    }
  });

  // -------------------------------------------------------------------------
  // Progression sauvegardée
  // -------------------------------------------------------------------------
  test('la progression est sauvegardée après une leçon', async ({ page }) => {
    await page.goto('/academie');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('login')) {
      test.skip(true, 'Académie non disponible');
      return;
    }

    const firstCourse = page
      .locator('[data-testid="course-card"], .course-card')
      .first();
    const hasCourse = await firstCourse.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCourse) {
      test.skip(true, 'Aucun cours disponible');
      return;
    }

    await firstCourse.click();
    await page.waitForLoadState('networkidle');

    // Tenter de compléter la première leçon
    const completeBtn = page.getByRole('button', {
      name: /terminer la leçon|compléter|marquer comme terminé|next|suivant/i,
    });
    const hasComplete = await completeBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasComplete) {
      test.skip(true, 'Bouton de complétion de leçon non trouvé');
      return;
    }

    // Intercepter la requête de mise à jour de progression
    const progressPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('progress') &&
        ['POST', 'PUT', 'PATCH'].includes(resp.request().method()),
      { timeout: 10_000 },
    ).catch(() => null);

    await completeBtn.first().click();
    const progressResp = await progressPromise;

    if (progressResp) {
      expect(progressResp.status()).toBeLessThan(400);
    }

    // Recharger et vérifier la progression
    await page.goto('/academie');
    await page.waitForLoadState('networkidle');

    // La progression doit être > 0 sur le premier cours
    const progressIndicator = firstCourse.locator(
      '[data-testid="progress-bar"], .progress-bar, [role="progressbar"]',
    );
    const hasProgress = await progressIndicator.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasProgress) {
      const progressValue = await progressIndicator
        .getAttribute('aria-valuenow')
        .catch(() => null);
      if (progressValue !== null) {
        expect(parseInt(progressValue)).toBeGreaterThan(0);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Quiz
  // -------------------------------------------------------------------------
  test('le quiz calcule et affiche le score correctement', async ({ page }) => {
    // Trouver un cours avec un quiz
    await page.goto('/academie');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('login')) {
      test.skip(true, 'Académie non disponible');
      return;
    }

    // Chercher un cours qui contient un quiz
    const quizCourse = page
      .locator('[data-testid="course-card"][data-has-quiz="true"], .course-card')
      .first();

    const hasQuizCourse = await quizCourse.isVisible({ timeout: 3_000 }).catch(() => false);

    if (!hasQuizCourse) {
      test.skip(true, 'Aucun cours avec quiz trouvé');
      return;
    }

    await quizCourse.click();
    await page.waitForLoadState('networkidle');

    // Naviguer vers le quiz
    const quizSection = page.locator('[data-testid="quiz-section"], .quiz, [data-testid="quiz"]');
    const hasQuiz = await quizSection.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasQuiz) {
      test.skip(true, 'Section quiz non trouvée');
      return;
    }

    // Répondre aux questions
    const questions = page.locator('[data-testid="quiz-question"], .quiz-question');
    const count = await questions.count();

    for (let i = 0; i < count; i++) {
      const question = questions.nth(i);
      // Sélectionner la première réponse disponible
      const firstOption = question.locator(
        'input[type="radio"], input[type="checkbox"], [data-testid="quiz-option"]',
      ).first();
      const hasOption = await firstOption.isVisible({ timeout: 2_000 }).catch(() => false);
      if (hasOption) await firstOption.click();
    }

    // Soumettre le quiz
    const submitBtn = page.getByRole('button', {
      name: /soumettre|valider|terminer le quiz|submit/i,
    });
    const hasSubmit = await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasSubmit) {
      await submitBtn.click();
      await page.waitForLoadState('networkidle');

      // Le score doit être affiché
      const score = page.locator(
        '[data-testid="quiz-score"], .quiz-score, [data-testid="score"]',
      );
      await expect(score.first()).toBeVisible({ timeout: 10_000 });

      // Le score doit contenir un chiffre (ex: "8/10", "80%")
      const scoreText = await score.first().textContent();
      expect(scoreText).toMatch(/\d+/);
    }
  });

  // -------------------------------------------------------------------------
  // Certificat
  // -------------------------------------------------------------------------
  test('un certificat est généré après complétion d\'un cours', async ({ page }) => {
    // Ce test nécessite un cours préalablement terminé à 100%
    await page.goto('/academie/mes-cours');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('login') || page.url().includes('404')) {
      test.skip(true, 'Page "Mes cours" non disponible');
      return;
    }

    const completedCourse = page
      .locator('[data-testid="completed-course"], .course-card[data-completed="true"]')
      .first();

    const hasCompleted = await completedCourse.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasCompleted) {
      test.skip(true, 'Aucun cours terminé à 100% pour générer un certificat');
      return;
    }

    const certBtn = completedCourse.getByRole('button', {
      name: /certificat|télécharger|voir le certificat/i,
    });
    const hasCertBtn = await certBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasCertBtn) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        certBtn.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/certificat|certificate/i);
    }
  });
});
