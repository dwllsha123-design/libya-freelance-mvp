'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';

export function FreelancerDashboard() {
  const t = useTranslations('dashboard');
  const { user } = useAuth();
  const firstName = user?.profile?.firstName ?? user?.email ?? '';

  const statusLabel =
    user?.status === 'ACTIVE'
      ? t('statusActive')
      : user?.status === 'SUSPENDED'
        ? t('statusSuspended')
        : t('statusBanned');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">{t('title')}</h1>
      <p className="mt-2 text-slate-600">
        {t('welcomeBack', { name: firstName })} ·{' '}
        <span className="text-slate-500">{t('freelancerMode')}</span>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">{t('accountType')}</p>
          <p className="mt-1 text-lg font-semibold">{t('freelancer')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">{t('accountStatus')}</p>
          <p className="mt-1 text-lg font-semibold">{statusLabel}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/nuqati" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('nuqati')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('nuqatiHint')}</p>
        </Link>
        <Link href="/dashboard/proposals" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('myProposals')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('myProposalsHint')}</p>
        </Link>
        <Link href="/dashboard/portfolio" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('portfolio')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('portfolioHint')}</p>
        </Link>
        <Link href="/projects" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('browseProjects')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('browseProjectsHint')}</p>
        </Link>
        <Link href="/dashboard/escrow" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('escrowLog')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('escrowLogHint')}</p>
        </Link>
        <Link href="/messages" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('messages')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('messagesHint')}</p>
        </Link>
        <Link href="/dashboard/profile" className="rounded-xl border border-slate-200 bg-white p-5 hover:border-primary/40">
          <p className="font-semibold">{t('profile')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('profileHintFreelancer')}</p>
        </Link>
      </div>
    </div>
  );
}
