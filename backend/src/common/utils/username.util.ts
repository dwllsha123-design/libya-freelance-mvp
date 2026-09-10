import { BadRequestException } from '@nestjs/common';
import {
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '../constants/profile.constants.js';
import { slugifyUsername } from './token.util.js';

export function normalizeUsername(value: string): string {
  return slugifyUsername(value);
}

function hasUnsafeUsernameInput(raw: string): boolean {
  const value = raw.trim();
  if (!value) return true;
  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    return true;
  }
  if (/[%?#\s!]/.test(value)) {
    return true;
  }
  return false;
}

/** True when normalized username is URL-safe and not reserved. */
export function isValidPublicUsername(username: string): boolean {
  if (hasUnsafeUsernameInput(username)) {
    return false;
  }
  const normalized = normalizeUsername(username);
  if (
    normalized.length < USERNAME_MIN_LENGTH ||
    normalized.length > USERNAME_MAX_LENGTH
  ) {
    return false;
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return false;
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return false;
  }
  return true;
}

/**
 * Build a stable base slug from a display name.
 * Does not guarantee uniqueness — callers must collide-resolve.
 */
export function usernameBaseFromName(firstName: string, lastName: string): string {
  const fromName = normalizeUsername(`${firstName}-${lastName}`);
  if (fromName && isValidPublicUsername(fromName)) {
    return fromName;
  }
  if (
    fromName &&
    USERNAME_PATTERN.test(fromName) &&
    fromName.length >= USERNAME_MIN_LENGTH
  ) {
    const prefixed = normalizeUsername(`user-${fromName}`);
    if (prefixed && isValidPublicUsername(prefixed)) {
      return prefixed.slice(0, USERNAME_MAX_LENGTH).replace(/-+$/g, '');
    }
  }
  return 'user';
}

/**
 * Candidate sequence: base, base-2, base-3, ...
 * Caps numeric suffix length so total stays within USERNAME_MAX_LENGTH.
 */
export function usernameCandidate(base: string, collisionIndex: number): string {
  const safeBase =
    base.length >= USERNAME_MIN_LENGTH && USERNAME_PATTERN.test(base)
      ? base
      : 'user';
  if (collisionIndex <= 0) {
    return safeBase.slice(0, USERNAME_MAX_LENGTH);
  }
  const suffix = `-${collisionIndex + 1}`;
  const maxBaseLen = USERNAME_MAX_LENGTH - suffix.length;
  const trimmed = safeBase
    .slice(0, Math.max(USERNAME_MIN_LENGTH, maxBaseLen))
    .replace(/-+$/g, '');
  return `${trimmed}${suffix}`;
}

export function validateUsername(username: string): void {
  if (hasUnsafeUsernameInput(username)) {
    throw new BadRequestException(
      'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط',
    );
  }

  const normalized = normalizeUsername(username);

  if (
    normalized.length < USERNAME_MIN_LENGTH ||
    normalized.length > USERNAME_MAX_LENGTH
  ) {
    throw new BadRequestException(
      `اسم المستخدم يجب أن يكون بين ${USERNAME_MIN_LENGTH} و ${USERNAME_MAX_LENGTH} حرفاً`,
    );
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    throw new BadRequestException(
      'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط',
    );
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    throw new BadRequestException('اسم المستخدم محجوز');
  }
}
