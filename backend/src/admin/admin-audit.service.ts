import { Injectable } from '@nestjs/common';
import { AdminAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string,
    action: AdminAuditAction,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;

    return client.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }
}
