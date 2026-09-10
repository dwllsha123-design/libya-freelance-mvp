'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest } from '@/lib/api';
import { useNuqatiBalance, useNuqatiApi } from '@/hooks/use-nuqati';
import { useLaunchApi } from '@/hooks/use-launch';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import type { FreelancerBadgesResponse } from '@/lib/badges';
import type { AppLocale } from '@/i18n/routing';
import { publicProfilePath } from '@/lib/profile-url';
import { FreelancerBadgeChip } from '@/components/badges/freelancer-badge-chip';
import { UserAvatarButton, UserAvatarFace, UserAvatarSkeleton } from '@/components/account/user-avatar';
import {
  IconAdmin,
  IconAward,
  IconBell,
  IconBriefcase,
  IconCoins,
  IconDashboard,
  IconExternal,
  IconFileText,
  IconHelp,
  IconImages,
  IconLogout,
  IconMessage,
  IconRefresh,
  IconStar,
  IconUser,
} from '@/components/account/account-menu-icons';
import { useIsClient } from '@/hooks/use-is-client';
import { isStaffRole } from '@/lib/roles';

type MenuItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | null;
};

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <p className="mb-1 px-3 text-[11px] font-semibold tracking-wide text-ink-soft">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  badge,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | null;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-cream-deep"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ember/10 text-ember">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded-full bg-ember px-2 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function AccountMenuPanel({
  onNavigate,
  onLogout,
  onSwitchRole,
  isSwitching,
}: {
  onNavigate: () => void;
  onLogout: () => void;
  onSwitchRole: (role: 'CLIENT' | 'FREELANCER') => void;
  isSwitching: boolean;
}) {
  const t = useTranslations('accountMenu');
  const tLaunch = useTranslations('launch');
  const locale = useLocale() as AppLocale;
  const { user, accessToken } = useAuth();
  const { balance } = useNuqatiBalance();
  const nuqatiApi = useNuqatiApi();
  const launchApi = useLaunchApi();
  const { count: unread } = useUnreadNotificationCount();
  const [badges, setBadges] = useState<FreelancerBadgesResponse | null>(null);
  const [profileTask, setProfileTask] = useState<{
    completed: boolean;
    reward: number;
    percent?: number;
    fromLaunch?: boolean;
  } | null>(null);

  const isFreelancer = user?.role === 'FREELANCER';
  const isClient = user?.role === 'CLIENT';
  const isAdmin = isStaffRole(user?.role);
  const canSwitch =
    (user?.hasClientProfile || user?.hasFreelancerProfile) &&
    (isClient || isFreelancer);

  useEffect(() => {
    if (!accessToken || !isFreelancer) return;
    let cancelled = false;
    authenticatedRequest<FreelancerBadgesResponse>('/freelancers/me/badges', accessToken)
      .then((res) => {
        if (!cancelled) setBadges(res);
      })
      .catch(() => undefined);

    launchApi
      .getMyStatus()
      .then((launch) => {
        if (cancelled) return;
        if (launch.config.enabled && !launch.profileRewardAwarded) {
          setProfileTask({
            completed: false,
            reward: launch.config.profileCompletionReward,
            percent: launch.profileCompletionPercent,
            fromLaunch: true,
          });
          return;
        }
        if (launch.profileRewardAwarded) {
          setProfileTask({ completed: true, reward: launch.config.profileCompletionReward });
          return;
        }
        // Fall back to Nuqati task if launch did not provide a CTA
        return nuqatiApi.getDashboard().then((dash) => {
          if (cancelled) return;
          const task = dash.tasks.find((item) => item.key === 'PROFILE_COMPLETE');
          if (task) {
            setProfileTask({ completed: task.completed, reward: task.reward });
          }
        });
      })
      .catch(() => {
        if (cancelled) return;
        return nuqatiApi
          .getDashboard()
          .then((dash) => {
            if (cancelled) return;
            const task = dash.tasks.find((item) => item.key === 'PROFILE_COMPLETE');
            if (task) {
              setProfileTask({ completed: task.completed, reward: task.reward });
            }
          })
          .catch(() => undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, isFreelancer, nuqatiApi, launchApi]);

  if (!user) return null;

  const displayName = user.profile
    ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
    : user.email;
  const roleLabel = isAdmin
    ? t('roleAdmin')
    : isClient
      ? t('roleClient')
      : t('roleFreelancer');
  const publicProfileHref = user.profile?.username
    ? isClient
      ? `/clients/${user.profile.username}`
      : publicProfilePath(user.profile.username)
    : null;
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const unreadBadge =
    unread > 0
      ? t('unreadNotifications', { count: unread > 99 ? '99+' : unread })
      : null;

  const mainItems: MenuItem[] = [
    {
      href: '/dashboard',
      label: t('dashboard'),
      icon: <IconDashboard />,
    },
  ];

  const workItems: MenuItem[] = [];
  if (isClient) {
    workItems.push({
      href: '/dashboard/projects',
      label: t('myProjects'),
      icon: <IconBriefcase />,
    });
  }
  if (isFreelancer) {
    workItems.push({
      href: '/dashboard/proposals',
      label: t('myProposals'),
      icon: <IconFileText />,
    });
  }
  if (isClient || isFreelancer) {
    workItems.push(
      {
        href: '/messages',
        label: t('messages'),
        icon: <IconMessage />,
      },
      {
        href: '/notifications',
        label: t('notifications'),
        icon: <IconBell />,
        badge: unreadBadge,
      },
    );
  }

  const reputationItems: MenuItem[] = [
    {
      href: '/dashboard/profile',
      label: t('profile'),
      icon: <IconUser />,
    },
  ];
  if (isFreelancer) {
    reputationItems.push(
      {
        href: '/dashboard/portfolio',
        label: t('portfolio'),
        icon: <IconImages />,
      },
      {
        href: '/dashboard#badges',
        label: t('badges'),
        icon: <IconAward />,
      },
      {
        href: '/dashboard/nuqati',
        label: t('points'),
        icon: <IconCoins />,
      },
    );
  }
  if (publicProfileHref && (isFreelancer || isClient)) {
    reputationItems.push({
      href: publicProfileHref,
      label: t('reviews'),
      icon: <IconStar />,
    });
  }

  const accountItems: MenuItem[] = [
    {
      href: '/help',
      label: t('help'),
      icon: <IconHelp />,
    },
  ];
  if (isAdmin) {
    accountItems.unshift({
      href: '/admin',
      label: t('adminPanel'),
      icon: <IconAdmin />,
    });
  }

  return (
    <div className="flex max-h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line px-4 py-4">
        <div className="flex items-start gap-3">
          <UserAvatarFace
            photoUrl={user.profile?.profilePhoto}
            firstName={user.profile?.firstName}
            lastName={user.profile?.lastName}
            email={user.email}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold text-ink">
              {displayName}
            </p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
            <p className="mt-1 inline-flex rounded-full bg-ember/10 px-2 py-0.5 text-[11px] font-semibold text-ember">
              {roleLabel}
            </p>
            {isFreelancer && badges ? (
              <div className="mt-2">
                <FreelancerBadgeChip
                  level={badges.currentLevel}
                  verifiedTalent={badges.verifiedTalent}
                  foundingFreelancer={Boolean(badges.foundingFreelancer?.earned)}
                  compact
                />
              </div>
            ) : null}
          </div>
        </div>

        {isFreelancer && balance !== null ? (
          <Link
            href="/dashboard/nuqati"
            onClick={onNavigate}
            className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            <span className="grid size-8 place-items-center rounded-full bg-amber-400 text-white">
              <IconCoins className="h-4 w-4" />
            </span>
            {t('pointsBalance', {
              count: balance.toLocaleString(numberLocale),
            })}
          </Link>
        ) : null}

        {isFreelancer && profileTask && !profileTask.completed ? (
          <Link
            href="/dashboard/profile"
            onClick={onNavigate}
            className="mt-3 block rounded-xl border border-line bg-cream-deep/50 px-3 py-2.5"
          >
            <p className="text-xs font-semibold text-ink">{t('profileCompleteTitle')}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {profileTask.fromLaunch && typeof profileTask.percent === 'number'
                ? tLaunch('profileCompleteCta', {
                    percent: profileTask.percent,
                    points: profileTask.reward,
                  })
                : t('profileCompleteCta', { points: profileTask.reward })}
            </p>
          </Link>
        ) : null}

        {isFreelancer && publicProfileHref ? (
          <Link
            href={publicProfileHref}
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ember hover:underline"
          >
            <IconExternal className="h-3.5 w-3.5" />
            {t('viewPublicProfile')}
          </Link>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        <MenuSection title={t('mainSection')}>
          {mainItems.map((item) => (
            <MenuLink key={item.href + item.label} {...item} onNavigate={onNavigate} />
          ))}
        </MenuSection>

        {workItems.length > 0 ? (
          <MenuSection title={t('workSection')}>
            {workItems.map((item) => (
              <MenuLink
                key={item.href + item.label}
                {...item}
                onNavigate={onNavigate}
              />
            ))}
          </MenuSection>
        ) : null}

        <MenuSection title={t('reputationSection')}>
          {reputationItems.map((item) => (
            <MenuLink key={item.href + item.label} {...item} onNavigate={onNavigate} />
          ))}
        </MenuSection>

        <MenuSection title={t('accountSection')}>
          {accountItems.map((item) => (
            <MenuLink key={item.href + item.label} {...item} onNavigate={onNavigate} />
          ))}
        </MenuSection>

        {canSwitch ? (
          <MenuSection title={t('switchSection')}>
            <button
              type="button"
              disabled={isSwitching}
              onClick={() =>
                onSwitchRole(isFreelancer ? 'CLIENT' : 'FREELANCER')
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink transition hover:bg-cream-deep disabled:opacity-60"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand text-ink">
                <IconRefresh />
              </span>
              {isFreelancer ? t('switchToClient') : t('switchToFreelancer')}
            </button>
          </MenuSection>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-line p-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ember transition hover:bg-ember/5"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-ember/10 text-ember">
            <IconLogout />
          </span>
          {t('logout')}
        </button>
      </div>
    </div>
  );
}

export function UserAccountMenu() {
  const t = useTranslations('accountMenu');
  const pathname = usePathname();
  const router = useRouter();
  const isClient = useIsClient();
  const { user, isLoading, logout, switchRole } = useAuth();
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const open = openForPath === pathname;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenForPath(null);
    }
    function onDoc(e: MouseEvent) {
      if (!isDesktop) return;
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenForPath(null);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open, isDesktop]);

  useEffect(() => {
    if (!open || isDesktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = previous;
      window.cancelAnimationFrame(id);
    };
  }, [open, isDesktop]);

  const close = () => setOpenForPath(null);
  const toggle = () =>
    setOpenForPath((current) => (current === pathname ? null : pathname));

  async function handleSwitchRole(role: 'CLIENT' | 'FREELANCER') {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      await switchRole(role);
      close();
      router.replace('/dashboard');
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  }

  async function handleLogout() {
    close();
    await logout();
  }

  if (isLoading) {
    return <UserAvatarSkeleton />;
  }

  if (!user) return null;

  const panel = (
    <AccountMenuPanel
      onNavigate={close}
      onLogout={() => void handleLogout()}
      onSwitchRole={(role) => void handleSwitchRole(role)}
      isSwitching={isSwitching}
    />
  );

  return (
    <div ref={rootRef} className="relative">
      <UserAvatarButton
        open={open}
        onToggle={toggle}
        photoUrl={user.profile?.profilePhoto}
        firstName={user.profile?.firstName}
        lastName={user.profile?.lastName}
        email={user.email}
        label={open ? t('closeAccountMenu') : t('openAccountMenu')}
      />

      {open && isDesktop ? (
        <div
          role="menu"
          aria-label={t('accountMenu')}
          className="absolute end-0 top-full z-50 mt-2 w-[min(22.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-cream shadow-[0_28px_70px_-28px_rgba(21,32,60,0.5)]"
        >
          <div className="flex max-h-[min(36rem,calc(100vh-5rem))] flex-col overflow-hidden">
            {panel}
          </div>
        </div>
      ) : null}

      {open && !isDesktop && isClient
        ? createPortal(
            <div className="lg:hidden">
              <button
                type="button"
                className="fixed inset-0 z-[80] bg-ink/45 backdrop-blur-[1px]"
                aria-label={t('closeAccountMenu')}
                onClick={close}
              />
              <aside
                role="dialog"
                aria-modal="true"
                aria-label={t('accountMenu')}
                className="fixed inset-y-0 start-0 z-[90] flex w-[min(92vw,22rem)] flex-col border-e border-line bg-cream shadow-[0_24px_60px_-24px_rgba(21,32,60,0.55)]"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                  <p className="font-display text-sm font-bold text-ink">
                    {t('accountMenu')}
                  </p>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={close}
                    className="grid size-9 place-items-center rounded-lg border border-line text-ink-soft"
                    aria-label={t('closeAccountMenu')}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{panel}</div>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
