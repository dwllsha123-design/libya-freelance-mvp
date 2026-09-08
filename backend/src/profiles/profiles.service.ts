import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FreelancerSubscriptionStatus,
  IdentityVerificationStatus,
  PresenceVisibility,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { FreelancerQueryDto } from './dto/freelancer-query.dto.js';
import {
  normalizeUsername,
  validateUsername,
} from '../common/utils/username.util.js';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface.js';
import { PortfolioService } from '../portfolio/portfolio.service.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { NuqatiService } from '../nuqati/nuqati.service.js';
import { isFreelancerVerified } from './freelancer-verification.util.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { PresenceService } from '../presence/presence.service.js';
import type { PresenceSnapshot } from '../presence/presence.types.js';

const profileInclude = {
  city: true,
  freelancerProfile: {
    include: {
      skills: {
        include: { skill: true },
      },
    },
  },
  clientProfile: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
      lastSeenAt: true,
      presenceVisibility: true,
      identityVerification: {
        select: { status: true, expiresAt: true },
      },
      freelancerSubscriptions: {
        where: {
          status: FreelancerSubscriptionStatus.ACTIVE,
        },
        select: { status: true, expiresAt: true },
        orderBy: { expiresAt: 'desc' as const },
        take: 3,
      },
    },
  },
} satisfies Prisma.ProfileInclude;

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly portfolio: PortfolioService,
    private readonly reviews: ReviewsService,
    private readonly nuqatiService: NuqatiService,
    private readonly subscriptions: SubscriptionsService,
    private readonly presence: PresenceService,
  ) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException('الملف الشخصي غير موجود');
    }

    return this.formatProfile(profile, true);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: { select: { role: true } },
        freelancerProfile: true,
        clientProfile: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('الملف الشخصي غير موجود');
    }

    if (dto.username) {
      const normalized = normalizeUsername(dto.username);
      validateUsername(normalized);

      if (normalized !== profile.username) {
        const existing = await this.prisma.profile.findUnique({
          where: { username: normalized },
        });

        if (existing) {
          throw new ConflictException('اسم المستخدم مستخدم بالفعل');
        }
      }
    }

    if (dto.cityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: dto.cityId, isActive: true },
      });

      if (!city) {
        throw new NotFoundException('المدينة غير موجودة');
      }

      const countryForCity = dto.country ?? profile.country;
      if (countryForCity && city.country !== countryForCity) {
        throw new BadRequestException('المدينة لا تنتمي إلى البلد المحدد');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const profileUpdate: Prisma.ProfileUpdateInput = {
        ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
        ...(dto.username !== undefined && {
          username: normalizeUsername(dto.username),
        }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.cityId !== undefined && {
          city: dto.cityId ? { connect: { id: dto.cityId } } : { disconnect: true },
        }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.workMode !== undefined && { workMode: dto.workMode }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      };

      await tx.profile.update({
        where: { userId },
        data: profileUpdate,
      });

      if (profile.freelancerProfile) {
        await tx.freelancerProfile.update({
          where: { profileId: profile.id },
          data: {
            ...(dto.professionalTitle !== undefined && {
              professionalTitle: dto.professionalTitle,
            }),
            ...(dto.availability !== undefined && {
              availability: dto.availability,
            }),
            ...(dto.hourlyRate !== undefined && {
              hourlyRate: dto.hourlyRate,
            }),
          },
        });
      }

      if (profile.clientProfile) {
        await tx.clientProfile.update({
          where: { profileId: profile.id },
          data: {
            ...(dto.displayName !== undefined && {
              displayName: dto.displayName,
            }),
            ...(dto.companySector !== undefined && {
              companySector: dto.companySector,
            }),
            ...(dto.organizationSize !== undefined && {
              organizationSize: dto.organizationSize,
            }),
          },
        });
      }

      if (dto.presenceVisibility !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { presenceVisibility: dto.presenceVisibility },
        });
      }

      return tx.profile.findUnique({
        where: { userId },
        include: profileInclude,
      });
    });

    void this.nuqatiService.checkProfileComplete(userId).catch(() => undefined);

    return this.formatProfile(updated!, true);
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('الملف الشخصي غير موجود');
    }

    const imageUrl = await this.storage.uploadProfileImage(userId, file);

    if (profile.profilePhoto) {
      await this.storage.deleteFile(profile.profilePhoto);
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: { profilePhoto: imageUrl },
      include: profileInclude,
    });

    return this.formatProfile(updated, true);
  }

  async listFreelancers(query: FreelancerQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProfileWhereInput = {
      user: { status: 'ACTIVE' },
      freelancerProfile: { isNot: null },
    };

    if (query.skill) {
      where.freelancerProfile = {
        skills: {
          some: {
            skill: {
              slug: query.skill.toLowerCase(),
            },
          },
        },
      };
    }

    if (query.city) {
      where.city = { slug: query.city.toLowerCase(), country: 'Libya' };
    }

    if (query.q) {
      where.OR = [
        { firstName: { contains: query.q, mode: 'insensitive' } },
        { lastName: { contains: query.q, mode: 'insensitive' } },
        { username: { contains: query.q, mode: 'insensitive' } },
        {
          freelancerProfile: {
            professionalTitle: { contains: query.q, mode: 'insensitive' },
          },
        },
      ];
    }

    const activity = query.activity ?? 'all';
    if (activity === 'online') {
      let onlineIds = await this.presence.getOnlineUserIds(Role.FREELANCER);
      // Public listing (no viewer): only EVERYONE visibility may appear as "online"
      onlineIds = await this.filterOnlineIdsForPublicVisibility(onlineIds);
      if (onlineIds.length === 0) {
        return {
          data: [],
          meta: { page, limit, total: 0, totalPages: 0 },
        };
      }
      where.userId = { in: onlineIds };
    } else if (activity === 'active_today' || activity === 'active_week') {
      let onlineIds = await this.presence.getOnlineUserIds(Role.FREELANCER);
      onlineIds = await this.filterOnlineIdsForPublicVisibility(onlineIds);
      const since = new Date();
      if (activity === 'active_today') {
        since.setHours(0, 0, 0, 0);
      } else {
        since.setDate(since.getDate() - 7);
      }
      where.AND = [
        {
          OR: [
            ...(onlineIds.length ? [{ userId: { in: onlineIds } }] : []),
            {
              user: {
                lastSeenAt: { gte: since },
                // Public: hide last-seen for private visibility users
                presenceVisibility: PresenceVisibility.EVERYONE,
              },
            },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        include: profileInclude,
        skip,
        take: limit,
        orderBy: [
          { freelancerProfile: { averageRating: 'desc' } },
          { freelancerProfile: { completedProjects: 'desc' } },
          { freelancerProfile: { proBoostScore: 'desc' } },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.profile.count({ where }),
    ]);

    const presenceMap = await this.buildPresenceMap(
      items.map((p) => p.userId),
      null,
    );

    return {
      data: items.map((p) => ({
        ...this.formatProfile(p, false),
        presence: presenceMap.get(p.userId) ?? {
          userId: p.userId,
          status: 'OFFLINE' as const,
          lastSeenAt: null,
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFreelancerByUsername(username: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username: normalizeUsername(username),
        user: { status: 'ACTIVE' },
        freelancerProfile: { isNot: null },
      },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException('المستقل غير موجود');
    }

    const portfolio = await this.portfolio.listForFreelancerUsername(username);
    const reviews = await this.reviews.getRatingSummary(profile.userId);

    void this.subscriptions.recordProfileView(profile.userId).catch(() => undefined);

    const presenceMap = await this.buildPresenceMap([profile.userId], null);

    return {
      ...this.formatProfile(profile, false),
      presence: presenceMap.get(profile.userId) ?? {
        userId: profile.userId,
        status: 'OFFLINE' as const,
        lastSeenAt: null,
      },
      portfolio,
      reviews,
    };
  }

  async getClientByUsername(username: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username: normalizeUsername(username),
        user: { status: 'ACTIVE' },
        clientProfile: { isNot: null },
      },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException('العميل غير موجود');
    }

    const reviews = await this.reviews.getRatingSummary(profile.userId);

    return {
      ...this.formatProfile(profile, false),
      reviews,
    };
  }

  private formatProfile(
    profile: Prisma.ProfileGetPayload<{ include: typeof profileInclude }>,
    includePrivate: boolean,
  ) {
    const base = {
      userId: profile.userId,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      profilePhoto: profile.profilePhoto,
      bio: profile.bio,
      city: profile.city
        ? {
            id: profile.city.id,
            nameAr: profile.city.nameAr,
            slug: profile.city.slug,
            country: profile.city.country,
            isRemote: profile.city.isRemote,
          }
        : null,
      country: profile.country,
      workMode: profile.workMode,
      joinDate: profile.user.createdAt,
      role: profile.user.role,
    };

    if (includePrivate) {
      return {
        ...base,
        id: profile.id,
        email: profile.user.email,
        phone: profile.phone,
        status: profile.user.status,
        emailVerified: profile.user.emailVerified,
        presenceVisibility: profile.user.presenceVisibility,
        lastSeenAt: profile.user.lastSeenAt,
        freelancer: profile.freelancerProfile
          ? {
              professionalTitle: profile.freelancerProfile.professionalTitle,
              availability: profile.freelancerProfile.availability,
              hourlyRate: profile.freelancerProfile.hourlyRate
                ? Number(profile.freelancerProfile.hourlyRate)
                : null,
              completedProjects: profile.freelancerProfile.completedProjects,
              averageRating: profile.freelancerProfile.averageRating,
              skills: profile.freelancerProfile.skills.map((fs) => ({
                id: fs.skill.id,
                name: fs.skill.name,
                slug: fs.skill.slug,
              })),
              ...this.freelancerTrustAndBadges(profile),
            }
          : null,
        client: profile.clientProfile
          ? {
              displayName: profile.clientProfile.displayName,
              companySector: profile.clientProfile.companySector,
              organizationSize: profile.clientProfile.organizationSize,
              projectsPosted: profile.clientProfile.projectsPosted,
              averageRating: profile.clientProfile.averageRating,
            }
          : null,
      };
    }

    return {
      ...base,
      freelancer: profile.freelancerProfile
        ? this.formatPublicFreelancer(profile)
        : null,
      client: profile.clientProfile
        ? {
            displayName: profile.clientProfile.displayName,
            companySector: profile.clientProfile.companySector,
            organizationSize: profile.clientProfile.organizationSize,
            projectsPosted: profile.clientProfile.projectsPosted,
            averageRating: profile.clientProfile.averageRating,
          }
        : null,
    };
  }

  private async buildPresenceMap(
    userIds: string[],
    viewer: { id: string; role: Role } | null,
  ): Promise<Map<string, PresenceSnapshot>> {
    const items = await this.presence.getPresenceBatch(userIds, viewer);
    return new Map(items.map((item) => [item.userId, item]));
  }

  /** Public online filter must not surface users who hide presence. */
  private async filterOnlineIdsForPublicVisibility(
    onlineIds: string[],
  ): Promise<string[]> {
    if (onlineIds.length === 0) return [];
    const rows = await this.prisma.user.findMany({
      where: {
        id: { in: onlineIds },
        status: 'ACTIVE',
        presenceVisibility: PresenceVisibility.EVERYONE,
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  private formatPublicFreelancer(
    profile: Prisma.ProfileGetPayload<{ include: typeof profileInclude }>,
  ) {
    const fp = profile.freelancerProfile!;
    const skills = fp.skills.map((fs) => ({
      id: fs.skill.id,
      name: fs.skill.name,
      slug: fs.skill.slug,
    }));
    const badges = this.freelancerTrustAndBadges(profile);

    return {
      professionalTitle: fp.professionalTitle,
      availability: fp.availability,
      hourlyRate: fp.hourlyRate ? Number(fp.hourlyRate) : null,
      completedProjects: fp.completedProjects,
      averageRating: fp.averageRating,
      skills,
      isVerified: badges.isVerified,
      identityVerified: badges.identityVerified,
      isPro: badges.isPro,
      performanceLevel: badges.performanceLevel,
      isVerifiedTalent: badges.isVerifiedTalent,
      isFoundingFreelancer: badges.isFoundingFreelancer,
    };
  }

  private freelancerTrustAndBadges(
    profile: Prisma.ProfileGetPayload<{ include: typeof profileInclude }>,
  ) {
    const fp = profile.freelancerProfile!;
    const skillCount = fp.skills.length;
    const now = new Date();
    const iv = profile.user.identityVerification;
    const identityVerified =
      !!iv &&
      iv.status === IdentityVerificationStatus.VERIFIED &&
      (!iv.expiresAt || iv.expiresAt > now);
    const isPro = (profile.user.freelancerSubscriptions ?? []).some(
      (s) =>
        s.status === FreelancerSubscriptionStatus.ACTIVE &&
        s.expiresAt &&
        s.expiresAt > now,
    );

    return {
      isVerified: isFreelancerVerified({
        emailVerified: profile.user.emailVerified,
        profilePhoto: profile.profilePhoto,
        bio: profile.bio,
        completedProjects: fp.completedProjects,
        averageRating: fp.averageRating,
        skillCount,
      }),
      identityVerified,
      isPro,
      performanceLevel: fp.performanceLevel ?? 'NONE',
      isVerifiedTalent: fp.isVerifiedTalent ?? false,
      isFoundingFreelancer: fp.isFoundingFreelancer ?? false,
    };
  }
}
