'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useAdminApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(() => {
    function requireToken() {
      if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
      return accessToken;
    }

    function qs(params: Record<string, string | undefined>) {
      const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
      return entries.length ? `?${new URLSearchParams(entries as [string, string][])}` : '';
    }

    return {
      dashboard: (range: DashboardRange = '6m') =>
        authenticatedRequest<AdminDashboardOverview>(
          `/admin/dashboard${qs({ range })}`,
          requireToken(),
        ),

      getSettings: () =>
        authenticatedRequest<AdminPlatformSettingsBundle>('/admin/settings', requireToken()),

      patchSettings: (settings: Record<string, unknown>) =>
        authenticatedRequest<AdminPlatformSettingsBundle>('/admin/settings', requireToken(), {
          method: 'PATCH',
          body: JSON.stringify({ settings }),
        }),

      getFeatureFlags: () =>
        authenticatedRequest<AdminPlatformSettingsBundle>(
          '/admin/settings/features',
          requireToken(),
        ),

      patchFeatureFlags: (flags: Record<string, boolean>) =>
        authenticatedRequest<AdminPlatformSettingsBundle>(
          '/admin/settings/features',
          requireToken(),
          { method: 'PATCH', body: JSON.stringify({ flags }) },
        ),

      listCms: () =>
        authenticatedRequest<AdminCmsBundle>('/admin/content', requireToken()),

      upsertCms: (body: { key: string; contentJson: Record<string, unknown> }) =>
        authenticatedRequest('/admin/content', requireToken(), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

      listBanners: () =>
        authenticatedRequest<AdminBanner[]>('/admin/content/banners', requireToken()),

      createBanner: (body: Record<string, unknown>) =>
        authenticatedRequest<AdminBanner>('/admin/content/banners', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      updateBanner: (id: string, body: Record<string, unknown>) =>
        authenticatedRequest<AdminBanner>(`/admin/content/banners/${id}`, requireToken(), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

      deleteBanner: (id: string) =>
        authenticatedRequest<{ ok: boolean }>(`/admin/content/banners/${id}`, requireToken(), {
          method: 'DELETE',
        }),

      listFeatured: () =>
        authenticatedRequest<AdminFeaturedItem[]>('/admin/featured', requireToken()),

      featureItem: (body: {
        entityType: 'CATEGORY' | 'FREELANCER' | 'PROJECT';
        entityId: string;
        sortOrder?: number;
      }) =>
        authenticatedRequest<AdminFeaturedItem>('/admin/featured', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      unfeatureItem: (id: string) =>
        authenticatedRequest<{ ok: boolean }>(`/admin/featured/${id}`, requireToken(), {
          method: 'DELETE',
        }),

      reorderFeatured: (orderedIds: string[]) =>
        authenticatedRequest<AdminFeaturedItem[]>('/admin/featured/reorder', requireToken(), {
          method: 'POST',
          body: JSON.stringify({ orderedIds }),
        }),

      previewBroadcast: (body: {
        audience: BroadcastAudience;
        specificUserId?: string;
      }) =>
        authenticatedRequest<BroadcastPreviewResult>(
          '/admin/notifications/broadcast/preview',
          requireToken(),
          {
            method: 'POST',
            body: JSON.stringify(body),
          },
        ),

      listBroadcasts: (limit = 20) =>
        authenticatedRequest<AdminBroadcastItem[]>(
          `/admin/notifications/broadcasts?limit=${limit}`,
          requireToken(),
        ),

      sendBroadcast: (body: {
        audience: BroadcastAudience;
        title: string;
        message: string;
        targetUrl?: string;
        specificUserId?: string;
        idempotencyKey?: string;
      }) =>
        authenticatedRequest<BroadcastSendResult>('/admin/notifications/broadcast', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      createAdmin: (body: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        permissions?: string[];
      }) =>
        authenticatedRequest<{ id: string; email: string; role: string }>(
          '/admin/admins',
          requireToken(),
          { method: 'POST', body: JSON.stringify(body) },
        ),

      assignAdminPermissions: (id: string, permissions: string[]) =>
        authenticatedRequest(`/admin/admins/${id}/permissions`, requireToken(), {
          method: 'POST',
          body: JSON.stringify({ permissions }),
        }),

      suspendAdmin: (id: string) =>
        authenticatedRequest(`/admin/admins/${id}/suspend`, requireToken(), { method: 'POST' }),

      reactivateAdmin: (id: string) =>
        authenticatedRequest(`/admin/admins/${id}/reactivate`, requireToken(), { method: 'POST' }),

      revokeAdminSessions: (id: string) =>
        authenticatedRequest(`/admin/admins/${id}/revoke-sessions`, requireToken(), {
          method: 'POST',
        }),

      listPortfolio: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<AdminPortfolioItem>>(
          `/admin/portfolio${qs(params)}`,
          requireToken(),
        ),

      hidePortfolio: (id: string, reason: string) =>
        authenticatedRequest(`/admin/portfolio/${id}/hide`, requireToken(), {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),

      restorePortfolio: (id: string, reason: string) =>
        authenticatedRequest(`/admin/portfolio/${id}/restore`, requireToken(), {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),

      listInvestorPayouts: () =>
        authenticatedRequest<InvestorPayoutRow[]>('/admin/investors/payouts', requireToken()),

      createInvestorPayout: (body: Record<string, unknown>) =>
        authenticatedRequest<InvestorPayoutRow>('/admin/investors/payouts', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      approveInvestorPayout: (id: string) =>
        authenticatedRequest(`/admin/investors/payouts/${id}/approve`, requireToken(), {
          method: 'POST',
        }),

      markInvestorPayoutPaid: (
        id: string,
        body: { paymentReference?: string | null; notes?: string | null } = {},
      ) =>
        authenticatedRequest(`/admin/investors/payouts/${id}/paid`, requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      cancelInvestorPayout: (id: string) =>
        authenticatedRequest(`/admin/investors/payouts/${id}/cancel`, requireToken(), {
          method: 'POST',
        }),

      listInvestorStatements: (investorId?: string) =>
        authenticatedRequest<InvestorStatementRow[]>(
          `/admin/investors/statements${qs({ investorId })}`,
          requireToken(),
        ),

      createInvestorStatement: (body: Record<string, unknown>) =>
        authenticatedRequest<InvestorStatementRow>('/admin/investors/statements', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      finalizeInvestorStatement: (id: string) =>
        authenticatedRequest(`/admin/investors/statements/${id}/finalize`, requireToken(), {
          method: 'POST',
        }),

      search: (q: string) =>
        authenticatedRequest<AdminSearchResult>(
          `/admin/search${qs({ q })}`,
          requireToken(),
        ),

      users: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/users${qs(params)}`,
          requireToken(),
        ),

      user: (id: string) =>
        authenticatedRequest<Record<string, unknown>>(`/admin/users/${id}`, requireToken()),

      suspendUser: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/suspend`, requireToken(), { method: 'POST' }),

      banUser: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/ban`, requireToken(), { method: 'POST' }),

      reactivateUser: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/reactivate`, requireToken(), { method: 'POST' }),

      revokeUserSessions: (id: string) =>
        authenticatedRequest(`/admin/users/${id}/revoke-sessions`, requireToken(), {
          method: 'POST',
        }),

      projects: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/projects${qs(params)}`,
          requireToken(),
        ),

      project: (id: string) =>
        authenticatedRequest<Record<string, unknown>>(`/admin/projects/${id}`, requireToken()),

      closeProject: (id: string) =>
        authenticatedRequest(`/admin/projects/${id}/close`, requireToken(), { method: 'POST' }),

      proposals: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/proposals${qs(params)}`,
          requireToken(),
        ),

      reviews: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/reviews${qs(params)}`,
          requireToken(),
        ),

      hideReview: (id: string) =>
        authenticatedRequest(`/admin/reviews/${id}/hide`, requireToken(), { method: 'POST' }),

      restoreReview: (id: string) =>
        authenticatedRequest(`/admin/reviews/${id}/restore`, requireToken(), { method: 'POST' }),

      categories: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/categories${qs(params)}`,
          requireToken(),
        ),

      createCategory: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/categories', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      updateCategory: (id: string, body: Record<string, unknown>) =>
        authenticatedRequest(`/admin/categories/${id}`, requireToken(), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

      activateCategory: (id: string) =>
        authenticatedRequest(`/admin/categories/${id}/activate`, requireToken(), { method: 'POST' }),

      deactivateCategory: (id: string) =>
        authenticatedRequest(`/admin/categories/${id}/deactivate`, requireToken(), { method: 'POST' }),

      skills: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/skills${qs(params)}`,
          requireToken(),
        ),

      createSkill: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/skills', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      updateSkill: (id: string, body: Record<string, unknown>) =>
        authenticatedRequest(`/admin/skills/${id}`, requireToken(), {
          method: 'PATCH',
          body: JSON.stringify(body),
        }),

      activateSkill: (id: string) =>
        authenticatedRequest(`/admin/skills/${id}/activate`, requireToken(), { method: 'POST' }),

      deactivateSkill: (id: string) =>
        authenticatedRequest(`/admin/skills/${id}/deactivate`, requireToken(), { method: 'POST' }),

      audit: (params: Record<string, string | undefined> = {}) =>
        authenticatedRequest<Paginated<Record<string, unknown>>>(
          `/admin/audit${qs(params)}`,
          requireToken(),
        ),

      escrowDisputes: (status: 'open' | 'resolved' = 'open') =>
        authenticatedRequest<AdminEscrowDispute[]>(
          `/admin/escrow/disputes?status=${status}`,
          requireToken(),
        ),

      resolveEscrowDispute: (
        id: string,
        body: { resolution: string; outcome: 'REFUND_CLIENT' | 'RELEASE_FREELANCER' },
      ) =>
        authenticatedRequest(`/admin/escrow/disputes/${id}/resolve`, requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      financeSettings: () =>
        authenticatedRequest<FinanceSettingsDashboard>(
          '/admin/finance/settings',
          requireToken(),
        ),

      commissionHistory: () =>
        authenticatedRequest<PlatformCommissionPolicy[]>(
          '/admin/finance/commission-settings',
          requireToken(),
        ),

      previewCommission: (body: Record<string, unknown>) =>
        authenticatedRequest<CommissionPreviewResult>(
          '/admin/finance/commission-settings/preview',
          requireToken(),
          { method: 'POST', body: JSON.stringify(body) },
        ),

      scheduleCommission: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/finance/commission-settings', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      setCategoryCommission: (categoryId: string, body: Record<string, unknown>) =>
        authenticatedRequest(
          `/admin/finance/categories/${categoryId}/commission`,
          requireToken(),
          { method: 'POST', body: JSON.stringify(body) },
        ),

      setProjectCommissionOverride: (projectId: string, body: Record<string, unknown>) =>
        authenticatedRequest(
          `/admin/finance/projects/${projectId}/commission-override`,
          requireToken(),
          { method: 'POST', body: JSON.stringify(body) },
        ),

      endProjectCommissionOverride: (id: string, reason: string) =>
        authenticatedRequest(`/admin/finance/project-overrides/${id}/end`, requireToken(), {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),

      listInvestors: () =>
        authenticatedRequest<InvestorRow[]>('/admin/finance/investors', requireToken()),

      getInvestor: (id: string) =>
        authenticatedRequest<InvestorDetail>(`/admin/finance/investors/${id}`, requireToken()),

      listInvestorAccruals: () =>
        authenticatedRequest<InvestorAccrualRow[]>(
          '/admin/finance/investor-accruals',
          requireToken(),
        ),

      listStaff: () =>
        authenticatedRequest<StaffAdminRow[]>('/admin/finance/staff', requireToken()),

      createInvestor: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/finance/investors', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      createInvestmentAgreement: (body: Record<string, unknown>) =>
        authenticatedRequest('/admin/finance/investment-agreements', requireToken(), {
          method: 'POST',
          body: JSON.stringify(body),
        }),

      terminateInvestmentAgreement: (id: string, body: Record<string, unknown>) =>
        authenticatedRequest(
          `/admin/finance/investment-agreements/${id}/terminate`,
          requireToken(),
          { method: 'POST', body: JSON.stringify(body) },
        ),
    };
  }, [accessToken, locale]);
}

export type DashboardRange = '7d' | '30d' | '3m' | '6m' | '12m';

export type BroadcastAudience =
  | 'ALL'
  | 'CLIENTS'
  | 'FREELANCERS'
  | 'INVESTORS'
  | 'SPECIFIC_USER';

export interface AdminDashboardOverview {
  range?: DashboardRange;
  rangeStart?: string;
  users: {
    total: number;
    freelancers: number;
    clients: number;
    admins: number;
    suspended: number;
    banned: number;
  };
  projects: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
  };
  proposals: { total: number };
  reviews: { total: number; hidden: number };
  escrow: { openDisputes: number };
  finance: {
    totalProjectValue: number;
    totalPlatformFees: number;
    monthPlatformFees: number;
    investorAccrualsTotal: number;
    investorAccrualsCount: number;
    activeInvestors: number;
    investorPaidTotal: number;
    investorOutstanding: number;
  };
  alerts: {
    suspendedUsers: number;
    bannedUsers: number;
    openDisputes: number;
    hiddenReviews: number;
    projectsNeedingReview: number;
  };
  recent: {
    users: Array<{
      id: string;
      email: string;
      role: string;
      status: string;
      createdAt: string;
      name: string;
    }>;
    projects: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
      publishedAt: string | null;
      clientName: string;
    }>;
    reviews: Array<{
      id: string;
      rating: number;
      isVisible: boolean;
      createdAt: string;
      projectId: string;
      projectTitle: string;
    }>;
    audit: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string;
      createdAt: string;
      actorEmail: string;
      actorName: string;
    }>;
    escrows: Array<{
      id: string;
      amount: number;
      platformFee: number;
      status: string;
      currency: string;
      updatedAt: string;
      projectId: string;
      projectTitle: string;
    }>;
  };
  trends: {
    labels: string[];
    users: number[];
    projects: number[];
    completed: number[];
    platformFees: number[];
    projectVolume: number[];
  };
}

export interface PlatformCommissionPolicy {
  id: string;
  defaultCommissionPercentage: number;
  minimumCommissionAmount: number | null;
  maximumCommissionAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface CommissionPreviewResult {
  projectValue: number;
  commissionPercent: number;
  platformCommission: number;
  freelancerPayout: number;
  investorSharePercent: number;
  investorAccrual: number;
  platformRemainingBeforeExpenses: number;
  currency: string;
}

export interface FinanceSettingsDashboard {
  platformCommission: {
    current: PlatformCommissionPolicy | null;
    scheduled: PlatformCommissionPolicy | null;
  };
  categoryOverrides: Array<{
    id: string;
    categoryId: string;
    categoryNameAr: string;
    commissionPercentage: number | null;
    effectiveFrom: string;
    effectiveTo: string | null;
    status: string;
    reason: string | null;
    changedBy: string | null;
  }>;
  dealOverrides: Array<{
    id: string;
    projectId: string;
    projectTitle: string;
    commissionPercentage: number;
    effectiveFrom: string;
    reason: string;
    changedBy: string | null;
  }>;
  investorAgreements: Array<{
    id: string;
    investorId: string;
    investorName: string;
    investmentAmount: number;
    sharePercentage: number;
    revenueBase: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    returnCap: number | null;
    status: string;
    reason: string | null;
    changedBy: string | null;
  }>;
  futureFeeSettings: Array<{
    id: string;
    key: string;
    labelAr: string;
    value: unknown;
    effectiveFrom: string | null;
    notes: string | null;
    updatedAt: string;
  }>;
  recentAudit: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue: unknown;
    newValue: unknown;
    effectiveDate: string | null;
    reason: string | null;
    actorEmail: string;
    createdAt: string;
  }>;
}

export interface InvestorRow {
  id: string;
  name: string;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  investmentAmount: number;
  sharePercentage: number;
  agreementStatus: string | null;
  accruedTotal: number;
  paidTotal: number;
  outstanding: number;
  agreements: Array<{
    id: string;
    sharePercentage: number;
    investmentAmount: number;
    status: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    revenueBase?: string;
    returnCap?: number | null;
  }>;
}

export interface InvestorDetail extends InvestorRow {
  createdAt: string;
  agreements: Array<
    InvestorRow['agreements'][number] & {
      reason?: string | null;
      accruals: Array<{
        id: string;
        escrowId: string;
        platformCommissionAmount: number;
        sharePercentageSnapshot: number;
        accrualAmount: number;
        currency: string;
        createdAt: string;
        projectTitle: string | null;
        projectId: string | null;
        escrowStatus: string;
      }>;
    }
  >;
}

export interface InvestorAccrualRow {
  id: string;
  escrowId: string;
  investorId: string;
  investorName: string;
  platformCommissionAmount: number;
  sharePercentage: number;
  accrualAmount: number;
  currency: string;
  createdAt: string;
  projectTitle: string | null;
  projectId: string | null;
  status: string;
}

export interface StaffAdminRow {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  permissions: string[];
}

export interface AdminEscrowDispute {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  resolution?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: { id: string; name: string } | null;
  openedBy: { id: string; name: string };
  escrow: {
    id: string;
    amount: number;
    platformFee: number;
    freelancerPayout: number;
    currency: string;
    status: string;
    project: { id: string; title: string; slug: string; status: string };
    client: { id: string; name: string; username: string | null };
    freelancer: { id: string; name: string; username: string | null };
  };
}

export interface AdminMaintenanceState {
  enabled: boolean;
  active: boolean;
  message: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AdminPlatformSettingsBundle {
  settings: Record<string, unknown>;
  settingRows: Array<{
    id: string;
    key: string;
    valueJson: unknown;
    type: string;
    updatedAt: string;
  }>;
  flags: Record<string, boolean>;
  flagRows: Array<{
    id: string;
    key: string;
    enabled: boolean;
    updatedAt: string;
  }>;
  maintenance: AdminMaintenanceState;
}

export interface AdminCmsBundle {
  blocks: Record<string, unknown>;
  rows: Array<{
    id: string;
    key: string;
    contentJson: unknown;
    updatedAt: string;
    updatedById: string | null;
  }>;
}

export interface AdminBanner {
  id: string;
  text: string;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
}

export interface AdminFeaturedItem {
  id: string;
  entityType: 'CATEGORY' | 'FREELANCER' | 'PROJECT';
  entityId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  createdById: string | null;
}

export interface BroadcastPreviewResult {
  audience: BroadcastAudience;
  recipientCount: number;
}

export interface AdminBroadcastItem {
  id: string;
  audience: BroadcastAudience;
  title: string;
  message: string;
  targetUrl: string | null;
  specificUserId: string | null;
  recipientCount: number;
  createdAt: string;
  actor: { id: string; email: string; name: string } | null;
}

export interface BroadcastSendResult {
  broadcast: {
    id: string;
    audience: BroadcastAudience;
    title: string;
    message: string;
    recipientCount: number;
    createdAt: string;
  };
  deduplicated: boolean;
}

export interface AdminPortfolioItem {
  id: string;
  title: string;
  description: string | null;
  isVisible: boolean;
  moderationReason: string | null;
  moderatedAt: string | null;
  createdAt: string;
  images: Array<{ id: string; url: string; sortOrder: number }>;
  freelancerProfile: {
    id: string;
    profile: {
      username: string | null;
      firstName: string;
      lastName: string;
      user: { id: string; email: string; status: string };
    };
  };
}

export interface InvestorPayoutRow {
  id: string;
  investorId: string;
  statementId: string | null;
  amount: number | string;
  currency: string;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  status: string;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  investor?: { id: string; name: string; email: string | null };
}

export interface InvestorStatementRow {
  id: string;
  investorId: string;
  periodYear: number;
  periodMonth: number;
  openingBalance: number | string;
  accrualsTotal: number | string;
  adjustments: number | string;
  paymentsTotal: number | string;
  closingBalance: number | string;
  status: string;
  finalizedAt: string | null;
  createdAt: string;
  investor?: { id: string; name: string };
}

export interface AdminSearchResult {
  users: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    profile: {
      username: string | null;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  projects: Array<{
    id: string;
    title: string;
    status: string;
    slug: string;
  }>;
  investors: Array<{
    id: string;
    name: string;
    email: string | null;
    isActive: boolean;
  }>;
}

export const ADMIN_PERMISSION_OPTIONS = [
  'MANAGE_USERS',
  'MANAGE_PROJECTS',
  'MANAGE_REVIEWS',
  'MANAGE_CONTENT',
  'SEND_NOTIFICATIONS',
  'SEND_BROADCASTS',
  'FINANCE_VIEW',
  'VIEW_FINANCE',
  'FINANCE_WRITE',
  'MANAGE_FINANCE',
  'MANAGE_INVESTORS',
  'MANAGE_SETTINGS',
  'VIEW_AUDIT',
  'VIEW_SYSTEM',
] as const;

export const PLATFORM_BOOLEAN_SETTING_KEYS = [
  'allowClientRegistration',
  'allowFreelancerRegistration',
  'allowNewProjects',
  'allowNewProposals',
  'allowMessaging',
  'allowReviews',
  'allowPortfolio',
  'investorPortalEnabled',
] as const;
