import { generateProjectSlug } from '../src/projects/project-slug.util.js';
import { describe, expect, it } from 'vitest';

describe('project slug', () => {
  it('generates url-safe slugs with suffix', () => {
    const slug = generateProjectSlug('تصميم متجر إلكتروني');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain('-');
  });

  it('generates unique slugs for same title', () => {
    const a = generateProjectSlug('Build Store');
    const b = generateProjectSlug('Build Store');
    expect(a).not.toBe(b);
  });
});
