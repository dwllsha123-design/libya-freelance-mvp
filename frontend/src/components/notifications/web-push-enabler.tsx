'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import {
  enableWebPushFromUserGesture,
  isWebPushSupported,
  registerServiceWorkerOnly,
  syncWebPushIfGranted,
} from '@/lib/web-push';

function subscribePermission(onStoreChange: () => void) {
  // Permission changes are not broadly evented; callers bump via enable click.
  window.addEventListener('focus', onStoreChange);
  return () => window.removeEventListener('focus', onStoreChange);
}

function getPermissionSnapshot(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined') return 'default';
  if (!isWebPushSupported() || !window.isSecureContext) return 'unsupported';
  return Notification.permission;
}

function getServerPermissionSnapshot(): NotificationPermission | 'unsupported' {
  return 'default';
}

/**
 * - May register the Service Worker quietly.
 * - Syncs subscription only when permission is already `granted`.
 * - Never auto-calls Notification.requestPermission() — requires explicit click.
 */
export function WebPushEnabler() {
  const { user, accessToken } = useAuth();
  const t = useTranslations('notifications');
  const synced = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [permissionTick, setPermissionTick] = useState(0);

  const permission = useSyncExternalStore(
    subscribePermission,
    () => {
      void permissionTick;
      return getPermissionSnapshot();
    },
    getServerPermissionSnapshot,
  );

  useEffect(() => {
    if (!user || !accessToken) {
      synced.current = false;
      return;
    }
    if (!isWebPushSupported() || !window.isSecureContext) return;

    void registerServiceWorkerOnly().catch(() => undefined);

    if (permission === 'granted' && !synced.current) {
      synced.current = true;
      void syncWebPushIfGranted(accessToken).catch(() => {
        synced.current = false;
      });
    }
  }, [user, accessToken, permission]);

  const showPrompt =
    Boolean(user && accessToken) &&
    permission === 'default' &&
    !dismissed;

  if (!showPrompt || !accessToken) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-md flex-col gap-3 rounded-2xl border border-line bg-cream/95 p-4 shadow-[0_16px_40px_-20px_rgba(21,32,60,0.45)] backdrop-blur-md sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-relaxed text-ink">
          {t('enablePushHint')}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-full px-3 py-2 text-xs font-medium text-ink-soft hover:bg-cream-deep"
            onClick={() => setDismissed(true)}
          >
            {t('enablePushLater')}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-full bg-ember px-4 py-2 text-xs font-semibold text-white hover:bg-ember-deep disabled:opacity-60"
            onClick={() => {
              setBusy(true);
              void enableWebPushFromUserGesture(accessToken)
                .then((result) => {
                  setPermissionTick((n) => n + 1);
                  if (result === 'subscribed' || result === 'denied') {
                    setDismissed(true);
                  }
                  if (result === 'subscribed') {
                    synced.current = true;
                  }
                })
                .finally(() => setBusy(false));
            }}
          >
            {t('enablePushCta')}
          </button>
        </div>
      </div>
    </div>
  );
}
