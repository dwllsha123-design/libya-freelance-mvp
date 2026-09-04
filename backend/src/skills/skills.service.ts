import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_FREELANCER_SKILLS } from '../common/constants/profile.constants.js';
import { ReferenceDataService } from '../reference-data/reference-data.service.js';

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listSkills() {
    let skills = await this.prisma.skill.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    if (skills.length === 0) {
      await this.referenceData.ensureReferenceData();
      skills = await this.prisma.skill.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      });
    }

    return skills;
  }

  async addSkillToFreelancer(userId: string, skillId: string) {
    const profile = await this.getFreelancerProfileOrThrow(userId);

    const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });

    if (!skill) {
      throw new NotFoundException('المهارة غير موجودة');
    }

    if (!skill.isActive) {
      throw new BadRequestException('المهارة غير متاحة حالياً');
    }

    const currentCount = await this.prisma.freelancerSkill.count({
      where: { freelancerProfileId: profile.freelancerProfileId },
    });

    if (currentCount >= MAX_FREELANCER_SKILLS) {
      throw new BadRequestException(
        `الحد الأقصى للمهارات هو ${MAX_FREELANCER_SKILLS}`,
      );
    }

    await this.prisma.freelancerSkill.upsert({
      where: {
        freelancerProfileId_skillId: {
          freelancerProfileId: profile.freelancerProfileId,
          skillId,
        },
      },
      create: {
        freelancerProfileId: profile.freelancerProfileId,
        skillId,
      },
      update: {},
    });

    return this.listFreelancerSkills(userId);
  }

  async removeSkillFromFreelancer(userId: string, skillId: string) {
    const profile = await this.getFreelancerProfileOrThrow(userId);

    await this.prisma.freelancerSkill.deleteMany({
      where: {
        freelancerProfileId: profile.freelancerProfileId,
        skillId,
      },
    });

    return this.listFreelancerSkills(userId);
  }

  async listFreelancerSkills(userId: string) {
    const profile = await this.getFreelancerProfileOrThrow(userId);

    const skills = await this.prisma.freelancerSkill.findMany({
      where: { freelancerProfileId: profile.freelancerProfileId },
      include: { skill: true },
    });

    return skills.map((fs) => ({
      id: fs.skill.id,
      name: fs.skill.name,
      slug: fs.skill.slug,
    }));
  }

  private async getFreelancerProfileOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { freelancerProfile: true } },
      },
    });

    if (!user || user.role !== Role.FREELANCER) {
      throw new ForbiddenException('هذه العملية للمستقلين فقط');
    }

    if (!user.profile?.freelancerProfile) {
      throw new NotFoundException('ملف المستقل غير موجود');
    }

    return {
      freelancerProfileId: user.profile.freelancerProfile.id,
    };
  }
}
