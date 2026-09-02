import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ProjectStatus,
  ProposalStatus,
  Role,
  WorkMode,
  EscrowStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PROJECT_CURRENCY } from './projects.constants.js';
import type { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto.js';
import type {
  ClientProjectsQueryDto,
  PublicProjectQueryDto,
  ProjectSortOption,
} from './dto/project-query.dto.js';
import { generateUniqueProjectSlug } from './project-slug.util.js';
import {
  ProjectStateService,
  validateProjectForDraft,
  validateProjectForPublish,
} from './project-validation.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  assertClientCanComplete,
  assertFreelancerCanRequestCompletion,
} from '../reviews/review-validation.util.js';
import { EscrowService } from '../escrow/escrow.service.js';
import { NuqatiService } from '../nuqati/nuqati.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';

const projectInclude = {
  category: true,
  city: true,
  skills: { include: { skill: true } },
  client: {
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
          profilePhoto: true,
          clientProfile: { select: { displayName: true } },
        },
      },
    },
  },
  _count: { select: { proposals: true } },
  acceptedProposal: {
    include: {
      freelancer: {
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
              username: true,
              profilePhoto: true,
              freelancerProfile: { select: { professionalTitle: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly escrowService: EscrowService,
    private readonly nuqatiService: NuqatiService,
    private readonly platformPolicy: PlatformPolicyService,
  ) {}

  async create(clientId: string, dto: CreateProjectDto) {
    await this.platformPolicy.assertProjectsAllowed(Role.CLIENT);
    await this.assertClient(clientId);

    validateProjectForDraft({
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      skillIds: dto.skillIds,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      workMode: dto.workMode,
      cityId: dto.cityId,
    });

    if (dto.categoryId) {
      await this.assertActiveCategory(dto.categoryId);
    }

    if (dto.skillIds?.length) {
      await this.assertValidSkills(dto.skillIds);
    }

    const slug = await generateUniqueProjectSlug(dto.title, async (s) => {
      const existing = await this.prisma.project.findUnique({ where: { slug: s } });
      return Boolean(existing);
    });

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          title: dto.title.trim(),
          slug,
          description: dto.description?.trim() ?? '',
          categoryId: dto.categoryId!,
          budgetType: dto.budgetType ?? 'FIXED',
          budgetMin: dto.budgetMin ?? 0,
          budgetMax: dto.budgetMax ?? 0,
          currency: PROJECT_CURRENCY,
          experienceLevel: dto.experienceLevel ?? 'INTERMEDIATE',
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          workMode: dto.workMode ?? WorkMode.REMOTE,
          cityId: dto.workMode === WorkMode.REMOTE ? null : dto.cityId ?? null,
          status: ProjectStatus.DRAFT,
          clientId,
        },
      });

      if (dto.skillIds?.length) {
        await tx.projectSkill.createMany({
          data: dto.skillIds.map((skillId) => ({
            projectId: created.id,
            skillId,
          })),
        });
      }

      return tx.project.findUnique({
        where: { id: created.id },
        include: projectInclude,
      });
    });

    return this.formatManageProject(project!);
  }

  async listClientProjects(clientId: string, query: ClientProjectsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { clientId };

    if (query.status) {
      where.status = query.status;
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: projects.map((p) => this.formatManageProject(p)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getManageProject(clientId: string, projectId: string) {
    const project = await this.findOwnedProject(clientId, projectId);
    return this.formatManageProject(project);
  }

  async update(clientId: string, projectId: string, dto: UpdateProjectDto) {
    const existing = await this.findOwnedProject(clientId, projectId);
    ProjectStateService.assertCanEdit(existing.status);

    const pendingProposalCount = await this.prisma.proposal.count({
      where: { projectId, status: ProposalStatus.PENDING },
    });

    if (pendingProposalCount > 0) {
      const restrictedFields: (keyof UpdateProjectDto)[] = [
        'categoryId',
        'skillIds',
        'budgetType',
        'budgetMin',
        'budgetMax',
        'experienceLevel',
        'workMode',
        'cityId',
        'title',
      ];

      for (const field of restrictedFields) {
        if (dto[field] !== undefined) {
          throw new BadRequestException(
            'لا يمكن تعديل الشروط الأساسية بعد استلام عروض. يمكنك تعديل الوصف وموعد التسليم فقط.',
          );
        }
      }
    }

    const merged = this.mergeProjectData(existing, dto);

    validateProjectForDraft(merged);

    if (dto.categoryId) await this.assertActiveCategory(dto.categoryId);
    if (dto.skillIds) await this.assertValidSkills(dto.skillIds);

    const project = await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description.trim(),
          }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.budgetType !== undefined && { budgetType: dto.budgetType }),
          ...(dto.budgetMin !== undefined && { budgetMin: dto.budgetMin }),
          ...(dto.budgetMax !== undefined && { budgetMax: dto.budgetMax }),
          ...(dto.experienceLevel !== undefined && {
            experienceLevel: dto.experienceLevel,
          }),
          ...(dto.deadline !== undefined && {
            deadline: dto.deadline ? new Date(dto.deadline) : null,
          }),
          ...(dto.workMode !== undefined && { workMode: dto.workMode }),
          ...(dto.workMode !== undefined || dto.cityId !== undefined
            ? {
                cityId:
                  (dto.workMode ?? existing.workMode) === WorkMode.REMOTE
                    ? null
                    : (dto.cityId ?? existing.cityId),
              }
            : {}),
        },
      });

      if (dto.skillIds) {
        await tx.projectSkill.deleteMany({ where: { projectId } });
        if (dto.skillIds.length > 0) {
          await tx.projectSkill.createMany({
            data: dto.skillIds.map((skillId) => ({ projectId, skillId })),
          });
        }
      }

      return tx.project.findUnique({
        where: { id: projectId },
        include: projectInclude,
      });
    });

    return this.formatManageProject(project!);
  }

  async deleteDraft(clientId: string, projectId: string) {
    const project = await this.findOwnedProject(clientId, projectId);
    ProjectStateService.assertCanDelete(project.status);

    await this.prisma.project.delete({ where: { id: projectId } });
    return { message: 'تم حذف المسودة' };
  }

  async publish(clientId: string, projectId: string) {
    await this.platformPolicy.assertProjectsAllowed(Role.CLIENT);
    const project = await this.findOwnedProject(clientId, projectId);
    ProjectStateService.assertCanPublish(project.status);

    const data = this.projectToInput(project);

    validateProjectForPublish(data);

    const transition = ProjectStateService.transitionToOpen();

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: transition,
      include: projectInclude,
    });

    return this.formatManageProject(updated);
  }

  async close(clientId: string, projectId: string) {
    const project = await this.findOwnedProject(clientId, projectId);
    ProjectStateService.assertCanClose(project.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: ProjectStateService.transitionToClosed(),
      });

      await tx.proposal.updateMany({
        where: { projectId, status: ProposalStatus.PENDING },
        data: { status: ProposalStatus.REJECTED },
      });
    });

    const updated = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: projectInclude,
    });

    return this.formatManageProject(updated);
  }

  async cancel(clientId: string, projectId: string) {
    const project = await this.findOwnedProject(clientId, projectId);
    ProjectStateService.assertCanCancel(project.status);

    const pendingProposals = await this.prisma.proposal.findMany({
      where: { projectId, status: ProposalStatus.PENDING },
      select: { freelancerId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: ProjectStateService.transitionToCancelled(),
      });

      await tx.proposal.updateMany({
        where: { projectId, status: ProposalStatus.PENDING },
        data: { status: ProposalStatus.REJECTED },
      });
    });

    for (const p of pendingProposals) {
      await this.notifications.create(
        p.freelancerId,
        NotificationType.PROPOSAL_REJECTED,
        'تم إلغاء المشروع',
        `تم إلغاء المشروع "${project.title}" الذي قدمت عليه عرضاً`,
        `/dashboard/proposals`,
      );
    }

    const updated = await this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: projectInclude,
    });

    return this.formatManageProject(updated);
  }

  async requestCompletion(freelancerId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        acceptedProposal: {
          select: { id: true, status: true, freelancerId: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    const ctx = {
      status: project.status,
      clientId: project.clientId,
      acceptedProposalId: project.acceptedProposalId,
      acceptedProposal: project.acceptedProposal,
    };

    assertFreelancerCanRequestCompletion(freelancerId, ctx);
    ProjectStateService.assertCanRequestCompletion(project.status);

    if (project.completionRequestedAt) {
      const current = await this.prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: projectInclude,
      });
      return this.formatManageProject(current);
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        completionRequestedAt: new Date(),
        completionRequestedById: freelancerId,
      },
      include: projectInclude,
    });

    await this.notifications.create(
      project.clientId,
      NotificationType.PROJECT_COMPLETION_REQUESTED,
      'طلب إتمام المشروع',
      'أرسل المستقل طلبًا لتأكيد إتمام المشروع.',
      `/dashboard/projects/${projectId}/edit`,
    );

    return this.formatManageProject(updated);
  }

  async completeProject(clientId: string, projectId: string) {
    const project = await this.findOwnedProject(clientId, projectId);

    if (project.status === ProjectStatus.COMPLETED) {
      return this.formatManageProject(project);
    }

    const ctx = {
      status: project.status,
      clientId: project.clientId,
      acceptedProposalId: project.acceptedProposalId,
      acceptedProposal: project.acceptedProposal
        ? {
            id: project.acceptedProposal.id,
            status: project.acceptedProposal.status,
            freelancerId: project.acceptedProposal.freelancerId,
          }
        : null,
    };

    assertClientCanComplete(clientId, ctx);
    ProjectStateService.assertCanComplete(project.status);

    const existingEscrow = await this.prisma.escrow.findUnique({
      where: { projectId },
    });
    if (existingEscrow?.status === EscrowStatus.DISPUTED) {
      throw new ConflictException('لا يمكن إتمام المشروع أثناء وجود نزاع على الضمان');
    }

    const freelancerId = project.acceptedProposal?.freelancerId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.project.updateMany({
        where: { id: projectId, status: ProjectStatus.IN_PROGRESS },
        data: ProjectStateService.transitionToCompleted(),
      });

      if (result.count === 0) {
        const current = await tx.project.findUnique({ where: { id: projectId } });
        if (current?.status === ProjectStatus.COMPLETED) {
          return tx.project.findUniqueOrThrow({
            where: { id: projectId },
            include: projectInclude,
          });
        }
        throw new ConflictException('تعذر إتمام المشروع في هذه الحالة');
      }

      if (freelancerId) {
        const profile = await tx.profile.findUnique({
          where: { userId: freelancerId },
          select: { freelancerProfile: { select: { id: true } } },
        });

        if (profile?.freelancerProfile) {
          await tx.freelancerProfile.update({
            where: { id: profile.freelancerProfile.id },
            data: { completedProjects: { increment: 1 } },
          });
        }
      }

      await this.escrowService.releaseOnComplete(tx, projectId);

      return tx.project.findUniqueOrThrow({
        where: { id: projectId },
        include: projectInclude,
      });
    });

    if (freelancerId) {
      await this.notifications.create(
        freelancerId,
        NotificationType.PROJECT_COMPLETED,
        'تم إتمام المشروع',
        `تم تأكيد إتمام مشروع "${updated.title}"`,
        `/dashboard/proposals`,
      );

      if (existingEscrow?.status === EscrowStatus.FUNDED) {
        await this.notifications.create(
          freelancerId,
          NotificationType.ESCROW_RELEASED,
          'تم تحرير مبلغ الضمان',
          `تم تحرير مبلغ المشروع إلى حسابك بعد إتمام "${updated.title}".`,
          `/dashboard/escrow`,
        );
      }

      const fp = await this.prisma.freelancerProfile.findFirst({
        where: { profile: { userId: freelancerId } },
        select: { completedProjects: true },
      });
      if (fp?.completedProjects === 1) {
        void this.nuqatiService
          .onFirstJobCompleted(freelancerId, projectId)
          .catch(() => undefined);
      }
    }

    return this.formatManageProject(updated);
  }

  async listPublic(query: PublicProjectQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = { status: ProjectStatus.OPEN };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.skill) {
      where.skills = {
        some: { skill: { slug: query.skill } },
      };
    }

    if (query.city) {
      where.city = { slug: query.city };
    }

    if (query.workMode) {
      where.workMode = query.workMode;
    }

    if (query.budgetType) {
      where.budgetType = query.budgetType;
    }

    if (query.experienceLevel) {
      where.experienceLevel = query.experienceLevel;
    }

    if (query.minBudget !== undefined) {
      where.budgetMax = { gte: query.minBudget };
    }

    if (query.maxBudget !== undefined) {
      where.budgetMin = { lte: query.maxBudget };
    }

    const orderBy = this.resolveSort(query.sort);

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectInclude,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatPublicProject(p, true)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, status: ProjectStatus.OPEN },
      include: projectInclude,
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    return this.formatPublicProject(project, false);
  }

  private resolveSort(sort?: ProjectSortOption): Prisma.ProjectOrderByWithRelationInput {
    switch (sort) {
      case 'oldest':
        return { publishedAt: 'asc' };
      case 'budget_high':
        return { budgetMax: 'desc' };
      case 'budget_low':
        return { budgetMin: 'asc' };
      case 'newest':
      default:
        return { publishedAt: 'desc' };
    }
  }

  private async findOwnedProject(clientId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        ...projectInclude,
        skills: { include: { skill: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    if (project.clientId !== clientId) {
      throw new ForbiddenException('ليس لديك صلاحية على هذا المشروع');
    }

    return project;
  }

  private async assertClient(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== Role.CLIENT) {
      throw new ForbiddenException('هذه العملية للعملاء فقط');
    }
  }

  private async assertActiveCategory(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود أو غير نشط');
    }
  }

  private async assertValidSkills(skillIds: string[]) {
    const skills = await this.prisma.skill.findMany({
      where: { id: { in: skillIds }, isActive: true },
    });

    if (skills.length !== skillIds.length) {
      throw new NotFoundException('واحدة أو أكثر من المهارات غير صالحة');
    }
  }

  private mergeProjectData(
    existing: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
    dto: UpdateProjectDto,
  ) {
    return {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      categoryId: dto.categoryId ?? existing.categoryId,
      skillIds:
        dto.skillIds ?? existing.skills.map((s) => s.skillId),
      budgetMin:
        dto.budgetMin ?? Number(existing.budgetMin),
      budgetMax:
        dto.budgetMax ?? Number(existing.budgetMax),
      deadline:
        dto.deadline !== undefined
          ? dto.deadline
            ? new Date(dto.deadline)
            : null
          : existing.deadline,
      workMode: dto.workMode ?? existing.workMode,
      cityId:
        dto.cityId !== undefined ? dto.cityId : existing.cityId,
    };
  }

  private projectToInput(
    project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
  ) {
    return {
      title: project.title,
      description: project.description,
      categoryId: project.categoryId,
      skillIds: project.skills.map((s) => s.skillId),
      budgetMin: Number(project.budgetMin),
      budgetMax: Number(project.budgetMax),
      deadline: project.deadline,
      workMode: project.workMode,
      cityId: project.cityId,
    };
  }

  private formatManageProject(
    project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
  ) {
    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: project.description,
      status: project.status,
      budgetType: project.budgetType,
      budgetMin: Number(project.budgetMin),
      budgetMax: Number(project.budgetMax),
      currency: project.currency,
      experienceLevel: project.experienceLevel,
      workMode: project.workMode,
      deadline: project.deadline,
      publishedAt: project.publishedAt,
      closedAt: project.closedAt,
      completionRequestedAt: project.completionRequestedAt,
      completedAt: project.completedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      category: {
        id: project.category.id,
        nameAr: project.category.nameAr,
        slug: project.category.slug,
      },
      city: project.city
        ? {
            id: project.city.id,
            nameAr: project.city.nameAr,
            slug: project.city.slug,
            isRemote: project.city.isRemote,
          }
        : null,
      skills: project.skills.map((ps) => ({
        id: ps.skill.id,
        name: ps.skill.name,
        slug: ps.skill.slug,
      })),
      proposalCount: project._count.proposals,
      acceptedFreelancer: project.acceptedProposal
        ? {
            proposalId: project.acceptedProposal.id,
            username: project.acceptedProposal.freelancer.profile?.username ?? '',
            displayName: project.acceptedProposal.freelancer.profile
              ? `${project.acceptedProposal.freelancer.profile.firstName} ${project.acceptedProposal.freelancer.profile.lastName}`
              : 'مستقل',
            profilePhoto:
              project.acceptedProposal.freelancer.profile?.profilePhoto ?? null,
            professionalTitle:
              project.acceptedProposal.freelancer.profile?.freelancerProfile
                ?.professionalTitle ?? null,
          }
        : null,
    };
  }

  private formatPublicProject(
    project: Prisma.ProjectGetPayload<{ include: typeof projectInclude }>,
    summary: boolean,
  ) {
    const clientProfile = project.client.profile;

    const base = {
      id: project.id,
      slug: project.slug,
      title: project.title,
      description: summary
        ? project.description.slice(0, 200) +
          (project.description.length > 200 ? '...' : '')
        : project.description,
      budgetType: project.budgetType,
      budgetMin: Number(project.budgetMin),
      budgetMax: Number(project.budgetMax),
      currency: project.currency,
      experienceLevel: project.experienceLevel,
      workMode: project.workMode,
      deadline: project.deadline,
      publishedAt: project.publishedAt,
      category: {
        nameAr: project.category.nameAr,
        slug: project.category.slug,
      },
      city: project.city
        ? { nameAr: project.city.nameAr, slug: project.city.slug }
        : null,
      skills: project.skills.map((ps) => ({
        name: ps.skill.name,
        slug: ps.skill.slug,
      })),
      client: clientProfile
        ? {
            username: clientProfile.username,
            displayName:
              clientProfile.clientProfile?.displayName ??
              `${clientProfile.firstName} ${clientProfile.lastName}`,
            profilePhoto: clientProfile.profilePhoto,
          }
        : null,
      proposalCount: project._count.proposals,
    };

    return base;
  }
}
