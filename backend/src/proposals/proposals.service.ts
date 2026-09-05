import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ProjectStatus,
  ProposalStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PortfolioService } from '../portfolio/portfolio.service.js';
import type { CreateProposalDto, MyProposalsQueryDto } from './dto/create-proposal.dto.js';
import {
  ProposalStateService,
  validateProposalInput,
} from './proposal-validation.util.js';
import { acceptProposalInTransaction } from './proposal-acceptance.util.js';
import { EscrowService } from '../escrow/escrow.service.js';
import { NuqatiService } from '../nuqati/nuqati.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import {
  PROPOSAL_BOOST_BOARD_LIMIT,
  PROPOSAL_BOOST_MAX,
  PROPOSAL_BOOST_MIN,
} from './proposals.constants.js';
import { NUQATI_CONFIG } from '../nuqati/nuqati.config.js';

const freelancerPublicSelect = {
  profile: {
    select: {
      firstName: true,
      lastName: true,
      username: true,
      profilePhoto: true,
      freelancerProfile: {
        select: {
          professionalTitle: true,
          completedProjects: true,
          averageRating: true,
          skills: {
            include: { skill: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

function initialsFromName(firstName: string, lastName: string): string {
  const a = firstName.charAt(0);
  const b = lastName.charAt(0);
  const initials = `${a}${b}`.trim();
  return initials || '?';
}

function formatRelativeAr(date: Date, now = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  if (months < 12) return `منذ ${months} شهر`;
  const years = Math.floor(months / 12);
  return `منذ ${years} سنة`;
}

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly portfolio: PortfolioService,
    @Inject(forwardRef(() => EscrowService))
    private readonly escrowService: EscrowService,
    private readonly nuqatiService: NuqatiService,
    private readonly platformPolicy: PlatformPolicyService,
  ) {}

  async submit(freelancerId: string, projectId: string, dto: CreateProposalDto) {
    await this.platformPolicy.assertProposalsAllowed(Role.FREELANCER);
    await this.assertFreelancer(freelancerId);
    validateProposalInput(dto);

    const boostPoints = this.normalizeBoostPoints(dto.boostPoints);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { client: { select: { id: true } } },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new ForbiddenException('لا يمكن التقديم على هذا المشروع');
    }

    if (project.clientId === freelancerId) {
      throw new ForbiddenException('لا يمكنك التقديم على مشروعك الخاص');
    }

    const existing = await this.prisma.proposal.findUnique({
      where: {
        projectId_freelancerId: { projectId, freelancerId },
      },
    });

    if (existing) {
      throw new ConflictException('لقد قدمت عرضاً على هذا المشروع مسبقاً');
    }

    const proposal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          projectId,
          freelancerId,
          coverLetter: dto.coverLetter.trim(),
          proposedPrice: dto.proposedPrice,
          estimatedDurationDays: dto.estimatedDurationDays,
          boostPoints,
          status: ProposalStatus.PENDING,
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              budgetMin: true,
              budgetMax: true,
              currency: true,
              completionRequestedAt: true,
              completedAt: true,
            },
          },
        },
      });

      await this.nuqatiService.chargeProposalSubmitWithBoost(
        freelancerId,
        created.id,
        boostPoints,
        tx,
      );
      await this.nuqatiService.onProposalSubmitted(freelancerId, created.id, tx);

      return created;
    });

    const freelancerProfile = await this.prisma.profile.findUnique({
      where: { userId: freelancerId },
      select: { firstName: true, lastName: true },
    });
    const freelancerName = freelancerProfile
      ? `${freelancerProfile.firstName} ${freelancerProfile.lastName}`.trim()
      : undefined;

    await this.notifications.notify({
      userId: project.clientId,
      type: NotificationType.NEW_PROPOSAL,
      title: freelancerName ? 'وصل عرض جديد على مشروعك' : undefined,
      message:
        freelancerName != null
          ? `${freelancerName} قدم عرضاً بقيمة ${dto.proposedPrice} د.ل.`
          : undefined,
      params: {
        projectTitle: project.title,
        freelancerName,
        amount: String(dto.proposedPrice),
      },
      targetUrl: `/dashboard/projects/${projectId}/proposals`,
      entityType: 'proposal',
      entityId: proposal.id,
      dedupeKey: `proposal-received:${proposal.id}`,
    });

    await this.notifications.notifyPointsEvent({
      userId: freelancerId,
      type: NotificationType.POINTS_SPENT,
      points: NUQATI_CONFIG.proposalSubmitCost + boostPoints,
      reason: 'تقديم عرض',
    });

    return this.formatFreelancerProposal(proposal);
  }

  async listMine(freelancerId: string, query: MyProposalsQueryDto) {
    await this.assertFreelancer(freelancerId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProposalWhereInput = { freelancerId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              budgetMin: true,
              budgetMax: true,
              currency: true,
              completionRequestedAt: true,
              completedAt: true,
            },
          },
          conversations: { select: { id: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatFreelancerProposal(p)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listForProject(clientId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    if (project.clientId !== clientId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا المشروع');
    }

    const proposals = await this.prisma.proposal.findMany({
      where: { projectId },
      include: {
        freelancer: { include: freelancerPublicSelect },
      },
      orderBy: [{ boostPoints: 'desc' }, { createdAt: 'desc' }],
    });

    const summaries = await this.portfolio.getSummaryForFreelancerUserIds(
      proposals.map((proposal) => proposal.freelancerId),
    );

    return proposals.map((proposal) =>
      this.formatClientProposal(
        proposal,
        summaries.get(proposal.freelancerId),
      ),
    );
  }

  async getMyProposalForProject(freelancerId: string, projectId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        projectId_freelancerId: { projectId, freelancerId },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            completionRequestedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('لم تقدم عرضاً على هذا المشروع');
    }

    return this.formatFreelancerProposal(proposal);
  }

  /**
   * Anonymized leaderboard of pending boosted proposals for the boost UI.
   */
  async getBoostBoard(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    const proposals = await this.prisma.proposal.findMany({
      where: {
        projectId,
        status: ProposalStatus.PENDING,
        boostPoints: { gt: 0 },
      },
      include: {
        freelancer: {
          select: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ boostPoints: 'desc' }, { createdAt: 'desc' }],
      take: PROPOSAL_BOOST_BOARD_LIMIT,
    });

    return {
      projectId,
      proposalSubmitCost: NUQATI_CONFIG.proposalSubmitCost,
      maxBoostPoints: PROPOSAL_BOOST_MAX,
      items: proposals.map((proposal, index) => {
        const first = proposal.freelancer.profile?.firstName?.trim() ?? '';
        const last = proposal.freelancer.profile?.lastName?.trim() ?? '';
        return {
          rank: index + 1,
          boostPoints: proposal.boostPoints,
          createdAtRelative: formatRelativeAr(proposal.createdAt),
          initials: initialsFromName(first, last),
        };
      }),
    };
  }

  async accept(clientId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        project: true,
        freelancer: {
          include: { profile: { select: { firstName: true } } },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('العرض غير موجود');
    }

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

    await this.escrowService.assertFundedForAccept(proposalId);

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

    const result = await this.prisma.$transaction((tx) =>
      acceptProposalInTransaction(tx, proposalId, proposal.projectId),
    );

    await this.notifications.create(
      proposal.freelancerId,
      NotificationType.PROPOSAL_ACCEPTED,
      'تم قبول عرضك',
      `تم قبول عرضك على مشروع "${proposal.project.title}"`,
      `/dashboard/proposals`,
    );

    await this.notifications.notify({
      userId: clientId,
      type: NotificationType.PROJECT_STARTED,
      params: { projectTitle: proposal.project.title },
      targetUrl: `/dashboard/projects/${proposal.projectId}/edit`,
      entityType: 'project',
      entityId: proposal.projectId,
      dedupeKey: `project-started:${proposal.projectId}`,
    });

    if (result.rejectedCount > 0) {
      for (const freelancerId of pendingFreelancerIds) {
        await this.notifications.create(
          freelancerId,
          NotificationType.PROPOSAL_REJECTED,
          'تم رفض عرضك',
          `تم اختيار مستقل آخر لمشروع "${proposal.project.title}"`,
          `/dashboard/proposals`,
        );
      }
    }

    return this.getClientProposalById(clientId, proposalId);
  }

  async acceptInTransaction(
    tx: Prisma.TransactionClient,
    proposalId: string,
    projectId: string,
    _pendingFreelancerIds: string[],
  ) {
    return acceptProposalInTransaction(tx, proposalId, projectId);
  }

  async getClientProposalById(clientId: string, proposalId: string) {
    const proposal = await this.findOwnedProposal(clientId, proposalId);
    return this.formatClientProposal(
      await this.prisma.proposal.findUniqueOrThrow({
        where: { id: proposal.id },
        include: { freelancer: { include: freelancerPublicSelect } },
      }),
    );
  }

  async reject(clientId: string, proposalId: string) {
    const proposal = await this.findOwnedProposal(clientId, proposalId);
    ProposalStateService.assertCanReject(proposal.status);

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: ProposalStateService.transitionToRejected(),
      include: {
        freelancer: { include: freelancerPublicSelect },
        project: { select: { title: true } },
      },
    });

    await this.notifications.create(
      updated.freelancerId,
      NotificationType.PROPOSAL_REJECTED,
      'تم رفض عرضك',
      `تم رفض عرضك على مشروع "${updated.project.title}"`,
      `/dashboard/proposals`,
    );

    return this.formatClientProposal(updated);
  }

  async withdraw(freelancerId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('العرض غير موجود');
    }

    if (proposal.freelancerId !== freelancerId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا العرض');
    }

    ProposalStateService.assertCanWithdraw(proposal.status);

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: ProposalStateService.transitionToWithdrawn(),
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            completionRequestedAt: true,
            completedAt: true,
          },
        },
      },
    });

    return this.formatFreelancerProposal(updated);
  }

  private normalizeBoostPoints(value?: number): number {
    if (value == null || Number.isNaN(value)) return 0;
    const n = Math.floor(Number(value));
    if (n < PROPOSAL_BOOST_MIN || n > PROPOSAL_BOOST_MAX) {
      throw new BadRequestException(
        `نقاط التعزيز يجب أن تكون بين ${PROPOSAL_BOOST_MIN} و ${PROPOSAL_BOOST_MAX}`,
      );
    }
    return n;
  }

  private async findOwnedProposal(clientId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { project: true },
    });

    if (!proposal) {
      throw new NotFoundException('العرض غير موجود');
    }

    if (proposal.project.clientId !== clientId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا العرض');
    }

    return proposal;
  }

  private async assertFreelancer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { freelancerProfile: true } } },
    });

    if (!user || user.role !== Role.FREELANCER || user.status !== 'ACTIVE') {
      throw new ForbiddenException('هذه العملية للمستقلين النشطين فقط');
    }

    if (!user.profile?.freelancerProfile) {
      throw new ForbiddenException('يجب إكمال ملف المستقل أولاً');
    }
  }

  private formatFreelancerProposal(
    proposal: Prisma.ProposalGetPayload<{
      include: { project: { select: { id: true; title: true; slug: true; status: true; budgetMin: true; budgetMax: true; currency: true; completionRequestedAt: true; completedAt: true } } };
    }> & {
      conversations?: { id: string }[];
    },
  ) {
    return {
      id: proposal.id,
      coverLetter: proposal.coverLetter,
      proposedPrice: Number(proposal.proposedPrice),
      estimatedDurationDays: proposal.estimatedDurationDays,
      boostPoints: proposal.boostPoints,
      status: proposal.status,
      createdAt: proposal.createdAt,
      conversationId: proposal.conversations?.[0]?.id ?? null,
      project: {
        id: proposal.project.id,
        title: proposal.project.title,
        slug: proposal.project.slug,
        status: proposal.project.status,
        budgetMin: Number(proposal.project.budgetMin),
        budgetMax: Number(proposal.project.budgetMax),
        currency: proposal.project.currency,
        completionRequestedAt: proposal.project.completionRequestedAt,
        completedAt: proposal.project.completedAt,
      },
    };
  }

  private formatClientProposal(
    proposal: Prisma.ProposalGetPayload<{
      include: { freelancer: { include: typeof freelancerPublicSelect } };
    }>,
    portfolioSummary?: { count: number; recentThumbnails: string[] },
  ) {
    const profile = proposal.freelancer.profile;
    const fp = profile?.freelancerProfile;

    return {
      id: proposal.id,
      coverLetter: proposal.coverLetter,
      proposedPrice: Number(proposal.proposedPrice),
      estimatedDurationDays: proposal.estimatedDurationDays,
      boostPoints: proposal.boostPoints,
      status: proposal.status,
      createdAt: proposal.createdAt,
      freelancer: profile
        ? {
            username: profile.username,
            displayName: `${profile.firstName} ${profile.lastName}`,
            profilePhoto: profile.profilePhoto,
            professionalTitle: fp?.professionalTitle ?? null,
            rating: fp?.averageRating ?? null,
            completedProjects: fp?.completedProjects ?? 0,
            skills: fp?.skills.map((s) => ({
              name: s.skill.name,
              slug: s.skill.slug,
            })) ?? [],
            portfolio: {
              count: portfolioSummary?.count ?? 0,
              recentThumbnails: portfolioSummary?.recentThumbnails ?? [],
            },
          }
        : null,
    };
  }
}
