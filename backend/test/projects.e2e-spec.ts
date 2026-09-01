import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CLIENT_HEADER,
  authAgent,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
} from './helpers/e2e-setup.js';
import {
  getReferenceIds,
  registerUser,
  seedTestReferenceData,
  validProjectPayload,
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

describe('Projects E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let categoryId = '';
  let skillId = '';
  let cityId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();

    if (!dbReady) {
      console.warn(
        'Skipping Projects E2E: PostgreSQL not available at DATABASE_URL',
      );
      return;
    }

    app = await createTestApp();
    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);

    const refs = await getReferenceIds(prisma);
    categoryId = refs.category.id;
    skillId = refs.skill.id;
    cityId = refs.city.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('1. CLIENT can create DRAFT project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'create-draft');
    const res = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    expect(res.body.status).toBe('DRAFT');
  });

  it('2. FREELANCER cannot create project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const freelancer = await registerUser(app, 'FREELANCER', 'no-create');
    await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(403);
  });

  it('3. Anonymous user cannot create project', async (ctx) => {
    if (!dbReady) ctx.skip();

    await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(401);
  });

  it('4. Project starts as DRAFT', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'starts-draft');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    expect(created.body.status).toBe('DRAFT');
    expect(created.body.publishedAt).toBeFalsy();
  });

  it('5. Other client cannot edit project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const owner = await registerUser(app, 'CLIENT', 'owner-edit');
    const other = await registerUser(app, 'CLIENT', 'other-edit');

    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    await authAgent(app)
      .patch(`/api/projects/${created.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ title: 'محاولة تعديل غير مصرح بها' })
      .expect(403);
  });

  it('6. Owner can edit DRAFT', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'owner-draft-edit');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    const updated = await authAgent(app)
      .patch(`/api/projects/${created.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({ title: 'عنوان محدث للمشروع الاختباري' })
      .expect(200);

    expect(updated.body.title).toContain('محدث');
  });

  it('7. Owner can publish valid DRAFT', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'publish-valid');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    const published = await authAgent(app)
      .post(`/api/projects/${created.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(published.body.status).toBe('OPEN');
    expect(published.body.publishedAt).toBeTruthy();
  });

  it('8. Incomplete project cannot publish', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'publish-incomplete');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        title: 'مسودة',
        categoryId,
      })
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(400);
  });

  it('9. Anonymous cannot access DRAFT publicly', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'draft-private');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    await authAgent(app)
      .get(`/api/projects/slug/${created.body.slug}`)
      .set(CLIENT_HEADER)
      .expect(404);
  });

  it('10. Public can access OPEN project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'public-open');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const publicRes = await authAgent(app)
      .get(`/api/projects/slug/${created.body.slug}`)
      .set(CLIENT_HEADER)
      .expect(200);

    expect(publicRes.body.title).toBeTruthy();
  });

  it('11. Public listing returns OPEN projects only', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'list-open');
    const draft = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId], { title: 'مسودة سرية للقائمة العامة' }))
      .expect(201);

    const open = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId], { title: 'مشروع مفتوح للقائمة العامة' }))
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${open.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const list = await authAgent(app)
      .get('/api/projects')
      .set(CLIENT_HEADER)
      .expect(200);

    const slugs = list.body.items.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain(open.body.slug);
    expect(slugs).not.toContain(draft.body.slug);
  });

  it('12. Owner can close OPEN project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'close-open');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const closed = await authAgent(app)
      .post(`/api/projects/${created.body.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    expect(closed.body.status).toBe('CLOSED');
  });

  it('13. Invalid budget is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'bad-budget');
    await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(
        validProjectPayload(categoryId, [skillId], {
          budgetMin: 5000,
          budgetMax: 1000,
        }),
      )
      .expect(400);
  });

  it('14. Past deadline is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'past-deadline');
    const past = new Date();
    past.setDate(past.getDate() - 2);

    await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(
        validProjectPayload(categoryId, [skillId], {
          deadline: past.toISOString(),
        }),
      )
      .expect(400);
  });

  it('15. Invalid skill is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'bad-skill');
    await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(
        validProjectPayload(categoryId, ['00000000-0000-4000-8000-000000000099']),
      )
      .expect(404);
  });

  it('16. Inactive category is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();

    const inactive = await prisma.category.create({
      data: {
        nameAr: 'تصنيف غير نشط',
        slug: `inactive-${Date.now()}`,
        isActive: false,
      },
    });

    const client = await registerUser(app, 'CLIENT', 'inactive-cat');
    await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(inactive.id, [skillId]))
      .expect(404);
  });

  it('17. Pagination works', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'pagination');

    for (let i = 0; i < 3; i++) {
      const created = await authAgent(app)
        .post('/api/projects')
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${client.accessToken}`)
        .send(
          validProjectPayload(categoryId, [skillId], {
            title: `مشروع ترقيم صفحات رقم ${i + 1} للاختبار`,
          }),
        )
        .expect(201);

      await authAgent(app)
        .post(`/api/projects/${created.body.id}/publish`)
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${client.accessToken}`)
        .expect(201);
    }

    const page1 = await authAgent(app)
      .get('/api/projects?page=1&limit=2')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(page1.body.items.length).toBe(2);
    expect(page1.body.total).toBeGreaterThanOrEqual(3);
    expect(page1.body.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('18. Category filter works', async (ctx) => {
    if (!dbReady) ctx.skip();

    const list = await authAgent(app)
      .get('/api/projects?category=programming-tech')
      .set(CLIENT_HEADER)
      .expect(200);

    for (const item of list.body.items) {
      expect(item.category.slug).toBe('programming-tech');
    }
  });

  it('19. Skill filter works', async (ctx) => {
    if (!dbReady) ctx.skip();

    const list = await authAgent(app)
      .get('/api/projects?skill=react')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
  });

  it('20. City/workMode filter works', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'city-filter');
    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(
        validProjectPayload(categoryId, [skillId], {
          workMode: 'ON_SITE',
          cityId,
          title: 'مشروع في الموقع بمدينة طرابلس للاختبار',
        }),
      )
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .expect(201);

    const list = await authAgent(app)
      .get('/api/projects?city=tripoli&workMode=ON_SITE')
      .set(CLIENT_HEADER)
      .expect(200);

    expect(
      list.body.items.some((p: { slug: string }) => p.slug === created.body.slug),
    ).toBe(true);
  });

  it('21. Sort works', async (ctx) => {
    if (!dbReady) ctx.skip();

    const sorted = await authAgent(app)
      .get('/api/projects?sort=budget_high&limit=5')
      .set(CLIENT_HEADER)
      .expect(200);

    const budgets = sorted.body.items.map(
      (p: { budgetMax: number }) => p.budgetMax,
    );

    for (let i = 1; i < budgets.length; i++) {
      expect(budgets[i - 1]).toBeGreaterThanOrEqual(budgets[i]);
    }
  });

  it('22. Duplicate titles still produce unique slugs', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'dup-slug');
    const title = 'مشروع بنفس العنوان للتحقق من السلاج';

    const p1 = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId], { title }))
      .expect(201);

    const p2 = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId], { title }))
      .expect(201);

    expect(p1.body.slug).not.toBe(p2.body.slug);
  });

  it('23. Other client cannot close/cancel project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const owner = await registerUser(app, 'CLIENT', 'owner-close');
    const other = await registerUser(app, 'CLIENT', 'other-close');

    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/publish`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/close`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);

    await authAgent(app)
      .post(`/api/projects/${created.body.id}/cancel`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);
  });

  it('24. FREELANCER cannot manage project', async (ctx) => {
    if (!dbReady) ctx.skip();

    const client = await registerUser(app, 'CLIENT', 'client-manage');
    const freelancer = await registerUser(app, 'FREELANCER', 'fl-manage');

    const created = await authAgent(app)
      .post('/api/projects')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send(validProjectPayload(categoryId, [skillId]))
      .expect(201);

    await authAgent(app)
      .get(`/api/projects/${created.body.id}/manage`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${freelancer.accessToken}`)
      .expect(403);
  });
});
