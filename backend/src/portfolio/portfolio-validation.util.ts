import { BadRequestException, ForbiddenException } from '@nestjs/common';

export const PORTFOLIO_TITLE_MIN = 3;
export const PORTFOLIO_TITLE_MAX = 120;
export const PORTFOLIO_DESCRIPTION_MIN = 20;
export const PORTFOLIO_DESCRIPTION_MAX = 5000;
export const PORTFOLIO_MAX_SKILLS = 10;
export const PORTFOLIO_MAX_IMAGES = 5;

const SAFE_URL_PATTERN = /^https?:\/\/.+/i;

export function validatePortfolioTitle(title: string): string {
  const trimmed = title.trim();

  if (trimmed.length < PORTFOLIO_TITLE_MIN || trimmed.length > PORTFOLIO_TITLE_MAX) {
    throw new BadRequestException(
      `العنوان يجب أن يكون بين ${PORTFOLIO_TITLE_MIN} و ${PORTFOLIO_TITLE_MAX} حرفاً`,
    );
  }

  return trimmed;
}

export function validatePortfolioDescription(description: string): string {
  const trimmed = description.trim();

  if (
    trimmed.length < PORTFOLIO_DESCRIPTION_MIN ||
    trimmed.length > PORTFOLIO_DESCRIPTION_MAX
  ) {
    throw new BadRequestException(
      `الوصف يجب أن يكون بين ${PORTFOLIO_DESCRIPTION_MIN} و ${PORTFOLIO_DESCRIPTION_MAX} حرفاً`,
    );
  }

  return trimmed;
}

export function validatePortfolioUrl(url?: string | null): string | null {
  if (url === undefined || url === null || url.trim() === '') {
    return null;
  }

  const trimmed = url.trim();

  if (!SAFE_URL_PATTERN.test(trimmed)) {
    throw new BadRequestException('رابط المشروع يجب أن يبدأ بـ http أو https');
  }

  if (trimmed.toLowerCase().startsWith('javascript:')) {
    throw new BadRequestException('رابط غير آمن');
  }

  return trimmed;
}

export function validateSkillIds(skillIds: string[]): string[] {
  if (!Array.isArray(skillIds) || skillIds.length === 0) {
    throw new BadRequestException('يجب اختيار مهارة واحدة على الأقل');
  }

  if (skillIds.length > PORTFOLIO_MAX_SKILLS) {
    throw new BadRequestException(
      `الحد الأقصى ${PORTFOLIO_MAX_SKILLS} مهارات لكل عمل`,
    );
  }

  const unique = [...new Set(skillIds.map((id) => id.trim()).filter(Boolean))];

  if (unique.length === 0) {
    throw new BadRequestException('يجب اختيار مهارة واحدة على الأقل');
  }

  return unique;
}

export function validateReorderIds(itemIds: string[]): string[] {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new BadRequestException('قائمة الترتيب فارغة');
  }

  const unique = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];

  if (unique.length !== itemIds.length) {
    throw new BadRequestException('معرّفات مكررة في قائمة الترتيب');
  }

  return unique;
}

export function assertPortfolioOwnership(
  ownerFreelancerProfileId: string,
  itemFreelancerProfileId: string,
): void {
  if (ownerFreelancerProfileId !== itemFreelancerProfileId) {
    throw new ForbiddenException('ليس لديك صلاحية على هذا العمل');
  }
}
