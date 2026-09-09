import { WorkMode } from '@prisma/client';

/** Full domain set — never remove values from Prisma/DB. */
export const ALL_WORK_MODES: readonly WorkMode[] = [
  WorkMode.REMOTE,
  WorkMode.ON_SITE,
  WorkMode.HYBRID,
] as const;

/**
 * Current product release: remote service delivery only.
 * Expand via platform setting `enabledWorkModes` without schema changes.
 */
export const DEFAULT_ENABLED_WORK_MODES: readonly WorkMode[] = [
  WorkMode.REMOTE,
] as const;

export function isKnownWorkMode(value: unknown): value is WorkMode {
  return (
    typeof value === 'string' &&
    (ALL_WORK_MODES as readonly string[]).includes(value)
  );
}

export function normalizeEnabledWorkModes(raw: unknown): WorkMode[] {
  if (!Array.isArray(raw)) {
    return [...DEFAULT_ENABLED_WORK_MODES];
  }
  const parsed = raw.filter(isKnownWorkMode);
  return parsed.length > 0 ? parsed : [...DEFAULT_ENABLED_WORK_MODES];
}

export function isWorkModeEnabled(
  mode: WorkMode,
  enabled: readonly WorkMode[],
): boolean {
  return enabled.includes(mode);
}

/** Prefer REMOTE when enabled; otherwise first enabled mode. */
export function resolveDefaultWorkMode(
  enabled: readonly WorkMode[] = DEFAULT_ENABLED_WORK_MODES,
): WorkMode {
  if (enabled.includes(WorkMode.REMOTE)) {
    return WorkMode.REMOTE;
  }
  return enabled[0] ?? WorkMode.REMOTE;
}

/** Public search UI should hide the filter when only one mode is live. */
export function shouldShowWorkModeFilter(
  enabled: readonly WorkMode[] = DEFAULT_ENABLED_WORK_MODES,
): boolean {
  return enabled.length > 1;
}
