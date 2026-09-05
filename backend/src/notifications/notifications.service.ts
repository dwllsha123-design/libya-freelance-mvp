import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  NotificationType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertInternalTargetUrl } from './notification-url.util.js';
import type { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import { NotificationsRealtimeService } from './notifications-realtime.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationQueueService } from './notification-queue.service.js';
import { NotificationLogService } from './notification-log.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { NotificationEmailService } from './notification-email.service.js';
import {
  DEFAULT_NOTIFICATION_PRIORITY,
  EMAIL_ELIGIBLE_TYPES,
  typesForCategory,
  type NotificationCategory,
} from './notification-types.js';
import {
  normalizeLocale,
  resolveNotificationCopy,
  type NotificationLocale,
} from './notification-i18n.js';

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title?: string;
  message?: string;
  params?: Record<string, string | number | undefined>;
  targetUrl?: string | null;
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  dedupeKey?: string;
  /** Skip preference checks (admin critical / security) */
  force?: boolean;
  tx?: Prisma.TransactionClient;
};

const MATCH_DIGEST_WINDOW_MS = 5 * 60 * 1000;
const MATCH_DIGEST_THRESHOLD = 3;
const MATCH_RATE_LIMIT_PER_HOUR = 20;
const LOW_POINTS_THRESHOLD = 10;

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationsRealtimeService,
    private readonly preferences: NotificationPreferencesService,
    private readonly queue: NotificationQueueService,
    private readonly logs: NotificationLogService,
    private readonly push: PushNotificationService,
    private readonly notificationEmail: NotificationEmailService,
  ) {}

  onModuleInit() {
    this.queue.register('deliver_channels', async (job) => {
      const notificationId = String(job.payload.notificationId ?? '');
      if (!notificationId) return;
      await this.deliverChannels(notificationId, job.attempts);
    });

    this.queue.register('match_project', async (job) => {
      const projectId = String(job.payload.projectId ?? '');
      if (!projectId) return;
      await this.matchProjectToFreelancers(projectId);
    });
  }

  /**
   * Primary entry: create inbox row (+ optional channel fan-out).
   * Safe to call from business services; channel delivery is async.
   */
  async notify(input: NotifyInput) {
    const channels = input.force
      ? { inAppEnabled: true, pushEnabled: true, emailEnabled: true }
      : await this.preferences.resolveChannels(input.userId, input.type);

    if (!channels.inAppEnabled && !input.force) {
      await this.logs.record({
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        status: NotificationDeliveryStatus.SKIPPED,
        errorMessage: 'in-app disabled by preference',
      });
      return null;
    }

    if (input.dedupeKey) {
      const existing = await this.prisma.notification.findUnique({
        where: {
          userId_dedupeKey: {
            userId: input.userId,
            dedupeKey: input.dedupeKey,
          },
        },
      });
      if (existing) {
        return this.formatNotification(existing);
      }
    }

    const locale = await this.resolveUserLocale(input.userId);
    const copy = resolveNotificationCopy(
      input.type,
      locale,
      input.params ?? {},
    );
    const title = input.title?.trim() || copy.title;
    const message = input.message?.trim() || copy.message;
    const safeTargetUrl = assertInternalTargetUrl(input.targetUrl);
    const priority =
      input.priority ?? DEFAULT_NOTIFICATION_PRIORITY[input.type];

    const client = input.tx ?? this.prisma;

    let notification;
    try {
      notification = await client.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title,
          message,
          targetUrl: safeTargetUrl ?? null,
          entityType: input.entityType,
          entityId: input.entityId,
          priority,
          dedupeKey: input.dedupeKey,
          data: (input.data ??
            input.params ??
            undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        input.dedupeKey
      ) {
        const existing = await this.prisma.notification.findUnique({
          where: {
            userId_dedupeKey: {
              userId: input.userId,
              dedupeKey: input.dedupeKey,
            },
          },
        });
        return existing ? this.formatNotification(existing) : null;
      }
      throw err;
    }

    await this.logs.record({
      notificationId: notification.id,
      userId: input.userId,
      channel: NotificationChannel.IN_APP,
      status: NotificationDeliveryStatus.SENT,
      sentAt: new Date(),
    });

    if (!input.tx) {
      this.emitRealtime(notification);
      this.queue.enqueue('deliver_channels', {
        notificationId: notification.id,
        pushEnabled: channels.pushEnabled,
        emailEnabled:
          channels.emailEnabled && EMAIL_ELIGIBLE_TYPES.has(input.type),
        locale,
        cta: copy.cta,
      });
    }

    this.logger.log(
      `notification created id=${notification.id} type=${notification.type}`,
    );

    return this.formatNotification(notification);
  }

  /** Backward-compatible wrapper used by existing services */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    targetUrl?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.notify({
      userId,
      type,
      title,
      message,
      targetUrl,
      tx,
    });
  }

  async createManyForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    targetUrl?: string | null,
    batchSize = 200,
  ) {
    const safeTargetUrl = assertInternalTargetUrl(targetUrl) ?? null;
    if (!userIds.length) {
      return { count: 0, targetUrl: safeTargetUrl };
    }

    let count = 0;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const chunk = userIds.slice(i, i + batchSize);
      for (const userId of chunk) {
        const created = await this.notify({
          userId,
          type,
          title,
          message,
          targetUrl: safeTargetUrl,
          force: true,
        });
        if (created) count += 1;
      }
    }

    return { count, targetUrl: safeTargetUrl };
  }

  async createOrAggregateMessageNotification(
    userId: string,
    conversationId: string,
    senderName: string,
    preview: string,
  ) {
    const targetUrl = `/messages/${conversationId}`;
    const locale = await this.resolveUserLocale(userId);

    const existing = await this.prisma.notification.findFirst({
      where: {
        userId,
        type: NotificationType.NEW_MESSAGE,
        isRead: false,
        targetUrl,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const copy = resolveNotificationCopy(NotificationType.NEW_MESSAGE, locale, {
        senderName,
        preview,
      });
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          title:
            locale === 'en'
              ? `New messages from ${senderName}`
              : `رسائل جديدة من ${senderName}`,
          message: copy.message || preview,
        },
      });
      this.emitRealtime(updated);
      return updated;
    }

    return this.notify({
      userId,
      type: NotificationType.NEW_MESSAGE,
      params: { senderName, preview },
      targetUrl,
      entityType: 'conversation',
      entityId: conversationId,
      data: { conversationId, senderName },
    });
  }

  enqueueProjectMatch(projectId: string) {
    this.queue.enqueue('match_project', { projectId }, { delayMs: 250 });
  }

  async matchProjectToFreelancers(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        category: true,
        city: true,
        skills: { include: { skill: true } },
      },
    });

    if (!project || project.status !== 'OPEN') return;

    const skillIds = project.skills.map((s) => s.skillId);
    if (!skillIds.length) return;

    const freelancers = await this.prisma.user.findMany({
      where: {
        role: Role.FREELANCER,
        status: UserStatus.ACTIVE,
        id: { not: project.clientId },
        profile: {
          freelancerProfile: {
            skills: { some: { skillId: { in: skillIds } } },
          },
        },
      },
      select: {
        id: true,
        profile: {
          select: {
            cityId: true,
            workMode: true,
            preferredLocale: true,
            freelancerProfile: {
              select: {
                skills: { select: { skillId: true } },
              },
            },
          },
        },
      },
      take: 200,
    });

    const budgetLabel = this.formatBudget(
      project.budgetMin,
      project.budgetMax,
      project.currency,
    );
    const categoryName = project.category.nameAr;
    const targetUrl = `/projects/${project.slug}`;
    const now = Date.now();
    const hourAgo = new Date(now - 60 * 60 * 1000);

    const candidates: string[] = [];

    for (const user of freelancers) {
      const profile = user.profile;
      if (!profile?.freelancerProfile) continue;

      const overlap = profile.freelancerProfile.skills.filter((s) =>
        skillIds.includes(s.skillId),
      ).length;
      if (overlap < 1) continue;

      // Soft city / work-mode preference — not hard filters
      let score = overlap;
      if (project.cityId && profile.cityId === project.cityId) score += 1;
      if (profile.workMode === project.workMode) score += 1;
      if (score < 1) continue;

      const recentCount = await this.prisma.notification.count({
        where: {
          userId: user.id,
          type: {
            in: [
              NotificationType.PROJECT_MATCHED,
              NotificationType.PROJECT_MATCHED_DIGEST,
            ],
          },
          createdAt: { gte: hourAgo },
        },
      });
      if (recentCount >= MATCH_RATE_LIMIT_PER_HOUR) continue;

      candidates.push(user.id);
    }

    // Digests: group if many matches for same user in short window — we create
    // per-user and aggregate unread PROJECT_MATCHED into digest when threshold hit.
    for (const userId of candidates) {
      const recentWindow = new Date(now - MATCH_DIGEST_WINDOW_MS);
      const pendingMatches = await this.prisma.notification.count({
        where: {
          userId,
          type: NotificationType.PROJECT_MATCHED,
          isRead: false,
          createdAt: { gte: recentWindow },
        },
      });

      if (pendingMatches + 1 >= MATCH_DIGEST_THRESHOLD) {
        await this.notify({
          userId,
          type: NotificationType.PROJECT_MATCHED_DIGEST,
          params: { count: pendingMatches + 1 },
          targetUrl: '/projects',
          entityType: 'project',
          entityId: project.id,
          dedupeKey: `project-digest:${userId}:${Math.floor(now / MATCH_DIGEST_WINDOW_MS)}`,
          data: { projectIds: [project.id] },
        });
        continue;
      }

      await this.notify({
        userId,
        type: NotificationType.PROJECT_MATCHED,
        params: { categoryName, budgetLabel },
        targetUrl,
        entityType: 'project',
        entityId: project.id,
        dedupeKey: `project-matched:${project.id}:${userId}`,
        data: {
          projectId: project.id,
          slug: project.slug,
          categoryName,
          budgetLabel,
        },
      });
    }
  }

  async notifyPointsEvent(input: {
    userId: string;
    type:
      | typeof NotificationType.POINTS_EARNED
      | typeof NotificationType.POINTS_SPENT
      | typeof NotificationType.LOW_POINTS
      | typeof NotificationType.INSUFFICIENT_POINTS;
    points?: number;
    reason?: string;
    balanceAfter?: number;
  }) {
    await this.notify({
      userId: input.userId,
      type: input.type,
      params: {
        points: input.points,
        reason: input.reason,
      },
      targetUrl: '/dashboard/nuqati',
      entityType: 'points',
      data: {
        points: input.points,
        balanceAfter: input.balanceAfter,
      },
    });

    if (
      input.balanceAfter != null &&
      input.balanceAfter > 0 &&
      input.balanceAfter <= LOW_POINTS_THRESHOLD &&
      input.type !== NotificationType.LOW_POINTS
    ) {
      await this.notify({
        userId: input.userId,
        type: NotificationType.LOW_POINTS,
        params: { points: input.balanceAfter },
        targetUrl: '/dashboard/nuqati',
        dedupeKey: `low-points:${input.userId}:${new Date().toISOString().slice(0, 10)}`,
      });
    }
  }

  async listForUser(userId: string, query: NotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };

    if (query.status === 'unread') {
      where.isRead = false;
    } else if (query.status === 'read') {
      where.isRead = true;
    }

    if (query.type) {
      where.type = query.type;
    } else if (query.category && query.category !== 'all') {
      const types = typesForCategory(query.category as NotificationCategory);
      if (types) where.type = { in: types };
    }

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      items: items.map((item) => this.formatNotification(item)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async listLatest(userId: string, limit = 8) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return items.map((item) => this.formatNotification(item));
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }

    if (notification.isRead) {
      return this.formatNotification(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    this.logger.log(`notification read id=${notificationId}`);
    return this.formatNotification(updated);
  }

  async markUnread(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: false, readAt: null },
    });
    return this.formatNotification(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { affected: result.count };
  }

  async deleteOne(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('الإشعار غير موجود');
    }
    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { deleted: true };
  }

  async clearAll(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { deleted: result.count };
  }

  async markReadByTargetUrl(userId: string, targetUrl: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        targetUrl,
        type: NotificationType.NEW_MESSAGE,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }

  formatNotification(notification: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    targetUrl: string | null;
    isRead: boolean;
    createdAt: Date;
    priority?: NotificationPriority;
    entityType?: string | null;
    entityId?: string | null;
    data?: Prisma.JsonValue | null;
    readAt?: Date | null;
  }) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.targetUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      priority: notification.priority ?? NotificationPriority.NORMAL,
      entityType: notification.entityType ?? null,
      entityId: notification.entityId ?? null,
      data: notification.data ?? null,
      readAt: notification.readAt ?? null,
    };
  }

  private async deliverChannels(
    notificationId: string,
    retryCount: number,
  ) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            email: true,
            profile: { select: { preferredLocale: true } },
          },
        },
      },
    });
    if (!notification) return;

    const channels = await this.preferences.resolveChannels(
      notification.userId,
      notification.type,
    );
    const locale = normalizeLocale(
      notification.user.profile?.preferredLocale,
    );
    const copy = resolveNotificationCopy(notification.type, locale, {
      ...(typeof notification.data === 'object' &&
      notification.data &&
      !Array.isArray(notification.data)
        ? (notification.data as Record<string, string | number>)
        : {}),
    });

    if (channels.pushEnabled) {
      const pushResult = await this.push.notifyUser(notification.userId, {
        title: notification.title,
        body: notification.message,
        notificationId: notification.id,
        data: {
          url: notification.targetUrl ?? '/notifications',
          type: notification.type,
        },
      });
      await this.logs.record({
        notificationId: notification.id,
        userId: notification.userId,
        channel: NotificationChannel.PUSH,
        status:
          pushResult.failed > 0 && pushResult.accepted === 0
            ? NotificationDeliveryStatus.FAILED
            : pushResult.accepted > 0
              ? NotificationDeliveryStatus.SENT
              : NotificationDeliveryStatus.SKIPPED,
        errorMessage: pushResult.errors?.[0],
        retryCount,
        sentAt: pushResult.accepted > 0 ? new Date() : null,
      });
      if (pushResult.failed > 0 && pushResult.accepted === 0) {
        throw new Error(pushResult.errors?.[0] ?? 'push failed');
      }
    }

    if (
      channels.emailEnabled &&
      EMAIL_ELIGIBLE_TYPES.has(notification.type)
    ) {
      try {
        await this.notificationEmail.send({
          to: notification.user.email,
          locale,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          targetUrl: notification.targetUrl,
          ctaLabel: copy.cta,
        });
        await this.logs.record({
          notificationId: notification.id,
          userId: notification.userId,
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.SENT,
          retryCount,
          sentAt: new Date(),
        });
      } catch (err) {
        await this.logs.record({
          notificationId: notification.id,
          userId: notification.userId,
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.FAILED,
          errorMessage: err instanceof Error ? err.message : 'email failed',
          retryCount,
        });
        throw err;
      }
    }
  }

  private async resolveUserLocale(userId: string): Promise<NotificationLocale> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { preferredLocale: true },
    });
    return normalizeLocale(profile?.preferredLocale);
  }

  private formatBudget(
    min: Prisma.Decimal | null,
    max: Prisma.Decimal | null,
    currency: string,
  ) {
    const unit = currency === 'LYD' ? 'د.ل' : currency;
    if (min != null && max != null) {
      return `${min.toString()}–${max.toString()} ${unit}`;
    }
    if (min != null) return `${min.toString()}+ ${unit}`;
    if (max != null) return `حتى ${max.toString()} ${unit}`;
    return unit;
  }

  private emitRealtime(notification: {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    targetUrl: string | null;
    isRead: boolean;
    createdAt: Date;
    priority?: NotificationPriority;
  }) {
    this.realtime.emitToUser(notification.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.targetUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      priority: notification.priority ?? NotificationPriority.NORMAL,
    });
  }
}
