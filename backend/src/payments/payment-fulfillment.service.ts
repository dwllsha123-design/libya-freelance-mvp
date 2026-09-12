import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import {
  PaymentFulfillmentStatus,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NuqatiService } from '../nuqati/nuqati.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

type PaymentRow = {
  id: string;
  clientId: string;
  purpose: PaymentPurpose;
  amount: Prisma.Decimal;
  currency: string;
  status: PaymentStatus;
  fulfillmentStatus: PaymentFulfillmentStatus;
  fulfillmentKey: string | null;
  metadata: Prisma.JsonValue | null;
  freelancerSubscription: {
    id: string;
    plan: {
      id: string;
      code: string;
      price: Prisma.Decimal;
      currency: string;
    };
  } | null;
  pointsPurchase: {
    id: string;
    userId: string;
    pointsAmount: number;
    bonusPoints: number;
    priceLyd: Prisma.Decimal;
    packageId: string | null;
  } | null;
};

export type FulfillmentResult = {
  paymentId: string;
  purpose: PaymentPurpose;
  fulfilled: boolean;
  alreadyFulfilled?: boolean;
  skipped?: boolean;
  reason?: string;
  subscriptionId?: string;
  purchaseId?: string;
};

@Injectable()
export class PaymentFulfillmentService {
  private readonly logger = new Logger(PaymentFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SubscriptionsService))
    private readonly subscriptions: SubscriptionsService,
    @Inject(forwardRef(() => NuqatiService))
    private readonly nuqati: NuqatiService,
  ) {}

  /**
   * Idempotent product fulfillment after a verified SUCCEEDED payment.
   * Escrow purposes are rejected on this path (frozen advertising model).
   */
  async fulfillSucceededPayment(paymentId: string): Promise<FulfillmentResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        freelancerSubscription: { include: { plan: true } },
        pointsPurchase: true,
      },
    });

    if (!payment) {
      return {
        paymentId,
        purpose: PaymentPurpose.SUBSCRIPTION,
        fulfilled: false,
        skipped: true,
        reason: 'NOT_FOUND',
      };
    }

    if (
      payment.purpose === PaymentPurpose.ESCROW_FUNDING ||
      payment.purpose === PaymentPurpose.ESCROW_REFUND
    ) {
      throw new BadRequestException({
        message: 'لا يمكن إتمام تمويل الضمان عبر مسار المنتجات',
        code: 'ESCROW_FULFILLMENT_REJECTED',
        messageEn: 'Escrow payments cannot be fulfilled on the product path.',
      });
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      return {
        paymentId,
        purpose: payment.purpose,
        fulfilled: false,
        skipped: true,
        reason: 'NOT_SUCCEEDED',
      };
    }

    if (payment.fulfillmentStatus === PaymentFulfillmentStatus.FULFILLED) {
      return {
        paymentId,
        purpose: payment.purpose,
        fulfilled: true,
        alreadyFulfilled: true,
        subscriptionId: payment.freelancerSubscription?.id,
        purchaseId: payment.pointsPurchase?.id,
      };
    }

    if (payment.purpose === PaymentPurpose.SUBSCRIPTION) {
      return this.fulfillSubscription(payment);
    }

    if (payment.purpose === PaymentPurpose.POINTS_PURCHASE) {
      return this.fulfillPointsPurchase(payment);
    }

    throw new BadRequestException({
      message: 'غرض الدفع غير مدعوم للإتمام',
      code: 'UNSUPPORTED_PAYMENT_PURPOSE',
    });
  }

  private async fulfillSubscription(payment: PaymentRow): Promise<FulfillmentResult> {
    const fulfillmentKey = `subscription:${payment.id}`;
    this.assertAmountCurrencyMatch(payment, {
      expectedAmount: payment.freelancerSubscription
        ? Number(payment.freelancerSubscription.plan.price)
        : this.metadataNumber(payment.metadata, 'expectedAmount'),
      expectedCurrency:
        payment.freelancerSubscription?.plan.currency ??
        this.metadataString(payment.metadata, 'expectedCurrency') ??
        payment.currency,
    });

    await this.markFulfillmentPending(payment.id);

    try {
      const activated = await this.subscriptions.activateFromConfirmedPayment(
        payment.id,
      );

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          fulfillmentStatus: PaymentFulfillmentStatus.FULFILLED,
          fulfillmentKey,
          fulfilledAt: new Date(),
        },
      });

      return {
        paymentId: payment.id,
        purpose: PaymentPurpose.SUBSCRIPTION,
        fulfilled: true,
        subscriptionId: activated.id,
      };
    } catch (err) {
      await this.markFulfillmentFailed(payment.id, err);
      throw err;
    }
  }

  private async fulfillPointsPurchase(payment: PaymentRow): Promise<FulfillmentResult> {
    const purchase = payment.pointsPurchase;
    if (!purchase) {
      throw new BadRequestException({
        message: 'عملية شراء النقاط غير مرتبطة بالدفع',
        code: 'POINTS_PURCHASE_MISSING',
      });
    }

    const fulfillmentKey = `points-purchase:${payment.id}`;
    this.assertAmountCurrencyMatch(payment, {
      expectedAmount: Number(purchase.priceLyd),
      expectedCurrency:
        this.metadataString(payment.metadata, 'expectedCurrency') ??
        this.metadataString(payment.metadata, 'currency') ??
        'LYD',
    });

    await this.markFulfillmentPending(payment.id);

    try {
      await this.nuqati.creditPointsPurchaseFulfillment({
        userId: purchase.userId,
        purchaseId: purchase.id,
        pointsAmount: purchase.pointsAmount,
        bonusPoints: purchase.bonusPoints,
        paymentId: payment.id,
        fulfillmentKey,
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          fulfillmentStatus: PaymentFulfillmentStatus.FULFILLED,
          fulfillmentKey,
          fulfilledAt: new Date(),
        },
      });

      return {
        paymentId: payment.id,
        purpose: PaymentPurpose.POINTS_PURCHASE,
        fulfilled: true,
        purchaseId: purchase.id,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        // Concurrent retry raced on fulfillmentKey — treat as already done.
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            fulfillmentStatus: PaymentFulfillmentStatus.FULFILLED,
            fulfillmentKey,
            fulfilledAt: new Date(),
          },
        });
        return {
          paymentId: payment.id,
          purpose: PaymentPurpose.POINTS_PURCHASE,
          fulfilled: true,
          alreadyFulfilled: true,
          purchaseId: purchase.id,
        };
      }
      await this.markFulfillmentFailed(payment.id, err);
      throw err;
    }
  }

  private assertAmountCurrencyMatch(
    payment: PaymentRow,
    expected: { expectedAmount: number | null; expectedCurrency: string },
  ) {
    if (expected.expectedAmount == null || Number.isNaN(expected.expectedAmount)) {
      throw new BadRequestException({
        message: 'تعذر التحقق من مبلغ الدفع',
        code: 'PAYMENT_AMOUNT_EXPECTATION_MISSING',
      });
    }

    const paid = Number(payment.amount);
    if (Math.abs(paid - expected.expectedAmount) > 0.009) {
      this.logger.warn(
        `Payment amount mismatch paymentId=${payment.id} paid=${paid} expected=${expected.expectedAmount}`,
      );
      throw new BadRequestException({
        message: 'مبلغ الدفع لا يطابق المبلغ المتوقع',
        code: 'PAYMENT_AMOUNT_MISMATCH',
      });
    }

    if (
      payment.currency.toUpperCase() !== expected.expectedCurrency.toUpperCase()
    ) {
      throw new BadRequestException({
        message: 'عملة الدفع لا تطابق العملة المتوقعة',
        code: 'PAYMENT_CURRENCY_MISMATCH',
      });
    }
  }

  private async markFulfillmentPending(paymentId: string) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { fulfillmentStatus: PaymentFulfillmentStatus.PENDING },
    });
  }

  private async markFulfillmentFailed(paymentId: string, err: unknown) {
    const message =
      err instanceof Error ? err.message.slice(0, 500) : 'fulfillment_failed';
    await this.prisma.payment
      .update({
        where: { id: paymentId },
        data: {
          fulfillmentStatus: PaymentFulfillmentStatus.FAILED,
          failedAt: new Date(),
          failureMessage: message,
        },
      })
      .catch(() => undefined);
  }

  private metadataNumber(
    metadata: Prisma.JsonValue | null,
    key: string,
  ): number | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const value = (metadata as Record<string, unknown>)[key];
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  private metadataString(
    metadata: Prisma.JsonValue | null,
    key: string,
  ): string | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }
}
