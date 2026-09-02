import { Injectable } from '@nestjs/common';
import {
  DisputeStatus,
  EscrowStatus,
  InvestorPayoutStatus,
  ProjectStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export type DashboardRange = '7d' | '30d' | '3m' | '6m' | '12m';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(range: DashboardRange = '6m') {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeStart = this.rangeStart(range, now);

    const [
      totalUsers,
      freelancers,
      clients,
      admins,
      suspendedUsers,
      bannedUsers,
      totalProjects,
      openProjects,
      inProgressProjects,
      completedProjects,
      totalProposals,
      totalReviews,
      hiddenReviews,
      openDisputes,
      escrowAgg,
      monthFeeAgg,
      investorAccrualAgg,
      investorPaidAgg,
      investorCount,
      recentUsers,
      recentProjects,
      recentReviews,
      recentAudit,
      recentEscrows,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.FREELANCER } }),
      this.prisma.user.count({ where: { role: Role.CLIENT } }),
      this.prisma.user.count({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      }),
      this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      this.prisma.user.count({ where: { status: UserStatus.BANNED } }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: ProjectStatus.OPEN } }),
      this.prisma.project.count({ where: { status: ProjectStatus.IN_PROGRESS } }),
      this.prisma.project.count({ where: { status: ProjectStatus.COMPLETED } }),
      this.prisma.proposal.count(),
      this.prisma.review.count(),
      this.prisma.review.count({ where: { isVisible: false } }),
      this.prisma.escrowDispute.count({
        where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      }),
      this.prisma.escrow.aggregate({
        where: {
          status: { in: [EscrowStatus.FUNDED, EscrowStatus.RELEASED, EscrowStatus.DISPUTED] },
        },
        _sum: { amount: true, platformFee: true, settledPlatformFee: true },
      }),
      this.prisma.escrow.aggregate({
        where: {
          status: EscrowStatus.RELEASED,
          releasedAt: { gte: monthStart },
        },
        _sum: { platformFee: true, settledPlatformFee: true },
      }),
      this.prisma.investorAccrual.aggregate({
        _sum: { accrualAmount: true },
        _count: true,
      }),
      this.prisma.investorPayout.aggregate({
        where: { status: InvestorPayoutStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.investor.count({ where: { isActive: true } }),
      this.prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          profile: { select: { firstName: true, lastName: true, username: true } },
        },
      }),
      this.prisma.project.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          publishedAt: true,
          client: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.review.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rating: true,
          isVisible: true,
          createdAt: true,
          project: { select: { id: true, title: true } },
        },
      }),
      this.prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          admin: {
            select: {
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.escrow.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          amount: true,
          platformFee: true,
          status: true,
          currency: true,
          updatedAt: true,
          project: { select: { id: true, title: true } },
        },
      }),
    ]);

    const totalPlatformFees =
      Number(escrowAgg._sum.settledPlatformFee ?? 0) ||
      Number(escrowAgg._sum.platformFee ?? 0);
    const monthFees =
      Number(monthFeeAgg._sum.settledPlatformFee ?? 0) ||
      Number(monthFeeAgg._sum.platformFee ?? 0);

    const accruedTotal = Number(investorAccrualAgg._sum.accrualAmount ?? 0);
    const paidTotal = Number(investorPaidAgg._sum.amount ?? 0);

    const trends = await this.getTrends(range, rangeStart);

    return {
      range,
      rangeStart: rangeStart.toISOString(),
      users: {
        total: totalUsers,
        freelancers,
        clients,
        admins,
        suspended: suspendedUsers,
        banned: bannedUsers,
      },
      projects: {
        total: totalProjects,
        open: openProjects,
        inProgress: inProgressProjects,
        completed: completedProjects,
      },
      proposals: { total: totalProposals },
      reviews: { total: totalReviews, hidden: hiddenReviews },
      escrow: { openDisputes },
      finance: {
        totalProjectValue: Number(escrowAgg._sum.amount ?? 0),
        totalPlatformFees,
        monthPlatformFees: monthFees,
        investorAccrualsTotal: accruedTotal,
        investorAccrualsCount: investorAccrualAgg._count,
        activeInvestors: investorCount,
        investorPaidTotal: paidTotal,
        investorOutstanding: Math.max(0, accruedTotal - paidTotal),
      },
      alerts: {
        suspendedUsers,
        bannedUsers,
        openDisputes,
        hiddenReviews,
        projectsNeedingReview: openDisputes,
      },
      recent: {
        users: recentUsers.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt,
          name: u.profile
            ? `${u.profile.firstName} ${u.profile.lastName}`
            : u.email,
        })),
        projects: recentProjects.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          createdAt: p.createdAt,
          publishedAt: p.publishedAt,
          clientName: p.client.profile
            ? `${p.client.profile.firstName} ${p.client.profile.lastName}`
            : '—',
        })),
        reviews: recentReviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          isVisible: r.isVisible,
          createdAt: r.createdAt,
          projectId: r.project.id,
          projectTitle: r.project.title,
        })),
        audit: recentAudit.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          createdAt: a.createdAt,
          actorEmail: a.admin.email,
          actorName: a.admin.profile
            ? `${a.admin.profile.firstName} ${a.admin.profile.lastName}`
            : a.admin.email,
        })),
        escrows: recentEscrows.map((e) => ({
          id: e.id,
          amount: Number(e.amount),
          platformFee: Number(e.platformFee),
          status: e.status,
          currency: e.currency,
          updatedAt: e.updatedAt,
          projectId: e.project.id,
          projectTitle: e.project.title,
        })),
      },
      trends,
    };
  }

  private rangeStart(range: DashboardRange, now: Date): Date {
    const d = new Date(now);
    switch (range) {
      case '7d':
        d.setDate(d.getDate() - 6);
        d.setHours(0, 0, 0, 0);
        return d;
      case '30d':
        d.setDate(d.getDate() - 29);
        d.setHours(0, 0, 0, 0);
        return d;
      case '3m':
        d.setMonth(d.getMonth() - 2, 1);
        d.setHours(0, 0, 0, 0);
        return d;
      case '12m':
        d.setMonth(d.getMonth() - 11, 1);
        d.setHours(0, 0, 0, 0);
        return d;
      case '6m':
      default:
        d.setMonth(d.getMonth() - 5, 1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
  }

  private async getTrends(range: DashboardRange, start: Date) {
    if (range === '7d' || range === '30d') {
      return this.getDailyTrends(start, range === '7d' ? 7 : 30);
    }
    const months = range === '3m' ? 3 : range === '12m' ? 12 : 6;
    return this.getMonthlyTrends(months);
  }

  private async getDailyTrends(start: Date, days: number) {
    const [users, projects, completed, releasedEscrows] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.project.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.project.findMany({
        where: {
          status: ProjectStatus.COMPLETED,
          completedAt: { gte: start },
        },
        select: { completedAt: true },
      }),
      this.prisma.escrow.findMany({
        where: {
          status: EscrowStatus.RELEASED,
          releasedAt: { gte: start },
        },
        select: {
          releasedAt: true,
          platformFee: true,
          settledPlatformFee: true,
          amount: true,
        },
      }),
    ]);

    const keys: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(d.toISOString().slice(0, 10));
    }

    const bucket = () => Object.fromEntries(keys.map((k) => [k, 0]));
    const usersByDay = bucket();
    const projectsByDay = bucket();
    const completedByDay = bucket();
    const feesByDay = bucket();
    const volumeByDay = bucket();

    const keyOf = (date: Date) => date.toISOString().slice(0, 10);

    for (const row of users) {
      const k = keyOf(row.createdAt);
      if (k in usersByDay) usersByDay[k] += 1;
    }
    for (const row of projects) {
      const k = keyOf(row.createdAt);
      if (k in projectsByDay) projectsByDay[k] += 1;
    }
    for (const row of completed) {
      if (!row.completedAt) continue;
      const k = keyOf(row.completedAt);
      if (k in completedByDay) completedByDay[k] += 1;
    }
    for (const row of releasedEscrows) {
      if (!row.releasedAt) continue;
      const k = keyOf(row.releasedAt);
      if (!(k in feesByDay)) continue;
      feesByDay[k] +=
        Number(row.settledPlatformFee ?? 0) || Number(row.platformFee ?? 0);
      volumeByDay[k] += Number(row.amount ?? 0);
    }

    return {
      granularity: 'day' as const,
      labels: keys,
      users: keys.map((k) => usersByDay[k]),
      projects: keys.map((k) => projectsByDay[k]),
      completed: keys.map((k) => completedByDay[k]),
      platformFees: keys.map((k) => Math.round(feesByDay[k] * 100) / 100),
      projectVolume: keys.map((k) => Math.round(volumeByDay[k] * 100) / 100),
    };
  }

  private async getMonthlyTrends(months: number) {
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [users, projects, completed, releasedEscrows] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.project.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      this.prisma.project.findMany({
        where: {
          status: ProjectStatus.COMPLETED,
          completedAt: { gte: start },
        },
        select: { completedAt: true },
      }),
      this.prisma.escrow.findMany({
        where: {
          status: EscrowStatus.RELEASED,
          releasedAt: { gte: start },
        },
        select: {
          releasedAt: true,
          platformFee: true,
          settledPlatformFee: true,
          amount: true,
        },
      }),
    ]);

    const keys: string[] = [];
    for (let i = 0; i < months; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const bucket = () => Object.fromEntries(keys.map((k) => [k, 0]));
    const usersByMonth = bucket();
    const projectsByMonth = bucket();
    const completedByMonth = bucket();
    const feesByMonth = bucket();
    const volumeByMonth = bucket();

    const keyOf = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    for (const row of users) {
      const k = keyOf(row.createdAt);
      if (k in usersByMonth) usersByMonth[k] += 1;
    }
    for (const row of projects) {
      const k = keyOf(row.createdAt);
      if (k in projectsByMonth) projectsByMonth[k] += 1;
    }
    for (const row of completed) {
      if (!row.completedAt) continue;
      const k = keyOf(row.completedAt);
      if (k in completedByMonth) completedByMonth[k] += 1;
    }
    for (const row of releasedEscrows) {
      if (!row.releasedAt) continue;
      const k = keyOf(row.releasedAt);
      if (!(k in feesByMonth)) continue;
      feesByMonth[k] +=
        Number(row.settledPlatformFee ?? 0) || Number(row.platformFee ?? 0);
      volumeByMonth[k] += Number(row.amount ?? 0);
    }

    return {
      granularity: 'month' as const,
      labels: keys,
      users: keys.map((k) => usersByMonth[k]),
      projects: keys.map((k) => projectsByMonth[k]),
      completed: keys.map((k) => completedByMonth[k]),
      platformFees: keys.map((k) => Math.round(feesByMonth[k] * 100) / 100),
      projectVolume: keys.map((k) => Math.round(volumeByMonth[k] * 100) / 100),
    };
  }
}
