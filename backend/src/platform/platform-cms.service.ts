import { Injectable } from '@nestjs/common';
import {
  FeaturedEntityType,
  ProjectStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CMS_KEYS } from './platform-settings.constants.js';

@Injectable()
export class PlatformCmsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicCms() {
    const rows = await this.prisma.cmsContent.findMany({
      where: { key: { in: [...CMS_KEYS] } },
    });
    const byKey: Record<string, unknown> = {};
    for (const key of CMS_KEYS) {
      byKey[key] = null;
    }
    for (const row of rows) {
      byKey[row.key] = row.contentJson;
    }
    return { blocks: byKey };
  }

  async getActiveBanners() {
    const now = new Date();
    const banners = await this.prisma.siteBanner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        text: true,
        link: true,
        startsAt: true,
        endsAt: true,
        sortOrder: true,
      },
    });
    return { items: banners };
  }

  async getFeatured() {
    const items = await this.prisma.featuredItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const categories: unknown[] = [];
    const freelancers: unknown[] = [];
    const projects: unknown[] = [];

    for (const item of items) {
      if (item.entityType === FeaturedEntityType.CATEGORY) {
        const category = await this.prisma.category.findUnique({
          where: { id: item.entityId },
          select: {
            id: true,
            nameAr: true,
            slug: true,
            description: true,
            isActive: true,
          },
        });
        if (category?.isActive) {
          categories.push({
            featuredId: item.id,
            sortOrder: item.sortOrder,
            ...category,
          });
        }
      } else if (item.entityType === FeaturedEntityType.PROJECT) {
        const project = await this.prisma.project.findFirst({
          where: {
            id: item.entityId,
            status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] },
          },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            budgetMin: true,
            budgetMax: true,
            currency: true,
            publishedAt: true,
            category: { select: { id: true, nameAr: true, slug: true } },
          },
        });
        if (project) {
          projects.push({
            featuredId: item.id,
            sortOrder: item.sortOrder,
            ...project,
            budgetMin: Number(project.budgetMin),
            budgetMax: Number(project.budgetMax),
          });
        }
      } else if (item.entityType === FeaturedEntityType.FREELANCER) {
        const resolved = await this.resolveFreelancer(item.entityId);
        if (resolved) {
          freelancers.push({
            featuredId: item.id,
            sortOrder: item.sortOrder,
            ...resolved,
          });
        }
      }
    }

    return { categories, freelancers, projects };
  }

  private async resolveFreelancer(entityId: string) {
    let fp = await this.prisma.freelancerProfile.findUnique({
      where: { id: entityId },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            user: { select: { id: true, status: true, role: true } },
          },
        },
      },
    });

    if (!fp) {
      const user = await this.prisma.user.findFirst({
        where: { id: entityId, role: Role.FREELANCER },
        include: {
          profile: {
            include: {
              freelancerProfile: true,
            },
          },
        },
      });
      if (user?.profile?.freelancerProfile) {
        fp = await this.prisma.freelancerProfile.findUnique({
          where: { id: user.profile.freelancerProfile.id },
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                profilePhoto: true,
                user: { select: { id: true, status: true, role: true } },
              },
            },
          },
        });
      }
    }

    if (!fp || fp.profile.user.status !== UserStatus.ACTIVE) return null;

    return {
      id: fp.id,
      userId: fp.profile.user.id,
      professionalTitle: fp.professionalTitle,
      averageRating: Number(fp.averageRating),
      completedProjects: fp.completedProjects,
      firstName: fp.profile.firstName,
      lastName: fp.profile.lastName,
      username: fp.profile.username,
      profilePhoto: fp.profile.profilePhoto,
    };
  }
}
