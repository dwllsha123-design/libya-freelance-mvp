import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  categoryForType,
  type NotificationCategory,
} from './notification-types.js';

export type ChannelFlags = {
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
};

const CATEGORY_DEFAULTS: Record<
  NotificationCategory | 'GLOBAL',
  ChannelFlags
> = {
  GLOBAL: { inAppEnabled: true, pushEnabled: true, emailEnabled: true },
  PROJECTS: { inAppEnabled: true, pushEnabled: true, emailEnabled: false },
  MESSAGES: { inAppEnabled: true, pushEnabled: true, emailEnabled: false },
  PAYMENTS: { inAppEnabled: true, pushEnabled: true, emailEnabled: true },
  POINTS: { inAppEnabled: true, pushEnabled: false, emailEnabled: false },
  SYSTEM: { inAppEnabled: true, pushEnabled: true, emailEnabled: true },
};

const PREFERENCE_KEYS = [
  'GLOBAL',
  'PROJECTS',
  'MESSAGES',
  'PAYMENTS',
  'POINTS',
  'SYSTEM',
] as const;

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string) {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    const byKey = new Map(rows.map((r) => [r.notificationType, r]));

    return PREFERENCE_KEYS.map((key) => {
      const existing = byKey.get(key);
      const defaults = CATEGORY_DEFAULTS[key];
      return {
        notificationType: key,
        inAppEnabled: existing?.inAppEnabled ?? defaults.inAppEnabled,
        pushEnabled: existing?.pushEnabled ?? defaults.pushEnabled,
        emailEnabled: existing?.emailEnabled ?? defaults.emailEnabled,
      };
    });
  }

  async updateForUser(
    userId: string,
    updates: Array<{
      notificationType: string;
      inAppEnabled?: boolean;
      pushEnabled?: boolean;
      emailEnabled?: boolean;
    }>,
  ) {
    const allowed = new Set<string>(PREFERENCE_KEYS);
    for (const update of updates) {
      if (!allowed.has(update.notificationType)) continue;
      const defaults =
        CATEGORY_DEFAULTS[
          update.notificationType as keyof typeof CATEGORY_DEFAULTS
        ];
      await this.prisma.notificationPreference.upsert({
        where: {
          userId_notificationType: {
            userId,
            notificationType: update.notificationType,
          },
        },
        create: {
          userId,
          notificationType: update.notificationType,
          inAppEnabled: update.inAppEnabled ?? defaults.inAppEnabled,
          pushEnabled: update.pushEnabled ?? defaults.pushEnabled,
          emailEnabled: update.emailEnabled ?? defaults.emailEnabled,
        },
        update: {
          ...(update.inAppEnabled !== undefined
            ? { inAppEnabled: update.inAppEnabled }
            : {}),
          ...(update.pushEnabled !== undefined
            ? { pushEnabled: update.pushEnabled }
            : {}),
          ...(update.emailEnabled !== undefined
            ? { emailEnabled: update.emailEnabled }
            : {}),
        },
      });
    }
    return this.getForUser(userId);
  }

  async resolveChannels(
    userId: string,
    type: NotificationType,
  ): Promise<ChannelFlags> {
    const category = categoryForType(type);
    const rows = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        notificationType: { in: ['GLOBAL', category, type] },
      },
    });
    const byKey = new Map(rows.map((r) => [r.notificationType, r]));
    const global = byKey.get('GLOBAL');
    const cat = byKey.get(category);
    const specific = byKey.get(type);

    const base = { ...CATEGORY_DEFAULTS[category] };
    if (global) {
      base.inAppEnabled = global.inAppEnabled && base.inAppEnabled;
      base.pushEnabled = global.pushEnabled && base.pushEnabled;
      base.emailEnabled = global.emailEnabled && base.emailEnabled;
    }
    if (cat) {
      base.inAppEnabled = cat.inAppEnabled;
      base.pushEnabled = cat.pushEnabled;
      base.emailEnabled = cat.emailEnabled;
    }
    if (specific) {
      base.inAppEnabled = specific.inAppEnabled;
      base.pushEnabled = specific.pushEnabled;
      base.emailEnabled = specific.emailEnabled;
    }
    return base;
  }
}
