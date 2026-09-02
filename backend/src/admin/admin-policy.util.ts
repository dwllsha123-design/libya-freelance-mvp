import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';

export function assertAdminCanModerateUser(
  adminId: string,
  target: { id: string; role: Role },
) {
  if (adminId === target.id) {
    throw new ForbiddenException('لا يمكنك تعديل حسابك الإداري من هنا');
  }

  if (target.role === Role.ADMIN || target.role === Role.SUPER_ADMIN) {
    throw new ForbiddenException('لا يمكن تعديل حساب إداري آخر');
  }
}

export function assertValidStatusTransition(
  current: UserStatus,
  next: UserStatus,
) {
  if (current === next) {
    return;
  }

  const allowed: Record<UserStatus, UserStatus[]> = {
    [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.BANNED],
    [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.BANNED],
    [UserStatus.BANNED]: [UserStatus.ACTIVE],
  };

  if (!allowed[current].includes(next)) {
    throw new BadRequestException('انتقال حالة الحساب غير مسموح');
  }
}

export function slugifyAdmin(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug || slug.length < 2) {
    throw new BadRequestException('المعرّف غير صالح');
  }

  return slug;
}
