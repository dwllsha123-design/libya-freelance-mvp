import { Injectable } from '@nestjs/common';
import {
  CommercialAuditAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CommercialAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    actorId: string,
    action: CommercialAuditAction,
    entityType: string,
    entityId: string,
    opts?: {
      oldValue?: Record<string, unknown> | null;
      newValue?: Record<string, unknown> | null;
      effectiveDate?: Date | null;
      reason?: string | null;
      tx?: Prisma.TransactionClient;
    },
  ) {
    const client = opts?.tx ?? this.prisma;
    return client.commercialAuditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        oldValue:
          opts?.oldValue != null
            ? (opts.oldValue as Prisma.InputJsonValue)
            : undefined,
        newValue:
          opts?.newValue != null
            ? (opts.newValue as Prisma.InputJsonValue)
            : undefined,
        effectiveDate: opts?.effectiveDate ?? undefined,
        reason: opts?.reason ?? undefined,
      },
    });
  }
}
