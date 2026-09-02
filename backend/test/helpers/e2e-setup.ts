import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp, createApp } from '../../src/bootstrap.js';
import { STORAGE_SERVICE } from '../../src/storage/storage.interface.js';
import { TestStorageService } from './test-storage.service.js';
import { isE2eRequired } from './e2e-require.js';

export const CLIENT_HEADER = { 'X-Client-Request': 'libya-freelance' };

export type TestApp = INestApplication & {
  testStorage?: TestStorageService;
};

let databaseAvailable: boolean | null = null;

export async function isDatabaseAvailable(): Promise<boolean> {
  if (databaseAvailable !== null) {
    return databaseAvailable;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    if (isE2eRequired()) {
      throw new Error('DATABASE_URL is required for E2E in CI.');
    }
    databaseAvailable = false;
    return false;
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    databaseAvailable = true;
  } catch (error) {
    if (isE2eRequired()) {
      throw new Error(
        `PostgreSQL connection failed for E2E: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    databaseAvailable = false;
  } finally {
    await prisma.$disconnect();
  }

  return databaseAvailable;
}

export async function createTestApp(options?: {
  testStorage?: boolean;
}): Promise<TestApp> {
  if (options?.testStorage) {
    const testStorage = new TestStorageService();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(STORAGE_SERVICE)
      .useValue(testStorage)
      .compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    const testApp = app as TestApp;
    testApp.testStorage = testStorage;
    return testApp;
  }

  const app = await createApp();
  await app.init();
  return app;
}

export function authAgent(app: INestApplication) {
  return request.agent(app.getHttpServer());
}

export async function resetDatabase(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AdminAuditLog",
      "CommercialAuditLog",
      "NotificationBroadcast",
      "Notification",
      "InvestorPayout",
      "InvestorStatement",
      "InvestorAccrual",
      "InvestmentAgreement",
      "Investor",
      "FeaturedItem",
      "SiteBanner",
      "CmsContent",
      "FeatureFlag",
      "PlatformSetting",
      "FutureFeeSetting",
      "ProjectCommissionOverride",
      "CategoryCommissionOverride",
      "PlatformCommissionPolicy",
      "UserAdminPermission",
      "Review",
      "PortfolioImage",
      "PortfolioSkill",
      "PortfolioItem",
      "Message",
      "ConversationMember",
      "Conversation",
      "EscrowDispute",
      "EscrowTransaction",
      "Escrow",
      "Payment",
      "Proposal",
      "ProjectSkill",
      "Project",
      "FreelancerSkill",
      "Skill",
      "Category",
      "ClientProfile",
      "FreelancerProfile",
      "Profile",
      "EmailVerificationToken",
      "PasswordResetToken",
      "RefreshToken",
      "PointsTaskCompletion",
      "PointsTransaction",
      "PointsWallet",
      "User",
      "City"
    RESTART IDENTITY CASCADE;
  `);
}

export { request };
