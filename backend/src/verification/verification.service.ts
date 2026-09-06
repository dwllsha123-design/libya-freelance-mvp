import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAuditAction,
  IdentityVerificationStatus,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.interface.js';
import { AdminAuditService } from '../admin/admin-audit.service.js';
import {
  IDENTITY_VERIFICATION_VALIDITY_DAYS,
  VERIFICATION_DOC_MAX_COUNT,
  VERIFICATION_DOC_MAX_SIZE,
  VERIFICATION_MIME_TYPES,
} from '../subscriptions/subscriptions.constants.js';
import {
  buildVerificationObjectKey,
  hashNationalIdLast4,
} from './verification.util.js';
import type {
  RejectIdentityVerificationDto,
  SubmitIdentityVerificationDto,
  SuspendIdentityVerificationDto,
} from './dto/verification.dto.js';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly audit: AdminAuditService,
  ) {}

  async getMine(userId: string) {
    await this.assertFreelancer(userId);
    const row = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { userId },
      include: { documents: { select: { id: true, mimeType: true, sizeBytes: true, createdAt: true } } },
    });
    return this.formatPublic(row);
  }

  async isIdentityVerified(userId: string, asOf: Date = new Date()): Promise<boolean> {
    const row = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { userId },
      select: { status: true, expiresAt: true },
    });
    if (!row || row.status !== IdentityVerificationStatus.VERIFIED) return false;
    if (row.expiresAt && row.expiresAt <= asOf) return false;
    return true;
  }

  async submit(
    userId: string,
    dto: SubmitIdentityVerificationDto,
    files: Express.Multer.File[],
  ) {
    await this.assertFreelancer(userId);
    if (!files?.length) {
      throw new BadRequestException('يجب رفع مستند واحد على الأقل');
    }
    if (files.length > VERIFICATION_DOC_MAX_COUNT) {
      throw new BadRequestException('تجاوزت الحد الأقصى للمستندات');
    }
    for (const file of files) {
      if (!VERIFICATION_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException('نوع ملف غير مدعوم');
      }
      if (file.size > VERIFICATION_DOC_MAX_SIZE) {
        throw new BadRequestException('حجم الملف يتجاوز الحد المسموح');
      }
    }

    const existing = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { userId },
      include: { documents: true },
    });
    if (
      existing &&
      (existing.status === IdentityVerificationStatus.PENDING ||
        existing.status === IdentityVerificationStatus.VERIFIED)
    ) {
      throw new ConflictException('لديك طلب تحقق قيد المراجعة أو موثّق بالفعل');
    }

    const last4 = hashNationalIdLast4(dto.nationalId);
    if (last4.length !== 4) {
      throw new BadRequestException('رقم الهوية غير صالح');
    }

    const uploadedKeys: string[] = [];
    try {
      for (const file of files) {
        const ext =
          file.mimetype === 'application/pdf'
            ? '.pdf'
            : file.mimetype === 'image/png'
              ? '.png'
              : file.mimetype === 'image/webp'
                ? '.webp'
                : '.jpg';
        const key = buildVerificationObjectKey(userId, ext);
        await this.storage.putPrivateObject(key, file.buffer, file.mimetype);
        uploadedKeys.push(key);
      }

      const verification = await this.prisma.$transaction(async (tx) => {
        const row = existing
          ? await tx.freelancerIdentityVerification.update({
              where: { id: existing.id },
              data: {
                status: IdentityVerificationStatus.PENDING,
                fullNameAsOnId: dto.fullNameAsOnId.trim(),
                nationalIdLast4: last4,
                freelancerNote: dto.freelancerNote?.trim() || null,
                rejectionReason: null,
                adminNote: null,
                submittedAt: new Date(),
                reviewedAt: null,
                reviewedById: null,
                expiresAt: null,
              },
            })
          : await tx.freelancerIdentityVerification.create({
              data: {
                userId,
                status: IdentityVerificationStatus.PENDING,
                fullNameAsOnId: dto.fullNameAsOnId.trim(),
                nationalIdLast4: last4,
                freelancerNote: dto.freelancerNote?.trim() || null,
                submittedAt: new Date(),
              },
            });

        if (existing?.documents.length) {
          await tx.identityVerificationDocument.deleteMany({
            where: { verificationId: row.id },
          });
        }

        await tx.identityVerificationDocument.createMany({
          data: uploadedKeys.map((storageKey, i) => ({
            verificationId: row.id,
            storageKey,
            mimeType: files[i]!.mimetype,
            sizeBytes: files[i]!.size,
          })),
        });

        return row;
      });

      await this.notifications.create(
        userId,
        NotificationType.VERIFICATION_SUBMITTED,
        'تم استلام طلب توثيق الهوية',
        'طلبك قيد المراجعة من فريق المنصة.',
        `/dashboard/verification`,
      );

      return this.getMine(userId);
    } catch (err) {
      for (const key of uploadedKeys) {
        try {
          await this.storage.deletePrivateObject?.(key);
        } catch {
          /* best-effort cleanup */
        }
      }
      throw err;
    }
  }

  async adminList(query: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const where: Prisma.FreelancerIdentityVerificationWhereInput = {};
    if (query.status) {
      where.status = query.status as IdentityVerificationStatus;
    } else {
      where.status = { not: IdentityVerificationStatus.NOT_SUBMITTED };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.freelancerIdentityVerification.count({ where }),
      this.prisma.freelancerIdentityVerification.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true, username: true } },
            },
          },
          documents: { select: { id: true, mimeType: true, sizeBytes: true, createdAt: true } },
        },
        orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        fullNameAsOnId: item.fullNameAsOnId,
        nationalIdLast4: item.nationalIdLast4,
        submittedAt: item.submittedAt,
        reviewedAt: item.reviewedAt,
        rejectionReason: item.rejectionReason,
        documentCount: item.documents.length,
        user: {
          id: item.user.id,
          email: item.user.email,
          displayName: item.user.profile
            ? `${item.user.profile.firstName} ${item.user.profile.lastName}`
            : null,
          username: item.user.profile?.username ?? null,
        },
      })),
    };
  }

  async adminGet(id: string) {
    const item = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true, username: true } },
          },
        },
        documents: { select: { id: true, mimeType: true, sizeBytes: true, createdAt: true } },
      },
    });
    if (!item) throw new NotFoundException('طلب التوثيق غير موجود');
    return {
      ...item,
      user: {
        id: item.user.id,
        email: item.user.email,
        displayName: item.user.profile
          ? `${item.user.profile.firstName} ${item.user.profile.lastName}`
          : null,
        username: item.user.profile?.username ?? null,
      },
    };
  }

  async approve(adminId: string, id: string) {
    const item = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('طلب التوثيق غير موجود');
    if (item.status !== IdentityVerificationStatus.PENDING) {
      throw new ConflictException('يمكن اعتماد الطلبات قيد المراجعة فقط');
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + IDENTITY_VERIFICATION_VALIDITY_DAYS);

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerIdentityVerification.update({
        where: { id },
        data: {
          status: IdentityVerificationStatus.VERIFIED,
          reviewedAt: new Date(),
          reviewedById: adminId,
          expiresAt,
          rejectionReason: null,
        },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.IDENTITY_VERIFICATION_APPROVED,
        'FreelancerIdentityVerification',
        id,
        { userId: item.userId, expiresAt: expiresAt.toISOString() },
        tx,
      );
    });

    await this.notifications.create(
      item.userId,
      NotificationType.VERIFICATION_APPROVED,
      'تم توثيق هويتك',
      'أصبحت هويتك موثقة على ليبيا فريلانس.',
      `/dashboard/verification`,
    );

    return this.adminGet(id);
  }

  async reject(adminId: string, id: string, dto: RejectIdentityVerificationDto) {
    const item = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('طلب التوثيق غير موجود');
    if (item.status !== IdentityVerificationStatus.PENDING) {
      throw new ConflictException('يمكن رفض الطلبات قيد المراجعة فقط');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerIdentityVerification.update({
        where: { id },
        data: {
          status: IdentityVerificationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: adminId,
          rejectionReason: dto.rejectionReason.trim(),
          adminNote: dto.adminNote?.trim() || null,
        },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.IDENTITY_VERIFICATION_REJECTED,
        'FreelancerIdentityVerification',
        id,
        { userId: item.userId },
        tx,
      );
    });

    await this.notifications.create(
      item.userId,
      NotificationType.VERIFICATION_REJECTED,
      'تم رفض طلب توثيق الهوية',
      dto.rejectionReason.trim(),
      `/dashboard/verification`,
    );

    return this.adminGet(id);
  }

  async requestResubmission(
    adminId: string,
    id: string,
    dto: RejectIdentityVerificationDto,
  ) {
    const item = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('طلب التوثيق غير موجود');
    if (
      item.status !== IdentityVerificationStatus.PENDING &&
      item.status !== IdentityVerificationStatus.VERIFIED
    ) {
      throw new ConflictException('لا يمكن طلب إعادة التقديم لهذه الحالة');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerIdentityVerification.update({
        where: { id },
        data: {
          status: IdentityVerificationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: adminId,
          rejectionReason: dto.rejectionReason.trim(),
          adminNote: dto.adminNote?.trim() || 'طلب إعادة تقديم المستندات',
        },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.IDENTITY_VERIFICATION_REJECTED,
        'FreelancerIdentityVerification',
        id,
        { userId: item.userId, requestResubmission: true },
        tx,
      );
    });

    await this.notifications.create(
      item.userId,
      NotificationType.VERIFICATION_REJECTED,
      'مطلوب إعادة تقديم مستندات التوثيق',
      dto.rejectionReason.trim(),
      `/dashboard/verification`,
    );

    return this.adminGet(id);
  }

  async suspend(adminId: string, id: string, dto: SuspendIdentityVerificationDto) {
    const item = await this.prisma.freelancerIdentityVerification.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('طلب التوثيق غير موجود');
    if (item.status !== IdentityVerificationStatus.VERIFIED) {
      throw new ConflictException('يمكن تعليق التوثيق المعتمد فقط');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.freelancerIdentityVerification.update({
        where: { id },
        data: {
          status: IdentityVerificationStatus.SUSPENDED,
          reviewedAt: new Date(),
          reviewedById: adminId,
          adminNote: dto.reason.trim(),
        },
      });
      await this.audit.log(
        adminId,
        AdminAuditAction.IDENTITY_VERIFICATION_SUSPENDED,
        'FreelancerIdentityVerification',
        id,
        { userId: item.userId, reason: dto.reason.trim() },
        tx,
      );
    });

    return this.adminGet(id);
  }

  /** Auth-gated document download — never public. */
  async getDocumentBuffer(adminId: string, verificationId: string, documentId: string) {
    void adminId;
    const doc = await this.prisma.identityVerificationDocument.findFirst({
      where: { id: documentId, verificationId },
    });
    if (!doc) throw new NotFoundException('المستند غير موجود');
    if (!this.storage.getObject) {
      throw new NotFoundException('المستند غير متاح');
    }
    const obj = await this.storage.getObject(doc.storageKey);
    if (!obj) throw new NotFoundException('المستند غير موجود');
    const chunks: Buffer[] = [];
    for await (const chunk of obj.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return { buffer: Buffer.concat(chunks), mimeType: doc.mimeType };
  }

  private formatPublic(
    row: {
      id: string;
      status: IdentityVerificationStatus;
      fullNameAsOnId: string | null;
      nationalIdLast4: string | null;
      freelancerNote: string | null;
      rejectionReason: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      expiresAt: Date | null;
      documents: Array<{ id: string; mimeType: string; sizeBytes: number; createdAt: Date }>;
    } | null,
  ) {
    if (!row) {
      return {
        status: IdentityVerificationStatus.NOT_SUBMITTED,
        identityVerified: false,
        documents: [],
      };
    }
    const identityVerified =
      row.status === IdentityVerificationStatus.VERIFIED &&
      (!row.expiresAt || row.expiresAt > new Date());
    return {
      id: row.id,
      status: row.status,
      identityVerified,
      fullNameAsOnId: row.fullNameAsOnId,
      nationalIdLast4: row.nationalIdLast4,
      freelancerNote: row.freelancerNote,
      rejectionReason: row.rejectionReason,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      expiresAt: row.expiresAt,
      documents: row.documents.map((d) => ({
        id: d.id,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        createdAt: d.createdAt,
      })),
    };
  }

  private async assertFreelancer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, profile: { select: { freelancerProfile: { select: { id: true } } } } },
    });
    if (!user || user.role !== Role.FREELANCER || !user.profile?.freelancerProfile) {
      throw new ForbiddenException('هذه الميزة للمستقلين فقط');
    }
  }
}
