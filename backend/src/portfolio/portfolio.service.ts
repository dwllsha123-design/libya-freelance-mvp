import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface.js';
import type {
  CreatePortfolioDto,
  ReorderPortfolioDto,
  UpdatePortfolioDto,
} from './dto/portfolio.dto.js';
import {
  PORTFOLIO_MAX_IMAGES,
  assertPortfolioOwnership,
  validatePortfolioDescription,
  validatePortfolioTitle,
  validatePortfolioUrl,
  validateReorderIds,
  validateSkillIds,
} from './portfolio-validation.util.js';

const portfolioInclude = {
  skills: { include: { skill: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.PortfolioItemInclude;

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async listMine(userId: string) {
    const profile = await this.requireFreelancerProfile(userId);

    const items = await this.prisma.portfolioItem.findMany({
      where: { freelancerProfileId: profile.id },
      include: portfolioInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return items.map((item) => this.formatItem(item));
  }

  async getById(userId: string, itemId: string) {
    const profile = await this.requireFreelancerProfile(userId);
    const item = await this.findOwnedItem(profile.id, itemId);
    return this.formatItem(item);
  }

  async getPublicById(itemId: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: {
        ...portfolioInclude,
        freelancerProfile: {
          include: {
            profile: {
              select: {
                username: true,
                user: { select: { status: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (
      !item ||
      item.freelancerProfile.profile.user.role !== Role.FREELANCER ||
      item.freelancerProfile.profile.user.status !== 'ACTIVE'
    ) {
      throw new NotFoundException('العمل غير موجود');
    }

    return this.formatPublicItem(item);
  }

  async listForFreelancerUsername(username: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username: username.toLowerCase(),
        user: { role: Role.FREELANCER, status: 'ACTIVE' },
        freelancerProfile: { isNot: null },
      },
      include: { freelancerProfile: true },
    });

    if (!profile?.freelancerProfile) {
      throw new NotFoundException('المستقل غير موجود');
    }

    const items = await this.prisma.portfolioItem.findMany({
      where: { freelancerProfileId: profile.freelancerProfile.id },
      include: portfolioInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return {
      count: items.length,
      items: items.map((item) => this.formatPublicItem(item)),
    };
  }

  async getSummaryForFreelancerUserIds(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, PortfolioSummary>();

    const profiles = await this.prisma.profile.findMany({
      where: { userId: { in: userIds }, freelancerProfile: { isNot: null } },
      select: {
        userId: true,
        freelancerProfile: {
          select: {
            id: true,
            portfolio: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
              take: 3,
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
            _count: { select: { portfolio: true } },
          },
        },
      },
    });

    const map = new Map<string, PortfolioSummary>();

    for (const profile of profiles) {
      const fp = profile.freelancerProfile;
      if (!fp) continue;

      map.set(profile.userId, {
        count: fp._count.portfolio,
        recentThumbnails: fp.portfolio
          .map((item) => item.images[0]?.imageUrl ?? null)
          .filter((url): url is string => Boolean(url)),
      });
    }

    return map;
  }

  async create(userId: string, dto: CreatePortfolioDto) {
    const profile = await this.requireFreelancerProfile(userId);
    const skillIds = validateSkillIds(dto.skillIds);
    await this.assertSkillsExist(skillIds);

    const maxSort = await this.prisma.portfolioItem.aggregate({
      where: { freelancerProfileId: profile.id },
      _max: { sortOrder: true },
    });

    const item = await this.prisma.portfolioItem.create({
      data: {
        freelancerProfileId: profile.id,
        title: validatePortfolioTitle(dto.title),
        description: validatePortfolioDescription(dto.description),
        projectUrl: validatePortfolioUrl(dto.projectUrl),
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        skills: {
          create: skillIds.map((skillId) => ({ skillId })),
        },
      },
      include: portfolioInclude,
    });

    return this.formatItem(item);
  }

  async update(userId: string, itemId: string, dto: UpdatePortfolioDto) {
    const profile = await this.requireFreelancerProfile(userId);
    await this.findOwnedItem(profile.id, itemId);

    if (dto.skillIds) {
      const skillIds = validateSkillIds(dto.skillIds);
      await this.assertSkillsExist(skillIds);

      await this.prisma.$transaction([
        this.prisma.portfolioSkill.deleteMany({ where: { portfolioItemId: itemId } }),
        this.prisma.portfolioSkill.createMany({
          data: skillIds.map((skillId) => ({ portfolioItemId: itemId, skillId })),
        }),
      ]);
    }

    const updated = await this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: {
        ...(dto.title !== undefined && {
          title: validatePortfolioTitle(dto.title),
        }),
        ...(dto.description !== undefined && {
          description: validatePortfolioDescription(dto.description),
        }),
        ...(dto.projectUrl !== undefined && {
          projectUrl: validatePortfolioUrl(dto.projectUrl),
        }),
        ...(dto.completedAt !== undefined && {
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        }),
      },
      include: portfolioInclude,
    });

    return this.formatItem(updated);
  }

  async remove(userId: string, itemId: string) {
    const profile = await this.requireFreelancerProfile(userId);
    const item = await this.findOwnedItem(profile.id, itemId);

    await this.prisma.portfolioItem.delete({ where: { id: itemId } });

    for (const image of item.images) {
      await this.storage.deleteFile(image.imageUrl);
    }

    return { ok: true };
  }

  async reorder(userId: string, dto: ReorderPortfolioDto) {
    const profile = await this.requireFreelancerProfile(userId);
    const itemIds = validateReorderIds(dto.itemIds);

    const items = await this.prisma.portfolioItem.findMany({
      where: { freelancerProfileId: profile.id },
      select: { id: true },
    });

    const ownedIds = new Set(items.map((item) => item.id));

    if (itemIds.length !== items.length) {
      throw new ForbiddenException('يجب تضمين جميع أعمال المعرض في الترتيب');
    }

    for (const id of itemIds) {
      if (!ownedIds.has(id)) {
        throw new ForbiddenException('معرّف عمل غير صالح');
      }
    }

    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.portfolioItem.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listMine(userId);
  }

  async addImage(
    userId: string,
    itemId: string,
    file: Express.Multer.File,
  ) {
    const profile = await this.requireFreelancerProfile(userId);
    const item = await this.findOwnedItem(profile.id, itemId);

    if (item.images.length >= PORTFOLIO_MAX_IMAGES) {
      throw new ForbiddenException(
        `الحد الأقصى ${PORTFOLIO_MAX_IMAGES} صور لكل عمل`,
      );
    }

    const imageUrl = await this.storage.uploadPortfolioImage(
      userId,
      itemId,
      file,
    );

    const maxSort = item.images.reduce(
      (max, image) => Math.max(max, image.sortOrder),
      -1,
    );

    const image = await this.prisma.portfolioImage.create({
      data: {
        portfolioItemId: itemId,
        imageUrl,
        sortOrder: maxSort + 1,
      },
    });

    return {
      id: image.id,
      imageUrl: image.imageUrl,
      sortOrder: image.sortOrder,
    };
  }

  async removeImage(userId: string, itemId: string, imageId: string) {
    const profile = await this.requireFreelancerProfile(userId);
    await this.findOwnedItem(profile.id, itemId);

    const image = await this.prisma.portfolioImage.findFirst({
      where: { id: imageId, portfolioItemId: itemId },
    });

    if (!image) {
      throw new NotFoundException('الصورة غير موجودة');
    }

    await this.prisma.portfolioImage.delete({ where: { id: imageId } });
    await this.storage.deleteFile(image.imageUrl);

    return { ok: true };
  }

  private async requireFreelancerProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { freelancerProfile: true, user: { select: { role: true } } },
    });

    if (!profile?.freelancerProfile || profile.user.role !== Role.FREELANCER) {
      throw new ForbiddenException('هذه الميزة للمستقلين فقط');
    }

    return { id: profile.freelancerProfile.id };
  }

  private async findOwnedItem(freelancerProfileId: string, itemId: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
      include: portfolioInclude,
    });

    if (!item) {
      throw new NotFoundException('العمل غير موجود');
    }

    assertPortfolioOwnership(freelancerProfileId, item.freelancerProfileId);
    return item;
  }

  private async assertSkillsExist(skillIds: string[]) {
    const count = await this.prisma.skill.count({
      where: { id: { in: skillIds } },
    });

    if (count !== skillIds.length) {
      throw new NotFoundException('إحدى المهارات غير موجودة');
    }
  }

  private formatItem(
    item: Prisma.PortfolioItemGetPayload<{ include: typeof portfolioInclude }>,
  ) {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      projectUrl: item.projectUrl,
      completedAt: item.completedAt,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      skills: item.skills.map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        slug: s.skill.slug,
      })),
      images: item.images.map((image) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        sortOrder: image.sortOrder,
      })),
      coverImage: item.images[0]?.imageUrl ?? null,
    };
  }

  private formatPublicItem(
    item: Prisma.PortfolioItemGetPayload<{ include: typeof portfolioInclude }>,
  ) {
    const formatted = this.formatItem(item);
    return {
      id: formatted.id,
      title: formatted.title,
      description: formatted.description,
      projectUrl: formatted.projectUrl,
      completedAt: formatted.completedAt,
      skills: formatted.skills,
      images: formatted.images,
      coverImage: formatted.coverImage,
    };
  }
}

export interface PortfolioSummary {
  count: number;
  recentThumbnails: string[];
}
