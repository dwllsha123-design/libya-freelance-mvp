'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { publicProfileAbsoluteUrl } from '@/lib/profile-url';

type Props = {
  username: string;
  displayName?: string;
  className?: string;
};

/**
 * Copy / share public profile permalink. Does not award Nuqati points.
 */
export function ProfileShareActions({ username, displayName, className }: Props) {
  const t = useTranslations('profile');
  const [copied, setCopied] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const profileUrl = publicProfileAbsoluteUrl(username);

  const copyLink = useCallback(async () => {
    if (!profileUrl) return;
    setShareHint(null);
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareHint(t('copyFailed'));
    }
  }, [profileUrl, t]);

  const shareProfile = useCallback(async () => {
    if (!profileUrl) return;
    setShareHint(null);
    const title = displayName
      ? `${displayName} | Libyan Freelance`
      : 'Libyan Freelance';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: profileUrl, text: title });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setShareHint(t('shareCopiedFallback'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareHint(t('copyFailed'));
    }
  }, [displayName, profileUrl, t]);

  if (!profileUrl) return null;

  return (
    <div className={className}>
      <p className="mb-2 break-all rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
        {profileUrl}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-xl border border-outline-variant/60 bg-surface px-4 py-2 text-sm font-semibold text-on-surface hover:border-primary"
        >
          {copied ? t('linkCopied') : t('copyProfileLink')}
        </button>
        <button
          type="button"
          onClick={() => void shareProfile()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-container"
        >
          {t('shareProfile')}
        </button>
      </div>
      {shareHint ? <p className="mt-2 text-xs text-on-surface-variant">{shareHint}</p> : null}
    </div>
  );
}
