import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAuditAction, Prisma, ProjectStatus } from '@prisma/client';
import { ProjectStateService } from '../projects/project-validation.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import type { AdminProjectsQueryDto } from './dto/admin.dto.js';

const projectInclude = {
  category: { select: { id: true, nameAr: true, slug: true } },
  client: {
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
  acceptedProposal: {
    include: {
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
    },
  },
  skills: { include: { skill: true } },
  _count: { select: { proposals: true } },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class AdminProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: AdminProjectsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.clientId) where.clientId = query.clientId;

    if (query.q?.trim()) {
      where.OR = [
        { title: { contains: query.q.trim(), mode: 'insensitive' } },
        { slug: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map((project) => this.formatProjectSummary(project)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        ...projectInclude,
        proposals: {
          select: {
            id: true,
            status: true,
            proposedPrice: true,
            estimatedDurationDays: true,
            createdAt: true,
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
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    return {
      ...this.formatProjectSummary(project),
      description: project.description,
      budgetType: project.budgetType,
      experienceLevel: project.experienceLevel,
      workMode: project.workMode,
      deadline: project.deadline,
      publishedAt: project.publishedAt,
      closedAt: project.closedAt,
      completedAt: project.completedAt,
      skills: project.skills.map((ps) => ps.skill),
      proposals: project.proposals.map((proposal) => ({
        id: proposal.id,
        status: proposal.status,
        proposedPrice: Number(proposal.proposedPrice),
        estimatedDurationDays: proposal.estimatedDurationDays,
        createdAt: proposal.createdAt,
        freelancer: proposal.freelancer.profile
          ? {
              username: proposal.freelancer.profile.username,
              displayName: `${proposal.freelancer.profile.firstName} ${proposal.freelancer.profile.lastName}`,
            }
          : null,
      })),
    };
  }

  async closeProject(adminId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    if (
      project.status === ProjectStatus.IN_PROGRESS ||
      project.status === ProjectStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'لا يمكن إغلاق مشروع قيد التنفيذ أو مكتمل من لوحة الإدارة',
      );
    }

    if (project.status === ProjectStatus.CLOSED) {
      return this.getById(projectId);
    }

    if (
      project.status !== ProjectStatus.OPEN &&
      project.status !== ProjectStatus.DRAFT
    ) {
      throw new BadRequestException('لا يمكن إغلاق المشروع في حالته الحالية');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: ProjectStateService.transitionToClosed(),
      });

      await this.audit.log(
        adminId,
        AdminAuditAction.PROJECT_CLOSED,
        'Project',
        projectId,
        { previousStatus: project.status },
        tx,
      );
    });

    return this.getById(projectId);
  }

  private formatProjectSummary(
    project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
  ) {
    const clientProfile = project.client.profile;

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      status: project.status,
      budgetMin: Number(project.budgetMin),
      budgetMax: Number(project.budgetMax),
      currency: project.currency,
      category: project.category,
      client: clientProfile
        ? {
            id: project.clientId,
            username: clientProfile.username,
            displayName: `${clientProfile.firstName} ${clientProfile.lastName}`,
          }
        : null,
      proposalCount: project._count.proposals,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      acceptedFreelancer: project.acceptedProposal?.freelancer.profile
        ? {
            username: project.acceptedProposal.freelancer.profile.username,
            displayName: `${project.acceptedProposal.freelancer.profile.firstName} ${project.acceptedProposal.freelancer.profile.lastName}`,
          }
        : null,
    };
  }
}
