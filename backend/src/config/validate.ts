import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Environment, EnvironmentVariables } from './env.validation.js';
import { assertProductionSmtpConfig } from '../common/services/email-config.util.js';

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (validatedConfig.NODE_ENV === Environment.Production) {
    try {
      assertProductionSmtpConfig({
        host: validatedConfig.SMTP_HOST,
        port: validatedConfig.SMTP_PORT,
        secure: validatedConfig.SMTP_SECURE,
        user: validatedConfig.SMTP_USER,
        password: validatedConfig.SMTP_PASSWORD,
        from: validatedConfig.EMAIL_FROM,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid production SMTP configuration';
      throw new Error(message);
    }

    // Reject obviously malformed SMTP_SECURE when provided
    if (
      validatedConfig.SMTP_SECURE !== undefined &&
      validatedConfig.SMTP_SECURE !== '' &&
      !['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].includes(
        validatedConfig.SMTP_SECURE.trim().toLowerCase(),
      )
    ) {
      throw new Error('SMTP_SECURE must be true or false');
    }
  } else if (
    // Partial SMTP outside production still must be complete or fully absent
    [validatedConfig.SMTP_HOST, validatedConfig.SMTP_USER, validatedConfig.SMTP_PASSWORD, validatedConfig.SMTP_PORT]
      .some((v) => v !== undefined && String(v).trim() !== '')
  ) {
    try {
      assertProductionSmtpConfig({
        host: validatedConfig.SMTP_HOST,
        port: validatedConfig.SMTP_PORT,
        secure: validatedConfig.SMTP_SECURE,
        user: validatedConfig.SMTP_USER,
        password: validatedConfig.SMTP_PASSWORD,
        from: validatedConfig.EMAIL_FROM ?? 'support@libyanfreelance.ly',
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Incomplete SMTP configuration';
      throw new Error(message);
    }
  }

  return validatedConfig;
}
