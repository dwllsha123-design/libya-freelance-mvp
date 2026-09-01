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
} from './helpers/project-e2e.helpers.js';

const prisma = new PrismaClient();

const validPortfolioPayload = (skillId: string) => ({
  title: 'تطبيق ويب للتجارة الإلكترونية',
  description:
    'مشروع متكامل لتطوير متجر إلكتروني باستخدام React وNestJS مع لوحة تحكم وإدارة طلبات وتكامل دفع محلي.',
  skillIds: [skillId],
});

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
}

describe('Portfolio Images E2E (PostgreSQL)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let dbReady = false;
  let skillId = '';

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (!dbReady) {
      console.warn('Skipping Portfolio Images E2E: PostgreSQL not available');
      return;
    }

    app = await createTestApp({ testStorage: true });
    await resetDatabase(prisma);
    await seedTestReferenceData(prisma);
    const refs = await getReferenceIds(prisma);
    skillId = refs.skill.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  async function createItem(token: string) {
    const res = await authAgent(app)
      .post('/api/portfolio')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send(validPortfolioPayload(skillId))
      .expect(201);

    return res.body.id as string;
  }

  it('1. Portfolio owner can upload image', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-1');
    const itemId = await createItem(owner.accessToken);

    const res = await authAgent(app)
      .post(`/api/portfolio/${itemId}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', tinyPngBuffer(), {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body.imageUrl).toContain(itemId);

    const dbImage = await prisma.portfolioImage.findFirst({
      where: { portfolioItemId: itemId },
    });
    expect(dbImage).toBeTruthy();
    expect(dbImage?.portfolioItemId).toBe(itemId);
  });

  it('2. Another freelancer cannot upload to foreign portfolio item', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-2');
    const other = await registerUser(app, 'FREELANCER', 'pimg-2-other');
    const itemId = await createItem(owner.accessToken);

    await authAgent(app)
      .post(`/api/portfolio/${itemId}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .attach('file', tinyPngBuffer(), {
        filename: 'hack.png',
        contentType: 'image/png',
      })
      .expect(403);
  });

  it('3-4. Owner can delete image; other freelancer cannot', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-3');
    const other = await registerUser(app, 'FREELANCER', 'pimg-3-other');
    const itemId = await createItem(owner.accessToken);

    const uploaded = await authAgent(app)
      .post(`/api/portfolio/${itemId}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', tinyPngBuffer(), {
        filename: 'delete-me.png',
        contentType: 'image/png',
      })
      .expect(201);

    await authAgent(app)
      .delete(`/api/portfolio/${itemId}/images/${uploaded.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(403);

    await authAgent(app)
      .delete(`/api/portfolio/${itemId}/images/${uploaded.body.id}`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const gone = await prisma.portfolioImage.findUnique({
      where: { id: uploaded.body.id },
    });
    expect(gone).toBeNull();
    expect(app.testStorage?.deletedUrls).toContain(uploaded.body.imageUrl);
  });

  it('5. Maximum 5 images is enforced', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-5');
    const itemId = await createItem(owner.accessToken);

    for (let i = 0; i < 5; i++) {
      await authAgent(app)
        .post(`/api/portfolio/${itemId}/images`)
        .set(CLIENT_HEADER)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .attach('file', tinyPngBuffer(), {
          filename: `img-${i}.png`,
          contentType: 'image/png',
        })
        .expect(201);
    }

    await authAgent(app)
      .post(`/api/portfolio/${itemId}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', tinyPngBuffer(), {
        filename: 'sixth.png',
        contentType: 'image/png',
      })
      .expect(403);

    const count = await prisma.portfolioImage.count({
      where: { portfolioItemId: itemId },
    });
    expect(count).toBe(5);
  });

  it('6. Invalid MIME type is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-6');
    const itemId = await createItem(owner.accessToken);

    await authAgent(app)
      .post(`/api/portfolio/${itemId}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'bad.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('7. Oversized image is rejected', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-7');
    const itemId = await createItem(owner.accessToken);

    const huge = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

    await authAgent(app)
      .post(`/api/portfolio/${itemId}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', huge, {
        filename: 'huge.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('8. Image belongs to correct portfolio item', async (ctx) => {
    if (!dbReady) ctx.skip();
    const owner = await registerUser(app, 'FREELANCER', 'pimg-8');
    const itemA = await createItem(owner.accessToken);
    const itemB = await createItem(owner.accessToken);

    const uploaded = await authAgent(app)
      .post(`/api/portfolio/${itemA}/images`)
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .attach('file', tinyPngBuffer(), {
        filename: 'scoped.png',
        contentType: 'image/png',
      })
      .expect(201);

    const image = await prisma.portfolioImage.findUniqueOrThrow({
      where: { id: uploaded.body.id },
    });
    expect(image.portfolioItemId).toBe(itemA);
    expect(image.portfolioItemId).not.toBe(itemB);
  });
});
