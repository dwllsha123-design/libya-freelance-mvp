'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, ApiError } from '@/lib/api';
import { ProfilePhotoUpload } from '@/components/profile/profile-photo-upload';
import {
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';
import { Link } from '@/i18n/navigation';
import { ADMIN_SECURITY_PATH } from '@/lib/admin-account-nav';

function roleLabel(role: string, t: (key: string) => string): string {
  if (role === 'SUPER_ADMIN') return t('roleSuperAdmin');
  if (role === 'MODERATOR') return t('roleModerator');
  return t('roleAdmin');
}

export default function AdminAccountPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const { user, accessToken, isLoading, updateProfilePhoto, refreshSession } =
    useAuth();
  const [draft, setDraft] = useState<{ firstName: string; lastName: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const firstName = draft?.firstName ?? user?.profile?.firstName ?? '';
  const lastName = draft?.lastName ?? user?.profile?.lastName ?? '';

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await authenticatedRequest('/profiles/me', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      setDraft(null);
      await refreshSession();
      setSuccess(t('staffAccountSaved'));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('staffAccountSaveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>
    );
  }

  const fullName = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : user.email;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('staffAccountTitle')}
        subtitle={t('staffAccountSubtitle')}
      />

      <AdminPanel title={t('accountInfo')}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">{t('staffFullName')}</dt>
            <dd className="font-medium text-on-surface">{fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('tableEmail')}</dt>
            <dd className="font-medium text-on-surface">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('tableRole')}</dt>
            <dd className="font-medium text-on-surface">
              {roleLabel(user.role, t)} ({user.role})
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('tableStatus')}</dt>
            <dd className="font-medium text-on-surface">{user.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('staffEmailVerified')}</dt>
            <dd className="font-medium text-on-surface">
              {user.emailVerified ? t('staffVerifiedYes') : t('staffVerifiedNo')}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('staffCreatedAt')}</dt>
            <dd className="font-medium text-on-surface">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleString('ar-LY')
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('staffLastLogin')}</dt>
            <dd className="font-medium text-on-surface">
              {t('staffLastLoginUnavailable')}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          <Link href={ADMIN_SECURITY_PATH} className="text-primary hover:underline">
            {t('securityCenter')}
          </Link>
        </p>
      </AdminPanel>

      <AdminPanel title={t('profileInfo')}>
        {error ? (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {accessToken ? (
          <div className="mb-6">
            <ProfilePhotoUpload
              currentPhoto={user.profile?.profilePhoto}
              accessToken={accessToken}
              onUploaded={(url) => {
                updateProfilePhoto(url);
                setSuccess(t('staffAccountSaved'));
              }}
            />
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSave(e)} className="grid max-w-lg gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t('adminFirstName')}</span>
            <input
              required
              minLength={2}
              value={firstName}
              onChange={(e) =>
                setDraft({ firstName: e.target.value, lastName })
              }
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t('adminLastName')}</span>
            <input
              required
              minLength={2}
              value={lastName}
              onChange={(e) =>
                setDraft({ firstName, lastName: e.target.value })
              }
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
          >
            {saving ? t('loading') : t('staffAccountSave')}
          </button>
        </form>
      </AdminPanel>
    </div>
  );
}
