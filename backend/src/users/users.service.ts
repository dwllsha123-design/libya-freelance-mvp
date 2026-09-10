import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  usernameBaseFromName,
  usernameCandidate,
} from '../common/utils/username.util.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Permanent permalink username. Generated once at registration from the
   * display name; later name edits must not call this again.
   * Collisions: base → base-2 → base-3 …
   */
  async generateUniqueUsername(firstName: string, lastName: string): Promise<string> {
    const base = usernameBaseFromName(firstName, lastName);

    for (let collisionIndex = 0; collisionIndex < 500; collisionIndex += 1) {
      const username = usernameCandidate(base, collisionIndex);
      const existing = await this.prisma.profile.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!existing) {
        return username;
      }
    }

    return usernameCandidate(`${base}-${Date.now().toString(36)}`, 0);
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            freelancerProfile: { select: { id: true } },
            clientProfile: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            bio: true,
            city: true,
            country: true,
            phone: true,
            createdAt: true,
            freelancerProfile: { select: { id: true } },
            clientProfile: { select: { id: true, displayName: true } },
          },
        },
      },
    });
  }

  async ensureRoleProfile(
    userId: string,
    role: Role,
    profileId: string,
  ): Promise<{ created: boolean }> {
    if (role === Role.FREELANCER) {
      const existing = await this.prisma.freelancerProfile.findUnique({
        where: { profileId },
        select: { id: true },
      });
      if (existing) return { created: false };
      await this.prisma.freelancerProfile.create({ data: { profileId } });
      return { created: true };
    }

    if (role === Role.CLIENT) {
      const existing = await this.prisma.clientProfile.findUnique({
        where: { profileId },
        select: { id: true },
      });
      if (existing) return { created: false };
      await this.prisma.clientProfile.create({ data: { profileId } });
      return { created: true };
    }

    return { created: false };
  }

  async createRoleProfile(userId: string, role: Role, profileId: string) {
    await this.ensureRoleProfile(userId, role, profileId);
  }
}
