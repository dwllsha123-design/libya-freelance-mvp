import { BadRequestException } from '@nestjs/common';

export const PROFILE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const PORTFOLIO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const PROFILE_MAX_SIZE = 2 * 1024 * 1024;
export const PORTFOLIO_MAX_SIZE = 5 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

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

export function extensionForMime(mimeType: string): string {
  return MIME_EXTENSION[mimeType] ?? '.bin';
}

export function buildProfileObjectKey(userId: string, mimeType: string): string {
  assertSafePathSegment(userId, 'userId');
  const id = cryptoRandomId();
  return `profile-images/${userId}/${id}${extensionForMime(mimeType)}`;
}

export function buildPortfolioObjectKey(
  userId: string,
  portfolioItemId: string,
  mimeType: string,
): string {
  assertSafePathSegment(userId, 'userId');
  assertSafePathSegment(portfolioItemId, 'portfolioItemId');
  const id = cryptoRandomId();
  return `portfolio/${userId}/${portfolioItemId}/${id}${extensionForMime(mimeType)}`;
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
