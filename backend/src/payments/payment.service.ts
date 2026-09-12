import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PAYMENT_PROVIDER } from './payment.types.js';
import type {
  EscrowFundingCaptureResult,
  InitiateEscrowFundingResult,
  PaymentProvider,
  PublicPaymentConfig,
  ProviderWebhookEvent,
} from './payment.types.js';
import { SIMULATED_PAYMENT_PROVIDER } from './providers/simulated-payment.provider.js';
import { assertMarketplaceFundingAllowed } from './payment-protection.policy.js';
import { PaymentFulfillmentService } from './payment-fulfillment.service.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly fulfillment: PaymentFulfillmentService,
  ) {}

  getPublicConfig(): PublicPaymentConfig {
    const mode = this.provider.capabilities.supportsSyncCapture
      ? 'sync'
      : 'redirect';
    const snapshot = this.provider.getConfig?.();

    return {
      provider: this.provider.name,
      mode: snapshot?.mode ?? mode,
      currency: this.configService.get<string>('payment.currency') ?? 'LYD',
      requiresRedirect:
        snapshot?.requiresRedirect ??
        !this.provider.capabilities.supportsSyncCapture,
      supportsRefunds:
        snapshot?.supportsRefunds ?? this.provider.capabilities.supportsRefunds,
      /**
       * Provider availability (PSP configured). Marketplace escrow UI must use
       * paymentProtectionActive — escrow remains frozen under the advertising model.
       */
      available: snapshot?.available ?? this.provider.capabilities.available,
    };
  }

  async getPaymentForClient(clientId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('عملية الدفع غير موجودة');
    if (payment.clientId !== clientId) {
      throw new NotFoundException('عملية الدفع غير موجودة');
    }
    return this.formatPayment(payment);
  }

  async initiateEscrowFunding(
    clientId: string,
    escrowId: string,
    options: { returnUrl?: string; cancelUrl?: string } = {},
  ): Promise<InitiateEscrowFundingResult> {
    assertMarketplaceFundingAllowed();
    const escrow = await this.loadEscrowForClient(clientId, escrowId);

    const existingSucceeded = await this.prisma.payment.findFirst({
      where: {
        escrowId,
        purpose: PaymentPurpose.ESCROW_FUNDING,
        status: PaymentStatus.SUCCEEDED,
      },
    });
    if (existingSucceeded) {
      return {
        paymentId: existingSucceeded.id,
        status: existingSucceeded.status,
        provider: existingSucceeded.provider,
        checkoutUrl: existingSucceeded.checkoutUrl,
        requiresRedirect: false,
      };
    }

    const idempotencyKey = `escrow-fund:${escrowId}`;
    let payment = await this.prisma.payment.findUnique({
      where: { idempotencyKey },
    });

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          escrowId,
          clientId,
          purpose: PaymentPurpose.ESCROW_FUNDING,
          amount: escrow.amount,
          currency: escrow.currency,
          status: PaymentStatus.PENDING,
          provider: this.provider.name,
          idempotencyKey,
        },
      });
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      return {
        paymentId: payment.id,
        status: payment.status,
        provider: payment.provider,
        checkoutUrl: payment.checkoutUrl,
        requiresRedirect: false,
      };
    }

    const checkout = this.provider.createCheckout.bind(this.provider);
    const providerResult = await checkout({
      paymentId: payment.id,
      amount: Number(escrow.amount),
      currency: escrow.currency,
      description: `تمويل ضمان مشروع`,
      clientId,
      returnUrl: options.returnUrl,
      cancelUrl: options.cancelUrl,
      metadata: { escrowId },
    });

    if (providerResult.status === 'succeeded') {
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          providerReference: providerResult.providerReference,
          paidAt: new Date(),
        },
      });
      return {
        paymentId: updated.id,
        status: updated.status,
        provider: updated.provider,
        requiresRedirect: false,
      };
    }

    if (providerResult.status === 'failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureMessage: 'فشل إنشاء عملية الدفع لدى مزود الخدمة',
        },
      });
      throw new BadRequestException('تعذر بدء عملية الدفع');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PROCESSING,
        providerReference: providerResult.providerReference,
        checkoutUrl: providerResult.checkoutUrl ?? null,
      },
    });

    return {
      paymentId: updated.id,
      status: updated.status,
      provider: updated.provider,
      checkoutUrl: updated.checkoutUrl,
      requiresRedirect: true,
    };
  }

  async captureEscrowFundingInTx(
    tx: Tx,
    params: {
      escrowId: string;
      clientId: string;
      amount: Prisma.Decimal;
      currency: string;
    },
  ): Promise<EscrowFundingCaptureResult> {
    assertMarketplaceFundingAllowed();
    const existingSucceeded = await tx.payment.findFirst({
      where: {
        escrowId: params.escrowId,
        purpose: PaymentPurpose.ESCROW_FUNDING,
        status: PaymentStatus.SUCCEEDED,
      },
    });

    if (existingSucceeded) {
      return {
        paymentId: existingSucceeded.id,
        provider: existingSucceeded.provider,
        depositNote: this.depositNote(existingSucceeded.provider),
      };
    }

    const idempotencyKey = `escrow-fund:${params.escrowId}`;
    let payment = await tx.payment.findUnique({
      where: { idempotencyKey },
    });

    if (!payment) {
      payment = await tx.payment.create({
        data: {
          escrowId: params.escrowId,
          clientId: params.clientId,
          purpose: PaymentPurpose.ESCROW_FUNDING,
          amount: params.amount,
          currency: params.currency,
          status: PaymentStatus.PENDING,
          provider: this.provider.name,
          idempotencyKey,
        },
      });
    } else if (payment.status === PaymentStatus.SUCCEEDED) {
      return {
        paymentId: payment.id,
        provider: payment.provider,
        depositNote: this.depositNote(payment.provider),
      };
    }

    const checkout = this.provider.createCheckout.bind(this.provider);
    const providerResult = await checkout({
      paymentId: payment.id,
      amount: Number(params.amount),
      currency: params.currency,
      description: 'تمويل ضمان مشروع',
      clientId: params.clientId,
      metadata: { escrowId: params.escrowId },
    });

    if (providerResult.status === 'pending') {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PROCESSING,
          providerReference: providerResult.providerReference,
          checkoutUrl: providerResult.checkoutUrl ?? null,
        },
      });
      throw new PreconditionFailedException({
        message: 'يتطلب الدفع التحويل إلى بوابة الدفع',
        code: 'PAYMENT_REDIRECT_REQUIRED',
        paymentId: payment.id,
        checkoutUrl: providerResult.checkoutUrl ?? null,
      });
    }

    if (providerResult.status === 'failed') {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureMessage: 'فشل الدفع',
        },
      });
      throw new BadRequestException('فشل الدفع');
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        providerReference: providerResult.providerReference,
        paidAt: new Date(),
      },
    });

    return {
      paymentId: payment.id,
      provider: this.provider.name,
      depositNote: this.depositNote(this.provider.name),
    };
  }

  async applyWebhookEvent(event: ProviderWebhookEvent) {
    const payment = await this.resolvePaymentFromWebhook(event);
    if (!payment) return { handled: false };

    if (event.type === 'payment.succeeded') {
      const alreadySucceeded = payment.status === PaymentStatus.SUCCEEDED;
      if (!alreadySucceeded) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            providerReference: event.providerReference,
            paidAt: new Date(),
          },
        });
      }

      if (
        payment.purpose === PaymentPurpose.SUBSCRIPTION ||
        payment.purpose === PaymentPurpose.POINTS_PURCHASE
      ) {
        const fulfillment = await this.fulfillment.fulfillSucceededPayment(
          payment.id,
        );
        return {
          handled: true,
          paymentId: payment.id,
          purpose: payment.purpose,
          alreadyProcessed: alreadySucceeded,
          fulfillment,
        };
      }

      return {
        handled: true,
        paymentId: payment.id,
        escrowId: payment.escrowId,
        purpose: payment.purpose,
        alreadyProcessed: alreadySucceeded,
      };
    }

    if (event.type === 'payment.failed') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failedAt: new Date(),
          failureCode: event.failureCode ?? null,
          failureMessage: event.failureMessage ?? 'فشل الدفع',
        },
      });
      return { handled: true, paymentId: payment.id };
    }

    if (event.type === 'payment.refunded') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
        },
      });
      return { handled: true, paymentId: payment.id };
    }

    return { handled: false };
  }

  /**
   * Mark payment SUCCEEDED (if needed) and run product fulfillment.
   * Used by subscription / points sync-capture checkouts.
   */
  async markSucceededAndFulfill(
    paymentId: string,
    providerReference?: string | null,
  ) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCEEDED,
        providerReference: providerReference ?? undefined,
        paidAt: new Date(),
      },
    });
    return this.fulfillment.fulfillSucceededPayment(paymentId);
  }

  async handleProviderWebhook(
    providerName: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | Buffer,
  ) {
    if (providerName !== this.provider.name) {
      throw new BadRequestException('مزود الدفع غير مدعوم');
    }
    if (!this.provider.verifyWebhook) {
      throw new BadRequestException('هذا المزود لا يدعم webhooks');
    }

    const event = await this.provider.verifyWebhook({ headers, rawBody });
    if (!event) return { received: true, handled: false as const };

    return this.applyWebhookEvent(event);
  }

  async recordEscrowRefundInTx(tx: Tx, escrowId: string) {
    const payment = await tx.payment.findFirst({
      where: {
        escrowId,
        purpose: PaymentPurpose.ESCROW_FUNDING,
        status: PaymentStatus.SUCCEEDED,
      },
      orderBy: { paidAt: 'desc' },
    });

    if (!payment) return null;

    if (this.provider.refund && payment.providerReference) {
      await this.provider.refund({
        paymentId: payment.id,
        providerReference: payment.providerReference,
        amount: Number(payment.amount),
        currency: payment.currency,
        reason: 'استرداد ضمان — قرار إداري',
      });
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
      },
    });

    return payment.id;
  }

  private async resolvePaymentFromWebhook(event: ProviderWebhookEvent) {
    if (event.paymentId) {
      return this.prisma.payment.findUnique({ where: { id: event.paymentId } });
    }
    if (event.providerReference) {
      return this.prisma.payment.findFirst({
        where: { providerReference: event.providerReference },
      });
    }
    return null;
  }

  private async loadEscrowForClient(clientId: string, escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({ where: { id: escrowId } });
    if (!escrow) throw new NotFoundException('الضمان غير موجود');
    if (escrow.clientId !== clientId) throw new NotFoundException('الضمان غير موجود');
    return escrow;
  }

  private depositNote(provider: string) {
    if (provider === SIMULATED_PAYMENT_PROVIDER) {
      return 'إيداع في الضمان (محاكاة — استبدل PAYMENT_DRIVER ببوابة حقيقية)';
    }
    return `إيداع في الضمان عبر ${provider}`;
  }

  /**
   * Admin inspect for commercial (non-escrow) checkouts:
   * SUBSCRIPTION and POINTS_PURCHASE only.
   */
  async adminListCommercialPayments(query: {
    purpose?: PaymentPurpose;
    status?: PaymentStatus;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const commercialPurposes: PaymentPurpose[] = [
      PaymentPurpose.SUBSCRIPTION,
      PaymentPurpose.POINTS_PURCHASE,
    ];

    if (query.purpose && !commercialPurposes.includes(query.purpose)) {
      throw new BadRequestException(
        'الغرض يجب أن يكون SUBSCRIPTION أو POINTS_PURCHASE',
      );
    }

    const where: Prisma.PaymentWhereInput = {
      purpose: query.purpose ? query.purpose : { in: commercialPurposes },
    };

    if (query.status) where.status = query.status;

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { providerReference: { contains: q, mode: 'insensitive' } },
        { idempotencyKey: { contains: q, mode: 'insensitive' } },
        {
          client: {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              {
                profile: {
                  OR: [
                    { username: { contains: q, mode: 'insensitive' } },
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true, username: true },
              },
            },
          },
          freelancerSubscription: {
            select: { id: true, status: true, planId: true },
          },
          pointsPurchase: {
            select: {
              id: true,
              status: true,
              pointsAmount: true,
              packageId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      page,
      limit,
      total,
      items: items.map((payment) => ({
        id: payment.id,
        purpose: payment.purpose,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        providerReference: payment.providerReference,
        checkoutUrl: payment.checkoutUrl,
        failureMessage: payment.failureMessage,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        metadata: payment.metadata,
        fulfillmentStatus: payment.fulfillmentStatus,
        client: {
          id: payment.client.id,
          email: payment.client.email,
          displayName: payment.client.profile
            ? `${payment.client.profile.firstName} ${payment.client.profile.lastName}`
            : null,
          username: payment.client.profile?.username ?? null,
        },
        subscription: payment.freelancerSubscription,
        pointsPurchase: payment.pointsPurchase,
      })),
    };
  }

  private formatPayment(payment: {
    id: string;
    escrowId: string | null;
    amount: Prisma.Decimal;
    currency: string;
    status: PaymentStatus;
    provider: string;
    providerReference: string | null;
    checkoutUrl: string | null;
    failureMessage: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: payment.id,
      escrowId: payment.escrowId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerReference: payment.providerReference,
      checkoutUrl: payment.checkoutUrl,
      failureMessage: payment.failureMessage,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
