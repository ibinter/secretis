/**
 * security/multitenancy.spec.ts
 * Tests E2E — Isolation multi-tenant et sécurité cross-organisation
 *
 * Ces tests vérifient que le middleware ResolveTenant cloisonne
 * hermétiquement les données entre organisations.
 *
 * Vecteurs testés :
 *  - Accès direct à une ressource d'une autre org via son ID (IDOR)
 *  - Injection d'organization_id dans le payload
 *  - Manipulation du paramètre ?organization_id= en query string
 *  - Énumération d'utilisateurs cross-tenant
 *  - Mass assignment sur organization_id
 */
import { test, expect } from '../fixtures/auth';
import crypto from 'crypto';

// Tests sans storageState prédéfini — chaque test gère sa propre auth
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginOrgA(request: import('@playwright/test').APIRequestContext) {
  return request.post('/api/auth/login', {
    data: {
      email: process.env.TEST_ADMIN_EMAIL ?? 'admin@demo-secretis.ci',
      password: process.env.TEST_ADMIN_PASSWORD ?? 'Password123!',
    },
  });
}

async function loginOrgB(request: import('@playwright/test').APIRequestContext) {
  return request.post('/api/auth/login', {
    data: {
      email: process.env.TEST_ORG_B_EMAIL ?? 'admin@org-b-test.ci',
      password: process.env.TEST_ORG_B_PASSWORD ?? 'OrgB@Test2024!',
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Sécurité multi-tenant — isolation des données', () => {
  // -------------------------------------------------------------------------
  // IDOR : accès à un document d'une autre organisation
  // -------------------------------------------------------------------------
  test('org A ne peut pas lire un document de org B (IDOR)', async ({ request }) => {
    // Se connecter en org A
    const loginA = await loginOrgA(request);
    if (!loginA.ok()) {
      test.skip(true, 'Login org A échoué — environnement non configuré');
      return;
    }

    // Créer un événement dans org A pour obtenir un ID réel
    const createResp = await request.post('/api/events', {
      data: {
        title: `IDOR Test Org A ${Date.now()}`,
        start: `${new Date().toISOString().split('T')[0]}T10:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T11:00:00`,
      },
    });

    if (!createResp.ok()) {
      test.skip(true, 'Création événement échouée');
      return;
    }

    const event = await createResp.json();
    const eventId = (event.data ?? event).id;

    // Se déconnecter de org A
    await request.post('/api/auth/logout');

    // Se connecter en org B
    const loginB = await loginOrgB(request);
    if (!loginB.ok()) {
      // Nettoyage et skip
      await loginOrgA(request);
      await request.delete(`/api/events/${eventId}`);
      test.skip(true, 'Login org B échoué — org B non configurée');
      return;
    }

    // Tentative IDOR : org B lit l'événement de org A directement par ID
    const idor = await request.get(`/api/events/${eventId}`);
    expect([403, 404], `Événement org A accessible depuis org B (status ${idor.status()})`).toContain(idor.status());

    // Tentative de modification
    const updateAttempt = await request.put(`/api/events/${eventId}`, {
      data: { title: 'Modification malveillante cross-org' },
    });
    expect([403, 404]).toContain(updateAttempt.status());

    // Tentative de suppression
    const deleteAttempt = await request.delete(`/api/events/${eventId}`);
    expect([403, 404]).toContain(deleteAttempt.status());

    // Nettoyage (reconnexion org A)
    await request.post('/api/auth/logout');
    await loginOrgA(request);
    await request.delete(`/api/events/${eventId}`);
  });

  // -------------------------------------------------------------------------
  // Injection d'organization_id dans le body → ignoré
  // -------------------------------------------------------------------------
  test('injection organization_id dans le payload → org réelle utilisée', async ({ request }) => {
    const loginA = await loginOrgA(request);
    if (!loginA.ok()) {
      test.skip(true, 'Login org A échoué');
      return;
    }

    const fakeOrgId = 999_999; // ID qui n'appartient pas à l'utilisateur connecté

    const createResp = await request.post('/api/events', {
      data: {
        title: `Injection Test ${Date.now()}`,
        start: `${new Date().toISOString().split('T')[0]}T14:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T15:00:00`,
        organization_id: fakeOrgId, // tentative d'injection
      },
    });

    if (createResp.ok()) {
      const created = await createResp.json();
      const eventData = created.data ?? created;

      // L'organization_id injecté doit être ignoré
      expect(eventData.organization_id, 'organization_id injecté utilisé').not.toBe(fakeOrgId);

      // Nettoyage
      await request.delete(`/api/events/${eventData.id}`);
    } else {
      // Rejet (422/400) : le champ organization_id est interdit en input
      expect([400, 403, 422]).toContain(createResp.status());
    }
  });

  // -------------------------------------------------------------------------
  // Attaque sur le paramètre ?organization_id= en query string
  // -------------------------------------------------------------------------
  test('paramètre ?organization_id= en query string ignoré', async ({ request }) => {
    const loginA = await loginOrgA(request);
    if (!loginA.ok()) {
      test.skip(true, 'Login org A échoué');
      return;
    }

    // Tenter de forcer la lecture des événements d'une autre org via query param
    const response = await request.get('/api/events?organization_id=2');

    if (response.ok()) {
      const body = await response.json();
      const events: Array<{ organization_id: number }> = body.data ?? body;

      if (Array.isArray(events)) {
        // Tous les événements retournés doivent appartenir à l'org de l'utilisateur
        for (const event of events) {
          expect(event.organization_id, 'Événement d\'une autre org retourné').not.toBe(2);
        }
      }
    } else {
      // 400/403 est aussi acceptable (paramètre rejeté)
      expect([400, 403]).toContain(response.status());
    }
  });

  // -------------------------------------------------------------------------
  // Accès cross-tenant via le slug d'une autre organisation
  // -------------------------------------------------------------------------
  test('accès aux tâches de org B via son slug → 403/404', async ({ request }) => {
    const loginA = await loginOrgA(request);
    if (!loginA.ok()) {
      test.skip(true, 'Login org A échoué');
      return;
    }

    const orgBSlug = process.env.TEST_ORG_B_SLUG ?? 'org-b-test';
    const response = await request.get(`/api/organizations/${orgBSlug}/tasks`);

    expect([403, 404]).toContain(response.status());
  });

  // -------------------------------------------------------------------------
  // UI : org B n'est pas visible dans le calendrier de org A
  // -------------------------------------------------------------------------
  test('les données de org B ne sont pas visibles dans l\'UI de org A', async ({
    browser,
  }) => {
    const ctxA = await browser.newContext({
      baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8000',
    });
    const pageA = await ctxA.newPage();

    await pageA.goto('/login');
    await pageA.waitForLoadState('networkidle');
    await pageA.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? 'admin@demo-secretis.ci');
    await pageA.getByLabel(/mot de passe|password/i).fill(
      process.env.TEST_ADMIN_PASSWORD ?? 'Password123!',
    );
    await pageA.getByRole('button', { name: /connexion/i }).click();

    const loginOk = await pageA
      .waitForURL(/dashboard|accueil/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!loginOk) {
      await ctxA.close();
      test.skip(true, 'Login org A échoué');
      return;
    }

    // Créer un événement marqué avec une valeur unique
    const secretMarker = `SECRET_ORG_A_${Date.now()}`;
    await pageA.request.post('/api/events', {
      data: {
        title: secretMarker,
        start: `${new Date().toISOString().split('T')[0]}T09:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T10:00:00`,
      },
    });
    await ctxA.close();

    // Org B ne doit pas voir cet événement
    const ctxB = await browser.newContext({
      baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8000',
    });
    const pageB = await ctxB.newPage();

    await pageB.goto('/login');
    await pageB.waitForLoadState('networkidle');
    await pageB.getByLabel(/email/i).fill(process.env.TEST_ORG_B_EMAIL ?? 'admin@org-b-test.ci');
    await pageB.getByLabel(/mot de passe|password/i).fill(
      process.env.TEST_ORG_B_PASSWORD ?? 'OrgB@Test2024!',
    );
    await pageB.getByRole('button', { name: /connexion/i }).click();

    const loginBOk = await pageB
      .waitForURL(/dashboard|accueil/, { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!loginBOk) {
      await ctxB.close();
      test.skip(true, 'Org B non configurée dans cet environnement');
      return;
    }

    await pageB.goto('/agenda');
    await pageB.waitForLoadState('networkidle');

    // L'événement de org A ne doit pas être visible
    const secretEvent = pageB
      .locator('[data-testid="calendar-event"], .fc-event')
      .filter({ hasText: secretMarker });
    await expect(secretEvent).not.toBeVisible({ timeout: 5_000 });

    await ctxB.close();
  });

  // -------------------------------------------------------------------------
  // Énumération d'utilisateurs cross-tenant
  // -------------------------------------------------------------------------
  test('ne peut pas énumérer les utilisateurs d\'une autre organisation', async ({ request }) => {
    const loginA = await loginOrgA(request);
    if (!loginA.ok()) {
      test.skip(true, 'Login org A échoué');
      return;
    }

    // L'utilisateur org B a l'email 'admin@org-b-test.ci'
    const orgBUserEmail = process.env.TEST_ORG_B_EMAIL ?? 'admin@org-b-test.ci';

    // Tenter de récupérer les utilisateurs — ne doit pas retourner ceux de org B
    const response = await request.get('/api/users');

    if (response.ok()) {
      const body = await response.json();
      const users: Array<{ email: string }> = body.data ?? body;

      if (Array.isArray(users)) {
        const orgBUserFound = users.some((u) => u.email === orgBUserEmail);
        expect(orgBUserFound, 'Utilisateur org B visible depuis org A').toBeFalsy();
      }
    }
  });
});
