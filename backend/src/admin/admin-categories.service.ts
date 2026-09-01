import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import { slugifyAdmin } from './admin-policy.util.js';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/admin.dto.js';
import type { AdminPaginationQueryDto } from './dto/admin.dto.js';

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: AdminPaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {};

    if (query.q?.trim()) {
      where.OR = [
        { nameAr: { contains: query.q.trim(), mode: 'insensitive' } },
        { slug: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(adminId: string, dto: CreateCategoryDto) {
    const slug = slugifyAdmin(dto.slug);

    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const created = await tx.category.create({
          data: {
            nameAr: dto.nameAr.trim(),
            slug,
            description: dto.description?.trim() || null,
            sortOrder: dto.sortOrder ?? 0,
            isActive: true,
          },
        });

        await this.audit.log(
          adminId,
          AdminAuditAction.CATEGORY_CREATED,
          'Category',
          created.id,
          { slug: created.slug },
          tx,
        );

        return created;
      });

      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('التصنيف أو المعرّف مستخدم مسبقاً');
      }
      throw error;
    }
  }

  async update(adminId: string, id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    const data: Prisma.CategoryUpdateInput = {};

    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr.trim();
    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.slug !== undefined) data.slug = slugifyAdmin(dto.slug);

    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.category.update({ where: { id }, data });

        await this.audit.log(
          adminId,
          AdminAuditAction.CATEGORY_UPDATED,
          'Category',
          id,
          { slug: updated.slug },
          tx,
        );

        return updated;
      });

      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('التصنيف أو المعرّف مستخدم مسبقاً');
      }
      throw error;
    }
  }

  async setActive(adminId: string, id: string, isActive: boolean) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    if (existing.isActive === isActive) {
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: { isActive },
      });

      await this.audit.log(
        adminId,
        isActive
          ? AdminAuditAction.CATEGORY_ACTIVATED
          : AdminAuditAction.CATEGORY_DEACTIVATED,
        'Category',
        id,
        { slug: updated.slug },
        tx,
      );

      return updated;
    });
  }
}
