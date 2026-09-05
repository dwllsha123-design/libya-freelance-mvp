import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  assertProductionSmtpConfig,
  resolveEmailConfig,
  type SmtpRuntimeConfig,
} from './email-config.util.js';
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from './email-templates.js';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private smtp: SmtpRuntimeConfig | null = null;
  private deliveryEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const nodeEnv = (
      this.configService.get<string>('nodeEnv') ??
      process.env.NODE_ENV ??
      'development'
    ).toLowerCase();

    const raw = {
      host: this.configService.get<string>('email.smtpHost'),
      port: this.configService.get<string | number>('email.smtpPort'),
      secure: this.configService.get<string | boolean>('email.smtpSecure'),
      user: this.configService.get<string>('email.smtpUser'),
      password: this.configService.get<string>('email.smtpPassword'),
      from: this.configService.get<string>('email.from'),
    };

    try {
      if (nodeEnv === 'production') {
        this.smtp = assertProductionSmtpConfig(raw);
        this.deliveryEnabled = true;
      } else {
        const resolved = resolveEmailConfig(raw);
        if (resolved.mode === 'enabled') {
          this.smtp = resolved.smtp;
          this.deliveryEnabled = true;
        } else {
          this.deliveryEnabled = false;
          this.logger.warn(
            'Transactional email delivery is disabled (SMTP not configured).',
          );
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid SMTP configuration';
      // Never include password or tokens
      this.logger.error(`SMTP configuration error: ${message}`);
      throw new Error(message);
    }

    if (this.deliveryEnabled && this.smtp) {
      this.transporter = nodemailer.createTransport({
        host: this.smtp.host,
        port: this.smtp.port,
        secure: this.smtp.secure,
        auth: {
          user: this.smtp.user,
          pass: this.smtp.password,
        },
        tls: {
          // Explicit: never disable certificate validation
          rejectUnauthorized: true,
        },
      });
      this.logger.log(
        `SMTP transport ready (host configured, port ${this.smtp.port}, secure=${this.smtp.secure})`,
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const expiresIn =
      this.configService.get<string>('tokens.passwordResetExpiresIn') ?? '1h';
    const content = buildPasswordResetEmail(
      frontendUrl,
      token,
      this.humanizeExpiry(expiresIn),
    );
    await this.dispatch('password_reset', email, content);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const expiresIn =
      this.configService.get<string>('tokens.emailVerificationExpiresIn') ??
      '24h';
    const content = buildEmailVerificationEmail(
      frontendUrl,
      token,
      this.humanizeExpiry(expiresIn),
    );
    await this.dispatch('email_verification', email, content);
  }

  /**
   * Platform notification emails. Failures are logged and rethrown so the
   * notification retry queue can attempt again — never includes secrets.
   */
  async sendNotificationEmail(
    email: string,
    content: { subject: string; text: string; html: string },
  ): Promise<void> {
    await this.dispatch('notification', email, content);
  }

  private humanizeExpiry(raw: string): string {
    const trimmed = raw.trim().toLowerCase();
    const match = /^(\d+)([smhd])$/.exec(trimmed);
    if (!match) {
      return raw;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === 'h') {
      return amount === 1 ? 'ساعة' : `${amount} ساعات`;
    }
    if (unit === 'd') {
      return amount === 1 ? 'يوم' : `${amount} أيام`;
    }
    if (unit === 'm') {
      return `${amount} دقيقة`;
    }
    return `${amount} ثانية`;
  }

  private async dispatch(
    kind: 'password_reset' | 'email_verification' | 'notification',
    to: string,
    content: { subject: string; text: string; html: string },
  ): Promise<void> {
    if (!this.deliveryEnabled || !this.transporter || !this.smtp) {
      this.logger.warn(
        `Skipped ${kind} email (SMTP delivery disabled in this environment).`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.smtp.from,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
      this.logger.log(`Sent ${kind} email successfully`);
    } catch {
      this.logger.error(`Failed to send ${kind} email via SMTP`);
      throw new InternalServerErrorException(
        'تعذر إرسال البريد الإلكتروني. حاول مرة أخرى لاحقاً.',
      );
    }
  }
}
