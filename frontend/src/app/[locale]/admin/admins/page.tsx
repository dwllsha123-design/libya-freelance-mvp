'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import {
  ADMIN_PERMISSION_OPTIONS,
  useAdminApi,
  type StaffAdminRow,
} from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminConfirmDialog, AdminEmptyState } from '@/components/admin/admin-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';

const PERMISSION_LABELS: Record<string, string> = {
  MANAGE_USERS: 'إدارة المستخدمين',
  MANAGE_PROJECTS: 'إدارة المشاريع',
  MANAGE_REVIEWS: 'إدارة التقييمات',
  MANAGE_CONTENT: 'إدارة المحتوى',
  SEND_NOTIFICATIONS: 'إدارة الإشعارات',
  SEND_BROADCASTS: 'البث الجماعي',
  FINANCE_VIEW: 'عرض المالية',
  VIEW_FINANCE: 'عرض المالية',
  MANAGE_FINANCE: 'إدارة المالية',
  FINANCE_WRITE: 'كتابة المالية',
  MANAGE_INVESTORS: 'إدارة المستثمرين',
  MANAGE_SETTINGS: 'إدارة الإعدادات',
  VIEW_AUDIT: 'عرض سجل العمليات',
  VIEW_SYSTEM: 'عرض حالة النظام',
};

type PendingAction =
  | { type: 'suspend' | 'reactivate' | 'revoke'; id: string }
  | null;

export default function AdminStaffPage() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const api = useAdminApi();
  const [rows, setRows] = useState<StaffAdminRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const isOwner = user?.role === 'SUPER_ADMIN';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [createPerms, setCreatePerms] = useState<string[]>([]);

  async function reload() {
    const data = await api.listStaff();
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .listStaff()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('financeLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function createAdmin(e: FormEvent) {
    e.preventDefault();
    if (!isOwner) return;
    setSaving(true);
    setError('');
    try {
      await api.createAdmin({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        permissions: createPerms,
      });
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setCreatePerms([]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createAdminFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    if (!editId || !isOwner) return;
    setSaving(true);
    setError('');
    try {
      await api.assignAdminPermissions(editId, editPerms);
      setEditId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createAdminFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function runPending() {
    if (!pending || !isOwner) return;
    setSaving(true);
    setError('');
    try {
      if (pending.type === 'suspend') await api.suspendAdmin(pending.id);
      if (pending.type === 'reactivate') await api.reactivateAdmin(pending.id);
      if (pending.type === 'revoke') await api.revokeAdminSessions(pending.id);
      setPending(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createAdminFailed'));
    } finally {
      setSaving(false);
    }
  }

  function togglePerm(list: string[], key: string) {
    return list.includes(key) ? list.filter((p) => p !== key) : [...list, key];
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('adminsPermissions')} subtitle={t('adminsPermissionsSubtitle')} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <AdminPanel title={t('adminsList')}>
        {!rows.length ? (
          <AdminEmptyState message={t('noAdmins')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-right">{t('tableName')}</th>
                  <th className="px-3 py-2 text-right">{t('tableEmail')}</th>
                  <th className="px-3 py-2 text-right">{t('tableRole')}</th>
                  <th className="px-3 py-2 text-right">{t('permissions')}</th>
                  <th className="px-3 py-2 text-right">{t('tableStatus')}</th>
                  <th className="px-3 py-2 text-right">{t('tableAction')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {row.role === 'SUPER_ADMIN' ? (
                          <span className="text-xs text-slate-500">{t('ownerFullControl')}</span>
                        ) : row.permissions.length ? (
                          row.permissions.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]"
                            >
                              {PERMISSION_LABELS[p] ?? p}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge label={row.status} tone={userStatusTone(row.status)} />
                    </td>
                    <td className="px-3 py-2">
                      {isOwner && row.role === 'ADMIN' ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            className="text-xs text-primary"
                            onClick={() => {
                              setEditId(row.id);
                              setEditPerms([...row.permissions]);
                            }}
                          >
                            {t('editPermissions')}
                          </button>
                          {row.status === 'ACTIVE' ? (
                            <button
                              type="button"
                              className="text-xs text-amber-700"
                              onClick={() => setPending({ type: 'suspend', id: row.id })}
                            >
                              {t('suspendAccount')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-xs text-primary"
                              onClick={() => setPending({ type: 'reactivate', id: row.id })}
                            >
                              {t('reactivateAccount')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() => setPending({ type: 'revoke', id: row.id })}
                          >
                            {t('revokeSessions')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      {isOwner && editId ? (
        <AdminPanel title={t('editPermissions')}>
          <div className="grid gap-2 sm:grid-cols-2">
            {ADMIN_PERMISSION_OPTIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editPerms.includes(perm)}
                  onChange={() => setEditPerms((prev) => togglePerm(prev, perm))}
                />
                <span>{PERMISSION_LABELS[perm] ?? perm}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void savePermissions()}
              className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t('savePermissions')}
            </button>
            <button
              type="button"
              onClick={() => setEditId(null)}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              {t('cancelEdit')}
            </button>
          </div>
        </AdminPanel>
      ) : null}

      {isOwner ? (
        <AdminPanel title={t('createAdminTitle')}>
          <form onSubmit={createAdmin} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block">{t('tableEmail')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block">{t('adminPassword')}</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block">{t('adminFirstName')}</span>
              <input
                required
                minLength={2}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block">{t('adminLastName')}</span>
              <input
                required
                minLength={2}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm text-slate-600">{t('permissions')}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ADMIN_PERMISSION_OPTIONS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={createPerms.includes(perm)}
                      onChange={() => setCreatePerms((prev) => togglePerm(prev, perm))}
                    />
                    <span>{PERMISSION_LABELS[perm] ?? perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
            >
              {saving ? t('loading') : t('createAdminSubmit')}
            </button>
          </form>
        </AdminPanel>
      ) : (
        <AdminPanel title={t('superAdminOnlyAction')}>
          <p className="text-sm text-slate-600">{t('adminsOwnerOnly')}</p>
        </AdminPanel>
      )}

      <AdminConfirmDialog
        open={pending !== null}
        title={
          pending?.type === 'suspend'
            ? t('suspendTitle')
            : pending?.type === 'reactivate'
              ? t('reactivateTitle')
              : t('revokeSessionsTitle')
        }
        message={t('confirmAction')}
        confirmLabel={t('confirmToggle')}
        isLoading={saving}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
