import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  DisputeStatus,
  EscrowStatus,
  EscrowTransactionType,
  NotificationType,
  PaymentStatus,
  Prisma,
  ProjectStatus,
  ProposalStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaymentService } from '../payments/payment.service.js';
import { ProposalStateService } from '../proposals/proposal-validation.util.js';
import { acceptProposalInTransaction } from '../proposals/proposal-acceptance.util.js';
import { CommissionResolutionService } from '../commercial/commission-resolution.service.js';
import { ESCROW_CURRENCY } from './escrow.constants.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class EscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly paymentService: PaymentService,
    private readonly commission: CommissionResolutionService,
  ) {}

  async getByProposal(proposalId: string, userId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { proposalId },
      include: { dispute: true },
    });
    if (!escrow) return null;
    this.assertParticipant(escrow, userId);
    return this.formatEscrow(escrow);
  }

  async getByProject(projectId: string, userId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { projectId },
      include: { dispute: true },
    });
    if (!escrow) return null;
    this.assertParticipant(escrow, userId);
    return this.formatEscrow(escrow);
  }

  async listMine(userId: string) {
    const escrows = await this.prisma.escrow.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      include: {
        dispute: true,
        project: { select: { id: true, title: true, slug: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return escrows.map((e) => ({
      ...this.formatEscrow(e),
      project: e.project,
    }));
  }

  async prepare(clientId: string, proposalId: string) {
    const proposal = await this.loadProposalForClient(clientId, proposalId);
    const amount = Number(proposal.proposedPrice);
    const resolved = await this.commission.resolveForProject(
      proposal.projectId,
      amount,
    );

    const existing = await this.prisma.escrow.findUnique({
      where: { proposalId },
    });

    if (existing) {
      if (existing.status !== EscrowStatus.PENDING_FUNDING) {
        throw new ConflictException('الضمان موجود بالفعل ولا يمكن إعادة تجهيزه');
      }
      return this.formatEscrow(existing);
    }

    const escrow = await this.prisma.escrow.create({
      data: {
        projectId: proposal.projectId,
        proposalId,
        clientId,
        freelancerId: proposal.freelancerId,
        amount,
        platformFee: resolved.platformFee,
        freelancerPayout: resolved.freelancerPayout,
        commissionPercentage: resolved.commissionPercent,
        commissionSource: resolved.source,
        platformCommissionPolicyId: resolved.platformCommissionPolicyId,
        categoryCommissionOverrideId: resolved.categoryCommissionOverrideId,
        projectCommissionOverrideId: resolved.projectCommissionOverrideId,
        currency: ESCROW_CURRENCY,
        status: EscrowStatus.PENDING_FUNDING,
      },
    });

    return this.formatEscrow(escrow);
  }

  async fund(clientId: string, escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('الضمان غير موجود');
    if (escrow.clientId !== clientId) throw new ForbiddenException('غير مصرح');
    if (escrow.status !== EscrowStatus.PENDING_FUNDING) {
      throw new ConflictException('الضمان مموّل مسبقاً أو غير قابل للتمويل');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const capture = await this.paymentService.captureEscrowFundingInTx(tx, {
        escrowId,
        clientId,
        amount: escrow.amount,
        currency: escrow.currency,
      });

      const result = await tx.escrow.updateMany({
        where: { id: escrowId, status: EscrowStatus.PENDING_FUNDING },
        data: {
          status: EscrowStatus.FUNDED,
          fundedAt: new Date(),
        },
      });
      if (result.count === 0) throw new ConflictException('تعذر تمويل الضمان');

      await tx.escrowTransaction.create({
        data: {
          escrowId,
          type: EscrowTransactionType.DEPOSIT,
          amount: escrow.amount,
          currency: escrow.currency,
          note: capture.depositNote,
          createdById: clientId,
        },
      });

      return tx.escrow.findUniqueOrThrow({ where: { id: escrowId } });
    });

    await this.notifications.create(
      escrow.freelancerId,
      NotificationType.ESCROW_FUNDED,
      'تم تمويل الضمان',
      'قام العميل بتمويل مبلغ المشروع في الضمان. يمكنك البدء بالعمل بعد قبول العرض.',
      `/dashboard/proposals`,
    );

    return this.formatEscrow(updated);
  }

  /** Called after async payment (redirect + webhook) confirms success. */
  async completeFundingAfterPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { escrow: true },
    });
    if (!payment || payment.status !== PaymentStatus.SUCCEEDED) return;
    if (!payment.escrowId || !payment.escrow) return;
    if (payment.escrow.status === EscrowStatus.FUNDED) return;

    const escrowId = payment.escrowId;
    const escrow = payment.escrow;

    await this.prisma.$transaction(async (tx) => {
      const capture = await this.paymentService.captureEscrowFundingInTx(tx, {
        escrowId,
        clientId: payment.clientId,
        amount: escrow.amount,
        currency: escrow.currency,
      });

      const result = await tx.escrow.updateMany({
        where: { id: escrowId, status: EscrowStatus.PENDING_FUNDING },
        data: { status: EscrowStatus.FUNDED, fundedAt: new Date() },
      });
      if (result.count === 0) return;

      const existingDeposit = await tx.escrowTransaction.findFirst({
        where: { escrowId, type: EscrowTransactionType.DEPOSIT },
      });
      if (!existingDeposit) {
        await tx.escrowTransaction.create({
          data: {
            escrowId,
            type: EscrowTransactionType.DEPOSIT,
            amount: escrow.amount,
            currency: escrow.currency,
            note: capture.depositNote,
            createdById: payment.clientId,
          },
        });
      }
    });

    const fundedEscrow = await this.prisma.escrow.findUniqueOrThrow({
      where: { id: escrowId },
    });

    await this.notifications.create(
      fundedEscrow.freelancerId,
      NotificationType.ESCROW_FUNDED,
      'تم تمويل الضمان',
      'قام العميل بتمويل مبلغ المشروع في الضمان.',
      `/dashboard/proposals`,
    );
  }

  async fundAndAccept(clientId: string, proposalId: string) {
    const proposal = await this.loadProposalForClient(clientId, proposalId);

    const pendingFreelancerIds = (
      await this.prisma.proposal.findMany({
        where: {
          projectId: proposal.projectId,
          status: ProposalStatus.PENDING,
          id: { not: proposalId },
        },
        select: { freelancerId: true },
      })
    ).map((p) => p.freelancerId);

    const result = await this.prisma.$transaction(async (tx) => {
      await this.ensureFundedEscrowInTx(tx, clientId, proposal);
      return acceptProposalInTransaction(tx, proposalId, proposal.projectId);
    });

    await this.notifications.create(
      proposal.freelancerId,
      NotificationType.ESCROW_FUNDED,
      'تم تمويل الضمان وقبول العرض',
      `تم قبول عرضك وتمويل مبلغ المشروع في الضمان.`,
      `/dashboard/proposals`,
    );

    await this.notifications.create(
      proposal.freelancerId,
      NotificationType.PROPOSAL_ACCEPTED,
      'تم قبول عرضك',
      `تم قبول عرضك على المشروع.`,
      `/dashboard/proposals`,
    );

    if (result.rejectedCount > 0) {
      const project = await this.prisma.project.findUniqueOrThrow({
        where: { id: proposal.projectId },
        select: { title: true },
      });
      for (const freelancerId of pendingFreelancerIds) {
        await this.notifications.create(
          freelancerId,
          NotificationType.PROPOSAL_REJECTED,
          'تم رفض عرضك',
          `تم اختيار مستقل آخر لمشروع "${project.title}"`,
          `/dashboard/proposals`,
        );
      }
    }

    const accepted = await this.prisma.proposal.findUniqueOrThrow({
      where: { id: proposalId },
      select: {
        id: true,
        status: true,
        coverLetter: true,
        proposedPrice: true,
        estimatedDurationDays: true,
        createdAt: true,
      },
    });

    return {
      ...accepted,
      proposedPrice: Number(accepted.proposedPrice),
    };
  }

  async assertFundedForAccept(proposalId: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { proposalId } });
    if (!escrow || escrow.status !== EscrowStatus.FUNDED) {
      throw new PreconditionFailedException({
        message: 'يجب تمويل الضمان قبل قبول العرض',
        code: 'ESCROW_NOT_FUNDED',
      });
    }
  }

  async releaseOnComplete(tx: Tx, projectId: string) {
    const escrow = await tx.escrow.findUnique({ where: { projectId } });
    if (!escrow) return null;
    if (escrow.status === EscrowStatus.RELEASED) return escrow;
    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new ConflictException('لا يمكن تحرير الضمان في هذه الحالة');
    }

    const settledPercent =
      escrow.commissionPercentage != null
        ? Number(escrow.commissionPercentage)
        : Number(escrow.platformFee) > 0 && Number(escrow.amount) > 0
          ? Math.round(
              (Number(escrow.platformFee) / Number(escrow.amount)) * 10000,
            ) / 100
          : null;

    const updated = await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status: EscrowStatus.RELEASED,
        releasedAt: new Date(),
        settledCommissionPercentage: settledPercent,
        settledPlatformFee: escrow.platformFee,
      },
    });

    await tx.escrowTransaction.createMany({
      data: [
        {
          escrowId: escrow.id,
          type: EscrowTransactionType.PLATFORM_FEE,
          amount: escrow.platformFee,
          currency: escrow.currency,
          note: 'عمولة المنصة',
        },
        {
          escrowId: escrow.id,
          type: EscrowTransactionType.RELEASE,
          amount: escrow.freelancerPayout,
          currency: escrow.currency,
          note: 'تحرير المبلغ للمستقل',
        },
      ],
    });

    // Investor accruals from snapshotted platform fee — never from live % settings
    await this.commission.createInvestorAccrualsInTx(
      tx,
      escrow.id,
      Number(escrow.platformFee),
      escrow.currency,
    );

    return updated;
  }

  async openDispute(userId: string, escrowId: string, reason: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { project: { select: { title: true } }, dispute: true },
    });
    if (!escrow) throw new NotFoundException('الضمان غير موجود');
    this.assertParticipant(escrow, userId);
    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new ConflictException('لا يمكن فتح نزاع إلا على ضمان مموّل');
    }
    if (escrow.dispute) throw new ConflictException('يوجد نزاع مفتوح بالفعل');

    const dispute = await this.prisma.$transaction(async (tx) => {
      await tx.escrow.update({
        where: { id: escrowId },
        data: { status: EscrowStatus.DISPUTED },
      });
      return tx.escrowDispute.create({
        data: {
          escrowId,
          openedById: userId,
          reason,
          status: DisputeStatus.OPEN,
        },
      });
    });

    const notifyId = escrow.clientId === userId ? escrow.freelancerId : escrow.clientId;
    await this.notifications.create(
      notifyId,
      NotificationType.ESCROW_DISPUTED,
      'نزاع على الضمان',
      `تم فتح نزاع على مشروع "${escrow.project.title}"`,
      `/dashboard/projects/${escrow.projectId}/edit`,
    );

    return dispute;
  }

  async listDisputesForAdmin(status: 'open' | 'resolved' = 'open') {
    const where =
      status === 'open'
        ? { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } }
        : {
            status: {
              in: [
                DisputeStatus.RESOLVED_REFUND_CLIENT,
                DisputeStatus.RESOLVED_RELEASE_FREELANCER,
                DisputeStatus.CLOSED,
              ],
            },
          };

    const disputes = await this.prisma.escrowDispute.findMany({
      where,
      include: {
        escrow: {
          include: {
            project: { select: { id: true, title: true, slug: true, status: true } },
            client: {
              include: {
                profile: { select: { firstName: true, lastName: true, username: true } },
              },
            },
            freelancer: {
              include: {
                profile: { select: { firstName: true, lastName: true, username: true } },
              },
            },
          },
        },
        openedBy: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
        resolvedBy: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: status === 'open' ? { createdAt: 'desc' } : { resolvedAt: 'desc' },
    });

    return disputes.map((dispute) => ({
      id: dispute.id,
      reason: dispute.reason,
      status: dispute.status,
      createdAt: dispute.createdAt,
      resolution: dispute.resolution,
      resolvedAt: dispute.resolvedAt,
      resolvedBy: dispute.resolvedBy?.profile
        ? {
            id: dispute.resolvedById,
            name: `${dispute.resolvedBy.profile.firstName} ${dispute.resolvedBy.profile.lastName}`,
          }
        : null,
      openedBy: dispute.openedBy.profile
        ? {
            id: dispute.openedById,
            name: `${dispute.openedBy.profile.firstName} ${dispute.openedBy.profile.lastName}`,
          }
        : { id: dispute.openedById, name: 'مستخدم' },
      escrow: {
        id: dispute.escrow.id,
        amount: Number(dispute.escrow.amount),
        platformFee: Number(dispute.escrow.platformFee),
        freelancerPayout: Number(dispute.escrow.freelancerPayout),
        currency: dispute.escrow.currency,
        status: dispute.escrow.status,
        project: dispute.escrow.project,
        client: this.formatDisputeParty(dispute.escrow.client),
        freelancer: this.formatDisputeParty(dispute.escrow.freelancer),
      },
    }));
  }

  private formatDisputeParty(user: {
    id: string;
    profile: { firstName: string; lastName: string; username: string } | null;
  }) {
    return {
      id: user.id,
      name: user.profile
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : 'مستخدم',
      username: user.profile?.username ?? null,
    };
  }

  async resolveDispute(
    adminId: string,
    disputeId: string,
    resolution: string,
    outcome: 'REFUND_CLIENT' | 'RELEASE_FREELANCER',
  ) {
    const dispute = await this.prisma.escrowDispute.findUnique({
      where: { id: disputeId },
      include: { escrow: { include: { project: true } } },
    });
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.UNDER_REVIEW) {
      throw new ConflictException('النزاع مغلق مسبقاً');
    }

    const escrow = dispute.escrow;
    const disputeStatus =
      outcome === 'REFUND_CLIENT'
        ? DisputeStatus.RESOLVED_REFUND_CLIENT
        : DisputeStatus.RESOLVED_RELEASE_FREELANCER;

    await this.prisma.$transaction(async (tx) => {
      await tx.escrowDispute.update({
        where: { id: disputeId },
        data: {
          status: disputeStatus,
          resolution,
          resolvedAt: new Date(),
          resolvedById: adminId,
        },
      });

      if (outcome === 'REFUND_CLIENT') {
        await this.paymentService.recordEscrowRefundInTx(tx, escrow.id);
        await tx.escrow.update({
          where: { id: escrow.id },
          data: { status: EscrowStatus.REFUNDED, refundedAt: new Date() },
        });
        await tx.escrowTransaction.create({
          data: {
            escrowId: escrow.id,
            type: EscrowTransactionType.REFUND,
            amount: escrow.amount,
            currency: escrow.currency,
            note: 'استرداد للعميل — قرار إداري',
            createdById: adminId,
          },
        });
      } else {
        const settledPercent =
          escrow.commissionPercentage != null
            ? Number(escrow.commissionPercentage)
            : Number(escrow.platformFee) > 0 && Number(escrow.amount) > 0
              ? Math.round(
                  (Number(escrow.platformFee) / Number(escrow.amount)) * 10000,
                ) / 100
              : null;
        await tx.escrow.update({
          where: { id: escrow.id },
          data: {
            status: EscrowStatus.RELEASED,
            releasedAt: new Date(),
            settledCommissionPercentage: settledPercent,
            settledPlatformFee: escrow.platformFee,
          },
        });
        await tx.escrowTransaction.createMany({
          data: [
            {
              escrowId: escrow.id,
              type: EscrowTransactionType.PLATFORM_FEE,
              amount: escrow.platformFee,
              currency: escrow.currency,
              note: 'عمولة المنصة — قرار إداري',
            },
            {
              escrowId: escrow.id,
              type: EscrowTransactionType.RELEASE,
              amount: escrow.freelancerPayout,
              currency: escrow.currency,
              note: 'تحرير للمستقل — قرار إداري',
            },
          ],
        });
        await this.commission.createInvestorAccrualsInTx(
          tx,
          escrow.id,
          Number(escrow.platformFee),
          escrow.currency,
        );
      }

      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: AdminAuditAction.ESCROW_DISPUTE_RESOLVED,
          entityType: 'EscrowDispute',
          entityId: disputeId,
          metadata: { outcome, escrowId: escrow.id },
        },
      });
    });

    await this.notifications.create(
      escrow.clientId,
      NotificationType.ESCROW_DISPUTE_RESOLVED,
      'تم حل النزاع',
      resolution,
      `/dashboard/projects/${escrow.projectId}/edit`,
    );
    await this.notifications.create(
      escrow.freelancerId,
      NotificationType.ESCROW_DISPUTE_RESOLVED,
      'تم حل النزاع',
      resolution,
      `/dashboard/proposals`,
    );

    return { success: true };
  }

  private async ensureFundedEscrowInTx(
    tx: Tx,
    clientId: string,
    proposal: Awaited<ReturnType<typeof this.loadProposalForClient>>,
  ) {
    const amount = Number(proposal.proposedPrice);
    const resolved = await this.commission.resolveForProject(
      proposal.projectId,
      amount,
      new Date(),
      tx,
    );

    let escrow = await tx.escrow.findUnique({ where: { proposalId: proposal.id } });

    const projectEscrow = await tx.escrow.findUnique({
      where: { projectId: proposal.projectId },
    });
    if (projectEscrow && projectEscrow.proposalId !== proposal.id) {
      throw new ConflictException('المشروع لم يعد يقبل قبول عروض');
    }

    if (!escrow) {
      try {
        escrow = await tx.escrow.create({
          data: {
            projectId: proposal.projectId,
            proposalId: proposal.id,
            clientId,
            freelancerId: proposal.freelancerId,
            amount,
            platformFee: resolved.platformFee,
            freelancerPayout: resolved.freelancerPayout,
            commissionPercentage: resolved.commissionPercent,
            commissionSource: resolved.source,
            platformCommissionPolicyId: resolved.platformCommissionPolicyId,
            categoryCommissionOverrideId: resolved.categoryCommissionOverrideId,
            projectCommissionOverrideId: resolved.projectCommissionOverrideId,
            currency: ESCROW_CURRENCY,
            status: EscrowStatus.PENDING_FUNDING,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('المشروع لم يعد يقبل قبول عروض');
        }
        throw error;
      }
    }

    if (escrow.status === EscrowStatus.PENDING_FUNDING) {
      const capture = await this.paymentService.captureEscrowFundingInTx(tx, {
        escrowId: escrow.id,
        clientId,
        amount: escrow.amount,
        currency: escrow.currency,
      });

      escrow = await tx.escrow.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.FUNDED, fundedAt: new Date() },
      });

      await tx.escrowTransaction.create({
        data: {
          escrowId: escrow.id,
          type: EscrowTransactionType.DEPOSIT,
          amount: escrow.amount,
          currency: escrow.currency,
          note: capture.depositNote,
          createdById: clientId,
        },
      });
    } else if (escrow.status !== EscrowStatus.FUNDED) {
      throw new ConflictException('حالة الضمان لا تسمح بقبول العرض');
    }

    return escrow;
  }

  private async loadProposalForClient(clientId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { project: true },
    });
    if (!proposal) throw new NotFoundException('العرض غير موجود');
    if (proposal.project.clientId !== clientId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا العرض');
    }
    if (
      proposal.project.status !== ProjectStatus.OPEN ||
      proposal.project.acceptedProposalId !== null
    ) {
      throw new ConflictException('المشروع لم يعد يقبل قبول عروض');
    }
    ProposalStateService.assertCanAccept(proposal.status);
    return proposal;
  }

  private assertParticipant(
    escrow: { clientId: string; freelancerId: string },
    userId: string,
  ) {
    if (escrow.clientId !== userId && escrow.freelancerId !== userId) {
      throw new ForbiddenException('غير مصرح');
    }
  }

  private formatEscrow(
    escrow: {
      id: string;
      projectId: string;
      proposalId: string;
      clientId: string;
      freelancerId: string;
      amount: Prisma.Decimal;
      platformFee: Prisma.Decimal;
      freelancerPayout: Prisma.Decimal;
      currency: string;
      status: EscrowStatus;
      commissionPercentage?: Prisma.Decimal | null;
      commissionSource?: string | null;
      settledCommissionPercentage?: Prisma.Decimal | null;
      settledPlatformFee?: Prisma.Decimal | null;
      fundedAt: Date | null;
      releasedAt: Date | null;
      refundedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      dispute?: { id: string; status: DisputeStatus; reason: string } | null;
    },
  ) {
    return {
      id: escrow.id,
      projectId: escrow.projectId,
      proposalId: escrow.proposalId,
      amount: Number(escrow.amount),
      platformFee: Number(escrow.platformFee),
      freelancerPayout: Number(escrow.freelancerPayout),
      commissionPercentage:
        escrow.commissionPercentage != null
          ? Number(escrow.commissionPercentage)
          : null,
      commissionSource: escrow.commissionSource ?? null,
      settledCommissionPercentage:
        escrow.settledCommissionPercentage != null
          ? Number(escrow.settledCommissionPercentage)
          : null,
      settledPlatformFee:
        escrow.settledPlatformFee != null
          ? Number(escrow.settledPlatformFee)
          : null,
      currency: escrow.currency,
      status: escrow.status,
      fundedAt: escrow.fundedAt,
      releasedAt: escrow.releasedAt,
      refundedAt: escrow.refundedAt,
      createdAt: escrow.createdAt,
      updatedAt: escrow.updatedAt,
      dispute: escrow.dispute
        ? {
            id: escrow.dispute.id,
            status: escrow.dispute.status,
            reason: escrow.dispute.reason,
          }
        : null,
    };
  }
}
