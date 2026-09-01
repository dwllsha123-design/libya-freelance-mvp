import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { assertInternalTargetUrl } from './notification-url.util.js';
import type { NotificationsQueryDto } from './dto/notifications-query.dto.js';
import { NotificationsRealtimeService } from './notifications-realtime.service.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationsRealtimeService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    targetUrl?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const safeTargetUrl = assertInternalTargetUrl(targetUrl);

    const notification = await client.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        targetUrl: safeTargetUrl,
      },
    });

    if (!tx) {
      this.emitRealtime(notification);
    }

    return notification;
  }

  async createOrAggregateMessageNotification(
    userId: string,
    conversationId: string,
    senderName: string,
    preview: string,
  ) {
    const targetUrl = `/messages/${conversationId}`;

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
      const updated = await this.prisma.notification.update({
        where: { id: existing.id },
        data: {
          title: 'رسائل جديدة',
          message: `لديك رسائل جديدة من ${senderName}`,
        },
      });

      this.emitRealtime(updated);
      return updated;
    }

    return this.create(
      userId,
      NotificationType.NEW_MESSAGE,
      'رسالة جديدة',
      preview,
      targetUrl,
    );
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

  async listLatest(userId: string, limit = 5) {
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
      data: { isRead: true },
    });

    return this.formatNotification(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { affected: result.count };
  }

  async markReadByTargetUrl(userId: string, targetUrl: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        targetUrl,
        type: NotificationType.NEW_MESSAGE,
        isRead: false,
      },
      data: { isRead: true },
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
  }) {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.targetUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
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
  }) {
    this.realtime.emitToUser(notification.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetUrl: notification.targetUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });
  }
}
