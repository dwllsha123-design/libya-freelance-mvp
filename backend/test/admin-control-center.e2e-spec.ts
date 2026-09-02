import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role, UserStatus } from '@prisma/client';
import {
  authAgent,
  CLIENT_HEADER,
  createTestApp,
  isDatabaseAvailable,
  resetDatabase,
  type TestApp,
} from './helpers/e2e-setup.js';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

describe('Admin Control Center E2E', () => {
  let app: TestApp;
  let dbOk = false;

  beforeAll(async () => {
    dbOk = await isDatabaseAvailable();
    if (!dbOk) return;
    await resetDatabase(prisma);
    app = await createTestApp();

    const passwordHash = await bcrypt.hash('Password1!', 12);
    await prisma.user.create({
      data: {
        email: 'owner@e2e.ly',
        passwordHash,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Owner',
            lastName: 'E2E',
            username: 'owner-e2e',
          },
        },
      },
    });
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
    await prisma.$disconnect();
  });

  it('skips when DB unavailable', () => {
    if (!dbOk) expect(true).toBe(true);
  });

  it('SUPER_ADMIN can patch settings and CLIENT registration is enforced', async () => {
    if (!dbOk) return;

    const login = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: 'owner@e2e.ly', password: 'Password1!' });
    expect(login.status).toBe(200);
    const token = login.body.accessToken as string;

    const patch = await authAgent(app)
      .patch('/api/admin/settings')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        settings: { allowClientRegistration: false },
      });
    expect(patch.status).toBe(200);
    expect(patch.body.settings.allowClientRegistration).toBe(false);

    const register = await authAgent(app)
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        email: 'blocked-client@e2e.ly',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        firstName: 'Blocked',
        lastName: 'Client',
        role: 'CLIENT',
      });
    expect(register.status).toBe(403);

    await authAgent(app)
      .patch('/api/admin/settings')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ settings: { allowClientRegistration: true } });
  });

  it('CLIENT cannot access admin settings', async () => {
    if (!dbOk) return;

    const passwordHash = await bcrypt.hash('Password1!', 12);
    await prisma.user.create({
      data: {
        email: 'client@e2e.ly',
        passwordHash,
        role: Role.CLIENT,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName: 'Client',
            lastName: 'E2E',
            username: 'client-e2e',
          },
        },
      },
    });

    const login = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: 'client@e2e.ly', password: 'Password1!' });
    const token = login.body.accessToken as string;

    const res = await authAgent(app)
      .get('/api/admin/settings')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('maintenance blocks marketplace register but admin still works', async () => {
    if (!dbOk) return;

    const login = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: 'owner@e2e.ly', password: 'Password1!' });
    const token = login.body.accessToken as string;

    await authAgent(app)
      .patch('/api/admin/settings')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        settings: {
          maintenanceEnabled: true,
          maintenanceMessage: 'صيانة',
        },
      });

    const register = await authAgent(app)
      .post('/api/auth/register')
      .set(CLIENT_HEADER)
      .send({
        email: 'maint-user@e2e.ly',
        password: 'Password1!',
        confirmPassword: 'Password1!',
        firstName: 'Maint',
        lastName: 'User',
        role: 'FREELANCER',
      });
    expect([403, 503]).toContain(register.status);

    const settings = await authAgent(app)
      .get('/api/admin/settings')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`);
    expect(settings.status).toBe(200);

    await authAgent(app)
      .patch('/api/admin/settings')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({ settings: { maintenanceEnabled: false } });
  });

  it('CMS update appears on public API and banner scheduling works', async () => {
    if (!dbOk) return;

    const login = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: 'owner@e2e.ly', password: 'Password1!' });
    const token = login.body.accessToken as string;

    const cms = await authAgent(app)
      .patch('/api/admin/content')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        key: 'HOMEPAGE_HERO',
        contentJson: {
          heroTitle: 'E2E Hero',
          heroSubtitle: 'Sub',
          primaryCTA: 'Go',
          secondaryCTA: 'More',
        },
      });
    expect(cms.status).toBe(200);

    const publicCms = await authAgent(app).get('/api/platform/cms').set(CLIENT_HEADER);
    expect(publicCms.status).toBe(200);
    expect(publicCms.body.blocks.HOMEPAGE_HERO.heroTitle).toBe('E2E Hero');

    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    const banner = await authAgent(app)
      .post('/api/admin/content/banners')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        text: 'Active banner',
        isActive: true,
        startsAt: past,
        endsAt: future,
      });
    expect(banner.status).toBeGreaterThanOrEqual(200);
    expect(banner.status).toBeLessThan(300);

    const publicBanners = await authAgent(app)
      .get('/api/platform/banners')
      .set(CLIENT_HEADER);
    expect(publicBanners.status).toBe(200);
    expect(
      (publicBanners.body.items as Array<{ text: string }>).some((b) => b.text === 'Active banner'),
    ).toBe(true);
  });

  it('SUPER_ADMIN can create ADMIN and permissions are enforced', async () => {
    if (!dbOk) return;

    const login = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: 'owner@e2e.ly', password: 'Password1!' });
    const token = login.body.accessToken as string;

    const created = await authAgent(app)
      .post('/api/admin/admins')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'staff@e2e.ly',
        password: 'Password1!',
        firstName: 'Staff',
        lastName: 'Admin',
        permissions: [],
      });
    expect(created.status).toBeGreaterThanOrEqual(200);
    expect(created.status).toBeLessThan(300);

    const staffLogin = await authAgent(app)
      .post('/api/auth/login')
      .set(CLIENT_HEADER)
      .send({ email: 'staff@e2e.ly', password: 'Password1!' });
    const staffToken = staffLogin.body.accessToken as string;

    const denied = await authAgent(app)
      .patch('/api/admin/content')
      .set(CLIENT_HEADER)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        key: 'FAQ',
        contentJson: { items: [] },
      });
    expect(denied.status).toBe(403);
  });

  it('writes audit for setting change', async () => {
    if (!dbOk) return;
    const logs = await prisma.adminAuditLog.findMany({
      where: {
        action: { in: ['SETTING_CHANGED', 'MAINTENANCE_CHANGED', 'CMS_UPDATED', 'ADMIN_CREATED'] },
      },
      take: 5,
    });
    expect(logs.length).toBeGreaterThan(0);
  });
});
