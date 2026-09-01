import { BadRequestException } from '@nestjs/common';
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
} from './messaging.constants.js';

export function validateMessageContent(content: string): string {
  const trimmed = content.trim();

  if (trimmed.length < MESSAGE_MIN_LENGTH) {
    throw new BadRequestException('الرسالة فارغة');
  }

  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    throw new BadRequestException('الرسالة طويلة جداً');
  }

  return trimmed;
}
