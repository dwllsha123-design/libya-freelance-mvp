import { describe, expect, it } from 'vitest';
import { WorkMode } from '@prisma/client';
import {
  ALL_WORK_MODES,
  DEFAULT_ENABLED_WORK_MODES,
  isWorkModeEnabled,
  normalizeEnabledWorkModes,
  resolveDefaultWorkMode,
  shouldShowWorkModeFilter,
} from '../src/common/work-mode/work-mode.config.js';

describe('work-mode config', () => {
  it('keeps all three domain modes', () => {
    expect(ALL_WORK_MODES).toEqual([
      WorkMode.REMOTE,
      WorkMode.ON_SITE,
      WorkMode.HYBRID,
    ]);
  });

  it('defaults enabled modes to REMOTE only', () => {
    expect(DEFAULT_ENABLED_WORK_MODES).toEqual([WorkMode.REMOTE]);
    expect(resolveDefaultWorkMode()).toBe(WorkMode.REMOTE);
    expect(shouldShowWorkModeFilter()).toBe(false);
  });

  it('treats ON_SITE and HYBRID as disabled by default', () => {
    expect(isWorkModeEnabled(WorkMode.REMOTE, DEFAULT_ENABLED_WORK_MODES)).toBe(
      true,
    );
    expect(isWorkModeEnabled(WorkMode.ON_SITE, DEFAULT_ENABLED_WORK_MODES)).toBe(
      false,
    );
    expect(isWorkModeEnabled(WorkMode.HYBRID, DEFAULT_ENABLED_WORK_MODES)).toBe(
      false,
    );
  });

  it('can expand enabled modes without schema changes', () => {
    const enabled = normalizeEnabledWorkModes([
      'REMOTE',
      'ON_SITE',
      'HYBRID',
    ]);
    expect(enabled).toEqual([
      WorkMode.REMOTE,
      WorkMode.ON_SITE,
      WorkMode.HYBRID,
    ]);
    expect(shouldShowWorkModeFilter(enabled)).toBe(true);
  });
});
