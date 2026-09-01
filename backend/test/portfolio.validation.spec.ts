import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import {
  assertPortfolioOwnership,
  validatePortfolioDescription,
  validatePortfolioTitle,
  validatePortfolioUrl,
  validateReorderIds,
  validateSkillIds,
  PORTFOLIO_MAX_SKILLS,
} from '../src/portfolio/portfolio-validation.util.js';

describe('portfolio validation', () => {
  it('validates title length', () => {
    expect(() => validatePortfolioTitle('ab')).toThrow();
    expect(validatePortfolioTitle('  عنوان عمل صالح  ')).toBe('عنوان عمل صالح');
  });

  it('validates description length', () => {
    expect(() => validatePortfolioDescription('قصير')).toThrow();
    expect(
      validatePortfolioDescription(
        'وصف عمل احترافي يشرح المشروع والتقنيات المستخدمة والنتائج المحققة بشكل واضح.',
      ),
    ).toContain('وصف عمل');
  });

  it('validates http/https URLs only', () => {
    expect(validatePortfolioUrl('https://example.com/project')).toBe(
      'https://example.com/project',
    );
    expect(() => validatePortfolioUrl('javascript:alert(1)')).toThrow();
    expect(() => validatePortfolioUrl('ftp://bad.com')).toThrow();
  });

  it('enforces skill limits', () => {
    const ids = Array.from({ length: PORTFOLIO_MAX_SKILLS + 1 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    );
    expect(() => validateSkillIds(ids)).toThrow();
    expect(validateSkillIds(['a', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('validates reorder ids', () => {
    expect(() => validateReorderIds([])).toThrow();
    expect(() => validateReorderIds(['a', 'a'])).toThrow();
    expect(validateReorderIds(['id-1', 'id-2'])).toEqual(['id-1', 'id-2']);
  });

  it('asserts ownership', () => {
    expect(() =>
      assertPortfolioOwnership('owner-1', 'owner-2'),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertPortfolioOwnership('owner-1', 'owner-1'),
    ).not.toThrow();
  });
});
