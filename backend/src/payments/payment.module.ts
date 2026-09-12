import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EscrowModule } from '../escrow/escrow.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { NuqatiModule } from '../nuqati/nuqati.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentWebhookController } from './payment-webhook.controller.js';
import { AdminPaymentsController } from './admin-payments.controller.js';
import { PAYMENT_PROVIDER } from './payment.types.js';
import type { PaymentProvider } from './payment.types.js';
import { PaymentService } from './payment.service.js';
import { PaymentFulfillmentService } from './payment-fulfillment.service.js';
import { SimulatedPaymentProvider } from './providers/simulated-payment.provider.js';
import { UnavailablePaymentProvider } from './providers/unavailable-payment.provider.js';
import { SuperAdminGuard } from '../common/guards/super-admin.guard.js';
import { AdminPermissionGuard } from '../common/guards/admin-permission.guard.js';

export type PaymentDriver = 'simulated' | 'unavailable';

export function resolvePaymentDriver(configService: ConfigService): PaymentDriver {
  const raw = (
    configService.get<string>('payment.driver') ?? 'simulated'
  ).toLowerCase();

  if (raw === 'unavailable' || raw === 'none' || raw === 'disabled') {
    return 'unavailable';
  }

  if (raw !== 'simulated') {
    throw new Error(
      `Invalid PAYMENT_DRIVER="${raw}". Currently supported: simulated, unavailable. ` +
        'Add a real provider implementation under src/payments/providers/ when integrating a gateway.',
    );
  }

  return 'simulated';
}

/** Production must not silently fake successful captures with the simulated driver. */
export function resolvePaymentProviderInstance(
  configService: ConfigService,
  simulated: SimulatedPaymentProvider,
  unavailable: UnavailablePaymentProvider,
): PaymentProvider {
  const driver = resolvePaymentDriver(configService);
  const nodeEnv = configService.get<string>('nodeEnv') ?? process.env.NODE_ENV;
  const allowSimulatedCheckout = process.env.ALLOW_SIMULATED_CHECKOUT === 'true';

  if (driver === 'unavailable') {
    return unavailable;
  }

  if (driver === 'simulated') {
    if (nodeEnv === 'production' && !allowSimulatedCheckout) {
      return unavailable;
    }
    return simulated;
  }

  throw new Error(`Unhandled payment driver: ${driver}`);
}

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => EscrowModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => NuqatiModule),
  ],
  controllers: [
    PaymentController,
    PaymentWebhookController,
    AdminPaymentsController,
  ],
  providers: [
    PaymentService,
    PaymentFulfillmentService,
    SimulatedPaymentProvider,
    UnavailablePaymentProvider,
    SuperAdminGuard,
    AdminPermissionGuard,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (
        configService: ConfigService,
        simulated: SimulatedPaymentProvider,
        unavailable: UnavailablePaymentProvider,
      ) =>
        resolvePaymentProviderInstance(configService, simulated, unavailable),
      inject: [ConfigService, SimulatedPaymentProvider, UnavailablePaymentProvider],
    },
  ],
  exports: [PaymentService, PaymentFulfillmentService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
