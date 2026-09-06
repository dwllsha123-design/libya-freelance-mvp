import { createHash } from 'node:crypto';

export function buildVerificationObjectKey(userId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9.]/gi, '').slice(0, 10) || '.bin';
  const id = createHash('sha256')
    .update(`${userId}:${Date.now()}:${Math.random()}`)
    .digest('hex')
    .slice(0, 24);
  return `verification/${userId}/${id}${safeExt.startsWith('.') ? safeExt : `.${safeExt}`}`;
}

export function hashNationalIdLast4(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.slice(-4);
}
