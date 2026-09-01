import { BadRequestException } from '@nestjs/common';

const INTERNAL_PATH = /^\/[a-zA-Z0-9/_-]*$/;

export function assertInternalTargetUrl(targetUrl?: string | null) {
  if (targetUrl == null || targetUrl === '') {
    return undefined;
  }

  if (!targetUrl.startsWith('/') || targetUrl.startsWith('//')) {
    throw new BadRequestException('رابط الإشعار غير صالح');
  }

  if (!INTERNAL_PATH.test(targetUrl)) {
    throw new BadRequestException('رابط الإشعار غير صالح');
  }

  return targetUrl;
}

export function isValidInternalTargetUrl(targetUrl?: string | null) {
  try {
    assertInternalTargetUrl(targetUrl);
    return true;
  } catch {
    return false;
  }
}
