import { Injectable } from '@nestjs/common';
import {
  CommissionPolicyStatus,
  CommissionSource,
  InvestmentAgreementStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  calculateFeesFromPercent,
  FALLBACK_COMMISSION_PERCENT,
  previewCommissionSplit,
  roundMoney,
} from './commercial.constants.js';

export type ResolvedCommission = {
  commissionPercent: number;
  platformFee: number;
  freelancerPayout: number;
  source: CommissionSource;
  platformCommissionPolicyId: string | null;
  categoryCommissionOverrideId: string | null;
  projectCommissionOverrideId: string | null;
  minimumCommissionAmount: number | null;
  maximumCommissionAmount: number | null;
};

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CommissionResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForProject(
    projectId: string,
    amount: number,
    asOf: Date = new Date(),
    client: Tx = this.prisma,
  ): Promise<ResolvedCommission> {
    const project = await client.project.findUnique({
      where: { id: projectId },
      select: { id: true, categoryId: true },
    });
    if (!project) {
      return this.fromPlatformDefault(amount, asOf, client);
    }

    const projectOverride = await client.projectCommissionOverride.findFirst({
      where: {
        projectId,
        OR: [
          {
            status: CommissionPolicyStatus.ACTIVE,
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
          },
          {
            status: CommissionPolicyStatus.SCHEDULED,
            effectiveFrom: { lte: asOf },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
          },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const platform = await this.getActivePlatformPolicy(asOf, client);

    if (
      projectOverride &&
      (projectOverride.status === CommissionPolicyStatus.ACTIVE ||
        projectOverride.effectiveFrom <= asOf)
    ) {
      const percent = Number(projectOverride.commissionPercentage);
      const fees = calculateFeesFromPercent(amount, percent, {
        minimumCommissionAmount: platform?.minimumCommissionAmount
          ? Number(platform.minimumCommissionAmount)
          : null,
        maximumCommissionAmount: platform?.maximumCommissionAmount
          ? Number(platform.maximumCommissionAmount)
          : null,
      });
      return {
        commissionPercent: fees.commissionPercent,
        platformFee: fees.platformFee,
        freelancerPayout: fees.freelancerPayout,
        source: CommissionSource.PROJECT_OVERRIDE,
        platformCommissionPolicyId: platform?.id ?? null,
        categoryCommissionOverrideId: null,
        projectCommissionOverrideId: projectOverride.id,
        minimumCommissionAmount: platform?.minimumCommissionAmount
          ? Number(platform.minimumCommissionAmount)
          : null,
        maximumCommissionAmount: platform?.maximumCommissionAmount
          ? Number(platform.maximumCommissionAmount)
          : null,
      };
    }

    const categoryOverride = await client.categoryCommissionOverride.findFirst({
      where: {
        categoryId: project.categoryId,
        commissionPercentage: { not: null },
        OR: [
          {
            status: CommissionPolicyStatus.ACTIVE,
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
          },
          {
            status: CommissionPolicyStatus.SCHEDULED,
            effectiveFrom: { lte: asOf },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
          },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (categoryOverride?.commissionPercentage != null) {
      const percent = Number(categoryOverride.commissionPercentage);
      const fees = calculateFeesFromPercent(amount, percent, {
        minimumCommissionAmount: platform?.minimumCommissionAmount
          ? Number(platform.minimumCommissionAmount)
          : null,
        maximumCommissionAmount: platform?.maximumCommissionAmount
          ? Number(platform.maximumCommissionAmount)
          : null,
      });
      return {
        commissionPercent: fees.commissionPercent,
        platformFee: fees.platformFee,
        freelancerPayout: fees.freelancerPayout,
        source: CommissionSource.CATEGORY_OVERRIDE,
        platformCommissionPolicyId: platform?.id ?? null,
        categoryCommissionOverrideId: categoryOverride.id,
        projectCommissionOverrideId: null,
        minimumCommissionAmount: platform?.minimumCommissionAmount
          ? Number(platform.minimumCommissionAmount)
          : null,
        maximumCommissionAmount: platform?.maximumCommissionAmount
          ? Number(platform.maximumCommissionAmount)
          : null,
      };
    }

    return this.fromPlatformDefault(amount, asOf, client, platform);
  }

  async preview(input: {
    projectId?: string;
    projectValue: number;
    commissionPercent?: number;
    investorSharePercent?: number;
    asOf?: Date;
  }) {
    const asOf = input.asOf ?? new Date();
    let resolved: ResolvedCommission;

    if (input.commissionPercent != null) {
      const platform = await this.getActivePlatformPolicy(asOf);
      const fees = calculateFeesFromPercent(input.projectValue, input.commissionPercent, {
        minimumCommissionAmount: platform?.minimumCommissionAmount
          ? Number(platform.minimumCommissionAmount)
          : null,
        maximumCommissionAmount: platform?.maximumCommissionAmount
          ? Number(platform.maximumCommissionAmount)
          : null,
      });
      resolved = {
        commissionPercent: fees.commissionPercent,
        platformFee: fees.platformFee,
        freelancerPayout: fees.freelancerPayout,
        source: CommissionSource.PLATFORM_DEFAULT,
        platformCommissionPolicyId: platform?.id ?? null,
        categoryCommissionOverrideId: null,
        projectCommissionOverrideId: null,
        minimumCommissionAmount: platform?.minimumCommissionAmount
          ? Number(platform.minimumCommissionAmount)
          : null,
        maximumCommissionAmount: platform?.maximumCommissionAmount
          ? Number(platform.maximumCommissionAmount)
          : null,
      };
    } else if (input.projectId) {
      resolved = await this.resolveForProject(
        input.projectId,
        input.projectValue,
        asOf,
      );
    } else {
      resolved = await this.fromPlatformDefault(input.projectValue, asOf);
    }

    return {
      ...previewCommissionSplit({
        projectValue: input.projectValue,
        commissionPercent: resolved.commissionPercent,
        investorSharePercent: input.investorSharePercent,
        minimumCommissionAmount: resolved.minimumCommissionAmount,
        maximumCommissionAmount: resolved.maximumCommissionAmount,
      }),
      source: resolved.source,
      hierarchy: {
        projectOverride: resolved.source === CommissionSource.PROJECT_OVERRIDE,
        categoryOverride: resolved.source === CommissionSource.CATEGORY_OVERRIDE,
        platformDefault: resolved.source === CommissionSource.PLATFORM_DEFAULT,
      },
    };
  }

  async listActiveAgreementsForSettlement(asOf: Date, client: Tx = this.prisma) {
    return client.investmentAgreement.findMany({
      where: {
        status: {
          in: [InvestmentAgreementStatus.ACTIVE, InvestmentAgreementStatus.SCHEDULED],
        },
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
        revenueBase: 'PLATFORM_COMMISSION',
      },
      include: {
        investor: { select: { id: true, name: true } },
        accruals: { select: { accrualAmount: true } },
      },
    });
  }

  /**
   * Persist investor accruals from settled platform commission.
   * Respects returnCap using historical accrual sum for the agreement.
   */
  async createInvestorAccrualsInTx(
    tx: Prisma.TransactionClient,
    escrowId: string,
    platformCommissionAmount: number,
    currency: string,
    asOf: Date = new Date(),
  ) {
    const agreements = await this.listActiveAgreementsForSettlement(asOf, tx);
    const created = [];

    for (const agreement of agreements) {
      if (agreement.status === InvestmentAgreementStatus.SCHEDULED) {
        // Activate scheduled agreements that are already effective
        if (agreement.effectiveFrom <= asOf) {
          await tx.investmentAgreement.update({
            where: { id: agreement.id },
            data: { status: InvestmentAgreementStatus.ACTIVE },
          });
        } else {
          continue;
        }
      }

      const share = Number(agreement.sharePercentage);
      let accrual = roundMoney(platformCommissionAmount * (share / 100));
      if (agreement.returnCap != null) {
        const prior = agreement.accruals.reduce(
          (sum, row) => sum + Number(row.accrualAmount),
          0,
        );
        const remaining = Number(agreement.returnCap) - prior;
        if (remaining <= 0) continue;
        accrual = Math.min(accrual, roundMoney(remaining));
      }
      if (accrual <= 0) continue;

      const row = await tx.investorAccrual.create({
        data: {
          agreementId: agreement.id,
          escrowId,
          sharePercentageSnapshot: share,
          platformCommissionAmount,
          accrualAmount: accrual,
          currency,
        },
      });
      created.push(row);
    }

    return created;
  }

  private async getActivePlatformPolicy(asOf: Date, client: Tx = this.prisma) {
    return client.platformCommissionPolicy.findFirst({
      where: {
        OR: [
          {
            status: CommissionPolicyStatus.ACTIVE,
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
          },
          {
            status: CommissionPolicyStatus.SCHEDULED,
            effectiveFrom: { lte: asOf },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
          },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private async fromPlatformDefault(
    amount: number,
    asOf: Date,
    client: Tx = this.prisma,
    platform?: Awaited<ReturnType<CommissionResolutionService['getActivePlatformPolicy']>>,
  ): Promise<ResolvedCommission> {
    const policy = platform ?? (await this.getActivePlatformPolicy(asOf, client));
    const percent = policy
      ? Number(policy.defaultCommissionPercentage)
      : FALLBACK_COMMISSION_PERCENT;
    const min = policy?.minimumCommissionAmount
      ? Number(policy.minimumCommissionAmount)
      : null;
    const max = policy?.maximumCommissionAmount
      ? Number(policy.maximumCommissionAmount)
      : null;
    const fees = calculateFeesFromPercent(amount, percent, {
      minimumCommissionAmount: min,
      maximumCommissionAmount: max,
    });
    return {
      commissionPercent: fees.commissionPercent,
      platformFee: fees.platformFee,
      freelancerPayout: fees.freelancerPayout,
      source: CommissionSource.PLATFORM_DEFAULT,
      platformCommissionPolicyId: policy?.id ?? null,
      categoryCommissionOverrideId: null,
      projectCommissionOverrideId: null,
      minimumCommissionAmount: min,
      maximumCommissionAmount: max,
    };
  }
}
