import { randomBytes } from 'node:crypto';
import { slugifyUsername } from '../common/utils/token.util.js';

export function generateProjectSlug(title: string): string {
  const base = slugifyUsername(title) || 'project';
  const suffix = randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

export async function generateUniqueProjectSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let slug = generateProjectSlug(title);
  let attempt = 0;

  while (attempt < 20) {
    if (!(await exists(slug))) {
      return slug;
    }
    slug = generateProjectSlug(title);
    attempt += 1;
  }

  return `${slug}-${Date.now()}`;
}
