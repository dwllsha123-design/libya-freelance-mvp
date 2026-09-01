import type { ExpandedBrief } from '@/lib/expand-brief';

const STORAGE_KEY = 'lf_project_brief';

export function saveProjectBriefDraft(draft: ExpandedBrief) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function consumeProjectBriefDraft(): ExpandedBrief | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExpandedBrief;
    if (parsed.title && parsed.description) return parsed;
  } catch {
    /* legacy string */
  }
  return { title: raw.slice(0, 100), description: raw };
}
