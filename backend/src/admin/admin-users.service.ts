import {
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
import {
  assertAdminCanModerateUser,
  assertValidStatusTransition,
} from './admin-policy.util.js';
import type { AdminUsersQueryDto } from './dto/admin.dto.js';

const userListInclude = {
  profile: {
    include: {
      city: { select: { id: true, nameAr: true, slug: true } },
      freelancerProfile: {
        include: {
          _count: { select: { portfolio: true, skills: true } },
        },
      },
      clientProfile: true,
    },
  },
  _count: {
    select: {
      proposals: true,
      projectsAsClient: true,
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly realtimeSessions: RealtimeSessionService,
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

    return this.formatUserDetail(user);
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
      freelancer:
        user.role === Role.FREELANCER && freelancer
          ? {
              professionalTitle: freelancer.professionalTitle,
              completedProjects: freelancer.completedProjects,
              averageRating: freelancer.averageRating,
              portfolioCount: freelancer._count.portfolio,
              skillsCount: freelancer._count.skills,
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
