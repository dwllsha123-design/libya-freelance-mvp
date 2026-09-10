import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import {
  AgreementAuditAction,
  AgreementChangeRequestStatus,
  AgreementChangeType,
  AgreementPartyRole,
  NotificationType,
  Prisma,
  ProjectAgreementStatus,
  ProjectStatus,
  ProposalStatus,
  Role,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CommissionResolutionService } from '../commercial/commission-resolution.service.js';
import {
  ACTIVE_AGREEMENT_STATUSES,
  AGREEMENT_CURRENCY,
  DEFAULT_CANCELLATION_TERMS,
  DEFAULT_DISPUTE_TERMS,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_REVISION_COUNT,
} from './agreements.constants.js';
import { isMarketplacePaymentProtectionActive } from '../payments/payment-protection.policy.js';
import type { CreateAgreementChangeRequestDto } from './dto/agreements.dto.js';

type Tx = Prisma.TransactionClient;

export type AcceptanceMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly commission: CommissionResolutionService,
  ) {}

  async createFromProposal(clientId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        project: true,
        freelancer: {
          include: { profile: { select: { firstName: true, lastName: true, username: true } } },
        },
      },
    });

    if (!proposal) throw new NotFoundException('العرض غير موجود');
    if (proposal.project.clientId !== clientId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا العرض');
    }
    if (proposal.status !== ProposalStatus.PENDING) {
      throw new ConflictException('لا يمكن إنشاء اتفاق إلا لعرض معلّق');
    }
    if (
      proposal.project.status !== ProjectStatus.OPEN ||
      proposal.project.acceptedProposalId !== null
    ) {
      throw new ConflictException('المشروع لم يعد يقبل اختيار عروض');
    }

    const existingForProposal = await this.prisma.projectAgreement.findUnique({
      where: { proposalId },
    });
    if (existingForProposal) {
      throw new ConflictException({
        message: 'يوجد اتفاق بالفعل لهذا العرض',
        code: 'AGREEMENT_ALREADY_EXISTS',
        agreementId: existingForProposal.id,
      });
    }

    const blocking = await this.prisma.projectAgreement.findFirst({
      where: {
        projectId: proposal.projectId,
        status: { in: [...ACTIVE_AGREEMENT_STATUSES] },
      },
      select: { id: true, status: true },
    });
    if (blocking) {
      throw new ConflictException({
        message: 'يوجد اتفاق نشط لهذا المشروع بالفعل',
        code: 'PROJECT_HAS_ACTIVE_AGREEMENT',
        agreementId: blocking.id,
      });
    }

    const amount = Number(proposal.proposedPrice);
    const resolved = await this.commission.resolveForProject(
      proposal.projectId,
      amount,
    );

    const deliveryDate = new Date();
    deliveryDate.setUTCDate(deliveryDate.getUTCDate() + proposal.estimatedDurationDays);

    const title = proposal.project.title;
    const scope = proposal.project.description;
    const deliverables = proposal.coverLetter.trim();
    const revisionCount = DEFAULT_REVISION_COUNT;

    const agreement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectAgreement.create({
        data: {
          projectId: proposal.projectId,
          proposalId: proposal.id,
          clientId,
          freelancerId: proposal.freelancerId,
          status: ProjectAgreementStatus.PENDING_APPROVAL,
        },
      });

      const version = await this.createVersionInTx(tx, {
        agreementId: created.id,
        versionNumber: 1,
        title,
        scope,
        deliverables,
        grossAmount: amount,
        platformFee: resolved.platformFee,
        freelancerNet: resolved.freelancerPayout,
        durationDays: proposal.estimatedDurationDays,
        deliveryDate,
        revisionCount,
        createdByUserId: clientId,
        snapshotExtras: {
          proposalId: proposal.id,
          projectId: proposal.projectId,
          commissionPercent: resolved.commissionPercent,
          commissionSource: resolved.source,
          platformCommissionPolicyId: resolved.platformCommissionPolicyId,
          categoryCommissionOverrideId: resolved.categoryCommissionOverrideId,
          projectCommissionOverrideId: resolved.projectCommissionOverrideId,
        },
      });

      await tx.projectAgreement.update({
        where: { id: created.id },
        data: { currentVersionId: version.id },
      });

      await this.writeAudit(tx, created.id, clientId, AgreementAuditAction.AGREEMENT_CREATED, {
        versionId: version.id,
        metadata: { proposalId, versionNumber: 1 },
      });
      await this.writeAudit(tx, created.id, clientId, AgreementAuditAction.VERSION_CREATED, {
        versionId: version.id,
        metadata: { versionNumber: 1 },
      });

      return created.id;
    });

    await this.notifications.create(
      proposal.freelancerId,
      NotificationType.AGREEMENT_CREATED,
      'تم إنشاء اتفاق مشروع',
      `اختارك العميل لمشروع "${proposal.project.title}". راجع اتفاق المشروع ووافق عليه.`,
      `/dashboard/agreements/${agreement}`,
    );
    await this.notifications.create(
      proposal.freelancerId,
      NotificationType.AGREEMENT_APPROVAL_REQUIRED,
      'مطلوب موافقتك على اتفاق المشروع',
      `يرجى مراجعة تفاصيل الاتفاق والموافقة أو طلب تعديل.`,
      `/dashboard/agreements/${agreement}`,
    );
    await this.notifications.create(
      clientId,
      NotificationType.AGREEMENT_APPROVAL_REQUIRED,
      'راجع اتفاق المشروع',
      `تم إنشاء اتفاق المشروع. راجع التفاصيل ووافق للمتابعة.`,
      `/dashboard/agreements/${agreement}`,
    );

    return this.getForParticipant(agreement, clientId);
  }

  async getForParticipant(agreementId: string, userId: string) {
    const agreement = await this.loadAgreementDetail(agreementId);
    this.assertParticipant(agreement, userId);
    return this.formatAgreement(agreement, userId);
  }

  async getByProject(projectId: string, userId: string) {
    const agreement = await this.prisma.projectAgreement.findFirst({
      where: {
        projectId,
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!agreement) throw new NotFoundException('لا يوجد اتفاق لهذا المشروع');
    return this.getForParticipant(agreement.id, userId);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.projectAgreement.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      include: {
        project: { select: { id: true, title: true, slug: true, status: true } },
        currentVersion: true,
        proposal: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      projectId: row.projectId,
      proposalId: row.proposalId,
      proposalStatus: row.proposal.status,
      clientId: row.clientId,
      freelancerId: row.freelancerId,
      role: row.clientId === userId ? 'CLIENT' : 'FREELANCER',
      approvedAt: row.approvedAt,
      fundedAt: row.fundedAt,
      startedAt: row.startedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      project: row.project,
      currentVersion: row.currentVersion
        ? {
            id: row.currentVersion.id,
            versionNumber: row.currentVersion.versionNumber,
            title: row.currentVersion.title,
            grossAmount: Number(row.currentVersion.grossAmount),
            platformFee: Number(row.currentVersion.platformFee),
            freelancerNet: Number(row.currentVersion.freelancerNet),
            currency: row.currentVersion.currency,
            durationDays: row.currentVersion.durationDays,
          }
        : null,
    }));
  }

  async accept(agreementId: string, userId: string, meta: AcceptanceMeta = {}) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { id: agreementId },
      include: {
        currentVersion: { include: { acceptances: true } },
        project: { select: { title: true } },
      },
    });
    if (!agreement) throw new NotFoundException('الاتفاق غير موجود');
    this.assertParticipant(agreement, userId);

    if (agreement.status !== ProjectAgreementStatus.PENDING_APPROVAL) {
      throw new ConflictException('الاتفاق ليس بانتظار الموافقة');
    }
    if (!agreement.currentVersionId || !agreement.currentVersion) {
      throw new ConflictException('لا توجد نسخة حالية للاتفاق');
    }

    const role =
      agreement.clientId === userId
        ? AgreementPartyRole.CLIENT
        : AgreementPartyRole.FREELANCER;

    const existing = agreement.currentVersion.acceptances.find(
      (a) => a.userId === userId,
    );
    if (existing) {
      return this.getForParticipant(agreementId, userId);
    }

    const ipHash = meta.ip ? hashIp(meta.ip) : null;
    const userAgent = meta.userAgent?.slice(0, 500) ?? null;

    let becameApproved = false;

    await this.prisma.$transaction(async (tx) => {
      await tx.agreementAcceptance.create({
        data: {
          agreementVersionId: agreement.currentVersionId!,
          userId,
          role,
          userAgent,
          ipHash,
        },
      });

      await this.writeAudit(
        tx,
        agreementId,
        userId,
        role === AgreementPartyRole.CLIENT
          ? AgreementAuditAction.CLIENT_ACCEPTED
          : AgreementAuditAction.FREELANCER_ACCEPTED,
        { versionId: agreement.currentVersionId! },
      );

      const acceptances = await tx.agreementAcceptance.findMany({
        where: { agreementVersionId: agreement.currentVersionId! },
      });
      const hasClient = acceptances.some((a) => a.role === AgreementPartyRole.CLIENT);
      const hasFreelancer = acceptances.some(
        (a) => a.role === AgreementPartyRole.FREELANCER,
      );

      if (hasClient && hasFreelancer) {
        becameApproved = true;
        await tx.projectAgreement.update({
          where: { id: agreementId },
          data: {
            status: ProjectAgreementStatus.APPROVED,
            approvedAt: new Date(),
          },
        });
        await this.writeAudit(
          tx,
          agreementId,
          userId,
          AgreementAuditAction.AGREEMENT_APPROVED,
          { versionId: agreement.currentVersionId! },
        );
      }
    });

    if (role === AgreementPartyRole.CLIENT) {
      await this.notifications.create(
        agreement.freelancerId,
        NotificationType.AGREEMENT_ACCEPTED_BY_CLIENT,
        'وافق العميل على اتفاق المشروع',
        `وافق العميل على الاتفاق لمشروع "${agreement.project.title}".`,
        `/dashboard/agreements/${agreementId}`,
      );
    } else {
      await this.notifications.create(
        agreement.clientId,
        NotificationType.AGREEMENT_ACCEPTED_BY_FREELANCER,
        'وافق المستقل على اتفاق المشروع',
        `وافق المستقل على الاتفاق لمشروع "${agreement.project.title}".`,
        `/dashboard/agreements/${agreementId}`,
      );
    }

    if (becameApproved) {
      await this.notifications.create(
        agreement.clientId,
        NotificationType.AGREEMENT_APPROVED,
        'تم اعتماد اتفاق المشروع',
        `وافق الطرفان على الاتفاق. يمكنك تأكيد الاتفاق وبدء التنفيذ.`,
        `/dashboard/agreements/${agreementId}`,
      );
      await this.notifications.create(
        agreement.freelancerId,
        NotificationType.AGREEMENT_APPROVED,
        'تم اعتماد اتفاق المشروع',
        `وافق الطرفان على الاتفاق. بانتظار تأكيد العميل لبدء التنفيذ.`,
        `/dashboard/agreements/${agreementId}`,
      );
    }

    return this.getForParticipant(agreementId, userId);
  }

  async requestChange(
    agreementId: string,
    userId: string,
    dto: CreateAgreementChangeRequestDto,
  ) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { id: agreementId },
      include: {
        currentVersion: true,
        project: { select: { title: true } },
      },
    });
    if (!agreement) throw new NotFoundException('الاتفاق غير موجود');
    this.assertParticipant(agreement, userId);

    if (
      agreement.status !== ProjectAgreementStatus.PENDING_APPROVAL &&
      agreement.status !== ProjectAgreementStatus.APPROVED
    ) {
      throw new ConflictException('لا يمكن طلب تعديل في هذه الحالة');
    }
    if (!agreement.currentVersion) {
      throw new ConflictException('لا توجد نسخة حالية');
    }

    const current = agreement.currentVersion;
    const nextGross =
      dto.proposedGrossAmount != null
        ? Number(dto.proposedGrossAmount)
        : Number(current.grossAmount);
    const nextDuration =
      dto.proposedDurationDays != null
        ? dto.proposedDurationDays
        : current.durationDays;
    const nextRevisions =
      dto.proposedRevisionCount != null
        ? dto.proposedRevisionCount
        : current.revisionCount;
    const nextTitle = dto.proposedTitle?.trim() || current.title;
    const nextScope = dto.proposedScope?.trim() || current.scope;
    const nextDeliverables =
      dto.proposedDeliverables?.trim() || current.deliverables;
    const nextDeliveryDate = dto.proposedDeliveryDate
      ? new Date(dto.proposedDeliveryDate)
      : (() => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() + nextDuration);
          return d;
        })();

    if (
      dto.changeType === AgreementChangeType.PRICE &&
      dto.proposedGrossAmount == null
    ) {
      throw new ConflictException('يجب تحديد المبلغ المقترح');
    }

    const resolved = await this.commission.resolveForProject(
      agreement.projectId,
      nextGross,
    );

    const otherPartyId =
      agreement.clientId === userId ? agreement.freelancerId : agreement.clientId;

    const resultId = await this.prisma.$transaction(async (tx) => {
      const change = await tx.agreementChangeRequest.create({
        data: {
          agreementId,
          requestedById: userId,
          changeType: dto.changeType,
          reason: dto.reason.trim(),
          proposedTitle: dto.proposedTitle?.trim(),
          proposedScope: dto.proposedScope?.trim(),
          proposedDeliverables: dto.proposedDeliverables?.trim(),
          proposedGrossAmount:
            dto.proposedGrossAmount != null
              ? new Prisma.Decimal(dto.proposedGrossAmount)
              : null,
          proposedDurationDays: dto.proposedDurationDays ?? null,
          proposedRevisionCount: dto.proposedRevisionCount ?? null,
          proposedDeliveryDate: dto.proposedDeliveryDate
            ? new Date(dto.proposedDeliveryDate)
            : null,
          status: AgreementChangeRequestStatus.PENDING,
        },
      });

      const version = await this.createVersionInTx(tx, {
        agreementId,
        versionNumber: current.versionNumber + 1,
        title: nextTitle,
        scope: nextScope,
        deliverables: nextDeliverables,
        grossAmount: nextGross,
        platformFee: resolved.platformFee,
        freelancerNet: resolved.freelancerPayout,
        durationDays: nextDuration,
        deliveryDate: nextDeliveryDate,
        revisionCount: nextRevisions,
        createdByUserId: userId,
        snapshotExtras: {
          changeRequestId: change.id,
          changeType: dto.changeType,
          previousVersionId: current.id,
          commissionPercent: resolved.commissionPercent,
          commissionSource: resolved.source,
        },
      });

      await tx.agreementChangeRequest.update({
        where: { id: change.id },
        data: {
          status: AgreementChangeRequestStatus.APPLIED,
          appliedAt: new Date(),
          resultingVersionId: version.id,
        },
      });

      await tx.projectAgreement.update({
        where: { id: agreementId },
        data: {
          currentVersionId: version.id,
          status: ProjectAgreementStatus.PENDING_APPROVAL,
          approvedAt: null,
        },
      });

      await this.writeAudit(tx, agreementId, userId, AgreementAuditAction.CHANGE_REQUESTED, {
        versionId: version.id,
        metadata: { changeType: dto.changeType, changeRequestId: change.id },
      });
      await this.writeAudit(tx, agreementId, userId, AgreementAuditAction.VERSION_CREATED, {
        versionId: version.id,
        metadata: { versionNumber: version.versionNumber },
      });

      return { changeId: change.id, versionId: version.id };
    });

    await this.notifications.create(
      otherPartyId,
      NotificationType.AGREEMENT_CHANGE_REQUESTED,
      'طلب تعديل على اتفاق المشروع',
      `تم اقتراح تعديل على اتفاق مشروع "${agreement.project.title}". راجع النسخة الجديدة.`,
      `/dashboard/agreements/${agreementId}`,
    );
    await this.notifications.create(
      otherPartyId,
      NotificationType.AGREEMENT_APPROVAL_REQUIRED,
      'مطلوب موافقة على نسخة محدّثة',
      `نسخة جديدة من اتفاق المشروع بانتظار موافقتك.`,
      `/dashboard/agreements/${agreementId}`,
    );

    void resultId;
    return this.getForParticipant(agreementId, userId);
  }

  async getVersions(agreementId: string, userId: string) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) throw new NotFoundException('الاتفاق غير موجود');
    this.assertParticipantOrAdmin(agreement, userId, false);

    const versions = await this.prisma.agreementVersion.findMany({
      where: { agreementId },
      include: {
        acceptances: {
          select: {
            id: true,
            userId: true,
            role: true,
            acceptedAt: true,
          },
        },
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { versionNumber: 'asc' },
    });

    return versions.map((v) => this.formatVersion(v));
  }

  async getHistory(agreementId: string, userId: string) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { id: agreementId },
    });
    if (!agreement) throw new NotFoundException('الاتفاق غير موجود');
    this.assertParticipant(agreement, userId);

    const logs = await this.prisma.agreementAuditLog.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, username: true } },
          },
        },
      },
    });

    return {
      timeline: logs.map((log) => ({
        id: log.id,
        action: log.action,
        versionId: log.versionId,
        metadata: log.metadata,
        createdAt: log.createdAt,
        actor: log.actor
          ? {
              id: log.actor.id,
              displayName: log.actor.profile
                ? `${log.actor.profile.firstName} ${log.actor.profile.lastName}`
                : null,
              username: log.actor.profile?.username ?? null,
            }
          : null,
      })),
    };
  }

  async assertApprovedForFunding(proposalId: string) {
    return this.assertApprovedForStart(proposalId);
  }

  /** Agreement must be approved (or payment-pending legacy) before starting work. */
  async assertApprovedForStart(proposalId: string) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { proposalId },
    });
    if (!agreement) {
      throw new PreconditionFailedException({
        message: 'يجب إنشاء واعتماد اتفاق المشروع قبل بدء التنفيذ',
        code: 'AGREEMENT_REQUIRED',
      });
    }
    if (
      agreement.status !== ProjectAgreementStatus.APPROVED &&
      agreement.status !== ProjectAgreementStatus.PAYMENT_PENDING
    ) {
      throw new PreconditionFailedException({
        message: 'يجب موافقة الطرفين على اتفاق المشروع قبل بدء التنفيذ',
        code: 'AGREEMENT_NOT_APPROVED',
        status: agreement.status,
      });
    }
    return agreement;
  }

  async markPaymentPending(proposalId: string, actorId: string, tx?: Tx) {
    const client = tx ?? this.prisma;
    const agreement = await client.projectAgreement.findUnique({
      where: { proposalId },
    });
    if (!agreement) return null;
    if (
      agreement.status !== ProjectAgreementStatus.APPROVED &&
      agreement.status !== ProjectAgreementStatus.PAYMENT_PENDING
    ) {
      return agreement;
    }
    if (agreement.status === ProjectAgreementStatus.PAYMENT_PENDING) {
      return agreement;
    }
    const updated = await client.projectAgreement.update({
      where: { id: agreement.id },
      data: { status: ProjectAgreementStatus.PAYMENT_PENDING },
    });
    await this.writeAudit(
      client,
      agreement.id,
      actorId,
      AgreementAuditAction.PAYMENT_PENDING,
      {},
    );
    return updated;
  }

  async markFunded(proposalId: string, actorId: string, tx: Tx) {
    const agreement = await tx.projectAgreement.findUnique({
      where: { proposalId },
    });
    if (!agreement) return null;
    if (
      agreement.status === ProjectAgreementStatus.FUNDED ||
      agreement.status === ProjectAgreementStatus.ACTIVE ||
      agreement.status === ProjectAgreementStatus.COMPLETED
    ) {
      return agreement;
    }

    const updated = await tx.projectAgreement.update({
      where: { id: agreement.id },
      data: {
        status: ProjectAgreementStatus.FUNDED,
        fundedAt: agreement.fundedAt ?? new Date(),
      },
    });
    await this.writeAudit(tx, agreement.id, actorId, AgreementAuditAction.FUNDED, {});
    return updated;
  }

  async markActive(proposalId: string, actorId: string, tx: Tx) {
    const agreement = await tx.projectAgreement.findUnique({
      where: { proposalId },
    });
    if (!agreement) return null;
    if (agreement.status === ProjectAgreementStatus.ACTIVE) {
      return agreement;
    }

    const updated = await tx.projectAgreement.update({
      where: { id: agreement.id },
      data: {
        status: ProjectAgreementStatus.ACTIVE,
        startedAt: agreement.startedAt ?? new Date(),
      },
    });
    await this.writeAudit(tx, agreement.id, actorId, AgreementAuditAction.ACTIVATED, {});
    return updated;
  }

  async markFundedAndActive(
    proposalId: string,
    actorId: string,
    tx: Tx,
  ) {
    await this.markFunded(proposalId, actorId, tx);
    return this.markActive(proposalId, actorId, tx);
  }

  async markCompleted(proposalId: string, actorId: string, tx: Tx) {
    const agreement = await tx.projectAgreement.findUnique({
      where: { proposalId },
    });
    if (!agreement) return null;
    if (agreement.status === ProjectAgreementStatus.COMPLETED) {
      return agreement;
    }

    const updated = await tx.projectAgreement.update({
      where: { id: agreement.id },
      data: {
        status: ProjectAgreementStatus.COMPLETED,
        completedAt: agreement.completedAt ?? new Date(),
      },
    });
    await this.writeAudit(
      tx,
      agreement.id,
      actorId,
      AgreementAuditAction.COMPLETED,
      {},
    );
    return updated;
  }

  async notifyActivated(proposalId: string) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { proposalId },
      include: { project: { select: { title: true } } },
    });
    if (!agreement) return;
    await this.notifications.create(
      agreement.freelancerId,
      NotificationType.PROPOSAL_ACCEPTED,
      'بدأ تنفيذ المشروع',
      `تم تأكيد الاتفاق وبدء تنفيذ مشروع "${agreement.project.title}". الدفع يتم مباشرة بين الطرفين خارج المنصة في هذه المرحلة.`,
      `/dashboard/agreements/${agreement.id}`,
    );
    await this.notifications.create(
      agreement.clientId,
      NotificationType.AGREEMENT_APPROVED,
      'بدأ تنفيذ المشروع',
      `تم تأكيد الاتفاق وبدء تنفيذ مشروع "${agreement.project.title}".`,
      `/dashboard/agreements/${agreement.id}`,
    );
  }

  async notifyFunded(proposalId: string) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { proposalId },
      include: { project: { select: { title: true } } },
    });
    if (!agreement) return;
    await this.notifications.create(
      agreement.freelancerId,
      NotificationType.AGREEMENT_FUNDED,
      'تم تمويل اتفاق المشروع',
      `تم تمويل ضمان مشروع "${agreement.project.title}" وبدء التنفيذ.`,
      `/dashboard/agreements/${agreement.id}`,
    );
    await this.notifications.create(
      agreement.clientId,
      NotificationType.AGREEMENT_FUNDED,
      'تم تمويل اتفاق المشروع',
      `تم تمويل الضمان وبدء تنفيذ مشروع "${agreement.project.title}".`,
      `/dashboard/agreements/${agreement.id}`,
    );
  }

  async adminList(query: { page?: number; limit?: number; status?: string; q?: string }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where: Prisma.ProjectAgreementWhereInput = {};
    if (query.status) {
      where.status = query.status as ProjectAgreementStatus;
    }
    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { id: { contains: term, mode: 'insensitive' } },
        { project: { title: { contains: term, mode: 'insensitive' } } },
        { client: { email: { contains: term, mode: 'insensitive' } } },
        { freelancer: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.projectAgreement.count({ where }),
      this.prisma.projectAgreement.findMany({
        where,
        include: {
          project: { select: { id: true, title: true, slug: true, status: true } },
          proposal: { select: { id: true, status: true } },
          currentVersion: true,
          client: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true, username: true } },
            },
          },
          freelancer: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true, username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const escrowByProposal = await this.prisma.escrow.findMany({
      where: { proposalId: { in: rows.map((r) => r.proposalId) } },
      select: { proposalId: true, status: true, amount: true },
    });
    const escrowMap = new Map(escrowByProposal.map((e) => [e.proposalId, e]));

    return {
      page,
      limit,
      total,
      items: rows.map((row) => {
        const escrow = escrowMap.get(row.proposalId);
        return {
          id: row.id,
          status: row.status,
          project: row.project,
          proposalId: row.proposalId,
          proposalStatus: row.proposal.status,
          client: formatUserBrief(row.client),
          freelancer: formatUserBrief(row.freelancer),
          amount: row.currentVersion ? Number(row.currentVersion.grossAmount) : null,
          currency: row.currentVersion?.currency ?? AGREEMENT_CURRENCY,
          versionNumber: row.currentVersion?.versionNumber ?? null,
          escrowStatus: escrow?.status ?? null,
          paymentStatus:
            row.status === ProjectAgreementStatus.FUNDED ||
            row.status === ProjectAgreementStatus.ACTIVE ||
            row.status === ProjectAgreementStatus.COMPLETED
              ? 'FUNDED'
              : row.status === ProjectAgreementStatus.PAYMENT_PENDING
                ? 'PENDING'
                : row.status === ProjectAgreementStatus.APPROVED
                  ? 'AWAITING'
                  : null,
          createdAt: row.createdAt,
          approvedAt: row.approvedAt,
          fundedAt: row.fundedAt,
        };
      }),
    };
  }

  async adminGet(agreementId: string) {
    const agreement = await this.loadAgreementDetail(agreementId);
    const history = await this.prisma.agreementAuditLog.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
    });
    const versions = await this.prisma.agreementVersion.findMany({
      where: { agreementId },
      include: {
        acceptances: true,
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { versionNumber: 'asc' },
    });
    const escrow = await this.prisma.escrow.findUnique({
      where: { proposalId: agreement.proposalId },
      select: { id: true, status: true, amount: true, platformFee: true, freelancerPayout: true },
    });

    return {
      ...this.formatAgreement(agreement, null),
      timeline: history.map((h) => ({
        id: h.id,
        action: h.action,
        versionId: h.versionId,
        metadata: h.metadata,
        createdAt: h.createdAt,
        actorId: h.actorId,
      })),
      versions: versions.map((v) => this.formatVersion(v)),
      escrow,
    };
  }

  private async loadAgreementDetail(agreementId: string) {
    const agreement = await this.prisma.projectAgreement.findUnique({
      where: { id: agreementId },
      include: {
        project: {
          select: { id: true, title: true, slug: true, status: true, description: true },
        },
        proposal: { select: { id: true, status: true, coverLetter: true } },
        currentVersion: {
          include: {
            acceptances: true,
            milestones: { orderBy: { sortOrder: 'asc' } },
          },
        },
        client: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, username: true } },
          },
        },
        freelancer: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true, username: true } },
          },
        },
        changeRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!agreement) throw new NotFoundException('الاتفاق غير موجود');
    return agreement;
  }

  private formatAgreement(
    agreement: Awaited<ReturnType<AgreementsService['loadAgreementDetail']>>,
    viewerId: string | null,
  ) {
    const version = agreement.currentVersion;
    const myAcceptance = viewerId
      ? version?.acceptances.find((a) => a.userId === viewerId) ?? null
      : null;
    const clientAccepted = Boolean(
      version?.acceptances.some((a) => a.role === AgreementPartyRole.CLIENT),
    );
    const freelancerAccepted = Boolean(
      version?.acceptances.some((a) => a.role === AgreementPartyRole.FREELANCER),
    );

    return {
      id: agreement.id,
      status: agreement.status,
      projectId: agreement.projectId,
      proposalId: agreement.proposalId,
      clientId: agreement.clientId,
      freelancerId: agreement.freelancerId,
      approvedAt: agreement.approvedAt,
      fundedAt: agreement.fundedAt,
      startedAt: agreement.startedAt,
      completedAt: agreement.completedAt,
      cancelledAt: agreement.cancelledAt,
      createdAt: agreement.createdAt,
      updatedAt: agreement.updatedAt,
      project: agreement.project,
      proposal: agreement.proposal,
      client: formatUserBrief(agreement.client),
      freelancer: formatUserBrief(agreement.freelancer),
      viewerRole:
        viewerId == null
          ? null
          : agreement.clientId === viewerId
            ? 'CLIENT'
            : agreement.freelancerId === viewerId
              ? 'FREELANCER'
              : null,
      clientAccepted,
      freelancerAccepted,
      iAccepted: Boolean(myAcceptance),
      canAccept:
        agreement.status === ProjectAgreementStatus.PENDING_APPROVAL &&
        Boolean(viewerId) &&
        !myAcceptance &&
        (agreement.clientId === viewerId || agreement.freelancerId === viewerId),
      canRequestChange:
        Boolean(viewerId) &&
        (agreement.status === ProjectAgreementStatus.PENDING_APPROVAL ||
          agreement.status === ProjectAgreementStatus.APPROVED) &&
        (agreement.clientId === viewerId || agreement.freelancerId === viewerId),
      /** Escrow funding CTA — only when payment protection is truly active. */
      canFund:
        isMarketplacePaymentProtectionActive() &&
        agreement.clientId === viewerId &&
        (agreement.status === ProjectAgreementStatus.APPROVED ||
          agreement.status === ProjectAgreementStatus.PAYMENT_PENDING),
      /**
       * Direct-payment launch: client confirms agreement and starts work
       * without platform funding.
       */
      canConfirmStart:
        !isMarketplacePaymentProtectionActive() &&
        agreement.clientId === viewerId &&
        (agreement.status === ProjectAgreementStatus.APPROVED ||
          agreement.status === ProjectAgreementStatus.PAYMENT_PENDING),
      paymentProtectionActive: isMarketplacePaymentProtectionActive(),
      directPaymentMode: !isMarketplacePaymentProtectionActive(),
      currentVersion: version ? this.formatVersion(version) : null,
      recentChangeRequests: agreement.changeRequests.map((c) => ({
        id: c.id,
        changeType: c.changeType,
        reason: c.reason,
        status: c.status,
        createdAt: c.createdAt,
        appliedAt: c.appliedAt,
        resultingVersionId: c.resultingVersionId,
      })),
    };
  }

  private formatVersion(
    version: {
      id: string;
      versionNumber: number;
      title: string;
      scope: string;
      deliverables: string;
      currency: string;
      grossAmount: Prisma.Decimal | number;
      platformFee: Prisma.Decimal | number;
      freelancerNet: Prisma.Decimal | number;
      durationDays: number;
      deliveryDate: Date | null;
      revisionCount: number;
      paymentTerms: string;
      cancellationTerms: string;
      disputeTerms: string;
      snapshotJson: Prisma.JsonValue;
      createdByUserId: string;
      createdAt: Date;
      acceptances?: Array<{
        id: string;
        userId: string;
        role: AgreementPartyRole;
        acceptedAt: Date;
      }>;
      milestones?: Array<{
        id: string;
        title: string;
        description: string | null;
        amount: Prisma.Decimal | number;
        sortOrder: number;
        dueDate: Date | null;
        status: string;
      }>;
    },
  ) {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      title: version.title,
      scope: version.scope,
      deliverables: version.deliverables,
      currency: version.currency,
      grossAmount: Number(version.grossAmount),
      platformFee: Number(version.platformFee),
      freelancerNet: Number(version.freelancerNet),
      durationDays: version.durationDays,
      deliveryDate: version.deliveryDate,
      revisionCount: version.revisionCount,
      paymentTerms: version.paymentTerms,
      cancellationTerms: version.cancellationTerms,
      disputeTerms: version.disputeTerms,
      snapshotJson: version.snapshotJson,
      createdByUserId: version.createdByUserId,
      createdAt: version.createdAt,
      acceptances: (version.acceptances ?? []).map((a) => ({
        id: a.id,
        userId: a.userId,
        role: a.role,
        acceptedAt: a.acceptedAt,
      })),
      milestones: (version.milestones ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        amount: Number(m.amount),
        sortOrder: m.sortOrder,
        dueDate: m.dueDate,
        status: m.status,
      })),
    };
  }

  private async createVersionInTx(
    tx: Tx,
    input: {
      agreementId: string;
      versionNumber: number;
      title: string;
      scope: string;
      deliverables: string;
      grossAmount: number;
      platformFee: number;
      freelancerNet: number;
      durationDays: number;
      deliveryDate: Date | null;
      revisionCount: number;
      createdByUserId: string;
      snapshotExtras?: Record<string, unknown>;
    },
  ) {
    const snapshotJson = {
      title: input.title,
      scope: input.scope,
      deliverables: input.deliverables,
      currency: AGREEMENT_CURRENCY,
      grossAmount: input.grossAmount,
      platformFee: input.platformFee,
      freelancerNet: input.freelancerNet,
      durationDays: input.durationDays,
      deliveryDate: input.deliveryDate?.toISOString() ?? null,
      revisionCount: input.revisionCount,
      paymentTerms: DEFAULT_PAYMENT_TERMS,
      cancellationTerms: DEFAULT_CANCELLATION_TERMS,
      disputeTerms: DEFAULT_DISPUTE_TERMS,
      ...input.snapshotExtras,
    };

    const version = await tx.agreementVersion.create({
      data: {
        agreementId: input.agreementId,
        versionNumber: input.versionNumber,
        title: input.title,
        scope: input.scope,
        deliverables: input.deliverables,
        currency: AGREEMENT_CURRENCY,
        grossAmount: new Prisma.Decimal(input.grossAmount),
        platformFee: new Prisma.Decimal(input.platformFee),
        freelancerNet: new Prisma.Decimal(input.freelancerNet),
        durationDays: input.durationDays,
        deliveryDate: input.deliveryDate,
        revisionCount: input.revisionCount,
        paymentTerms: DEFAULT_PAYMENT_TERMS,
        cancellationTerms: DEFAULT_CANCELLATION_TERMS,
        disputeTerms: DEFAULT_DISPUTE_TERMS,
        snapshotJson,
        createdByUserId: input.createdByUserId,
      },
    });

    await tx.agreementMilestone.create({
      data: {
        agreementVersionId: version.id,
        title: 'التسليم الكامل',
        description: 'مرحلة واحدة تغطي كامل نطاق العمل المتفق عليه',
        amount: new Prisma.Decimal(input.grossAmount),
        sortOrder: 0,
        dueDate: input.deliveryDate,
      },
    });

    return version;
  }

  private assertParticipant(
    agreement: { clientId: string; freelancerId: string },
    userId: string,
  ) {
    if (agreement.clientId !== userId && agreement.freelancerId !== userId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا الاتفاق');
    }
  }

  private assertParticipantOrAdmin(
    agreement: { clientId: string; freelancerId: string },
    userId: string,
    _isAdmin: boolean,
  ) {
    this.assertParticipant(agreement, userId);
  }

  private async writeAudit(
    client: Tx | PrismaService,
    agreementId: string,
    actorId: string | null,
    action: AgreementAuditAction,
    opts: { versionId?: string; metadata?: Record<string, unknown> },
  ) {
    await client.agreementAuditLog.create({
      data: {
        agreementId,
        actorId,
        action,
        versionId: opts.versionId,
        metadata: (opts.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

function hashIp(ip: string) {
  return createHash('sha256').update(ip).digest('hex');
}

function formatUserBrief(user: {
  id: string;
  email?: string;
  profile: { firstName: string; lastName: string; username: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.profile?.username ?? null,
    displayName: user.profile
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : null,
  };
}

/** Used by Roles decorator elsewhere — keep Role import warm for tests */
export const AGREEMENT_ROLES = [Role.CLIENT, Role.FREELANCER] as const;
