import { Controller, Get, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AdminAuditQueryDto } from './dto/admin.dto.js';

@Controller('admin/audit')
@Roles(Role.ADMIN)
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: AdminAuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (query.action) where.action = query.action;
    if (query.adminId) where.adminId = query.adminId;

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items: items.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        admin: entry.admin.profile
          ? {
              id: entry.adminId,
              username: entry.admin.profile.username,
              displayName: `${entry.admin.profile.firstName} ${entry.admin.profile.lastName}`,
            }
          : { id: entry.adminId },
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
