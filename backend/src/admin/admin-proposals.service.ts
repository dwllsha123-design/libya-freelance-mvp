import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminProposalsQueryDto } from './dto/admin.dto.js';

const proposalInclude = {
  project: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
    },
  },
  freelancer: {
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  },
} satisfies Prisma.ProposalInclude;

@Injectable()
export class AdminProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminProposalsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProposalWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    if (query.freelancerId) where.freelancerId = query.freelancerId;

    if (query.q?.trim()) {
      where.project = {
        title: { contains: query.q.trim(), mode: 'insensitive' },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        include: proposalInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return {
      items: items.map((proposal) => this.formatProposal(proposal)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        ...proposalInclude,
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            clientId: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('العرض غير موجود');
    }

    return {
      ...this.formatProposal(proposal),
      coverLetter: proposal.coverLetter,
      project: proposal.project,
    };
  }

  private formatProposal(
    proposal: Prisma.ProposalGetPayload<{ include: typeof proposalInclude }>,
  ) {
    const profile = proposal.freelancer.profile;

    return {
      id: proposal.id,
      status: proposal.status,
      proposedPrice: Number(proposal.proposedPrice),
      estimatedDurationDays: proposal.estimatedDurationDays,
      createdAt: proposal.createdAt,
      project: proposal.project,
      freelancer: profile
        ? {
            id: proposal.freelancerId,
            username: profile.username,
            displayName: `${profile.firstName} ${profile.lastName}`,
          }
        : null,
    };
  }
}
