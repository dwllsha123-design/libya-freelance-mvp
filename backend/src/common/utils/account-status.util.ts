import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

const STATUS_MESSAGES: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: '',
  [UserStatus.SUSPENDED]: 'تم تعليق حسابك',
  [UserStatus.BANNED]: 'تم حظر حسابك',
};

export function assertUserCanAuthenticate(status: UserStatus): void {
  if (status === UserStatus.ACTIVE) {
    return;
  }

  throw new UnauthorizedException(
    STATUS_MESSAGES[status] ?? 'الحساب غير مسموح له بتسجيل الدخول',
  );
}

export function assertUserCanAccessProtectedResources(
  status: UserStatus,
): void {
  assertUserCanAuthenticate(status);
}
