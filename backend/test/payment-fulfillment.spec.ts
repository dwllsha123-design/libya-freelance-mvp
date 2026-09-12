import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  PaymentPurpose,
  PaymentStatus,
  PaymentFulfillmentStatus,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { PaymentFulfillmentService } from '../src/payments/payment-fulfillment.service.js';

describe('PaymentFulfillmentService', () => {
  const prisma = {
    payment: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };
  const subscriptions = {
    activateFromConfirmedPayment: vi.fn(),
  };
  const nuqati = {
    creditPointsPurchaseFulfillment: vi.fn(),
  };

  let service: PaymentFulfillmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentFulfillmentService(
      prisma as never,
      subscriptions as never,
      nuqati as never,
    );
  });

  it('rejects escrow purposes for product fulfillment', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-1',
      purpose: PaymentPurpose.ESCROW_FUNDING,
      status: PaymentStatus.SUCCEEDED,
      amount: 100,
      currency: 'LYD',
      fulfillmentStatus: PaymentFulfillmentStatus.NONE,
      metadata: {},
      freelancerSubscription: null,
      pointsPurchase: null,
    });
    await expect(service.fulfillSucceededPayment('pay-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('is idempotent when already fulfilled', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-2',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.SUCCEEDED,
      amount: 42,
      currency: 'LYD',
      fulfillmentStatus: PaymentFulfillmentStatus.FULFILLED,
      fulfillmentKey: 'subscription:pay-2',
      metadata: {},
      freelancerSubscription: { id: 'sub-1', plan: { price: 42, currency: 'LYD', code: 'PRO', id: 'p' } },
      pointsPurchase: null,
    });
    const result = await service.fulfillSucceededPayment('pay-2');
    expect(result.alreadyFulfilled).toBe(true);
    expect(subscriptions.activateFromConfirmedPayment).not.toHaveBeenCalled();
  });

  it('activates subscription once for SUBSCRIPTION purpose', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-3',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.SUCCEEDED,
      amount: 42,
      currency: 'LYD',
      fulfillmentStatus: PaymentFulfillmentStatus.NONE,
      metadata: {},
      freelancerSubscription: {
        id: 'sub-pending',
        plan: { id: 'plan-pro', code: 'PRO', price: 42, currency: 'LYD' },
      },
      pointsPurchase: null,
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.update.mockResolvedValue({});
    subscriptions.activateFromConfirmedPayment.mockResolvedValue({ id: 'sub-1' });

    const result = await service.fulfillSucceededPayment('pay-3');
    expect(subscriptions.activateFromConfirmedPayment).toHaveBeenCalledWith('pay-3');
    expect(result.fulfilled).toBe(true);
    expect(result.purpose).toBe(PaymentPurpose.SUBSCRIPTION);
  });

  it('credits points once for POINTS_PURCHASE', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-4',
      purpose: PaymentPurpose.POINTS_PURCHASE,
      status: PaymentStatus.SUCCEEDED,
      amount: 30,
      currency: 'LYD',
      fulfillmentStatus: PaymentFulfillmentStatus.NONE,
      metadata: { expectedCurrency: 'LYD' },
      freelancerSubscription: null,
      pointsPurchase: {
        id: 'purchase-1',
        userId: 'u1',
        pointsAmount: 100,
        bonusPoints: 0,
        priceLyd: 30,
        packageId: 'pkg-1',
      },
    });
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.update.mockResolvedValue({});
    nuqati.creditPointsPurchaseFulfillment.mockResolvedValue({ credited: true });

    await service.fulfillSucceededPayment('pay-4');
    expect(nuqati.creditPointsPurchaseFulfillment).toHaveBeenCalled();
  });

  it('rejects mismatched amount vs plan price', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 'pay-5',
      purpose: PaymentPurpose.SUBSCRIPTION,
      status: PaymentStatus.SUCCEEDED,
      amount: 10,
      currency: 'LYD',
      fulfillmentStatus: PaymentFulfillmentStatus.NONE,
      metadata: {},
      freelancerSubscription: {
        id: 'sub-x',
        plan: { id: 'plan-pro', code: 'PRO', price: 42, currency: 'LYD' },
      },
      pointsPurchase: null,
    });
    await expect(service.fulfillSucceededPayment('pay-5')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
