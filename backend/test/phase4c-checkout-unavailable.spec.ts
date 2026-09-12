import 'reflect-metadata';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CheckoutPointsPackageDto,
  resolvePackageIdentifier,
} from '../src/nuqati/dto/checkout-points-package.dto.js';
import { NuqatiService } from '../src/nuqati/nuqati.service.js';
import {
  PAYMENT_PROVIDER_UNAVAILABLE,
  assertPaymentProviderAvailable,
} from '../src/payments/payment-provider-availability.js';
import { SubscriptionsService } from '../src/subscriptions/subscriptions.service.js';
import { STARTER_PLAN_CODE, PRO_PLAN_CODE, PREMIUM_PLAN_CODE } from '../src/subscriptions/subscriptions.constants.js';

const activePackage = {
  id: 'pkg-p100',
  code: 'P100',
  nameAr: 'مئة نقطة',
  nameEn: '100 Points',
  points: 100,
  bonusPoints: 10,
  priceLyd: 15,
  currency: 'LYD',
  isActive: true,
  sortOrder: 1,
};

function unavailableProvider() {
  return {
    name: 'unavailable',
    capabilities: {
      supportsSyncCapture: false,
      supportsRedirectCheckout: false,
      supportsRefunds: false,
      available: false,
    },
    createCheckout: vi.fn(),
    createPayment: vi.fn(),
  };
}

function availableProvider() {
  return {
    name: 'simulated',
    capabilities: {
      supportsSyncCapture: true,
      supportsRedirectCheckout: true,
      supportsRefunds: false,
      available: true,
    },
    createCheckout: vi.fn().mockResolvedValue({
      status: 'pending',
      providerReference: 'sim_1',
      checkoutUrl: 'https://pay.example/checkout',
    }),
    createPayment: vi.fn(),
  };
}

describe('CheckoutPointsPackageDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function validate(body: unknown) {
    return pipe.transform(body, {
      type: 'body',
      metatype: CheckoutPointsPackageDto,
    });
  }

  it('accepts packageId', async () => {
    const dto = (await validate({ packageId: 'P100' })) as CheckoutPointsPackageDto;
    expect(resolvePackageIdentifier(dto)).toBe('P100');
  });

  it('accepts packageCode for backward compatibility', async () => {
    const dto = (await validate({
      packageCode: 'P100',
    })) as CheckoutPointsPackageDto;
    expect(resolvePackageIdentifier(dto)).toBe('P100');
  });

  it('rejects missing identifier', async () => {
    await expect(validate({})).rejects.toBeTruthy();
  });

  it('rejects empty identifier', async () => {
    await expect(validate({ packageId: '' })).rejects.toBeTruthy();
  });

  it('rejects whitespace-only identifier', async () => {
    await expect(validate({ packageId: '   ' })).rejects.toBeTruthy();
  });

  it('rejects non-string identifier', async () => {
    await expect(validate({ packageId: 123 })).rejects.toBeTruthy();
  });

  it('rejects null identifier', async () => {
    await expect(validate({ packageId: null })).rejects.toBeTruthy();
  });

  it('rejects frontend price/points tampering fields', async () => {
    await expect(
      validate({
        packageId: 'P100',
        priceLyd: 1,
        points: 9999,
        bonusPoints: 9999,
      }),
    ).rejects.toBeTruthy();
  });
});

describe('assertPaymentProviderAvailable', () => {
  it('throws 503 PAYMENT_PROVIDER_UNAVAILABLE', () => {
    try {
      assertPaymentProviderAvailable(unavailableProvider() as never);
      expect.unreachable('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      const response = (err as ServiceUnavailableException).getResponse() as {
        code: string;
        statusCode: number;
      };
      expect(response.code).toBe(PAYMENT_PROVIDER_UNAVAILABLE);
      expect((err as ServiceUnavailableException).getStatus()).toBe(503);
    }
  });
});

describe('NuqatiService.initiatePurchaseCheckout', () => {
  let prisma: {
    pointsPackage: { findFirst: ReturnType<typeof vi.fn> };
    pointsWallet: { findUnique: ReturnType<typeof vi.fn> };
    pointsTransaction: { create: ReturnType<typeof vi.fn> };
    payment: { create: ReturnType<typeof vi.fn> };
    pointsPurchase: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let paymentProvider: ReturnType<typeof unavailableProvider>;
  let paymentFulfillment: { fulfillSucceededPayment: ReturnType<typeof vi.fn> };
  let service: NuqatiService;

  beforeEach(() => {
    prisma = {
      pointsPackage: { findFirst: vi.fn() },
      pointsWallet: { findUnique: vi.fn().mockResolvedValue({ balance: 40 }) },
      pointsTransaction: { create: vi.fn() },
      payment: { create: vi.fn() },
      pointsPurchase: { create: vi.fn() },
      $transaction: vi.fn(),
    };
    paymentProvider = unavailableProvider();
    paymentFulfillment = { fulfillSucceededPayment: vi.fn() };
    service = new NuqatiService(
      prisma as never,
      { get: vi.fn() } as never,
      { create: vi.fn() } as never,
      {} as never,
      { log: vi.fn() } as never,
      paymentProvider as never,
      paymentFulfillment as never,
    );
  });

  it('rejects missing identifier without calling trim unsafely', async () => {
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, undefined as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.pointsPackage.findFirst).not.toHaveBeenCalled();
  });

  it('rejects empty identifier', async () => {
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, ''),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects whitespace identifier', async () => {
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 for nonexistent package', async () => {
    prisma.pointsPackage.findFirst.mockResolvedValue(null);
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, 'MISSING'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 400 for inactive package', async () => {
    prisma.pointsPackage.findFirst.mockResolvedValue({
      ...activePackage,
      isActive: false,
    });
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, 'P100'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 503 PAYMENT_PROVIDER_UNAVAILABLE for valid package without PSP', async () => {
    prisma.pointsPackage.findFirst.mockResolvedValue(activePackage);
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, 'P100'),
    ).rejects.toSatisfy((err: unknown) => {
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      const body = (err as ServiceUnavailableException).getResponse() as {
        code: string;
      };
      expect(body.code).toBe(PAYMENT_PROVIDER_UNAVAILABLE);
      return true;
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.pointsPurchase.create).not.toHaveBeenCalled();
    expect(prisma.pointsTransaction.create).not.toHaveBeenCalled();
    expect(paymentProvider.createCheckout).not.toHaveBeenCalled();
    expect(paymentFulfillment.fulfillSucceededPayment).not.toHaveBeenCalled();
  });

  it('does not credit wallet when provider unavailable', async () => {
    prisma.pointsPackage.findFirst.mockResolvedValue(activePackage);
    await expect(
      service.initiatePurchaseCheckout('u1', Role.FREELANCER, 'P100'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.pointsTransaction.create).not.toHaveBeenCalled();
    expect(prisma.pointsPurchase.create).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(paymentFulfillment.fulfillSucceededPayment).not.toHaveBeenCalled();
  });

  it('uses DB price/points and ignores client-supplied amounts', async () => {
    paymentProvider = availableProvider();
    paymentFulfillment = { fulfillSucceededPayment: vi.fn() };
    const paymentUpdate = vi.fn().mockResolvedValue({});
    service = new NuqatiService(
      {
        ...prisma,
        payment: { create: vi.fn(), update: paymentUpdate },
      } as never,
      { get: vi.fn() } as never,
      { create: vi.fn() } as never,
      {} as never,
      { log: vi.fn() } as never,
      paymentProvider as never,
      paymentFulfillment as never,
    );
    prisma.pointsPackage.findFirst.mockResolvedValue(activePackage);
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        payment: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            expect(data.amount).toBe(15);
            expect(data.currency).toBe('LYD');
            const metadata = data.metadata as Record<string, unknown>;
            expect(metadata.pointsAmount).toBe(100);
            expect(metadata.bonusPoints).toBe(10);
            expect(metadata.expectedAmount).toBe(15);
            return { id: 'pay-1', ...data };
          }),
        },
        pointsPurchase: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
            expect(data.pointsAmount).toBe(100);
            expect(data.bonusPoints).toBe(10);
            expect(data.priceLyd).toBe(activePackage.priceLyd);
            return { id: 'purchase-1', ...data };
          }),
        },
      };
      return fn(tx);
    });

    await service.initiatePurchaseCheckout('u1', Role.FREELANCER, 'P100');
    expect(paymentProvider.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 15,
        currency: 'LYD',
      }),
    );
    expect(paymentFulfillment.fulfillSucceededPayment).not.toHaveBeenCalled();
  });
});

describe('SubscriptionsService.checkout unavailable provider', () => {
  function buildService(planCode: string) {
    const plan = {
      id: `plan-${planCode}`,
      code: planCode,
      nameAr: planCode,
      nameEn: planCode,
      price: planCode === 'STARTER' ? 22 : planCode === 'PRO' ? 42 : 72,
      currency: 'LYD',
      durationDays: 30,
      portfolioItemLimit: 20,
      visibilityWeight: 0,
      rankingBoostWeight: 0,
      proposalQuotaMonthly: 20,
      monthlyPointsGrant: 0,
      badgeKey: null,
      featuresJson: {},
      isActive: true,
      sortOrder: 0,
    };
    const prisma = {
      subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(plan) },
      payment: { create: vi.fn() },
      freelancerSubscription: { create: vi.fn() },
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn().mockResolvedValue({
          role: Role.FREELANCER,
          profile: { freelancerProfile: { id: 'fp1' } },
        }),
      },
      productAnalyticsEvent: { create: vi.fn() },
    };
    const paymentProvider = unavailableProvider();
    const entitlements = {
      getCurrentAccess: vi.fn(),
      formatPlan: vi.fn(),
    };
    const service = new SubscriptionsService(
      prisma as never,
      { create: vi.fn() } as never,
      { log: vi.fn() } as never,
      { isFeatureEnabled: vi.fn().mockResolvedValue(true) } as never,
      entitlements as never,
      { get: vi.fn().mockReturnValue('test') } as never,
      paymentProvider as never,
      { fulfillSucceededPayment: vi.fn() } as never,
    );
    return { service, prisma, paymentProvider, plan };
  }

  for (const planCode of [STARTER_PLAN_CODE, PRO_PLAN_CODE, PREMIUM_PLAN_CODE] as const) {
    it(`${planCode} + unavailable provider => 503 and no activation`, async () => {
      const { service, prisma, paymentProvider } = buildService(planCode);
      await expect(
        service.checkout('u1', { planCode }),
      ).rejects.toSatisfy((err: unknown) => {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        const body = (err as ServiceUnavailableException).getResponse() as {
          code: string;
        };
        expect(body.code).toBe(PAYMENT_PROVIDER_UNAVAILABLE);
        return true;
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(prisma.freelancerSubscription.create).not.toHaveBeenCalled();
      expect(paymentProvider.createCheckout).not.toHaveBeenCalled();
    });
  }
});
