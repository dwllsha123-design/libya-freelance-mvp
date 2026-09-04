/**
 * SMTP / transactional email configuration helpers.
 * Never log passwords, tokens, or fully assembled reset/verify URLs.
 */

export type SmtpRuntimeConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
};

export type EmailDeliveryMode = 'disabled' | 'enabled';

export type ResolvedEmailConfig =
  | { mode: 'disabled'; reason: string }
  | { mode: 'enabled'; smtp: SmtpRuntimeConfig };

export function parseSmtpPort(
  value: string | number | undefined | null,
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    return undefined;
  }
  return n;
}

/**
 * SMTP_SECURE=true|false|1|0 (case-insensitive).
 * Default when unset: true for port 465, otherwise false.
 */
export function parseSmtpSecure(
  value: string | boolean | undefined | null,
  port?: number,
): boolean {
  if (value === undefined || value === null || value === '') {
    return port === 465;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(
    `SMTP_SECURE must be true or false (received malformed value)`,
  );
}

function isBlank(value: string | undefined | null): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

/**
 * Resolve SMTP from configuration / env-shaped object.
 * Partial config (some fields set, others missing) is a hard error.
 * Completely empty SMTP is "disabled" (local/dev intentional no-mail).
 */
export function resolveEmailConfig(input: {
  host?: string | null;
  port?: string | number | null;
  secure?: string | boolean | null;
  user?: string | null;
  password?: string | null;
  from?: string | null;
}): ResolvedEmailConfig {
  const host = input.host?.trim() ?? '';
  const user = input.user?.trim() ?? '';
  const password = input.password ?? '';
  const from = input.from?.trim() ?? '';
  const portRaw = input.port;

  const anySet =
    !isBlank(host) ||
    !isBlank(user) ||
    !isBlank(password) ||
    (portRaw !== undefined && portRaw !== null && String(portRaw).trim() !== '');

  if (!anySet) {
    return {
      mode: 'disabled',
      reason: 'SMTP not configured (optional outside production)',
    };
  }

  const missing: string[] = [];
  if (isBlank(host)) missing.push('SMTP_HOST');
  if (isBlank(user)) missing.push('SMTP_USER');
  if (isBlank(password)) missing.push('SMTP_PASSWORD');
  if (portRaw === undefined || portRaw === null || String(portRaw).trim() === '') {
    missing.push('SMTP_PORT');
  }
  if (isBlank(from)) missing.push('EMAIL_FROM');

  if (missing.length > 0) {
    throw new Error(
      `Incomplete SMTP configuration. Missing or empty: ${missing.join(', ')}`,
    );
  }

  const port = parseSmtpPort(portRaw);
  if (port === undefined) {
    throw new Error('SMTP_PORT must be a number between 1 and 65535');
  }

  let secure: boolean;
  try {
    secure = parseSmtpSecure(input.secure, port);
  } catch (err) {
    throw err instanceof Error ? err : new Error('Invalid SMTP_SECURE');
  }

  return {
    mode: 'enabled',
    smtp: {
      host,
      port,
      secure,
      user,
      password: String(password),
      from,
    },
  };
}

/** Production requires a complete, valid SMTP configuration. */
export function assertProductionSmtpConfig(input: {
  host?: string | null;
  port?: string | number | null;
  secure?: string | boolean | null;
  user?: string | null;
  password?: string | null;
  from?: string | null;
}): SmtpRuntimeConfig {
  const resolved = resolveEmailConfig(input);
  if (resolved.mode !== 'enabled') {
    throw new Error(
      'Production requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM',
    );
  }
  return resolved.smtp;
}
