import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationLogService {
  private readonly logger = new Logger(NotificationLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    notificationId?: string | null;
    userId?: string | null;
    channel: NotificationChannel;
    status: NotificationDeliveryStatus;
    errorMessage?: string | null;
    retryCount?: number;
    sentAt?: Date | null;
  }) {
    try {
      return await this.prisma.notificationLog.create({
        data: {
          notificationId: input.notificationId ?? null,
          userId: input.userId ?? null,
          channel: input.channel,
          status: input.status,
          errorMessage: input.errorMessage
            ? input.errorMessage.slice(0, 500)
            : null,
          retryCount: input.retryCount ?? 0,
          sentAt: input.sentAt ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write notification log: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
      return null;
    }
  }

  async getAdminStats(since?: Date) {
    const where: Prisma.NotificationLogWhereInput = since
      ? { createdAt: { gte: since } }
      : {};

    const [
      totalNotifications,
      unread,
      read,
      logs,
      failed,
      pushSent,
      emailSent,
    ] = await Promise.all([
      this.prisma.notification.count({
        where: since ? { createdAt: { gte: since } } : undefined,
      }),
      this.prisma.notification.count({
        where: {
          isRead: false,
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      this.prisma.notification.count({
        where: {
          isRead: true,
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      this.prisma.notificationLog.groupBy({
        by: ['channel', 'status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.notificationLog.count({
        where: { status: NotificationDeliveryStatus.FAILED, ...where },
      }),
      this.prisma.notificationLog.count({
        where: {
          channel: NotificationChannel.PUSH,
          status: NotificationDeliveryStatus.SENT,
          ...where,
        },
      }),
      this.prisma.notificationLog.count({
        where: {
          channel: NotificationChannel.EMAIL,
          status: NotificationDeliveryStatus.SENT,
          ...where,
        },
      }),
    ]);

    const pushAttempts = logs
      .filter((l) => l.channel === NotificationChannel.PUSH)
      .reduce((sum, l) => sum + l._count._all, 0);
    const emailAttempts = logs
      .filter((l) => l.channel === NotificationChannel.EMAIL)
      .reduce((sum, l) => sum + l._count._all, 0);

    return {
      totalNotifications,
      unread,
      read,
      readRate:
        totalNotifications === 0
          ? 0
          : Number(((read / totalNotifications) * 100).toFixed(1)),
      pushDeliveryRate:
        pushAttempts === 0
          ? 0
          : Number(((pushSent / pushAttempts) * 100).toFixed(1)),
      emailDeliveryRate:
        emailAttempts === 0
          ? 0
          : Number(((emailSent / emailAttempts) * 100).toFixed(1)),
      failed,
      byChannelStatus: logs.map((l) => ({
        channel: l.channel,
        status: l.status,
        count: l._count._all,
      })),
    };
  }
}
