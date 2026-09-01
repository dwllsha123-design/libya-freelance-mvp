import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { slugifyAdmin } from './admin-policy.util.js';
import type {
  AdminPaginationQueryDto,
  CreateSkillDto,
  UpdateSkillDto,
} from './dto/admin.dto.js';

@Injectable()
export class AdminSkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SkillWhereInput = {};

    if (query.q?.trim()) {
      where.OR = [
        { name: { contains: query.q.trim(), mode: 'insensitive' } },
        { slug: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.skill.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.skill.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(adminId: string, dto: CreateSkillDto) {
    const slug = slugifyAdmin(dto.slug);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.skill.create({
          data: {
            name: dto.name.trim(),
            slug,
            isActive: true,
          },
        });

        await this.audit.log(
          adminId,
          AdminAuditAction.SKILL_CREATED,
          'Skill',
          created.id,
          { slug: created.slug },
          tx,
        );

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('المهارة أو المعرّف مستخدم مسبقاً');
      }
      throw error;
    }
  }

  async update(adminId: string, id: string, dto: UpdateSkillDto) {
    const existing = await this.prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('المهارة غير موجودة');
    }

    const data: Prisma.SkillUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = slugifyAdmin(dto.slug);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.skill.update({ where: { id }, data });

        await this.audit.log(
          adminId,
          AdminAuditAction.SKILL_UPDATED,
          'Skill',
          id,
          { slug: updated.slug },
          tx,
        );

        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('المهارة أو المعرّف مستخدم مسبقاً');
      }
      throw error;
    }
  }

  async setActive(adminId: string, id: string, isActive: boolean) {
    const existing = await this.prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('المهارة غير موجودة');
    }

    if (existing.isActive === isActive) {
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.skill.update({
        where: { id },
        data: { isActive },
      });

      await this.audit.log(
        adminId,
        isActive
          ? AdminAuditAction.SKILL_ACTIVATED
          : AdminAuditAction.SKILL_DEACTIVATED,
        'Skill',
        id,
        { slug: updated.slug },
        tx,
      );

      return updated;
    });
  }
}
