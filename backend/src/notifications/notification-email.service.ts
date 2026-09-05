import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { EmailService } from '../common/services/email.service.js';
import { buildNotificationEmail } from '../common/services/notification-email-templates.js';
import type { NotificationLocale } from './notification-i18n.js';

@Injectable()
export class NotificationEmailService {
  private readonly logger = new Logger(NotificationEmailService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async send(input: {
    to: string;
    locale: NotificationLocale;
    type: NotificationType;
    title: string;
    message: string;
    targetUrl?: string | null;
    ctaLabel?: string;
  }): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const path = input.targetUrl?.startsWith('/')
      ? input.targetUrl
      : '/notifications';
    const actionUrl = `${frontendUrl.replace(/\/$/, '')}/${input.locale}${path}`;
    const prefsUrl = `${frontendUrl.replace(/\/$/, '')}/${input.locale}/settings/notifications`;

    const content = buildNotificationEmail({
      locale: input.locale,
      title: input.title,
      message: input.message,
      actionUrl,
      ctaLabel: input.ctaLabel,
      preferencesUrl: prefsUrl,
    });

    await this.emailService.sendNotificationEmail(input.to, content);
    this.logger.log(`Queued notification email type=${input.type}`);
  }
}
