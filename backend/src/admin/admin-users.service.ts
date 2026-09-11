import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeSessionService } from '../realtime/realtime-session.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { LaunchProgramService } from '../launch/launch.service.js';
import { PlatformPolicyService } from '../platform/platform-policy.service.js';
import {
  STORAGE_SERVICE,
  type StorageService,
} from '../storage/storage.interface.js';
import { Inject } from '@nestjs/common';
import {
  assertAdminCanModerateUser,
  assertValidStatusTransition,
} from './admin-policy.util.js';
import { evaluateIncompleteFreelancerDeletion } from './admin-incomplete-user-deletion.util.js';
import { calculateProfileCompletion } from '../profiles/profile-completion.util.js';
import { LAUNCH_PROGRAM_DEFAULTS } from '../launch/launch.config.js';
import { MAX_FREELANCER_SKILLS } from '../common/constants/profile.constants.js';
import type { AdminUsersQueryDto } from './dto/admin.dto.js';
import type { AdminUpdateFreelancerDto } from './dto/admin-update-freelancer.dto.js';

const activityCountSelect = {
  proposals: true,
  projectsAsClient: true,
  escrowsAsFreelancer: true,
  escrowsAsClient: true,
  reviewsGiven: true,
  reviewsReceived: true,
  conversationMembers: true,
  projectAgreementsAsFreelancer: true,
  projectAgreementsAsClient: true,
} as const;

const userListInclude = {
  profile: {
    include: {
      city: { select: { id: true, nameAr: true, slug: true, country: true } },
      freelancerProfile: {
        include: {
          _count: { select: { portfolio: true, skills: true } },
          skills: {
            include: {
              skill: { select: { id: true, name: true, slug: true, isActive: true } },
            },
          },
        },
      },
      clientProfile: true,
    },
  },
  _count: {
    select: activityCountSelect,
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly realtimeSessions: RealtimeSessionService,
    private readonly launchProgram: LaunchProgramService,
    private readonly platformPolicy: PlatformPolicyService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async list(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: { in: [Role.FREELANCER, Role.CLIENT] },
    };

    if (query.role) {
      // Explicit staff roles expand beyond marketplace-only default
      if (query.role === Role.ADMIN || query.role === Role.SUPER_ADMIN) {
        where.role = query.role;
      } else {
        where.role = query.role;
      }
    }
    if (query.status) where.status = query.status;
    if (query.cityId) {
      where.profile = { cityId: query.cityId };
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { username: { contains: q, mode: 'insensitive' } } },
        { profile: { firstName: { contains: q, mode: 'insensitive' } } },
        { profile: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userListInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => this.formatUserSummary(user)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userListInclude,
    });

    if (!user || user.role === Role.ADMIN) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const detail = this.formatUserDetail(user);
    const launch = await this.launchProgram.getUserLaunchStatus(id);
    return {
      ...detail,
      launch,
    };
  }

  /** Current staff session permissions (for UI gating; API remains authoritative). */
  async getMySession(adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        role: true,
        adminPermissions: { select: { permission: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    return {
      id: user.id,
      role: user.role,
      permissions: user.adminPermissions.map((p) => p.permission),
    };
  }

  /** Safe edit payload for admin freelancer profile form (no secrets). */
  async getFreelancerForEdit(userId: string) {
    const user = await this.requireFreelancerUser(userId);
    this.assertFreelancerEditStructure(user);
    return this.formatFreelancerEdit(user);
  }

  /**
   * Update freelancer profile fields in place — never recreates the User row.
   * Preserves proposals, projects, messages, reviews, and agreements.
   *
   * skillIds: omitted → unchanged; present (incl. []) → full replace.
   */
  async updateFreelancerProfile(
    adminId: string,
    userId: string,
    dto: AdminUpdateFreelancerDto,
  ) {
    const user = await this.requireFreelancerUser(userId);
    assertAdminCanModerateUser(adminId, user);
    this.assertFreelancerEditStructure(user);

    const profile = user.profile!;
    const freelancer = profile.freelancerProfile!;

    const nextCountry =
      dto.country !== undefined ? dto.country.trim() : profile.country;
    let nextCityId =
      dto.cityId !== undefined ? dto.cityId : profile.cityId;

    if (nextCountry === 'Other') {
      nextCityId = null;
    }

    if (nextCityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: nextCityId, isActive: true },
      });
      if (!city) {
        throw new NotFoundException('المدينة غير موجودة');
      }
      if (nextCountry && city.country !== nextCountry) {
        if (dto.cityId !== undefined) {
          throw new BadRequestException('المدينة لا تنتمي إلى البلد المحدد');
        }
        // Country changed without a matching city — clear stale city (self-serve convention).
        nextCityId = null;
      }
    }

    let nextWorkMode = undefined as Awaited<
      ReturnType<PlatformPolicyService['resolveProjectWorkMode']>
    > | undefined;
    if (dto.workMode !== undefined) {
      nextWorkMode = await this.platformPolicy.resolveProjectWorkMode(dto.workMode);
    }

    if (dto.skillIds !== undefined) {
      if (dto.skillIds.length > MAX_FREELANCER_SKILLS) {
        throw new BadRequestException(
          `الحد الأقصى للمهارات هو ${MAX_FREELANCER_SKILLS}`,
        );
      }
      const uniqueIds = [...new Set(dto.skillIds)];
      if (uniqueIds.length > 0) {
        const activeSkills = await this.prisma.skill.findMany({
          where: { id: { in: uniqueIds }, isActive: true },
          select: { id: true },
        });
        if (activeSkills.length !== uniqueIds.length) {
          throw new BadRequestException('بعض المهارات غير صالحة أو غير مفعّلة');
        }
      }
    }

    const before = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      cityId: profile.cityId,
      country: profile.country,
      phone: profile.phone,
      workMode: profile.workMode,
      professionalTitle: freelancer.professionalTitle,
      availability: freelancer.availability,
      hourlyRate: freelancer.hourlyRate ? Number(freelancer.hourlyRate) : null,
      skillIds: freelancer.skills.map((s) => s.skillId),
    };

    const after = {
      firstName: dto.firstName !== undefined ? dto.firstName.trim() : before.firstName,
      lastName: dto.lastName !== undefined ? dto.lastName.trim() : before.lastName,
      bio: dto.bio !== undefined ? dto.bio.trim() || null : before.bio,
      cityId: nextCityId,
      country: nextCountry,
      phone: dto.phone !== undefined ? dto.phone.trim() || null : before.phone,
      workMode: nextWorkMode ?? before.workMode,
      professionalTitle:
        dto.professionalTitle !== undefined
          ? dto.professionalTitle.trim() || null
          : before.professionalTitle,
      availability: dto.availability ?? before.availability,
      hourlyRate: dto.hourlyRate !== undefined ? dto.hourlyRate : before.hourlyRate,
      skillIds:
        dto.skillIds !== undefined
          ? [...new Set(dto.skillIds)]
          : before.skillIds,
    };

    const changedFields = (
      Object.keys(before) as Array<keyof typeof before>
    ).filter((key) => {
      if (key === 'skillIds') {
        const a = [...before.skillIds].sort().join(',');
        const b = [...after.skillIds].sort().join(',');
        return a !== b;
      }
      return before[key] !== after[key];
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profile.id },
        data: {
          ...(dto.firstName !== undefined && { firstName: dto.firstName.trim() }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName.trim() }),
          ...(dto.bio !== undefined && { bio: dto.bio.trim() || null }),
          ...((dto.cityId !== undefined || nextCityId !== before.cityId) && {
            cityId: nextCityId,
          }),
          ...(dto.country !== undefined && { country: nextCountry }),
          ...(dto.phone !== undefined && {
            phone: dto.phone.trim() || null,
          }),
          ...(nextWorkMode !== undefined && { workMode: nextWorkMode }),
        },
      });

      await tx.freelancerProfile.update({
        where: { id: freelancer.id },
        data: {
          ...(dto.professionalTitle !== undefined && {
            professionalTitle: dto.professionalTitle.trim() || null,
          }),
          ...(dto.availability !== undefined && {
            availability: dto.availability,
          }),
          ...(dto.hourlyRate !== undefined && {
            hourlyRate: dto.hourlyRate,
          }),
        },
      });

      if (dto.skillIds !== undefined) {
        const uniqueIds = [...new Set(dto.skillIds)];
        await tx.freelancerSkill.deleteMany({
          where: { freelancerProfileId: freelancer.id },
        });
        if (uniqueIds.length > 0) {
          await tx.freelancerSkill.createMany({
            data: uniqueIds.map((skillId) => ({
              freelancerProfileId: freelancer.id,
              skillId,
            })),
          });
        }
      }

      const beforeChanged: Record<string, unknown> = {};
      const afterChanged: Record<string, unknown> = {};
      for (const field of changedFields) {
        beforeChanged[field] = before[field];
        afterChanged[field] = after[field];
      }

      await this.audit.log(
        adminId,
        AdminAuditAction.SETTING_CHANGED,
        'User',
        userId,
        {
          action: 'ADMIN_FREELANCER_PROFILE_UPDATE',
          actorAdminId: adminId,
          freelancerUserId: userId,
          changedFields,
          before: beforeChanged,
          after: afterChanged,
        },
        tx,
      );
    });

    return this.getFreelancerForEdit(userId);
  }

  async uploadFreelancerPhoto(
    adminId: string,
    userId: string,
    file: Express.Multer.File | undefined,
  ) {
    const user = await this.requireFreelancerUser(userId);
    assertAdminCanModerateUser(adminId, user);

    const profile = user.profile;
    if (!profile) {
      throw new BadRequestException('الملف الشخصي غير موجود');
    }

    if (!file) {
      throw new BadRequestException('ملف الصورة مطلوب');
    }

    const previousPhoto = profile.profilePhoto;

    // Upload first — never delete the old asset until the new one is stored
    // and the profile row points at it.
    const imageUrl = await this.storage.uploadProfileImage(userId, file);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.profile.update({
          where: { id: profile.id },
          data: { profilePhoto: imageUrl },
        });
        await this.audit.log(
          adminId,
          AdminAuditAction.SETTING_CHANGED,
          'User',
          userId,
          {
            action: 'ADMIN_FREELANCER_PHOTO_UPDATE',
            actorAdminId: adminId,
            freelancerUserId: userId,
            changedFields: ['profilePhoto'],
            hadPreviousPhoto: Boolean(previousPhoto),
          },
          tx,
        );
      });
    } catch (error) {
      // Best-effort cleanup of orphaned new upload; keep previous photo URL.
      await this.storage.deleteFile(imageUrl).catch(() => undefined);
      throw error;
    }

    if (previousPhoto && previousPhoto !== imageUrl) {
      await this.storage.deleteFile(previousPhoto).catch(() => undefined);
    }

    return this.getFreelancerForEdit(userId);
  }

  private async requireFreelancerUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userListInclude,
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (user.role !== Role.FREELANCER) {
      throw new ForbiddenException('هذا الإجراء مخصص لحسابات المستقلين فقط');
    }

    return user;
  }

  private assertFreelancerEditStructure(
    user: Prisma.UserGetPayload<{ include: typeof userListInclude }>,
  ) {
    if (!user.profile?.freelancerProfile) {
      throw new BadRequestException('ملف المستقل غير مكتمل هيكليًا');
    }
  }

  private formatFreelancerEdit(
    user: Prisma.UserGetPayload<{ include: typeof userListInclude }>,
  ) {
    this.assertFreelancerEditStructure(user);
    const profile = user.profile;
    const freelancer = profile?.freelancerProfile;
    if (!profile || !freelancer) {
      throw new BadRequestException('ملف المستقل غير مكتمل هيكليًا');
    }

    const skills = freelancer.skills
      .filter((fs) => fs.skill.isActive)
      .map((fs) => ({
        id: fs.skill.id,
        name: fs.skill.name,
        slug: fs.skill.slug,
      }));

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: `${profile.firstName} ${profile.lastName}`.trim(),
      profilePhoto: profile.profilePhoto,
      bio: profile.bio,
      phone: profile.phone,
      country: profile.country,
      cityId: profile.cityId,
      city: profile.city,
      workMode: profile.workMode,
      professionalTitle: freelancer.professionalTitle,
      availability: freelancer.availability,
      hourlyRate: freelancer.hourlyRate ? Number(freelancer.hourlyRate) : null,
      skills,
      skillIds: skills.map((s) => s.id),
    };
  }

  async suspend(adminId: string, userId: string) {
    return this.changeStatus(adminId, userId, UserStatus.SUSPENDED, AdminAuditAction.USER_SUSPENDED);
  }

  async ban(adminId: string, userId: string) {
    return this.changeStatus(adminId, userId, UserStatus.BANNED, AdminAuditAction.USER_BANNED);
  }

  async reactivate(adminId: string, userId: string) {
    return this.changeStatus(adminId, userId, UserStatus.ACTIVE, AdminAuditAction.USER_REACTIVATED);
  }

  async revokeSessions(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    assertAdminCanModerateUser(adminId, user);

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await this.audit.log(
        adminId,
        AdminAuditAction.USER_SUSPENDED,
        'User',
        userId,
        { action: 'SESSIONS_REVOKED', note: 'إلغاء الجلسات دون تغيير الحالة' },
        tx,
      );
    });
    await this.realtimeSessions.disconnectUser(userId);
    return { ok: true };
  }

  /**
   * Permanently delete an incomplete freelancer with zero marketplace activity.
   * Does not require a schema migration; audit uses USER_BANNED + hardDelete metadata.
   */
  async deleteIncomplete(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userListInclude,
    });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    assertAdminCanModerateUser(adminId, user);

    const profile = user.profile;
    const freelancer = profile?.freelancerProfile;
    const decision = evaluateIncompleteFreelancerDeletion({
      role: user.role,
      profile: {
        profilePhoto: profile?.profilePhoto,
        professionalTitle: freelancer?.professionalTitle,
        bio: profile?.bio,
        cityId: profile?.cityId,
        skillCount: freelancer?._count.skills,
        portfolioCount: freelancer?._count.portfolio,
      },
      activity: {
        proposals: user._count.proposals,
        projectsAsClient: user._count.projectsAsClient,
        escrowsAsFreelancer: user._count.escrowsAsFreelancer,
        escrowsAsClient: user._count.escrowsAsClient,
        reviewsGiven: user._count.reviewsGiven,
        reviewsReceived: user._count.reviewsReceived,
        conversationMembers: user._count.conversationMembers,
        projectAgreementsAsFreelancer: user._count.projectAgreementsAsFreelancer,
        projectAgreementsAsClient: user._count.projectAgreementsAsClient,
      },
    });

    if (!decision.allowed) {
      throw new BadRequestException(decision.reason);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.audit.log(
        adminId,
        AdminAuditAction.USER_BANNED,
        'User',
        userId,
        {
          action: 'HARD_DELETE_INCOMPLETE_PROFILE',
          email: user.email,
          username: profile?.username ?? null,
          profileCompletionPercent: decision.profileCompletionPercent,
        },
        tx,
      );

      await tx.user.delete({ where: { id: userId } });
    });

    await this.realtimeSessions.disconnectUser(userId);

    return {
      ok: true,
      deletedUserId: userId,
      profileCompletionPercent: decision.profileCompletionPercent,
    };
  }

  private async changeStatus(
    adminId: string,
    userId: string,
    status: UserStatus,
    action: AdminAuditAction,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    assertAdminCanModerateUser(adminId, user);
    assertValidStatusTransition(user.status, status);

    if (user.status === status) {
      return this.getById(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status },
      });

      if (status !== UserStatus.ACTIVE) {
        await tx.refreshToken.deleteMany({ where: { userId } });
      }

      await this.audit.log(
        adminId,
        action,
        'User',
        userId,
        { previousStatus: user.status, newStatus: status },
        tx,
      );
    });

    if (status !== UserStatus.ACTIVE) {
      await this.realtimeSessions.disconnectUser(userId);
    }

    return this.getById(userId);
  }

  private formatUserSummary(
    user: Prisma.UserGetPayload<{ include: typeof userListInclude }>,
  ) {
    const profile = user.profile;

    const freelancer = profile?.freelancerProfile;
    const clientProfile = profile?.clientProfile;

    const profileCompletion =
      user.role === Role.FREELANCER
        ? calculateProfileCompletion({
            profilePhoto: profile?.profilePhoto,
            professionalTitle: freelancer?.professionalTitle,
            bio: profile?.bio,
            cityId: profile?.cityId,
            skillCount: freelancer?._count.skills,
            portfolioCount: freelancer?._count.portfolio,
          })
        : null;

    const deleteDecision =
      user.role === Role.FREELANCER
        ? evaluateIncompleteFreelancerDeletion({
            role: user.role,
            profile: {
              profilePhoto: profile?.profilePhoto,
              professionalTitle: freelancer?.professionalTitle,
              bio: profile?.bio,
              cityId: profile?.cityId,
              skillCount: freelancer?._count.skills,
              portfolioCount: freelancer?._count.portfolio,
            },
            activity: {
              proposals: user._count.proposals,
              projectsAsClient: user._count.projectsAsClient,
              escrowsAsFreelancer: user._count.escrowsAsFreelancer,
              escrowsAsClient: user._count.escrowsAsClient,
              reviewsGiven: user._count.reviewsGiven,
              reviewsReceived: user._count.reviewsReceived,
              conversationMembers: user._count.conversationMembers,
              projectAgreementsAsFreelancer:
                user._count.projectAgreementsAsFreelancer,
              projectAgreementsAsClient: user._count.projectAgreementsAsClient,
            },
          })
        : { allowed: false as const, reason: 'not_freelancer' };

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      username: profile?.username ?? null,
      displayName: profile
        ? `${profile.firstName} ${profile.lastName}`
        : null,
      profilePhoto: profile?.profilePhoto ?? null,
      city: profile?.city ?? null,
      proposalCount: user._count.proposals,
      projectsPosted: user._count.projectsAsClient,
      profileCompletionPercent: profileCompletion?.percent ?? null,
      profileCompletionThreshold:
        LAUNCH_PROGRAM_DEFAULTS.profileCompletionThreshold,
      canDeleteIncomplete: deleteDecision.allowed,
      freelancer:
        user.role === Role.FREELANCER && freelancer
          ? {
              professionalTitle: freelancer.professionalTitle,
              completedProjects: freelancer.completedProjects,
              averageRating: freelancer.averageRating,
              portfolioCount: freelancer._count.portfolio,
              skillsCount: freelancer._count.skills,
              performanceLevel: freelancer.performanceLevel,
              isVerifiedTalent: freelancer.isVerifiedTalent,
              verifiedTalentAt: freelancer.verifiedTalentAt,
              isFoundingFreelancer: freelancer.isFoundingFreelancer,
              foundingFreelancerAt: freelancer.foundingFreelancerAt,
              foundingSlotNumber: freelancer.foundingSlotNumber,
            }
          : null,
      client:
        user.role === Role.CLIENT && clientProfile
          ? {
              displayName: clientProfile.displayName,
              projectsPosted: clientProfile.projectsPosted,
              averageRating: clientProfile.averageRating,
            }
          : null,
    };
  }

  private formatUserDetail(
    user: Prisma.UserGetPayload<{ include: typeof userListInclude }>,
  ) {
    const summary = this.formatUserSummary(user);
    const profile = user.profile;
    const freelancer = profile?.freelancerProfile;

    return {
      ...summary,
      bio: profile?.bio ?? null,
      profilePhoto: profile?.profilePhoto ?? null,
      workMode: profile?.workMode ?? null,
      freelancer:
        user.role === Role.FREELANCER && freelancer
          ? {
              professionalTitle: freelancer.professionalTitle,
              completedProjects: freelancer.completedProjects,
              averageRating: freelancer.averageRating,
              portfolioCount: freelancer._count.portfolio,
              skillsCount: freelancer._count.skills,
              performanceLevel: freelancer.performanceLevel,
              isVerifiedTalent: freelancer.isVerifiedTalent,
              verifiedTalentAt: freelancer.verifiedTalentAt,
              isFoundingFreelancer: freelancer.isFoundingFreelancer,
              foundingFreelancerAt: freelancer.foundingFreelancerAt,
              foundingSlotNumber: freelancer.foundingSlotNumber,
            }
          : null,
      client:
        user.role === Role.CLIENT && profile?.clientProfile
          ? {
              displayName: profile.clientProfile.displayName,
              projectsPosted: profile.clientProfile.projectsPosted,
              averageRating: profile.clientProfile.averageRating,
              activeProjects: user._count.projectsAsClient,
            }
          : null,
    };
  }
}
