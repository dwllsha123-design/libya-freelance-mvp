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

export function validateUsername(username: string): void {
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
