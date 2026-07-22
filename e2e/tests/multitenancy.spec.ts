/**
 * multitenancy.spec.ts
 * Tests E2E — Isolation multi-tenant SECRETIS ERP
 *
 * Couvre :
 *  - Org A ne peut pas voir les données de org B
 *  - Injection d'organization_id dans le body → ignoré
 *  - Accès API avec token d'une autre org → 403
 *
 * Ces tests sont critiques pour la sécurité : ils vérifient que le middleware
 * ResolveTenant isole correctement les données entre organisations.
 */
import { test, expect } from '../fixtures/auth.fixture';
import { createOrganization, createUser, createEvent, createTask } from '../helpers/api.helper';

// -----------------------------------------------------------------------
// Tests d'isolation multi-tenant
// -----------------------------------------------------------------------

test.describe('Multi-tenancy — Isolation des données', () => {
  // Utiliser le contexte sans auth pour les tests API directs
  test.use({ storageState: { cookies: [], origins: [] } });

  // --------------------------------------------------------------------
  // 1. Org A ne peut pas voir les données de org B
  // --------------------------------------------------------------------
  test('org A ne peut pas voir les données de org B via UI', async ({ page, browser }) => {
    // --- Org A : créer des données ---
    const orgASecret = process.env.TEST_SECRET ?? 'e2e-test-secret';

    // Login org A
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();

    await pageA.goto('/login');
    await pageA.waitForLoadState('networkidle');
    await pageA.getByLabel(/email/i).fill(process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci');
    await pageA.getByLabel(/mot de passe|password/i).fill(process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!');
    await pageA.getByRole('button', { name: /connexion/i }).click();
    await pageA.waitForURL(/dashboard|accueil/, { timeout: 15_000 });

    // Créer un événement dans org A
    const eventOrgA = await createEvent(pageA.request, {
      title: `SECRET ORG A ${Date.now()}`,
      start: `${new Date().toISOString().split('T')[0]}T10:00:00`,
      end: `${new Date().toISOString().split('T')[0]}T11:00:00`,
    });

    await ctxA.close();

    // --- Org B : vérifier qu'elle ne voit pas les données de A ---
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();

    await pageB.goto('/login');
    await pageB.waitForLoadState('networkidle');

    const orgBEmail = process.env.TEST_ORG_B_EMAIL ?? 'admin@org-b-test.ci';
    const orgBPwd = process.env.TEST_ORG_B_PASSWORD ?? 'OrgB@Test2024!';

    await pageB.getByLabel(/email/i).fill(orgBEmail);
    await pageB.getByLabel(/mot de passe|password/i).fill(orgBPwd);
    await pageB.getByRole('button', { name: /connexion/i }).click();

    const loginSuccess = await pageB
      .waitForURL(/dashboard|accueil/, { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (!loginSuccess) {
      // Org B n'est pas configurée → skip
      test.skip(true, 'Org B non configurée dans cet environnement de test');
      await ctxB.close();
      return;
    }

    // Tenter d'accéder à l'événement de org A via l'API
    const response = await pageB.request.get(`/api/events/${eventOrgA.id}`);

    // Doit recevoir 403 ou 404 (l'événement n'existe pas dans le contexte de org B)
    expect([403, 404]).toContain(response.status());

    // Naviguer vers le calendrier de org B → l'événement de A n'est pas visible
    await pageB.goto('/agenda');
    await pageB.waitForLoadState('networkidle');

    const secretEvent = pageB
      .locator('[data-testid="calendar-event"], .fc-event')
      .filter({ hasText: 'SECRET ORG A' });

    await expect(secretEvent).not.toBeVisible({ timeout: 5_000 });

    await ctxB.close();
  });

  // --------------------------------------------------------------------
  // 2. Injection d'organization_id dans le body → ignoré
  // --------------------------------------------------------------------
  test('injection organization_id dans le body → ignoré (org réelle utilisée)', async ({ request }) => {
    // Obtenir un token de session pour org A
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
        password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
      },
    });

    if (!loginResponse.ok()) {
      test.skip(true, 'Login échoué — environnement non configuré');
      return;
    }

    // Tenter de créer un événement en injectant l'organization_id d'une autre org
    const fakeOrgId = 999999; // ID qui n'existe pas ou appartient à une autre org

    const createResponse = await request.post('/api/events', {
      data: {
        title: `Injection Test ${Date.now()}`,
        start: `${new Date().toISOString().split('T')[0]}T14:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T15:00:00`,
        organization_id: fakeOrgId, // tentative d'injection
      },
    });

    if (createResponse.ok()) {
      const createdEvent = await createResponse.json();

      // L'événement doit avoir été créé avec l'organization_id de l'utilisateur connecté,
      // pas celui injecté
      const eventData = createdEvent.data ?? createdEvent;
      expect(eventData.organization_id).not.toBe(fakeOrgId);

      // Nettoyage
      await request.delete(`/api/events/${eventData.id}`);
    } else {
      // Si 422/400, le champ organization_id est simplement ignoré/rejeté
      expect([400, 422, 403]).toContain(createResponse.status());
    }
  });

  // --------------------------------------------------------------------
  // 3. Accès API avec token d'une autre org → 403
  // --------------------------------------------------------------------
  test('accès API avec token d\'une autre org → 403', async ({ request }) => {
    // Tenter d'accéder à une ressource en spécifiant un org slug différent
    const orgBSlug = process.env.TEST_ORG_B_SLUG ?? 'org-b-test';

    // D'abord se connecter en tant qu'utilisateur org A
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
        password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
      },
    });

    if (!loginResponse.ok()) {
      test.skip(true, 'Login échoué — environnement non configuré');
      return;
    }

    // Tenter d'accéder aux tâches de org B avec la session de org A
    const crossTenantResponse = await request.get(`/api/organizations/${orgBSlug}/tasks`);

    // Doit retourner 403 (accès interdit) ou 404 (org B non trouvée pour cet utilisateur)
    expect([403, 404]).toContain(crossTenantResponse.status());
  });

  // --------------------------------------------------------------------
  // Tests API directe d'isolation
  // --------------------------------------------------------------------

  test('événement org A non accessible via API org B', async ({ request }) => {
    // Login org A
    const loginA = await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
        password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
      },
    });

    if (!loginA.ok()) {
      test.skip(true, 'Login org A échoué');
      return;
    }

    // Créer un événement dans org A
    const createEventResponse = await request.post('/api/events', {
      data: {
        title: `Isolation ${Date.now()}`,
        start: `${new Date().toISOString().split('T')[0]}T09:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T10:00:00`,
      },
    });

    if (!createEventResponse.ok()) {
      test.skip(true, 'Création événement échouée');
      return;
    }

    const event = await createEventResponse.json();
    const eventId = (event.data ?? event).id;

    // Se déconnecter
    await request.post('/api/auth/logout');

    // Login org B
    const loginB = await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_ORG_B_EMAIL ?? 'admin@org-b-test.ci',
        password: process.env.TEST_ORG_B_PASSWORD ?? 'OrgB@Test2024!',
      },
    });

    if (!loginB.ok()) {
      // Nettoyer et skip
      await request.post('/api/auth/login', {
        data: {
          email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
          password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
        },
      });
      await request.delete(`/api/events/${eventId}`);
      test.skip(true, 'Login org B échoué — org B non configurée');
      return;
    }

    // Tenter de lire l'événement de org A
    const getEvent = await request.get(`/api/events/${eventId}`);
    expect([403, 404]).toContain(getEvent.status());

    // Tenter de modifier l'événement de org A
    const updateEvent = await request.put(`/api/events/${eventId}`, {
      data: { title: 'Modification malveillante' },
    });
    expect([403, 404]).toContain(updateEvent.status());

    // Tenter de supprimer l'événement de org A
    const deleteEventResp = await request.delete(`/api/events/${eventId}`);
    expect([403, 404]).toContain(deleteEventResp.status());

    // Nettoyage : se reconnecter en org A et supprimer
    await request.post('/api/auth/logout');
    await request.post('/api/auth/login', {
      data: {
        email: process.env.TEST_ADMIN_EMAIL ?? 'admin@test-secretis.ci',
        password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@Test2024!',
      },
    });
    await request.delete(`/api/events/${eventId}`);
  });
});
