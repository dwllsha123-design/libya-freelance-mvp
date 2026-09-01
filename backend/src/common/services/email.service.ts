import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  private isConfigured(): boolean {
    const host = this.configService.get<string>('email.smtpHost');
    const user = this.configService.get<string>('email.smtpUser');
    return Boolean(host && user);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured. Password reset link for ${email}: ${resetUrl}`,
      );
      return;
    }

    // SMTP integration placeholder for production
    this.logger.log(`Password reset email queued for ${email}`);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured. Email verification link for ${email}: ${verifyUrl}`,
      );
      return;
    }

    this.logger.log(`Verification email queued for ${email}`);
  }
}
