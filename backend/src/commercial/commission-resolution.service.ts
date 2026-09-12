import { Injectable } from '@nestjs/common';
import { CommissionSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { LaunchProgramService } from '../launch/launch.service.js';
import { previewCommissionSplit } from './commercial.constants.js';
import { zeroCommissionResolution } from './commercial-project-finance-freeze.js';

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

/**
 * Advertising / subscription marketplace:
 * project commission is always 0; investor accruals from project fees are frozen.
 * Historical tables/enums remain for audit.
 */
@Injectable()
export class CommissionResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly launchProgram: LaunchProgramService,
  ) {}

  async resolveForProject(
    _projectId: string,
    amount: number,
    _asOf: Date = new Date(),
    _client: Tx = this.prisma,
  ): Promise<ResolvedCommission> {
    const zero = zeroCommissionResolution(Number(amount) || 0);
    return {
      ...zero,
      source: CommissionSource.PLATFORM_DEFAULT,
    };
  }

  async preview(input: {
    projectId?: string;
    projectValue: number;
    commissionPercent?: number;
    investorSharePercent?: number;
    asOf?: Date;
  }) {
    const resolved = await this.resolveForProject(
      input.projectId ?? 'preview',
      input.projectValue,
    );

    return {
      ...previewCommissionSplit({
        projectValue: input.projectValue,
        commissionPercent: 0,
        investorSharePercent: input.investorSharePercent,
        minimumCommissionAmount: null,
        maximumCommissionAmount: null,
      }),
      source: resolved.source,
      hierarchy: {
        projectOverride: false,
        categoryOverride: false,
        platformDefault: true,
      },
      advertisingModel: true,
      projectCommission: 0,
    };
  }

  async listActiveAgreementsForSettlement(asOf: Date, client: Tx = this.prisma) {
    // Kept for historical tooling / admin reads; settlement no longer creates accruals.
    return client.investmentAgreement.findMany({
      where: {
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
   * Frozen: no new investor accruals from project commission.
   * Historical InvestorAccrual rows are preserved.
   */
  async createInvestorAccrualsInTx(
    _tx: Prisma.TransactionClient,
    _escrowId: string,
    _platformCommissionAmount: number,
    _currency: string,
    _asOf: Date = new Date(),
  ) {
    return [];
  }
}
