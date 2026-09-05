import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  BroadcastAudience,
  FeaturedEntityType,
  InvestorPayoutStatus,
  InvestorStatementStatus,
  Prisma,
  Role,
  UserStatus,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { assertInternalTargetUrl } from '../notifications/notification-url.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationLogService } from '../notifications/notification-log.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import { RealtimeSessionService } from '../realtime/realtime-session.service.js';
import {
  ALL_FEATURE_FLAGS,
  CMS_KEYS,
  PLATFORM_SETTING_KEYS,
  type FeatureFlagKey,
  type PlatformSettingKey,
} from '../platform/platform-settings.constants.js';
import type {
  AssignAdminPermissionsDto,
  BroadcastPreviewDto,
  BroadcastSendDto,
  CreateBannerDto,
  CreateInvestorPayoutDto,
  CreateInvestorStatementDto,
  CreateStaffAdminDto,
  FeatureItemDto,
  PatchCmsContentDto,
  PortfolioModerationDto,
  TransitionInvestorPayoutDto,
  UpdateBannerDto,
} from './dto/admin-ops.dto.js';

const BCRYPT_ROUNDS = 12;
const BROADCAST_BATCH = 200;

@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly policy: PlatformPolicyService,
    private readonly realtimeSessions: RealtimeSessionService,
    private readonly notifications: NotificationsService,
    private readonly notificationLogs: NotificationLogService,
  ) {}

  async getSettings() {
    await this.policy.ensureDefaults();
    const [settings, flags] = await Promise.all([
      this.prisma.platformSetting.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } }),
    ]);
    const maintenance = await this.policy.getMaintenanceState();
    return {
      settings: Object.fromEntries(settings.map((s) => [s.key, s.valueJson])),
      settingRows: settings,
      flags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
      flagRows: flags,
      maintenance,
    };
  }

  async patchSettings(actorId: string, actorRole: Role, raw: Record<string, unknown>) {
    const patch: Partial<Record<PlatformSettingKey, unknown>> = {};
    for (const key of PLATFORM_SETTING_KEYS) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        patch[key] = raw[key];
      }
    }
    await this.policy.patchSettings(actorId, actorRole, patch);
    return this.getSettings();
  }

  async patchFeatureFlags(actorId: string, flags: Record<string, boolean>) {
    for (const [key, enabled] of Object.entries(flags)) {
      if (!(ALL_FEATURE_FLAGS as readonly string[]).includes(key)) {
        throw new BadRequestException(`علم ميزة غير معروف: ${key}`);
      }
      await this.policy.setFeatureFlag(actorId, key as FeatureFlagKey, Boolean(enabled));
    }
    return this.getSettings();
  }

  async listCms() {
    const rows = await this.prisma.cmsContent.findMany();
    const blocks: Record<string, unknown> = {};
    for (const key of CMS_KEYS) blocks[key] = null;
    for (const row of rows) blocks[row.key] = row.contentJson;
    return { blocks, rows };
  }

  async upsertCms(actorId: string, dto: PatchCmsContentDto) {
    if (!(CMS_KEYS as readonly string[]).includes(dto.key)) {
      throw new BadRequestException('مفتاح محتوى غير مدعوم');
    }
    this.assertSafeCms(dto.contentJson);
    const existing = await this.prisma.cmsContent.findUnique({ where: { key: dto.key } });
    const row = await this.prisma.cmsContent.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        contentJson: dto.contentJson as Prisma.InputJsonValue,
        updatedById: actorId,
      },
      update: {
        contentJson: dto.contentJson as Prisma.InputJsonValue,
        updatedById: actorId,
      },
    });
    await this.audit.log(actorId, AdminAuditAction.CMS_UPDATED, 'CmsContent', row.id, {
      key: dto.key,
      oldValue: existing?.contentJson ?? null,
      newValue: dto.contentJson,
    });
    return row;
  }

  private assertSafeCms(content: Record<string, unknown>) {
    const json = JSON.stringify(content);
    if (/<\s*script/i.test(json) || /javascript:/i.test(json)) {
      throw new BadRequestException('محتوى غير آمن — HTML/سكربت غير مسموح');
    }
  }

  async listBanners() {
    return this.prisma.siteBanner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createBanner(actorId: string, dto: CreateBannerDto) {
    const row = await this.prisma.siteBanner.create({
      data: {
        text: dto.text.trim(),
        link: dto.link ?? null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? false,
        createdById: actorId,
      },
    });
    await this.audit.log(actorId, AdminAuditAction.BANNER_CREATED, 'SiteBanner', row.id, {
      text: row.text,
      isActive: row.isActive,
    });
    return row;
  }

  async updateBanner(actorId: string, id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.siteBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('البنر غير موجود');
    const wasActive = existing.isActive;
    const row = await this.prisma.siteBanner.update({
      where: { id },
      data: {
        text: dto.text?.trim(),
        link: dto.link === undefined ? undefined : dto.link,
        startsAt:
          dto.startsAt === undefined
            ? undefined
            : dto.startsAt
              ? new Date(dto.startsAt)
              : null,
        endsAt:
          dto.endsAt === undefined ? undefined : dto.endsAt ? new Date(dto.endsAt) : null,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
    const action =
      !wasActive && row.isActive
        ? AdminAuditAction.BANNER_PUBLISHED
        : AdminAuditAction.BANNER_UPDATED;
    await this.audit.log(actorId, action, 'SiteBanner', row.id, {
      old: existing,
      new: row,
    });
    return row;
  }

  async deleteBanner(actorId: string, id: string) {
    const existing = await this.prisma.siteBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('البنر غير موجود');
    await this.prisma.siteBanner.delete({ where: { id } });
    await this.audit.log(actorId, AdminAuditAction.BANNER_UPDATED, 'SiteBanner', id, {
      deleted: true,
    });
    return { ok: true };
  }

  async listFeatured() {
    return this.prisma.featuredItem.findMany({
      orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async featureItem(actorId: string, dto: FeatureItemDto) {
    await this.assertFeatureTarget(dto.entityType, dto.entityId);
    const row = await this.prisma.featuredItem.upsert({
      where: {
        entityType_entityId: {
          entityType: dto.entityType,
          entityId: dto.entityId,
        },
      },
      create: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
        createdById: actorId,
      },
      update: {
        isActive: true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log(actorId, AdminAuditAction.FEATURED_UPDATED, 'FeaturedItem', row.id, {
      action: 'feature',
      entityType: dto.entityType,
      entityId: dto.entityId,
    });
    return row;
  }

  async unfeatureItem(actorId: string, id: string) {
    const existing = await this.prisma.featuredItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('العنصر المميز غير موجود');
    await this.prisma.featuredItem.delete({ where: { id } });
    await this.audit.log(actorId, AdminAuditAction.FEATURED_UPDATED, 'FeaturedItem', id, {
      action: 'unfeature',
      entityType: existing.entityType,
      entityId: existing.entityId,
    });
    return { ok: true };
  }

  async reorderFeatured(actorId: string, orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.featuredItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    await this.audit.log(actorId, AdminAuditAction.FEATURED_UPDATED, 'FeaturedItem', 'reorder', {
      orderedIds,
    });
    return this.listFeatured();
  }

  private async assertFeatureTarget(type: FeaturedEntityType, entityId: string) {
    if (type === FeaturedEntityType.CATEGORY) {
      const c = await this.prisma.category.findUnique({ where: { id: entityId } });
      if (!c) throw new NotFoundException('التصنيف غير موجود');
    } else if (type === FeaturedEntityType.PROJECT) {
      const p = await this.prisma.project.findUnique({ where: { id: entityId } });
      if (!p) throw new NotFoundException('المشروع غير موجود');
    } else {
      const fp = await this.prisma.freelancerProfile.findUnique({ where: { id: entityId } });
      const user = fp
        ? null
        : await this.prisma.user.findFirst({
            where: { id: entityId, role: Role.FREELANCER },
          });
      if (!fp && !user) throw new NotFoundException('المستقل غير موجود');
    }
  }

  async previewBroadcast(dto: BroadcastPreviewDto) {
    const recipients = await this.resolveBroadcastRecipients(dto);
    return { audience: dto.audience, recipientCount: recipients.length };
  }

  async listBroadcasts(limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const items = await this.prisma.notificationBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return items.map((item) => ({
      id: item.id,
      audience: item.audience,
      title: item.title,
      message: item.message,
      targetUrl: item.targetUrl,
      specificUserId: item.specificUserId,
      recipientCount: item.recipientCount,
      createdAt: item.createdAt,
      actor: item.actor
        ? {
            id: item.actor.id,
            email: item.actor.email,
            name: [item.actor.profile?.firstName, item.actor.profile?.lastName]
              .filter(Boolean)
              .join(' ')
              .trim() || item.actor.email,
          }
        : null,
    }));
  }

  async getNotificationStats(days = 30) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - Math.min(Math.max(days, 1), 365));
    return this.notificationLogs.getAdminStats(since);
  }

  async sendBroadcast(actorId: string, dto: BroadcastSendDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.notificationBroadcast.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return { broadcast: existing, deduplicated: true };
      }
    }

    const recipients = await this.resolveBroadcastRecipients(dto);
    const title = dto.title.trim();
    const message = dto.message.trim();
    const safeTargetUrl = assertInternalTargetUrl(dto.targetUrl) ?? null;

    let broadcast;
    try {
      broadcast = await this.prisma.notificationBroadcast.create({
        data: {
          actorId,
          audience: dto.audience,
          title,
          message,
          targetUrl: safeTargetUrl,
          specificUserId: dto.specificUserId ?? null,
          recipientCount: recipients.length,
          idempotencyKey: dto.idempotencyKey ?? null,
        },
      });
    } catch (err) {
      if (
        dto.idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.prisma.notificationBroadcast.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
          return { broadcast: existing, deduplicated: true };
        }
      }
      throw err;
    }

    await this.notifications.createManyForUsers(
      recipients,
      NotificationType.ADMIN_BROADCAST,
      title,
      message,
      safeTargetUrl,
      BROADCAST_BATCH,
    );

    await this.audit.log(actorId, AdminAuditAction.BROADCAST_SENT, 'NotificationBroadcast', broadcast.id, {
      audience: dto.audience,
      recipientCount: recipients.length,
    });

    return { broadcast, deduplicated: false };
  }

  private async resolveBroadcastRecipients(dto: BroadcastPreviewDto): Promise<string[]> {
    if (dto.audience === BroadcastAudience.SPECIFIC_USER) {
      if (!dto.specificUserId) {
        throw new BadRequestException('معرّف المستخدم مطلوب');
      }
      const user = await this.prisma.user.findUnique({ where: { id: dto.specificUserId } });
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new NotFoundException('المستخدم غير موجود أو غير نشط');
      }
      return [user.id];
    }

    if (dto.audience === BroadcastAudience.INVESTORS) {
      const investors = await this.prisma.investor.findMany({
        where: { isActive: true, email: { not: null } },
        select: { email: true },
      });
      const emails = investors.map((i) => i.email!.toLowerCase());
      if (!emails.length) return [];
      const users = await this.prisma.user.findMany({
        where: { email: { in: emails }, status: UserStatus.ACTIVE },
        select: { id: true },
      });
      return users.map((u) => u.id);
    }

    const roleFilter =
      dto.audience === BroadcastAudience.CLIENTS
        ? Role.CLIENT
        : dto.audience === BroadcastAudience.FREELANCERS
          ? Role.FREELANCER
          : undefined;

    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        role: roleFilter
          ? roleFilter
          : { in: [Role.CLIENT, Role.FREELANCER] },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async listStaffAdmins() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { firstName: true, lastName: true, username: true } },
        adminPermissions: { select: { permission: true, createdAt: true } },
      },
    });
    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        mustChangePassword: u.mustChangePassword,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        name: u.profile
          ? `${u.profile.firstName} ${u.profile.lastName}`
          : u.email,
        username: u.profile?.username ?? null,
        permissions: u.adminPermissions.map((p) => p.permission),
      })),
    };
  }

  async createStaffAdmin(actorId: string, dto: CreateStaffAdminDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('البريد مستخدم بالفعل');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const username = `admin-${randomBytes(4).toString('hex')}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: Role.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          mustChangePassword: true,
          profile: {
            create: {
              firstName: dto.firstName.trim(),
              lastName: dto.lastName.trim(),
              username,
            },
          },
        },
      });

      const permissions = dto.permissions ?? [];
      for (const permission of permissions) {
        await tx.userAdminPermission.create({
          data: { userId: created.id, permission, grantedById: actorId },
        });
      }

      await this.audit.log(
        actorId,
        AdminAuditAction.ADMIN_CREATED,
        'User',
        created.id,
        { email, permissions },
        tx,
      );
      return created;
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: true,
    };
  }

  async assignPermissions(actorId: string, adminId: string, dto: AssignAdminPermissionsDto) {
    const target = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!target || target.role !== Role.ADMIN) {
      throw new BadRequestException('الصلاحيات تُمنح لحسابات ADMIN فقط');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userAdminPermission.deleteMany({ where: { userId: adminId } });
      for (const permission of dto.permissions) {
        await tx.userAdminPermission.create({
          data: { userId: adminId, permission, grantedById: actorId },
        });
      }
      await this.audit.log(
        actorId,
        AdminAuditAction.PERMISSION_GRANTED,
        'User',
        adminId,
        { permissions: dto.permissions },
        tx,
      );
    });

    return this.prisma.userAdminPermission.findMany({ where: { userId: adminId } });
  }

  async suspendAdmin(actorId: string, adminId: string) {
    await this.assertCanModerateAdmin(actorId, adminId);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: adminId },
        data: { status: UserStatus.SUSPENDED },
      });
      await tx.refreshToken.deleteMany({ where: { userId: adminId } });
      await this.audit.log(
        actorId,
        AdminAuditAction.ADMIN_SUSPENDED,
        'User',
        adminId,
        {},
        tx,
      );
    });
    await this.realtimeSessions.disconnectUser(adminId);
    return { ok: true };
  }

  async reactivateAdmin(actorId: string, adminId: string) {
    await this.assertCanModerateAdmin(actorId, adminId);
    await this.prisma.user.update({
      where: { id: adminId },
      data: { status: UserStatus.ACTIVE },
    });
    await this.audit.log(actorId, AdminAuditAction.ADMIN_REACTIVATED, 'User', adminId, {});
    return { ok: true };
  }

  async revokeAdminSessions(actorId: string, adminId: string) {
    await this.assertCanModerateAdmin(actorId, adminId);
    await this.prisma.refreshToken.deleteMany({ where: { userId: adminId } });
    await this.realtimeSessions.disconnectUser(adminId);
    await this.audit.log(actorId, AdminAuditAction.ADMIN_SUSPENDED, 'User', adminId, {
      action: 'SESSIONS_REVOKED',
    });
    return { ok: true };
  }

  private async assertCanModerateAdmin(actorId: string, adminId: string) {
    if (actorId === adminId) {
      throw new ForbiddenException('لا يمكنك تعديل حسابك من هنا');
    }
    const target = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!target || target.role !== Role.ADMIN) {
      throw new ForbiddenException('لا يمكن تعديل هذا الحساب');
    }
    const superCount = await this.prisma.user.count({
      where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE },
    });
    if (superCount < 1) {
      throw new ForbiddenException('يجب وجود مالك منصة نشط واحد على الأقل');
    }
  }

  async listPortfolio(query: {
    page?: number;
    limit?: number;
    q?: string;
    hiddenOnly?: boolean;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.PortfolioItemWhereInput = {};
    if (query.hiddenOnly) where.isVisible = false;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.portfolioItem.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 5 },
          freelancerProfile: {
            include: {
              profile: {
                select: {
                  username: true,
                  firstName: true,
                  lastName: true,
                  user: { select: { id: true, email: true, status: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.portfolioItem.count({ where }),
    ]);
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async hidePortfolio(actorId: string, id: string, dto: PortfolioModerationDto) {
    const item = await this.prisma.portfolioItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('العمل غير موجود');
    const updated = await this.prisma.portfolioItem.update({
      where: { id },
      data: {
        isVisible: false,
        moderationReason: dto.reason,
        moderatedById: actorId,
        moderatedAt: new Date(),
      },
    });
    await this.audit.log(actorId, AdminAuditAction.PORTFOLIO_HIDDEN, 'PortfolioItem', id, {
      reason: dto.reason,
    });
    return updated;
  }

  async restorePortfolio(actorId: string, id: string, dto: PortfolioModerationDto) {
    const item = await this.prisma.portfolioItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('العمل غير موجود');
    const updated = await this.prisma.portfolioItem.update({
      where: { id },
      data: {
        isVisible: true,
        moderationReason: dto.reason,
        moderatedById: actorId,
        moderatedAt: new Date(),
      },
    });
    await this.audit.log(actorId, AdminAuditAction.PORTFOLIO_RESTORED, 'PortfolioItem', id, {
      reason: dto.reason,
    });
    return updated;
  }

  async listPayouts() {
    return this.prisma.investorPayout.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        investor: { select: { id: true, name: true, email: true } },
      },
      take: 200,
    });
  }

  async createPayout(actorId: string, dto: CreateInvestorPayoutDto) {
    const investor = await this.prisma.investor.findUnique({ where: { id: dto.investorId } });
    if (!investor) throw new NotFoundException('المستثمر غير موجود');
    const row = await this.prisma.investorPayout.create({
      data: {
        investorId: dto.investorId,
        statementId: dto.statementId ?? null,
        amount: dto.amount,
        currency: dto.currency ?? 'LYD',
        paymentMethod: dto.paymentMethod ?? 'EXTERNAL',
        paymentReference: dto.paymentReference ?? null,
        notes: dto.notes ?? null,
        status: InvestorPayoutStatus.PENDING,
        createdById: actorId,
      },
    });
    await this.audit.log(actorId, AdminAuditAction.INVESTOR_PAYOUT_CREATED, 'InvestorPayout', row.id, {
      amount: dto.amount,
      investorId: dto.investorId,
    });
    return row;
  }

  async approvePayout(actorId: string, id: string) {
    const row = await this.prisma.investorPayout.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('الدفعة غير موجودة');
    if (row.status !== InvestorPayoutStatus.PENDING) {
      throw new BadRequestException('يمكن اعتماد الدفعات المعلقة فقط');
    }
    const updated = await this.prisma.investorPayout.update({
      where: { id },
      data: {
        status: InvestorPayoutStatus.APPROVED,
        approvedById: actorId,
        approvedAt: new Date(),
      },
    });
    await this.audit.log(actorId, AdminAuditAction.INVESTOR_PAYOUT_APPROVED, 'InvestorPayout', id, {});
    return updated;
  }

  async markPayoutPaid(actorId: string, id: string, dto: TransitionInvestorPayoutDto) {
    const row = await this.prisma.investorPayout.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('الدفعة غير موجودة');
    if (
      row.status !== InvestorPayoutStatus.APPROVED &&
      row.status !== InvestorPayoutStatus.PENDING
    ) {
      throw new BadRequestException('حالة الدفعة لا تسمح بتسجيل الدفع');
    }
    if (!dto.paymentReference?.trim() && !row.paymentReference) {
      throw new BadRequestException('مرجع الدفع مطلوب عند تسجيل الدفع');
    }
    const updated = await this.prisma.investorPayout.update({
      where: { id },
      data: {
        status: InvestorPayoutStatus.PAID,
        paymentReference: dto.paymentReference?.trim() || row.paymentReference,
        notes: dto.notes ?? row.notes,
        approvedById: row.approvedById ?? actorId,
        approvedAt: row.approvedAt ?? new Date(),
        paidAt: new Date(),
      },
    });
    await this.audit.log(actorId, AdminAuditAction.INVESTOR_PAYOUT_PAID, 'InvestorPayout', id, {
      paymentReference: updated.paymentReference,
    });
    return updated;
  }

  async cancelPayout(actorId: string, id: string) {
    const row = await this.prisma.investorPayout.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('الدفعة غير موجودة');
    if (row.status === InvestorPayoutStatus.PAID) {
      throw new BadRequestException('لا يمكن إلغاء دفعة مسجّلة كمدفوعة');
    }
    const updated = await this.prisma.investorPayout.update({
      where: { id },
      data: { status: InvestorPayoutStatus.CANCELLED },
    });
    await this.audit.log(actorId, AdminAuditAction.INVESTOR_PAYOUT_CANCELLED, 'InvestorPayout', id, {});
    return updated;
  }

  async listStatements(investorId?: string) {
    return this.prisma.investorStatement.findMany({
      where: investorId ? { investorId } : undefined,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      include: { investor: { select: { id: true, name: true } } },
      take: 100,
    });
  }

  async createStatement(actorId: string, dto: CreateInvestorStatementDto) {
    const start = new Date(dto.periodYear, dto.periodMonth - 1, 1);
    const end = new Date(dto.periodYear, dto.periodMonth, 1);
    const accruals = await this.prisma.investorAccrual.aggregate({
      where: {
        createdAt: { gte: start, lt: end },
        agreement: { investorId: dto.investorId },
      },
      _sum: { accrualAmount: true },
    });
    const payments = await this.prisma.investorPayout.aggregate({
      where: {
        investorId: dto.investorId,
        status: InvestorPayoutStatus.PAID,
        paidAt: { gte: start, lt: end },
      },
      _sum: { amount: true },
    });
    const opening = dto.openingBalance ?? 0;
    const accrualsTotal = Number(accruals._sum.accrualAmount ?? 0);
    const adjustments = dto.adjustments ?? 0;
    const paymentsTotal = Number(payments._sum.amount ?? 0);
    const closing = opening + accrualsTotal + adjustments - paymentsTotal;

    try {
      const row = await this.prisma.investorStatement.create({
        data: {
          investorId: dto.investorId,
          periodYear: dto.periodYear,
          periodMonth: dto.periodMonth,
          openingBalance: opening,
          accrualsTotal,
          adjustments,
          paymentsTotal,
          closingBalance: closing,
          status: InvestorStatementStatus.DRAFT,
          createdById: actorId,
        },
      });
      return row;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('كشف هذه الفترة موجود مسبقًا');
      }
      throw e;
    }
  }

  async finalizeStatement(actorId: string, id: string) {
    const row = await this.prisma.investorStatement.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('الكشف غير موجود');
    if (row.status !== InvestorStatementStatus.DRAFT) {
      throw new BadRequestException('لا يمكن تعديل كشف مُعتمد');
    }
    const updated = await this.prisma.investorStatement.update({
      where: { id },
      data: {
        status: InvestorStatementStatus.FINALIZED,
        finalizedAt: new Date(),
      },
    });
    await this.audit.log(
      actorId,
      AdminAuditAction.INVESTOR_STATEMENT_FINALIZED,
      'InvestorStatement',
      id,
      {},
    );
    return updated;
  }

  async search(q: string) {
    const term = q.trim();
    if (term.length < 2) {
      return { users: [], projects: [], investors: [] };
    }
    const [users, projects, investors] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: { in: [Role.CLIENT, Role.FREELANCER, Role.ADMIN, Role.SUPER_ADMIN] },
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { profile: { username: { contains: term, mode: 'insensitive' } } },
            { profile: { firstName: { contains: term, mode: 'insensitive' } } },
            { profile: { lastName: { contains: term, mode: 'insensitive' } } },
          ],
        },
        take: 8,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          profile: { select: { username: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.project.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 8,
        select: { id: true, title: true, status: true, slug: true },
      }),
      this.prisma.investor.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 8,
        select: { id: true, name: true, email: true, isActive: true },
      }),
    ]);
    return { users, projects, investors };
  }

  async investorFinancialTotals(investorId: string) {
    const [accrued, approved, paid] = await Promise.all([
      this.prisma.investorAccrual.aggregate({
        where: { agreement: { investorId } },
        _sum: { accrualAmount: true },
      }),
      this.prisma.investorPayout.aggregate({
        where: {
          investorId,
          status: { in: [InvestorPayoutStatus.APPROVED, InvestorPayoutStatus.PAID] },
        },
        _sum: { amount: true },
      }),
      this.prisma.investorPayout.aggregate({
        where: { investorId, status: InvestorPayoutStatus.PAID },
        _sum: { amount: true },
      }),
    ]);
    const totalAccrued = Number(accrued._sum.accrualAmount ?? 0);
    const totalApproved = Number(approved._sum.amount ?? 0);
    const totalPaid = Number(paid._sum.amount ?? 0);
    return {
      totalAccrued,
      totalApproved,
      totalPaid,
      outstandingBalance: Math.max(0, totalAccrued - totalPaid),
    };
  }
}
