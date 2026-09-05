import { BadRequestException } from '@nestjs/common';
import { WEBP_EXTENSION } from './image-webp.util.js';

/**
 * Accepted *input* types. Everything is re-encoded to WebP on the way in, so
 * this list only governs what a client may send, never what gets stored.
 */
export const PROFILE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const PORTFOLIO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const PROFILE_MAX_SIZE = 2 * 1024 * 1024;
export const PORTFOLIO_MAX_SIZE = 5 * 1024 * 1024;
export const CHAT_MAX_SIZE = 10 * 1024 * 1024;

export const CHAT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/zip',
]);

export function validateImageUpload(
  file: Express.Multer.File,
  allowed: Set<string>,
  maxSize: number,
) {
  if (!allowed.has(file.mimetype)) {
    throw new BadRequestException('نوع الملف غير مدعوم');
  }

  if (file.size > maxSize) {
    throw new BadRequestException('حجم الملف يتجاوز الحد المسموح');
  }
}

/**
 * Keys are always `.webp` — the extension describes the stored object, which is
 * WebP regardless of the uploaded format, so no MIME argument is involved.
 */
export function buildProfileObjectKey(userId: string): string {
  assertSafePathSegment(userId, 'userId');
  const id = cryptoRandomId();
  return `profile-images/${userId}/${id}${WEBP_EXTENSION}`;
}

export function buildPortfolioObjectKey(
  userId: string,
  portfolioItemId: string,
): string {
  assertSafePathSegment(userId, 'userId');
  assertSafePathSegment(portfolioItemId, 'portfolioItemId');
  const id = cryptoRandomId();
  return `portfolio/${userId}/${portfolioItemId}/${id}${WEBP_EXTENSION}`;
}

export function validateChatUpload(file: Express.Multer.File) {
  if (!CHAT_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException('نوع الملف غير مدعوم');
  }

  if (file.size > CHAT_MAX_SIZE) {
    throw new BadRequestException('حجم الملف يتجاوز الحد المسموح (10MB)');
  }
}

const SAFE_CHAT_EXT = /^\.(pdf|doc|docx|jpg|jpeg|png|webp|zip)$/i;

export function buildChatObjectKey(
  userId: string,
  originalName: string,
): string {
  assertSafePathSegment(userId, 'userId');
  const id = cryptoRandomId();
  const extMatch = originalName.match(/(\.[A-Za-z0-9]{1,8})$/);
  const ext = extMatch?.[1] && SAFE_CHAT_EXT.test(extMatch[1]) ? extMatch[1].toLowerCase() : '';
  return `chat/${userId}/${id}${ext}`;
}

export function assertSafePathSegment(value: string, label: string) {
  if (!value || value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new BadRequestException(`معرف ${label} غير صالح`);
  }
}

export function objectKeyFromPublicUrl(
  publicUrl: string,
  publicBaseUrl: string,
): string | null {
  const normalizedBase = publicBaseUrl.replace(/\/$/, '');
  const normalizedUrl = publicUrl.replace(/\/$/, '');

  if (!normalizedUrl.startsWith(`${normalizedBase}/`)) {
    return null;
  }

  const key = normalizedUrl.slice(normalizedBase.length + 1);
  if (!key || key.includes('..') || key.startsWith('/')) {
    return null;
  }

  return key;
}

function cryptoRandomId(): string {
  return globalThis.crypto.randomUUID();
}
