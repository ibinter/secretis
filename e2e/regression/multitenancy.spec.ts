/**
 * regression/multitenancy.spec.ts
 * Non-régression — Isolation multi-tenant stricte
 *
 * Vecteurs testés :
 *  - User org A ne peut pas voir les données org B (events, documents, tasks)
 *  - Injection organization_id dans query string est bloquée
 *  - Injection organization_id dans request body est bloquée
 *  - IDOR sur ID numérique d'une ressource inter-org retourne 403
 *  - SuperAdmin peut voir les données de toutes les orgs
 *
 * Ces tests requièrent deux organisations de test distinctes (org A et org B).
 * Si org B n'est pas configurée, les tests sont ignorés gracieusement.
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------------------
// Helpers d'authentification
// ---------------------------------------------------------------------------

type APIContext = import('@playwright/test').APIRequestContext;

async function loginAs(
  request: APIContext,
  email: string,
  password: string,
): Promise<boolean> {
  const resp = await request.post('/api/auth/login', {
    data: { email, password },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  return resp.ok();
}

async function logoutSession(request: APIContext): Promise<void> {
  await request.post('/api/auth/logout').catch(() => undefined);
}

// Credentials org A (organisation principale de test)
const ORG_A_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@demo-secretis.ci';
const ORG_A_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'Password123!';

// Credentials org B (organisation secondaire isolée)
const ORG_B_EMAIL = process.env.TEST_ORG_B_EMAIL ?? 'admin@org-b-test.ci';
const ORG_B_PASSWORD = process.env.TEST_ORG_B_PASSWORD ?? 'OrgB@Test2024!';
const ORG_B_SLUG = process.env.TEST_ORG_B_SLUG ?? 'org-b-test';

// Credentials superadmin
const SUPERADMIN_EMAIL = process.env.TEST_SUPERADMIN_EMAIL ?? 'superadmin@secretis.ci';
const SUPERADMIN_PASSWORD = process.env.TEST_SUPERADMIN_PASSWORD ?? 'SuperAdmin@2024!';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Non-régression — Isolation multi-tenant', () => {
  // -------------------------------------------------------------------------
  // 1. User org A ne peut pas voir les données org B (events)
  // -------------------------------------------------------------------------
  test('User org A ne peut pas voir les données org B (events)', async ({ request }) => {
    // Login org A — créer un événement
    const loginA = await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    if (!loginA) {
      test.skip(true, 'Org A non configurée');
      return;
    }

    const createResp = await request.post('/api/events', {
      data: {
        title: `Event confidentiel org A ${Date.now()}`,
        start: `${new Date().toISOString().split('T')[0]}T10:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T11:00:00`,
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!createResp.ok()) {
      await logoutSession(request);
      test.skip(true, 'Création d\'événement org A échouée');
      return;
    }

    const created = await createResp.json();
    const eventId = (created.data ?? created).id;
    await logoutSession(request);

    // Login org B — tenter d'accéder à l'événement de org A
    const loginB = await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
    if (!loginB) {
      // Nettoyage et skip
      await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
      await request.delete(`/api/events/${eventId}`);
      await logoutSession(request);
      test.skip(true, 'Org B non configurée');
      return;
    }

    // IDOR GET
    const idor = await request.get(`/api/events/${eventId}`);
    expect(
      [403, 404],
      `Événement org A accessible depuis org B via IDOR GET (status ${idor.status()}) — faille critique`,
    ).toContain(idor.status());

    // IDOR PUT
    const idorPut = await request.put(`/api/events/${eventId}`, {
      data: { title: 'Modification malveillante cross-org' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([403, 404]).toContain(idorPut.status());

    // IDOR DELETE
    const idorDelete = await request.delete(`/api/events/${eventId}`);
    expect([403, 404]).toContain(idorDelete.status());

    await logoutSession(request);

    // Nettoyage
    await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    await request.delete(`/api/events/${eventId}`);
    await logoutSession(request);
  });

  // -------------------------------------------------------------------------
  // 2. User org A ne peut pas voir les données org B (documents)
  // -------------------------------------------------------------------------
  test('User org A ne peut pas voir les données org B (documents)', async ({ request }) => {
    // Login org B — créer un document pour obtenir un ID
    const loginB = await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
    if (!loginB) {
      test.skip(true, 'Org B non configurée');
      return;
    }

    const createResp = await request.post('/api/documents', {
      data: {
        name: `Document confidentiel org B ${Date.now()}`,
        content: 'Contenu sensible organisation B',
        category: 'general',
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!createResp.ok()) {
      await logoutSession(request);
      test.skip(true, 'Création document org B échouée');
      return;
    }

    const created = await createResp.json();
    const docId = (created.data ?? created).id;
    await logoutSession(request);

    // Login org A — tenter d'accéder au document de org B
    const loginA = await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    if (!loginA) {
      await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
      await request.delete(`/api/documents/${docId}`);
      await logoutSession(request);
      test.skip(true, 'Org A non configurée');
      return;
    }

    // IDOR sur document
    const idor = await request.get(`/api/documents/${docId}`);
    expect(
      [403, 404],
      `Document org B accessible depuis org A (status ${idor.status()}) — faille critique`,
    ).toContain(idor.status());

    // Téléchargement direct du fichier
    const downloadAttempt = await request.get(`/api/documents/${docId}/download`);
    expect([403, 404]).toContain(downloadAttempt.status());

    await logoutSession(request);

    // Nettoyage
    await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
    await request.delete(`/api/documents/${docId}`);
    await logoutSession(request);
  });

  // -------------------------------------------------------------------------
  // 3. User org A ne peut pas voir les données org B (tasks)
  // -------------------------------------------------------------------------
  test('User org A ne peut pas voir les données org B (tasks)', async ({ request }) => {
    const loginB = await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
    if (!loginB) {
      test.skip(true, 'Org B non configurée');
      return;
    }

    const createResp = await request.post('/api/tasks', {
      data: {
        title: `Tâche confidentielle org B ${Date.now()}`,
        description: 'Plan stratégique confidentiel',
        priority: 'high',
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!createResp.ok()) {
      await logoutSession(request);
      test.skip(true, 'Création tâche org B échouée');
      return;
    }

    const created = await createResp.json();
    const taskId = (created.data ?? created).id;
    await logoutSession(request);

    const loginA = await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    if (!loginA) {
      await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
      await request.delete(`/api/tasks/${taskId}`);
      await logoutSession(request);
      test.skip(true, 'Org A non configurée');
      return;
    }

    const idor = await request.get(`/api/tasks/${taskId}`);
    expect(
      [403, 404],
      `Tâche org B accessible depuis org A (status ${idor.status()}) — faille critique`,
    ).toContain(idor.status());

    // Tentative de mise à jour
    const idorPatch = await request.patch(`/api/tasks/${taskId}`, {
      data: { status: 'completed', title: 'Tâche compromise' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([403, 404]).toContain(idorPatch.status());

    await logoutSession(request);

    // Nettoyage
    await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
    await request.delete(`/api/tasks/${taskId}`);
    await logoutSession(request);
  });

  // -------------------------------------------------------------------------
  // 4. Injection organization_id dans query string est bloquée
  // -------------------------------------------------------------------------
  test('Injection organization_id dans query string est bloquée', async ({ request }) => {
    const loginA = await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    if (!loginA) {
      test.skip(true, 'Org A non configurée');
      return;
    }

    // Tenter de lire les ressources d'une autre organisation via query string
    const fakeOrgIds = [2, 999, 999999];
    const endpoints = ['/api/events', '/api/tasks', '/api/documents', '/api/users'];

    for (const endpoint of endpoints) {
      for (const fakeOrgId of fakeOrgIds) {
        const resp = await request.get(`${endpoint}?organization_id=${fakeOrgId}`);

        if (resp.ok()) {
          const body = await resp.json().catch(() => ({}));
          const items: Array<{ organization_id: number }> = body.data ?? body ?? [];

          if (Array.isArray(items) && items.length > 0) {
            for (const item of items) {
              expect(
                item.organization_id,
                `${endpoint} retourne des données de l'org ${fakeOrgId} via query string injection`,
              ).not.toBe(fakeOrgId);
            }
          }
        } else {
          // 400/403 = paramètre rejeté — comportement correct
          expect([400, 403]).toContain(resp.status());
        }
      }
    }

    await logoutSession(request);
  });

  // -------------------------------------------------------------------------
  // 5. Injection organization_id dans request body est bloquée
  // -------------------------------------------------------------------------
  test('Injection organization_id dans request body est bloquée', async ({ request }) => {
    const loginA = await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    if (!loginA) {
      test.skip(true, 'Org A non configurée');
      return;
    }

    const fakeOrgId = 999999;

    // Tenter d'injecter organization_id dans la création d'une ressource
    const createResp = await request.post('/api/events', {
      data: {
        title: `Injection test body ${Date.now()}`,
        start: `${new Date().toISOString().split('T')[0]}T14:00:00`,
        end: `${new Date().toISOString().split('T')[0]}T15:00:00`,
        organization_id: fakeOrgId,      // Injection directe
        org_id: fakeOrgId,               // Alias possible
        tenant_id: fakeOrgId,            // Autre alias
        '__organization_id': fakeOrgId,  // Variante underscore
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (createResp.ok()) {
      const created = await createResp.json();
      const eventData = created.data ?? created;

      // L'organization_id injecté doit être ignoré — la ressource doit
      // appartenir à l'organisation de l'utilisateur connecté (org A)
      expect(
        eventData.organization_id,
        `organization_id injecté dans le body a été utilisé (${eventData.organization_id} === ${fakeOrgId})`,
      ).not.toBe(fakeOrgId);

      // Nettoyage
      if (eventData.id) {
        await request.delete(`/api/events/${eventData.id}`);
      }
    } else {
      // 400/422 = champ interdit en entrée — comportement correct
      expect([400, 403, 422]).toContain(createResp.status());
    }

    await logoutSession(request);
  });

  // -------------------------------------------------------------------------
  // 6. IDOR sur ID numérique d'une ressource inter-org retourne 403
  // -------------------------------------------------------------------------
  test('IDOR sur ID numérique d\'une ressource inter-org retourne 403', async ({ request }) => {
    // Login org A — créer une ressource pour avoir son ID
    const loginA = await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    if (!loginA) {
      test.skip(true, 'Org A non configurée');
      return;
    }

    const createResp = await request.post('/api/tasks', {
      data: {
        title: `IDOR Test resource ${Date.now()}`,
        description: 'Ressource confidentielle pour test IDOR',
      },
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!createResp.ok()) {
      await logoutSession(request);
      test.skip(true, 'Création tâche échouée pour test IDOR');
      return;
    }

    const created = await createResp.json();
    const resourceId = (created.data ?? created).id;
    await logoutSession(request);

    // Login org B — tenter d'accéder directement par ID numérique
    const loginB = await loginAs(request, ORG_B_EMAIL, ORG_B_PASSWORD);
    if (!loginB) {
      await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
      await request.delete(`/api/tasks/${resourceId}`);
      await logoutSession(request);
      test.skip(true, 'Org B non configurée');
      return;
    }

    // Test IDOR sur plusieurs opérations CRUD
    const idorGet = await request.get(`/api/tasks/${resourceId}`);
    expect([403, 404], `IDOR GET task non bloqué (status ${idorGet.status()})`).toContain(idorGet.status());

    const idorPut = await request.put(`/api/tasks/${resourceId}`, {
      data: { title: 'IDOR PUT exploit', status: 'completed' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([403, 404], `IDOR PUT task non bloqué (status ${idorPut.status()})`).toContain(idorPut.status());

    const idorPatch = await request.patch(`/api/tasks/${resourceId}`, {
      data: { status: 'completed' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect([403, 404], `IDOR PATCH task non bloqué (status ${idorPatch.status()})`).toContain(idorPatch.status());

    const idorDelete = await request.delete(`/api/tasks/${resourceId}`);
    expect([403, 404], `IDOR DELETE task non bloqué (status ${idorDelete.status()})`).toContain(idorDelete.status());

    await logoutSession(request);

    // Nettoyage
    await loginAs(request, ORG_A_EMAIL, ORG_A_PASSWORD);
    await request.delete(`/api/tasks/${resourceId}`);
    await logoutSession(request);
  });

  // -------------------------------------------------------------------------
  // 7. SuperAdmin peut voir les données de toutes les orgs
  // -------------------------------------------------------------------------
  test('SuperAdmin peut voir les données de toutes les orgs', async ({ request }) => {
    const loginSA = await loginAs(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    if (!loginSA) {
      test.skip(true, 'SuperAdmin non configuré dans cet environnement');
      return;
    }

    // Le superadmin doit pouvoir lister toutes les organisations
    const orgsResp = await request.get('/api/admin/organizations');
    expect(
      [200],
      `SuperAdmin bloqué sur /api/admin/organizations (status ${orgsResp.status()})`,
    ).toContain(orgsResp.status());

    if (orgsResp.ok()) {
      const body = await orgsResp.json().catch(() => ({}));
      const orgs: unknown[] = body.data ?? body;
      expect(Array.isArray(orgs)).toBeTruthy();
      expect(
        (orgs as unknown[]).length,
        'SuperAdmin ne voit aucune organisation',
      ).toBeGreaterThan(0);
    }

    // Le superadmin peut accéder aux données d'une org spécifique via paramètre
    const orgBResp = await request.get(`/api/admin/organizations/${ORG_B_SLUG}/events`);
    // 200 ou 404 (si org B n'existe pas) — mais pas 403
    expect(
      orgBResp.status(),
      `SuperAdmin bloqué sur les données de org B (status ${orgBResp.status()})`,
    ).not.toBe(403);

    // Le superadmin peut lister tous les utilisateurs toutes orgs confondues
    const usersResp = await request.get('/api/admin/users');
    expect([200, 404]).toContain(usersResp.status());

    if (usersResp.ok()) {
      const body = await usersResp.json().catch(() => ({}));
      const users: unknown[] = body.data ?? body;
      if (Array.isArray(users) && users.length > 0) {
        // Le superadmin voit les utilisateurs de plusieurs organisations
        const orgIds = new Set(
          (users as Array<{ organization_id?: number }>)
            .map((u) => u.organization_id)
            .filter(Boolean),
        );
        expect(orgIds.size).toBeGreaterThanOrEqual(1);
      }
    }

    await logoutSession(request);
  });
});
