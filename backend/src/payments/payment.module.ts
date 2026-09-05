import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EscrowModule } from '../escrow/escrow.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentWebhookController } from './payment-webhook.controller.js';
import { PAYMENT_PROVIDER } from './payment.types.js';
import { PaymentService } from './payment.service.js';
import { SimulatedPaymentProvider } from './providers/simulated-payment.provider.js';

export type PaymentDriver = 'simulated';

export function resolvePaymentDriver(configService: ConfigService): PaymentDriver {
  const driver = (
    configService.get<string>('payment.driver') ?? 'simulated'
  ).toLowerCase();

  if (driver !== 'simulated') {
    throw new Error(
      `Invalid PAYMENT_DRIVER="${driver}". Currently supported: simulated. ` +
        'Add a provider implementation under src/payments/providers/ when integrating a gateway.',
    );
  }

  return driver;
}

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    forwardRef(() => EscrowModule),
  ],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    PaymentService,
    SimulatedPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (
        configService: ConfigService,
        simulated: SimulatedPaymentProvider,
      ) => {
        const driver = resolvePaymentDriver(configService);
        if (driver === 'simulated') return simulated;
        throw new Error(`Unhandled payment driver: ${driver}`);
      },
      inject: [ConfigService, SimulatedPaymentProvider],
    },
  ],
  exports: [PaymentService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
