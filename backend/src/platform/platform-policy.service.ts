import {
  ForbiddenException,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { AdminAuditAction, PlatformSettingType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ALL_FEATURE_FLAGS,
  CRITICAL_SETTING_KEYS,
  DEFAULT_SETTINGS,
  PLATFORM_SETTING_KEYS,
  STABLE_FEATURE_FLAGS,
  settingTypeFor,
  type FeatureFlagKey,
  type PlatformSettingKey,
} from './platform-settings.constants.js';
import {
  assertSafeHttpsUrl,
  isAppStoreStatus,
} from './mobile-app.constants.js';

@Injectable()
export class PlatformPolicyService implements OnModuleInit {
  private settingsCache = new Map<string, unknown>();
  private flagsCache = new Map<string, boolean>();
  private cacheLoadedAt = 0;
  private readonly cacheTtlMs = 5_000;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureDefaults();
      await this.refreshCache();
    } catch {
      // DB may be unavailable during tooling
    }
  }

  private async audit(
    adminId: string,
    action: AdminAuditAction,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async ensureDefaults() {
    for (const key of PLATFORM_SETTING_KEYS) {
      await this.prisma.platformSetting.upsert({
        where: { key },
        create: {
          key,
          valueJson: DEFAULT_SETTINGS[key] as Prisma.InputJsonValue,
          type: settingTypeFor(key) as PlatformSettingType,
        },
        update: {},
      });
    }
    for (const key of ALL_FEATURE_FLAGS) {
      const enabled = (STABLE_FEATURE_FLAGS as readonly string[]).includes(key);
      await this.prisma.featureFlag.upsert({
        where: { key },
        create: { key, enabled },
        update: {},
      });
    }
  }

  async refreshCache() {
    const [settings, flags] = await Promise.all([
      this.prisma.platformSetting.findMany(),
      this.prisma.featureFlag.findMany(),
    ]);
    this.settingsCache.clear();
    this.flagsCache.clear();
    for (const row of settings) this.settingsCache.set(row.key, row.valueJson);
    for (const row of flags) this.flagsCache.set(row.key, row.enabled);
    this.cacheLoadedAt = Date.now();
  }

  private async ensureCache() {
    if (Date.now() - this.cacheLoadedAt > this.cacheTtlMs || this.settingsCache.size === 0) {
      await this.refreshCache();
    }
  }

  async getBool(key: PlatformSettingKey, fallback = true): Promise<boolean> {
    await this.ensureCache();
    const v = this.settingsCache.get(key);
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return fallback;
  }

  async getString(key: PlatformSettingKey, fallback = ''): Promise<string> {
    await this.ensureCache();
    const v = this.settingsCache.get(key);
    return typeof v === 'string' ? v : fallback;
  }

  async isFeatureEnabled(key: FeatureFlagKey, fallback = true): Promise<boolean> {
    await this.ensureCache();
    if (!this.flagsCache.has(key)) return fallback;
    return Boolean(this.flagsCache.get(key));
  }

  async getPublicSnapshot() {
    await this.ensureCache();
    const settings: Record<string, unknown> = {};
    for (const key of PLATFORM_SETTING_KEYS) {
      settings[key] =
        this.settingsCache.get(key) ?? DEFAULT_SETTINGS[key];
    }
    const flags: Record<string, boolean> = {};
    for (const key of ALL_FEATURE_FLAGS) {
      flags[key] = this.flagsCache.has(key)
        ? Boolean(this.flagsCache.get(key))
        : (STABLE_FEATURE_FLAGS as readonly string[]).includes(key);
    }
    return { settings, flags, maintenance: await this.getMaintenanceState() };
  }

  async getMaintenanceState() {
    await this.ensureCache();
    const enabled = await this.getBool('maintenanceEnabled', false);
    const message = await this.getString('maintenanceMessage', '');
    const startsAtRaw = this.settingsCache.get('maintenanceStartsAt');
    const endsAtRaw = this.settingsCache.get('maintenanceEndsAt');
    const startsAt = startsAtRaw ? new Date(String(startsAtRaw)) : null;
    const endsAt = endsAtRaw ? new Date(String(endsAtRaw)) : null;
    const now = new Date();
    let active = enabled;
    if (active && startsAt && now < startsAt) active = false;
    if (active && endsAt && now > endsAt) active = false;
    return {
      enabled,
      active,
      message: message || 'المنصة في وضع الصيانة مؤقتًا',
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
    };
  }

  /** Block CLIENT/FREELANCER mutating ops during maintenance */
  async assertNotInMaintenance(role?: Role) {
    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) return;
    const state = await this.getMaintenanceState();
    if (state.active) {
      throw new ServiceUnavailableException({
        code: 'MAINTENANCE',
        message: state.message,
      });
    }
  }

  async assertRegistrationAllowed(role: Role) {
    await this.assertNotInMaintenance();
    if (role === Role.CLIENT && !(await this.getBool('allowClientRegistration'))) {
      throw new ForbiddenException('تسجيل العملاء متوقف مؤقتًا');
    }
    if (role === Role.FREELANCER && !(await this.getBool('allowFreelancerRegistration'))) {
      throw new ForbiddenException('تسجيل المستقلين متوقف مؤقتًا');
    }
  }

  async assertProjectsAllowed(role?: Role) {
    await this.assertNotInMaintenance(role);
    if (!(await this.getBool('allowNewProjects'))) {
      throw new ForbiddenException('نشر المشاريع متوقف مؤقتًا من الإدارة');
    }
  }

  async assertProposalsAllowed(role?: Role) {
    await this.assertNotInMaintenance(role);
    if (!(await this.getBool('allowNewProposals'))) {
      throw new ForbiddenException('تقديم العروض متوقف مؤقتًا من الإدارة');
    }
  }

  async assertMessagingAllowed(role?: Role) {
    await this.assertNotInMaintenance(role);
    if (!(await this.getBool('allowMessaging'))) {
      throw new ForbiddenException('المراسلة متوقفة مؤقتًا من الإدارة');
    }
    if (!(await this.isFeatureEnabled('MESSAGING'))) {
      throw new ForbiddenException('ميزة المراسلة غير مفعّلة');
    }
  }

  async assertReviewsAllowed(role?: Role) {
    await this.assertNotInMaintenance(role);
    if (!(await this.getBool('allowReviews'))) {
      throw new ForbiddenException('التقييمات متوقفة مؤقتًا من الإدارة');
    }
    if (!(await this.isFeatureEnabled('REVIEWS'))) {
      throw new ForbiddenException('ميزة التقييمات غير مفعّلة');
    }
  }

  async assertPortfolioAllowed(role?: Role) {
    await this.assertNotInMaintenance(role);
    if (!(await this.getBool('allowPortfolio'))) {
      throw new ForbiddenException('إدارة الأعمال السابقة متوقفة مؤقتًا');
    }
    if (!(await this.isFeatureEnabled('PORTFOLIO'))) {
      throw new ForbiddenException('ميزة الأعمال السابقة غير مفعّلة');
    }
  }

  validateSettingValue(key: PlatformSettingKey, value: unknown) {
    const type = settingTypeFor(key);
    if (type === 'BOOLEAN' && typeof value !== 'boolean') {
      throw new ForbiddenException(`القيمة لـ ${key} يجب أن تكون منطقية`);
    }
    if (type === 'STRING' && value != null && typeof value !== 'string') {
      throw new ForbiddenException(`القيمة لـ ${key} يجب أن تكون نصًا`);
    }
    if (key === 'supportEmail' && typeof value === 'string' && value && !value.includes('@')) {
      throw new ForbiddenException('بريد الدعم غير صالح');
    }
    if (key === 'currency' && typeof value === 'string' && value !== 'LYD') {
      throw new ForbiddenException('العملة المدعومة حاليًا: LYD');
    }
    if (key === 'iosAppStatus' || key === 'androidAppStatus') {
      if (!isAppStoreStatus(value)) {
        throw new BadRequestException(
          `${key} يجب أن يكون أحد: COMING_SOON | BETA | AVAILABLE | MAINTENANCE`,
        );
      }
    }
    if (
      key === 'iosStoreUrl' ||
      key === 'androidStoreUrl' ||
      key === 'privacyPolicyUrl' ||
      key === 'termsUrl' ||
      key === 'supportUrl'
    ) {
      try {
        assertSafeHttpsUrl(value, key);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : `رابط ${key} غير صالح`,
        );
      }
    }
  }

  async patchSettings(
    actorId: string,
    actorRole: Role,
    patch: Partial<Record<PlatformSettingKey, unknown>>,
  ) {
    const entries = Object.entries(patch).filter(([k]) =>
      (PLATFORM_SETTING_KEYS as readonly string[]).includes(k),
    ) as [PlatformSettingKey, unknown][];

    for (const [key, value] of entries) {
      if (CRITICAL_SETTING_KEYS.has(key) && actorRole !== Role.SUPER_ADMIN) {
        throw new ForbiddenException(`تعديل ${key} متاح لمالك المنصة فقط`);
      }
      this.validateSettingValue(key, value);
    }

    const results = [];
    for (const [key, value] of entries) {
      const existing = await this.prisma.platformSetting.findUnique({ where: { key } });
      const updated = await this.prisma.platformSetting.upsert({
        where: { key },
        create: {
          key,
          valueJson: value as Prisma.InputJsonValue,
          type: settingTypeFor(key) as PlatformSettingType,
          updatedById: actorId,
        },
        update: {
          valueJson: value as Prisma.InputJsonValue,
          updatedById: actorId,
        },
      });
      const action =
        key === 'maintenanceEnabled' ||
        key === 'maintenanceMessage' ||
        key === 'maintenanceStartsAt' ||
        key === 'maintenanceEndsAt'
          ? AdminAuditAction.MAINTENANCE_CHANGED
          : AdminAuditAction.SETTING_CHANGED;
      await this.audit(actorId, action, 'PlatformSetting', updated.id, {
        key,
        oldValue: existing?.valueJson ?? null,
        newValue: value,
      });
      results.push(updated);
    }
    await this.refreshCache();
    return results;
  }

  async setFeatureFlag(actorId: string, key: FeatureFlagKey, enabled: boolean) {
    if (!(ALL_FEATURE_FLAGS as readonly string[]).includes(key)) {
      throw new ForbiddenException('علم ميزة غير معروف');
    }
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    const updated = await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, updatedById: actorId },
      update: { enabled, updatedById: actorId },
    });
    await this.audit(actorId, AdminAuditAction.FEATURE_FLAG_CHANGED, 'FeatureFlag', updated.id, {
      key,
      oldValue: existing?.enabled ?? null,
      newValue: enabled,
    });
    await this.refreshCache();
    return updated;
  }
}
