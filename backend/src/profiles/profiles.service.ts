import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
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
import { isFreelancerVerified } from './freelancer-verification.util.js';

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

      if (profile.user.role === Role.FREELANCER && profile.freelancerProfile) {
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

      if (profile.user.role === Role.CLIENT && profile.clientProfile) {
        await tx.clientProfile.update({
          where: { profileId: profile.id },
          data: {
            ...(dto.displayName !== undefined && {
              displayName: dto.displayName,
            }),
          },
        });
      }

      return tx.profile.findUnique({
        where: { userId },
        include: profileInclude,
      });
    });

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
      user: { role: Role.FREELANCER, status: 'ACTIVE' },
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
      where.city = { slug: query.city.toLowerCase() };
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

    const [items, total] = await Promise.all([
      this.prisma.profile.findMany({
        where,
        include: profileInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.profile.count({ where }),
    ]);

    return {
      data: items.map((p) => this.formatProfile(p, false)),
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
        user: { role: Role.FREELANCER, status: 'ACTIVE' },
        freelancerProfile: { isNot: null },
      },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException('المستقل غير موجود');
    }

    const portfolio = await this.portfolio.listForFreelancerUsername(username);
    const reviews = await this.reviews.getRatingSummary(profile.userId);

    return {
      ...this.formatProfile(profile, false),
      portfolio,
      reviews,
    };
  }

  async getClientByUsername(username: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username: normalizeUsername(username),
        user: { role: Role.CLIENT, status: 'ACTIVE' },
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
            }
          : null,
        client: profile.clientProfile
          ? {
              displayName: profile.clientProfile.displayName,
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
            projectsPosted: profile.clientProfile.projectsPosted,
            averageRating: profile.clientProfile.averageRating,
          }
        : null,
    };
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

    return {
      professionalTitle: fp.professionalTitle,
      availability: fp.availability,
      hourlyRate: fp.hourlyRate ? Number(fp.hourlyRate) : null,
      completedProjects: fp.completedProjects,
      averageRating: fp.averageRating,
      skills,
      isVerified: isFreelancerVerified({
        emailVerified: profile.user.emailVerified,
        profilePhoto: profile.profilePhoto,
        bio: profile.bio,
        completedProjects: fp.completedProjects,
        averageRating: fp.averageRating,
        skillCount: skills.length,
      }),
    };
  }
}
