/**
 * Work-mode helpers. Enabled modes come from platform setting
 * `enabledWorkModes` via GET /platform/site-config (authoritative).
 * Safe fallback when the API is unavailable: REMOTE only.
 */
import { apiRequest } from '@/lib/api';

export type WorkModeValue = 'REMOTE' | 'ON_SITE' | 'HYBRID';

export const ALL_WORK_MODES: readonly WorkModeValue[] = [
  'REMOTE',
  'ON_SITE',
  'HYBRID',
] as const;

/** Safe fallback when public settings cannot be loaded. */
export const FALLBACK_ENABLED_WORK_MODES: readonly WorkModeValue[] = [
  'REMOTE',
] as const;

export const DEFAULT_WORK_MODE: WorkModeValue = 'REMOTE';

export function isKnownWorkMode(value: unknown): value is WorkModeValue {
  return (
    typeof value === 'string' &&
    (ALL_WORK_MODES as readonly string[]).includes(value)
  );
}

export function normalizeEnabledWorkModes(raw: unknown): WorkModeValue[] {
  if (!Array.isArray(raw)) {
    return [...FALLBACK_ENABLED_WORK_MODES];
  }
  const parsed = raw.filter(isKnownWorkMode);
  return parsed.length > 0 ? parsed : [...FALLBACK_ENABLED_WORK_MODES];
}

export function isWorkModeEnabled(
  mode: WorkModeValue,
  enabled: readonly WorkModeValue[] = FALLBACK_ENABLED_WORK_MODES,
): boolean {
  return enabled.includes(mode);
}

export function shouldShowWorkModeFilter(
  enabled: readonly WorkModeValue[] = FALLBACK_ENABLED_WORK_MODES,
): boolean {
  return enabled.length > 1;
}

export function shouldShowWorkModePicker(
  enabled: readonly WorkModeValue[] = FALLBACK_ENABLED_WORK_MODES,
): boolean {
  return enabled.length > 1;
}

export function resolveDefaultWorkMode(
  enabled: readonly WorkModeValue[] = FALLBACK_ENABLED_WORK_MODES,
): WorkModeValue {
  if (enabled.includes('REMOTE')) return 'REMOTE';
  return enabled[0] ?? DEFAULT_WORK_MODE;
}

interface SiteConfigSnapshot {
  settings?: Record<string, unknown>;
}

export async function fetchEnabledWorkModes(): Promise<WorkModeValue[]> {
  try {
    const snap = await apiRequest<SiteConfigSnapshot>('/platform/site-config');
    return normalizeEnabledWorkModes(snap.settings?.enabledWorkModes);
  } catch {
    return [...FALLBACK_ENABLED_WORK_MODES];
  }
}
