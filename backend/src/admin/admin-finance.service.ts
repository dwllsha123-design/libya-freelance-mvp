import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  AdminPermission,
  CommercialAuditAction,
  CommissionPolicyStatus,
  EscrowStatus,
  InvestmentAgreementStatus,
  InvestorPayoutStatus,
  InvestorRevenueBase,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import { CommercialAuditService } from '../commercial/commercial-audit.service.js';
import { CommissionResolutionService } from '../commercial/commission-resolution.service.js';
import { previewCommissionSplit } from '../commercial/commercial.constants.js';

function dec(value: number | string | Prisma.Decimal | null | undefined) {
  if (value == null) return null;
  return Number(value);
}

@Injectable()
export class AdminFinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly commercialAudit: CommercialAuditService,
    private readonly commission: CommissionResolutionService,
  ) {}

  async getSettingsDashboard() {
    const now = new Date();
    const [
      currentPlatform,
      scheduledPlatform,
      categoryOverrides,
      projectOverrides,
      agreements,
      futureFees,
      recentAudit,
    ] = await Promise.all([
      this.prisma.platformCommissionPolicy.findFirst({
        where: {
          status: CommissionPolicyStatus.ACTIVE,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        include: { createdBy: { select: { id: true, email: true } } },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.platformCommissionPolicy.findFirst({
        where: {
          status: CommissionPolicyStatus.SCHEDULED,
          effectiveFrom: { gt: now },
        },
        include: { createdBy: { select: { id: true, email: true } } },
        orderBy: { effectiveFrom: 'asc' },
      }),
      this.prisma.categoryCommissionOverride.findMany({
        where: {
          status: CommissionPolicyStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          commissionPercentage: { not: null },
        },
        include: {
          category: { select: { id: true, nameAr: true, slug: true } },
          createdBy: { select: { id: true, email: true } },
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.projectCommissionOverride.findMany({
        where: {
          status: CommissionPolicyStatus.ACTIVE,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        include: {
          project: { select: { id: true, title: true, slug: true } },
          createdBy: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.investmentAgreement.findMany({
        where: {
          status: {
            in: [InvestmentAgreementStatus.ACTIVE, InvestmentAgreementStatus.SCHEDULED],
          },
        },
        include: {
          investor: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, email: true } },
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.futureFeeSetting.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.commercialAuditLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, email: true } } },
      }),
    ]);

    return {
      platformCommission: {
        current: currentPlatform
          ? this.formatPlatformPolicy(currentPlatform)
          : null,
        scheduled: scheduledPlatform
          ? this.formatPlatformPolicy(scheduledPlatform)
          : null,
      },
      categoryOverrides: categoryOverrides.map((row) => ({
        id: row.id,
        categoryId: row.categoryId,
        categoryNameAr: row.category.nameAr,
        commissionPercentage: dec(row.commissionPercentage),
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        status: row.status,
        reason: row.reason,
        changedBy: row.createdBy?.email ?? null,
      })),
      dealOverrides: projectOverrides.map((row) => ({
        id: row.id,
        projectId: row.projectId,
        projectTitle: row.project.title,
        commissionPercentage: Number(row.commissionPercentage),
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        status: row.status,
        reason: row.reason,
        changedBy: row.createdBy?.email ?? null,
      })),
      investorAgreements: agreements.map((row) => ({
        id: row.id,
        investorId: row.investorId,
        investorName: row.investor.name,
        investmentAmount: Number(row.investmentAmount),
        sharePercentage: Number(row.sharePercentage),
        revenueBase: row.revenueBase,
        effectiveFrom: row.effectiveFrom,
        effectiveTo: row.effectiveTo,
        returnCap: dec(row.returnCap),
        status: row.status,
        reason: row.reason,
        changedBy: row.createdBy?.email ?? null,
      })),
      futureFeeSettings: futureFees.map((row) => ({
        id: row.id,
        key: row.key,
        labelAr: row.labelAr,
        value: row.valueJson,
        effectiveFrom: row.effectiveFrom,
        notes: row.notes,
        updatedAt: row.updatedAt,
      })),
      recentAudit: recentAudit.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        oldValue: row.oldValue,
        newValue: row.newValue,
        effectiveDate: row.effectiveDate,
        reason: row.reason,
        actorEmail: row.actor.email,
        createdAt: row.createdAt,
      })),
    };
  }

  async listPlatformCommissionHistory() {
    const rows = await this.prisma.platformCommissionPolicy.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: { createdBy: { select: { id: true, email: true } } },
    });
    return rows.map((row) => this.formatPlatformPolicy(row));
  }

  async schedulePlatformCommission(
    actorId: string,
    dto: {
      defaultCommissionPercentage: number;
      minimumCommissionAmount?: number | null;
      maximumCommissionAmount?: number | null;
      effectiveFrom: string;
      reason: string;
      confirm: boolean;
    },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('يجب تأكيد تغيير عمولة المنصة');
    }
    this.assertPercent(dto.defaultCommissionPercentage);
    if (
      dto.minimumCommissionAmount != null &&
      dto.maximumCommissionAmount != null &&
      dto.minimumCommissionAmount > dto.maximumCommissionAmount
    ) {
      throw new BadRequestException('الحد الأدنى لا يمكن أن يتجاوز الحد الأقصى');
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('تاريخ بدء التطبيق غير صالح');
    }

    const now = new Date();
    const becomesActiveImmediately = effectiveFrom.getTime() <= now.getTime();

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.platformCommissionPolicy.findFirst({
        where: {
          status: CommissionPolicyStatus.ACTIVE,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (becomesActiveImmediately && current) {
        await tx.platformCommissionPolicy.update({
          where: { id: current.id },
          data: {
            status: CommissionPolicyStatus.SUPERSEDED,
            effectiveTo: effectiveFrom,
          },
        });
      } else if (!becomesActiveImmediately && current) {
        // Keep current active until scheduled start; cancel any pending schedule
        await tx.platformCommissionPolicy.updateMany({
          where: {
            status: CommissionPolicyStatus.SCHEDULED,
            effectiveFrom: { gt: now },
          },
          data: { status: CommissionPolicyStatus.CANCELLED },
        });
      }

      const created = await tx.platformCommissionPolicy.create({
        data: {
          defaultCommissionPercentage: dto.defaultCommissionPercentage,
          minimumCommissionAmount: dto.minimumCommissionAmount ?? null,
          maximumCommissionAmount: dto.maximumCommissionAmount ?? null,
          effectiveFrom,
          status: becomesActiveImmediately
            ? CommissionPolicyStatus.ACTIVE
            : CommissionPolicyStatus.SCHEDULED,
          reason: dto.reason,
          createdById: actorId,
          previousPolicyId: current?.id ?? null,
        },
      });

      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.PLATFORM_COMMISSION_CHANGED,
        'PlatformCommissionPolicy',
        created.id,
        {
          oldValue: current
            ? {
                defaultCommissionPercentage: Number(
                  current.defaultCommissionPercentage,
                ),
                effectiveFrom: current.effectiveFrom,
              }
            : null,
          newValue: {
            defaultCommissionPercentage: dto.defaultCommissionPercentage,
            minimumCommissionAmount: dto.minimumCommissionAmount ?? null,
            maximumCommissionAmount: dto.maximumCommissionAmount ?? null,
            effectiveFrom,
            status: created.status,
          },
          effectiveDate: effectiveFrom,
          reason: dto.reason,
          tx,
        },
      );

      await this.audit.log(
        actorId,
        AdminAuditAction.PLATFORM_COMMISSION_SCHEDULED,
        'PlatformCommissionPolicy',
        created.id,
        {
          percentage: dto.defaultCommissionPercentage,
          effectiveFrom,
        },
        tx,
      );

      return this.formatPlatformPolicy({
        ...created,
        createdBy: { id: actorId, email: '' },
      });
    });
  }

  async setCategoryCommission(
    actorId: string,
    categoryId: string,
    dto: {
      commissionPercentage: number | null;
      effectiveFrom: string;
      reason: string;
    },
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('التصنيف غير موجود');

    if (dto.commissionPercentage != null) {
      this.assertPercent(dto.commissionPercentage);
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('تاريخ بدء التطبيق غير صالح');
    }
    const now = new Date();
    const activeNow = effectiveFrom.getTime() <= now.getTime();

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.categoryCommissionOverride.findFirst({
        where: {
          categoryId,
          status: CommissionPolicyStatus.ACTIVE,
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (current && activeNow) {
        await tx.categoryCommissionOverride.update({
          where: { id: current.id },
          data: {
            status: CommissionPolicyStatus.SUPERSEDED,
            effectiveTo: effectiveFrom,
          },
        });
      }

      const created = await tx.categoryCommissionOverride.create({
        data: {
          categoryId,
          commissionPercentage: dto.commissionPercentage,
          effectiveFrom,
          status: activeNow
            ? CommissionPolicyStatus.ACTIVE
            : CommissionPolicyStatus.SCHEDULED,
          reason: dto.reason,
          createdById: actorId,
          previousOverrideId: current?.id ?? null,
        },
      });

      const cleared = dto.commissionPercentage == null;
      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.CATEGORY_COMMISSION_CHANGED,
        'CategoryCommissionOverride',
        created.id,
        {
          oldValue: current
            ? { commissionPercentage: dec(current.commissionPercentage) }
            : null,
          newValue: {
            categoryId,
            commissionPercentage: dto.commissionPercentage,
            effectiveFrom,
          },
          effectiveDate: effectiveFrom,
          reason: dto.reason,
          tx,
        },
      );
      await this.audit.log(
        actorId,
        cleared
          ? AdminAuditAction.CATEGORY_COMMISSION_CLEARED
          : AdminAuditAction.CATEGORY_COMMISSION_SET,
        'Category',
        categoryId,
        { commissionPercentage: dto.commissionPercentage, effectiveFrom },
        tx,
      );

      return {
        id: created.id,
        categoryId,
        commissionPercentage: dec(created.commissionPercentage),
        effectiveFrom: created.effectiveFrom,
        status: created.status,
        reason: created.reason,
      };
    });
  }

  async setProjectOverride(
    actorId: string,
    projectId: string,
    dto: {
      commissionPercentage: number;
      effectiveFrom: string;
      reason: string;
      confirm: boolean;
    },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('يجب تأكيد استثناء عمولة المشروع');
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException('سبب التعديل مطلوب');
    }
    this.assertPercent(dto.commissionPercentage);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { escrow: true },
    });
    if (!project) throw new NotFoundException('المشروع غير موجود');
    if (project.escrow?.status === EscrowStatus.RELEASED) {
      throw new ConflictException(
        'لا يمكن تعديل عمولة مشروع بعد تسوية المعاملة المالية',
      );
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('تاريخ بدء التطبيق غير صالح');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.projectCommissionOverride.updateMany({
        where: {
          projectId,
          status: CommissionPolicyStatus.ACTIVE,
        },
        data: {
          status: CommissionPolicyStatus.SUPERSEDED,
          effectiveTo: effectiveFrom,
        },
      });

      const created = await tx.projectCommissionOverride.create({
        data: {
          projectId,
          commissionPercentage: dto.commissionPercentage,
          effectiveFrom,
          status: CommissionPolicyStatus.ACTIVE,
          reason: dto.reason.trim(),
          createdById: actorId,
        },
      });

      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.PROJECT_COMMISSION_OVERRIDE_CHANGED,
        'ProjectCommissionOverride',
        created.id,
        {
          newValue: {
            projectId,
            commissionPercentage: dto.commissionPercentage,
            effectiveFrom,
          },
          effectiveDate: effectiveFrom,
          reason: dto.reason,
          tx,
        },
      );
      await this.audit.log(
        actorId,
        AdminAuditAction.PROJECT_COMMISSION_OVERRIDE_SET,
        'Project',
        projectId,
        { commissionPercentage: dto.commissionPercentage, reason: dto.reason },
        tx,
      );

      return {
        id: created.id,
        projectId,
        commissionPercentage: Number(created.commissionPercentage),
        effectiveFrom: created.effectiveFrom,
        reason: created.reason,
        status: created.status,
      };
    });
  }

  async endProjectOverride(actorId: string, overrideId: string, reason: string) {
    const row = await this.prisma.projectCommissionOverride.findUnique({
      where: { id: overrideId },
      include: { project: { include: { escrow: true } } },
    });
    if (!row) throw new NotFoundException('الاستثناء غير موجود');
    if (row.project.escrow?.status === EscrowStatus.RELEASED) {
      throw new ConflictException('لا يمكن إنهاء استثناء بعد التسوية');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.projectCommissionOverride.update({
        where: { id: overrideId },
        data: {
          status: CommissionPolicyStatus.SUPERSEDED,
          effectiveTo: new Date(),
        },
      });
      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.PROJECT_COMMISSION_OVERRIDE_CHANGED,
        'ProjectCommissionOverride',
        overrideId,
        {
          oldValue: { status: row.status },
          newValue: { status: CommissionPolicyStatus.SUPERSEDED },
          reason,
          tx,
        },
      );
      await this.audit.log(
        actorId,
        AdminAuditAction.PROJECT_COMMISSION_OVERRIDE_ENDED,
        'Project',
        row.projectId,
        { overrideId, reason },
        tx,
      );
      return result;
    });

    return { id: updated.id, status: updated.status, effectiveTo: updated.effectiveTo };
  }

  async createInvestor(
    actorId: string,
    dto: { name: string; email?: string; notes?: string },
  ) {
    const investor = await this.prisma.investor.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdById: actorId,
      },
    });
    await this.audit.log(
      actorId,
      AdminAuditAction.INVESTOR_CREATED,
      'Investor',
      investor.id,
      { name: investor.name },
    );
    return investor;
  }

  async createInvestmentAgreement(
    actorId: string,
    dto: {
      investorId: string;
      investmentAmount: number;
      sharePercentage: number;
      revenueBase?: InvestorRevenueBase;
      effectiveFrom: string;
      effectiveTo?: string | null;
      returnCap?: number | null;
      reason: string;
      confirm: boolean;
      supersedeAgreementId?: string;
    },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('يجب تأكيد تغيير نسبة المستثمر');
    }
    this.assertPercent(dto.sharePercentage);
    if (dto.investmentAmount < 0) {
      throw new BadRequestException('مبلغ الاستثمار غير صالح');
    }

    const investor = await this.prisma.investor.findUnique({
      where: { id: dto.investorId },
    });
    if (!investor) throw new NotFoundException('المستثمر غير موجود');

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (Number.isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('تاريخ بدء التطبيق غير صالح');
    }

    const now = new Date();
    const activeNow = effectiveFrom.getTime() <= now.getTime();

    return this.prisma.$transaction(async (tx) => {
      let previousId: string | null = null;
      if (dto.supersedeAgreementId) {
        const prev = await tx.investmentAgreement.findUnique({
          where: { id: dto.supersedeAgreementId },
        });
        if (!prev || prev.investorId !== dto.investorId) {
          throw new NotFoundException('الاتفاقية السابقة غير موجودة');
        }
        previousId = prev.id;
        await tx.investmentAgreement.update({
          where: { id: prev.id },
          data: {
            status: InvestmentAgreementStatus.ENDED,
            effectiveTo: effectiveFrom,
          },
        });
      } else {
        const open = await tx.investmentAgreement.findFirst({
          where: {
            investorId: dto.investorId,
            status: {
              in: [
                InvestmentAgreementStatus.ACTIVE,
                InvestmentAgreementStatus.SCHEDULED,
              ],
            },
          },
          orderBy: { effectiveFrom: 'desc' },
        });
        if (open) {
          previousId = open.id;
          await tx.investmentAgreement.update({
            where: { id: open.id },
            data: {
              status: InvestmentAgreementStatus.ENDED,
              effectiveTo: effectiveFrom,
            },
          });
        }
      }

      const created = await tx.investmentAgreement.create({
        data: {
          investorId: dto.investorId,
          investmentAmount: dto.investmentAmount,
          sharePercentage: dto.sharePercentage,
          revenueBase: dto.revenueBase ?? InvestorRevenueBase.PLATFORM_COMMISSION,
          effectiveFrom,
          effectiveTo,
          returnCap: dto.returnCap ?? null,
          status: activeNow
            ? InvestmentAgreementStatus.ACTIVE
            : InvestmentAgreementStatus.SCHEDULED,
          reason: dto.reason,
          createdById: actorId,
          previousAgreementId: previousId,
        },
      });

      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.INVESTOR_SHARE_CHANGED,
        'InvestmentAgreement',
        created.id,
        {
          newValue: {
            investorId: dto.investorId,
            sharePercentage: dto.sharePercentage,
            investmentAmount: dto.investmentAmount,
            returnCap: dto.returnCap ?? null,
            effectiveFrom,
            effectiveTo,
          },
          effectiveDate: effectiveFrom,
          reason: dto.reason,
          tx,
        },
      );
      await this.audit.log(
        actorId,
        AdminAuditAction.INVESTMENT_AGREEMENT_CREATED,
        'InvestmentAgreement',
        created.id,
        { sharePercentage: dto.sharePercentage },
        tx,
      );

      return {
        id: created.id,
        investorId: created.investorId,
        sharePercentage: Number(created.sharePercentage),
        investmentAmount: Number(created.investmentAmount),
        effectiveFrom: created.effectiveFrom,
        effectiveTo: created.effectiveTo,
        returnCap: dec(created.returnCap),
        status: created.status,
        revenueBase: created.revenueBase,
      };
    });
  }

  async terminateAgreement(
    actorId: string,
    agreementId: string,
    dto: { reason: string; confirm: boolean },
  ) {
    if (!dto.confirm) {
      throw new BadRequestException('يجب تأكيد إنهاء اتفاقية المستثمر');
    }
    const agreement = await this.prisma.investmentAgreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) throw new NotFoundException('الاتفاقية غير موجودة');
    if (
      agreement.status === InvestmentAgreementStatus.TERMINATED ||
      agreement.status === InvestmentAgreementStatus.ENDED
    ) {
      throw new ConflictException('الاتفاقية منتهية مسبقاً');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.investmentAgreement.update({
        where: { id: agreementId },
        data: {
          status: InvestmentAgreementStatus.TERMINATED,
          effectiveTo: new Date(),
        },
      });
      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.INVESTMENT_AGREEMENT_TERMINATED,
        'InvestmentAgreement',
        agreementId,
        {
          oldValue: { status: agreement.status, sharePercentage: Number(agreement.sharePercentage) },
          newValue: { status: InvestmentAgreementStatus.TERMINATED },
          reason: dto.reason,
          tx,
        },
      );
      await this.audit.log(
        actorId,
        AdminAuditAction.INVESTMENT_AGREEMENT_TERMINATED,
        'InvestmentAgreement',
        agreementId,
        { reason: dto.reason },
        tx,
      );
      return result;
    });

    return { id: updated.id, status: updated.status, effectiveTo: updated.effectiveTo };
  }

  async listInvestors() {
    const investors = await this.prisma.investor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        agreements: {
          orderBy: { effectiveFrom: 'desc' },
          include: {
            accruals: {
              select: { accrualAmount: true },
            },
          },
        },
        payouts: {
          where: { status: InvestorPayoutStatus.PAID },
          select: { amount: true },
        },
      },
    });

    return investors.map((inv) => {
      const active =
        inv.agreements.find((a) => a.status === InvestmentAgreementStatus.ACTIVE) ??
        inv.agreements[0] ??
        null;
      const accrued = inv.agreements.reduce(
        (sum, a) =>
          sum +
          a.accruals.reduce((s, row) => s + Number(row.accrualAmount), 0),
        0,
      );
      const paidTotal = inv.payouts.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        id: inv.id,
        name: inv.name,
        email: inv.email,
        notes: inv.notes,
        isActive: inv.isActive,
        investmentAmount: active ? Number(active.investmentAmount) : 0,
        sharePercentage: active ? Number(active.sharePercentage) : 0,
        agreementStatus: active?.status ?? null,
        accruedTotal: accrued,
        paidTotal,
        outstanding: Math.max(0, accrued - paidTotal),
        agreements: inv.agreements.map((a) => ({
          id: a.id,
          sharePercentage: Number(a.sharePercentage),
          investmentAmount: Number(a.investmentAmount),
          status: a.status,
          effectiveFrom: a.effectiveFrom,
          effectiveTo: a.effectiveTo,
          revenueBase: a.revenueBase,
          returnCap: a.returnCap != null ? Number(a.returnCap) : null,
        })),
      };
    });
  }

  async getInvestor(id: string) {
    const inv = await this.prisma.investor.findUnique({
      where: { id },
      include: {
        agreements: {
          orderBy: { effectiveFrom: 'desc' },
          include: {
            accruals: {
              orderBy: { createdAt: 'desc' },
              take: 50,
              include: {
                escrow: {
                  select: {
                    id: true,
                    status: true,
                    currency: true,
                    project: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!inv) throw new NotFoundException('المستثمر غير موجود');

    const active =
      inv.agreements.find((a) => a.status === InvestmentAgreementStatus.ACTIVE) ??
      inv.agreements[0] ??
      null;
    const accrued = inv.agreements.reduce(
      (sum, a) =>
        sum + a.accruals.reduce((s, row) => s + Number(row.accrualAmount), 0),
      0,
    );
    const paidTotal = inv.payouts
      .filter((p) => p.status === InvestorPayoutStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      id: inv.id,
      name: inv.name,
      email: inv.email,
      notes: inv.notes,
      isActive: inv.isActive,
      createdAt: inv.createdAt,
      investmentAmount: active ? Number(active.investmentAmount) : 0,
      sharePercentage: active ? Number(active.sharePercentage) : 0,
      agreementStatus: active?.status ?? null,
      accruedTotal: accrued,
      paidTotal,
      outstanding: Math.max(0, accrued - paidTotal),
      payouts: inv.payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paymentReference: p.paymentReference,
        notes: p.notes,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      agreements: inv.agreements.map((a) => ({
        id: a.id,
        sharePercentage: Number(a.sharePercentage),
        investmentAmount: Number(a.investmentAmount),
        status: a.status,
        effectiveFrom: a.effectiveFrom,
        effectiveTo: a.effectiveTo,
        revenueBase: a.revenueBase,
        returnCap: a.returnCap != null ? Number(a.returnCap) : null,
        reason: a.reason,
        accruals: a.accruals.map((row) => ({
          id: row.id,
          escrowId: row.escrowId,
          platformCommissionAmount: Number(row.platformCommissionAmount),
          sharePercentageSnapshot: Number(row.sharePercentageSnapshot),
          accrualAmount: Number(row.accrualAmount),
          currency: row.currency,
          createdAt: row.createdAt,
          projectTitle: row.escrow.project?.title ?? null,
          projectId: row.escrow.project?.id ?? null,
          escrowStatus: row.escrow.status,
        })),
      })),
    };
  }

  async listInvestorAccruals() {
    const rows = await this.prisma.investorAccrual.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        agreement: {
          select: {
            id: true,
            sharePercentage: true,
            investor: { select: { id: true, name: true } },
          },
        },
        escrow: {
          select: {
            id: true,
            status: true,
            currency: true,
            project: { select: { id: true, title: true } },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      escrowId: row.escrowId,
      investorId: row.agreement.investor.id,
      investorName: row.agreement.investor.name,
      platformCommissionAmount: Number(row.platformCommissionAmount),
      sharePercentage: Number(row.sharePercentageSnapshot),
      accrualAmount: Number(row.accrualAmount),
      currency: row.currency,
      createdAt: row.createdAt,
      projectTitle: row.escrow.project?.title ?? null,
      projectId: row.escrow.project?.id ?? null,
      status: row.escrow.status,
    }));
  }

  async listStaffAdmins() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        profile: { select: { firstName: true, lastName: true } },
        adminPermissions: { select: { permission: true, createdAt: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      name: u.profile
        ? `${u.profile.firstName} ${u.profile.lastName}`
        : u.email,
      permissions: u.adminPermissions.map((p) => p.permission),
    }));
  }

  preview(dto: {
    projectValue: number;
    commissionPercent: number;
    investorSharePercent?: number;
    minimumCommissionAmount?: number | null;
    maximumCommissionAmount?: number | null;
  }) {
    return previewCommissionSplit(dto);
  }

  resolvePreview(dto: {
    projectId?: string;
    projectValue: number;
    commissionPercent?: number;
    investorSharePercent?: number;
  }) {
    return this.commission.preview(dto);
  }

  async grantFinancePermission(actorId: string, userId: string, permission: AdminPermission) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('منح الصلاحيات متاح لمالك المنصة فقط');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException('الصلاحية تُمنح لموظفي الإدارة فقط');
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.userAdminPermission.upsert({
        where: { userId_permission: { userId, permission } },
        create: { userId, permission, grantedById: actorId },
        update: {},
      });
      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.FINANCE_PERMISSION_CHANGED,
        'UserAdminPermission',
        created.id,
        {
          newValue: { userId, permission, granted: true },
          reason: 'منح صلاحية مالية',
          tx,
        },
      );
      await this.audit.log(
        actorId,
        AdminAuditAction.FINANCE_PERMISSION_GRANTED,
        'User',
        userId,
        { permission },
        tx,
      );
      return created;
    });
    return row;
  }

  async revokeFinancePermission(actorId: string, userId: string, permission: AdminPermission) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('سحب الصلاحيات متاح لمالك المنصة فقط');
    }
    const existing = await this.prisma.userAdminPermission.findUnique({
      where: { userId_permission: { userId, permission } },
    });
    if (!existing) throw new NotFoundException('الصلاحية غير موجودة');

    await this.prisma.$transaction(async (tx) => {
      await tx.userAdminPermission.delete({ where: { id: existing.id } });
      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.FINANCE_PERMISSION_CHANGED,
        'UserAdminPermission',
        existing.id,
        {
          oldValue: { userId, permission, granted: true },
          newValue: { userId, permission, granted: false },
          reason: 'سحب صلاحية مالية',
          tx,
        },
      );
      await this.audit.log(
        actorId,
        AdminAuditAction.FINANCE_PERMISSION_REVOKED,
        'User',
        userId,
        { permission },
        tx,
      );
    });
    return { success: true };
  }

  async updateFutureFeeSetting(
    actorId: string,
    key: string,
    dto: { valueJson: Record<string, unknown>; effectiveFrom?: string | null; notes?: string; reason: string },
  ) {
    const existing = await this.prisma.futureFeeSetting.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException('إعداد الرسوم غير موجود');

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.futureFeeSetting.update({
        where: { key },
        data: {
          valueJson: dto.valueJson as Prisma.InputJsonValue,
          effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          notes: dto.notes ?? existing.notes,
          updatedById: actorId,
        },
      });
      await this.commercialAudit.log(
        actorId,
        CommercialAuditAction.FUTURE_FEE_SETTING_CHANGED,
        'FutureFeeSetting',
        row.id,
        {
          oldValue: existing.valueJson as Record<string, unknown>,
          newValue: dto.valueJson,
          effectiveDate: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
          reason: dto.reason,
          tx,
        },
      );
      return row;
    });
    return updated;
  }

  private assertPercent(value: number) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0 || value > 100) {
      throw new BadRequestException('النسبة يجب أن تكون بين 0 و 100');
    }
  }

  private formatPlatformPolicy(row: {
    id: string;
    defaultCommissionPercentage: Prisma.Decimal;
    minimumCommissionAmount: Prisma.Decimal | null;
    maximumCommissionAmount: Prisma.Decimal | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    status: CommissionPolicyStatus;
    reason: string | null;
    createdAt: Date;
    createdBy?: { id: string; email: string } | null;
  }) {
    return {
      id: row.id,
      defaultCommissionPercentage: Number(row.defaultCommissionPercentage),
      minimumCommissionAmount: dec(row.minimumCommissionAmount),
      maximumCommissionAmount: dec(row.maximumCommissionAmount),
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      status: row.status,
      reason: row.reason,
      changedBy: row.createdBy?.email ?? null,
      createdAt: row.createdAt,
    };
  }
}
