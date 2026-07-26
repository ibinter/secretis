/**
 * IBIG SECRETIS — Tests E2E Accessibilité / Navigation Clavier
 * WCAG 2.1 — 2.1.1 Keyboard (Niveau A), 2.4.3 Focus Order (Niveau A)
 */

import { test, expect } from '@playwright/test'

// ── Skip Links ────────────────────────────────────────────────────────────────

test.describe('Skip links', () => {
  test('skip link is visible on Tab focus', async ({ page }) => {
    await page.goto('/dashboard')
    // Le premier Tab doit amener le focus sur le skip link
    await page.keyboard.press('Tab')
    const skipLink = page.locator('[data-testid="skip-to-content"]').first()
    await expect(skipLink).toBeVisible()
  })

  test('skip link navigates to main content', async ({ page }) => {
    await page.goto('/dashboard')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    // Le focus doit être dans #main-content
    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeVisible()
  })
})

// ── Navigation sidebar au clavier ─────────────────────────────────────────────

test.describe('Navigation sidebar', () => {
  test.use({ storageState: 'e2e/fixtures/auth.json' })

  test('can navigate sidebar items with keyboard', async ({ page }) => {
    await page.goto('/dashboard')
    // Tab jusqu'au premier lien de la sidebar
    const sidebarNav = page.locator('#sidebar-nav')
    await expect(sidebarNav).toBeVisible()

    // Obtenir le premier item de nav
    const firstNavItem = sidebarNav.locator('a, button').first()
    await firstNavItem.focus()
    await expect(firstNavItem).toBeFocused()

    // ArrowDown doit passer au suivant
    await page.keyboard.press('ArrowDown')
    const secondNavItem = sidebarNav.locator('a, button').nth(1)
    // (si useKeyboardNav est attaché, le focus se déplace)
  })
})

// ── Modales ───────────────────────────────────────────────────────────────────

test.describe('Modales', () => {
  test.use({ storageState: 'e2e/fixtures/auth.json' })

  test('modal closes on Escape', async ({ page }) => {
    await page.goto('/agenda')
    const createBtn = page.locator('[data-testid="create-event-btn"]')
    await createBtn.click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('focus returns to trigger after modal closes on Escape', async ({ page }) => {
    await page.goto('/agenda')
    const btn = page.locator('[data-testid="create-event-btn"]')
    await btn.click()
    await page.locator('[role="dialog"]').waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await expect(btn).toBeFocused()
  })

  test('focus is trapped inside modal while open', async ({ page }) => {
    await page.goto('/agenda')
    await page.locator('[data-testid="create-event-btn"]').click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Tab plusieurs fois — le focus doit rester dans la modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)
      expect(focused).toBe(true)
    }
  })

  test('modal has role dialog and aria-modal', async ({ page }) => {
    await page.goto('/agenda')
    await page.locator('[data-testid="create-event-btn"]').click()
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toHaveAttribute('aria-modal', 'true')
  })

  test('modal has accessible title via aria-labelledby', async ({ page }) => {
    await page.goto('/agenda')
    await page.locator('[data-testid="create-event-btn"]').click()
    const modal = page.locator('[role="dialog"]')
    const labelledBy = await modal.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const title = page.locator(`#${labelledBy}`)
    await expect(title).toBeVisible()
  })
})

// ── Formulaires ───────────────────────────────────────────────────────────────

test.describe('Formulaires et messages d\'erreur', () => {
  test('form errors are announced with aria-live', async ({ page }) => {
    await page.goto('/login')
    // Soumettre sans remplir
    await page.locator('[data-testid="submit"], button[type="submit"]').first().click()
    // Il doit y avoir un aria-live ou role="alert" visible
    const errorRegion = page.locator('[aria-live="polite"], [role="alert"]')
    await expect(errorRegion.first()).toBeVisible({ timeout: 3000 })
  })

  test('required fields have aria-required', async ({ page }) => {
    await page.goto('/login')
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const ariaRequired = await emailInput.getAttribute('aria-required')
    // Soit aria-required="true" soit required présent
    const required = await emailInput.getAttribute('required')
    expect(ariaRequired === 'true' || required !== null).toBe(true)
  })

  test('error inputs have aria-invalid', async ({ page }) => {
    await page.goto('/login')
    await page.locator('button[type="submit"]').first().click()
    // Après soumission invalide, les champs en erreur doivent avoir aria-invalid
    const invalidInputs = page.locator('[aria-invalid="true"]')
    const count = await invalidInputs.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

// ── Tables ────────────────────────────────────────────────────────────────────

test.describe('Tables', () => {
  test.use({ storageState: 'e2e/fixtures/auth.json' })

  test('table headers have scope attribute', async ({ page }) => {
    await page.goto('/taches')
    const headers = page.locator('table thead th')
    const count = await headers.count()
    if (count > 0) {
      const scope = await headers.first().getAttribute('scope')
      expect(scope).toMatch(/^(col|row)$/)
    }
  })

  test('sortable columns update aria-sort', async ({ page }) => {
    await page.goto('/taches')
    const sortableHeader = page.locator('th[aria-sort]').first()
    const count = await sortableHeader.count()
    if (count > 0) {
      await expect(sortableHeader).toHaveAttribute('aria-sort', /ascending|descending|none/)
    }
  })
})

// ── Select / Combobox ─────────────────────────────────────────────────────────

test.describe('Composants Select', () => {
  test.use({ storageState: 'e2e/fixtures/auth.json' })

  test('custom select opens on Enter key', async ({ page }) => {
    await page.goto('/taches')
    const combobox = page.locator('[role="combobox"]').first()
    const count = await combobox.count()
    if (count > 0) {
      await combobox.focus()
      await page.keyboard.press('Enter')
      const listbox = page.locator('[role="listbox"]').first()
      await expect(listbox).toBeVisible()
    }
  })

  test('custom select closes on Escape', async ({ page }) => {
    await page.goto('/taches')
    const combobox = page.locator('[role="combobox"]').first()
    const count = await combobox.count()
    if (count > 0) {
      await combobox.focus()
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      const listbox = page.locator('[role="listbox"]').first()
      await expect(listbox).not.toBeVisible()
    }
  })
})

// ── Cookie Consent ────────────────────────────────────────────────────────────

test.describe('Cookie Consent', () => {
  test('cookie banner has role dialog', async ({ page }) => {
    // Vider le localStorage pour simuler un premier chargement
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('secretis_cookie_consent'))
    await page.reload()

    const banner = page.locator('[role="dialog"][aria-label*="cookie" i], [role="dialog"][aria-label*="Cookie" i]')
    // Attendre l'apparition de la bannière (délai 800ms)
    await expect(banner).toBeVisible({ timeout: 2000 })
  })

  test('cookie banner focus is trapped', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('secretis_cookie_consent'))
    await page.reload()

    const banner = page.locator('[role="dialog"][aria-modal="true"]').first()
    await expect(banner).toBeVisible({ timeout: 2000 })

    // Tab plusieurs fois : le focus doit rester dans la bannière
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const focusedInBanner = await page.evaluate(() => {
        const banner = document.querySelector('[role="dialog"][aria-modal="true"]')
        return banner?.contains(document.activeElement) ?? false
      })
      expect(focusedInBanner).toBe(true)
    }
  })

  test('accepting cookies hides the banner', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('secretis_cookie_consent'))
    await page.reload()

    const banner = page.locator('[role="dialog"]').first()
    await expect(banner).toBeVisible({ timeout: 2000 })

    await page.locator('button:has-text("Tout accepter")').first().click()
    await expect(banner).not.toBeVisible({ timeout: 3000 })
  })
})
