'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_WORK_MODE,
  FALLBACK_ENABLED_WORK_MODES,
  fetchEnabledWorkModes,
  isWorkModeEnabled,
  resolveDefaultWorkMode,
  shouldShowWorkModeFilter,
  shouldShowWorkModePicker,
  type WorkModeValue,
} from '@/lib/work-mode';

interface WorkModeContextValue {
  enabledWorkModes: readonly WorkModeValue[];
  defaultWorkMode: WorkModeValue;
  isLoading: boolean;
  isEnabled: (mode: WorkModeValue) => boolean;
  showPicker: boolean;
  showFilter: boolean;
}

const WorkModeContext = createContext<WorkModeContextValue | null>(null);

export function WorkModeProvider({ children }: { children: ReactNode }) {
  const [enabledWorkModes, setEnabledWorkModes] = useState<readonly WorkModeValue[]>(
    FALLBACK_ENABLED_WORK_MODES,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const modes = await fetchEnabledWorkModes();
      if (!cancelled) {
        setEnabledWorkModes(modes);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<WorkModeContextValue>(
    () => ({
      enabledWorkModes,
      defaultWorkMode: resolveDefaultWorkMode(enabledWorkModes),
      isLoading,
      isEnabled: (mode) => isWorkModeEnabled(mode, enabledWorkModes),
      showPicker: shouldShowWorkModePicker(enabledWorkModes),
      showFilter: shouldShowWorkModeFilter(enabledWorkModes),
    }),
    [enabledWorkModes, isLoading],
  );

  return (
    <WorkModeContext.Provider value={value}>{children}</WorkModeContext.Provider>
  );
}

export function useWorkModeConfig(): WorkModeContextValue {
  const ctx = useContext(WorkModeContext);
  if (!ctx) {
    return {
      enabledWorkModes: FALLBACK_ENABLED_WORK_MODES,
      defaultWorkMode: DEFAULT_WORK_MODE,
      isLoading: false,
      isEnabled: (mode) => isWorkModeEnabled(mode, FALLBACK_ENABLED_WORK_MODES),
      showPicker: shouldShowWorkModePicker(FALLBACK_ENABLED_WORK_MODES),
      showFilter: shouldShowWorkModeFilter(FALLBACK_ENABLED_WORK_MODES),
    };
  }
  return ctx;
}
