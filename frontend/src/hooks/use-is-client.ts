'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
  return () => {};
}

/** True only after hydration on the client (safe for portals). */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
